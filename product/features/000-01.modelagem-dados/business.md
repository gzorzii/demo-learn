# Modelagem de Dados

**Delivery status:** Concluído

## Nome do recurso e objetivo

Infrastructure feature — not a business feature.

Define o modelo completo de entidades e tabelas relacionais do sistema de gestão de livrarias. Estabelece a estrutura de dados que suporta todos os módulos de negócio: cadastro de livros, controle de estoque por filial, PDV, descontos, vouchers, compra de usados, clientes, usuários, autenticação, notificações, rastreamento de tempo em prateleira e histórico de preços.

## Stack envolvida

- PostgreSQL 18
- Liquibase (migrations)
- Spring Boot 4 / Spring Data JPA
- Java 25 (entidades JPA)
- UUIDs v7 (`uuidv7()`) para todas as chaves primárias
- Colunas de enum representadas como `TEXT` (sem `ENUM` types ou `CHECK` constraints)

## Entidades e tabelas

### `branch` — Filiais

Representa cada unidade física da livraria. Todos os estoques, usuários (exceto Administrador) e configurações de prazo de prateleira são escopados por filial.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `name` | TEXT | Nome da filial |
| `address` | TEXT | Endereço completo |
| `phone` | TEXT | Telefone de contato |
| `active` | BOOLEAN | Se a filial está ativa |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |

---

### `role` — Perfis de acesso

Perfis fixos do sistema: `Administrador`, `Gerente`, `Catalogador`, `Caixa`. Não é possível criar perfis customizados.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `name` | TEXT | Nome do perfil (ex.: `Administrador`) |
| `description` | TEXT | Descrição das responsabilidades |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |

---

### `user` — Usuários do sistema

Usuários pré-cadastrados por Gerente ou Administrador. Não existe auto-cadastro. Cada usuário pertence a uma filial (exceto Administrador, cujo `branch_id` é nulo).

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `name` | TEXT | Nome completo |
| `email` | TEXT | E-mail único; usado para autenticação |
| `branch_id` | UUID | FK → `branch.id`; nulo para Administrador |
| `active` | BOOLEAN | Se o usuário está ativo |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |

---

### `user_role` — Vínculo usuário-perfil

Tabela de associação N:N entre `user` e `role`. Um usuário pode ter múltiplos perfis simultaneamente.

| Coluna | Tipo | Observação |
|---|---|---|
| `user_id` | UUID | FK → `user.id` |
| `role_id` | UUID | FK → `role.id` |
| PK composta | — | `(user_id, role_id)` |

---

### `customer` — Clientes

Clientes registrados pela filial. O CPF/CNPJ é coletado para futura emissão de NF-e (fora do escopo atual). Clientes são vinculados a vouchers e a listas de desejos.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `name` | TEXT | Nome completo |
| `phone` | TEXT | Telefone |
| `address` | TEXT | Endereço |
| `cpf_cnpj` | TEXT | CPF ou CNPJ (sem formatação) |
| `branch_id` | UUID | FK → `branch.id`; filial onde foi cadastrado |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |

---

### `book` — Livros

Cada registro representa um livro no catálogo. Livros novos podem ter múltiplos exemplares controlados por quantidade em `book_stock`. Livros usados possuem registro individual. O campo `condition` é `TEXT` com valores possíveis `new` e `used`.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `title` | TEXT | Título |
| `author` | TEXT | Autor(es) |
| `isbn` | TEXT | ISBN (pode repetir entre registros independentes) |
| `publisher` | TEXT | Editora |
| `year` | INTEGER | Ano de publicação |
| `category` | TEXT | Gênero/categoria |
| `condition` | TEXT | `new` ou `used` |
| `condition_description` | TEXT | Obrigatório quando `condition = used`; descreve avarias |
| `sale_price` | NUMERIC(10,2) | Preço de venda atual |
| `description` | TEXT | Descrição geral do livro |
| `branch_id` | UUID | FK → `branch.id`; filial à qual pertence o registro |
| `shelf_location` | TEXT | Localização física na prateleira/seção |
| `registered_at` | TIMESTAMP | Data de cadastro (início do timer de prateleira) |
| `active` | BOOLEAN | Se o livro está ativo no catálogo |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |

---

### `book_image` — Imagens dos livros

Cada livro pode ter até 10 imagens. Armazena a URL/caminho do arquivo de imagem.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `book_id` | UUID | FK → `book.id` |
| `url` | TEXT | URL ou caminho do arquivo |
| `order` | INTEGER | Ordem de exibição |
| `created_at` | TIMESTAMP | Data de upload |

---

### `book_stock` — Estoque por filial

Controla a quantidade disponível de livros novos por filial. Livros usados têm registro individual em `book`; a quantidade em `book_stock` para usados é sempre 1 ou 0.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `book_id` | UUID | FK → `book.id` |
| `branch_id` | UUID | FK → `branch.id` |
| `quantity` | INTEGER | Quantidade disponível |
| `updated_at` | TIMESTAMP | Data de última atualização |

---

### `price_history` — Histórico de preços

Registrado automaticamente a cada alteração do `sale_price` em `book`. Acessível somente para Gerente e Administrador.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `book_id` | UUID | FK → `book.id` |
| `previous_price` | NUMERIC(10,2) | Preço anterior |
| `new_price` | NUMERIC(10,2) | Novo preço |
| `changed_by` | UUID | FK → `user.id`; quem fez a alteração |
| `changed_at` | TIMESTAMP | Momento da alteração |

---

### `label_config` — Configurações de etiqueta

Configurações de tamanho de etiqueta para impressão em folha A4 adesiva. Pode ter tamanhos predefinidos e customizados por filial.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `branch_id` | UUID | FK → `branch.id`; nulo = padrão global |
| `name` | TEXT | Nome da configuração (ex.: `5cm × 10cm`) |
| `width_cm` | NUMERIC(5,2) | Largura em centímetros |
| `height_cm` | NUMERIC(5,2) | Altura em centímetros |
| `is_default` | BOOLEAN | Se é configuração padrão do sistema |
| `created_at` | TIMESTAMP | Data de criação |

---

### `discount` — Descontos

Criados pelo Gerente. Cada desconto tem um escopo (`book`, `category`, `author`, `price_range`) e uma forma de valor (`percentage` ou `fixed`), ambos armazenados como `TEXT`.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `branch_id` | UUID | FK → `branch.id` |
| `scope` | TEXT | `book`, `category`, `author`, `price_range` |
| `value_type` | TEXT | `percentage` ou `fixed` |
| `value` | NUMERIC(10,2) | Valor do desconto |
| `category` | TEXT | Preenchido quando `scope = category` |
| `author` | TEXT | Preenchido quando `scope = author` |
| `min_price` | NUMERIC(10,2) | Preenchido quando `scope = price_range` |
| `max_price` | NUMERIC(10,2) | Preenchido quando `scope = price_range` |
| `starts_at` | TIMESTAMP | Início da vigência (opcional) |
| `ends_at` | TIMESTAMP | Fim da vigência (opcional) |
| `active` | BOOLEAN | Se o desconto está ativo |
| `created_by` | UUID | FK → `user.id` |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |

---

### `discount_book` — Livros vinculados a desconto individual

Tabela de associação quando `discount.scope = book`. Um livro só pode ter um desconto ativo por vez.

| Coluna | Tipo | Observação |
|---|---|---|
| `discount_id` | UUID | FK → `discount.id` |
| `book_id` | UUID | FK → `book.id` |
| PK composta | — | `(discount_id, book_id)` |

---

### `payment_method` — Métodos de pagamento

Configurados pelo Gerente por filial. Exemplos: `Dinheiro`, `PIX`, `Cartão de Crédito`, `Voucher`.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `branch_id` | UUID | FK → `branch.id` |
| `name` | TEXT | Nome do método |
| `active` | BOOLEAN | Se está habilitado |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Data de última atualização |

---

### `sale` — Vendas

Cada venda realizada no PDV. Pode conter múltiplos itens e múltiplos métodos de pagamento.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `branch_id` | UUID | FK → `branch.id` |
| `cashier_id` | UUID | FK → `user.id`; operador do PDV |
| `customer_id` | UUID | FK → `customer.id`; opcional |
| `total_amount` | NUMERIC(10,2) | Valor total da venda |
| `discount_amount` | NUMERIC(10,2) | Valor total de descontos aplicados |
| `receipt_printed` | BOOLEAN | Se o comprovante foi impresso |
| `sold_at` | TIMESTAMP | Data e hora da venda |
| `created_at` | TIMESTAMP | Data de criação |

---

### `sale_item` — Itens da venda

Cada livro vendido em uma venda. Registra o preço no momento da venda (snapshot).

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `sale_id` | UUID | FK → `sale.id` |
| `book_id` | UUID | FK → `book.id` |
| `unit_price` | NUMERIC(10,2) | Preço original no momento da venda |
| `discounted_price` | NUMERIC(10,2) | Preço com desconto aplicado (igual ao original se sem desconto) |
| `quantity` | INTEGER | Quantidade vendida |

---

### `sale_payment` — Pagamentos da venda

Cada método de pagamento utilizado em uma venda. Uma venda pode ter múltiplos registros aqui.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `sale_id` | UUID | FK → `sale.id` |
| `payment_method_id` | UUID | FK → `payment_method.id` |
| `amount` | NUMERIC(10,2) | Valor pago neste método |
| `voucher_id` | UUID | FK → `voucher.id`; preenchido quando método = voucher |

---

### `voucher` — Vouchers de crédito (trade-in)

Emitidos pelo Gerente após avaliação de livros usados trazidos pelo cliente. Sem prazo de validade. Saldo pode ser utilizado parcialmente.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `branch_id` | UUID | FK → `branch.id` |
| `customer_id` | UUID | FK → `customer.id` |
| `initial_value` | NUMERIC(10,2) | Valor original do voucher |
| `remaining_balance` | NUMERIC(10,2) | Saldo restante |
| `issued_by` | UUID | FK → `user.id`; Gerente que emitiu |
| `issued_at` | TIMESTAMP | Data de emissão |
| `active` | BOOLEAN | Se o voucher ainda tem saldo e está ativo |

---

### `voucher_usage` — Histórico de uso do voucher

Registra cada utilização parcial ou total de um voucher em uma venda.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `voucher_id` | UUID | FK → `voucher.id` |
| `sale_id` | UUID | FK → `sale.id` |
| `amount_used` | NUMERIC(10,2) | Valor utilizado nesta transação |
| `used_at` | TIMESTAMP | Data e hora do uso |

---

### `used_book_purchase` — Compra de lote de usados

Registro da aquisição de um lote de livros usados de um cliente externo (não necessariamente cadastrado no sistema). Pagamento em dinheiro ou PIX.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `branch_id` | UUID | FK → `branch.id` |
| `total_price` | NUMERIC(10,2) | Valor total pago pelo lote |
| `payment_method` | TEXT | `cash` ou `pix` |
| `seller_name` | TEXT | Nome de quem vendeu o lote (não precisa ser cliente cadastrado) |
| `purchased_by` | UUID | FK → `user.id`; Gerente responsável |
| `purchased_at` | TIMESTAMP | Data da compra |
| `notes` | TEXT | Observações gerais sobre o lote |

---

### `used_book_purchase_item` — Itens do lote de usados

Vínculo entre a compra de lote e os livros cadastrados individualmente após a aquisição.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `purchase_id` | UUID | FK → `used_book_purchase.id` |
| `book_id` | UUID | FK → `book.id`; livro cadastrado após a compra |

---

### `customer_wishlist` — Lista de desejos do cliente

Livros que um cliente deseja mas que não estão em estoque. Quando o livro for cadastrado, uma notificação é gerada.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `customer_id` | UUID | FK → `customer.id` |
| `branch_id` | UUID | FK → `branch.id` |
| `title` | TEXT | Título desejado |
| `author` | TEXT | Autor (opcional) |
| `isbn` | TEXT | ISBN (opcional) |
| `notified` | BOOLEAN | Se a notificação de chegada já foi disparada |
| `created_at` | TIMESTAMP | Data do registro do interesse |

---

### `shelf_threshold` — Configuração de prazo de prateleira por filial

Define o número de dias após o qual um livro é considerado "vencido" na prateleira. Configurável por Gerente ou Administrador por filial.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `branch_id` | UUID | FK → `branch.id` (único por filial) |
| `days_threshold` | INTEGER | Número de dias para considerar o livro vencido |
| `configured_by` | UUID | FK → `user.id` |
| `updated_at` | TIMESTAMP | Data da última atualização |

---

### `notification` — Notificações in-app

Notificações geradas pelo sistema para Gerentes e Caixas da filial. Podem ser sobre chegada de livro desejado ou livro vencido na prateleira. O campo `type` é `TEXT` com valores possíveis `book_arrival` e `shelf_overdue`.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `branch_id` | UUID | FK → `branch.id` |
| `user_id` | UUID | FK → `user.id`; destinatário |
| `type` | TEXT | `book_arrival` ou `shelf_overdue` |
| `message` | TEXT | Texto da notificação |
| `book_id` | UUID | FK → `book.id`; livro relacionado (opcional) |
| `customer_wishlist_id` | UUID | FK → `customer_wishlist.id`; origem (opcional) |
| `read` | BOOLEAN | Se foi lida/dispensada |
| `created_at` | TIMESTAMP | Data de criação |

---

## Relacionamentos principais

```
branch          ← user (branch_id)
branch          ← book (branch_id)
branch          ← book_stock (branch_id)
branch          ← discount (branch_id)
branch          ← payment_method (branch_id)
branch          ← sale (branch_id)
branch          ← voucher (branch_id)
branch          ← customer (branch_id)
branch          ← shelf_threshold (branch_id)
branch          ← notification (branch_id)
user            ← user_role (user_id)
role            ← user_role (role_id)
book            ← book_image (book_id)
book            ← book_stock (book_id)
book            ← price_history (book_id)
book            ← discount_book (book_id)
discount        ← discount_book (discount_id)
sale            ← sale_item (sale_id)
sale            ← sale_payment (sale_id)
sale_payment    → voucher (voucher_id)
voucher         ← voucher_usage (voucher_id)
sale            ← voucher_usage (sale_id)
customer        ← customer_wishlist (customer_id)
customer        ← voucher (customer_id)
used_book_purchase ← used_book_purchase_item (purchase_id)
book            ← used_book_purchase_item (book_id)
notification    → customer_wishlist (customer_wishlist_id)
notification    → book (book_id)
```

## Regras de negócio

1. Toda chave primária usa UUID v7 gerado pelo banco via `uuidv7()`.
2. Colunas que representam enumerações (ex.: `condition`, `scope`, `value_type`, `payment_method`, `type`) são do tipo `TEXT`. Nenhum tipo `ENUM` ou `CHECK constraint` é utilizado no banco.
3. O campo `book.condition_description` é obrigatório quando `book.condition = 'used'`; esta regra é aplicada na camada de aplicação.
4. `user.branch_id` é nulo para o perfil Administrador e obrigatório para todos os demais perfis.
5. Um livro só pode ter um desconto ativo por vez; a verificação de conflito é responsabilidade da camada de aplicação.
6. `voucher.remaining_balance` é decrementado a cada uso registrado em `voucher_usage`.
7. Toda alteração em `book.sale_price` deve gerar um registro em `price_history` antes da atualização.
8. O `shelf_threshold` é único por filial (constraint `UNIQUE` em `branch_id`).
9. `book.registered_at` inicia o timer de prateleira; é definido no momento da criação do registro e nunca alterado retroativamente.
10. Imagens em `book_image` respeitam o limite de 10 por livro; esta regra é aplicada na camada de aplicação.
11. `customer_wishlist.notified` é marcado como `true` quando a notificação de chegada é disparada, evitando duplicidades.
12. O par `(user_id, role_id)` em `user_role` é único (PK composta).

## Critérios de aceitação

```gherkin
# language: pt

Funcionalidade: Modelagem de dados — integridade estrutural

  Cenário: Criação de usuário sem filial para Administrador
    Dado que um novo usuário é criado com o perfil "Administrador"
    Quando o campo "branch_id" não é informado
    Então o registro deve ser salvo com sucesso
    E o campo "branch_id" deve permanecer nulo

  Cenário: Registro de preço histórico ao alterar preço do livro
    Dado que um livro possui "sale_price = 25.00"
    Quando o preço é atualizado para "30.00"
    Então um registro em "price_history" deve ser criado
    E o campo "previous_price" deve conter "25.00"
    E o campo "new_price" deve conter "30.00"

  Cenário: Saldo do voucher decrementado após uso parcial
    Dado que um voucher possui "remaining_balance = 100.00"
    Quando um uso de "40.00" é registrado em "voucher_usage"
    Então o campo "remaining_balance" do voucher deve ser "60.00"

  Cenário: Notificação de lista de desejos marcada como notificada
    Dado que um item de "customer_wishlist" possui "notified = false"
    Quando um livro correspondente é cadastrado e a notificação é disparada
    Então "customer_wishlist.notified" deve ser marcado como "true"
    E um registro em "notification" deve ser criado para cada Gerente e Caixa da filial

  Cenário: Apenas um desconto ativo por livro
    Dado que o livro "X" possui um desconto ativo vinculado via "discount_book"
    Quando uma tentativa de vincular um segundo desconto ativo ao mesmo livro é realizada
    Então a operação deve ser rejeitada pela camada de aplicação

  Cenário: Unicidade do threshold por filial
    Dado que a filial "A" já possui um registro em "shelf_threshold"
    Quando uma tentativa de criar um segundo registro para a mesma filial é realizada
    Então a operação deve falhar por violação de constraint de unicidade
```

## Quem pode acessar

Esta é uma feature de infraestrutura. Não há interface de usuário associada a este modelo. O acesso às tabelas é feito exclusivamente via camada de aplicação (Spring Data JPA / repositórios), seguindo as regras de autorização definidas em cada módulo de negócio.

## Fora do escopo

- Emissão de NF-e / NFC-e (tabelas para dados fiscais como CNPJ do emitente, chave de acesso, etc.).
- Devolução de vendas (sem tabela de `sale_return` ou crédito automático).
- Canal de vendas online / e-commerce.
- Consignação de livros.
- Programa de fidelidade/pontos.
- Integração com API externa de busca por ISBN.
- Criação de perfis de acesso customizados.
- Entrega digital de comprovantes (e-mail, WhatsApp, SMS).
