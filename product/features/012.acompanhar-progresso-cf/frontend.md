# Acompanhar Progresso de Respostas durante o CF — Frontend

**Referência:** `business.md` e `backend.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature introduz duas páginas de painel de progresso e modifica dois componentes de card existentes para que os links de ação apontem para as novas rotas de progresso (em vez de diretamente para os formulários de avaliação). A tela exibe informações somente leitura sobre o andamento da coleta de respostas de um ciclo CF ativo.

Ator 1: **Colaborador** (`CIETER` ou `PDM`) acessa `/ciclos/cf/:id` para ver o progresso do seu próprio CF.
Ator 2: **PDM** acessa `/meu-time/:colaboradorId/cf/:id` para ver o progresso do CF de um liderado.

As duas páginas compartilham o componente `CfProgressPanel`, mas a visão do PDM recebe dados estendidos (`PdmCfProgressDTO`) que incluem a lista `guestEvaluators` com nome e status de cada convidado — enquanto o colaborador vê apenas contagens agregadas (Regra 15).

Componentes novos: `CfProgressPage`, `PdmCfProgressPage`, `CfProgressPanel`, `cfProgressService`.
Componentes modificados: `CycleCard` (ajuste de link), `TeamMemberCard` (ajuste de link).

## Rotas e navegação

| Rota | Componente de página | Propósito |
|------|---------------------|-----------|
| `/ciclos/cf/:id` | `CfProgressPage` | Painel de progresso do CF ativo — visão do colaborador |
| `/meu-time/:colaboradorId/cf/:id` | `PdmCfProgressPage` | Painel de progresso do CF de um liderado — visão do PDM |

O parâmetro `:id` em ambas as rotas é o `cycleSubjectId` (UUID do `cycle_subject`).

**Entrada para `/ciclos/cf/:id`:** `CycleCard` em `/meus-ciclos` (`MeusCiclosPage`, feature 003) — o link do card de CF ativo deve ser atualizado para apontar para esta rota (ver seção de modificações em componentes existentes).

**Entrada para `/meu-time/:colaboradorId/cf/:id`:** `TeamMemberCard` em `/meu-time` — o link do card do liderado deve ser atualizado para apontar para esta rota.

**Transições a partir de `/ciclos/cf/:id`:**
- `selfEvaluationStatus = "PENDING"` e ciclo em `COLLECTING` → botão "Submeter autoavaliação" → `/ciclos/cf/:id/autoavaliacao` (feature 010)
- Ciclo em `COLLECTING` e ação de encerramento manual disponível → link para feature 013 (fora do escopo desta feature)
- Erro `404` ou `403` → `EvaluationErrorState`

**Transições a partir de `/meu-time/:colaboradorId/cf/:id`:**
- `pdmEvaluationStatus = "PENDING"` e ciclo em `COLLECTING` → botão "Submeter avaliação" → `/meu-time/:colaboradorId/cf/:id/avaliar` (feature 011)
- Erro `404` ou `403` → `EvaluationErrorState`

```
/meus-ciclos (003)
  └── [CycleCard — CF ativo] → /ciclos/cf/:id  (CfProgressPage)
        ├── [loading]               → EvaluationFormSkeleton
        ├── [403 / 404]             → EvaluationErrorState
        ├── [500]                   → EvaluationErrorState + retry
        ├── [cycleStatus != COLLECTING]
        │     └── CfProgressPanel (informativo) + mensagem de fase não coletando
        └── [cycleStatus = COLLECTING]
              └── CfProgressPanel
                    ├── [selfEvaluationStatus = PENDING]
                    │     └── botão "Submeter autoavaliação" → /ciclos/cf/:id/autoavaliacao (010)
                    └── [selfEvaluationStatus = SUBMITTED]
                          └── badge "Autoavaliação enviada" (sem link)

/meu-time (dependência externa)
  └── [TeamMemberCard — CF ativo] → /meu-time/:colaboradorId/cf/:id  (PdmCfProgressPage)
        ├── [loading]               → EvaluationFormSkeleton
        ├── [403 / 404]             → EvaluationErrorState
        ├── [500]                   → EvaluationErrorState + retry
        ├── [cycleStatus != COLLECTING]
        │     └── CfProgressPanel (informativo) + mensagem de fase não coletando
        └── [cycleStatus = COLLECTING]
              └── CfProgressPanel
                    ├── [pdmEvaluationStatus = PENDING]
                    │     └── botão "Submeter avaliação" → /meu-time/:colaboradorId/cf/:id/avaliar (011)
                    └── [pdmEvaluationStatus = RESPONDED]
                          └── badge "Avaliação enviada" (sem link)
```

**Ajuste em `routes.tsx`:** adicionar as duas novas rotas dentro do bloco de `PrivateRoute`/`AppShell`. `/ciclos/cf/:id` deve ser acessível para `CIETER` e `PDM`; `/meu-time/:colaboradorId/cf/:id` deve ser restrita ao perfil `PDM`.

## Componentes

### `CfProgressPage` — novo

- **Tipo:** page
- **Propósito:** Página raiz de `/ciclos/cf/:id`. Extrai `cycleSubjectId` do path param (`useParams<{ id: string }>()`), executa o GET na montagem e orquestra todos os estados de UI. Único componente com acesso direto à API nesta rota.
- **Props:** nenhuma
- **Estado interno:**

| State | Tipo | Descrição |
|-------|------|-----------|
| `progressData` | `CfProgressDTO \| null` | Resposta do GET; null durante loading ou erro |
| `loading` | `boolean` | `true` durante o GET inicial e após retry |
| `apiError` | `"NOT_FOUND" \| "FORBIDDEN" \| "SERVER_ERROR" \| null` | Tipo do erro do GET |

### `PdmCfProgressPage` — novo

- **Tipo:** page
- **Propósito:** Página raiz de `/meu-time/:colaboradorId/cf/:id`. Extrai `colaboradorId` e `id` (cycleSubjectId) do path param (`useParams<{ colaboradorId: string; id: string }>()`), executa o GET PDM na montagem. Comportamento análogo ao `CfProgressPage` mas com endpoint e contexto de ator diferentes.
- **Props:** nenhuma
- **Estado interno:** idêntico ao `CfProgressPage`.

### `CfProgressPanel` — novo

- **Tipo:** section
- **Propósito:** Componente stateless que renderiza o painel de progresso com os dados recebidos. Compartilhado entre `CfProgressPage` e `PdmCfProgressPage` — a diferença de ação (botão de autoavaliação vs. botão de avaliar como PDM) é controlada via props.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `cycleStatus` | `string` | sim | Status do ciclo; determina se o painel está ativo ou encerrado |
| `selfEvaluationStatus` | `"PENDING" \| "SUBMITTED"` | sim | Status da autoavaliação da sujeita |
| `pdmEvaluationStatus` | `"PENDING" \| "RESPONDED"` | sim | Status da avaliação do PDM |
| `guestTotal` | `number` | sim | Total de avaliadores convidados |
| `guestResponded` | `number` | sim | Convidados que responderam |
| `collectionDeadline` | `string \| null` | não | ISO-8601 do prazo de coleta |
| `daysRemaining` | `number \| null` | não | Dias restantes; `0` se vencido; `null` se sem prazo |
| `selfActionUrl` | `string \| null` | não | URL do botão de autoavaliação; `null` se não aplicável (PDM vendo liderado) |
| `pdmActionUrl` | `string \| null` | não | URL do botão de avaliação PDM; `null` se não aplicável (colaborador vendo próprio CF) |
| `guestEvaluators` | `GuestEvaluatorStatusDTO[] \| null` | não | Lista com nome e status de cada convidado; `null` na visão do colaborador (Regra 15) |

- **Estado interno:** nenhum

**Comportamento de renderização:**
- Se `cycleStatus !== "COLLECTING"`: exibir mensagem informativa "O ciclo CF não está em fase de coleta" com o status atual. Manter as contagens visíveis para informação histórica, mas desabilitar os botões de ação.
- Seção de autoavaliação (self): ícone check/pending conforme `selfEvaluationStatus`; se `PENDING` e `cycleStatus === "COLLECTING"` e `selfActionUrl` não nulo → botão "Submeter autoavaliação" com link para `selfActionUrl`; se `SUBMITTED` → badge "Autoavaliação enviada".
- Seção da avaliação PDM: ícone check/pending conforme `pdmEvaluationStatus`; se `PENDING` e `cycleStatus === "COLLECTING"` e `pdmActionUrl` não nulo → botão "Submeter avaliação" com link para `pdmActionUrl`; se `RESPONDED` → badge "Avaliação enviada".
- Seção de convidados: se `guestEvaluators` for `null` (visão do colaborador — Regra 15) → texto "X de Y convidados responderam" sem nomes. Se `guestEvaluators` for array (visão do PDM) → lista de itens com o nome de cada convidado e ícone check/pending conforme `responded`. Se `guestTotal = 0`: texto "Nenhum convidado adicionado".
- Seção de prazo: se `daysRemaining > 0` → "X dias restantes"; se `daysRemaining === 0` → badge de alerta "Prazo encerrado"; se `daysRemaining === null` → "Sem prazo definido".

### `cfProgressService.ts` — novo

- **Propósito:** Módulo de serviço com duas funções que encapsulam as chamadas HTTP à API de progresso.
- Função `getColaboradorProgress(cycleSubjectId: string): Promise<CfProgressDTO>` — chama `GET /api/me/ciclos/cf/{cycleSubjectId}/progresso`.
- Função `getPdmProgress(colaboradorId: string, cycleSubjectId: string): Promise<CfProgressDTO>` — chama `GET /api/me/team/{colaboradorId}/cycles/{cycleSubjectId}/progresso`.

### Modificação em `CycleCard` — componente existente (feature 003)

O `CycleCard` atualmente inclui um link "Autoavaliação" que aponta para `/ciclos/cf/:cycleSubjectId/autoavaliacao`. Com esta feature, o link principal do card deve apontar para a tela de progresso `/ciclos/cf/:cycleSubjectId`. O botão de autoavaliação deixa de estar no `CycleCard` e passa a estar no `CfProgressPanel`.

**Mudança esperada:** o link principal do card de CF ativo deve navegar para `/ciclos/cf/:cycleSubjectId` (progresso), independentemente de `selfEvaluationStatus`. Remover ou substituir qualquer link direto para `/ciclos/cf/:id/autoavaliacao` do `CycleCard`.

> Justificativa: a tela de progresso é o ponto de entrada único para o CF ativo. O colaborador navega para o progresso e, de lá, decide se submete a autoavaliação. Isso evita que o colaborador salte diretamente para o formulário sem ver o contexto do progresso (quantos responderam, quantos dias restam etc.).

### Modificação em `TeamMemberCard` — componente existente (feature 011)

O `TeamMemberCard` atualmente inclui um link "Avaliar CF" que aponta para `/meu-time/:colaboradorId/cf/:cycleSubjectId/avaliar`. Com esta feature, o link deve apontar para `/meu-time/:colaboradorId/cf/:cycleSubjectId` (progresso PDM).

**Mudança esperada:** o link do card do liderado quando o CF está ativo deve navegar para `/meu-time/:colaboradorId/cf/:cycleSubjectId` (progresso). O botão de avaliação PDM passa a estar no `PdmCfProgressPage` via `CfProgressPanel`.

## Tipos TypeScript

Criar em `app/types/cfProgress.ts`:

```ts
type GuestEvaluatorStatusDTO = {
  name: string;
  responded: boolean;
};

// Retornado pelo endpoint do colaborador (Regra 15: sem nomes de convidados):
type CfProgressDTO = {
  cycleSubjectId: string;
  cycleStatus: string;
  selfEvaluationStatus: "PENDING" | "SUBMITTED";
  pdmEvaluationStatus: "PENDING" | "RESPONDED";
  guestTotal: number;
  guestResponded: number;
  collectionDeadline: string | null;
  daysRemaining: number | null;
};

// Retornado pelo endpoint do PDM (inclui lista de convidados com nomes):
type PdmCfProgressDTO = CfProgressDTO & {
  guestEvaluators: GuestEvaluatorStatusDTO[];
};
```

## Integração com API

| Endpoint | Gatilho | Sucesso | Tratamento de erro |
|----------|---------|---------|-------------------|
| `GET /api/me/ciclos/cf/{cycleSubjectId}/progresso` | Montagem do `CfProgressPage` | Popular `progressData`; renderizar `CfProgressPanel` com todos os campos | `403` → `apiError = "FORBIDDEN"`, exibir `EvaluationErrorState`; `404` → `apiError = "NOT_FOUND"`, exibir `EvaluationErrorState`; `500` ou erro de rede → `apiError = "SERVER_ERROR"`, exibir `EvaluationErrorState` com botão "Tentar novamente" |
| `GET /api/me/team/{colaboradorId}/cycles/{cycleSubjectId}/progresso` | Montagem do `PdmCfProgressPage` | Popular `progressData`; renderizar `CfProgressPanel` com `pdmActionUrl` preenchido | Mesmo tratamento de erro que o endpoint do colaborador |

Contratos completos dos endpoints: ver `backend.md` desta pasta — seções `GET /api/me/ciclos/cf/{cycleSubjectId}/progresso` e `GET /api/me/team/{colaboradorId}/cycles/{cycleSubjectId}/progresso`.

**Nota sobre retry:** o botão "Tentar novamente" deve re-executar o GET sem recarregar a página, usando a mesma função chamada na montagem. Implementar com `useState` + trigger manual de re-fetch ou invalidação de cache via React Query.

## Estados de interface

### `CfProgressPage` e `PdmCfProgressPage`

| Estado | O que é exibido |
|--------|----------------|
| **Loading** | `EvaluationFormSkeleton` |
| **Erro 403** | `EvaluationErrorState` com `errorType = "FORBIDDEN"` |
| **Erro 404** | `EvaluationErrorState` com `errorType = "NOT_FOUND"` |
| **Erro 500** | `EvaluationErrorState` com `errorType = "SERVER_ERROR"` + botão "Tentar novamente" |
| **Sucesso** | `CfProgressPanel` com todos os campos preenchidos |

### `CfProgressPanel`

| Estado | O que é exibido |
|--------|----------------|
| **Ciclo em COLLECTING** | Painel completo com ícones de status, contagens, prazo e botões de ação (se aplicáveis) |
| **Ciclo não em COLLECTING** | Painel com contagens visíveis + mensagem "O ciclo CF não está em fase de coleta — fase atual: [cycleStatus]"; botões de ação desabilitados |
| **Autoavaliação PENDING + COLLECTING** | Botão "Submeter autoavaliação" visível e ativo (apenas em `CfProgressPage`) |
| **Autoavaliação SUBMITTED** | Badge "Autoavaliação enviada" (ícone check verde); sem botão de ação |
| **PDM PENDING + COLLECTING** | Botão "Submeter avaliação" visível e ativo (apenas em `PdmCfProgressPage`) |
| **PDM RESPONDED** | Badge "Avaliação enviada" (ícone check verde); sem botão de ação |
| **0 convidados** | Texto "Nenhum convidado adicionado" na seção de convidados |
| **Prazo vencido (daysRemaining = 0)** | Badge de alerta "Prazo encerrado" |
| **Sem prazo (daysRemaining = null)** | Texto "Sem prazo definido" |
| **X dias restantes** | Texto "X dias restantes" com destaque visual |

## Estratégia de testes

**Renderização com dados válidos:**
- `CfProgressPage` com ciclo `COLLECTING`, `selfEvaluationStatus = "PENDING"`, PDM `PENDING`, 5 convidados / 3 respondidos, 7 dias → renderiza `CfProgressPanel` com botão "Submeter autoavaliação" e texto "3 de 5 convidados responderam" (sem nomes).
- `PdmCfProgressPage` com `guestEvaluators` populado → lista nomes individuais de convidados com ícone responded/pending.
- `CfProgressPage` com `selfEvaluationStatus = "SUBMITTED"` → botão de autoavaliação ausente; badge "Autoavaliação enviada" visível.
- `PdmCfProgressPage` com `pdmEvaluationStatus = "PENDING"` → botão "Submeter avaliação" visível.
- `PdmCfProgressPage` com `pdmEvaluationStatus = "RESPONDED"` → badge "Avaliação enviada" visível; sem botão de ação.
- `CfProgressPage` com `cycleStatus = "CLOSED"` → mensagem de fase não coletando; botões de ação desabilitados; contagens visíveis.
- `CfProgressPage` com `guestTotal = 0` → texto "Nenhum convidado adicionado".
- `CfProgressPage` com `daysRemaining = 0` → badge "Prazo encerrado".
- `CfProgressPage` com `daysRemaining = null` → texto "Sem prazo definido".

**Interações do usuário:**
- Clicar em "Submeter autoavaliação" navega para `/ciclos/cf/:id/autoavaliacao`.
- Clicar em "Submeter avaliação" navega para `/meu-time/:colaboradorId/cf/:id/avaliar`.
- Botão "Tentar novamente" após erro de GET re-executa a chamada (sem recarregar a página).

**Tratamento de erros de API:**
- GET retorna `401` → interceptor global redireciona para `/login`.
- GET retorna `403` → `EvaluationErrorState` com `errorType = "FORBIDDEN"`.
- GET retorna `404` → `EvaluationErrorState` com `errorType = "NOT_FOUND"`.
- GET retorna `500` → `EvaluationErrorState` com `errorType = "SERVER_ERROR"` + retry.

**Renderização condicional por permissão:**
- Rota `/ciclos/cf/:id` acessível a `CIETER` e `PDM` — verificar que o `PrivateRoute` permite ambos os perfis.
- Rota `/meu-time/:colaboradorId/cf/:id` restrita a `PDM` — `CIETER` sem `PDM` deve ser redirecionado para `/acesso-negado`.

**Modificações em componentes existentes:**
- `CycleCard` com CF ativo → link principal aponta para `/ciclos/cf/:cycleSubjectId`; link direto para autoavaliação ausente.
- `TeamMemberCard` com CF ativo → link aponta para `/meu-time/:colaboradorId/cf/:cycleSubjectId`; link direto para avaliar ausente.
- Verificar que as modificações no `CycleCard` e `TeamMemberCard` não quebram renderização dos cards de ciclo PR (que não usam estas rotas).

## Riscos técnicos e dependências

- **`CycleCard` é um componente existente usado em contextos múltiplos:** a modificação do link de CF deve ser condicional — apenas quando `cycleType === "CF"`. Links de ciclos PR não devem ser afetados. Revisar as props atuais do `CycleCard` (definidas em `003.visao-ciclos-ativos/frontend.md`) para confirmar que `cycleType` e `cycleSubjectId` já estão disponíveis e que a mudança não quebra o card de PR.

- **`TeamMemberCard` e a tela `/meu-time`:** a tela `/meu-time` e o `TeamMemberCard` são dependências identificadas na feature 011 como "não cobertas". Se a tela `/meu-time` não estiver implementada quando esta feature for entregue, a navegação pelo `TeamMemberCard` não terá efeito visível — mas a rota `/meu-time/:colaboradorId/cf/:id` pode ser testada diretamente pela URL.

- **Conflito de rota `/meu-time/:colaboradorId/cf/:id` vs. `/meu-time/:colaboradorId/cf/:id/avaliar`:** o React Router v7 deve resolver corretamente a rota exata `/meu-time/:colaboradorId/cf/:id` antes da rota com sub-caminho `/avaliar`. Verificar a ordem de registro em `routes.tsx` — rotas mais específicas (com mais segmentos) devem ser registradas antes das mais genéricas para evitar match incorreto.

- **`EvaluationErrorState` com `errorType = "FORBIDDEN"`:** a feature 009 definiu `EvaluationErrorState` com `errorType: "NOT_FOUND" | "SERVER_ERROR"`. A feature 010 adicionou `"FORBIDDEN"`. Esta feature usa os três tipos. Confirmar que a extensão realizada na 010 está implementada antes de usar `"FORBIDDEN"` aqui.

- **Rota `/ciclos/cf/:id` sobrepõe `/ciclos/cf/:id/autoavaliacao`:** a feature 010 registrou `/ciclos/cf/:id/autoavaliacao`. Esta feature adiciona `/ciclos/cf/:id`. Com React Router v7, rotas aninhadas com segmentos fixos têm prioridade sobre segmentos dinâmicos — o path `/ciclos/cf/:id/autoavaliacao` não será engolido por `/ciclos/cf/:id`. Verificar o comportamento no `routes.tsx` após o registro das duas rotas.

- **Dados de progresso são somente leitura e não exigem polling:** a tela não precisa atualizar automaticamente — o colaborador pode recarregar manualmente. Não implementar polling ou WebSocket para o MVP. Se a decisão mudar no futuro, o endpoint de progresso é naturalmente compatível com polling por ser GET sem efeitos colaterais.
