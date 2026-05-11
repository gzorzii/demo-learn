# Cadastrar Livro

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que Catalogadores e Gerentes registrem um novo livro no catálogo da filial. O cadastro abrange livros novos e usados, com preenchimento assistido via ISBN (busca interna) e vínculo opcional a um lote de compra de usados previamente registrado.

## Atores envolvidos

- **Catalogador** — preenche os dados do livro e salva o registro.
- **Gerente** — preenche os dados e define o preço de venda.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. Todo livro pertence à filial do usuário autenticado (ou à filial selecionada pelo Administrador).
2. Campos obrigatórios: título, autor, ISBN, categoria, condição (`new` ou `used`) e preço de venda.
3. O campo `condition_description` é obrigatório quando a condição for `used`; registra avarias visíveis (marcas de caneta/lápis, páginas faltando, capa rasgada etc.).
4. Ao informar o ISBN, o sistema pesquisa registros internos com aquele ISBN e pré-preenche título, autor, editora, ano e categoria. O usuário pode alterar qualquer campo pré-preenchido. Sempre é criado um registro novo e independente.
5. Livros novos (`condition = new`) têm quantidade de estoque informada no cadastro (mínimo 1).
6. Livros usados (`condition = used`) têm quantidade implícita igual a 1 — não há campo de quantidade editável.
7. O preço de venda deve ser um valor positivo.
8. A localização física na prateleira (`shelf_location`) é um campo opcional de texto livre.
9. O campo `lot_id` (lote de origem) é opcional e só aceita o ID de um lote existente em `used_book_purchase`. Quando informado, o livro será vinculado a esse lote via `used_book_purchase_item`. Esse campo é pré-preenchido quando o usuário acessa o formulário a partir de `006-02.gerenciar-livros-lote`.
10. Ao salvar, o sistema registra `registered_at` com o timestamp atual — esse campo inicia o timer de tempo em prateleira e nunca é alterado retroativamente.
11. Se o livro cadastrado corresponder a algum item da lista de desejos de um cliente da mesma filial (por título, autor ou ISBN), uma notificação `book_arrival` é gerada para os perfis Gerente e Caixa da filial.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Catalogador, Gerente ou Administrador
Quando acessa o formulário de cadastro de livro
Então o formulário exibe os campos: título, autor, ISBN, editora, ano, categoria, condição, descrição de condição, preço de venda, quantidade (apenas para novos), localização, descrição geral e lote de origem

Dado que o usuário informa um ISBN já presente no catálogo interno
Quando o campo ISBN perde o foco ou o usuário aciona a busca
Então o sistema pré-preenche título, autor, editora, ano e categoria com os dados do registro mais recente com aquele ISBN
E exibe uma mensagem informando que os campos foram pré-preenchidos
E permite que o usuário edite qualquer campo

Dado que o usuário seleciona condição "used"
Quando o formulário é exibido
Então o campo "Descrição de condição" se torna obrigatório e visível

Dado que o usuário preenche todos os campos obrigatórios corretamente
Quando aciona "Salvar"
Então o sistema cria o registro do livro
E registra o timestamp atual em registered_at
E redireciona para a tela de visualização do livro recém-cadastrado

Dado que o usuário informa um lot_id válido de um lote existente
Quando o cadastro é salvo com sucesso
Então o livro é vinculado ao lote via used_book_purchase_item

Dado que o livro cadastrado corresponde a um item da lista de desejos de um cliente da filial
Quando o cadastro é salvo com sucesso
Então notificações book_arrival são geradas para todos os Gerentes e Caixas da filial

Dado que o usuário tenta salvar sem preencher campos obrigatórios
Quando aciona "Salvar"
Então o sistema exibe mensagens de erro nos campos inválidos
E não cria o registro
```

## Quem pode acessar

Apenas usuários autenticados com perfil Administrador, Gerente ou Catalogador.

## Fora de escopo

- Importação em lote via arquivo (CSV, Excel etc.).
- Busca de ISBN em APIs externas.
- Definição de múltiplos preços por livro (ex.: preço de tabela vs. preço de venda).
- Upload de imagens nesta tela — gerenciado em `001-06.gerenciar-imagens-livro`.
- Edição de livros existentes — coberto por `001-02.editar-livro`.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Formulário de cadastro de livro | `/books/new` | Preencher e salvar os dados de um novo livro |

### Diagrama de navegação

```
/ (home) ou /books (listagem) ou /purchases/:id/books (lote)
  └── /books/new (formulário de cadastro)
        ├── [ISBN informado] → busca interna → pré-preenche campos (permanece na mesma tela)
        ├── [salvar com sucesso] → /books/:id (visualização do livro criado)
        ├── [cancelar] → tela de origem (home, listagem ou gerenciamento do lote)
        └── [erro de validação] → permanece em /books/new com mensagens de erro
```

### Nota de navegação

O acesso padrão vem do botão "Novo Livro" na listagem `/books` (feature `001-03.listar-livros`). Quando acionado a partir de `006-02.gerenciar-livros-lote`, o campo `lot_id` é pré-preenchido via parâmetro de rota ou query param. A entrada no menu de navegação lateral é "Catálogo de Livros", visível para Administrador, Gerente e Catalogador.
