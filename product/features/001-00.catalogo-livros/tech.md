# Catálogo de Livros — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo central do sistema. Define o modelo de dados que sustenta todas as operações sobre livros — tabelas `book`, `book_image`, `book_stock` e `price_history` — e expõe os endpoints REST consumidos pelas seis sub-features (001-01 a 001-06). Não introduz novas tabelas: todas já estão definidas no schema inicial de `000-01.modelagem-dados`. O módulo adiciona índices complementares e especifica os contratos de API, regras de autorização e invariantes de dados que as sub-features devem respeitar.

Camadas afetadas: persistência (JPA sobre PostgreSQL 18), serviços de domínio (validação, histórico de preços, notificações de wishlist), e frontend React com rotas `/books`, `/books/new`, `/books/:id`, `/books/:id/edit`, `/books/:id/images` e `/books/search`.

Domínios externos que este módulo lê ou escreve:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — escopo de filial de todos os registros |
| Usuários/Auth (`000-01`, `000-02`) | `user`, `user_role`, `role` | leitura — identificação do ator e autorização |
| Lotes de usados (`006-xx`) | `used_book_purchase`, `used_book_purchase_item` | leitura (validação do lote) + escrita (vínculo do livro ao lote) — dependência futura, ver Riscos |
| Lista de desejos (`007-xx`) | `customer_wishlist` | leitura — verificação de match para gerar notificação `book_arrival` |
| Notificações | `notification` | escrita — inserção de `book_arrival` ao cadastrar livro que bate com wishlist |
| Descontos (`003-xx`) | `discount_book` | leitura indireta — desconto de livro referencia `book.id` |
| PDV (`004-xx`) | `sale_item` | leitura indireta — item de venda referencia `book.id` |

## Modelo de dados

### Tabelas existentes utilizadas pelo módulo

Todas as tabelas abaixo já existem pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`. Este módulo **não cria novas tabelas**; apenas complementa índices e documenta as invariantes de uso.

#### `book`

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `title` | `TEXT` | NOT NULL | — | — |
| `author` | `TEXT` | NOT NULL | — | — |
| `isbn` | `TEXT` | NULL | — | — |
| `publisher` | `TEXT` | NULL | — | — |
| `year` | `INTEGER` | NULL | — | — |
| `category` | `TEXT` | NOT NULL | — | obrigatório por regra de negócio; NOT NULL no nível de aplicação |
| `condition` | `TEXT` | NOT NULL | — | valores aceitos: `'new'` \| `'used'`; imutável após criação |
| `condition_description` | `TEXT` | NULL | — | obrigatório na camada de serviço quando `condition = 'used'` |
| `sale_price` | `NUMERIC(10,2)` | NOT NULL | — | deve ser > 0 |
| `description` | `TEXT` | NULL | — | — |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `shelf_location` | `TEXT` | NULL | — | texto livre |
| `registered_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável após criação |
| `active` | `BOOLEAN` | NOT NULL | `TRUE` | exclusão lógica |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | — |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | atualizado a cada `PUT` |

> `category` está definido como `TEXT` nullable no schema original. A obrigatoriedade é imposta na camada de validação (`@NotBlank`). Nenhuma migração de schema é necessária — a constraint de negócio é aplicação-only.

> `condition` não possui `CHECK` constraint no banco (política do schema: enums validados no serviço). O serviço deve rejeitar valores fora do conjunto `{'new', 'used'}` com `400`.

> O campo `lot_id` mencionado na regra de negócio 9 **não existe como coluna em `book`**. O vínculo com o lote é feito exclusivamente pela tabela `used_book_purchase_item` (coluna `book_id`). Ver seção de riscos.

#### `book_image`

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `book_id` | `UUID` | NOT NULL | — | FK → `book(id)` ON DELETE CASCADE |
| `url` | `TEXT` | NOT NULL | — | URL do arquivo armazenado |
| `order` | `INTEGER` | NOT NULL | `0` | ordem de exibição; não há UNIQUE constraint — aplicação gerencia sequência |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | — |

Limite de 10 imagens por livro: verificado na camada de serviço com `COUNT(id) WHERE book_id = ?` antes de cada inserção. Não há constraint de banco.

#### `book_stock`

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `book_id` | `UUID` | NOT NULL | — | FK → `book(id)` ON DELETE CASCADE |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `quantity` | `INTEGER` | NOT NULL | `0` | — |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | — |
| — | — | — | — | UNIQUE(`book_id`, `branch_id`) |

Livros usados sempre têm `quantity = 1`, definido na criação. Livros novos têm `quantity` informado pelo usuário (mínimo 1). A edição pode ajustar a quantidade de livros novos.

#### `price_history`

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `book_id` | `UUID` | NOT NULL | — | FK → `book(id)` ON DELETE CASCADE |
| `previous_price` | `NUMERIC(10,2)` | NOT NULL | — | — |
| `new_price` | `NUMERIC(10,2)` | NOT NULL | — | — |
| `changed_by` | `UUID` | NOT NULL | — | FK → `user(id)` |
| `changed_at` | `TIMESTAMP` | NOT NULL | `now()` | — |

O registro em `price_history` deve ser inserido **antes** do `UPDATE` em `book.sale_price`, dentro da mesma transação. Isso garante consistência caso o `UPDATE` falhe.

### Estratégia de migração

Nenhuma tabela nova é criada por este módulo. O schema já existe em `000-01.modelagem-dados` (changeSet `001-initial-schema`).

Este módulo introduz índices complementares que devem ser adicionados em um novo changeSet (`002-book-catalog-indexes`) para não reescrever o changeSet original. Os índices de `000-01.modelagem-dados` já cobrem `idx_book_branch`, `idx_book_isbn`, `idx_book_title` e `idx_book_author`. Os índices abaixo são complementares:

```sql
-- Filtros de listagem por condição e categoria dentro de uma filial
CREATE INDEX idx_book_branch_condition ON book(branch_id, condition);
CREATE INDEX idx_book_branch_category  ON book(branch_id, category);

-- Busca de livros ativos (listagem e busca excluem active = false)
CREATE INDEX idx_book_branch_active    ON book(branch_id, active);

-- Ordenação por data de cadastro na listagem
CREATE INDEX idx_book_registered_at    ON book(branch_id, registered_at DESC);

-- Ordem de exibição das imagens de um livro
CREATE INDEX idx_book_image_order      ON book_image(book_id, "order");

-- Estoque por filial (leitura durante visualização e listagem)
CREATE INDEX idx_book_stock_book       ON book_stock(book_id, branch_id);
```

Rollback seguro: `DROP INDEX` em cada índice sem perda de dados.

Dados existentes não requerem migração — os índices são criados sem restrições de valor.

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade do cookie → `401`. Perfil sem permissão para a operação → `403`. O `branch_id` de escopo é extraído do claim `branchId` do JWT, exceto para o Administrador, que pode passar `branch_id` como query param para alternar o contexto de filial.

---

### `POST /books`

Cria um novo livro. Corresponde a `001-01.cadastrar-livro`.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Request body:**

  | Campo | Tipo | Obrigatório | Validação |
  |-------|------|-------------|-----------|
  | `title` | `string` | sim | não vazio; máx. 500 caracteres |
  | `author` | `string` | sim | não vazio; máx. 300 caracteres |
  | `isbn` | `string` | sim | não vazio; formato ISBN-10 ou ISBN-13 |
  | `publisher` | `string` | não | máx. 300 caracteres |
  | `year` | `integer` | não | entre 1 e ano corrente |
  | `category` | `string` | sim | não vazio; máx. 150 caracteres |
  | `condition` | `string` | sim | `"new"` ou `"used"` |
  | `condition_description` | `string` | condicional | obrigatório quando `condition = "used"`; máx. 1000 caracteres |
  | `sale_price` | `number` | sim | > 0; máx. 2 casas decimais |
  | `quantity` | `integer` | condicional | obrigatório quando `condition = "new"`; mínimo 1; ignorado quando `condition = "used"` (fixado em 1 pelo serviço) |
  | `shelf_location` | `string` | não | máx. 100 caracteres |
  | `description` | `string` | não | máx. 2000 caracteres |
  | `lot_id` | `UUID` | não | deve referenciar um `used_book_purchase.id` existente na mesma filial; aceito apenas quando `condition = "used"` |

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "title": "string",
    "author": "string",
    "isbn": "string",
    "publisher": "string",
    "year": 0,
    "category": "string",
    "condition": "new|used",
    "condition_description": "string|null",
    "sale_price": 0.00,
    "description": "string|null",
    "shelf_location": "string|null",
    "branch_id": "uuid",
    "registered_at": "ISO-8601",
    "active": true,
    "stock_quantity": 1
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `201` | Livro criado com sucesso |
  | `400` | Falha de validação (campo inválido, `condition_description` ausente para usado, `quantity` ausente para novo, `sale_price` ≤ 0) |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Caixa` tentando criar livro |
  | `404` | `lot_id` informado não encontrado na filial |
  | `409` | Não aplicável neste endpoint |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Quando `lot_id` é informado, o serviço insere um registro em `used_book_purchase_item` dentro da mesma transação que cria o livro. Se o lote não pertencer à filial do usuário, retorna `404`.
  - Após criar o livro, o serviço verifica `customer_wishlist` da filial por correspondência de `title`, `author` ou `isbn` (case-insensitive, busca parcial para título e autor). Para cada match, insere uma notificação `book_arrival` em `notification` para todos os usuários com perfil `Gerente` e `Caixa` da filial. Essa operação ocorre fora da transação principal (falha na notificação não reverte o cadastro).
  - `registered_at` é sempre definido pelo servidor (`now()`); o cliente não envia este campo.

---

### `GET /books`

Lista os livros da filial com filtros e paginação. Corresponde a `001-03.listar-livros`.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `condition` | `string` | não | `"new"` ou `"used"` |
  | `category` | `string` | não | filtro exato por categoria |
  | `min_price` | `number` | não | preço de venda mínimo (inclusivo) |
  | `max_price` | `number` | não | preço de venda máximo (inclusivo) |
  | `sort` | `string` | não | `"title"` \| `"sale_price"` \| `"registered_at"` (padrão: `"registered_at"`) |
  | `direction` | `string` | não | `"asc"` \| `"desc"` (padrão: `"desc"`) |
  | `page` | `integer` | não | página (0-based, padrão: `0`) |
  | `size` | `integer` | não | itens por página (padrão: `20`, máx.: `100`) |
  | `branch_id` | `UUID` | não | apenas para `Administrador`; ignorado para demais perfis |

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "title": "string",
        "author": "string",
        "category": "string",
        "condition": "new|used",
        "sale_price": 0.00,
        "stock_quantity": 0,
        "shelf_location": "string|null"
      }
    ],
    "page": 0,
    "size": 20,
    "total_elements": 0,
    "total_pages": 0
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Lista retornada (pode ser vazia) |
  | `400` | Parâmetro de filtro inválido (ex.: `condition = "invalid"`) |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | — (todos os perfis autenticados têm acesso) |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Retorna apenas livros com `active = true` da filial.
  - Lista vazia retorna `200` com `content: []`, não `404`.
  - `stock_quantity` é lido de `book_stock.quantity` via JOIN; se não houver registro em `book_stock`, retorna `0`.

---

### `GET /books/search`

Busca livros por título, autor ou ISBN. Corresponde a `001-05.buscar-livros`.

> Esta rota deve ser registrada **antes** de `GET /books/:id` no roteador para evitar que `search` seja interpretado como um UUID.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `q` | `string` | sim | termo de busca; mínimo 1 caractere; máx. 200 caracteres |
  | `branch_id` | `UUID` | não | apenas para `Administrador` |
  | `page` | `integer` | não | padrão: `0` |
  | `size` | `integer` | não | padrão: `20`, máx.: `100` |

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "title": "string",
        "author": "string",
        "category": "string",
        "condition": "new|used",
        "sale_price": 0.00,
        "stock_quantity": 0
      }
    ],
    "page": 0,
    "size": 20,
    "total_elements": 0,
    "total_pages": 0
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Resultados retornados (pode ser vazia) |
  | `400` | `q` ausente ou vazio |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | — (todos os perfis autenticados têm acesso) |
  | `500` | Erro inesperado |

- **Edge cases:**
  - A busca usa `ILIKE '%termo%'` em `title` e `author`; para `isbn` usa `ILIKE '%termo%'` (busca parcial, conforme regra de negócio).
  - Retorna apenas livros com `active = true` da filial.
  - Busca sem resultados retorna `200` com `content: []`.

---

### `GET /books/{id}`

Retorna o registro completo de um livro. Corresponde a `001-04.visualizar-livro`.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa`
- **Path param:** `id` — UUID do livro
- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "title": "string",
    "author": "string",
    "isbn": "string|null",
    "publisher": "string|null",
    "year": 0,
    "category": "string",
    "condition": "new|used",
    "condition_description": "string|null",
    "sale_price": 0.00,
    "description": "string|null",
    "shelf_location": "string|null",
    "branch_id": "uuid",
    "registered_at": "ISO-8601",
    "active": true,
    "stock_quantity": 0,
    "images": [
      {
        "id": "uuid",
        "url": "string",
        "order": 0
      }
    ]
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Livro encontrado e pertence à filial do usuário |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Livro existe mas pertence a outra filial |
  | `404` | UUID não encontrado |
  | `500` | Erro inesperado |

- **Edge cases:**
  - `images` é retornado ordenado por `book_image.order ASC`.
  - `stock_quantity` vem de `book_stock`; se não existir, retorna `0`.

---

### `PUT /books/{id}`

Atualiza os dados de um livro existente. Corresponde a `001-02.editar-livro`.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Path param:** `id` — UUID do livro
- **Request body:**

  | Campo | Tipo | Obrigatório | Validação |
  |-------|------|-------------|-----------|
  | `title` | `string` | sim | não vazio; máx. 500 caracteres |
  | `author` | `string` | sim | não vazio; máx. 300 caracteres |
  | `isbn` | `string` | sim | não vazio; formato ISBN-10 ou ISBN-13 |
  | `publisher` | `string` | não | máx. 300 caracteres |
  | `year` | `integer` | não | entre 1 e ano corrente |
  | `category` | `string` | sim | não vazio; máx. 150 caracteres |
  | `condition_description` | `string` | condicional | obrigatório quando livro tem `condition = "used"` |
  | `sale_price` | `number` | sim | > 0; máx. 2 casas decimais |
  | `quantity` | `integer` | condicional | obrigatório e ≥ 0 apenas quando livro tem `condition = "new"` |
  | `shelf_location` | `string` | não | máx. 100 caracteres |
  | `description` | `string` | não | máx. 2000 caracteres |

  > Campos imutáveis que **não devem ser aceitos** no body (ignorados ou rejeitados com `400`): `condition`, `registered_at`, `lot_id`, `branch_id`.

- **Response `200`:** mesmo formato de `GET /books/{id}`

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Livro atualizado com sucesso |
  | `400` | Falha de validação (campo inválido, `condition_description` ausente para usado, `sale_price` ≤ 0) |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Livro pertence a outra filial, ou perfil `Caixa` |
  | `404` | UUID não encontrado |
  | `409` | Não aplicável |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Se `sale_price` no body for diferente do `sale_price` atual do livro, o serviço deve: (1) inserir registro em `price_history` com `previous_price`, `new_price`, `changed_by` (do JWT) e `changed_at = now()`, (2) atualizar `book.sale_price` — tudo em uma única transação.
  - Alterações em outros campos não geram `price_history`.
  - `condition` não pode ser alterado; se enviado, deve ser ignorado (ou rejeitado com `400` — preferível para explicitar a restrição ao cliente).

---

### `GET /books/{id}/isbn-prefill`

Busca dados internos por ISBN para pré-preenchimento do formulário de cadastro. Corresponde à regra 4 de `001-01.cadastrar-livro`.

> Esse endpoint existe porque a busca por ISBN deve pesquisar apenas o catálogo interno, sem chamar APIs externas. É chamado pelo frontend ao sair do campo ISBN no formulário de cadastro.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `isbn` | `string` | sim | valor do ISBN a buscar |

- **Response `200`:** retorna os dados do registro mais recente com aquele ISBN na base (qualquer filial):

  ```json
  {
    "title": "string",
    "author": "string",
    "publisher": "string|null",
    "year": 0,
    "category": "string"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Dados encontrados para pré-preenchimento |
  | `400` | `isbn` ausente ou vazio |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Caixa` |
  | `404` | Nenhum livro com o ISBN informado encontrado no catálogo interno |
  | `500` | Erro inesperado |

- **Edge cases:**
  - A busca não é restrita à filial do usuário — percorre todo o catálogo interno para maximizar chances de pré-preenchimento.
  - Quando múltiplos registros com o mesmo ISBN existem, retorna os dados do mais recente (`registered_at DESC LIMIT 1`).

---

### `POST /books/{id}/images`

Faz upload de uma nova imagem para o livro. Corresponde a `001-06.gerenciar-imagens-livro`.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa`
- **Path param:** `id` — UUID do livro
- **Request:** `multipart/form-data`

  | Campo | Tipo | Obrigatório | Validação |
  |-------|------|-------------|-----------|
  | `file` | `binary` | sim | formatos aceitos: JPEG, PNG, WebP; tamanho máx.: a definir na implementação (sugestão: 10 MB) |

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "url": "string",
    "order": 0
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `201` | Imagem salva com sucesso |
  | `400` | Formato de arquivo inválido |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Livro pertence a outra filial |
  | `404` | Livro não encontrado |
  | `409` | Livro já possui 10 imagens (limite atingido) |
  | `500` | Erro inesperado |

- **Edge cases:**
  - O serviço deve contar as imagens existentes (`SELECT COUNT(*) FROM book_image WHERE book_id = ?`) antes de salvar. Se `count >= 10`, retorna `409`.
  - O campo `order` é definido como `max(order) + 1` das imagens existentes do livro (nova imagem vai para o final da galeria).
  - A URL armazenada em `book_image.url` aponta para o arquivo no sistema de armazenamento (filesystem local em dev; estratégia de armazenamento de produção a definir na implementação).

---

### `PATCH /books/{id}/images/reorder`

Atualiza a ordem das imagens de um livro. Corresponde a `001-06.gerenciar-imagens-livro`.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa`
- **Path param:** `id` — UUID do livro
- **Request body:**

  ```json
  {
    "order": [
      { "image_id": "uuid", "order": 0 },
      { "image_id": "uuid", "order": 1 }
    ]
  }
  ```

  | Campo | Tipo | Obrigatório | Validação |
  |-------|------|-------------|-----------|
  | `order` | `array` | sim | não vazio; cada item tem `image_id` (UUID) e `order` (integer ≥ 0); todos os IDs devem pertencer ao livro |

- **Response `200`:** lista completa de imagens do livro após reordenação, no mesmo formato do campo `images` de `GET /books/{id}`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Ordem atualizada com sucesso |
  | `400` | Array vazio, `image_id` inválido, ou `order` negativo |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Livro pertence a outra filial |
  | `404` | Livro não encontrado, ou algum `image_id` não pertence ao livro |
  | `500` | Erro inesperado |

---

### `DELETE /books/{id}/images/{imageId}`

Remove uma imagem do livro. Corresponde a `001-06.gerenciar-imagens-livro`.

- **Authorization:** `Administrador`, `Gerente`, `Catalogador`, `Caixa`
- **Path params:** `id` — UUID do livro; `imageId` — UUID da imagem
- **Response `204`:** sem corpo

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `204` | Imagem removida com sucesso |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Livro pertence a outra filial |
  | `404` | Livro ou imagem não encontrados |
  | `500` | Erro inesperado |

- **Edge cases:**
  - O `ON DELETE CASCADE` em `book_image` garante que remover um livro remove suas imagens. Para remoção individual de imagem, a exclusão é feita diretamente em `book_image`.
  - A reordenação dos valores de `order` restantes após remoção é opcional (não afeta exibição, pois a ordenação é por `ORDER BY "order" ASC`).

---

## DTOs de domínio

Os DTOs abaixo cobrem os contratos de entrada e saída do módulo. São definidos como Java records no pacote `com.ciet.demo_learn.catalog`.

```
BookCreateRequest       — body de POST /books
BookUpdateRequest       — body de PUT /books/{id}
BookResponse            — resposta de GET /books/{id} e PUT /books/{id}
BookSummaryResponse     — item de GET /books e GET /books/search
BookPageResponse        — wrapper paginado para GET /books e GET /books/search
IsbnPrefillResponse     — resposta de GET /books/{id}/isbn-prefill
ImageUploadResponse     — resposta de POST /books/{id}/images
ImageReorderRequest     — body de PATCH /books/{id}/images/reorder
ImageOrderItem          — item dentro de ImageReorderRequest
ImageResponse           — item de imagem em BookResponse e PATCH reorder response
```

## Requisitos de qualidade

- [ ] I/O-bound identificado: chamadas a PostgreSQL em todos os endpoints — candidatos a virtual threads (Project Loom, habilitado por padrão no Java 25 com Spring Boot 4).
- [ ] O upload de imagem (`POST /books/{id}/images`) é I/O intensivo (leitura de stream multipart + escrita em disco/storage); deve ser tratado com virtual thread e não bloquear threads de plataforma.
- [ ] GraalVM AOT: records Java são compatíveis. Atenção a reflexão nos mapeamentos JPA (`@Entity`) — devem estar registrados em `reflect-config.json` se AOT for habilitado.
- [ ] Dados sensíveis: nenhuma coluna em `book`, `book_image`, `book_stock` ou `price_history` contém CPF, CNPJ, senha ou token. O `changed_by` em `price_history` é UUID de usuário — não exposto diretamente nas respostas do módulo.
- [ ] Autorização por perfil coberta em todos os endpoints: `Caixa` tem acesso somente leitura (`GET /books`, `GET /books/{id}`, `GET /books/search`, `POST /books/{id}/images`, `DELETE /books/{id}/images/{imageId}`, `PATCH /books/{id}/images/reorder`). Operações de escrita no registro do livro (`POST /books`, `PUT /books/{id}`) são restritas a `Administrador`, `Gerente` e `Catalogador`.
- [ ] Isolamento por filial verificado no backend para todos os endpoints — o `branch_id` do JWT nunca é substituído pelo cliente, exceto para o perfil `Administrador` via query param.

## Estratégia de testes

### Fluxo principal (happy path)

- Criar um livro novo com todos os campos obrigatórios; verificar `201` com `registered_at` preenchido pelo servidor e entrada em `book_stock` com `quantity` correto.
- Criar um livro usado sem `lot_id`; verificar `condition_description` persistido.
- Criar um livro usado com `lot_id` válido; verificar registro criado em `used_book_purchase_item`.
- Listar livros com filtro `condition = "used"` e verificar que apenas usados retornam.
- Listar livros com paginação; verificar campos `total_elements` e `total_pages`.
- Buscar por título parcial; verificar que resultados com substring retornam.
- Buscar por ISBN parcial; verificar correspondência.
- Visualizar livro; verificar que `images` está ordenado por `order`.
- Editar livro sem alterar preço; verificar que nenhuma entrada em `price_history` é criada.
- Editar livro com novo preço; verificar entrada em `price_history` com `previous_price` e `changed_by` corretos.
- Fazer upload de imagem; verificar `order = max(order) + 1` e `201`.
- Reordenar imagens; verificar nova sequência persistida.
- Remover imagem; verificar `204` e ausência do registro em `book_image`.
- Buscar ISBN existente; verificar campos de pré-preenchimento retornados.

### Casos de erro esperados

- `POST /books` sem `condition_description` para livro `used` → `400`.
- `POST /books` com `sale_price = 0` → `400`.
- `POST /books` com `lot_id` inexistente → `404`.
- `POST /books` com `quantity = 0` para livro `new` → `400`.
- `PUT /books/{id}` tentando alterar `condition` → `400` ou campo ignorado (conforme decisão de implementação).
- Upload de 11ª imagem → `409`.
- Upload de arquivo com formato inválido (ex.: `.pdf`) → `400`.
- `GET /books/{id}` com UUID de outra filial → `403`.
- `GET /books/{id}` com UUID inexistente → `404`.
- `GET /books/search` sem parâmetro `q` → `400`.

### Casos de autorização

- `Caixa` tentando `POST /books` → `403`.
- `Caixa` tentando `PUT /books/{id}` → `403`.
- `Catalogador` acessando `GET /books/{id}` → `200`.
- `Caixa` acessando `GET /books/search` → `200`.
- Requisição sem cookie `auth_token` em qualquer endpoint → `401`.
- JWT expirado em qualquer endpoint → `401`.
- Usuário da filial A tentando `PUT /books/{id}` de livro da filial B → `403`.

### Casos de borda das regras de negócio

- Criar livro cujo ISBN bate com item em `customer_wishlist`; verificar que notificações `book_arrival` são inseridas para todos os Gerentes e Caixas da filial.
- Criar livro cujo título bate (case-insensitive) com item em `customer_wishlist`; verificar geração de notificação.
- Busca de ISBN para pré-preenchimento com ISBN presente em múltiplas filiais; verificar que retorna dados do registro mais recente.
- Livro usado com `quantity` enviado no body; verificar que `book_stock.quantity` é fixado em `1` independentemente do valor enviado.
- Edição de preço deve criar `price_history` antes do `UPDATE` em `book.sale_price`; simular falha no `UPDATE` e verificar que `price_history` não é inserido (atomicidade transacional).

## Riscos técnicos e dependências

1. **Dependência futura: módulo 006-xx (compra de usados).** O campo `lot_id` aceito em `POST /books` e o vínculo via `used_book_purchase_item` dependem da existência da tabela `used_book_purchase`. Essa tabela já existe no schema inicial (`000-01`), então o risco é baixo para o banco. Porém, os endpoints de criação e gerenciamento de lotes (006-xx) ainda não foram especificados — a validação de `lot_id` deve consultar `used_book_purchase` diretamente sem depender de serviço da feature 006.

2. **Estratégia de armazenamento de imagens não definida.** O endpoint `POST /books/{id}/images` persiste o arquivo fisicamente. Em desenvolvimento, o armazenamento local (disco) é suficiente, mas a URL armazenada em `book_image.url` precisa ser acessível pelo frontend. A interface de armazenamento deve ser abstraída (ex.: `StorageService`) para permitir substituição futura por S3 ou equivalente sem alterar o contrato de API. Risco: acoplamento prematuro com filesystem local.

3. **Notificação de wishlist é operação de escrita não transacional.** Para não atrasar o cadastro do livro, a verificação de `customer_wishlist` e a inserção em `notification` devem ocorrer após o commit da transação principal. Se falhar, o livro já estará persistido mas a notificação será perdida. Risco aceitável por ora; logging de erro deve ser garantido.

4. **Busca com `ILIKE` sem índice de texto completo pode degradar com volume alto.** Os índices `idx_book_title` e `idx_book_author` (B-tree) não cobrem `ILIKE '%termo%'`. Em catálogos grandes, a busca degrada. Não é um problema no curto prazo, mas `GIN + pg_trgm` deve ser considerado em uma iteração futura se a performance for insuficiente.

5. **Rota `/books/search` conflita com `/books/:id` se o roteador do Spring não for configurado corretamente.** A rota `GET /books/search` deve ser declarada antes de `GET /books/{id}` no controller para que `search` não seja interpretado como UUID. No Spring MVC, rotas literais têm precedência sobre path variables, mas é necessário verificar o comportamento com Spring Boot 4.

6. **Dependência de `customer_wishlist` (007-xx) para a notificação.** Se a feature 007 não estiver implementada quando 001-01 entrar em produção, a consulta à tabela `customer_wishlist` retornará vazio (sem dados), o que é comportamento correto — zero notificações geradas. Sem risco de falha, apenas ausência de funcionalidade.
