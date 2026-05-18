# Submeter Avaliação do PDM sobre o Liderado no CF — Frontend

**Referência:** `business.md` e `backend.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature introduz a tela `PdmCfEvaluationPage` na rota `/meu-time/:colaboradorId/cf/:id/avaliar`, acessada pelo PDM autenticado a partir da tela `/meu-time` após selecionar um liderado com CF ativo na fase de coleta.

O ator é exclusivamente o PDM, identificado pelo JWT. O parâmetro `:colaboradorId` é o `subjectUser.id` do liderado e `:id` é o `cycleSubjectId`. A tela é renderizada dentro do `AppShell` com `PrivateRoute` restrito ao perfil `PDM`.

Diferente das features 009 (avaliador convidado, campo único) e 010 (autoavaliação, campo único), esta feature exibe **três campos de texto independentes**: Resultado, Prontidão e Action. Cada campo tem seu próprio estado de alerta de IA — a heurística é aplicada individualmente por campo ao perder foco ou ao tentar submeter.

O padrão de rascunho automático (debounce de 1s) e a transição para modo somente leitura após submissão (re-fetch do GET em vez de navegação para rota separada) seguem os padrões estabelecidos na feature 010.

**Componentes reutilizados das features anteriores:** `EvaluationFormSkeleton`, `AiAlert`, `EvaluationErrorState` (com suporte ao `errorType "FORBIDDEN"` já adicionado na feature 010).

**Componentes novos desta feature:** `PdmCfEvaluationPage`, `PdmCfForm`, `PdmEvaluationReadOnlyView`, `PdmEvaluationBlockedState`.

## Rotas e navegação

| Rota | Componente de página | Propósito |
|------|---------------------|-----------|
| `/meu-time/:colaboradorId/cf/:id/avaliar` | `PdmCfEvaluationPage` | Formulário de avaliação PDM para o liderado no ciclo CF |

- `:colaboradorId` — `subjectUser.id` do liderado (UUID)
- `:id` — `cycleSubjectId` do ciclo do liderado (UUID)

**Entrada:** card do liderado na tela `/meu-time`, visível quando o CF está ativo na fase `COLLECTING` e a avaliação PDM está `PENDING`. O link e a tela `/meu-time` são dependência não coberta por esta feature (ver seção de riscos).

**Transições a partir de `/meu-time/:colaboradorId/cf/:id/avaliar`:**
- Estado `OPEN` + submissão bem-sucedida (`201`) → mesma rota; re-fetch do GET → exibe `PdmEvaluationReadOnlyView` (sem navegar para nova URL)
- Estado `ALREADY_SUBMITTED` (na montagem ou após submissão) → exibe `PdmEvaluationReadOnlyView` inline
- Estado `CYCLE_NOT_COLLECTING` ou `DEADLINE_EXPIRED` → exibe `PdmEvaluationBlockedState` inline
- Erro de API `404` → exibe `EvaluationErrorState` com `errorType = "NOT_FOUND"`
- Erro de API `403` → exibe `EvaluationErrorState` com `errorType = "FORBIDDEN"`
- Erro de API `500` → exibe `EvaluationErrorState` com `errorType = "SERVER_ERROR"` + botão retry
- Sair sem submeter → rascunho mantido no backend; PDM pode retornar pelo mesmo link

```
/meu-time  ← lista de liderados do PDM (dependência externa — ver riscos)
  └── [card do liderado — CF ativo — fase: COLLECTING — avaliação: PENDING]
        └── /meu-time/:colaboradorId/cf/:id/avaliar  (PdmCfEvaluationPage)
              ├── [loading]                      → EvaluationFormSkeleton
              ├── [404 — sem vínculo PDM]        → EvaluationErrorState ("NOT_FOUND")
              ├── [403 — path inconsistente]     → EvaluationErrorState ("FORBIDDEN")
              ├── [500 — erro de servidor]        → EvaluationErrorState ("SERVER_ERROR") + retry
              ├── [CYCLE_NOT_COLLECTING]          → PdmEvaluationBlockedState (razão: coleta)
              ├── [DEADLINE_EXPIRED]              → PdmEvaluationBlockedState (razão: prazo)
              ├── [ALREADY_SUBMITTED]             → PdmEvaluationReadOnlyView (3 campos + data)
              └── [OPEN]                          → PdmCfForm
                    ├── [onChange em qualquer campo — debounce 1s]
                    │     └── PUT /draft (silencioso; erro não bloqueia edição)
                    ├── [onBlur em campo individual]
                    │     ├── [campo < 100 chars OU sem palavras de contexto] → AiAlert inline naquele campo
                    │     └── [campo suficiente] → sem alerta naquele campo
                    ├── [submeter] → valida todos os campos → POST /submit
                    │     ├── [201] → re-fetch GET → PdmEvaluationReadOnlyView
                    │     ├── [409 ALREADY_SUBMITTED] → re-fetch GET → PdmEvaluationReadOnlyView
                    │     ├── [409 CYCLE_NOT_COLLECTING] → re-fetch GET → PdmEvaluationBlockedState
                    │     ├── [409 DEADLINE_EXPIRED] → PdmEvaluationBlockedState inline
                    │     └── [400/500] → mensagem de erro inline; formulário permanece editável
                    └── [sair sem submeter] → rascunho salvo → /meu-time
```

**Ajuste em `routes.tsx`:** adicionar rota `path="/meu-time/:colaboradorId/cf/:id/avaliar"` dentro do bloco de `PrivateRoute` / `AppShell`, restrita ao perfil `PDM`.

**Ajuste em `/meu-time`:** adicionar link "Avaliar CF" no card do liderado quando o CF do liderado estiver ativo na fase `COLLECTING` e `cycle_evaluator.status = PENDING` para o PDM autenticado. O link navega para `/meu-time/:colaboradorId/cf/:cycleSubjectId/avaliar`. Se `evaluatorStatus = RESPONDED`, o link pode exibir "Ver avaliação enviada". A tela `/meu-time` e seu endpoint de listagem de liderados são dependência não coberta por esta feature — o ajuste no card é descrito aqui para orientar a implementação quando a tela existir.

## Componentes

### `PdmCfEvaluationPage`

- **Tipo:** page
- **Propósito:** Página raiz da rota `/meu-time/:colaboradorId/cf/:id/avaliar`. Extrai `colaboradorId` e `cycleSubjectId` dos path params (`useParams`), executa o GET na montagem e orquestra todos os estados de UI. Único componente com acesso direto à API — todos os filhos são stateless ou têm estado local de UI.
- **Props:** nenhuma (lê params via hook de router)
- **Estado interno:**

| State | Tipo | Descrição |
|-------|------|-----------|
| `evaluationData` | `PdmEvaluationContextDTO \| null` | Resposta do GET; null enquanto carregando ou em erro |
| `loading` | `boolean` | `true` durante o GET inicial e após submissão (re-fetch) |
| `apiError` | `"NOT_FOUND" \| "FORBIDDEN" \| "SERVER_ERROR" \| null` | Erro do GET |
| `resultado` | `string` | Conteúdo do campo Resultado (inicializado com `draft.resultadoDraft` do GET ou `""`) |
| `prontidao` | `string` | Conteúdo do campo Prontidão (inicializado com `draft.prontidaoDraft` do GET ou `""`) |
| `action` | `string` | Conteúdo do campo Action (inicializado com `draft.actionDraft` do GET ou `""`) |
| `draftSaving` | `boolean` | `true` enquanto o `PUT /draft` está em voo |
| `draftError` | `boolean` | `true` se o último `PUT /draft` falhou |
| `isSubmitting` | `boolean` | `true` durante o `POST /submit` |
| `submitError` | `"VALIDATION_ERROR" \| "SERVER_ERROR" \| null` | Erro do POST não relacionado a estado de negócio |
| `aiAlerts` | `{ resultado: boolean; prontidao: boolean; action: boolean }` | Exibição do `AiAlert` por campo |
| `aiAlertsDismissed` | `{ resultado: boolean; prontidao: boolean; action: boolean }` | Alerta dispensado por campo; reexibir se o campo for modificado |

---

### `PdmCfForm`

- **Tipo:** form
- **Propósito:** Renderiza o formulário com os três campos de texto aberto quando `evaluationState = "OPEN"`. Exibe nome do liderado, prazo, os três campos com seus respectivos alertas de IA, botão de submissão e indicador de salvamento automático. Componente controlado — delega estado ao `PdmCfEvaluationPage`.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `subjectName` | `string` | sim | Nome do liderado; exibido no cabeçalho do formulário |
| `collectionDeadline` | `string \| null` | não | ISO-8601 do prazo; exibido como informação contextual; "Sem prazo definido" se nulo |
| `resultado` | `string` | sim | Valor atual do campo Resultado (controlado pelo pai) |
| `prontidao` | `string` | sim | Valor atual do campo Prontidão (controlado pelo pai) |
| `action` | `string` | sim | Valor atual do campo Action (controlado pelo pai) |
| `isSubmitting` | `boolean` | sim | Desabilita campos e botão durante o POST |
| `draftSaving` | `boolean` | sim | Exibe indicador "Salvando..." discreto |
| `draftError` | `boolean` | sim | Exibe aviso não bloqueante de erro de rascunho |
| `submitError` | `string \| null` | não | Mensagem de erro abaixo do botão após falha no POST |
| `aiAlerts` | `{ resultado: boolean; prontidao: boolean; action: boolean }` | sim | Controla exibição do `AiAlert` por campo |
| `onResultadoChange` | `(text: string) => void` | sim | Callback a cada keystroke no campo Resultado |
| `onProntidaoChange` | `(text: string) => void` | sim | Callback a cada keystroke no campo Prontidão |
| `onActionChange` | `(text: string) => void` | sim | Callback a cada keystroke no campo Action |
| `onResultadoBlur` | `() => void` | sim | Dispara heurística de IA para o campo Resultado |
| `onProntidaoBlur` | `() => void` | sim | Dispara heurística de IA para o campo Prontidão |
| `onActionBlur` | `() => void` | sim | Dispara heurística de IA para o campo Action |
| `onSubmit` | `() => void` | sim | Callback ao clicar em "Enviar avaliação" |
| `onAiAlertDismiss` | `(field: "resultado" \| "prontidao" \| "action") => void` | sim | Callback ao dispensar alerta de um campo específico |

- **Estado interno:** nenhum (stateless)

**Comportamento de submissão:** ao clicar em "Enviar avaliação", o pai (`PdmCfEvaluationPage`) executa a validação de IA em todos os campos antes de chamar a API. Se algum campo tiver alerta ativo e não dispensado, os alertas são exibidos e a chamada à API não ocorre. Somente quando todos os campos estão sem alerta ativo (ou com alerta dispensado) o POST é executado.

---

### `PdmEvaluationReadOnlyView`

- **Tipo:** section
- **Propósito:** Exibe os três campos da avaliação submetida em modo somente leitura, com data e hora de envio. Substitui o formulário quando `evaluationState = "ALREADY_SUBMITTED"`. Não possui controles de edição.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `subjectName` | `string` | sim | Nome do liderado |
| `resultado` | `string` | sim | Texto submetido do campo Resultado |
| `prontidao` | `string` | sim | Texto submetido do campo Prontidão |
| `action` | `string` | sim | Texto submetido do campo Action |
| `submittedAt` | `string` | sim | ISO-8601 da submissão; formatado pelo componente |

- **Estado interno:** nenhum

**Mensagem exibida:** cabeçalho "Avaliação enviada", data/hora formatada, os três campos rotulados (Resultado, Prontidão, Action) exibidos como blocos de leitura, mensagem "Esta avaliação não pode ser alterada."

---

### `PdmEvaluationBlockedState`

- **Tipo:** widget
- **Propósito:** Exibido quando o PDM não pode preencher ou submeter a avaliação por razões de estado do ciclo. Renderiza mensagem específica para `CYCLE_NOT_COLLECTING` e `DEADLINE_EXPIRED`. Diferente do `EvaluationBlockedState` da feature 009 (que cobre `DEADLINE_EXPIRED` / `CYCLE_CLOSED` / `ALREADY_SUBMITTED` para avaliadores convidados), este componente cobre os estados relevantes para o PDM autenticado.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `reason` | `"CYCLE_NOT_COLLECTING" \| "DEADLINE_EXPIRED"` | sim | Define qual mensagem é exibida |
| `subjectName` | `string` | sim | Nome do liderado; incluído na mensagem para contexto |

- **Estado interno:** nenhum

**Mapeamento de `reason` para mensagem exibida:**

| `reason` | Título | Descrição |
|----------|--------|-----------|
| `CYCLE_NOT_COLLECTING` | "Coleta não iniciada" | "O ciclo CF de [subjectName] ainda não está na fase de coleta. Você poderá preencher a avaliação quando a coleta for iniciada." |
| `DEADLINE_EXPIRED` | "Prazo encerrado" | "O prazo de coleta do ciclo CF de [subjectName] encerrou. Não é mais possível enviar avaliações." |

Incluir link "Voltar para Meu Time" → `/meu-time`.

---

### Tipos TypeScript

```ts
// Estado da avaliação PDM (subconjunto do EvaluationState — sem CYCLE_CLOSED):
type PdmEvaluationState =
  | "OPEN"
  | "ALREADY_SUBMITTED"
  | "CYCLE_NOT_COLLECTING"
  | "DEADLINE_EXPIRED";

// Rascunho dos três campos:
type PdmDraftDTO = {
  resultadoDraft: string | null;
  prontidaoDraft: string | null;
  actionDraft: string | null;
};

// Resposta submetida:
type PdmResponseDTO = {
  resultado: string;
  prontidao: string;
  action: string;
  submittedAt: string;
};

// DTO do GET:
type PdmEvaluationContextDTO = {
  cycleEvaluatorId: string;
  cycleSubjectId: string;
  subjectName: string;
  collectionDeadline: string | null;
  evaluatorStatus: "PENDING" | "RESPONDED" | "SKIPPED";
  evaluationState: PdmEvaluationState;
  draft: PdmDraftDTO | null;
  response: PdmResponseDTO | null;
};

// Request do PUT /draft:
type PdmEvaluationDraftRequest = {
  resultadoDraft: string;
  prontidaoDraft: string;
  actionDraft: string;
};

// Request do POST /submit:
type PdmEvaluationSubmitRequest = {
  resultado: string;
  prontidao: string;
  action: string;
};

// Resposta de erro 409:
type PdmSubmitErrorResponse = {
  errorCode: "ALREADY_SUBMITTED" | "CYCLE_NOT_COLLECTING" | "DEADLINE_EXPIRED";
};

// Estado de alertas de IA por campo:
type PdmAiAlertState = {
  resultado: boolean;
  prontidao: boolean;
  action: boolean;
};

// Reutilizar da feature 009 (sem redefinir):
// AI_ALERT_MIN_CHARS = 100
// AI_ALERT_CONTEXT_WORDS = [...]
// AiAlert (componente)
// EvaluationFormSkeleton (componente)
// EvaluationErrorState (componente — com suporte a "FORBIDDEN" adicionado na feature 010)
```

**Heurística de IA por campo (Regras 32/33):**

A mesma função de validação da feature 009 (`evaluationHeuristics.ts`) é aplicada individualmente a cada campo. O alerta de um campo não bloqueia a submissão por si só — apenas sinaliza para o PDM revisar. O PDM pode dispensar cada alerta independentemente.

Comportamento do alerta por campo:
1. Ao perder foco no campo: validar esse campo; exibir alerta apenas nele se insuficiente.
2. Ao clicar em "Enviar avaliação": validar todos os campos; exibir alertas em todos que forem insuficientes e cujos alertas não tenham sido dispensados. A chamada à API só ocorre quando todos os campos sem alerta ativo.
3. Após dispensar o alerta de um campo (`aiAlertsDismissed[campo] = true`): não reexibir para o mesmo conteúdo. Reexibir se o campo for modificado após a dispensa.

## Integração com API

| Endpoint | Gatilho | Sucesso | Tratamento de erro |
|----------|---------|---------|-------------------|
| `GET /api/me/team/:colaboradorId/cycles/:cycleSubjectId/pdm-evaluation` | Montagem do `PdmCfEvaluationPage`; e re-fetch após submissão bem-sucedida ou `409` de estado | Popular `evaluationData`; inicializar `resultado`, `prontidao`, `action` com `draft.*Draft` (ou `""` se null); renderizar estado com base em `evaluationState` | `403` → `apiError = "FORBIDDEN"`, exibir `EvaluationErrorState`; `404` → `apiError = "NOT_FOUND"`, exibir `EvaluationErrorState`; `500` ou erro de rede → `apiError = "SERVER_ERROR"`, exibir `EvaluationErrorState` com botão "Tentar novamente" |
| `PUT /api/me/team/:colaboradorId/cycles/:cycleSubjectId/pdm-evaluation/draft` | Debounce de 1s após cada `onChange` em qualquer campo do `PdmCfForm` | `draftSaving = false`; `draftError = false`; salvo silenciosamente | `409 ALREADY_SUBMITTED` → re-fetch GET; `409 CYCLE_NOT_COLLECTING` → re-fetch GET; qualquer outro erro → `draftError = true`; exibir aviso não bloqueante; **não** bloquear os campos de texto |
| `POST /api/me/team/:colaboradorId/cycles/:cycleSubjectId/pdm-evaluation/submit` | Clique em "Enviar avaliação" (após validação de IA de todos os campos) | `isSubmitting = false`; re-fetch GET → transitar para `PdmEvaluationReadOnlyView` | `400` → `submitError = "VALIDATION_ERROR"`; mensagem inline; `409 ALREADY_SUBMITTED` → re-fetch GET; `409 CYCLE_NOT_COLLECTING` → re-fetch GET (exibirá `PdmEvaluationBlockedState`); `409 DEADLINE_EXPIRED` → exibir `PdmEvaluationBlockedState` inline diretamente (sem re-fetch); `500` ou erro de rede → `submitError = "SERVER_ERROR"`; mensagem genérica inline; formulário permanece editável |

Contratos completos: ver `backend.md` desta pasta — seções `GET`, `PUT /draft` e `POST /submit`.

**Nota sobre o debounce:** o debounce de 1s deve ser implementado no `PdmCfEvaluationPage` usando `useEffect` + `setTimeout`/`clearTimeout` (ou hook `useDebouncedCallback`). O timer deve ser cancelado na desmontagem e na submissão definitiva — mesmo padrão da feature 010. Como há três campos, o debounce deve disparar uma única chamada ao `PUT /draft` com os três campos atuais, independentemente de qual campo foi modificado.

**Nota sobre o interceptor:** todos os endpoints desta feature requerem `Authorization: Bearer <token>`. O interceptor existente de `/api/me/**` deve funcionar para `/api/me/team/**` sem configuração adicional — verificar o prefixo de URL coberto pelo interceptor.

## Estados de interface

### `PdmCfEvaluationPage`

| Estado | O que é exibido |
|--------|----------------|
| **Loading inicial** | `EvaluationFormSkeleton` |
| **Erro 403** | `EvaluationErrorState` com `errorType = "FORBIDDEN"` — "Você não tem permissão para acessar esta avaliação." |
| **Erro 404** | `EvaluationErrorState` com `errorType = "NOT_FOUND"` — "Avaliação não encontrada ou vínculo PDM não localizado." |
| **Erro 500** | `EvaluationErrorState` com `errorType = "SERVER_ERROR"` + botão "Tentar novamente" |
| **CYCLE_NOT_COLLECTING** | `PdmEvaluationBlockedState` com `reason = "CYCLE_NOT_COLLECTING"` |
| **DEADLINE_EXPIRED** | `PdmEvaluationBlockedState` com `reason = "DEADLINE_EXPIRED"` |
| **ALREADY_SUBMITTED** | `PdmEvaluationReadOnlyView` com os três campos e data de envio |
| **OPEN** | `PdmCfForm` com os três campos de texto editáveis |

### `PdmCfForm`

| Estado | O que é exibido |
|--------|----------------|
| **Vazio — sem rascunho** | Três campos vazios, botão "Enviar avaliação" habilitado, sem indicador de rascunho |
| **Com rascunho carregado** | Campos pré-preenchidos com `draft.*Draft` do GET |
| **Editando — rascunho salvando** | Indicador "Salvando..." discreto compartilhado pelos três campos |
| **Editando — rascunho salvo** | Indicador "Salvo" discreto (desaparece após 2s) |
| **Editando — erro de rascunho** | Aviso não bloqueante "Não foi possível salvar o rascunho"; campos permanecem editáveis |
| **Campo com alerta de IA** | `AiAlert` exibido abaixo do campo específico; outros campos sem alerta não são afetados |
| **Submetendo** | Três campos desabilitados; botão com spinner e texto "Enviando..."; alertas de IA ocultos |
| **Erro de submissão (400/500)** | Mensagem de erro inline abaixo do botão; campos e botão voltam ao estado normal |

### `AiAlert` (reutilizado da feature 009)

Mesmo comportamento definido no `frontend.md` da feature 009. Nesta feature, é renderizado independentemente para cada campo que falhar na heurística. As props são idênticas — o `onDismiss` é chamado com o identificador do campo (`"resultado"`, `"prontidao"` ou `"action"`) para que o pai atualize `aiAlertsDismissed[campo]`.

### `PdmEvaluationReadOnlyView`

| Estado | O que é exibido |
|--------|----------------|
| **Único** | Cabeçalho "Avaliação enviada", nome do liderado, data/hora de envio formatada, três blocos de leitura rotulados (Resultado, Prontidão, Action), mensagem "Esta avaliação não pode ser alterada." |

### `PdmEvaluationBlockedState`

| Estado | O que é exibido |
|--------|----------------|
| **CYCLE_NOT_COLLECTING** | Ícone informativo, título, descrição com nome do liderado, link "Voltar para Meu Time" |
| **DEADLINE_EXPIRED** | Ícone de alerta, título, descrição com nome do liderado, link "Voltar para Meu Time" |

## Estratégia de testes

**Renderização com dados válidos:**
- `PdmCfEvaluationPage` com `evaluationState = "OPEN"` e `draft = null` renderiza `PdmCfForm` com os três campos vazios.
- `PdmCfEvaluationPage` com `evaluationState = "OPEN"` e `draft` preenchido renderiza `PdmCfForm` com campos pré-preenchidos.
- `PdmCfEvaluationPage` com `evaluationState = "ALREADY_SUBMITTED"` renderiza `PdmEvaluationReadOnlyView` com os três campos e data formatada.
- `PdmCfEvaluationPage` com `evaluationState = "CYCLE_NOT_COLLECTING"` renderiza `PdmEvaluationBlockedState` com `reason = "CYCLE_NOT_COLLECTING"`.
- `PdmCfEvaluationPage` com `evaluationState = "DEADLINE_EXPIRED"` renderiza `PdmEvaluationBlockedState` com `reason = "DEADLINE_EXPIRED"`.
- `PdmCfEvaluationPage` durante loading renderiza `EvaluationFormSkeleton`.
- `PdmCfEvaluationPage` com `apiError = "NOT_FOUND"` renderiza `EvaluationErrorState`.
- `PdmCfEvaluationPage` com `apiError = "FORBIDDEN"` renderiza `EvaluationErrorState` com mensagem de permissão.

**Interações do usuário:**
- Digitar texto em qualquer campo → após 1s, `PUT /draft` chamado com os três campos atuais.
- Múltiplas keystrokes em menos de 1s → apenas uma chamada ao `PUT /draft` (debounce único para os três campos).
- Campo Resultado perde foco com texto < 100 chars → `AiAlert` exibido abaixo do Resultado; Prontidão e Action não afetados.
- Campo com 150 chars e palavra de contexto perde foco → sem alerta naquele campo.
- "Continuar assim mesmo" no `AiAlert` do campo Resultado → `aiAlertsDismissed.resultado = true`; alerta do Resultado some; outros campos não afetados.
- Modificar campo Resultado após dispensar alerta (e texto ainda insuficiente) → alerta do Resultado reexibido.
- Clicar "Enviar avaliação" com alertas ativos em dois campos e não dispensados → os dois alertas exibidos; API não chamada.
- Clicar "Enviar avaliação" com todos os alertas dispensados → `POST /submit` chamado.
- `POST /submit` retorna `201` → re-fetch GET → `PdmEvaluationReadOnlyView` exibido com os três campos.
- Debounce cancelado ao submeter (sem chamada de rascunho após o submit).
- Link "Voltar para Meu Time" em `PdmEvaluationBlockedState` navega para `/meu-time`.

**Tratamento de erros de API:**
- GET retorna `404` → `EvaluationErrorState` com `errorType = "NOT_FOUND"`.
- GET retorna `403` → `EvaluationErrorState` com `errorType = "FORBIDDEN"`.
- GET retorna `500` → `EvaluationErrorState` com `errorType = "SERVER_ERROR"` + botão de retry.
- Retry após erro de GET → re-executa o GET.
- `PUT /draft` retorna erro de rede → `draftError = true`; aviso exibido; campos permanecem editáveis.
- `PUT /draft` retorna `409 ALREADY_SUBMITTED` → re-fetch GET; formulário transita para `PdmEvaluationReadOnlyView`.
- `POST /submit` retorna `400` → mensagem inline; formulário permanece editável.
- `POST /submit` retorna `409 ALREADY_SUBMITTED` → re-fetch GET; exibe `PdmEvaluationReadOnlyView`.
- `POST /submit` retorna `409 CYCLE_NOT_COLLECTING` → re-fetch GET; exibe `PdmEvaluationBlockedState`.
- `POST /submit` retorna `409 DEADLINE_EXPIRED` → exibe `PdmEvaluationBlockedState` com `reason = "DEADLINE_EXPIRED"` diretamente (sem re-fetch).
- `POST /submit` retorna `500` → mensagem inline genérica; formulário permanece editável.

**Heurística de IA por campo:**
- Campo com 99 chars → alerta exibido para aquele campo.
- Campo com 100 chars e palavra de contexto → sem alerta.
- Campo com 50 chars contendo "exemplo" → alerta exibido (primeiro critério falha).
- Campo com 100 chars sem palavras de contexto → alerta exibido (segundo critério falha).
- Dispensar alerta do campo Resultado → apenas `aiAlertsDismissed.resultado = true`; Prontidão e Action não afetados.
- A função de validação da heurística é pura e testável de forma isolada (reutilizando testes da feature 009).

**Renderização condicional por autenticação:**
- Rota `/meu-time/:colaboradorId/cf/:id/avaliar` deve estar dentro do `PrivateRoute` restrito ao perfil `PDM` — acesso com perfil `CIETER` (sem PDM) deve ser redirecionado para `/acesso-negado`.
- Verificar que o header `Authorization` é enviado em todas as chamadas desta feature.

**Ajuste em `/meu-time` (quando a tela existir):**
- Card do liderado com CF ativo na fase `COLLECTING` e `evaluatorStatus = "PENDING"` exibe link "Avaliar CF" apontando para `/meu-time/:colaboradorId/cf/:cycleSubjectId/avaliar`.
- Card do liderado com `evaluatorStatus = "RESPONDED"` exibe link "Ver avaliação enviada".
- Card do liderado com CF em fase diferente de `COLLECTING` não exibe link de avaliação CF.

## Riscos técnicos e dependências

- **Tela `/meu-time` e endpoint de listagem de liderados são dependência não coberta:** esta feature especifica o formulário de avaliação PDM, mas o ponto de entrada (`/meu-time`) e o endpoint `GET /api/me/team/members` (listagem de liderados com ciclos) ainda não foram especificados nem implementados. O `backend.md` da feature 003 registra esse endpoint como trabalho futuro. Sem a tela `/meu-time` funcional com os links corretos, o PDM não tem como navegar para o formulário desta feature. A implementação desta feature só agrega valor ao usuário final quando a listagem de liderados estiver disponível.

- **Reutilização do `AiAlert` com três instâncias independentes:** a feature 009 definiu `AiAlert` como componente único com uma única prop `onDismiss`. Nesta feature, o `AiAlert` é renderizado até três vezes (um por campo) com callbacks de dispensa diferentes. O componente existente é compatível com esse uso — apenas a lógica de dispensa no pai (`PdmCfEvaluationPage`) deve distinguir qual campo foi dispensado. Não é necessário modificar o `AiAlert` original.

- **Debounce único para três campos:** o debounce de 1s deve disparar uma única chamada ao `PUT /draft` independentemente de qual dos três campos foi modificado. O `useEffect` de debounce no `PdmCfEvaluationPage` deve observar os três estados (`resultado`, `prontidao`, `action`) e enviar os três valores juntos. Isso evita três chamadas em sequência quando o PDM alterna entre campos rapidamente.

- **Cancelamento do debounce na desmontagem:** o cleanup do `useEffect` deve cancelar o timeout pendente para evitar chamadas ao `PUT /draft` após o componente ser desmontado — mesmo risco identificado na feature 010.

- **Re-fetch após submissão causa breve flash do skeleton:** a decisão de re-fazer o GET após o `201` (em vez de navegar) é consistente com a feature 010. O skeleton aparece brevemente durante o re-fetch. Se o UX exigir transição suave, manter o estado local imediatamente para `ALREADY_SUBMITTED` e popular os dados do `response` do body do POST (se retornado) ou do re-fetch em background.

- **`EvaluationErrorState` com `errorType = "FORBIDDEN"`:** a feature 009 definiu `EvaluationErrorState` com `errorType: "NOT_FOUND" | "SERVER_ERROR"`. A feature 010 adicionou `"FORBIDDEN"`. Esta feature usa os três tipos — verificar que a extensão da feature 010 foi implementada antes de usar `"FORBIDDEN"` aqui.

- **Rota fora do padrão `/ciclos/`:** as features 009 e 010 usam prefixos `/avaliar/` e `/ciclos/` respectivamente. Esta feature usa `/meu-time/`, que é o prefixo da tela de gestão do time do PDM. Verificar que o `routes.tsx` existente não tem conflito com o padrão de rota `/meu-time/:colaboradorId/cf/:id/avaliar` — em especial, confirmar que não existe uma rota catch-all em `/meu-time/:id` que engula o path `/meu-time/:colaboradorId/cf/:id/avaliar`.