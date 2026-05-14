# Menu Lateral e Controle de Acesso por Perfil — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

---

## Visão geral

Esta feature é puramente de camada de autorização e derivação de contexto de navegação. Não introduz novas tabelas nem modifica o schema existente. O backend expõe um único endpoint que lê os roles do token JWT já presente na requisição e devolve a lista de itens de menu autorizados para aquele usuário, além da rota padrão de redirecionamento pós-login.

A lógica de controle de acesso por perfil já está parcialmente implementada via `SecurityConfig` com `@EnableMethodSecurity`. Esta feature formaliza o mapeamento role→seções de menu e o endpoint que o frontend consumirá para renderizar o shell de navegação.

**Domínio afetado:** `auth` / `users` (leitura apenas — sem escrita).

**Observação sobre roles no JWT:** O `JwtTokenProvider` emite a claim `"roles"` a partir de `UserPermission.permission.description`. Os valores dessa claim são os nomes das permissões de sistema registradas na tabela `permission` (`COLABORADOR`, `PDM`, `CALIBRADOR`, `BP`, `ADMIN`, `GOVERNANCA`). O campo `users.role` representa o cargo da pessoa na empresa (ex: `DEVELOPER`) e **não** é usado para controle de acesso ao sistema. O endpoint `/api/me/menu` resolve os itens de menu a partir da claim `"roles"` — sem consulta adicional ao banco.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. Esta feature lê exclusivamente:

- `users` — para enriquecer a resposta com nome e email (já carregados no JWT)
- `user_permission` + `permission` — já consumidos pelo `AuthService` no momento do login; os roles chegam ao endpoint via claims do JWT

### Estratégia de migração

Nenhuma migração necessária.

---

## Contratos de API

### `GET /api/me/menu`

Retorna os itens de menu autorizados para o usuário autenticado, derivados exclusivamente dos roles presentes no JWT. Não realiza consulta ao banco — os roles já estão na claim `"roles"` do token.

- **Authorization:** qualquer usuário autenticado (token JWT válido)
- **Request body:** nenhum
- **Response `200`:**

```json
{
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "roles": ["COLABORADOR", "PDM"]
  },
  "defaultRoute": "/ciclos",
  "menuItems": [
    {
      "key": "string",
      "label": "string",
      "route": "string",
      "roles": ["COLABORADOR", "PDM"]
    }
  ]
}
```

Campos do objeto `user`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | `UUID` | Identificador do usuário autenticado |
| `name` | `string` | Nome completo |
| `email` | `string` | E-mail |
| `roles` | `string[]` | Lista de roles ativos do usuário (vinda do JWT) |

Campos de cada objeto em `menuItems`:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `key` | `string` | Identificador único do item (ex: `"ciclos"`, `"admin"`) |
| `label` | `string` | Texto a exibir no menu |
| `route` | `string` | Rota frontend correspondente |
| `roles` | `string[]` | Roles que têm acesso a este item (informativo) |

**Mapeamento permission → itens de menu:**

Os valores de permission correspondem ao enum `Permission`: `CIETER`, `PDM`, `CALIBRATOR`, `BP`, `ADMIN`.

| Permission | Itens de menu incluídos | Tela exclusiva |
|------------|------------------------|----------------|
| `CIETER` | `meus-ciclos` | Meus Ciclos |
| `PDM` | `meus-ciclos`, `meu-time` | My Team |
| `CALIBRATOR` | `calibracao` | Calibração |
| `BP` | `calibracao` | Calibração |
| `ADMIN` | todos os itens | todas as telas |

Regra de acumulação (Regra 26): a lista final é a **união** dos itens de todos os roles do usuário, sem duplicatas.

**Lógica da `defaultRoute`:**

Cada perfil aterra na sua tela específica. Não há dashboard unificado.

| Permission | `defaultRoute` |
|------------|---------------|
| `CIETER` | `/meus-ciclos` |
| `PDM` | `/meu-time` |
| `CALIBRATOR` | `/calibracao` |
| `BP` | `/calibracao` |
| `ADMIN` | `/admin` |

Para usuários com múltiplos roles, a prioridade é: `ADMIN > CALIBRATOR > BP > PDM > CIETER`. Aplica-se o primeiro presente na lista.

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Token válido; retorna menu e rota padrão |
| 401 | Token ausente, expirado ou inválido |
| 403 | Token válido mas sem nenhum role reconhecido (claim `roles` vazia ou com valores desconhecidos) |

**Edge cases:**
- Usuário com claim `roles` vazia: retorna 403 (sem itens de menu possíveis — estado inválido que não deveria existir se o login for bem-sucedido, mas deve ser tratado defensivamente).
- Roles desconhecidos na claim são ignorados silenciosamente (forward compatibility).

---

### `GET /api/me`

Retorna os dados do usuário autenticado. Este endpoint já existe implicitamente via JWT, mas é formalizado aqui para que o frontend possa exibir nome e avatar no shell de navegação sem precisar chamar `/api/me/menu` a cada mudança de rota.

- **Authorization:** qualquer usuário autenticado
- **Request body:** nenhum
- **Response `200`:**

```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "roles": ["string"],
  "picture": "string | null"
}
```

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `id` | `UUID` | não | ID do usuário |
| `name` | `string` | não | Nome completo |
| `email` | `string` | não | E-mail |
| `roles` | `string[]` | não | Roles ativos |
| `picture` | `string` | sim | URL do avatar (presente apenas em login via Google) |

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Token válido |
| 401 | Token ausente ou expirado |

**Edge case:** Este endpoint resolve apenas a partir do JWT (sem consulta ao banco), exceto se for necessário recarregar dados atualizados do usuário. Na implementação inicial, usar exclusivamente as claims do token.

---

## Requisitos de qualidade

- [x] I/O-bound: `/api/me/menu` não realiza I/O — resolve tudo a partir do JWT em memória. `/api/me` segue o mesmo padrão. Nenhum virtual thread necessário para estes endpoints específicos.
- [x] GraalVM AOT: nenhuma reflection não declarada. Os DTOs de resposta são records simples, compatíveis com AOT.
- [x] Dados sensíveis: nenhum dado sensível exposto. O campo `picture` (URL pública do Google) não é sensível.
- [x] Autorização: todos os endpoints requerem token válido. O conteúdo da resposta é derivado das claims do próprio token — não há risco de um usuário enxergar dados de outro.

---

## Estratégia de testes

**Happy path:**
- Usuário com permission `CIETER` recebe item `meus-ciclos` e `defaultRoute: "/meus-ciclos"`.
- Usuário com permission `PDM` recebe itens `meus-ciclos`, `meu-time` e `defaultRoute: "/meu-time"`.
- Usuário com permission `CALIBRATOR` recebe item `calibracao` e `defaultRoute: "/calibracao"`.
- Usuário com permission `ADMIN` recebe todos os itens e `defaultRoute: "/admin"`.
- Usuário com permissions `PDM` + `ADMIN` recebe a união dos itens e `defaultRoute: "/admin"` (maior prioridade).

**Casos de erro:**
- Requisição sem token → 401.
- Token expirado → 401.
- Token com claim `roles` vazia → 403.
- Token com role desconhecido (ex: `"ROLE_UNKNOWN"`) → role ignorado; se sobrar algum role válido, retorna 200 com os itens correspondentes; se todos forem desconhecidos, retorna 403.

**Casos de autorização:**
- Verificar que nenhum campo de outro usuário é exposto na resposta.
- Verificar que `defaultRoute` é coerente com a lista de `menuItems` retornada (não aponta para rota não presente no menu).

---

## Riscos técnicos e dependências

- **Separação entre `User.role` e permissões de sistema:** `users.role` é o cargo da pessoa na empresa (ex: `DEVELOPER`) e não controla acesso às telas. O acesso é determinado exclusivamente por `user_permission.role` (enum `Permission`: `CIETER`, `PDM`, `CALIBRATOR`, `BP`, `ADMIN`).

- **Dependência de features futuras:** Os `key`/`route` dos itens de menu (`/ciclos`, `/historico`, `/resultados`, `/meu-time`, `/calibracao`, `/admin`) são definidos pelos `business.md` das features 003, 031, 032, e 025/028. Qualquer renomeação de rota nessas features deve ser refletida aqui.
