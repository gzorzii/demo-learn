# Cadastrar Usuário — Technical Design

**Reference:** `business.md` in this folder
**Status:** Rascunho

## Visão geral

Sub-feature do módulo `009-00.usuarios`. Implementa o fluxo de criação de um novo usuário do sistema via formulário frontend na rota `/users/new` e o endpoint `POST /users`.

Este documento **não redefine** o schema das tabelas `user`, `user_role`, `role` e `branch` — todas especificadas no changeSet `001-initial-schema` de `000-01.modelagem-dados` e documentadas em `009-00.usuarios/tech.md`.

Camadas afetadas:

| Camada | Escopo |
|--------|--------|
| Persistência | Escrita em `user` e `user_role`; leitura em `role` (resolver UUID por nome) e `branch` (validar existência da filial) |
| Serviço | Verificação de unicidade do e-mail; validação de escopo por filial para Gerente; validação de restrição de perfil para Gerente; extração de `branchId` do JWT |
| Frontend | Tela `/users/new`; ocultação do campo filial quando perfil exclusivo é `Administrador`; remoção da opção `Administrador` da lista de perfis para Gerente autenticado; redirecionamento para `/users` após criação |

Domínios externos que este fluxo lê:

| Domínio | Tabela / recurso | Direção |
|---------|-----------------|---------|
| Autenticação (`000-02`) | JWT claims `sub`, `branchId`, `roles` | leitura — `branchId` do Gerente; verificação do perfil do ator |
| Modelagem inicial (`000-01`) | `role` | leitura — resolução de UUID de perfil por nome |
| Modelagem inicial (`000-01`) | `branch` | leitura — validação de existência da filial informada pelo Administrador |

---

## Modelo de dados

### Novas tabelas / alterações de schema

Este fluxo **não cria tabelas novas nem altera o schema existente**. Os índices necessários para este domínio estão especificados em `009-00.usuarios/tech.md` (changeSet `008-user-indexes`).

Tabelas escritas por este fluxo:

| Tabela | Operação | Condição |
|--------|----------|----------|
| `user` | `INSERT` | sempre |
| `user_role` | `INSERT` (N registros) | um registro por perfil selecionado |

Colunas relevantes de `user` para este fluxo:

| Coluna | Tipo PostgreSQL | Nullable | Default | Observação |
|--------|----------------|----------|---------|------------|
| `id` | `UUID` | NOT NULL | `uuidv7()` | gerado pelo banco |
| `name` | `TEXT` | NOT NULL | — | campo obrigatório |
| `email` | `TEXT` | NOT NULL | — | `UNIQUE`; armazenado em lowercase; imutável após criação |
| `branch_id` | `UUID` | NULL | — | `NULL` quando perfis incluem exclusivamente `Administrador` |
| `active` | `BOOLEAN` | NOT NULL | `TRUE` | sempre `true` na criação; não aceito no body |
| `created_at` | `TIMESTAMP` | NOT NULL | `now()` | imutável |
| `updated_at` | `TIMESTAMP` | NOT NULL | `now()` | — |

> A constraint `UNIQUE` em `user.email` já existe no schema inicial. Ela garante unicidade mesmo em condições de corrida — violação de constraint deve ser capturada pelo serviço e retornada como `409`.

### Estratégia de migração

Nenhuma tabela nova é criada nesta sub-feature. Os índices necessários são definidos no changeSet `008-user-indexes` especificado em `009-00.usuarios/tech.md`. Este changeSet deve ser aplicado antes do deployment de qualquer sub-feature do módulo `009`.

---

## Contratos de API

> Todos os endpoints exigem cookie `auth_token` válido (JWT emitido por `000-02.autenticacao`). O `branchId` é extraído do claim `branchId` do JWT. Para o Administrador (claim `branchId = null`), o contexto de filial deve ser informado no body de criação.

---

### `POST /users`

Cria um novo usuário do sistema.

- **Authorization:** perfis `Administrador`, `Gerente`. Demais perfis → `403`.

- **Request body:**

  | Campo | Tipo | Obrigatório | Regras de validação |
  |-------|------|-------------|---------------------|
  | `name` | `String` | sim | não vazio; máximo 255 caracteres |
  | `email` | `String` | sim | formato de e-mail válido (RFC 5322 simplificado); único no sistema; normalizado para lowercase antes da persistência |
  | `roles` | `List<String>` | sim | ao menos um elemento; valores aceitos: `"Administrador"`, `"Gerente"`, `"Catalogador"`, `"Caixa"`; valores não reconhecidos → `400` |
  | `branchId` | `String (UUID)` | condicional | obrigatório quando `roles` contém qualquer valor diferente de `"Administrador"`; deve ser omitido ou `null` quando `roles` contém exclusivamente `"Administrador"` |

- **Restrições adicionais por perfil do ator:**
  - Gerente: `branchId` no body, se informado, deve ser igual ao `branchId` do JWT; qualquer outro valor → `403`.
  - Gerente: o array `roles` não pode conter `"Administrador"` → `403`.

- **Response `201`:**

  ```json
  {
    "id": "uuid",
    "name": "Maria Lima",
    "email": "maria@livraria.com",
    "roles": ["Catalogador"],
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
  | 400 | `name` ausente ou vazio; `email` ausente ou com formato inválido; `roles` ausente ou vazio; valor não reconhecido em `roles`; `branchId` ausente quando obrigatório; `branchId` presente quando o único perfil é `Administrador` |
  | 401 | Cookie `auth_token` ausente ou JWT inválido/expirado |
  | 403 | Perfil sem permissão (`Catalogador`, `Caixa`); Gerente tentando atribuir perfil `Administrador`; Gerente informando `branchId` diferente do seu |
  | 409 | E-mail já cadastrado no sistema |
  | 500 | Erro inesperado |

- **Edge cases:**
  - O e-mail é normalizado para lowercase antes da verificação de unicidade e antes da persistência. A constraint `UNIQUE` em `user.email` deve garantir unicidade; violação por condição de corrida → `409`.
  - O Gerente não precisa enviar `branchId` no body — o serviço pode usar o `branchId` do JWT automaticamente. Se o Gerente enviar `branchId` igual ao seu, aceitar; se diferente → `403`.
  - A inserção em `user` e em `user_role` (um registro por perfil) deve ocorrer dentro da mesma transação. Falha em qualquer etapa deve reverter tudo.
  - A resolução de UUID de perfil por nome (`role.name`) deve ser feita antes da inserção. Se um nome inválido for informado, retornar `400` antes de tentar qualquer escrita no banco.
  - `active` é sempre `true` na criação; o campo não é aceito no body. Se enviado, deve ser ignorado ou rejeitado com `400`.

---

## Requisitos de qualidade

- [ ] I/O-bound identificado? A criação envolve: leitura de `role` para resolução de UUIDs, verificação de unicidade de e-mail, INSERT em `user`, INSERT em `user_role` (N operações). Todas as operações são I/O-bound — candidatas a virtual threads (Java 25, padrão com Spring Boot 4).
- [ ] Caminhos com requisito de compatibilidade GraalVM AOT identificados? Records `UserCreateRequest` e `UserResponse` devem estar registrados para reflexão se AOT habilitado.
- [ ] Dados sensíveis tratados adequadamente? E-mail é dado pessoal — nunca logar em nível `INFO` ou superior; não expor em mensagens de erro de constraint.
- [ ] Casos de autorização por perfil cobertos? `POST /users` exige `Administrador` ou `Gerente`; `Catalogador` e `Caixa` recebem `403`; Gerente com restrições de perfil e filial documentadas acima.

---

## Estratégia de testes

### Fluxo principal (happy path)

- Criar usuário com perfil `["Caixa"]` e filial como Gerente: verificar `201`, `branchId` igual ao JWT do Gerente, `active: true`, um registro em `user_role`.
- Criar usuário com múltiplos perfis `["Gerente", "Catalogador"]` como Administrador: verificar `201`, dois registros em `user_role`.
- Criar usuário com perfil `["Administrador"]` sem `branchId` como Administrador: verificar `201` com `branchId: null`.
- Criar usuário com e-mail em uppercase: verificar que e-mail é normalizado para lowercase na resposta e no banco.
- Gerente criando usuário sem informar `branchId` no body: verificar que o serviço usa o `branchId` do JWT e retorna `201`.

### Casos de erro esperados

- `POST /users` sem `name` → `400`.
- `POST /users` com `name` vazio `""` → `400`.
- `POST /users` sem `email` → `400`.
- `POST /users` com `email = "nao-e-email"` → `400`.
- `POST /users` com `roles: []` → `400`.
- `POST /users` com `roles: ["PerfilInexistente"]` → `400`.
- `POST /users` com perfil `["Caixa"]` e sem `branchId` → `400`.
- `POST /users` com perfil `["Administrador"]` e com `branchId` não nulo → `400`.
- `POST /users` com e-mail já cadastrado → `409`.
- Dois cadastros simultâneos com o mesmo e-mail: um retorna `201`, o outro retorna `409`.

### Casos de autorização

- `Catalogador` executando `POST /users` → `403`.
- `Caixa` executando `POST /users` → `403`.
- Gerente incluindo `"Administrador"` em `roles` → `403`.
- Gerente informando `branchId` diferente do seu no body → `403`.
- Usuário não autenticado → `401`.
- JWT expirado → `401`.

### Casos de borda das regras de negócio

- `roles: ["Administrador", "Gerente"]`: `branchId` é obrigatório (há perfil diferente de Administrador no conjunto); verificar `400` quando `branchId` ausente.
- Gerente não envia `branchId` no body: verificar que o serviço usa o `branchId` do JWT e vincula corretamente.
- `active` enviado no body como `false`: verificar que é ignorado e o usuário é criado com `active: true`.

---

## Riscos técnicos e dependências

1. **Resolução de `role` por nome requer que o seed de `000-01.modelagem-dados` tenha sido executado.** Os nomes `Administrador`, `Gerente`, `Catalogador` e `Caixa` devem existir na tabela `role`. Se o seed não foi aplicado, a resolução retornará erro. Em ambiente de desenvolvimento, garantir que o changeSet `001-initial-schema` com o seed seja aplicado antes dos testes desta feature.

2. **Transação `user` + `user_role` deve ser atômica.** Se o INSERT em `user` for bem-sucedido mas o INSERT em `user_role` falhar (ex.: UUID de role inválido por corrida de dados), o usuário ficaria sem perfil — estado inválido que impede login. A transação deve englobar ambas as operações via `@Transactional`.

3. **Constraint `UNIQUE` em `user.email` já existe no schema inicial.** Não é necessário criar índice adicional — o índice já foi criado junto com a tabela em `000-01.modelagem-dados`. O serviço deve capturar a exceção de violação de constraint e retornar `409` (não `500`).

4. **Frontend deve ocultar a opção `Administrador` para Gerente autenticado.** A lista de perfis exibida no formulário deve ser filtrada no frontend com base no perfil do usuário autenticado (extraído do JWT via `useAuth`). O backend valida novamente essa restrição — o frontend não é a camada de segurança, apenas de UX.

5. **Dependência de `009-03.listar-usuarios`:** após criação bem-sucedida, o frontend redireciona para `/users`. A listagem deve estar implementada para que o fluxo de criação seja testável de ponta a ponta.
