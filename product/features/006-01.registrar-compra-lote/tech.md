# Registrar Compra de Lote — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Implementa o registro de um novo lote de compra de livros usados (`used_book_purchase`) via endpoint `POST /purchases`. O lote é criado com status derivado (calculado, não armazenado) como "aberto" e associado à filial do usuário autenticado. Opcionalmente, na mesma operação de negócio, o Gerente pode solicitar a emissão de um voucher de crédito para o vendedor — nesse caso, o backend chama internamente a lógica de `POST /vouchers` (especificada em `005-00.vouchers/tech.md`), vinculando o voucher ao `customer_id` informado.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Escrita em `used_book_purchase`; leitura em `customer`, `branch`; escrita em `voucher` (quando voucher solicitado) |
| Serviço | Criação do lote; validação de campos; orquestração da emissão de voucher (transação única ou sequencial — ver seção de riscos) |
| Frontend | Tela `/purchases/new` (formulário de registro); rota `/purchases` (listagem de entrada do módulo) |

Domínios externos lidos ou escritos:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Filiais (`000-01`) | `branch` | leitura — escopo do lote |
| Usuários / Auth (`000-02`) | JWT claims (`branchId`, `sub`) | leitura — identificação do Gerente e filial |
| Clientes (`007-xx`) | `customer` | leitura — validação de `customer_id` quando voucher é solicitado |
| Vouchers (`005-00`) | `voucher` | escrita — emissão do voucher ao vendedor (condicional) |

---

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria novas tabelas nem altera o schema existente**. A tabela `used_book_purchase` já foi criada pelo changeSet `001-initial-schema` de `000-01.modelagem-dados`.

#### Tabela `used_book_purchase` — referência

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `branch_id` | `UUID` | NOT NULL | — | FK → `branch(id)` |
| `total_price` | `NUMERIC(10,2)` | NOT NULL | — | deve ser > 0 |
| `payment_method` | `TEXT` | NOT NULL | — | valores aceitos: `'cash'` ou `'pix'` |
| `seller_name` | `TEXT` | NULL | — | obrigatório na camada de serviço (coluna permite NULL no DDL, regra aplicada no backend) |
| `purchased_by` | `UUID` | NOT NULL | — | FK → `user(id)`; extraído do JWT (`sub`) |
| `purchased_at` | `TIMESTAMP` | NOT NULL | `now()` | data da compra; pode ser informada manualmente pelo Gerente |
| `notes` | `TEXT` | NULL | — | observações opcionais |

> A coluna `estimated_quantity` **não existe** na tabela `used_book_purchase` — conforme definido em `006-00.compra-usados/business.md`. O campo é transitório: recebido no request body, não persistido na tabela, mas utilizado para criar os itens vazios em `used_book_purchase_item` (ver seção de contratos de API).

> O status "aberto" ou "concluído" do lote é sempre **derivado**: "aberto" quando há `used_book_purchase_item` sem `book_id`; "concluído" quando todos têm `book_id`. Nenhuma coluna de status existe no banco.

#### Tabela `used_book_purchase_item` — criação de itens vazios

Quando `estimatedQuantity` é informado no request body, o serviço deve inserir exatamente `estimatedQuantity` registros em `used_book_purchase_item` com `book_id = NULL`, vinculados ao `purchase_id` recém-criado. Esses registros representam os slots a serem preenchidos pelo fluxo de `006-02.gerenciar-livros-lote`.

> Razão: a criação antecipada dos itens vazios permite que `006-02` exiba o progresso desde o primeiro acesso ao lote, sem depender de inserção posterior. Sem esses registros, o contador "X de Y livros cadastrados" seria inoperante imediatamente após o registro.

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `purchase_id` | `UUID` | NOT NULL | — | FK → `used_book_purchase(id) ON DELETE CASCADE` |
| `book_id` | `UUID` | NULL | — | FK → `book(id)`; nulo quando item ainda não cadastrado |

> Atenção: o DDL de `000-01.modelagem-dados` declara `book_id` como `NOT NULL` em `used_book_purchase_item`. Para suportar itens vazios, é necessária uma migration que torne essa coluna nullable. Ver seção de estratégia de migração.

### Estratégia de migração

Uma migration dedicada deve tornar a coluna `book_id` de `used_book_purchase_item` nullable, pois o modelo original não previa slots vazios.

```sql
-- changeSet: 003-used-book-purchase-item-book-id-nullable
ALTER TABLE used_book_purchase_item
    ALTER COLUMN book_id DROP NOT NULL;
```

Rollback seguro: a reversão requer garantir que não existam linhas com `book_id = NULL` antes de restaurar o `NOT NULL`.

```sql
-- rollback
ALTER TABLE used_book_purchase_item
    ALTER COLUMN book_id SET NOT NULL;
```

> A migration de rollback falhará se existirem itens ainda não cadastrados. Isso é esperado e documentado: após a feature entrar em produção com dados reais, o rollback da migration não deve ser executado sem limpeza prévia dos dados.

#### Índices complementares

Os índices abaixo devem ser adicionados no mesmo changeSet `003-used-book-purchase-item-book-id-nullable` ou em um changeSet `004-purchase-indexes`:

```sql
-- Listagem de lotes por filial (GET /purchases filtrando por branch_id)
CREATE INDEX idx_purchase_branch
    ON used_book_purchase(branch_id, purchased_at DESC);

-- Busca de itens por lote (GET /purchases/:id/books em 006-02)
CREATE INDEX idx_purchase_item_purchase
    ON used_book_purchase_item(purchase_id);

-- Busca de itens não cadastrados por lote (cálculo de status e progresso)
CREATE INDEX idx_purchase_item_book_null
    ON used_book_purchase_item(purchase_id)
    WHERE book_id IS NULL;
```

---

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `branch_id` de escopo é extraído do claim `branchId` do JWT. O `purchased_by` é sempre o claim `sub` (UUID do usuário autenticado). O Administrador não possui `branchId` no JWT — ver edge cases.

---

### `POST /purchases`

Cria um novo lote de compra de livros usados, opcionalmente emitindo um voucher para o vendedor na mesma operação.

- **Authorization:** perfis `Gerente`, `Administrador`

- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `sellerName` | `String` | sim | não vazio; máximo 255 caracteres |
  | `totalPrice` | `Number` (decimal) | sim | deve ser > 0; precisão máxima de 2 casas decimais |
  | `paymentMethod` | `String` | sim | valores aceitos: `"cash"` ou `"pix"` |
  | `purchasedAt` | `String` (ISO 8601) | sim | data e hora da compra; não pode ser futura em mais de 24h |
  | `estimatedQuantity` | `Integer` | não | se informado, deve ser ≥ 1; máximo 9999; determina quantos itens vazios serão criados em `used_book_purchase_item` |
  | `notes` | `String` | não | máximo 2000 caracteres |
  | `issueVoucher` | `Boolean` | não | padrão `false`; se `true`, os campos `voucherCustomerId` e `voucherValue` passam a ser obrigatórios |
  | `voucherCustomerId` | `UUID` | condicional | obrigatório quando `issueVoucher = true`; deve referenciar `customer` ativo na mesma filial |
  | `voucherValue` | `Number` (decimal) | condicional | obrigatório quando `issueVoucher = true`; deve ser > 0; precisão máxima de 2 casas decimais |

- **Response `201`:**

  ```json
  {
    "id": "uuid-do-lote",
    "branchId": "uuid-da-filial",
    "sellerName": "João Silva",
    "totalPrice": 150.00,
    "paymentMethod": "cash",
    "purchasedAt": "2026-05-08T10:00:00Z",
    "estimatedQuantity": 10,
    "notes": "Lote em bom estado geral",
    "purchasedBy": "uuid-do-gerente",
    "status": "open",
    "itemsCount": 10,
    "itemsCataloged": 0,
    "voucher": {
      "id": "uuid-do-voucher",
      "customerId": "uuid-do-cliente",
      "customerName": "Maria Silva",
      "initialValue": 80.00,
      "issuedAt": "2026-05-08T10:00:00Z"
    }
  }
  ```

  > O campo `voucher` é `null` quando `issueVoucher = false` ou quando não foi informado. O campo `status` é sempre `"open"` na resposta de criação. `itemsCount` reflete o `estimatedQuantity` informado (ou `0` se omitido). `itemsCataloged` é sempre `0` na criação.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 201 | Lote criado com sucesso (e voucher emitido, quando solicitado) |
  | 400 | Campo obrigatório ausente, `totalPrice` ≤ 0, `paymentMethod` inválido, `purchasedAt` futura além de 24h, `estimatedQuantity` ≤ 0, `issueVoucher = true` sem `voucherCustomerId` ou `voucherValue`, `voucherValue` ≤ 0 |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`) |
  | 404 | `voucherCustomerId` não encontrado ou não pertence à filial do usuário autenticado |
  | 409 | Conflito de estado não aplicável a este endpoint |
  | 500 | Erro inesperado |

- **Edge cases:**

  - O `branch_id` do lote é sempre extraído do JWT (`branchId`). O corpo da requisição não aceita `branchId`.
  - Para o perfil Administrador, o claim `branchId` no JWT é `null`. O Administrador deve informar `branchId` como query param: `POST /purchases?branchId=:uuid`. Ausência deste parâmetro quando o perfil é Administrador → `400` com mensagem "filial obrigatória para Administrador".
  - Quando `issueVoucher = true`, a validação de `voucherCustomerId` deve verificar que o cliente existe e está ativo na mesma filial resolvida acima. Se o cliente não for encontrado ou pertencer a outra filial → `404`.
  - A criação do lote e a emissão do voucher devem ocorrer em **transação única**: se a emissão do voucher falhar, o lote não deve ser persistido. Ver seção de riscos para discussão sobre estratégia transacional.
  - Quando `estimatedQuantity` é informado, os `N` registros em `used_book_purchase_item` (com `book_id = NULL`) são criados **dentro da mesma transação** da criação do lote.
  - O campo `purchasedAt` aceita datas no passado (para registros retroativos). Datas futuras além de 24h são rejeitadas com `400`.
  - A validação `issueVoucher = true` com `voucherCustomerId` inválido deve ocorrer **antes** de qualquer inserção no banco, para evitar lotes órfãos em caso de rollback.

---

### `GET /purchases`

Lista os lotes de compra da filial do usuário autenticado.

> Este endpoint é o ponto de entrada do módulo "Compra de Usados". Serve a tela `/purchases` definida em `006-01.registrar-compra-lote/business.md`.

- **Authorization:** perfis `Gerente`, `Administrador`

- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras |
  |-----------|------|-------------|--------|
  | `status` | `String` | não | valores aceitos: `open` ou `closed`; se omitido, retorna todos |
  | `page` | `Integer` | não | padrão `0`; base 0 |
  | `size` | `Integer` | não | padrão `20`; máximo `100` |

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "branchId": "uuid",
        "sellerName": "João Silva",
        "totalPrice": 150.00,
        "paymentMethod": "cash",
        "purchasedAt": "2026-05-08T10:00:00Z",
        "purchasedBy": "uuid-do-gerente",
        "status": "open",
        "itemsCount": 10,
        "itemsCataloged": 3
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 5,
    "totalPages": 1
  }
  ```

  > `status`, `itemsCount` e `itemsCataloged` são calculados via query: `itemsCount` = total de registros em `used_book_purchase_item` para o lote; `itemsCataloged` = total com `book_id IS NOT NULL`; `status = "open"` quando `itemsCount > itemsCataloged`, `status = "closed"` quando `itemsCount > 0 AND itemsCount = itemsCataloged`. Lotes sem nenhum item (`itemsCount = 0`) têm `status = "open"` por convenção.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Listagem retornada com sucesso (pode ser vazia) |
  | 400 | Parâmetro `status` com valor inválido |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão |
  | 500 | Erro inesperado |

- **Edge cases:**
  - A filial é sempre extraída do JWT — o endpoint não aceita `branchId` como parâmetro de query, exceto para Administrador (mesmo padrão de `POST /purchases`).
  - Ordenação padrão: `purchased_at DESC`.
  - O cálculo de `itemsCount` e `itemsCataloged` deve ser feito com agregação em SQL (não em memória) para evitar problemas de performance com lotes grandes.

---

### `GET /purchases/{id}`

Retorna os dados completos de um lote de compra.

- **Authorization:** perfis `Gerente`, `Administrador`
- **Path parameter:** `id` — UUID do lote

- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "branchId": "uuid",
    "sellerName": "João Silva",
    "totalPrice": 150.00,
    "paymentMethod": "cash",
    "purchasedAt": "2026-05-08T10:00:00Z",
    "notes": "Lote em bom estado",
    "purchasedBy": "uuid-do-gerente",
    "purchasedByName": "Carlos Gerente",
    "status": "open",
    "itemsCount": 10,
    "itemsCataloged": 3
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Lote encontrado e retornado |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão ou lote pertence a outra filial |
  | 404 | Lote não encontrado |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O backend deve verificar que `used_book_purchase.branch_id` corresponde à filial do JWT antes de retornar os dados. Lotes de outras filiais → `403` (não vazar existência de lotes de outras filiais).

---

## Requisitos de qualidade

- [ ] Operações I/O-bound identificadas? `POST /purchases` com `issueVoucher = true` envolve validação em `customer` + INSERT em `used_book_purchase` + N INSERTs em `used_book_purchase_item` + INSERT em `voucher` em sequência — candidato a virtual thread para não bloquear carrier thread durante espera de I/O de banco.
- [ ] Paths com GraalVM AOT: nenhuma reflexão dinâmica introduzida. Os DTOs de request/response são records Java padrão; a anotação `@Valid` não requer configuração adicional.
- [ ] Dados sensíveis: `voucherCustomerId` referencia `customer.cpf_cnpj` indiretamente, mas nenhum dado sensível (CPF, CNPJ) é retornado pelos endpoints deste módulo. A resposta de criação expõe apenas `customerName`.
- [ ] Autorização por perfil verificada em todos os endpoints: `branch_id` extraído do JWT em todas as operações; lotes de outras filiais retornam `403`, nunca `404`.
- [ ] O campo `issueVoucher` é opcional e não deve alterar o código de resposta em caso de sucesso parcial — a atomicidade da transação garante que o lote só existe se o voucher também foi criado com sucesso (quando solicitado).

---

## Estratégia de testes

**Fluxo principal (happy path)**

- Criar lote com todos os campos obrigatórios, `issueVoucher = false`, sem `estimatedQuantity`: verificar resposta `201` com `status = "open"`, `itemsCount = 0`, `itemsCataloged = 0`, `voucher = null`.
- Criar lote com `estimatedQuantity = 5`: verificar resposta `201` com `itemsCount = 5` e que 5 registros foram inseridos em `used_book_purchase_item` com `book_id = NULL` e `purchase_id` correto.
- Criar lote com `issueVoucher = true`, cliente válido e `voucherValue = 80.00`: verificar criação do lote, criação do voucher em `voucher` com `initial_value = 80.00`, e campo `voucher` preenchido na resposta.
- Criar lote com `purchasedAt` no passado (data retroativa): verificar que a data é respeitada na persistência.
- Listar lotes: verificar ordenação `purchased_at DESC`, cálculo correto de `status`, `itemsCount` e `itemsCataloged`.
- Detalhar lote: verificar campo `purchasedByName` populado via JOIN com `user`.

**Casos de erro esperados**

- `POST /purchases` sem `sellerName` → `400`.
- `POST /purchases` com `totalPrice = 0` → `400`.
- `POST /purchases` com `totalPrice` negativo → `400`.
- `POST /purchases` com `paymentMethod = "credit_card"` → `400`.
- `POST /purchases` com `purchasedAt` mais de 24h no futuro → `400`.
- `POST /purchases` com `estimatedQuantity = 0` → `400`.
- `POST /purchases` com `issueVoucher = true` sem `voucherCustomerId` → `400`.
- `POST /purchases` com `issueVoucher = true` sem `voucherValue` → `400`.
- `POST /purchases` com `issueVoucher = true` e `voucherValue = 0` → `400`.
- `POST /purchases` com `issueVoucher = true` e `voucherCustomerId` inexistente → `404`.
- `POST /purchases` com `issueVoucher = true` e `voucherCustomerId` de outra filial → `404`.
- `GET /purchases/{id}` com ID de lote de outra filial → `403`.
- `GET /purchases/{id}` com ID inexistente → `404`.
- `GET /purchases` com `status = "invalid_value"` → `400`.

**Casos de autorização**

- `Catalogador` acessando `POST /purchases` → `403`.
- `Caixa` acessando `POST /purchases` → `403`.
- `Caixa` acessando `GET /purchases` → `403`.
- `Gerente` acessando `POST /purchases` com dados válidos → `201`.
- `Administrador` acessando `POST /purchases` sem `branchId` query param → `400`.
- `Administrador` acessando `POST /purchases` com `branchId` query param válido → `201`.
- Usuário não autenticado → `401` em todos os endpoints.

**Edge cases de regras de negócio**

- Atomicidade: `POST /purchases` com `issueVoucher = true` e falha simulada na inserção do voucher (ex.: constraint violation) → verificar que o lote também não é criado e a transação é revertida completamente.
- Criação de lote com `estimatedQuantity = 100`: verificar que exatamente 100 registros são inseridos em `used_book_purchase_item` e que o `status` retornado é `"open"`.
- Cálculo de status na listagem: lote com `itemsCount = 3` e `itemsCataloged = 3` deve aparecer com `status = "closed"`; lote com `itemsCount = 3` e `itemsCataloged = 2` com `status = "open"`.
- Lote sem itens (`itemsCount = 0`): `status` deve ser `"open"` por convenção.

---

## Riscos técnicos e dependências

1. **Dependência do módulo de Clientes (`007-xx`):** A validação de `voucherCustomerId` requer que a tabela `customer` exista com dados. A tabela já está no schema (`000-01`), mas o módulo `007-xx` ainda não possui `tech.md`. A implementação do endpoint `GET /customers/search` (utilizado pelo frontend para buscar o cliente ao preencher o formulário) está documentada em `005-00.vouchers/tech.md` como responsabilidade do domínio `customer`. Este módulo (006-01) depende desse endpoint para o fluxo de UI; o backend pode ser implementado independentemente, mas o formulário frontend estará bloqueado até que `GET /customers/search` esteja disponível.

2. **Atomicidade da criação do lote + voucher:** Quando `issueVoucher = true`, a emissão do voucher deve ocorrer na mesma transação JDBC que a criação do lote. A lógica de emissão de voucher de `005-00` (incluindo a regra `initial_value > 0`, vínculo com `customer`, escopo por `branch_id`, preenchimento de `issued_by` e `issued_at`) deve ser reutilizada como serviço interno — não como chamada HTTP ao endpoint `POST /vouchers`. Chamar o próprio endpoint HTTP internamente (via `RestTemplate` ou `WebClient`) criaria duas transações independentes e tornaria o rollback impossível em caso de falha parcial.

3. **Coluna `book_id` NOT NULL em `used_book_purchase_item`:** O DDL de `000-01.modelagem-dados` define `book_id` como `NOT NULL`. A criação de itens vazios (slots sem livro) requer que essa coluna seja nullable. A migration `003-used-book-purchase-item-book-id-nullable` deve ser executada antes do deployment desta feature. Se executada fora de ordem, a inserção de itens vazios resultará em violação de constraint e `500` em vez do `201` esperado.

4. **Campo `estimatedQuantity` não persistido na tabela:** O campo existe apenas no DTO de request e determina quantos itens vazios criar. O valor não é armazenado em `used_book_purchase`. Isso significa que, após o registro, não é possível recuperar o `estimatedQuantity` original — apenas inferir via `itemsCount` (total de itens na tabela). O frontend deve derivar a quantidade estimada de `itemsCount` ao exibir o resumo do lote.

5. **Performance de N INSERTs em `used_book_purchase_item`:** Para `estimatedQuantity` grandes (ex.: 500 livros), a inserção de 500 registros em loop individual pode ser lenta. O serviço deve usar `batch insert` via JDBC ou JPA batch (`spring.jpa.properties.hibernate.jdbc.batch_size`) para reduzir roundtrips ao banco. Definir `batch_size` mínimo de 50.

6. **Dependência de `006-02.gerenciar-livros-lote`:** O redirect pós-criação (`/purchases/:id/books`) pressupõe que a tela de gerenciamento de livros do lote esteja implementada. O backend desta feature é independente, mas o fluxo completo de UI só pode ser validado com ambas as features disponíveis.
