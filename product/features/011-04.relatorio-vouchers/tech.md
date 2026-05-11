# Relatório de Vouchers — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Implementa o endpoint `GET /reports/vouchers`, que retorna os vouchers emitidos por uma filial em um período informado, com totalizadores (quantidade emitida, valor total emitido, valor total utilizado, saldo em aberto) e discriminação por status (todos emitidos, utilizados ao menos uma vez, esgotados). Suporta filtro de status para restringir a lista. É estritamente somente leitura.

Camadas afetadas: persistência (query analítica sobre `voucher`, `voucher_usage` e `customer`), serviço de domínio de relatório de vouchers, e frontend React com tela `/relatorios/vouchers`.

Tabelas lidas:

| Tabela | Uso |
|--------|-----|
| `voucher` | filtro por `branch_id` + `issued_at`; totalizadores; status derivado |
| `voucher_usage` | LEFT JOIN com `voucher`; verificar existência de uso (para status "utilizados") |
| `customer` | JOIN com `voucher`; nome do cliente para exibição |

Convenções de autorização e exportação definidas em `011-00.relatorios/tech.md` aplicam-se integralmente aqui.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. As tabelas `voucher`, `voucher_usage` e `customer` foram criadas em `000-01.modelagem-dados` e seus índices complementares foram definidos em `005-00.vouchers/tech.md`.

O índice `idx_voucher_branch_issued_at` definido em `011-00.relatorios/tech.md` é necessário para este endpoint.

### Estratégia de migração

Não aplicável. Ver changeSet `003-report-indexes` em `011-00.relatorios/tech.md`.

---

## Contratos de API

### `GET /reports/vouchers`

Retorna os vouchers emitidos pela filial no período informado, com totalizadores e lista detalhada.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras de validação |
  |-----------|------|-------------|---------------------|
  | `from` | `string` (YYYY-MM-DD) | sim | data válida; deve ser ≤ `to` |
  | `to` | `string` (YYYY-MM-DD) | sim | data válida; deve ser ≥ `from` |
  | `branch_id` | `UUID` | condicional | obrigatório para `Administrador`; ignorado para `Gerente` (usa `branchId` do JWT) |
  | `status` | `string` | não | `all` (padrão, omitido = todos), `used` (ao menos um uso), `exhausted` (saldo zerado); qualquer outro valor → `400` |
  | `format` | `string` | não | aceita apenas `xlsx`; omitido retorna JSON; `csv` retorna `400` |

- **Lógica de escopo de filial:**
  - `Gerente`: `branch_id` = `branchId` do JWT; qualquer `branch_id` enviado no query param é ignorado.
  - `Administrador`: `branch_id` do query param é obrigatório; se ausente → `400`.

- **Definição dos grupos de status (derivados, não armazenados):**
  - **Emitidos (`all`):** todos os vouchers com `issued_at` dentro do período, sem filtro adicional.
  - **Utilizados (`used`):** vouchers com ao menos um registro em `voucher_usage` — implementar como subquery `EXISTS` ou LEFT JOIN com `COUNT > 0`.
  - **Esgotados (`exhausted`):** vouchers com `remaining_balance = 0`.

  > Vouchers sem prazo de validade: conforme regra 9 do business.md e modelo de `005-00.vouchers/tech.md`, não existe coluna de expiração. O grupo "Expirados" não existe neste relatório.

- **Lógica das queries:**

  > A implementação pode usar JPQL, Criteria API ou query nativa.

  **Query 1 — Totalizadores (sempre calculados sobre todos os emitidos no período, independente do filtro de status):**

  ```sql
  SELECT
      COUNT(v.id)                                  AS total_issued,
      COALESCE(SUM(v.initial_value), 0)            AS total_issued_value,
      COALESCE(SUM(v.initial_value - v.remaining_balance), 0) AS total_used_value,
      COALESCE(SUM(v.remaining_balance), 0)        AS total_balance
  FROM voucher v
  WHERE v.branch_id  = :branchId
    AND v.issued_at >= :from::date
    AND v.issued_at <  (:to::date + INTERVAL '1 day');
  ```

  > `total_used_value` = soma do quanto já foi consumido de cada voucher = `initial_value - remaining_balance`. Não é a soma de `voucher_usage.amount_used` — o resultado é equivalente, mas `initial_value - remaining_balance` é mais direto e evita o JOIN extra.

  **Query 2 — Lista de vouchers (com filtro de status opcional):**

  ```sql
  SELECT
      v.id                  AS voucher_id,
      c.name                AS customer_name,
      v.initial_value       AS initial_value,
      v.remaining_balance   AS remaining_balance,
      v.issued_at           AS issued_at,
      -- status derivado: 'exhausted' | 'active' | 'inactive'
      CASE
          WHEN v.remaining_balance = 0 THEN 'exhausted'
          WHEN v.active = true         THEN 'active'
          ELSE                              'inactive'
      END                   AS status
  FROM voucher v
  JOIN customer c ON c.id = v.customer_id
  WHERE v.branch_id  = :branchId
    AND v.issued_at >= :from::date
    AND v.issued_at <  (:to::date + INTERVAL '1 day')
    -- filtro de status (aplicar condicionalmente):
    -- status = 'used':      AND EXISTS (SELECT 1 FROM voucher_usage vu WHERE vu.voucher_id = v.id)
    -- status = 'exhausted': AND v.remaining_balance = 0
  ORDER BY v.issued_at DESC;
  ```

- **Response `200` (JSON):**

  ```json
  {
    "branchId": "uuid",
    "from": "2026-01-01",
    "to": "2026-01-31",
    "statusFilter": "all",
    "totals": {
      "issuedCount": 12,
      "totalIssuedValue": 960.00,
      "totalUsedValue": 420.00,
      "totalBalance": 540.00
    },
    "items": [
      {
        "voucherId": "uuid",
        "customerName": "Maria Silva",
        "initialValue": 80.00,
        "remainingBalance": 30.00,
        "issuedAt": "2026-01-15T10:30:00",
        "status": "active"
      },
      {
        "voucherId": "uuid",
        "customerName": "João Souza",
        "initialValue": 120.00,
        "remainingBalance": 0.00,
        "issuedAt": "2026-01-10T14:00:00",
        "status": "exhausted"
      }
    ]
  }
  ```

  > `totals` reflete **sempre** o universo completo de vouchers emitidos no período, independentemente do `statusFilter`. Isso permite ao usuário ver os totais globais enquanto filtra a lista por um grupo específico.

  > Quando não há vouchers no período, `totals` retorna zeros e `items` retorna lista vazia. Nunca retornar `404` — sempre `200`.

  > `issuedAt` é retornado como `TIMESTAMP` ISO 8601 sem timezone (ex.: `2026-01-15T10:30:00`) — consistent com o tipo `TIMESTAMP` da coluna.

- **Response `200` (Excel — `format=xlsx`):**
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="relatorio-vouchers-<from>-<to>.xlsx"`
  - Planilha com duas seções:
    1. Totalizadores: Qtd. Emitidos, Valor Total Emitido (R$), Valor Total Utilizado (R$), Saldo em Aberto (R$).
    2. Lista detalhada com cabeçalhos: Código do Voucher, Cliente, Valor Inicial (R$), Saldo Restante (R$), Data de Emissão, Status.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Relatório gerado com sucesso (pode ter lista vazia) |
  | 400 | `from` ou `to` ausentes ou inválidos; `to` < `from`; `branch_id` ausente para Administrador; `status` com valor inválido; `format=csv` |
  | 401 | Usuário não autenticado |
  | 403 | Perfil `Catalogador` ou `Caixa` |
  | 404 | `branch_id` informado não encontrado (apenas para Administrador) |
  | 500 | Erro inesperado |

- **Edge cases:**
  - Filtro `status=used` usa `EXISTS (SELECT 1 FROM voucher_usage WHERE voucher_id = v.id)` — um voucher é "utilizado" se tem ao menos um registro de uso, mesmo que ainda tenha saldo restante (uso parcial).
  - Filtro `status=exhausted` é `remaining_balance = 0` — independente do campo `active`.
  - Os totalizadores não são afetados pelo filtro de status — sempre calculados sobre o universo completo do período.
  - Código do voucher na resposta = `voucherId` (UUID v7), conforme convenção definida em `005-00.vouchers/tech.md`.

---

## DTOs de domínio

```
VouchersReportRequest   — parâmetros de query validados (from, to, branch_id, status, format)
VoucherReportTotals     — totalizadores: issuedCount, totalIssuedValue, totalUsedValue, totalBalance
VoucherReportItem       — item da lista: voucherId, customerName, initialValue,
                          remainingBalance, issuedAt, status
VouchersReportResponse  — resposta JSON: branchId, from, to, statusFilter, totals, items
```

---

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? Sim — duas queries analíticas separadas (totalizadores + lista); candidatas a virtual thread. Alternativamente, unificar em query única com window functions se a implementação preferir.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Não aplicável.
- [ ] Dados sensíveis tratados adequadamente? `customer.cpf_cnpj` não é retornado neste relatório — apenas `customer.name`. `voucher.issued_by` (UUID do Gerente emissor) não é retornado.
- [ ] Casos de autorização por perfil cobertos? Sim — mesmas regras dos outros relatórios; ver convenções em `011-00`.

---

## Estratégia de testes

**Fluxo principal (happy path)**
- Gerente consulta com período válido e vouchers existentes: verificar totalizadores corretos (issuedCount, totalIssuedValue, totalUsedValue, totalBalance).
- Filtro `status=used`: apenas vouchers com ao menos um registro em `voucher_usage` aparecem.
- Filtro `status=exhausted`: apenas vouchers com `remaining_balance = 0` aparecem.
- Filtro omitido ou `status=all`: todos os vouchers do período aparecem.
- Totalizadores não mudam ao aplicar filtro de status: verificar que `totals` é calculado independentemente do `statusFilter`.
- Administrador consulta com `branch_id` válido: isolamento de filial correto.
- Relatório com `format=xlsx`: verificar seções de totalizadores e lista no arquivo.

**Casos de erro esperados**
- `from` ausente: `400`.
- `to` ausente: `400`.
- `to` anterior a `from`: `400`.
- `status=expired` (valor inválido): `400`.
- `format=csv`: `400`.
- Administrador sem `branch_id`: `400`.

**Casos de autorização**
- `Catalogador` acessa: `403`.
- `Caixa` acessa: `403`.
- Usuário não autenticado: `401`.
- Gerente com `branch_id` no query param: ignorado, usa JWT.

**Edge cases de regras de negócio**
- Período sem vouchers emitidos: `totals` com zeros e `items` vazio, status `200`.
- Voucher parcialmente utilizado com saldo > 0: aparece em `status=used` (tem uso), mas **não** em `status=exhausted` (saldo > 0).
- Voucher totalmente utilizado (`remaining_balance = 0`): aparece em `status=used` E em `status=exhausted` quando filtrado separadamente.
- Voucher emitido no período mas nunca utilizado: aparece em `all` mas **não** em `used` nem `exhausted`.
- `totalUsedValue` para voucher com `initial_value = 80` e `remaining_balance = 30`: contribui com `50.00` para `totalUsedValue`.
- Dia único (`from == to`): verificar que vouchers emitidos no dia inteiro são incluídos.

---

## Riscos técnicos e dependências

1. **Dependência do changeSet `003-report-indexes` (011-00):** O índice `idx_voucher_branch_issued_at` é definido no módulo raiz. Se o changeSet não for aplicado, o filtro por `branch_id + issued_at` causará full scan em `voucher`.

2. **Duas queries separadas vs. query única com window functions:** A especificação propõe duas queries (totalizadores + lista). Para períodos com muitos vouchers, duas passagens pela mesma tabela podem ser ineficientes. Uma alternativa é usar CTE com `COUNT(*) OVER()` e `SUM() OVER()` para calcular totalizadores e lista em uma única query. A decisão é do agente implementador; ambas as abordagens são funcionalmente corretas.

3. **Filtro `status=used` com subquery `EXISTS`:** Para filiais com grande volume de vouchers e muitos registros em `voucher_usage`, o `EXISTS` por linha pode ser lento sem índice adequado. O índice `idx_voucher_usage_voucher` definido em `005-00.vouchers/tech.md` cobre `voucher_usage(voucher_id, used_at DESC)` e deve tornar o lookup eficiente.

4. **Consistência de `totalUsedValue` via `initial_value - remaining_balance`:** Este campo é calculado como diferença entre valor inicial e saldo restante — não como soma de `voucher_usage.amount_used`. Os dois devem ser matematicamente equivalentes se a regra de atomicidade do módulo `005-xx` for sempre respeitada (decremento de `remaining_balance` ocorre na mesma transação que o registro em `voucher_usage`). Se houver inconsistência de dados por falha histórica, os dois valores podem divergir. A abordagem escolhida (`initial_value - remaining_balance`) é mais robusta e não depende de integridade de `voucher_usage`.
