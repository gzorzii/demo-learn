# Gerenciar Carrinho no PDV — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Esta sub-feature é a primeira etapa do fluxo de venda do PDV (`004-00`). Introduce a tela `/pdv` e dois endpoints de suporte ao carrinho — busca por ISBN via scanner e consulta de desconto ativo — mas **não persiste nenhum dado no banco durante a montagem do carrinho**. O estado do carrinho (itens, preços, descontos capturados) é inteiramente gerenciado como estado local do frontend (React state ou context).

Camadas afetadas:

- **Backend:** dois endpoints de leitura (`GET /books/scan` e `GET /discounts/active`) — o segundo já contratado em `003-00.descontos/tech.md`, aqui apenas referenciado.
- **Frontend:** tela `/pdv` com campo de scanner, busca manual, lista de itens do carrinho e resumo de totais.
- **Banco de dados:** nenhuma escrita. Leitura nas tabelas `book`, `book_stock`, `discount`, `discount_book` (lidas via endpoints já descritos em módulos anteriores).

Domínios lidos por esta feature:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Catálogo (`001-00`) | `book`, `book_stock` | leitura — dados do livro e disponibilidade de estoque |
| Descontos (`003-00`) | `discount`, `discount_book` | leitura — desconto ativo vigente por livro na filial |
| Usuários/Auth (`000-02`) | claims do JWT | leitura — identificação de perfil e `branchId` |

Nenhuma tabela nova é criada ou alterada por esta sub-feature. As tabelas `sale`, `sale_item` e `sale_payment` (definidas em `000-01.modelagem-dados` e referenciadas em `004-00`) **não são escritas aqui** — são utilizadas apenas na finalização da venda (`004-04.finalizar-venda`).

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. Esta sub-feature não cria tabelas nem altera o schema existente.

### Tabelas lidas (referência)

| Tabela | Módulo de origem | Uso nesta feature |
|--------|-----------------|-------------------|
| `book` | `000-01.modelagem-dados` | Busca por ISBN (`isbn`, `title`, `author`, `sale_price`, `condition`, `active`) |
| `book_stock` | `000-01.modelagem-dados` | Verificação de disponibilidade (`quantity`, `branch_id`) |
| `discount` | `000-01.modelagem-dados` | Resolução de desconto ativo — consumido via `GET /discounts/active` (já contratado em `003-00`) |
| `discount_book` | `000-01.modelagem-dados` | Vínculo desconto-livro para escopo `book` — consumido via `GET /discounts/active` |

### Estratégia de migração

Nenhuma migração necessária. Sem changeSets novos.

---

## Contratos de API

> Todas as rotas exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade do cookie → `401`. O `branch_id` de escopo é sempre extraído do claim `branchId` do JWT — o cliente não envia `branch_id` nas requisições.

---

### `GET /books/scan`

Busca um livro pelo ISBN exato para o fluxo de scanner do PDV. Retorna os dados do livro, o estoque disponível na filial e o desconto ativo vigente (se houver), tudo em uma única chamada.

> Este endpoint é separado de `GET /books/search` por ter semântica distinta: busca exata por ISBN (não busca parcial), é otimizado para o caminho crítico do scanner (baixa latência), e retorna os campos de desconto embutidos — evitando dois roundtrips sequenciais ao escanear cada livro.

- **Authorization:** `Administrador`, `Gerente`, `Caixa`
- **Query params:**

  | Parâmetro | Tipo | Obrigatório | Validação |
  |-----------|------|-------------|-----------|
  | `isbn` | `string` | sim | não vazio; formato ISBN-10 (10 dígitos) ou ISBN-13 (13 dígitos); ausente ou vazio → `400` |

- **Lógica de resolução:**

  1. Busca `book` WHERE `isbn = :isbn` AND `branch_id = :branchId` AND `active = TRUE`. Retorna o primeiro resultado (em catálogos corretos deve haver no máximo um livro ativo por ISBN por filial).
  2. Busca `book_stock` WHERE `book_id = :bookId` AND `branch_id = :branchId` para obter `quantity` (livros novos) ou verifica `active = TRUE` na tabela `book` (livros usados têm `quantity = 1` enquanto não vendidos).
  3. Resolve o desconto ativo chamando a mesma lógica do serviço de `GET /discounts/active` (sem chamada HTTP interna — reutilização de lógica de serviço) para o `book_id` encontrado.

  Regra de disponibilidade:
  - Para livros com `condition = 'new'`: disponível se `book_stock.quantity > 0`.
  - Para livros com `condition = 'used'`: disponível se `book.active = TRUE` e não existe `sale_item.book_id = :bookId` em venda finalizada (ou, de forma mais simples e alinhada ao schema atual: `book_stock.quantity > 0`, pois usados têm `quantity = 1` até serem vendidos).

- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "title": "string",
    "author": "string",
    "isbn": "string",
    "condition": "new|used",
    "sale_price": 0.00,
    "stock_quantity": 0,
    "available": true,
    "discount": {
      "discount_id": "uuid|null",
      "scope": "book|category|author|price_range|null",
      "value_type": "percentage|fixed|null",
      "value": 0.00,
      "discounted_price": 0.00
    }
  }
  ```

  > `discount` nunca é `null` no objeto raiz — retorna sempre com os campos internos como `null` quando não há desconto ativo, de forma idêntica ao contrato de `GET /discounts/active`. `discounted_price` iguala `sale_price` quando não há desconto.

  > `available` é calculado no backend conforme a regra descrita acima. O frontend usa este campo para bloquear a adição ao carrinho sem precisar interpretar `stock_quantity`.

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | `200` | Livro encontrado na filial — retorna dados + disponibilidade + desconto (mesmo se `available = false`) |
  | `400` | `isbn` ausente, vazio, ou com formato inválido |
  | `401` | Cookie ausente ou JWT inválido/expirado |
  | `403` | Perfil `Catalogador` (não tem acesso ao PDV) |
  | `404` | Nenhum livro ativo com esse ISBN encontrado na filial |
  | `500` | Erro inesperado |

- **Edge cases:**

  - Se o livro for encontrado mas `available = false`, o endpoint ainda retorna `200` com os dados do livro e `available: false`. O frontend exibe a mensagem de indisponibilidade e não adiciona o item ao carrinho — a decisão de bloquear é do frontend, mas a informação vem do backend.
  - O `branch_id` de escopo é sempre extraído do JWT. O `Administrador` usa o `branchId` do JWT (que pode ser `null`). Se `branchId` for `null` (Administrador sem filial associada), o serviço retorna `400` — consulta sem escopo de filial é inválida para este endpoint.
  - Se múltiplos livros ativos existirem com o mesmo ISBN na filial (situação inconsistente, não deveria ocorrer), o serviço retorna o mais recente por `registered_at DESC LIMIT 1` e registra um warning no log.
  - O campo `stock_quantity` reflete `book_stock.quantity` via `LEFT JOIN`; livros sem registro em `book_stock` retornam `stock_quantity: 0` e `available: false`.

---

### `GET /discounts/active`

Retorna o desconto ativo vigente para um livro específico.

> Este endpoint já está completamente especificado em `003-00.descontos/tech.md`. A presente seção apenas documenta o uso que esta feature faz dele.

- **Authorization:** `Administrador`, `Gerente`, `Caixa`
- **Query param:** `book_id` (UUID) — obrigatório
- **Response `200`:** ver contrato completo em `003-00.descontos/tech.md`

O frontend pode chamar este endpoint separadamente quando o livro é adicionado via **busca manual** (por título/ISBN usando `GET /books/search`), pois a busca manual não retorna dados de desconto. No fluxo de scanner, `GET /books/scan` já embute o desconto — não é necessário chamar `GET /discounts/active` separadamente.

---

## Comportamento do carrinho no frontend

O carrinho é estado local do React (state ou context). O backend não tem conhecimento do carrinho enquanto a venda não é finalizada.

### Estrutura do item de carrinho (TypeScript)

```typescript
interface CartItem {
  bookId: string;
  title: string;
  author: string;
  isbn: string;
  condition: 'new' | 'used';
  originalPrice: number;
  discountId: string | null;
  discountScope: string | null;
  discountValueType: 'percentage' | 'fixed' | null;
  discountValue: number | null;
  effectivePrice: number;  // originalPrice quando sem desconto
}
```

### Fluxo de adição via scanner

1. Usuário escaneia ISBN → frontend envia `GET /books/scan?isbn={isbn}`.
2. Se `404`: exibe "Livro não encontrado nesta filial".
3. Se `200` e `available = false`: exibe "Livro indisponível".
4. Se `200` e `available = true` e `bookId` já está no carrinho: exibe "Livro já está no carrinho".
5. Se `200` e `available = true` e `bookId` não está no carrinho: adiciona item com `effectivePrice = discount.discounted_price`.

### Fluxo de adição via busca manual

1. Usuário digita termo → frontend envia `GET /books/search?q={termo}` (endpoint existente de `001-05`).
2. Usuário seleciona um resultado.
3. Frontend verifica se o livro já está no carrinho (por `bookId`).
4. Frontend envia `GET /discounts/active?book_id={bookId}` para resolver desconto.
5. Adiciona item ao carrinho com preço e desconto resolvidos.

> A verificação de disponibilidade no fluxo de busca manual é feita pelo campo `stock_quantity` retornado em `GET /books/search`. O frontend deve bloquear adição se `stock_quantity = 0`.

### Cálculo do resumo do carrinho

Todos os cálculos são realizados no frontend com os valores capturados no momento da adição:

- **Subtotal**: `SUM(item.effectivePrice)` para todos os itens.
- **Total provisório**: igual ao subtotal (voucher ainda não aplicado nesta etapa).

Os valores capturados no momento da adição são imutáveis dentro do carrinho — flutuações de preço ou alterações de desconto não afetam o carrinho já montado (regra de negócio 10 do `business.md`).

---

## Requisitos de qualidade

- [ ] I/O-bound identificado: `GET /books/scan` executa queries em `book`, `book_stock`, `discount`, `discount_book` — candidato a virtual thread (Java 25 / Project Loom).
- [ ] `GET /books/scan` está no caminho crítico do PDV (executado a cada escaneamento): a query deve ser eficiente. Os índices `idx_book_isbn` (em `000-01.modelagem-dados`), `idx_book_branch_active` (em `001-00.catalogo-livros`) e os índices de desconto (`idx_discount_branch_active`, `idx_discount_book_book_id` em `003-00.descontos`) são pré-requisitos obrigatórios.
- [ ] GraalVM AOT: nenhum uso novo de reflexão além do que os módulos dependentes já utilizam. DTOs são records — compatíveis.
- [ ] Dados sensíveis: nenhuma coluna sensível (CPF, CNPJ, senha, token) é lida ou exposta por este endpoint. `branch_id` do JWT nunca é substituído pelo cliente.
- [ ] Autorização por perfil coberta: `Catalogador` não tem acesso a nenhum endpoint do PDV. `Caixa`, `Gerente` e `Administrador` têm acesso a `GET /books/scan` e `GET /discounts/active`.
- [ ] Administrador sem `branchId` no JWT deve receber `400` em `GET /books/scan` — ausência de escopo de filial é inválida.

---

## Estratégia de testes

### Fluxo principal (happy path)

- Escanear ISBN de livro novo com `stock_quantity > 0` e sem desconto ativo; verificar `200`, `available: true`, `discount.discount_id: null`, `discounted_price = sale_price`.
- Escanear ISBN de livro com desconto ativo de escopo `book`; verificar `200`, `available: true`, `discount.discount_id` preenchido, `discounted_price` calculado corretamente.
- Escanear ISBN de livro com desconto ativo de escopo `category`; verificar que o desconto é resolvido e retornado.
- Escanear ISBN de livro usado com `book_stock.quantity = 1`; verificar `available: true`.
- Busca manual com `GET /books/search?q=titulo`; verificar que livros com `stock_quantity > 0` são retornados com campo para checar disponibilidade.
- Chamar `GET /discounts/active?book_id={id}` para livro sem desconto; verificar resposta com `discount_id: null` conforme contrato de `003-00`.

### Casos de erro esperados

- `GET /books/scan` sem `isbn` → `400`.
- `GET /books/scan` com `isbn` vazio (`isbn=`) → `400`.
- `GET /books/scan` com ISBN de formato inválido (ex.: 5 dígitos) → `400`.
- `GET /books/scan` com ISBN não cadastrado na filial → `404`.
- `GET /books/scan` com ISBN de livro de outra filial → `404`.
- `GET /books/scan` por `Administrador` sem `branchId` no JWT → `400`.
- `GET /discounts/active` sem `book_id` → `400` (conforme `003-00`).

### Casos de autorização

- `Caixa` autenticado chamando `GET /books/scan?isbn=...` → `200` (quando livro existe).
- `Catalogador` autenticado chamando `GET /books/scan?isbn=...` → `403`.
- `Gerente` chamando `GET /discounts/active?book_id=...` → `200`.
- Requisição sem cookie `auth_token` em qualquer endpoint → `401`.
- JWT expirado → `401`.

### Casos de borda das regras de negócio

- Escanear ISBN de livro com `stock_quantity = 0`; verificar `200` com `available: false` (não `404`).
- Escanear ISBN de livro novo com `available: false`; verificar que dados do livro são retornados normalmente — só `available` difere.
- Escanear ISBN de livro usado com `book_stock.quantity = 0`; verificar `available: false`.
- Desconto com `ends_at` expirado há 1 segundo; verificar que `discount.discount_id` retorna `null` em `GET /books/scan`.
- Desconto com `starts_at` no futuro (status `scheduled`); verificar que não é retornado como ativo.
- Livro coberto por dois escopos de desconto simultâneos (situação defendida pela criação via `003-01`); verificar que `GET /books/scan` retorna apenas o de maior precedência (`book > category > author > price_range`), consistente com `GET /discounts/active`.
- Frontend: tentar adicionar o mesmo `bookId` duas vezes ao carrinho; verificar que o segundo é bloqueado com mensagem "Livro já está no carrinho" sem chamada ao backend.
- Frontend: itens adicionados ao carrinho preservam `effectivePrice` original mesmo após navegação para outra tela e retorno ao `/pdv` (dentro da mesma sessão React).

---

## DTOs de domínio

Os DTOs abaixo são específicos deste endpoint. Definidos como Java records no pacote `com.ciet.demo_learn.pdv` (ou `com.ciet.demo_learn.catalog`, se preferível por coesão com os endpoints de livros — decisão da implementação).

```
BookScanResponse          — resposta de GET /books/scan
BookScanDiscountInfo      — campo embutido "discount" dentro de BookScanResponse
```

> `ActiveDiscountResponse` (definido em `003-00.descontos/tech.md`) pode ser reutilizado como `BookScanDiscountInfo`, ou copiado com nome local — decisão de implementação.

---

## Riscos técnicos e dependências

1. **Divergência entre o modelo de `sale`/`sale_item` descrito em `004-00.pdv/business.md` e o schema real em `000-01.modelagem-dados`.** O `004-00` define colunas `subtotal`, `total`, `status`, `completed_at` em `sale`, enquanto o schema criado em `000-01` tem `total_amount`, `discount_amount`, `receipt_printed`, `sold_at` (sem `status` nem `completed_at`). Esta feature não escreve nessas tabelas, mas `004-04.finalizar-venda` dependerá desse alinhamento. O time deve reconciliar os dois documentos antes de implementar `004-04`. Risco: baixo para esta sub-feature (004-01), alto para `004-04`.

2. **`GET /books/scan` reutiliza lógica interna de `GET /discounts/active`.** A resolução de desconto não deve ser feita via chamada HTTP interna — o serviço de scan deve injetar e chamar diretamente o `DiscountService` (ou equivalente). Isso cria uma dependência de implementação entre os domínios `catalog/pdv` e `discount`. A ordem de implementação recomendada é: `003-00` (descontos) antes de `004-01` (carrinho).

3. **Verificação de disponibilidade para livros usados depende de `book_stock.quantity`.** O schema atual usa `book_stock.quantity = 1` para livros usados disponíveis. Quando o livro é vendido (em `004-04`), `book_stock.quantity` é decrementado para `0`. Esta interpretação está implícita no `business.md` ("registro sem `available = true` para usados") mas o campo `available` não existe na tabela `book` — a regra é inferida como `book_stock.quantity > 0`. Este contrato deve ser validado com a implementação de `004-04` para garantir que o decremento de estoque de usados siga esta semântica.

4. **Carrinho não é persistido — perda em recarregamento de página é comportamento esperado.** Conforme `business.md` (regra 1 e seção "Fora de escopo"), a persistência do carrinho entre sessões está fora de escopo. O frontend deve exibir aviso ao usuário se detectar tentativa de fechar ou recarregar a página com itens no carrinho (evento `beforeunload`).

5. **`GET /books/search` não retorna dados de desconto.** No fluxo de busca manual, o frontend precisa chamar `GET /discounts/active` separadamente para cada livro selecionado. Isso implica dois roundtrips ao backend no fluxo de busca manual (busca + desconto), contra um único roundtrip no fluxo de scanner. O impacto é aceitável pois a busca manual é menos frequente e tolerante a latência extra.

6. **Dependência de `GET /discounts/active` (003-00).** O endpoint `GET /discounts/active` já está especificado e contratado em `003-00.descontos/tech.md`. Esta feature assume que ele está implementado e disponível. A ordem de entrega recomendada é: módulo `003` completo antes de iniciar `004-01`.
