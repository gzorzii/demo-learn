# Relatório de Livros Vendidos

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Gerente e ao Administrador visualizar quais livros foram mais vendidos em um período selecionado, com a quantidade total de unidades vendidas e a receita gerada por cada título. O relatório apoia decisões de reposição de estoque e identificação dos títulos de maior saída na filial.

## Atores envolvidos

- **Gerente** — consulta e exporta o relatório da própria filial.
- **Administrador** — consulta e exporta o relatório de qualquer filial selecionada.

## Regras de negócio

1. O período de consulta (data inicial e data final) é obrigatório para gerar o relatório.
2. O relatório agrupa as vendas por livro (título + autor) e exibe, para cada título:
   - Quantidade total de unidades vendidas no período (soma de `sale_item.quantity`).
   - Receita gerada pelo título no período (soma de `sale_item.discounted_price × quantity`).
3. Os resultados são ordenados por quantidade vendida de forma decrescente (mais vendidos primeiro) por padrão.
4. O usuário pode alterar a ordenação para receita gerada (decrescente).
5. O Gerente não pode selecionar outra filial — o escopo é sempre a própria filial.
6. O Administrador seleciona a filial antes de gerar o relatório; a seleção é obrigatória (não há visão consolidada multifiliail neste relatório).
7. O resultado é somente leitura — não é possível editar ou cancelar vendas a partir deste relatório.
8. O relatório pode ser exportado para Excel (`.xlsx`) contendo todos os dados apresentados na tela.
9. A receita calculada usa `discounted_price` (preço com desconto aplicado), que é igual ao preço original quando não há desconto.

## Critérios de aceite

```gherkin
Funcionalidade: Relatório de livros mais vendidos no período

  Cenário: Gerente consulta livros mais vendidos com período válido
    Dado que o usuário autenticado possui perfil "Gerente"
    E existem vendas registradas para a filial no período selecionado
    Quando acessa "/relatorios/livros-vendidos" e informa data inicial e data final válidas
    Então o sistema exibe a lista de livros vendidos no período
    E cada linha contém: título, autor, quantidade vendida e receita gerada
    E a lista é ordenada por quantidade vendida de forma decrescente por padrão

  Cenário: Ordenar por receita gerada
    Dado que o relatório de livros vendidos foi gerado com dados
    Quando o usuário seleciona a ordenação por "Receita"
    Então a lista é reordenada do maior para o menor valor de receita gerada

  Cenário: Relatório sem vendas no período
    Dado que não há vendas registradas para a filial no período informado
    Quando o Gerente gera o relatório
    Então o sistema exibe lista vazia e uma mensagem indicando ausência de vendas no período

  Cenário: Filtro de filial bloqueado para Gerente
    Dado que o usuário autenticado possui perfil "Gerente"
    Quando acessa o relatório de livros vendidos
    Então o seletor de filial não está disponível
    E os dados exibidos correspondem exclusivamente à filial do Gerente

  Cenário: Administrador seleciona filial específica
    Dado que o usuário autenticado possui perfil "Administrador"
    Quando acessa "/relatorios/livros-vendidos" e seleciona uma filial específica
    Então o relatório exibe os dados de vendas somente daquela filial

  Cenário: Período inválido
    Dado que o usuário informa data final anterior à data inicial
    Quando tenta gerar o relatório
    Então o sistema exibe uma mensagem de erro de validação de período
    E o relatório não é gerado

  Cenário: Exportação para Excel
    Dado que o relatório de livros vendidos foi gerado com dados
    Quando o usuário clica em "Exportar para Excel"
    Então o sistema oferece o download de um arquivo ".xlsx"
    E o arquivo contém todos os dados exibidos: título, autor, quantidade vendida e receita gerada
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. A rota `/relatorios/livros-vendidos` é protegida e redireciona perfis sem permissão para a tela inicial.

## Fora de escopo

- Detalhamento das transações individuais em que cada livro foi vendido.
- Relatório consolidado agregando múltiplas filiais simultaneamente.
- Filtro por categoria ou autor (apenas agrupamento por título e autor).
- Exportação em formato diferente de Excel.
- Impressão de etiquetas a partir deste relatório (coberto pelo módulo 002-xx).

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Relatório de livros vendidos | `/relatorios/livros-vendidos` | Consultar os livros mais vendidos no período com quantidade e receita |

### Diagrama de navegação

```
/ (home)
  └── /relatorios (hub de relatórios — 011-00)
        └── /relatorios/livros-vendidos
              ├── [preencher período + gerar] → exibe resultado na mesma tela
              ├── [alterar ordenação] → atualiza lista na mesma tela
              ├── [Exportar para Excel] → download do arquivo .xlsx
              └── [voltar] → /relatorios
```

### Entrada de navegação

A rota `/relatorios/livros-vendidos` é acessada a partir do hub de relatórios em `/relatorios`. O item "Relatórios" é exibido no menu de navegação lateral apenas para **Gerente** e **Administrador**, conforme a tabela de permissões definida em `000-03.home-navegacao`.
