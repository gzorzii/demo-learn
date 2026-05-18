# Submeter Autoavaliação do Colaborador no CF — Frontend

**Referência:** `business.md` e `backend.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature introduz a tela `CfSelfEvaluationPage` na rota `/ciclos/cf/:id/autoavaliacao`, acessada pelo colaborador autenticado a partir do card de CF ativo em `/ciclos` (feature 003). A tela é renderizada dentro do `AppShell` com `PrivateRoute` — diferente das telas da feature 009, que ficam fora do shell autenticado.

O ator é o próprio colaborador (sujeita do ciclo), identificado pelo JWT. O parâmetro `:id` na URL corresponde ao `cycleSubjectId`.

A tela tem dois modos mutuamente exclusivos determinados pelo `evaluationState` retornado pelo `GET`:
- **Editável** (`OPEN`): formulário de texto aberto com salvamento automático de rascunho (debounce de 1s) e botão de submissão definitiva.
- **Somente leitura** (`ALREADY_SUBMITTED`): exibe o texto submetido com data de envio, sem campo editável.
- **Bloqueado** (`CYCLE_NOT_COLLECTING`): mensagem informativa de que a fase de coleta ainda não está ativa.

Componentes reutilizados da feature 009: `EvaluationFormSkeleton`, `AiAlert`, `EvaluationErrorState`.

Componentes novos desta feature: `CfSelfEvaluationPage`, `SelfCfForm`, `SelfEvaluationReadOnlyView`, `SelfEvaluationBlockedState`.

> `EvaluationBlockedState` da feature 009 não é reutilizado aqui porque as mensagens e os estados são diferentes (`CYCLE_NOT_COLLECTING` em vez de `DEADLINE_EXPIRED` / `CYCLE_CLOSED`). Um novo componente `SelfEvaluationBlockedState` evita acoplamento de mensagens de domínio distintos.

## Rotas e navegação

| Rota | Componente de página | Propósito |
|------|---------------------|-----------|
| `/ciclos/cf/:id/autoavaliacao` | `CfSelfEvaluationPage` | Formulário de autoavaliação do colaborador no ciclo CF |

O parâmetro `:id` é o `cycleSubjectId` (UUID do registro `cycle_subject`).

**Entrada:** card do CF ativo em `/ciclos` (`MeusCiclosPage`, feature 003) — link visível apenas quando `cycle_subject.status = COLLECTING` e o perfil do usuário é `CIETER` ou `PDM`.

**Transições a partir de `/ciclos/cf/:id/autoavaliacao`:**

- Estado `OPEN` + submissão bem-sucedida (`201`) → mesma rota; a página re-fetcha o estado e exibe `SelfEvaluationReadOnlyView` com o texto submetido (sem navegar para outra URL — evita tela de confirmação separada que exigiria estado compartilhado entre rotas).
- Estado `ALREADY_SUBMITTED` (na montagem ou após submissão) → exibe `SelfEvaluationReadOnlyView` inline.
- Estado `CYCLE_NOT_COLLECTING` → exibe `SelfEvaluationBlockedState` inline.
- Erro de API `404` ou `403` → exibe `EvaluationErrorState`.
- Erro de API `500` → exibe `EvaluationErrorState` com botão "Tentar novamente".
- Sair sem submeter (`OPEN`) → rascunho mantido no backend; colaborador pode voltar pelo mesmo link.

```
/ciclos  (003.visao-ciclos-ativos)
  └── [CF ativo — fase: COLLECTING] → /ciclos/cf/:id/autoavaliacao  (CfSelfEvaluationPage)
        ├── [loading]                      → EvaluationFormSkeleton
        ├── [404 / 403 — erro de acesso]   → EvaluationErrorState ("NOT_FOUND" | "FORBIDDEN")
        ├── [500 — erro de servidor]        → EvaluationErrorState ("SERVER_ERROR") + retry
        ├── [CYCLE_NOT_COLLECTING]          → SelfEvaluationBlockedState
        ├── [ALREADY_SUBMITTED]             → SelfEvaluationReadOnlyView (texto + data de envio)
        └── [OPEN]                          → SelfCfForm
              ├── [onChange — debounce 1s]
              │     └── PUT /draft (silencioso; erro de draft não bloqueia edição)
              ├── [onBlur ou onClick em "Enviar autoavaliação"]
              │     ├── [texto < 100 chars OU sem palavras de contexto] → AiAlert (inline)
              │     │     ├── ["Continuar assim mesmo"] → aiAlertDismissed=true → prossegue
              │     │     └── ["Revisar texto"]         → alerta oculto; foco no campo
              │     └── [texto suficiente ou alerta dispensado] → prossegue para submit
              ├── [submeter] → POST /submit
              │     ├── [201] → re-fetch GET → exibe SelfEvaluationReadOnlyView
              │     ├── [409 ALREADY_SUBMITTED] → re-fetch GET → exibe SelfEvaluationReadOnlyView
              │     ├── [409 CYCLE_NOT_COLLECTING] → exibe SelfEvaluationBlockedState inline
              │     └── [400/500] → mensagem de erro inline; formulário permanece editável
              └── [sair sem submeter] → rascunho salvo → /ciclos
```

**Ajuste em `routes.tsx`:** adicionar rota `path="/ciclos/cf/:id/autoavaliacao"` dentro do bloco de `PrivateRoute` / `AppShell`. A rota deve ser acessível para perfis `CIETER` e `PDM`.

**Ajuste em `MeusCiclosPage`:** adicionar link "Autoavaliação" no card do ciclo CF ativo quando `selfEvaluationStatus = PENDING` e `currentPhase = COLLECTING`. O link navega para `/ciclos/cf/:cycleSubjectId/autoavaliacao`. Se `selfEvaluationStatus = SUBMITTED`, o link pode exibir "Ver autoavaliação enviada" ou ser omitido, dependendo da decisão de produto — especificar aqui como "Ver autoavaliação enviada" para consistência.

## Componentes

### `CfSelfEvaluationPage`

- **Tipo:** page
- **Propósito:** Página raiz da rota `/ciclos/cf/:id/autoavaliacao`. Extrai `cycleSubjectId` do path param (`useParams`), executa o `GET` na montagem e orquestra todos os estados de UI. É o único componente com acesso direto à API — todos os filhos são stateless ou têm estado local de UI.
- **Props:** nenhuma (lê `cycleSubjectId` via hook de router)
- **Estado interno:**

| State | Tipo | Descrição |
|-------|------|-----------|
| `selfEvaluationData` | `SelfEvaluationContextDTO \| null` | Resposta do GET; null enquanto carregando ou em erro |
| `loading` | `boolean` | `true` durante o GET inicial e após submissão (re-fetch) |
| `apiError` | `"NOT_FOUND" \| "FORBIDDEN" \| "SERVER_ERROR" \| null` | Erro do GET; null em sucesso |
| `responseText` | `string` | Conteúdo do campo de texto (inicializado com `draftText` do GET) |
| `draftSaving` | `boolean` | `true` enquanto o `PUT /draft` está em voo (indicador sutil na UI) |
| `draftError` | `boolean` | `true` se o último `PUT /draft` falhou (aviso não bloqueante) |
| `isSubmitting` | `boolean` | `true` durante o `POST /submit` |
| `submitError` | `"VALIDATION_ERROR" \| "SERVER_ERROR" \| null` | Erro do POST não relacionado a estado de negócio |
| `showAiAlert` | `boolean` | Controla exibição do `AiAlert` |
| `aiAlertDismissed` | `boolean` | O colaborador dispensou o alerta; não reexibir para o mesmo texto |

---

### `SelfCfForm`

- **Tipo:** form
- **Propósito:** Renderiza o formulário de texto aberto quando `evaluationState = "OPEN"`. Exibe instruções do CF, campo de texto com rascunho carregado, botão de submissão e indicador de salvamento automático. Componente controlado — delega estado ao `CfSelfEvaluationPage`.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `responseText` | `string` | sim | Valor atual do campo de texto (controlado pelo pai) |
| `isSubmitting` | `boolean` | sim | Desabilita campo e botão durante o POST |
| `draftSaving` | `boolean` | sim | Exibe indicador "Salvando..." no canto do formulário |
| `draftError` | `boolean` | sim | Exibe aviso não bloqueante "Erro ao salvar rascunho" |
| `submitError` | `string \| null` | não | Mensagem de erro exibida abaixo do botão após falha no POST |
| `showAiAlert` | `boolean` | sim | Exibe o `AiAlert` quando `true` |
| `onTextChange` | `(text: string) => void` | sim | Callback a cada keystroke — dispara debounce de rascunho no pai |
| `onBlur` | `() => void` | sim | Callback ao perder foco — dispara heurística de IA no pai |
| `onSubmit` | `() => void` | sim | Callback ao clicar em "Enviar autoavaliação" |
| `onAiAlertDismiss` | `() => void` | sim | Callback ao clicar em "Continuar assim mesmo" no alerta |

- **Estado interno:** nenhum (stateless)

---

### `SelfEvaluationReadOnlyView`

- **Tipo:** section
- **Propósito:** Exibe o texto da autoavaliação submetida em modo somente leitura, com data e hora de envio. Substituí o formulário quando `evaluationState = "ALREADY_SUBMITTED"`. Não possui controles de edição.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `submittedText` | `string` | sim | Texto da autoavaliação submetida |
| `submittedAt` | `string` | sim | Data/hora ISO-8601 da submissão; formatada pelo componente para exibição |

- **Estado interno:** nenhum

---

### `SelfEvaluationBlockedState`

- **Tipo:** widget
- **Propósito:** Exibido quando o ciclo não está na fase de coleta (`evaluationState = "CYCLE_NOT_COLLECTING"`). Informa ao colaborador que a autoavaliação ainda não pode ser preenchida. Diferente do `EvaluationBlockedState` da feature 009, que cobre estados de prazo expirado e ciclo encerrado para avaliadores convidados.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `currentPhase` | `string` | sim | Valor de `cycle_subject.status`; exibido na mensagem para orientar o colaborador |

- **Estado interno:** nenhum

**Mensagem exibida:**
- Título: "Coleta ainda não iniciada"
- Descrição: "A fase de coleta do seu ciclo CF ainda não começou. Você poderá preencher a autoavaliação quando o ciclo entrar na fase de coleta." (complementar com o valor de `currentPhase` se útil para diagnóstico interno)

---

### Tipos TypeScript novos

```ts
// Reutilizar EvaluationState da feature 009 — adicionar CYCLE_NOT_COLLECTING:
type SelfEvaluationState =
  | "OPEN"
  | "ALREADY_SUBMITTED"
  | "CYCLE_NOT_COLLECTING";

type SelfEvaluationContextDTO = {
  cycleSubjectId: string;
  cycleName: string | null;
  collectionDeadline: string | null;
  selfEvaluationStatus: "PENDING" | "SUBMITTED";
  evaluationState: SelfEvaluationState;
  draftText: string | null;
  submittedText: string | null;
  submittedAt: string | null;
};

type SelfEvaluationDraftRequest = {
  draftText: string;
};

type SelfEvaluationSubmitRequest = {
  responseText: string;
};

type SelfEvaluationSubmitErrorResponse = {
  errorCode: "ALREADY_SUBMITTED" | "CYCLE_NOT_COLLECTING";
};

// Reutilizar da feature 009 (sem redefinir):
// AI_ALERT_MIN_CHARS = 100
// AI_ALERT_CONTEXT_WORDS = [...]
// AiAlert (componente)
// EvaluationFormSkeleton (componente)
// EvaluationErrorState (componente) — adicionar suporte a errorType "FORBIDDEN" se ainda não coberto
```

## Integração com API

| Endpoint | Gatilho | Sucesso | Tratamento de erro |
|----------|---------|---------|-------------------|
| `GET /api/me/cycles/:cycleSubjectId/self-evaluation` | Montagem do `CfSelfEvaluationPage`; e re-fetch após submissão bem-sucedida | Popular `selfEvaluationData`; inicializar `responseText` com `draftText` (ou `""` se null); renderizar estado com base em `evaluationState` | `403` → `apiError = "FORBIDDEN"`, exibir `EvaluationErrorState`; `404` → `apiError = "NOT_FOUND"`, exibir `EvaluationErrorState`; `500` ou erro de rede → `apiError = "SERVER_ERROR"`, exibir `EvaluationErrorState` com botão "Tentar novamente" |
| `PUT /api/me/cycles/:cycleSubjectId/self-evaluation/draft` | Debounce de 1s após cada `onTextChange` em `SelfCfForm` | `draftSaving = false`; `draftError = false`; salvo silenciosamente | `409 ALREADY_SUBMITTED` → re-fetch GET (estado mudou externamente); `409 CYCLE_NOT_COLLECTING` → re-fetch GET; qualquer outro erro → `draftError = true`; exibir aviso não bloqueante; **não** bloquear o campo de texto |
| `POST /api/me/cycles/:cycleSubjectId/self-evaluation/submit` | Clique em "Enviar autoavaliação" (após validação local de IA) | `isSubmitting = false`; re-fetch GET → transitar para `SelfEvaluationReadOnlyView` | `400` → `submitError = "VALIDATION_ERROR"`; mensagem inline "Por favor, preencha o campo de autoavaliação"; `409 ALREADY_SUBMITTED` → re-fetch GET; `409 CYCLE_NOT_COLLECTING` → re-fetch GET (exibirá `SelfEvaluationBlockedState`); `500` ou erro de rede → `submitError = "SERVER_ERROR"`; mensagem genérica inline; formulário permanece editável |

Contratos completos: ver `backend.md` desta pasta — seções `GET`, `PUT /draft` e `POST /submit`.

**Nota sobre o debounce de rascunho:** o debounce de 1s deve ser implementado no `CfSelfEvaluationPage` (não no `SelfCfForm`) usando `useEffect` + `setTimeout`/`clearTimeout`, ou com um hook customizado `useDebouncedCallback`. O timer deve ser cancelado na desmontagem do componente e na submissão definitiva para evitar requisições de rascunho após o submit.

**Nota sobre o interceptor de autenticação:** diferente da feature 009 (que usava endpoints públicos sem JWT), todos os endpoints desta feature requerem o header `Authorization: Bearer <token>`. O interceptor de autenticação existente já deve cobrir rotas `/api/me/**` — verificar que não há bypass inadvertido.

## Estados de interface

### `CfSelfEvaluationPage`

| Estado | O que é exibido |
|--------|----------------|
| **Loading inicial** | `EvaluationFormSkeleton` |
| **Erro 403** | `EvaluationErrorState` com `errorType = "FORBIDDEN"` — "Você não tem permissão para acessar esta autoavaliação." |
| **Erro 404** | `EvaluationErrorState` com `errorType = "NOT_FOUND"` — "Ciclo não encontrado." |
| **Erro 500** | `EvaluationErrorState` com `errorType = "SERVER_ERROR"` + botão "Tentar novamente" |
| **CYCLE_NOT_COLLECTING** | `SelfEvaluationBlockedState` com `currentPhase` |
| **ALREADY_SUBMITTED** | `SelfEvaluationReadOnlyView` com texto submetido e data |
| **OPEN** | `SelfCfForm` com campo de texto editável |

### `SelfCfForm`

| Estado | O que é exibido |
|--------|----------------|
| **Vazio — sem rascunho** | Campo de texto vazio, botão "Enviar autoavaliação" habilitado, sem indicador de rascunho |
| **Editando — rascunho salvando** | Campo com texto, indicador "Salvando..." discreto (ex: spinner pequeno ou texto sutil no canto) |
| **Editando — rascunho salvo** | Campo com texto, indicador "Salvo" discreto (desaparece após 2s) |
| **Editando — erro de rascunho** | Campo com texto, aviso não bloqueante "Não foi possível salvar o rascunho" (amarelo); campo permanece editável |
| **Alerta de IA visível** | `AiAlert` exibido abaixo do campo; botão "Enviar autoavaliação" habilitado (colaborador pode submeter mesmo com alerta) |
| **Submetendo** | Campo desabilitado; botão com spinner e texto "Enviando..."; `AiAlert` oculto |
| **Erro de submissão (400/500)** | Mensagem de erro inline abaixo do botão; campo e botão voltam ao estado normal |

### `AiAlert` (reutilizado da feature 009)

Mesmo comportamento definido no `frontend.md` da feature 009. A heurística de validação local (`AI_ALERT_MIN_CHARS`, `AI_ALERT_CONTEXT_WORDS`) é idêntica — reutilizar a função de validação como módulo compartilhado (`evaluationHeuristics.ts`).

**Contexto de disparo nesta feature:**
1. Quando o campo perde foco (`onBlur`) — se o texto foi modificado e o colaborador ainda não dispensou o alerta para esse texto.
2. Quando o colaborador clica em "Enviar autoavaliação" — antes de chamar a API (mesmo comportamento da feature 009).

### `SelfEvaluationReadOnlyView`

| Estado | O que é exibido |
|--------|----------------|
| **Único** | Cabeçalho "Sua autoavaliação foi enviada", data/hora de envio formatada, texto da resposta em bloco de leitura sem campo editável, mensagem "Esta avaliação não pode ser alterada." |

### `SelfEvaluationBlockedState`

| Estado | O que é exibido |
|--------|----------------|
| **Único** | Ícone informativo, título "Coleta ainda não iniciada", descrição orientativa, link "Voltar para Meus Ciclos" → `/ciclos` |

## Estratégia de testes

**Renderização com dados válidos:**
- `CfSelfEvaluationPage` com `evaluationState = "OPEN"` e `draftText = null` renderiza `SelfCfForm` com campo vazio.
- `CfSelfEvaluationPage` com `evaluationState = "OPEN"` e `draftText = "texto anterior"` renderiza `SelfCfForm` com campo pré-preenchido com o rascunho.
- `CfSelfEvaluationPage` com `evaluationState = "ALREADY_SUBMITTED"` renderiza `SelfEvaluationReadOnlyView` com texto e data formatada.
- `CfSelfEvaluationPage` com `evaluationState = "CYCLE_NOT_COLLECTING"` renderiza `SelfEvaluationBlockedState`.
- `CfSelfEvaluationPage` durante loading renderiza `EvaluationFormSkeleton`.
- `CfSelfEvaluationPage` com `apiError = "NOT_FOUND"` renderiza `EvaluationErrorState`.
- `CfSelfEvaluationPage` com `apiError = "FORBIDDEN"` renderiza `EvaluationErrorState` com mensagem de permissão.

**Interações do usuário:**
- Digitar texto no campo → após 1s, `PUT /draft` é chamado com o texto atual.
- Múltiplas keystrokes em menos de 1s → apenas uma chamada ao `PUT /draft` (debounce).
- Campo perde foco com texto < 100 chars → `AiAlert` exibido.
- Campo perde foco com texto ≥ 100 chars e palavra de contexto → sem alerta.
- "Continuar assim mesmo" no `AiAlert` → alerta some; `aiAlertDismissed = true`.
- Modificar texto após dispensar alerta (e texto ainda insuficiente) → alerta reexibido.
- Clicar "Enviar autoavaliação" com alerta ativo e não dispensado → alerta exibido (não chama API).
- Clicar "Enviar autoavaliação" com alerta dispensado → `POST /submit` chamado.
- `POST /submit` retorna `201` → re-fetch GET → `SelfEvaluationReadOnlyView` exibido.
- Debounce cancelado ao submeter (sem chamada de rascunho após o submit).

**Tratamento de erros de API:**
- `GET` retorna `404` → `EvaluationErrorState` com `errorType = "NOT_FOUND"`.
- `GET` retorna `403` → `EvaluationErrorState` com `errorType = "FORBIDDEN"`.
- `GET` retorna `500` → `EvaluationErrorState` com `errorType = "SERVER_ERROR"` + botão de retry.
- Retry após erro de GET → re-executa o GET.
- `PUT /draft` retorna erro de rede → `draftError = true`; aviso exibido; campo permanece editável.
- `PUT /draft` retorna `409 ALREADY_SUBMITTED` → re-fetch GET; formulário transita para `SelfEvaluationReadOnlyView`.
- `POST /submit` retorna `400` → mensagem inline; formulário permanece editável.
- `POST /submit` retorna `409 ALREADY_SUBMITTED` → re-fetch GET; exibe `SelfEvaluationReadOnlyView`.
- `POST /submit` retorna `409 CYCLE_NOT_COLLECTING` → re-fetch GET; exibe `SelfEvaluationBlockedState`.
- `POST /submit` retorna `500` → mensagem inline genérica; formulário permanece editável.

**Heurística de IA (reutilizar testes da feature 009 para a função pura):**
- Texto com exatamente 99 chars → alerta exibido.
- Texto com exatamente 100 chars sem palavras de contexto → alerta exibido.
- Texto com 50 chars contendo palavra "exemplo" → alerta exibido (primeiro critério falha).
- Texto com 100 chars contendo "quando" → sem alerta (ambos passam).
- A função de validação é pura e testável de forma isolada (sem efeitos colaterais).

**Renderização condicional por autenticação:**
- Rota `/ciclos/cf/:id/autoavaliacao` deve estar dentro do `PrivateRoute` — acesso sem token deve redirecionar para login.
- Verificar que o header `Authorization` é enviado em todas as chamadas desta feature.

**Ajuste em `MeusCiclosPage`:**
- Card de CF ativo com `selfEvaluationStatus = PENDING` e `currentPhase = COLLECTING` exibe link "Autoavaliação".
- Card de CF ativo com `selfEvaluationStatus = SUBMITTED` exibe link "Ver autoavaliação enviada".
- Card de CF ativo com `currentPhase` diferente de `COLLECTING` não exibe link de autoavaliação.

## Riscos técnicos e dependências

- **Dependência da feature 003 (`MeusCiclosPage`):** o link de entrada para esta feature é adicionado no card do ciclo CF em `/ciclos`. A `MeusCiclosPage` precisa expor `selfEvaluationStatus` e `currentPhase` nos dados retornados pelo `GET /api/me/ciclos/ativos` (feature 003). Verificar se o DTO da feature 003 já inclui `selfEvaluationStatus` — se não, a feature 003 precisa ser estendida para incluir esse campo antes que o link apareça corretamente.

- **Reutilização de componentes da feature 009:** `EvaluationFormSkeleton`, `AiAlert` e `EvaluationErrorState` devem ser importados do local onde foram criados na feature 009 (provavelmente `src/components/evaluation/`). Verificar o caminho de importação real antes de usar. Se a feature 009 não tiver sido implementada ainda, os componentes compartilhados precisam ser criados junto com esta feature.

- **`EvaluationErrorState` e `errorType = "FORBIDDEN"`:** a feature 009 definiu `EvaluationErrorState` com `errorType: "NOT_FOUND" | "SERVER_ERROR"`. Esta feature adiciona o caso `"FORBIDDEN"` (403). O componente precisa ser estendido para aceitar o novo tipo — sem quebrar os casos existentes da feature 009.

- **Cancelamento do debounce na desmontagem:** se o colaborador navegar para outra tela enquanto o debounce de 1s está pendente, a chamada ao `PUT /draft` pode ser disparada após a desmontagem, causando erro de "setState em componente desmontado" no React. O `useEffect` de debounce deve retornar uma função de cleanup que cancela o timeout.

- **Re-fetch após submissão em vez de navegação:** a decisão de re-fazer o GET após o `201` (em vez de navegar para uma rota de confirmação separada) simplifica o estado, mas significa que a tela pisca brevemente para o skeleton enquanto o re-fetch ocorre. Se o UX exigir transição suave, considerar manter o estado local imediatamente para `ALREADY_SUBMITTED` e popular os dados do re-fetch em background.

- **`selfEvaluationStatus` no DTO da feature 003:** o `GET /api/me/ciclos/ativos` retorna `currentPhase` (que é `cycle_subject.status`), mas não necessariamente `selfEvaluationStatus`. Se esse campo não estiver disponível no DTO da feature 003, o `MeusCiclosPage` não pode diferenciar entre "Autoavaliação" (pendente) e "Ver autoavaliação enviada" (submetida). A feature 003 pode precisar de uma extensão de DTO para incluir `selfEvaluationStatus`.
