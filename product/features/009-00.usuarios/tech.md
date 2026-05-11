# Usuários do Sistema — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Módulo raiz do domínio de usuários do sistema. Especifica os contratos de API e as invariantes de dados para as três sub-features (`009-01` a `009-03`): cadastro, edição e listagem de usuários.

As tabelas `user`, `user_role`, `role` e `branch` já existem no changeSet `001-initial-schema` de `000-01.modelagem-dados`. Este módulo **não cria novas tabelas**: adiciona índices complementares e define todos os contratos de API do domínio.

Camadas afetadas: persistência (JPA/PostgreSQL 18 — tabelas `user`, `user_role`, `role`, `branch`), serviços de domínio (validação de unicidade de e-mail, escopo por filial, controle de acesso por perfil) e frontend React com rotas `/users`, `/users/new` e `/users/:id/edit`.

Domínios externos que este módulo lê ou escreve:

| Domínio | Tabelas | Direção |
|---------|---------|---------|
| Modelagem inicial (`000-01`) | `branch` | leitura — validação de existência e escopo de filial |
| Autenticação (`000-02`) | JWT claim `sub`, `branchId`, `roles` | leitura — identificação do ator e autorização |
| Autenticação (`000-02`) | mecanismo de login | impacto — inativação impede `POST /auth/login` de emitir token para o usuário inativado |

> **Nota sobre invalidação de sessão:** A autenticação definida em `000-02.autenticacao` não possui blacklist de JWT nem mecanismo de refresh token. Tokens emitidos permanecem válidos por até 8h após a inativação de um usuário. A proteção efetiva de inativação é assegurada pelo fato de que o endpoint `POST /auth/login` consulta `user.active = true` antes de emitir novo token — uma sessão ativa expira naturalmente, e o usuário inativado não consegue renovar. O `tech.md` de `000-02` declara explicitamente que invalidação de token no servidor está fora de escopo.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Este módulo **não cria novas tabelas**. Todas as tabelas estão definidas no changeSet `001-initial-schema` de `000-01.modelagem-dados`.

#### `user` — referência

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `name` | `TEXT` | NOT NULL | — | — |
| `email` | `TEXT` | NOT NULL | — | `UNIQUE` — identificador de autenticação; imutável após criação |
| `branch_id` | `UUID` | NULL | — | FK → `branch(id)`; `NULL` exclusivamente para perfil `Administrador` |
| `active` | `BOOLEAN` | NOT NULL | `TRUE` | controla acesso ao login |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | atualizado a cada `PUT` |

#### `user_role` — referência

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `user_id` | `UUID` | NOT NULL | — | FK → `user(id)` ON DELETE CASCADE; parte da PK composta |
| `role_id` | `UUID` | NOT NULL | — | FK → `role(id)` ON DELETE CASCADE; parte da PK composta |

> Um usuário pode ter múltiplos perfis; o par `(user_id, role_id)` é único (PK composta).

#### `role` — referência (somente leitura neste módulo)

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrições |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | PK |
| `name` | `TEXT` | NOT NULL | — | `UNIQUE` |
| `description` | `TEXT` | NULL | — | — |

> Os quatro perfis (`Administrador`, `Gerente`, `Catalogador`, `Caixa`) são fixos — inseridos no seed do changeSet `001-initial-schema`. Este módulo apenas lê `role` para resolver IDs a partir dos nomes.

### Estratégia de migração

Os índices abaixo devem ser criados em um changeSet dedicado (`008-user-indexes`), separado do `001-initial-schema`.

```sql
-- changeSet: 008-user-indexes

-- Busca de usuário por e-mail (usada em POST /auth/login e verificação de unicidade em POST /users)
-- Já existe UNIQUE em email; este índice adicional não é necessário — o UNIQUE já cria o índice.
-- Documentado por clareza: CREATE UNIQUE INDEX já criado pelo schema inicial.

-- Listagem de usuários por filial (filtro principal em GET /users para Gerente)
CREATE INDEX idx_user_branch
    ON "user"(branch_id)
    WHERE branch_id IS NOT NULL;

-- Listagem de usuários por status ativo (filtro padrão da listagem)
CREATE INDEX idx_user_active
    ON "user"(active);

-- Listagem combinada: filial + status (query mais comum do Gerente)
CREATE INDEX idx_user_branch_active
    ON "user"(branch_id, active)
    WHERE branch_id IS NOT NULL;

-- Busca de user_role por usuário (resolução de perfis; usado em GET /users e GET /users/:id)
-- Já coberto pela PK de user_role (user_id, role_id). Documentado por referência.
```

Rollback seguro: apenas `DROP INDEX` para cada índice criado — sem perda de dados.

---

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). Ausência ou invalidade do cookie → `401`. Perfil sem permissão → `403`. O `branchId` de escopo é extraído do claim `branchId` do JWT.
>
> Regra de isolamento por filial: o Gerente opera exclusivamente sobre usuários com `user.branch_id` igual ao seu `branchId` do JWT. O Administrador opera sobre usuários de qualquer filial.
>
> O perfil `Administrador` possui `branchId = null` no JWT. Para operações que exigem contexto de filial (ex.: criar usuário não-Administrador), o Administrador deve informar `branchId` via query param. Ausência → `400`.

---

### `POST /users`

Cria um novo usuário. Corresponde a `009-01.cadastrar-usuario`.

- **Authorization:** perfis `Administrador`, `Gerente`
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `name` | `String` | sim | não vazio; máximo 255 caracteres |
  | `email` | `String` | sim | formato de e-mail válido; único no sistema (tabela `user`) |
  | `roles` | `List<String>` | sim | ao menos um elemento; valores aceitos: `"Administrador"`, `"Gerente"`, `"Catalogador"`, `"Caixa"` |
  | `branchId` | `String (UUID)` | condicional | obrigatório quando `roles` contém qualquer valor diferente de `"Administrador"`; proibido quando `roles` contém exclusivamente `"Administrador"` |

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@livraria.com",
    "roles": ["Gerente"],
    "branchId": "uuid-da-filial",
    "active": true,
    "createdAt": "2026-05-08T14:00:00Z",
    "updatedAt": "2026-05-08T14:00:00Z"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 201 | Usuário criado com sucesso |
  | 400 | `name` ou `email` ausentes; `email` com formato inválido; `roles` vazio ou com valor não reconhecido; `branchId` ausente quando obrigatório; `branchId` presente quando deve ser nulo (perfil exclusivamente Administrador) |
  | 401 | Cookie ausente ou JWT inválido/expirado |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`); ou Gerente tentando atribuir perfil `Administrador`; ou Gerente tentando criar usuário em filial diferente da sua |
  | 409 | E-mail já cadastrado no sistema |
  | 500 | Erro inesperado |

- **Edge cases:**
  - E-mail é armazenado em lowercase; comparação de unicidade deve ser case-insensitive.
  - A verificação de unicidade do e-mail deve ser garantida pela constraint `UNIQUE` em `user.email`. Violação de constraint por condição de corrida deve ser capturada e retornada como `409`.
  - O Gerente só pode informar `branchId` igual ao seu próprio `branchId` do JWT; qualquer outro valor → `403`.
  - O Gerente não pode incluir `"Administrador"` na lista `roles` → `403`.
  - O usuário é criado com `active = true`; o campo não é aceito no body.

---

### `PUT /users/{id}`

Atualiza dados de um usuário existente. Corresponde a `009-02.editar-usuario`.

- **Authorization:** perfis `Administrador`, `Gerente`
- **Path parameter:** `id` — UUID do usuário
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `name` | `String` | sim | não vazio; máximo 255 caracteres |
  | `roles` | `List<String>` | sim | ao menos um elemento; valores aceitos: `"Administrador"`, `"Gerente"`, `"Catalogador"`, `"Caixa"` |
  | `branchId` | `String (UUID)` | condicional | obrigatório quando `roles` contém qualquer valor diferente de `"Administrador"`; deve ser nulo/ausente quando `roles` contém exclusivamente `"Administrador"` |
  | `active` | `Boolean` | sim | `true` ou `false`; regra: Administrador não pode inativar a si mesmo |

- **Response `200`:** mesmo formato de `POST /users` (resposta `201`)

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Usuário atualizado com sucesso |
  | 400 | `name` ausente; `roles` vazio; valor inválido em `roles`; `branchId` ausente quando obrigatório |
  | 401 | Cookie ausente ou JWT inválido/expirado |
  | 403 | Perfil sem permissão; Gerente tentando editar usuário de outra filial; Gerente tentando atribuir ou remover perfil `Administrador`; Administrador tentando inativar a si mesmo |
  | 404 | UUID não encontrado |
  | 409 | Não aplicável (e-mail é imutável) |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O campo `email` **não é aceito no body** — qualquer valor enviado é silenciosamente ignorado ou rejeitado com `400`.
  - A inativação (`active: false`) de um usuário não invalida tokens JWT ativos — o usuário inativado não conseguirá efetuar novo login, mas sessões existentes expiram em até 8h conforme definido em `000-02.autenticacao`.
  - Regra de auto-inativação: o serviço deve comparar o `id` do path com o `sub` do JWT; se forem iguais e `active = false` → `403`.
  - O Gerente não pode alterar o `branchId` de nenhum usuário (campo ignorado para Gerente; somente Administrador pode transferir usuário entre filiais).
  - Ao alterar `roles`, o serviço deve excluir todos os registros de `user_role` do usuário e reinserir apenas os novos perfis dentro da mesma transação.
  - `updated_at` deve ser atualizado com `now()` em toda edição bem-sucedida.

---

### `GET /users`

Lista os usuários com filtros opcionais. Corresponde a `009-03.listar-usuarios`.

- **Authorization:** perfis `Administrador`, `Gerente`
- **Query parameters:**

  | Parâmetro | Tipo | Obrigatório | Regras |
  |-----------|------|-------------|--------|
  | `branchId` | `UUID` | não | somente para Administrador; ignorado para Gerente (escopo fixo no JWT) |
  | `role` | `String` | não | filtra usuários que possuem o perfil informado; valores aceitos: `"Administrador"`, `"Gerente"`, `"Catalogador"`, `"Caixa"` |
  | `active` | `Boolean` | não | padrão `true`; aceita `true`, `false` ou ausente (padrão `true`) |
  | `page` | `Integer` | não | padrão `0`; base 0 |
  | `size` | `Integer` | não | padrão `20`; máximo `100` |

- **Response `200`:**

  ```json
  {
    "content": [
      {
        "id": "uuid",
        "name": "João Silva",
        "email": "joao@livraria.com",
        "roles": ["Gerente"],
        "branchId": "uuid-da-filial",
        "branchName": "Filial Centro",
        "active": true
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 5,
    "totalPages": 1
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Listagem retornada com sucesso (pode ser vazia) |
  | 400 | Valor inválido no parâmetro `role` |
  | 401 | Usuário não autenticado |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`) |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O Gerente sempre recebe apenas usuários com `user.branch_id` igual ao seu `branchId` do JWT; o parâmetro `branchId` é ignorado para Gerente.
  - O Administrador sem parâmetro `branchId` recebe usuários de todas as filiais (inclusive Administradores com `branch_id = null`).
  - Resultado vazio retorna `200` com `content: []`.
  - Ordenação padrão: `name ASC`.
  - O campo `branchName` é obtido via JOIN com `branch.name`; para usuários Administradores sem filial, `branchId` e `branchName` são `null` na resposta.

---

### `GET /users/{id}`

Retorna os dados completos de um usuário. Ponto de entrada para o formulário de edição.

- **Authorization:** perfis `Administrador`, `Gerente`
- **Path parameter:** `id` — UUID do usuário

- **Response `200`:** mesmo formato de item do `GET /users` (com todos os campos)

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Usuário encontrado e dentro do escopo de acesso |
  | 401 | Usuário não autenticado |
  | 403 | Gerente tentando acessar usuário de outra filial |
  | 404 | UUID não encontrado |
  | 500 | Erro inesperado |

---

## DTOs de domínio

DTOs definidos como Java records no pacote `com.ciet.demo_learn.user`:

```
UserCreateRequest     — body de POST /users
UserUpdateRequest     — body de PUT /users/{id}
UserResponse          — resposta de GET /users/{id}, POST /users, PUT /users/{id}
UserSummaryResponse   — item de GET /users (listagem paginada)
UserPageResponse      — wrapper paginado para GET /users
```

---

## Requisitos de qualidade

- [ ] I/O-bound identificado? `POST /users` e `PUT /users/{id}` envolvem leitura de `role` (resolver IDs por nome), verificação de unicidade de e-mail e escrita em `user` + `user_role` — candidatos a virtual threads (Java 25, padrão com Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Records Java são compatíveis. Entidades JPA (`User`, `UserRole`, `Role`) devem estar registradas em `reflect-config.json` se AOT habilitado.
- [ ] Dados sensíveis tratados adequadamente? E-mail é dado pessoal — nunca logar em nível `INFO` ou superior. Não expor e-mail em mensagens de erro de constraint.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? Sim: `Catalogador` e `Caixa` recebem `403` em todos os endpoints deste módulo. Gerente recebe `403` ao tentar acessar ou modificar usuários de outra filial ou ao tentar atribuir perfil `Administrador`.

---

## Estratégia de testes

### Fluxo principal (happy path)

- Criar usuário (Gerente) com perfis `["Gerente", "Catalogador"]` e filial própria: verificar `201` e presença de dois registros em `user_role`.
- Criar usuário (Administrador) com perfil `["Administrador"]` sem `branchId`: verificar `201` com `branchId: null`.
- Criar usuário (Administrador) com perfil `["Caixa"]` e `branchId` informado: verificar `201`.
- Editar usuário — alterar nome: verificar `200` e `updatedAt` atualizado.
- Editar usuário — inativar: verificar `200` e `active: false`; verificar que `POST /auth/login` com o e-mail do usuário retorna `401`.
- Editar usuário — alterar perfis: verificar que `user_role` reflete exatamente os novos perfis (sem perfis residuais).
- Listar usuários (Gerente): verificar que apenas usuários da filial do Gerente são retornados.
- Listar usuários (Administrador) sem filtros: verificar que usuários de todas as filiais são retornados.
- Listar com filtro `role=Caixa`: verificar que apenas usuários com esse perfil aparecem.
- Listar com filtro `active=false`: verificar que apenas usuários inativos aparecem.
- `GET /users/{id}`: verificar resposta completa com `roles` e `branchName`.

### Casos de erro esperados

- `POST /users` sem `name` → `400`.
- `POST /users` sem `email` → `400`.
- `POST /users` com `email` em formato inválido → `400`.
- `POST /users` com `roles` vazio → `400`.
- `POST /users` com `roles: ["Caixa"]` sem `branchId` → `400`.
- `POST /users` com `roles: ["Administrador"]` com `branchId` presente → `400`.
- `POST /users` com e-mail já cadastrado → `409`.
- `PUT /users/{id}` com `roles` vazio → `400`.
- `PUT /users/{id}` com `active: false` pelo próprio Administrador logado → `403`.
- `GET /users/{id}` com UUID inexistente → `404`.
- Gerente tentando `GET /users/{id}` de usuário de outra filial → `403`.

### Casos de autorização

- `Catalogador` em qualquer endpoint → `403`.
- `Caixa` em qualquer endpoint → `403`.
- Gerente criando usuário com `roles: ["Administrador"]` → `403`.
- Gerente criando usuário em filial diferente da sua → `403`.
- Gerente editando usuário de outra filial → `403`.
- Administrador sem parâmetro `branchId` no body em `POST /users` com perfil não-Administrador → `400`.
- Usuário não autenticado em qualquer endpoint → `401`.

### Casos de borda das regras de negócio

- Dois cadastros simultâneos com o mesmo e-mail: a constraint `UNIQUE` em `user.email` deve garantir que apenas um seja persistido; o segundo deve retornar `409`.
- Inativação de usuário: verificar que `POST /auth/login` subsequente retorna `401`; verificar que token JWT emitido antes da inativação ainda é aceito até sua expiração natural (8h).
- Usuário com perfis `["Administrador", "Gerente"]`: verificar que `branch_id` é aceito (pois há perfil diferente de Administrador no conjunto).
- Edição que remove todos os perfis de `user_role` e reinicia: verificar atomicidade (sem estado intermediário sem perfil).

---

## Riscos técnicos e dependências

1. **Invalidação de sessão após inativação é eventual, não imediata.** O mecanismo de autenticação em `000-02.autenticacao` não prevê blacklist de JWT nem refresh token. Um usuário inativado mantém acesso por até 8h (duração do token). Esse comportamento é aceito pelo escopo atual. Se futuramente exigir invalidação imediata, será necessário introduzir uma tabela de tokens revogados (`token_blacklist`) com `jti` e consulta em cada requisição — mudança de impacto na `000-02`.

2. **Dependência de `role` carregada por nome.** O serviço deve resolver IDs de `role` a partir dos nomes recebidos no body (ex.: `"Gerente"` → UUID). Os IDs dos papéis são inseridos pelo seed de `000-01.modelagem-dados` e não mudam, mas a resolução por nome deve ser feita via query ou cache na inicialização. Hardcodar UUIDs é frágil; consultar por `role.name` é a abordagem correta.

3. **Regra de auto-inativação requer comparação entre `path id` e `sub` do JWT.** O serviço deve extrair o `sub` (UUID do usuário autenticado) do `Authentication` do Spring Security e comparar com o `id` do path. Essa comparação deve ocorrer antes da persistência.

4. **Tabela `user` é palavra reservada no PostgreSQL.** O mapeamento JPA deve usar `@Table(name = "\"user\"")` conforme já observado em `000-01.modelagem-dados/tech.md`. Todas as queries JPQL e nativas que referenciam essa tabela devem usar as aspas duplas.

5. **Módulo `009-03.listar-usuarios` depende de `branch.name`** para exibir o nome da filial na listagem. A query deve fazer JOIN com a tabela `branch` para obter `branch.name`. Sem esse JOIN, a listagem retorna apenas `branchId`, e o frontend precisaria de uma chamada adicional — padrão indesejado.
