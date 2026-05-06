# Fundação — Módulo 000

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Meta-feature que agrupa as features de infraestrutura que constituem a fundação do sistema. Define os pré-requisitos para todas as features de negócio dos módulos seguintes.

Feature de infraestrutura — não é uma feature de negócio.

## Stack envolvido

- Java 25, Spring Boot 4, Spring Security + OAuth2 Resource Server
- PostgreSQL 18
- React 19, TypeScript, Vite

## Regras de negócio

O módulo 000 é composto pelas seguintes features, que devem ser implementadas nessa ordem:

| Feature | Descrição |
|---|---|
| 000-01.modelagem-dados | Schema completo do banco de dados — fundação para todas as demais |
| 000-02.autenticacao | Autenticação via Google OAuth2 e dev bypass; JWT de sessão |
| 000-03.home-navegacao | Tela home e estrutura de navegação por perfil |

Todas as features de negócio (módulos 001+) dependem do módulo 000 estar implementado e aprovado antes de serem desenvolvidas.

## Critérios de aceite

```gherkin
Cenário: Fundação completa
  Dado que o módulo 000 está implementado
  Quando qualquer feature de negócio é desenvolvida
  Então ela pode referenciar as tabelas definidas em 000-01
  E utilizar a autenticação definida em 000-02
  E seguir a estrutura de navegação definida em 000-03
```

## Quem pode acessar

N/A — meta-feature organizacional.

## Fora de escopo

Qualquer funcionalidade de negócio dos módulos 001+.
