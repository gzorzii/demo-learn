# Relatório de Vendas — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Implementa o endpoint `GET /reports/sales`, que agrega os dados de vendas de uma filial em um período informado e retorna: total geral, total de descontos, número de transações e breakdown por método de pagamento. É estritamente somente leitura — não escreve em nenhuma tabela.

Camadas afetadas: persistência (query analítica sobre `sale`, `sale_payment` e `payment_method`), serviço de domínio de relatório de vendas, e frontend React com tela `/relatorios/vendas`.

Tabelas lidas:

| Tabela | Uso |
|--------|-----|
| `sale` | filtro por `branch_id` + `sold_at`; soma de `total_amount` e `discount_amount`; contagem de transações |
| `sale_payment` | JOIN com `sale`; soma de `amount` por método de pagamento |
| `payment_method` | JOIN com `sale_payment`; nome do método de pagamento |

Convenções de autorização e exportação definidas em `011-00.relatorios/tech.md` aplicam-se integralmente aqui.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. As tabelas `sale`, `sale_payment` e `payment_method` foram criadas em `000-01.modelagem-dados`.

O índice `idx_sale_branch_sold_at` definido em `011-00.relatorios/tech.md` é necessário para este endpoint. Ele deve estar presente antes do primeiro uso em produção.

### Estratégia de migração

Não aplicável. Ver changeSet `003-report-indexes` em `011-00.relatorios/tech.md`.

---

## Contratos de API

### `GET /reports/sales`

Retorna o resumo de vendas de uma filial no período informado, com discriminação por método de pagamento.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras de validação |
  |-----------|------|-------------|---------------------|
  | `from` | `string` (YYYY-MM-DD) | sim | data válida; deve ser ≤ `to` |
  | `to` | `string` (YYYY-MM-DD) | sim | data válida; deve ser ≥ `from` |
  | `branch_id` | `UUID` | condicional | obrigatório para `Administrador`; ignorado para `Gerente` (usa `branchId` do JWT) |
  | `format` | `string` | não | aceita apenas `xlsx`; omitido retorna JSON; `csv` retorna `400` |

- **Lógica de escopo de filial:**
  - `Gerente`: `branch_id` = `branchId` do JWT; qualquer `branch_id` enviado no query param é ignorado.
  - `Administrador`: `branch_id` do query param é obrigatório; se ausente → `400`.

- **Query SQL de referência:**

  > A query abaixo representa a lógica que o serviço deve executar. A implementação pode usar JPQL, Criteria API ou query nativa — a forma é decisão do agente implementador.

  ```sql
  -- Totalizadores gerais
  SELECT
      COUNT(s.id)              AS transaction_count,
      COALESCE(SUM(s.total_amount),    0) AS total_amount,
      COALESCE(SUM(s.discount_amount), 0) AS total_discount
  FROM sale s
  WHERE s.branch_id = :branchId
    AND s.sold_at >= :from::date
    AND s.sold_at <  (:to::date + INTERVAL '1 day');

  -- Breakdown por método de pagamento
  SELECT
      pm.name                        AS payment_method_name,
      COALESCE(SUM(sp.amount), 0)    AS total_amount
  FROM sale s
  JOIN sale_payment sp ON sp.sale_id = s.id
  JOIN payment_method pm ON pm.id = sp.payment_method_id
  WHERE s.branch_id = :branchId
    AND s.sold_at >= :from::date
    AND s.sold_at <  (:to::date + INTERVAL '1 day')
  GROUP BY pm.id, pm.name
  ORDER BY total_amount DESC;
  ```

  > Vendas pagas com voucher aparecem com o nome do método de pagamento `payment_method.name` correspondente ao registro de `sale_payment` com `voucher_id IS NOT NULL`. Não existe tratamento especial: o nome é o que estiver cadastrado em `payment_method` (ex.: "Voucher"). Nenhuma lógica extra é necessária.

- **Response `200` (JSON):**

  ```json
  {
    "branchId": "uuid",
    "from": "2026-01-01",
    "to": "2026-01-31",
    "transactionCount": 42,
    "totalAmount": 3540.00,
    "totalDiscount": 210.50,
    "netAmount": 3329.50,
    "paymentBreakdown": [
      {
        "paymentMethodName": "Cartão de Crédito",
        "totalAmount": 2100.00
      },
      {
        "paymentMethodName": "Dinheiro",
        "totalAmount": 900.00
      },
      {
        "paymentMethodName": "Voucher",
        "totalAmount": 329.50
      }
    ]
  }
  ```

  > `netAmount` = `totalAmount - totalDiscount`. Campo calculado no serviço, não no banco.

  > Quando não há vendas no período, todos os valores numéricos retornam `0` e `paymentBreakdown` retorna lista vazia. Nunca retornar `404` para período sem dados — sempre `200` com zeros.

- **Response `200` (Excel — `format=xlsx`):**
  - `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="relatorio-vendas-<from>-<to>.xlsx"`
  - Planilha com cabeçalhos em português: Filial, Período De, Período Até, Total de Transações, Total de Vendas (R$), Total de Descontos (R$), Valor Líquido (R$), seguido de seção de breakdown com colunas Método de Pagamento e Valor (R$).

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Relatório gerado com sucesso (pode ter zeros) |
  | 400 | `from` ou `to` ausentes ou inválidos; `to` < `from`; `branch_id` ausente para Administrador; `format=csv` |
  | 401 | Usuário não autenticado (JWT ausente ou expirado) |
  | 403 | Perfil `Catalogador` ou `Caixa` |
  | 404 | `branch_id` informado não encontrado no banco (apenas para Administrador) |
  | 500 | Erro inesperado |

- **Edge cases:**
  - Um mesmo `sale_id` pode ter múltiplos registros em `sale_payment` (pagamento misto, ex.: parte em dinheiro, parte em cartão). A soma de `sale_payment.amount` por método de pagamento já trata esse caso corretamente — não é necessário deduplificar.
  - O `netAmount` pode ser igual a `totalAmount` se `totalDiscount = 0`.
  - Métodos de pagamento sem nenhuma venda no período não aparecem no `paymentBreakdown` — o resultado é determinado pelas linhas retornadas pelo GROUP BY.

---

## DTOs de domínio

```
SalesReportRequest     — parâmetros de query validados (from, to, branch_id, format)
PaymentBreakdownItem   — item do breakdown: paymentMethodName, totalAmount
SalesReportResponse    — resposta JSON: branchId, from, to, transactionCount,
                         totalAmount, totalDiscount, netAmount, paymentBreakdown
```

---

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? Sim — query analítica com GROUP BY e JOIN sobre `sale` e `sale_payment`; candidata a virtual thread.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Não aplicável; sem uso de reflection dinâmica.
- [ ] Dados sensíveis tratados adequadamente? Nenhum dado sensível (CPF, senha, token) presente nas tabelas `sale`, `sale_payment` ou `payment_method`. `cashier_id` e `customer_id` de `sale` não são retornados neste relatório.
- [ ] Casos de autorização por perfil cobertos? Sim — `Gerente` escopo fixo por JWT; `Administrador` `branch_id` obrigatório por query param; `Catalogador` e `Caixa` retornam `403`.

---

## Estratégia de testes

**Fluxo principal (happy path)**
- Gerente consulta relatório com período válido e vendas existentes: verificar `transactionCount`, `totalAmount`, `totalDiscount`, `netAmount` e `paymentBreakdown` corretos.
- Período com vendas usando múltiplos métodos de pagamento: verificar que `paymentBreakdown` agrupa corretamente por método.
- Venda com pagamento misto (dois registros em `sale_payment`): verificar que cada método aparece separadamente no breakdown.
- Administrador consulta com `branch_id` válido: verificar que retorna dados apenas dessa filial.
- Relatório com `format=xlsx`: verificar `Content-Type` e `Content-Disposition` corretos; verificar que o arquivo pode ser aberto.

**Casos de erro esperados**
- `from` ausente: `400`.
- `to` ausente: `400`.
- `to` anterior a `from`: `400`.
- `from` com formato inválido (ex.: `2026/01/01`): `400`.
- `format=csv`: `400`.
- Administrador sem `branch_id`: `400`.
- Administrador com `branch_id` inexistente: `404`.

**Casos de autorização**
- `Catalogador` acessa `GET /reports/sales`: `403`.
- `Caixa` acessa `GET /reports/sales`: `403`.
- Usuário não autenticado: `401`.
- Gerente com `branch_id` de outra filial no query param: backend ignora e usa `branchId` do JWT.

**Edge cases de regras de negócio**
- Período sem vendas: resposta com todos os campos numéricos em `0` e `paymentBreakdown` como lista vazia; status `200`.
- Dia único (`from == to`): verificar que vendas do dia inteiro são incluídas (de 00:00:00 até 23:59:59).
- `sale` com `discount_amount = 0`: `totalDiscount` deve ser `0`; `netAmount` deve ser igual a `totalAmount`.

---

## Riscos técnicos e dependências

1. **Dependência do changeSet `003-report-indexes` (011-00):** O índice `idx_sale_branch_sold_at` precisa existir antes de consultas em produção com grande volume. Em ambiente de desenvolvimento com poucos registros, a ausência do índice não causará falha.

2. **Timezone das datas:** `sale.sold_at` é `TIMESTAMP` sem timezone. Se o banco e a aplicação operarem em timezones diferentes, o filtro de período pode incluir ou excluir vendas de forma inesperada. A convenção é tratar `sold_at` como horário local da loja (sem conversão). O agente implementador deve garantir que o banco seja configurado no mesmo timezone do servidor de aplicação.

3. **Métodos de pagamento deletados ou inativados:** `payment_method.active` pode ser `false` para um método que foi usado em vendas passadas. O JOIN retorna o nome atual — se o método foi renomeado ou inativado, o nome histórico não é preservado. Risco de consistência de nomes no relatório histórico; não há mitigação no modelo atual.
