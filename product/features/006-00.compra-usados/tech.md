# Compra de Usados — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo raiz que define o contrato de dados e os endpoints REST do domínio de compra de livros usados. Cobre o registro de lotes de compra com dados do vendedor e pagamento, o gerenciamento de itens do lote à medida que cada livro é catalogado, e a emissão opcional de voucher para o vendedor.

O schema base (`used_book_purchase` e `used_book_purchase_item`) já existe no changeSet `001-initial-schema` de `000-01.modelagem-dados`, mas requer **duas correções obrigatórias** antes da implementação deste módulo: (a) tornar `used_book_purchase_item.book_id` nullable — pois um item é criado sem livro vinculado e preenchido somente após o cadastro; (b) adicionar a coluna `estimated_quantity` em `used_book_purchase` — campo informativo obrigatório para o rastreamento de progresso do lote. Essas alterações são implementadas via changeSet dedicado.

Camadas afetadas: persistência (JPA/PostgreSQL 18), serviços de domínio (criação de lote, vínculo de livro a item, emissão de voucher delegada ao módulo 005), frontend React com rotas `/purchases`, `/purchases/new` e `/purchases/:id/books`.

Domínios externos lidos ou escritos por este módulo:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — escopo obrigatório de todos os lotes |
| Usuários / Auth (`000-01`, `000-02`) | `user`, `user_role`, `role` | leitura — identificação do Gerente e autorização |
| Catálogo de Livros (`001-xx`) | `book`, `book_stock` | leitura — resolução do título ao exibir item vinculado |
| Vouchers (`005-xx`) | `voucher` | escrita — delegada ao endpoint `POST /vouchers` ao registrar lote com voucher |
| Clientes (`007-xx`) | `customer` | leitura — validação do cliente quando voucher é solicitado; endpoint `GET /customers/search` já especificado em `005-00.vouchers/tech.md` |

---

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria novas tabelas**. As tabelas `used_book_purchase` e `used_book_purchase_item` já existem no changeSet `001-initial-schema`. No entanto, o schema atual apresenta duas divergências em relação às regras de negócio deste módulo, que devem ser corrigidas por um novo changeSet.

#### `used_book_purchase` — tabela existente com alteração necessária

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `total_price` | `NUMERIC(10,2)` | NOT NULL | — | deve ser > 0 |
| `payment_method` | `TEXT` | NOT NULL | — | valores aceitos: `'cash'` \| `'pix'` |
| `seller_name` | `TEXT` | NOT NULL | — | **alteração: tornar NOT NULL** — obrigatório por regra de negócio (atualmente nullable no schema) |
| `purchased_by` | `UUID` | NOT NULL | — | FK → `user(id)` |
| `purchased_at` | `TIMESTAMP` | NOT NULL | `now()` | pode ser informado manualmente pelo Gerente; default apenas se ausente |
| `notes` | `TEXT` | NULL | — | observações gerais opcionais |
| `estimated_quantity` | `INTEGER` | NULL | — | **nova coluna** — quantidade estimada de livros no lote; informativo; permite NULL para lotes sem estimativa |

> `estimated_quantity` é o parâmetro de referência para exibir o progresso "X de Y" na tela de gerenciamento. Quando NULL, o denominador Y exibido passa a ser o total real de itens em `used_book_purchase_item`. Tornar nullable evita obrigatoriedade de preenchimento, respeitando a regra de negócio de campo informativo opcional.

> `seller_name` atualmente é nullable no DDL do changeSet `001-initial-schema`. A alteração para NOT NULL é necessária porque o campo é obrigatório pelas regras de negócio de 006-01. A migration deve incluir tratamento para registros existentes (DEFAULT em `ALTER COLUMN` ou verificação de dados antes da constraint).

#### `used_book_purchase_item` — tabela existente com alteração necessária

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `purchase_id` | `UUID` | NOT NULL | — | FK → `used_book_purchase(id)` ON DELETE CASCADE |
| `book_id` | `UUID` | NULL | — | **alteração: tornar nullable** — FK → `book(id)`; NULL quando o livro ainda não foi cadastrado; preenchido pelo fluxo de `POST /books` com `lot_id` |

> A coluna `book_id` é definida como `NOT NULL` no changeSet `001-initial-schema`, o que torna impossível criar itens de lote sem livro vinculado. Esta alteração é o ajuste mais crítico do módulo: sem ela, o fluxo de "adicionar item pendente ao lote" falha. A FK continua válida — apenas passa a permitir NULL.

> Um item com `book_id = NULL` representa um livro ainda não cadastrado. Um item com `book_id` preenchido representa um livro já catalogado. Essa distinção é o mecanismo central de rastreamento de progresso do módulo.

> Não há coluna `status` explícita no item nem no lote. O status do lote é derivado em tempo de consulta: "aberto" quando existe ao menos um item com `book_id IS NULL`; "concluído" quando todos os itens têm `book_id IS NOT NULL`. Essa derivação evita inconsistência entre coluna de status e estado real dos itens.

### Estratégia de migração

Emitir um novo changeSet `003-used-book-purchase-fixes` com as seguintes operações, nesta ordem:

```sql
-- 1. Adicionar coluna estimated_quantity (nullable)
ALTER TABLE used_book_purchase
    ADD COLUMN estimated_quantity INTEGER;

-- 2. Tornar seller_name NOT NULL
--    Tratar dados existentes antes: se houver registros com seller_name NULL,
--    definir um valor placeholder para não violar a constraint.
UPDATE used_book_purchase
    SET seller_name = 'Desconhecido'
    WHERE seller_name IS NULL;

ALTER TABLE used_book_purchase
    ALTER COLUMN seller_name SET NOT NULL;

-- 3. Tornar book_id nullable em used_book_purchase_item
--    Remover a constraint NOT NULL; a FK permanece válida.
ALTER TABLE used_book_purchase_item
    ALTER COLUMN book_id DROP NOT NULL;
```

> Rollback seguro para as operações 1 e 3: `DROP COLUMN estimated_quantity` e `ALTER COLUMN book_id SET NOT NULL`. Para a operação 2, o rollback seria `ALTER COLUMN seller_name DROP NOT NULL` — os registros com valor placeholder persistem, mas sem impacto funcional (o módulo não expõe dados legados de teste).

> Dados existentes em produção: como este módulo ainda não foi implementado, não deve haver registros reais. O risco de dados legados é mínimo.

### Índices complementares

Adicionar ao mesmo changeSet `003-used-book-purchase-fixes`:

```sql
-- Listagem de lotes por filial (query principal da tela /purchases)
CREATE INDEX idx_ubp_branch_purchased_at
    ON used_book_purchase(branch_id, purchased_at DESC);

-- Itens de um lote (query da tela /purchases/:id/books)
CREATE INDEX idx_ubpi_purchase
    ON used_book_purchase_item(purchase_id);

-- Itens pendentes de vínculo (filtro status "aberto" por lote)
CREATE INDEX idx_ubpi_purchase_book_null
    ON used_book_purchase_item(purchase_id)
    WHERE book_id IS NULL;

-- Busca do item do lote pelo book_id (necessária quando POST /books vincula o livro)
CREATE INDEX idx_ubpi_book
    ON used_book_purchase_item(book_id)
    WHERE book_id IS NOT NULL;
```

---

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `branch_id` de escopo é extraído do claim `branchId` do JWT. Perfil `Administrador` pode fornecer `branch_id` como query param para alternar contexto de filial (mesmo padrão dos demais módulos). Ausência ou invalidade do cookie → `401`. Perfil sem permissão → `403`.

---

### `POST /purchases`

Registra um novo lote de compra de livros usados. Cria o lote com status derivado ("aberto") e, opcionalmente, emite um voucher para o vendedor via chamada interna ao serviço de vouchers.

- **Authorization:** `Gerente`, `Administrador`
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `sellerName` | `string` | sim | não vazio; máx. 300 caracteres |
  | `totalPrice` | `number` (decimal) | sim | > 0; máx. 2 casas decimais |
  | `paymentMethod` | `string` | sim | valores aceitos: `"cash"` \| `"pix"` |
  | `purchasedAt` | `string` (ISO-8601) | sim | data e hora da transação; pode ser anterior ao momento do registro |
  | `estimatedQuantity` | `integer` | não | ≥ 1 quando informado; NULL quando omitido |
  | `notes` | `string` | não | máx. 2000 caracteres |
  | `issueVoucher` | `boolean` | não | padrão `false`; quando `true`, os campos de voucher abaixo tornam-se obrigatórios |
  | `voucherCustomerId` | `UUID` | condicional | obrigatório quando `issueVoucher = true`; deve referenciar um `customer` ativo na mesma filial |
  | `voucherValue` | `number` (decimal) | condicional | obrigatório quando `issueVoucher = true`; > 0; máx. 2 casas decimais |

- **Response `201`:**

  ```json
  {
    "id": "uuid-do-lote",
    "branchId": "uuid-da-filial",
    "sellerName": "Nome do vendedor",
    "totalPrice": 150.00,
    "paymentMethod": "cash",
    "purchasedAt": "2026-05-08T14:00:00Z",
    "purchasedBy": "uuid-do-gerente",
    "estimatedQuantity": 10,
    "notes": "string|null",
    "itemCount": 0,
    "linkedCount": 0,
    "status": "open",
    "voucher": {
      "id": "uuid-do-voucher",
      "customerId": "uuid-do-cliente",
      "customerName": "Nome do cliente",
      "initialValue": 80.00
    }
  }
  ```

  > O campo `voucher` é `null` quando `issueVoucher = false` ou omitido. O campo `status` é sempre `"open"` na criação (nenhum item vinculado ainda). `itemCount` e `linkedCount` são `0` no momento da criação.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 201 | Lote criado com sucesso (com ou sem voucher) |
  | 400 | Validação falhou: `totalPrice ≤ 0`, `paymentMethod` inválido, campos obrigatórios ausentes, `issueVoucher = true` sem `voucherCustomerId` ou `voucherValue` |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`) |
  | 404 | `voucherCustomerId` não encontrado ou não pertence à filial |
  | 500 | Erro inesperado |

- **Edge cases:**
  - `branch_id` do lote é sempre extraído do JWT — o cliente não informa a filial.
  - `purchased_by` é o `sub` (UUID) do JWT.
  - Quando `issueVoucher = true`, o serviço chama internamente a lógica de emissão de voucher (equivalente ao `POST /vouchers` de `005-00.vouchers`). A emissão do voucher deve ocorrer **dentro da mesma transação** que cria o lote: se a emissão falhar (cliente inexistente, valor inválido), toda a operação deve ser revertida.
  - `purchased_at` pode ser qualquer data no passado; o serviço não impõe restrição de data mínima.
  - Após a criação, o frontend deve redirecionar para `/purchases/:id/books`.

---

### `GET /purchases`

Lista os lotes de compra da filial do usuário autenticado, com paginação e filtros opcionais.

- **Authorization:** `Gerente`, `Administrador`
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras |
  |-----------|------|-------------|--------|
  | `status` | `string` | não | `"open"` ou `"closed"`; sem filtro retorna todos |
  | `page` | `integer` | não | padrão `0`; base 0 |
  | `size` | `integer` | não | padrão `20`; máximo `100` |

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "sellerName": "string",
        "totalPrice": 150.00,
        "paymentMethod": "cash",
        "purchasedAt": "2026-05-08T14:00:00Z",
        "estimatedQuantity": 10,
        "itemCount": 10,
        "linkedCount": 7,
        "status": "open"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 42,
    "totalPages": 3
  }
  ```

  > `status` é derivado: `"open"` quando `linkedCount < itemCount` (existe item com `book_id IS NULL`); `"closed"` quando `linkedCount = itemCount` e `itemCount > 0`. Quando `itemCount = 0`, o status é `"open"` (lote recém-criado sem itens ainda).

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Lista retornada com sucesso (pode ser vazia) |
  | 400 | Parâmetro `status` com valor inválido |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão |
  | 500 | Erro inesperado |

- **Edge cases:**
  - A filial é sempre extraída do JWT — o endpoint não aceita `branchId` como parâmetro de query (exceto Administrador via padrão do sistema).
  - Ordenação padrão: `purchased_at DESC`.
  - `itemCount` = total de registros em `used_book_purchase_item` para o lote; `linkedCount` = total onde `book_id IS NOT NULL`.
  - O filtro `status` é aplicado na query via `HAVING` sobre os contadores, não por coluna de status no banco.

---

### `GET /purchases/{id}`

Retorna os dados completos de um lote de compra, incluindo a lista de todos os seus itens com status de vínculo.

- **Authorization:** `Gerente`, `Administrador`
- **Path parameter:** `id` — UUID do lote

- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "branchId": "uuid",
    "sellerName": "string",
    "totalPrice": 150.00,
    "paymentMethod": "cash",
    "purchasedAt": "2026-05-08T14:00:00Z",
    "purchasedBy": "uuid-do-gerente",
    "estimatedQuantity": 10,
    "notes": "string|null",
    "itemCount": 5,
    "linkedCount": 3,
    "status": "open",
    "items": [
      {
        "id": "uuid-do-item",
        "bookId": "uuid-do-livro|null",
        "bookTitle": "string|null",
        "status": "linked"
      }
    ]
  }
  ```

  > Para cada item: `status = "pending"` quando `book_id IS NULL`; `status = "linked"` quando `book_id IS NOT NULL`. `bookTitle` é lido via JOIN em `book.title`; `null` quando `book_id IS NULL`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Lote encontrado e pertence à filial do usuário |
  | 401 | Usuário não autenticado |
  | 403 | Lote pertence a outra filial |
  | 404 | Lote não encontrado |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O backend deve verificar `used_book_purchase.branch_id` contra o `branchId` do JWT. Se divergente, retornar `403` (não vazar existência de lotes de outras filiais).
  - A lista `items` é ordenada por `used_book_purchase_item.id ASC` (ordem de inserção, que corresponde à ordem de adição ao lote).
  - `bookTitle` exige LEFT JOIN em `book` — itens pendentes não têm livro associado.

---

### `POST /purchases/{id}/items`

Adiciona um novo item pendente (sem livro vinculado) ao lote. Só é permitido enquanto o lote estiver "aberto".

- **Authorization:** `Gerente`, `Administrador`
- **Path parameter:** `id` — UUID do lote
- **Request body:** vazio (sem body ou `{}`)

  > Um item pendente não possui atributos além do vínculo com o lote. O único dado relevante é `purchase_id`, derivado do path parameter.

- **Response `201`:**

  ```json
  {
    "id": "uuid-do-novo-item",
    "purchaseId": "uuid-do-lote",
    "bookId": null,
    "status": "pending"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 201 | Item adicionado com sucesso |
  | 401 | Usuário não autenticado |
  | 403 | Lote pertence a outra filial, ou perfil sem permissão |
  | 404 | Lote não encontrado |
  | 409 | Lote está "concluído" (todos os itens vinculados) — novos itens não podem ser adicionados após conclusão |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O `409` protege lotes concluídos de receber novos itens indefinidamente. A regra de negócio define que o lote é "aberto" enquanto houver itens sem `book_id`; uma vez que todos os itens estejam vinculados, o lote é considerado concluído e não aceita mais adições.
  - O item é criado com `book_id = NULL`. Nenhum vínculo com `book` ocorre neste endpoint.

---

### `GET /purchases/{purchaseId}/items/{itemId}`

Retorna os dados de um item específico do lote. Usado pelo frontend para verificar o status após o cadastro do livro via redirecionamento de `/books/new`.

- **Authorization:** `Gerente`, `Administrador`
- **Path parameters:** `purchaseId` — UUID do lote; `itemId` — UUID do item

- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "purchaseId": "uuid",
    "bookId": "uuid|null",
    "bookTitle": "string|null",
    "status": "pending|linked"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Item encontrado |
  | 401 | Usuário não autenticado |
  | 403 | Lote pertence a outra filial |
  | 404 | Lote ou item não encontrado, ou item não pertence ao lote informado |
  | 500 | Erro inesperado |

---

## Integração com `POST /books` (vínculo de livro ao item do lote)

> Este endpoint é definido em `001-00.catalogo-livros/tech.md`. A seção abaixo documenta o contrato de integração que o módulo 006 depende e que o módulo 001 já implementa.

Quando `POST /books` recebe o campo `lot_id`, o serviço de catálogo executa, dentro da mesma transação de criação do livro:

1. Localiza em `used_book_purchase_item` o **primeiro registro** com `purchase_id = lot_id` e `book_id IS NULL`.
2. Atualiza esse registro com `book_id` = UUID do livro recém-criado.
3. Se não houver nenhum item pendente (`book_id IS NULL`) no lote, retorna `409` — o lote não tem vagas disponíveis para vínculo.

> O módulo 006 **não expõe endpoint de vínculo direto** — o vínculo é sempre feito pelo fluxo de cadastro de livro (`POST /books` com `lot_id`). Isso garante que somente livros que passaram pelo processo de cadastro completo sejam vinculados ao lote.

> O frontend de `006-02` passa `lot_id` como query param em `/books/new?lot_id=:id`, e o formulário de cadastro de livro pré-preenche o campo `lot_id` oculto. O campo `condition` é pré-selecionado como `"used"` quando `lot_id` está presente.

---

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas: todos os endpoints envolvem queries PostgreSQL — candidatos a virtual threads (Project Loom, habilitado por padrão no Java 25 com Spring Boot 4).
- [ ] `GET /purchases` computa `itemCount` e `linkedCount` via subquery ou GROUP BY — verificar plano de execução para garantir uso dos índices `idx_ubpi_purchase` e `idx_ubpi_purchase_book_null`.
- [ ] A derivação de `status` no `GET /purchases` com filtro por status requer `HAVING COUNT(*) FILTER (WHERE book_id IS NULL) > 0` (open) ou `= 0` (closed) — testar performance com volume médio de lotes e itens.
- [ ] `POST /purchases` com `issueVoucher = true` é uma operação de escrita em dois domínios (`used_book_purchase` + `voucher`) dentro da mesma transação — deve usar `@Transactional` explícito no serviço orquestrador.
- [ ] Dados sensíveis: `seller_name` é nome de pessoa física — não é CPF/CNPJ/senha, mas deve ser tratado com cuidado em logs. Não expor em stack traces.
- [ ] Autorização por filial verificada em todos os endpoints: `used_book_purchase.branch_id` sempre comparado com o `branchId` do JWT antes de qualquer operação de leitura ou escrita.
- [ ] GraalVM AOT: records Java usados como DTOs são compatíveis. Verificar reflexão em entidades JPA (`@Entity`) se AOT for habilitado.

---

## Estratégia de testes

### Fluxo principal (happy path)

- Registrar lote sem voucher com todos os campos obrigatórios: verificar `201`, `status = "open"`, `itemCount = 0`, `voucher = null`.
- Registrar lote com `estimatedQuantity` informado: verificar persistência do campo.
- Registrar lote com `issueVoucher = true` e cliente válido: verificar criação do lote e do voucher; verificar `voucher.customerId` na resposta.
- Listar lotes da filial: verificar ordenação por `purchased_at DESC` e campos `itemCount`, `linkedCount`, `status`.
- Listar com filtro `status = "open"`: verificar que apenas lotes com itens pendentes aparecem.
- Listar com filtro `status = "closed"`: verificar que apenas lotes totalmente vinculados aparecem.
- Visualizar lote: verificar cabeçalho e lista de itens com campos corretos.
- Adicionar item ao lote aberto: verificar `201`, `book_id = null`, `status = "pending"`.
- Criar livro com `lot_id` via `POST /books`: verificar que `used_book_purchase_item.book_id` é preenchido e `linkedCount` do lote incrementa.
- Após vínculo de todos os itens: verificar que `GET /purchases/{id}` retorna `status = "closed"`.

### Casos de erro esperados

- `POST /purchases` com `totalPrice = 0`: deve retornar `400`.
- `POST /purchases` com `paymentMethod = "credit"`: deve retornar `400`.
- `POST /purchases` com `issueVoucher = true` sem `voucherCustomerId`: deve retornar `400`.
- `POST /purchases` com `issueVoucher = true` e `voucherCustomerId` de outra filial: deve retornar `404`.
- `POST /purchases` com `issueVoucher = true` e `voucherValue = 0`: deve retornar `400`.
- `POST /purchases/{id}/items` em lote concluído: deve retornar `409`.
- `GET /purchases/{id}` com UUID de lote de outra filial: deve retornar `403`.
- `GET /purchases/{id}` com UUID inexistente: deve retornar `404`.
- `POST /books` com `lot_id` sem itens pendentes no lote: deve retornar `409`.

### Casos de autorização

- `Catalogador` acessa `POST /purchases`: deve retornar `403`.
- `Caixa` acessa `POST /purchases`: deve retornar `403`.
- `Caixa` acessa `GET /purchases`: deve retornar `403`.
- `Gerente` acessa `POST /purchases` com dados válidos: deve retornar `201`.
- `Administrador` acessa `GET /purchases` com `branch_id` de outra filial via query param: deve retornar lotes da filial informada.
- Usuário não autenticado em qualquer endpoint: deve retornar `401`.

### Casos de borda das regras de negócio

- Atomicidade de `POST /purchases` com voucher: simular falha na emissão do voucher (cliente inexistente) após inserção do lote — verificar que o lote **não** é persistido (rollback completo).
- Lote com `estimatedQuantity = 5` e `itemCount = 3` (menos itens que o estimado): verificar que `status = "open"` e progresso exibe "3 de 3 itens" (denominador é `itemCount` real, não `estimatedQuantity`).
- Lote com `estimatedQuantity = NULL`: verificar que o denominador no progresso é `itemCount`.
- Criação de livro com `lot_id` pelo Administrador: verificar que a filial do lote é validada contra o contexto de filial do Administrador (query param `branch_id`), não contra `branchId = null` do JWT.

---

## Riscos técnicos e dependências

1. **Alteração de schema crítica — `used_book_purchase_item.book_id` nullable.** O changeSet `001-initial-schema` define `book_id` como `NOT NULL`. A alteração para nullable é pré-requisito absoluto para este módulo funcionar. O changeSet `003-used-book-purchase-fixes` deve ser executado antes de qualquer implementação de endpoint. Risco: se outro módulo (ex.: 001-01) já estiver em desenvolvimento e assumir `book_id NOT NULL`, haverá conflito de contrato — ambas as equipes devem ser alinhadas.

2. **Dependência de `POST /books` para o vínculo do livro ao item.** O fluxo de vínculo `book_id` em `used_book_purchase_item` é responsabilidade do serviço de catálogo (módulo 001-01), não deste módulo. O agente de implementação de 006 deve comunicar ao agente de 001-01 que o campo `lot_id` aceito em `POST /books` deve: (a) localizar o **primeiro** item com `book_id IS NULL` no lote, (b) atualizar esse item, (c) retornar `409` se não houver item pendente. O tech.md de `001-00` já documenta parte desse fluxo, mas o detalhe de "primeiro item pendente" e o `409` por ausência de vagas devem ser validados.

3. **Dependência do módulo de Clientes (007-xx) para emissão de voucher.** O endpoint `GET /customers/search` (documentado em `005-00.vouchers/tech.md`) é necessário para o campo de seleção de cliente no formulário de registro de lote com voucher. Se 007-xx não estiver disponível quando 006-01 for implementado, o campo de busca de cliente não funcionará. Risco de bloqueio de frontend.

4. **Status do lote derivado via contagem — performance em listas grandes.** O `GET /purchases` deve computar `itemCount` e `linkedCount` para cada lote da lista. Com lotes com muitos itens ou filiais com muitos lotes, o query pode ser custoso sem os índices adequados. Os índices `idx_ubpi_purchase` e `idx_ubpi_purchase_book_null` devem ser criados antes da primeira carga de dados.

5. **Ordenação de item pendente para vínculo por `lot_id`.** Quando `POST /books` recebe `lot_id`, o serviço de catálogo precisa identificar qual item do lote vincular. A estratégia "primeiro item com `book_id IS NULL`" (por `id ASC`) é simples, mas pressupõe que itens são adicionados ao lote antes dos livros serem cadastrados. Se o usuário adicionar 3 itens e cadastrar livros fora de ordem, o vínculo ocorrerá com o item de menor `id` pendente — comportamento correto, mas o usuário pode não perceber qual item foi vinculado. A tela de `006-02` deve exibir o estado atualizado após cada vínculo para o usuário acompanhar.
