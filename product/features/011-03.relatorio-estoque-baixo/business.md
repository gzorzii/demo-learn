# Relatório de Estoque Baixo

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Gerente e ao Administrador identificar livros novos cujo estoque está abaixo de um threshold configurável, facilitando a reposição de títulos antes que o estoque se esgote. O relatório lista os livros com quantidade disponível igual ou inferior ao limite informado no momento da consulta, com exportação opcional para Excel.

## Atores envolvidos

- **Gerente** — consulta e exporta o relatório da própria filial.
- **Administrador** — consulta e exporta o relatório de qualquer filial selecionada.

## Regras de negócio

1. O threshold (limite mínimo de estoque) é informado pelo usuário no momento da consulta; não há valor padrão fixo no sistema.
2. O relatório lista os livros novos (`book.condition = 'new'`) cujo `book_stock.quantity` seja menor ou igual ao threshold informado.
3. Livros usados não aparecem neste relatório — cada livro usado é um registro individual com quantidade unitária.
4. Para cada livro listado, são exibidos: título, autor, ISBN, categoria, quantidade atual em estoque e localização na prateleira (`book.shelf_location`).
5. O resultado é ordenado por quantidade em estoque de forma crescente (menor estoque primeiro) por padrão.
6. O Gerente não pode selecionar outra filial — o escopo é sempre a própria filial.
7. O Administrador seleciona a filial antes de gerar o relatório; a seleção é obrigatória (não há visão consolidada multifiliail neste relatório).
8. O resultado é somente leitura — não é possível editar preços ou estoque a partir deste relatório.
9. O relatório pode ser exportado para Excel (`.xlsx`) contendo todos os dados apresentados na tela.
10. O threshold deve ser um número inteiro positivo (maior que zero).

## Critérios de aceite

```gherkin
Funcionalidade: Relatório de livros com estoque abaixo do threshold

  Cenário: Gerente consulta estoque baixo com threshold válido
    Dado que o usuário autenticado possui perfil "Gerente"
    E existem livros novos com estoque inferior ou igual ao threshold informado
    Quando acessa "/relatorios/estoque-baixo" e informa o threshold "3"
    Então o sistema exibe a lista de livros novos com "book_stock.quantity <= 3"
    E cada linha contém: título, autor, ISBN, categoria, quantidade em estoque e localização na prateleira
    E a lista está ordenada por quantidade em estoque de forma crescente

  Cenário: Nenhum livro abaixo do threshold
    Dado que todos os livros novos da filial têm estoque superior ao threshold informado
    Quando o Gerente gera o relatório
    Então o sistema exibe lista vazia e uma mensagem indicando que não há livros abaixo do limite informado

  Cenário: Livros usados não aparecem no relatório
    Dado que a filial possui livros usados com "condition = 'used'"
    Quando o Gerente gera o relatório de estoque baixo
    Então os livros usados não aparecem na listagem, independentemente do estoque

  Cenário: Threshold inválido (zero ou negativo)
    Dado que o usuário informa o threshold "0" ou um valor negativo
    Quando tenta gerar o relatório
    Então o sistema exibe uma mensagem de erro de validação
    E o relatório não é gerado

  Cenário: Filtro de filial bloqueado para Gerente
    Dado que o usuário autenticado possui perfil "Gerente"
    Quando acessa o relatório de estoque baixo
    Então o seletor de filial não está disponível
    E os dados exibidos correspondem exclusivamente à filial do Gerente

  Cenário: Administrador seleciona filial específica
    Dado que o usuário autenticado possui perfil "Administrador"
    Quando acessa "/relatorios/estoque-baixo" e seleciona uma filial específica e informa um threshold
    Então o relatório exibe somente os livros daquela filial com estoque abaixo do limite

  Cenário: Exportação para Excel
    Dado que o relatório de estoque baixo foi gerado com dados
    Quando o usuário clica em "Exportar para Excel"
    Então o sistema oferece o download de um arquivo ".xlsx"
    E o arquivo contém todos os dados exibidos: título, autor, ISBN, categoria, quantidade e localização
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. A rota `/relatorios/estoque-baixo` é protegida e redireciona perfis sem permissão para a tela inicial.

## Fora de escopo

- Alteração de estoque ou preços a partir deste relatório.
- Relatório consolidado agregando múltiplas filiais simultaneamente.
- Threshold configurado e persistido no sistema (configuração de threshold de alerta de prateleira é coberta pelo módulo 012-xx via `shelf_threshold`; o threshold aqui é sempre informado ad hoc pelo usuário).
- Alertas automáticos ou notificações de estoque baixo.
- Exportação em formato diferente de Excel.
- Impressão de etiquetas a partir deste relatório (coberto pelo módulo 002-xx).

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Relatório de estoque baixo | `/relatorios/estoque-baixo` | Listar livros novos com estoque abaixo de um threshold informado pelo usuário |

### Diagrama de navegação

```
/ (home)
  └── /relatorios (hub de relatórios — 011-00)
        └── /relatorios/estoque-baixo
              ├── [informar threshold + gerar] → exibe resultado na mesma tela
              ├── [Exportar para Excel] → download do arquivo .xlsx
              └── [voltar] → /relatorios
```

### Entrada de navegação

A rota `/relatorios/estoque-baixo` é acessada a partir do hub de relatórios em `/relatorios`. O item "Relatórios" é exibido no menu de navegação lateral apenas para **Gerente** e **Administrador**, conforme a tabela de permissões definida em `000-03.home-navegacao`.
