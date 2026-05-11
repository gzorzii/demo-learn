# Configurar Métodos de Pagamento

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que o Gerente gerencie os métodos de pagamento disponíveis em sua filial: visualizar os métodos cadastrados, adicionar novos métodos e ativar ou desativar métodos existentes. A configuração é consumida pelo PDV (módulo 004), que exibe ao Caixa somente os métodos com status ativo.

## Atores envolvidos

- **Gerente** — acessa, adiciona e altera o status dos métodos de pagamento da própria filial.
- **Administrador** — acesso idêntico ao Gerente, operando no contexto da filial selecionada.

## Regras de negócio

1. Apenas Gerente e Administrador podem acessar esta funcionalidade.
2. Os métodos de pagamento são escopados por filial — cada filial gerencia os seus de forma independente.
3. Um método de pagamento possui apenas dois campos editáveis pelo usuário: **nome** e **status** (ativo/inativo).
4. O nome do método é livre (ex.: "Dinheiro", "PIX", "Cartão de Crédito", "Cartão de Débito") — não há lista predefinida obrigatória.
5. Dois métodos com o mesmo nome não podem coexistir na mesma filial (comparação sem distinção de maiúsculas/minúsculas).
6. Um método recém-criado inicia com status **ativo** por padrão.
7. Um método pode ser desativado a qualquer momento; ao ser desativado, deixa de aparecer nas opções do PDV imediatamente.
8. Reativar um método o torna disponível novamente no PDV.
9. Não é possível excluir um método — apenas desativar. O histórico de vendas que utilizaram o método é preservado.
10. Não há integração com gateway de pagamento — o cadastro é estritamente informativo.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Gerente ou Administrador
  E acessa a tela de métodos de pagamento da filial
Quando a tela é carregada
Então deve exibir a lista de todos os métodos de pagamento cadastrados para a filial
  E cada método deve mostrar seu nome e seu status (ativo ou inativo)

Dado que nenhum método com o nome "PIX" existe na filial
Quando o Gerente preenche o nome "PIX" e confirma a adição
Então um novo método de pagamento "PIX" é criado com status ativo
  E passa a aparecer na lista da tela
  E passa a estar disponível no PDV da filial

Dado que já existe um método com o nome "Dinheiro" (ativo ou inativo) na filial
Quando o Gerente tenta adicionar um novo método com o nome "dinheiro"
Então o sistema rejeita a operação
  E exibe uma mensagem informando que o nome já está em uso na filial

Dado que o método "Cartão de Crédito" está com status ativo
Quando o Gerente altera o status para inativo
Então o método "Cartão de Crédito" não aparece mais nas opções do PDV
  E o status exibido na lista passa a ser "inativo"

Dado que o método "Cartão de Débito" está com status inativo
Quando o Gerente altera o status para ativo
Então o método "Cartão de Débito" volta a aparecer nas opções do PDV
  E o status exibido na lista passa a ser "ativo"

Dado que um método de pagamento foi utilizado em vendas anteriores
Quando o Gerente desativa o método
Então as vendas anteriores que utilizaram o método permanecem íntegras
  E o método não pode ser excluído — apenas desativado
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. Perfis Catalogador e Caixa não têm acesso a esta tela. A rota é protegida pelo frontend, conforme a tabela de permissões em `000-03.home-navegacao`.

## Fora de escopo

- Exclusão permanente de métodos de pagamento.
- Taxa ou percentual de processamento por método.
- Configuração de parcelamento.
- Métodos compartilhados entre filiais.
- Integração com gateways de pagamento.
- Ordenação manual dos métodos na lista do PDV.
- Limite mínimo ou máximo de valor por método.

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Lista de métodos de pagamento | `/payment-methods` | Exibe todos os métodos da filial com nome e status; permite adicionar novo método e alternar o status de cada método existente |

### Diagrama de navegação

```
/ (home)
  └── /payment-methods  (lista de métodos de pagamento)
        ├── [adicionar método] → formulário inline ou modal
        │     ├── [confirmar] → /payment-methods  (lista atualizada com novo método)
        │     └── [cancelar] → /payment-methods
        └── [alternar status] → /payment-methods  (status atualizado inline, sem troca de rota)
```

### Entrada na navegação

O item "Métodos de Pagamento" deve constar no menu de navegação lateral para os perfis **Gerente** e **Administrador**, conforme a tabela de permissões já estabelecida em `000-03.home-navegacao`. O Catalogador e o Caixa não visualizam este item no menu.
