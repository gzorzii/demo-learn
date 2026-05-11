# Cadastrar Usuário

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Permite que Administradores e Gerentes criem novos usuários no sistema. O usuário cadastrado passa a poder autenticar-se via e-mail (conforme `000-02.autenticacao`). Sem esse cadastro prévio, nenhuma pessoa consegue acessar o sistema.

## Atores envolvidos

- **Administrador** — cria usuários em qualquer filial, podendo atribuir qualquer perfil incluindo `Administrador`.
- **Gerente** — cria usuários somente na própria filial; não pode atribuir o perfil `Administrador`.

## Regras de negócio

1. Campos obrigatórios: nome completo, e-mail e pelo menos um perfil.
2. O e-mail deve ser único no sistema. Se já existir outro usuário cadastrado com o mesmo e-mail, o sistema rejeita o cadastro.
3. O e-mail não pode ser alterado após o cadastro — qualquer correção exige criar um novo registro.
4. Ao menos um perfil deve ser selecionado. Perfis disponíveis: `Administrador`, `Gerente`, `Catalogador`, `Caixa`.
5. O Gerente não pode atribuir o perfil `Administrador`.
6. Quando o(s) perfil(s) selecionado(s) incluir qualquer perfil diferente de `Administrador`, a filial é obrigatória.
7. Quando o único perfil selecionado for `Administrador`, o campo filial não é exibido e `branch_id` fica nulo.
8. O Gerente só pode vincular o novo usuário à própria filial — o campo filial é pré-preenchido e não editável.
9. O usuário é criado com status ativo por padrão.
10. O sistema não envia nenhum e-mail de boas-vindas automático ao criar o usuário; o Administrador ou Gerente é responsável por comunicar o acesso ao colaborador.

## Critérios de aceite

```gherkin
Dado que o usuário autenticado possui perfil Administrador ou Gerente
Quando acessa o formulário de cadastro de usuário
Então o formulário exibe os campos: nome, e-mail, perfil(s) e filial

Dado que o usuário autenticado possui perfil Gerente
Quando o formulário é exibido
Então o campo filial está pré-preenchido com a filial do Gerente e não é editável
E a opção de perfil "Administrador" não aparece na lista de perfis disponíveis

Dado que o usuário preenche todos os campos obrigatórios corretamente
Quando aciona "Salvar"
Então o sistema cria o registro do usuário com status ativo
E redireciona para a listagem de usuários

Dado que o usuário informa um e-mail já cadastrado no sistema
Quando aciona "Salvar"
Então o sistema exibe mensagem de erro indicando que o e-mail já está em uso
E não cria o registro

Dado que o usuário seleciona apenas o perfil "Administrador"
Quando o formulário é renderizado
Então o campo filial não é exibido

Dado que o usuário seleciona qualquer perfil diferente de "Administrador" (ou múltiplos incluindo outros)
Quando o formulário é renderizado
Então o campo filial torna-se obrigatório e visível

Dado que o usuário tenta salvar sem preencher campos obrigatórios
Quando aciona "Salvar"
Então o sistema exibe mensagens de erro nos campos inválidos
E não cria o registro

Dado que o usuário aciona "Cancelar"
Quando está no formulário de cadastro
Então é redirecionado para a listagem de usuários sem criar nenhum registro
```

## Quem pode acessar

Apenas usuários autenticados com perfil **Administrador** ou **Gerente**.

## Fora de escopo

- Envio de e-mail de boas-vindas ou convite automático.
- Importação em lote de usuários via arquivo.
- Definição de senha (o sistema usa autenticação por e-mail; não existe senha).
- Criação de perfis customizados.
- Edição de usuários existentes — coberto por `009-02.editar-usuario`.

## Fluxo de telas

### Telas introduzidas

| Tela | Rota | Propósito |
|---|---|---|
| Formulário de cadastro de usuário | `/users/new` | Preencher e salvar os dados de um novo usuário |

### Diagrama de navegação

```
/ (home) ou /users (listagem)
  └── /users/new (formulário de cadastro)
        ├── [salvar com sucesso] → /users (listagem de usuários)
        ├── [cancelar] → /users (listagem de usuários)
        └── [erro de validação] → permanece em /users/new com mensagens de erro
```

### Nota de navegação

O acesso vem do botão "Novo Usuário" na listagem `/users` (feature `009-03.listar-usuarios`). A entrada no menu de navegação lateral é "Usuários", visível para Administrador e Gerente.
