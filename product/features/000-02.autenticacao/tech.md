# Autenticação — Technical Design

**Reference:** `business.md` nesta pasta
**Status:** Rascunho

---

## Visão geral

Esta feature implementa a camada de autenticação do sistema. Ela não define entidades de negócio próprias — opera exclusivamente sobre as tabelas `user`, `role` e `user_role` definidas em `product/features/000-01.modelagem-dados/tech.md`.

Dois fluxos de autenticação são suportados:

- **Google OAuth2**: disponível em todos os ambientes. O sistema atua como OAuth2 Client (Spring Security), recebe o callback do Google, localiza ou cria o registro em `user`, e emite um JWT de sessão próprio.
- **Dev bypass**: disponível exclusivamente no Spring profile `dev`. Permite selecionar um usuário pré-cadastrado no seed sem credenciais reais, para facilitar testes com perfis variados.

Em ambos os casos, o resultado final é um JWT de sessão assinado pelo backend, que o frontend armazena e envia nas requisições subsequentes como Bearer token. O Spring Security valida esse JWT via OAuth2 Resource Server em todos os endpoints protegidos.

Camadas afetadas: Security (filter chain, JWT encoder/decoder), endpoint HTTP (dev bypass e callback OAuth2), camada de leitura do banco (`user`, `user_role`, `role`).

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma tabela nova é criada por esta feature. As tabelas `user`, `role` e `user_role` já estão definidas em `product/features/000-01.modelagem-dados/tech.md` e são a única fonte de verdade de schema.

#### Requisitos de leitura sobre o schema existente

**Tabela `user`** — colunas relevantes para autenticação:

| Coluna        | Uso na autenticação                                                                 |
|---------------|-------------------------------------------------------------------------------------|
| `id`          | Incluído no payload do JWT como `sub` (subject)                                    |
| `email`       | Usado como chave de lookup após callback do Google; deve ser UNIQUE (já garantido) |
| `name`        | Incluído no payload do JWT                                                          |
| `branch_id`   | Incluído no payload do JWT (pode ser `null` para Administrator)                    |
| `is_active`   | Verificado antes de emitir o JWT — usuário inativo não pode autenticar              |
| `deleted_at`  | Verificado antes de emitir o JWT — registro com `deleted_at IS NOT NULL` é rejeitado|
| `password_hash` | **Nunca retornado em nenhuma resposta HTTP nem incluído no JWT**                  |

**Tabela `role`** — colunas relevantes:

| Coluna | Uso na autenticação                                     |
|--------|---------------------------------------------------------|
| `id`   | Relacionamento via `user_role`                         |
| `name` | Incluído no payload do JWT como lista de roles         |

**Tabela `user_role`** — lida via JOIN com `user` e `role` para montar a lista de perfis do JWT.

#### Seed de usuários de dev

O seed do banco (executado apenas no profile `dev`) deve inserir ao menos um usuário para cada perfil fixo na tabela `user`, com os respectivos vínculos em `user_role`. Esses registros devem ter `is_active = true` e `deleted_at = NULL`. O campo `password_hash` pode conter um valor fixo (e.g., hash de uma senha conhecida) ou um placeholder, pois o dev bypass ignora senha.

Os 4 perfis fixos (`Administrador`, `Gerente`, `Catalogador`, `Caixa`) já são inseridos pelo seed da feature 000-01.

### Estratégia de migração

Nenhuma migration nova é necessária. O schema já está definido. O seed de usuários de dev deve ser executado por um script separado, ativado apenas no profile `dev` (e.g., via `ApplicationRunner` condicional com `@Profile("dev")` ou arquivo de dados `data-dev.sql`).

---

## Contratos de API

### `GET /auth/dev/users`

Disponível **somente no profile `dev`**. Retorna a lista de usuários pré-cadastrados no seed para seleção no login de dev. A ativação deste endpoint via `@Profile("dev")` garante que ele simplesmente não existe no build de produção (não há rota registrada, resultando em 404 natural).

- **Autorização**: pública (sem JWT)
- **Request body**: nenhum
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

- **Status codes**:

| Código | Quando ocorre |
|--------|---------------|
| 200    | Lista retornada com sucesso (pode ser vazia se seed não foi executado) |
| 404    | Ambiente de produção — endpoint não existe |

- **Edge cases**: o endpoint nunca retorna `password_hash`. Deve aplicar `WHERE deleted_at IS NULL AND is_active = true` ao consultar `user`.

---

### `POST /auth/dev/login`

Disponível **somente no profile `dev`**. Recebe o ID de um usuário e emite um JWT de sessão como se o usuário tivesse se autenticado normalmente.

- **Autorização**: pública (sem JWT)
- **Request body**:

| Campo    | Tipo   | Obrigatório | Regras de validação                              |
|----------|--------|-------------|--------------------------------------------------|
| `userId` | String (UUID) | sim | Deve ser um UUID válido; usuário deve existir em `user` com `is_active = true` e `deleted_at IS NULL`; deve ter ao menos um perfil em `user_role` |

- **Response `200`**:

```json
{
  "token": "string (JWT)",
  "expiresIn": 28800
}
```

`expiresIn` é o tempo de expiração em segundos (valor padrão: 28800 = 8 horas, conforme sugestão do `business.md`).

- **Status codes**:

| Código | Quando ocorre |
|--------|---------------|
| 200    | JWT emitido com sucesso |
| 400    | `userId` ausente, formato inválido, ou usuário sem nenhum perfil atribuído |
| 403    | Usuário com `is_active = false` |
| 404    | `userId` não encontrado ou `deleted_at IS NOT NULL` |
| 404    | Ambiente de produção — endpoint não existe |

- **Edge cases**: usuário sem perfil deve ser rejeitado com `400` e mensagem clara, pois um JWT sem roles tornaria o usuário incapaz de acessar qualquer tela.

---

### `GET /oauth2/callback/google`

Gerenciado pelo Spring Security OAuth2 Client. Este endpoint não é implementado manualmente — o Spring Security registra o handler automaticamente. O que deve ser configurado/implementado é o `AuthenticationSuccessHandler` customizado, que executa após o Spring Security concluir o handshake OAuth2 com o Google.

**Fluxo técnico do callback:**

1. Spring Security recebe o código de autorização do Google e troca pelo `id_token` / `userinfo`.
2. O `AuthenticationSuccessHandler` customizado é invocado com o `OAuth2User` resolvido.
3. O handler extrai `email` e `name` do `OAuth2User`.
4. Lookup em `user` por `email` (índice `idx_user_email`):
   - Se encontrado: verificar `is_active = true` e `deleted_at IS NULL`.
   - Se não encontrado: **não criar automaticamente** — autenticação é negada com redirecionamento para página de erro. Criação de usuários é responsabilidade do User Management (fora do escopo desta feature, conforme `business.md`).
5. Carregar perfis do usuário via JOIN `user_role` → `role`.
6. Verificar que o usuário tem ao menos um perfil.
7. Emitir JWT de sessão.
8. Redirecionar o frontend para a URL pós-login com o token (e.g., via query param `?token=...` ou cookie `HttpOnly`).

> A decisão de como entregar o token ao frontend (query param vs. cookie HttpOnly) impacta a estratégia de segurança do XSS. Cookie HttpOnly é mais seguro contra XSS mas exige configuração de CORS e CSRF. Query param é mais simples mas expõe o token na URL. Esta decisão deve ser registrada como risco técnico e alinhada com o time.

- **Autorização**: pública (é o endpoint de entrada do fluxo OAuth2)
- **Status codes relevantes (via redirecionamento HTTP)**:

| Código | Quando ocorre |
|--------|---------------|
| 302    | Sucesso — redireciona para frontend com token |
| 302    | Falha — redireciona para página de erro no frontend |
| 401    | Falha no handshake OAuth2 com o Google (token inválido, estado CSRF inválido) |

- **Edge cases**:
  - Usuário autenticado no Google mas sem registro em `user`: redirecionar para página de erro indicando "acesso não autorizado".
  - Usuário com `is_active = false`: redirecionar para página de erro indicando "conta desativada".
  - Usuário sem nenhum perfil: redirecionar para página de erro indicando "sem perfil atribuído".

---

## Payload do JWT

O JWT emitido pelo backend (em ambos os fluxos) deve conter os seguintes claims:

| Claim       | Valor                                         | Observação                                                    |
|-------------|-----------------------------------------------|---------------------------------------------------------------|
| `sub`       | `user.id` (UUID como string)                  | Subject padrão JWT                                            |
| `name`      | `user.name`                                   |                                                               |
| `email`     | `user.email`                                  |                                                               |
| `roles`     | Array de strings com `role.name`              | Ex: `["Administrador", "Gerente"]`                           |
| `branchId`  | `user.branch_id` (UUID como string ou `null`) | `null` para Administrator sem filial fixa                    |
| `iat`       | Timestamp de emissão                          | Padrão JWT                                                    |
| `exp`       | Timestamp de expiração                        | Padrão JWT; valor padrão proposto: `iat + 28800` (8 horas)  |

O JWT deve ser assinado com algoritmo assimétrico (RS256 recomendado) ou simétrico (HS256 aceitável para estágio inicial). A chave de assinatura deve ser configurada em `application.properties` / `application-dev.properties` e nunca hardcoded.

O Spring Security Resource Server deve ser configurado para validar este JWT em todos os endpoints protegidos e expor os claims `roles` como `GrantedAuthority` para uso nas anotações de autorização.

---

## Requisitos de qualidade

- [x] Operações I/O-bound identificadas? — Sim: lookup de usuário no banco (`user`, `user_role`, `role`) é I/O-bound. Candidato a execução em virtual thread (Project Loom / Java 25).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? — A ser verificado: Spring Security OAuth2 Client e JWT encoder/decoder dependem de reflection. Verificar necessidade de `reflect-config.json` se AOT for adotado.
- [x] Dados sensíveis tratados adequadamente?
  - `user.password_hash`: nunca retornado em nenhum endpoint. Os DTOs de resposta desta feature não incluem este campo.
  - JWT payload: não inclui `password_hash` nem nenhum dado sensível além do necessário para autorização.
  - Chave de assinatura JWT: deve ser externalizada em configuração, nunca em código-fonte.
- [x] Casos de autorização por perfil cobertos em todos os endpoints?
  - `GET /auth/dev/users` e `POST /auth/dev/login`: públicos, sem JWT, só existem no profile `dev`.
  - Callback OAuth2: público por natureza (handshake externo).
  - Todos os demais endpoints do sistema (de outras features): protegidos pelo Resource Server com validação do JWT emitido aqui.

---

## Estratégia de testes

**Fluxo principal — Google OAuth2:**
- Simular callback OAuth2 com `OAuth2User` válido cujo email existe em `user` com perfis ativos → deve emitir JWT com claims corretos.
- Simular callback com email não cadastrado em `user` → deve negar autenticação e redirecionar para erro.
- Simular callback com usuário com `is_active = false` → deve negar autenticação.
- Simular callback com usuário sem nenhum perfil em `user_role` → deve negar autenticação.

**Fluxo principal — Dev bypass:**
- `GET /auth/dev/users` no profile `dev` → retorna lista sem `password_hash`.
- `POST /auth/dev/login` com UUID de usuário válido e ativo → retorna JWT com claims corretos (sub, name, email, roles, branchId).
- `POST /auth/dev/login` com UUID de usuário com `is_active = false` → retorna 403.
- `POST /auth/dev/login` com UUID inexistente → retorna 404.
- `POST /auth/dev/login` com usuário sem perfil → retorna 400.

**Isolamento de ambiente:**
- No profile `prod` (ou sem profile `dev`): `GET /auth/dev/users` e `POST /auth/dev/login` devem resultar em 404 (endpoint não registrado).

**Validação do JWT emitido:**
- Claims obrigatórios presentes: `sub`, `name`, `email`, `roles`, `branchId`, `iat`, `exp`.
- `roles` reflete exatamente os perfis vinculados ao usuário em `user_role`.
- Usuário com `branch_id = NULL` (Administrator) deve ter `branchId: null` no JWT.
- Usuário com múltiplos perfis deve ter todos os perfis listados em `roles`.

**Autorização downstream:**
- JWT emitido por esta feature deve ser aceito pelo Resource Server nos endpoints protegidos das demais features.
- JWT expirado deve ser rejeitado com 401.
- JWT com assinatura inválida deve ser rejeitado com 401.
- Requisição sem token em endpoint protegido deve retornar 401.

---

## Riscos técnicos e dependências

**1. Estratégia de entrega do token ao frontend após callback OAuth2 (risco médio — decisão em aberto):**
O callback OAuth2 é um redirecionamento browser-based. Entregar o JWT ao frontend pode ser feito via query param na URL de redirecionamento (`?token=...`) ou via cookie `HttpOnly`. Query param é simples mas expõe o token no histórico do browser e em logs de servidor. Cookie HttpOnly é mais seguro contra XSS mas exige configuração de CORS, `SameSite`, e eventualmente CSRF protection. A decisão deve ser alinhada antes da implementação.

**2. Tempo de expiração do JWT (risco baixo — decisão em aberto):**
O `business.md` sugere 8 horas. Este valor está refletido neste documento como padrão proposto. Deve ser configurável via propriedade (`jwt.expiration-seconds`) para não exigir rebuild ao ajustar. A ausência de refresh token (ver item 3) torna este valor relevante para a experiência do usuário.

**3. Refresh token — não implementado neste escopo (risco médio — decisão em aberto):**
O `business.md` deixa em aberto se refresh token deve ser implementado. Sem refresh token, o usuário é forçado a reautenticar via Google ao expirar o JWT. Para sessões de trabalho longas (> 8 horas), isso pode ser disruptivo. A implementação de refresh token exigiria persistência de tokens no banco (nova tabela, fora do escopo atual) ou uso de tokens de longa duração (risco de segurança). Esta decisão deve ser tomada antes da implementação da feature de sessão.

**4. Criação automática de usuário no primeiro login Google (risco baixo — decisão explícita):**
O design atual decide **não criar usuário automaticamente** no primeiro login Google. Usuários devem ser pré-cadastrados pelo Administrator/Manager. Esta decisão é consistente com o `business.md` ("Criação de usuários é responsabilidade do Manager/Administrator via User Management"). O risco é que usuários Google legítimos sejam bloqueados sem mensagem clara — a UX de erro deve ser explícita.

**5. Dependência da feature 000-01 (schema) (risco alto — bloqueante):**
Esta feature não pode ser implementada sem o schema de `user`, `role` e `user_role` existente no banco. A migration da feature 000-01 deve ser executada antes de qualquer teste desta feature.

**6. Configuração de credenciais OAuth2 do Google (risco operacional):**
O `client-id` e `client-secret` do Google OAuth2 devem estar configurados em `application-dev.properties` (dev) e nas variáveis de ambiente de produção. Credenciais ausentes impedem o startup do contexto Spring Security OAuth2 Client. Este risco é operacional, não de código.
