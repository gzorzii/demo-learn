# Iniciar CF Manual pelo PDM — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature expõe dois endpoints HTTP novos dentro do domínio `cycle`, operando sobre tabelas já existentes. Não há alteração de schema.

O primeiro endpoint (`GET /api/meu-time`) retorna a lista de liderados diretos do PDM autenticado com o status de ciclo de cada um — necessário para que o frontend decida se o botão "Iniciar CF" deve estar habilitado ou exibir mensagem de impedimento sem round-trip adicional.

O segundo endpoint (`POST /api/meu-time/{subjectUserId}/ciclos/cf`) efetiva a criação de um ciclo CF manual. Todo o fluxo de validação e persistência é atômico em uma única transação.

As camadas tocadas são: controller (novo `MeuTimeController`), service (novo `MeuTimeService`), e repositórios existentes (`UserRepository`, `CycleSubjectRepository`, `CycleEvaluatorRepository`) com novas queries JPQL, além de um novo `CycleBlackoutRepository` (já previsto em `004.iniciar-cf-automatico`).

**Domínios afetados:**
- `users` — leitura para listar liderados e verificar vínculo PDM → liderado
- `cycle`, `cycle_subject`, `cycle_evaluator` — leitura para status e escrita na criação do ciclo
- `cycle_blackout`, `pr_cycle_group` — leitura para verificação de blackout

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma nova tabela. Todas as tabelas envolvidas já existem com schema completo definido em `001.modelo-de-dados`:

- `users` — leitura: filtro por `pdm_id`, `active`, `deleted_at`
- `cycle` — escrita: criação com `cycle_type = CF`, `trigger_type = MANUAL_PDM`, `status = COLLECTING`
- `cycle_subject` — escrita: criação vinculada ao `cycle` recém-criado
- `cycle_evaluator` — escrita: criação dos avaliadores SELF e PDM
- `cycle_blackout` — leitura: verificação de período ativo
- `pr_cycle_group` — leitura: join para resolver vínculo `cycle_blackout → collaborador`

### Índices relevantes

Os índices abaixo já foram definidos em `001.modelo-de-dados` ou em `004.iniciar-cf-automatico`. Confirmar existência antes de criar migração duplicada:

```sql
-- Já definidos em 001.modelo-de-dados:
idx_users_pdm_id         ON users (pdm_id)
idx_subject_user         ON cycle_subject (subject_user_id)
idx_subject_status       ON cycle_subject (status)
idx_subject_cycle        ON cycle_subject (cycle_id)
idx_evaluator_subject    ON cycle_evaluator (cycle_subject_id)

-- Definidos em 004.iniciar-cf-automatico (confirmar existência):
idx_users_admission_date ON users (admission_date) WHERE active = true AND deleted_at IS NULL
idx_subject_collection_start ON cycle_subject (collection_start_at) WHERE deleted_at IS NULL AND closed_at IS NULL
```

Nenhum índice adicional é necessário exclusivamente para esta feature — o filtro principal de liderados usa `users.pdm_id`, já indexado.

### Estratégia de migração

Nenhuma migração necessária. Rollback não se aplica.

## Contratos de API

### `GET /api/meu-time`

Retorna a lista de liderados diretos do PDM autenticado, cada um acompanhado do status de ciclo vigente. O `pdmId` é extraído do JWT — sem parâmetro de path.

Esse endpoint é o ponto de entrada da tela `/meu-time`. Ele precisa retornar o status de elegibilidade de cada liderado para que o frontend possa renderizar o botão "Iniciar CF" como habilitado ou desabilitado sem chamada adicional.

- **Authorization:** `PDM`
- **Request body:** nenhum
- **Response `200`:**

```json
{
  "teamMembers": [
    {
      "userId": "uuid",
      "name": "string",
      "email": "string",
      "activeCycle": {
        "cycleType": "CF",
        "cycleStatus": "COLLECTING"
      } | null,
      "eligibility": {
        "canStartCf": true,
        "impedimentCode": null
      }
    }
  ]
}
```

Campos do objeto dentro de `teamMembers`:

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `userId` | `UUID` | não | ID do liderado (`users.id`) |
| `name` | `string` | não | Nome completo do liderado |
| `email` | `string` | não | E-mail do liderado |
| `activeCycle` | `object` | sim | Ciclo ativo do liderado; `null` se não houver nenhum |
| `activeCycle.cycleType` | `"CF"` ou `"PR"` | não | Tipo do ciclo ativo |
| `activeCycle.cycleStatus` | `string` | não | Valor de `cycle_subject.status` do ciclo ativo |
| `eligibility.canStartCf` | `boolean` | não | `true` se o PDM pode iniciar CF para este liderado agora |
| `eligibility.impedimentCode` | `string` | sim | Código de impedimento quando `canStartCf = false`; ver valores possíveis abaixo |

**Valores possíveis de `impedimentCode`:**

| Valor | Condição que o origina |
|-------|------------------------|
| `CF_ALREADY_ACTIVE` | Existe `cycle_subject` ativo com `cycle.cycle_type = CF` |
| `PR_ALREADY_ACTIVE` | Existe `cycle_subject` ativo com `cycle.cycle_type = PR` |
| `BLACKOUT_ACTIVE` | `now()` cai dentro de um período `cycle_blackout` ativo vinculado ao liderado |

A lógica de elegibilidade é avaliada na mesma ordem em que as validações do endpoint `POST` são executadas: CF ativo → PR ativo → blackout. O primeiro impedimento encontrado é o retornado.

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Lista retornada com sucesso; pode ser `teamMembers: []` se o PDM não tiver liderados |
| 401 | Token ausente, expirado ou inválido |
| 403 | Token válido mas perfil sem permissão `PDM` |
| 500 | Erro inesperado na query |

**Edge cases:**
- PDM sem liderados diretos: retorna `{ "teamMembers": [] }` com status `200`.
- Liderado com soft delete (`users.deleted_at IS NOT NULL`): não deve aparecer na lista.
- Liderado com `active = false`: não deve aparecer na lista.

---

### `POST /api/meu-time/{subjectUserId}/ciclos/cf`

Cria um ciclo CF manual para o liderado identificado por `subjectUserId`. O `pdmId` é extraído do JWT.

O corpo da requisição é vazio — todos os parâmetros de configuração do ciclo são definidos pelo sistema (ver seção "Lógica de criação" abaixo).

- **Authorization:** `PDM`
- **Path parameter:** `subjectUserId` (UUID) — ID do liderado para quem o ciclo será criado
- **Request body:** nenhum (body vazio ou `{}`)
- **Response `201 Created`:** sem corpo

**Validações executadas no service, nesta ordem:**

1. **Vínculo PDM → liderado:** `users.pdm_id = pdmId` para o `subjectUserId` informado. Esta verificação é feita antes de qualquer outra para evitar vazar informação sobre existência de ciclos de usuários alheios ao PDM. Se falhar → `403`.

2. **Sem CF ativo para o liderado:** nenhum `cycle_subject` com `closed_at IS NULL`, `deleted_at IS NULL`, vinculado a `cycle` com `cycle_type = CF` e `status NOT IN (CLOSED, CANCELLED)` e `deleted_at IS NULL`. Se existir → `409` com `errorCode: "CF_ALREADY_ACTIVE"`.

3. **Sem PR ativo para o liderado:** mesma estrutura da verificação anterior com `cycle_type = PR`. Se existir → `409` com `errorCode: "PR_ALREADY_ACTIVE"`.

4. **Fora de blackout de PR:** não existe `cycle_blackout` com `starts_at <= now() AND ends_at >= now()` cuja `pr_cycle_group` pertença a um `cycle` que contenha o liderado como `cycle_subject`. Se existir blackout ativo → `409` com `errorCode: "BLACKOUT_ACTIVE"`.

**Lógica de criação (executada em `@Transactional`, após todas as validações passarem):**

Criação do `cycle`:
- `cycle_type = CF`
- `trigger_type = MANUAL_PDM`
- `status = COLLECTING`
- `collection_start_at = now()`
- `collection_deadline = now() + 10 days`
- `year = ano corrente`
- `quarter = null` (CF manual não pertence a um trimestre específico)
- `is_blackout = false`
- `name = null` (CF não usa nome, conforme `001.modelo-de-dados`)
- `created_by = pdmId` (o PDM autenticado é o criador do registro)

Criação do `cycle_subject`:
- `cycle_id = id do cycle recém-criado`
- `subject_user_id = subjectUserId`
- `status = COLLECTING`
- `collection_start_at = now()`
- `closed_at = null`
- `cycle_group_id = null` (CF não usa grupos PR)

Criação dos `cycle_evaluator`:
- Avaliador SELF: `evaluator_user_id = subjectUserId`, `evaluator_type = SELF`, `is_mandatory = true`, `status = PENDING`
- Avaliador PDM: `evaluator_user_id = pdmId`, `evaluator_type = PDM`, `is_mandatory = true`, `status = PENDING`

Notificação (após commit da transação):
- Chamar `NotificationService.notifyNewCycle(subjectUserId, cycleId)` — stub que apenas loga no nível `INFO`.

**Formato da resposta de erro `409`:**

```json
{
  "errorCode": "CF_ALREADY_ACTIVE"
}
```

Os valores possíveis de `errorCode` são os mesmos descritos no `GET /api/meu-time`: `CF_ALREADY_ACTIVE`, `PR_ALREADY_ACTIVE`, `BLACKOUT_ACTIVE`.

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 201 | Ciclo criado com sucesso |
| 400 | `subjectUserId` não é um UUID válido (falha de binding) |
| 401 | Token ausente, expirado ou inválido |
| 403 | PDM autenticado não é o PDM direto do `subjectUserId` |
| 404 | `subjectUserId` não corresponde a nenhum usuário ativo no sistema |
| 409 | Impedimento de negócio: CF ativo, PR ativo ou blackout — corpo com `errorCode` |
| 500 | Erro inesperado na transação |

**Edge cases:**
- `subjectUserId` válido como UUID mas inexistente no banco: retornar `404` antes de executar as verificações de elegibilidade.
- PDM sem `pdm_id` definido para o liderado (campo `users.pdm_id IS NULL`): a verificação do vínculo falhará corretamente com `403` — não há edge case especial aqui.
- Corrida entre dois PDMs tentando criar CF simultâneo para o mesmo liderado: a verificação de CF ativo dentro de `@Transactional` com leitura seguida de escrita pode gerar race condition. Mitigar com `SELECT ... FOR UPDATE` no `cycle_subject` do liderado, ou aceitar que a segunda transação verá o ciclo criado pela primeira e retornará `409` (comportamento aceitável no MVP).

## Queries de repositório necessárias

As queries abaixo são adicionadas aos repositórios existentes. As queries de `existsActiveCfByUserId` e `existsActivePrByUserId` já foram definidas em `004.iniciar-cf-automatico` — reutilizá-las sem duplicação.

### `UserRepository` — novas queries

```
-- Lista liderados diretos ativos de um PDM:
findActiveByPdmId(UUID pdmId) → List<User>
  WHERE pdm_id = :pdmId AND active = true AND deleted_at IS NULL

-- Verifica se subjectUserId é liderado ativo do PDM:
existsByIdAndPdmIdAndActiveTrue(UUID userId, UUID pdmId) → boolean
  WHERE id = :userId AND pdm_id = :pdmId AND active = true AND deleted_at IS NULL
```

### `CycleSubjectRepository` — queries já definidas em 004 (reutilizar)

```
existsActiveCfByUserId(UUID userId) → boolean
existsActivePrByUserId(UUID userId) → boolean
```

Se o repositório da feature 004 ainda não estiver implementado, estas queries devem ser criadas aqui com a mesma semântica documentada em `004.iniciar-cf-automatico`.

### `CycleBlackoutRepository` — query já definida em 004 (reutilizar)

```
existsActiveBlackoutForUser(UUID userId, Instant now) → boolean
  FROM CycleBlackout cb
  JOIN cb.prCycleGroup pcg
  JOIN pcg.cycle c
  JOIN CycleSubject cs ON cs.cycle = c AND cs.subjectUser.id = :userId
                       AND cs.deletedAt IS NULL
  WHERE cb.startsAt <= :now AND cb.endsAt >= :now
```

Se o repositório da feature 004 ainda não estiver implementado, esta query deve ser criada aqui com a mesma semântica.

## Requisitos de qualidade

- [x] I/O-bound: o `GET /api/meu-time` executa múltiplas queries (uma para listar liderados + uma verificação de elegibilidade por liderado). Para times com muitos liderados (> 20), considerar agregar as verificações de elegibilidade em uma única query JPQL com subqueries, em vez de N queries individuais. Virtual threads são opcionais no MVP dado o volume esperado.
- [x] GraalVM AOT: DTOs de resposta implementados como Java records. Nenhuma reflection não declarada.
- [x] Dados sensíveis: nenhum dado sensível exposto nos DTOs. `pdmId` vem exclusivamente do JWT — nenhum parâmetro de request controla qual PDM está agindo.
- [x] Autorização: a verificação de vínculo PDM → liderado é feita no service, não apenas via `@PreAuthorize`. O `@PreAuthorize("hasAuthority('PDM')")` garante o role; a query com `pdm_id = pdmId` garante o escopo do liderado. Essas duas camadas devem coexistir.

## Estratégia de testes

**Fluxo principal — listagem de liderados:**
- PDM com dois liderados (um elegível, um com CF ativo) → resposta contém dois itens; o inelegível tem `canStartCf = false` e `impedimentCode = "CF_ALREADY_ACTIVE"`.
- PDM com liderado em blackout → `impedimentCode = "BLACKOUT_ACTIVE"`.
- PDM sem liderados → `teamMembers: []` com status `200`.

**Fluxo principal — criação de ciclo:**
- Liderado elegível → ciclo criado com `trigger_type = MANUAL_PDM`, `cycle_subject` com `status = COLLECTING`, dois `cycle_evaluator` (SELF + PDM); retorno `201`.
- Verificar que `cycle.collection_deadline = cycle.collection_start_at + 10 dias`.
- Verificar que `cycle.year` corresponde ao ano corrente.

**Casos de erro esperados:**
- Liderado com CF ativo → `409` com `errorCode = "CF_ALREADY_ACTIVE"`.
- Liderado com PR ativo → `409` com `errorCode = "PR_ALREADY_ACTIVE"`.
- Liderado em blackout → `409` com `errorCode = "BLACKOUT_ACTIVE"`.
- `subjectUserId` que não é liderado do PDM → `403`.
- `subjectUserId` inexistente → `404`.
- Requisição sem token → `401`.
- Token de perfil `CIETER` (sem `PDM`) → `403`.

**Casos de autorização:**
- PDM A não pode criar CF para liderado de PDM B (`pdm_id` aponta para PDM B) → `403`.
- PDM A não pode listar liderados de PDM B — `GET /api/meu-time` retorna apenas liderados cujo `pdm_id = pdmId do token`.

**Edge cases de regras de negócio:**
- Liderado com CF no status `CLOSED` ou `CANCELLED`: não deve ser bloqueado (ciclo encerrado não é "ativo").
- Ordem das validações: se liderado tem simultaneamente CF ativo e blackout, retornar `CF_ALREADY_ACTIVE` (primeira validação que falha).
- `NotificationService.notifyNewCycle` lança exceção: não deve reverter a transação (notificação é best-effort no MVP — chamar após o commit ou em bloco try-catch separado).

## Riscos técnicos e dependências

- **Dependência de `004.iniciar-cf-automatico`:** o `CycleBlackoutRepository` e as queries `existsActiveCfByUserId` / `existsActivePrByUserId` foram especificados em `004`. Se a feature 004 não estiver implementada quando esta for desenvolvida, essas queries precisam ser criadas aqui e extraídas ou consolidadas posteriormente para evitar duplicação.

- **Race condition na criação:** dois PDMs distintos que compartilham um mesmo liderado (situação atípica mas possível se `users.pdm_id` puder apontar para mais de um PDM via tabela intermediária futura) poderiam criar ciclos simultâneos. No modelo atual (`users.pdm_id` é campo único), apenas um PDM por liderado existe, eliminando este risco.

- **`NotificationService` como stub:** a notificação ao colaborador é apenas um log no MVP. A Regra 8 (colaborador pode encerrar CF manual) depende que o colaborador seja notificado da abertura. Se o stub nunca for substituído por implementação real, o colaborador pode não saber que o ciclo foi aberto.

- **`GET /api/meu-time` como endpoint desta feature:** a tela `/meu-time` ainda não existe. Este endpoint é o backbone dela. Features subsequentes (como acompanhamento de progresso do time, feature 012) provavelmente precisarão enriquecer este endpoint ou criar um derivado. Projetar o DTO `TeamMemberDTO` de forma extensível desde o início.

- **Encerramento automático:** o `CfAutoCloseScheduler` da feature 004 já cobrirá ciclos criados com `trigger_type = MANUAL_PDM` — a condição de busca é por `cycle_type = CF` e `status = COLLECTING`, independente do `trigger_type`. Não é necessária nenhuma lógica adicional nesta feature para o encerramento automático.