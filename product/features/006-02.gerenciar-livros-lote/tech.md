# Gerenciar Livros do Lote — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `006-00.compra-usados`. Implementa o acompanhamento do progresso de catalogação de um lote de compra de usados: exibe todos os itens do lote com seu status de vínculo a um livro (`book_id` nulo = não cadastrado; preenchido = cadastrado), permite adicionar novos itens manualmente enquanto o lote está "aberto", e oferece ponto de entrada para o fluxo de cadastro de livro com `lot_id` pré-preenchido.

A feature **não redefine** `POST /books` (especificado em `001-00.catalogo-livros/tech.md`) nem o comportamento transacional de vínculo ao lote (especificado em `001-01.cadastrar-livro/tech.md`). O escopo aqui é:

1. Introduzir a migration que torna `used_book_purchase_item.book_id` anulável — requisito para que itens existam antes do livro ser cadastrado.
2. Especificar os endpoints de leitura/escrita do domínio de lotes: listagem de lotes, detalhe do lote com seus itens, vinculação de `book_id` a um item existente, e adição manual de item ao lote.
3. Definir a rota frontend `/purchases/:id/books` e a rota de listagem `/purchases`.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Alteração de schema em `used_book_purchase_item` (migration); leitura em `used_book_purchase`, `used_book_purchase_item`, `book`; escrita em `used_book_purchase_item` |
| Serviço | Lógica de status derivado do lote; validação de pertencimento à filial; atualização de `book_id` em item |
| Frontend | Tela `/purchases` (listagem de lotes); tela `/purchases/:id/books` (detalhe do lote com itens) |

Domínios externos lidos:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — escopo de filial |
| Usuários/Auth (`000-02`) | JWT claims | leitura — `branchId`, `roles` |
| Catálogo (`001-xx`) | `book` | leitura — título do livro para exibição; escrita indireta via `POST /books` com `lot_id` |

---

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria novas tabelas**. Introduz uma única alteração de schema e índices complementares.

#### Alteração obrigatória: `used_book_purchase_item.book_id` → nullable

O business.md exige que itens do lote possam existir sem um livro cadastrado — o item é criado no momento do registro do lote ou adicionado manualmente depois, e o `book_id` é preenchido apenas quando o livro é cadastrado em `001-01.cadastrar-livro`. O schema original (`000-01.modelagem-dados`, changeSet `001-initial-schema`) define `book_id NOT NULL`, o que impede esse fluxo.

A alteração é:

```sql
ALTER TABLE used_book_purchase_item
    ALTER COLUMN book_id DROP NOT NULL;
```

> O `NOT NULL` original parte de um modelo em que o item só existe após o livro. A realidade do fluxo de compra de usados é a inversa: o item representa um livro físico recebido no lote, que ainda aguarda catalogação. Tornar `book_id` nullable é a correção necessária para refletir esse estado intermediário.

#### Tabelas utilizadas por este módulo (sem alteração de colunas)

**`used_book_purchase`** — lida para exibição do cabeçalho do lote; sem alteração.

| Coluna | Tipo | Nullable | Notas |
|--------|------|----------|-------|
| `id` | `UUID` | NOT NULL | PK |
| `branch_id` | `UUID` | NOT NULL | FK → `branch(id)`; escopo de filial |
| `total_price` | `NUMERIC(10,2)` | NOT NULL | exibido no cabeçalho |
| `payment_method` | `TEXT` | NOT NULL | `'cash'` ou `'pix'`; exibido no cabeçalho |
| `seller_name` | `TEXT` | NULL | exibido no cabeçalho |
| `purchased_by` | `UUID` | NOT NULL | FK → `user(id)` |
| `purchased_at` | `TIMESTAMP` | NOT NULL | exibido no cabeçalho |
| `notes` | `TEXT` | NULL | exibido no cabeçalho |

> A coluna `estimated_quantity` **não existe** na tabela (confirmado em `006-00/business.md`). O total de itens esperados (Y no contador "X de Y") é derivado de `COUNT(*) FROM used_book_purchase_item WHERE purchase_id = :id` — não de um campo estático.

**`used_book_purchase_item`** — lida e escrita por este módulo; `book_id` torna-se nullable após a migration acima.

| Coluna | Tipo | Nullable | Notas |
|--------|------|----------|-------|
| `id` | `UUID` | NOT NULL | PK |
| `purchase_id` | `UUID` | NOT NULL | FK → `used_book_purchase(id)` ON DELETE CASCADE |
| `book_id` | `UUID` | **NULL** | FK → `book(id)`; nulo = item não cadastrado |

**`book`** — lida somente para retornar `title` dos itens já vinculados.

### Estratégia de migração

A migration deve ser adicionada como novo changeSet (`003-used-book-purchase-item-nullable-book-id`) sem tocar no changeSet original `001-initial-schema`:

```sql
-- changeSet 003-used-book-purchase-item-nullable-book-id
ALTER TABLE used_book_purchase_item
    ALTER COLUMN book_id DROP NOT NULL;
```

**Rollback seguro:** `ALTER TABLE used_book_purchase_item ALTER COLUMN book_id SET NOT NULL` — porém, o rollback só é seguro enquanto não houver linhas com `book_id = NULL` na tabela. Após inserção de itens sem `book_id`, o rollback causará erro de constraint. O rollback deve ser executado somente antes de entrar em produção com dados de lote.

**Dados existentes:** não requerem migração — todos os registros existentes têm `book_id` preenchido, permanecendo válidos.

### Índices complementares

Devem ser adicionados no mesmo changeSet `003-...` (ou em changeSet separado para conveniência de rollback independente):

```sql
-- Listagem de lotes por filial com ordenação por data (tela /purchases)
CREATE INDEX idx_ubp_branch_purchased_at
    ON used_book_purchase(branch_id, purchased_at DESC);

-- Busca de itens de um lote + status de vínculo (tela /purchases/:id/books)
CREATE INDEX idx_ubpi_purchase_id
    ON used_book_purchase_item(purchase_id);

-- Lookup de itens por book_id (usado na verificação de vínculo já existente)
CREATE INDEX idx_ubpi_book_id
    ON used_book_purchase_item(book_id)
    WHERE book_id IS NOT NULL;
```

---

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade → `401`. Perfil sem permissão → `403`. O `branch_id` de escopo é extraído do claim `branchId` do JWT; para o Administrador, pode ser fornecido via query param `branch_id`.

---

### `GET /purchases`

Lista todos os lotes de compra de usados da filial com paginação e filtros opcionais. Corresponde à tela `/purchases` definida em `006-01.registrar-compra-lote`.

- **Authorization:** `Gerente`, `Administrador`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Validação |
  |-----------|------|-------------|-----------|
  | `status` | `string` | não | `"open"` ou `"done"`; derivado no banco — ver edge cases |
  | `from` | `date` (ISO-8601 `yyyy-MM-dd`) | não | data mínima de `purchased_at` |
  | `to` | `date` (ISO-8601 `yyyy-MM-dd`) | não | data máxima de `purchased_at` (inclusiva até fim do dia: `to + 23:59:59`) |
  | `page` | `integer` | não | padrão `0`; base 0 |
  | `size` | `integer` | não | padrão `20`; máximo `100` |
  | `branch_id` | `UUID` | não | apenas para `Administrador`; ignorado para demais perfis |

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "sellerName": "string|null",
        "purchasedAt": "ISO-8601",
        "totalPrice": 0.00,
        "paymentMethod": "cash|pix",
        "totalItems": 0,
        "catalogedItems": 0,
        "status": "open|done"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  }
  ```

  > `totalItems` = `COUNT(*)` de itens do lote; `catalogedItems` = `COUNT(*) WHERE book_id IS NOT NULL`; `status` = `"done"` quando `totalItems = catalogedItems AND totalItems > 0`, caso contrário `"open"`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Lista retornada (pode ser vazia) |
  | `400` | `status` com valor inválido, `from` ou `to` com formato inválido |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` ou `Caixa` tentando acessar |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Lista vazia retorna `200` com `content: []`, não `404`.
  - O filtro `status` é computado na query SQL via subconsulta ou JOIN agregado — não é coluna armazenada.
  - Um lote sem nenhum item (`totalItems = 0`) é considerado `"open"` (nunca `"done"`).
  - Ordenação padrão: `purchased_at DESC`.

---

### `GET /purchases/{id}/items`

Retorna o cabeçalho do lote e todos os seus itens com status de cadastro. Corresponde à tela `/purchases/:id/books`.

- **Authorization:** `Gerente`, `Administrador`
- **Path param:** `id` — UUID do lote (`used_book_purchase.id`)

- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "sellerName": "string|null",
    "purchasedAt": "ISO-8601",
    "totalPrice": 0.00,
    "paymentMethod": "cash|pix",
    "notes": "string|null",
    "totalItems": 0,
    "catalogedItems": 0,
    "status": "open|done",
    "items": [
      {
        "itemId": "uuid",
        "bookId": "uuid|null",
        "bookTitle": "string|null",
        "status": "pending|cataloged"
      }
    ]
  }
  ```

  > `item.status` = `"cataloged"` quando `book_id IS NOT NULL`; `"pending"` quando `book_id IS NULL`.  
  > `item.bookTitle` = `book.title` quando `book_id IS NOT NULL`; `null` quando pendente.  
  > A query deve fazer LEFT JOIN com `book` em `used_book_purchase_item.book_id = book.id` para obter `title` sem N+1.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Lote encontrado e pertence à filial do usuário |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Lote existe mas pertence a outra filial; ou perfil `Catalogador` ou `Caixa` |
  | `404` | UUID do lote não encontrado |
  | `500` | Erro inesperado |

- **Edge cases:**
  - `items` pode ser lista vazia (lote recém-criado sem itens adicionados ainda).
  - A verificação de filial deve usar `used_book_purchase.branch_id = branchId do JWT` — não confiar no path param.

---

### `POST /purchases/{id}/items`

Adiciona manualmente um novo item não cadastrado ao lote. Cria um registro em `used_book_purchase_item` com `book_id = NULL`.

> Um item representa um livro físico recebido no lote que ainda será catalogado. Não há dados de livro neste momento — o item é criado apenas como "espaço reservado" para rastreamento de progresso.

- **Authorization:** `Gerente`, `Administrador`
- **Path param:** `id` — UUID do lote
- **Request body:** vazio ou `{}` — nenhum campo é necessário na criação de um item vazio.
- **Response `201`:**

  ```json
  {
    "itemId": "uuid",
    "bookId": null,
    "bookTitle": null,
    "status": "pending"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `201` | Item adicionado com sucesso |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Lote pertence a outra filial; ou perfil `Catalogador` ou `Caixa` |
  | `404` | UUID do lote não encontrado |
  | `409` | Lote já está com status `"done"` (todos os itens cadastrados) — não é possível adicionar itens a um lote concluído |
  | `500` | Erro inesperado |

- **Edge cases:**
  - A verificação de status `"done"` antes da inserção deve ser feita em transação (SELECT + INSERT atômicos) para evitar condição de corrida com inserções paralelas.
  - O status `"done"` é recalculado após a inserção — ao adicionar um item, o lote volta para `"open"` automaticamente (derivado).

---

### `PATCH /purchases/{id}/items/{itemId}`

Vincula um `book_id` a um item existente do lote após o cadastro do livro. Este endpoint é chamado pelo backend de `001-01.cadastrar-livro` ao criar um livro com `lot_id` — não é chamado diretamente pelo frontend.

> A vinculação automática via `POST /books` com `lot_id` (especificada em `001-01`) cria o item já vinculado (`INSERT INTO used_book_purchase_item`). Este endpoint PATCH existe para o caso de revinculação — quando um item pré-existente (criado manualmente via `POST /purchases/{id}/items`) precisa ser associado ao livro cadastrado.

- **Authorization:** `Gerente`, `Administrador`; também chamado internamente pelo serviço de cadastro de livros (contexto do usuário Catalogador/Gerente que está cadastrando o livro)
- **Path params:** `id` — UUID do lote; `itemId` — UUID do item
- **Request body:**

  | Campo | Tipo | Obrigatório | Validação |
  |-------|------|-------------|-----------|
  | `bookId` | `UUID` | sim | deve referenciar um `book` ativo (`active = true`) pertencente à mesma filial do lote |

- **Response `200`:**

  ```json
  {
    "itemId": "uuid",
    "bookId": "uuid",
    "bookTitle": "string",
    "status": "cataloged"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Vínculo criado com sucesso |
  | `400` | `bookId` ausente ou formato inválido |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Lote ou livro pertence a outra filial |
  | `404` | UUID do lote, do item ou do livro não encontrado |
  | `409` | Item já possui `book_id` preenchido (já cadastrado); ou `bookId` já está vinculado a outro item do mesmo ou de outro lote |
  | `500` | Erro inesperado |

- **Edge cases:**
  - Antes de vincular, verificar que o `book_id` informado não está já associado a outro `used_book_purchase_item` — cada livro físico usado corresponde a um único item. A query de verificação deve ser: `SELECT COUNT(*) FROM used_book_purchase_item WHERE book_id = :bookId` — se resultado > 0, retornar `409`.
  - A verificação de filial do livro deve usar `book.branch_id = branchId do JWT`.
  - Caso o fluxo padrão (`POST /books` com `lot_id`) seja usado, este endpoint não é chamado — a inserção em `used_book_purchase_item` ocorre dentro da transação de `POST /books`. O PATCH serve apenas para revinculação de itens pré-existentes.

---

## DTOs de domínio

Os DTOs abaixo cobrem os contratos de entrada e saída do módulo de gerenciamento de lotes. São definidos como Java records no pacote `com.ciet.demo_learn.purchase`.

```
PurchaseSummaryResponse    — item de GET /purchases (listagem paginada)
PurchasePageResponse       — wrapper paginado para GET /purchases
PurchaseDetailResponse     — resposta de GET /purchases/{id}/items (cabeçalho + itens)
PurchaseItemResponse       — item dentro de PurchaseDetailResponse.items
                             e resposta de POST /purchases/{id}/items
                             e resposta de PATCH /purchases/{id}/items/{itemId}
PatchPurchaseItemRequest   — body de PATCH /purchases/{id}/items/{itemId}
```

---

## Requisitos de qualidade

- [ ] I/O-bound identificado: `GET /purchases/{id}/items` faz LEFT JOIN entre `used_book_purchase_item` e `book` — candidato a virtual thread; evitar N+1 com JOIN explícito na query em vez de lazy loading JPA.
- [ ] `GET /purchases` computa `totalItems` e `catalogedItems` via subconsultas ou GROUP BY — verificar plano de execução com `EXPLAIN ANALYZE` em lotes grandes.
- [ ] Dados sensíveis: nenhuma coluna sensível (CPF, senha, token) é lida ou escrita. O `seller_name` é texto livre — não tratado como dado pessoal estruturado neste módulo.
- [ ] Autorização por perfil: `Catalogador` e `Caixa` não têm acesso a nenhum endpoint deste módulo (→ `403`). `Gerente` opera sempre no escopo da sua filial. `Administrador` pode operar com `branch_id` via query param.
- [ ] Isolamento por filial verificado no backend para todos os endpoints: `used_book_purchase.branch_id` deve ser comparado com o `branchId` do JWT em toda operação — nunca confiar no path param isolado.
- [ ] O `PATCH /purchases/{id}/items/{itemId}` deve verificar duplicidade de `book_id` em `used_book_purchase_item` para evitar dois itens vinculados ao mesmo livro.
- [ ] GraalVM AOT: records Java são compatíveis. Atenção ao mapeamento JPA de `UsedBookPurchaseItem` com `book_id` nullable — o campo Java deve ser `UUID` (nullable), não `UUID` primitivo.

---

## Estratégia de testes

### Fluxo principal (happy path)

- Listar lotes da filial sem filtros: verificar ordenação por `purchased_at DESC` e campos `totalItems`, `catalogedItems`, `status` corretos.
- Listar lotes com filtro `status = "open"`: verificar que lotes com todos os itens cadastrados não aparecem.
- Listar lotes com filtro `status = "done"`: verificar que apenas lotes 100% catalogados aparecem.
- Listar lotes com filtro de datas (`from` e `to`): verificar que lotes fora do intervalo não aparecem.
- Detalhar lote com itens mistos (alguns com `book_id`, outros com `null`): verificar `status` por item, `bookTitle` presente apenas nos catalogados, contadores corretos.
- Detalhar lote sem itens: verificar `items: []`, `totalItems: 0`, `status: "open"`.
- Adicionar item ao lote: verificar resposta `201` com `status: "pending"` e `bookId: null`; verificar incremento de `totalItems` na leitura subsequente.
- Vincular `book_id` a item pendente via PATCH: verificar resposta `200` com `status: "cataloged"` e `bookTitle` preenchido.
- Fluxo completo de lote: criar itens, cadastrar livros com `lot_id` via `POST /books`, verificar status `"done"` quando todos vinculados.

### Casos de erro esperados

- `GET /purchases/{id}/items` com UUID de lote de outra filial → `403`.
- `GET /purchases/{id}/items` com UUID inexistente → `404`.
- `POST /purchases/{id}/items` em lote com status `"done"` → `409`.
- `POST /purchases/{id}/items` com UUID de lote de outra filial → `403`.
- `PATCH /purchases/{id}/items/{itemId}` com `bookId` já vinculado a outro item → `409`.
- `PATCH /purchases/{id}/items/{itemId}` com `bookId` de livro de outra filial → `403`.
- `PATCH /purchases/{id}/items/{itemId}` em item já catalogado (com `book_id` preenchido) → `409`.
- `PATCH /purchases/{id}/items/{itemId}` com `bookId` de livro inexistente → `404`.
- `GET /purchases` com `status = "invalid"` → `400`.
- `GET /purchases` com `from = "not-a-date"` → `400`.

### Casos de autorização

- `Catalogador` acessando `GET /purchases` → `403`.
- `Caixa` acessando `GET /purchases/{id}/items` → `403`.
- `Caixa` acessando `POST /purchases/{id}/items` → `403`.
- `Gerente` da filial A acessando lote da filial B → `403`.
- Requisição sem cookie `auth_token` → `401` em todos os endpoints.
- JWT expirado → `401` em todos os endpoints.
- `Administrador` sem `branch_id` no query param de `GET /purchases` → `400` (filial obrigatória para Administrador sem `branchId` no JWT).

### Casos de borda das regras de negócio

- Lote sem itens: `status = "open"`, `totalItems = 0`, `catalogedItems = 0`; não pode ser `"done"`.
- Lote com todos os itens catalogados: `status = "done"`; `POST /purchases/{id}/items` deve retornar `409`.
- Após adicionar novo item a lote `"done"`, status deve voltar para `"open"` (derivado, sem coluna armazenada).
- Dois requests paralelos de `PATCH /purchases/{id}/items/{itemId}` com o mesmo `bookId` para itens diferentes: apenas um deve ter sucesso; o segundo deve retornar `409` (verificar comportamento com índice ou lock).

---

## Riscos técnicos e dependências

1. **Migration de `book_id` para nullable quebra a constraint do schema original.** O changeSet `001-initial-schema` define `book_id NOT NULL` em `used_book_purchase_item`. A migration `003-...` deve ser aplicada antes que qualquer código desta feature entre em produção. Se `001-01.cadastrar-livro` for deployado primeiro (com a lógica de inserir item ao salvar livro com `lot_id`), o schema atual ainda suporta isso. O risco está na ordem inversa: se esta feature criar itens com `book_id = NULL` antes da migration, haverá erro de constraint.

2. **Dependência de `006-01.registrar-compra-lote` para criar lotes.** Os endpoints desta feature operam sobre lotes existentes. Para testes de integração, é necessário que `POST /purchases` (de `006-01`) já esteja implementado ou que lotes sejam inseridos via seed de testes.

3. **Fluxo de vínculo tem dois caminhos distintos.** O caminho principal é via `POST /books` com `lot_id` (que cria um novo `used_book_purchase_item` vinculado). O caminho de revinculação é via `PATCH /purchases/{id}/items/{itemId}` (que atualiza um item pré-existente com `book_id = NULL`). O agente de implementação deve garantir que esses dois caminhos não criem duplicatas: se o usuário adicionar um item manualmente e depois cadastrar um livro com `lot_id`, o `POST /books` **não deve** criar um novo item — deve vincular o `book_id` ao item pré-existente mais antigo sem `book_id`. Esta lógica de "encontrar item pendente" versus "criar novo item" deve ser definida durante a implementação: a abordagem mais simples é `POST /books` com `lot_id` sempre criar um novo item (comportamento atual de `001-01`), e o PATCH ser usado para revinculações explícitas. O produto deve confirmar qual comportamento é esperado.

4. **Status de lote é derivado — sem coluna armazenada.** O `status` (`"open"` ou `"done"`) é calculado por query a cada chamada. Em lotes com muitos itens, a subconsulta de contagem pode ser lenta. Para a escala atual (livrarias), o risco é baixo. Se o volume crescer, uma coluna `cached_status` pode ser adicionada em migração futura com trigger ou atualização explícita.

5. **Concorrência no `PATCH` de vínculo.** Dois processos vinculando o mesmo `book_id` a itens diferentes do mesmo lote simultaneamente podem ambos passar pela verificação de unicidade antes de qualquer deles persistir. A proteção adequada é um `UNIQUE INDEX` em `used_book_purchase_item(book_id) WHERE book_id IS NOT NULL` — o banco garante a unicidade mesmo em condição de corrida. Este índice deve ser adicionado no changeSet `003-...`:

   ```sql
   CREATE UNIQUE INDEX idx_ubpi_book_id_unique
       ON used_book_purchase_item(book_id)
       WHERE book_id IS NOT NULL;
   ```

   > Este índice substitui o `idx_ubpi_book_id` não-único listado na seção de índices acima. Usar apenas o UNIQUE INDEX, que cobre ambas as necessidades (lookup e unicidade).
