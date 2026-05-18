# Visualizar Resumo do Ciclo CF Encerrado — Frontend

**Referência:** `business.md` e `backend.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature introduz duas novas páginas de resumo de ciclo CF encerrado e um componente de painel compartilhado. Também modifica o `CycleCard` existente para que, quando o ciclo estiver com status `CLOSED`, o link aponte para a rota de resumo em vez da rota de progresso.

Ator 1: **Colaborador** (`CIETER` ou `PDM`) acessa `/ciclos/cf/:id/resumo` para ver o resumo do seu próprio CF encerrado, com respostas de convidados anonimizadas.

Ator 2: **PDM** acessa `/meu-time/:colaboradorId/cf/:id/resumo` para ver o resumo do CF encerrado de um liderado, com identificação plena de cada convidado.

**Arquivos novos:**
- `app/pages/CfSummaryPage.tsx`
- `app/pages/PdmCfSummaryPage.tsx`
- `app/components/CfSummaryPanel.tsx`
- `app/components/CfNotClosedState.tsx`
- `app/services/cfSummaryService.ts`
- `app/types/cfSummary.ts`

**Arquivos modificados:**
- `app/routes.tsx` — adicionar as duas novas rotas
- `app/components/CycleCard.tsx` — ajustar link quando `currentPhase === 'CLOSED'`

## Rotas e navegação

| Rota | Componente | Propósito |
|------|-----------|-----------|
| `ciclos/cf/:id/resumo` | `CfSummaryPage` | Resumo do CF encerrado — visão do colaborador (anonimizado) |
| `meu-time/:colaboradorId/cf/:id/resumo` | `PdmCfSummaryPage` | Resumo do CF encerrado — visão do PDM (identificado) |

O parâmetro `:id` em ambas as rotas é o `cycleSubjectId` (UUID do `cycle_subject`).

**Entradas para `/ciclos/cf/:id/resumo`:**
- `CycleCard` em `/meus-ciclos` quando `currentPhase === 'CLOSED'` → link atualizado por esta feature
- Feature 013 (`CfProgressPage`) após confirmação de encerramento → `navigate('/ciclos/cf/:id/resumo')` já implementado na feature 013

**Entradas para `/meu-time/:colaboradorId/cf/:id/resumo`:**
- Futuro card de liderado em `/meu-time` quando CF estiver CLOSED (dependência externa — ver riscos)

**Transições a partir de `/ciclos/cf/:id/resumo`:**
- Erro `403` ou `404` → `EvaluationErrorState`
- Erro `500` → `EvaluationErrorState` com botão "Tentar novamente"
- `cycleStatus !== "CLOSED"` → `CfNotClosedState` (mensagem informativa)
- `cycleStatus === "CLOSED"` → `CfSummaryPanel` com dados anonimizados

**Transições a partir de `/meu-time/:colaboradorId/cf/:id/resumo`:**
- Mesmas transições de erro
- `cycleStatus === "CLOSED"` → `CfSummaryPanel` com dados identificados

```
/meus-ciclos (003)
  └── [CycleCard — CF CLOSED] → /ciclos/cf/:id/resumo  (CfSummaryPage)
        ├── [loading]                   → EvaluationFormSkeleton
        ├── [403 / 404]                 → EvaluationErrorState
        ├── [500]                       → EvaluationErrorState + retry
        ├── [cycleStatus != "CLOSED"]   → CfNotClosedState
        └── [cycleStatus == "CLOSED"]   → CfSummaryPanel
              ├── Seção autoavaliação   (selfEvaluation)
              ├── Seção PDM             (pdmEvaluation)
              ├── Seção convidados      (guestResponses anônimas ou mensagem mínimo não atingido)
              └── Seção IA              (aiSummary — omitida se null)

/ciclos/cf/:id (013 — CfProgressPage)
  └── [204 após encerramento] → navigate('/ciclos/cf/:id/resumo')

/meu-time (dependência externa)
  └── [card liderado CF CLOSED] → /meu-time/:colaboradorId/cf/:id/resumo  (PdmCfSummaryPage)
        ├── [loading]                   → EvaluationFormSkeleton
        ├── [403 / 404]                 → EvaluationErrorState
        ├── [500]                       → EvaluationErrorState + retry
        ├── [cycleStatus != "CLOSED"]   → CfNotClosedState
        └── [cycleStatus == "CLOSED"]   → CfSummaryPanel
              ├── Seção autoavaliação   (selfEvaluation)
              ├── Seção PDM             (pdmEvaluation)
              ├── Seção convidados      (guestEvaluations identificadas com nome)
              └── Seção IA              (aiSummary — omitida se null)
```

**Ajuste em `routes.tsx`:**

As duas rovas novas devem ser adicionadas dentro do bloco de `PrivateRoute`/`AppShell`. Ordem de inserção importante para o React Router v7:

- `ciclos/cf/:id/resumo` deve ser inserida **antes** de `ciclos/cf/:id` (que já existe) — segmentos fixos têm prioridade sobre segmentos dinâmicos no React Router, mas é boa prática posicionar rotas mais específicas primeiro.
- `meu-time/:colaboradorId/cf/:id/resumo` deve ser inserida **antes** de `meu-time/:colaboradorId/cf/:id` — mesma razão.

## Componentes

### `CfSummaryPage` — novo arquivo em `app/pages/CfSummaryPage.tsx`

- **Tipo:** page
- **Propósito:** Página raiz de `/ciclos/cf/:id/resumo`. Extrai `cycleSubjectId` do path param (`useParams<{ id: string }>()`), executa o GET na montagem e orquestra todos os estados de UI.
- **Props:** nenhuma
- **Estado interno:**

| State | Tipo | Descrição |
|-------|------|-----------|
| `summaryData` | `CfSummaryDTO \| null` | Resposta do GET; null durante loading ou erro |
| `loading` | `boolean` | `true` durante o GET inicial e após retry |
| `apiError` | `"NOT_FOUND" \| "FORBIDDEN" \| "SERVER_ERROR" \| null` | Tipo do erro do GET |

**Comportamento:**
- Na montagem: chamar `getColaboradorSummary(id)` e popular `summaryData`
- Se `summaryData.cycleStatus !== "CLOSED"`: renderizar `CfNotClosedState`
- Se `summaryData.cycleStatus === "CLOSED"`: renderizar `CfSummaryPanel` com `variant="colaborador"` e dados de `summaryData`

---

### `PdmCfSummaryPage` — novo arquivo em `app/pages/PdmCfSummaryPage.tsx`

- **Tipo:** page
- **Propósito:** Página raiz de `/meu-time/:colaboradorId/cf/:id/resumo`. Extrai `colaboradorId` e `id` de `useParams<{ colaboradorId: string; id: string }>()`. Comportamento análogo ao `CfSummaryPage` mas com endpoint e tipo de dados diferentes.
- **Props:** nenhuma
- **Estado interno:** idêntico ao `CfSummaryPage`, mas `summaryData` é do tipo `PdmCfSummaryDTO | null`.

---

### `CfNotClosedState` — novo arquivo em `app/components/CfNotClosedState.tsx`

- **Tipo:** widget
- **Propósito:** Componente stateless que exibe mensagem informativa quando o ciclo CF ainda não foi encerrado. Renderizado pelas duas páginas de resumo quando `cycleStatus !== "CLOSED"`.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `cycleStatus` | `string` | sim | Status atual do ciclo para exibir na mensagem (ex: `"COLLECTING"`) |

- **Estado interno:** nenhum
- **Conteúdo:** mensagem "O ciclo CF ainda não foi encerrado" com o status atual como informação adicional. Não exibe botão de ação — o usuário pode navegar pelo histórico do browser ou pelo menu.

---

### `CfSummaryPanel` — novo arquivo em `app/components/CfSummaryPanel.tsx`

- **Tipo:** section
- **Propósito:** Componente stateless que renderiza o painel de resumo consolidado. Compartilhado entre `CfSummaryPage` e `PdmCfSummaryPage`. A diferença de visão (anonimizada vs. identificada) é controlada pela prop `variant` e pelas props específicas de cada visão.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `variant` | `"colaborador" \| "pdm"` | sim | Controla qual visão é renderizada (anonimizada ou identificada) |
| `selfEvaluation` | `SelfEvaluationSummaryDTO \| null` | não | Autoavaliação da sujeita; null se não submetida |
| `pdmEvaluation` | `PdmEvaluationSummaryDTO \| null` | não | Avaliação do PDM; null se não respondida |
| `guestRespondentCount` | `number \| null` | não | Total de convidados que responderam (usado em `variant="colaborador"`) |
| `guestResponses` | `string[] \| null` | não | Textos anônimos dos convidados (usado em `variant="colaborador"`) |
| `guestMinimumNotReached` | `boolean \| null` | não | Flag que indica mínimo não atingido (usado em `variant="colaborador"`) |
| `guestEvaluations` | `GuestEvaluationDetailDTO[] \| null` | não | Lista identificada de convidados (usado em `variant="pdm"`) |
| `aiSummary` | `string \| null` | não | Sumário de IA; null no MVP |

- **Estado interno:** nenhum

**Comportamento de renderização por seção:**

**Seção autoavaliação:**
- Se `selfEvaluation != null`: exibir `selfEvaluation.responseText` e data formatada de `selfEvaluation.submittedAt`
- Se `selfEvaluation == null`: exibir mensagem "Autoavaliação não submetida"

**Seção avaliação do PDM:**
- Se `pdmEvaluation != null`: exibir `resultado`, `prontidao`, `action` em blocos separados + data de `submittedAt`
- Se `pdmEvaluation == null`: exibir mensagem "Avaliação do PDM não disponível"

**Seção convidados (depende de `variant`):**
- `variant="colaborador"` e `guestMinimumNotReached === true`: exibir mensagem "Número mínimo de respondentes não atingido para exibição" + contagem `(${guestRespondentCount} de 3 necessários)`
- `variant="colaborador"` e `guestMinimumNotReached === false` e `guestResponses` não vazio: exibir lista de textos sem identificação de autor; cada item separado visualmente
- `variant="colaborador"` e `guestResponses` é array vazio: mensagem "Nenhum convidado respondeu"
- `variant="pdm"` e `guestEvaluations` não vazio: exibir lista de itens com `evaluatorName` em destaque e `responseText` abaixo
- `variant="pdm"` e `guestEvaluations` é array vazio: mensagem "Nenhum convidado respondeu"

**Seção sumário de IA:**
- Se `aiSummary != null`: exibir em bloco destacado (esta seção não é usada no MVP — aiSummary sempre vem como null)
- Se `aiSummary == null`: **não renderizar** a seção — sem placeholder, sem "Em processamento", sem nenhum indicativo visual. A seção simplesmente não existe no DOM.

---

### Modificação em `CycleCard.tsx` — arquivo existente (feature 003)

O `CycleCard` atualmente exibe um link "Ver progresso" quando `currentPhase === 'COLLECTING'` apontando para `/ciclos/cf/:cycleSubjectId`. Quando o ciclo está CLOSED (`currentPhase === 'CLOSED'`), o card deve exibir um link apontando para `/ciclos/cf/:cycleSubjectId/resumo`.

**Mudança esperada:** adicionar bloco condicional para `currentPhase === 'CLOSED'` com link para `/ciclos/cf/${cycleSubjectId}/resumo` com label "Ver resumo". A prop `currentPhase` já existe no componente — nenhuma prop nova é necessária.

> Justificativa: o colaborador que vê um card de ciclo CLOSED na tela `/meus-ciclos` deve ser direcionado diretamente ao resumo, não ao painel de progresso de um ciclo já encerrado.

> Cuidado: a mudança deve ser condicional a `cycleType === 'CF'` — ciclos PR com status CLOSED não usam esta rota. Verificar que o bloco `currentPhase === 'COLLECTING' && isCF` existente não é afetado.

## Tipos TypeScript

Criar em `app/types/cfSummary.ts`:

```ts
export type SelfEvaluationSummaryDTO = {
  responseText: string;
  submittedAt: string;              // ISO-8601
};

export type PdmEvaluationSummaryDTO = {
  resultado: string;
  prontidao: string;
  action: string;
  submittedAt: string;              // ISO-8601
};

export type GuestEvaluationDetailDTO = {
  evaluatorName: string;
  responseText: string;
};

// Retornado pelo endpoint do colaborador (Regra 15: textos anônimos):
export type CfSummaryDTO = {
  cycleSubjectId: string;
  cycleStatus: string;
  selfEvaluation: SelfEvaluationSummaryDTO | null;
  pdmEvaluation: PdmEvaluationSummaryDTO | null;
  guestRespondentCount: number | null;
  guestResponses: string[] | null;
  guestMinimumNotReached: boolean | null;
  aiSummary: string | null;
};

// Retornado pelo endpoint do PDM (visão irrestrita):
export type PdmCfSummaryDTO = {
  cycleSubjectId: string;
  cycleStatus: string;
  selfEvaluation: SelfEvaluationSummaryDTO | null;
  pdmEvaluation: PdmEvaluationSummaryDTO | null;
  guestRespondentCount: number | null;
  guestEvaluations: GuestEvaluationDetailDTO[] | null;
  aiSummary: string | null;
};
```

## Novo serviço

Criar em `app/services/cfSummaryService.ts`:

```ts
import axios from 'axios';
import type { CfSummaryDTO, PdmCfSummaryDTO } from '../types/cfSummary';

export async function getColaboradorSummary(
  cycleSubjectId: string
): Promise<CfSummaryDTO> {
  const { data } = await axios.get<CfSummaryDTO>(
    `/api/me/ciclos/cf/${cycleSubjectId}/resumo`
  );
  return data;
}

export async function getPdmSummary(
  colaboradorId: string,
  cycleSubjectId: string
): Promise<PdmCfSummaryDTO> {
  const { data } = await axios.get<PdmCfSummaryDTO>(
    `/api/me/team/${colaboradorId}/cycles/${cycleSubjectId}/resumo`
  );
  return data;
}
```

## Integração com API

| Endpoint | Gatilho | Sucesso | Tratamento de erro |
|----------|---------|---------|-------------------|
| `GET /api/me/ciclos/cf/{cycleSubjectId}/resumo` | Montagem de `CfSummaryPage` | Popular `summaryData`; renderizar `CfNotClosedState` ou `CfSummaryPanel` conforme `cycleStatus` | `403` → `apiError = "FORBIDDEN"`, `EvaluationErrorState`; `404` → `apiError = "NOT_FOUND"`, `EvaluationErrorState`; `500` ou rede → `apiError = "SERVER_ERROR"`, `EvaluationErrorState` + retry |
| `GET /api/me/team/{colaboradorId}/cycles/{cycleSubjectId}/resumo` | Montagem de `PdmCfSummaryPage` | Popular `summaryData`; renderizar `CfNotClosedState` ou `CfSummaryPanel` com `variant="pdm"` | Mesmo tratamento de erro |

Contratos completos dos endpoints: ver `backend.md` desta pasta.

**Nota sobre retry:** o botão "Tentar novamente" deve re-executar o GET sem recarregar a página — mesmo padrão já estabelecido em `CfProgressPage` (feature 012).

## Estados de interface

### `CfSummaryPage` e `PdmCfSummaryPage`

| Estado | O que é exibido |
|--------|----------------|
| **Loading** | `EvaluationFormSkeleton` (componente já existente) |
| **Erro 403** | `EvaluationErrorState` com `errorType = "FORBIDDEN"` |
| **Erro 404** | `EvaluationErrorState` com `errorType = "NOT_FOUND"` |
| **Erro 500** | `EvaluationErrorState` com `errorType = "SERVER_ERROR"` + botão "Tentar novamente" |
| **Ciclo não CLOSED** | `CfNotClosedState` com `cycleStatus` passado como prop |
| **Ciclo CLOSED** | `CfSummaryPanel` com dados completos |

### `CfSummaryPanel`

| Estado | O que é exibido |
|--------|----------------|
| **`selfEvaluation != null`** | Bloco com título "Autoavaliação", texto e data de submissão |
| **`selfEvaluation == null`** | Bloco com título "Autoavaliação" e mensagem "Autoavaliação não submetida" |
| **`pdmEvaluation != null`** | Bloco com título "Avaliação do PDM" e três seções (resultado, prontidão, action) + data |
| **`pdmEvaluation == null`** | Bloco com título "Avaliação do PDM" e mensagem "Avaliação do PDM não disponível" |
| **Colaborador, mínimo não atingido** | Mensagem "Número mínimo de respondentes não atingido para exibição" |
| **Colaborador, textos disponíveis** | Lista de textos anônimos numerados ou separados visualmente |
| **PDM, convidados com resposta** | Lista com `evaluatorName` em destaque e `responseText` abaixo |
| **Nenhum convidado respondeu** | Mensagem "Nenhum convidado respondeu" |
| **`aiSummary == null`** | Seção IA **não renderizada** (sem nenhum placeholder) |
| **`aiSummary != null`** | Bloco destacado com o texto do sumário (não ocorre no MVP) |

## Estratégia de testes

**Renderização com dados válidos:**
- `CfSummaryPage` com ciclo CLOSED, `selfEvaluation` preenchida, `pdmEvaluation` preenchida, 4 convidados (>= 3) → renderiza `CfSummaryPanel` com os três blocos preenchidos e lista de textos anônimos sem nomes.
- `CfSummaryPage` com `guestMinimumNotReached = true` (2 respondentes) → mensagem de mínimo não atingido visível; textos de convidados ausentes do DOM.
- `CfSummaryPage` com `guestMinimumNotReached = false` e exatamente 3 respondentes → textos visíveis; mensagem de mínimo ausente.
- `CfSummaryPage` com `selfEvaluation = null` → mensagem "Autoavaliação não submetida" visível.
- `CfSummaryPage` com `pdmEvaluation = null` → mensagem "Avaliação do PDM não disponível" visível.
- `CfSummaryPage` com `aiSummary = null` → seção de IA completamente ausente do DOM.
- `PdmCfSummaryPage` com `guestEvaluations` contendo 2 itens → nomes dos avaliadores visíveis + textos; sem mensagem de mínimo não atingido.
- `PdmCfSummaryPage` com `guestEvaluations = []` → mensagem "Nenhum convidado respondeu".
- `CfSummaryPage` com `cycleStatus = "COLLECTING"` → `CfNotClosedState` renderizado; `CfSummaryPanel` ausente do DOM.

**Interações do usuário:**
- Botão "Tentar novamente" após erro `500` → re-executa o GET sem recarregar a página.

**Tratamento de erros de API:**
- GET retorna `401` → interceptor global redireciona para `/login` (comportamento existente, não requer teste específico nesta feature).
- GET retorna `403` → `EvaluationErrorState` com `errorType = "FORBIDDEN"`.
- GET retorna `404` → `EvaluationErrorState` com `errorType = "NOT_FOUND"`.
- GET retorna `500` → `EvaluationErrorState` com `errorType = "SERVER_ERROR"` + botão retry.

**Renderização condicional por permissão:**
- Rota `/ciclos/cf/:id/resumo` acessível a `CIETER` e `PDM` — verificar que `PrivateRoute` permite ambos os perfis.
- Rota `/meu-time/:colaboradorId/cf/:id/resumo` restrita a `PDM` — `CIETER` sem `PDM` deve ser redirecionado para `/acesso-negado`.

**Modificação em `CycleCard`:**
- Card CF com `currentPhase === 'CLOSED'` → link "Ver resumo" aponta para `/ciclos/cf/:cycleSubjectId/resumo`.
- Card CF com `currentPhase === 'COLLECTING'` → link "Ver progresso" aponta para `/ciclos/cf/:cycleSubjectId` (comportamento existente inalterado).
- Card PR com qualquer `currentPhase` → nenhum link de resumo de CF deve aparecer.

## Riscos técnicos e dependências

- **Conflito de rota com `ciclos/cf/:id`:** a rota `ciclos/cf/:id/resumo` é mais específica que `ciclos/cf/:id`. No React Router v7, o segmento fixo `/resumo` tem prioridade sobre o dinâmico — o path não será engolido. Verificar a ordem em `routes.tsx` após o registro das duas rotas para garantir que `/resumo` está antes de `/:id` na árvore de roteamento.

- **Conflito de rota PDM com feature 011 e 012:** `meu-time/:colaboradorId/cf/:id/resumo` é mais específica que `meu-time/:colaboradorId/cf/:id` e `meu-time/:colaboradorId/cf/:id/avaliar`. A inserção deve respeitar a ordem: `/resumo` e `/avaliar` antes de `/:id` na mesma árvore. Verificar `routes.tsx` após a inserção.

- **`CycleCard` usado em múltiplos contextos:** o `CycleCard` renderiza tanto ciclos CF quanto PR. A adição do link para `/ciclos/cf/:id/resumo` deve ser condicional a `cycleType === 'CF'` e `currentPhase === 'CLOSED'`. Verificar que a modificação não insere um link de resumo de CF em cards de ciclos PR.

- **`TeamMemberCard` e a tela `/meu-time`:** esta feature não especifica modificação no `TeamMemberCard` para incluir link para a rota PDM de resumo — a tela `/meu-time` e seus cards são dependências externas não cobertas por este escopo. A rota `meu-time/:colaboradorId/cf/:id/resumo` pode ser testada diretamente pela URL enquanto o `TeamMemberCard` não for atualizado.

- **`EvaluationFormSkeleton` e `EvaluationErrorState`:** os componentes são reutilizados de features anteriores (009, 010, 012). Confirmar que `EvaluationErrorState` aceita `errorType = "FORBIDDEN"` — esse valor foi adicionado na feature 010. Se não estiver implementado, será necessário ampliar o componente antes de usar nesta feature.

- **Datas de submissão:** os campos `submittedAt` nos DTOs chegam como strings ISO-8601 do backend. O `CfSummaryPanel` deve formatar as datas para o padrão pt-BR antes de exibir. Usar `new Date(submittedAt).toLocaleDateString('pt-BR', {...})` — mesmo padrão já adotado em `MeusCiclosPage.tsx`.

- **Campo `aiSummary` sempre nulo no MVP:** nenhuma lógica de exibição de sumário de IA deve ser implementada além de verificar `aiSummary != null` antes de renderizar o bloco. O campo existe no tipo TypeScript para compatibilidade futura com a feature 035, mas o bloco de IA nunca será renderizado no MVP.