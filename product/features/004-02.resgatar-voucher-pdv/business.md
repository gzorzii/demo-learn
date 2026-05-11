# Resgatar Voucher no PDV

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Caixa, durante uma venda em andamento no PDV, vincular um cliente cadastrado à venda e aplicar um voucher de crédito emitido pelo Gerente (módulo 005-01). O valor disponível no voucher é abatido do total da venda. Caso o saldo do voucher seja superior ao total, apenas o valor necessário é utilizado e o saldo remanescente é preservado para futuras compras. Esta etapa é opcional — a venda pode ser finalizada sem vincular cliente ou voucher.

## Atores envolvidos

- **Caixa** — vincula o cliente e aplica o voucher durante a venda.
- **Gerente** — pode operar o PDV e executar esta etapa.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. A vinculação de cliente é opcional — uma venda pode ser finalizada sem cliente identificado.
2. Para aplicar um voucher, o cliente deve ser vinculado à venda antes da busca do voucher.
3. A busca de voucher é feita pelo código único do voucher, informado pelo Caixa.
4. Apenas vouchers com `active = true` e `remaining_balance > 0` e emitidos pela mesma filial podem ser aplicados.
5. Um voucher pertence a um cliente específico — o voucher buscado deve estar vinculado ao cliente já selecionado para a venda; se houver incompatibilidade, o sistema informa o erro.
6. Apenas um voucher pode ser aplicado por venda.
7. O valor descontado pelo voucher é o menor entre o `remaining_balance` do voucher e o `total` da venda (o voucher nunca desconta mais do que o total da venda).
8. A aplicação do voucher é provisória enquanto a venda não for finalizada — o saldo só é efetivamente debitado do voucher ao finalizar (feature 004-04).
9. O Caixa pode remover o voucher aplicado e/ou desvincular o cliente antes de finalizar a venda.
10. A vinculação de cliente sem aplicar voucher é válida — o cliente fica registrado na venda sem abatimento de crédito.

## Critérios de aceite

```gherkin
Dado que há uma venda em andamento com ao menos um item no carrinho
Quando o Caixa busca um cliente pelo nome, CPF/CNPJ ou telefone
Então o sistema exibe os clientes correspondentes da filial
E o Caixa pode selecionar um para vincular à venda

Dado que um cliente foi vinculado à venda
Quando o Caixa informa o código de um voucher com active = true e remaining_balance > 0 pertencente a esse cliente
Então o voucher é aplicado à venda
E o sistema exibe o valor do abatimento e o novo total da venda

Dado que o saldo do voucher é maior que o total da venda
Quando o voucher é aplicado
Então o abatimento exibido é igual ao total da venda
E o total resultante é R$ 0,00
E o saldo remanescente exibido reflete o valor que sobrará após a finalização

Dado que o Caixa informa o código de um voucher inativo ou com saldo zerado
Quando tenta aplicar o voucher
Então o sistema exibe mensagem de erro informando que o voucher não está disponível
E nenhum abatimento é aplicado

Dado que o voucher buscado pertence a um cliente diferente do cliente vinculado à venda
Quando o Caixa tenta aplicar o voucher
Então o sistema exibe mensagem de erro informando que o voucher não pertence ao cliente selecionado
E nenhum abatimento é aplicado

Dado que um voucher foi aplicado à venda
Quando o Caixa aciona "Remover voucher"
Então o voucher é desvinculado da venda
E o total retorna ao valor sem abatimento
E o saldo do voucher permanece inalterado (não foi debitado)

Dado que o Caixa tenta aplicar um segundo voucher com um já aplicado
Quando informa o código do segundo voucher
Então o sistema exibe mensagem de erro informando que já existe um voucher aplicado nesta venda
E o segundo voucher não é aplicado

Dado que a venda não possui cliente vinculado
Quando o Caixa tenta informar um código de voucher
Então o sistema bloqueia a ação e exibe mensagem informando que é necessário vincular um cliente antes de aplicar um voucher
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Caixa**, **Gerente** ou **Administrador**, no contexto da tela do PDV (`/pdv`). Não há rota dedicada — esta funcionalidade é uma etapa inline da tela principal do PDV.

## Fora de escopo

- Emissão de novo voucher a partir do PDV (responsabilidade do módulo 005-01).
- Aplicação de múltiplos vouchers na mesma venda.
- Aplicação de voucher sem cliente vinculado.
- Consulta do saldo do voucher fora do contexto do PDV (responsabilidade do módulo 005-02).
- Vouchers de outras filiais.
- Desconto em percentual via voucher (voucher é sempre valor fixo em R$).

## Fluxo de telas

### Telas introduzidas

Esta feature não introduz novas rotas. A vinculação de cliente e a aplicação de voucher são etapas inline na tela principal do PDV.

| Tela | Rota | Propósito |
|---|---|---|
| Tela principal do PDV (etapa voucher) | `/pdv` | Seção inline para busca de cliente e aplicação de voucher durante a venda |

### Diagrama de navegação

```
/pdv (tela principal do PDV — etapa de voucher, após carrinho com >= 1 item)
  ├── [buscar cliente] → autocomplete inline
  │     ├── [cliente selecionado] → cliente vinculado à venda (exibido no resumo)
  │     └── [sem resultado] → mensagem informativa inline
  ├── [informar código de voucher]
  │     ├── [voucher válido e do cliente] → voucher aplicado; abatimento exibido no resumo
  │     ├── [voucher inválido / inativo / de outro cliente] → mensagem de erro inline
  │     └── [já existe voucher aplicado] → mensagem de erro inline
  ├── [remover voucher aplicado] → voucher desvinculado; total restaurado
  └── [continuar sem voucher] → avança para seleção de pagamento (004-03)
```

### Nota de navegação

Esta etapa faz parte do fluxo da tela `/pdv`. O acesso ao PDV é dado pelo item "PDV / Vendas" no menu lateral, visível para **Caixa**, **Gerente** e **Administrador**, conforme `000-03.home-navegacao`.
