# Listar Usuários

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Exibe a lista de usuários do sistema com suporte a filtros por filial, perfil e status. É o ponto de entrada para as ações de cadastro e edição de usuários. O Gerente visualiza apenas usuários da própria filial; o Administrador visualiza usuários de todas as filiais.

## Atores envolvidos

- **Administrador** — visualiza usuários de todas as filiais; pode filtrar por filial.
- **Gerente** — visualiza apenas usuários da própria filial; o filtro de filial não é exibido.

## Regras de negócio

1. O Gerente visualiza exclusivamente os usuários vinculados à sua própria filial.
2. O Administrador visualiza usuários de todas as filiais e pode filtrar por filial específica.
3. Filtros disponíveis: filial (apenas para Administrador), perfil e status (ativo/inativo).
4. Por padrão, a listagem exibe apenas usuários ativos. O filtro de status pode ser alterado para mostrar inativos ou todos.
5. Cada linha da listagem exibe: nome, e-mail, perfil(s), filial (somente para Administrador) e status.
6. A listagem oferece acesso direto à ação de edição de cada usuário.
7. A listagem oferece botão para cadastrar novo usuário.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Gerente
Quando acessa a listagem de usuários
Então visualiza somente os usuários da própria filial
E o filtro de filial não é exibido

Dado que o usuário autenticado possui perfil Administrador
Quando acessa a listagem de usuários
Então visualiza usuários de todas as filiais
E o filtro de filial está disponível para seleção

Dado que a listagem é carregada pela primeira vez
Quando não há nenhum filtro ativo
Então somente usuários com status ativo são exibidos

Dado que o usuário aplica o filtro de perfil "Gerente"
Quando o filtro é confirmado
Então a listagem exibe apenas usuários que possuem o perfil "Gerente"

Dado que o usuário aplica o filtro de status "inativo"
Quando o filtro é confirmado
Então a listagem exibe apenas usuários com status inativo

Dado que o usuário aciona o botão "Novo Usuário"
Quando está na listagem
Então é redirecionado para /users/new (feature 009-01.cadastrar-usuario)

Dado que o usuário aciona o botão "Editar" na linha de um usuário
Quando está na listagem
Então é redirecionado para /users/:id/edit (feature 009-02.editar-usuario)

Dado que não existem usuários correspondentes aos filtros aplicados
Quando a listagem é carregada
Então é exibida uma mensagem informando que nenhum usuário foi encontrado
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Administrador** ou **Gerente**.

## Fora de escopo

- Exclusão permanente de usuários pela listagem.
- Exportação da listagem para Excel ou outros formatos.
- Edição inline de campos diretamente na tabela.
- Visualização de detalhes completos do usuário em tela separada (o formulário de edição já cobre esse papel).

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Listagem de usuários | `/users` | Visualizar, filtrar e navegar para cadastro ou edição de usuários |

### Diagrama de navegação

```
/ (home)
  └── /users (listagem)
        ├── [botão "Novo Usuário"] → /users/new (cadastro — 009-01)
        └── [botão "Editar" na linha] → /users/:id/edit (edição — 009-02)
```

### Nota de navegação

A entrada no menu de navegação lateral é "Usuários", visível para Administrador e Gerente. Conforme a tabela de permissões de `000-03.home-navegacao`, o item "Gestão de usuários" é exibido para Administrador (todos os usuários) e Gerente (somente da própria filial).
