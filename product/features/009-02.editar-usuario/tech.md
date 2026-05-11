# Editar Usuário — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `009-00.usuarios`. Implementa o fluxo de edição de um usuário existente via formulário frontend na rota `/users/:id/edit` e os endpoints `GET /users/{id}` (carga do formulário) e `PUT /users/{id}` (persistência das alterações).

Este documento **não redefine** o schema das tabelas `user`, `user_role`, `role` e `branch` — todas especificadas no changeSet `001-initial-schema` de `000-01.modelagem-dados` e documentadas em `009-00.usuarios/tech.md`.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Leitura e atualização de `user`; substituição atômica de registros em `user_role`; leitura de `role` e `branch` |
| Serviço | Verificação de escopo por filial; validação de restrição de perfil para Gerente; validação de auto-inativação; imutabilidade do e-mail; atomicidade da atualização de perfis |
| Frontend | Tela `/users/:id/edit`; campo e-mail exibido como somente leitura; toggle ativo/inativo; ocultação do campo filial quando perfil exclusivo é `Administrador`; remoção da opção `Administrador` para Gerente autenticado |

Domínios externos que este fluxo lê ou escreve:

| Domínio | Tabela / recurso | Direção |
|---------|-----------------|---------|
| Autenticação (`000-02`) | JWT claims `sub`, `branchId`, `roles` | leitura — identificação do ator; verificação de auto-inativação via `sub` |
| Modelagem inicial (`000-01`) | `role` | leitura — resolução de UUID de perfil por nome |
| Modelagem inicial (`000-01`) | `branch` | leitura — validação de existência da filial (somente Administrador pode alterar filial) |
| Autenticação (`000-02`) | mecanismo de login | impacto indireto — inativação via `active: false` impede `POST /auth/login` para o usuário editado |

---

## Modelo de dados

### Novas tabelas / alterações de schema

Este fluxo **não cria tabelas novas nem altera o schema existente**. Os índices necessários para este domínio estão especificados em `009-00.usuarios/tech.md` (changeSet `008-user-indexes`).

Tabelas lidas e escritas por este fluxo:

| Tabela | Operação | Condição |
|--------|----------|----------|
| `user` | `SELECT` | carga do formulário e verificação de escopo |
| `user` | `UPDATE` (name, branch_id, active, updated_at) | ao salvar |
| `user_role` | `DELETE` (todos os registros do usuário) | ao salvar — substituição atômica |
| `user_role` | `INSERT` (N registros) | ao salvar — um registro por perfil selecionado |
| `role` | `SELECT` | resolução de UUID por nome |
| `branch` | `SELECT` | validação de existência de filial (Administrador) |

> A substituição de perfis em `user_role` deve ser feita como DELETE-seguido-de-INSERT dentro da mesma transação. Isso garante que o usuário nunca fique em estado intermediário sem perfis durante o processo.

Colunas de `user` atualizadas por este fluxo:

| Coluna | Tipo PostgreSQL | Regra |
|--------|----------------|-------|
| `name` | `TEXT` | atualizável; não vazio; máximo 255 caracteres |
| `email` | `TEXT` | **imutável** — não aceitar no body; exibir como somente leitura no formulário |
| `branch_id` | `UUID` | atualizável apenas pelo Administrador; Gerente não pode alterar |
| `active` | `BOOLEAN` | atualizável; Administrador não pode definir `false` para si mesmo |
| `updated_at` | `TIMESTAMP` | atualizado com `now()` em toda edição bem-sucedida |

### Estratégia de migração

Nenhuma tabela nova é criada nesta sub-feature. Os índices necessários são definidos no changeSet `008-user-indexes` de `009-00.usuarios/tech.md`.

---

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `branchId` de escopo é extraído do claim `branchId` do JWT. O campo `sub` do JWT é usado para a verificação de auto-inativação.

---

### `GET /users/{id}`

Retorna os dados completos de um usuário para pré-preenchimento do formulário de edição.

- **Authorization:** perfis `Administrador`, `Gerente`
- **Path parameter:** `id` — UUID do usuário

- **Response `200`:**

  ```json
  {
    "id": "uuid",
    "name": "Pedro Alves",
    "email": "pedro@livraria.com",
    "roles": ["Gerente", "Catalogador"],
    "branchId": "uuid-da-filial",
    "branchName": "Filial Norte",
    "active": true,
    "createdAt": "2026-05-08T14:00:00Z",
    "updatedAt": "2026-05-08T14:00:00Z"
  }
  ```

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Usuário encontrado e dentro do escopo de acesso |
  | 401 | Cookie ausente ou JWT inválido/expirado |
  | 403 | Gerente tentando acessar usuário de outra filial |
  | 404 | UUID não encontrado |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O Gerente só pode consultar usuários com `user.branch_id` igual ao seu `branchId` do JWT. Se o UUID existir mas pertencer a outra filial → `403` (não `404`, para não vazar informação de existência).
  - O campo `branchName` é obtido via JOIN com `branch.name`; para usuários com `branch_id = null` (Administrador), ambos `branchId` e `branchName` são `null` na resposta.

---

### `PUT /users/{id}`

Atualiza os dados de um usuário existente.

- **Authorization:** perfis `Administrador`, `Gerente`
- **Path parameter:** `id` — UUID do usuário
- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `name` | `String` | sim | não vazio; máximo 255 caracteres |
  | `roles` | `List<String>` | sim | ao menos um elemento; valores aceitos: `"Administrador"`, `"Gerente"`, `"Catalogador"`, `"Caixa"` |
  | `branchId` | `String (UUID)` | condicional | obrigatório quando `roles` contém qualquer valor diferente de `"Administrador"`; deve ser `null` ou ausente quando `roles` contém exclusivamente `"Administrador"` |
  | `active` | `Boolean` | sim | `true` ou `false`; Administrador não pode enviar `false` para o próprio `id` |

- **Restrições adicionais por perfil do ator:**
  - Gerente: não pode enviar `"Administrador"` em `roles` → `403`.
  - Gerente: não pode alterar `branchId` — campo ignorado para Gerente (filial do usuário editado permanece inalterada).
  - Gerente: só pode editar usuários com `user.branch_id` igual ao seu `branchId` do JWT → `403` caso contrário.
  - Administrador: não pode enviar `active: false` quando `id` do path é igual ao claim `sub` do JWT → `403`.

- **Response `200`:** mesmo formato de `GET /users/{id}`

- **Status codes:**

  | Código | Quando ocorre |
  |--------|--------------|
  | 200 | Usuário atualizado com sucesso |
  | 400 | `name` ausente ou vazio; `roles` ausente ou vazio; valor inválido em `roles`; `branchId` ausente quando obrigatório; `branchId` presente quando o único perfil é `Administrador` |
  | 401 | Cookie ausente ou JWT inválido/expirado |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`); Gerente tentando editar usuário de outra filial; Gerente tentando incluir ou excluir perfil `Administrador`; Administrador tentando inativar a si mesmo |
  | 404 | UUID não encontrado |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O campo `email` **não é aceito no body**. Se enviado, deve ser silenciosamente ignorado.
  - A verificação de auto-inativação deve comparar o UUID do path com o claim `sub` do JWT antes de qualquer persistência. Se forem iguais e `active = false` → `403`.
  - A atualização de `user_role` deve ser DELETE-seguido-de-INSERT dentro da mesma transação com o UPDATE de `user`. Se qualquer etapa falhar, tudo deve ser revertido.
  - Para o Gerente, o campo `branchId` no body é silenciosamente ignorado — a filial do usuário editado permanece a que estava antes da edição.
  - Ao definir `roles: ["Administrador"]` para um usuário (somente Administrador pode fazer isso), `branch_id` deve ser definido como `NULL` em `user`. O serviço deve atualizar `branch_id` para `NULL` nesse caso, independentemente do valor enviado em `branchId`.
  - `updated_at` deve ser atualizado com `now()` em toda edição bem-sucedida.

---

## Requisitos de qualidade

- [ ] I/O-bound identificado? O fluxo de edição envolve: SELECT em `user` (verificação de escopo), SELECT em `role` (resolução de UUIDs), DELETE em `user_role`, INSERT em `user_role` (N operações), UPDATE em `user`. Todas as operações são I/O-bound — candidatas a virtual threads (Java 25, padrão com Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Records `UserUpdateRequest` e `UserResponse` devem estar registrados para reflexão se AOT habilitado.
- [ ] Dados sensíveis tratados adequadamente? E-mail é dado pessoal — nunca logar em nível `INFO` ou superior. O e-mail é exibido no formulário apenas para leitura; não é atualizado.
- [ ] Casos de autorização por perfil cobertos em todos os endpoints? `GET /users/{id}` e `PUT /users/{id}` exigem `Administrador` ou `Gerente`; `Catalogador` e `Caixa` recebem `403`. Gerente com restrições de escopo e perfil documentadas acima.

---

## Estratégia de testes

### Fluxo principal (happy path)

- `GET /users/{id}` como Administrador: verificar resposta completa com `roles`, `branchId`, `branchName` e `active`.
- `GET /users/{id}` para usuário Administrador (sem filial): verificar `branchId: null` e `branchName: null`.
- `PUT /users/{id}` — alterar apenas `name`: verificar `200` e `updatedAt` atualizado.
- `PUT /users/{id}` — alterar perfis de `["Caixa"]` para `["Gerente", "Catalogador"]`: verificar que `user_role` contém exatamente dois registros após a operação.
- `PUT /users/{id}` — inativar usuário (`active: false`): verificar `200`; verificar que `POST /auth/login` com o e-mail do usuário retorna `401`.
- `PUT /users/{id}` — reativar usuário (`active: true`): verificar `200`; verificar que `POST /auth/login` passa a retornar `200`.
- `PUT /users/{id}` — Administrador alterando `branchId` de um usuário: verificar `200` com novo `branchId`.
- `PUT /users/{id}` — Gerente editando usuário da própria filial sem enviar `branchId`: verificar que `branch_id` permanece inalterado.
- `PUT /users/{id}` — alterar para perfis exclusivamente `["Administrador"]`: verificar que `branch_id` é definido como `NULL`.

### Casos de erro esperados

- `PUT /users/{id}` com `name` vazio → `400`.
- `PUT /users/{id}` com `roles: []` → `400`.
- `PUT /users/{id}` com valor inválido em `roles` → `400`.
- `PUT /users/{id}` com `roles: ["Caixa"]` sem `branchId` → `400`.
- `PUT /users/{id}` com `roles: ["Administrador"]` e `branchId` não nulo → `400`.
- `GET /users/{id}` com UUID inexistente → `404`.
- `PUT /users/{id}` com UUID inexistente → `404`.
- Gerente tentando `GET /users/{id}` de usuário de outra filial → `403`.
- Gerente tentando `PUT /users/{id}` de usuário de outra filial → `403`.

### Casos de autorização

- `Catalogador` executando `GET /users/{id}` → `403`.
- `Catalogador` executando `PUT /users/{id}` → `403`.
- `Caixa` executando `GET /users/{id}` → `403`.
- `Caixa` executando `PUT /users/{id}` → `403`.
- Gerente incluindo `"Administrador"` em `roles` → `403`.
- Administrador tentando inativar a si mesmo → `403`.
- Usuário não autenticado → `401`.
- JWT expirado → `401`.

### Casos de borda das regras de negócio

- Gerente enviando `branchId` diferente do seu no body: verificar que a filial do usuário editado permanece inalterada (campo ignorado para Gerente).
- `email` enviado no body com valor diferente: verificar que é ignorado e o e-mail não é alterado.
- `active` enviado no body pelo Administrador sobre o próprio usuário com valor `false`: verificar `403` antes de qualquer persistência.
- Edição que remove todos os perfis de `user_role` e insere novos dentro da mesma transação: verificar que não existe janela de tempo em que o usuário fica sem perfil.
- Usuário com token JWT ativo sendo inativado: verificar que o token existente ainda é aceito até sua expiração natural (comportamento esperado conforme `000-02.autenticacao`).
- Alterar `roles` para `["Administrador"]`: verificar que `branch_id` é atualizado para `NULL` mesmo se o campo `branchId` no body for omitido.

---

## Riscos técnicos e dependências

1. **Invalidação de sessão após inativação é eventual, não imediata.** Conforme documentado em `009-00.usuarios/tech.md`, tokens JWT emitidos antes da inativação permanecem válidos por até 8h. O serviço de edição deve apenas garantir que `user.active = false` seja persistido — a prevenção de novo login é responsabilidade de `POST /auth/login` em `000-02.autenticacao`.

2. **Atomicidade de `user_role` é crítica.** O padrão DELETE-INSERT deve estar dentro de `@Transactional`. Um rollback entre o DELETE e o INSERT deixaria o usuário sem perfis — estado que impede login. Garantir que a exceção não seja silenciada entre as duas operações.

3. **Regra de auto-inativação exige comparação de UUIDs.** O serviço deve extrair o `sub` do `Authentication` do Spring Security (não do body) e comparar com o `id` do path. Hardcodar o UUID do Administrador é incorreto — a regra se aplica a qualquer Administrador autenticado.

4. **Gerente não pode alterar `branchId`.** O campo deve ser silenciosamente ignorado para o Gerente, não rejeitado com `400`. Isso preserva a compatibilidade com formulários de frontend que possam enviar o campo mesmo para o Gerente.

5. **Dependência de `009-01.cadastrar-usuario`.** Para testar o fluxo de edição de ponta a ponta, é necessário que o cadastro esteja implementado. A edição não pode ser desenvolvida de forma completamente isolada sem mecanismo de seed de dados de teste.
