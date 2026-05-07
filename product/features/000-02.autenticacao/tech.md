# Tech — Autenticação

**Delivery status:** Draft

## Visão técnica

A autenticação é implementada sem senha: o usuário informa apenas o e-mail, o backend consulta as tabelas `user`, `user_role` e `role`, valida a existência do usuário ativo com ao menos um perfil associado, e emite um JWT assinado entregue via cookie `httpOnly`. O Spring Security atua como OAuth2 Resource Server para validar o token em todas as rotas protegidas, lendo-o a partir do cookie em vez do cabeçalho `Authorization`.

O frontend nunca acessa o token diretamente. Para exibição de informações do usuário (nome, perfis, filial), o frontend decodifica o payload Base64 do JWT sem verificar a assinatura — operação puramente local, sem chamada ao backend.

## Stack

- Java 25 / Spring Boot 4.0.6
- Spring Security 6 + OAuth2 Resource Server (`spring-security-oauth2-resource-server`)
- `spring-security-oauth2-jose` — geração e validação de JWT (RSA ou HMAC-SHA256)
- PostgreSQL 18 — tabelas `"user"`, `role`, `user_role`
- Spring Data JPA — consulta de usuário por e-mail
- React 19.2.5 / TypeScript 6.0.2 — tela de login e decodificação de payload
- Vite 8.0.10

## Backend — estrutura de pacotes e classes

| Classe / Interface | Pacote | Responsabilidade |
|---|---|---|
| `AuthController` | `com.ciet.demo_learn.auth` | Recebe `POST /auth/login`, delega ao serviço, seta o cookie na resposta |
| `AuthService` | `com.ciet.demo_learn.auth` | Valida e-mail, verifica perfis ativos, emite JWT via `JwtTokenProvider` |
| `JwtTokenProvider` | `com.ciet.demo_learn.auth` | Constrói e assina o JWT com os claims definidos; configura expiração de 8h |
| `LoginRequest` | `com.ciet.demo_learn.auth.dto` | Record com campo `email` (validação `@Email @NotBlank`) |
| `SecurityConfig` | `com.ciet.demo_learn.config` | `SecurityFilterChain`: libera `/auth/login`, protege demais rotas; configura `CookieBearerTokenResolver` |
| `CookieBearerTokenResolver` | `com.ciet.demo_learn.config` | Implementa `BearerTokenResolver`; lê o JWT do cookie `auth_token` em vez do header `Authorization` |
| `UserRepository` | `com.ciet.demo_learn.user` | `findByEmailAndActiveTrue(String email)` — retorna `Optional<User>` |
| `User` | `com.ciet.demo_learn.user` | Entidade JPA para tabela `"user"` (`@Table(name = "\"user\"")`) |
| `Role` | `com.ciet.demo_learn.user` | Entidade JPA para tabela `role` |
| `UserRole` | `com.ciet.demo_learn.user` | Entidade JPA para tabela `user_role` com `@EmbeddedId UserRoleId` |

## Backend — fluxo de autenticação

1. Cliente envia `POST /auth/login` com body `{ "email": "..." }`.
2. `AuthController` deserializa o body em `LoginRequest` e valida com `@Valid`.
3. `AuthController` chama `AuthService.login(email)`.
4. `AuthService` busca o usuário via `UserRepository.findByEmailAndActiveTrue(email)`. Se não encontrado → lança exceção → controller responde `401`.
5. `AuthService` verifica se o usuário possui ao menos um registro em `user_role`. Se vazio → `401`.
6. `AuthService` coleta os nomes dos perfis (`role.name`) associados ao usuário e o `branch_id`.
7. `AuthService` chama `JwtTokenProvider.generate(user, roles)`.
8. `JwtTokenProvider` constrói o JWT com claims: `sub` (UUID do usuário), `name`, `email`, `roles` (lista de strings), `branchId` (UUID ou `null`), `iat`, `exp` (now + 8h).
9. `AuthController` recebe o token e cria o cookie:
   - Nome: `auth_token`
   - `httpOnly = true`
   - `sameSite = Strict`
   - `secure = true` (condicional: `false` em perfil `dev`)
   - `path = /`
   - `maxAge = 28800` (8h em segundos)
10. Controller adiciona o cookie ao `HttpServletResponse` e retorna `HTTP 200` sem corpo.

## Backend — configuração Spring Security

**`SecurityConfig`**

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(AbstractHttpConfigurer::disable)
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/auth/login").permitAll()
            .anyRequest().authenticated()
        )
        .oauth2ResourceServer(oauth2 -> oauth2
            .bearerTokenResolver(new CookieBearerTokenResolver())
            .jwt(jwt -> jwt.decoder(jwtDecoder()))
        );
    return http.build();
}
```

**`CookieBearerTokenResolver`**

Implementa `BearerTokenResolver`. Extrai o valor do cookie `auth_token` da requisição:

```java
@Override
public String resolve(HttpServletRequest request) {
    if (request.getCookies() == null) return null;
    return Arrays.stream(request.getCookies())
        .filter(c -> "auth_token".equals(c.getName()))
        .map(Cookie::getValue)
        .findFirst()
        .orElse(null);
}
```

**`JwtDecoder`** — configurado com a chave secreta HMAC-SHA256 ou chave pública RSA (definida via `application.properties`). Exemplo com chave simétrica:

```java
@Bean
public JwtDecoder jwtDecoder() {
    return NimbusJwtDecoder.withSecretKey(secretKey).build();
}
```

**Propriedades relevantes (`application.properties`)**

```properties
app.jwt.secret=<chave-base64-256-bits>
app.jwt.expiration-seconds=28800
app.cookie.secure=true   # false no perfil dev
```

## Frontend — estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/pages/LoginPage.tsx` | Formulário com campo de e-mail; chama `authService.login(email)`; redireciona para `/` em caso de sucesso |
| `src/services/authService.ts` | `login(email)`: `POST /auth/login`; trata `401` redirecionando para `/login` |
| `src/hooks/useAuth.ts` | Lê e decodifica o payload do cookie JWT (sem verificar assinatura); expõe `{ user, roles, branchId, isAuthenticated }` |
| `src/components/PrivateRoute.tsx` | HOC / wrapper que verifica `isAuthenticated`; redireciona para `/login` se falso |
| `src/router/AppRouter.tsx` | Define rotas: `/login` (pública), `/` e demais (protegidas via `PrivateRoute`) |
| `src/types/auth.ts` | Types TypeScript: `JwtPayload`, `AuthUser` |

## Frontend — fluxo de autenticação

1. Usuário acessa qualquer rota protegida sem cookie → `PrivateRoute` redireciona para `/login`.
2. `LoginPage` exibe o campo de e-mail e botão de entrar.
3. Ao submeter, `authService.login(email)` envia `POST /auth/login` com `credentials: 'include'`.
4. Em caso de `200`, o browser armazena automaticamente o cookie `auth_token` (httpOnly).
5. `LoginPage` redireciona para `/` via React Router.
6. `useAuth` lê o cookie `auth_token`, separa o payload (segunda parte do JWT), decodifica Base64 e faz `JSON.parse` — obtém `sub`, `name`, `email`, `roles`, `branchId`, `exp`.
7. `useAuth` verifica se `exp` (epoch seconds) ainda é futuro; se não → limpa estado e redireciona para `/login`.
8. Em caso de `401` em qualquer requisição subsequente, o interceptor do `authService` redireciona para `/login`.

> **Nota:** A leitura do cookie `httpOnly` via JavaScript **não é possível**. Para decodificar o JWT no frontend, o backend deve expor um endpoint adicional `GET /auth/me` retornando o payload — **ou** o cookie `auth_token` deve ser complementado por um segundo cookie não-httpOnly (ex.: `auth_info`) contendo apenas o payload Base64. A decisão entre as duas abordagens deve ser tomada durante a implementação.

## Observações de implementação

- A tabela `user` é palavra reservada no PostgreSQL; o mapeamento JPA deve usar `@Table(name = "\"user\"")`.
- `UserRepository` deve filtrar apenas `active = true`; usuários desativados não devem autenticar.
- A verificação de perfil (`user_role`) deve ser feita com `JOIN FETCH` para evitar N+1.
- O campo `branchId` no JWT é `null` para o perfil Administrador — o frontend deve tratar esse caso na exibição.
- Em ambiente de desenvolvimento (perfil Spring `dev`), o cookie deve ser criado sem a flag `Secure` para compatibilidade com HTTP local.
- A chave de assinatura do JWT não deve estar hardcoded — deve ser lida de variável de ambiente ou `application.properties` (fora do controle de versão).
- Não existe endpoint de logout; o token expira em 8h. O frontend pode "deslogar" localmente ignorando o cookie expirado, mas o cookie permanece no browser até o `Max-Age` zerar.
- O frontend **não verifica a assinatura** do JWT — isso é intencional e seguro porque toda operação sensível passa pelo backend, que valida o token completamente.
- Erros de validação do `LoginRequest` (`@Valid`) devem retornar `400`, não `401`, para diferenciar requisição malformada de credencial inválida.
