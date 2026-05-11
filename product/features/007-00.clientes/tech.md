# Clientes — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo raiz do domínio de clientes. Define os contratos de API e as invariantes de dados para as quatro sub-features (`007-01` a `007-04`): cadastro, edição, listagem e gerenciamento de lista de desejos.

As tabelas `customer` e `customer_wishlist` já existem no changeSet `001-initial-schema` de `000-01.modelagem-dados`. Este módulo **não cria novas tabelas**: adiciona índices complementares e especifica todos os contratos de API, incluindo o endpoint `GET /customers/search`, que é uma dependência compartilhada consumida por PDV (`004-xx`), vouchers (`005-01`) e compra de usados (`006-01`).

Camadas afetadas: persistência (JPA/PostgreSQL 18), serviços de domínio (validação de unicidade, escopo por filial, gerenciamento de lista de desejos), e frontend React com rotas `/clientes`, `/clientes/novo`, `/clientes/:id`, `/clientes/:id/editar` e `/clientes/:id/lista-desejos`.

Domínios externos que este módulo lê ou escreve:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — escopo obrigatório de todos os registros de cliente |
| Usuários / Auth (`000-01`, `000-02`) | `user`, `user_role`, `role` | leitura — identificação do ator e autorização |
| Notificações (`014-xx`) | `notification` | nenhuma — a inserção de notificações `book_arrival` é responsabilidade exclusiva de `001-01.cadastrar-livro` via leitura de `customer_wishlist` |
| Vouchers (`005-xx`) | `voucher` | nenhuma — vouchers referenciam `customer.id` como FK; este módulo não escreve nem lê `voucher` diretamente |
| PDV (`004-xx`) | `sale` | nenhuma — `sale.customer_id` referencia `customer.id`; este módulo não acessa `sale` |

---

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria novas tabelas**. Todas as tabelas estão definidas no changeSet `001-initial-schema` de `000-01.modelagem-dados`.

#### `customer` — referência

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `name` | `TEXT` | NOT NULL | — | — |
| `phone` | `TEXT` | NULL | — | — |
| `address` | `TEXT` | NULL | — | — |
| `cpf_cnpj` | `TEXT` | NULL | — | unicidade por filial: `UNIQUE(branch_id, cpf_cnpj)` — ver migração abaixo |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | atualizado a cada `PUT` |

> A unicidade de `cpf_cnpj` dentro de uma filial (regra de negócio 1 do `business.md`) não está garantida por constraint no schema inicial de `000-01`. Um índice único composto deve ser adicionado via migration dedicada. Sem ele, a verificação ocorre apenas na camada de serviço, o que cria risco de condição de corrida em cadastros simultâneos.

> `cpf_cnpj` é armazenado apenas com dígitos (sem formatação); a máscara é responsabilidade do frontend. O backend deve rejeitar valores que contenham caracteres não numéricos.

#### `customer_wishlist` — referência

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `customer_id` | `UUID` | NOT NULL | — | FK → `customer(id)` ON DELETE CASCADE |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `title` | `TEXT` | NOT NULL | — | — |
| `author` | `TEXT` | NULL | — | — |
| `isbn` | `TEXT` | NULL | — | — |
| `notified` | `BOOLEAN` | NOT NULL | `FALSE` | `true` quando notificação `book_arrival` já foi disparada |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável |

> A regra de unicidade de item na wishlist (regra 4 do `business.md` de `007-04`) é: se ISBN informado, não pode existir outro item com o mesmo `isbn` para o mesmo `customer_id`; se ISBN não informado, não pode existir outro item com o mesmo `title` para o mesmo `customer_id`. Essa verificação ocorre na camada de serviço; não há constraint de banco (título como string livre não permite constraint UNIQUE confiável).

### Estratégia de migração

Os índices abaixo e o constraint de unicidade devem ser criados em um changeSet dedicado (`005-customer-indexes`), separado do `001-initial-schema`, para não modificar a migration original.

```sql
-- changeSet: 005-customer-indexes

-- Unicidade de CPF/CNPJ dentro de uma filial (garantia de banco + serviço)
-- Razão: sem esta constraint, dois cadastros simultâneos podem passar pela verificação
-- de unicidade no serviço e ambos serem persistidos com o mesmo CPF/CNPJ na mesma filial.
CREATE UNIQUE INDEX idx_customer_branch_cpf_cnpj
    ON customer(branch_id, cpf_cnpj);

-- Busca por nome (listagem filtrada e GET /customers/search)
CREATE INDEX idx_customer_branch_name
    ON customer(branch_id, name);

-- Busca por telefone (listagem filtrada)
CREATE INDEX idx_customer_branch_phone
    ON customer(branch_id, phone);

-- Lista de desejos por cliente (leitura no módulo 001-01 para match de wishlist)
-- Já declarado em 000-01.modelagem-dados como idx_wishlist_customer; documentado aqui por referência.
-- CREATE INDEX idx_wishlist_customer ON customer_wishlist(customer_id);

-- Lista de desejos por filial e ISBN (consulta de match em 001-01.cadastrar-livro)
-- Razão: a verificação de wishlist pós-cadastro de livro filtra por branch_id e isbn;
-- sem este índice, a query varre todos os registros da filial para cada ISBN cadastrado.
CREATE INDEX idx_wishlist_branch_isbn
    ON customer_wishlist(branch_id, isbn)
    WHERE isbn IS NOT NULL;

-- Lista de desejos ainda não notificadas por filial (consulta eficiente no pós-commit de 001-01)
CREATE INDEX idx_wishlist_branch_notified
    ON customer_wishlist(branch_id, notified)
    WHERE notified = false;
```

Rollback seguro: apenas `DROP INDEX` e `DROP INDEX` para o unique index — sem perda de dados. O rollback do índice único só falha se existirem duplicatas; verificar antes de reverter.

---

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade do cookie → `401`. Perfil sem permissão → `403`. O `branch_id` de escopo é extraído do claim `branchId` do JWT. O perfil Administrador pode informar `branch_id` como query param para alterar o contexto de filial — mesma convenção dos demais módulos.

---

### `POST /customers`

Cria um novo cliente vinculado à filial do usuário autenticado. Corresponde a `007-01.cadastrar-cliente`.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `name` | `String` | sim | não vazio; máximo 255 caracteres |
  | `cpfCnpj` | `String` | sim | não vazio; apenas dígitos; 11 dígitos (CPF) ou 14 dígitos (CNPJ); deve ser único na filial |
  | `phone` | `String` | não | máximo 20 caracteres |
  | `address` | `String` | não | máximo 500 caracteres |

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "name": "Ana Souza",
    "cpfCnpj": "12345678901",
    "phone": "11999990000",
    "address": "Rua A, 10",
    "branchId": "uuid-da-filial",
    "createdAt": "2026-05-08T14:00:00Z",
    "updatedAt": "2026-05-08T14:00:00Z"
  }
  ```

  > `cpfCnpj` é retornado sem formatação (apenas dígitos), exatamente como armazenado. A máscara de exibição é responsabilidade do frontend.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 201 | Cliente criado com sucesso |
  | 400 | `name` ou `cpfCnpj` ausentes; `cpfCnpj` com caracteres não numéricos; comprimento diferente de 11 ou 14 dígitos |
  | 401 | Usuário não autenticado (cookie ausente ou JWT expirado) |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`) |
  | 409 | CPF/CNPJ já cadastrado para outro cliente na mesma filial |
  | 500 | Erro inesperado |

- **Edge cases:**
  - `branch_id` é extraído exclusivamente do JWT; qualquer campo `branchId` no body é ignorado.
  - Para o perfil Administrador (sem `branchId` no JWT), o `branch_id` deve ser informado via query param `branchId`. Ausência → `400` com mensagem "filial obrigatória para Administrador".
  - A verificação de unicidade do `cpfCnpj` deve ser feita com a constraint do banco (`idx_customer_branch_cpf_cnpj`). Se a constraint for violada por condição de corrida (dois cadastros simultâneos), o banco retorna erro de violação de unique — o serviço deve capturar esse erro e retornar `409`.

---

### `PUT /customers/{id}`

Atualiza os dados cadastrais de um cliente existente na filial do usuário autenticado. Corresponde a `007-02.editar-cliente`.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Path parameter:** `id` — UUID do cliente
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `name` | `String` | sim | não vazio; máximo 255 caracteres |
  | `cpfCnpj` | `String` | sim | não vazio; apenas dígitos; 11 dígitos (CPF) ou 14 dígitos (CNPJ); deve ser único na filial, exceto para o próprio cliente |
  | `phone` | `String` | não | máximo 20 caracteres |
  | `address` | `String` | não | máximo 500 caracteres |

- **Response `200`:** mesmo formato de `POST /customers` (resposta `201`)

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Cliente atualizado com sucesso |
  | 400 | `name` ou `cpfCnpj` ausentes; `cpfCnpj` com formato inválido |
  | 401 | Usuário não autenticado |
  | 403 | Cliente pertence a outra filial, ou perfil sem permissão (`Catalogador`, `Caixa`) |
  | 404 | UUID não encontrado |
  | 409 | Novo `cpfCnpj` já pertence a outro cliente na mesma filial |
  | 500 | Erro inesperado |

- **Edge cases:**
  - A verificação de unicidade do `cpfCnpj` deve excluir o próprio cliente da comparação: `WHERE branch_id = :branchId AND cpf_cnpj = :cpfCnpj AND id != :customerId`. Se encontrar outro registro → `409`.
  - `branch_id` é imutável — não aceitar `branchId` no body; campo ignorado ou rejeitado com `400`.
  - `updated_at` deve ser atualizado com `now()` em toda operação de edição bem-sucedida.
  - O backend verifica que `customer.branch_id` corresponde ao `branchId` do JWT antes de qualquer atualização; caso contrário → `403`.

---

### `GET /customers`

Lista os clientes da filial do usuário autenticado com filtros opcionais. Corresponde a `007-03.listar-clientes`.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras |
  |-----------|------|-------------|--------|
  | `name` | `String` | não | busca parcial case-insensitive (`ILIKE '%name%'`) em `customer.name` |
  | `cpfCnpj` | `String` | não | busca parcial (`ILIKE '%cpfCnpj%'`) em `customer.cpf_cnpj` |
  | `phone` | `String` | não | busca parcial (`ILIKE '%phone%'`) em `customer.phone` |
  | `page` | `Integer` | não | padrão `0`; base 0 |
  | `size` | `Integer` | não | padrão `20`; máximo `100` |

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "name": "Ana Souza",
        "cpfCnpj": "12345678901",
        "phone": "11999990000"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 5,
    "totalPages": 1
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Listagem retornada com sucesso (pode ser vazia) |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`) |
  | 500 | Erro inesperado |

- **Edge cases:**
  - Filtros são combinados com `AND`: todos os parâmetros informados devem ser satisfeitos simultaneamente.
  - Ordenação padrão: `name ASC`.
  - A filial é sempre extraída do JWT; o endpoint não aceita `branchId` como filtro, exceto para Administrador.
  - Lista vazia retorna `200` com `content: []`, nunca `404`.

---

### `GET /customers/{id}`

Retorna os dados completos de um cliente. Ponto de entrada da ficha do cliente, consumido pelo frontend na rota `/clientes/:id`. Corresponde a `007-03.listar-clientes`.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Path parameter:** `id` — UUID do cliente

- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "name": "Ana Souza",
    "cpfCnpj": "12345678901",
    "phone": "11999990000",
    "address": "Rua A, 10",
    "branchId": "uuid-da-filial",
    "createdAt": "2026-05-08T14:00:00Z",
    "updatedAt": "2026-05-08T14:00:00Z"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Cliente encontrado e pertence à filial do usuário |
  | 401 | Usuário não autenticado |
  | 403 | Cliente existe mas pertence a outra filial |
  | 404 | UUID não encontrado |
  | 500 | Erro inesperado |

---

### `GET /customers/search`

Busca clientes por nome, CPF/CNPJ ou telefone para uso em autocomplete. Endpoint crítico compartilhado com vouchers (`005-01`), PDV (`004-xx`) e compra de usados (`006-01`).

> Esta rota deve ser registrada **antes** de `GET /customers/{id}` no controller para evitar que `search` seja interpretado como UUID. No Spring MVC, rotas literais têm precedência sobre path variables, mas a ordem de declaração deve ser explícita.

> Este é o endpoint de maior frequência de chamada do domínio. A query deve usar os índices `idx_customer_branch_name` e `idx_customer_branch_phone` para garantir latência adequada. Retornar no máximo 20 resultados (sem paginação — uso em autocomplete).

- **Authorization:** perfis `Gerente`, `Administrador`, `Caixa`

  > O Caixa tem acesso a este endpoint porque o PDV (`004-xx`) precisa buscar clientes para vincular à venda. O Caixa não acessa os demais endpoints de gestão de clientes.

- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras |
  |-----------|------|-------------|--------|
  | `q` | `String` | sim | mínimo 2 caracteres; máximo 100 caracteres; busca com `ILIKE '%q%'` em `customer.name`, `customer.cpf_cnpj` e `customer.phone` |

- **Response `200`:**

  ```json
  [
    {
      "id": "uuid",
      "name": "Ana Souza",
      "cpfCnpj": "123.456.789-00",
      "phone": "(11) 99999-0000"
    }
  ]
  ```

  > Os campos `cpfCnpj` e `phone` são retornados **com máscara** neste endpoint (uso em autocomplete para leitura humana). Nos demais endpoints (`GET /customers`, `GET /customers/{id}`, `POST /customers`, `PUT /customers/{id}`), `cpfCnpj` é retornado sem formatação (apenas dígitos).

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Resultados retornados (pode ser lista vazia) |
  | 400 | `q` ausente ou com menos de 2 caracteres |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão (`Catalogador`) |
  | 500 | Erro inesperado |

- **Edge cases:**
  - Busca restrita aos clientes com `customer.branch_id` igual ao `branchId` do JWT.
  - Máximo de 20 resultados; ausência de paginação é intencional.
  - Lista vazia retorna `200` com array `[]`, nunca `404`.
  - A máscara dos campos na resposta é formatada pelo backend no DTO de saída: CPF com 11 dígitos → `###.###.###-##`; CNPJ com 14 dígitos → `##.###.###/####-##`. Valores com comprimento fora do esperado são retornados sem máscara.

---

### `GET /customers/{id}/wishlist`

Lista os itens da lista de desejos de um cliente. Corresponde a `007-04.gerenciar-lista-desejos`.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Path parameter:** `id` — UUID do cliente

- **Response `200`:**

  ```json
  [
    {
      "id": "uuid",
      "title": "O Alquimista",
      "author": null,
      "isbn": null,
      "notified": false,
      "createdAt": "2026-05-08T14:00:00Z"
    }
  ]
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Lista retornada com sucesso (pode ser vazia) |
  | 401 | Usuário não autenticado |
  | 403 | Cliente pertence a outra filial, ou perfil sem permissão |
  | 404 | Cliente não encontrado |
  | 500 | Erro inesperado |

- **Edge cases:**
  - Antes de retornar a lista, o backend verifica que `customer.branch_id` corresponde ao `branchId` do JWT. Se não corresponder → `403`.
  - Ordenação padrão: `created_at ASC` (ordem de registro do interesse).
  - Itens com `notified = true` permanecem na lista — são exibidos normalmente com indicação visual.

---

### `POST /customers/{id}/wishlist`

Adiciona um item à lista de desejos de um cliente. Corresponde a `007-04.gerenciar-lista-desejos`.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Path parameter:** `id` — UUID do cliente
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `title` | `String` | sim | não vazio; máximo 500 caracteres |
  | `author` | `String` | não | máximo 300 caracteres |
  | `isbn` | `String` | não | se informado, apenas dígitos ou hifens; normalizado antes da persistência (remover hifens e espaços); comprimento 10 ou 13 dígitos após normalização |

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "title": "Dom Casmurro",
    "author": "Machado de Assis",
    "isbn": "9788535914849",
    "notified": false,
    "createdAt": "2026-05-08T14:00:00Z"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 201 | Item adicionado com sucesso |
  | 400 | `title` ausente ou vazio; `isbn` com formato inválido |
  | 401 | Usuário não autenticado |
  | 403 | Cliente pertence a outra filial, ou perfil sem permissão |
  | 404 | Cliente não encontrado |
  | 409 | Item duplicado: ISBN já existe na wishlist do cliente (quando `isbn` informado); ou título já existe na wishlist do cliente (quando `isbn` não informado) |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O `branch_id` do item é o `branchId` do JWT (filial do Gerente autenticado), não necessariamente o `branch_id` do cliente. Na prática o cliente pertence à mesma filial — a verificação de filial do cliente garante isso antes do insert.
  - Regra de duplicidade: se `isbn` for informado, verificar existência de outro item com mesmo `customer_id` e mesmo `isbn` (`WHERE customer_id = :customerId AND isbn = :isbn`). Se `isbn` for nulo, verificar existência de outro item com mesmo `customer_id` e mesmo `title` exato (`WHERE customer_id = :customerId AND isbn IS NULL AND title = :title`). Conflito → `409`.
  - `notified` é sempre `false` na criação — nunca aceitar valor externo para este campo.

---

### `DELETE /customers/{id}/wishlist/{itemId}`

Remove permanentemente um item da lista de desejos. Corresponde a `007-04.gerenciar-lista-desejos`.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Path parameters:** `id` — UUID do cliente; `itemId` — UUID do item da wishlist
- **Response `204`:** sem corpo

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 204 | Item removido com sucesso |
  | 401 | Usuário não autenticado |
  | 403 | Cliente pertence a outra filial, ou perfil sem permissão |
  | 404 | Cliente não encontrado, ou item não encontrado na wishlist do cliente |
  | 500 | Erro inesperado |

- **Edge cases:**
  - A exclusão é permanente e não pode ser desfeita — não há soft-delete.
  - O backend deve verificar que `customer_wishlist.customer_id = :customerId` antes de excluir, para evitar remoção de item pertencente a outro cliente usando o mesmo `itemId`.

---

## DTOs de domínio

DTOs definidos como Java records no pacote `com.ciet.demo_learn.customer`:

```
CustomerCreateRequest       — body de POST /customers
CustomerUpdateRequest       — body de PUT /customers/{id}
CustomerResponse            — resposta de GET /customers/{id}, POST /customers, PUT /customers/{id}
CustomerSummaryResponse     — item de GET /customers (listagem paginada)
CustomerPageResponse        — wrapper paginado para GET /customers
CustomerSearchResponse      — item de GET /customers/search (com máscara)
WishlistItemCreateRequest   — body de POST /customers/{id}/wishlist
WishlistItemResponse        — item de GET /customers/{id}/wishlist e resposta de POST
```

---

## Requisitos de qualidade

- [ ] I/O-bound identificado? Todas as operações fazem acesso ao banco (SELECT, INSERT, UPDATE). `POST /customers` e `PUT /customers/{id}` envolvem verificação de unicidade seguida de escrita — candidatos a virtual thread (Project Loom, padrão no Java 25 com Spring Boot 4).
- [ ] `GET /customers/search` é chamado com alta frequência pelo PDV e pelos formulários de voucher e compra de usados — a query deve ser eficiente: filtro por `branch_id` + `ILIKE` nos três campos com `OR`, limitado a 20 resultados, usando `LIMIT` explícito na query.
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT: records Java são compatíveis. Atenção às entidades JPA (`@Entity`) — devem estar registradas em `reflect-config.json` se AOT for habilitado.
- [ ] Dados sensíveis: `cpf_cnpj` é dado fiscal sensível. Nunca logar o valor em nível de `INFO` ou superior. Em `GET /customers/search`, retornar com máscara. Nos endpoints de gestão (criação/edição/visualização), retornar sem máscara para permitir conferência pelo Gerente. Não armazenar versão formatada no banco.
- [ ] Autorização por perfil coberta em todos os endpoints: `Caixa` tem acesso exclusivamente a `GET /customers/search`; `Catalogador` não tem acesso a nenhum endpoint deste módulo. Verificar que a proteção está aplicada em nível de Spring Security (não apenas no frontend via `RoleRoute`).

---

## Estratégia de testes

### Fluxo principal (happy path)

- Criar cliente com nome e CPF (11 dígitos): verificar `201`, `branch_id` igual ao do JWT, `cpfCnpj` armazenado sem formatação.
- Criar cliente com nome e CNPJ (14 dígitos): verificar `201`.
- Criar cliente com todos os campos: verificar todos os campos na resposta.
- Editar cliente — alterar telefone: verificar `200` com novo telefone e `updatedAt` atualizado.
- Editar cliente — alterar CPF para um valor diferente e único: verificar `200`.
- Editar cliente — salvar sem alterar o CPF: verificar `200` sem erro de duplicidade.
- Listar clientes sem filtros: verificar ordenação `name ASC` e paginação.
- Listar clientes com filtro `name=ana`: verificar que apenas clientes cujo nome contém "ana" (case-insensitive) são retornados.
- Listar com múltiplos filtros combinados: verificar interseção dos resultados.
- Busca por autocomplete `q=silva`: verificar resposta com máscara nos campos `cpfCnpj` e `phone`.
- Adicionar item à wishlist com título apenas: verificar `201` com `notified = false`.
- Adicionar item com todos os campos (title + author + isbn): verificar `201`.
- Listar wishlist: verificar ordenação `created_at ASC`.
- Remover item da wishlist: verificar `204` e ausência do registro.

### Casos de erro esperados

- `POST /customers` sem `name` → `400`.
- `POST /customers` sem `cpfCnpj` → `400`.
- `POST /customers` com `cpfCnpj` contendo letras → `400`.
- `POST /customers` com `cpfCnpj` de 10 dígitos → `400`.
- `POST /customers` com `cpfCnpj` de 12 dígitos → `400`.
- `POST /customers` com `cpfCnpj` já existente na filial → `409`.
- `PUT /customers/{id}` sem `name` → `400`.
- `PUT /customers/{id}` com `cpfCnpj` de outro cliente da mesma filial → `409`.
- `PUT /customers/{id}` de cliente de outra filial → `403`.
- `GET /customers/{id}` com UUID de cliente de outra filial → `403`.
- `GET /customers/{id}` com UUID inexistente → `404`.
- `GET /customers/search` sem `q` → `400`.
- `GET /customers/search` com `q` de 1 caractere → `400`.
- `POST /customers/{id}/wishlist` sem `title` → `400`.
- `POST /customers/{id}/wishlist` com ISBN duplicado na wishlist → `409`.
- `POST /customers/{id}/wishlist` com título duplicado (sem ISBN) na wishlist → `409`.
- `DELETE /customers/{id}/wishlist/{itemId}` com `itemId` inexistente → `404`.

### Casos de autorização

- `Caixa` acessando `POST /customers` → `403`.
- `Caixa` acessando `GET /customers` (listagem) → `403`.
- `Caixa` acessando `GET /customers/{id}` → `403`.
- `Caixa` acessando `GET /customers/search` → `200` (Caixa tem permissão neste endpoint).
- `Caixa` acessando `POST /customers/{id}/wishlist` → `403`.
- `Catalogador` acessando qualquer endpoint deste módulo → `403`.
- `Gerente` acessando `POST /customers` com dados válidos → `201`.
- `Administrador` acessando `POST /customers` sem query param `branchId` → `400`.
- `Administrador` acessando `POST /customers` com query param `branchId` válido → `201`.
- Usuário não autenticado em qualquer endpoint → `401`.

### Casos de borda das regras de negócio

- Dois cadastros simultâneos com o mesmo CPF/CNPJ na mesma filial: a constraint `idx_customer_branch_cpf_cnpj` deve garantir que apenas um seja persistido; o segundo deve resultar em `409`.
- `PUT /customers/{id}` salvando com o mesmo CPF que o cliente já possui (sem alteração): verificar que a query de unicidade exclui o próprio cliente e retorna `200`.
- `GET /customers/search` com `q` que corresponde a nome, CPF e telefone diferentes: verificar que os três clientes são retornados.
- Wishlist: item com ISBN `null` e título idêntico a item existente com ISBN não nulo: verificar que a verificação de duplicidade considera apenas itens com `isbn IS NULL` — logo, não deve gerar conflito.
- `GET /customers/search` com Caixa autenticado: verificar que apenas clientes da filial do Caixa são retornados (escopo por `branchId` do JWT).

---

## Riscos técnicos e dependências

1. **Constraint de unicidade ausente no schema inicial.** A tabela `customer` definida em `000-01.modelagem-dados` não possui `UNIQUE(branch_id, cpf_cnpj)`. Sem a migration `005-customer-indexes`, a unicidade é garantida apenas na camada de serviço, expondo o sistema a condições de corrida. A migration deve ser executada antes do deployment de qualquer sub-feature de clientes.

2. **`GET /customers/search` é dependência bloqueante para múltiplos módulos.** Os módulos `005-01.emitir-voucher`, `006-01.registrar-compra-lote` e o PDV (`004-xx`) dependem deste endpoint para os seus formulários de seleção de cliente. O endpoint deve ser implementado e estável antes que esses módulos possam ser integrados no frontend. O risco é de bloqueio em paralelo se o domínio `customer` for desenvolvido por último.

3. **`customer_wishlist` lida por `001-01.cadastrar-livro` (pós-commit).** A verificação de match de wishlist ocorre após o commit do cadastro de livro, fora da transação principal. Este módulo é responsável por garantir que os dados em `customer_wishlist` estejam acessíveis e indexados corretamente para que a consulta de `001-01` seja eficiente. Os índices `idx_wishlist_branch_isbn` e `idx_wishlist_branch_notified` são especialmente importantes para evitar full table scans nessa operação.

4. **Ausência de coluna `active` em `customer`.** O schema atual não prevê inativação de clientes. O módulo `005-01` (em seu `tech.md`) observa que a ausência de `active` impede filtrar clientes inativos. Se uma versão futura do produto introduzir soft-delete de clientes, será necessária uma migration para adicionar `active BOOLEAN NOT NULL DEFAULT TRUE` e atualizar todos os endpoints que consultam `customer`. Por ora, todos os registros em `customer` são considerados ativos.

5. **CPF/CNPJ sem validação de dígitos verificadores no backend.** O `business.md` especifica que a validação de formato (estrutura e dígitos verificadores) é responsabilidade da interface. O backend valida apenas comprimento (11 ou 14 dígitos) e composição numérica. Se o frontend for contornado, CPFs inválidos podem ser persistidos. Risco aceito para este escopo.
