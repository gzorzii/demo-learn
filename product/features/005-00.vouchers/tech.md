# Vouchers — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo raiz que define o contrato de dados e os endpoints REST do domínio de vouchers de crédito (trade-in). Cobre duas operações de backoffice — emissão manual e listagem com filtros — além de expor os primitivos de consulta e resgate que o PDV (004-02) precisará consumir.

As tabelas `voucher` e `voucher_usage` já foram criadas pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`. Este módulo **não cria novas tabelas**: adiciona índices complementares e especifica os contratos de API, invariantes transacionais e regras de autorização.

Camadas afetadas: persistência (JPA/PostgreSQL 18), serviços de domínio (emissão, atualização de saldo, log de uso), e frontend React com rotas `/vouchers`, `/vouchers/new` e `/vouchers/:id`.

Domínios externos lidos ou escritos por este módulo:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — escopo obrigatório de todos os vouchers |
| Usuários / Auth (`000-01`, `000-02`) | `user`, `user_role`, `role` | leitura — identificação do emissor e autorização |
| Clientes (`007-xx`) | `customer` | leitura — vínculo obrigatório ao emitir voucher |
| PDV (`004-xx`) | `sale`, `sale_payment` | leitura (`sale_payment.voucher_id`) + escrita (`voucher_usage`, atualização de `remaining_balance`) |

---

## Modelo de dados

### Tabelas existentes utilizadas pelo módulo

Todas as tabelas abaixo já existem pelo changeSet `001-initial-schema`. Este módulo **não emite novas migrações de schema**.

#### `voucher`

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `customer_id` | `UUID` | NOT NULL | — | FK → `customer(id)` |
| `initial_value` | `NUMERIC(10,2)` | NOT NULL | — | deve ser > 0; imutável após criação |
| `remaining_balance` | `NUMERIC(10,2)` | NOT NULL | — | inicia igual a `initial_value`; decrementado a cada resgate |
| `issued_by` | `UUID` | NOT NULL | — | FK → `user(id)`; Gerente ou Administrador que emitiu |
| `issued_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável após criação |
| `active` | `BOOLEAN` | NOT NULL | `TRUE` | `false` quando esgotado (`remaining_balance = 0`) ou inativado manualmente |

> Não existe coluna `status` — o status é derivado: **Ativo** = `active = true AND remaining_balance > 0`; **Esgotado** = `remaining_balance = 0`. Toda lógica de status deve ser computada na camada de serviço e/ou na query SQL; nunca armazenar coluna redundante.

> O voucher não possui coluna de validade — decisão de negócio confirmada; vouchers não expiram.

> O campo `active` deve ser atualizado para `false` **na mesma transação** que zera `remaining_balance`, garantindo consistência sem polling.

#### `voucher_usage`

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `voucher_id` | `UUID` | NOT NULL | — | FK → `voucher(id)` |
| `sale_id` | `UUID` | NOT NULL | — | FK → `sale(id)` |
| `amount_used` | `NUMERIC(10,2)` | NOT NULL | — | deve ser > 0 e ≤ `voucher.remaining_balance` no momento do resgate |
| `used_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável |

> Um mesmo `sale_id` não deve aparecer mais de uma vez em `voucher_usage` — regra de negócio "apenas um voucher por transação PDV" (regra 7 do business.md). A constraint de unicidade é imposta na camada de serviço; não há `UNIQUE` constraint no banco para preservar flexibilidade de rollback de PDV.

### Estratégia de migração

Nenhuma migração nova é emitida por este módulo. Os índices abaixo são complementares aos definidos em `000-01.modelagem-dados` e devem ser adicionados em um changeSet dedicado (`002-voucher-indexes`) para não modificar o changeSet original:

```sql
-- Lookup por código de voucher no PDV: filial + ativo + saldo > 0
-- A coluna `id` (UUID v7) já é PK; o PDV busca por `id` + `branch_id`.
-- O índice composto abaixo cobre a query de resgate com filtro de filial.
CREATE INDEX idx_voucher_branch_active
    ON voucher(branch_id, active)
    WHERE active = true;

-- Lookup por cliente (listagem filtrada + PDV pode consultar por cliente)
-- Já definido em 000-01 como idx_voucher_customer; documentado aqui por referência.
-- CREATE INDEX idx_voucher_customer ON voucher(customer_id, active);

-- Histórico de uso por voucher (detalhe do voucher)
CREATE INDEX idx_voucher_usage_voucher
    ON voucher_usage(voucher_id, used_at DESC);
```

> O índice `idx_voucher_customer` já está declarado em `000-01.modelagem-dados`. Não recriar.

> Rollback do changeSet `002-voucher-indexes` é seguro: apenas drops de índices, sem perda de dados.

---

## Contratos de API

### `POST /vouchers`

Emite um novo voucher de crédito vinculado a um cliente da filial do usuário autenticado.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `customerId` | `UUID` | sim | deve referenciar um `customer` ativo na mesma filial do usuário autenticado |
  | `initialValue` | `Number` (decimal) | sim | deve ser > 0; precisão máxima de 2 casas decimais |

- **Response `201`:**

  ```json
  {
    "id": "uuid-do-voucher",
    "code": "uuid-do-voucher",
    "branchId": "uuid-da-filial",
    "customerId": "uuid-do-cliente",
    "customerName": "Nome do Cliente",
    "initialValue": 80.00,
    "remainingBalance": 80.00,
    "issuedBy": "uuid-do-usuario",
    "issuedAt": "2026-05-08T14:00:00Z",
    "active": true,
    "status": "active"
  }
  ```

  > O campo `code` é o próprio `id` UUID do voucher — não há campo separado para código. O UUID v7 é suficientemente único e legível para ser exibido ao Gerente após a emissão.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 201 | Voucher criado com sucesso |
  | 400 | `initialValue` ≤ 0, formato inválido, ou `customerId` ausente |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`) |
  | 404 | `customerId` não encontrado ou não pertence à filial do usuário |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O `branch_id` do voucher é extraído do JWT do usuário autenticado (campo `branchId`); o cliente não informa a filial.
  - O `issued_by` é o `sub` (UUID) do JWT.
  - `remaining_balance` é sempre igual a `initial_value` na criação — nunca aceitar valor diferente via request.
  - Não há limite de vouchers ativos por cliente — múltiplos vouchers ativos são permitidos.

---

### `GET /vouchers`

Lista os vouchers da filial do usuário autenticado com filtros opcionais por cliente e status.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras |
  |-----------|------|-------------|--------|
  | `customer` | `String` | não | busca insensível a maiúsculas em `customer.name`, `customer.cpf_cnpj` e `customer.phone` |
  | `status` | `String` | não | valores aceitos: `active` (`active = true AND remaining_balance > 0`) ou `exhausted` (`remaining_balance = 0`) |
  | `page` | `Integer` | não | padrão `0`; base 0 |
  | `size` | `Integer` | não | padrão `20`; máximo `100` |

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

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Listagem retornada com sucesso (pode ser vazia) |
  | 400 | Parâmetro `status` com valor inválido |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão |
  | 500 | Erro inesperado |

- **Edge cases:**
  - A filial é sempre extraída do JWT — o endpoint não aceita `branchId` como parâmetro de query.
  - Ordenação padrão: `issued_at DESC`.
  - O campo `status` na resposta é computado: `active` se `active = true AND remaining_balance > 0`; `exhausted` se `remaining_balance = 0`; caso `active = false AND remaining_balance > 0` (inativação manual fora do PDV), retornar `inactive`.
  - Filtros `customer` e `status` são cumulativos (AND).

---

### `GET /vouchers/{id}`

Retorna os dados completos de um voucher, incluindo o histórico de utilizações (`voucher_usage`).

- **Authorization:** perfis `Gerente`, `Administrador`
- **Path parameter:** `id` — UUID do voucher

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

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Voucher encontrado e retornado |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão ou voucher pertence a outra filial |
  | 404 | Voucher não encontrado |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O backend deve verificar que `voucher.branch_id` corresponde à filial do usuário autenticado antes de retornar os dados. Caso contrário, retornar `403` (não vazar existência de vouchers de outras filiais).
  - A lista `usages` é ordenada por `used_at DESC`.

---

### `GET /vouchers/lookup`

Consulta um voucher pelo código (UUID) para uso no PDV. Retorna apenas os dados necessários para o resgate: saldo, status e vínculo com cliente.

> Este endpoint é projetado para o PDV (004-02). A query usa o índice `idx_voucher_branch_active` — lookup por `id + branch_id` com filtro `active = true`. Separado do `GET /vouchers/{id}` para não carregar o histórico de uso a cada varredura no caixa.

- **Authorization:** perfis `Gerente`, `Administrador`, `Caixa`
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras |
  |-----------|------|-------------|--------|
  | `code` | `UUID` | sim | UUID do voucher |
  | `customerId` | `UUID` | não | se informado, valida que o voucher pertence ao cliente (confirmação de identidade no caixa) |

- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "customerName": "Nome do Cliente",
    "remainingBalance": 30.00,
    "active": true,
    "status": "active"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Voucher encontrado, ativo e com saldo |
  | 400 | Parâmetro `code` ausente ou formato inválido |
  | 401 | Usuário não autenticado |
  | 403 | Voucher pertence a outra filial |
  | 404 | Voucher não encontrado |
  | 409 | Voucher encontrado mas `active = false` ou `remaining_balance = 0` |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O `409` distingue "voucher existe mas está inutilizável" de `404` "não encontrado" — o PDV deve exibir mensagens diferentes para cada caso.
  - Se `customerId` for informado e o voucher pertencer a outro cliente, retornar `403`.
  - A filial é sempre extraída do JWT — vouchers de outras filiais retornam `403`, não `404`.

---

### `POST /vouchers/{id}/redeem`

Resgata parcial ou totalmente um voucher durante uma transação PDV. Decrementa `remaining_balance`, registra em `voucher_usage`, e marca `active = false` se o saldo zerar — tudo em uma única transação.

> Operação atômica crítica: o decremento de `remaining_balance` e a inserção em `voucher_usage` **devem ocorrer dentro da mesma transação JDBC/JPA**. Qualquer falha parcial deve fazer rollback completo. Ver observação em `000-01.modelagem-dados`.

- **Authorization:** perfis `Gerente`, `Administrador`, `Caixa`
- **Path parameter:** `id` — UUID do voucher
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `saleId` | `UUID` | sim | deve referenciar uma `sale` existente na mesma filial |
  | `amountUsed` | `Number` (decimal) | sim | deve ser > 0 e ≤ `voucher.remaining_balance` atual |

- **Response `200`:**

  ```json
  {
    "voucherId": "uuid",
    "amountUsed": 30.00,
    "remainingBalance": 0.00,
    "active": false,
    "status": "exhausted",
    "usageId": "uuid-do-voucher-usage"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Resgate realizado com sucesso |
  | 400 | `amountUsed` ≤ 0 ou > `remaining_balance`, ou `saleId` ausente |
  | 401 | Usuário não autenticado |
  | 403 | Voucher pertence a outra filial, ou perfil sem permissão |
  | 404 | Voucher ou `sale` não encontrado |
  | 409 | Voucher inativo (`active = false`) ou saldo esgotado (`remaining_balance = 0`), ou `saleId` já possui um voucher resgatado |
  | 500 | Erro inesperado |

- **Edge cases:**
  - Antes de decrementar, verificar com `SELECT ... FOR UPDATE` (lock otimista ou pessimista) para evitar condição de corrida em resgates simultâneos no mesmo voucher.
  - Se após o decremento `remaining_balance = 0`, definir `active = false` na mesma transação.
  - A regra "apenas um voucher por transação PDV" é verificada consultando `voucher_usage` pelo `saleId` antes de prosseguir — se já existir registro, retornar `409`.
  - O endpoint não cria a `sale` — esta já deve existir antes do resgate (criada pelo PDV).

---

### `GET /customers/search`

Busca clientes por nome, CPF/CNPJ ou telefone para popular o campo de seleção de cliente no formulário de emissão de voucher.

> Este endpoint **não é exclusivo do módulo 005** — é compartilhado com outros módulos que precisam selecionar um cliente (006-01, PDV). Deve ser implementado no domínio `customer`. Documentado aqui como dependência de contrato para a emissão de voucher.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras |
  |-----------|------|-------------|--------|
  | `q` | `String` | sim | mínimo 2 caracteres; busca em `name`, `cpf_cnpj`, `phone` (ILIKE `%q%`) |

- **Response `200`:**

  ```json
  [
    {
      "id": "uuid",
      "name": "Maria Silva",
      "cpfCnpj": "123.456.789-00",
      "phone": "(11) 99999-9999"
    }
  ]
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Resultados retornados (pode ser lista vazia) |
  | 400 | Parâmetro `q` ausente ou com menos de 2 caracteres |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão |
  | 500 | Erro inesperado |

- **Edge cases:**
  - Busca restrita aos clientes da filial do usuário autenticado.
  - Máximo de 20 resultados retornados (sem paginação — uso em autocomplete).
  - Se nenhum cliente for encontrado, retornar lista vazia com `200`.

---

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas: `POST /vouchers/{id}/redeem` envolve `SELECT FOR UPDATE` + `UPDATE` + `INSERT` em sequência — candidato a virtual thread para não bloquear carrier thread durante o lock de banco.
- [ ] `GET /vouchers/lookup` é chamado frequentemente pelo PDV; a query deve usar o índice `idx_voucher_branch_active` — verificar plano de execução em ambiente de desenvolvimento.
- [ ] CPF/CNPJ na tabela `customer` não é mascarado no banco; o endpoint `GET /customers/search` não deve expor o CPF completo na resposta — exibir apenas os últimos 4 dígitos ou usar máscara no DTO de saída. Decisão final a cargo do módulo `007-xx` (clientes).
- [ ] O JWT não contém `customerId` — o `customer_id` vinculado ao voucher nunca é derivado do token, sempre da request body validada contra o banco.
- [ ] Autorização por filial verificada em todos os endpoints: `voucher.branch_id` deve sempre ser comparado com o `branchId` do JWT antes de qualquer operação de leitura ou escrita.

---

## Estratégia de testes

Cenários que devem ser cobertos:

**Fluxo principal (happy path)**
- Emitir voucher com cliente válido e valor > 0: verifica criação, `remaining_balance = initial_value`, `active = true`.
- Listar vouchers da filial sem filtros: verifica ordenação por `issued_at DESC`.
- Listar com filtro de cliente (nome parcial): verifica que apenas vouchers do cliente filtrado retornam.
- Listar com filtro de status `active`: verifica que apenas `active = true AND remaining_balance > 0` retornam.
- Listar com filtro de status `exhausted`: verifica que apenas `remaining_balance = 0` retornam.
- Listar com filtros combinados (cliente + status).
- Detalhar voucher: verifica retorno de `usages` ordenados por `used_at DESC`.
- Lookup por código no PDV: verifica retorno com saldo correto.
- Resgatar voucher parcialmente: verifica decremento de `remaining_balance`, criação de `voucher_usage`, `active` permanece `true`.
- Resgatar voucher totalmente (saldo zera): verifica `remaining_balance = 0`, `active = false`, status `exhausted`.

**Casos de erro esperados**
- Emitir com `initialValue = 0`: deve retornar `400`.
- Emitir com `initialValue` negativo: deve retornar `400`.
- Emitir sem `customerId`: deve retornar `400`.
- Emitir com `customerId` de outra filial: deve retornar `404`.
- Resgatar com `amountUsed` maior que `remaining_balance`: deve retornar `400`.
- Resgatar voucher com `active = false`: deve retornar `409`.
- Resgatar voucher com `remaining_balance = 0`: deve retornar `409`.
- Resgatar com `saleId` que já possui voucher resgatado: deve retornar `409`.
- Buscar voucher de outra filial via `GET /vouchers/{id}`: deve retornar `403`.
- Lookup de voucher de outra filial: deve retornar `403`.

**Casos de autorização**
- `Caixa` acessa `POST /vouchers`: deve retornar `403`.
- `Caixa` acessa `GET /vouchers` (listagem de gestão): deve retornar `403`.
- `Caixa` acessa `GET /vouchers/lookup`: deve retornar `200` (tem permissão).
- `Caixa` acessa `POST /vouchers/{id}/redeem`: deve retornar `200` (tem permissão).
- `Catalogador` acessa qualquer endpoint de voucher: deve retornar `403`.
- Usuário não autenticado: deve retornar `401` em todos os endpoints.

**Edge cases de regras de negócio**
- Atomicidade do resgate: simular falha após decremento e antes da inserção em `voucher_usage` — verificar que rollback restaura o saldo.
- Emissão com valor de alta precisão decimal (ex.: `10.999`): verificar que é rejeitado ou arredondado conforme regra definida na implementação.
- Filtragem de lista: voucher com `active = false AND remaining_balance > 0` (inativação manual) não deve aparecer no filtro `active` nem no `exhausted`.

---

## Riscos técnicos e dependências

1. **Dependência do módulo de Clientes (007-xx):** O endpoint `GET /customers/search` é necessário para a emissão de voucher mas pertence ao domínio `customer`, que ainda não tem tech.md. A implementação do formulário de emissão de voucher no frontend só pode ser finalizada após este endpoint estar disponível. Risco de bloqueio em série se os módulos forem desenvolvidos em paralelo.

2. **Dependência do PDV (004-02) para resgate:** O endpoint `POST /vouchers/{id}/redeem` recebe `saleId` — a `sale` já deve existir no banco antes do resgate. O fluxo exato de criação da venda no PDV (quando a `sale` é persistida versus quando o voucher é resgatado) ainda não está especificado em `004-xx`. É necessário alinhar se o resgate ocorre antes ou depois do fechamento da venda para evitar referência a `sale_id` inexistente.

3. **Condição de corrida no resgate:** Dois resgates simultâneos do mesmo voucher (ex.: dois caixas usando o mesmo código) podem resultar em saldo negativo sem o lock adequado. A implementação deve usar `SELECT ... FOR UPDATE` no `voucher` dentro da transação de resgate. Isso deve ser explicitamente testado com testes de concorrência.

4. **`code` do voucher é o UUID:** O business.md menciona "exibir o código único do voucher". O modelo de dados não possui coluna `code` separada — o `id` UUID v7 é o código. Se o produto decidir usar um código amigável (ex.: alfanumérico curto), será necessária uma migração de schema. Por ora, o `id` serve como código.

5. **Inativação manual de voucher:** O business.md lista a inativação manual como "fora de escopo" para este módulo, mas o campo `active` permite isso. Se outro módulo (ex.: 006-xx) precisar inativar um voucher, o endpoint de resgate deve proteger o campo `active` de ser definido como `false` de forma isolada (sem uma operação de negócio correspondente). Não expor `PATCH /vouchers/{id}` neste módulo.

6. **Módulo 006-01 emite voucher:** A feature `006-01.registrar-compra-lote` descreve que ao registrar um lote, o Gerente pode opcionalmente emitir voucher para o vendedor. Isso reutiliza o `POST /vouchers` deste módulo — nenhum endpoint adicional é necessário, mas o agente de 006-01 deve ser informado do contrato aqui definido.
