# Validar e Ajustar Lista de Avaliadores no CF — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature expõe endpoints que permitem ao colaborador e ao PDM consultarem e editarem a lista de avaliadores de um ciclo CF durante a fase de validação — período de 7 dias entre a criação do ciclo e o início efetivo da coleta. Além dos endpoints de edição, é necessário um mecanismo de expiração automática que, ao fim do prazo, aplica a seleção do ONA (mock) e transita o ciclo para a fase de coleta.

A fase de validação de avaliadores é um novo estado intermediário do ciclo CF, situado entre a criação (features 006/007) e a coleta. As features anteriores criavam o ciclo já com `status = COLLECTING` — esta feature introduz o conceito de `status = VALIDATING_EVALUATORS` e a transição para `COLLECTING` via confirmação explícita ou expiração do prazo.

> **Impacto retroativo confirmado:** as features 006 e 007 devem ser atualizadas para criar ciclos com `status = VALIDATING_EVALUATORS` (em vez de `COLLECTING`) e popular os avaliadores ONA mock iniciais, definindo `validation_deadline = now() + 7 days`. O `SelfCfService` (007) e o `MyTeamService` (006) devem ser ajustados antes ou junto com a implementação desta feature.

Camadas tocadas: controller (novos endpoints no `CycleEvaluatorController` ou extensão do `MeController`/`MyTeamController`), service (novo `CycleValidationService`), e repositórios existentes (`CycleSubjectRepository`, `CycleEvaluatorRepository`) com novas queries, além de um novo scheduler para expiração automática.

**Domínios afetados:**
- `cycle` — leitura do status e tipo; transição de `VALIDATING_EVALUATORS` para `COLLECTING`
- `cycle_subject` — leitura para validar acesso e prazo; escrita na transição de fase
- `cycle_evaluator` — leitura da lista atual, escrita (adição/remoção) e criação dos avaliadores sugeridos pelo ONA mock
- `users` — leitura para buscar candidatos a avaliadores na adição

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma nova tabela. O schema de `cycle` e `cycle_subject` precisam acomodar o novo status e prazo de validação.

#### Alteração em `cycle_subject`

Adicionar coluna para registrar o prazo de expiração da fase de validação:

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrição |
|--------|----------------|----------|---------|-----------|
| `validation_deadline` | `TIMESTAMPTZ` | sim | `NULL` | — |
| `validated_at` | `TIMESTAMPTZ` | sim | `NULL` | — |

- `validation_deadline`: data e hora até quando o colaborador e o PDM podem editar a lista. Preenchida com `now() + 7 days` no momento em que o ciclo entra em `VALIDATING_EVALUATORS`. Nula para ciclos que não passam pela fase de validação.
- `validated_at`: data e hora em que o colaborador confirmou explicitamente a lista antes do prazo. Nula enquanto aguarda validação ou se a expiração automática foi aplicada.

#### Alteração no enum/campo `cycle_subject.status`

O campo `status` de `cycle_subject` precisa acomodar o valor `VALIDATING_EVALUATORS`. Verificar o tipo atual:

- Se for tipo `ENUM` PostgreSQL: `ALTER TYPE cycle_subject_status ADD VALUE 'VALIDATING_EVALUATORS';`
- Se for `VARCHAR` com `CHECK` constraint: atualizar o constraint para incluir o novo valor.
- Se for `VARCHAR` sem constraint: nenhuma migração necessária para o tipo, mas a lógica de negócio deve tratar o valor.

Da mesma forma, o campo `cycle.status` (ou `CycleStatus` enum Java) deve incluir `VALIDATING_EVALUATORS` se ainda não existir.

#### Alteração em `cycle_evaluator`

Adicionar coluna para rastrear a origem do avaliador (sistema ONA mock vs. adição manual):

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrição |
|--------|----------------|----------|---------|-----------|
| `added_by` | `UUID` | sim | `NULL` | FK → `users.id` |
| `source` | `VARCHAR(30)` | não | `'ONA_SUGGESTION'` | `CHECK (source IN ('ONA_SUGGESTION', 'MANUAL_SUBJECT', 'MANUAL_PDM'))` |

- `added_by`: ID do usuário que adicionou o avaliador. Nulo para avaliadores obrigatórios (SELF e PDM) e para sugestões do ONA.
- `source`: indica a origem do avaliador na lista. `ONA_SUGGESTION` para os sugeridos pelo algoritmo mock; `MANUAL_SUBJECT` para os adicionados pelo próprio colaborador; `MANUAL_PDM` para os adicionados pelo PDM.

> A origem é necessária para implementar a regra de que o PDM não pode remover avaliadores adicionados pelo colaborador. Sem esse campo, a única informação disponível seria `is_mandatory`, que não distingue entre avaliadores sugeridos pelo ONA e adicionados manualmente.

### Índices relevantes

```sql
-- Já definidos em 001.modelo-de-dados (confirmar existência):
idx_evaluator_subject    ON cycle_evaluator (cycle_subject_id)
idx_subject_user         ON cycle_subject (subject_user_id)
idx_subject_status       ON cycle_subject (status)

-- Novos índices necessários para esta feature:
-- Scheduler de expiração consulta cycle_subject por status e validation_deadline:
CREATE INDEX idx_subject_validation_deadline
  ON cycle_subject (validation_deadline)
  WHERE status = 'VALIDATING_EVALUATORS'
    AND deleted_at IS NULL
    AND closed_at IS NULL;

-- Busca de avaliadores por ciclo e tipo (verificação de limite de convidados):
CREATE INDEX idx_evaluator_source
  ON cycle_evaluator (cycle_subject_id, source)
  WHERE deleted_at IS NULL;
```

### Estratégia de migração

A migração Liquibase deve:
1. Adicionar colunas `validation_deadline` e `validated_at` em `cycle_subject` (nullable, sem default — não impacta registros existentes).
2. Adicionar colunas `added_by` e `source` em `cycle_evaluator`:
   - `source` é `NOT NULL DEFAULT 'ONA_SUGGESTION'` — registros existentes recebem o valor padrão sem necessidade de update explícito.
   - `added_by` é nullable — registros existentes ficam com NULL.
3. Adicionar FK de `cycle_evaluator.added_by` → `users.id` (com `ON DELETE SET NULL` para preservar histórico).
4. Adicionar ou atualizar o constraint/enum do status de `cycle_subject` para incluir `VALIDATING_EVALUATORS`.
5. Criar os índices documentados acima.

Rollback é seguro: as colunas são novas e nullable (ou têm default), sem lógica que dependa delas em features anteriores. O rollback remove as colunas e os índices. O valor `VALIDATING_EVALUATORS` nos enums é mais delicado — se registros com esse status existirem, o rollback do enum falhará; planejar rollback antes que dados de produção contenham o valor.

## Contratos de API

### `GET /api/me/cycles/:cycleSubjectId/evaluators`

Retorna a lista de avaliadores do ciclo CF do colaborador autenticado durante a fase de validação.

O `cycleSubjectId` é o ID do registro `cycle_subject` — não do `cycle`. Isso evita ambiguidade quando o mesmo colaborador tem ciclos históricos do mesmo tipo.

- **Authorization:** perfis `CIETER` e `PDM` (colaborador acessando seu próprio ciclo)
- **Path parameter:** `cycleSubjectId` (UUID) — ID do `cycle_subject`
- **Request body:** nenhum

**Validações:**
1. O `cycleSubjectId` deve pertencer ao colaborador autenticado (`cycle_subject.subject_user_id = userId`). Se não pertencer → `403`.
2. O ciclo deve ser do tipo `CF` e estar com `status = VALIDATING_EVALUATORS`. Qualquer outro status → `409` com `errorCode: "NOT_IN_VALIDATION_PHASE"`.

- **Response `200`:**

```json
{
  "cycleSubjectId": "uuid",
  "validationDeadline": "2025-07-22T23:59:59Z",
  "validatedAt": null,
  "evaluators": [
    {
      "evaluatorId": "uuid",
      "userId": "uuid",
      "name": "string",
      "email": "string",
      "evaluatorType": "SELF",
      "isMandatory": true,
      "source": "ONA_SUGGESTION",
      "addedBy": null
    }
  ],
  "guestCount": 3,
  "guestLimit": 10
}
```

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `cycleSubjectId` | `UUID` | não | ID do `cycle_subject` |
| `validationDeadline` | `string (ISO-8601)` | não | Data limite para validação |
| `validatedAt` | `string (ISO-8601)` | sim | Data de confirmação explícita; `null` se ainda pendente |
| `evaluators` | `array` | não | Lista de avaliadores |
| `evaluators[].evaluatorId` | `UUID` | não | ID do `cycle_evaluator` |
| `evaluators[].userId` | `UUID` | não | ID do usuário avaliador |
| `evaluators[].name` | `string` | não | Nome completo do avaliador |
| `evaluators[].email` | `string` | não | E-mail do avaliador |
| `evaluators[].evaluatorType` | `"SELF"`, `"PDM"`, `"PEER"` | não | Tipo do avaliador |
| `evaluators[].isMandatory` | `boolean` | não | `true` para SELF e PDM |
| `evaluators[].source` | `"ONA_SUGGESTION"`, `"MANUAL_SUBJECT"`, `"MANUAL_PDM"` | não | Origem do avaliador na lista |
| `evaluators[].addedBy` | `UUID` | sim | ID do usuário que adicionou; `null` para obrigatórios e sugestões ONA |
| `guestCount` | `integer` | não | Quantidade atual de avaliadores convidados (não obrigatórios) |
| `guestLimit` | `integer` | não | Limite máximo de convidados (sempre `10` no MVP) |

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Lista retornada com sucesso |
| 401 | Token ausente, expirado ou inválido |
| 403 | `cycleSubjectId` não pertence ao colaborador autenticado |
| 404 | `cycleSubjectId` não existe |
| 409 | Ciclo não está na fase de validação (`errorCode: "NOT_IN_VALIDATION_PHASE"`) |
| 500 | Erro inesperado |

**Edge cases:**
- Prazo expirado mas ciclo ainda com `status = VALIDATING_EVALUATORS` (scheduler não executou ainda): retornar `200` com a lista atual — o scheduler irá transitar o status em breve.

---

### `GET /api/my-team/:subjectUserId/cycles/:cycleSubjectId/evaluators`

Retorna a lista de avaliadores do ciclo CF de um liderado durante a fase de validação. Mesma estrutura de resposta do endpoint acima.

- **Authorization:** `PDM`
- **Path parameters:**
  - `subjectUserId` (UUID) — ID do liderado
  - `cycleSubjectId` (UUID) — ID do `cycle_subject` do liderado

**Validações:**
1. Verificar vínculo PDM → liderado: `users.pdm_id = pdmId` para o `subjectUserId`. Se não for liderado direto → `403`.
2. O `cycleSubjectId` deve pertencer ao `subjectUserId` informado. Se não pertencer → `403`.
3. O ciclo deve ser do tipo `CF` e estar com `status = VALIDATING_EVALUATORS`. Qualquer outro status → `409` com `errorCode: "NOT_IN_VALIDATION_PHASE"`.

- **Response `200`:** mesma estrutura do `GET /api/me/cycles/:cycleSubjectId/evaluators`

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Lista retornada com sucesso |
| 401 | Token ausente, expirado ou inválido |
| 403 | PDM não é o gestor direto do `subjectUserId`, ou `cycleSubjectId` não pertence ao `subjectUserId` |
| 404 | `subjectUserId` ou `cycleSubjectId` não existe |
| 409 | Ciclo não está na fase de validação (`errorCode: "NOT_IN_VALIDATION_PHASE"`) |
| 500 | Erro inesperado |

---

### `POST /api/me/cycles/:cycleSubjectId/evaluators`

Adiciona um avaliador convidado à lista do ciclo CF do colaborador autenticado.

- **Authorization:** perfis `CIETER` e `PDM`
- **Path parameter:** `cycleSubjectId` (UUID)
- **Request body:**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `userId` | `UUID` | sim | UUID válido; deve ser um usuário ativo no sistema; não pode ser o próprio colaborador (já é SELF); não pode ser o PDM do colaborador (já é avaliador obrigatório) |

**Validações executadas no service, nesta ordem:**
1. `cycleSubjectId` pertence ao colaborador autenticado. Se não → `403`.
2. Ciclo está com `status = VALIDATING_EVALUATORS` e `validation_deadline > now()`. Se prazo expirado → `409` com `errorCode: "VALIDATION_DEADLINE_EXPIRED"`. Se status diferente → `409` com `errorCode: "NOT_IN_VALIDATION_PHASE"`.
3. O `userId` informado existe e está ativo. Se não → `404`.
4. O `userId` não é o colaborador (SELF) nem o PDM direto do colaborador. Se for → `409` com `errorCode: "EVALUATOR_ALREADY_MANDATORY"`.
5. O `userId` não está já na lista de avaliadores do ciclo. Se estiver → `409` com `errorCode: "EVALUATOR_ALREADY_IN_LIST"`.
6. Quantidade de avaliadores convidados atual (excluindo SELF e PDM) é menor que 10. Se já tiver 10 → `409` com `errorCode: "GUEST_LIMIT_REACHED"`.

**Lógica de criação (em `@Transactional`):**
- Criar `cycle_evaluator` com:
  - `cycle_subject_id = cycleSubjectId`
  - `evaluator_user_id = userId` (do body)
  - `evaluator_type = PEER`
  - `is_mandatory = false`
  - `status = PENDING`
  - `source = 'MANUAL_SUBJECT'`
  - `added_by = userId` (do token — o colaborador autenticado)

- **Response `201 Created`:** corpo com o avaliador criado, no mesmo formato do objeto dentro de `evaluators[]` do GET.

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 201 | Avaliador adicionado com sucesso |
| 400 | `userId` ausente ou não é UUID válido |
| 401 | Token ausente, expirado ou inválido |
| 403 | `cycleSubjectId` não pertence ao colaborador autenticado |
| 404 | `cycleSubjectId` não existe; ou `userId` do body não existe ou está inativo |
| 409 | Limite de 10 atingido; avaliador já na lista; avaliador já obrigatório; prazo expirado; ciclo fora da fase de validação — corpo com `errorCode` |
| 500 | Erro inesperado |

**Edge cases:**
- `userId` do body é o mesmo do token (colaborador tentando adicionar a si mesmo como PEER): deve ser rejeitado com `409 EVALUATOR_ALREADY_MANDATORY` — ele já está como SELF.
- Avaliador sugerido pelo ONA que o colaborador remove e depois tenta adicionar novamente: o registro de `cycle_evaluator` foi removido (soft delete ou hard delete — ver seção de remoção), então a nova adição cria um novo registro com `source = 'MANUAL_SUBJECT'`.

---

### `DELETE /api/me/cycles/:cycleSubjectId/evaluators/:evaluatorId`

Remove um avaliador convidado da lista do ciclo CF do colaborador autenticado.

> A remoção usa soft delete no `cycle_evaluator` (`deleted_at = now()`) para manter consistência com o padrão do restante do sistema. Todas as queries que contam ou listam avaliadores devem filtrar por `deleted_at IS NULL`.

- **Authorization:** perfis `CIETER` e `PDM`
- **Path parameters:**
  - `cycleSubjectId` (UUID) — ID do `cycle_subject`
  - `evaluatorId` (UUID) — ID do `cycle_evaluator` a ser removido

**Validações executadas no service, nesta ordem:**
1. `cycleSubjectId` pertence ao colaborador autenticado. Se não → `403`.
2. `evaluatorId` pertence ao `cycleSubjectId` informado. Se não → `404`.
3. Ciclo está com `status = VALIDATING_EVALUATORS` e `validation_deadline > now()`. Se prazo expirado → `409` com `errorCode: "VALIDATION_DEADLINE_EXPIRED"`.
4. O avaliador não é obrigatório (`is_mandatory = false`). Se for → `409` com `errorCode: "CANNOT_REMOVE_MANDATORY_EVALUATOR"`.

- **Response `204 No Content`:** sem corpo

**Lógica de remoção (em `@Transactional`):**
- Atualizar `cycle_evaluator.deleted_at = now()` (soft delete).

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 204 | Avaliador removido com sucesso |
| 401 | Token ausente, expirado ou inválido |
| 403 | `cycleSubjectId` não pertence ao colaborador autenticado |
| 404 | `cycleSubjectId` não existe; ou `evaluatorId` não existe ou não pertence ao ciclo |
| 409 | Avaliador é obrigatório e não pode ser removido; ou prazo de validação expirado |
| 500 | Erro inesperado |

---

### `POST /api/my-team/:subjectUserId/cycles/:cycleSubjectId/evaluators`

Adiciona um avaliador convidado à lista do ciclo CF de um liderado. Segue as mesmas regras do endpoint do colaborador, com as diferenças:
- O `source` do avaliador criado é `'MANUAL_PDM'`.
- O `added_by` é o `pdmId` do token.
- O PDM não pode remover avaliadores — apenas adicionar.

- **Authorization:** `PDM`
- **Path parameters:** `subjectUserId` (UUID), `cycleSubjectId` (UUID)
- **Request body:** mesmo formato do `POST /api/me/cycles/:cycleSubjectId/evaluators`

**Validações adicionais ao endpoint do colaborador:**
1. Vínculo PDM → liderado: `users.pdm_id = pdmId` para o `subjectUserId`. Se não → `403`.
2. `cycleSubjectId` pertence ao `subjectUserId`. Se não → `403`.
3. Demais validações (status, prazo, limite, duplicata) idênticas ao endpoint do colaborador.

- **Response `201 Created`:** mesmo formato do endpoint do colaborador.

**Status codes:** idênticos ao `POST /api/me/cycles/:cycleSubjectId/evaluators`, com `403` também cobrindo o caso de vínculo PDM → liderado inválido.

---

### `POST /api/me/cycles/:cycleSubjectId/evaluators/confirm`

Confirma explicitamente a lista de avaliadores antes do prazo de 7 dias, iniciando a fase de coleta imediatamente.

> A confirmação explícita é distinta da expiração automática: aqui o colaborador decide iniciar antes do prazo, enquanto o scheduler age no vencimento. Ambos produzem a mesma transição de estado, mas a confirmação registra `validated_at`.

- **Authorization:** perfis `CIETER` e `PDM`
- **Path parameter:** `cycleSubjectId` (UUID)
- **Request body:** nenhum

**Validações:**
1. `cycleSubjectId` pertence ao colaborador autenticado. Se não → `403`.
2. Ciclo está com `status = VALIDATING_EVALUATORS` e `validation_deadline > now()`. Se prazo expirado → `409` com `errorCode: "VALIDATION_DEADLINE_EXPIRED"`. Se status diferente → `409` com `errorCode: "NOT_IN_VALIDATION_PHASE"`.

**Lógica de confirmação (em `@Transactional`):**
- Atualizar `cycle_subject`:
  - `status = COLLECTING`
  - `collection_start_at = now()`
  - `validated_at = now()`
- Atualizar `cycle`:
  - `status = COLLECTING`
  - `collection_start_at = now()`
  - `collection_deadline = now() + 10 days`

Notificação (após commit):
- Chamar `NotificationService.notifyEvaluatorsSelected(cycleSubjectId)` — stub que loga os IDs dos avaliadores no nível `INFO`.

- **Response `200`:** sem corpo (ou `204` — decidir na implementação com base no padrão do projeto; `204` é mais semântico para "ação executada sem retorno de recurso").

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 204 | Confirmação realizada; coleta iniciada |
| 401 | Token ausente, expirado ou inválido |
| 403 | `cycleSubjectId` não pertence ao colaborador autenticado |
| 404 | `cycleSubjectId` não existe |
| 409 | Prazo expirado; ou ciclo fora da fase de validação |
| 500 | Erro inesperado |

---

## Mecanismo de expiração automática

> A expiração automática é o equivalente do scheduler de fechamento de CF (feature 004), mas para a fase de validação. Deve ser implementado como um `@Scheduled` no mesmo padrão do `CfAutoCloseScheduler`.

### `CfValidationExpiryScheduler`

Scheduler que roda periodicamente (sugestão: a cada hora) e:

1. Busca todos os `cycle_subject` com:
   - `status = VALIDATING_EVALUATORS`
   - `validation_deadline <= now()`
   - `deleted_at IS NULL`
   - `closed_at IS NULL`

2. Para cada `cycle_subject` encontrado:
   a. Aplica os avaliadores sugeridos pelo ONA que ainda não estão na lista (lógica mock — ver abaixo).
   b. Atualiza `cycle_subject.status = COLLECTING`, `collection_start_at = now()`.
   c. Atualiza `cycle.status = COLLECTING`, `collection_start_at = now()`, `collection_deadline = now() + 10 days`.
   d. Chama `NotificationService.notifyEvaluatorsSelected(cycleSubjectId)` (stub).

> Cada `cycle_subject` deve ser processado em transação individual para que uma falha em um não reverta os demais.

### ONA mock — lógica de sugestão de avaliadores

No MVP (Regra 36 do `business.md`), o ONA usa dados simulados. A lógica mock deve:

1. Buscar todos os usuários ativos que compartilham o mesmo `pdm_id` do colaborador (pares diretos), excluindo o próprio colaborador e o PDM (já são obrigatórios).
2. Filtrar os que já estão na lista de avaliadores do ciclo.
3. Selecionar aleatoriamente até completar 3 convidados no total (ou até o limite de 10, o que for menor).
4. Criar os `cycle_evaluator` faltantes com `source = 'ONA_SUGGESTION'` e `added_by = NULL`.

> A lógica mock é executada tanto na expiração automática quanto na criação inicial do ciclo (quando o ciclo entra em `VALIDATING_EVALUATORS`). Os avaliadores sugeridos inicialmente exibidos na tela já são o resultado desse mock.

## Queries de repositório necessárias

### `CycleSubjectRepository` — novas queries

```
-- Busca cycle_subject validando posse pelo colaborador:
findByIdAndSubjectUserId(UUID cycleSubjectId, UUID userId) → Optional<CycleSubject>
  WHERE id = :cycleSubjectId AND subject_user_id = :userId AND deleted_at IS NULL

-- Busca cycle_subject por subject e status para validação de fase:
findByIdAndSubjectUserIdAndStatus(UUID cycleSubjectId, UUID userId, CycleSubjectStatus status) → Optional<CycleSubject>

-- Busca todos os expirados para o scheduler:
findAllExpiredValidations(Instant now) → List<CycleSubject>
  WHERE status = VALIDATING_EVALUATORS AND validation_deadline <= :now
    AND deleted_at IS NULL AND closed_at IS NULL
```

### `CycleEvaluatorRepository` — novas queries

```
-- Lista avaliadores de um cycle_subject:
findByCycleSubjectId(UUID cycleSubjectId) → List<CycleEvaluator>
  WHERE cycle_subject_id = :cycleSubjectId

-- Conta avaliadores convidados (não obrigatórios) de um cycle_subject:
countGuestsByCycleSubjectId(UUID cycleSubjectId) → int
  WHERE cycle_subject_id = :cycleSubjectId AND is_mandatory = false AND deleted_at IS NULL

-- Verifica se um userId já é avaliador de um cycle_subject:
existsByEvaluatorUserIdAndCycleSubjectId(UUID userId, UUID cycleSubjectId) → boolean
  WHERE evaluator_user_id = :userId AND cycle_subject_id = :cycleSubjectId

-- Busca avaliador específico por ID e cycle_subject (para validar posse no DELETE):
findByIdAndCycleSubjectId(UUID evaluatorId, UUID cycleSubjectId) → Optional<CycleEvaluator>
```

### `UserRepository` — queries reutilizadas e novas

```
-- Já definida em 006 (reutilizar):
existsByIdAndPdmIdAndActiveTrue(UUID userId, UUID pdmId) → boolean

-- Busca pares do colaborador (mesmo PDM) para ONA mock:
findActiveByPdmIdExcluding(UUID pdmId, List<UUID> excludedUserIds) → List<User>
  WHERE pdm_id = :pdmId AND active = true AND deleted_at IS NULL
    AND id NOT IN (:excludedUserIds)
```

### `GET /api/users/search?q={term}`

Endpoint de busca de usuários para popular o campo de adição de avaliadores no frontend. Retorna usuários ativos cujo nome ou e-mail contenha o termo buscado (case-insensitive, mínimo 2 caracteres).

- **Authorization:** qualquer perfil autenticado (`CIETER`, `PDM`, `ADMIN`, etc.)
- **Query param:** `q` (string, mínimo 2 caracteres)
- **Response `200`:**

```json
{
  "users": [
    {
      "userId": "uuid",
      "name": "string",
      "email": "string"
    }
  ]
}
```

- Retornar no máximo 20 resultados.
- Excluir usuários inativos (`active = false`) e deletados (`deleted_at IS NOT NULL`).
- **Response `400`:** se `q` tiver menos de 2 caracteres.

**Query JPQL:**
```
SELECT u FROM User u
WHERE u.active = true AND u.deletedAt IS NULL
AND (LOWER(u.name) LIKE LOWER(CONCAT('%', :term, '%'))
     OR LOWER(u.email) LIKE LOWER(CONCAT('%', :term, '%')))
ORDER BY u.name ASC
LIMIT 20
```

---

## Requisitos de qualidade

- [ ] I/O-bound: os endpoints de listagem e edição executam múltiplas queries (validação + listagem + contagem). Virtual threads são opcionais no MVP dado o volume esperado, mas o padrão do projeto deve ser seguido.
- [ ] GraalVM AOT: DTOs de resposta implementados como Java records. Nenhuma reflection não declarada. O campo `source` do `cycle_evaluator` é mapeado via enum Java — garantir que o enum seja registrado para reflection se necessário.
- [ ] Dados sensíveis: nenhum dado sensível exposto. `userId` e `pdmId` são sempre extraídos do JWT — nenhum parâmetro de request controla a identidade do ator.
- [ ] Autorização: dois níveis de verificação para os endpoints do colaborador: `@PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")` no controller + verificação de posse do `cycleSubjectId` no service. Para endpoints do PDM: `@PreAuthorize("hasAuthority('PDM')")` + verificação de vínculo `users.pdm_id`.
- [ ] Scheduler: o `CfValidationExpiryScheduler` deve usar `@Transactional` por ciclo (não em batch) para isolamento de falhas. Logar início e fim de cada execução do scheduler.

## Estratégia de testes

**Fluxo principal — listagem:**
- Colaborador com ciclo CF em `VALIDATING_EVALUATORS` → retorna lista com avaliadores SELF, PDM e convidados ONA mock; `guestCount` e `guestLimit` corretos.
- PDM consultando lista do liderado → mesma resposta, desde que o vínculo seja válido.
- Ciclo em `COLLECTING` → `409` com `NOT_IN_VALIDATION_PHASE`.

**Fluxo principal — adição:**
- Colaborador adiciona avaliador válido com lista abaixo de 10 convidados → `201` com o avaliador criado.
- PDM adiciona avaliador ao liderado → `201` com `source = MANUAL_PDM`.
- Avaliador adicionado aparece na listagem subsequente.

**Fluxo principal — remoção:**
- Colaborador remove avaliador convidado → `204`; avaliador não aparece na listagem subsequente.
- Colaborador tenta remover avaliador com `is_mandatory = true` (SELF ou PDM) → `409 CANNOT_REMOVE_MANDATORY_EVALUATOR`.
- Colaborador tenta remover avaliador de outro colaborador (path inválido) → `403`.

**Fluxo principal — confirmação:**
- Colaborador confirma lista dentro do prazo → `204`; `cycle_subject.status` muda para `COLLECTING`; `validated_at` é preenchido; `cycle.collection_deadline = collection_start_at + 10 dias`.
- Confirmação após prazo expirado → `409 VALIDATION_DEADLINE_EXPIRED`.

**Casos de erro esperados:**
- `cycleSubjectId` que não pertence ao colaborador → `403`.
- `userId` inexistente no body do POST → `404`.
- Adição de avaliador já presente na lista → `409 EVALUATOR_ALREADY_IN_LIST`.
- Adição quando limite de 10 convidados está atingido → `409 GUEST_LIMIT_REACHED`.
- Token ausente → `401`.
- Perfil sem permissão → `403`.

**Casos de autorização:**
- PDM A não pode consultar nem editar lista do liderado de PDM B → `403`.
- Colaborador A não pode acessar `cycleSubjectId` de colaborador B → `403`.

**Scheduler:**
- `cycle_subject` com `validation_deadline` expirado e `status = VALIDATING_EVALUATORS` → após execução do scheduler: `status = COLLECTING`, avaliadores ONA complementados, `collection_deadline` preenchido.
- Falha no processamento de um ciclo não impede o processamento dos demais.

**Edge cases:**
- ONA mock não encontra pares suficientes (colaborador sem colegas com mesmo PDM): completar com o que há, sem forçar o limite de 3.
- Colaborador que tem 10 convidados antes da confirmação: confirmação deve prosseguir normalmente (limite de 10 é de adição, não de confirmação).

## Riscos técnicos e dependências

- **Impacto retroativo em features 006 e 007:** a introdução da fase `VALIDATING_EVALUATORS` muda o fluxo de criação de ciclo CF. As features 006 e 007 criam ciclos diretamente com `status = COLLECTING`. Se essa mudança for adotada, o código dessas features precisará ser ajustado para criar com `status = VALIDATING_EVALUATORS`, popular os avaliadores ONA mock iniciais, e definir `validation_deadline`. Coordenar com os agentes que implementaram essas features antes de alterar o comportamento em produção.

- **Scheduler de expiração e concorrência:** se o `CfValidationExpiryScheduler` rodar em múltiplas instâncias (escalabilidade horizontal futura), dois nós podem processar o mesmo `cycle_subject` simultaneamente. No MVP (instância única) isso não é problema. Para o futuro, considerar `SELECT ... FOR UPDATE SKIP LOCKED` na query do scheduler.

- **ONA mock e aleatoriedade:** a seleção aleatória de avaliadores pelo ONA mock torna os testes de integração não determinísticos se o pool de usuários for fixo. Controlar o seed de aleatoriedade em testes ou usar um mock determinístico (por exemplo, selecionar os N primeiros por ordem de `id`).

- **Soft delete em `cycle_evaluator`:** decisão confirmada — usar `deleted_at` na remoção de avaliadores para manter consistência com o padrão do projeto. Todas as queries de contagem e listagem filtram por `deleted_at IS NULL`.

- **Dependência de `001.modelo-de-dados`:** as colunas `validation_deadline`, `validated_at`, `added_by` e `source` não existem no schema atual. A migração deve ser executada e aplicada em ambiente de desenvolvimento antes que qualquer endpoint possa ser testado. Verificar se o Liquibase está configurado para auto-run ou se requer execução manual.

- **`CycleStatus` enum Java:** se o enum `CycleStatus` for um tipo Java compartilhado (definido em `001.modelo-de-dados` ou em uma feature anterior), adicionar `VALIDATING_EVALUATORS` a ele pode exigir recompilação das features que já usam o enum. Garantir que o valor seja adicionado de forma retrocompatível.