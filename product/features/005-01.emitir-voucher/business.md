# Emitir Voucher

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Gerente emitir manualmente um voucher de crédito em reais vinculado a um cliente cadastrado. O voucher representa um crédito que o cliente poderá utilizar no PDV para abater o valor de futuras compras. A emissão manual é o fluxo principal deste módulo; a emissão pode também ser acionada a partir do módulo de compra de usados (006-xx), mas o formulário e as regras são os mesmos.

## Atores envolvidos

- **Gerente** — único perfil que pode emitir vouchers na própria filial.
- **Administrador** — pode emitir vouchers no contexto da filial selecionada.

## Regras de negócio

1. Somente Gerente e Administrador podem emitir vouchers.
2. O voucher deve ser obrigatoriamente vinculado a um cliente já cadastrado no sistema (busca por nome, CPF/CNPJ ou telefone).
3. O valor do voucher (`initial_value`) é informado manualmente pelo Gerente no momento da emissão; deve ser maior que zero.
4. O saldo inicial (`remaining_balance`) é igual ao `initial_value` no momento da criação.
5. O voucher é criado com `active = true`.
6. O voucher é escopado pela filial do Gerente que o emite (`branch_id`).
7. Não há limite de quantidade de vouchers ativos por cliente.
8. Após a emissão, o sistema exibe o código único do voucher gerado para que o Gerente possa informar ao cliente.
9. Não é possível editar um voucher após a emissão — valor e cliente são imutáveis.

## Critérios de aceite

```gherkin
Funcionalidade: Emitir voucher de crédito

  Cenário: Emissão bem-sucedida de voucher
    Dado que o usuário autenticado possui perfil "Gerente"
    E existe um cliente cadastrado com nome "Maria Silva"
    Quando o Gerente acessa o formulário de emissão de voucher
    E seleciona "Maria Silva" como cliente
    E informa o valor "R$ 80,00"
    E confirma a emissão
    Então um voucher é criado com "initial_value = 80.00" e "remaining_balance = 80.00"
    E o voucher fica com "active = true"
    E o sistema exibe o código único do voucher na tela de confirmação
    E o usuário é redirecionado para a listagem de vouchers

  Cenário: Tentativa de emitir voucher sem selecionar cliente
    Dado que o usuário está no formulário de emissão de voucher
    Quando tenta confirmar sem selecionar um cliente
    Então o sistema exibe erro de validação "Cliente é obrigatório"
    E o voucher não é criado

  Cenário: Tentativa de emitir voucher com valor zero ou negativo
    Dado que o usuário está no formulário de emissão de voucher
    E selecionou um cliente válido
    Quando informa o valor "R$ 0,00"
    E tenta confirmar
    Então o sistema exibe erro de validação "O valor do voucher deve ser maior que zero"
    E o voucher não é criado

  Cenário: Caixa não pode acessar o formulário de emissão
    Dado que o usuário autenticado possui apenas o perfil "Caixa"
    Quando tenta acessar a rota "/vouchers/new"
    Então é redirecionado para a tela inicial ou para uma tela de acesso negado

  Cenário: Cliente buscado por nome parcial
    Dado que o usuário está no formulário de emissão de voucher
    Quando digita "silva" no campo de busca de cliente
    Então o sistema exibe todos os clientes cujo nome contém "silva" (busca insensível a maiúsculas)
    E o Gerente pode selecionar o cliente desejado
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. A rota `/vouchers/new` é protegida e redireciona perfis sem permissão.

## Fora de escopo

- Emissão automática de voucher pelo sistema (sem intervenção do Gerente).
- Edição de voucher após a emissão.
- Cancelamento de voucher (inativação manual fora do PDV).
- Emissão de comprovante físico ou digital do voucher para o cliente.
- Definição de prazo de validade para o voucher.

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Formulário de emissão de voucher | `/vouchers/new` | Selecionar cliente, informar valor e confirmar a emissão |
| Confirmação de voucher emitido | `/vouchers/new` (estado pós-submissão) | Exibir o código do voucher gerado e oferecer ação de retorno à listagem |

> A confirmação é exibida na mesma rota como estado de sucesso — não é uma rota separada. Após confirmar a leitura do código, o usuário é redirecionado para `/vouchers`.

### Diagrama de navegação

```
/vouchers (listagem — 005-02)
  └── /vouchers/new (formulário de emissão)
        ├── [confirmar com dados válidos] → estado de confirmação (código exibido)
        │     └── [voltar à listagem] → /vouchers
        ├── [cancelar] → /vouchers
        └── [erro de validação] → permanece em /vouchers/new com mensagens de erro
```

### Entrada de navegação

O acesso a `/vouchers/new` se dá pelo botão "Emitir Voucher" presente na tela de listagem de vouchers (`/vouchers`). Conforme a tabela de permissões definida em `000-03.home-navegacao`, o módulo "Vouchers (emissão)" é visível apenas para **Gerente** e **Administrador**.
