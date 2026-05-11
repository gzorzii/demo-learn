# Relatório de Vouchers

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Gerente e ao Administrador visualizar a situação dos vouchers de crédito (trade-in) emitidos pela filial em um período selecionado, com discriminação entre vouchers emitidos, utilizados (ao menos parcialmente) e esgotados (saldo zerado). O relatório apoia a gestão do crédito concedido a clientes e o acompanhamento do passivo de vouchers em aberto.

## Atores envolvidos

- **Gerente** — consulta e exporta o relatório da própria filial.
- **Administrador** — consulta e exporta o relatório de qualquer filial selecionada.

## Regras de negócio

1. O período de consulta (data inicial e data final) filtra os vouchers pela data de emissão (`voucher.issued_at`); é obrigatório para gerar o relatório.
2. O relatório exibe três grupos de vouchers emitidos no período:
   - **Emitidos** — todos os vouchers com `issued_at` dentro do período, independentemente do status atual.
   - **Utilizados** — vouchers que possuem ao menos um registro em `voucher_usage` (foram usados ao menos uma vez, parcial ou totalmente).
   - **Esgotados** — vouchers com `remaining_balance = 0` (saldo totalmente consumido).
3. Para cada voucher listado, são exibidos: código do voucher, nome do cliente vinculado, valor inicial, saldo restante e data de emissão.
4. O relatório exibe totalizadores no topo: quantidade de vouchers emitidos no período, valor total emitido, valor total utilizado e saldo total ainda em aberto.
5. O Gerente não pode selecionar outra filial — o escopo é sempre a própria filial.
6. O Administrador seleciona a filial antes de gerar o relatório; a seleção é obrigatória (não há visão consolidada multifiliail neste relatório).
7. O resultado é somente leitura — não é possível emitir ou cancelar vouchers a partir deste relatório.
8. O relatório pode ser exportado para Excel (`.xlsx`) contendo todos os dados apresentados na tela, incluindo os totalizadores.
9. Como vouchers não possuem prazo de validade no sistema (regra do módulo 005), o grupo "Expirados" não existe neste relatório.

## Critérios de aceite

```gherkin
Funcionalidade: Relatório de vouchers por período

  Cenário: Gerente consulta relatório de vouchers com período válido
    Dado que o usuário autenticado possui perfil "Gerente"
    E existem vouchers emitidos pela filial no período selecionado
    Quando acessa "/relatorios/vouchers" e informa data inicial e data final válidas
    Então o sistema exibe os totalizadores: quantidade emitida, valor total emitido, valor total utilizado e saldo em aberto
    E exibe a lista de vouchers emitidos no período
    E cada linha contém: código do voucher, nome do cliente, valor inicial, saldo restante e data de emissão

  Cenário: Filtrar apenas vouchers utilizados
    Dado que o relatório de vouchers foi gerado
    Quando o usuário aplica o filtro "Utilizados"
    Então apenas vouchers com ao menos um registro em "voucher_usage" são exibidos

  Cenário: Filtrar apenas vouchers esgotados
    Dado que o relatório de vouchers foi gerado
    Quando o usuário aplica o filtro "Esgotados"
    Então apenas vouchers com "remaining_balance = 0" são exibidos

  Cenário: Relatório sem vouchers no período
    Dado que não há vouchers emitidos pela filial no período informado
    Quando o Gerente gera o relatório
    Então os totalizadores exibem valores zerados
    E a lista exibe uma mensagem indicando ausência de vouchers no período

  Cenário: Filtro de filial bloqueado para Gerente
    Dado que o usuário autenticado possui perfil "Gerente"
    Quando acessa o relatório de vouchers
    Então o seletor de filial não está disponível
    E os dados exibidos correspondem exclusivamente à filial do Gerente

  Cenário: Administrador seleciona filial específica
    Dado que o usuário autenticado possui perfil "Administrador"
    Quando acessa "/relatorios/vouchers" e seleciona uma filial específica
    Então o relatório exibe os dados de vouchers somente daquela filial

  Cenário: Período inválido
    Dado que o usuário informa data final anterior à data inicial
    Quando tenta gerar o relatório
    Então o sistema exibe uma mensagem de erro de validação de período
    E o relatório não é gerado

  Cenário: Exportação para Excel
    Dado que o relatório de vouchers foi gerado com dados
    Quando o usuário clica em "Exportar para Excel"
    Então o sistema oferece o download de um arquivo ".xlsx"
    E o arquivo contém os totalizadores e a lista completa de vouchers com todos os campos exibidos na tela
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. A rota `/relatorios/vouchers` é protegida e redireciona perfis sem permissão para a tela inicial.

## Fora de escopo

- Emissão ou cancelamento de vouchers a partir deste relatório (coberto pelo módulo 005-xx).
- Detalhamento das transações de venda em que cada voucher foi utilizado (histórico de uso disponível em `005-02.listar-vouchers` via detalhe do voucher).
- Relatório consolidado agregando múltiplas filiais simultaneamente.
- Grupo "Expirados" — vouchers não possuem prazo de validade no sistema.
- Exportação em formato diferente de Excel.

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Relatório de vouchers | `/relatorios/vouchers` | Consultar vouchers emitidos no período com totalizadores e discriminação por status |

### Diagrama de navegação

```
/ (home)
  └── /relatorios (hub de relatórios — 011-00)
        └── /relatorios/vouchers
              ├── [preencher período + gerar] → exibe resultado na mesma tela
              ├── [aplicar filtro de status] → atualiza lista na mesma tela
              ├── [Exportar para Excel] → download do arquivo .xlsx
              └── [voltar] → /relatorios
```

### Entrada de navegação

A rota `/relatorios/vouchers` é acessada a partir do hub de relatórios em `/relatorios`. O item "Relatórios" é exibido no menu de navegação lateral apenas para **Gerente** e **Administrador**, conforme a tabela de permissões definida em `000-03.home-navegacao`.
