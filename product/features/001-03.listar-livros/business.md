# Listar Livros

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Exibe o catálogo completo de livros da filial em formato de lista, com filtros por condição, categoria e status de estoque. É o ponto central de navegação para cadastrar, editar e imprimir etiquetas. Também serve como ponto de entrada para a seleção de livros para impressão em lote de etiquetas.

## Atores envolvidos

- **Catalogador** — navega pelo catálogo, acessa cadastro e edição, seleciona livros para etiquetas.
- **Gerente** — mesmas ações do Catalogador.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.
- **Caixa** — acesso somente leitura à listagem; não vê botões de ação de edição ou etiqueta.

## Regras de negócio

1. A listagem exibe somente livros da filial do usuário autenticado (ou da filial selecionada pelo Administrador).
2. Cada item da lista exibe no mínimo: título, autor, categoria, condição (novo/usado), preço de venda e quantidade em estoque.
3. A listagem pode ser filtrada por: condição (novo/usado), categoria e faixa de preço.
4. A listagem suporta ordenação por título, preço e data de cadastro.
5. O botão "Novo Livro" está disponível para Administrador, Gerente e Catalogador e leva ao formulário de cadastro (`/books/new`).
6. Cada item da lista tem um link para a visualização detalhada do livro (`/books/:id`).
7. A seleção de livros para impressão de etiquetas é feita nesta tela — o usuário marca os livros desejados e aciona "Imprimir Etiquetas", que navega para o fluxo de impressão (`002-02.imprimir-etiquetas`). Esse controle é visível apenas para Administrador, Gerente e Catalogador.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui qualquer perfil válido
Quando acessa /books
Então o sistema exibe a lista de livros da filial do usuário

Dado que existem livros de diferentes condições na filial
Quando o usuário aplica o filtro "Condição: Usado"
Então a lista exibe somente livros com condition = used

Dado que o usuário aplica múltiplos filtros simultaneamente
Quando aciona "Filtrar"
Então a lista exibe apenas os livros que satisfazem todos os filtros combinados

Dado que o usuário possui perfil Catalogador, Gerente ou Administrador
Quando visualiza a listagem
Então o botão "Novo Livro" está vis��vel e funcional
E cada item da lista exibe o link para visualização e o controle de seleção para etiquetas

Dado que o usuário possui perfil Caixa
Quando visualiza a listagem
Então os controles de seleção para etiquetas e o botão "Novo Livro" não são exibidos

Dado que o usuário seleciona um ou mais livros e aciona "Imprimir Etiquetas"
Quando a ação é executada
Então é redirecionado para o fluxo de impressão de etiquetas com os livros selecionados

Dado que nenhum livro está cadastrado na filial
Quando o usuário acessa /books
Então o sistema exibe uma mensagem informando que não há livros cadastrados
```

## Quem pode acessar

Todos os perfis autenticados (Administrador, Gerente, Catalogador e Caixa). Funções de criação e seleção para etiquetas são restritas a Administrador, Gerente e Catalogador.

## Fora de escopo

- Exclusão de livros.
- Edição inline na listagem.
- Exportação da listagem para Excel (coberta pelos relatórios em `011-xx`).
- Busca por texto livre — coberta por `001-05.buscar-livros`.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Listagem de livros | `/books` | Exibir e filtrar o catálogo da filial; ponto de entrada para cadastro, edição e etiquetas |

### Diagrama de navegação

```
/ (home)
  └── /books (listagem de livros)
        ├── [Novo Livro] → /books/new (001-01)
        ├── [item da lista] → /books/:id (001-04)
        └── [Imprimir Etiquetas] → /labels/print?books=id1,id2,... (002-02)
```

### Nota de navegação

O menu de navegação lateral exibe a entrada "Catálogo de Livros" → "Listar Livros" para os perfis Administrador, Gerente, Catalogador e Caixa. O botão "Novo Livro" é exibido apenas para Administrador, Gerente e Catalogador.
