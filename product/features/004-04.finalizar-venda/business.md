# Finalizar Venda no PDV

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Confirma e persiste uma venda no PDV. Ao acionar a finalização, o sistema: grava o cabeçalho da venda (`sale`), os itens (`sale_item`), os pagamentos (`sale_payment`), debita o estoque de cada livro vendido, registra o uso do voucher em `voucher_usage` e atualiza o saldo do voucher (quando aplicável). Opcionalmente, emite um recibo físico. Após a finalização, o PDV é resetado para o estado inicial, pronto para uma nova venda. Esta é a etapa que torna a venda imutável — não há cancelamento ou estorno no escopo atual.

## Atores envolvidos

- **Caixa** — finaliza a venda no PDV da própria filial.
- **Gerente** — pode operar o PDV e finalizar vendas.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. Para finalizar a venda, o carrinho deve ter ao menos um item e a soma dos pagamentos deve ser maior ou igual ao total da venda.
2. Ao confirmar a finalização, o sistema persiste atomicamente: `sale` (status = `completed`), `sale_item` para cada livro, `sale_payment` para cada método informado.
3. O estoque é debitado no momento da finalização:
   - Para livros novos: `book.quantity` é decrementado em 1.
   - Para livros usados: o registro individual do livro é marcado como vendido/indisponível.
4. Se um voucher foi aplicado: o uso é registrado em `voucher_usage` com o valor efetivamente descontado (`voucher_amount_used`); o `remaining_balance` do voucher é decrementado pelo mesmo valor; se `remaining_balance` chegar a zero, o voucher recebe `active = false`.
5. Os preços gravados em `sale_item` (`original_price`, `effective_price`) são os do momento da adição ao carrinho — não são recalculados na finalização.
6. O `sale.total` gravado é o valor efetivamente cobrado ao cliente (`subtotal - voucher_amount_used`).
7. O recibo físico é opcional — o Caixa decide se deve ser impresso; a venda é finalizada independentemente desta decisão.
8. Após a finalização bem-sucedida, o PDV é resetado para o estado inicial (carrinho vazio, sem cliente, sem voucher, sem pagamentos), pronto para nova venda.
9. A venda finalizada é imutável — nenhuma edição, cancelamento, estorno ou devolução é permitida no sistema.
10. Se ocorrer falha durante a persistência (erro de banco, por exemplo), nenhuma parte da operação é efetivada — a atomicidade deve ser garantida por transação.

## Critérios de aceite

```gherkin
Dado que o carrinho possui ao menos um item e a soma dos pagamentos cobre o total
Quando o Caixa aciona "Finalizar venda"
Então o sistema persiste sale com status = completed
E persiste os registros de sale_item para cada livro no carrinho
E persiste os registros de sale_payment para cada método informado
E debita o estoque de cada livro vendido
E exibe mensagem de confirmação de venda realizada com sucesso

Dado que um voucher foi aplicado à venda
Quando a venda é finalizada com sucesso
Então um registro de voucher_usage é criado com o valor descontado e o id da venda
E o remaining_balance do voucher é decrementado pelo valor utilizado
E se remaining_balance = 0, o voucher recebe active = false

Dado que o saldo do voucher é maior que o total da venda
Quando a venda é finalizada
Então voucher_amount_used = sale.total (o voucher cobre exatamente o total)
E remaining_balance do voucher = remaining_balance anterior - sale.total

Dado que o Caixa decide imprimir o recibo
Quando aciona a opção de impressão após a confirmação
Então o sistema envia o recibo para a impressora configurada
E o PDV é resetado após a impressão (ou após o Caixa dispensar a opção)

Dado que o Caixa decide não imprimir o recibo
Quando dispensa a opção de impressão
Então o PDV é resetado para o estado inicial sem aguardar impressão

Dado que o PDV é resetado após a finalização
Quando a tela de PDV é exibida novamente
Então o carrinho está vazio, sem cliente, sem voucher e sem pagamentos informados

Dado que ocorre um erro durante a persistência da venda
Quando o sistema detecta a falha
Então nenhum dado é gravado (transação revertida)
E o sistema exibe mensagem de erro
E o carrinho e as configurações de pagamento são preservados para nova tentativa

Dado que o carrinho está vazio ou a soma dos pagamentos é menor que o total
Quando o Caixa tenta acionar "Finalizar venda"
Então o botão permanece desabilitado ou o sistema exibe mensagem bloqueando a ação
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Caixa**, **Gerente** ou **Administrador**, no contexto da tela do PDV (`/pdv`). Não há rota dedicada — a finalização é a ação conclusiva da tela principal do PDV.

## Fora de escopo

- Cancelamento, estorno ou devolução de venda já finalizada.
- Emissão de nota fiscal eletrônica (NF-e/NFC-e).
- Envio digital de recibo (e-mail, WhatsApp, SMS).
- Edição de qualquer campo da venda após a finalização.
- Venda a crédito ou com pagamento diferido.
- Impressão automática do recibo sem confirmação do Caixa.

## Fluxo de telas

### Telas introduzidas

Esta feature não introduz novas rotas. A finalização é a ação conclusiva da tela principal do PDV, que após o sucesso reseta o estado para o início de uma nova venda.

| Tela | Rota | Propósito |
|---|---|---|
| Tela principal do PDV (ação de finalização) | `/pdv` | Confirmação e persistência da venda; opção de impressão de recibo; reset para nova venda |

### Diagrama de navegação

```
/pdv (tela principal do PDV — etapa de finalização)
  ├── [pré-condições atendidas: >= 1 item + pagamentos cobrem total]
  │     └── [acionar "Finalizar venda"]
  │           ├── [sucesso]
  │           │     ├── [Caixa opta por imprimir recibo] → dispara impressão → PDV resetado
  │           │     └── [Caixa dispensa recibo] → PDV resetado (novo carrinho vazio)
  │           └── [falha na persistência] → mensagem de erro; carrinho preservado para nova tentativa
  └── [pré-condições não atendidas] → botão "Finalizar venda" desabilitado (sem transição)
```

### Nota de navegação

A finalização ocorre dentro da tela `/pdv`. O acesso ao PDV é dado pelo item "PDV / Vendas" no menu lateral, visível para **Caixa**, **Gerente** e **Administrador**, conforme `000-03.home-navegacao`. Após o reset, o Caixa permanece em `/pdv` pronto para a próxima venda.
