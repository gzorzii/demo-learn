# Consultar Histórico de Preços

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que Gerentes e Administradores consultem todas as alterações de preço de venda registradas para um livro específico ou para um conjunto de livros filtrado por título, autor e período. Serve como ferramenta de auditoria e análise de precificação, exibindo em ordem cronológica decrescente cada mudança com o preço anterior, novo preço, data e o usuário responsável.

## Atores envolvidos

- **Gerente** — consulta o histórico de livros da própria filial.
- **Administrador** — consulta o histórico de livros de qualquer filial.

## Regras de negócio

1. A consulta é estritamente somente leitura — nenhum registro pode ser criado, editado ou excluído por esta tela.
2. O acesso à tela é restrito a Gerente e Administrador. Qualquer tentativa de acesso por Catalogador ou Caixa deve ser negada.
3. O Gerente só visualiza o histórico de livros pertencentes à sua própria filial. O Administrador visualiza o histórico de todas as filiais.
4. A tela suporta dois pontos de entrada:
   - **A partir do livro:** acesso direto via botão na tela de visualização do livro (`/books/:id`), mostrando somente o histórico daquele registro específico.
   - **Relatório geral:** acesso via menu de navegação, apresentando um formulário de pesquisa com filtros por título, autor e período.
5. A busca por título ou autor retorna registros de `price_history` de todos os livros (`book`) cujo campo correspondente contenha o texto informado, independentemente de serem registros distintos (ex.: múltiplas entradas de livros usados com o mesmo título).
6. O filtro de período aplica-se ao campo `changed_at` dos registros de `price_history`.
7. Os resultados são exibidos em ordem cronológica decrescente (alteração mais recente primeiro).
8. Cada linha do histórico exibe: título do livro, preço anterior, novo preço, data e hora da alteração, e nome do usuário que realizou a mudança.
9. Quando a consulta parte de um livro específico (`/books/:id/price-history`), o título do livro é exibido no cabeçalho da tela e o filtro de texto fica pré-preenchido e bloqueado com o título daquele registro.
10. A tela exibe uma mensagem informativa quando nenhum registro de histórico é encontrado para os filtros aplicados.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Gerente
E acessa a tela de histórico de preços de um livro da própria filial
Quando a tela é carregada
Então são exibidas todas as alterações de preço daquele livro em ordem cronológica decrescente
E cada linha exibe: título do livro, preço anterior, novo preço, data/hora da alteração e nome do usuário responsável

Dado que o usuário autenticado possui perfil Gerente
Quando tenta acessar o histórico de preços de um livro de outra filial
Então o sistema nega o acesso e exibe mensagem de erro de permissão

Dado que o usuário autenticado possui perfil Catalogador ou Caixa
Quando tenta acessar a rota /price-history ou /books/:id/price-history
Então é redirecionado para a tela inicial ou para uma tela de acesso negado

Dado que o usuário acessa o relatório geral de histórico de preços
E informa "Dom Casmurro" no campo título e um período de 01/01/2025 a 31/03/2025
Quando aciona "Buscar"
Então o sistema exibe todas as alterações de preço de todos os registros de livros cujo título contenha "Dom Casmurro"
E cujo changed_at esteja dentro do período informado

Dado que o usuário acessa o relatório geral de histórico de preços
E não informa nenhum filtro
Quando aciona "Buscar"
Então o sistema exibe todas as alterações de preço da filial do usuário (ou de todas as filiais, se Administrador)

Dado que nenhuma alteração de preço foi registrada para os filtros aplicados
Quando a busca retorna vazio
Então o sistema exibe a mensagem "Nenhuma alteração de preço encontrada para os filtros aplicados"

Dado que o usuário autenticado possui perfil Administrador
Quando acessa o relatório geral de histórico de preços
Então pode consultar registros de qualquer filial sem restrição de escopo
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** (restrito à própria filial) ou **Administrador** (acesso global). Catalogador e Caixa não têm acesso a esta feature.

## Fora de escopo

- Criação, edição ou exclusão de registros de histórico de preços.
- Exportação do resultado para Excel (coberta por `011-xx.relatorios`).
- Histórico de alterações em outros campos do livro além de `sale_price`.
- Comparação gráfica ou visualização de tendência de preços.
- Filtro por filial específica na interface — o escopo é definido pelo perfil do usuário autenticado.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Histórico de preços de um livro | `/books/:id/price-history` | Exibir todas as alterações de preço de um livro específico, com cabeçalho identificando o livro |
| Relatório geral de histórico de preços | `/price-history` | Formulário de pesquisa com filtros por título, autor e período; exibe resultados consolidados |

### Diagrama de navegação

```
/ (home)
  └── /price-history (relatório geral — entrada pelo menu)
        ├── [buscar] → /price-history (mesma tela, resultados atualizados)
        └── [limpar filtros] → /price-history (estado inicial sem resultados)

/books/:id (visualização do livro)
  └── /books/:id/price-history (histórico do livro específico)
        └── [voltar] → /books/:id (visualização do livro)
```

### Nota de navegação

O menu de navegação lateral exibe a entrada "Histórico de Preços" para os perfis **Gerente** e **Administrador**, conforme a tabela de permissões definida em `000-03.home-navegacao`. O acesso ao histórico de um livro individual ocorre pelo botão "Ver Histórico de Preços" presente na tela de visualização do livro (`/books/:id`), visível apenas para Gerente e Administrador.

## Questões em aberto

- O botão "Ver Histórico de Preços" em `/books/:id` deve ser exibido mesmo quando o livro não possui nenhuma alteração de preço registrada (ou seja, o preço nunca foi alterado desde o cadastro)?
