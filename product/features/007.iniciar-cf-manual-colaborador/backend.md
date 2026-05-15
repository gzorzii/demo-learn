# Iniciar CF Manual pelo Próprio Colaborador — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

---

## Visão geral

Esta feature expõe um único endpoint de escrita (`POST /api/me/ciclos/cf`) que permite ao colaborador autenticado criar um ciclo CF manual para si mesmo. Complementa a feature 006 (`iniciar-cf-manual-pdm`), reutilizando a mesma lógica de validação de elegibilidade já definida ali — mas com o `subjectUserId` derivado do próprio JWT em vez de um path parameter.

Não há alteração de schema. As camadas tocadas são: controller (novo endpoint em `MeController` ou controller dedicado de self-service do colaborador), service (novo `SelfCfService` ou extensão de `MeService`), e repositórios existentes (`CycleSubjectRepository`, `CycleBlackoutRepository`) com queries já definidas nas features 004 e 006.

A diferença técnica central em relação à feature 006 é: o `subjectUserId` e o `createdBy` são o mesmo valor — o `userId` extraído do JWT. Não há `pdmId` como ator criador; o PDM é apenas o destinatário da notificação, obtido via `users.pdm_id` do colaborador após a criação.

**Domínios afetados:**
- `users` — leitura para obter o `pdm_id` do colaborador (destinatário da notificação) e confirmar que o usuário existe e está ativo
- `cycle`, `cycle_subject`, `cycle_evaluator` — escrita na criação do ciclo
- `cycle_blackout`, `pr_cycle_group` — leitura para verificação de blackout

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma nova tabela nem alteração de schema. Todas as tabelas envolvidas já existem com schema completo definido em `001.modelo-de-dados`:

- `cycle` — escrita: criação com `cycle_type = CF`, `trigger_type = MANUAL_COLLABORATOR`, `status = COLLECTING`
- `cycle_subject` — escrita: criação vinculada ao `cycle` recém-criado
- `cycle_evaluator` — escrita: criação dos avaliadores SELF e PDM
- `users` — leitura: buscar `pdm_id` do colaborador para notificação e validar usuário ativo
- `cycle_blackout` — leitura: verificação de período ativo
- `pr_cycle_group` — leitura: join para resolver vínculo `cycle_blackout → colaborador`

> O valor `MANUAL_COLLABORATOR` para o campo `trigger_type` da tabela `cycle` é introduzido por esta feature. Se o enum `trigger_type` for gerenciado via Liquibase (check constraint ou tipo PostgreSQL), uma migração será necessária para acrescentar esse valor. Ver seção de migração abaixo.

### Índices relevantes

Os índices abaixo já foram definidos em `001.modelo-de-dados`, `004.iniciar-cf-automatico` e `006.iniciar-cf-manual-pdm`. Confirmar existência antes de criar migração duplicada:

```sql
-- Já definidos em 001.modelo-de-dados:
idx_subject_user        ON cycle_subject (subject_user_id)
idx_subject_status      ON cycle_subject (status)
idx_subject_cycle       ON cycle_subject (cycle_id)
idx_evaluator_subject   ON cycle_evaluator (cycle_subject_id)
idx_users_pdm_id        ON users (pdm_id)

-- Definidos em 004.iniciar-cf-automatico (confirmar existência):
idx_subject_collection_start ON cycle_subject (collection_start_at) WHERE deleted_at IS NULL AND closed_at IS NULL
```

Nenhum índice adicional é necessário exclusivamente para esta feature.

### Estratégia de migração

A única migração potencialmente necessária é acrescentar o valor `MANUAL_COLLABORATOR` ao enum ou check constraint do campo `trigger_type` em `cycle`. Verificar o tipo atual antes de agir:

- Se `trigger_type` for um tipo `ENUM` no PostgreSQL: `ALTER TYPE cycle_trigger_type ADD VALUE 'MANUAL_COLLABORATOR';`
- Se for `VARCHAR` com `CHECK` constraint: `ALTER TABLE cycle DROP CONSTRAINT ... ; ALTER TABLE cycle ADD CONSTRAINT ... CHECK (trigger_type IN (..., 'MANUAL_COLLABORATOR'));`
- Se for `VARCHAR` sem constraint: nenhuma migração necessária.

A migração é não-destrutiva (adiciona valor) e o rollback é seguro desde que nenhum registro com o novo valor exista ao tentar reverter.

---

## Contratos de API

### `POST /api/me/ciclos/cf`

Cria um ciclo CF manual para o colaborador autenticado. O `subjectUserId` é extraído do JWT — sem parâmetro de path ou body.

- **Authorization:** perfis `CIETER` e `PDM` (qualquer colaborador autenticado pode iniciar CF para si mesmo)
- **Request body:** nenhum (body vazio ou `{}`)
- **Response `201 Created`:** sem corpo

**Validações executadas no service, nesta ordem:**

> A ordem importa: em caso de múltiplos impedimentos simultâneos, o primeiro encontrado é o retornado — comportamento consistente com o endpoint equivalente da feature 006.

1. **Usuário ativo:** `users.active = true AND deleted_at IS NULL` para o `userId` do token. Se o usuário não existir ou estiver inativo → `403` (evita vazar informação sobre a existência de outros usuários; o ator é sempre si mesmo, portanto `403` é mais apropriado que `404`).

2. **Sem CF ativo para si mesmo:** nenhum `cycle_subject` com `closed_at IS NULL`, `deleted_at IS NULL`, vinculado a `cycle` com `cycle_type = CF` e `status NOT IN (CLOSED, CANCELLED)` e `deleted_at IS NULL`. Se existir → `409` com `errorCode: "CF_ALREADY_ACTIVE"`.

3. **Sem PR ativo para si mesmo:** mesma estrutura da verificação anterior com `cycle_type = PR`. Se existir → `409` com `errorCode: "PR_ALREADY_ACTIVE"`.

4. **Fora de blackout de PR:** não existe `cycle_blackout` com `starts_at <= now() AND ends_at >= now()` cuja `pr_cycle_group` pertença a um `cycle` que contenha o colaborador como `cycle_subject`. Se existir blackout ativo → `409` com `errorCode: "BLACKOUT_ACTIVE"` e, se disponível, `blackoutEndsAt` com a data prevista de encerramento.

**Lógica de criação (executada em `@Transactional`, após todas as validações passarem):**

Criação do `cycle`:
- `cycle_type = CF`
- `trigger_type = MANUAL_COLLABORATOR`
- `status = COLLECTING`
- `collection_start_at = now()`
- `collection_deadline = now() + 10 days`
- `year = ano corrente`
- `quarter = null`
- `is_blackout = false`
- `name = null`
- `created_by = userId` (o próprio colaborador é o criador do registro)

Criação do `cycle_subject`:
- `cycle_id = id do cycle recém-criado`
- `subject_user_id = userId`
- `status = COLLECTING`
- `collection_start_at = now()`
- `closed_at = null`
- `cycle_group_id = null`

Criação dos `cycle_evaluator`:
- Avaliador SELF: `evaluator_user_id = userId`, `evaluator_type = SELF`, `is_mandatory = true`, `status = PENDING`
- Avaliador PDM: `evaluator_user_id = pdmId` (lido de `users.pdm_id` do colaborador), `evaluator_type = PDM`, `is_mandatory = true`, `status = PENDING`

> Se `users.pdm_id` for nulo para o colaborador, o avaliador PDM não pode ser criado. Neste caso: criar apenas o avaliador SELF e prosseguir — a notificação ao PDM também não ocorre. Este é um caso de configuração incompleta do usuário, não um erro que deve bloquear a criação do ciclo.

Notificação (após commit da transação):
- Chamar `NotificationService.notifyNewCycle(pdmId, cycleId)` para notificar o PDM — stub que apenas loga no nível `INFO`.
- Se `pdmId` for nulo, omitir a chamada.

**Formato da resposta de erro `409`:**

```json
{
  "errorCode": "CF_ALREADY_ACTIVE"
}
```

Para o caso de blackout, incluir a data de encerramento quando disponível:

```json
{
  "errorCode": "BLACKOUT_ACTIVE",
  "blackoutEndsAt": "2025-07-15T23:59:59Z"
}
```

O campo `blackoutEndsAt` é nulo se o blackout não tiver `ends_at` definido.

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 201 | Ciclo criado com sucesso |
| 401 | Token ausente, expirado ou inválido |
| 403 | Token válido mas perfil sem permissão (`CALIBRATOR`, `BP`, `ADMIN` sem acumulação de `CIETER` ou `PDM`); ou usuário inativo/não encontrado |
| 409 | Impedimento de negócio: CF ativo, PR ativo ou blackout — corpo com `errorCode` |
| 500 | Erro inesperado na transação |

> Não há `400` neste endpoint porque não existe request body nem path parameters — não há dados de entrada mal-formados possíveis.

**Edge cases:**

- Colaborador sem `pdm_id` cadastrado: ciclo é criado apenas com avaliador SELF; avaliador PDM é omitido; notificação não é enviada.
- Colaborador com CF no status `CLOSED` ou `CANCELLED`: não deve ser bloqueado (ciclo encerrado não é "ativo").
- Corrida entre duas sessões do mesmo colaborador tentando criar CF simultâneo: mitigar com `SELECT ... FOR UPDATE` no `cycle_subject` do colaborador dentro da transação, ou aceitar `409` na segunda tentativa como comportamento aceitável no MVP.

---

## Queries de repositório necessárias

As queries abaixo são reutilizadas de features anteriores. Confirmar que já existem antes de duplicar.

### `CycleSubjectRepository` — queries definidas em 004 e 006 (reutilizar)

```
existsActiveCfByUserId(UUID userId) → boolean
existsActivePrByUserId(UUID userId) → boolean
```

### `CycleBlackoutRepository` — query definida em 004 e 006 (reutilizar)

```
existsActiveBlackoutForUser(UUID userId, Instant now) → boolean
```

### `CycleBlackoutRepository` — nova query necessária para retornar `blackoutEndsAt`

```
findActiveBlackoutForUser(UUID userId, Instant now) → Optional<CycleBlackout>
  FROM CycleBlackout cb
  JOIN cb.prCycleGroup pcg
  JOIN pcg.cycle c
  JOIN CycleSubject cs ON cs.cycle = c AND cs.subjectUser.id = :userId
                       AND cs.deletedAt IS NULL
  WHERE cb.startsAt <= :now AND cb.endsAt >= :now
```

Retorna o registro de blackout ativo para extrair `ends_at` e incluir no corpo do `409`. Se a implementação existente retornar apenas `boolean`, adicionar esta query paralela — não remover a original que pode ser usada por outras features.

### `UserRepository` — query necessária para obter `pdm_id`

```
-- Busca o PDM do colaborador autenticado:
findPdmIdByUserId(UUID userId) → Optional<UUID>
  SELECT u.pdm_id FROM users u WHERE u.id = :userId AND u.active = true AND u.deleted_at IS NULL
```

---

## Requisitos de qualidade

- [ ] I/O-bound: o endpoint executa 3–4 queries sequenciais (verificações de elegibilidade + leitura do `pdm_id` + criação dos registros). Virtual threads são opcionais no MVP dado o volume esperado — mas o padrão do projeto deve ser seguido se já estiver configurado.
- [ ] GraalVM AOT: DTOs de resposta de erro implementados como Java records. Nenhuma reflection não declarada.
- [ ] Dados sensíveis: nenhum dado sensível exposto. O `userId` usado em todas as queries é exclusivamente o do JWT — nenhum parâmetro de request controla sobre quem o ciclo é criado.
- [ ] Autorização: `@PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")` garante o role. A ausência de parâmetro de path para o `userId` elimina o risco de um usuário criar ciclo em nome de outro.

---

## Estratégia de testes

**Fluxo principal (happy path):**
- Colaborador `CIETER` elegível → ciclo criado com `trigger_type = MANUAL_COLLABORATOR`, `cycle_subject` com `status = COLLECTING`, dois `cycle_evaluator` (SELF + PDM); retorno `201`.
- Verificar que `cycle.collection_deadline = cycle.collection_start_at + 10 dias`.
- Verificar que `cycle.year` corresponde ao ano corrente.
- Verificar que `cycle.created_by = userId` (o próprio colaborador).
- Colaborador com `pdm_id IS NULL` → ciclo criado com apenas um `cycle_evaluator` (SELF); retorno `201`.

**Casos de erro esperados:**
- Colaborador com CF ativo → `409` com `errorCode = "CF_ALREADY_ACTIVE"`.
- Colaborador com PR ativo → `409` com `errorCode = "PR_ALREADY_ACTIVE"`.
- Colaborador em blackout → `409` com `errorCode = "BLACKOUT_ACTIVE"` e `blackoutEndsAt` preenchido.
- Colaborador em blackout sem `ends_at` definido → `409` com `errorCode = "BLACKOUT_ACTIVE"` e `blackoutEndsAt = null`.
- Requisição sem token → `401`.
- Token de perfil `CALIBRATOR` (sem `CIETER` ou `PDM`) → `403`.

**Casos de autorização:**
- Verificar que o `userId` da query é sempre o do token — não há parâmetro externo para substituir.
- Verificar que dois colaboradores diferentes criam ciclos apenas para si mesmos.

**Edge cases de regras de negócio:**
- Colaborador com CF no status `CLOSED` não é bloqueado — pode criar novo CF.
- Ordem das validações: colaborador com simultaneamente CF ativo e blackout → retornar `CF_ALREADY_ACTIVE` (primeira validação que falha).
- `NotificationService.notifyNewCycle` lança exceção: não deve reverter a transação (notificação é best-effort — chamar após o commit ou em bloco try-catch separado).
- Ciclo criado por esta feature deve ser reconhecido pelo `CfAutoCloseScheduler` da feature 004 (que busca por `cycle_type = CF` e `status = COLLECTING`, independente de `trigger_type`).

---

## Riscos técnicos e dependências

- **Dependência de `004.iniciar-cf-automatico` e `006.iniciar-cf-manual-pdm`:** as queries `existsActiveCfByUserId`, `existsActivePrByUserId` e `existsActiveBlackoutForUser` foram especificadas nessas features. Se nenhuma das duas estiver implementada quando esta for desenvolvida, essas queries precisam ser criadas aqui e consolidadas posteriormente.

- **Novo valor `MANUAL_COLLABORATOR` no enum `trigger_type`:** se o campo for gerenciado como tipo PostgreSQL ou check constraint, uma migração Liquibase é obrigatória antes que o código possa persistir registros. A ausência da migração causaria erro em runtime ao tentar inserir o ciclo. O agente de implementação deve verificar o schema atual antes de prosseguir.

- **Encerramento automático:** o `CfAutoCloseScheduler` da feature 004 cobrirá ciclos criados com `trigger_type = MANUAL_COLLABORATOR` automaticamente — nenhuma lógica adicional é necessária aqui. A Regra 12 do `business.md` (encerramento após 10 dias ou 100% das respostas) está contemplada pelo scheduler existente.

- **Encerramento manual pelo colaborador (Regra 8):** a Regra 8 do `business.md` especifica que o próprio colaborador pode encerrar o CF manual. O endpoint de encerramento está fora do escopo desta feature (ver `013.encerrar-cf-manual`). Esta feature apenas cria o ciclo — o endpoint de encerramento deverá verificar que `trigger_type IN (MANUAL_COLLABORATOR, MANUAL_PDM)` para autorizar o ator correto.

- **`NotificationService` como stub:** a notificação ao PDM é apenas um log no MVP. Se o stub nunca for substituído, o PDM pode não saber que o ciclo foi aberto pelo colaborador.

- **Usuário sem `pdm_id`:** a criação do avaliador PDM depende de `users.pdm_id` estar preenchido. Em ambientes de desenvolvimento ou dados de teste, esse campo pode estar nulo. O comportamento definido (criar apenas SELF e prosseguir) é deliberadamente permissivo — aceitar o risco de ciclo sem avaliador PDM no MVP.