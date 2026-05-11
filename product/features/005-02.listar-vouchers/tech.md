# Listar Vouchers — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Esta feature implementa as telas de consulta do módulo de vouchers: listagem paginada com filtros e detalhe individual com histórico de usos. Toda a lógica de leitura se apoia nas tabelas `voucher` e `voucher_usage` já criadas pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`.

Os contratos de API `GET /vouchers` e `GET /vouchers/{id}` foram especificados em `005-00.vouchers/tech.md` — este documento **não redefine esses contratos**, mas especifica os requisitos de implementação exclusivos desta feature: queries com filtros compostos, derivação do campo `status`, isolamento de filial, e comportamento esperado nas telas React.

Camadas afetadas: persistência (JPA/PostgreSQL 18 — apenas leitura), serviço de domínio (derivação de `status`, filtros dinâmicos), e frontend React com rotas `/vouchers` e `/vouchers/:id`.

Domínios lidos por esta feature:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Vouchers (`005-00`) | `voucher`, `voucher_usage` | leitura |
| Clientes (`000-01`) | `customer` | leitura — `JOIN` para filtro por nome/CPF/telefone e exibição de `customerName` |
| Usuários (`000-01`) | `"user"` | leitura — `JOIN` para exibição de `issuedByName` no detalhe |
| Filiais (`000-01`) | `branch` | leitura — escopo obrigatório via `branchId` do JWT |

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma tabela nova é criada por esta feature. As tabelas `voucher` e `voucher_usage` já existem pelo changeSet `001-initial-schema`.

Os índices complementares necessários para as queries desta feature já foram especificados em `005-00.vouchers/tech.md` (changeSet `002-voucher-indexes`):

- `idx_voucher_branch_active` — cobre queries de listagem ativa filtradas por filial.
- `idx_voucher_customer` — cobre o filtro por `customer_id` na listagem.
- `idx_voucher_usage_voucher` — cobre o carregamento de histórico de usos no detalhe, ordenado por `used_at DESC`.

> Nenhum índice adicional precisa ser criado por esta feature.

### Estratégia de migração

Nenhuma migração nova. Verificar que o changeSet `002-voucher-indexes` de `005-00` foi aplicado antes de colocar esta feature em produção — sem esses índices, as queries de listagem com filtro por cliente e por `branch_id + active` serão full scans.

---

## Contratos de API

Os dois endpoints abaixo foram definidos em `005-00.vouchers/tech.md`. Esta seção detalha os requisitos de implementação das queries e as regras de derivação de `status` que afetam exclusivamente o comportamento de leitura.

---

### `GET /vouchers`

Lista os vouchers da filial do usuário autenticado com filtros opcionais por cliente e status, paginado.

- **Authorization:** perfis `Gerente`, `Administrador`

- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras de validação |
  |-----------|------|-------------|---------------------|
  | `customer` | `String` | não | busca ILIKE `%valor%` em `customer.name`, `customer.cpf_cnpj` e `customer.phone`; ignorado se ausente ou vazio |
  | `status` | `String` | não | valores aceitos: `active`, `exhausted`; qualquer outro valor retorna `400` |
  | `page` | `Integer` | não | padrão `0`; base 0; deve ser ≥ 0 |
  | `size` | `Integer` | não | padrão `20`; máximo `100`; deve ser ≥ 1 |

- **Lógica de filtragem — query dinâmica:**

  > O filtro `customer` exige `JOIN` com a tabela `customer`. O filtro `status` é derivado de colunas da tabela `voucher` sem JOIN adicional. Ambos podem ser aplicados simultaneamente (AND).

  Mapeamento de `status` para predicados SQL:

  | Valor de `status` | Predicado SQL em `voucher` |
  |-------------------|---------------------------|
  | `active` | `active = true AND remaining_balance > 0` |
  | `exhausted` | `remaining_balance = 0` |
  | ausente | sem filtro de status |

  > Um voucher com `active = false AND remaining_balance > 0` (inativação manual) não pertence a nenhum dos dois status filtráveis. Ele aparece na listagem sem filtro de status, mas é excluído tanto do filtro `active` quanto do `exhausted`.

  Query base (pseudoSQL):
  ```sql
  SELECT v.*, c.name AS customer_name
  FROM voucher v
  JOIN customer c ON c.id = v.customer_id
  WHERE v.branch_id = :branchId          -- sempre; extraído do JWT
    [AND (c.name ILIKE :q               -- quando customer != null
          OR c.cpf_cnpj ILIKE :q
          OR c.phone ILIKE :q)]
    [AND <predicado de status>]          -- quando status != null
  ORDER BY v.issued_at DESC
  LIMIT :size OFFSET :page * :size
  ```

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "branchId": "uuid",
        "customerId": "uuid",
        "customerName": "Nome do Cliente",
        "initialValue": 80.00,
        "remainingBalance": 30.00,
        "issuedAt": "2026-05-08T14:00:00Z",
        "active": true,
        "status": "active"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 42,
    "totalPages": 3
  }
  ```

  Derivação do campo `status` na resposta:

  | Condição | Valor de `status` |
  |----------|-------------------|
  | `active = true AND remaining_balance > 0` | `"active"` |
  | `remaining_balance = 0` | `"exhausted"` |
  | `active = false AND remaining_balance > 0` | `"inactive"` |

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Listagem retornada com sucesso (pode ser vazia) |
  | 400 | Parâmetro `status` com valor inválido, `page` < 0, ou `size` fora do intervalo `[1, 100]` |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`) |
  | 500 | Erro inesperado |

- **Edge cases:**
  - `branchId` é extraído do JWT — o endpoint não aceita `branchId` como parâmetro de query.
  - Filtros `customer` e `status` são independentes e cumulativos; ambos ausentes retornam toda a listagem da filial.
  - O campo `customer` com string vazia deve ser tratado como ausente (sem filtro).
  - O `totalElements` do response deve contar os registros após a aplicação de todos os filtros.

---

### `GET /vouchers/{id}`

Retorna os dados completos de um voucher específico, incluindo o histórico de utilizações (`voucher_usage`).

- **Authorization:** perfis `Gerente`, `Administrador`
- **Path parameter:** `id` — UUID do voucher

- **Lógica de carregamento:**

  > O carregamento do histórico de usos deve evitar o problema N+1: carregar `voucher_usage` em uma única query com `JOIN` ou via `@OneToMany` com `FetchType.EAGER` com `ORDER BY used_at DESC`. Não executar uma query de `voucher_usage` por item de listagem.

  Query base (pseudoSQL):
  ```sql
  SELECT v.*,
         c.name AS customer_name,
         u.name AS issued_by_name,
         vu.id AS usage_id, vu.sale_id, vu.amount_used, vu.used_at
  FROM voucher v
  JOIN customer c ON c.id = v.customer_id
  JOIN "user" u ON u.id = v.issued_by
  LEFT JOIN voucher_usage vu ON vu.voucher_id = v.id
  WHERE v.id = :id
    AND v.branch_id = :branchId          -- isolamento de filial; falha com 403 se divergir
  ORDER BY vu.used_at DESC
  ```

- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "branchId": "uuid",
    "customerId": "uuid",
    "customerName": "Nome do Cliente",
    "initialValue": 80.00,
    "remainingBalance": 30.00,
    "issuedBy": "uuid-do-usuario",
    "issuedByName": "Nome do Gerente",
    "issuedAt": "2026-05-08T14:00:00Z",
    "active": true,
    "status": "active",
    "usages": [
      {
        "id": "uuid",
        "saleId": "uuid",
        "amountUsed": 50.00,
        "usedAt": "2026-05-09T10:00:00Z"
      }
    ]
  }
  ```

  > `usages` pode ser lista vazia `[]` se o voucher ainda não foi utilizado.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Voucher encontrado e retornado |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão ou `voucher.branch_id` diverge da filial do JWT |
  | 404 | Voucher não encontrado pelo `id` informado |
  | 500 | Erro inesperado |

- **Edge cases:**
  - A verificação de `branch_id` deve ocorrer no serviço, não apenas na query — retornar `403` (não `404`) quando o voucher existe em outra filial, para não vazar a existência de vouchers de outras filiais.
  - Se o `id` não for um UUID válido (formato incorreto), retornar `400`.
  - A lista `usages` é sempre ordenada por `used_at DESC`.

---

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? A query de listagem com `JOIN` em `customer` e paginação em volume alto é candidata a execução em virtual thread para não bloquear carrier thread.
- [ ] Paths com GraalVM AOT: nenhum requisito específico identificado para esta feature.
- [ ] Dados sensíveis: `customer.cpf_cnpj` é lido na query de filtro (ILIKE) mas **não deve ser retornado** no response da listagem nem do detalhe. A exibição de CPF/CNPJ segue a política definida pelo módulo `007-xx` (clientes).
- [ ] Autorização por filial verificada em ambos os endpoints: `voucher.branch_id` deve sempre ser comparado com o `branchId` do JWT antes de retornar qualquer dado.
- [ ] `status` é campo derivado — nunca lido de coluna do banco, sempre computado na camada de serviço ou DTO a partir de `active` e `remaining_balance`.

---

## Estratégia de testes

**Fluxo principal (happy path)**
- Listar vouchers da filial sem filtros: verificar ordenação por `issued_at DESC` e estrutura completa do response paginado.
- Listar com filtro `customer` por nome parcial (case-insensitive): verificar que apenas vouchers do cliente filtrado retornam.
- Listar com filtro `customer` por CPF/CNPJ parcial: verificar correspondência via ILIKE.
- Listar com filtro `customer` por telefone parcial: verificar correspondência via ILIKE.
- Listar com filtro `status=active`: verificar que apenas vouchers com `active = true AND remaining_balance > 0` retornam.
- Listar com filtro `status=exhausted`: verificar que apenas vouchers com `remaining_balance = 0` retornam.
- Listar com filtros combinados (`customer` + `status`): verificar que os dois predicados são aplicados com AND.
- Listar com parâmetros de paginação customizados (`page=1`, `size=5`): verificar corte correto e `totalElements` consistente.
- Detalhar voucher sem usos: verificar `usages = []` e campos de cabeçalho corretos incluindo `issuedByName`.
- Detalhar voucher com múltiplos usos: verificar ordenação `used_at DESC` e soma de `amountUsed` consistente com `initial_value - remaining_balance`.

**Casos de erro esperados**
- Filtro `status` com valor inválido (ex.: `status=expired`): deve retornar `400`.
- Parâmetro `size=200` (acima do máximo): deve retornar `400`.
- Parâmetro `page=-1`: deve retornar `400`.
- `GET /vouchers/{id}` com UUID de voucher de outra filial: deve retornar `403` (não `404`).
- `GET /vouchers/{id}` com UUID inexistente: deve retornar `404`.
- `GET /vouchers/{id}` com `id` em formato inválido (ex.: não UUID): deve retornar `400`.

**Casos de autorização**
- `Caixa` acessa `GET /vouchers`: deve retornar `403`.
- `Caixa` acessa `GET /vouchers/{id}`: deve retornar `403`.
- `Catalogador` acessa qualquer endpoint de listagem de vouchers: deve retornar `403`.
- Usuário não autenticado acessa qualquer endpoint: deve retornar `401`.
- `Gerente` acessa voucher de outra filial: deve retornar `403`.

**Edge cases de regras de negócio**
- Voucher com `active = false AND remaining_balance > 0` (inativação manual): deve aparecer na listagem sem filtro de status com `status = "inactive"`, e não aparecer nos filtros `active` nem `exhausted`.
- Listagem de filial sem nenhum voucher emitido: deve retornar `200` com `content = []` e `totalElements = 0`.
- Filtro `customer` com string composta de apenas espaços: deve ser tratado como ausente (sem filtro aplicado).
- Paginação além do total de páginas (ex.: `page=999`): deve retornar `200` com `content = []`.

---

## Riscos técnicos e dependências

1. **Dependência de `005-00.vouchers/tech.md` e do changeSet `002-voucher-indexes`:** Os índices `idx_voucher_branch_active`, `idx_voucher_customer` e `idx_voucher_usage_voucher` são pré-requisito de performance para as queries desta feature. A implementação deve verificar que esses índices existem no ambiente antes de ir a produção.

2. **Query de filtro por cliente usa ILIKE:** O operador `ILIKE` em PostgreSQL sem índice `pg_trgm` resulta em full scan na tabela `customer` conforme o volume cresce. Para filiais com muitos clientes cadastrados (módulo `007-xx`), pode ser necessário um índice de trigrama (`CREATE INDEX ... USING gin (name gin_trgm_ops)`). Este risco deve ser reavaliado quando o módulo de clientes tiver tech.md definido.

3. **CPF/CNPJ usado no filtro mas não retornado:** A query de busca precisa do campo `cpf_cnpj` para o predicado ILIKE, mas o response não deve expô-lo. A camada de mapeamento DTO deve garantir que `cpf_cnpj` nunca seja serializado na resposta. Risco de exposição acidental se o mapeamento for feito de forma genérica (ex.: `@JsonIgnore` esquecido).

4. **Derivação de `status` deve ser consistente com `005-00`:** O campo `status` é computado identicamente em `GET /vouchers`, `GET /vouchers/{id}` e `GET /vouchers/lookup`. Qualquer divergência entre as implementações gera inconsistência visível ao usuário. Recomenda-se centralizar a derivação em um único método utilitário ou enum no domínio de vouchers.

5. **Módulo de clientes (`007-xx`) sem tech.md:** A tabela `customer` e seus campos (`name`, `cpf_cnpj`, `phone`) já existem em `000-01.modelagem-dados`, mas o comportamento do módulo de clientes (ativação, vínculo com filial) ainda não está completamente especificado. Esta feature assume que `customer.branch_id` é o critério de escopo — se o módulo de clientes introduzir regras adicionais (ex.: cliente pode ser compartilhado entre filiais), pode ser necessário revisar a query de filtro.
