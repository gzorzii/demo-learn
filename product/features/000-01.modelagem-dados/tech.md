# Modelagem de Dados — Technical Design

**Reference:** `business.md` nesta pasta
**Status:** Rascunho

---

## Visão geral

Esta feature é exclusivamente de infraestrutura: define o schema PostgreSQL completo do sistema de livrarias. Não expõe nenhum endpoint, não contém lógica de negócio e não possui camada de aplicação própria. Todas as demais features dependem deste schema — ele é a única fonte de verdade para estrutura de tabelas, relacionamentos e constraints.

Camadas afetadas: banco de dados (DDL via Flyway ou similar), sem impacto em camadas HTTP ou de serviço.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Todas as tabelas abaixo são criadas do zero (sistema novo). Nenhuma alteração incremental é necessária neste momento.

Convenções globais:
- Chave primária: `id UUID NOT NULL DEFAULT gen_random_uuid()`
- Timestamps de auditoria: `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- Soft-delete: `deleted_at TIMESTAMPTZ NULL` (presença indica registro inativo)
- `gen_random_uuid()` é nativo do PostgreSQL 13+; PostgreSQL 18 suporta sem extensão adicional

---

#### `branch`

Entidade raiz do sistema. Quase todas as demais tabelas referenciam esta.

| Coluna       | Tipo            | Nullable | Default              | Constraints        |
|--------------|-----------------|----------|----------------------|--------------------|
| id           | UUID            | NOT NULL | gen_random_uuid()    | PK                 |
| name         | TEXT            | NOT NULL |                      |                    |
| address      | TEXT            | NOT NULL |                      |                    |
| phone        | TEXT            | NULL     |                      |                    |
| created_at   | TIMESTAMPTZ     | NOT NULL | now()                |                    |
| updated_at   | TIMESTAMPTZ     | NOT NULL | now()                |                    |
| deleted_at   | TIMESTAMPTZ     | NULL     |                      |                    |

Indexes:
- `idx_branch_deleted_at` em `(deleted_at)` — filtro de registros ativos em listagens

---

#### `role`

Tabela de perfis fixos. Populada via seed (Administrador, Gerente, Catalogador, Caixa). Sem `deleted_at` pois perfis não são removíveis.

| Coluna      | Tipo        | Nullable | Default           | Constraints |
|-------------|-------------|----------|-------------------|-------------|
| id          | UUID        | NOT NULL | gen_random_uuid() | PK          |
| name        | TEXT        | NOT NULL |                   | UNIQUE      |
| description | TEXT        | NULL     |                   |             |
| created_at  | TIMESTAMPTZ | NOT NULL | now()             |             |
| updated_at  | TIMESTAMPTZ | NOT NULL | now()             |             |

---

#### `user`

Funcionário que acessa o sistema. O Administrador pode ter `branch_id` nulo (acesso global).

| Coluna        | Tipo        | Nullable | Default           | Constraints            |
|---------------|-------------|----------|-------------------|------------------------|
| id            | UUID        | NOT NULL | gen_random_uuid() | PK                     |
| branch_id     | UUID        | NULL     |                   | FK → branch(id)        |
| name          | TEXT        | NOT NULL |                   |                        |
| email         | TEXT        | NOT NULL |                   | UNIQUE                 |
| password_hash | TEXT        | NOT NULL |                   |                        |
| is_active     | BOOLEAN     | NOT NULL | true              |                        |
| created_at    | TIMESTAMPTZ | NOT NULL | now()             |                        |
| updated_at    | TIMESTAMPTZ | NOT NULL | now()             |                        |
| deleted_at    | TIMESTAMPTZ | NULL     |                   |                        |

Indexes:
- `idx_user_branch_id` em `(branch_id)` — consultas de usuários por filial
- `idx_user_email` em `(email)` — lookup de autenticação (já garantido pelo UNIQUE, mas explícito para clareza)
- `idx_user_deleted_at` em `(deleted_at)`

---

#### `user_role`

Tabela de junção N:N entre `user` e `role`. Sem `deleted_at` — remoção é física.

| Coluna     | Tipo        | Nullable | Default           | Constraints                             |
|------------|-------------|----------|-------------------|-----------------------------------------|
| id         | UUID        | NOT NULL | gen_random_uuid() | PK                                      |
| user_id    | UUID        | NOT NULL |                   | FK → user(id)                           |
| role_id    | UUID        | NOT NULL |                   | FK → role(id)                           |
| created_at | TIMESTAMPTZ | NOT NULL | now()             |                                         |
| updated_at | TIMESTAMPTZ | NOT NULL | now()             |                                         |

Constraints:
- `uq_user_role` UNIQUE `(user_id, role_id)` — impede duplicação de vínculo

Indexes:
- `idx_user_role_user_id` em `(user_id)` — lookup de perfis de um usuário
- `idx_user_role_role_id` em `(role_id)` — lookup de usuários de um perfil

---

#### `category`

Categorias/gêneros de livros. Usada como escopo de desconto e filtro de busca.

| Coluna      | Tipo        | Nullable | Default           | Constraints |
|-------------|-------------|----------|-------------------|-------------|
| id          | UUID        | NOT NULL | gen_random_uuid() | PK          |
| name        | TEXT        | NOT NULL |                   | UNIQUE      |
| description | TEXT        | NULL     |                   |             |
| created_at  | TIMESTAMPTZ | NOT NULL | now()             |             |
| updated_at  | TIMESTAMPTZ | NOT NULL | now()             |             |
| deleted_at  | TIMESTAMPTZ | NULL     |                   |             |

---

#### `customer`

Dados de clientes. `tax_id` armazena CPF ou CNPJ (dado sensível — ver requisitos de qualidade).

| Coluna      | Tipo        | Nullable | Default           | Constraints                         |
|-------------|-------------|----------|-------------------|-------------------------------------|
| id          | UUID        | NOT NULL | gen_random_uuid() | PK                                  |
| name        | TEXT        | NOT NULL |                   |                                     |
| phone       | TEXT        | NULL     |                   |                                     |
| address     | TEXT        | NULL     |                   |                                     |
| tax_id      | TEXT        | NULL     |                   |                                     |
| tax_id_type | TEXT        | NULL     |                   | CHECK (tax_id_type IN ('cpf','cnpj')) |
| created_at  | TIMESTAMPTZ | NOT NULL | now()             |                                     |
| updated_at  | TIMESTAMPTZ | NOT NULL | now()             |                                     |
| deleted_at  | TIMESTAMPTZ | NULL     |                   |                                     |

Indexes:
- `idx_customer_tax_id` em `(tax_id)` — busca por CPF/CNPJ
- `idx_customer_deleted_at` em `(deleted_at)`

---

#### `used_book_lot`

Precede `book` na ordem de criação pois `book.used_book_lot_id` referencia esta tabela. Registra lotes de compra de livros usados de clientes. O campo `payment_method` é textual com constraint fixa pois as regras de negócio limitam a apenas dois valores.

| Coluna               | Tipo        | Nullable | Default           | Constraints                              |
|----------------------|-------------|----------|-------------------|------------------------------------------|
| id                   | UUID        | NOT NULL | gen_random_uuid() | PK                                       |
| branch_id            | UUID        | NOT NULL |                   | FK → branch(id)                          |
| registered_by_user_id| UUID        | NOT NULL |                   | FK → user(id)                            |
| customer_id          | UUID        | NULL     |                   | FK → customer(id)                        |
| total_purchase_price | NUMERIC(10,2)| NOT NULL |                  |                                          |
| payment_method       | TEXT        | NOT NULL |                   | CHECK (payment_method IN ('cash','pix')) |
| purchased_at         | TIMESTAMPTZ | NOT NULL | now()             |                                          |
| created_at           | TIMESTAMPTZ | NOT NULL | now()             |                                          |
| updated_at           | TIMESTAMPTZ | NOT NULL | now()             |                                          |

Indexes:
- `idx_used_book_lot_branch_id` em `(branch_id)`
- `idx_used_book_lot_customer_id` em `(customer_id)`
- `idx_used_book_lot_purchased_at` em `(purchased_at)` — relatórios por período

---

#### `book`

Entidade central do catálogo. Unifica livros novos (controle por quantidade) e usados (exemplar individual). A coluna `quantity` é cache de leitura rápida para o PDV; a fonte de verdade é `stock`.

| Coluna               | Tipo          | Nullable | Default           | Constraints                                      |
|----------------------|---------------|----------|-------------------|--------------------------------------------------|
| id                   | UUID          | NOT NULL | gen_random_uuid() | PK                                               |
| branch_id            | UUID          | NOT NULL |                   | FK → branch(id)                                  |
| category_id          | UUID          | NULL     |                   | FK → category(id)                                |
| used_book_lot_id     | UUID          | NULL     |                   | FK → used_book_lot(id)                           |
| title                | TEXT          | NOT NULL |                   |                                                  |
| author               | TEXT          | NOT NULL |                   |                                                  |
| isbn                 | TEXT          | NULL     |                   |                                                  |
| publisher            | TEXT          | NULL     |                   |                                                  |
| publication_year     | INTEGER       | NULL     |                   |                                                  |
| condition            | TEXT          | NOT NULL |                   | CHECK (condition IN ('new','used'))               |
| condition_description| TEXT          | NULL     |                   |                                                  |
| sale_price           | NUMERIC(10,2) | NOT NULL |                   |                                                  |
| shelf_location       | TEXT          | NULL     |                   |                                                  |
| quantity             | INTEGER       | NOT NULL | 0                 | CHECK (quantity >= 0)                            |
| registered_at        | TIMESTAMPTZ   | NOT NULL | now()             |                                                  |
| created_at           | TIMESTAMPTZ   | NOT NULL | now()             |                                                  |
| updated_at           | TIMESTAMPTZ   | NOT NULL | now()             |                                                  |
| deleted_at           | TIMESTAMPTZ   | NULL     |                   |                                                  |

Constraints adicionais:
- `chk_book_condition_description` CHECK: quando `condition = 'used'`, `condition_description` NOT NULL — esta regra não pode ser expressa como simples NOT NULL pois depende de outra coluna; deve ser implementada como constraint CHECK ou enforced na camada de serviço

Indexes:
- `idx_book_branch_id` em `(branch_id)`
- `idx_book_category_id` em `(category_id)`
- `idx_book_isbn` em `(isbn)` — busca por ISBN no PDV e wishlist matching
- `idx_book_condition` em `(condition)` — filtros de catálogo
- `idx_book_deleted_at` em `(deleted_at)`
- `idx_book_title_author` em `(title, author)` — busca textual e wishlist matching

---

#### `book_image`

Até 10 imagens por livro. A constraint de limite máximo é enforced na camada de serviço (não pode ser expressa em DDL puro de forma simples).

| Coluna        | Tipo        | Nullable | Default           | Constraints     |
|---------------|-------------|----------|-------------------|-----------------|
| id            | UUID        | NOT NULL | gen_random_uuid() | PK              |
| book_id       | UUID        | NOT NULL |                   | FK → book(id)   |
| url           | TEXT        | NOT NULL |                   |                 |
| display_order | INTEGER     | NOT NULL |                   | CHECK (display_order >= 1) |
| created_at    | TIMESTAMPTZ | NOT NULL | now()             |                 |
| updated_at    | TIMESTAMPTZ | NOT NULL | now()             |                 |

Indexes:
- `idx_book_image_book_id` em `(book_id, display_order)` — recuperação ordenada das imagens de um livro

---

#### `book_price_history`

Registro imutável de alterações de preço. Nunca deve ser deletado (auditoria).

| Coluna            | Tipo          | Nullable | Default           | Constraints          |
|-------------------|---------------|----------|-------------------|----------------------|
| id                | UUID          | NOT NULL | gen_random_uuid() | PK                   |
| book_id           | UUID          | NOT NULL |                   | FK → book(id)        |
| changed_by_user_id| UUID          | NOT NULL |                   | FK → user(id)        |
| previous_price    | NUMERIC(10,2) | NOT NULL |                   |                      |
| new_price         | NUMERIC(10,2) | NOT NULL |                   |                      |
| changed_at        | TIMESTAMPTZ   | NOT NULL | now()             |                      |
| created_at        | TIMESTAMPTZ   | NOT NULL | now()             |                      |
| updated_at        | TIMESTAMPTZ   | NOT NULL | now()             |                      |

Indexes:
- `idx_book_price_history_book_id` em `(book_id, changed_at DESC)` — histórico cronológico de um livro

---

#### `stock`

Fonte de verdade do estoque por filial. Para livros usados, `quantity` é 0 ou 1 (enforced na camada de serviço).

| Coluna     | Tipo        | Nullable | Default           | Constraints                    |
|------------|-------------|----------|-------------------|--------------------------------|
| id         | UUID        | NOT NULL | gen_random_uuid() | PK                             |
| book_id    | UUID        | NOT NULL |                   | FK → book(id)                  |
| branch_id  | UUID        | NOT NULL |                   | FK → branch(id)                |
| quantity   | INTEGER     | NOT NULL | 0                 | CHECK (quantity >= 0)          |
| created_at | TIMESTAMPTZ | NOT NULL | now()             |                                |
| updated_at | TIMESTAMPTZ | NOT NULL | now()             |                                |

Constraints:
- `uq_stock_book_branch` UNIQUE `(book_id, branch_id)` — um único registro de estoque por livro por filial

Indexes:
- `idx_stock_book_id` em `(book_id)`
- `idx_stock_branch_id` em `(branch_id)`

---

#### `discount`

O campo `scope_type` é o discriminador que determina quais campos opcionais de escopo são relevantes. Apenas um escopo é ativo por registro; a consistência é garantida por CHECK constraints.

| Coluna              | Tipo          | Nullable | Default           | Constraints                                              |
|---------------------|---------------|----------|-------------------|----------------------------------------------------------|
| id                  | UUID          | NOT NULL | gen_random_uuid() | PK                                                       |
| branch_id           | UUID          | NOT NULL |                   | FK → branch(id)                                          |
| created_by_user_id  | UUID          | NOT NULL |                   | FK → user(id)                                            |
| scope_type          | TEXT          | NOT NULL |                   | CHECK (scope_type IN ('book','category','author','price_range')) |
| scope_category_id   | UUID          | NULL     |                   | FK → category(id)                                        |
| scope_author        | TEXT          | NULL     |                   |                                                          |
| scope_price_min     | NUMERIC(10,2) | NULL     |                   |                                                          |
| scope_price_max     | NUMERIC(10,2) | NULL     |                   |                                                          |
| discount_type       | TEXT          | NOT NULL |                   | CHECK (discount_type IN ('percentage','fixed'))          |
| discount_value      | NUMERIC(10,2) | NOT NULL |                   | CHECK (discount_value > 0)                               |
| starts_at           | TIMESTAMPTZ   | NULL     |                   |                                                          |
| ends_at             | TIMESTAMPTZ   | NULL     |                   |                                                          |
| is_active           | BOOLEAN       | NOT NULL | true              |                                                          |
| created_at          | TIMESTAMPTZ   | NOT NULL | now()             |                                                          |
| updated_at          | TIMESTAMPTZ   | NOT NULL | now()             |                                                          |
| deleted_at          | TIMESTAMPTZ   | NULL     |                   |                                                          |

Constraints adicionais (CHECKs de consistência de escopo):
- `chk_discount_scope_category`: quando `scope_type = 'category'`, `scope_category_id` NOT NULL
- `chk_discount_scope_author`: quando `scope_type = 'author'`, `scope_author` NOT NULL
- `chk_discount_scope_price_range`: quando `scope_type = 'price_range'`, ambos `scope_price_min` e `scope_price_max` NOT NULL e `scope_price_min < scope_price_max`

Indexes:
- `idx_discount_branch_id` em `(branch_id)`
- `idx_discount_is_active` em `(is_active, deleted_at)` — consulta de descontos ativos no PDV
- `idx_discount_scope_category_id` em `(scope_category_id)` WHERE `scope_category_id IS NOT NULL`

---

#### `discount_book`

Tabela de junção usada exclusivamente quando `discount.scope_type = 'book'`. Sem `deleted_at` — remoção é física.

| Coluna      | Tipo        | Nullable | Default           | Constraints           |
|-------------|-------------|----------|-------------------|-----------------------|
| id          | UUID        | NOT NULL | gen_random_uuid() | PK                    |
| discount_id | UUID        | NOT NULL |                   | FK → discount(id)     |
| book_id     | UUID        | NOT NULL |                   | FK → book(id)         |
| created_at  | TIMESTAMPTZ | NOT NULL | now()             |                       |
| updated_at  | TIMESTAMPTZ | NOT NULL | now()             |                       |

Constraints:
- `uq_discount_book` UNIQUE `(discount_id, book_id)`

Indexes:
- `idx_discount_book_discount_id` em `(discount_id)`
- `idx_discount_book_book_id` em `(book_id)` — verificação de desconto ativo para um livro no PDV

---

#### `payment_method`

Métodos de pagamento configurados por filial.

| Coluna     | Tipo        | Nullable | Default           | Constraints     |
|------------|-------------|----------|-------------------|-----------------|
| id         | UUID        | NOT NULL | gen_random_uuid() | PK              |
| branch_id  | UUID        | NOT NULL |                   | FK → branch(id) |
| name       | TEXT        | NOT NULL |                   |                 |
| is_active  | BOOLEAN     | NOT NULL | true              |                 |
| created_at | TIMESTAMPTZ | NOT NULL | now()             |                 |
| updated_at | TIMESTAMPTZ | NOT NULL | now()             |                 |
| deleted_at | TIMESTAMPTZ | NULL     |                   |                 |

Indexes:
- `idx_payment_method_branch_id` em `(branch_id, is_active)` — listagem de métodos ativos no PDV

---

#### `voucher`

Vale-crédito sem prazo de validade. `remaining_balance` é mutável (decrementado a cada uso parcial).

| Coluna            | Tipo          | Nullable | Default           | Constraints                        |
|-------------------|---------------|----------|-------------------|------------------------------------|
| id                | UUID          | NOT NULL | gen_random_uuid() | PK                                 |
| customer_id       | UUID          | NOT NULL |                   | FK → customer(id)                  |
| issued_by_user_id | UUID          | NOT NULL |                   | FK → user(id)                      |
| branch_id         | UUID          | NOT NULL |                   | FK → branch(id)                    |
| original_value    | NUMERIC(10,2) | NOT NULL |                   | CHECK (original_value > 0)         |
| remaining_balance | NUMERIC(10,2) | NOT NULL |                   | CHECK (remaining_balance >= 0)     |
| is_active         | BOOLEAN       | NOT NULL | true              |                                    |
| issued_at         | TIMESTAMPTZ   | NOT NULL | now()             |                                    |
| created_at        | TIMESTAMPTZ   | NOT NULL | now()             |                                    |
| updated_at        | TIMESTAMPTZ   | NOT NULL | now()             |                                    |

Indexes:
- `idx_voucher_customer_id` em `(customer_id, is_active)` — listagem de vouchers ativos de um cliente no PDV

---

#### `sale`

Cabeçalho da venda. Imutável após finalização (não há `deleted_at` — vendas não são canceladas neste escopo).

| Coluna           | Tipo          | Nullable | Default           | Constraints         |
|------------------|---------------|----------|-------------------|---------------------|
| id               | UUID          | NOT NULL | gen_random_uuid() | PK                  |
| branch_id        | UUID          | NOT NULL |                   | FK → branch(id)     |
| cashier_user_id  | UUID          | NOT NULL |                   | FK → user(id)       |
| customer_id      | UUID          | NULL     |                   | FK → customer(id)   |
| total_amount     | NUMERIC(10,2) | NOT NULL |                   | CHECK (total_amount >= 0) |
| receipt_printed  | BOOLEAN       | NOT NULL | false             |                     |
| sold_at          | TIMESTAMPTZ   | NOT NULL | now()             |                     |
| created_at       | TIMESTAMPTZ   | NOT NULL | now()             |                     |
| updated_at       | TIMESTAMPTZ   | NOT NULL | now()             |                     |

Indexes:
- `idx_sale_branch_id` em `(branch_id, sold_at DESC)` — relatórios de vendas por filial e período
- `idx_sale_customer_id` em `(customer_id)` WHERE `customer_id IS NOT NULL`
- `idx_sale_sold_at` em `(sold_at DESC)` — relatórios globais por data

---

#### `sale_item`

Linha de cada venda. Preço e desconto são gravados no momento da venda (snapshot imutável).

| Coluna           | Tipo          | Nullable | Default           | Constraints       |
|------------------|---------------|----------|-------------------|-------------------|
| id               | UUID          | NOT NULL | gen_random_uuid() | PK                |
| sale_id          | UUID          | NOT NULL |                   | FK → sale(id)     |
| book_id          | UUID          | NOT NULL |                   | FK → book(id)     |
| quantity         | INTEGER       | NOT NULL |                   | CHECK (quantity > 0) |
| unit_price       | NUMERIC(10,2) | NOT NULL |                   |                   |
| discount_applied | NUMERIC(10,2) | NOT NULL | 0                 | CHECK (discount_applied >= 0) |
| created_at       | TIMESTAMPTZ   | NOT NULL | now()             |                   |
| updated_at       | TIMESTAMPTZ   | NOT NULL | now()             |                   |

Indexes:
- `idx_sale_item_sale_id` em `(sale_id)` — recuperação dos itens de uma venda
- `idx_sale_item_book_id` em `(book_id)` — histórico de vendas de um livro

---

#### `sale_payment`

Pagamentos de uma venda. Um dos dois campos (`payment_method_id` ou `voucher_id`) deve estar preenchido, nunca ambos nulos ao mesmo tempo. A regra é enforced via CHECK constraint.

| Coluna             | Tipo          | Nullable | Default           | Constraints                  |
|--------------------|---------------|----------|-------------------|------------------------------|
| id                 | UUID          | NOT NULL | gen_random_uuid() | PK                           |
| sale_id            | UUID          | NOT NULL |                   | FK → sale(id)                |
| payment_method_id  | UUID          | NULL     |                   | FK → payment_method(id)      |
| voucher_id         | UUID          | NULL     |                   | FK → voucher(id)             |
| amount             | NUMERIC(10,2) | NOT NULL |                   | CHECK (amount > 0)           |
| created_at         | TIMESTAMPTZ   | NOT NULL | now()             |                              |
| updated_at         | TIMESTAMPTZ   | NOT NULL | now()             |                              |

Constraints adicionais:
- `chk_sale_payment_method_xor_voucher` CHECK: `(payment_method_id IS NOT NULL OR voucher_id IS NOT NULL)` — pelo menos um dos dois deve estar preenchido
- Regra adicional de exclusividade mútua (`payment_method_id IS NULL OR voucher_id IS NULL`) deve ser enforced na camada de serviço

Indexes:
- `idx_sale_payment_sale_id` em `(sale_id)`
- `idx_sale_payment_voucher_id` em `(voucher_id)` WHERE `voucher_id IS NOT NULL`

---

#### `wishlist_item`

Interesse de cliente em livro não disponível. Campos de texto livre pois o livro pode não existir no catálogo ainda.

| Coluna     | Tipo        | Nullable | Default           | Constraints     |
|------------|-------------|----------|-------------------|-----------------|
| id         | UUID        | NOT NULL | gen_random_uuid() | PK              |
| customer_id| UUID        | NOT NULL |                   | FK → customer(id)|
| branch_id  | UUID        | NOT NULL |                   | FK → branch(id) |
| title      | TEXT        | NULL     |                   |                 |
| author     | TEXT        | NULL     |                   |                 |
| isbn       | TEXT        | NULL     |                   |                 |
| notes      | TEXT        | NULL     |                   |                 |
| notified   | BOOLEAN     | NOT NULL | false             |                 |
| created_at | TIMESTAMPTZ | NOT NULL | now()             |                 |
| updated_at | TIMESTAMPTZ | NOT NULL | now()             |                 |
| deleted_at | TIMESTAMPTZ | NULL     |                   |                 |

Indexes:
- `idx_wishlist_item_customer_id` em `(customer_id)`
- `idx_wishlist_item_isbn` em `(isbn)` WHERE `isbn IS NOT NULL` — matching automático no cadastro de livros
- `idx_wishlist_item_notified` em `(notified, deleted_at)` — listagem de itens pendentes de notificação

---

#### `notification`

Notificações in-app geradas pelo sistema. O campo `metadata` usa `jsonb` para acomodar dados contextuais variáveis por tipo sem colunas nullable extras.

| Coluna     | Tipo        | Nullable | Default           | Constraints     |
|------------|-------------|----------|-------------------|-----------------|
| id         | UUID        | NOT NULL | gen_random_uuid() | PK              |
| user_id    | UUID        | NOT NULL |                   | FK → user(id)   |
| type       | TEXT        | NOT NULL |                   |                 |
| message    | TEXT        | NOT NULL |                   |                 |
| metadata   | JSONB       | NULL     |                   |                 |
| is_read    | BOOLEAN     | NOT NULL | false             |                 |
| read_at    | TIMESTAMPTZ | NULL     |                   |                 |
| created_at | TIMESTAMPTZ | NOT NULL | now()             |                 |
| updated_at | TIMESTAMPTZ | NOT NULL | now()             |                 |

Indexes:
- `idx_notification_user_id` em `(user_id, is_read)` — listagem de notificações não lidas por usuário
- `idx_notification_created_at` em `(created_at DESC)` — ordenação por data

---

#### `label_config`

Configurações de tamanho de etiqueta. Configurações de sistema (`is_system = true`) não podem ser deletadas nem editadas por usuários.

| Coluna     | Tipo          | Nullable | Default           | Constraints     |
|------------|---------------|----------|-------------------|-----------------|
| id         | UUID          | NOT NULL | gen_random_uuid() | PK              |
| branch_id  | UUID          | NULL     |                   | FK → branch(id) |
| name       | TEXT          | NOT NULL |                   |                 |
| width_cm   | NUMERIC(5,2)  | NOT NULL |                   | CHECK (width_cm > 0) |
| height_cm  | NUMERIC(5,2)  | NOT NULL |                   | CHECK (height_cm > 0) |
| is_default | BOOLEAN       | NOT NULL | false             |                 |
| is_system  | BOOLEAN       | NOT NULL | false             |                 |
| created_at | TIMESTAMPTZ   | NOT NULL | now()             |                 |
| updated_at | TIMESTAMPTZ   | NOT NULL | now()             |                 |
| deleted_at | TIMESTAMPTZ   | NULL     |                   |                 |

Indexes:
- `idx_label_config_branch_id` em `(branch_id)` WHERE `branch_id IS NOT NULL`

---

#### `branch_shelf_config`

Configuração de prazo de alerta de prateleira por filial. Relacionamento 1:1 com `branch` enforced via UNIQUE.

| Coluna                   | Tipo        | Nullable | Default           | Constraints                    |
|--------------------------|-------------|----------|-------------------|--------------------------------|
| id                       | UUID        | NOT NULL | gen_random_uuid() | PK                             |
| branch_id                | UUID        | NOT NULL |                   | FK → branch(id), UNIQUE        |
| overdue_threshold_days   | INTEGER     | NOT NULL |                   | CHECK (overdue_threshold_days > 0) |
| configured_by_user_id    | UUID        | NOT NULL |                   | FK → user(id)                  |
| created_at               | TIMESTAMPTZ | NOT NULL | now()             |                                |
| updated_at               | TIMESTAMPTZ | NOT NULL | now()             |                                |

---

### Estratégia de migração

A migração deve ser executada em arquivo único (ou scripts numerados sequencialmente) com a seguinte ordem de criação de tabelas, respeitando dependências de foreign keys:

**Fase 1 — Entidades sem dependências externas:**
1. `branch`
2. `role`
3. `category`
4. `customer`

**Fase 2 — Entidades que dependem apenas de Fase 1:**
5. `user` (depende de `branch`)
6. `payment_method` (depende de `branch`)

**Fase 3 — Entidades que dependem de Fase 1 e/ou 2:**
7. `user_role` (depende de `user`, `role`)
8. `used_book_lot` (depende de `branch`, `user`, `customer`)
9. `branch_shelf_config` (depende de `branch`, `user`)
10. `label_config` (depende de `branch`)
11. `voucher` (depende de `customer`, `user`, `branch`)

**Fase 4 — Entidades centrais do catálogo:**
12. `book` (depende de `branch`, `category`, `used_book_lot`)
13. `book_image` (depende de `book`)
14. `book_price_history` (depende de `book`, `user`)
15. `stock` (depende de `book`, `branch`)

**Fase 5 — Descontos:**
16. `discount` (depende de `branch`, `user`, `category`)
17. `discount_book` (depende de `discount`, `book`)

**Fase 6 — Vendas:**
18. `sale` (depende de `branch`, `user`, `customer`)
19. `sale_item` (depende de `sale`, `book`)
20. `sale_payment` (depende de `sale`, `payment_method`, `voucher`)

**Fase 7 — Features auxiliares:**
21. `wishlist_item` (depende de `customer`, `branch`)
22. `notification` (depende de `user`)

**Dados iniciais (seeds) a incluir na migração:**
- Inserção dos 4 perfis fixos em `role`: `Administrador`, `Gerente`, `Catalogador`, `Caixa`
- Inserção das configurações de etiqueta padrão em `label_config` com `is_system = true` e `branch_id = NULL`

**Rollback:** Como o sistema é novo e não há dados preexistentes, o rollback é seguro via `DROP TABLE` na ordem inversa (Fase 7 → Fase 1). Nenhuma migração de dados existentes é necessária.

---

## Contratos de API

Esta feature não expõe endpoints. O schema é consumido pelas demais features via repositórios Spring Data.

---

## Requisitos de qualidade

- [ ] I/O-bound operations identificadas? — Não aplicável a esta feature (sem camada de aplicação); migrations são operações de startup, não de runtime
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? — Não aplicável; sem código Java nesta feature
- [ ] Dados sensíveis tratados adequadamente?
  - `customer.tax_id` armazena CPF/CNPJ: a camada de aplicação das features que consomem este campo deve garantir que o dado não seja exposto em logs nem em respostas de listagem sem necessidade explícita
  - `user.password_hash` nunca deve ser retornado em nenhum endpoint de nenhuma feature
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? — Não aplicável; sem endpoints nesta feature

---

## Estratégia de testes

Como esta feature é exclusivamente de schema, os cenários de teste relevantes são:

**Integridade do schema:**
- Verificar que todas as FKs estão corretas e que registros órfãos são rejeitados pelo banco
- Verificar que constraints CHECK (`condition IN ('new','used')`, `payment_method IN ('cash','pix')`, etc.) rejeitam valores inválidos
- Verificar que constraints UNIQUE (`user.email`, `uq_stock_book_branch`, `uq_user_role`, `branch_shelf_config.branch_id`) impedem duplicatas

**Constraints de negócio:**
- Inserir livro usado sem `condition_description` — deve ser rejeitado (CHECK ou teste de serviço)
- Inserir `sale_payment` com ambos `payment_method_id` e `voucher_id` nulos — deve ser rejeitado pelo CHECK
- Inserir `discount` com `scope_type = 'category'` e `scope_category_id` nulo — deve ser rejeitado
- Inserir `discount` com `scope_type = 'price_range'` e `scope_price_min >= scope_price_max` — deve ser rejeitado
- Inserir `used_book_lot` com `payment_method = 'boleto'` — deve ser rejeitado pelo CHECK

**Integridade referencial:**
- Deletar `branch` referenciada por `user` — deve falhar por FK (sem ON DELETE CASCADE intencional)
- Verificar que `stock` não aceita dois registros para o mesmo par `(book_id, branch_id)`

**Seeds:**
- Verificar que os 4 perfis fixos estão presentes em `role` após migração
- Verificar que as configurações de etiqueta padrão (`is_system = true`) existem em `label_config`

---

## Riscos técnicos e dependências

**1. Ordenação de migração (risco alto):**
Todas as 22 tabelas possuem interdependências via FK. A execução fora da ordem definida na seção de migração causará erros de referência. Ferramentas como Flyway executam scripts na ordem lexicográfica dos nomes de arquivo — os arquivos de migração devem ser numerados de forma a respeitar a ordem das fases definidas acima.

**2. Estratégia de geração de UUID (risco médio):**
A função `gen_random_uuid()` é usada como default nas PKs. Esta função é nativa do PostgreSQL 13+ (módulo `pgcrypto` integrado ao core), disponível no PostgreSQL 18 sem configuração adicional. A camada de aplicação Spring Data pode optar por gerar UUIDs no lado Java (usando `UUID.randomUUID()`); nesse caso, o default do banco funciona como fallback e não causa conflito. A decisão deve ser consistente em todas as features — misturar geração Java e geração pelo banco pode causar problemas de diagnóstico.

**3. Estabilidade do schema como dependência crítica (risco alto):**
Todas as demais features do sistema dependem deste schema. Qualquer alteração posterior (adição de coluna, renomeação, mudança de tipo) exige nova migration incremental. O schema definido aqui deve ser tratado como contrato estável. Alterações retroativas são de alto impacto.

**4. Constraint condicional `condition_description` (risco baixo):**
A regra "livro usado deve ter `condition_description`" não pode ser expressa como simples `NOT NULL` pois é condicional a `condition = 'used'`. Um CHECK PostgreSQL pode expressar isso (`CHECK (condition != 'used' OR condition_description IS NOT NULL)`), mas se não implementado em DDL, a feature de cadastro de livros deve enforcer esta validação obrigatoriamente na camada de serviço.

**5. Cache de quantidade em `book.quantity` vs. fonte de verdade em `stock` (risco médio):**
O schema define dois locais para quantidade: `book.quantity` (cache) e `stock.quantity` (fonte de verdade). Se uma feature atualizar apenas um dos dois, haverá inconsistência. As features de venda e cadastro de livros devem atualizar ambos atomicamente dentro de uma transação.

**6. Ausência de `ON DELETE CASCADE` intencional (risco baixo):**
Nenhuma FK define `ON DELETE CASCADE`. Deleções devem ser feitas via soft-delete (`deleted_at`) ou seguir a ordem correta de deleção na camada de serviço. Tentar deletar um registro pai com filhos ativos causará erro de FK — este é o comportamento desejado para preservar integridade histórica.
