# Finalizar Venda no PDV — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Esta feature é o ponto de escrita central do módulo PDV. Ela define o único endpoint que persiste uma venda completa no banco de dados (`POST /sales`) e um endpoint auxiliar de leitura para exibição do recibo (`GET /sales/{id}/receipt`).

Todo o estado da venda (carrinho, cliente, voucher, pagamentos) vive exclusivamente no frontend até este ponto. Ao acionar a finalização, o backend recebe o estado completo e executa uma única transação atômica que: verifica estoque, grava os registros nas tabelas `sale`, `sale_item`, `sale_payment`, decrementa `book_stock.quantity`, atualiza `voucher.remaining_balance` e insere `voucher_usage` (quando aplicável).

Camadas afetadas:
- Persistência: tabelas `sale`, `sale_item`, `sale_payment` (definidas em `004-00.pdv`), `book_stock` (definida em `001-00.catalogo-livros`), `voucher` e `voucher_usage` (definidas em `005-00.vouchers`).
- Serviço de domínio: orquestração transacional, verificação de estoque, cálculo de `voucher_amount_used`, `subtotal` e `total`.
- Frontend React: tela `/pdv` — não introduz nova rota.

Domínios externos lidos ou escritos por esta feature:

| Domínio | Tabela | Direção |
|---------|--------|---------|
| Catálogo (`001-00`) | `book`, `book_stock` | leitura (verificação de estoque e preço) + escrita (decremento de `quantity`) |
| Vouchers (`005-00`) | `voucher`, `voucher_usage` | leitura (validação de saldo) + escrita (decremento de `remaining_balance`, inserção de uso) |
| Clientes (`007-00`) | `customer` | leitura — validação de existência quando `customerId` informado |
| Métodos de pagamento (`008-00`) | `payment_method` | leitura — validação de existência e atividade dos métodos informados |
| Filiais (`000-01`) | `branch` | leitura — escopo de filial extraído do JWT |
| Usuários / Auth (`000-02`) | `user` | leitura — `cashier_id` extraído do JWT |

---

## Modelo de dados

### Novas tabelas / alterações de schema

Esta feature **não cria novas tabelas**. Todas as tabelas utilizadas foram definidas nos módulos raiz correspondentes e já existem no changeSet `001-initial-schema`.

#### `sale` — referência (definida em `004-00.pdv`)

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `customer_id` | `UUID` | NULL | — | FK → `customer(id)` |
| `voucher_id` | `UUID` | NULL | — | FK → `voucher(id)` |
| `voucher_amount_used` | `NUMERIC(10,2)` | NOT NULL | `0` | valor efetivamente descontado; `0` quando sem voucher |
| `subtotal` | `NUMERIC(10,2)` | NOT NULL | — | soma dos `effective_price` de todos os `sale_item` |
| `total` | `NUMERIC(10,2)` | NOT NULL | — | `subtotal - voucher_amount_used` |
| `status` | `TEXT` | NOT NULL | — | `'completed'` ao ser criado por este endpoint |
| `cashier_id` | `UUID` | NOT NULL | — | FK → `user(id)`; `sub` do JWT |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | — |
| `completed_at` | `TIMESTAMP` | NOT NULL | — | `now()` no momento da inserção (status já é `completed`) |

> `sale.status` é gravado diretamente como `'completed'` neste endpoint. O valor `'pending'` não é utilizado na arquitetura atual — o carrinho vive no frontend, não no banco.

#### `sale_item` — referência (definida em `004-00.pdv`)

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `sale_id` | `UUID` | NOT NULL | — | FK → `sale(id)` ON DELETE CASCADE |
| `book_id` | `UUID` | NOT NULL | — | FK → `book(id)` |
| `original_price` | `NUMERIC(10,2)` | NOT NULL | — | `book.sale_price` no momento da adição ao carrinho (enviado pelo frontend) |
| `discount_id` | `UUID` | NULL | — | FK → `discount(id)`; nullable |
| `effective_price` | `NUMERIC(10,2)` | NOT NULL | — | preço após desconto; igual a `original_price` quando sem desconto |

> Os preços gravados em `sale_item` são os capturados pelo frontend no momento da adição ao carrinho (regra de negócio 5 do `business.md`). O backend não recalcula nem consulta `book.sale_price` ou `discount` para determinar os preços dos itens — esses valores chegam no body da request e são persistidos como recebidos, após validação de consistência mínima (ver seção de edge cases do endpoint).

#### `sale_payment` — referência (definida em `004-00.pdv`)

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `sale_id` | `UUID` | NOT NULL | — | FK → `sale(id)` ON DELETE CASCADE |
| `payment_method_id` | `UUID` | NOT NULL | — | FK → `payment_method(id)` |
| `amount` | `NUMERIC(10,2)` | NOT NULL | — | deve ser > 0 |

#### `book_stock` — escrita (definida em `001-00.catalogo-livros`)

A coluna `book_stock.quantity` é decrementada em 1 para cada item do pedido. A verificação de estoque (`quantity > 0`) ocorre **antes** do decremento, dentro da mesma transação.

#### `voucher` e `voucher_usage` — escrita (definidas em `005-00.vouchers`)

`voucher.remaining_balance` é decrementado pelo `voucher_amount_used`. Se `remaining_balance` resultar em `0` após o decremento, `voucher.active` é atualizado para `false` na mesma instrução UPDATE. `voucher_usage` recebe um INSERT com `voucher_id`, `sale_id` e `amount_used`.

### Índices necessários

Esta feature não introduz índices novos. Os índices relevantes para as queries executadas já foram definidos nos módulos de origem:

- `book_stock`: `idx_book_stock_book` em `001-00.catalogo-livros` — cobre a verificação de estoque por `(book_id, branch_id)`.
- `voucher`: `idx_voucher_branch_active` em `005-00.vouchers` — cobre a validação do voucher por `(branch_id, active)`.
- `sale`: índice `idx_sale_branch` deve ser adicionado em um changeSet dedicado (`006-pdv-indexes`):

```sql
-- Lookup de vendas por filial (recibo, relatórios)
CREATE INDEX idx_sale_branch
    ON sale(branch_id, completed_at DESC);

-- Lookup de itens por venda (montagem do recibo)
CREATE INDEX idx_sale_item_sale
    ON sale_item(sale_id);

-- Lookup de pagamentos por venda (montagem do recibo)
CREATE INDEX idx_sale_payment_sale
    ON sale_payment(sale_id);
```

> O changeSet `006-pdv-indexes` não conflita com os changeSets anteriores (`002-voucher-indexes`, `003-book-catalog-indexes`, etc.) desde que o número de sequência seja correto. Verificar o número do próximo changeSet disponível no projeto antes de criar.

### Estratégia de migração

Nenhuma tabela nova é criada. Os três índices acima são adicionados em changeSet novo. Rollback seguro: apenas `DROP INDEX`. Dados existentes não requerem migração.

---

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade → `401`. O `branch_id` é sempre extraído do claim `branchId` do JWT. O `cashier_id` é o claim `sub` do JWT.

---

### `POST /sales`

Persiste uma venda completa de forma atômica. Este é o único endpoint de escrita desta feature e o mais crítico do sistema — toda a operação ocorre dentro de uma única `@Transactional`.

- **Authorization:** perfis `Caixa`, `Gerente`, `Administrador`

- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `items` | `array` | sim | não vazio; cada item tem `bookId` (UUID) e `quantity` (integer = 1, pois cada livro é unitário); IDs únicos — sem repetição de `bookId` |
  | `items[].bookId` | `UUID` | sim | deve referenciar um `book` ativo na mesma filial |
  | `items[].quantity` | `integer` | sim | deve ser `1` (regra de negócio: cada livro é unitário no PDV) |
  | `items[].originalPrice` | `NUMERIC` | sim | > 0; capturado pelo frontend no momento da adição ao carrinho |
  | `items[].discountId` | `UUID` | não | quando informado, deve referenciar um `discount` existente na filial; nullable |
  | `items[].effectivePrice` | `NUMERIC` | sim | > 0; deve ser ≤ `originalPrice` |
  | `customerId` | `UUID` | não | quando informado, deve referenciar um `customer` da mesma filial |
  | `voucherId` | `UUID` | não | quando informado, requer `customerId`; deve referenciar um `voucher` ativo (`active = true AND remaining_balance > 0`) da mesma filial e vinculado ao `customerId` informado |
  | `payments` | `array` | condicional | obrigatório e não vazio quando `total > 0`; pode ser vazio ou ausente quando `total = 0` (voucher cobriu tudo) |
  | `payments[].paymentMethodId` | `UUID` | sim | deve referenciar um `payment_method` com `active = true` na mesma filial |
  | `payments[].amount` | `NUMERIC` | sim | > 0; máx. 2 casas decimais |

  > O frontend calcula e envia `subtotal` e `total` de forma implícita via os preços dos itens e o voucher. O backend **recalcula** `subtotal` (soma de `effectivePrice` dos itens), `voucher_amount_used` (menor entre `voucherId.remaining_balance` e `subtotal`) e `total` (`subtotal - voucher_amount_used`) para garantir consistência — nunca confia nesses valores se enviados pelo cliente.

- **Response `201`:**

  ```json
  {
    "id": "uuid-da-venda",
    "branchId": "uuid-da-filial",
    "cashierId": "uuid-do-caixa",
    "customerId": "uuid-do-cliente-ou-null",
    "voucherId": "uuid-do-voucher-ou-null",
    "voucherAmountUsed": 0.00,
    "subtotal": 0.00,
    "total": 0.00,
    "status": "completed",
    "completedAt": "ISO-8601",
    "items": [
      {
        "id": "uuid-do-item",
        "bookId": "uuid-do-livro",
        "originalPrice": 0.00,
        "discountId": "uuid-ou-null",
        "effectivePrice": 0.00
      }
    ],
    "payments": [
      {
        "id": "uuid-do-pagamento",
        "paymentMethodId": "uuid-do-metodo",
        "amount": 0.00
      }
    ]
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 201 | Venda finalizada com sucesso; todos os registros persistidos |
  | 400 | `items` vazio; `quantity != 1`; `effectivePrice > originalPrice`; `amount <= 0`; `payments` ausente quando `total > 0`; algum `payments[].amount <= 0`; `voucherId` informado sem `customerId` |
  | 401 | Cookie ausente ou JWT inválido/expirado |
  | 403 | Perfil `Catalogador` |
  | 404 | `bookId` não encontrado ou não pertence à filial; `customerId` não encontrado ou não pertence à filial; `voucherId` não encontrado ou não pertence à filial; `paymentMethodId` não encontrado ou não pertence à filial |
  | 409 | Estoque insuficiente para um ou mais livros; voucher inativo ou saldo zerado; voucher não pertence ao `customerId` informado; soma de `payments[].amount` menor que `total`; `payment_method` inativo |
  | 500 | Erro inesperado; rollback automático da transação |

- **Sequência transacional obrigatória (dentro de `@Transactional`):**

  A ordem abaixo é obrigatória. Qualquer falha em qualquer etapa deve fazer rollback completo — nenhum efeito parcial é aceito.

  1. **Verificação de estoque (leitura com lock):** para cada `bookId` em `items`, executar `SELECT quantity FROM book_stock WHERE book_id = ? AND branch_id = ? FOR UPDATE`. Se `quantity < 1` para qualquer livro, abortar a transação inteira e retornar `409` com a lista de livros sem estoque.

     > O `FOR UPDATE` evita condição de corrida entre duas vendas simultâneas que compartilham o mesmo livro. Sem o lock, duas transações podem ler `quantity = 1`, ambas passar a verificação e ambas decrementar, resultando em `quantity = -1`.

  2. **INSERT em `sale`:** criar o registro de cabeçalho com `status = 'completed'`, `completed_at = now()`, `subtotal`, `voucher_amount_used` e `total` calculados pelo backend (não pelos valores enviados pelo frontend).

  3. **INSERT em `sale_item`:** para cada item, inserir um registro referenciando o `sale.id` recém-criado, com `original_price`, `discount_id` e `effective_price` conforme o body da request.

  4. **INSERT em `sale_payment`:** para cada pagamento, inserir um registro referenciando o `sale.id`.

  5. **UPDATE em `book_stock`:** para cada livro, executar `UPDATE book_stock SET quantity = quantity - 1, updated_at = now() WHERE book_id = ? AND branch_id = ?`. O lock adquirido no passo 1 garante exclusividade.

  6. **UPDATE em `voucher` (apenas se `voucherId` presente):** executar `UPDATE voucher SET remaining_balance = remaining_balance - :amountUsed, active = CASE WHEN remaining_balance - :amountUsed = 0 THEN false ELSE active END, ... WHERE id = :voucherId AND branch_id = :branchId`. O `active = false` é definido **na mesma instrução** quando o saldo zera — nunca em instrução separada.

  7. **INSERT em `voucher_usage` (apenas se `voucherId` presente):** inserir registro com `voucher_id`, `sale_id`, `amount_used` e `used_at = now()`.

- **Edge cases:**

  - **Resposta `409` para estoque insuficiente:** o corpo do erro deve identificar quais livros faltam estoque, para que o frontend possa exibir mensagem específica:
    ```json
    {
      "code": "INSUFFICIENT_STOCK",
      "unavailableBooks": [
        { "bookId": "uuid", "title": "string" }
      ]
    }
    ```
  - **Cálculo de `voucher_amount_used`:** `MIN(voucher.remaining_balance, subtotal_calculado)`. Se o voucher cobre mais que o total, `voucher_amount_used = subtotal`; o saldo remanescente é `remaining_balance - subtotal`.
  - **Validação de `payments` vs `total`:** a soma de `payments[].amount` deve ser `>= total` calculado pelo backend. Se o cliente enviou `total = 0` (voucher cobriu tudo) e `payments` está vazio, isso é válido — não retornar erro.
  - **`customerId` sem `voucherId`:** válido. A venda pode ter cliente identificado sem voucher.
  - **`voucherId` sem `customerId`:** inválido. Retornar `400`.
  - **Livros de outras filiais:** o `SELECT FOR UPDATE` no passo 1 filtra por `branch_id` extraído do JWT. Se um `bookId` não tiver registro em `book_stock` para a filial, retornar `404`.
  - **`effectivePrice` enviado pelo frontend:** o backend confia no preço enviado (regra de negócio 5 do `business.md`), mas valida que `effectivePrice <= originalPrice` e `effectivePrice > 0`. Preços negativos ou maior que o original são rejeitados com `400`.
  - **`cashier_id`:** sempre extraído do claim `sub` do JWT. Não aceito no body.
  - **`branch_id`:** sempre extraído do claim `branchId` do JWT. Não aceito no body.
  - **Falha na etapa 5 em diante (após INSERT na `sale`):** a transação faz rollback completo. A `sale` inserida é revertida. O frontend preserva o carrinho para nova tentativa.

---

### `GET /sales/{id}/receipt`

Retorna os dados formatados de uma venda finalizada para exibição ou impressão de recibo. Endpoint opcional — a venda é finalizada independentemente deste.

- **Authorization:** perfis `Caixa`, `Gerente`, `Administrador`
- **Path parameter:** `id` — UUID da venda

- **Response `200`:**

  ```json
  {
    "id": "uuid-da-venda",
    "branchId": "uuid-da-filial",
    "branchName": "string",
    "cashierName": "string",
    "customerName": "string-ou-null",
    "completedAt": "ISO-8601",
    "items": [
      {
        "bookId": "uuid",
        "bookTitle": "string",
        "bookAuthor": "string",
        "originalPrice": 0.00,
        "effectivePrice": 0.00,
        "hasDiscount": true
      }
    ],
    "subtotal": 0.00,
    "voucherAmountUsed": 0.00,
    "total": 0.00,
    "payments": [
      {
        "paymentMethodName": "string",
        "amount": 0.00
      }
    ]
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Venda encontrada e pertence à filial do usuário |
  | 401 | Cookie ausente ou JWT inválido/expirado |
  | 403 | Venda pertence a outra filial; perfil `Catalogador` |
  | 404 | UUID não encontrado |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O backend verifica que `sale.branch_id` corresponde ao `branchId` do JWT antes de retornar. Caso contrário → `403` (não vazar existência de vendas de outras filiais).
  - Os campos `branchName`, `cashierName` e `customerName` são resolvidos via JOIN com `branch`, `user` e `customer` respectivamente. Se `customer_id` for `null`, `customerName` é `null`.
  - `paymentMethodName` é resolvido via JOIN com `payment_method`. Se o método foi desativado após a venda, o nome ainda deve ser retornado — o método desativado permanece na tabela.

---

## DTOs de domínio

DTOs definidos como Java records no pacote `com.ciet.demo_learn.pdv`:

```
SaleCreateRequest          — body de POST /sales
SaleItemRequest            — item dentro de SaleCreateRequest
SalePaymentRequest         — pagamento dentro de SaleCreateRequest
SaleResponse               — resposta de POST /sales (201)
SaleItemResponse           — item de sale_item na SaleResponse
SalePaymentResponse        — item de sale_payment na SaleResponse
SaleReceiptResponse        — resposta de GET /sales/{id}/receipt
SaleReceiptItemResponse    — item de livro no recibo
SaleReceiptPaymentResponse — item de pagamento no recibo
InsufficientStockError     — corpo do erro 409 com lista de livros sem estoque
UnavailableBookInfo        — item dentro de InsufficientStockError
```

---

## Requisitos de qualidade

- [x] I/O-bound identificado: `POST /sales` executa no mínimo 5 queries sequenciais dentro da transação (1 SELECT FOR UPDATE por item + INSERT sale + INSERT sale_items + INSERT sale_payments + UPDATE book_stock + UPDATE voucher + INSERT voucher_usage). É o endpoint de maior carga de I/O do sistema — candidato prioritário a virtual thread (Project Loom, habilitado por padrão no Java 25 com Spring Boot 4).
- [x] Lock pessimista obrigatório: o `SELECT ... FOR UPDATE` na verificação de estoque é mandatório para corretude em ambiente multi-caixa. Sem o lock, vendas simultâneas do mesmo livro podem resultar em estoque negativo.
- [x] GraalVM AOT: records Java são compatíveis. Entidades JPA com `@Entity` (`Sale`, `SaleItem`, `SalePayment`) devem estar registradas em `reflect-config.json` se AOT for habilitado.
- [x] Dados sensíveis: nenhuma coluna das tabelas `sale`, `sale_item` ou `sale_payment` contém CPF, CNPJ, senha ou token. O `customer_id` e `cashier_id` são UUIDs — não expor nomes completos no log de transação.
- [x] Autorização por perfil: `Catalogador` não tem acesso a nenhum endpoint deste módulo. `Caixa`, `Gerente` e `Administrador` têm acesso a ambos os endpoints.
- [x] Isolamento por filial: `branch_id` extraído exclusivamente do JWT em todas as verificações — livros, voucher, clientes e métodos de pagamento são validados contra a filial do token.
- [x] A transação não deve usar `@Transactional(readOnly = true)` — ela é de escrita em múltiplas tabelas. O nível de isolamento padrão do PostgreSQL (`READ COMMITTED`) é suficiente para o lock pessimista funcionar corretamente com `FOR UPDATE`.

---

## Estratégia de testes

**Fluxo principal (happy path)**
- Venda com 1 item, sem cliente, sem voucher, 1 método de pagamento cobrindo o total: verificar `201`, `sale` com `status = 'completed'`, 1 `sale_item`, 1 `sale_payment`, `book_stock.quantity` decrementado em 1.
- Venda com 3 itens, sem voucher, 2 métodos de pagamento: verificar 3 `sale_item`, 2 `sale_payment`, 3 decrementos de estoque.
- Venda com cliente identificado, sem voucher: verificar `sale.customer_id` preenchido.
- Venda com voucher que cobre parcialmente o total: verificar `sale.voucher_amount_used = voucher.remaining_balance` anterior; `voucher.remaining_balance` decrementado; `voucher.active` permanece `true`; 1 `voucher_usage` inserido.
- Venda com voucher que cobre exatamente o total: verificar `voucher_amount_used = total`; `voucher.remaining_balance = 0`; `voucher.active = false`; `payments` pode ser vazio ou ausente.
- Venda com voucher que cobre mais que o total (saldo > subtotal): verificar `voucher_amount_used = subtotal`; `total = 0`; `voucher.remaining_balance = saldo_anterior - subtotal`.
- Recibo `GET /sales/{id}/receipt`: verificar todos os campos preenchidos, inclusive `branchName`, `cashierName`, `customerName`.

**Casos de erro esperados**
- `POST /sales` com `items` vazio → `400`.
- `POST /sales` com `bookId` de livro de outra filial → `404`.
- `POST /sales` com `bookId` sem estoque disponível (`quantity = 0`) → `409` com `INSUFFICIENT_STOCK` e lista de livros afetados.
- `POST /sales` com dois livros, sendo um sem estoque: verificar que a resposta `409` lista apenas o livro sem estoque, e que nenhum dado foi persistido (rollback completo).
- `POST /sales` com `voucherId` sem `customerId` → `400`.
- `POST /sales` com `voucherId` pertencente a outro cliente → `409`.
- `POST /sales` com `voucherId` com `active = false` → `409`.
- `POST /sales` com `voucherId` com `remaining_balance = 0` → `409`.
- `POST /sales` com `payments` cuja soma é menor que o `total` calculado → `409`.
- `POST /sales` com `paymentMethodId` com `active = false` → `409`.
- `POST /sales` com `effectivePrice > originalPrice` em algum item → `400`.
- `GET /sales/{id}/receipt` com UUID de venda de outra filial → `403`.
- `GET /sales/{id}/receipt` com UUID inexistente → `404`.

**Casos de autorização**
- `Catalogador` chamando `POST /sales` → `403`.
- `Catalogador` chamando `GET /sales/{id}/receipt` → `403`.
- `Caixa` chamando `POST /sales` com dados válidos → `201`.
- `Caixa` chamando `GET /sales/{id}/receipt` para venda da própria filial → `200`.
- `Caixa` chamando `GET /sales/{id}/receipt` para venda de outra filial → `403`.
- Requisição sem cookie `auth_token` → `401` em ambos os endpoints.
- JWT expirado → `401`.

**Edge cases de regras de negócio**
- Dois caixas finalizando vendas simultâneas do mesmo livro com `quantity = 1`: apenas uma deve ter sucesso; a outra deve receber `409` por estoque insuficiente (valida o `SELECT FOR UPDATE`).
- Venda com total `= 0` e `payments` ausente: verificar que `201` é retornado sem erro de validação de pagamentos.
- Venda com total `= 0` e `payments` com um item válido: verificar que `201` é retornado (pagamento extra é aceito — soma `>= total` é satisfeita).
- Atomicidade: simular falha no UPDATE de `book_stock` (ex.: timeout forçado) após INSERTs; verificar que `sale`, `sale_item` e `sale_payment` são revertidos e não persistidos.
- Atomicidade: simular falha no INSERT de `voucher_usage` após UPDATE de `voucher`; verificar rollback completo — `voucher.remaining_balance` não é alterado.
- Recibo de venda cujo método de pagamento foi desativado após a venda: verificar que `paymentMethodName` ainda é retornado corretamente.

---

## Riscos técnicos e dependências

1. **Lock pessimista em ambiente de alto volume.** O `SELECT ... FOR UPDATE` em `book_stock` para cada item do pedido serializa transações concorrentes que compartilham livros. Para o perfil de uso de livraria de pequeno e médio porte, isso é aceitável. Em caso de filas longas de caixas ou pedidos com muitos itens, pode haver contenção. Mitigação: manter transações curtas (sem I/O externo dentro da `@Transactional`) e monitorar locks em produção.

2. **Confiança nos preços enviados pelo frontend.** O backend persiste `original_price` e `effective_price` conforme enviados pelo cliente (regra de negócio 5). Não há revalidação contra `book.sale_price` ou `discount` no momento da finalização. Isso significa que um cliente malicioso poderia enviar preços manipulados. Para o escopo atual (acesso restrito a Caixa/Gerente/Administrador em rede interna), o risco é baixo. Se o produto evoluir para vendas online ou APIs públicas, esta confiança deve ser reavaliada.

3. **Ausência de `sale` em estado `pending` no banco.** O PDV gerencia o carrinho inteiramente no frontend. Isso simplifica a transação de finalização, mas impede a recuperação do carrinho em caso de queda do browser. Esta é uma decisão de produto documentada em `004-00.pdv` (regra de negócio 2). Nenhum risco técnico adicional identificado aqui.

4. **Dependências de implementação dos módulos raiz.** As tabelas `sale`, `sale_item`, `sale_payment` não têm tech.md próprio de schema — estão definidas no `004-00.pdv/business.md` (modelo de dados) e referenciadas aqui. O agente que implementar esta feature deve garantir que a migration do schema PDV (parte do `001-initial-schema`) já foi executada antes de criar os índices do `006-pdv-indexes`.

5. **`GET /sales/{id}/receipt` como JOIN de múltiplas tabelas.** O recibo agrega `sale` + `sale_item` + `book` + `sale_payment` + `payment_method` + `branch` + `user` + `customer`. São até 7 tabelas num único SELECT. Para o volume esperado (1 venda por vez), sem risco de performance. Usar LEFT JOINs para `customer` (nullable) e garantir que os índices `idx_sale_item_sale` e `idx_sale_payment_sale` estejam criados antes de ativar em produção.

6. **Voucher já pode ter sido resgatado via `POST /vouchers/{id}/redeem` (005-00).** O tech.md de `005-00.vouchers` documenta um endpoint independente de resgate de voucher (`POST /vouchers/{id}/redeem`). Na arquitetura atual, o resgate do voucher é realizado **dentro** da transação de finalização da venda (`POST /sales`), não via esse endpoint separado. Os dois caminhos não devem ser usados simultaneamente para a mesma venda — o PDV deve usar exclusivamente `POST /sales`. O endpoint `POST /vouchers/{id}/redeem` é para uso de backoffice ou fluxos futuros. Esta separação deve ser comunicada ao agente de `005-00` para evitar duplicação de lógica.
