# Encerrar CF Manual pela Sujeita — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature expõe um único endpoint de escrita (`POST /api/me/ciclos/cf/{cycleSubjectId}/encerrar`) que permite ao colaborador autenticado encerrar antecipadamente um ciclo CF manual do qual é a sujeita. Nenhuma nova tabela é necessária — a operação atualiza `cycle.status` e `cycle_subject.status` para `CLOSED` nas entidades já existentes.

O encerramento é autorizado apenas para ciclos com `trigger_type IN ('MANUAL_SUBJECT', 'MANUAL_PDM')` — os dois valores que representam CF manual conforme o enum `TriggerType` já definido em código. Ciclos automáticos (`QUARTERLY_AUTO`, `EVENT`) não são encerráveis manualmente pela sujeita (Regra 7).

A validação de posse usa `cycle_subject.subject_user_id == userId do JWT`, garantindo que apenas a própria sujeita pode acionar o encerramento. Não há body na requisição — todos os parâmetros de negócio são derivados do path e do JWT.

Após o encerramento, o `NotificationService` é chamado com um novo método `notifyCfClosedBySubject`, que segue o padrão de stub (log `INFO`) já estabelecido no projeto.

**Camadas tocadas:**
- Controller: novo `CfCloseController` (ou método adicionado em `MeController` — decisão do agente de implementação)
- Service: novo `CfCloseService`
- Repositórios existentes: `CycleSubjectRepository` (nova query para busca com `JOIN FETCH cycle`), `CycleRepository` (save)
- `NotificationService`: novo método `notifyCfClosedBySubject`

**Domínios afetados:**
- `cycle_subject` — leitura e escrita: busca por ID, atualização de `status` e `closed_at`
- `cycle` — escrita: atualização de `status` e `closed_at`
- `users` — nenhuma leitura adicional; `userId` vem exclusivamente do JWT

**Dependência de cross-feature:** o `CfProgressDto` da feature 012 não inclui o campo `triggerType`. Para que o frontend possa decidir se exibe o botão "Encerrar CF" sem uma chamada adicional, o `CfProgressDto` precisa ser estendido com `initiatedBy: String`. Essa extensão deve ser implementada em conjunto com esta feature. Ver seção de riscos.

## Modelo de dados

### Novas tabelas / alterações de schema

Nenhuma nova tabela. Nenhuma nova coluna. Todas as tabelas e colunas utilizadas já existem:

- `cycle` — leitura de `cycle_type`, `trigger_type`, `status`; escrita em `status` e `closed_at`
- `cycle_subject` — leitura de `subject_user_id`, `status`, `cycle_id`, `deleted_at`; escrita em `status`, `closed_at`, `closed_by`

As colunas `closed_at` (tipo `TIMESTAMP WITH TIME ZONE`, nullable) e `closed_by` (tipo `UUID`, nullable) já existem em `cycle_subject` conforme a entidade `CycleSubject.java`. A coluna `closed_at` também existe em `cycle`.

Os valores do enum `TriggerType` já incluem `MANUAL_SUBJECT` e `MANUAL_PDM` — confirmado na migration `004-update-trigger-type-constraint.sql` e no enum Java. Nenhuma migração de check constraint é necessária.

O valor `CLOSED` já existe no enum `CycleStatus` (`CycleStatus.java`). Nenhuma migração de enum necessária.

### Estratégia de migração

Nenhuma migração necessária. Rollback não se aplica.

### Índices utilizados (já existentes)

Os índices abaixo cobrem os filtros desta feature sem criação adicional:

```sql
-- Localização do cycle_subject pelo ID (chave primária — idx implícito):
PRIMARY KEY ON cycle_subject (id)

-- Já definido em 001.modelo-de-dados:
idx_subject_user  ON cycle_subject (subject_user_id)
```

A busca principal é por `cycle_subject.id` (UUID — primary key), logo sem necessidade de índice adicional.

## Contratos de API

### `POST /api/me/ciclos/cf/{cycleSubjectId}/encerrar`

Encerra antecipadamente um ciclo CF manual do qual o colaborador autenticado é a sujeita. A ação é irreversível — não existe endpoint de reabertura.

- **Authorization:** `@PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")`
- **Path parameter:** `cycleSubjectId` (UUID) — ID do registro `cycle_subject`
- **Request body:** nenhum
- **Response `204 No Content`:** sem corpo

**Validações executadas no service, nesta ordem:**

> A ordem de validação importa: as verificações 1 e 2 retornam `404` para não vazar informações sobre ciclos de outros usuários antes de confirmar a posse.

1. `cycleSubject` existe e `deleted_at IS NULL` → se não: `404`
2. `cycle.cycle_type == CycleType.CF` → se não: `404` (ciclos de PR não são encerráveis por esta feature)
3. `cycle_subject.subject_user_id == userId do JWT` → se não: `403` (colaborador não é a sujeita deste ciclo)
4. `cycle.trigger_type IN (TriggerType.MANUAL_SUBJECT, TriggerType.MANUAL_PDM)` → se não: `409` com `errorCode: "NOT_MANUAL_CYCLE"` (Regra 7: ciclos automáticos/por evento não podem ser encerrados pela sujeita)
5. `cycle_subject.status == "COLLECTING"` → se não: `409` com `errorCode: "CYCLE_ALREADY_CLOSED"` (encerramento duplicado ou ciclo em estado inválido para encerramento)

> A validação 3 (posse) é feita após confirmar existência e tipo (validações 1 e 2) para evitar vazar a existência de `cycleSubjectId` de terceiros. A validação 4 (tipo manual) vem antes da validação 5 (status) porque o erro "não é CF manual" é conceitualmente diferente de "já está encerrado" e deve ser comunicado distintamente ao frontend.

**Ação executada (em `@Transactional`, após todas as validações passarem):**

```
cycle_subject.status    = 'CLOSED'
cycle_subject.closed_at = now()
cycle_subject.closed_by = userId (do JWT)

cycle.status    = 'CLOSED'
cycle.closed_at = now()
```

Após o commit da transação:
- Chamar `notificationService.notifyCfClosedBySubject(cycleSubjectId)` — stub que loga no nível `INFO`.

**Formato das respostas de erro `409`:**

```json
{ "errorCode": "NOT_MANUAL_CYCLE" }
```

```json
{ "errorCode": "CYCLE_ALREADY_CLOSED" }
```

Ambas são serializadas pelo `GlobalExceptionHandler` via `EvaluationConflictException(errorCode)` → `EvaluationConflictResponse` (record já existente no projeto).

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 204 | Ciclo encerrado com sucesso |
| 400 | `cycleSubjectId` não é um UUID válido (falha de binding no Spring) |
| 401 | Token JWT ausente, expirado ou inválido |
| 403 | `cycle_subject.subject_user_id` não corresponde ao `userId` do JWT |
| 404 | `cycleSubjectId` não existe, `deleted_at IS NOT NULL`, ou o ciclo pai não é do tipo CF |
| 409 | Ciclo não é manual (`NOT_MANUAL_CYCLE`) ou já está encerrado (`CYCLE_ALREADY_CLOSED`) |
| 500 | Erro inesperado na transação |

**Edge cases:**

- Ciclo com `status = CANCELLED`: cai na validação 5 (`status != COLLECTING`) → `409 CYCLE_ALREADY_CLOSED`. Comportamento aceitável — ciclo cancelado também não pode ser encerrado manualmente.
- Corrida entre encerramento manual (este endpoint) e encerramento automático pelo scheduler (Regra 12): ambos atualizam `cycle.status = CLOSED`. O segundo a executar encontrará `status != COLLECTING` na validação 5 e retornará `409`. A transação do scheduler deve ser robusta a esse caso (já implementada na feature 004, independentemente desta feature).
- Notificação (`notifyCfClosedBySubject`) lança exceção: não deve reverter a transação. Chamar após o commit ou encapsular em bloco try-catch separado.

## DTOs

```
// Sem novos DTOs de request ou response para o endpoint de encerramento.
// Erros de conflito usam EvaluationConflictResponse já existente: record(String errorCode)
// Erros 404 usam NotFoundResponse já existente: record(String message)

// Extensão necessária em CfProgressDto (feature 012) para suportar o frontend desta feature:
// Adicionar campo:
//   String initiatedBy   — valor de cycle.trigger_type serializado como string
//                          (ex: "MANUAL_SUBJECT", "MANUAL_PDM", "QUARTERLY_AUTO", "EVENT")
// O frontend usa esse campo para decidir se exibe o botão "Encerrar CF".
```

## Queries de repositório necessárias

### `CycleSubjectRepository` — nova query

```
-- Busca o cycle_subject pelo ID com JOIN FETCH do ciclo pai para acessar trigger_type e cycle_type
-- sem lazy loading. Reutiliza padrão já existente em findByIdWithCycleAndSubjectUser.
findByIdAndDeletedAtIsNullWithCycle(UUID cycleSubjectId) → Optional<CycleSubject>
  SELECT cs FROM CycleSubject cs
  JOIN FETCH cs.cycle c
  WHERE cs.id = :cycleSubjectId
  AND cs.deletedAt IS NULL
```

> A query `findByIdWithCycleAndSubjectUser` já existente no repositório faz `JOIN FETCH cs.subjectUser` além do ciclo. Para o encerramento, o `subjectUser` não é necessário — apenas o `cycle` (para validar `trigger_type` e `cycle_type`). Criar a nova query sem o JOIN desnecessário. Se o agente preferir reutilizar a existente, o custo extra de carregar o `subjectUser` é negligenciável.

### `CycleRepository` — nenhuma nova query

O save do `Cycle` usa o `CycleRepository.save(cycle)` já disponível via `JpaRepository`.

### `NotificationService` — novo método

```java
public void notifyCfClosedBySubject(UUID cycleSubjectId) {
    log.info("CF encerrado manualmente pela sujeita: cycleSubjectId={}", cycleSubjectId);
}
```

## Extensão do `CfProgressDto` (dependência com feature 012)

O `CfProgressDto` atual não expõe o `trigger_type` do ciclo, mas o frontend desta feature precisa saber se o ciclo é manual para decidir se renderiza o botão "Encerrar CF". Portanto, o record `CfProgressDto.java` deve ser estendido com um campo `initiatedBy`:

```
// CfProgressDto.java — adicionar campo:
String initiatedBy   // cycle.trigger_type.name(), ex: "MANUAL_SUBJECT", "MANUAL_PDM"
```

O `CfProgressService.getForSubject(...)` (feature 012) já carrega o `CycleSubject` com `JOIN FETCH cs.cycle`, portanto `cycle.getTriggerType()` está disponível sem query adicional. A montagem do DTO deve incluir `cycle.getTriggerType() != null ? cycle.getTriggerType().name() : null`.

A mesma extensão pode ser aplicada ao `PdmCfProgressDto` por consistência, mas não é necessária para o comportamento desta feature (o PDM não possui botão de encerramento).

## Requisitos de qualidade

- [ ] I/O-bound identificado? O endpoint executa 2 queries sequenciais (busca do `cycle_subject` com `JOIN FETCH cycle` + save do `cycle` e `cycle_subject`). Virtual threads não são necessários dado o volume esperado no MVP.
- [ ] GraalVM AOT: nenhum novo DTO é introduzido. `EvaluationConflictResponse` e `NotFoundResponse` já são Java records. Nenhuma reflection não declarada.
- [ ] Dados sensíveis: nenhum dado sensível exposto. O `userId` de controle de posse vem exclusivamente do JWT — não há parâmetro de request que controle a identidade do ator.
- [ ] Autorização por perfil coberta: `@PreAuthorize("hasAnyAuthority('CIETER', 'PDM')")` garante o role. A validação de `subject_user_id == userId` no service garante o escopo de propriedade do recurso. Essas duas camadas devem coexistir.

## Estratégia de testes

**Fluxo principal (happy path):**
- Colaborador `CIETER` autenticado, dono do `cycleSubjectId`, ciclo do tipo CF com `trigger_type = MANUAL_SUBJECT` e `status = COLLECTING` → resposta `204`; verificar que `cycle.status = CLOSED`, `cycle_subject.status = CLOSED`, `cycle_subject.closed_by = userId`, `cycle.closed_at` e `cycle_subject.closed_at` preenchidos com timestamp atual.
- Repetir cenário com `trigger_type = MANUAL_PDM` → resposta `204`.

**Casos de erro esperados:**
- `cycleSubjectId` inexistente → `404`.
- `cycleSubjectId` com `deleted_at IS NOT NULL` → `404`.
- `cycleSubjectId` de um ciclo do tipo PR → `404`.
- Colaborador autenticado não é a `subject_user_id` do `cycleSubject` → `403`.
- Ciclo com `trigger_type = QUARTERLY_AUTO` → `409` com `errorCode = "NOT_MANUAL_CYCLE"`.
- Ciclo com `trigger_type = EVENT` → `409` com `errorCode = "NOT_MANUAL_CYCLE"`.
- Ciclo já `CLOSED` → `409` com `errorCode = "CYCLE_ALREADY_CLOSED"`.
- Ciclo com `status = CANCELLED` → `409` com `errorCode = "CYCLE_ALREADY_CLOSED"`.
- Requisição sem token JWT → `401`.
- `cycleSubjectId` não é UUID válido → `400`.

**Casos de autorização:**
- Token de perfil `CALIBRATOR` (sem `CIETER` ou `PDM`) → `403` via `@PreAuthorize`.
- Colaborador A não pode encerrar ciclo cuja `subject_user_id` é o colaborador B → `403`.
- PDM com perfil `PDM` que não é sujeita do ciclo → `403` (validação de `subject_user_id`).

**Edge cases de regras de negócio:**
- Encerramento concorrente (dois requests simultâneos para o mesmo `cycleSubjectId`): o segundo deve retornar `409 CYCLE_ALREADY_CLOSED` após o primeiro commit. Verificar comportamento sob concorrência básica com `@Transactional`.
- `notifyCfClosedBySubject` lança exceção: a transação não deve ser revertida. O ciclo deve permanecer encerrado.

## Riscos técnicos e dependências

- **Extensão obrigatória do `CfProgressDto` (feature 012):** o campo `initiatedBy` precisa ser adicionado ao `CfProgressDto` e populado no `CfProgressService`. Sem essa extensão, o frontend não consegue decidir se exibe o botão "Encerrar CF" sem uma chamada adicional. Essa modificação toca código já implementado — o agente deve verificar se `CfProgressService.getForSubject` já carrega `cycle.triggerType` antes de introduzir a extensão.

- **`NotificationService.notifyCfClosedBySubject` não existe ainda:** o método precisa ser adicionado ao `NotificationService.java` antes de ser chamado pelo `CfCloseService`. É um stub simples (log `INFO`), mas a ausência causaria erro de compilação.

- **Scheduler de encerramento automático (feature 004) e encerramento manual:** o scheduler busca ciclos CF com `status = COLLECTING` e prazo vencido. Após o encerramento manual por este endpoint, o ciclo já estará com `status = CLOSED` — o scheduler o ignorará naturalmente na próxima execução. Nenhum conflito de lógica, mas deve ser considerado em testes de integração.

- **`CycleSubject.closedBy` já existe na entidade:** confirmado no `CycleSubject.java` — o campo `closedBy` é do tipo `UUID` e já está mapeado. Não é necessária nenhuma adição ao modelo.

- **Ausência de colunas `closed_at` em `cycle`:** a entidade `Cycle.java` já possui `closedAt: Instant`. Confirmar que a coluna correspondente existe no schema antes de persistir. O `002-domain-schema.sql` deve defini-la — o agente deve verificar antes de implementar.
