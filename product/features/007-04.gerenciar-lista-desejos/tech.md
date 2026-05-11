# Gerenciar Lista de Desejos — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `007-00.clientes`. Implementa o CRUD de itens da lista de desejos de um cliente específico, expondo três endpoints REST: listagem, adição e remoção de itens. Opera exclusivamente sobre a tabela `customer_wishlist` já definida em `000-01.modelagem-dados`.

Esta feature **não implementa** a lógica de notificação de chegada de livro desejado — essa responsabilidade pertence ao fluxo `001-01.cadastrar-livro` (que verifica a wishlist após salvar o livro) em conjunto com o módulo `014-01` (que gera a notificação). O campo `notified` é preenchido por aquele fluxo, não por este.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura e escrita em `customer_wishlist`; leitura em `customer` (validação de existência e pertencimento à filial) |
| Serviço | Validação de unicidade de item, verificação de escopo de filial, autorização por perfil |
| Frontend | Tela `/clientes/:id/lista-desejos`; formulário inline de adição e botão de remoção por item |

Domínios externos que esta feature lê:

| Domínio | Tabela | Direção |
|---------|--------|---------|
| Clientes (`007-xx`) | `customer` | leitura — validação de existência e filial do cliente |
| Autenticação (`000-02`) | JWT `branchId`, `roles` | leitura — escopo de filial e autorização |

## Modelo de dados

### Novas tabelas / alterações de schema

Esta feature **não cria tabelas novas nem altera o schema**. A tabela `customer_wishlist` já existe no changeSet `001-initial-schema` de `000-01.modelagem-dados`.

#### `customer_wishlist` — estrutura existente utilizada

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `customer_id` | `UUID` | NOT NULL | — | FK → `customer(id)` ON DELETE CASCADE |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `title` | `TEXT` | NOT NULL | — | obrigatório por regra de negócio |
| `author` | `TEXT` | NULL | — | opcional |
| `isbn` | `TEXT` | NULL | — | opcional; utilizado como critério de unicidade quando presente |
| `notified` | `BOOLEAN` | NOT NULL | `FALSE` | preenchido pelo fluxo de `001-01.cadastrar-livro` + `014-01`; nunca escrito por esta feature |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | — |

> A coluna `notified` desta tabela equivale ao campo `notified_at` mencionado no contexto da tarefa — o schema real usa o booleano `notified` conforme definido em `000-01`. Esta feature apenas lê esse campo para exibição; nunca o escreve.

#### Índice existente

O índice `idx_wishlist_customer ON customer_wishlist(customer_id)` já foi definido em `000-01.modelagem-dados`. É suficiente para as consultas desta feature.

#### Índice adicional recomendado

> A unicidade por ISBN dentro de um cliente precisa ser verificada eficientemente. O índice composto abaixo também serve como constraint de unicidade parcial para o caso ISBN preenchido.

```sql
-- Unicidade por ISBN por cliente (parcial: apenas quando isbn não é nulo)
CREATE UNIQUE INDEX idx_wishlist_customer_isbn
    ON customer_wishlist(customer_id, isbn)
    WHERE isbn IS NOT NULL;

-- Unicidade por título por cliente (parcial: apenas quando isbn é nulo)
-- Não é possível expressar a regra "title único somente quando isbn é nulo" como UNIQUE INDEX
-- sem redundância com o índice acima. A unicidade por título sem ISBN é verificada na camada de serviço.
```

> A lógica de unicidade tem dois casos mutuamente exclusivos: (a) se `isbn` for informado, o par `(customer_id, isbn)` deve ser único — garantido pelo índice parcial; (b) se `isbn` não for informado, o par `(customer_id, title)` deve ser único — verificado pelo serviço com `SELECT 1 FROM customer_wishlist WHERE customer_id = ? AND isbn IS NULL AND LOWER(title) = LOWER(?)` antes da inserção. Essa separação é necessária porque o ISBN tem precedência sobre o título como identificador de unicidade, conforme a regra de negócio 4.

### Estratégia de migração

Um novo changeSet deve ser criado para adicionar o índice parcial de unicidade por ISBN. O índice geral `idx_wishlist_customer` já existe e não é recriado.

```sql
-- changeSet: 003-wishlist-indexes
CREATE UNIQUE INDEX idx_wishlist_customer_isbn
    ON customer_wishlist(customer_id, isbn)
    WHERE isbn IS NOT NULL;
```

Rollback: `DROP INDEX idx_wishlist_customer_isbn`.

Dados existentes: o índice pode falhar na criação se já existirem duplicatas de ISBN por cliente na base. Em ambiente de desenvolvimento, a base deve estar limpa. Em produção futura, verificar duplicatas antes de aplicar o changeSet.

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `branch_id` de escopo é extraído do claim `branchId` do JWT. Para o Administrador, `branch_id` pode ser fornecido via query param `branch_id`. Ausência ou invalidade do cookie → `401`. Perfil sem permissão → `403`.

---

### `GET /customers/{customerId}/wishlist`

Retorna todos os itens da lista de desejos do cliente.

- **Authorization:** `Gerente`, `Administrador`
- **Path param:** `customerId` — UUID do cliente
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `branch_id` | `UUID` | não | apenas para `Administrador`; ignorado para outros perfis |

- **Response `200`:**

  ```json
  {
    "customer_id": "uuid",
    "customer_name": "string",
    "items": [
      {
        "id": "uuid",
        "title": "string",
        "author": "string|null",
        "isbn": "string|null",
        "notified": false,
        "created_at": "ISO-8601"
      }
    ],
    "total": 0
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|---------------|
  | `200` | Lista retornada com sucesso (pode ser vazia) |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil sem permissão (`Caixa`, `Catalogador`), ou cliente pertence a outra filial |
  | `404` | `customerId` não encontrado |
  | `500` | Erro inesperado |

- **Edge cases:**
  - O serviço deve verificar se `customer.branch_id` coincide com o `branchId` do JWT antes de retornar os dados. Se o cliente existir mas pertencer a outra filial, retorna `403` (não `404`), para não vazar informações de existência de clientes de outras filiais.
  - Lista vazia retorna `200` com `items: []` e `total: 0`, não `404`.
  - Itens são ordenados por `created_at ASC` (mais antigos primeiro).

---

### `POST /customers/{customerId}/wishlist`

Adiciona um novo item à lista de desejos do cliente.

- **Authorization:** `Gerente`, `Administrador`
- **Path param:** `customerId` — UUID do cliente
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `title` | `string` | sim | não vazio; máx. 500 caracteres |
  | `author` | `string` | não | máx. 300 caracteres; `null` ou ausente aceito |
  | `isbn` | `string` | não | quando presente: formato ISBN-10 ou ISBN-13 (hifens normalizados antes da validação); `null` ou ausente aceito |

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "customer_id": "uuid",
    "title": "string",
    "author": "string|null",
    "isbn": "string|null",
    "notified": false,
    "created_at": "ISO-8601"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|---------------|
  | `201` | Item criado com sucesso |
  | `400` | `title` ausente ou vazio; ISBN em formato inválido |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil sem permissão, ou cliente pertence a outra filial |
  | `404` | `customerId` não encontrado |
  | `409` | Item duplicado: mesmo ISBN já existe para este cliente (quando ISBN informado), ou mesmo título já existe para este cliente sem ISBN associado (quando ISBN não informado) |
  | `500` | Erro inesperado |

- **Edge cases:**
  - O `branch_id` do item é sempre definido pelo servidor a partir do JWT (ou query param para Administrador). Nunca é aceito do cliente.
  - O campo `notified` é sempre iniciado como `false` pelo servidor. Nunca é aceito do cliente.
  - Antes de inserir, o serviço executa a verificação de unicidade:
    - Se `isbn` informado: `SELECT 1 FROM customer_wishlist WHERE customer_id = ? AND isbn = ?` → se encontrado, `409`.
    - Se `isbn` não informado: `SELECT 1 FROM customer_wishlist WHERE customer_id = ? AND isbn IS NULL AND LOWER(title) = LOWER(?)` → se encontrado, `409`.
  - ISBN deve ser normalizado (remover hifens e espaços) antes da validação de formato e da persistência.

---

### `DELETE /customers/{customerId}/wishlist/{itemId}`

Remove permanentemente um item da lista de desejos do cliente.

- **Authorization:** `Gerente`, `Administrador`
- **Path params:**
  - `customerId` — UUID do cliente
  - `itemId` — UUID do item da lista de desejos

- **Response `204`:** sem corpo

- **Status codes:**

  | Código | Quando ocorre |
  |--------|---------------|
  | `204` | Item removido com sucesso |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil sem permissão, ou cliente pertence a outra filial |
  | `404` | `customerId` não encontrado, ou `itemId` não encontrado ou não pertence ao cliente informado |
  | `500` | Erro inesperado |

- **Edge cases:**
  - O serviço deve verificar que o item pertence ao cliente informado na rota (`customer_wishlist.customer_id = customerId`) além de existir. Se o item existir mas pertencer a outro cliente, retorna `404`.
  - A remoção é permanente — não há soft-delete para itens de wishlist.
  - Itens com `notified = true` podem ser removidos normalmente; não há bloqueio para esse caso.

---

## DTOs de domínio

```
WishlistItemCreateRequest  — body de POST /customers/{customerId}/wishlist
WishlistItemResponse       — item individual na resposta de GET e POST
WishlistResponse           — resposta completa de GET /customers/{customerId}/wishlist
```

## Requisitos de qualidade

- [ ] I/O-bound identificado? Todas as operações são I/O-bound (consultas e escritas em PostgreSQL) — candidatos a virtual threads (Project Loom, habilitado por padrão no Java 25 com Spring Boot 4).
- [ ] Paths com GraalVM AOT identificados? Os records de request/response são suficientes; nenhuma reflexão dinâmica adicional introduzida por este fluxo.
- [ ] Dados sensíveis tratados? A tabela `customer_wishlist` não contém CPF, senha ou token. O `customer_id` e `branch_id` são UUIDs e não são considerados sensíveis. O CPF do cliente está na tabela `customer` e não é lido nem retornado por esta feature.
- [ ] Autorização por perfil coberta? `Caixa` e `Catalogador` recebem `403` em todos os endpoints desta feature. `Gerente` opera apenas sobre clientes da própria filial (`branchId` do JWT). `Administrador` requer `branch_id` via query param; ausência deve retornar `400` ("filial obrigatória para Administrador").

## Estratégia de testes

### Fluxo principal (happy path)

- Listar wishlist de cliente com itens; verificar resposta `200` com `items` ordenados por `created_at ASC`.
- Listar wishlist de cliente sem itens; verificar `200` com `items: []` e `total: 0`.
- Adicionar item com apenas título; verificar `201`, `notified = false`, `branch_id` preenchido pela filial do JWT.
- Adicionar item com título, autor e ISBN; verificar todos os campos persistidos.
- Remover item existente; verificar `204` e ausência do registro em `customer_wishlist`.
- Verificar que item com `notified = true` pode ser removido normalmente.

### Casos de erro esperados (validação e conflito)

- `POST` sem título → `400`.
- `POST` com ISBN em formato inválido (ex.: `"123"`) → `400`.
- `POST` com ISBN já existente para o mesmo cliente → `409`.
- `POST` com título já existente para o mesmo cliente (sem ISBN) → `409`.
- `POST` com mesmo título mas ISBN diferente → `201` (título sem ISBN é critério independente do ISBN).
- `DELETE` com `itemId` inexistente → `404`.
- `DELETE` com `itemId` de outro cliente → `404`.
- `GET`/`POST`/`DELETE` com `customerId` inexistente → `404`.

### Casos de autorização

- `Caixa` tentando `GET /customers/{id}/wishlist` → `403`.
- `Catalogador` tentando `POST /customers/{id}/wishlist` → `403`.
- `Gerente` acessando wishlist de cliente de outra filial → `403`.
- Requisição sem cookie `auth_token` → `401`.
- JWT expirado → `401`.
- `Administrador` sem query param `branch_id` → `400`.

### Casos de borda das regras de negócio

- Adicionar item com ISBN `"978-85-359-1484-9"` (com hifens); verificar que é normalizado para `"9788535914849"` antes da persistência e validação de unicidade.
- Adicionar dois itens para o mesmo cliente: primeiro com ISBN, segundo com mesmo título mas sem ISBN → ambos devem ser aceitos (unicidade é por ISBN quando presente, por título quando ISBN ausente).
- Verificar que `notified` retornado na listagem reflete o valor atual do banco (pode ser `true` se `001-01` já disparou a notificação).
- Administrador com `branch_id` via query param adicionando item; verificar que `customer_wishlist.branch_id` é preenchido com o `branch_id` do query param, não com o `branchId` do JWT (que é `null` para Administrador).

## Riscos técnicos e dependências

1. **Dependência de leitura por `001-01.cadastrar-livro`.** O fluxo de cadastro de livro lê `customer_wishlist` após o commit para verificar matches e gerar notificações. A tabela e os índices desta feature são pré-requisitos para que o fluxo de `001-01` funcione corretamente. A ordem de implementação recomendada é: `007-04` (schema + CRUD) antes de `001-01` (lógica de notificação).

2. **Unicidade parcial por título (sem ISBN) é aplicação-only.** O índice `idx_wishlist_customer_isbn` cobre apenas o caso com ISBN. A unicidade por título quando ISBN está ausente é verificada via `SELECT` no serviço antes do `INSERT`, o que abre uma janela de race condition em inserções concorrentes. Para o volume esperado de uma livraria, o risco é aceitável. Se necessário, pode ser mitigado com `INSERT ... ON CONFLICT DO NOTHING` e verificação do resultado.

3. **Campo `notified` nunca é escrito por esta feature.** O agente de implementação não deve incluir esse campo em `WishlistItemCreateRequest` nem expor endpoint de atualização dele. Qualquer escrita em `notified` deve vir exclusivamente do fluxo `001-01` + `014-01`. Um endpoint acidental de PATCH nesta feature quebraria a invariante de notificação única.

4. **Administrador sem `branchId` no JWT.** O claim `branchId` é `null` para o Administrador. O serviço deve exigir query param `branch_id` explícito quando o perfil for Administrador; ausência deve retornar `400`. Sem esse tratamento, `customer_wishlist.branch_id = null` violaria o `NOT NULL` constraint e causaria `500`.

5. **Isolamento de filial no acesso ao cliente.** A verificação `customer.branch_id = branchId_do_JWT` é obrigatória em todos os endpoints antes de qualquer operação. Sem ela, um Gerente poderia visualizar ou modificar a wishlist de clientes de outras filiais.
