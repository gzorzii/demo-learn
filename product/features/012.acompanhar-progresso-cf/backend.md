# Acompanhar Progresso de Respostas durante o CF — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature expõe dois endpoints de leitura que retornam o progresso de coleta de respostas de um ciclo CF ativo: um para o colaborador (sujeita) e outro para o PDM. Nenhuma escrita é realizada e nenhuma nova tabela é necessária — a feature agrega dados de `cycle_subject`, `cycle_evaluator` e `cf_self_evaluation_response` (feature 010) para produzir o painel de progresso.

A lógica central é a contagem de avaliadores por tipo e status, combinada com o cálculo de dias restantes a partir do `cycle.collection_deadline`. A distinção entre obrigatórios (self e PDM) e opcionais (convidados) é feita pelo campo `cycle_evaluator.evaluator_type` e `is_mandatory`. O anonimato de convidados (Regra 15) é aplicado **apenas para o colaborador**: o endpoint do colaborador retorna apenas contagens agregadas de convidados. O PDM recebe a lista com nome e status de cada convidado individualmente.

Camadas tocadas: novo controller (`CfProgressController`), novo service (`CfProgressService`), e repositórios existentes (`CycleSubjectRepository`, `CycleEvaluatorRepository`). A verificação do status da autoavaliação lê `cycle_subject.self_evaluation_status` (coluna adicionada pela feature 010).

**Domínios afetados:**
- `cycle_subject` — leitura de status, `self_evaluation_status`, `collection_deadline`, `subject_user_id`
- `cycle_evaluator` — contagem por `evaluator_type` e `status`, filtrando `deleted_at IS NULL`
- `cycle` — leitura de `collection_deadline` e `status`
- `users` — nenhuma leitura adicional além do userId do JWT

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma. Esta feature é estritamente somente leitura das tabelas já existentes:

- `cycle_subject` — fornece `status`, `self_evaluation_status`, `subject_user_id`, `cycle_id`, `deleted_at`
- `cycle_evaluator` — fornece `evaluator_type`, `evaluator_user_id`, `status`, `is_mandatory`, `deleted_at`; registros com `deleted_at IS NOT NULL` representam avaliadores removidos e não devem entrar na contagem
- `cycle` — fornece `collection_deadline`, `status`

> O campo `cycle_subject.self_evaluation_status` foi adicionado pela feature 010. O status da avaliação do PDM é derivado da contagem de `cycle_evaluator` com `evaluator_type = 'PDM'` e `status = 'RESPONDED'` — não requer coluna adicional.

### Estratégia de migração

Nenhuma migração necessária. Rollback não se aplica.

### Índices utilizados (já existentes)

Os índices abaixo, definidos em `001.modelo-de-dados` e nas features anteriores, cobrem os filtros desta feature sem criar redundância:

```sql
-- Localização do cycle_subject pelo ID + validação de posse:
idx_subject_user   ON cycle_subject (subject_user_id)

-- Listagem de avaliadores por ciclo:
idx_evaluator_subject  ON cycle_evaluator (cycle_subject_id)
idx_evaluator_status   ON cycle_evaluator (status)

-- Resolução do avaliador PDM por tipo:
-- Coberto pelo índice composto idx_evaluator_subject + filtro aplicado em memória
-- (volume máximo: ~12 avaliadores por cycle_subject — custo de filtro em memória é negligenciável)
```

## Contratos de API

### `GET /api/me/ciclos/cf/{cycleSubjectId}/progresso`

Retorna o painel de progresso de coleta do ciclo CF para o colaborador autenticado (sujeita). O `cycleSubjectId` é o ID do registro `cycle_subject` — mesmo identificador usado nas features 010 e 011.

A validação de posse cruza `cycle_subject.subject_user_id` com o `userId` extraído do JWT. Isso garante que um colaborador não possa acessar o progresso de outro mesmo conhecendo o UUID.

- **Authorization:** `@PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")`

- **Path parameter:** `cycleSubjectId` (UUID) — ID do `cycle_subject`

- **Request body:** nenhum

**Validações executadas no service, nesta ordem:**
1. `cycleSubjectId` existe e `deleted_at IS NULL`. Se não → `404`.
2. O ciclo pai é do tipo `CF`. Se não → `404`.
3. `cycle_subject.subject_user_id` corresponde ao `userId` do JWT. Se não → `403`.

Após as validações, o endpoint retorna `200` com os dados de progresso independentemente do status do ciclo — o campo `cycleStatus` permite ao frontend renderizar estados diferentes (ex.: coleta encerrada).

- **Response `200`:**

```json
{
  "cycleSubjectId": "uuid",
  "cycleStatus": "COLLECTING",
  "selfEvaluationStatus": "PENDING",
  "pdmEvaluationStatus": "PENDING",
  "guestTotal": 5,
  "guestResponded": 3,
  "collectionDeadline": "2025-08-10T23:59:59Z",
  "daysRemaining": 7
}
```

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `cycleSubjectId` | `UUID` | não | ID do `cycle_subject` |
| `cycleStatus` | `string` | não | Valor de `cycle_subject.status` (ex: `"COLLECTING"`, `"CLOSED"`) |
| `selfEvaluationStatus` | `"PENDING"` ou `"SUBMITTED"` | não | Lido diretamente de `cycle_subject.self_evaluation_status` |
| `pdmEvaluationStatus` | `"PENDING"` ou `"RESPONDED"` | não | Derivado: `RESPONDED` se existir `cycle_evaluator` com `evaluator_type = 'PDM'` e `status = 'RESPONDED'`; caso contrário `PENDING` |
| `guestTotal` | `integer` | não | Quantidade de `cycle_evaluator` com `evaluator_type = 'GUEST'` ou `is_mandatory = false` e `deleted_at IS NULL` |
| `guestResponded` | `integer` | não | Quantidade dos convidados acima com `status = 'RESPONDED'` |
| `collectionDeadline` | `string (ISO-8601)` | sim | `cycle.collection_deadline`; nulo se não definido |
| `daysRemaining` | `integer` | sim | `CEIL((collectionDeadline - now()) / 86400)`; `0` se deadline já passou; `null` se `collectionDeadline` for nulo |

> **Regra de contagem de convidados:** convidados são `cycle_evaluator` com `is_mandatory = false` e `deleted_at IS NULL`. No modelo atual, avaliadores com `evaluator_type = 'PEER'` são os convidados. Avaliadores com `evaluator_type = 'PDM'` são contabilizados separadamente no campo `pdmEvaluationStatus`. O avaliador SELF não entra na contagem de convidados — seu status é refletido em `selfEvaluationStatus`.

> **Regra 15 (anonimato):** esta feature nunca retorna nomes, IDs ou qualquer dado identificador de avaliadores convidados — apenas as contagens `guestTotal` e `guestResponded`. Isso é suficiente para o painel de progresso e garante o anonimato dos convidados para o colaborador.

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Progresso retornado com sucesso |
| 401 | Token JWT ausente, expirado ou inválido |
| 403 | `cycleSubjectId` não pertence ao colaborador autenticado |
| 404 | `cycleSubjectId` não existe, está deletado, ou o ciclo não é do tipo CF |
| 500 | Erro inesperado |

**Edge cases:**
- Ciclo encerrado (`status = CLOSED`): retorna `200` com `cycleStatus = "CLOSED"` — o frontend renderiza mensagem informativa (não é um erro).
- Nenhum avaliador convidado: `guestTotal = 0`, `guestResponded = 0`.
- `collection_deadline` nulo: `daysRemaining = null`; `collectionDeadline = null`.
- Deadline já vencido e ciclo ainda `COLLECTING` (scheduler ainda não executou): `daysRemaining = 0`; o frontend exibe alerta sem bloquear a tela.

---

### `GET /api/me/team/{colaboradorId}/cycles/{cycleSubjectId}/progresso`

Retorna o painel de progresso de coleta do ciclo CF de um liderado, acessado pelo PDM autenticado.

A validação de acesso verifica que o PDM autenticado é avaliador do tipo `PDM` nesse `cycle_subject` — não usa a relação hierárquica `users.pdm_id`, mas o vínculo direto no ciclo. Essa abordagem é consistente com as features 011 e garante que o PDM acesse apenas ciclos nos quais foi explicitamente designado como avaliador.

Para o MVP, o PDM recebe a mesma visão agregada que o colaborador: sem identificação individual de convidados. A nota no `business.md` ("a confirmar: visibilidade de nomes para o PDM") fica registrada como risco técnico para iteração futura.

- **Authorization:** `@PreAuthorize("hasAuthority('PDM')")`

- **Path parameters:**
  - `colaboradorId` (UUID) — `users.id` do liderado; usado para validação de consistência do path
  - `cycleSubjectId` (UUID) — ID do `cycle_subject` do liderado

- **Request body:** nenhum

**Validações executadas no service, nesta ordem:**
1. `cycleSubjectId` existe e `deleted_at IS NULL`. Se não → `404`.
2. O ciclo pai é do tipo `CF`. Se não → `404`.
3. Existe `cycle_evaluator` com `cycle_subject_id = cycleSubjectId`, `evaluator_user_id = pdmUserId` (do JWT), `evaluator_type = 'PDM'` e `deleted_at IS NULL`. Se não existir → `403` (o PDM autenticado não é avaliador PDM deste ciclo).
4. O `cycle_subject.subject_user_id` corresponde ao `colaboradorId` do path. Se não corresponder → `403` (path inconsistente).

- **Response `200`:** estrutura estendida `PdmCfProgressDto` — inclui todos os campos de `CfProgressDto` mais a lista `guestEvaluators` com nome e status de cada convidado (ver seção DTOs).

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Progresso retornado com sucesso |
| 401 | Token JWT ausente, expirado ou inválido |
| 403 | PDM não é avaliador PDM deste `cycleSubject`; ou `colaboradorId` inconsistente com `subject_user_id` |
| 404 | `cycleSubjectId` não existe, está deletado, ou o ciclo não é do tipo CF |
| 500 | Erro inesperado |

**Edge cases:** idênticos ao endpoint do colaborador.

---

## DTOs

```
// Resposta do endpoint do colaborador (Regra 15: apenas contagens de convidados):
CfProgressDto {
  cycleSubjectId: UUID
  cycleStatus: String                   // valor de cycle_subject.status
  selfEvaluationStatus: String          // "PENDING" | "SUBMITTED"
  pdmEvaluationStatus: String           // "PENDING" | "RESPONDED"
  guestTotal: int
  guestResponded: int
  collectionDeadline: Instant?          // nullable
  daysRemaining: Integer?               // nullable; 0 se vencido
}

// Status individual de um convidado (usado apenas na visão do PDM):
GuestEvaluatorStatusDto {
  name: String                          // users.name do avaliador convidado
  responded: boolean                    // true se cycle_evaluator.status = 'RESPONDED'
}

// Resposta do endpoint do PDM (estende CfProgressDto com lista de convidados nomeados):
PdmCfProgressDto {
  cycleSubjectId: UUID
  cycleStatus: String
  selfEvaluationStatus: String
  pdmEvaluationStatus: String
  guestTotal: int
  guestResponded: int
  collectionDeadline: Instant?
  daysRemaining: Integer?
  guestEvaluators: List<GuestEvaluatorStatusDto>   // lista com nome + status de cada convidado
}
```

> `PdmCfProgressDto` é um record separado de `CfProgressDto` — não herdam um do outro, pois Java records não suportam herança. Os campos comuns são repetidos. O serviço monta cada DTO de forma independente.

> O campo `guestEvaluators` é populado com `JOIN FETCH ce.evaluatorUser` para evitar N+1. O JOIN deve incluir apenas avaliadores com `deleted_at IS NULL`.

## Queries de repositório necessárias

### `CycleSubjectRepository` — reutilizar e adicionar

```
-- Reutilizar da feature 010 (com JOIN FETCH cycle para carregar collectionDeadline):
findByIdAndSubjectUserIdAndDeletedAtIsNull(UUID cycleSubjectId, UUID subjectUserId)
  → Optional<CycleSubject>
  (deve incluir JOIN FETCH cycle)

-- Nova query para o endpoint do PDM — busca sem validação de posse pelo userId da sujeita:
findByIdAndDeletedAtIsNull(UUID cycleSubjectId) → Optional<CycleSubject>
  (deve incluir JOIN FETCH cycle e JOIN FETCH subjectUser para validar colaboradorId do path)
```

### `CycleEvaluatorRepository` — reutilizar e adicionar

```
-- Reutilizar da feature 011 (para validar vínculo PDM):
findByCycleSubjectIdAndEvaluatorUserIdAndEvaluatorTypeAndDeletedAtIsNull(
  UUID cycleSubjectId, UUID evaluatorUserId, EvaluatorType evaluatorType
) → Optional<CycleEvaluator>

-- Nova query: busca todos os avaliadores do ciclo com JOIN FETCH do usuário.
-- Usada pelos dois endpoints — o serviço agrega em memória (máx. ~12 avaliadores):
@Query("""
  SELECT ce FROM CycleEvaluator ce
  JOIN FETCH ce.evaluatorUser u
  WHERE ce.cycleSubject.id = :cycleSubjectId
  AND ce.deletedAt IS NULL
""")
findAllWithUserByCycleSubjectId(@Param("cycleSubjectId") UUID cycleSubjectId)
  → List<CycleEvaluator>
```

> Uma única query busca todos os avaliadores com seus usuários. O serviço filtra em memória por `evaluatorType` para separar PDM, SELF e convidados. Volume máximo de ~12 avaliadores por `cycle_subject` torna a agregação em memória simples e sem penalidade de performance. O `JOIN FETCH ce.evaluatorUser` evita N+1 quando se acessa `ce.getEvaluatorUser().getName()` na construção de `GuestEvaluatorStatusDto`.

## Requisitos de qualidade

- [ ] I/O-bound identificado? Cada endpoint executa 2–3 queries de banco (busca do `cycle_subject` com `cycle`, verificação de vínculo PDM, listagem de avaliadores). Virtual threads não são necessários para este padrão de acesso no MVP.
- [ ] GraalVM AOT: `CfProgressDto` implementado como Java record. Nenhuma reflection não declarada.
- [ ] Dados sensíveis: o endpoint nunca retorna nomes ou IDs de avaliadores convidados — apenas contagens. O `pdmEvaluationStatus` indica se o PDM respondeu ou não, mas não expõe o conteúdo da avaliação (coberto pela feature 014).
- [ ] Autorização por perfil coberta: endpoint do colaborador usa `hasAnyAuthority('CIETER', 'PDM')` + verificação de `subject_user_id = userId do JWT`; endpoint do PDM usa `hasAuthority('PDM')` + verificação de `cycle_evaluator.evaluator_type = PDM` com `evaluator_user_id = userId do JWT`.

## Estratégia de testes

**Fluxo principal (happy path):**
- Colaborador com ciclo CF em `COLLECTING`, autoavaliação `PENDING`, PDM `PENDING`, 5 convidados dos quais 3 responderam, 7 dias restantes → `200` com todos os campos preenchidos corretamente.
- Colaborador com autoavaliação `SUBMITTED` e PDM `RESPONDED` → `selfEvaluationStatus = "SUBMITTED"`, `pdmEvaluationStatus = "RESPONDED"`.
- PDM acessando progresso do seu liderado → mesma resposta que o colaborador obteria.
- Ciclo encerrado (`status = CLOSED`) → `200` com `cycleStatus = "CLOSED"`.

**Casos de erro esperados:**
- `cycleSubjectId` inexistente → `404`.
- `cycleSubjectId` de um ciclo do tipo PR → `404`.
- Colaborador acessa `cycleSubjectId` de outro colaborador → `403`.
- PDM acessa ciclo de um liderado do qual não é avaliador PDM → `403`.
- `colaboradorId` no path do endpoint PDM não corresponde ao `subject_user_id` → `403`.
- Requisição sem token JWT → `401`.

**Casos de autorização:**
- Perfil `CIETER` sem `PDM` acessa endpoint do PDM (`/api/me/team/...`) → `403` via `@PreAuthorize`.
- `userId` extraído do JWT é sempre o ator — nunca controlado por parâmetro de request.

**Edge cases de regras de negócio:**
- Ciclo sem `collection_deadline` → `daysRemaining = null`, `collectionDeadline = null`.
- `collection_deadline` no passado e ciclo ainda `COLLECTING` → `daysRemaining = 0`.
- Nenhum avaliador convidado (`guestTotal = 0`) → `guestResponded = 0`; sem erro.
- Avaliador PDM com `deleted_at` preenchido (removido do ciclo) → não contar; `pdmEvaluationStatus = "PENDING"`.

## Riscos técnicos e dependências

- **`self_evaluation_status` em `cycle_subject`:** a coluna foi adicionada pela feature 010. Se a migração da 010 ainda não tiver sido aplicada em ambiente de desenvolvimento, as queries desta feature falharão. Verificar o estado do Liquibase antes de implementar.

- **Avaliadores com `evaluator_type = 'PDM'` vs. `is_mandatory = true`:** o modelo de dados define `is_mandatory = true` para SELF e PDM, e `evaluator_type` para distinguir o papel. A query de status do PDM deve filtrar por `evaluator_type = 'PDM'` — não apenas por `is_mandatory = true` (que inclui o SELF). Usar o campo errado retornaria um `pdmEvaluationStatus` incorreto.

- **`evaluator_type` de convidados — PEER vs. GUEST:** o `data-model.md` define o enum como `('SELF','PDM','PEER')`. O `business.md` usa o termo "convidados" para avaliadores opcionais. Verificar se o valor no banco é `'PEER'` ou se há outro valor. A query deve usar `is_mandatory = false` como critério principal (mais robusto a variações de nomenclatura de tipo) em vez de depender exclusivamente de `evaluator_type`.

- **Nomes de convidados para o PDM:** confirmado pelo PO — o PDM recebe nome e status de cada convidado via `guestEvaluators: List<GuestEvaluatorStatusDto>` no `PdmCfProgressDto`. A query usa `JOIN FETCH ce.evaluatorUser` para evitar N+1.

- **Dependência da feature 011 para a query de vínculo PDM:** a query `findByCycleSubjectIdAndEvaluatorUserIdAndEvaluatorTypeAndDeletedAtIsNull` foi especificada na feature 011. Se a 011 não tiver sido implementada, o repositório não possui essa query — o agente deve verificar o estado atual do `CycleEvaluatorRepository` antes de reutilizar ou criar a query.

- **Nenhum risco de schema identificado:** esta feature não altera tabelas, não cria tipos novos e não depende de migrações próprias. O risco de rollback é nulo.
