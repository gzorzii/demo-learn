# Fundação — Módulo 000

**Delivery status:** Draft

## Nome do recurso e objetivo

Infrastructure feature — not a business feature.

Módulo de fundação do sistema de gestão de livrarias. Agrupa as features de infraestrutura que precisam existir antes de qualquer feature de negócio ser implementada: modelagem de dados, autenticação e estrutura de navegação. Todas as features de negócio (módulos 001+) dependem deste módulo.

## Features deste módulo

| Feature | Descrição |
|---|---|
| `000-01.modelagem-dados` | Modelo completo de entidades e tabelas relacionais do sistema |
| `000-02.autenticacao` | Autenticação por e-mail com JWT via cookie httpOnly |
| `000-03.home-navegacao` | Tela inicial e navegação com controle de acesso por perfil |

## Stack envolvida

- Java 25 / Spring Boot 4
- PostgreSQL 18 / Liquibase
- React 19 / TypeScript / Vite
- Spring Security + OAuth2 Resource Server

## Regras de negócio

1. Este módulo não entrega valor de negócio direto ao usuário final — é pré-requisito técnico para todos os demais módulos.
2. A feature `000-01.modelagem-dados` deve ser implementada e migrada antes de qualquer outra feature.
3. A feature `000-02.autenticacao` depende das tabelas `user`, `role` e `user_role` definidas em `000-01`.
4. A feature `000-03.home-navegacao` depende da autenticação (`000-02`) para determinar quais opções exibir.
5. Todas as demais features de negócio dependem de `000-02` para autorização de acesso.

## Critérios de aceitação

```gherkin
# language: pt

Funcionalidade: Fundação do sistema

  Cenário: Sistema inicializado com schema e seed de perfis
    Dado que a migration "001-initial-schema" foi executada com sucesso
    Então as tabelas "branch", "user", "role", "user_role", "book" e demais entidades devem existir no banco
    E os quatro perfis fixos ("Administrador", "Gerente", "Catalogador", "Caixa") devem estar presentes na tabela "role"

  Cenário: Acesso ao sistema requer autenticação
    Dado que a autenticação está configurada
    Quando qualquer requisição a uma rota protegida é feita sem cookie válido
    Então o sistema retorna HTTP 401

  Cenário: Home exibe conteúdo adequado ao perfil após login
    Dado que o sistema está com schema migrado e autenticação funcional
    Quando um usuário autentica com sucesso
    Então é redirecionado para a home
    E vê apenas os módulos correspondentes ao(s) seu(s) perfil(is)
```

## Quem pode acessar

Módulo de infraestrutura. Não há interface de usuário específica para este módulo. Os entregáveis são: schema de banco de dados, seed de perfis, endpoint de login e estrutura de navegação frontend.

## Fora do escopo

- Qualquer feature de negócio (cadastro de livros, PDV, relatórios, etc.).
- Painel administrativo de infraestrutura.
- Monitoramento ou observabilidade (logs, métricas, tracing).
- CI/CD e configuração de ambiente de produção.
