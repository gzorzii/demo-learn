# Submeter Autoavaliação do Colaborador no CF — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature permite que o colaborador autenticado (sujeita do ciclo CF) preencha e submeta sua autoavaliação em texto aberto durante a fase de coleta. A autoavaliação é obrigatória no CF (Regra 9), mas não impacta a nota final (Regra 3).

A diferença central em relação à feature 009 (avaliador convidado) é que o ator aqui é identificado via JWT — não via token opaco público. O acesso é restrito ao colaborador que é a própria sujeita do `CycleSubject`, verificado cruzando o `cycleSubjectId` do path com o `userId` extraído do JWT. A rota é protegida por `PrivateRoute` + `AppShell`.

Diferente dos avaliadores convidados (feature 009), a autoavaliação suporta **rascunho automático**: o texto digitado é persistido incrementalmente antes da submissão final. Após a submissão, a resposta não pode ser alterada — o formulário passa a exibir modo somente leitura.

Camadas tocadas: novo controller (`CfSelfEvaluationController`), novo service (`CfSelfEvaluationService`), dois novos repositórios (`CfSelfEvaluationDraftRepository`, `CfSelfEvaluationResponseRepository` — análogos aos da feature 009 mas vinculados a `CycleSubject` em vez de `CycleEvaluator`), e dois novos repositórios já listados no contexto de domínio (`CfSelfEvaluationDraftRepository`, `CfSelfEvaluationResponseRepository`).

**Domínios afetados:**
- `cycle_subject` — leitura para validar acesso, status e fase; escrita para atualizar `selfEvaluationStatus`
- `cycle` — leitura para verificar `collectionDeadline` (prazo de coleta do ciclo)
- Nova tabela `cf_self_evaluation_draft` — rascunho incremental da autoavaliação
- Nova tabela `cf_self_evaluation_response` — resposta definitiva submetida

## Modelo de dados

### Novas tabelas / alterações de schema

#### Nova tabela: `cf_self_evaluation_draft`

O rascunho é separado da resposta definitiva para manter os invariantes de negócio: a resposta é imutável após submissão, enquanto o rascunho pode ser sobrescrito ilimitadamente durante a fase de coleta. A separação também garante que um rascunho não seja confundido com uma submissão no banco de dados.

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrição |
|--------|----------------|----------|---------|-----------|
| `id` | `UUID` | não | `gen_random_uuid()` | PK |
| `cycle_subject_id` | `UUID` | não | — | FK → `cycle_subject.id`, UNIQUE |
| `draft_text` | `TEXT` | não | `''` | NOT NULL |
| `updated_at` | `TIMESTAMPTZ` | não | `now()` | — |
| `deleted_at` | `TIMESTAMPTZ` | sim | `NULL` | soft delete padrão |

- A constraint UNIQUE em `cycle_subject_id` (filtrada por `deleted_at IS NULL`) garante que exista no máximo um rascunho ativo por sujeita. Se um rascunho precisar ser recriado após soft delete, um novo registro é inserido.
- `draft_text` é `NOT NULL` com default `''` (string vazia): permite inserção do registro na primeira keystroke sem texto obrigatório.
- O padrão de soft delete via `deleted_at` é consistente com `CfEvaluationDraft` da feature 009.

#### Nova tabela: `cf_self_evaluation_response`

Armazena a autoavaliação definitiva após submissão. Separado do rascunho para manter imutabilidade semântica da resposta e para facilitar auditoria.

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrição |
|--------|----------------|----------|---------|-----------|
| `id` | `UUID` | não | `gen_random_uuid()` | PK |
| `cycle_subject_id` | `UUID` | não | — | FK → `cycle_subject.id`, UNIQUE |
| `response_text` | `TEXT` | não | — | NOT NULL, `length >= 1` após trim |
| `submitted_at` | `TIMESTAMPTZ` | não | `now()` | — |
| `deleted_at` | `TIMESTAMPTZ` | sim | `NULL` | soft delete padrão |

- A constraint UNIQUE em `cycle_subject_id` implementa a regra de negócio "cada sujeita só pode submeter uma autoavaliação por ciclo CF" no nível de banco. Funciona como salvaguarda contra race conditions (duas submissões simultâneas).
- `response_text` é TEXT sem limite máximo (formulário aberto conforme Regra 4 — CF tem foco em texto livre).

#### Alteração em `cycle_subject`

O campo `selfEvaluationStatus` já existe na entidade segundo o contexto de domínio (`PENDING` | `SUBMITTED`). Confirmar se a coluna `self_evaluation_status` já está presente no schema ou se precisa ser adicionada pela migração desta feature.

- Se a coluna não existir ainda: adicionar `self_evaluation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'` com `CHECK (self_evaluation_status IN ('PENDING', 'SUBMITTED'))`.
- Nenhum dado existente requer update manual — o default `'PENDING'` é aplicado automaticamente.

### Índices necessários

```sql
-- Busca do rascunho ativo de uma sujeita (hot path do salvamento incremental):
CREATE UNIQUE INDEX idx_cf_self_draft_subject
  ON cf_self_evaluation_draft (cycle_subject_id)
  WHERE deleted_at IS NULL;

-- Busca da resposta submetida de uma sujeita (verificação de submissão existente + leitura):
CREATE UNIQUE INDEX idx_cf_self_response_subject
  ON cf_self_evaluation_response (cycle_subject_id)
  WHERE deleted_at IS NULL;
```

### Estratégia de migração

A migração Liquibase deve:
1. Criar a tabela `cf_self_evaluation_draft` com PK, UNIQUE em `cycle_subject_id` (parcial, `WHERE deleted_at IS NULL`), FK para `cycle_subject.id` com `ON DELETE CASCADE`.
2. Criar a tabela `cf_self_evaluation_response` com PK, UNIQUE em `cycle_subject_id` (parcial), FK para `cycle_subject.id`.
3. Adicionar coluna `self_evaluation_status` em `cycle_subject` se ainda não existir (verificar changeset da feature 008 antes de duplicar).
4. Criar os índices documentados acima.

Nenhum dado existente requer migração de conteúdo. Rollback é seguro: as tabelas são novas e a coluna adicionada tem default — pode ser removida sem impacto em registros existentes.

> Esta migração deve ser numerada após os changesets da feature 009. Verificar o último changeset aplicado antes de numerar.

## Contratos de API

### `GET /api/me/cycles/:cycleSubjectId/self-evaluation`

Retorna o estado atual da autoavaliação do colaborador autenticado para o ciclo informado. Inclui o rascunho em progresso (se houver) ou a resposta submetida (se já submetida). O frontend usa esta resposta para decidir se exibe o formulário editável ou o modo somente leitura.

A inclusão do rascunho e da resposta no mesmo endpoint elimina chamadas extras na montagem da página — o frontend recebe tudo que precisa em uma única requisição.

- **Authorization:** perfis `CIETER` e `PDM` (colaborador autenticado acessando seu próprio ciclo)
- **Path parameter:** `cycleSubjectId` (UUID) — ID do registro `cycle_subject`
- **Request body:** nenhum

**Validações:**
1. O `cycleSubjectId` deve pertencer ao colaborador autenticado (`cycle_subject.subject_user_id = userId` extraído do JWT). Se não pertencer → `403`.
2. O ciclo deve ser do tipo `CF`. Se não for → `404`.
3. `cycle_subject.deleted_at IS NULL`. Se deletado → `404`.

Após validações de existência e posse, o endpoint **não** retorna erro para ciclos em fase não compatível — retorna `200` com o `evaluationState` adequado para que o frontend renderize o estado correto.

- **Response `200`:**

```json
{
  "cycleSubjectId": "uuid",
  "cycleName": "string | null",
  "collectionDeadline": "ISO-8601 com timezone | null",
  "selfEvaluationStatus": "PENDING" | "SUBMITTED",
  "evaluationState": "OPEN" | "ALREADY_SUBMITTED" | "CYCLE_NOT_COLLECTING",
  "draftText": "string | null",
  "submittedText": "string | null",
  "submittedAt": "ISO-8601 com timezone | null"
}
```

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `cycleSubjectId` | `UUID` | não | ID do `cycle_subject` |
| `cycleName` | `string` | sim | Nome do ciclo (nulo para CF automático) |
| `collectionDeadline` | `string (ISO-8601)` | sim | Prazo de coleta do ciclo (`cycle.collection_deadline`) |
| `selfEvaluationStatus` | `string` | não | `PENDING` ou `SUBMITTED` — campo direto de `cycle_subject.self_evaluation_status` |
| `evaluationState` | `string` | não | Estado derivado para o frontend; ver valores abaixo |
| `draftText` | `string` | sim | Texto do rascunho ativo (`cf_self_evaluation_draft.draft_text`); `null` se não houver rascunho ou já submetido |
| `submittedText` | `string` | sim | Texto da resposta submetida; `null` se ainda não submetido |
| `submittedAt` | `string (ISO-8601)` | sim | Data/hora da submissão; `null` se ainda não submetido |

**Valores de `evaluationState` e quando ocorrem:**

| Valor | Condição |
|-------|----------|
| `OPEN` | `cycle_subject.status = COLLECTING` E `self_evaluation_status = PENDING` |
| `ALREADY_SUBMITTED` | `self_evaluation_status = SUBMITTED` — independente do status do ciclo |
| `CYCLE_NOT_COLLECTING` | `cycle_subject.status` diferente de `COLLECTING` (ex: `VALIDATING_EVALUATORS`, `CLOSED`, `CANCELLED`) E `self_evaluation_status = PENDING` |

A lógica de prioridade na avaliação do estado: `ALREADY_SUBMITTED` > `CYCLE_NOT_COLLECTING` > `OPEN`. Verificar nessa ordem.

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Dados retornados com sucesso |
| 401 | Token JWT ausente, expirado ou inválido |
| 403 | `cycleSubjectId` não pertence ao colaborador autenticado |
| 404 | `cycleSubjectId` não existe ou não é do tipo CF |
| 500 | Erro inesperado |

**Edge cases:**
- Ciclo sem `collection_deadline` definido (incomum): `collectionDeadline = null`, `evaluationState = OPEN` se o ciclo estiver em `COLLECTING`. O frontend deve lidar com deadline nulo exibindo ausência de prazo.
- `draftText` deve ser `null` — e não string vazia — quando não houver rascunho ativo. Isso permite ao frontend distinguir "rascunho ainda não iniciado" de "rascunho vazio iniciado".

---

### `PUT /api/me/cycles/:cycleSubjectId/self-evaluation/draft`

Salva ou atualiza o rascunho da autoavaliação. Chamado com debounce de 1 segundo a cada onChange no frontend — pode receber dezenas de requisições por sessão de edição. O endpoint deve ser idempotente: múltiplas chamadas com o mesmo texto produzem o mesmo estado final.

O uso de `PUT` (em vez de `POST` + `PATCH`) é intencional: o rascunho é um recurso singleton por sujeita — não há coleção de rascunhos; há apenas um rascunho ativo que é substituído.

- **Authorization:** perfis `CIETER` e `PDM`
- **Path parameter:** `cycleSubjectId` (UUID)
- **Request body:**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `draftText` | `string` | sim | Não nulo; pode ser string vazia (o colaborador apagou tudo); máximo não definido (texto aberto) |

**Validações executadas no service, nesta ordem:**
1. `cycleSubjectId` pertence ao colaborador autenticado. Se não → `403`.
2. `cycle_subject.deleted_at IS NULL`. Se deletado → `404`.
3. `cycle_subject.status = COLLECTING`. Se diferente → `409` com `errorCode: "CYCLE_NOT_COLLECTING"`.
4. `cycle_subject.self_evaluation_status = PENDING`. Se `SUBMITTED` → `409` com `errorCode: "ALREADY_SUBMITTED"` (não é possível editar após submissão).

**Lógica de upsert (em `@Transactional`):**
- Buscar rascunho ativo via `findByCycleSubjectIdAndDeletedAtIsNull(cycleSubjectId)`.
- Se existir: atualizar `draft_text = draftText` e `updated_at = now()`.
- Se não existir: inserir novo registro com `cycle_subject_id`, `draft_text` e `updated_at = now()`.

- **Response `204 No Content`:** sem corpo

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 204 | Rascunho salvo com sucesso |
| 400 | `draftText` ausente no body (null) |
| 401 | Token JWT ausente, expirado ou inválido |
| 403 | `cycleSubjectId` não pertence ao colaborador autenticado |
| 404 | `cycleSubjectId` não existe |
| 409 | Ciclo não está em fase de coleta (`CYCLE_NOT_COLLECTING`); ou autoavaliação já foi submetida (`ALREADY_SUBMITTED`) |
| 500 | Erro inesperado |

**Edge cases:**
- `draftText` com string vazia `""`: aceitar — o colaborador pode limpar o campo. Não rejeitar texto vazio no rascunho (apenas na submissão final é obrigatório ter conteúdo).
- Alta frequência de chamadas (debounce de 1s): o upsert deve ser eficiente. A query de busca usa o índice `idx_cf_self_draft_subject` — custo de I/O é baixo. Virtual threads são recomendados se o volume de usuários simultâneos for significativo.

---

### `POST /api/me/cycles/:cycleSubjectId/self-evaluation/submit`

Submete a autoavaliação definitiva. Após este endpoint retornar `201`, a autoavaliação não pode mais ser alterada — o formulário passa a exibir modo somente leitura.

O uso de `/submit` como sub-recurso (em vez de `POST /self-evaluation`) é intencional para distinguir claramente a ação de submissão do gerenciamento do rascunho e evitar confusão semântica com o `PUT /draft`.

- **Authorization:** perfis `CIETER` e `PDM`
- **Path parameter:** `cycleSubjectId` (UUID)
- **Request body:**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `responseText` | `string` | sim | Não vazio após trim; mínimo 1 caractere; máximo não definido |

**Validações executadas no service, nesta ordem:**
1. `cycleSubjectId` pertence ao colaborador autenticado. Se não → `403`.
2. `cycle_subject.deleted_at IS NULL`. Se deletado → `404`.
3. `cycle_subject.self_evaluation_status = PENDING`. Se `SUBMITTED` → `409` com `errorCode: "ALREADY_SUBMITTED"`.
4. `cycle_subject.status = COLLECTING`. Se diferente → `409` com `errorCode: "CYCLE_NOT_COLLECTING"`.
5. `responseText` não vazio após trim. Se vazio → `400`.

> A verificação de `ALREADY_SUBMITTED` (passo 3) ocorre antes da verificação de status do ciclo (passo 4). Isso garante que um colaborador que já submetiu receba `409 ALREADY_SUBMITTED` mesmo que o ciclo tenha encerrado entre a submissão e uma nova tentativa — o erro é mais informativo do que `CYCLE_NOT_COLLECTING`.

**Lógica de submissão (em `@Transactional`):**
1. Criar registro em `cf_self_evaluation_response`:
   - `cycle_subject_id = cycleSubjectId`
   - `response_text = responseText` (após trim)
   - `submitted_at = now()`
2. Atualizar `cycle_subject`:
   - `self_evaluation_status = SUBMITTED`
3. Aplicar soft delete no rascunho ativo, se existir:
   - `cf_self_evaluation_draft.deleted_at = now()` — o rascunho foi "consumido" pela submissão.

> A constraint UNIQUE em `cf_self_evaluation_response.cycle_subject_id` serve como salvaguarda contra race conditions (duas submissões simultâneas). Se a inserção violar a UNIQUE constraint, o banco lança exceção — o `GlobalExceptionHandler` deve capturar `DataIntegrityViolationException` e retornar `409` com `errorCode: "ALREADY_SUBMITTED"`. Verificar se o handler existente já cobre esse caso ou se precisa de mapeamento específico (ver risco técnico correspondente).

- **Response `201 Created`:** sem corpo

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 201 | Autoavaliação submetida com sucesso |
| 400 | `responseText` ausente ou vazio após trim |
| 401 | Token JWT ausente, expirado ou inválido |
| 403 | `cycleSubjectId` não pertence ao colaborador autenticado |
| 404 | `cycleSubjectId` não existe |
| 409 | Autoavaliação já submetida (`ALREADY_SUBMITTED`); ciclo não em coleta (`CYCLE_NOT_COLLECTING`) |
| 500 | Erro inesperado |

**Edge cases:**
- Race condition com duas submissões simultâneas: a UNIQUE constraint em `cf_self_evaluation_response` garante que apenas uma seja aceita. A segunda recebe `409 ALREADY_SUBMITTED` via `DataIntegrityViolationException`.
- `responseText` com apenas espaços em branco: deve ser rejeitado como vazio após trim (`400`).
- Submissão sem rascunho existente (colaborador preencheu sem ter salvo rascunho antes): aceitar normalmente — o rascunho é opcional; o `responseText` do body é a fonte de verdade.

## Queries de repositório necessárias

### `CfSelfEvaluationDraftRepository` — novo repositório

```
-- Busca rascunho ativo de uma sujeita (hot path do PUT /draft):
findByCycleSubjectIdAndDeletedAtIsNull(UUID cycleSubjectId) → Optional<CfSelfEvaluationDraft>

-- Verifica existência de rascunho antes de inserir (pode ser substituído pelo Optional acima):
existsByCycleSubjectIdAndDeletedAtIsNull(UUID cycleSubjectId) → boolean
```

### `CfSelfEvaluationResponseRepository` — novo repositório

```
-- Busca resposta submetida de uma sujeita (para GET e verificação de re-submissão):
findByCycleSubjectIdAndDeletedAtIsNull(UUID cycleSubjectId) → Optional<CfSelfEvaluationResponse>

-- Verifica existência de resposta (segunda barreira antes de tentar inserir):
existsByCycleSubjectIdAndDeletedAtIsNull(UUID cycleSubjectId) → boolean
```

### `CycleSubjectRepository` — queries já existentes (reutilizar)

```
-- Já definida em feature 008:
findByIdAndSubjectUserId(UUID cycleSubjectId, UUID userId) → Optional<CycleSubject>
  WHERE id = :cycleSubjectId AND subject_user_id = :userId AND deleted_at IS NULL
```

> Esta query deve ser executada com `JOIN FETCH cycle` para carregar o `collectionDeadline` do ciclo pai em uma única query — evitar N+1 ao acessar `cycleSubject.getCycle().getCollectionDeadline()` em transação `readOnly`.

## Requisitos de qualidade

- [ ] I/O-bound: o `PUT /draft` é chamado com alta frequência (debounce de 1s). Cada chamada executa 1 SELECT + 1 INSERT ou UPDATE. Virtual threads são recomendados para suportar múltiplos colaboradores editando simultaneamente sem bloqueio de threads do pool.
- [ ] GraalVM AOT: DTOs de request e response implementados como Java records. O `EvaluationState` reutiliza o enum já definido na feature 009 (`OPEN`, `ALREADY_SUBMITTED`); adicionar `CYCLE_NOT_COLLECTING` como novo valor. Garantir que o enum seja registrado para reflection se necessário.
- [ ] Dados sensíveis: `response_text` e `draft_text` contêm autoavaliação de desempenho — dado potencialmente sensível. Garantir que nenhum log persista o conteúdo dos campos de texto — logar apenas IDs e estados. Em produção, considerar criptografia em repouso para as colunas de texto.
- [ ] Autorização: `@PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")` no controller + verificação de posse do `cycleSubjectId` no service (cruzando com o `userId` do JWT). O endpoint não pode ser acessado por outro colaborador mesmo que ele conheça o `cycleSubjectId`.

## Estratégia de testes

**Fluxo principal — leitura do estado:**
- Colaborador com ciclo CF em `COLLECTING` e `selfEvaluationStatus = PENDING`, sem rascunho → `200` com `evaluationState = OPEN`, `draftText = null`, `submittedText = null`.
- Colaborador com rascunho em progresso → `200` com `draftText` preenchido.
- Colaborador com autoavaliação já submetida → `200` com `evaluationState = ALREADY_SUBMITTED`, `submittedText` preenchido, `submittedAt` preenchido.
- Ciclo em `VALIDATING_EVALUATORS` (fase de validação de avaliadores, ainda não em coleta) → `200` com `evaluationState = CYCLE_NOT_COLLECTING`.
- `cycleSubjectId` de outro colaborador → `403`.
- `cycleSubjectId` inexistente → `404`.

**Fluxo principal — salvamento de rascunho:**
- Primeira chamada sem rascunho existente → `204`; registro criado em `cf_self_evaluation_draft`.
- Segunda chamada (atualização) → `204`; `draft_text` atualizado, `updated_at` renovado.
- `draftText` vazio `""` → `204`; aceito sem erro.
- `draftText` nulo (ausente no body) → `400`.
- Ciclo em `CYCLE_NOT_COLLECTING` → `409`.
- Colaborador com `selfEvaluationStatus = SUBMITTED` tentando salvar rascunho → `409 ALREADY_SUBMITTED`.

**Fluxo principal — submissão:**
- `responseText` preenchido, ciclo em `COLLECTING`, `selfEvaluationStatus = PENDING` → `201`; `cf_self_evaluation_response` criado; `cycle_subject.self_evaluation_status = SUBMITTED`; rascunho marcado com `deleted_at`.
- Submissão sem rascunho existente (colaborador não usou o debounce) → `201`; submissão aceita normalmente.
- `responseText` vazio ou apenas espaços → `400`.
- Segunda submissão após `SUBMITTED` → `409 ALREADY_SUBMITTED`.
- Submissão com ciclo em `CLOSED` → `409 CYCLE_NOT_COLLECTING`.
- Race condition (duas submissões simultâneas) → uma retorna `201`, a outra retorna `409 ALREADY_SUBMITTED` via `DataIntegrityViolationException`.

**Casos de autorização:**
- Requisição sem token JWT → `401`.
- Token válido mas `cycleSubjectId` pertencente a outro colaborador → `403`.
- Token com perfil `CALIBRATOR` sem acumulação de `CIETER`/`PDM` → `403` (via `@PreAuthorize`).

**Edge cases de regras de negócio:**
- Colaborador acessa o GET após submissão → `evaluationState = ALREADY_SUBMITTED`; `draftText = null` (rascunho foi soft-deletado); `submittedText` e `submittedAt` preenchidos.
- `responseText` com exatamente 1 caractere → aceito.
- `collectionDeadline` nulo no banco → `200` com `collectionDeadline = null`; `evaluationState = OPEN` se o ciclo estiver em `COLLECTING`.

## Riscos técnicos e dependências

- **Coluna `self_evaluation_status` em `cycle_subject`:** o contexto de domínio menciona o campo como já existente na entidade JPA, mas não está claro se a coluna já existe no schema do banco (a feature 008 pode ou não ter criado a coluna). Verificar o último changeset Liquibase aplicado antes de incluir ou omitir a adição da coluna na migração desta feature.

- **`GlobalExceptionHandler` e `DataIntegrityViolationException`:** a feature 009 já identificou esse risco. Se o handler atual não mapear `DataIntegrityViolationException` → `409 ALREADY_SUBMITTED`, o agente de implementação deve adicionar o mapeamento. O mesmo handler deve cobrir tanto a constraint de `cf_evaluation_response` (feature 009) quanto a de `cf_self_evaluation_response` (esta feature) — a diferença é que ambas têm o mesmo `errorCode` (`ALREADY_SUBMITTED`), então um único mapeamento genérico é suficiente, desde que não exponha detalhes do banco no corpo da resposta.

- **Frequência do `PUT /draft` e virtual threads:** o debounce de 1s no frontend significa que cada colaborador ativo pode gerar até 60 requisições por minuto durante a edição. Com múltiplos colaboradores simultâneos, o pool de threads do servidor pode ser saturado se não estiver usando virtual threads (Project Loom, disponível por padrão no Java 21+, consolidado no Java 25 usado neste projeto). Verificar se o `application-dev.properties` tem virtual threads habilitado.

- **Rascunho não é invalidado automaticamente pelo prazo:** diferente da feature 009, não há prazo de 10 dias para a autoavaliação — ela pode ser submetida a qualquer momento durante `COLLECTING`. Mas se o ciclo fechar (`CLOSED` ou `CANCELLED`) com rascunho ainda ativo, o rascunho permanece no banco (sem `deleted_at`). O service de fechamento de ciclo (feature 013) deve considerar soft-deletar rascunhos órfãos ao encerrar o ciclo, para evitar acúmulo de dados desnecessários.

- **Dependência de `CycleSubjectRepository.findByIdAndSubjectUserId`:** esta query foi especificada na feature 008. Se a implementação da 008 não a incluiu com `JOIN FETCH cycle`, o acesso a `cycleSubject.getCycle().getCollectionDeadline()` dentro de `@Transactional(readOnly = true)` pode lançar `LazyInitializationException`. O agente de implementação deve garantir que a query carregue o ciclo pai.

- **Auditoria e feature 014 (visualizar resumo CF):** a `cf_self_evaluation_response` deve ser consultada pela feature 014 ao construir o resumo do ciclo. O campo `response_text` deve ser acessado apenas quando necessário — não em queries de listagem ou contagem — para não carregar textos longos desnecessariamente (risco de performance identificado na feature 009).

- **Nenhum endpoint de leitura da resposta para outros atores:** o PDM e o CIETER não têm endpoint nesta feature para ler a autoavaliação do colaborador. Essa funcionalidade pertence à feature 014 (visualizar resumo CF). Não expor a autoavaliação via este controller para outros perfis.
