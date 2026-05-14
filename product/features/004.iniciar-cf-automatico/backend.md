# Iniciar CF Automático — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

---

## Visão geral

Esta feature implementa três cron jobs de backend sem controller HTTP. Não há endpoint exposto — toda a lógica é acionada pelo scheduler interno do Spring. As camadas tocadas são: scheduler (nova), service (novo `CfSchedulerService`), e repositories (novos e existentes).

Os três jobs são:

1. **`CfQuarterlyScheduler`** — roda diariamente de madrugada; verifica colaboradores elegíveis pela cadência trimestral e cria ciclos CF com `trigger_type = QUARTERLY_AUTO`.
2. **`CfOnboardingScheduler`** — roda diariamente de madrugada; verifica colaboradores com `admission_date` há exatamente 30 ou 90 dias e cria ciclos CF com `trigger_type = QUARTERLY_AUTO` (mesmo enum — o nome do `cycle` distinguirá a cadência, ver Modelo de dados).
3. **`CfAutoCloseScheduler`** — roda com frequência maior (sugestão: a cada hora); verifica ciclos CF em coleta que atingiram o prazo de 10 dias ou 100% de respostas obrigatórias e os encerra.

**Domínios afetados:**
- `cycle` — escrita em `cycle` e `cycle_subject` (criação e encerramento)
- `cycle_evaluator` — escrita na criação (avaliadores SELF e PDM)
- `users` — leitura para elegibilidade e identificação do PDM
- `cycle_blackout` — leitura para verificação de blackout

A entidade `Cycle` já existe com todos os campos necessários. Nenhuma alteração de schema é obrigatória; uma migração opcional de índice está documentada abaixo.

> Nota de design: o `TriggerType.QUARTERLY_AUTO` é usado tanto para ciclos trimestrais quanto para ciclos de onboarding. A distinção é feita pelo campo `cycle.name` (ex: `"CF Onboarding 30d - <nome>"` vs. `"CF Trimestral <quarter>/<ano> - <nome>"`). Não há valor `ONBOARDING` no enum — não introduzir sem alinhamento explícito, pois afetaria validações em outras features.

---

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma nova tabela. Todas as entidades envolvidas (`cycle`, `cycle_subject`, `cycle_evaluator`, `users`, `cycle_blackout`) já existem com o schema completo definido em `001.modelo-de-dados`.

### Índices adicionais recomendados

Os índices abaixo não foram especificados em `001.modelo-de-dados` e são necessários para as queries de elegibilidade dos cron jobs, que rodam diariamente sobre toda a tabela `users`:

```sql
-- Suporte à query de onboarding: filtro por data exata de admissão
-- Justificativa: o CfOnboardingScheduler consulta users.admission_date = :targetDate diariamente;
-- sem índice, seria full scan em toda a tabela de usuários ativos.
CREATE INDEX idx_users_admission_date ON users (admission_date)
    WHERE active = true AND deleted_at IS NULL;

-- Suporte à query de encerramento automático: filtro por deadline vencida em cycle_subject
-- Justificativa: o CfAutoCloseScheduler busca cycle_subject com collection_start_at < :cutoff
-- e status = COLLECTING diariamente (ou horariamente); índice parcial reduz o scan.
CREATE INDEX idx_subject_collection_start ON cycle_subject (collection_start_at)
    WHERE deleted_at IS NULL AND closed_at IS NULL;
```

Changeset sugerido: `003-cf-scheduler-indexes.sql` (prefixo alinhado com convenção dos changesets existentes).

### Estratégia de migração

A migração `003-cf-scheduler-indexes.sql` cria apenas dois índices parciais sobre tabelas já existentes. Não altera colunas, tipos nem constraints. Rollback seguro: `DROP INDEX` dos dois índices sem impacto em dados.

Dados existentes não precisam de transformação. Os índices podem ser criados `CONCURRENTLY` em ambiente de produção para evitar lock de tabela.

---

## Contratos de API

Esta feature não expõe endpoints HTTP. Não há contrato de API a documentar.

---

## Componentes de scheduler e service

### Scheduler: `CfQuarterlyScheduler`

**Expressão cron:** `0 2 * * *` (02:00 horário local, configurável via `application.properties` com chave `scheduler.cf.quarterly.cron`).

**Fluxo de execução por colaborador elegível:**

1. Buscar todos os usuários ativos (`active = true`, `deleted_at IS NULL`).
2. Para cada usuário, verificar elegibilidade (ver critérios abaixo).
3. Se elegível: chamar `CfSchedulerService.createCfCycle(userId, CfTriggerReason.QUARTERLY)`.
4. Em caso de exceção por usuário: logar e continuar para o próximo — um erro não deve interromper o job inteiro.

**Critérios de elegibilidade trimestral (verificados pelo service, não pelo scheduler):**

- Usuário ativo: `users.active = true` e `users.deleted_at IS NULL`.
- Sem CF ativo: nenhum `cycle_subject` com `closed_at IS NULL` e `deleted_at IS NULL` vinculado a um `cycle` do tipo `CF` com `status NOT IN (CLOSED, CANCELLED)` e `deleted_at IS NULL`.
- Sem PR ativo: mesmo critério para `cycle_type = PR`.
- Fora de blackout: `now()` não cai em nenhum intervalo `[starts_at, ends_at]` de `cycle_blackout` ativo (associado via `pr_cycle_group` de qualquer `cycle` que envolva o colaborador).
- Trimestral: o último `cycle_subject` encerrado (`closed_at IS NOT NULL`) vinculado a um CF desse colaborador tem `closed_at < now() - INTERVAL '90 days'`, ou o colaborador nunca teve CF (`COUNT = 0`).

> Sobre a verificação de blackout: `cycle_blackout` é associado a `pr_cycle_group`, que por sua vez pertence a um `cycle` de PR. A verificação correta é: existe algum `cycle_blackout` cujo `pr_cycle_group.cycle_id` pertence a um `cycle` de PR que tenha o colaborador em `cycle_subject`, e cujo período `[starts_at, ends_at]` contém `now()`? Se sim, o colaborador está em blackout.

---

### Scheduler: `CfOnboardingScheduler`

**Expressão cron:** `0 2 * * *` (mesma janela do trimestral — configurável via `scheduler.cf.onboarding.cron`).

**Fluxo de execução:**

1. Calcular as datas-alvo: `today - 30 days` e `today - 90 days`.
2. Buscar usuários ativos com `admission_date = today - 30 days` OU `admission_date = today - 90 days`.
3. Para cada usuário encontrado, verificar elegibilidade (sem CF ativo, sem PR ativo, fora de blackout — **sem** verificação de intervalo trimestral de 90 dias, conforme Regra 14).
4. Se elegível: chamar `CfSchedulerService.createCfCycle(userId, CfTriggerReason.ONBOARDING_30D)` ou `CfTriggerReason.ONBOARDING_90D` conforme o dia.
5. Se o mesmo colaborador atinge 30d e 90d no mesmo dia (impossível, mas defensivo): criar apenas um ciclo.

> Regra "apenas um ciclo por dia" (mencionada no `business.md`): se um colaborador for elegível tanto pelo trimestral quanto pelo onboarding no mesmo dia, o `CfSchedulerService.createCfCycle` deve ser idempotente e criar apenas um ciclo. A verificação de CF ativo — executada antes da criação — garantirá isso naturalmente: o primeiro job a rodar cria o ciclo; o segundo encontra CF ativo e não cria.

---

### Scheduler: `CfAutoCloseScheduler`

**Expressão cron:** `0 * * * *` (a cada hora, configurável via `scheduler.cf.autoclose.cron`).

**Fluxo de execução:**

1. Buscar todos os `cycle_subject` com:
   - `deleted_at IS NULL`
   - `closed_at IS NULL`
   - `status = COLLECTING`
   - Join em `cycle` com `cycle_type = CF` e `status = COLLECTING`
2. Para cada `cycle_subject` encontrado, verificar condição de encerramento:
   - **Critério de prazo:** `collection_start_at + 10 dias <= now()`
   - **Critério de completude:** todos os `cycle_evaluator` com `is_mandatory = true` e `deleted_at IS NULL` têm `status IN (RESPONDED, SKIPPED)`
3. Se qualquer critério for satisfeito:
   - Atualizar `cycle_subject.closed_at = now()` e `cycle_subject.status = READY_FOR_CALIBRATION`.
   - Verificar se todos os `cycle_subject` do `cycle` pai estão encerrados. Se sim, atualizar `cycle.status = CLOSED` e `cycle.closed_at = now()`.
4. Em caso de exceção por subject: logar e continuar.

> O campo `cycle_subject.collection_start_at` é o ponto de partida para o prazo de 10 dias, não `cycle.collection_start_at`. Ao criar o ciclo (ver `CfSchedulerService`), `collection_start_at` deve ser preenchido em ambos os registros.

---

### Service: `CfSchedulerService`

Responsável por encapsular toda a lógica de criação de um ciclo CF automático. Chamado pelos três schedulers.

**Método principal: `createCfCycle(UUID userId, CfTriggerReason reason)`**

Executado em `@Transactional` isolado por usuário (não um único `@Transactional` para todo o batch).

Passos internos:

1. **Idempotência:** verificar se já existe `cycle_subject` ativo (CF, `closed_at IS NULL`, `deleted_at IS NULL`) para o usuário. Se sim, retornar sem criar nada (log de debug).
2. **Elegibilidade:** executar todas as verificações descritas no scheduler correspondente via repositórios dedicados.
3. **Criação do `Cycle`:**
   - `cycle_type = CF`
   - `trigger_type = QUARTERLY_AUTO`
   - `status = COLLECTING`
   - `year = ano atual`
   - `quarter = trimestre atual` (para ciclos trimestrais; para onboarding, pode ser nulo ou o trimestre em que cai)
   - `collection_start_at = now()`
   - `collection_deadline = now() + 10 days`
   - `name = "<prefixo> - <nome do colaborador>"` — ver tabela de prefixos abaixo
   - `is_blackout = false`
   - `created_by` = ID de um usuário de sistema (configurável; pode ser um UUID fixo representando o "sistema")
4. **Criação do `CycleSubject`:**
   - `cycle_id` = ID do ciclo recém-criado
   - `subject_user_id = userId`
   - `status = COLLECTING`
   - `collection_start_at = now()`
   - `collection_deadline` não existe em `cycle_subject` — o prazo é lido de `cycle.collection_deadline`
5. **Criação dos `CycleEvaluator`:**
   - Avaliador `SELF` (obrigatório): `evaluator_user_id = userId`, `evaluator_type = SELF`, `is_mandatory = true`, `status = PENDING`
   - Avaliador `PDM` (obrigatório, se `users.pdm_id IS NOT NULL`): `evaluator_user_id = pdm.id`, `evaluator_type = PDM`, `is_mandatory = true`, `status = PENDING`
   - Avaliadores `PEER` não são criados aqui — são indicados pelo colaborador em `008.validar-avaliadores-cf`
6. **Notificação:** chamar `NotificationService.notifyNewCycle(userId, pdmId, cycleId)` — implementação é stub (log apenas).

**Prefixos de `cycle.name` por razão de disparo:**

| `CfTriggerReason` | Prefixo de `cycle.name` |
|---|---|
| `QUARTERLY` | `"CF Trimestral Q{q}/{ano}"` |
| `ONBOARDING_30D` | `"CF Onboarding 30d"` |
| `ONBOARDING_90D` | `"CF Onboarding 90d"` |

> `CfTriggerReason` é um enum interno ao domínio de scheduler, não mapeado para banco — serve apenas para parametrizar o `CfSchedulerService`. O campo `cycle.trigger_type` sempre recebe `QUARTERLY_AUTO` independentemente da razão.

---

### Service: `NotificationService`

Stub de notificação — implementação real (Google Chat) fora do MVP.

**Método:** `notifyNewCycle(UUID userId, UUID pdmId, UUID cycleId)` — loga a intenção de notificação no nível `INFO` e retorna sem fazer chamada externa.

---

## Queries de repositório necessárias

Os repositórios abaixo precisam de novas queries JPQL. Os repositórios `CycleSubjectRepository` e `CycleEvaluatorRepository` já existem com queries da feature 003.

### `UserRepository` — novas queries

```
-- Colaboradores elegíveis para varredura trimestral:
-- Todos os usuários ativos (o service filtra os demais critérios individualmente)
findAllActiveUsers() → List<User>
  WHERE active = true AND deleted_at IS NULL

-- Colaboradores para onboarding em data específica:
findByAdmissionDateAndActive(LocalDate admissionDate) → List<User>
  WHERE admission_date = :admissionDate AND active = true AND deleted_at IS NULL
```

### `CycleSubjectRepository` — novas queries

```
-- Verifica se existe CF ativo para o usuário (idempotência e elegibilidade):
existsActiveCfByUserId(UUID userId) → boolean
  JOIN cycle ON cycle_subject.cycle_id = cycle.id
  WHERE cycle_subject.subject_user_id = :userId
    AND cycle_subject.closed_at IS NULL
    AND cycle_subject.deleted_at IS NULL
    AND cycle.cycle_type = CF
    AND cycle.status NOT IN (CLOSED, CANCELLED)
    AND cycle.deleted_at IS NULL

-- Verifica se existe PR ativo (Regra 4):
existsActivePrByUserId(UUID userId) → boolean
  Mesma estrutura, cycle.cycle_type = PR

-- Busca o último CF encerrado do colaborador (critério trimestral dos 90 dias):
findLastClosedCfSubject(UUID userId) → Optional<CycleSubject>
  JOIN cycle ON cycle_subject.cycle_id = cycle.id
  WHERE cycle_subject.subject_user_id = :userId
    AND cycle_subject.closed_at IS NOT NULL
    AND cycle_subject.deleted_at IS NULL
    AND cycle.cycle_type = CF
  ORDER BY cycle_subject.closed_at DESC
  LIMIT 1

-- Busca subjects CF em coleta para o job de encerramento automático:
findCollectingCfSubjects() → List<CycleSubject>
  JOIN FETCH cycle ON cycle_subject.cycle_id = cycle.id
  WHERE cycle_subject.deleted_at IS NULL
    AND cycle_subject.closed_at IS NULL
    AND cycle_subject.status = COLLECTING
    AND cycle.cycle_type = CF
    AND cycle.status = COLLECTING
    AND cycle.deleted_at IS NULL

-- Verifica se todos os subjects de um ciclo estão encerrados (para fechar o cycle pai):
countOpenSubjectsByCycleId(UUID cycleId) → long
  WHERE cycle_id = :cycleId
    AND closed_at IS NULL
    AND deleted_at IS NULL
```

### `CycleBlackoutRepository` — novo repositório

```
-- Verifica se há blackout ativo para o colaborador no instante atual:
-- O blackout pertence a pr_cycle_group, que pertence a cycle (PR).
-- O colaborador está no grupo se tiver cycle_subject no cycle desse grupo.
-- Motivo do join complexo: cycle_blackout não referencia diretamente o colaborador;
-- o vínculo é indireto via pr_cycle_group → cycle → cycle_subject → subject_user_id.
existsActiveBlackoutForUser(UUID userId, Instant now) → boolean
  FROM CycleBlackout cb
  JOIN cb.prCycleGroup pcg
  JOIN pcg.cycle c
  JOIN CycleSubject cs ON cs.cycle = c AND cs.subjectUser.id = :userId
                       AND cs.deletedAt IS NULL
  WHERE cb.startsAt <= :now
    AND cb.endsAt >= :now
```

### `CycleEvaluatorRepository` — nova query

```
-- Verifica se 100% dos avaliadores obrigatórios responderam (critério de encerramento):
countPendingMandatoryByCycleSubjectId(UUID csId) → long
  WHERE cycle_subject_id = :csId
    AND is_mandatory = true
    AND deleted_at IS NULL
    AND status NOT IN (RESPONDED, SKIPPED)
```

---

## Requisitos de qualidade

- [x] I/O-bound: cada execução dos cron jobs envolve múltiplas queries ao banco. O `CfQuarterlyScheduler` itera sobre todos os colaboradores ativos — potencialmente centenas de queries individuais. Recomendar uso de virtual threads (`@Async` com executor de virtual threads do `AsyncConfig`) para o processamento de cada usuário, ou reescrever as verificações como queries em batch.
- [x] GraalVM AOT: schedulers e services não usam reflection não declarada. Confirmar que `@Scheduled` com `cron` configurável via `@Value` é compatível com GraalVM (é, desde Spring 6).
- [x] Dados sensíveis: nenhum dado sensível exposto. O `NotificationService` loga apenas `userId`, `pdmId` e `cycleId` (UUIDs sem PII).
- [x] Autorização: não há endpoint HTTP. Os jobs rodam com privilégio de sistema. O `created_by` dos registros criados deve ser um UUID de usuário de sistema configurável (não um usuário real). Documentar esse UUID no `application-dev.properties`.
- [x] Idempotência: a verificação de CF ativo antes da criação garante que re-execuções acidentais do cron não criem duplicatas. Cobrir isso em testes.

---

## Estratégia de testes

**Fluxo principal — criação trimestral:**
- Colaborador ativo, sem CF ativo, sem PR ativo, fora de blackout, com último CF há mais de 90 dias → ciclo criado com `trigger_type = QUARTERLY_AUTO`, `cycle_subject` e dois `cycle_evaluator` (SELF + PDM).
- Colaborador ativo sem nenhum CF anterior → ciclo criado normalmente (Regra 13: sem restrição de tenure).

**Fluxo principal — criação de onboarding:**
- Colaborador com `admission_date = today - 30 days` → ciclo criado com `cycle.name` contendo `"30d"`.
- Colaborador com `admission_date = today - 90 days` → ciclo criado com `cycle.name` contendo `"90d"`.
- Colaborador com `admission_date = today - 30 days` E `today - 90 days` simultaneamente (impossível, mas mock) → apenas um ciclo criado.

**Fluxo principal — encerramento automático:**
- `cycle_subject` com `collection_start_at = now() - 11 days` → encerrado pelo `CfAutoCloseScheduler` com `status = READY_FOR_CALIBRATION`.
- Todos os avaliadores obrigatórios com `status = RESPONDED` antes dos 10 dias → encerrado antecipadamente.
- Encerramento do último `cycle_subject` → `cycle.status` atualizado para `CLOSED`.

**Casos de erro esperados:**
- Colaborador com CF ativo → nenhum novo ciclo criado (idempotência).
- Colaborador com PR ativo → nenhum CF criado (Regra 4).
- Colaborador em período de blackout → nenhum CF criado (Regra 19).
- Colaborador com último CF encerrado há 89 dias → não elegível para trimestral.
- Usuário sem PDM (`pdm_id IS NULL`) → ciclo criado apenas com avaliador SELF; sem erro.

**Casos de autorização:**
- Nenhum endpoint HTTP — não aplicável.
- Verificar que `created_by` nos registros criados é o UUID de sistema, não um usuário real.

**Edge cases de regras de negócio:**
- Dois cron jobs (trimestral e onboarding) rodando para o mesmo colaborador no mesmo dia → segundo job encontra CF ativo e não cria duplicata.
- `CfAutoCloseScheduler` rodando para um `cycle_subject` já encerrado → não deve reprocessar (filtro `closed_at IS NULL` na query).
- `CfAutoCloseScheduler` com ciclo onde `collection_start_at IS NULL` → tratar defensivamente (não deve ocorrer se a criação estiver correta, mas logar warning e pular).

---

## Riscos técnicos e dependências

- **Performance do job trimestral em escala:** a abordagem de iterar sobre todos os colaboradores ativos e fazer verificações individuais por usuário é N queries por execução. Com centenas de colaboradores, o impacto é baixo no MVP, mas pode crescer. Considerar refatorar para uma única query de elegibilidade que retorne diretamente os usuários elegíveis em batch (join de todas as condições em JPQL ou SQL nativo), antes de atingir 500+ usuários ativos.

- **Semântica de blackout para onboarding:** a Regra 19 diz que "novos CFs não abrem durante blackout". O `business.md` não distingue onboarding de trimestral nessa regra — ambos estão bloqueados durante blackout. Confirmar com o negócio se onboarding deve ter exceção ao blackout antes de implementar.

- **`@EnableScheduling` não está ativado:** `AsyncConfig` habilita `@EnableAsync`, mas `@EnableScheduling` ainda não foi adicionado à aplicação. Será necessário adicionar `@EnableScheduling` à `DemoLearnApplication` ou a uma `@Configuration` dedicada (ex: `SchedulingConfig`).

- **UUID de sistema para `created_by`:** os schedulers criam registros em nome do sistema, não de um usuário autenticado. O `BaseEntity` usa `@CreatedBy` via Spring Data JPA Auditing (`JpaAuditingConfig`). O `AuditorAware` atual provavelmente resolve o auditor a partir do `SecurityContext` — que estará vazio em threads de scheduler. É necessário configurar um auditor de sistema (UUID fixo) para contextos sem autenticação, ou sobreescrever `created_by` manualmente antes de persistir.

- **Dependência da feature 008:** os avaliadores PEER são criados em `008.validar-avaliadores-cf`. O ciclo criado por esta feature estará em `COLLECTING` sem avaliadores PEER — o encerramento automático deve considerar apenas os obrigatórios (SELF e PDM), o que já está contemplado na condição `is_mandatory = true` do `CfAutoCloseScheduler`.

- **Dependência da feature 013:** a Regra 7 diz que colaboradores não podem encerrar manualmente ciclos automáticos. A feature 013 (`encerrar-cf-manual`) deve verificar `cycle.trigger_type != QUARTERLY_AUTO` antes de permitir encerramento manual. Esta feature não implementa essa verificação — é responsabilidade da 013.

- **`cycle_subject.status` como `String`:** a entidade `CycleSubject` usa `String` para `status` (não enum tipado), conforme código existente. O `CfSchedulerService` deve usar as constantes do enum `CycleSubjectStatus` convertidas para `String` (ex: `CycleSubjectStatus.COLLECTING.name()`) ao definir o status.