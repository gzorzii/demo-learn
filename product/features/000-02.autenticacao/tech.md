# Autenticação — Technical Design

**Reference:** `business.md` nesta pasta
**Status:** Rascunho

## Visão geral

Feature de infraestrutura que estabelece o mecanismo de autenticação do sistema em dois fluxos: Google OAuth2 (ambos os ambientes) e bypass de dev por seleção de usuário (exclusivo do profile `dev`). Após autenticação bem-sucedida em qualquer fluxo, o backend emite um JWT assinado com HMAC-SHA256 e redireciona o navegador para a rota `/auth/callback` do frontend. O backend opera como Resource Server, validando o JWT em cada requisição protegida via Spring Security — sem sessão server-side.

Camadas afetadas: Security (Spring Security + OAuth2 Login + Resource Server), domínio `user` (lookup e criação de User), configuração (profiles `dev`/`prod`), migration (seed de usuários de dev). No frontend: rota de callback, contexto de autenticação, hook `useAuth` e componente `PrivateRoute`.

Depende diretamente das tabelas `"user"`, `role` e `user_role` definidas em `000-01.modelagem-dados`.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Esta feature não introduz novas tabelas. Utiliza exclusivamente as tabelas já definidas em `000-01`:

| Tabela | Uso nesta feature |
|--------|-------------------|
| `"user"` | Lookup por `google_sub`; criação de novo usuário via Google; lookup por `id` no fluxo dev |
| `role` | Leitura dos perfis para montar o claim `roles` do JWT |
| `user_role` | Verificação de que o usuário possui ao menos um perfil antes de emitir o JWT |

Nenhuma coluna nova é necessária — o campo `google_sub` já faz parte do schema de `000-01`.

### Seed de usuários de dev

O seed deve ser adicionado como um `changeSet` separado (id: `002-dev-seed`, author: `gzorzi`, `context: "dev"`) no arquivo `db/changelog/db.changelog-master.xml` ou em um arquivo incluído por ele. Usar `context: "dev"` garante que o Liquibase só aplique este changeSet quando a propriedade `spring.liquibase.contexts=dev` estiver configurada — o banco de produção nunca recebe estes dados.

O seed deve inserir:

- 4 usuários com `google_sub = NULL` (campo não preenchido — usuários de dev não têm conta Google)
- 1 usuário por perfil: Administrador, Gerente, Catalogador, Caixa
- Os 3 usuários não-Administrador devem ter `branch_id` apontando para uma filial de seed (criada antes deste changeSet)
- O usuário Administrador deve ter `branch_id = NULL` (conforme regra de negócio 9 do `business.md`)
- Inserções nas tabelas `"user"` e `user_role` para cada usuário

Exemplo de valores esperados (UUIDs fixos para reprodutibilidade):

```sql
-- Perfis já existem pelo seed de 000-01 (changeSet 001-initial-schema)
-- Filial de dev deve ser inserida antes dos usuários

INSERT INTO "user" (id, name, email, google_sub, branch_id, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dev Administrador', 'admin@dev.local',    NULL, NULL,                                   NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'Dev Gerente',       'gerente@dev.local',  NULL, '10000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', 'Dev Catalogador',   'catalog@dev.local',  NULL, '10000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', 'Dev Caixa',         'caixa@dev.local',    NULL, '10000000-0000-0000-0000-000000000001', NOW(), NOW());

-- user_role: associar cada usuário ao seu perfil correspondente
-- (role IDs devem bater com os inseridos no seed de 000-01)
```

Os UUIDs fixos são necessários para que testes e documentação possam referenciar usuários de dev de forma determinística.

### Estratégia de migração

- Sem alteração de schema existente.
- O seed de dev é isolado em um changeSet com `context: "dev"` — rollback seguro e sem impacto em produção.
- A filial de seed referenciada pelos usuários de dev deve ser criada no mesmo changeSet ou em um changeSet anterior com o mesmo context.

---

## Contratos de API

### Fluxo Google OAuth2

O fluxo Google OAuth2 é gerenciado pelo Spring Security OAuth2 Login — não há endpoint REST explícito a documentar. Os caminhos abaixo são registrados pelo framework:

| Caminho | Papel |
|---------|-------|
| `GET /oauth2/authorization/google` | Inicia o fluxo — redireciona para o Google |
| `GET /login/oauth2/code/google` | Callback do Google — gerenciado pelo Spring Security |

Após o callback, o `OAuth2UserService` customizado executa a lógica de negócio (lookup/criação de User, validação de perfil) e delega a emissão do JWT para o `JwtTokenService`. Em caso de sucesso, o `AuthenticationSuccessHandler` redireciona para `{FRONTEND_URL}/auth/callback?token=<jwt>`. Em caso de falha (usuário sem perfil), redireciona para `{FRONTEND_URL}/auth/error?reason=no_profile`.

---

### `GET /api/dev/users`

Disponível apenas com `@Profile("dev")`. Lista os usuários de dev pré-cadastrados para seleção na tela de login de dev. Acessível sem autenticação.

- **Authorization**: nenhuma (público no profile `dev`)
- **Request body**: nenhum
- **Query params**: nenhum
- **Response `200`**:

```json
[
  {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "roles": ["string"],
    "branchId": "uuid | null"
  }
]
```

Retorna apenas usuários com `deleted_at IS NULL` e ao menos um perfil atribuído. Usuários sem perfil não aparecem na lista (não podem ser autenticados de qualquer forma).

- **Status codes**:

| Código | Quando ocorre |
|--------|---------------|
| 200 | Listagem retornada com sucesso (pode ser lista vazia) |
| 404 | Profile `prod` — endpoint não registrado; Spring retorna 404 automaticamente |
| 500 | Erro inesperado |

---

### `POST /api/dev/login`

Disponível apenas com `@Profile("dev")`. Emite um JWT para o usuário selecionado sem verificação de senha. Acessível sem autenticação.

- **Authorization**: nenhuma (público no profile `dev`)
- **Query params**:

| Parâmetro | Tipo | Obrigatório | Regras de validação |
|-----------|------|-------------|---------------------|
| `userId` | `UUID` | sim | Deve existir na base, `deleted_at IS NULL`, e possuir ao menos um perfil |

- **Request body**: nenhum
- **Response `200`**: redireciona (`302 Found`) para `{FRONTEND_URL}/auth/callback?token=<jwt>` — o token não é retornado no body, segue o mesmo padrão do fluxo Google para uniformidade

> Motivo: usar redirect (302) em ambos os fluxos garante que o frontend trate o recebimento do token de forma idêntica, independente do caminho de autenticação. O frontend não distingue a origem do token.

- **Status codes**:

| Código | Quando ocorre |
|--------|---------------|
| 302 | JWT emitido — redirect para `/auth/callback?token=<jwt>` |
| 400 | `userId` ausente ou formato inválido (não é UUID) |
| 404 | Usuário não encontrado ou `deleted_at IS NOT NULL` |
| 409 | Usuário encontrado mas sem perfil atribuído |
| 404 | Profile `prod` — endpoint não registrado |
| 500 | Erro inesperado |

- **Edge cases**:
  - Usuário encontrado mas sem perfil: retorna 409 (estado inválido para autenticação) — não emite JWT.

---

### Endpoints protegidos (todos os demais)

Não há endpoint específico para validação de token — a validação é feita automaticamente pelo Spring Security Resource Server em cada requisição. O comportamento esperado:

| Código | Quando ocorre |
|--------|---------------|
| 401 | Token ausente, JWT inválido (assinatura, formato) ou expirado |
| 403 | Token válido mas perfil sem permissão para o recurso |

---

## Payload JWT

O JWT é assinado com HMAC-SHA256 (chave secreta configurada por propriedade). Nenhuma criptografia assimétrica é necessária pois o backend é o único emissor e validador.

```json
{
  "sub":      "uuid-do-usuario",
  "name":     "Nome Completo",
  "email":    "usuario@exemplo.com",
  "roles":    ["Gerente", "Catalogador"],
  "branchId": "uuid-da-filial-ou-null",
  "iat":      1234567890,
  "exp":      1234567890
}
```

Regras de preenchimento:
- `sub`: `user.id` (UUID como string)
- `roles`: lista dos `role.name` associados ao usuário via `user_role`
- `branchId`: `user.branch_id` — `null` para usuários Administrador (sem filial)
- `exp`: `iat + 28800` (8 horas em segundos)

---

## Configuração por profile

### `application-dev.properties`

```properties
# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=GOOGLE_CLIENT_ID_DEV
spring.security.oauth2.client.registration.google.client-secret=GOOGLE_CLIENT_SECRET_DEV
spring.security.oauth2.client.registration.google.redirect-uri={baseUrl}/login/oauth2/code/google

# JWT
app.jwt.secret=dev-secret-256-bits-minimo-aqui
app.jwt.expiration-hours=8

# Frontend
app.frontend.url=http://localhost:5173

# Liquibase — aplica seed de dev
spring.liquibase.contexts=dev
```

### `application-prod.properties`

```properties
# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
spring.security.oauth2.client.registration.google.redirect-uri={baseUrl}/login/oauth2/code/google

# JWT
app.jwt.secret=${JWT_SECRET}
app.jwt.expiration-hours=8

# Frontend
app.frontend.url=${FRONTEND_URL}

# Liquibase — não aplica seed de dev
spring.liquibase.contexts=prod
```

O `JWT_SECRET` em produção deve ter ao menos 256 bits de entropia. Nunca commitar o valor real — usar variável de ambiente ou secret manager.

---

## Componentes backend

### `OAuth2UserService` customizado

Responsável por:
1. Receber o `OAuth2User` retornado pelo Google após autenticação bem-sucedida
2. Extrair `sub` (atributo `sub` do Google), `name` e `email`
3. Buscar o `User` existente via `UserRepository.findByGoogleSubAndDeletedAtIsNull(sub)`
4. Se não encontrar por `sub`, tentar por email via `UserRepository.findByEmailAndDeletedAtIsNull(email)` — se encontrar, atualizar o `google_sub` (relink de conta); se não encontrar, criar novo `User` sem perfil
5. Verificar se o `User` possui ao menos um perfil — se não, lançar exceção que o `AuthenticationFailureHandler` trata
6. Retornar um `OAuth2User` customizado que encapsula o `User` da base

> A tentativa de lookup por email antes de criar novo registro previne duplicatas em caso de relink de conta Google (questão em aberto do `business.md`). Esta decisão deve ser revisada conforme a política definida.

### `JwtTokenService`

Responsável por:
1. Receber um `User` (com perfis carregados)
2. Montar o payload conforme especificação
3. Assinar com HMAC-SHA256 usando a chave de `app.jwt.secret`
4. Retornar o token como `String`

Deve usar a biblioteca Nimbus JOSE+JWT (já incluída transitivamente pelo Spring Security OAuth2 Resource Server).

### `AuthenticationSuccessHandler`

Implementação de `AuthenticationSuccessHandler` que:
1. Recebe o `Authentication` após sucesso (ambos os fluxos)
2. Chama `JwtTokenService` para emitir o token
3. Redireciona o navegador para `{app.frontend.url}/auth/callback?token=<jwt>`

### `AuthenticationFailureHandler`

Implementação de `AuthenticationFailureHandler` que:
1. Identifica o tipo de falha (sem perfil vs. outros erros)
2. Redireciona para `{app.frontend.url}/auth/error?reason=no_profile` para o caso de usuário sem perfil
3. Redireciona para `{app.frontend.url}/auth/error?reason=oauth_error` nos demais casos

### `SecurityConfig`

Configura o `HttpSecurity`:
- Desabilita CSRF (API stateless com JWT)
- Configura o OAuth2 Login com o `OAuth2UserService` customizado, `AuthenticationSuccessHandler` e `AuthenticationFailureHandler`
- Configura o Resource Server com `NimbusJwtDecoder` usando a chave HMAC de `app.jwt.secret`
- Configura um `JwtAuthenticationConverter` que lê o claim `roles` e converte cada entrada em `SimpleGrantedAuthority` com prefixo `ROLE_`
- Define rotas públicas: `/oauth2/**`, `/login/**`
- Define rotas públicas apenas no profile `dev`: `/api/dev/**` — isso deve ser condicionado via `@Profile("dev")` na classe de configuração dos endpoints dev ou via `Environment` no `SecurityConfig`
- Todas as demais rotas requerem autenticação

> O `NimbusJwtDecoder` deve ser configurado com `NimbusJwtDecoder.withSecretKey(...)` (chave simétrica HMAC), não com JWK Set URI (que seria para validação de tokens externos como os do Google). O backend emite e valida seus próprios tokens.

### Componentes dev (`@Profile("dev")`)

- Classe de configuração ou `@RestController` anotado com `@Profile("dev")` contendo os endpoints `GET /api/dev/users` e `POST /api/dev/login`
- O bean deve ser completamente ignorado no profile `prod` — não apenas retornar 404, mas não existir no contexto Spring

---

## Contratos frontend

### Rota `/auth/callback`

Componente React responsável por:
1. Extrair o parâmetro `token` da query string via `useSearchParams`
2. Validar minimamente o token: presença do valor e verificação de expiração via decode do payload (sem verificar assinatura — o backend já validou)
3. Se válido: salvar no `localStorage` com chave `auth_token` e redirecionar para `/` (home)
4. Se inválido ou ausente: redirecionar para `/login` com parâmetro de erro

### `AuthContext` e `AuthProvider`

Provider global (`React.createContext`) que:
1. Lê o token do `localStorage` na inicialização
2. Decodifica o payload JWT (base64) para extrair os claims — sem verificação de assinatura no frontend
3. Verifica expiração (`exp`) para determinar `isAuthenticated`
4. Expõe via contexto:

```typescript
interface AuthContextValue {
  user: {
    sub: string;       // UUID
    name: string;
    email: string;
    roles: string[];
    branchId: string | null;
  } | null;
  isAuthenticated: boolean;
  logout: () => void;
}
```

5. `logout()`: remove o token do `localStorage` e redireciona para `/login`

### Hook `useAuth`

Wrapper sobre `useContext(AuthContext)` que expõe o `AuthContextValue`. Lança erro se usado fora do `AuthProvider`.

### `PrivateRoute`

Componente wrapper que:
1. Consome `useAuth()`
2. Se `isAuthenticated === false`: redireciona para `/login` via `<Navigate>`
3. Se `isAuthenticated === true`: renderiza o `children` ou `<Outlet>`

Pode aceitar opcionalmente uma prop `requiredRole: string` para verificação de perfil antes de renderizar — retorna 403 page se o perfil não estiver em `user.roles`.

---

## Requisitos de qualidade

- [ ] Operações de I/O identificadas? O lookup de `User` no banco durante o fluxo OAuth2 é I/O-bound — candidato a virtual thread (configuração `spring.threads.virtual.enabled=true`).
- [ ] Compatibilidade com GraalVM AOT? O uso de reflexão pelo Nimbus JOSE+JWT e Spring Security OAuth2 requer hints de reflexão se compilação nativa for usada. Marcar como risco técnico.
- [ ] Dados sensíveis tratados corretamente? O `JWT_SECRET` nunca deve aparecer em logs, responses de erro, ou ser commitado. O `google_sub` não é um dado pessoal crítico mas não deve ser exposto desnecessariamente em APIs.
- [ ] Casos de autorização cobertos por perfil? Os endpoints de dev retornam 404 em prod (não existem). Endpoints protegidos retornam 401/403 conforme token ausente ou perfil insuficiente.

---

## Estratégia de testes

### Fluxo Google OAuth2

- Happy path: usuário existente com perfil — JWT emitido com payload correto, redirect para `/auth/callback?token=<jwt>`
- Usuário existente sem perfil — redirect para `/auth/error?reason=no_profile`
- Google `sub` novo, email novo — novo `User` criado sem perfil, redirect para error
- Google `sub` novo, email existente (relink) — `google_sub` atualizado, JWT emitido se o usuário tiver perfil
- Usuário com `deleted_at IS NOT NULL` — tratar como não encontrado (criar novo ou recusar conforme política)

### Fluxo dev bypass

- `GET /api/dev/users` em profile `dev` — retorna lista de usuários com perfis, sem usuários sem perfil
- `POST /api/dev/login?userId=<uuid-válido>` — emite JWT com payload correto e redireciona
- `POST /api/dev/login?userId=<uuid-inexistente>` — 404
- `POST /api/dev/login?userId=<uuid-sem-perfil>` — 409
- `POST /api/dev/login` sem `userId` — 400
- `GET /api/dev/users` e `POST /api/dev/login` em profile `prod` — 404 (bean não registrado)

### Validação de JWT

- Requisição com JWT válido e não expirado — processada normalmente
- Requisição com JWT expirado — 401
- Requisição sem header `Authorization` — 401
- Requisição com token malformado (assinatura inválida) — 401
- Requisição com token de usuário sem permissão para o endpoint — 403

### Payload JWT

- Usuário Administrador: `branchId` é `null` no payload
- Usuário com múltiplos perfis: `roles` contém todos os nomes de perfis
- `exp` = `iat` + 28800 (8 horas exatas)
- `sub` é o UUID do `User` (não o `google_sub`)

### Frontend

- Rota `/auth/callback` com token válido: salva no localStorage e redireciona para home
- Rota `/auth/callback` com token expirado: redireciona para `/login`
- Rota `/auth/callback` sem parâmetro `token`: redireciona para `/login`
- `useAuth()`: `isAuthenticated = true` com token válido, `false` com token expirado ou ausente
- `logout()`: remove token do localStorage e redireciona para `/login`
- `PrivateRoute`: redireciona para `/login` se não autenticado

---

## Riscos técnicos e dependências

1. **Dependência de 000-01**: esta feature depende das tabelas `"user"`, `role` e `user_role` e dos repositórios `UserRepository` e `RoleRepository` definidos em `000-01`. Deve ser implementada após a conclusão de `000-01`.

2. **Configuração do Google OAuth2 Console**: as URLs de redirect autorizadas (`{baseUrl}/login/oauth2/code/google`) devem ser registradas no Google Cloud Console para os domínios de dev e prod antes de qualquer teste com autenticação real. Questão em aberto no `business.md`.

3. **Relink de conta Google**: o `business.md` aponta explicitamente como questão em aberto o comportamento quando email já existe mas `google_sub` é diferente. A especificação acima assume relink silencioso (atualizar `google_sub`), mas esta decisão pode mudar. Risco de mudança de requisito.

4. **Chave JWT simétrica vs. assimétrica**: HMAC-SHA256 com chave compartilhada é suficiente para o cenário atual (monolito, backend é emissor e validador). Se no futuro um serviço externo precisar validar os tokens, será necessário migrar para RSA/EC com chave pública.

5. **Compatibilidade GraalVM AOT**: o Nimbus JOSE+JWT e os mecanismos de reflexão do Spring Security OAuth2 podem exigir hints adicionais para compilação nativa. Se o projeto adotar GraalVM, este fluxo deve ser testado em modo nativo antes do deploy.

6. **Ausência de revogação de JWT**: JWT expirado em 8 horas é a única proteção. Logout no frontend remove o token localmente, mas um token vazado permanece válido até expirar. Fora do escopo desta feature, mas deve ser documentado como limitação conhecida.

7. **Seed de dev e ambiente de CI**: o changeSet com `context: "dev"` deve ser explicitamente ativado nos ambientes de CI que executam os testes de integração. Sem `spring.liquibase.contexts=dev`, os usuários de dev não existirão e os testes do fluxo bypass falharão.
