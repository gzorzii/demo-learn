# Visualizar Resumo do Ciclo CF Encerrado — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature expõe dois endpoints GET de leitura que montam o resumo consolidado de um ciclo CF após seu encerramento. Nenhuma nova tabela é necessária — a feature agrega dados de tabelas já existentes criadas pelas features 009, 010 e 011.

A lógica central é a diferenciação de visão por ator: o colaborador recebe respostas de convidados anonimizadas (Regra 15), com supressão total quando o número de respondentes é inferior a 3; o PDM recebe visão irrestrita com nome e texto de cada convidado.

A implementação do ciclo não encerrado não deve retornar `404` — o ciclo existe, mas ainda não está fechado. O endpoint retorna `200` com `cycleStatus` preenchido e os campos de conteúdo nulos, deixando para o frontend a decisão de renderizar o estado informativo adequado.

**Camadas tocadas:** novo controller (`CfSummaryController`), novo service (`CfSummaryService`), e repositórios existentes: `CycleSubjectRepository`, `CycleEvaluatorRepository`, `CfSelfEvaluationResponseRepository`, `CfPdmEvaluationResponseRepository`, `CfEvaluationResponseRepository`.

**Domínios afetados:**

- `cycle_subject` — leitura de `status`, `subject_user_id`, `deleted_at`
- `cycle` — leitura de `cycle_type`, `status`
- `cycle_evaluator` — leitura para localizar o avaliador PDM do ciclo e os avaliadores convidados (tipo PEER, `is_mandatory = false`)
- `cf_self_evaluation_response` — leitura de `response_text`, `submitted_at` (feature 010; tabela real: `cf_self_evaluation_response`, entidade `CfSelfEvaluationResponse`)
- `cf_pdm_evaluation_response` — leitura de `resultado`, `prontidao`, `action`, `submitted_at` (feature 011; tabela real: `cf_pdm_evaluation_response`, entidade `CfPdmEvaluationResponse`)
- `cf_evaluation_response` — leitura de `response_text` dos avaliadores convidados (feature 009; tabela real: `cf_evaluation_response`, entidade `CfEvaluationResponse`)

**Observação sobre nomes de tabelas:** as migrações 006, 007 e 008 criaram as tabelas com os nomes exatos acima — confirmados pelos arquivos de entidade JPA no repositório. O `business.md` usa nomes descritivos como `cf_guest_evaluation_response`, mas a tabela real da feature 009 é `cf_evaluation_response` (entidade `CfEvaluationResponse`, repositório `CfEvaluationResponseRepository`).

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. Esta feature é estritamente somente leitura das tabelas já existentes:

- `cycle_subject` — `status`, `subject_user_id`, `deleted_at`, `closed_at`
- `cycle` — `cycle_type`, `status`
- `cycle_evaluator` — `evaluator_type`, `is_mandatory`, `status`, `deleted_at`, `responded_at`
- `cf_self_evaluation_response` — `cycle_subject_id`, `response_text`, `submitted_at`, `deleted_at`
- `cf_pdm_evaluation_response` — `cycle_evaluator_id`, `resultado`, `prontidao`, `action`, `submitted_at`, `deleted_at`
- `cf_evaluation_response` — `cycle_evaluator_id`, `response_text`, `submitted_at`, `deleted_at`

### Estratégia de migração

Nenhuma migração necessária. Rollback não se aplica.

### Índices utilizados (já existentes)

Os índices abaixo, definidos nas features anteriores, cobrem os filtros desta feature:

```sql
-- Localização do cycle_subject pelo ID (chave primária):
PRIMARY KEY ON cycle_subject (id)

-- Validação de posse do colaborador:
idx_subject_user ON cycle_subject (subject_user_id)

-- Busca de avaliadores do ciclo:
idx_evaluator_subject ON cycle_evaluator (cycle_subject_id)  -- definido em features 008/009

-- Busca da autoavaliação por sujeita:
idx_cf_self_response_subject ON cf_self_evaluation_response (cycle_subject_id)
  WHERE deleted_at IS NULL  -- definido em feature 010

-- Busca de resposta de convidado por avaliador:
idx_cf_response_evaluator ON cf_evaluation_response (cycle_evaluator_id)
  WHERE deleted_at IS NULL  -- definido em feature 009

-- Busca da avaliação PDM por avaliador:
idx_cf_pdm_response_evaluator ON cf_pdm_evaluation_response (cycle_evaluator_id)
  WHERE deleted_at IS NULL  -- definido em feature 011
```

## Contratos de API

### `GET /api/me/ciclos/cf/{cycleSubjectId}/resumo`

Retorna o resumo consolidado do ciclo CF para o colaborador autenticado (sujeita). Respostas de convidados são anonimizadas — apenas texto, sem nome — e suprimidas quando o total de respondentes for inferior a 3 (Regra 15).

O ciclo deve existir e pertencer ao colaborador autenticado. Se o ciclo existir mas não estiver com `status = CLOSED`, o endpoint retorna `200` com `cycleStatus` preenchido e os campos de conteúdo nulos — não é um erro, e não retorna `404`.

- **Authorization:** `@PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")`
- **Path parameter:** `cycleSubjectId` (UUID) — ID do `cycle_subject`
- **Request body:** nenhum

**Validações executadas no service, nesta ordem:**

> A ordem importa para não vazar existência de recursos alheios: existência e tipo antes da verificação de posse.

1. `cycle_subject` existe e `deleted_at IS NULL`. Se não → `404`
2. `cycle.cycle_type == CycleType.CF`. Se não → `404`
3. `cycle_subject.subject_user_id == userId do JWT`. Se não → `403`

Após as validações, se `cycle.status != CLOSED`: retornar `200` com `cycleStatus` preenchido e demais campos nulos.

Se `cycle.status == CLOSED`: montar o resumo completo com as regras de anonimização.

**Regra de anonimização (Regra 15):**

> A decisão de expor ou não as respostas é feita por contagem de respondentes — não pelo total de convidados adicionados. Conta apenas os registros em `cf_evaluation_response` com `deleted_at IS NULL` vinculados a avaliadores do `cycle_subject` com `is_mandatory = false`.

- Contar avaliadores convidados com `cf_evaluation_response` presente: `guestRespondentCount`
- Se `guestRespondentCount >= 3`: retornar `guestResponses` como `List<String>` com os textos (`response_text`) de cada resposta; `guestMinimumNotReached = false`
- Se `guestRespondentCount < 3`: retornar `guestResponses` como lista vazia; `guestMinimumNotReached = true`

- **Response `200`:**

```json
{
  "cycleSubjectId": "uuid",
  "cycleStatus": "CLOSED",
  "selfEvaluation": {
    "responseText": "string",
    "submittedAt": "ISO-8601"
  },
  "pdmEvaluation": {
    "resultado": "string",
    "prontidao": "string",
    "action": "string",
    "submittedAt": "ISO-8601"
  },
  "guestRespondentCount": 4,
  "guestResponses": ["texto 1", "texto 2", "texto 3", "texto 4"],
  "guestMinimumNotReached": false,
  "aiSummary": null
}
```

**Campos do response:**

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `cycleSubjectId` | `UUID` | não | ID do `cycle_subject` |
| `cycleStatus` | `string` | não | Status atual do ciclo (`"CLOSED"` ou outro valor se ainda não encerrado) |
| `selfEvaluation` | `objeto` | sim | Nulo se ciclo não CLOSED ou se autoavaliação não foi submetida |
| `selfEvaluation.responseText` | `string` | não | Texto da autoavaliação — `cf_self_evaluation_response.response_text` |
| `selfEvaluation.submittedAt` | `string (ISO-8601)` | não | Data de submissão da autoavaliação |
| `pdmEvaluation` | `objeto` | sim | Nulo se ciclo não CLOSED ou se PDM não respondeu |
| `pdmEvaluation.resultado` | `string` | não | Campo `resultado` de `cf_pdm_evaluation_response` |
| `pdmEvaluation.prontidao` | `string` | não | Campo `prontidao` de `cf_pdm_evaluation_response` |
| `pdmEvaluation.action` | `string` | não | Campo `action` de `cf_pdm_evaluation_response` |
| `pdmEvaluation.submittedAt` | `string (ISO-8601)` | não | Data de submissão da avaliação do PDM |
| `guestRespondentCount` | `integer` | sim | Contagem de convidados que responderam; nulo se ciclo não CLOSED |
| `guestResponses` | `List<String>` | sim | Lista de textos anônimos; vazia se `guestMinimumNotReached = true`; nula se ciclo não CLOSED |
| `guestMinimumNotReached` | `boolean` | sim | `true` quando `guestRespondentCount < 3`; nulo se ciclo não CLOSED |
| `aiSummary` | `string` | sim | Sempre `null` neste MVP (feature 035 não implementada) |

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Dados retornados com sucesso (inclusive quando ciclo não está CLOSED) |
| 401 | Token JWT ausente, expirado ou inválido |
| 403 | `cycle_subject.subject_user_id` não corresponde ao `userId` do JWT |
| 404 | `cycleSubjectId` não existe, `deleted_at IS NOT NULL`, ou ciclo não é do tipo CF |
| 500 | Erro inesperado |

**Edge cases:**

- Ciclo CLOSED mas sem autoavaliação submetida: `selfEvaluation = null` — o colaborador pode não ter submetido antes do encerramento.
- Ciclo CLOSED mas sem avaliação do PDM: `pdmEvaluation = null` — o PDM pode não ter respondido.
- Ciclo CLOSED com zero convidados: `guestRespondentCount = 0`, `guestResponses = []`, `guestMinimumNotReached = true`.
- Ciclo CLOSED com exatamente 3 respondentes: `guestMinimumNotReached = false`; textos exibidos.

---

### `GET /api/me/team/{colaboradorId}/cycles/{cycleSubjectId}/resumo`

Retorna o resumo consolidado do ciclo CF de um liderado para o PDM autenticado. O PDM recebe visão irrestrita: nome e texto de cada convidado, independentemente da contagem de respondentes.

A validação de acesso do PDM segue o mesmo padrão da feature 011: verifica que existe um `cycle_evaluator` com `evaluatorType = PDM` e `evaluatorUser.id = userId do JWT` para o `cycleSubjectId` informado.

- **Authorization:** `@PreAuthorize("hasAuthority('PDM')")`
- **Path parameters:**
  - `colaboradorId` (UUID) — `users.id` do liderado; usado para validação de consistência do path
  - `cycleSubjectId` (UUID) — ID do `cycle_subject` do liderado
- **Request body:** nenhum

**Validações executadas no service, nesta ordem:**

> Ordem de validação segue o padrão da feature 011 para consistência: existência antes de posse.

1. `cycle_subject` existe e `deleted_at IS NULL`. Se não → `404`
2. `cycle.cycle_type == CycleType.CF`. Se não → `404`
3. Existe `cycle_evaluator` com `cycle_subject_id = cycleSubjectId`, `evaluator_user_id = userId do JWT`, `evaluator_type = PDM` e `deleted_at IS NULL`. Se não → `403`
4. `cycle_subject.subject_user_id == colaboradorId do path`. Se não → `403` (path inconsistente)

Após as validações, se `cycle.status != CLOSED`: retornar `200` com `cycleStatus` preenchido e campos de conteúdo nulos.

Se `cycle.status == CLOSED`: montar o resumo completo com visão irrestrita do PDM.

- **Response `200`:**

```json
{
  "cycleSubjectId": "uuid",
  "cycleStatus": "CLOSED",
  "selfEvaluation": {
    "responseText": "string",
    "submittedAt": "ISO-8601"
  },
  "pdmEvaluation": {
    "resultado": "string",
    "prontidao": "string",
    "action": "string",
    "submittedAt": "ISO-8601"
  },
  "guestRespondentCount": 4,
  "guestEvaluations": [
    { "evaluatorName": "João Silva", "responseText": "texto completo" }
  ],
  "aiSummary": null
}
```

**Campos adicionais em relação ao endpoint do colaborador:**

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `guestEvaluations` | `List<objeto>` | sim | Lista com nome e texto de cada convidado que respondeu; nula se ciclo não CLOSED; lista vazia se nenhum convidado respondeu |
| `guestEvaluations[].evaluatorName` | `string` | não | `users.name` do avaliador convidado (`cycle_evaluator.evaluatorUser.name`) |
| `guestEvaluations[].responseText` | `string` | não | `cf_evaluation_response.response_text` |

> Este endpoint não possui os campos `guestResponses` nem `guestMinimumNotReached` — a Regra 15 (anonimização) não se aplica ao PDM. O PDM recebe sempre visão completa independente do número de respondentes.

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Dados retornados com sucesso (inclusive quando ciclo não está CLOSED) |
| 401 | Token JWT ausente, expirado ou inválido |
| 403 | PDM não é avaliador PDM deste `cycleSubject`; ou `colaboradorId` inconsistente com `subject_user_id` |
| 404 | `cycleSubjectId` não existe, `deleted_at IS NOT NULL`, ou ciclo não é do tipo CF |
| 500 | Erro inesperado |

**Edge cases:**

- Ciclo CLOSED sem nenhum convidado respondendo: `guestEvaluations = []`.
- Ciclo CLOSED com 1 convidado respondendo: `guestEvaluations` com 1 item — o PDM sempre vê, independente de contagem mínima.

---

## DTOs

```
// Sub-objetos compartilhados entre os dois endpoints:

SelfEvaluationSummaryDto {
  responseText: String            // cf_self_evaluation_response.response_text
  submittedAt: Instant            // cf_self_evaluation_response.submitted_at
}

PdmEvaluationSummaryDto {
  resultado: String               // cf_pdm_evaluation_response.resultado
  prontidao: String               // cf_pdm_evaluation_response.prontidao
  action: String                  // cf_pdm_evaluation_response.action
  submittedAt: Instant            // cf_pdm_evaluation_response.submitted_at
}

// Resposta do endpoint do colaborador (Regra 15: textos anônimos):
CfSummaryDto {
  cycleSubjectId: UUID
  cycleStatus: String
  selfEvaluation: SelfEvaluationSummaryDto?       // nullable — nulo se ciclo não CLOSED ou sem resposta
  pdmEvaluation: PdmEvaluationSummaryDto?         // nullable — nulo se ciclo não CLOSED ou sem resposta
  guestRespondentCount: Integer?                  // nullable — nulo se ciclo não CLOSED
  guestResponses: List<String>?                   // nullable — nulo se ciclo não CLOSED; vazio se abaixo do mínimo
  guestMinimumNotReached: Boolean?               // nullable — nulo se ciclo não CLOSED
  aiSummary: String?                              // sempre null no MVP
}

// Entrada da lista de convidados na visão do PDM:
GuestEvaluationDetailDto {
  evaluatorName: String           // users.name do avaliador convidado
  responseText: String            // cf_evaluation_response.response_text
}

// Resposta do endpoint do PDM (visão irrestrita):
PdmCfSummaryDto {
  cycleSubjectId: UUID
  cycleStatus: String
  selfEvaluation: SelfEvaluationSummaryDto?
  pdmEvaluation: PdmEvaluationSummaryDto?
  guestRespondentCount: Integer?
  guestEvaluations: List<GuestEvaluationDetailDto>?   // nullable — nulo se ciclo não CLOSED
  aiSummary: String?                                  // sempre null no MVP
}
```

## Queries de repositório necessárias

### `CycleSubjectRepository` — reutilizar queries existentes

```
-- Já existente; carrega cycle e subjectUser:
findByIdWithCycleAndSubjectUser(UUID id) → Optional<CycleSubject>
  SELECT cs FROM CycleSubject cs
  JOIN FETCH cs.cycle c
  JOIN FETCH cs.subjectUser su
  WHERE cs.id = :id AND cs.deletedAt IS NULL

-- Já existente; validação de posse do colaborador:
findByIdAndSubjectUserIdAndDeletedAtIsNull(UUID id, UUID subjectUserId)
  → Optional<CycleSubject>
```

### `CycleEvaluatorRepository` — reutilizar query existente

```
-- Já existente como findPdmEvaluatorByCycleSubjectIdAndEvaluatorUserId:
-- Busca o CycleEvaluator PDM para validação de acesso do PDM:
findPdmEvaluatorByCycleSubjectIdAndEvaluatorUserId(
  UUID cycleSubjectId,
  UUID evaluatorUserId,
  EvaluatorType evaluatorType  // = EvaluatorType.PDM
) → Optional<CycleEvaluator>

-- Já existente como findAllWithUserByCycleSubjectId:
-- Busca todos os avaliadores com JOIN FETCH do usuário (para montar guestEvaluations):
findAllWithUserByCycleSubjectId(UUID cycleSubjectId) → List<CycleEvaluator>
```

### `CfSelfEvaluationResponseRepository` — reutilizar query existente

```
-- Já existente:
findByCycleSubjectIdAndDeletedAtIsNull(UUID cycleSubjectId)
  → Optional<CfSelfEvaluationResponse>
```

### `CfPdmEvaluationResponseRepository` — reutilizar query existente

Para localizar a avaliação do PDM, o service precisa do `cycle_evaluator_id` do avaliador PDM (obtido após chamar `findPdmEvaluatorByCycleSubjectIdAndEvaluatorUserId` ou `findAllWithUserByCycleSubjectId`).

```
-- Já existente:
findByCycleEvaluatorIdAndDeletedAtIsNull(UUID cycleEvaluatorId)
  → Optional<CfPdmEvaluationResponse>
```

> No endpoint do colaborador, o `cycleEvaluatorId` do PDM é obtido filtrando a lista retornada por `findAllWithUserByCycleSubjectId` por `evaluatorType = PDM`. Isso evita uma query adicional e é eficiente dado o volume máximo de ~12 avaliadores por `cycle_subject`.

### `CfEvaluationResponseRepository` — reutilizar query existente

```
-- Já existente:
findByCycleEvaluatorIdAndDeletedAtIsNull(UUID cycleEvaluatorId)
  → Optional<CfEvaluationResponse>
```

> O service itera sobre os avaliadores convidados (`is_mandatory = false`) e, para cada um, busca a resposta correspondente. Dado o volume máximo de ~10 convidados, essa abordagem é preferível a uma query N+1 explícita — a alternativa seria uma query com `IN (cycleEvaluatorIds)`, que também é aceitável se o implementador preferir.

**Query nova opcional para evitar N+1 em listas maiores:**

```
-- Opcional — busca todas as respostas de convidados de um cycle_subject em uma única query:
@Query("""
  SELECT cer FROM CfEvaluationResponse cer
  JOIN FETCH cer.cycleEvaluator ce
  JOIN FETCH ce.evaluatorUser u
  WHERE ce.cycleSubject.id = :cycleSubjectId
  AND ce.isMandatory = false
  AND ce.deletedAt IS NULL
  AND cer.deletedAt IS NULL
""")
findAllGuestResponsesByCycleSubjectId(@Param("cycleSubjectId") UUID cycleSubjectId)
  → List<CfEvaluationResponse>
```

> Esta query única é recomendada: elimina o N+1 ao carregar nome do avaliador e texto da resposta em um único round-trip. Se implementada, pode substituir a iteração manual sobre `findAllWithUserByCycleSubjectId` + `findByCycleEvaluatorIdAndDeletedAtIsNull`.

## Requisitos de qualidade

- [ ] I/O-bound identificado? Cada endpoint executa 3–5 queries de banco sequenciais. Virtual threads não são necessários para o volume esperado no MVP, mas são recomendados se o endpoint for chamado frequentemente logo após o encerramento de ciclos (pico de acesso simultâneo).
- [ ] GraalVM AOT: todos os DTOs devem ser implementados como Java records. Nenhuma reflection não declarada.
- [ ] Dados sensíveis: `response_text`, `resultado`, `prontidao` e `action` são textos de avaliação de desempenho — dados sensíveis. Garantir que nenhum log de aplicação persista o conteúdo desses campos; logar apenas IDs e status. O endpoint do colaborador nunca retorna nome de avaliadores convidados — apenas textos anônimos ou nada (Regra 15).
- [ ] Autorização por perfil coberta: endpoint do colaborador usa `hasAnyAuthority('CIETER', 'PDM')` + verificação de `subject_user_id = userId do JWT`. Endpoint do PDM usa `hasAuthority('PDM')` + verificação de `cycle_evaluator.evaluatorType = PDM` com `evaluatorUser.id = userId do JWT`.

## Estratégia de testes

**Fluxo principal — endpoint do colaborador (happy path):**
- Ciclo CLOSED, autoavaliação submetida, PDM respondeu, 4 convidados responderam → `200` com todos os campos preenchidos; `guestMinimumNotReached = false`; `guestResponses` com 4 textos; sem nomes de avaliadores.
- Ciclo CLOSED, 2 convidados responderam → `200` com `guestMinimumNotReached = true`; `guestResponses = []`; `guestRespondentCount = 2`.
- Ciclo CLOSED, zero convidados responderam → `200` com `guestMinimumNotReached = true`; `guestRespondentCount = 0`; `guestResponses = []`.
- Ciclo CLOSED sem autoavaliação → `200` com `selfEvaluation = null`.
- Ciclo CLOSED sem avaliação do PDM → `200` com `pdmEvaluation = null`.
- Ciclo ainda em `COLLECTING` → `200` com `cycleStatus = "COLLECTING"` e todos os campos de conteúdo nulos.
- `aiSummary` deve ser sempre `null` neste MVP.

**Fluxo principal — endpoint do PDM (happy path):**
- Ciclo CLOSED, 2 convidados responderam → `200` com `guestEvaluations` contendo 2 itens com `evaluatorName` e `responseText`; sem `guestMinimumNotReached` (campo não existe neste DTO).
- Ciclo CLOSED sem nenhum convidado → `200` com `guestEvaluations = []`.
- Ciclo não CLOSED → `200` com `cycleStatus` preenchido e campos de conteúdo nulos.

**Casos de erro esperados:**
- `cycleSubjectId` inexistente → `404`.
- `cycleSubjectId` com `deleted_at IS NOT NULL` → `404`.
- `cycleSubjectId` de ciclo do tipo PR → `404`.
- Colaborador tenta acessar `cycleSubjectId` de outro colaborador → `403`.
- PDM sem vínculo como avaliador PDM no ciclo → `403`.
- `colaboradorId` no path do endpoint PDM inconsistente com `subject_user_id` → `403`.
- Requisição sem token JWT → `401`.

**Casos de autorização:**
- Token com perfil `CIETER` acessa endpoint do colaborador → aceito (perfil permitido).
- Token com perfil `CIETER` sem `PDM` acessa endpoint do PDM → `403` via `@PreAuthorize`.
- Colaborador A tenta acessar resumo do colaborador B → `403`.

**Edge cases de regras de negócio:**
- Exatamente 3 convidados respondentes no endpoint do colaborador → `guestMinimumNotReached = false`; textos exibidos.
- Convidado com `deleted_at IS NOT NULL` em `cf_evaluation_response` → não deve ser contado no `guestRespondentCount`.
- `cycle_evaluator` com `deleted_at IS NOT NULL` → não deve ser incluído na listagem de convidados.

## Riscos técnicos e dependências

- **Tabela real da feature 009:** o `business.md` referencia `cf_guest_evaluation_response`, mas a entidade JPA real é `CfEvaluationResponse` (tabela `cf_evaluation_response`). O repositório já existente `CfEvaluationResponseRepository` cobre essa tabela — sem necessidade de repositório adicional. O agente deve usar `CfEvaluationResponseRepository`, não criar um novo para convidados.

- **Identificação de convidados:** o critério para convidados é `is_mandatory = false` no `cycle_evaluator`. Avaliadores com `evaluator_type = PEER` e `is_mandatory = false` são os convidados. Não usar `evaluator_type = PEER` como critério exclusivo — usar `is_mandatory = false` como critério principal (padrão já estabelecido em `backend.md` da feature 012).

- **Sumário de IA:** a feature 035 não está implementada. O campo `aiSummary` deve sempre retornar `null`. Não criar tabela, enum ou campo de banco para isso nesta feature. O agente não deve implementar nenhuma lógica de busca de sumário — apenas incluir o campo no DTO com valor fixo `null`.

- **Ausência de migração:** esta feature não altera nenhum schema. Se uma migração for incluída por engano, pode causar conflito com o Liquibase em ambientes com o schema já aplicado. Não criar nenhum arquivo em `db/changelog/changes/`.

- **JOIN FETCH para evitar N+1:** o service precisa de `cycleSubject.subjectUser.name` (para validar `colaboradorId` no endpoint do PDM) e `cycleEvaluator.evaluatorUser.name` (para montar `GuestEvaluationDetailDto`). As queries existentes `findByIdWithCycleAndSubjectUser` e `findAllWithUserByCycleSubjectId` já incluem os JOINs necessários — reutilizá-las sem modificação.

- **Contagem de respondentes vs. total de convidados:** `guestRespondentCount` conta apenas convidados que efetivamente têm registro em `cf_evaluation_response` com `deleted_at IS NULL` — não o total de `cycle_evaluator` com `is_mandatory = false`. Essa distinção importa: um convidado pode ter sido adicionado mas nunca respondido.

- **Dependência de features 009, 010, 011:** as tabelas lidas por esta feature foram criadas por migrações 006, 007 e 008. Se essas migrações não estiverem aplicadas no ambiente, as queries falharão. Verificar o estado do Liquibase antes de implementar.