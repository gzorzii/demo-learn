# Vouchers — Módulo 005

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo responsável pela gestão de vouchers de crédito (trade-in) emitidos pela livraria. Um voucher representa um crédito em reais concedido a um cliente cadastrado, geralmente como contrapartida pela entrega de livros usados avaliados pelo Gerente. O saldo do voucher pode ser utilizado parcialmente no PDV para abater o valor de uma compra, preservando o saldo restante para uso futuro. O módulo cobre a emissão manual do voucher e a consulta da lista de vouchers da filial.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `005-01.emitir-voucher` | Gerente emite manualmente um voucher de crédito vinculado a um cliente cadastrado |
| `005-02.listar-vouchers` | Listar os vouchers da filial com filtros por cliente e status |

## Atores envolvidos

- **Gerente** — emite vouchers e consulta a listagem.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.
- **Caixa** — não acessa este módulo diretamente; utiliza o voucher no PDV (módulo 004).

## Modelo de dados relevante

O módulo opera sobre as tabelas `voucher` e `voucher_usage`, já definidas em `000-01.modelagem-dados`:

| Tabela | Campos principais |
|---|---|
| `voucher` | `id`, `branch_id`, `customer_id`, `initial_value`, `remaining_balance`, `issued_by`, `issued_at`, `active` |
| `voucher_usage` | `id`, `voucher_id`, `sale_id`, `amount_used`, `used_at` |

- `active = true` enquanto `remaining_balance > 0`.
- `active = false` quando `remaining_balance = 0` (voucher esgotado) ou quando inativado manualmente.
- Não há campo de validade — vouchers não expiram.

## Regras de negócio

1. Apenas Gerente e Administrador podem emitir vouchers.
2. Todo voucher deve ser vinculado a um cliente previamente cadastrado no sistema.
3. O valor inicial do voucher é definido no momento da emissão e não pode ser alterado após a criação.
4. O saldo restante (`remaining_balance`) inicia igual ao valor inicial e é decrementado a cada uso no PDV.
5. Vouchers não possuem prazo de validade.
6. O saldo pode ser utilizado parcialmente; o saldo remanescente é preservado para uso futuro.
7. Apenas um voucher pode ser utilizado por transação no PDV.
8. Um voucher com `remaining_balance = 0` é considerado esgotado e tem `active` definido como `false` automaticamente.
9. Vouchers são escopados por filial — um voucher emitido pela filial A não pode ser utilizado na filial B.
10. O histórico de utilizações de um voucher é registrado em `voucher_usage` a cada resgate no PDV.

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. O Caixa não acessa a gestão de vouchers — apenas os utiliza no PDV.

## Fora de escopo

- Emissão automática de voucher via módulo de compra de usados (006-xx) — a emissão neste módulo é sempre manual pelo Gerente.
- Transferência de voucher entre clientes.
- Cancelamento ou estorno de voucher já utilizado.
- Vouchers com prazo de validade.
- Acúmulo de múltiplos vouchers em uma mesma transação PDV.
- Portal ou interface para o cliente consultar o próprio saldo.
