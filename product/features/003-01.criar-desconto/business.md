# Criar Desconto

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que o Gerente crie um novo desconto para a filial, definindo escopo de aplicação (livro individual, categoria, autor ou faixa de preço), tipo de valor (percentual ou fixo), magnitude e período de vigência opcional. O desconto criado passa a ser considerado pelo PDV automaticamente ao escanear livros afetados.

## Atores envolvidos

- **Gerente** — cria descontos para a própria filial.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. Apenas Gerente e Administrador podem criar descontos.
2. O escopo é obrigatório e imutável após a criação. Valores possíveis:
   - `book` — um ou mais livros individuais selecionados explicitamente.
   - `category` — todos os livros de uma categoria da filial.
   - `author` — todos os livros de um autor da filial.
   - `price_range` — todos os livros cujo preço de venda esteja entre `min_price` e `max_price` (inclusive).
3. O tipo de valor é obrigatório: `percentage` (%) ou `fixed` (R$).
4. O valor do desconto deve ser positivo. Para `percentage`, o valor máximo é 100.
5. As datas de início (`starts_at`) e fim (`ends_at`) são opcionais. Quando não informadas:
   - Sem `starts_at`: o desconto entra em vigor imediatamente ao ser salvo.
   - Sem `ends_at`: o desconto não expira automaticamente (vigente até ser removido).
6. Se `ends_at` for informado, deve ser posterior a `starts_at` (ou ao momento atual, se `starts_at` não for informado).
7. Ao selecionar escopo `book`, o usuário deve selecionar ao menos um livro. A seleção é feita por busca/autocomplete pelo título ou ISBN dentro da filial.
8. Um livro só pode ter um desconto ativo por vez. Se algum livro da seleção (scope `book`) ou coberto pelo escopo (scope `category`, `author`, `price_range`) já possuir desconto ativo vigente, o sistema bloqueia a criação e indica quais livros estão em conflito.
9. A verificação de conflito considera descontos já existentes cujos períodos de vigência se sobrepõem ao período do novo desconto.
10. O desconto é criado com `active = true` e vinculado à filial do usuário autenticado.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Gerente ou Administrador
Quando acessa /discounts/new
Então o formulário exibe os campos: escopo, tipo de valor, valor, data de início (opcional), data de fim (opcional)
E o campo adicional de seleção de livros aparece quando o escopo "Livro individual" é selecionado
E o campo de categoria aparece quando o escopo "Categoria" é selecionado
E o campo de autor aparece quando o escopo "Autor" é selecionado
E os campos de preço mínimo e preço máximo aparecem quando o escopo "Faixa de preço" é selecionado

Dado que o usuário seleciona escopo "Livro individual" e adiciona livros ao seletor
Quando aciona "Salvar"
Então o sistema cria o registro em discount com scope = book
E cria os vínculos em discount_book para cada livro selecionado

Dado que o usuário informa data de fim anterior à data de início
Quando aciona "Salvar"
Então o sistema exibe erro de validação "A data de fim deve ser posterior à data de início"
E não cria o desconto

Dado que um dos livros selecionados já possui um desconto ativo com período de vigência sobreposto
Quando o usuário aciona "Salvar"
Então o sistema bloqueia a criação
E exibe a lista de livros em conflito com seus respectivos descontos ativos

Dado que o usuário informa valor percentual maior que 100
Quando aciona "Salvar"
Então o sistema exibe erro de validação "O percentual de desconto não pode exceder 100%"

Dado que o usuário preenche todos os campos válidos sem conflitos
Quando aciona "Salvar"
Então o sistema cria o desconto com active = true vinculado à filial
E redireciona para /discounts (listagem) com o novo desconto visível

Dado que o usuário aciona "Cancelar" antes de salvar
Quando confirma o cancelamento
Então é redirecionado para /discounts sem criar nenhum registro
```

## Quem pode acessar

Apenas usuários autenticados com perfil Gerente ou Administrador.

## Fora de escopo

- Edição de um desconto após a criação (a feature de edição não existe — remover e recriar é o fluxo).
- Duplicação ou cópia de descontos existentes.
- Importação de descontos em lote via arquivo.
- Cupons ou códigos de desconto inseridos pelo cliente.
- Descontos aplicáveis entre filiais.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Formulário de criação de desconto | `/discounts/new` | Preencher e salvar os dados de um novo desconto |

### Diagrama de navegação

```
/ (home) ou /discounts (listagem)
  └── /discounts/new (formulário de criação)
        ├── [escopo "book" selecionado] → exibe seletor de livros (inline, mesma tela)
        ├── [salvar com sucesso] → /discounts (listagem com novo desconto)
        ├── [cancelar] → /discounts (listagem)
        └── [erro de validação / conflito] → permanece em /discounts/new com mensagens de erro
```

### Nota de navegação

O acesso ao formulário de criação vem do botão "Novo Desconto" na listagem `/discounts` (feature `003-02.listar-descontos`). A entrada "Gestão de Descontos" no menu lateral é visível apenas para Administrador e Gerente, conforme `000-03.home-navegacao`.
