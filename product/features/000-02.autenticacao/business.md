# Autenticação

**Delivery status:** Concluído

## Nome do recurso e objetivo

Infrastructure feature — not a business feature.

Define o mecanismo de autenticação do sistema. Usuários pré-cadastrados no banco de dados realizam login informando apenas o e-mail; o sistema valida a existência do e-mail, emite um JWT e o entrega via cookie `httpOnly`. Não há senha, link mágico, OTP, nem provedor externo (ex.: Google OAuth). O frontend nunca acessa o token diretamente.

## Stack envolvida

- Spring Boot 4 / Spring Security + OAuth2 Resource Server
- JWT (JSON Web Token) — biblioteca `spring-security-oauth2-jose`
- Cookie `httpOnly`, `SameSite=Strict`, `Secure` (produção)
- React 19 / TypeScript — frontend consome cookie automaticamente via browser
- PostgreSQL 18 — tabelas `user`, `role`, `user_role`

## Regras de negócio

1. O login é feito exclusivamente por e-mail — não existe campo de senha.
2. Apenas usuários pré-cadastrados no banco (por Gerente ou Administrador) podem autenticar.
3. Todo usuário deve ter pelo menos um perfil (`role`) associado; sem perfil, o acesso é negado.
4. Os perfis possíveis são fixos: `Administrador`, `Gerente`, `Catalogador`, `Caixa`.
5. Um mesmo usuário pode ter múltiplos perfis simultaneamente.
6. Após validação do e-mail, o backend emite um JWT e o entrega em cookie `httpOnly`.
7. O cookie possui as flags: `HttpOnly`, `SameSite=Strict`, `Secure` (apenas em produção). Em ambiente de desenvolvimento, `Secure` pode ser omitido.
8. O frontend não lê nem armazena o token JWT diretamente; o browser o envia automaticamente em cada requisição.
9. O frontend decodifica o payload do JWT (sem verificar assinatura) apenas para leitura de `roles`, `name` e `email` — exclusivamente para fins de exibição na interface.
10. O JWT expira em **8 horas** a partir da emissão. Não existe mecanismo de refresh token.
11. Ao receber um erro `401 Unauthorized`, o frontend redireciona o usuário para a tela de login para nova autenticação.
12. Após login bem-sucedido, o frontend redireciona o usuário para a tela inicial (`/`).
13. Rotas protegidas no backend exigem um JWT válido e não expirado, entregue via cookie.
14. O payload do JWT contém: `sub` (UUID do usuário), `name`, `email`, `roles` (array de strings), `branchId` (UUID da filial ou `null` para Administrador), `iat`, `exp`.

## Contrato da API

### `POST /auth/login`

**Request body:**
```json
{ "email": "usuario@exemplo.com" }
```

**Resposta de sucesso — HTTP 200:**
- Nenhum corpo de resposta (ou corpo vazio).
- Cookie `httpOnly` definido com o JWT.

**Resposta de erro — HTTP 401:**
```json
{ "error": "E-mail não encontrado ou usuário sem perfil ativo." }
```

**Cookie gerado:**
```
Set-Cookie: auth_token=<jwt>; HttpOnly; SameSite=Strict; Secure; Path=/; Max-Age=28800
```

### Payload do JWT (exemplo)

```json
{
  "sub": "019623ab-1234-7abc-bcd4-ef0123456789",
  "name": "Maria Silva",
  "email": "maria@livraria.com",
  "roles": ["Gerente", "Catalogador"],
  "branchId": "019623ab-5678-7def-abc1-234567890123",
  "iat": 1746600000,
  "exp": 1746628800
}
```

## Critérios de aceitação

```gherkin
# language: pt

Funcionalidade: Autenticação por e-mail

  Cenário: Login com e-mail válido e perfil ativo
    Dado que o usuário "joao@livraria.com" está cadastrado no banco
    E possui pelo menos um perfil ativo
    Quando o frontend envia "POST /auth/login" com o corpo '{"email": "joao@livraria.com"}'
    Então o backend retorna HTTP 200
    E o cookie "auth_token" é definido com as flags "HttpOnly", "SameSite=Strict", "Secure"
    E o cookie possui validade de 8 horas

  Cenário: Login com e-mail não cadastrado
    Dado que "desconhecido@livraria.com" não existe no banco de dados
    Quando o frontend envia "POST /auth/login" com esse e-mail
    Então o backend retorna HTTP 401
    E nenhum cookie é definido

  Cenário: Login com e-mail cadastrado mas sem perfil
    Dado que o usuário "semrole@livraria.com" está cadastrado mas não possui nenhum perfil
    Quando o frontend envia "POST /auth/login" com esse e-mail
    Então o backend retorna HTTP 401
    E nenhum cookie é definido

  Cenário: Acesso a rota protegida com JWT válido
    Dado que o browser possui o cookie "auth_token" com um JWT válido e não expirado
    Quando o frontend faz uma requisição a qualquer rota protegida
    Então o backend processa a requisição normalmente
    E retorna o recurso solicitado

  Cenário: Acesso a rota protegida com JWT expirado
    Dado que o browser possui o cookie "auth_token" com um JWT expirado
    Quando o frontend faz uma requisição a qualquer rota protegida
    Então o backend retorna HTTP 401
    E o frontend redireciona o usuário para a tela de login

  Cenário: Redirecionamento após login bem-sucedido
    Dado que o login foi realizado com sucesso
    Quando o cookie é definido pelo backend
    Então o frontend redireciona o usuário para a tela inicial "/"

  Cenário: Exibição de informações do usuário no frontend
    Dado que o usuário está autenticado e o cookie contém um JWT válido
    Quando o frontend precisa exibir o nome, e-mail ou perfis do usuário
    Então o frontend decodifica o payload do JWT sem verificar a assinatura
    E exibe as informações de "name", "email" e "roles" presentes no payload
```

## Quem pode acessar

- O endpoint `POST /auth/login` é público — não requer autenticação prévia.
- Todos os demais endpoints do sistema exigem JWT válido via cookie.
- Não há endpoint de logout explícito no escopo atual; o token expira naturalmente após 8 horas.

## Fora do escopo

- Senha de acesso (nenhum campo de senha existe no sistema).
- Link mágico (magic link) ou OTP por e-mail.
- Autenticação via provedor externo (Google, GitHub, etc.).
- Auto-cadastro de usuários.
- Refresh token ou renovação automática de sessão.
- Logout com invalidação de token no servidor (sem blacklist de JWT).
- Autenticação via cabeçalho `Authorization: Bearer` (apenas cookie).
- Autenticação em aplicativo mobile ou desktop.
