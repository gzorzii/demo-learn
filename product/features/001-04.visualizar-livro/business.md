# Visualizar Livro

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Exibe o registro completo de um livro, incluindo todos os metadados, imagens e localização física na prateleira. Serve como ponto central de consulta para atendimento ao cliente (mostrar fotos, verificar condição e preço) e como hub de navegação para edição e gerenciamento de imagens.

## Atores envolvidos

- **Catalogador** — consulta o livro e acessa edição e gerenciamento de imagens.
- **Gerente** — consulta o livro e acessa edição, gerenciamento de imagens e histórico de preços.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.
- **Caixa** — acesso somente leitura; não vê botões de edição.

## Regras de negócio

1. Somente livros pertencentes à filial do usuário autenticado (ou da filial selecionada pelo Administrador) podem ser visualizados.
2. A tela exibe: título, autor, ISBN, editora, ano, categoria, condição, descrição de condição (se usado), preço de venda, quantidade em estoque, localização física, descrição geral, data de cadastro e galeria de imagens.
3. A galeria de imagens respeita a ordem definida em `book_image.order`; exibe até 10 imagens.
4. O botão "Editar" é exibido somente para Administrador, Gerente e Catalogador.
5. O botão "Gerenciar Imagens" é exibido para todos os perfis autenticados (qualquer usuário pode adicionar ou remover imagens de um registro).
6. O link para o histórico de preços é exibido somente para Gerente e Administrador.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado acessa /books/:id
Quando o livro pertence à filial do usuário
Então o sistema exibe todos os campos do registro: título, autor, ISBN, editora, ano, categoria, condição, descrição de condição, preço de venda, quantidade em estoque, localização, descrição geral, data de cadastro e galeria de imagens

Dado que o livro possui imagens cadastradas
Quando a tela é exibida
Então as imagens aparecem na ordem definida por book_image.order

Dado que o usuário possui perfil Caixa
Quando visualiza a tela do livro
Então os botões "Editar" e link para histórico de preços não são exibidos
E o botão "Gerenciar Imagens" é exibido

Dado que o usuário possui perfil Gerente ou Administrador
Quando visualiza a tela do livro
Então os botões "Editar", "Gerenciar Imagens" e link para "Histórico de Preços" são exibidos

Dado que o usuário tenta acessar /books/:id de um livro de outra filial
Quando a requisição é processada
Então o sistema retorna erro de permissão

Dado que o ID informado na rota não corresponde a nenhum livro
Quando o usuário acessa /books/:id
Então o sistema exibe uma mensagem de "livro não encontrado"
```

## Quem pode acessar

Todos os perfis autenticados (Administrador, Gerente, Catalogador e Caixa), restritos à própria filial (exceto Administrador).

## Fora de escopo

- Edição inline de campos na tela de visualização.
- Exibição do histórico de preços diretamente nesta tela (link para `013-01.consultar-historico-precos`).
- Portal de consulta para clientes (o sistema é staff-only).

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Visualização de livro | `/books/:id` | Exibir registro completo do livro com imagens e ações disponíveis |

### Diagrama de navegação

```
/books (listagem) ou resultado de busca
  └── /books/:id (visualização do livro)
        ├── [Editar] → /books/:id/edit (001-02) [Administrador, Gerente, Catalogador]
        ├── [Gerenciar Imagens] → /books/:id/images (001-06) [todos os perfis]
        ├── [Histórico de Preços] → /books/:id/price-history (013-01) [Gerente, Administrador]
        └── [Voltar] → /books (listagem)
```

### Nota de navegação

Acessado a partir da listagem `/books` (feature `001-03`), dos resultados de busca (feature `001-05`) e do retorno do cadastro bem-sucedido (feature `001-01`). Não possui entrada direta no menu de navegação — é acessado contextualmente a partir da listagem ou busca.
