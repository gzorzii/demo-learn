# 000-00 Fundação

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Meta-feature que agrupa as três features de infraestrutura que formam a fundação do sistema de livraria/sebo. Nenhuma feature de negócio pode ser desenvolvida antes que a fundação esteja completa. O módulo `000` cobre: modelagem de dados, autenticação e navegação.

Feature de infraestrutura — não é uma feature de negócio.

## Stack envolvido

- PostgreSQL 18 + Liquibase (000-01)
- Spring Boot 4 + Spring Security + OAuth2 + JWT (000-02)
- React 19 + TypeScript + Vite + React Router (000-03)

## Regras de negócio

1. A fundação é pré-requisito de todas as demais features do sistema.
2. As três sub-features devem ser entregues na ordem: 000-01 → 000-02 → 000-03.
3. A migration de 000-01 deve ser executada com sucesso antes de qualquer desenvolvimento de 000-02 ou 000-03.
4. A autenticação de 000-02 depende das tabelas `user`, `role` e `user_role` definidas em 000-01.
5. A navegação de 000-03 depende do JWT e dos perfis definidos em 000-02.

## Critérios de aceite

```gherkin
Funcionalidade: Completude da fundação

  Cenário: Migration inicial executada com sucesso
    Dado que o banco PostgreSQL 18 está vazio
    Quando a migration 001-initial-schema é aplicada via Liquibase
    Então todas as tabelas são criadas sem erro
    E os 4 perfis fixos estão presentes na tabela role

  Cenário: Fluxo completo de autenticação e navegação
    Dado que a migration foi aplicada com sucesso
    E os usuários de dev foram inseridos no seed
    Quando um usuário de dev faz login no ambiente dev
    Então recebe um JWT válido
    E é redirecionado para a home com os módulos corretos para o seu perfil
```

## Quem pode acessar

- Esta meta-feature não representa uma tela ou endpoint — é uma unidade de planejamento.
- O progresso é rastreado pelos `tech.md` das sub-features 000-01, 000-02 e 000-03.

## Fora de escopo

- Qualquer funcionalidade de negócio (cadastro de livros, PDV, etc.) — essas são features do módulo `001+`.
- Configuração de infraestrutura de hospedagem (Docker, CI/CD, cloud).
- Configuração do Google OAuth2 Console — responsabilidade do time de operações.
