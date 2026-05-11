# Compra de Usados — Módulo 006

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo que cobre o fluxo completo de aquisição de lotes de livros usados de vendedores externos. Permite que o Gerente registre a compra de um lote (com valor total, forma de pagamento, dados do vendedor e filial), gerencie os livros do lote à medida que são cadastrados individualmente no catálogo, e emita um voucher de crédito para o vendedor quando aplicável.

O módulo conecta a operação financeira de compra (registro do lote e pagamento) com a operação de catalogação (cadastro individual de cada livro do lote), garantindo rastreabilidade entre a aquisição e os itens que entram no estoque.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `006-01.registrar-compra-lote` | Gerente registra um novo lote de compra de usados com dados do vendedor, valor total, forma de pagamento e emissão opcional de voucher |
| `006-02.gerenciar-livros-lote` | Visualiza os itens de um lote e controla o progresso de cadastro individual de cada livro; cada item não cadastrado pode iniciar o fluxo de cadastro |

## Atores envolvidos

- **Gerente** — responsável pela avaliação, negociação e registro de lotes de compra de livros usados; pode emitir voucher ao vendedor.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Modelo de dados

Este módulo utiliza as seguintes tabelas, já definidas em `000-01.modelagem-dados`:

**`used_book_purchase`** — Representa o lote de compra.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `branch_id` | UUID | FK → `branch.id` |
| `total_price` | NUMERIC(10,2) | Valor total pago pelo lote |
| `payment_method` | TEXT | `cash` ou `pix` |
| `seller_name` | TEXT | Nome de quem vendeu o lote |
| `purchased_by` | UUID | FK → `user.id`; Gerente responsável |
| `purchased_at` | TIMESTAMP | Data da compra |
| `notes` | TEXT | Observações gerais sobre o lote |

**`used_book_purchase_item`** — Vínculo entre o lote e os livros cadastrados.

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | UUID | PK, `uuidv7()` |
| `purchase_id` | UUID | FK → `used_book_purchase.id` |
| `book_id` | UUID | FK → `book.id`; preenchido quando o livro é cadastrado |

> O lote não armazena `estimated_quantity` explicitamente — a quantidade estimada é informada no registro e representa a expectativa de `used_book_purchase_item` a serem criados. O status "aberto" ou "concluído" do lote é derivado da comparação entre a quantidade estimada e os itens já vinculados com `book_id`.

## Regras de negócio

1. Somente o Gerente pode registrar e gerenciar lotes de compra de usados.
2. Um lote pertence sempre à filial do Gerente autenticado.
3. A forma de pagamento aceita é apenas `cash` (dinheiro) ou `pix`.
4. O vendedor do lote não precisa ser um cliente cadastrado no sistema.
5. Ao registrar o lote, o Gerente pode opcionalmente emitir um voucher de crédito para o vendedor — nesse caso, o vendedor deve ser um cliente cadastrado (feature `005-01.emitir-voucher`).
6. O lote fica com status "aberto" enquanto houver itens ainda não vinculados a um `book_id`.
7. O lote é considerado "concluído" quando todos os itens estimados estiverem vinculados a livros cadastrados.
8. Cada livro cadastrado com `lot_id` referenciando este lote gera automaticamente um `used_book_purchase_item` vinculado ao lote.
9. Nenhum documento fiscal é gerado para o vendedor no ato da compra.

## Quem pode acessar

Apenas usuários autenticados com perfil Gerente ou Administrador. A entrada no menu de navegação lateral é "Compra de Usados", visível para esses dois perfis.

## Fora de escopo

- Devolução de lotes ou cancelamento de compra após o registro.
- Compra de livros novos (módulo cobre apenas usados).
- Geração de documento fiscal (NF-e) para a transação.
- Associação do lote a um fornecedor ou empresa — o vendedor é sempre pessoa física identificada apenas por nome.
- Controle financeiro de caixa ou conciliação de pagamentos.
