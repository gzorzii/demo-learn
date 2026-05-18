# Submeter Avaliação do PDM sobre o Liderado no CF — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature permite que o PDM autenticado preencha e submeta sua avaliação sobre um liderado específico no ciclo de Continuous Feedback. A avaliação cobre três campos de texto aberto (Resultado, Prontidão e Action), diferindo das features 009 e 010 que possuem um único campo de texto.

O acesso é identificado via JWT e restrito ao `CycleEvaluator` onde `evaluatorType = PDM` e `evaluatorUser.id = userId` extraído do token. A verificação de vínculo PDM–liderado ocorre nesse cruzamento — não há listagem de subordinados hierárquicos; o vínculo é o registro `CycleEvaluator` existente no ciclo.

A feature suporta rascunho automático (três campos independentes por rascunho) e submissão definitiva imutável. Após submissão, o endpoint de leitura retorna os dados no estado `ALREADY_SUBMITTED` e o frontend passa a modo somente leitura.

**Camadas tocadas:** novo controller (`PdmCfEvaluationController`), novo service (`PdmCfEvaluationService`), dois novos repositórios (`CfPdmEvaluationDraftRepository`, `CfPdmEvaluationResponseRepository`) e repositórios existentes (`CycleEvaluatorRepository`, `CycleSubjectRepository`).

**Domínios afetados:**
- `cycle_evaluator` — leitura para validar vínculo PDM–liderado e estado; escrita ao registrar submissão (`status = RESPONDED`, `responded_at`)
- `cycle_subject` — leitura para verificar fase do ciclo (`status = COLLECTING`) e prazo
- `cycle` — leitura para validar `collection_deadline`
- Nova tabela `cf_pdm_evaluation_draft` — rascunho com três campos de texto independentes
- Nova tabela `cf_pdm_evaluation_response` — resposta definitiva com três campos de texto

## Modelo de dados

### Novas tabelas / alterações de schema

#### Nova tabela: `cf_pdm_evaluation_draft`

O rascunho é separado da resposta definitiva pelo mesmo motivo das features anteriores: a resposta é imutável após submissão, enquanto o rascunho pode ser sobrescrito indefinidamente. A separação também evita que um rascunho seja confundido com uma submissão no banco.

Os três campos são independentemente nullable no rascunho porque o PDM pode começar a preencher um campo antes dos outros — a regra de "todos obrigatórios" aplica-se apenas na submissão final, não no rascunho.

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrição |
|--------|----------------|----------|---------|-----------|
| `id` | `UUID` | não | `gen_random_uuid()` | PK |
| `cycle_evaluator_id` | `UUID` | não | — | FK → `cycle_evaluator.id`, UNIQUE |
| `resultado_draft` | `TEXT` | sim | `NULL` | — |
| `prontidao_draft` | `TEXT` | sim | `NULL` | — |
| `action_draft` | `TEXT` | sim | `NULL` | — |
| `updated_at` | `TIMESTAMPTZ` | não | `now()` | — |
| `deleted_at` | `TIMESTAMPTZ` | sim | `NULL` | soft delete padrão |

- A constraint UNIQUE em `cycle_evaluator_id` (filtrada por `deleted_at IS NULL`) garante um único rascunho ativo por avaliador PDM. Novo registro é inserido somente se não existir rascunho ativo.
- Diferente da feature 010 (`cf_self_evaluation_draft`), os três campos são nullable porque o PDM pode preencher parcialmente — o PUT de rascunho persiste apenas o que foi enviado (os três campos são sempre enviados, mas podem ser strings vazias ou nulos conforme o estado do formulário).

#### Nova tabela: `cf_pdm_evaluation_response`

Armazena a avaliação definitiva do PDM após submissão. Separado do rascunho para manter imutabilidade semântica e facilitar auditoria independente.

Os três campos são NOT NULL na resposta porque a regra de negócio exige que todos sejam preenchidos antes da submissão final.

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrição |
|--------|----------------|----------|---------|-----------|
| `id` | `UUID` | não | `gen_random_uuid()` | PK |
| `cycle_evaluator_id` | `UUID` | não | — | FK → `cycle_evaluator.id`, UNIQUE |
| `resultado` | `TEXT` | não | — | NOT NULL, length >= 1 após trim |
| `prontidao` | `TEXT` | não | — | NOT NULL, length >= 1 após trim |
| `action` | `TEXT` | não | — | NOT NULL, length >= 1 após trim |
| `submitted_at` | `TIMESTAMPTZ` | não | `now()` | — |
| `deleted_at` | `TIMESTAMPTZ` | sim | `NULL` | soft delete padrão |

- A constraint UNIQUE em `cycle_evaluator_id` (filtrada por `deleted_at IS NULL`) implementa "PDM só pode submeter uma avaliação por liderado por ciclo" no nível de banco — salvaguarda adicional contra race conditions.
- Os campos de texto são TEXT sem limite máximo, conforme Regra 4 do `business.md` (CF usa texto aberto, sem escala numérica).

#### Alteração em `cycle_evaluator`

Nenhuma coluna nova. A submissão é registrada atualizando campos já existentes:
- `status`: `PENDING` → `RESPONDED`
- `responded_at`: preenchido com `now()` no momento da submissão

> Observação: o campo na entidade é chamado `respondedAt` no domínio. Verificar o nome real da coluna no banco (`responded_at` ou `submitted_at`) consultando a migration mais recente antes da implementação.

### Índices necessários

```sql
-- Busca do rascunho ativo do PDM (hot path do PUT /draft):
CREATE UNIQUE INDEX idx_cf_pdm_draft_evaluator
  ON cf_pdm_evaluation_draft (cycle_evaluator_id)
  WHERE deleted_at IS NULL;

-- Busca da resposta submetida do PDM (verificação de submissão existente + leitura):
CREATE UNIQUE INDEX idx_cf_pdm_response_evaluator
  ON cf_pdm_evaluation_response (cycle_evaluator_id)
  WHERE deleted_at IS NULL;
```

### Estratégia de migração

A migração Liquibase deve ser numerada `008-feature-011-schema.sql`, imediatamente após `007-feature-010-schema.sql`.

A migração deve:
1. Criar a tabela `cf_pdm_evaluation_draft` com PK, UNIQUE em `cycle_evaluator_id` (parcial, `WHERE deleted_at IS NULL`), FK para `cycle_evaluator.id` com `ON DELETE CASCADE`.
2. Criar a tabela `cf_pdm_evaluation_response` com PK, UNIQUE em `cycle_evaluator_id` (parcial, `WHERE deleted_at IS NULL`), FK para `cycle_evaluator.id`.
3. Criar os dois índices documentados acima.

Nenhum dado existente requer migração de conteúdo. Rollback é seguro: as tabelas são novas e não há dependência de código anterior sobre elas.

## Contratos de API

### `GET /api/me/team/:colaboradorId/cycles/:cycleSubjectId/pdm-evaluation`

Retorna o estado atual da avaliação do PDM para o liderado indicado. Inclui rascunho em progresso (se houver) ou a resposta submetida (se já submetida). O frontend usa esta resposta para decidir entre formulário editável e modo somente leitura.

A inclusão de rascunho e resposta no mesmo endpoint elimina chamadas extras na montagem — o frontend recebe tudo em uma única requisição.

- **Authorization:** perfil `PDM`
- **Path parameters:**
  - `colaboradorId` (UUID) — `subjectUser.id` do liderado; usado para validação de vínculo (deve corresponder ao `CycleSubject` informado)
  - `cycleSubjectId` (UUID) — ID do registro `cycle_subject` do liderado
- **Request body:** nenhum

**Validações executadas no service, nesta ordem:**
1. Existe `CycleEvaluator` com `cycleSubject.id = cycleSubjectId`, `evaluatorUser.id = pdmUserId` (do JWT), `evaluatorType = PDM` e `deletedAt IS NULL`. Se não existir → `404` (o PDM não é avaliador PDM deste liderado neste ciclo, ou o ciclo não existe).
2. O `CycleSubject` vinculado tem `deletedAt IS NULL`. Se deletado → `404`.
3. O `cycleSubject.subjectUser.id` corresponde ao `colaboradorId` do path. Se não corresponder → `403` (path inconsistente — tentativa de acesso a liderado de outro PDM).

Após as validações de existência e posse, o endpoint retorna `200` com `evaluationState` adequado — não retorna erro para estados de "já respondeu" ou "ciclo encerrado".

- **Response `200`:**

```json
{
  "cycleEvaluatorId": "uuid",
  "cycleSubjectId": "uuid",
  "subjectName": "string",
  "collectionDeadline": "ISO-8601 com timezone | null",
  "evaluatorStatus": "PENDING" | "RESPONDED" | "SKIPPED",
  "evaluationState": "OPEN" | "ALREADY_SUBMITTED" | "CYCLE_NOT_COLLECTING" | "DEADLINE_EXPIRED",
  "draft": {
    "resultadoDraft": "string | null",
    "prontidaoDraft": "string | null",
    "actionDraft": "string | null"
  } | null,
  "response": {
    "resultado": "string",
    "prontidao": "string",
    "action": "string",
    "submittedAt": "ISO-8601 com timezone"
  } | null
}
```

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `cycleEvaluatorId` | `UUID` | não | ID do `CycleEvaluator` do PDM neste ciclo — usado como identificador nas chamadas de draft e submit |
| `cycleSubjectId` | `UUID` | não | ID do `cycle_subject` do liderado |
| `subjectName` | `string` | não | Nome do liderado (campo `users.name` do `cycle_subject.subject_user_id`) |
| `collectionDeadline` | `string (ISO-8601)` | sim | Prazo de coleta do ciclo; nulo se não definido |
| `evaluatorStatus` | `string` | não | Status atual do `CycleEvaluator` (`PENDING`, `RESPONDED`, `SKIPPED`) |
| `evaluationState` | `string` | não | Estado derivado para o frontend; ver valores abaixo |
| `draft` | `object` | sim | Rascunho ativo; nulo se não houver rascunho ou já submetido |
| `draft.resultadoDraft` | `string` | sim | Texto do campo Resultado no rascunho |
| `draft.prontidaoDraft` | `string` | sim | Texto do campo Prontidão no rascunho |
| `draft.actionDraft` | `string` | sim | Texto do campo Action no rascunho |
| `response` | `object` | sim | Resposta submetida; nulo se ainda não submetido |
| `response.resultado` | `string` | não | Texto final do campo Resultado |
| `response.prontidao` | `string` | não | Texto final do campo Prontidão |
| `response.action` | `string` | não | Texto final do campo Action |
| `response.submittedAt` | `string (ISO-8601)` | não | Data/hora da submissão |

**Valores de `evaluationState` e quando ocorrem:**

| Valor | Condição |
|-------|----------|
| `OPEN` | `cycle_evaluator.status = PENDING` E `cycle_subject.status = COLLECTING` E (`collectionDeadline IS NULL` OU `now() <= collectionDeadline`) |
| `ALREADY_SUBMITTED` | `cycle_evaluator.status = RESPONDED` |
| `CYCLE_NOT_COLLECTING` | `cycle_subject.status` diferente de `COLLECTING` (ex: `VALIDATING_EVALUATORS`, `CLOSED`, `CANCELLED`) E `cycle_evaluator.status = PENDING` |
| `DEADLINE_EXPIRED` | `now() > cycle.collection_deadline` E `cycle_subject.status = COLLECTING` E `cycle_evaluator.status = PENDING` |

Lógica de prioridade: `ALREADY_SUBMITTED` > `CYCLE_NOT_COLLECTING` > `DEADLINE_EXPIRED` > `OPEN`. Verificar nessa ordem.

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Dados retornados com sucesso |
| 401 | Token JWT ausente, expirado ou inválido |
| 403 | Path inconsistente: `colaboradorId` não corresponde ao `subjectUser.id` do `cycleSubject` informado |
| 404 | Não existe `CycleEvaluator` com `evaluatorType = PDM`, `evaluatorUser = autenticado`, `cycleSubject = cycleSubjectId`, ou o `CycleSubject` foi deletado |
| 500 | Erro inesperado |

**Edge cases:**
- `collectionDeadline` nulo: `evaluationState = OPEN` se o ciclo estiver em `COLLECTING` e `evaluatorStatus = PENDING`. O frontend deve lidar com deadline nulo exibindo ausência de prazo.
- `draft` deve ser `null` — e não um objeto com todos os campos nulos — quando não houver rascunho ativo. Isso permite ao frontend distinguir "rascunho não iniciado" de "rascunho vazio".
- `response` deve ser `null` quando não houver submissão; o `evaluationState = ALREADY_SUBMITTED` implica que `response` não é nulo — mas o service deve garantir essa consistência, não o frontend.

---

### `PUT /api/me/team/:colaboradorId/cycles/:cycleSubjectId/pdm-evaluation/draft`

Salva ou atualiza o rascunho da avaliação PDM para o liderado. Chamado com debounce de 1 segundo a cada `onChange` no frontend. O endpoint é idempotente: múltiplas chamadas com os mesmos dados produzem o mesmo estado final.

O uso de `PUT` é intencional: o rascunho é um recurso singleton por `CycleEvaluator` — não há coleção de rascunhos; há apenas um rascunho ativo que é substituído a cada chamada.

Os três campos são enviados sempre juntos no body — o frontend mantém o estado dos três e os envia completos a cada debounce. Isso simplifica a lógica de upsert no backend (substitui o registro inteiro).

- **Authorization:** perfil `PDM`
- **Path parameters:** `colaboradorId` (UUID), `cycleSubjectId` (UUID) — mesmos do GET
- **Request body:**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `resultadoDraft` | `string` | sim | Não nulo; pode ser string vazia; máximo não definido |
| `prontidaoDraft` | `string` | sim | Não nulo; pode ser string vazia; máximo não definido |
| `actionDraft` | `string` | sim | Não nulo; pode ser string vazia; máximo não definido |

**Validações executadas no service, nesta ordem:**
1. Existe `CycleEvaluator` PDM vinculando o PDM autenticado ao `cycleSubjectId`. Se não → `404`.
2. `cycle_evaluator.status = PENDING`. Se `RESPONDED` → `409` com `errorCode: "ALREADY_SUBMITTED"`.
3. `cycle_subject.status = COLLECTING`. Se diferente → `409` com `errorCode: "CYCLE_NOT_COLLECTING"`.
4. Todos os campos do body estão presentes (não nulos). Se algum for nulo → `400`.

**Lógica de upsert (em `@Transactional`):**
- Buscar rascunho ativo via `findByCycleEvaluatorIdAndDeletedAtIsNull(cycleEvaluatorId)`.
- Se existir: atualizar `resultado_draft`, `prontidao_draft`, `action_draft` e `updated_at = now()`.
- Se não existir: inserir novo registro com os três campos e `updated_at = now()`.

- **Response `204 No Content`:** sem corpo

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 204 | Rascunho salvo com sucesso |
| 400 | Algum dos três campos do body é nulo (ausente) |
| 401 | Token JWT ausente, expirado ou inválido |
| 403 | Path inconsistente: `colaboradorId` não corresponde ao liderado do `cycleSubject` |
| 404 | `CycleEvaluator` PDM não encontrado para o par (autenticado, `cycleSubjectId`) |
| 409 | PDM já submeteu (`ALREADY_SUBMITTED`); ciclo não está em coleta (`CYCLE_NOT_COLLECTING`) |
| 500 | Erro inesperado |

**Edge cases:**
- Campos com string vazia `""`: aceitar — o PDM pode limpar um campo sem que isso constitua erro. A validação de "não vazio" só ocorre na submissão final.
- Alta frequência de chamadas (debounce de 1s): o upsert deve ser eficiente. A query de busca usa o índice `idx_cf_pdm_draft_evaluator`.

---

### `POST /api/me/team/:colaboradorId/cycles/:cycleSubjectId/pdm-evaluation/submit`

Submete a avaliação definitiva do PDM. Após este endpoint retornar `201`, a avaliação não pode mais ser alterada — o formulário passa a exibir modo somente leitura.

O uso de `/submit` como sub-recurso é intencional para distinguir claramente a ação de submissão do gerenciamento do rascunho (mesmo padrão da feature 010).

- **Authorization:** perfil `PDM`
- **Path parameters:** `colaboradorId` (UUID), `cycleSubjectId` (UUID) — mesmos do GET
- **Request body:**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `resultado` | `string` | sim | Não vazio após trim; mínimo 1 caractere |
| `prontidao` | `string` | sim | Não vazio após trim; mínimo 1 caractere |
| `action` | `string` | sim | Não vazio após trim; mínimo 1 caractere |

**Validações executadas no service, nesta ordem:**
1. Existe `CycleEvaluator` PDM vinculando o PDM autenticado ao `cycleSubjectId`. Se não → `404`.
2. `cycle_evaluator.status = PENDING`. Se `RESPONDED` → `409` com `errorCode: "ALREADY_SUBMITTED"`.
3. `cycle_subject.status = COLLECTING`. Se diferente → `409` com `errorCode: "CYCLE_NOT_COLLECTING"`.
4. `now() <= cycle.collection_deadline` (se deadline não for nulo). Se expirado → `409` com `errorCode: "DEADLINE_EXPIRED"`.
5. `resultado`, `prontidao` e `action` não vazios após trim. Se algum for vazio → `400`.

> A verificação de `ALREADY_SUBMITTED` (passo 2) ocorre antes da verificação de status do ciclo (passo 3). Isso garante que um PDM que já submeteu receba `409 ALREADY_SUBMITTED` mesmo que o ciclo tenha encerrado entre a submissão e uma nova tentativa — o erro é mais informativo do que `CYCLE_NOT_COLLECTING`.

**Lógica de submissão (em `@Transactional`):**
1. Criar registro em `cf_pdm_evaluation_response`:
   - `cycle_evaluator_id` = ID do `CycleEvaluator` do PDM
   - `resultado` = `resultado` do body (após trim)
   - `prontidao` = `prontidao` do body (após trim)
   - `action` = `action` do body (após trim)
   - `submitted_at` = `now()`
2. Atualizar `cycle_evaluator`:
   - `status = RESPONDED`
   - `responded_at = now()`
3. Aplicar soft delete no rascunho ativo, se existir:
   - `cf_pdm_evaluation_draft.deleted_at = now()` — rascunho "consumido" pela submissão
4. Após commit: chamar `NotificationService.notifyPdmEvaluationSubmitted(cycleEvaluatorId)` — stub que loga no nível `INFO`.

> A constraint UNIQUE em `cf_pdm_evaluation_response.cycle_evaluator_id` serve como salvaguarda contra race conditions (duas submissões simultâneas). Se a inserção violar a UNIQUE constraint, o banco lança exceção — o `GlobalExceptionHandler` deve capturar `DataIntegrityViolationException` e retornar `409` com `errorCode: "ALREADY_SUBMITTED"`. O mesmo mapeamento já exigido pelas features 009 e 010 cobre este caso.

- **Response `201 Created`:** sem corpo

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 201 | Avaliação submetida com sucesso |
| 400 | Algum dos três campos está vazio ou é apenas espaços após trim |
| 401 | Token JWT ausente, expirado ou inválido |
| 403 | Path inconsistente: `colaboradorId` não corresponde ao liderado do `cycleSubject` |
| 404 | `CycleEvaluator` PDM não encontrado para o par (autenticado, `cycleSubjectId`) |
| 409 | PDM já submeteu (`ALREADY_SUBMITTED`); ciclo não em coleta (`CYCLE_NOT_COLLECTING`); prazo expirado (`DEADLINE_EXPIRED`) |
| 500 | Erro inesperado na transação |

**Edge cases:**
- Race condition com duas submissões simultâneas: a UNIQUE constraint garante que apenas uma seja aceita; a segunda recebe `409 ALREADY_SUBMITTED`.
- Campo com apenas espaços em branco (`"   "`): deve ser rejeitado após trim → `400`.
- Submissão sem rascunho existente (PDM preencheu sem acionar o debounce): aceitar normalmente — o rascunho é opcional; o body do POST é a fonte de verdade.

## Queries de repositório necessárias

### `CfPdmEvaluationDraftRepository` — novo repositório

```
-- Busca rascunho ativo do PDM (hot path do PUT /draft):
findByCycleEvaluatorIdAndDeletedAtIsNull(UUID cycleEvaluatorId) → Optional<CfPdmEvaluationDraft>

-- Verifica existência de rascunho antes de inserir:
existsByCycleEvaluatorIdAndDeletedAtIsNull(UUID cycleEvaluatorId) → boolean
```

### `CfPdmEvaluationResponseRepository` — novo repositório

```
-- Busca resposta submetida do PDM (para GET e verificação de re-submissão):
findByCycleEvaluatorIdAndDeletedAtIsNull(UUID cycleEvaluatorId) → Optional<CfPdmEvaluationResponse>

-- Verifica existência de resposta (segunda barreira antes de tentar inserir):
existsByCycleEvaluatorIdAndDeletedAtIsNull(UUID cycleEvaluatorId) → boolean
```

### `CycleEvaluatorRepository` — query nova necessária

A query abaixo deve ser adicionada ao repositório existente. O JOIN FETCH é obrigatório para carregar `cycleSubject` e `cycle` em uma única query — evitar N+1 ao acessar `cycleEvaluator.getCycleSubject().getCycle()` em transação `readOnly`.

```
-- Localiza o CycleEvaluator do PDM para um CycleSubject específico:
findByCycleSubjectIdAndEvaluatorUserIdAndEvaluatorTypeAndDeletedAtIsNull(
  UUID cycleSubjectId,
  UUID evaluatorUserId,
  EvaluatorType evaluatorType
) → Optional<CycleEvaluator>

-- JPQL com JOIN FETCH necessário:
SELECT ce FROM CycleEvaluator ce
  JOIN FETCH ce.cycleSubject cs
  JOIN FETCH cs.cycle c
  JOIN FETCH cs.subjectUser su
WHERE ce.cycleSubject.id = :cycleSubjectId
  AND ce.evaluatorUser.id = :evaluatorUserId
  AND ce.evaluatorType = :evaluatorType
  AND ce.deletedAt IS NULL
```

### `CycleSubjectRepository` — queries já existentes (reutilizar)

```
-- Já definida em feature 008 — reutilizar sem alteração:
findByIdAndSubjectUserIdAndDeletedAtIsNull(UUID cycleSubjectId, UUID userId) → Optional<CycleSubject>
  (deve incluir JOIN FETCH cycle para acessar collectionDeadline)
```

## Entidade JPA — `CfPdmEvaluationDraft`

Mapeamento da tabela `cf_pdm_evaluation_draft`. Campos: `id (UUID, PK)`, `cycleEvaluator (ManyToOne LAZY → CycleEvaluator)`, `resultadoDraft (String, nullable)`, `prontidaoDraft (String, nullable)`, `actionDraft (String, nullable)`, `updatedAt (Instant, NOT NULL)`, `deletedAt (Instant, nullable)`.

## Entidade JPA — `CfPdmEvaluationResponse`

Mapeamento da tabela `cf_pdm_evaluation_response`. Campos: `id (UUID, PK)`, `cycleEvaluator (ManyToOne LAZY → CycleEvaluator)`, `resultado (String, NOT NULL)`, `prontidao (String, NOT NULL)`, `action (String, NOT NULL)`, `submittedAt (Instant, NOT NULL)`, `deletedAt (Instant, nullable)`.

## DTOs

```
// Request — rascunho:
PdmEvaluationDraftRequest {
  resultadoDraft: String (não nulo, pode ser vazio)
  prontidaoDraft: String (não nulo, pode ser vazio)
  actionDraft: String (não nulo, pode ser vazio)
}

// Request — submissão:
PdmEvaluationSubmitRequest {
  resultado: String (@NotBlank)
  prontidao: String (@NotBlank)
  action: String (@NotBlank)
}

// Response — estado da avaliação (GET):
PdmEvaluationContextDto {
  cycleEvaluatorId: UUID
  cycleSubjectId: UUID
  subjectName: String
  collectionDeadline: Instant? (nullable)
  evaluatorStatus: EvaluatorStatus (enum)
  evaluationState: EvaluationState (enum — reutilizar com valor DEADLINE_EXPIRED adicionado se ainda não existir)
  draft: PdmDraftDto? (nullable)
  response: PdmResponseDto? (nullable)
}

PdmDraftDto {
  resultadoDraft: String?
  prontidaoDraft: String?
  actionDraft: String?
}

PdmResponseDto {
  resultado: String
  prontidao: String
  action: String
  submittedAt: Instant
}
```

> O enum `EvaluationState` já possui `OPEN`, `ALREADY_SUBMITTED`, `CYCLE_NOT_COLLECTING` (adicionado na feature 010) e `DEADLINE_EXPIRED` (feature 009 como `CYCLE_CLOSED` equivalente). Verificar se `DEADLINE_EXPIRED` e `CYCLE_NOT_COLLECTING` já existem no enum antes de adicionar. Não duplicar valores existentes.

## Requisitos de qualidade

- [ ] I/O-bound: o `PUT /draft` é chamado com alta frequência (debounce de 1s). Cada chamada executa 1 SELECT + 1 INSERT ou UPDATE. Virtual threads são recomendados para suportar múltiplos PDMs editando simultaneamente (mesmo racional da feature 010).
- [ ] GraalVM AOT: DTOs implementados como Java records. Reutilizar o enum `EvaluationState` — não criar tipo paralelo. Garantir que novos valores adicionados ao enum sejam registrados para reflection se necessário.
- [ ] Dados sensíveis: `resultado`, `prontidao`, `action` e seus rascunhos contêm avaliação de desempenho de um colaborador — dado sensível. Garantir que nenhum log de aplicação persista o conteúdo desses campos; logar apenas IDs e estados. Em produção, considerar criptografia em repouso (mesmo risco identificado nas features 009 e 010).
- [ ] Autorização: `@PreAuthorize("hasAuthority('PDM')")` no controller. A verificação de vínculo PDM–liderado ocorre no service (não existe endpoint aberto a qualquer PDM — cada PDM acessa apenas liderados aos quais está vinculado como `CycleEvaluator` com `evaluatorType = PDM`).

## Estratégia de testes

**Fluxo principal — leitura do estado:**
- PDM com liderado em `COLLECTING`, avaliação `PENDING`, sem rascunho → `200` com `evaluationState = OPEN`, `draft = null`, `response = null`.
- PDM com rascunho em progresso → `200` com `draft` preenchido com os três campos.
- PDM com avaliação já submetida → `200` com `evaluationState = ALREADY_SUBMITTED`, `response` com os três campos e `submittedAt` preenchido.
- `cycleSubjectId` sem `CycleEvaluator` de tipo PDM para o PDM autenticado → `404`.
- `colaboradorId` inconsistente com o `subjectUser` do `cycleSubject` → `403`.

**Fluxo principal — salvamento de rascunho:**
- Primeira chamada sem rascunho existente → `204`; registro criado com os três campos.
- Segunda chamada (atualização) → `204`; campos atualizados, `updated_at` renovado.
- Campos com string vazia `""` → `204`; aceito sem erro.
- Campo nulo (ausente no body) → `400`.
- `cycle_evaluator.status = RESPONDED` → `409 ALREADY_SUBMITTED`.
- `cycle_subject.status` diferente de `COLLECTING` → `409 CYCLE_NOT_COLLECTING`.

**Fluxo principal — submissão:**
- Três campos preenchidos, ciclo em `COLLECTING`, `evaluatorStatus = PENDING` → `201`; `cf_pdm_evaluation_response` criado; `cycle_evaluator.status = RESPONDED`; `responded_at` preenchido; rascunho marcado com `deleted_at`.
- Submissão sem rascunho existente → `201`; aceito normalmente.
- Campo vazio ou apenas espaços após trim → `400` (testar cada campo individualmente).
- Segunda submissão após `RESPONDED` → `409 ALREADY_SUBMITTED`.
- Submissão com ciclo em `CLOSED` → `409 CYCLE_NOT_COLLECTING`.
- Submissão após `collection_deadline` expirado → `409 DEADLINE_EXPIRED`.
- Race condition (duas submissões simultâneas) → uma retorna `201`, a outra retorna `409 ALREADY_SUBMITTED` via `DataIntegrityViolationException`.

**Casos de autorização:**
- Requisição sem token JWT → `401`.
- Token com perfil `CIETER` (sem `PDM`) → `403` via `@PreAuthorize`.
- Token PDM com `colaboradorId` de liderado de outro PDM → `404` (o `CycleEvaluator` não existe para o par).

**Edge cases de regras de negócio:**
- PDM acessa GET após submissão → `evaluationState = ALREADY_SUBMITTED`; `draft = null`; `response` com os três campos preenchidos.
- Cada campo com exatamente 1 caractere → aceito na submissão.
- `collectionDeadline` nulo no banco → `200` com `collectionDeadline = null`; `evaluationState = OPEN` se o ciclo estiver em `COLLECTING`.
- `NotificationService.notifyPdmEvaluationSubmitted` é chamado após commit — verificar que o stub loga `INFO` e não lança exceção.

## Riscos técnicos e dependências

- **Endpoint de listagem de liderados (`/meu-time`):** o formulário de avaliação PDM é acessado a partir da tela `/meu-time`, mas nenhuma feature anterior especificou o endpoint `GET /api/me/team/members` (ou equivalente) que lista os liderados do PDM com seus ciclos ativos. O `backend.md` da feature 003 menciona `GET /api/meu-time/{userId}/ciclos/ativos` como trabalho futuro. Esta feature **não** cobre esse endpoint — ela cobre apenas o formulário de avaliação após o PDM já ter navegado para o liderado. O link de acesso ao formulário na tela `/meu-time` depende de um endpoint de listagem que deve ser especificado e implementado separadamente (provavelmente na feature 012 — acompanhar progresso CF — ou em uma feature dedicada de visão do time). Registrar como dependência não coberta.

- **Enum `EvaluationState` compartilhado:** o enum `EvaluationState` foi introduzido na feature 009 e estendido na feature 010. Esta feature adiciona `DEADLINE_EXPIRED` (se ainda não existir) e `CYCLE_NOT_COLLECTING` (se ainda não existir). O agente de implementação deve verificar o estado atual do enum antes de adicionar valores — incluir apenas o que falta, sem duplicar.

- **Nome do campo `responded_at` em `cycle_evaluator`:** o modelo de domínio define `respondedAt`, mas o nome real da coluna no banco pode ser `responded_at` ou `submitted_at` dependendo de qual migração criou a tabela. Verificar o schema atual antes de escrever o UPDATE.

- **`GlobalExceptionHandler` e `DataIntegrityViolationException`:** o handler deve capturar `DataIntegrityViolationException` causada pela UNIQUE constraint de `cf_pdm_evaluation_response.cycle_evaluator_id` e retornar `409` com `errorCode: "ALREADY_SUBMITTED"`. As features 009 e 010 já identificaram esse risco — se o handler não tiver sido atualizado, o agente de implementação desta feature deve incluir o mapeamento.

- **JOIN FETCH obrigatório na query de CycleEvaluator:** ao carregar o `CycleEvaluator`, o service precisa de `cycleSubject.cycle.collectionDeadline` e `cycleSubject.subjectUser.name`. Sem JOIN FETCH, os acessos a essas associações lazy dentro de `@Transactional(readOnly = true)` lançarão `LazyInitializationException`. A query nova no `CycleEvaluatorRepository` deve declarar explicitamente todos os JOINs necessários.

- **Rascunho não é invalidado ao fechar o ciclo:** se o ciclo fechar com rascunho PDM ainda ativo, o rascunho permanece no banco. O service de fechamento de ciclo (feature 013) deve considerar soft-deletar rascunhos órfãos ao encerrar, para consistência com o tratamento dado pela feature 010 aos rascunhos de autoavaliação.

- **Prazo de coleta vs. deadline expirado:** diferente da feature 009 (avaliadores convidados com prazo de 10 dias), o PDM não tem um prazo fixo separado — usa `cycle.collection_deadline`. Garantir que a validação de deadline no submit verifique `cycle.collection_deadline` e não um campo de prazo do `cycle_subject` que pode ser nulo.