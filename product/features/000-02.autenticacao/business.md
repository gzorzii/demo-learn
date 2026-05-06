# Autenticação

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Autenticação de usuários no sistema. Controla acesso por ambiente (desenvolvimento e produção), gerencia sessão via JWT, e integra com Google OAuth2 como provedor externo.

Feature de infraestrutura — não é uma feature de negócio.

## Stack envolvido

- Spring Security + OAuth2 Resource Server
- JWT (sessão após autenticação)
- Google OAuth2 (provedor externo)
- PostgreSQL 18 (tabelas de usuários e perfis)
- Java 25, Spring Boot 4
- React 19, TypeScript (tela de login)

## Regras de negócio

### Ambiente de desenvolvimento (`dev`)

1. Login via Google OAuth2 disponível.
2. Login via usuário de dev disponível: exibe lista de usuários pré-cadastrados no seed; usuário seleciona e entra sem senha real.
3. Objetivo do login dev: permitir testar a aplicação com usuários de perfis variados sem necessidade de contas Google reais.
4. Usuários de dev são pré-cadastrados no seed do banco com perfis variados (Administrator, Manager, Catalog, Cashier).

### Ambiente de produção (`prod`)

5. Somente login via Google OAuth2.
6. Login de dev completamente desabilitado — qualquer endpoint de dev retorna erro ou não existe no build de prod.

### Regras gerais (ambos os ambientes)

7. Todo usuário autenticado deve ter ao menos um perfil atribuído.
8. Um usuário pode ter múltiplos perfis simultaneamente.
9. Perfis fixos: Administrator, Manager, Catalog, Cashier.
10. Após autenticação (por qualquer método), o sistema emite um JWT de sessão.
11. Usuário sem perfil não pode acessar nenhuma tela protegida.

## Critérios de aceite

```gherkin
Cenário: Login via Google OAuth2 em ambiente de desenvolvimento
  Dado que estou na tela de login em ambiente dev
  Quando clico em "Entrar com Google"
  Então sou redirecionado para o fluxo OAuth2 do Google
  E ao retornar autenticado recebo um JWT de sessão válido

Cenário: Login via usuário de dev em ambiente de desenvolvimento
  Dado que estou na tela de login em ambiente dev
  Quando clico em "Entrar como usuário de teste"
  Então vejo a lista de usuários pré-cadastrados com seus perfis
  E ao selecionar um usuário recebo JWT de sessão com os perfis desse usuário

Cenário: Login de dev desabilitado em produção
  Dado que o sistema está em ambiente prod
  Quando acesso qualquer endpoint de login de dev
  Então recebo erro 404 ou 403
  E não consigo autenticar via bypass

Cenário: Usuário sem perfil bloqueado
  Dado que sou um usuário autenticado sem nenhum perfil atribuído
  Quando tento acessar qualquer tela protegida
  Então recebo erro de acesso negado
  E sou redirecionado para tela de acesso restrito

Cenário: Usuário com múltiplos perfis
  Dado que sou um usuário com perfis Manager e Catalog
  Quando me autentico
  Então meu JWT contém ambos os perfis
  E tenho acesso às telas permitidas para os dois perfis
```

## Quem pode acessar

- Tela de login: pública (não autenticada)
- Endpoint de login dev: somente em ambiente `dev`
- Qualquer tela pós-login: requer JWT válido com ao menos um perfil

## Fora de escopo

- Criação de usuários (responsabilidade do Manager/Administrator via User Management)
- Recuperação de senha (autenticação delegada ao Google)
- Logout explícito com invalidação server-side de JWT
- Multi-fator (MFA)
- Gestão de sessões simultâneas

## Questões em aberto

- Tempo de expiração do JWT: definir valor padrão (sugestão: 8h para sessão de trabalho).
- Refresh token: implementar ou forçar relogin ao expirar?
