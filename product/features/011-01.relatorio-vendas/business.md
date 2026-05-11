# Relatório de Vendas

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Gerente e ao Administrador consultar o total de vendas realizadas em um período selecionado, com discriminação por método de pagamento utilizado. O relatório responde à pergunta "quanto a filial vendeu neste período e por quais meios de pagamento?", apoiando decisões gerenciais sobre desempenho financeiro da unidade.

## Atores envolvidos

- **Gerente** — consulta e exporta o relatório da própria filial.
- **Administrador** — consulta e exporta o relatório de qualquer filial selecionada.

## Regras de negócio

1. O período de consulta (data inicial e data final) é obrigatório para gerar o relatório.
2. O relatório exibe o total geral de vendas no período (soma de `sale.total_amount`).
3. O relatório exibe o total de descontos concedidos no período (soma de `sale.discount_amount`).
4. O relatório exibe o valor líquido recebido por cada método de pagamento (`payment_method.name`), calculado a partir dos registros em `sale_payment`.
5. O relatório exibe o número total de transações de venda realizadas no período.
6. O Gerente não pode selecionar outra filial — o escopo é sempre a própria filial.
7. O Administrador seleciona a filial antes de gerar o relatório; a seleção de filial é obrigatória (não há visão consolidada multifiliail neste relatório).
8. O resultado é somente leitura — não é possível editar ou cancelar vendas a partir deste relatório.
9. O relatório pode ser exportado para Excel (`.xlsx`) contendo todos os dados apresentados na tela.
10. Vendas com voucher aparecem com o método de pagamento "Voucher" discriminado no breakdown.

## Critérios de aceite

```gherkin
Funcionalidade: Relatório de vendas por período

  Cenário: Gerente consulta relatório com período válido
    Dado que o usuário autenticado possui perfil "Gerente"
    E existem vendas registradas para a filial no período selecionado
    Quando acessa "/relatorios/vendas" e informa data inicial e data final válidas
    Então o sistema exibe o total geral de vendas do período
    E exibe o total de descontos concedidos
    E exibe o número de transações realizadas
    E exibe o valor recebido discriminado por cada método de pagamento utilizado

  Cenário: Relatório sem vendas no período
    Dado que não há vendas registradas para a filial no período informado
    Quando o Gerente gera o relatório
    Então o sistema exibe valores zerados e uma mensagem indicando ausência de vendas no período

  Cenário: Filtro de filial bloqueado para Gerente
    Dado que o usuário autenticado possui perfil "Gerente"
    Quando acessa o relatório de vendas
    Então o seletor de filial não está disponível
    E os dados exibidos correspondem exclusivamente à filial do Gerente

  Cenário: Administrador seleciona filial específica
    Dado que o usuário autenticado possui perfil "Administrador"
    Quando acessa "/relatorios/vendas" e seleciona uma filial específica
    Então o relatório exibe os dados de vendas somente daquela filial

  Cenário: Período inválido (data final anterior à data inicial)
    Dado que o usuário informa data final anterior à data inicial
    Quando tenta gerar o relatório
    Então o sistema exibe uma mensagem de erro de validação de período
    E o relatório não é gerado

  Cenário: Exportação para Excel
    Dado que o relatório de vendas foi gerado com dados
    Quando o usuário clica em "Exportar para Excel"
    Então o sistema oferece o download de um arquivo ".xlsx"
    E o arquivo contém todos os dados exibidos na tela: totais, descontos, número de transações e breakdown por método de pagamento
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. A rota `/relatorios/vendas` é protegida e redireciona perfis sem permissão para a tela inicial.

## Fora de escopo

- Cancelamento ou estorno de vendas a partir deste relatório.
- Detalhamento de itens vendidos por transação individual (coberto por `011-02.relatorio-livros-vendidos`).
- Relatório consolidado agregando múltiplas filiais simultaneamente.
- Filtro por operador (caixa responsável pela venda).
- Exportação em formato diferente de Excel.

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Relatório de vendas | `/relatorios/vendas` | Consultar total de vendas do período com breakdown por método de pagamento |

### Diagrama de navegação

```
/ (home)
  └── /relatorios (hub de relatórios — 011-00)
        └── /relatorios/vendas
              ├── [preencher período + gerar] → exibe resultado na mesma tela
              ├── [Exportar para Excel] → download do arquivo .xlsx
              └── [voltar] → /relatorios
```

### Entrada de navegação

A rota `/relatorios/vendas` é acessada a partir do hub de relatórios em `/relatorios`. O item "Relatórios" é exibido no menu de navegação lateral apenas para **Gerente** e **Administrador**, conforme a tabela de permissões definida em `000-03.home-navegacao`.
