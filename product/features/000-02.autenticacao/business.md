# 000-02 Autenticação

**Estado da entrega:** Rascunho

## Nome do recurso e objetivo

Define o mecanismo de autenticação do sistema: login via Google OAuth2 para produção e login de desenvolvimento via seleção de usuário pré-cadastrado para o ambiente de dev. Após autenticação bem-sucedida, o backend emite um JWT que representa a sessão do usuário no frontend.

Feature de infraestrutura — não é uma feature de negócio.

## Stack envolvido

- Spring Boot 4 + Spring Security + OAuth2 Resource Server
- Google OAuth2 (provider externo)
- JWT (assinado pelo backend) — expiração de 8 horas, sem refresh token
- Spring Profiles: `dev` e `prod`
- PostgreSQL 18 — tabelas `user`, `role`, `user_role` (definidas em 000-01)
- React 19 + TypeScript — rota `/auth/callback` no frontend

## Regras de negócio

1. **Ambiente `prod`:** somente login via Google OAuth2 está disponível. A rota de login de dev não existe ou retorna 404.
2. **Ambiente `dev`:** login via Google OAuth2 e login de dev (bypass) estão disponíveis simultaneamente.
3. **Login de dev:** o usuário seleciona um dos usuários pré-cadastrados no seed do banco (sem senha real). Objetivo: permitir testar a aplicação com diferentes perfis sem contas Google reais.
4. **Usuários de dev** são pré-cadastrados no seed do banco e possuem perfis variados (Administrador, Gerente, Catalogador, Caixa).
5. **Todo usuário autenticado** — por qualquer método — deve ter ao menos um perfil atribuído. A autenticação é recusada se o usuário não possuir perfil.
6. **Novo usuário via Google:** se o `google_sub` não existir na base, um registro de usuário é criado automaticamente. O usuário recém-criado não possui perfil e não acessa o sistema até que um perfil seja atribuído por um Administrador ou Gerente.
7. **Emissão do JWT:** após autenticação bem-sucedida, o backend redireciona o navegador para `{FRONTEND_URL}/auth/callback?token=<jwt>`.
8. **Expiração do JWT:** 8 horas. Sem refresh token — ao expirar, o usuário deve reautenticar.
9. **Payload obrigatório do JWT:**
   - `sub`: `user.id` (UUID)
   - `name`: nome do usuário
   - `email`: e-mail do usuário
   - `roles`: array de nomes de perfis (ex.: `["Gerente", "Catalogador"]`)
   - `branchId`: UUID da filial do usuário (nullable — `null` para Administrador)
   - `iat`: timestamp de emissão
   - `exp`: timestamp de expiração
10. O frontend armazena o JWT e o envia em todas as requisições autenticadas via header `Authorization: Bearer <token>`.
11. O backend valida o JWT em cada requisição protegida via Spring Security OAuth2 Resource Server.
12. Não há sessão server-side — o JWT é a única fonte de verdade da sessão.

## Critérios de aceite

```gherkin
Funcionalidade: Autenticação via Google OAuth2

  Cenário: Login bem-sucedido com Google em produção
    Dado que o ambiente é "prod"
    E o usuário possui conta Google cadastrada no sistema com ao menos um perfil
    Quando o usuário clica em "Entrar com Google" e conclui o fluxo OAuth2
    Então o backend emite um JWT com os dados do usuário
    E redireciona para /auth/callback?token=<jwt> no frontend

  Cenário: Usuário Google sem perfil não acessa o sistema
    Dado que o ambiente é "prod"
    E o usuário se autenticou com Google mas não possui perfil atribuído
    Quando o fluxo OAuth2 é concluído
    Então o backend redireciona para uma página de erro informando que o acesso não foi liberado

  Cenário: Novo usuário Google tem registro criado automaticamente
    Dado que o ambiente é "prod"
    E o google_sub do usuário não existe na base
    Quando o fluxo OAuth2 é concluído com sucesso
    Então um registro de usuário é criado com name e email do Google
    E o usuário não recebe acesso até que um perfil seja atribuído

Funcionalidade: Login de desenvolvimento (bypass)

  Cenário: Login de dev disponível apenas em ambiente dev
    Dado que o ambiente é "prod"
    Quando se acessa a rota de login de dev
    Então a resposta é 404

  Cenário: Seleção de usuário de dev
    Dado que o ambiente é "dev"
    E existem usuários pré-cadastrados no seed com diferentes perfis
    Quando o usuário acessa a tela de login de dev
    Então uma lista de usuários pré-cadastrados é exibida para seleção
    E ao selecionar um usuário, um JWT é emitido para aquele usuário sem verificação de senha

  Cenário: Login de dev emite JWT idêntico ao de produção
    Dado que o ambiente é "dev"
    Quando o usuário seleciona um usuário de dev
    Então o JWT emitido contém os mesmos campos que o JWT de produção
    E o payload inclui sub, name, email, roles, branchId, iat e exp

Funcionalidade: Validação e uso do JWT

  Cenário: JWT válido autoriza acesso a endpoint protegido
    Dado que o usuário possui um JWT válido e não expirado
    Quando faz uma requisição a um endpoint protegido com Authorization: Bearer <token>
    Então a requisição é processada normalmente

  Cenário: JWT expirado é rejeitado
    Dado que o usuário possui um JWT com exp no passado
    Quando faz uma requisição a um endpoint protegido
    Então recebe 401 Unauthorized

  Cenário: Requisição sem JWT é rejeitada
    Quando uma requisição é feita a um endpoint protegido sem header Authorization
    Então recebe 401 Unauthorized

  Cenário: JWT contém branchId nulo para Administrador
    Dado que o usuário autenticado possui perfil Administrador
    Quando o JWT é emitido
    Então o campo branchId no payload é null
```

## Quem pode acessar

- A tela de login (Google OAuth2) é pública — qualquer pessoa com URL de acesso pode tentar autenticar.
- O login de dev é restrito ao ambiente `dev` (Spring Profile `dev`).
- A listagem de usuários de dev para seleção é acessível sem autenticação, exclusivamente no ambiente `dev`.

## Fora de escopo

- Refresh token ou renovação automática de sessão.
- Login por e-mail e senha próprios do sistema.
- Autenticação multifator (MFA).
- Integração com outros providers OAuth2 além do Google.
- Gerenciamento de sessões server-side.
- Revogação de JWTs antes da expiração.
- Recuperação de acesso para usuários bloqueados.

## Questões em aberto

- Definir a URL de redirecionamento autorizada no Google OAuth2 Console para os ambientes de dev e prod.
- Decidir o comportamento quando o e-mail do Google já existe na base mas o `google_sub` é diferente (possível relink de conta).
- Definir quem (Administrador ou Gerente) atribui perfil ao usuário recém-criado via Google — e se há um fluxo de aprovação.
