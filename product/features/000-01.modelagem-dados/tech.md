# 000-01 Modelagem de Dados — Tech Spec

**Estado da entrega:** Rascunho
**Feature:** 000-01.modelagem-dados
**Depende de:** (nenhuma)

## Visão técnica

Esta feature estabelece o esquema relacional completo do sistema via Liquibase e as entidades JPA correspondentes. Todo o código de acesso a dados das features subsequentes depende das classes e interfaces definidas aqui. Nenhuma lógica de negócio reside nesta camada — apenas mapeamento objeto-relacional, repositórios e enums de domínio.

## Estrutura de pacotes

```
com.ciet.demo_learn
├── domain/
│   ├── branch/
│   │   ├── Branch.java                    (entidade)
│   │   ├── BranchRepository.java
│   │   └── BranchShelfConfig.java         (entidade)
│   ├── user/
│   │   ├── User.java                      (entidade)
│   │   ├── UserRepository.java
│   │   ├── Role.java                      (entidade)
│   │   └── RoleRepository.java
│   ├── book/
│   │   ├── Book.java                      (entidade)
│   │   ├── BookRepository.java
│   │   ├── BookImage.java                 (entidade)
│   │   ├── BookImageRepository.java
│   │   ├── BookPriceHistory.java          (entidade)
│   │   ├── BookPriceHistoryRepository.java
│   │   ├── BookCondition.java             (enum)
│   │   └── BookDiscount.java              (entidade)
│   ├── discount/
│   │   ├── Discount.java                  (entidade)
│   │   ├── DiscountRepository.java
│   │   ├── DiscountScope.java             (enum)
│   │   └── DiscountType.java              (enum)
│   ├── customer/
│   │   ├── Customer.java                  (entidade)
│   │   ├── CustomerRepository.java
│   │   ├── WishlistItem.java              (entidade)
│   │   └── WishlistItemRepository.java
│   ├── voucher/
│   │   ├── Voucher.java                   (entidade)
│   │   ├── VoucherRepository.java
│   │   ├── VoucherRedemption.java         (entidade)
│   │   └── VoucherRedemptionRepository.java
│   ├── sale/
│   │   ├── Sale.java                      (entidade)
│   │   ├── SaleRepository.java
│   │   ├── SaleItem.java                  (entidade)
│   │   ├── SaleItemRepository.java
│   │   ├── SalePayment.java               (entidade)
│   │   └── SalePaymentRepository.java
│   ├── payment/
│   │   ├── PaymentMethod.java             (entidade)
│   │   └── PaymentMethodRepository.java
│   ├── purchase/
│   │   ├── UsedBookPurchase.java          (entidade)
│   │   ├── UsedBookPurchaseRepository.java
│   │   ├── UsedBookPurchaseItem.java      (entidade)
│   │   ├── UsedBookPurchaseItemRepository.java
│   │   └── PurchasePaymentType.java       (enum)
│   ├── notification/
│   │   ├── Notification.java             (entidade)
│   │   ├── NotificationRepository.java
│   │   └── NotificationType.java         (enum)
│   └── label/
│       ├── LabelSize.java                (entidade)
│       └── LabelSizeRepository.java
└── shared/
    └── audit/
        ├── Auditable.java                (classe base ou interface com created_at/updated_at)
        └── AuditingEntityListener.java   (listener JPA para preencher timestamps)
```

## Entidades JPA

Todas as entidades herdam de (ou implementam) `Auditable`, que fornece `createdAt` e `updatedAt` com `@EntityListeners(AuditingEntityListener.class)`. Entidades com soft delete expõem `deletedAt` diretamente — não há herança adicional para isso.

### Branch
- `@Entity @Table(name = "branch")`
- Campos: `id` (UUID), `name`, `address`, `phone`, `createdAt`, `updatedAt`, `deletedAt`
- Relacionamentos: `@OneToMany(mappedBy = "branch") List<User> users`; `@OneToOne(mappedBy = "branch") BranchShelfConfig shelfConfig`

### Role
- `@Entity @Table(name = "role")`
- Campos: `id` (UUID), `name` (UNIQUE), `description`, `createdAt`, `updatedAt`
- Não possui relacionamento bidirecional com `User` — navegação via `UserRole`

### User
- `@Entity @Table(name = "\"user\"")`  — aspas necessárias por ser palavra reservada SQL
- Campos: `id` (UUID), `name`, `email` (UNIQUE), `googleSub`, `createdAt`, `updatedAt`, `deletedAt`
- Relacionamentos:
  - `@ManyToOne @JoinColumn(name = "branch_id") Branch branch` (nullable)
  - `@ManyToMany @JoinTable(name = "user_role", joinColumns = "user_id", inverseJoinColumns = "role_id") Set<Role> roles`

### Book
- `@Entity @Table(name = "book")`
- Campos: `id` (UUID), `branchId` (FK), `title`, `author`, `isbn`, `publisher`, `publicationYear`, `genre`, `category`, `condition` (enum `BookCondition`), `conditionNotes`, `salePrice` (BigDecimal), `quantity`, `shelfLocation`, `registeredAt`, `createdAt`, `updatedAt`, `deletedAt`
- `condition` mapeado como `@Enumerated(EnumType.STRING)`
- Relacionamentos:
  - `@ManyToOne @JoinColumn(name = "branch_id") Branch branch`
  - `@OneToMany(mappedBy = "book", cascade = CascadeType.ALL) List<BookImage> images`
  - `@OneToMany(mappedBy = "book") List<BookPriceHistory> priceHistory`
  - `@OneToOne(mappedBy = "book") BookDiscount activeDiscount`

### BookImage
- `@Entity @Table(name = "book_image")`
- Campos: `id` (UUID), `url` (TEXT), `sortOrder` (short), `createdAt`, `updatedAt`
- `@ManyToOne @JoinColumn(name = "book_id") Book book`

### BookPriceHistory
- `@Entity @Table(name = "book_price_history")`
- Campos: `id` (UUID), `previousPrice` (BigDecimal), `newPrice` (BigDecimal), `changedAt` (OffsetDateTime)
- Sem `updatedAt` — tabela de log imutável; `changedAt` é o único timestamp
- Relacionamentos:
  - `@ManyToOne @JoinColumn(name = "book_id") Book book`
  - `@ManyToOne @JoinColumn(name = "changed_by") User changedBy`

### Discount
- `@Entity @Table(name = "discount")`
- Campos: `id` (UUID), `name`, `scope` (enum `DiscountScope`), `discountType` (enum `DiscountType`), `value` (BigDecimal), `scopeBookId` (UUID nullable), `scopeCategory`, `scopeAuthor`, `scopePriceMin` (BigDecimal nullable), `scopePriceMax` (BigDecimal nullable), `startsAt` (OffsetDateTime nullable), `endsAt` (OffsetDateTime nullable), `createdAt`, `updatedAt`, `deletedAt`
- `@ManyToOne @JoinColumn(name = "branch_id") Branch branch`
- `@ManyToOne @JoinColumn(name = "created_by") User createdBy`

### BookDiscount
- `@Entity @Table(name = "book_discount")`
- Campos: `id` (UUID), `appliedAt`
- UNIQUE constraint em `book_id` garante apenas um desconto ativo por livro
- `@OneToOne @JoinColumn(name = "book_id") Book book`
- `@ManyToOne @JoinColumn(name = "discount_id") Discount discount`

### Customer
- `@Entity @Table(name = "customer")`
- Campos: `id` (UUID), `name`, `phone`, `address`, `document` (CPF/CNPJ), `createdAt`, `updatedAt`, `deletedAt`
- `@ManyToOne @JoinColumn(name = "branch_id") Branch branch`
- `@OneToMany(mappedBy = "customer") List<WishlistItem> wishlist`

### WishlistItem
- `@Entity @Table(name = "wishlist_item")`
- Campos: `id` (UUID), `bookTitle`, `author`, `isbn`, `fulfilled` (boolean), `createdAt`, `updatedAt`
- Armazena texto livre — o livro pode não existir no sistema no momento do registro
- `@ManyToOne @JoinColumn(name = "customer_id") Customer customer`

### Voucher
- `@Entity @Table(name = "voucher")`
- Campos: `id` (UUID), `originalValue` (BigDecimal), `balance` (BigDecimal), `createdAt`, `updatedAt`
- `@ManyToOne @JoinColumn(name = "branch_id") Branch branch`
- `@ManyToOne @JoinColumn(name = "customer_id") Customer customer`
- `@ManyToOne @JoinColumn(name = "issued_by") User issuedBy`
- `@OneToMany(mappedBy = "voucher") List<VoucherRedemption> redemptions`

### VoucherRedemption
- `@Entity @Table(name = "voucher_redemption")`
- Campos: `id` (UUID), `amountUsed` (BigDecimal), `redeemedAt`, `createdAt`, `updatedAt`
- `@ManyToOne @JoinColumn(name = "voucher_id") Voucher voucher`
- `@ManyToOne @JoinColumn(name = "sale_id") Sale sale`

### Sale
- `@Entity @Table(name = "sale")`
- Campos: `id` (UUID), `totalAmount` (BigDecimal), `voucherAmount` (BigDecimal nullable), `receiptPrinted` (boolean), `soldAt`, `createdAt`, `updatedAt`
- `@ManyToOne @JoinColumn(name = "branch_id") Branch branch`
- `@ManyToOne @JoinColumn(name = "cashier_id") User cashier`
- `@ManyToOne @JoinColumn(name = "voucher_id") Voucher voucher` (nullable)
- `@OneToMany(mappedBy = "sale", cascade = CascadeType.ALL) List<SaleItem> items`
- `@OneToMany(mappedBy = "sale", cascade = CascadeType.ALL) List<SalePayment> payments`

### SaleItem
- `@Entity @Table(name = "sale_item")`
- Campos: `id` (UUID), `quantity` (int), `unitPrice` (BigDecimal), `discountedPrice` (BigDecimal nullable), `createdAt`, `updatedAt`
- `@ManyToOne @JoinColumn(name = "sale_id") Sale sale`
- `@ManyToOne @JoinColumn(name = "book_id") Book book`
- `@ManyToOne @JoinColumn(name = "discount_id") Discount discount` (nullable)

### SalePayment
- `@Entity @Table(name = "sale_payment")`
- Campos: `id` (UUID), `amount` (BigDecimal), `createdAt`, `updatedAt`
- `@ManyToOne @JoinColumn(name = "sale_id") Sale sale`
- `@ManyToOne @JoinColumn(name = "payment_method_id") PaymentMethod paymentMethod`

### PaymentMethod
- `@Entity @Table(name = "payment_method")`
- Campos: `id` (UUID), `name`, `active` (boolean), `createdAt`, `updatedAt`
- `@ManyToOne @JoinColumn(name = "branch_id") Branch branch`

### UsedBookPurchase
- `@Entity @Table(name = "used_book_purchase")`
- Campos: `id` (UUID), `totalValue` (BigDecimal), `paymentType` (enum `PurchasePaymentType`), `notes`, `purchasedAt`, `createdAt`, `updatedAt`
- `@ManyToOne @JoinColumn(name = "branch_id") Branch branch`
- `@ManyToOne @JoinColumn(name = "manager_id") User manager`
- `@ManyToOne @JoinColumn(name = "customer_id") Customer customer` (nullable)
- `@OneToMany(mappedBy = "purchase", cascade = CascadeType.ALL) List<UsedBookPurchaseItem> items`

### UsedBookPurchaseItem
- `@Entity @Table(name = "used_book_purchase_item")`
- Campos: `id` (UUID), `createdAt`, `updatedAt`
- `@ManyToOne @JoinColumn(name = "purchase_id") UsedBookPurchase purchase`
- `@ManyToOne @JoinColumn(name = "book_id") Book book`

### Notification
- `@Entity @Table(name = "notification")`
- Campos: `id` (UUID), `type` (enum `NotificationType`), `title`, `body`, `read` (boolean), `createdAt`, `updatedAt`
- `@ManyToOne @JoinColumn(name = "branch_id") Branch branch`
- `@ManyToOne @JoinColumn(name = "user_id") User user`

### BranchShelfConfig
- `@Entity @Table(name = "branch_shelf_config")`
- Campos: `id` (UUID), `overdueThresholdDays` (int), `createdAt`, `updatedAt`
- UNIQUE constraint em `branch_id`
- `@OneToOne @JoinColumn(name = "branch_id") Branch branch`

### LabelSize
- `@Entity @Table(name = "label_size")`
- Campos: `id` (UUID), `name`, `widthCm` (BigDecimal), `heightCm` (BigDecimal), `isDefault` (boolean), `createdAt`, `updatedAt`
- `@ManyToOne @JoinColumn(name = "branch_id") Branch branch` (nullable — NULL = tamanho padrão do sistema)

## Enums

Enums existem **apenas como classes Java**. Não há tipo ENUM nem CHECK constraint no banco — as colunas correspondentes são `TEXT`.

A validação de valores permitidos é responsabilidade da camada de aplicação (Java), não do banco.

| Enum Java | Pacote | Valores | Coluna no banco |
|---|---|---|---|
| `BookCondition` | `domain.book` | `NEW`, `USED` | `book.condition TEXT` |
| `DiscountScope` | `domain.discount` | `BOOK`, `CATEGORY`, `AUTHOR`, `PRICE_RANGE` | `discount.scope TEXT` |
| `DiscountType` | `domain.discount` | `PERCENTAGE`, `FIXED` | `discount.discount_type TEXT` |
| `PurchasePaymentType` | `domain.purchase` | `CASH`, `PIX` | `used_book_purchase.payment_type TEXT` |
| `NotificationType` | `domain.notification` | `WISHLIST_ARRIVAL`, `SHELF_OVERDUE` | `notification.type TEXT` |

**Convenção de serialização:** valores persistidos em lowercase (ex: `'new'`, `'book'`, `'cash'`). O mapeamento JPA usa `@Enumerated(EnumType.STRING)` com `AttributeConverter` que converte para lowercase ao gravar e de volta ao enum ao ler.

## Repositórios

Todos os repositórios estendem `JpaRepository<Entity, UUID>`. Abaixo estão apenas os métodos customizados necessários além do CRUD padrão.

### BranchRepository
- `Optional<Branch> findByIdAndDeletedAtIsNull(UUID id)`
- `List<Branch> findAllByDeletedAtIsNull()`

### UserRepository
- `Optional<User> findByEmailAndDeletedAtIsNull(String email)`
- `Optional<User> findByGoogleSubAndDeletedAtIsNull(String googleSub)`
- `List<User> findAllByBranchIdAndDeletedAtIsNull(UUID branchId)`

### BookRepository
- `List<Book> findAllByBranchIdAndDeletedAtIsNull(UUID branchId)`
- `Optional<Book> findByIdAndBranchIdAndDeletedAtIsNull(UUID id, UUID branchId)`
- `List<Book> findAllByBranchIdAndIsbnAndDeletedAtIsNull(UUID branchId, String isbn)`
- Query JPQL para busca full-text por título/autor/ISBN dentro de uma filial

### BookPriceHistoryRepository
- `List<BookPriceHistory> findAllByBookIdOrderByChangedAtDesc(UUID bookId)`
- Query para filtrar por título/autor e período (JOIN com Book):
  ```
  SELECT h FROM BookPriceHistory h
  JOIN h.book b
  WHERE b.branchId = :branchId
    AND (b.title ILIKE :term OR b.author ILIKE :term)
    AND h.changedAt BETWEEN :from AND :to
  ORDER BY h.changedAt DESC
  ```

### DiscountRepository
- `List<Discount> findAllByBranchIdAndDeletedAtIsNull(UUID branchId)`
- Query para descontos ativos em determinado momento:
  ```
  SELECT d FROM Discount d
  WHERE d.branchId = :branchId
    AND d.deletedAt IS NULL
    AND (d.startsAt IS NULL OR d.startsAt <= :now)
    AND (d.endsAt IS NULL OR d.endsAt > :now)
  ```

### BookDiscountRepository
- `Optional<BookDiscount> findByBookId(UUID bookId)`

### CustomerRepository
- `List<Customer> findAllByBranchIdAndDeletedAtIsNull(UUID branchId)`
- `Optional<Customer> findByDocumentAndBranchId(String document, UUID branchId)`

### WishlistItemRepository
- `List<WishlistItem> findAllByCustomerIdAndFulfilledFalse(UUID customerId)`
- Query para localizar wishlists não atendidas que batem com título/ISBN de um livro recém-cadastrado:
  ```
  SELECT w FROM WishlistItem w
  WHERE w.fulfilled = false
    AND w.customer.branchId = :branchId
    AND (LOWER(w.bookTitle) = LOWER(:title) OR w.isbn = :isbn)
  ```

### VoucherRepository
- `List<Voucher> findAllByCustomerIdAndBalanceGreaterThan(UUID customerId, BigDecimal zero)`
- `List<Voucher> findAllByBranchId(UUID branchId)`

### SaleRepository
- `List<Sale> findAllByBranchIdAndSoldAtBetween(UUID branchId, OffsetDateTime from, OffsetDateTime to)`
- `List<Sale> findAllByCashierIdAndSoldAtBetween(UUID cashierId, OffsetDateTime from, OffsetDateTime to)`

### NotificationRepository
- `List<Notification> findAllByUserIdAndReadFalseOrderByCreatedAtDesc(UUID userId)`
- `long countByUserIdAndReadFalse(UUID userId)`

### BranchShelfConfigRepository
- `Optional<BranchShelfConfig> findByBranchId(UUID branchId)`

### LabelSizeRepository
- `List<LabelSize> findAllByBranchIdOrBranchIdIsNullOrderByIsDefaultDesc(UUID branchId)`
  — retorna os tamanhos da filial + os padrões do sistema

## Migration

O DDL completo está definido no `business.md` desta feature e é a fonte de verdade.

Arquivo de migration: `src/backend/src/main/resources/db/changelog/changes/001-initial-schema.xml`

- changeSet id: `001-initial-schema`, author: `gzorzi`
- Todo o DDL é inserido como bloco `<sql>` dentro do changeSet existente
- Ordem de criação respeita dependências de FK:
  1. `branch`
  2. `role`
  3. `"user"`
  4. `user_role`
  5. `payment_method`
  6. `customer`
  7. `book` (depende de `branch`)
  8. `book_image`
  9. `book_price_history`
  10. `discount`
  11. `book_discount`
  12. `voucher`
  13. `sale`
  14. `sale_item`
  15. `sale_payment`
  16. `used_book_purchase`
  17. `used_book_purchase_item`
  18. `wishlist_item`
  19. `notification`
  20. `branch_shelf_config`
  21. `label_size`
  22. `voucher_redemption`
  23. Seed: `INSERT INTO role ...` (4 perfis fixos)

Liquibase é configurado no `application.properties` com `spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.xml`.

## Convenções e padrões

### Auditoria (created_at / updated_at)
- Classe base `Auditable` com `@CreatedDate OffsetDateTime createdAt` e `@LastModifiedDate OffsetDateTime updatedAt`, ambos com `@Column(nullable = false, updatable = false / true)`
- `@EntityListeners(AuditingEntityListener.class)` em `Auditable`
- Habilitar com `@EnableJpaAuditing` na classe principal ou em uma `@Configuration`
- `BookPriceHistory` **não** herda `Auditable` — usa apenas `changedAt` como timestamp próprio

### Soft delete
- Entidades com soft delete: `Branch`, `User`, `Book`, `Customer`, `Discount`
- Campo `deletedAt` (OffsetDateTime nullable) diretamente na entidade — sem herança adicional
- Todos os repositórios filtram `WHERE deleted_at IS NULL` nos métodos de listagem e busca
- Registros deletados permanecem acessíveis via queries específicas (ex: histórico de vendas referenciando livro deletado)

### Nomenclatura
- Entidades: PascalCase, singular (ex: `Book`, `SaleItem`)
- Tabelas: snake_case, singular (ex: `book`, `sale_item`)
- Colunas: snake_case (ex: `branch_id`, `sale_price`)
- Campos Java: camelCase (ex: `branchId`, `salePrice`)
- Enums Java: UPPER_SNAKE_CASE; valores PostgreSQL: lowercase

### UUIDs
- Tipo Java: `java.util.UUID`
- Versão: UUID v7 — ordenável por tempo, melhor performance em índices B-tree
- Geração Java: biblioteca `com.fasterxml.uuid` (java-uuid-generator) via `Generators.timeBasedEpochGenerator().generate()`, integrado através de anotação `@IdGeneratorType` customizada.
- Geração no banco: `DEFAULT uuidv7()` (nativo PostgreSQL 17+) — fallback para inserts diretos via SQL
- Nunca usar `UUID.randomUUID()` (v4) para IDs de entidades

### BigDecimal para valores monetários
- Todos os campos de preço/valor usam `BigDecimal` — nunca `double` ou `float`
- Precisão: `NUMERIC(10,2)` no banco; `@Column(precision = 10, scale = 2)` na entidade

### Convenção de relacionamentos N:N com atributos extras
- `user_role` tem campo `assignedAt` — mapeado como entidade própria `UserRole` com `@EmbeddedId` ou chave composta `@IdClass`, **não** como `@ManyToMany` direto no `User`, a menos que `assignedAt` não seja consultado isoladamente
- Alternativa mais simples: manter `@ManyToMany` em `User` e ignorar `assignedAt` na entidade JPA (preenchido automaticamente pelo banco via DEFAULT)
