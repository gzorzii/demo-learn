# Listar Vouchers

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite ao Gerente e ao Administrador consultar todos os vouchers emitidos pela filial, com filtros por cliente e por status (ativo, esgotado ou expirado). A listagem oferece visibilidade sobre os créditos pendentes de uso e o histórico de vouchers já consumidos, auxiliando na gestão financeira da filial.

## Atores envolvidos

- **Gerente** — consulta os vouchers da própria filial.
- **Administrador** — consulta os vouchers da filial selecionada no contexto atual.

## Regras de negócio

1. A listagem exibe apenas os vouchers da filial do usuário autenticado.
2. O Administrador, ao operar no contexto de uma filial específica, vê apenas os vouchers daquela filial.
3. Os vouchers são exibidos em ordem decrescente de data de emissão (mais recente primeiro) por padrão.
4. É possível filtrar por **cliente** (busca por nome, CPF/CNPJ ou telefone).
5. É possível filtrar por **status**:
   - **Ativo** — `active = true` e `remaining_balance > 0`.
   - **Esgotado** — `remaining_balance = 0` (independentemente de `active`).
6. Cada item da listagem exibe: código do voucher, nome do cliente, valor inicial, saldo restante, status e data de emissão.
7. A partir da listagem, o Gerente pode acessar o formulário de emissão de um novo voucher.
8. A listagem não permite editar ou cancelar vouchers — é somente leitura.
9. Ao clicar em um voucher da listagem, o sistema exibe o detalhe do voucher, incluindo o histórico de utilizações (`voucher_usage`).

## Critérios de aceite

```gherkin
Funcionalidade: Listar vouchers da filial

  Cenário: Listagem padrão sem filtros
    Dado que o usuário autenticado possui perfil "Gerente"
    E existem vouchers emitidos pela filial
    Quando acessa a tela de listagem de vouchers em "/vouchers"
    Então todos os vouchers da filial são exibidos
    E estão ordenados por data de emissão decrescente
    E cada item exibe: código, nome do cliente, valor inicial, saldo restante, status e data de emissão

  Cenário: Filtrar por cliente
    Dado que o usuário está na listagem de vouchers
    Quando digita "Ana" no campo de filtro por cliente
    Então apenas os vouchers vinculados a clientes cujo nome contém "Ana" são exibidos

  Cenário: Filtrar por status "Ativo"
    Dado que existem vouchers com diferentes status na filial
    Quando o usuário seleciona o filtro "Ativo"
    Então apenas os vouchers com "active = true" e "remaining_balance > 0" são exibidos

  Cenário: Filtrar por status "Esgotado"
    Dado que existem vouchers com "remaining_balance = 0" na filial
    Quando o usuário seleciona o filtro "Esgotado"
    Então apenas os vouchers com "remaining_balance = 0" são exibidos

  Cenário: Filtros combinados (cliente + status)
    Dado que o usuário está na listagem de vouchers
    Quando aplica o filtro de cliente "Carlos" e o filtro de status "Ativo"
    Então apenas os vouchers ativos vinculados a clientes com "Carlos" no nome são exibidos

  Cenário: Listagem vazia após aplicação de filtros
    Dado que o usuário está na listagem de vouchers
    Quando aplica filtros que não correspondem a nenhum voucher
    Então a listagem exibe uma mensagem indicando que nenhum voucher foi encontrado

  Cenário: Acesso ao detalhe do voucher
    Dado que o usuário está na listagem de vouchers
    Quando clica em um voucher específico
    Então é exibido o detalhe do voucher, incluindo o histórico de utilizações

  Cenário: Caixa não pode acessar a listagem de vouchers
    Dado que o usuário autenticado possui apenas o perfil "Caixa"
    Quando tenta acessar a rota "/vouchers"
    Então é redirecionado para a tela inicial ou para uma tela de acesso negado

  Cenário: Botão de emissão disponível na listagem
    Dado que o usuário autenticado possui perfil "Gerente"
    Quando está na tela de listagem de vouchers
    Então o botão "Emitir Voucher" está visível e ao clicar redireciona para "/vouchers/new"
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. A rota `/vouchers` é protegida e redireciona perfis sem permissão.

## Fora de escopo

- Edição ou cancelamento de vouchers a partir desta tela.
- Exportação da listagem de vouchers para Excel (cobertura do módulo de relatórios, 011-xx).
- Visualização de vouchers de outras filiais pelo Gerente.
- Acesso do Caixa à listagem (o Caixa apenas utiliza o voucher no PDV).

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Listagem de vouchers | `/vouchers` | Consultar todos os vouchers da filial com filtros por cliente e status |
| Detalhe do voucher | `/vouchers/:id` | Exibir dados completos do voucher e histórico de utilizações |

### Diagrama de navegação

```
/ (home)
  └── /vouchers (listagem de vouchers)  ← entrada pelo menu de navegação
        ├── [Emitir Voucher] → /vouchers/new (005-01.emitir-voucher)
        └── [clicar em voucher] → /vouchers/:id (detalhe)
              └── [voltar] → /vouchers
```

### Entrada de navegação

A rota `/vouchers` é o ponto de entrada principal do módulo, acessível pelo menu de navegação lateral/superior. Conforme a tabela de permissões definida em `000-03.home-navegacao`, o item "Vouchers (emissão)" é exibido no menu apenas para **Gerente** e **Administrador**.
