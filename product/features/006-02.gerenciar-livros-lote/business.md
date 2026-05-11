# Gerenciar Livros do Lote

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que o Gerente acompanhe o progresso de catalogação de um lote de compra de usados. A tela lista todos os itens do lote com seu status de cadastro ("não cadastrado" ou "cadastrado" — com link para o livro). Para itens ainda não cadastrados, oferece um botão que inicia o fluxo de cadastro de livro com o `lot_id` pré-preenchido, garantindo o vínculo automático entre o novo livro e o lote.

## Atores envolvidos

- **Gerente** — acompanha o progresso do lote e inicia o cadastro individual de cada livro.
- **Catalogador** — pode ser acionado para cadastrar livros do lote, acessando `/books/new` com o `lot_id` passado via contexto.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. A tela exibe todos os itens de `used_book_purchase_item` vinculados ao lote.
2. Um item pode estar em dois estados:
   - **Não cadastrado:** `book_id` é nulo; o item ainda aguarda o cadastro do livro correspondente.
   - **Cadastrado:** `book_id` está preenchido; exibe título e link para a tela de visualização do livro (`/books/:id`).
3. O botão "Cadastrar livro" para itens não cadastrados navega para `/books/new` com o `lot_id` do lote pré-preenchido como parâmetro (query param ou context). Ao salvar o livro em `001-01.cadastrar-livro`, o `used_book_purchase_item` é automaticamente vinculado via `book_id`.
4. Novos itens podem ser adicionados ao lote manualmente enquanto o lote estiver "aberto", incrementando a lista de itens não cadastrados.
5. O status do lote exibido no cabeçalho é derivado da proporção de itens cadastrados: "aberto" quando há itens sem `book_id`; "concluído" quando todos os itens têm `book_id`.
6. O contador de progresso exibe "X de Y livros cadastrados" onde X é a quantidade de itens com `book_id` e Y é o total de itens do lote.
7. Não é possível remover itens do lote após o registro — o lote é imutável nesse sentido.
8. A tela também exibe os dados resumidos do lote no cabeçalho: nome do vendedor, data da compra, valor total pago, forma de pagamento e observações.

## Critérios de aceite

```gherkin
Dado que o Gerente acessa a tela de gerenciamento de um lote existente
Quando a tela é carregada
Então o cabeçalho exibe: nome do vendedor, data da compra, valor total pago, forma de pagamento e status do lote
E a lista exibe todos os itens do lote com seus respectivos status (cadastrado ou não cadastrado)
E o contador exibe "X de Y livros cadastrados"

Dado que um item do lote está com status "não cadastrado"
Quando o Gerente visualiza esse item na lista
Então o botão "Cadastrar livro" está disponível para aquele item

Dado que o Gerente clica em "Cadastrar livro" em um item não cadastrado
Quando é redirecionado para /books/new
Então o campo lot_id do formulário está pré-preenchido com o ID do lote atual
E o campo condition está pré-selecionado como "used"

Dado que o Gerente salva o livro em /books/new com lot_id informado
Quando o cadastro é concluído com sucesso
Então o item correspondente no lote passa para status "cadastrado"
E exibe o título do livro com link para /books/:id
E o contador de progresso é atualizado

Dado que todos os itens do lote estão com status "cadastrado"
Quando o Gerente visualiza a tela do lote
Então o status do lote é exibido como "concluído"

Dado que o Gerente clica em "Adicionar item ao lote"
Quando confirma a ação
Então um novo item com status "não cadastrado" é adicionado à lista
E o total Y no contador é incrementado

Dado que um item está com status "cadastrado"
Quando o Gerente clica no título do livro vinculado
Então é redirecionado para /books/:id (tela de visualização do livro)
```

## Quem pode acessar

Apenas usuários autenticados com perfil Gerente ou Administrador. Catalogadores que chegam via redirecionamento de `/books/new` (com `lot_id` no contexto) não acessam diretamente esta tela de gerenciamento — eles apenas executam o cadastro do livro.

## Fora de escopo

- Edição dos dados do lote (nome do vendedor, valor, forma de pagamento) após o registro — coberto por uma possível feature futura de edição de lote.
- Remoção de itens do lote.
- Reordenação dos itens do lote.
- Cadastro de livros diretamente nesta tela — o cadastro ocorre em `001-01.cadastrar-livro` via `/books/new`.
- Exibição de imagens dos livros cadastrados nesta tela.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Gerenciamento de livros do lote | `/purchases/:id/books` | Listar itens do lote com status de cadastro e iniciar cadastro de livros não cadastrados |

### Diagrama de navegação

```
/purchases (listagem de lotes)
  └── /purchases/:id/books (gerenciamento de livros do lote)
        ├── [clicar em "Cadastrar livro" em item não cadastrado]
        │     └── /books/new?lot_id=:id (formulário de cadastro de livro com lot_id pré-preenchido)
        │           ├── [salvar com sucesso] → /purchases/:id/books (retorna ao lote com item atualizado)
        │           └── [cancelar] → /purchases/:id/books (retorna ao lote sem alteração)
        └── [clicar no título de um livro cadastrado] → /books/:id (visualização do livro)
```

### Nota de navegação

A tela `/purchases/:id/books` é acessada diretamente após o registro de um novo lote (`006-01.registrar-compra-lote`) ou pela listagem `/purchases` ao clicar em um lote existente. Não há nova entrada de menu para esta tela — ela é parte do fluxo do módulo "Compra de Usados", cuja entrada no menu lateral já é definida em `006-01.registrar-compra-lote`.
