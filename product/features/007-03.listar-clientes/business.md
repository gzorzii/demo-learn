# Listar Clientes

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Exibe a lista de clientes cadastrados na filial do usuário autenticado, com suporte a busca por nome, CPF/CNPJ ou telefone. É a tela principal do módulo de clientes e o ponto de entrada para as demais operações: cadastrar novo cliente, acessar a ficha de um cliente existente, editar seus dados ou gerenciar sua lista de desejos.

## Atores envolvidos

- **Gerente** — consulta e navega pelos clientes da própria filial.
- **Administrador** — consulta clientes no contexto da filial selecionada.

## Regras de negócio

1. A listagem exibe apenas os clientes da filial do usuário autenticado.
2. Os dados exibidos por cliente na listagem são: nome, CPF/CNPJ (com máscara), telefone.
3. O usuário pode filtrar a listagem por nome (busca parcial, insensível a maiúsculas), CPF/CNPJ (busca exata ou parcial por dígitos) ou telefone (busca parcial).
4. Filtros são combinados: é possível buscar por nome e telefone simultaneamente.
5. A listagem exibe o total de clientes encontrados com os filtros aplicados.
6. Clientes são ordenados por nome em ordem alfabética por padrão.
7. Clicar em um cliente da lista navega para a ficha completa do cliente (`/clientes/:id`).

## Critérios de aceite

```gherkin
Funcionalidade: Listar clientes

  Cenário: Exibição da listagem da filial
    Dado que o usuário autenticado possui perfil "Gerente"
    E existem 5 clientes cadastrados na filial
    Quando acessa a rota "/clientes"
    Então a lista exibe os 5 clientes ordenados por nome
    E exibe o total "5 clientes encontrados"

  Cenário: Busca por nome parcial
    Dado que existem clientes "Ana Souza" e "Carlos Andrade" na filial
    Quando o Gerente digita "ana" no campo de busca
    Então a lista exibe apenas "Ana Souza"
    E "Carlos Andrade" não aparece

  Cenário: Busca por CPF parcial
    Dado que o cliente "Maria Lima" possui CPF "12345678901"
    Quando o Gerente digita "12345" no campo de busca por CPF/CNPJ
    Então a lista exibe "Maria Lima"

  Cenário: Nenhum cliente encontrado com o filtro aplicado
    Dado que nenhum cliente possui o nome "Zeferino"
    Quando o Gerente digita "Zeferino" no campo de busca por nome
    Então a lista exibe a mensagem "Nenhum cliente encontrado"
    E o total exibe "0 clientes encontrados"

  Cenário: Acesso à ficha do cliente a partir da listagem
    Dado que a lista exibe o cliente "Ana Souza"
    Quando o Gerente clica em "Ana Souza"
    Então é redirecionado para "/clientes/:id" com os dados completos de "Ana Souza"

  Cenário: Acesso ao formulário de novo cliente
    Dado que o Gerente está na listagem de clientes
    Quando clica em "Novo Cliente"
    Então é redirecionado para "/clientes/novo"

  Cenário: Perfil sem permissão não acessa a listagem
    Dado que o usuário autenticado possui apenas o perfil "Catalogador"
    Quando tenta acessar a rota "/clientes"
    Então é redirecionado para a tela inicial ou para uma tela de acesso negado
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Gerente** ou **Administrador**. A rota `/clientes` é protegida; perfis sem permissão são redirecionados. Conforme a tabela de permissões em `000-03.home-navegacao`, o item "Clientes" é visível apenas para esses dois perfis.

## Fora de escopo

- Paginação com configuração de itens por página pelo usuário (comportamento de paginação é decisão de implementação).
- Exportação da listagem de clientes para Excel (funcionalidade de relatórios está no módulo 011).
- Listagem consolidada de clientes de todas as filiais para o Administrador (cada sessão opera no contexto de uma filial).
- Visualização de histórico de compras do cliente diretamente na listagem.

## Fluxo de telas

### Telas introduzidas por esta feature

| Tela | Rota | Finalidade |
|---|---|---|
| Listagem de clientes | `/clientes` | Buscar, filtrar e navegar pelos clientes da filial |
| Ficha do cliente | `/clientes/:id` | Exibir dados completos do cliente e oferecer acesso a edição e lista de desejos |

### Diagrama de navegação

```
/ (home — 000-03)
  └── /clientes (listagem — ponto de entrada do módulo)
        ├── [Novo Cliente] → /clientes/novo (007-01)
        ├── [clicar no cliente] → /clientes/:id (ficha do cliente)
        │     ├── [Editar] → /clientes/:id/editar (007-02)
        │     └── [Lista de Desejos] → /clientes/:id/lista-desejos (007-04)
        └── [filtros de busca] → permanece em /clientes com resultados filtrados
```

### Entrada de navegação

O acesso a `/clientes` se dá pelo item "Clientes" no menu de navegação lateral, visível para **Gerente** e **Administrador**, conforme definido em `000-03.home-navegacao`.
