# 000-01 Modelagem de Dados

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Define o esquema relacional completo do sistema de livraria/sebo: todas as entidades, relacionamentos, restrições e o DDL PostgreSQL 18 que serve de base para todas as demais features.

Feature de infraestrutura — não é uma feature de negócio.

## Stack envolvido

- PostgreSQL 18
- Liquibase (migrations versionadas)
- UUIDs como chaves primárias (`gen_random_uuid()`)
- Soft delete via coluna `deleted_at` (nullable) nas entidades que exigem histórico
- Convenção de nomenclatura: snake_case, inglês

## Regras de negócio

1. Toda tabela possui `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` e `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
2. Perfis são fixos e pré-cadastrados via seed: Administrador, Gerente, Catalogador, Caixa. Nenhum perfil pode ser criado ou removido pela aplicação.
3. Um usuário pode ter múltiplos perfis simultaneamente (relação N:N via tabela `user_role`).
4. Usuários pertencem a uma filial, exceto Administrador (branch_id nullable).
5. Livros novos compartilham um único registro com controle de quantidade; livros usados têm registro individual.
6. Estoque é gerenciado por filial — sem compartilhamento entre filiais.
7. Cada alteração de preço de venda de um livro é registrada automaticamente em `book_price_history`.
8. Desconto tem escopo: livro individual, categoria, autor ou faixa de preço.
9. Apenas um desconto ativo por livro em determinado momento.
10. Voucher está vinculado a um cliente registrado; sem prazo de validade; suporta uso parcial com saldo preservado.
11. Uma venda pode ter múltiplos itens e múltiplos métodos de pagamento.
12. A compra de lote de livros usados é registrada como aquisição de inventário com valor total negociado.
13. Wishlist de cliente dispara notificação in-app quando o livro desejado é registrado na filial.
14. Tempo de prateleira é rastreado por registro de livro; o limiar de atraso é configurado por filial.
15. Histórico de preço é acessível apenas a Gerente e Administrador.
16. CPF/CNPJ do cliente é armazenado para futura emissão de NF-e.

## Critérios de aceite

```gherkin
Funcionalidade: Integridade do esquema de banco de dados

  Cenário: Todas as tabelas são criadas com sucesso
    Dado que a migration inicial é executada em um banco PostgreSQL 18 vazio
    Então todas as tabelas definidas no DDL existem no schema public
    E todas as constraints de FK estão ativas
    E os 4 perfis fixos estão presentes na tabela role

  Cenário: Unicidade de perfil por nome
    Dado que os perfis fixos foram inseridos pelo seed
    Quando se tenta inserir um perfil com o mesmo nome
    Então a operação é rejeitada por constraint UNIQUE

  Cenário: Usuário pertence a filial
    Dado que um usuário é criado com branch_id NOT NULL
    Quando se tenta alterar branch_id para NULL sem perfil Administrador
    Então a aplicação deve impedir (regra aplicada na camada de serviço)

  Cenário: Soft delete preserva histórico
    Dado que um livro possui vendas associadas
    Quando o livro recebe deleted_at preenchido
    Então o registro permanece no banco e as vendas continuam acessíveis

  Cenário: Registro de alteração de preço
    Dado que um livro possui preço de venda registrado
    Quando o preço é alterado
    Então um novo registro é inserido em book_price_history com preço anterior, novo preço, timestamp e usuário responsável

  Cenário: Controle de estoque por filial
    Dado que o mesmo ISBN existe em duas filiais distintas
    Quando o estoque de uma filial é decrementado por uma venda
    Então o estoque da outra filial permanece inalterado
```

## Quem pode acessar

- Não há acesso direto ao banco pela aplicação fora das migrations e da camada de repositório.
- DDL e dados de seed são gerenciados exclusivamente via Liquibase.

## Fora de escopo

- Particionamento de tabelas.
- Replicação ou alta disponibilidade de banco.
- Auditoria genérica de todas as tabelas (apenas `book_price_history` é explicitamente requerida).
- Emissão de NF-e (CPF/CNPJ coletado, integração fiscal fora de escopo).

## Modelo de dados

```
branch
  └──< user (branch_id FK, nullable para Administrador)
         └──< user_role >── role

book (condition: new | used, individual record per used copy)
  ├── branch_id FK
  ├──< book_image
  ├──< book_price_history (user_id FK)
  └──< book_discount >── discount

discount
  ├── branch_id FK
  ├── scope: BOOK | CATEGORY | AUTHOR | PRICE_RANGE
  └── type: PERCENTAGE | FIXED

stock (branch_id FK, book_id FK) — quantity per branch for new books

customer
  ├── branch_id FK
  └──< wishlist_item (book_title, author — pode ser livro não cadastrado)

voucher
  ├── customer_id FK
  ├── branch_id FK
  └──< voucher_redemption (sale_id FK)

sale
  ├── branch_id FK
  ├── cashier_id FK (user)
  ├──< sale_item (book_id FK, quantity, unit_price, discount_id FK nullable)
  └──< sale_payment (payment_method_id FK, amount)

payment_method
  └── branch_id FK

used_book_purchase (lot)
  ├── branch_id FK
  ├── manager_id FK (user)
  └──< used_book_purchase_item (book_id FK, after registration)

notification
  ├── branch_id FK
  ├── user_id FK (recipient)
  └── type: WISHLIST_ARRIVAL | SHELF_OVERDUE

branch_shelf_config (branch_id FK, overdue_threshold_days)

label_size
  └── branch_id FK (nullable = system default)
```

## DDL (PostgreSQL 18)

```sql
-- ============================================================
-- BRANCH
-- ============================================================
CREATE TABLE branch (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150) NOT NULL,
    address     TEXT,
    phone       VARCHAR(30),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

-- ============================================================
-- ROLE
-- ============================================================
CREATE TABLE role (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_name UNIQUE (name)
);

-- ============================================================
-- USER
-- ============================================================
CREATE TABLE "user" (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR(150) NOT NULL,
    email        VARCHAR(255) NOT NULL,
    google_sub   VARCHAR(255),
    branch_id    UUID REFERENCES branch(id) ON DELETE RESTRICT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT uq_user_email UNIQUE (email)
);

CREATE INDEX idx_user_branch ON "user"(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_google_sub ON "user"(google_sub) WHERE google_sub IS NOT NULL;

-- ============================================================
-- USER_ROLE
-- ============================================================
CREATE TABLE user_role (
    user_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES role(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- PAYMENT_METHOD
-- ============================================================
CREATE TABLE payment_method (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branch(id) ON DELETE RESTRICT,
    name        VARCHAR(80) NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_method_branch ON payment_method(branch_id) WHERE active = TRUE;

-- ============================================================
-- CUSTOMER
-- ============================================================
CREATE TABLE customer (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branch(id) ON DELETE RESTRICT,
    name        VARCHAR(150) NOT NULL,
    phone       VARCHAR(30),
    address     TEXT,
    document    VARCHAR(20),   -- CPF or CNPJ, plain digits
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ
);

CREATE INDEX idx_customer_branch ON customer(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_document ON customer(document) WHERE document IS NOT NULL;

-- ============================================================
-- BOOK
-- ============================================================
CREATE TYPE book_condition AS ENUM ('new', 'used');

CREATE TABLE book (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id           UUID NOT NULL REFERENCES branch(id) ON DELETE RESTRICT,
    title               VARCHAR(300) NOT NULL,
    author              VARCHAR(200),
    isbn                VARCHAR(20),
    publisher           VARCHAR(150),
    publication_year    SMALLINT,
    genre               VARCHAR(100),
    category            VARCHAR(100),
    condition           book_condition NOT NULL,
    condition_notes     TEXT,          -- mandatory for used books
    sale_price          NUMERIC(10,2) NOT NULL,
    quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    shelf_location      VARCHAR(100),
    registered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_book_branch ON book(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_book_isbn ON book(isbn) WHERE isbn IS NOT NULL;
CREATE INDEX idx_book_title ON book USING gin(to_tsvector('portuguese', title));
CREATE INDEX idx_book_author ON book(author) WHERE author IS NOT NULL;

-- ============================================================
-- BOOK_IMAGE
-- ============================================================
CREATE TABLE book_image (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id     UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    sort_order  SMALLINT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_book_image_book ON book_image(book_id);

-- ============================================================
-- BOOK_PRICE_HISTORY
-- ============================================================
CREATE TABLE book_price_history (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id         UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    previous_price  NUMERIC(10,2) NOT NULL,
    new_price       NUMERIC(10,2) NOT NULL,
    changed_by      UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_book ON book_price_history(book_id);
CREATE INDEX idx_price_history_changed_at ON book_price_history(changed_at);

-- ============================================================
-- DISCOUNT
-- ============================================================
CREATE TYPE discount_scope AS ENUM ('book', 'category', 'author', 'price_range');
CREATE TYPE discount_type  AS ENUM ('percentage', 'fixed');

CREATE TABLE discount (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       UUID NOT NULL REFERENCES branch(id) ON DELETE RESTRICT,
    name            VARCHAR(150),
    scope           discount_scope NOT NULL,
    discount_type   discount_type  NOT NULL,
    value           NUMERIC(10,2)  NOT NULL CHECK (value > 0),
    scope_book_id   UUID REFERENCES book(id) ON DELETE SET NULL,   -- scope=book
    scope_category  VARCHAR(100),                                   -- scope=category
    scope_author    VARCHAR(200),                                   -- scope=author
    scope_price_min NUMERIC(10,2),                                  -- scope=price_range
    scope_price_max NUMERIC(10,2),                                  -- scope=price_range
    starts_at       TIMESTAMPTZ,
    ends_at         TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_discount_branch ON discount(branch_id) WHERE deleted_at IS NULL;

-- ============================================================
-- BOOK_DISCOUNT (active discount per book — enforced by application)
-- ============================================================
CREATE TABLE book_discount (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id      UUID NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    discount_id  UUID NOT NULL REFERENCES discount(id) ON DELETE CASCADE,
    applied_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_book_active_discount UNIQUE (book_id)
);

-- ============================================================
-- VOUCHER
-- ============================================================
CREATE TABLE voucher (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       UUID NOT NULL REFERENCES branch(id) ON DELETE RESTRICT,
    customer_id     UUID NOT NULL REFERENCES customer(id) ON DELETE RESTRICT,
    issued_by       UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    original_value  NUMERIC(10,2) NOT NULL CHECK (original_value > 0),
    balance         NUMERIC(10,2) NOT NULL CHECK (balance >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voucher_customer ON voucher(customer_id);
CREATE INDEX idx_voucher_branch ON voucher(branch_id);

-- ============================================================
-- SALE
-- ============================================================
CREATE TABLE sale (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       UUID NOT NULL REFERENCES branch(id) ON DELETE RESTRICT,
    cashier_id      UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    total_amount    NUMERIC(10,2) NOT NULL,
    voucher_id      UUID REFERENCES voucher(id) ON DELETE RESTRICT,
    voucher_amount  NUMERIC(10,2),
    receipt_printed BOOLEAN NOT NULL DEFAULT FALSE,
    sold_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_branch ON sale(branch_id);
CREATE INDEX idx_sale_sold_at ON sale(sold_at);
CREATE INDEX idx_sale_cashier ON sale(cashier_id);

-- ============================================================
-- SALE_ITEM
-- ============================================================
CREATE TABLE sale_item (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id         UUID NOT NULL REFERENCES sale(id) ON DELETE CASCADE,
    book_id         UUID NOT NULL REFERENCES book(id) ON DELETE RESTRICT,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(10,2) NOT NULL,
    discount_id     UUID REFERENCES discount(id) ON DELETE SET NULL,
    discounted_price NUMERIC(10,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_item_sale ON sale_item(sale_id);
CREATE INDEX idx_sale_item_book ON sale_item(book_id);

-- ============================================================
-- SALE_PAYMENT
-- ============================================================
CREATE TABLE sale_payment (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id           UUID NOT NULL REFERENCES sale(id) ON DELETE CASCADE,
    payment_method_id UUID NOT NULL REFERENCES payment_method(id) ON DELETE RESTRICT,
    amount            NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_payment_sale ON sale_payment(sale_id);

-- ============================================================
-- USED_BOOK_PURCHASE (lot)
-- ============================================================
CREATE TYPE purchase_payment_type AS ENUM ('cash', 'pix');

CREATE TABLE used_book_purchase (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id       UUID NOT NULL REFERENCES branch(id) ON DELETE RESTRICT,
    manager_id      UUID NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
    customer_id     UUID REFERENCES customer(id) ON DELETE SET NULL,
    total_value     NUMERIC(10,2) NOT NULL CHECK (total_value > 0),
    payment_type    purchase_payment_type NOT NULL,
    notes           TEXT,
    purchased_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ubp_branch ON used_book_purchase(branch_id);

-- ============================================================
-- USED_BOOK_PURCHASE_ITEM
-- ============================================================
CREATE TABLE used_book_purchase_item (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id  UUID NOT NULL REFERENCES used_book_purchase(id) ON DELETE CASCADE,
    book_id      UUID NOT NULL REFERENCES book(id) ON DELETE RESTRICT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ubpi_purchase ON used_book_purchase_item(purchase_id);

-- ============================================================
-- WISHLIST_ITEM
-- ============================================================
CREATE TABLE wishlist_item (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    book_title  VARCHAR(300) NOT NULL,
    author      VARCHAR(200),
    isbn        VARCHAR(20),
    fulfilled   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wishlist_customer ON wishlist_item(customer_id) WHERE fulfilled = FALSE;

-- ============================================================
-- NOTIFICATION
-- ============================================================
CREATE TYPE notification_type AS ENUM ('wishlist_arrival', 'shelf_overdue');

CREATE TABLE notification (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID NOT NULL REFERENCES branch(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    type        notification_type NOT NULL,
    title       VARCHAR(200) NOT NULL,
    body        TEXT,
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_user ON notification(user_id) WHERE read = FALSE;
CREATE INDEX idx_notification_branch ON notification(branch_id);

-- ============================================================
-- BRANCH_SHELF_CONFIG
-- ============================================================
CREATE TABLE branch_shelf_config (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id               UUID NOT NULL REFERENCES branch(id) ON DELETE CASCADE,
    overdue_threshold_days  INTEGER NOT NULL CHECK (overdue_threshold_days > 0),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_shelf_config_branch UNIQUE (branch_id)
);

-- ============================================================
-- LABEL_SIZE
-- ============================================================
CREATE TABLE label_size (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id   UUID REFERENCES branch(id) ON DELETE CASCADE,  -- NULL = system default
    name        VARCHAR(80) NOT NULL,
    width_cm    NUMERIC(5,2) NOT NULL CHECK (width_cm > 0),
    height_cm   NUMERIC(5,2) NOT NULL CHECK (height_cm > 0),
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_label_size_branch ON label_size(branch_id);

-- ============================================================
-- VOUCHER_REDEMPTION
-- ============================================================
CREATE TABLE voucher_redemption (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_id  UUID NOT NULL REFERENCES voucher(id) ON DELETE RESTRICT,
    sale_id     UUID NOT NULL REFERENCES sale(id) ON DELETE RESTRICT,
    amount_used NUMERIC(10,2) NOT NULL CHECK (amount_used > 0),
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voucher_redemption_voucher ON voucher_redemption(voucher_id);
CREATE INDEX idx_voucher_redemption_sale ON voucher_redemption(sale_id);

-- ============================================================
-- SEED — perfis fixos
-- ============================================================
INSERT INTO role (id, name, description, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Administrador', 'Acesso total ao sistema',             now(), now()),
  (gen_random_uuid(), 'Gerente',       'Gestão da própria filial',            now(), now()),
  (gen_random_uuid(), 'Catalogador',   'Cadastro e edição de livros',         now(), now()),
  (gen_random_uuid(), 'Caixa',         'Operação do PDV',                     now(), now());
```
