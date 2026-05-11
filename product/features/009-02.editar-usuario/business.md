# Editar Usuário

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que Administradores e Gerentes alterem os dados de um usuário existente: nome, perfil(s), filial vinculada e status ativo/inativo. É o único mecanismo para inativar um usuário e, consequentemente, impedir que ele se autentique no sistema.

## Atores envolvidos

- **Administrador** — edita usuários de qualquer filial; pode alterar qualquer perfil, incluindo promover ou rebaixar um Administrador.
- **Gerente** — edita somente usuários da própria filial; não pode atribuir nem remover o perfil `Administrador`.

## Regras de negócio

1. O e-mail do usuário não pode ser alterado — é campo exibido apenas para leitura no formulário de edição.
2. O nome, o(s) perfil(s) e a filial podem ser alterados.
3. O status ativo/inativo pode ser alternado. Um usuário inativo não consegue autenticar-se (conforme `000-02.autenticacao`).
4. Pelo menos um perfil deve permanecer selecionado — o sistema não permite salvar um usuário sem nenhum perfil.
5. O Gerente não pode atribuir nem remover o perfil `Administrador` de nenhum usuário.
6. O Gerente não pode editar usuários de outras filiais.
7. Quando os perfis do usuário incluem qualquer perfil diferente de `Administrador`, a filial é obrigatória.
8. Quando o único perfil selecionado for `Administrador`, o campo filial deve ser removido e `branch_id` fica nulo.
9. Um Administrador não pode inativar a si mesmo (para evitar que o sistema fique sem Administrador ativo).
10. A filial vinculada ao usuário pode ser alterada pelo Administrador; o Gerente não pode alterar a filial de nenhum usuário (somente opera na própria filial).

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Administrador ou Gerente
Quando acessa o formulário de edição de um usuário
Então o formulário exibe os campos: nome, e-mail (somente leitura), perfil(s), filial e status ativo/inativo

Dado que o usuário autenticado possui perfil Gerente
Quando tenta acessar o formulário de edição de um usuário de outra filial
Então o sistema exibe erro de acesso negado e não exibe o formulário

Dado que o usuário autenticado possui perfil Gerente
Quando o formulário de edição é exibido
Então a opção de perfil "Administrador" não aparece na lista de perfis disponíveis
E o campo filial exibe apenas a filial do Gerente, sem possibilidade de alteração

Dado que o usuário preenche os campos corretamente e aciona "Salvar"
Quando os dados são válidos
Então o sistema atualiza o registro do usuário
E redireciona para a listagem de usuários

Dado que o usuário remove todos os perfis e tenta salvar
Quando aciona "Salvar"
Então o sistema exibe mensagem de erro indicando que ao menos um perfil é obrigatório
E não atualiza o registro

Dado que o usuário marca o status como inativo e aciona "Salvar"
Quando a operação é concluída com sucesso
Então o usuário inativado não consegue mais autenticar-se no sistema

Dado que o Administrador tenta inativar a si mesmo
Quando aciona "Salvar" com o status inativo
Então o sistema exibe mensagem de erro impedindo a operação
E mantém o registro inalterado

Dado que o usuário aciona "Cancelar"
Quando está no formulário de edição
Então é redirecionado para a listagem de usuários sem salvar nenhuma alteração
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Administrador** ou **Gerente**. O Gerente só pode editar usuários da própria filial.

## Fora de escopo

- Alteração de e-mail do usuário.
- Exclusão permanente de registros de usuário (apenas inativação).
- Edição em lote de múltiplos usuários simultaneamente.
- Redefinição ou criação de senha (o sistema usa autenticação por e-mail; não existe senha).
- Histórico de alterações do perfil do usuário (auditoria detalhada).

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Formulário de edição de usuário | `/users/:id/edit` | Alterar dados de um usuário existente |

### Diagrama de navegação

```
/users (listagem)
  └── /users/:id/edit (formulário de edição)
        ├── [salvar com sucesso] → /users (listagem de usuários)
        ├── [cancelar] → /users (listagem de usuários)
        └── [erro de validação] → permanece em /users/:id/edit com mensagens de erro
```

### Nota de navegação

O acesso vem do botão de ação "Editar" na linha correspondente do usuário na listagem `/users` (feature `009-03.listar-usuarios`). Não há entrada direta no menu lateral para este formulário.
