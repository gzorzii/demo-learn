# Selecionar Pagamento no PDV

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Caixa definir como a venda será paga, selecionando um ou mais métodos de pagamento ativos na filial (configurados via módulo 008-01) e informando o valor a ser pago em cada método. A soma dos valores informados deve cobrir o total da venda. Esta etapa ocorre após a montagem do carrinho (004-01) e, opcionalmente, após a aplicação de voucher (004-02), e é pré-requisito para a finalização da venda (004-04).

## Atores envolvidos

- **Caixa** — define os métodos e valores de pagamento durante a venda.
- **Gerente** — pode operar o PDV e executar esta etapa.
- **Administrador** — acesso completo; opera no contexto da filial selecionada.

## Regras de negócio

1. Os métodos de pagamento disponíveis são apenas os que possuem `active = true` na filial no momento da venda (consultados de `payment_method` via módulo 008-01).
2. O Caixa pode selecionar um ou mais métodos de pagamento para uma mesma venda.
3. Para cada método selecionado, o Caixa informa o valor a ser pago naquele método.
4. A soma dos valores informados em todos os métodos selecionados deve ser maior ou igual ao total da venda (`sale.total`).
5. Nenhum método pode ter valor informado menor ou igual a zero.
6. Não há integração com gateway de pagamento — o sistema apenas registra o método e o valor; a efetivação do pagamento (cartão, PIX etc.) ocorre fora do sistema.
7. O Caixa pode adicionar e remover métodos de pagamento antes de confirmar — a seleção é provisória até a finalização.
8. Se o total da venda for R$ 0,00 (coberto integralmente por voucher), nenhum método de pagamento é obrigatório e a etapa pode ser ignorada.
9. O sistema exibe em tempo real o valor já coberto e o valor restante a ser alocado conforme o Caixa informa os valores.

## Critérios de aceite

```gherkin
Dado que há uma venda em andamento com total maior que R$ 0,00
Quando o Caixa acessa a etapa de pagamento
Então o sistema exibe apenas os métodos de pagamento com active = true da filial

Dado que o Caixa seleciona um método de pagamento e informa um valor maior ou igual ao total
Quando confirma a seleção de pagamento
Então o sistema aceita a configuração e habilita o botão de finalizar venda

Dado que o Caixa seleciona dois métodos de pagamento e informa valores cuja soma é igual ao total
Quando confirma a seleção de pagamento
Então o sistema aceita a configuração de pagamento dividido

Dado que a soma dos valores informados é menor que o total da venda
Quando o Caixa tenta avançar para finalização
Então o sistema exibe mensagem de erro indicando o valor ainda não coberto
E bloqueia a finalização

Dado que o Caixa informa valor zero ou negativo em um método de pagamento
Quando tenta confirmar
Então o sistema exibe erro de validação para aquele campo
E não permite avançar

Dado que o total da venda é R$ 0,00 (voucher cobriu tudo)
Quando o Caixa acessa a etapa de pagamento
Então nenhum método de pagamento é exigido
E o sistema permite avançar diretamente para a finalização

Dado que o Caixa remove um método de pagamento já adicionado
Quando aciona "Remover" no método
Então o método e seu valor são retirados da lista provisória
E o valor restante a cobrir é atualizado no resumo
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Caixa**, **Gerente** ou **Administrador**, no contexto da tela do PDV (`/pdv`). Não há rota dedicada — esta funcionalidade é uma etapa inline da tela principal do PDV.

## Fora de escopo

- Integração com gateway ou processadora de pagamento (TEF, Stone, Cielo etc.).
- Parcelamento de cartão de crédito.
- Cálculo de troco pelo sistema.
- Taxa de processamento por método de pagamento.
- Limite mínimo ou máximo de valor por método.
- Configuração ou criação de métodos de pagamento a partir do PDV (responsabilidade do módulo 008-01).

## Fluxo de telas

### Telas introduzidas

Esta feature não introduz novas rotas. A seleção de métodos de pagamento é uma etapa inline na tela principal do PDV.

| Tela | Rota | Propósito |
|---|---|---|
| Tela principal do PDV (etapa pagamento) | `/pdv` | Seção inline para seleção e distribuição de valores por método de pagamento |

### Diagrama de navegação

```
/pdv (tela principal do PDV — etapa de pagamento, após carrinho e voucher opcionais)
  ├── [selecionar método de pagamento] → método adicionado à lista provisória
  │     └── [informar valor] → valor registrado; resumo atualizado em tempo real
  ├── [remover método adicionado] → método e valor removidos; resumo atualizado
  ├── [soma dos valores >= total] → botão "Finalizar venda" habilitado
  ├── [soma dos valores < total] → botão "Finalizar venda" bloqueado com aviso de valor restante
  └── [total = R$ 0,00 por voucher] → etapa ignorável; avança direto para finalização (004-04)
```

### Nota de navegação

Esta etapa faz parte do fluxo da tela `/pdv`. O acesso ao PDV é dado pelo item "PDV / Vendas" no menu lateral, visível para **Caixa**, **Gerente** e **Administrador**, conforme `000-03.home-navegacao`.
