# Tech — Modelagem de Dados

**Delivery status:** Draft

## Visão técnica

Define o schema relacional completo do sistema. Todas as tabelas são criadas via Liquibase (`001-initial-schema.xml`). Chaves primárias usam UUID v7 gerado pelo banco via `uuidv7()`. Colunas de enumeração são `TEXT` — sem tipos `ENUM` nem `CHECK` constraints. A ordem de criação respeita dependências de FK.

## Stack

- PostgreSQL 18
- Liquibase 4.x — changeSet `001-initial-schema`, formato `<sql>`
- Spring Boot 4 / Spring Data JPA — entidades Java em `com.ciet.demo_learn`
- Java 25 — records ou classes anotadas com `@Entity`

## DDL completo

A seguir, o DDL completo em ordem de dependência de FK (tabelas referenciadas antes das referenciantes).

```sql
-- ============================================================
-- BRANCH
-- ============================================================
CREATE TABLE branch (
    id          UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    name        TEXT        NOT NULL,
    address     TEXT,
    phone       TEXT,
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- ROLE
-- ============================================================
CREATE TABLE role (
    id          UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    name        TEXT        NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- USER
-- ============================================================
CREATE TABLE "user" (
    id          UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    name        TEXT        NOT NULL,
    email       TEXT        NOT NULL UNIQUE,
    branch_id   UUID        REFERENCES branch(id),
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- USER_ROLE
-- ============================================================
CREATE TABLE user_role (
    user_id     UUID        NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role_id     UUID        NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- CUSTOMER
-- ============================================================
CREATE TABLE customer (
    id          UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    name        TEXT        NOT NULL,
    phone       TEXT,
    address     TEXT,
    cpf_cnpj    TEXT,
    branch_id   UUID        NOT NULL REFERENCES branch(id),
    created_at  TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- BOOK
-- ============================================================
CREATE TABLE book (
    id                      UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    title                   TEXT        NOT NULL,
    author                  TEXT        NOT NULL,
    isbn                    TEXT,
    publisher               TEXT,
    year                    INTEGER,
    category                TEXT,
    condition               TEXT        NOT NULL,   -- 'new' | 'used'
    condition_description   TEXT,
    sale_price              NUMERIC(10,2) NOT NULL,
    description             TEXT,
    branch_id               UUID        NOT NULL REFERENCES branch(id),
    shelf_location          TEXT,
    registered_at           TIMESTAMP   NOT NULL DEFAULT now(),
    active                  BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- BOOK_IMAGE
-- ============================================================
CREATE TABLE book_image (
    id          UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    book_id     UUID        NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    url         TEXT        NOT NULL,
    "order"     INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- BOOK_STOCK
-- ============================================================
CREATE TABLE book_stock (
    id          UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    book_id     UUID        NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    branch_id   UUID        NOT NULL REFERENCES branch(id),
    quantity    INTEGER     NOT NULL DEFAULT 0,
    updated_at  TIMESTAMP   NOT NULL DEFAULT now(),
    UNIQUE (book_id, branch_id)
);

-- ============================================================
-- PRICE_HISTORY
-- ============================================================
CREATE TABLE price_history (
    id              UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    book_id         UUID        NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    previous_price  NUMERIC(10,2) NOT NULL,
    new_price       NUMERIC(10,2) NOT NULL,
    changed_by      UUID        NOT NULL REFERENCES "user"(id),
    changed_at      TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- LABEL_CONFIG
-- ============================================================
CREATE TABLE label_config (
    id          UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    branch_id   UUID        REFERENCES branch(id),   -- NULL = global default
    name        TEXT        NOT NULL,
    width_cm    NUMERIC(5,2) NOT NULL,
    height_cm   NUMERIC(5,2) NOT NULL,
    is_default  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- DISCOUNT
-- ============================================================
CREATE TABLE discount (
    id          UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    branch_id   UUID        NOT NULL REFERENCES branch(id),
    scope       TEXT        NOT NULL,   -- 'book' | 'category' | 'author' | 'price_range'
    value_type  TEXT        NOT NULL,   -- 'percentage' | 'fixed'
    value       NUMERIC(10,2) NOT NULL,
    category    TEXT,
    author      TEXT,
    min_price   NUMERIC(10,2),
    max_price   NUMERIC(10,2),
    starts_at   TIMESTAMP,
    ends_at     TIMESTAMP,
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by  UUID        NOT NULL REFERENCES "user"(id),
    created_at  TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- DISCOUNT_BOOK
-- ============================================================
CREATE TABLE discount_book (
    discount_id UUID        NOT NULL REFERENCES discount(id) ON DELETE CASCADE,
    book_id     UUID        NOT NULL REFERENCES book(id) ON DELETE CASCADE,
    PRIMARY KEY (discount_id, book_id)
);

-- ============================================================
-- PAYMENT_METHOD
-- ============================================================
CREATE TABLE payment_method (
    id          UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    branch_id   UUID        NOT NULL REFERENCES branch(id),
    name        TEXT        NOT NULL,
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- VOUCHER
-- ============================================================
CREATE TABLE voucher (
    id                UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    branch_id         UUID        NOT NULL REFERENCES branch(id),
    customer_id       UUID        NOT NULL REFERENCES customer(id),
    initial_value     NUMERIC(10,2) NOT NULL,
    remaining_balance NUMERIC(10,2) NOT NULL,
    issued_by         UUID        NOT NULL REFERENCES "user"(id),
    issued_at         TIMESTAMP   NOT NULL DEFAULT now(),
    active            BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ============================================================
-- SALE
-- ============================================================
CREATE TABLE sale (
    id              UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    branch_id       UUID        NOT NULL REFERENCES branch(id),
    cashier_id      UUID        NOT NULL REFERENCES "user"(id),
    customer_id     UUID        REFERENCES customer(id),
    total_amount    NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    receipt_printed BOOLEAN     NOT NULL DEFAULT FALSE,
    sold_at         TIMESTAMP   NOT NULL DEFAULT now(),
    created_at      TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- SALE_ITEM
-- ============================================================
CREATE TABLE sale_item (
    id               UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    sale_id          UUID        NOT NULL REFERENCES sale(id) ON DELETE CASCADE,
    book_id          UUID        NOT NULL REFERENCES book(id),
    unit_price       NUMERIC(10,2) NOT NULL,
    discounted_price NUMERIC(10,2) NOT NULL,
    quantity         INTEGER     NOT NULL DEFAULT 1
);

-- ============================================================
-- SALE_PAYMENT
-- ============================================================
CREATE TABLE sale_payment (
    id                 UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    sale_id            UUID        NOT NULL REFERENCES sale(id) ON DELETE CASCADE,
    payment_method_id  UUID        NOT NULL REFERENCES payment_method(id),
    amount             NUMERIC(10,2) NOT NULL,
    voucher_id         UUID        REFERENCES voucher(id)
);

-- ============================================================
-- VOUCHER_USAGE
-- ============================================================
CREATE TABLE voucher_usage (
    id          UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    voucher_id  UUID        NOT NULL REFERENCES voucher(id),
    sale_id     UUID        NOT NULL REFERENCES sale(id),
    amount_used NUMERIC(10,2) NOT NULL,
    used_at     TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- USED_BOOK_PURCHASE
-- ============================================================
CREATE TABLE used_book_purchase (
    id              UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    branch_id       UUID        NOT NULL REFERENCES branch(id),
    total_price     NUMERIC(10,2) NOT NULL,
    payment_method  TEXT        NOT NULL,   -- 'cash' | 'pix'
    seller_name     TEXT,
    purchased_by    UUID        NOT NULL REFERENCES "user"(id),
    purchased_at    TIMESTAMP   NOT NULL DEFAULT now(),
    notes           TEXT
);

-- ============================================================
-- USED_BOOK_PURCHASE_ITEM
-- ============================================================
CREATE TABLE used_book_purchase_item (
    id           UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    purchase_id  UUID        NOT NULL REFERENCES used_book_purchase(id) ON DELETE CASCADE,
    book_id      UUID        NOT NULL REFERENCES book(id)
);

-- ============================================================
-- CUSTOMER_WISHLIST
-- ============================================================
CREATE TABLE customer_wishlist (
    id          UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    customer_id UUID        NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    branch_id   UUID        NOT NULL REFERENCES branch(id),
    title       TEXT        NOT NULL,
    author      TEXT,
    isbn        TEXT,
    notified    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- SHELF_THRESHOLD
-- ============================================================
CREATE TABLE shelf_threshold (
    id              UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    branch_id       UUID        NOT NULL REFERENCES branch(id) UNIQUE,
    days_threshold  INTEGER     NOT NULL,
    configured_by   UUID        NOT NULL REFERENCES "user"(id),
    updated_at      TIMESTAMP   NOT NULL DEFAULT now()
);

-- ============================================================
-- NOTIFICATION
-- ============================================================
CREATE TABLE notification (
    id                    UUID        NOT NULL DEFAULT uuidv7() PRIMARY KEY,
    branch_id             UUID        NOT NULL REFERENCES branch(id),
    user_id               UUID        NOT NULL REFERENCES "user"(id),
    type                  TEXT        NOT NULL,   -- 'book_arrival' | 'shelf_overdue'
    message               TEXT        NOT NULL,
    book_id               UUID        REFERENCES book(id),
    customer_wishlist_id  UUID        REFERENCES customer_wishlist(id),
    read                  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMP   NOT NULL DEFAULT now()
);
```

## Entidades JPA (pacote `com.ciet.demo_learn`)

Cada tabela corresponde a uma entidade JPA anotada com `@Entity`. Mapeamentos relevantes:

| Tabela | Classe Java | Observação |
|---|---|---|
| `branch` | `Branch` | |
| `role` | `Role` | |
| `user` | `User` | Nome reservado — tabela entre aspas no DDL |
| `user_role` | `UserRole` | `@EmbeddedId` com `UserRoleId` (userId, roleId) |
| `customer` | `Customer` | |
| `book` | `Book` | `condition` → campo `String`; enum validado na camada de serviço |
| `book_image` | `BookImage` | `@ManyToOne` → `Book` |
| `book_stock` | `BookStock` | `@UniqueConstraint(bookId, branchId)` |
| `price_history` | `PriceHistory` | Inserido via `@PreUpdate` em `Book` |
| `label_config` | `LabelConfig` | `branch_id` nullable (configuração global) |
| `discount` | `Discount` | `scope` e `value_type` → `String`; enum validado no serviço |
| `discount_book` | `DiscountBook` | `@EmbeddedId` com `DiscountBookId` |
| `payment_method` | `PaymentMethod` | |
| `voucher` | `Voucher` | |
| `sale` | `Sale` | |
| `sale_item` | `SaleItem` | `@ManyToOne` → `Sale`, `Book` |
| `sale_payment` | `SalePayment` | `voucher_id` nullable |
| `voucher_usage` | `VoucherUsage` | |
| `used_book_purchase` | `UsedBookPurchase` | `payment_method` → `String` |
| `used_book_purchase_item` | `UsedBookPurchaseItem` | |
| `customer_wishlist` | `CustomerWishlist` | |
| `shelf_threshold` | `ShelfThreshold` | `@UniqueConstraint(branchId)` |
| `notification` | `Notification` | `type` → `String`; `book_id` e `customer_wishlist_id` nullable |

## Índices recomendados

```sql
-- Busca de livros por título/autor/ISBN dentro de uma filial
CREATE INDEX idx_book_branch      ON book(branch_id);
CREATE INDEX idx_book_isbn        ON book(isbn);
CREATE INDEX idx_book_title       ON book(title);
CREATE INDEX idx_book_author      ON book(author);

-- Notificações por usuário (caixa/gerente)
CREATE INDEX idx_notification_user   ON notification(user_id, read);

-- Vouchers ativos por cliente
CREATE INDEX idx_voucher_customer ON voucher(customer_id, active);

-- Histórico de preços por livro
CREATE INDEX idx_price_history_book ON price_history(book_id, changed_at DESC);

-- Lista de desejos por cliente
CREATE INDEX idx_wishlist_customer ON customer_wishlist(customer_id);
```

## Observações de implementação

- `uuidv7()` deve ser habilitado no PostgreSQL via extensão ou função customizada antes da execução do changeSet.
- A tabela `user` usa aspas duplas no DDL por ser palavra reservada em alguns dialetos SQL; o mapeamento JPA deve usar `@Table(name = "\"user\"")` ou similar.
- A regra "máximo 10 imagens por livro" é aplicada na camada de serviço (`BookService`), não no banco.
- A regra "um desconto ativo por livro" é verificada na camada de serviço antes de persistir um novo vínculo em `discount_book`.
- O decremento de `voucher.remaining_balance` deve ser feito de forma atômica com a inserção em `voucher_usage` (dentro de uma transação).
- O registro em `price_history` deve ser inserido antes de `UPDATE book SET sale_price = ?` — recomenda-se `@PreUpdate` no listener JPA ou lógica explícita no serviço.
- `shelf_threshold` tem constraint `UNIQUE` em `branch_id` — operação de configuração é sempre `UPSERT`.

## Seed de dados iniciais

Os quatro perfis fixos são inseridos no changeSet `001-initial-schema`:

```sql
INSERT INTO role (id, name, description, created_at, updated_at) VALUES
  (uuidv7(), 'Administrador', 'Acesso total ao sistema',          now(), now()),
  (uuidv7(), 'Gerente',       'Gestão da própria filial',          now(), now()),
  (uuidv7(), 'Catalogador',   'Cadastro e edição de livros',       now(), now()),
  (uuidv7(), 'Caixa',         'Operação do PDV',                   now(), now());
```
