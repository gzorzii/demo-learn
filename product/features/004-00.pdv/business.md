# PDV — Módulo 004

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo de Ponto de Venda (PDV) da livraria. Permite que o Caixa realize o atendimento completo de uma venda presencial: montagem do carrinho com leitura de código de barras ou busca manual, aplicação de descontos ativos e vouchers de crédito, seleção de um ou mais métodos de pagamento, e finalização da venda com débito automático de estoque e emissão opcional de recibo físico. O PDV é o ponto de convergência dos módulos de descontos (003-xx), vouchers (005-xx), clientes (007-xx) e métodos de pagamento (008-xx).

## Features deste módulo

| Feature | Descrição |
|---|---|
| `004-01.gerenciar-carrinho-pdv` | Caixa adiciona e remove livros do carrinho, visualizando preço original e preço com desconto ativo |
| `004-02.resgatar-voucher-pdv` | Caixa vincula cliente à venda e aplica um voucher de crédito para abater o total |
| `004-03.selecionar-pagamento-pdv` | Caixa escolhe um ou mais métodos de pagamento e informa o valor destinado a cada um |
| `004-04.finalizar-venda` | Confirma a venda, debita estoque, persiste os registros e emite recibo opcional |

## Atores envolvidos

- **Caixa** — opera o PDV na própria filial; realiza todas as etapas da venda.
- **Gerente** — acesso completo ao PDV da própria filial; pode operar como caixa.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Modelo de dados

As tabelas abaixo são definidas e gerenciadas por este módulo. Tabelas de outros módulos são apenas consumidas (nunca alteradas estruturalmente aqui).

### `sale` — Cabeçalho da venda

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `branch_id` | UUID | FK → `branch.id`; filial onde a venda foi realizada |
| `customer_id` | UUID | FK → `customer.id`; nullable — venda pode ser anônima |
| `voucher_id` | UUID | FK → `voucher.id`; nullable — voucher utilizado nesta venda |
| `voucher_amount_used` | NUMERIC(10,2) | Valor efetivamente descontado pelo voucher; 0 quando não há voucher |
| `subtotal` | NUMERIC(10,2) | Soma dos preços efetivos (com desconto) de todos os itens |
| `total` | NUMERIC(10,2) | `subtotal - voucher_amount_used` |
| `status` | TEXT | `pending` (carrinho em andamento) ou `completed` (finalizada) |
| `cashier_id` | UUID | FK → `user.id`; usuário que operou o PDV |
| `created_at` | TIMESTAMP | Data/hora de início da venda |
| `completed_at` | TIMESTAMP | Data/hora de finalização; null enquanto `status = pending` |

### `sale_item` — Itens da venda

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `sale_id` | UUID | FK → `sale.id` |
| `book_id` | UUID | FK → `book.id` |
| `original_price` | NUMERIC(10,2) | Preço de venda do livro no momento da adição ao carrinho |
| `discount_id` | UUID | FK → `discount.id`; nullable — desconto aplicado ao item |
| `effective_price` | NUMERIC(10,2) | Preço após desconto; igual a `original_price` quando não há desconto |

### `sale_payment` — Pagamentos da venda

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `sale_id` | UUID | FK → `sale.id` |
| `payment_method_id` | UUID | FK → `payment_method.id` |
| `amount` | NUMERIC(10,2) | Valor pago neste método |

## Regras de negócio gerais do módulo

1. O PDV é acessível apenas a Caixa, Gerente e Administrador.
2. O carrinho não é persistido no banco de dados enquanto a venda estiver em estado `pending` — é gerenciado como estado local do frontend. Somente ao finalizar a venda os registros são gravados no banco.
3. Uma venda finalizada (`status = completed`) é imutável — não há cancelamento, devolução ou estorno no escopo atual.
4. O estoque só é debitado no momento da finalização da venda, nunca ao adicionar itens ao carrinho.
5. Um livro sem estoque disponível não pode ser adicionado ao carrinho.
6. Apenas um voucher pode ser utilizado por venda.
7. O PDV exibe para cada item: título, preço original e preço efetivo com desconto (quando aplicável).
8. Os métodos de pagamento disponíveis são os configurados com `active = true` para a filial (módulo 008-01).
9. A soma dos valores informados nos métodos de pagamento deve ser maior ou igual ao total da venda (`total`).

## Quem pode acessar

Apenas usuários autenticados com perfil **Caixa**, **Gerente** ou **Administrador**. O módulo "PDV / Vendas" aparece no menu de navegação conforme a tabela de permissões em `000-03.home-navegacao`.

## Fora de escopo

- Cancelamento ou estorno de venda já finalizada.
- Devolução de itens.
- Nota fiscal eletrônica (NF-e/NFC-e) — dados de CPF/CNPJ são coletados para uso futuro.
- Entrega digital de recibo (e-mail, WhatsApp, SMS).
- Integração com gateway de pagamento ou TEF.
- Parcelamento de cartão de crédito.
- Desconto concedido manualmente pelo caixa (apenas descontos configurados pelo Gerente via módulo 003-xx são válidos).
- Múltiplos vouchers por venda.
- Troco calculado pelo sistema.
