# Listar Livros Vencidos em Prateleira

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Exibe ao Gerente e ao Administrador a lista de todos os livros que atualmente excedem o prazo de permanência em estoque configurado para a filial (`shelf_threshold.days_threshold`). Permite identificar rapidamente quais títulos estão parados há mais tempo do que o aceitável, com informações sobre o livro, dias em estoque e filial, para que ações corretivas possam ser tomadas (ex.: aplicar desconto, realocar, etc.).

## Atores envolvidos

- **Gerente** — visualiza apenas os livros vencidos da própria filial.
- **Administrador** — visualiza os livros vencidos de qualquer filial; pode filtrar por filial.

## Regras de negócio

1. Um livro é exibido nesta lista quando o tempo em prateleira (dias desde `book.registered_at` até hoje) é estritamente maior que o `days_threshold` configurado para a filial do livro — conforme definido em `012-00.tempo-prateleira`.
2. Apenas livros com `book.active = true` e `book_stock.quantity > 0` são considerados vencidos para esta listagem.
3. Filiais sem `shelf_threshold` configurado não geram itens na lista.
4. O Gerente visualiza exclusivamente os livros da sua própria filial.
5. O Administrador visualiza os livros vencidos de todas as filiais por padrão e pode filtrar por filial específica.
6. Para cada livro vencido, a listagem exibe: título, autor, categoria, condição (novo/usado), preço de venda, dias em prateleira e nome da filial.
7. A lista é ordenada por padrão por número de dias em prateleira de forma decrescente (mais antigos primeiro).
8. Os dias em prateleira são calculados no momento em que a tela é carregada — não são valores pré-computados persistidos.
9. Livros recém-vendidos (que zeraram o estoque) desaparecem automaticamente da lista no próximo carregamento.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Gerente
E a filial possui shelf_threshold.days_threshold = 30
E existem 3 livros com tempo em prateleira > 30 dias, active = true e quantity > 0
Quando acessa a tela de livros vencidos em prateleira
Então a lista exibe os 3 livros
E cada item exibe: título, autor, categoria, condição, preço de venda, dias em prateleira e filial
E a lista está ordenada por dias em prateleira de forma decrescente

Dado que o usuário autenticado possui perfil Gerente
E a filial não possui shelf_threshold configurado
Quando acessa a tela de livros vencidos em prateleira
Então a tela exibe mensagem informando que o prazo de prateleira não está configurado para a filial
E a lista permanece vazia

Dado que o usuário autenticado possui perfil Gerente
E todos os livros da filial possuem tempo em prateleira <= days_threshold
Quando acessa a tela de livros vencidos em prateleira
Então a tela exibe mensagem indicando que não há livros vencidos no momento

Dado que o usuário autenticado possui perfil Administrador
E existem livros vencidos em múltiplas filiais
Quando acessa a tela de livros vencidos em prateleira sem aplicar filtro de filial
Então a lista exibe os livros vencidos de todas as filiais
E cada item exibe o nome da filial correspondente

Dado que o usuário autenticado possui perfil Administrador
Quando seleciona uma filial específica no filtro
Então a lista exibe apenas os livros vencidos daquela filial

Dado que um livro estava na lista de vencidos
Quando o livro é vendido e seu estoque chega a zero
E o usuário recarrega a tela de livros vencidos
Então o livro não aparece mais na lista

Dado que o usuário autenticado possui perfil Gerente
Quando acessa a rota /shelf-overdue
Então visualiza apenas livros da sua própria filial
E não visualiza livros de outras filiais

Dado que o usuário autenticado possui apenas perfil Catalogador ou Caixa
Quando tenta acessar diretamente a rota /shelf-overdue
Então é redirecionado para a home ou tela de acesso negado
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**.

## Fora de escopo

- Ações sobre os livros vencidos a partir desta tela (ex.: aplicar desconto, inativar, mover para promoção) — a tela é somente leitura; ações ocorrem em seus respectivos módulos.
- Configuração do prazo de prateleira — coberta por `010-02.editar-filial`.
- Notificações automáticas de vencimento — cobertas por `014-01.central-notificacoes`.
- Exportação da lista para Excel — fora do escopo desta feature; relatórios são cobertos pelo módulo 011.
- Histórico de livros que já foram vencidos e depois vendidos.
- Filtro por título, autor ou categoria nesta listagem.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Lista de livros vencidos em prateleira | `/shelf-overdue` | Exibir todos os livros que excedem o prazo de prateleira da filial, com dias em estoque e informações do livro |

### Diagrama de navegação

```
/ (home)
  └── /shelf-overdue (lista de livros vencidos)
        ├── [clica no livro] → /books/:id (visualizar livro — feature 001-04)
        └── [sem ação de saída adicional] → permanece em /shelf-overdue
```

### Nota de navegação

A entrada "Tempo em Prateleira" deve constar no menu de navegação lateral, acessível para os perfis **Gerente** e **Administrador**, conforme a tabela de permissões definida em `000-03.home-navegacao` (linha "Tempo em prateleira" já prevista). O acesso à tela de detalhe do livro (`/books/:id`) reaproveitado da feature `001-04.visualizar-livro` é opcional — a tela de vencidos é funcional como listagem independente.
