# Responder Avaliação como Convidado no CF — Backend

**Referência:** `business.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature permite que avaliadores convidados (tipo `GUEST`, que engloba pares, clientes internos e colaboradores de outros times) respondam o formulário de avaliação CF da sujeita sem precisar de login completo no sistema. O acesso ocorre via token opaco de uso único (UUID) enviado por notificação, resolvendo a questão em aberto do `business.md` de forma pragmática para o MVP.

A decisão de usar token público — em vez de autenticação JWT — é motivada pelo requisito de acessibilidade: avaliadores convidados podem não ter conta no sistema ou não estar logados no momento em que recebem a notificação. O token é armazenado no banco, possui validade implícita (vinculada ao prazo de coleta do ciclo) e é de uso único para escrita.

Não há rascunho automático: o avaliador preenche e submete em uma única sessão. Essa decisão elimina a necessidade de persistência intermediária de estado.

Camadas tocadas: novo controller público (sem `@PreAuthorize`), novo service (`GuestEvaluationService`), novo repositório (`EvaluationTokenRepository`), e repositórios existentes (`CycleEvaluatorRepository`, `CycleSubjectRepository`).

**Domínios afetados:**
- `cycle_evaluator` — leitura para validar o token e o estado do avaliador; escrita ao registrar a submissão (`status = COMPLETED`, `submitted_at`)
- `cycle_subject` — leitura para verificar se o ciclo ainda está em coleta e se o prazo não expirou
- `cycle` — leitura para validar `cycle_type = CF` e `status = COLLECTING`
- Nova tabela `evaluation_token` — armazena o token opaco e o vínculo com `cycle_evaluator`

## Modelo de dados

### Novas tabelas / alterações de schema

#### Nova tabela: `evaluation_token`

O token é separado da tabela `cycle_evaluator` porque um avaliador pode receber re-notificações (links gerados novamente), e para isolar a responsabilidade de autenticação de acesso público do registro de resposta.

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrição |
|--------|----------------|----------|---------|-----------|
| `id` | `UUID` | não | `gen_random_uuid()` | PK |
| `token` | `UUID` | não | `gen_random_uuid()` | UNIQUE NOT NULL |
| `cycle_evaluator_id` | `UUID` | não | — | FK → `cycle_evaluator.id` |
| `created_at` | `TIMESTAMPTZ` | não | `now()` | — |
| `used_at` | `TIMESTAMPTZ` | sim | `NULL` | — |
| `deleted_at` | `TIMESTAMPTZ` | sim | `NULL` | soft delete padrão |

- `token`: UUID opaco gerado no momento da notificação. É o valor que aparece na URL `/avaliar/cf/:token`. Nunca reutilizado — se um novo link for necessário, um novo registro é criado.
- `used_at`: preenchido no momento da submissão bem-sucedida. Usado para detectar tentativas de re-submissão (o token foi "gasto") sem depender apenas do `cycle_evaluator.status`.
- Relação com `cycle_evaluator`: muitos tokens podem existir para o mesmo avaliador (re-envios), mas apenas o mais recente com `used_at IS NULL` e `deleted_at IS NULL` é válido para escrita.

#### Nova tabela: `cf_evaluation_response`

Armazena o texto da resposta do avaliador. Separado de `cycle_evaluator` para manter a tabela de controle do ciclo enxuta e permitir auditar o conteúdo da resposta de forma independente.

| Coluna | Tipo PostgreSQL | Nullable | Default | Restrição |
|--------|----------------|----------|---------|-----------|
| `id` | `UUID` | não | `gen_random_uuid()` | PK |
| `cycle_evaluator_id` | `UUID` | não | — | FK → `cycle_evaluator.id`, UNIQUE |
| `response_text` | `TEXT` | não | — | NOT NULL, `length >= 1` |
| `submitted_at` | `TIMESTAMPTZ` | não | `now()` | — |
| `deleted_at` | `TIMESTAMPTZ` | sim | `NULL` | soft delete padrão |

- A constraint UNIQUE em `cycle_evaluator_id` implementa a regra de negócio "avaliador só pode responder uma vez" no nível de banco, como salvaguarda adicional à validação no service.
- `response_text` é TEXT sem limite máximo (formulário aberto conforme Regra 4).

#### Alteração em `cycle_evaluator`

Nenhuma coluna nova. A submissão é registrada atualizando campos já existentes:
- `status`: `PENDING` → `COMPLETED`
- `submitted_at`: preenchido com `now()` no momento da submissão

### Índices necessários

```sql
-- Resolução do token na chegada de cada requisição pública (hot path):
CREATE UNIQUE INDEX idx_evaluation_token_token
  ON evaluation_token (token)
  WHERE deleted_at IS NULL;

-- Lookup do token pelo cycle_evaluator_id (para geração/re-envio):
CREATE INDEX idx_evaluation_token_evaluator
  ON evaluation_token (cycle_evaluator_id)
  WHERE deleted_at IS NULL;

-- Busca de resposta por avaliador (verificação de resposta existente):
CREATE UNIQUE INDEX idx_cf_response_evaluator
  ON cf_evaluation_response (cycle_evaluator_id)
  WHERE deleted_at IS NULL;
```

### Estratégia de migração

A migração Liquibase deve:
1. Criar a tabela `evaluation_token` com PK, UNIQUE em `token`, FK para `cycle_evaluator.id` (ON DELETE CASCADE — se o avaliador for removido do ciclo, o token perde validade junto).
2. Criar a tabela `cf_evaluation_response` com PK, UNIQUE em `cycle_evaluator_id`, FK para `cycle_evaluator.id`.
3. Criar os três índices documentados acima.

Nenhum dado existente precisa de migração. Rollback é seguro: as tabelas são novas e não há dependência de código anterior sobre elas.

> Esta migração deve ser numerada após as migrações introduzidas pela feature 008 (que altera `cycle_subject` e `cycle_evaluator`). Verificar o último changeset aplicado antes de numerar.

## Contratos de API

### `GET /api/public/evaluations/cf/:token`

Retorna os dados necessários para renderizar o formulário de avaliação. Este é um endpoint **público** — não requer token JWT. A identidade do avaliador é estabelecida pelo `token` na URL.

O endpoint valida o token e retorna o contexto do ciclo (nome da sujeita, prazo) sem revelar dados sensíveis adicionais. O estado atual do avaliador (já respondeu? prazo expirado?) é retornado para que o frontend possa renderizar o estado correto sem chamadas adicionais.

- **Authorization:** nenhuma (endpoint público)
- **Path parameter:** `token` (UUID) — token opaco de acesso
- **Request body:** nenhum

**Validações:**
1. Token existe em `evaluation_token` com `deleted_at IS NULL`. Se não → `404`.
2. O `cycle_evaluator` vinculado tem `deleted_at IS NULL`. Se não → `404`.
3. O `cycle_subject` e `cycle` pai têm `deleted_at IS NULL`. Se não → `404`.

Após essas validações de existência, o endpoint **não** retorna erro para estados de "prazo expirado" ou "já respondeu" — retorna `200` com o estado (`evaluationState`) para que o frontend renderize a tela adequada.

- **Response `200`:**

```json
{
  "subjectName": "string",
  "cycleSubjectId": "uuid",
  "collectionDeadline": "ISO-8601 com timezone",
  "evaluationState": "OPEN" | "ALREADY_SUBMITTED" | "DEADLINE_EXPIRED" | "CYCLE_CLOSED",
  "alreadySubmittedAt": "ISO-8601 com timezone | null"
}
```

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `subjectName` | `string` | não | Nome do colaborador sendo avaliado (campo `users.name` do `cycle_subject.subject_user_id`) |
| `cycleSubjectId` | `UUID` | não | ID do `cycle_subject` — informativo para o frontend |
| `collectionDeadline` | `string (ISO-8601)` | não | Data limite de coleta do ciclo (`cycle.collection_deadline`) |
| `evaluationState` | `string` | não | Estado atual da avaliação para este avaliador; ver valores abaixo |
| `alreadySubmittedAt` | `string (ISO-8601)` | sim | Preenchido quando `evaluationState = "ALREADY_SUBMITTED"` |

**Valores de `evaluationState` e quando ocorrem:**

| Valor | Condição |
|-------|----------|
| `OPEN` | `cycle_evaluator.status = PENDING` E `now() <= cycle.collection_deadline` E `cycle_subject.status = COLLECTING` |
| `ALREADY_SUBMITTED` | `cycle_evaluator.status = COMPLETED` (o token foi gasto) |
| `DEADLINE_EXPIRED` | `now() > cycle.collection_deadline` — prazo de 10 dias encerrou |
| `CYCLE_CLOSED` | `cycle_subject.status IN (CLOSED, CANCELLED)` — ciclo encerrado manualmente ou pelo scheduler |

A lógica de prioridade na avaliação do estado: `ALREADY_SUBMITTED` > `CYCLE_CLOSED` > `DEADLINE_EXPIRED` > `OPEN`. Verificar nessa ordem.

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 200 | Token válido; estado retornado no corpo |
| 404 | Token não existe, foi deletado, ou o avaliador foi removido do ciclo |
| 500 | Erro inesperado |

**Edge cases:**
- Múltiplos tokens para o mesmo avaliador (re-envios): qualquer token válido (não deletado) resolve para o mesmo `cycle_evaluator`. O estado retornado reflete o `cycle_evaluator`, não o token específico.
- Token de avaliador cujo `cycle_evaluator.evaluator_type` não é `PEER` nem `GUEST`: o endpoint não restringe por tipo — o backend deve aceitar qualquer avaliador válido (SELF, PDM, PEER são todos resolvidos pelo mesmo mecanismo de token no MVP).

---

### `POST /api/public/evaluations/cf/:token`

Registra a resposta do avaliador convidado. Endpoint **público** — sem JWT.

A separação entre GET (visualizar) e POST (submeter) é intencional: garante idempotência na navegação (o usuário pode recarregar o formulário sem re-submeter) e alinha com semântica REST.

- **Authorization:** nenhuma (endpoint público)
- **Path parameter:** `token` (UUID) — token opaco de acesso
- **Request body:**

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `responseText` | `string` | sim | Não vazio; mínimo 1 caractere; máximo não definido (texto aberto) |

**Validações executadas no service, nesta ordem:**

1. Token existe em `evaluation_token` com `deleted_at IS NULL`. Se não → `404`.
2. O `cycle_evaluator` vinculado tem `deleted_at IS NULL`. Se não → `404`.
3. `cycle_evaluator.status = PENDING` (não foi respondido ainda). Se `status = COMPLETED` → `409` com `errorCode: "ALREADY_SUBMITTED"`.
4. `cycle_subject.status = COLLECTING`. Se diferente → `409` com `errorCode: "CYCLE_CLOSED"`.
5. `now() <= cycle.collection_deadline`. Se expirado → `409` com `errorCode: "DEADLINE_EXPIRED"`.
6. `responseText` não vazio após trim. Se vazio → `400`.

> A verificação de status do token (`evaluation_token.used_at IS NULL`) é feita como segunda barreira, mas a fonte de verdade para "já respondeu" é `cycle_evaluator.status`. Isso garante consistência mesmo se o `used_at` não tiver sido gravado por alguma falha transacional anterior.

**Lógica de submissão (em `@Transactional`):**

1. Criar registro em `cf_evaluation_response`:
   - `cycle_evaluator_id` = ID do avaliador vinculado ao token
   - `response_text` = `responseText` do body (após trim)
   - `submitted_at` = `now()`

2. Atualizar `cycle_evaluator`:
   - `status = COMPLETED`
   - `submitted_at = now()`

3. Atualizar `evaluation_token`:
   - `used_at = now()`

4. Após commit: chamar `NotificationService.notifyEvaluationSubmitted(cycleEvaluatorId)` — stub que loga no nível `INFO`.

> A constraint UNIQUE em `cf_evaluation_response.cycle_evaluator_id` serve como salvaguarda contra race conditions (duas requisições simultâneas com o mesmo token). Se a inserção violar a UNIQUE constraint, o banco lançará exceção — o `GlobalExceptionHandler` deve capturar `DataIntegrityViolationException` neste contexto e retornar `409` com `errorCode: "ALREADY_SUBMITTED"`.

- **Response `201 Created`:** sem corpo

**Status codes:**

| Código | Quando ocorre |
|--------|--------------|
| 201 | Resposta registrada com sucesso |
| 400 | `responseText` ausente ou vazio após trim |
| 404 | Token não existe ou avaliador removido do ciclo |
| 409 | Avaliador já respondeu (`ALREADY_SUBMITTED`); prazo expirado (`DEADLINE_EXPIRED`); ciclo encerrado (`CYCLE_CLOSED`) |
| 500 | Erro inesperado na transação |

**Edge cases:**
- Race condition com duas submissões simultâneas do mesmo token: a UNIQUE constraint em `cf_evaluation_response` garante que apenas uma seja aceita. A segunda recebe `409 ALREADY_SUBMITTED` via `DataIntegrityViolationException`.
- `responseText` com apenas espaços em branco: deve ser rejeitado como vazio após trim (`400`).

---

### `POST /api/evaluation-tokens` (interno — acesso autenticado)

Gera ou regenera o token de acesso para um avaliador específico. Chamado internamente pelo `NotificationService` ao notificar avaliadores sobre o início da coleta, e pela funcionalidade de re-envio (fora do escopo desta feature, mas o endpoint deve ser projetado para suportá-la).

Este endpoint é interno (requer JWT) e não é acessado diretamente pelo avaliador convidado.

- **Authorization:** perfis `CIETER`, `PDM` e processos de sistema (schedulers que chamam via `RestTemplate` ou diretamente pelo service)

> Na prática, este endpoint pode ser implementado como um método de service chamado internamente, sem exposição HTTP, se a geração de tokens acontecer apenas dentro da mesma JVM. Expor como endpoint HTTP é necessário apenas se houver necessidade de re-envio manual por um ator humano. Para o MVP, implementar como método de service é suficiente.

**Contrato do método de service:**

```
generateToken(UUID cycleEvaluatorId) → UUID token
  - Cria registro em evaluation_token vinculado ao cycleEvaluatorId
  - Retorna o UUID do token gerado
  - Chamado pelo fluxo de notificação após transição do ciclo para COLLECTING
```

---

## Geração de tokens e momento de disparo

> A geração do token deve ocorrer quando o ciclo transita para `status = COLLECTING` — seja por confirmação explícita do colaborador (feature 008), seja por expiração automática do scheduler de validação (feature 008). Neste momento, o `GuestEvaluationService` deve gerar tokens para todos os `cycle_evaluator` do ciclo com `evaluator_type` diferente de `SELF` e `PDM` (avaliadores que precisam de link para acessar o formulário) e chamar `NotificationService` para cada um.

Para avaliadores SELF e PDM, o acesso ao formulário será feito via autenticação normal (features 010 e 011 respectivamente) — não via token público. Esta feature cobre apenas avaliadores convidados (tipo `PEER` e futuro `GUEST`).

## Queries de repositório necessárias

### `EvaluationTokenRepository` — novo repositório

```
-- Resolve token para acesso público:
findByTokenAndDeletedAtIsNull(UUID token) → Optional<EvaluationToken>

-- Verifica se avaliador já tem token ativo (para evitar duplicatas desnecessárias):
findActiveByEvaluatorId(UUID cycleEvaluatorId) → Optional<EvaluationToken>
  WHERE cycle_evaluator_id = :cycleEvaluatorId
    AND deleted_at IS NULL
    AND used_at IS NULL
```

### `CfEvaluationResponseRepository` — novo repositório

```
-- Verifica existência de resposta para o avaliador:
existsByCycleEvaluatorId(UUID cycleEvaluatorId) → boolean
  WHERE cycle_evaluator_id = :cycleEvaluatorId AND deleted_at IS NULL
```

### `CycleEvaluatorRepository` — queries já definidas (reutilizar)

```
-- Já definida em 008:
findByCycleSubjectId(UUID cycleSubjectId) → List<CycleEvaluator>
```

### `CycleSubjectRepository` — queries já definidas (reutilizar)

```
-- Já definida em 008:
findByIdAndSubjectUserId(UUID cycleSubjectId, UUID userId) → Optional<CycleSubject>
```

## Requisitos de qualidade

- [x] I/O-bound: o `POST /api/public/evaluations/cf/:token` executa 4–5 operações de banco em sequência (validações + inserção + 2 updates). Dado o volume esperado (submissões não são concorrentes para o mesmo token), virtual threads são opcionais no MVP. O endpoint público não autentica via JWT, o que elimina o overhead do filtro de segurança Spring.
- [x] GraalVM AOT: DTOs de request e response implementados como Java records. O `EvaluationState` é um enum Java. Nenhuma reflection não declarada.
- [x] Dados sensíveis: o `token` é um UUID opaco — não carrega informação pessoal. O `response_text` contém feedback potencialmente sensível (avaliação de desempenho). Garantir que nenhum log de aplicação persista o conteúdo de `response_text` — logar apenas IDs e estados. Em produção, considerar criptografia em repouso para a coluna `response_text`.
- [x] Autorização: os endpoints públicos (`/api/public/**`) devem ser configurados no `SecurityConfig` como `permitAll()`. Não usar `@PreAuthorize` — a validação de acesso é feita pelo token opaco no service. O endpoint interno de geração de tokens (se exposto via HTTP) deve estar sob a proteção JWT padrão.

## Estratégia de testes

**Fluxo principal — visualização do formulário:**
- Token válido, ciclo em coleta, avaliador não respondeu → `200` com `evaluationState = "OPEN"`, `subjectName` preenchido, `collectionDeadline` correto.
- Token válido, avaliador já respondeu → `200` com `evaluationState = "ALREADY_SUBMITTED"` e `alreadySubmittedAt` preenchido.
- Token válido, prazo expirado → `200` com `evaluationState = "DEADLINE_EXPIRED"`.
- Token válido, ciclo encerrado manualmente → `200` com `evaluationState = "CYCLE_CLOSED"`.

**Fluxo principal — submissão:**
- Token válido, ciclo aberto, `responseText` preenchido → `201`; `cf_evaluation_response` criado; `cycle_evaluator.status = COMPLETED`; `evaluation_token.used_at` preenchido.
- Verificar que `NotificationService.notifyEvaluationSubmitted` é chamado após o commit.

**Casos de erro esperados:**
- Token inexistente → `404`.
- Token com `deleted_at` preenchido → `404`.
- `responseText` vazio ou apenas espaços → `400`.
- Submissão após `cycle_evaluator.status = COMPLETED` → `409 ALREADY_SUBMITTED`.
- Submissão após `cycle.collection_deadline` expirado → `409 DEADLINE_EXPIRED`.
- Submissão com `cycle_subject.status = CLOSED` → `409 CYCLE_CLOSED`.
- Tentativa de segunda submissão simultânea (race condition) → uma das duas recebe `409 ALREADY_SUBMITTED` via `DataIntegrityViolationException`.

**Casos de autorização:**
- Requisição sem token JWT para `/api/public/evaluations/cf/:token` → deve ser aceita (endpoint público).
- Requisição com JWT válido para endpoint público → deve ser aceita (JWT é ignorado nesta rota).
- Endpoint de geração de token (se exposto via HTTP) sem JWT → `401`.

**Edge cases de regras de negócio:**
- Avaliador com múltiplos tokens (re-envios): qualquer token ativo resolve para o mesmo `cycle_evaluator`; o estado retornado é o do avaliador, não do token.
- `responseText` com 1 caractere → aceito.
- Geração de token para avaliador SELF ou PDM: o service deve filtrar para não gerar tokens para esses tipos (features 010 e 011 usam autenticação normal).

## Riscos técnicos e dependências

- **Dependência da feature 008:** a geração dos tokens de acesso deve ocorrer no momento em que o ciclo transita para `COLLECTING`. Esse momento é controlado pela feature 008 (confirmação explícita ou expiração do scheduler de validação). O `GuestEvaluationService` desta feature precisa ser chamado por dentro do fluxo de transição da feature 008. A coordenação entre esses dois domínios deve ser decidida antes da implementação: o `CycleValidationService` (008) chama o `GuestEvaluationService` (009), ou há um evento/observer? No MVP, chamada direta entre services é aceitável.

- **Segurança do endpoint público:** `/api/public/**` deve ser configurado como `permitAll()` no `SecurityConfig`. Verificar que esse path não conflita com outros endpoints existentes e que o padrão de rota está correto no `SecurityFilterChain`. Um erro de configuração pode expor outros endpoints publicamente.

- **Expiração de tokens vs. expiração do ciclo:** a validade do token é implícita (vinculada ao prazo de coleta do ciclo). Não há `expires_at` na tabela `evaluation_token`. Isso significa que um token tecnicamente "ativo" (sem `used_at` e sem `deleted_at`) pode existir para um ciclo já encerrado — o service trata isso retornando `DEADLINE_EXPIRED` ou `CYCLE_CLOSED`. Esse comportamento é intencional e suficiente para o MVP.

- **Anonimização (Regra 15):** a Regra 15 determina que o mínimo de 3 respondentes é necessário para exibir respostas na sumarização. Essa regra não afeta esta feature (que apenas coleta a resposta), mas afeta a feature 014 (`visualizar-resumo-cf`). Registrar que `cf_evaluation_response` deve ser lida em conjunto com a contagem de respondentes antes de exibir qualquer conteúdo.

- **Volume de dados em `response_text`:** respostas de texto aberto podem ser longas. A coluna `TEXT` no PostgreSQL não tem limite, mas textos muito longos afetam a performance de queries que fazem join com essa tabela. A feature 014 (sumarização) e a feature 034 (sumarização por IA) devem buscar `response_text` apenas quando necessário, não em queries de listagem/contagem.

- **Re-envio de notificações e tokens:** se o sistema precisar re-enviar o link para um avaliador, um novo token deve ser criado (novo registro em `evaluation_token`). O token anterior não é invalidado automaticamente — ambos ficam ativos até que um deles seja usado. Essa ambiguidade é aceitável no MVP (qualquer token ativo funciona), mas deve ser documentada para implementações futuras que queiram invalidar tokens anteriores no re-envio.

- **`GlobalExceptionHandler` e `DataIntegrityViolationException`:** o handler existente pode não ter mapeamento específico para violação de UNIQUE constraint em `cf_evaluation_response`. Verificar se o `GlobalExceptionHandler` atual captura `DataIntegrityViolationException` e, se não, adicionar o mapeamento para retornar `409 ALREADY_SUBMITTED` neste contexto específico — sem expor detalhes do banco no corpo da resposta.
