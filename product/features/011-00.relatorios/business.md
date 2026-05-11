# Relatórios — Módulo 011

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo responsável pela geração e visualização de relatórios gerenciais da livraria. Fornece ao Gerente e ao Administrador visibilidade sobre o desempenho de vendas, livros mais vendidos, estoque com nível baixo e situação dos vouchers emitidos. Todos os relatórios são somente leitura e podem ser exportados para Excel. O Gerente visualiza apenas dados da própria filial; o Administrador pode consultar qualquer filial ou gerar relatórios consolidados.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `011-01.relatorio-vendas` | Exibir totais de vendas por período e filial, com breakdown por método de pagamento |
| `011-02.relatorio-livros-vendidos` | Listar os livros mais vendidos no período, com quantidade e receita gerada |
| `011-03.relatorio-estoque-baixo` | Listar livros com estoque abaixo de um threshold configurável, com exportação opcional |
| `011-04.relatorio-vouchers` | Exibir vouchers emitidos, utilizados e esgotados no período |

## Atores envolvidos

- **Gerente** — visualiza e exporta relatórios exclusivamente da própria filial.
- **Administrador** — visualiza e exporta relatórios de qualquer filial; pode gerar visão consolidada entre filiais.

## Regras de negócio

1. Nenhum relatório altera dados do sistema — todos são estritamente somente leitura.
2. O Gerente só acessa dados da filial à qual está vinculado; não pode selecionar outras filiais.
3. O Administrador pode selecionar a filial de contexto ou optar por uma visão consolidada abrangendo todas as filiais.
4. Todos os relatórios oferecem exportação para Excel (formato `.xlsx`).
5. Filtro por período de datas é obrigatório em todos os relatórios que envolvem movimentações (vendas, vouchers, livros vendidos).
6. Os relatórios não possuem atualização em tempo real — refletem o estado dos dados no momento da consulta.

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. O módulo "Relatórios" aparece no menu de navegação lateral somente para esses perfis, conforme a tabela de permissões em `000-03.home-navegacao`.

## Fora de escopo

- Criação ou agendamento automático de relatórios.
- Envio de relatórios por e-mail ou mensagem.
- Geração de relatórios em formatos diferentes de Excel (PDF, CSV, etc.).
- Gráficos ou dashboards visuais na tela inicial (home).
- Relatórios fiscais ou contábeis (NF-e, livros contábeis).
- Histórico de preços (coberto pelo módulo 013-xx).
- Tempo em prateleira (coberto pelo módulo 012-xx).
- Relatório de compras de lotes de usados.
