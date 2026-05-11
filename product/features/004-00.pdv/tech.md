# PDV — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo raiz do Ponto de Venda. Define o schema das três tabelas próprias (`sale`, `sale_item`, `sale_payment`), os índices de performance, e os contratos de todos os endpoints REST que as quatro sub-features (`004-01` a `004-04`) necessitam.

O PDV é o ponto de convergência de quatro domínios externos: o catálogo (`book`, `book_stock`) é lido para adicionar itens; os descontos (`discount`) são consultados no momento do escaneamento via `GET /discounts/active`; os vouchers (`voucher`, `voucher_usage`) são consultados e resgatados; e os métodos de pagamento (`payment_method`) são listados no momento da venda.

O fluxo inteiro ocorre na única rota frontend `/pdv`. O carrinho é **estado local do frontend** — nenhum dado é persistido enquanto a venda está em andamento. A única escrita no banco acontece ao acionar "Finalizar venda", de forma totalmente atômica.

Camadas afetadas: persistência (JPA sobre PostgreSQL 18), serviço de domínio (orquestração da transação de finalização), e frontend React com rota `/pdv`.

Domínios externos que este módulo lê ou escreve:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — escopo de toda venda |
| Usuários / Auth (`000-01`, `000-02`) | `user`, `user_role`, `role` | leitura — identificação do caixa e autorização |
| Catálogo (`001-00`) | `book`, `book_stock` | leitura (disponibilidade e preço) + escrita (débito de estoque na finalização) |
| Descontos (`003-00`) | `discount`, `discount_book` | leitura — `GET /discounts/active` consultado por livro |
| Vouchers (`005-00`) | `voucher`, `voucher_usage` | leitura (`GET /vouchers/lookup`) + escrita (resgate via `POST /vouchers/{id}/redeem`) |
| Clientes (`007-00`) | `customer` | leitura — `GET /customers/search` para vincular cliente à venda |
| Métodos de pagamento (`008-00`) | `payment_method` | leitura — `GET /payment-methods` para listar opções ativas |

---

## Modelo de dados

### Novas tabelas / alterações de schema

As tabelas `sale`, `sale_item`, `sale_payment` e `voucher_usage` já foram criadas pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`. A análise do schema existente versus os requisitos do `business.md` revela divergências que exigem uma migration de adequação.

> **Divergências entre o schema `001-initial-schema` e o modelo de dados definido em `business.md`:**
> O changeSet inicial modelou `sale` de forma simplificada, sem os campos `status`, `subtotal`, `voucher_id`, `voucher_amount_used` e `completed_at`, usando `total_amount` e `discount_amount` no lugar de `subtotal`/`total`. O business.md define um modelo mais rico. O changeSet de adequação abaixo alinha o schema ao modelo de negócio especificado neste módulo.

#### `sale` — cabeçalho da venda (após migration de adequação)

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `cashier_id` | `UUID` | NOT NULL | — | FK → `"user"(id)` |
| `customer_id` | `UUID` | NULL | — | FK → `customer(id)`; nullable — venda anônima |
| `voucher_id` | `UUID` | NULL | — | FK → `voucher(id)`; nullable — apenas quando voucher aplicado |
| `voucher_amount_used` | `NUMERIC(10,2)` | NOT NULL | `0` | valor efetivamente descontado pelo voucher; `0` quando não há voucher |
| `subtotal` | `NUMERIC(10,2)` | NOT NULL | — | soma dos `effective_price` de todos os itens |
| `total` | `NUMERIC(10,2)` | NOT NULL | — | `subtotal - voucher_amount_used`; valor efetivamente cobrado |
| `status` | `TEXT` | NOT NULL | `'pending'` | `'pending'` \| `'completed'`; vendas finalizadas recebem `'completed'` |
| `receipt_printed` | `BOOLEAN` | NOT NULL | `FALSE` | marcado `true` se o recibo for impresso |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | início da venda |
| `completed_at` | `TIMESTAMP` | NULL | — | data/hora da finalização; `null` enquanto `status = 'pending'` |

> `status` é `TEXT` sem `CHECK` constraint (política do schema). O serviço rejeita valores fora de `{'pending', 'completed'}`. `status = 'pending'` jamais é persistido no banco — a transação de finalização grava a venda já com `status = 'completed'`. O campo existe no schema para possibilitar auditorias futuras, mas no fluxo atual toda linha gravada em `sale` nasce como `completed`.

> `voucher_id` e `customer_id` são `NULL` por padrão. A FK para `voucher` não usa `ON DELETE CASCADE` — um voucher não pode ser apagado enquanto houver vendas que o referenciam.

#### `sale_item` — itens da venda

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `sale_id` | `UUID` | NOT NULL | — | FK → `sale(id)` ON DELETE CASCADE |
| `book_id` | `UUID` | NOT NULL | — | FK → `book(id)` |
| `original_price` | `NUMERIC(10,2)` | NOT NULL | — | preço de venda do livro no momento da adição ao carrinho (`book.sale_price`) |
| `discount_id` | `UUID` | NULL | — | FK → `discount(id)`; nullable — desconto aplicado ao item, se houver |
| `effective_price` | `NUMERIC(10,2)` | NOT NULL | — | preço após desconto; igual a `original_price` quando não há desconto |

> A coluna `quantity` existente no schema `001-initial-schema` (`sale_item.quantity INTEGER NOT NULL DEFAULT 1`) deve ser **removida** pela migration de adequação. O business.md estabelece que cada livro é um registro individual — não há quantidade por item. Cada `sale_item` representa exatamente um exemplar de `book_id`.

> `discount_id` é `NULL` para itens sem desconto. A FK não usa `ON DELETE CASCADE` — remoção de desconto não apaga o histórico de vendas que o utilizaram. `ON DELETE SET NULL` pode ser considerado, mas exigiria tratamento adicional; o mais seguro é não declarar ação de cascade, mantendo `RESTRICT` implícito.

#### `sale_payment` — pagamentos da venda

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `sale_id` | `UUID` | NOT NULL | — | FK → `sale(id)` ON DELETE CASCADE |
| `payment_method_id` | `UUID` | NOT NULL | — | FK → `payment_method(id)` |
| `amount` | `NUMERIC(10,2)` | NOT NULL | — | valor pago neste método; deve ser > 0 |

> A coluna `voucher_id` existente em `sale_payment` no schema `001-initial-schema` deve ser **removida** pela migration de adequação. O vínculo com o voucher é feito via `sale.voucher_id` e a operação de resgate é registrada em `voucher_usage`. Manter `voucher_id` em `sale_payment` seria redundante e causaria inconsistência.

#### `voucher_usage` — log de uso de vouchers

Esta tabela já existe no schema `001-initial-schema` e não requer alterações. Referência:

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `voucher_id` | `UUID` | NOT NULL | — | FK → `voucher(id)` |
| `sale_id` | `UUID` | NOT NULL | — | FK → `sale(id)` |
| `amount_used` | `NUMERIC(10,2)` | NOT NULL | — | valor efetivamente descontado |
| `used_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável |

---

### Estratégia de migração

O changeSet `001-initial-schema` já criou as tabelas. Este módulo emite um **novo changeSet de adequação** (`006-pdv-schema-alignment`) com as seguintes operações — todas em uma única migration para garantir atomicidade do rollback:

```sql
-- changeSet: 006-pdv-schema-alignment

-- Remover coluna quantity de sale_item (livros são unitários no PDV)
ALTER TABLE sale_item DROP COLUMN IF EXISTS quantity;

-- Remover coluna discount_amount de sale (substituída por voucher_amount_used + subtotal/total)
ALTER TABLE sale DROP COLUMN IF EXISTS discount_amount;

-- Remover coluna total_amount de sale (substituída por subtotal + total)
ALTER TABLE sale DROP COLUMN IF EXISTS total_amount;

-- Remover coluna receipt_printed (já existe em 001-initial-schema, verificar antes de adicionar novamente)
-- A coluna receipt_printed JÁ EXISTE em 001-initial-schema; não recriar.

-- Remover coluna voucher_id de sale_payment (redundante com sale.voucher_id)
ALTER TABLE sale_payment DROP COLUMN IF EXISTS voucher_id;

-- Adicionar colunas ausentes em sale
ALTER TABLE sale
    ADD COLUMN IF NOT EXISTS voucher_id          UUID         REFERENCES voucher(id),
    ADD COLUMN IF NOT EXISTS voucher_amount_used NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS subtotal            NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total               NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status              TEXT          NOT NULL DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS completed_at        TIMESTAMP;

-- Adicionar colunas ausentes em sale_item
ALTER TABLE sale_item
    ADD COLUMN IF NOT EXISTS original_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_id     UUID          REFERENCES discount(id),
    ADD COLUMN IF NOT EXISTS effective_price NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Renomear coluna unit_price → original_price (se unit_price ainda existir após add)
-- Atenção: apenas executar se unit_price existir; o ADD COLUMN acima pode ter adicionado original_price já.
-- Se a tabela tiver unit_price e discounted_price do schema inicial, migrar os dados:
UPDATE sale_item SET original_price = unit_price, effective_price = discounted_price
    WHERE original_price = 0;
ALTER TABLE sale_item DROP COLUMN IF EXISTS unit_price;
ALTER TABLE sale_item DROP COLUMN IF EXISTS discounted_price;
```

> **Dados existentes:** Como o banco de dados estará vazio em desenvolvimento no momento desta migration, a migração de dados (UPDATE) é por precaução. Em produção, qualquer dado legado em `sale_item` deve ser migrado antes de remover as colunas antigas. O rollback é seguro enquanto não houver dados gravados.

> **Rollback:** DROP das colunas adicionadas; recriação das colunas removidas com DEFAULT adequado. Verificar integridade referencial antes do rollback em ambiente com dados.

---

### Índices para o módulo

Os índices abaixo devem ser adicionados no mesmo changeSet `006-pdv-schema-alignment` ou em changeSet separado (`007-pdv-indexes`):

```sql
-- Listagem de vendas por filial (relatórios, histórico — módulo 011-xx)
CREATE INDEX idx_sale_branch
    ON sale(branch_id, created_at DESC);

-- Listagem de vendas por caixa (auditoria)
CREATE INDEX idx_sale_cashier
    ON sale(cashier_id);

-- Lookup de venda por cliente (histórico de compras)
CREATE INDEX idx_sale_customer
    ON sale(customer_id)
    WHERE customer_id IS NOT NULL;

-- Lookup de itens por venda (JOIN frequente na finalização e nos relatórios)
CREATE INDEX idx_sale_item_sale
    ON sale_item(sale_id);

-- Lookup de itens por livro (relatório de livros mais vendidos — 011-02)
CREATE INDEX idx_sale_item_book
    ON sale_item(book_id);

-- Lookup de pagamentos por venda
CREATE INDEX idx_sale_payment_sale
    ON sale_payment(sale_id);
```

---

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade → `401`. Perfil sem permissão → `403`. O `branch_id` de escopo é extraído do claim `branchId` do JWT. O `Administrador` sem `branchId` no JWT deve informar `branch_id` via query param.

---

### `GET /pdv/books/lookup`

Consulta um livro pelo ISBN (escaneamento) ou busca por título/ISBN para exibição no carrinho do PDV. Retorna disponibilidade de estoque e preço efetivo (com desconto ativo, se houver).

> Este endpoint é o caminho crítico do PDV — é chamado a cada escaneamento de livro. Internamente combina dados de `book`, `book_stock` e resolve o desconto ativo via a mesma lógica de `GET /discounts/active` (mesmo domínio; pode ser chamada interna de serviço ou reutilização do endpoint já especificado em `003-00`). A separação num endpoint próprio do PDV evita que o `Caixa` precise ter acesso à rota de descontos administrativos.

- **Authorization:** `Administrador`, `Gerente`, `Caixa`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Descrição |
  |-----------|------|-------------|-----------|
  | `isbn` | `string` | condicional | ISBN do livro; obrigatório se `q` não for informado |
  | `q` | `string` | condicional | busca por título ou ISBN parcial; obrigatório se `isbn` não for informado; mínimo 1 caractere |
  | `page` | `integer` | não | padrão `0`; apenas relevante quando `q` é informado |
  | `size` | `integer` | não | padrão `20`; máximo `50`; apenas relevante quando `q` é informado |

- **Response `200` — busca por `isbn` (resultado único):**

  ```json
  {
    "id": "uuid",
    "title": "string",
    "author": "string",
    "condition": "new|used",
    "originalPrice": 0.00,
    "discountId": "uuid|null",
    "effectivePrice": 0.00,
    "available": true
  }
  ```

- **Response `200` — busca por `q` (resultado paginado):**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "title": "string",
        "author": "string",
        "condition": "new|used",
        "originalPrice": 0.00,
        "discountId": "uuid|null",
        "effectivePrice": 0.00,
        "available": true
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0
  }
  ```

  > O campo `available` é `true` quando `book_stock.quantity > 0` (para livros novos) ou quando `book.active = true` e não há `sale_item` pendente referenciando o livro (para usados — cada livro usado é único). O campo `effectivePrice` corresponde ao `discounted_price` calculado por `GET /discounts/active`; quando não há desconto ativo, `effectivePrice = originalPrice`. O campo `discountId` é `null` quando não há desconto.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Livro encontrado; `available` pode ser `false` |
  | `400` | Nem `isbn` nem `q` informados; ou `isbn` vazio; ou `q` vazio |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` |
  | `404` | ISBN informado não encontrado na filial (apenas para busca por `isbn` exato) |
  | `500` | Erro inesperado |

- **Edge cases:**
  - A busca é **restrita à filial do usuário autenticado** (`book.branch_id = branchId` do JWT). O Caixa não pode adicionar livros de outras filiais.
  - Quando `isbn` é informado e encontrado mas `available = false`, o endpoint retorna `200` com `available: false` — não retorna `404`. O frontend usa esse valor para exibir a mensagem de indisponibilidade.
  - Retorna apenas livros com `active = true`.
  - Para busca por `q`, o comportamento é idêntico a `GET /books/search`: `ILIKE '%q%'` em `title`, `author` e `isbn`.

---

### `POST /sales`

Finaliza a venda. Persiste atomicamente `sale`, `sale_item`(s) e `sale_payment`(s); debita estoque; registra uso de voucher quando aplicável. É o **único endpoint de escrita** do módulo PDV.

> A operação é a mais crítica do sistema — qualquer falha parcial deve resultar em rollback completo. Toda a orquestração (insert sale + items + payments + débito de estoque + resgate de voucher) deve ocorrer dentro de uma única transação `@Transactional`.

- **Authorization:** `Administrador`, `Gerente`, `Caixa`

- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `customerId` | `UUID` | não | se informado, deve referenciar `customer` ativo na mesma filial |
  | `voucherId` | `UUID` | não | se informado, `customerId` é obrigatório; deve referenciar voucher `active = true` e `remaining_balance > 0` na mesma filial; deve pertencer ao `customerId` informado |
  | `items` | `array` | sim | não vazio; mínimo 1 item |
  | `items[].bookId` | `UUID` | sim | deve referenciar `book` ativo na filial do usuário; não pode ser duplicado dentro do array |
  | `items[].originalPrice` | `number` | sim | deve ser > 0; deve corresponder ao `book.sale_price` atual — validado pelo servidor |
  | `items[].discountId` | `UUID` | não | se informado, deve referenciar `discount` ativo e vigente na filial; o `effectivePrice` derivado deve ser ≥ 0 |
  | `items[].effectivePrice` | `number` | sim | deve ser > 0 (ou = 0 quando desconto fixo cobre todo o preço); deve ser coerente com `originalPrice` e `discountId` — validado pelo servidor |
  | `payments` | `array` | condicional | obrigatório quando `sale.total > 0`; pode ser vazio quando total = 0 (voucher cobre tudo) |
  | `payments[].paymentMethodId` | `UUID` | sim | deve referenciar `payment_method` com `active = true` na filial |
  | `payments[].amount` | `number` | sim | deve ser > 0 |

- **Response `201`:**

  ```json
  {
    "saleId": "uuid",
    "branchId": "uuid",
    "cashierId": "uuid",
    "customerId": "uuid|null",
    "voucherId": "uuid|null",
    "voucherAmountUsed": 0.00,
    "subtotal": 0.00,
    "total": 0.00,
    "status": "completed",
    "createdAt": "ISO-8601",
    "completedAt": "ISO-8601",
    "items": [
      {
        "id": "uuid",
        "bookId": "uuid",
        "bookTitle": "string",
        "originalPrice": 0.00,
        "discountId": "uuid|null",
        "effectivePrice": 0.00
      }
    ],
    "payments": [
      {
        "id": "uuid",
        "paymentMethodId": "uuid",
        "paymentMethodName": "string",
        "amount": 0.00
      }
    ]
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `201` | Venda finalizada com sucesso |
  | `400` | `items` vazio; `items[].bookId` duplicado; `payments[].amount <= 0`; `originalPrice` incompatível com `book.sale_price`; `effectivePrice` incompatível com o desconto informado; `voucherId` informado sem `customerId` |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador`; ou `branchId` ausente no JWT para `Administrador` sem parâmetro |
  | `404` | `bookId` não encontrado na filial; `customerId` não encontrado; `paymentMethodId` não encontrado ou inativo; `discountId` não encontrado ou inativo/expirado |
  | `409` | Um ou mais livros sem estoque disponível no momento da finalização; `voucherId` inativo ou saldo esgotado; soma dos `payments[].amount` menor que `sale.total`; `voucherId` não pertence ao `customerId` informado |
  | `500` | Erro inesperado / falha na transação |

- **Edge cases e regras de orquestração (ordem de execução dentro da transação):**

  1. **Validar existência e disponibilidade de cada `bookId`:** verificar `book.active = true` e `book.branch_id = branchId` do JWT. Para livros novos, verificar `book_stock.quantity > 0`. Para livros usados, verificar que não há outro `sale_item` com o mesmo `book_id` em outra venda `completed` (ou seja, `book.active = true` é suficiente, pois o livro é inativado na venda). Em caso de indisponibilidade → `409`.

  2. **Validar coerência de preços:** re-calcular `effectivePrice` a partir do `discountId` e `originalPrice` informados. Se o valor calculado pelo servidor divergir do `effectivePrice` no request (diferença > R$ 0,01 por tolerância de arredondamento), retornar `400`. Isso previne manipulação de preço no cliente.

  3. **Calcular `subtotal`, `voucherAmountUsed` e `total`:**
     - `subtotal = SUM(effectivePrice)` para todos os itens.
     - `voucherAmountUsed = MIN(voucher.remaining_balance, subtotal)` quando `voucherId` informado; `0` caso contrário.
     - `total = subtotal - voucherAmountUsed`.

  4. **Validar cobertura dos pagamentos:** `SUM(payments[].amount) >= total`. Se `total = 0`, nenhum pagamento é necessário. → `409` se cobertura insuficiente.

  5. **Persistir `sale`** com `status = 'completed'`, `completed_at = now()`, e todos os campos calculados.

  6. **Persistir `sale_item`** para cada livro do carrinho.

  7. **Persistir `sale_payment`** para cada método de pagamento.

  8. **Debitar estoque:**
     - Livros novos: `UPDATE book_stock SET quantity = quantity - 1 WHERE book_id = ? AND branch_id = ?`. Se a linha não existir ou `quantity - 1 < 0`, a transação faz rollback.
     - Livros usados: `UPDATE book SET active = false WHERE id = ?`.

  9. **Registrar uso do voucher** (apenas quando `voucherId` informado):
     - Inserir em `voucher_usage`: `(voucher_id, sale_id, amount_used = voucherAmountUsed, used_at = now())`.
     - `UPDATE voucher SET remaining_balance = remaining_balance - voucherAmountUsed WHERE id = ?`.
     - Se `remaining_balance` resultante `= 0`: `UPDATE voucher SET active = false`.

  > O resgate do voucher é feito diretamente no banco pela transação de finalização, **não** via chamada ao endpoint `POST /vouchers/{id}/redeem` do módulo 005. A chamada de serviço a serviço (interna) reutiliza a lógica do domínio de vouchers, mas tudo dentro da mesma transação JDBC/JPA.

  > Se qualquer step acima falhar, a transação inteira é revertida. O estado do carrinho no frontend é preservado para nova tentativa.

  > `receipt_printed` é gravado como `false` na persistência da venda. Não faz parte do request — é atualizado por endpoint separado após confirmação de impressão.

---

### `PATCH /sales/{id}/receipt`

Marca a venda como tendo recibo impresso. Chamado pelo frontend após a impressão ser confirmada pelo Caixa.

- **Authorization:** `Administrador`, `Gerente`, `Caixa`
- **Path param:** `id` — UUID da venda
- **Request body:** sem corpo
- **Response `200`:**

  ```json
  { "saleId": "uuid", "receiptPrinted": true }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Campo atualizado com sucesso |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Venda pertence a outra filial; perfil sem permissão |
  | `404` | `saleId` não encontrado |
  | `500` | Erro inesperado |

- **Edge cases:**
  - O endpoint é idempotente: chamar múltiplas vezes retorna `200` sem erro.
  - O backend verifica que `sale.branch_id = branchId` do JWT antes de atualizar.
  - A venda deve ter `status = 'completed'` — operação não é aplicável a vendas não finalizadas (mas no fluxo atual todas as vendas persistidas já nascem como `completed`).

---

## DTOs de domínio

DTOs definidos como Java records no pacote `com.ciet.demo_learn.pdv`:

```
PdvBookLookupResponse       — item de GET /pdv/books/lookup (isbn ou q)
PdvBookSearchResponse       — wrapper paginado de GET /pdv/books/lookup com q
SaleCreateRequest           — body de POST /sales
SaleItemRequest             — item dentro de SaleCreateRequest
SalePaymentRequest          — payment dentro de SaleCreateRequest
SaleResponse                — resposta de POST /sales (201)
SaleItemResponse            — item de sale dentro de SaleResponse
SalePaymentResponse         — payment dentro de SaleResponse
SaleReceiptResponse         — resposta de PATCH /sales/{id}/receipt
```

---

## Requisitos de qualidade

- [x] I/O-bound identificado? `POST /sales` executa múltiplas queries em sequência dentro de uma transação (INSERT × N + UPDATE × N). Virtual threads (Java 25 / Project Loom, padrão no Spring Boot 4) são adequadas para não bloquear carrier threads durante I/O de banco. Verificar que `@Transactional` é compatível com virtual threads na versão do Spring Boot em uso.
- [x] `GET /pdv/books/lookup` está no caminho crítico do PDV (chamado a cada escaneamento). Deve completar em baixa latência. Os índices `idx_book_isbn`, `idx_book_title`, `idx_book_author`, `idx_book_branch_active` (definidos em `001-00` e `000-01`) são pré-requisito.
- [x] GraalVM AOT: records Java são compatíveis. Entidades JPA (`Sale`, `SaleItem`, `SalePayment`) devem estar em `reflect-config.json` se AOT for habilitado.
- [x] Dados sensíveis: `customer.cpf_cnpj` trafega apenas via `GET /customers/search` (módulo 007). O PDV não expõe nem persiste CPF/CNPJ. `voucher.id` (código do voucher) não é dado pessoal sensível. Não logar valores monetários de venda em nível `INFO` ou superior em produção.
- [x] Autorização por perfil coberta: `Catalogador` não tem acesso a nenhum endpoint deste módulo. `Caixa` tem acesso a `GET /pdv/books/lookup`, `POST /sales` e `PATCH /sales/{id}/receipt`. `Gerente` e `Administrador` têm acesso completo.
- [x] Isolamento por filial: `branch_id` do JWT é usado em todas as verificações. O servidor re-valida preços e disponibilidade — o cliente não pode forçar preços ou livros de outra filial.
- [x] Atomicidade da finalização: todos os passos do `POST /sales` dentro de uma única transação `@Transactional(isolation = SERIALIZABLE)` ou com locks pessimistas em `book_stock` para evitar race condition de estoque.

---

## Estratégia de testes

### Fluxo principal (happy path)

- Escanear ISBN de livro disponível sem desconto: verificar `200`, `available: true`, `effectivePrice = originalPrice`, `discountId: null`.
- Escanear ISBN de livro com desconto ativo `percentage`: verificar `effectivePrice` calculado corretamente; `discountId` preenchido.
- Escanear ISBN de livro com desconto ativo `fixed`: verificar `effectivePrice = max(0, originalPrice - value)`.
- Busca manual por título parcial: verificar resposta paginada com `available` correto.
- Finalizar venda com 1 item, sem cliente, sem voucher, 1 método de pagamento: verificar `201`, `sale` gravado com `status = 'completed'`, `sale_item` gravado, `sale_payment` gravado, `book_stock.quantity` decrementado em 1.
- Finalizar venda com 2 itens e 2 métodos de pagamento: verificar débito de estoque em ambos os livros.
- Finalizar venda vinculando cliente: verificar `sale.customer_id` preenchido.
- Finalizar venda com voucher que cobre parcialmente: verificar `voucherAmountUsed`, `total = subtotal - voucherAmountUsed`, `voucher_usage` criado, `voucher.remaining_balance` decrementado.
- Finalizar venda com voucher que cobre totalmente (saldo > total): verificar `voucherAmountUsed = total`, `total = 0`, `remaining_balance = voucher.remaining_balance anterior - total`, sem registro em `sale_payment`.
- Finalizar venda com voucher que zera o saldo: verificar `voucher.active = false`, `remaining_balance = 0`, `voucher_usage` criado.
- Marcar recibo impresso via `PATCH /sales/{id}/receipt`: verificar `receipt_printed = true`.

### Casos de erro esperados

- `GET /pdv/books/lookup` sem `isbn` e sem `q` → `400`.
- `GET /pdv/books/lookup?isbn=X` com ISBN de livro de outra filial → `404`.
- `GET /pdv/books/lookup?isbn=X` com ISBN de livro sem estoque → `200` com `available: false`.
- `POST /sales` com `items` vazio → `400`.
- `POST /sales` com `items[].bookId` duplicado → `400`.
- `POST /sales` com `items[].originalPrice` divergente do `book.sale_price` atual → `400`.
- `POST /sales` com `items[].effectivePrice` incoerente com `discountId` → `400`.
- `POST /sales` com livro sem estoque disponível → `409`.
- `POST /sales` com `payments[].amount <= 0` → `400`.
- `POST /sales` com soma de pagamentos menor que o total → `409`.
- `POST /sales` com `voucherId` válido mas sem `customerId` → `400`.
- `POST /sales` com `voucherId` pertencente a outro cliente → `409`.
- `POST /sales` com `voucherId` inativo ou saldo zero → `409`.
- `POST /sales` com `paymentMethodId` inativo → `404`.
- `PATCH /sales/{id}/receipt` de venda de outra filial → `403`.
- `PATCH /sales/{id}/receipt` com `saleId` inexistente → `404`.

### Casos de autorização

- `Catalogador` acessando `GET /pdv/books/lookup` → `403`.
- `Catalogador` acessando `POST /sales` → `403`.
- `Caixa` acessando `GET /pdv/books/lookup` → `200`.
- `Caixa` acessando `POST /sales` → `201` (fluxo normal).
- Usuário não autenticado em qualquer endpoint → `401`.
- JWT expirado em qualquer endpoint → `401`.
- `Administrador` sem `branchId` no JWT e sem query param → `403`/`400` dependendo do endpoint.

### Casos de borda das regras de negócio

- Finalização com dois livros do mesmo `book_id` no array `items`: deve retornar `400` (duplicação proibida).
- Race condition de estoque: dois caixas finalizando venda do mesmo livro simultaneamente. O lock pessimista em `book_stock` deve garantir que apenas um suceda; o segundo recebe `409`.
- Voucher com `remaining_balance = 0.01` e venda com total `= 0.01`: finalização deve zerar o saldo, marcar `active = false` e gravar `voucherAmountUsed = 0.01`.
- Venda com total `= 0.00` após voucher: array `payments` pode ser vazio; verificar que nenhuma linha em `sale_payment` é criada.
- Desconto expirado entre a abertura do carrinho e a finalização: a re-validação do servidor deve detectar que `discount.active = false` ou vigência expirada e retornar `404` no `discountId` — o `effectivePrice` informado não corresponderá ao recálculo do servidor.

---

## Riscos técnicos e dependências

1. **Divergência entre `001-initial-schema` e o modelo de negócio.** O schema atual (`sale`, `sale_item`) não possui as colunas necessárias (`subtotal`, `total`, `voucher_id`, `voucher_amount_used`, `status`, `completed_at`, `original_price`, `discount_id`, `effective_price`). O changeSet `006-pdv-schema-alignment` deve ser executado antes de qualquer implementação do módulo PDV. **Risco alto**: se as sub-features forem implementadas contra o schema atual, haverá incompatibilidade.

2. **Atomicidade e locks de estoque.** O débito de `book_stock.quantity` para múltiplos livros em uma única transação deve usar `SELECT ... FOR UPDATE` na linha do estoque para evitar overselling em cenários de alta concorrência (dois caixas vendendo o último exemplar simultaneamente). A escolha entre `SERIALIZABLE` e locks explícitos deve ser feita durante a implementação — `SERIALIZABLE` tem overhead de performance; locks explícitos têm overhead de deadlock para múltiplos livros (recomendar ordem consistente de lock por `book_id` para evitar deadlock).

3. **Re-validação de preços no servidor.** O servidor re-calcula o `effectivePrice` de cada item para prevenir manipulação de preço. Isso implica que a lógica de cálculo de desconto definida em `003-00` deve estar disponível como método de serviço reutilizável (não apenas como endpoint HTTP). Se a lógica de cálculo estiver encapsulada apenas no controller de descontos, será necessário extrair para um serviço compartilhado.

4. **Integração com `voucher_usage`: chamada interna vs. endpoint HTTP.** O resgate de voucher na transação de finalização deve ser feito por chamada interna de serviço (não por `POST /vouchers/{id}/redeem` via HTTP), pois precisa participar da mesma transação. O módulo 005 deve expor um método de serviço `VoucherService.redeem(voucherId, saleId, amountUsed)` para consumo interno. **Risco**: se o módulo 005 for implementado sem expor esse método, haverá dependência de refatoração.

5. **Dependências de endpoints de outros módulos.** O frontend do PDV consome cinco endpoints de outros módulos antes de chegar ao `POST /sales`:
   - `GET /pdv/books/lookup` (este módulo)
   - `GET /discounts/active` (003-00) — já especificado
   - `GET /customers/search` (007-00) — já especificado
   - `GET /vouchers/lookup` (005-00) — já especificado
   - `GET /payment-methods` (008-00) — já especificado
   
   Todos esses contratos já têm tech.md. O PDV pode ser implementado sem bloqueio desde que os módulos dependentes estejam disponíveis em ambiente de desenvolvimento.

6. **`Administrador` sem `branchId` no JWT.** O Administrador opera no "contexto da filial selecionada" conforme o business.md. O mecanismo de seleção de filial para o Administrador (via query param, via state de sessão no frontend, ou outro) deve ser consistente com os demais módulos. Seguindo a convenção estabelecida nos módulos 003, 005, 007 e 008: o `branch_id` do Administrador deve ser informado via query param `branchId` nos endpoints que necessitam de escopo de filial.

7. **Impressão de recibo.** A feature `004-04.finalizar-venda` menciona envio do recibo para "impressora configurada". O tech.md não especifica integração com impressora pois não há infraestrutura de impressão definida no stack atual (sem servidor de impressão, sem CUPS, sem protocolo ESC/POS). O endpoint `PATCH /sales/{id}/receipt` apenas registra a decisão de impressão. A lógica de disparo para a impressora é responsabilidade da implementação frontend (comunicação direta com impressora local via browser ou driver) e está fora do escopo do backend.
