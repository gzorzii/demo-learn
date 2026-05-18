# Responder Avaliação como Convidado no CF — Frontend

**Referência:** `business.md` e `backend.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature introduz duas telas públicas — fora do shell de navegação autenticado (`AppShell`) — acessadas exclusivamente via link com token opaco recebido por notificação. O avaliador convidado não precisa estar logado no sistema para acessar o formulário.

As rotas `/avaliar/cf/:token` e `/avaliar/cf/:token/confirmacao` são renderizadas fora do `ProtectedRoute` e do `SideNav`, em um layout minimalista dedicado ao formulário. O alerta de IA (Regras 32/33) é implementado como validação local no frontend — sem chamada a LLM — usando heurística simples sobre o comprimento e conteúdo do texto.

Ator principal: **Avaliador convidado** — acessa o formulário via token, sem login.

Telas introduzidas: `GuestCfFormPage` (`/avaliar/cf/:token`) e `GuestCfConfirmationPage` (`/avaliar/cf/:token/confirmacao`).

## Rotas e navegação

| Rota | Componente de página | Propósito |
|------|---------------------|-----------|
| `/avaliar/cf/:token` | `GuestCfFormPage` | Formulário de avaliação CF para avaliador convidado; entrada via link de notificação |
| `/avaliar/cf/:token/confirmacao` | `GuestCfConfirmationPage` | Tela de confirmação exibida após submissão bem-sucedida |

O parâmetro `:token` é o UUID opaco retornado pelo backend ao gerar o link de notificação.

**Entrada:** link externo recebido por notificação (e-mail, chat). Não há item de menu — as rotas estão fora do `SideNav`.

**Transições a partir de `/avaliar/cf/:token`:**

- Estado `OPEN` + submissão bem-sucedida → `/avaliar/cf/:token/confirmacao`
- Estado `ALREADY_SUBMITTED`, `DEADLINE_EXPIRED` ou `CYCLE_CLOSED` → tela informativa inline (não navega para outra rota)
- Erro de token inválido (404) → tela de erro inline
- Alerta de IA (texto insuficiente) → alerta inline no formulário; avaliador pode revisar e resubmeter

**Transições a partir de `/avaliar/cf/:token/confirmacao`:**

- Nenhuma navegação adicional — tela terminal (o avaliador fecha a aba)

```
[Notificação → link com token]
  └── /avaliar/cf/:token  (GuestCfFormPage)
        ├── [loading]            → EvaluationFormSkeleton
        ├── [404 — token inválido] → EvaluationErrorState (token inválido ou expirado)
        ├── [500 — erro API]     → EvaluationErrorState genérico
        ├── [ALREADY_SUBMITTED]  → EvaluationBlockedState ("avaliação já enviada")
        ├── [DEADLINE_EXPIRED]   → EvaluationBlockedState ("prazo encerrado")
        ├── [CYCLE_CLOSED]       → EvaluationBlockedState ("ciclo encerrado")
        └── [OPEN]               → GuestCfForm
              ├── [campo de texto — ao perder foco ou ao tentar submeter]
              │     ├── [texto < 100 chars OU sem palavras de contexto] → AiAlert (inline)
              │     │     └── [avaliador revisa e resubmete] → continua editando
              │     └── [texto suficiente] → sem alerta
              ├── [submeter]
              │     ├── [API 201] → /avaliar/cf/:token/confirmacao
              │     ├── [API 409 ALREADY_SUBMITTED] → EvaluationBlockedState inline
              │     ├── [API 409 DEADLINE_EXPIRED]  → EvaluationBlockedState inline
              │     ├── [API 409 CYCLE_CLOSED]       → EvaluationBlockedState inline
              │     └── [API 400/500] → mensagem de erro inline; formulário permanece
              └── [sair sem submeter] → pode retornar pelo mesmo link depois
```

## Componentes

### `GuestCfFormPage`

- **Tipo:** page
- **Propósito:** Página raiz da rota `/avaliar/cf/:token`. Extrai o `token` do path param, chama `GET /api/public/evaluations/cf/:token` na montagem, e renderiza o estado correto com base em `evaluationState`. É o único componente com acesso direto à API — todos os filhos são stateless ou têm estado local de UI.
- **Props:** nenhuma (lê `token` via hook de router)
- **Estado interno:**
  - `evaluationData`: `EvaluationContextDTO | null` — resposta do GET
  - `loading`: `boolean`
  - `apiError`: `"NOT_FOUND" | "SERVER_ERROR" | null`
  - `responseText`: `string` — conteúdo do campo de texto (controlado)
  - `isSubmitting`: `boolean`
  - `submitError`: `EvaluationErrorCode | "SERVER_ERROR" | null` — erro retornado pelo POST
  - `showAiAlert`: `boolean` — controla exibição do `AiAlert`
  - `aiAlertDismissed`: `boolean` — o avaliador viu o alerta e escolheu continuar mesmo assim

---

### `GuestCfForm`

- **Tipo:** form
- **Propósito:** Renderiza o formulário de texto aberto quando `evaluationState = "OPEN"`. Exibe o nome da sujeita, instruções do CF, o campo de texto e o botão de submissão. Gerencia a exibição do `AiAlert` com base na heurística local. Componente controlado — recebe e delega o estado do campo via props.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `subjectName` | `string` | sim | Nome do colaborador sendo avaliado; exibido no cabeçalho do formulário |
| `collectionDeadline` | `string` | sim | Data ISO-8601 do prazo de coleta; exibida como informação contextual |
| `responseText` | `string` | sim | Valor atual do campo de texto (controlado pelo pai) |
| `isSubmitting` | `boolean` | sim | Desabilita campos e exibe loading no botão durante o POST |
| `submitError` | `string \| null` | não | Mensagem de erro exibida abaixo do botão após falha no POST |
| `showAiAlert` | `boolean` | sim | Exibe o `AiAlert` quando `true` |
| `onTextChange` | `(text: string) => void` | sim | Callback chamado a cada mudança no campo de texto |
| `onBlur` | `() => void` | sim | Callback chamado quando o campo perde foco — dispara a heurística de IA no pai |
| `onSubmit` | `() => void` | sim | Callback chamado ao clicar em "Enviar avaliação" |
| `onAiAlertDismiss` | `() => void` | sim | Callback chamado quando o avaliador opta por continuar mesmo com alerta de IA |

- **Estado interno:** nenhum (stateless — estado de texto e alerta são gerenciados pelo `GuestCfFormPage`)

---

### `AiAlert`

- **Tipo:** widget
- **Propósito:** Alerta inline exibido quando a heurística local detecta que o texto é insuficiente (Regras 32/33). Implementado como validação de frontend — sem chamada a LLM. A heurística considera o texto insuficiente quando: `responseText.trim().length < 100` OU o texto não contém pelo menos uma palavra de contexto (lista de palavras que indicam exemplos específicos: "quando", "exemplo", "situação", "projeto", "entregou", "ajudou", "demonstrou", e equivalentes em inglês). O alerta é sugestivo — o avaliador pode optar por submeter mesmo assim.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `onDismiss` | `() => void` | sim | Callback chamado quando o avaliador clica em "Continuar assim mesmo" |

- **Estado interno:** nenhum

> A lista de palavras-chave da heurística deve ser definida como constante no arquivo de tipos ou em um módulo utilitário (`evaluationHeuristics.ts`), para facilitar ajustes futuros sem alterar o componente.

---

### `EvaluationBlockedState`

- **Tipo:** widget
- **Propósito:** Exibido quando o avaliador não pode mais responder. Renderiza mensagem específica para cada estado: `ALREADY_SUBMITTED`, `DEADLINE_EXPIRED` ou `CYCLE_CLOSED`. Também é usado para exibir erros `409` retornados pelo POST (o formulário foi submetido mas o servidor retornou estado incompatível com o que o GET havia indicado — caso de corrida ou atualização entre o carregamento e a submissão).
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `reason` | `"ALREADY_SUBMITTED" \| "DEADLINE_EXPIRED" \| "CYCLE_CLOSED"` | sim | Define qual mensagem é exibida |
| `submittedAt` | `string \| null` | não | Data de submissão; exibida quando `reason = "ALREADY_SUBMITTED"` |

- **Estado interno:** nenhum

**Mapeamento de `reason` para mensagem exibida:**

| `reason` | Título | Descrição |
|----------|--------|-----------|
| `ALREADY_SUBMITTED` | "Avaliação já enviada" | "Você já enviou sua avaliação em [data formatada]. Obrigado pela participação." |
| `DEADLINE_EXPIRED` | "Prazo encerrado" | "O prazo de 10 dias para responder esta avaliação encerrou. Não é mais possível enviar respostas." |
| `CYCLE_CLOSED` | "Ciclo encerrado" | "O ciclo de Continuous Feedback foi encerrado. Não é mais possível enviar avaliações." |

---

### `EvaluationErrorState`

- **Tipo:** widget
- **Propósito:** Exibido quando o token é inválido (`404`) ou quando ocorre erro inesperado de servidor (`500`). Renderiza mensagem adequada para cada caso sem expor detalhes técnicos.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `errorType` | `"NOT_FOUND" \| "SERVER_ERROR"` | sim | Define qual mensagem é exibida |

- **Estado interno:** nenhum

**Mapeamento de `errorType`:**

| `errorType` | Mensagem |
|-------------|---------|
| `NOT_FOUND` | "Link inválido ou expirado. Verifique se você usou o link correto da notificação." |
| `SERVER_ERROR` | "Ocorreu um erro ao carregar o formulário. Tente novamente em alguns instantes." |

---

### `EvaluationFormSkeleton`

- **Tipo:** widget
- **Propósito:** Placeholder animado exibido durante o carregamento do `GET /api/public/evaluations/cf/:token`. Simula o layout do formulário (cabeçalho, campo de texto, botão).
- **Props:** nenhuma
- **Estado interno:** nenhum

---

### `GuestCfConfirmationPage`

- **Tipo:** page
- **Propósito:** Página terminal exibida após submissão bem-sucedida. Exibe mensagem de agradecimento e confirma que a avaliação foi registrada. Não faz chamadas à API — é renderizada via navegação a partir do `GuestCfFormPage` após `201`. O `:token` continua na URL para que o usuário possa recarregar a página e continuar vendo a confirmação (o GET retornará `ALREADY_SUBMITTED`, que o `GuestCfFormPage` renderizaria como `EvaluationBlockedState` — comportamento aceitável).
- **Props:** nenhuma
- **Estado interno:** nenhum

---

### Tipos TypeScript

```ts
type EvaluationState =
  | "OPEN"
  | "ALREADY_SUBMITTED"
  | "DEADLINE_EXPIRED"
  | "CYCLE_CLOSED";

type EvaluationContextDTO = {
  subjectName: string;
  cycleSubjectId: string;
  collectionDeadline: string;
  evaluationState: EvaluationState;
  alreadySubmittedAt: string | null;
};

type EvaluationErrorCode =
  | "ALREADY_SUBMITTED"
  | "DEADLINE_EXPIRED"
  | "CYCLE_CLOSED";

type EvaluationSubmitErrorResponse = {
  errorCode: EvaluationErrorCode;
};

type EvaluationSubmitRequest = {
  responseText: string;
};

// Heurística de IA — constantes de configuração
const AI_ALERT_MIN_CHARS = 100;
const AI_ALERT_CONTEXT_WORDS = [
  "quando", "exemplo", "situação", "projeto", "entregou",
  "ajudou", "demonstrou", "fez", "resolveu", "liderou",
  "when", "example", "situation", "project", "delivered",
  "helped", "demonstrated", "resolved", "led"
];
```

**Heurística de validação local (Regras 32/33):**

A função de validação deve retornar `true` (alerta necessário) quando:
- `text.trim().length < AI_ALERT_MIN_CHARS` **OU**
- nenhuma palavra de `AI_ALERT_CONTEXT_WORDS` está presente no texto (comparação case-insensitive)

O alerta é exibido:
1. Quando o campo perde foco (`onBlur`) — se o texto foi modificado após a montagem
2. Quando o avaliador clica em "Enviar avaliação" — antes de chamar a API

Se o avaliador já dispensou o alerta uma vez (`aiAlertDismissed = true`), não exibir novamente para o mesmo texto. Reexibir apenas se o texto for modificado após a dispensa.

## Integração com API

| Endpoint | Gatilho | Sucesso | Tratamento de erro |
|----------|---------|---------|-------------------|
| `GET /api/public/evaluations/cf/:token` | Montagem do `GuestCfFormPage` | Popular `evaluationData`; renderizar estado com base em `evaluationState` | `404` → definir `apiError = "NOT_FOUND"`, exibir `EvaluationErrorState`; `500` ou erro de rede → definir `apiError = "SERVER_ERROR"`, exibir `EvaluationErrorState` com botão "Tentar novamente" |
| `POST /api/public/evaluations/cf/:token` | Clique em "Enviar avaliação" (após validação local) | Navegar para `/avaliar/cf/:token/confirmacao` | `400` → mensagem inline "Por favor, preencha o campo de avaliação"; `409` com `errorCode` → exibir `EvaluationBlockedState` inline (o estado mudou entre o GET e o POST); `500` ou erro de rede → mensagem inline genérica abaixo do botão; formulário permanece editável |

Contratos completos: ver `backend.md` desta pasta — seções `GET /api/public/evaluations/cf/:token` e `POST /api/public/evaluations/cf/:token`.

**Nota sobre ausência de autenticação:** as chamadas para `/api/public/**` não incluem o header `Authorization`. O serviço de HTTP (`api.ts` ou equivalente) deve ter uma configuração separada para rotas públicas — ou um interceptor que não adicione o header quando a URL começa com `/api/public/`. Verificar que o interceptor de autenticação existente não bloqueia essas chamadas.

**Nota sobre re-carregamento da página na rota de confirmação:** se o usuário recarregar `/avaliar/cf/:token/confirmacao`, o `GuestCfConfirmationPage` é renderizado diretamente (sem contexto de navegação). A página não precisa de dados da API — exibe apenas mensagem estática de confirmação. Se o avaliador navegar de volta para `/avaliar/cf/:token`, o `GuestCfFormPage` será montado novamente, fará o GET, receberá `ALREADY_SUBMITTED` e exibirá `EvaluationBlockedState`. Esse comportamento é correto e não requer tratamento especial.

## Estados de interface

### `GuestCfFormPage`

| Estado | O que é exibido |
|--------|----------------|
| **Loading** | `EvaluationFormSkeleton` |
| **404 — token inválido** | `EvaluationErrorState` com `errorType = "NOT_FOUND"` |
| **500 — erro de servidor** | `EvaluationErrorState` com `errorType = "SERVER_ERROR"` + botão "Tentar novamente" |
| **ALREADY_SUBMITTED** | `EvaluationBlockedState` com `reason = "ALREADY_SUBMITTED"` e data de submissão |
| **DEADLINE_EXPIRED** | `EvaluationBlockedState` com `reason = "DEADLINE_EXPIRED"` |
| **CYCLE_CLOSED** | `EvaluationBlockedState` com `reason = "CYCLE_CLOSED"` |
| **OPEN** | `GuestCfForm` com campo de texto e botão de envio |

### `GuestCfForm`

| Estado | O que é exibido |
|--------|----------------|
| **Aguardando preenchimento** | Campo de texto vazio, botão "Enviar avaliação" habilitado |
| **Campo preenchido — texto suficiente** | Campo com texto, sem alerta, botão habilitado |
| **Campo preenchido — texto insuficiente (ao sair do campo)** | `AiAlert` exibido abaixo do campo; botão habilitado (avaliador pode submeter assim mesmo) |
| **Alerta dispensado** | `AiAlert` ocultado; botão habilitado |
| **Submetendo** | Campo desabilitado; botão com loading; `AiAlert` ocultado |
| **Erro de submissão (400/500)** | Mensagem de erro inline abaixo do botão; campo e botão voltam ao estado normal |
| **Erro de submissão (409)** | `EvaluationBlockedState` substituindo o formulário inline |

### `AiAlert`

| Estado | O que é exibido |
|--------|----------------|
| **Visível** | Ícone de alerta + mensagem sugestiva + botão "Continuar assim mesmo" + botão "Revisar texto" |
| **Oculto** | Nada (não montado) |

O botão "Revisar texto" simplesmente fecha o alerta e mantém o foco no campo de texto — sem ação de API.
O botão "Continuar assim mesmo" chama `onDismiss` → `aiAlertDismissed = true` → permite submissão imediata.

### `GuestCfConfirmationPage`

| Estado | O que é exibido |
|--------|----------------|
| **Único** | Mensagem de agradecimento, confirmação de envio, instrução para fechar a aba |

## Estratégia de testes

**Renderização com dados válidos:**
- `GuestCfFormPage` com resposta `evaluationState = "OPEN"` renderiza `GuestCfForm` com `subjectName` e `collectionDeadline` corretos.
- `GuestCfFormPage` com `evaluationState = "ALREADY_SUBMITTED"` renderiza `EvaluationBlockedState` com `reason = "ALREADY_SUBMITTED"` e data formatada.
- `GuestCfFormPage` com `evaluationState = "DEADLINE_EXPIRED"` renderiza `EvaluationBlockedState` com mensagem de prazo encerrado.
- `GuestCfFormPage` com `evaluationState = "CYCLE_CLOSED"` renderiza `EvaluationBlockedState` com mensagem de ciclo encerrado.
- `GuestCfFormPage` durante loading renderiza `EvaluationFormSkeleton`.
- `GuestCfFormPage` com `apiError = "NOT_FOUND"` renderiza `EvaluationErrorState` com mensagem de link inválido.
- `GuestCfConfirmationPage` renderiza mensagem de agradecimento sem erro.

**Interações do usuário:**
- Campo de texto vazio → foco perdido → `AiAlert` exibido (heurística: 0 chars < 100).
- Campo de texto com 50 chars sem palavras de contexto → foco perdido → `AiAlert` exibido.
- Campo de texto com 150 chars e pelo menos uma palavra de contexto → foco perdido → sem alerta.
- Clique em "Continuar assim mesmo" no `AiAlert` → alerta some; `aiAlertDismissed = true`.
- Modificar texto após dispensar alerta → alerta exibido novamente (se texto ainda insuficiente).
- Clique em "Enviar avaliação" com texto suficiente → POST chamado; botão entra em loading.
- Clique em "Enviar avaliação" com alerta ativo e não dispensado → alerta exibido novamente antes de chamar API.
- Clique em "Enviar avaliação" com alerta já dispensado → POST chamado diretamente.
- POST retorna `201` → navegação para `/avaliar/cf/:token/confirmacao`.
- Clique em "Tentar novamente" no `EvaluationErrorState` → re-executa GET.

**Tratamento de erros de API:**
- GET retorna `404` → `EvaluationErrorState` com `errorType = "NOT_FOUND"`.
- GET retorna `500` → `EvaluationErrorState` com `errorType = "SERVER_ERROR"` e botão de retry.
- POST retorna `400` → mensagem inline "Por favor, preencha o campo de avaliação"; formulário permanece.
- POST retorna `409 ALREADY_SUBMITTED` → `EvaluationBlockedState` com `reason = "ALREADY_SUBMITTED"`.
- POST retorna `409 DEADLINE_EXPIRED` → `EvaluationBlockedState` com `reason = "DEADLINE_EXPIRED"`.
- POST retorna `409 CYCLE_CLOSED` → `EvaluationBlockedState` com `reason = "CYCLE_CLOSED"`.
- POST retorna `500` → mensagem inline genérica; campo e botão voltam ao estado editável.

**Heurística de IA:**
- Texto com exatamente 99 chars → alerta exibido.
- Texto com exatamente 100 chars sem palavras de contexto → alerta exibido (segundo critério falha).
- Texto com 50 chars contendo palavra "exemplo" → alerta exibido (primeiro critério falha).
- Texto com 100 chars contendo palavra "quando" → sem alerta (ambos os critérios passam).
- Função de validação deve ser testável de forma isolada (lógica pura sem efeitos colaterais).

**Renderização condicional por permissão:**
- As rotas `/avaliar/cf/:token` e `/avaliar/cf/:token/confirmacao` devem estar fora do `ProtectedRoute` — qualquer acesso (sem login) deve funcionar.
- Verificar que o interceptor de autenticação não bloqueia as chamadas para `/api/public/**`.

## Riscos técnicos e dependências

- **Layout fora do AppShell:** as telas de avaliação de convidado usam um layout diferente do shell autenticado (sem `SideNav`, sem header de usuário). O router precisa de uma rota que renderize essas páginas sem o `AppShell`. Se o `AppShell` envolve todas as rotas no router atual, será necessário criar um layout alternativo (`PublicLayout`) e reorganizar as definições de rota. Verificar a estrutura atual do `App.tsx` e do router antes de implementar.

- **Interceptor de autenticação e rotas públicas:** o `api.ts` (ou interceptor Axios/fetch equivalente) provavelmente adiciona o header `Authorization` em todas as requisições. As chamadas para `/api/public/**` não devem incluir esse header — não porque causem erro (o backend os ignora em rotas `permitAll()`), mas por clareza de implementação. Verificar e adicionar lógica de bypass no interceptor.

- **Navegação pós-submissão sem estado compartilhado:** a navegação de `/avaliar/cf/:token` para `/avaliar/cf/:token/confirmacao` ocorre via router (`navigate`). O `GuestCfConfirmationPage` não recebe dados da página anterior via props — é uma tela estática. Se o designer pedir exibir o nome da sujeita na confirmação, será necessário usar `state` na navegação (`navigate('/avaliar/cf/:token/confirmacao', { state: { subjectName } })`) ou re-fazer o GET na página de confirmação. Para o MVP, tela estática sem o nome é aceitável.

- **Dependência da feature 008 para geração de tokens:** os tokens de acesso são gerados quando o ciclo transita para `COLLECTING` (feature 008). Se a feature 008 não estiver implementada ou se o `NotificationService` não gerar os tokens, as rotas desta feature nunca serão acessadas por nenhum avaliador convidado. A feature 009 é funcionalmente dependente da geração de tokens pela feature 008.

- **Manutenção da lista de palavras-chave da heurística:** a lista `AI_ALERT_CONTEXT_WORDS` é uma decisão de produto e deve ser revisada com o time antes de ir para produção. Uma lista muito restrita faz com que textos válidos recebam alerta; uma lista muito ampla torna o alerta inútil. Registrar como item de revisão antes do release.

- **Acessibilidade do formulário público:** como o formulário é acessado sem login, pode ser usado em dispositivos e contextos variados (mobile, e-mail embarcado, etc.). O campo de texto deve ser responsivo e o botão de submissão deve ser acessível via teclado. Verificar que não há dependência de contexto de autenticação para renderização básica.
