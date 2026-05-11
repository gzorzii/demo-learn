# Métodos de Pagamento — Módulo 008

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo responsável pela configuração dos métodos de pagamento disponíveis em cada filial. O Gerente define quais formas de pagamento estão habilitadas (dinheiro, cartão de crédito, cartão de débito, PIX, entre outros), e o PDV (módulo 004) usa essa configuração para apresentar ao Caixa apenas os métodos ativos no momento da venda. Não há integração com gateways de pagamento — o módulo é exclusivamente de cadastro informativo.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `008-01.configurar-metodos-pagamento` | Gerente visualiza, adiciona, ativa e desativa métodos de pagamento da própria filial |

## Atores envolvidos

- **Gerente** — configura os métodos de pagamento da própria filial.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.
- **Caixa** — não acessa este módulo diretamente; visualiza os métodos ativos no PDV.

## Modelo de dados relevante

A tabela envolvida está definida em `000-01.modelagem-dados`:

| Tabela | Campos principais |
|---|---|
| `payment_method` | `id`, `branch_id`, `name`, `active`, `created_at`, `updated_at` |

- Cada registro representa um método de pagamento de uma filial específica.
- O campo `active` controla se o método está disponível para uso no PDV.
- Não há campo de taxa ou percentual de processamento no modelo atual.

## Regras de negócio

1. Apenas Gerente e Administrador podem configurar métodos de pagamento.
2. Cada método de pagamento é escopado por filial — as configurações de uma filial não afetam as demais.
3. O PDV exibe apenas os métodos com `active = true` no momento da venda.
4. Um método desativado não pode ser selecionado em novas vendas, mas vendas já finalizadas com aquele método permanecem íntegras.
5. Não há integração com gateway de pagamento — o sistema apenas registra qual método foi utilizado.
6. Não existe um conjunto de métodos padrão criado automaticamente para novas filiais — o Gerente cadastra os métodos manualmente.

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. O módulo "Métodos de Pagamento" aparece no menu de navegação lateral somente para esses perfis, conforme a tabela de permissões em `000-03.home-navegacao`.

## Fora de escopo

- Integração com gateway de pagamento ou processadoras (ex.: Cielo, Stone, PagSeguro).
- Taxa ou percentual de processamento por método.
- Configuração de parcelamento de cartão de crédito.
- Métodos de pagamento compartilhados entre filiais.
- Relatório de faturamento por método de pagamento (pertence ao módulo 011).
- Definição de limite mínimo ou máximo de valor por método.
