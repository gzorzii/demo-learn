# Histórico de Preços — Módulo 013

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo de rastreabilidade de precificação. Registra e expõe o histórico completo de alterações de preço de venda de cada livro, permitindo que Gerentes e Administradores auditem mudanças de precificação ao longo do tempo. O registro ocorre automaticamente dentro da transação de edição de livro — nenhuma ação manual é necessária.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `013-01.consultar-historico-precos` | Consultar todas as alterações de preço de um livro específico, com data, preço anterior, novo preço e usuário responsável |

## Atores envolvidos

- **Gerente** — consulta o histórico de preços dos livros da própria filial.
- **Administrador** — consulta o histórico de preços de qualquer filial.
- **Catalogador** — embora possa editar preços via `001-02.editar-livro`, não tem acesso à consulta do histórico.

## Regras de negócio

1. Todo registro de `price_history` é gerado automaticamente quando o campo `sale_price` de um livro é alterado em `001-02.editar-livro`. Não existe criação manual de histórico.
2. Cada registro de `price_history` contém: livro (`book_id`), preço anterior (`previous_price`), novo preço (`new_price`), usuário que realizou a alteração (`changed_by`) e timestamp da alteração (`changed_at`).
3. O log é escrito dentro da mesma transação que atualiza o preço do livro — o INSERT em `price_history` precede o UPDATE em `book.sale_price`. Se a transação falhar, nenhum dos dois registros é persistido.
4. O histórico é imutável — nenhum perfil pode editar ou excluir registros de `price_history`.
5. O acesso à consulta é restrito a Gerente e Administrador. Catalogador e Caixa não visualizam o histórico.
6. A consulta por título ou autor retorna alterações de preço de todos os registros de livros que correspondam ao critério — útil para analisar padrões de precificação entre múltiplas entradas de livros usados com o mesmo título.

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** (restrito à própria filial) ou **Administrador** (acesso a todas as filiais). Catalogador e Caixa não têm acesso a este módulo.

## Fora de escopo

- Criação manual de registros em `price_history`.
- Edição ou exclusão de registros históricos.
- Exportação do histórico para Excel (coberta por `011-xx.relatorios`).
- Histórico de alterações em outros campos do livro (título, autor, categoria etc.) — apenas `sale_price` é rastreado.
- Comparação visual entre filiais em forma de gráfico ou dashboard.
