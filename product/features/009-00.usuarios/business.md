# Usuários do Sistema — Módulo 009

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Módulo de gestão dos usuários do sistema (funcionários da livraria). Agrupa as operações de cadastro, edição e listagem de usuários por filial. Garante que apenas pessoas pré-cadastradas por um Administrador ou Gerente possam receber o link de autenticação e acessar o sistema.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `009-01.cadastrar-usuario` | Criar novo usuário informando nome, e-mail, perfil(s) e filial vinculada |
| `009-02.editar-usuario` | Alterar dados de um usuário existente (nome, perfil(s), filial e status ativo/inativo) |
| `009-03.listar-usuarios` | Listar usuários com filtros por filial, perfil e status |

## Atores envolvidos

- **Administrador** — cria e edita usuários em qualquer filial; é o único que pode cadastrar outros Administradores.
- **Gerente** — cria e edita usuários somente na própria filial; não pode criar Administradores.

## Modelo de dados referenciado

Este módulo opera sobre as tabelas `user`, `user_role`, `role` e `branch` definidas em `000-01.modelagem-dados`.

| Tabela | Papel neste módulo |
|---|---|
| `user` | Registro principal do usuário (nome, e-mail, filial, status ativo) |
| `user_role` | Associação N:N entre `user` e `role`; um usuário pode ter múltiplos perfis |
| `role` | Perfis fixos do sistema: `Administrador`, `Gerente`, `Catalogador`, `Caixa` |
| `branch` | Filial à qual o usuário pertence (`user.branch_id`); nulo para Administrador |

## Regras de negócio

1. Perfis do sistema são fixos: `Administrador`, `Gerente`, `Catalogador`, `Caixa`. Não é possível criar perfis customizados.
2. Um usuário pode ter múltiplos perfis simultaneamente.
3. O Administrador não pertence a nenhuma filial (`branch_id` nulo); todos os demais perfis obrigatoriamente pertencem a uma filial.
4. O e-mail do usuário é único no sistema e é o identificador usado para autenticação.
5. Não existe auto-cadastro: somente Administrador e Gerente podem criar usuários.
6. O Gerente só pode criar e editar usuários da própria filial.
7. O Gerente não pode atribuir o perfil `Administrador` a nenhum usuário.
8. Um usuário inativo não consegue autenticar-se no sistema (o endpoint `POST /auth/login` rejeita e-mails de usuários sem perfil ativo — conforme `000-02.autenticacao`).
9. O e-mail de um usuário não pode ser alterado após o cadastro.

## Quem pode acessar

Apenas usuários autenticados com perfil **Administrador** ou **Gerente**. Gerente visualiza e gerencia somente usuários da própria filial.

## Fora de escopo

- Criação de perfis de acesso customizados.
- Auto-cadastro de usuários pela tela de login.
- Recuperação ou redefinição de e-mail.
- Exclusão permanente de registros de usuário (apenas inativação).
- Gestão de filiais (coberta pelo módulo `010-00.filiais`).
