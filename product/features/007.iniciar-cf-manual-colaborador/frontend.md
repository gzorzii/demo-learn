# Iniciar CF Manual pelo Próprio Colaborador — Frontend

**Referência:** `business.md` e `backend.md` nesta pasta
**Status:** Rascunho

---

## Visão geral

Esta feature não introduz uma nova tela. Ela estende a tela `/meus-ciclos` (implementada na feature 003) com um botão contextual "Iniciar CF" que aparece quando o colaborador não possui ciclo ativo. O botão é visível para os perfis `CIETER` e `PDM` acessando seus próprios ciclos.

Ator principal: **Colaborador** (`CIETER` ou `PDM`) agindo sobre si mesmo.

Tela modificada: `MeusCiclosPage` (componente já existente após feature 003). O `CyclesDashboard` é estendido para incluir a lógica de elegibilidade e a ação de início.

---

## Rotas e navegação

Nenhuma nova rota é introduzida. A ação ocorre inteiramente dentro de `/meus-ciclos`.

| Rota | Componente de página | Propósito |
|------|---------------------|-----------|
| `/meus-ciclos` | `MeusCiclosPage` (existente — 003) | Estendida com botão "Iniciar CF" e modal de confirmação |

**Entrada:** item "Meus Ciclos" no `SideNav` (feature 002). Disponível para `CIETER` e `PDM`.

**Transições a partir desta tela:**

- Nenhum ciclo ativo + elegível → botão "Iniciar CF" habilitado → abre `StartSelfCfModal`
  - Confirmar → `POST /api/me/ciclos/cf` → `201` → fechar modal + toast de confirmação + refetch de `GET /api/me/ciclos/ativos`
  - Confirmar → `POST /api/me/ciclos/cf` → `409` → fechar modal + exibir mensagem de impedimento inline
  - Cancelar → fechar modal, sem ação
- Nenhum ciclo ativo + inelegível → botão "Iniciar CF" desabilitado com tooltip explicativo
- Com ciclo ativo → botão "Iniciar CF" não exibido (já tratado pela regra de elegibilidade)

```
[SideNav — item "Meus Ciclos"]
  └── /meus-ciclos  (MeusCiclosPage)
        ├── [loading]        → skeletons (já existentes — 003)
        ├── [erro de API]    → mensagem de erro + retry (já existente — 003)
        ├── [sem ciclos ativos]
        │     ├── [elegível]    → ActiveCyclesEmptyState (estendido) + botão "Iniciar CF" habilitado
        │     │     └── [clicar] → StartSelfCfModal
        │     │           ├── [confirmar] → POST /api/me/ciclos/cf
        │     │           │     ├── [201] → fechar modal + toast + refetch GET
        │     │           │     └── [409] → fechar modal + impedimento inline
        │     │           └── [cancelar] → fechar modal
        │     └── [inelegível] → ActiveCyclesEmptyState + botão "Iniciar CF" disabled + tooltip
        └── [com ciclo ativo]  → CycleCard(s) (já existente — 003) sem botão "Iniciar CF"
```

---

## Componentes

### `MeusCiclosPage` (extensão do existente — feature 003)

- **Tipo:** page
- **Propósito:** Estender o componente existente para gerenciar o estado do `StartSelfCfModal` e o `lastImpediment` retornado por um `POST` com `409`.
- **Novos campos de estado interno** (além dos já definidos na feature 003):
  - `isStartCfModalOpen`: `boolean` — controla visibilidade do `StartSelfCfModal`
  - `isSubmittingCf`: `boolean` — controla o estado de loading do botão de confirmação no modal
  - `lastImpediment`: `string | null` — `errorCode` retornado pelo último `POST` com `409`; exibido como mensagem inline no empty state

---

### `StartSelfCfModal`

- **Tipo:** modal
- **Propósito:** Modal de confirmação exibido antes de chamar `POST /api/me/ciclos/cf`. Solicita confirmação explícita do colaborador. Exibe indicador de loading enquanto a chamada está em andamento. Não exibe erros de `409` — em caso de impedimento, o modal é fechado e a mensagem é exibida inline pela página.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `isOpen` | `boolean` | sim | Controla visibilidade do modal |
| `isSubmitting` | `boolean` | sim | Exibe loading no botão de confirmação durante o POST |
| `onConfirm` | `() => void` | sim | Callback acionado no clique de "Confirmar" |
| `onCancel` | `() => void` | sim | Callback acionado no clique de "Cancelar" ou fechamento |

- **Estado interno:** nenhum (stateless — estado de abertura e loading são gerenciados pelo `MeusCiclosPage`)

---

### `StartCfButton`

- **Tipo:** widget
- **Propósito:** Botão "Iniciar CF" com lógica de habilitação/desabilitação baseada na elegibilidade do colaborador. Quando desabilitado, exibe um tooltip com a mensagem correspondente ao `impedimentCode`. Componente stateless.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `eligibility` | `SelfEligibilityStatus` | sim | Resultado de elegibilidade derivado da resposta da API |
| `onClick` | `() => void` | sim | Callback acionado quando o botão está habilitado e é clicado |

- **Estado interno:** nenhum

> A elegibilidade do colaborador para si mesmo é derivada no frontend a partir da resposta de `GET /api/me/ciclos/ativos`: se `cycles` for lista vazia, o colaborador não tem CF nem PR ativo. O campo `blackoutEndsAt` do `409` é usado apenas após tentativa de criação — não há endpoint dedicado de elegibilidade para o colaborador (diferente do `GET /api/meu-time` da feature 006 que já retorna `eligibility` pré-calculada). Ver seção "Integração com API" para a lógica de derivação.

---

### `ActiveCyclesEmptyState` (extensão do existente — feature 003)

- **Tipo:** widget
- **Propósito:** Estender o componente existente para acomodar o `StartCfButton` e a mensagem de impedimento inline (`lastImpediment`). Quando não há ciclos ativos, é o ponto de renderização do botão.
- **Novos props** (além dos já definidos na feature 003):

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `eligibility` | `SelfEligibilityStatus \| null` | não | Se nulo, o botão não é exibido (ex: perfis sem permissão de iniciar CF) |
| `onStartCf` | `() => void` | não | Callback repassado ao `StartCfButton`; obrigatório quando `eligibility` não é nulo |
| `lastImpediment` | `SelfImpedimentCode \| null` | não | `errorCode` do último `409`; exibido como mensagem inline abaixo do botão |
| `blackoutEndsAt` | `string \| null` | não | Data ISO-8601 de encerramento do blackout; exibida quando `lastImpediment = "BLACKOUT_ACTIVE"` |

---

### Tipos TypeScript

```ts
type SelfImpedimentCode =
  | "CF_ALREADY_ACTIVE"
  | "PR_ALREADY_ACTIVE"
  | "BLACKOUT_ACTIVE";

type SelfEligibilityStatus = {
  canStartCf: boolean;
  impedimentCode: SelfImpedimentCode | null;
};

// Resposta de erro 409 do POST /api/me/ciclos/cf
type StartCfErrorResponse = {
  errorCode: SelfImpedimentCode;
  blackoutEndsAt?: string | null;
};
```

**Derivação de `SelfEligibilityStatus` a partir de `GET /api/me/ciclos/ativos`:**

| Condição da resposta | `canStartCf` | `impedimentCode` |
|---------------------|-------------|-----------------|
| `cycles: []` e sem blackout ativo | `true` | `null` |
| `cycles` contém item com `cycleType = "CF"` | `false` | `"CF_ALREADY_ACTIVE"` |
| `cycles` contém item com `cycleType = "PR"` | `false` | `"PR_ALREADY_ACTIVE"` |

> O impedimento de blackout (`BLACKOUT_ACTIVE`) não é detectável via `GET /api/me/ciclos/ativos` — a API de ciclos ativos não retorna informação de blackout. Portanto, o botão "Iniciar CF" é habilitado quando `cycles: []`, e o blackout só é revelado após a tentativa de criação (`409` com `errorCode = "BLACKOUT_ACTIVE"`). O frontend deve tratar esse caso exibindo a mensagem inline após o `409`.

**Mapeamento de `impedimentCode` para texto exibido ao usuário:**

| `impedimentCode` | Texto de tooltip / mensagem inline |
|-----------------|-----------------------------------|
| `CF_ALREADY_ACTIVE` | "Você já possui um CF ativo" |
| `PR_ALREADY_ACTIVE` | "Você possui um PR ativo — aguarde o encerramento para iniciar CF" |
| `BLACKOUT_ACTIVE` | "Período de blackout ativo — CF não pode ser iniciado agora" |

Quando `impedimentCode = "BLACKOUT_ACTIVE"` e `blackoutEndsAt` está disponível, complementar a mensagem com a data: ex. `"Período de blackout ativo até 15/07/2025"`.

---

## Integração com API

| Endpoint | Gatilho | Sucesso | Tratamento de erro |
|----------|---------|---------|-------------------|
| `GET /api/me/ciclos/ativos` | Montagem do `MeusCiclosPage` (já definido na feature 003) e após criação bem-sucedida de ciclo (refetch) | Derivar `SelfEligibilityStatus` a partir da lista retornada; se `cycles: []`, exibir botão "Iniciar CF" com elegibilidade calculada | Já tratado pela feature 003 — sem lógica adicional |
| `POST /api/me/ciclos/cf` | Clique em "Confirmar" no `StartSelfCfModal` | Fechar modal + exibir toast de confirmação + refetch de `GET /api/me/ciclos/ativos` | `409` → fechar modal + definir `lastImpediment` com `errorCode` e `blackoutEndsAt` (se presente); `403` → exibir mensagem de acesso negado (situação anômala); `500` → manter modal aberto com mensagem genérica de erro |

Contratos completos: ver `backend.md` desta pasta — seção `POST /api/me/ciclos/cf`.

**Nota sobre refetch:** após `201`, o `MeusCiclosPage` deve re-executar `GET /api/me/ciclos/ativos`. O ciclo recém-criado aparecerá na lista, a elegibilidade será derivada como `canStartCf = false`, e o botão "Iniciar CF" desaparecerá (pois o empty state não será mais renderizado).

**Nota sobre `lastImpediment`:** o estado `lastImpediment` deve ser limpo quando o usuário abre o modal novamente ou quando a lista é refetchada.

---

## Estados de interface

### `MeusCiclosPage` — estados adicionais aos já definidos na feature 003

| Estado | O que é exibido |
|--------|----------------|
| **Sem ciclos + elegível** | `ActiveCyclesEmptyState` com `StartCfButton` habilitado |
| **Sem ciclos + inelegível (CF ou PR ativo impossível, mas blackout detectado via 409)** | `ActiveCyclesEmptyState` com `StartCfButton` desabilitado + tooltip |
| **Após 409** | `ActiveCyclesEmptyState` com mensagem inline do `lastImpediment` (e data de blackout se disponível) |

### `StartSelfCfModal`

| Estado | O que é exibido |
|--------|----------------|
| **Aberto, aguardando confirmação** | Mensagem de confirmação, botão "Iniciar CF" habilitado, botão "Cancelar" habilitado |
| **Submetendo** | Botão "Iniciar CF" com indicador de loading, botão "Cancelar" desabilitado |
| **Erro `500`** | Mensagem de erro genérica no corpo do modal; botões voltam ao estado normal para permitir nova tentativa |

### `StartCfButton`

| Estado | O que é exibido |
|--------|----------------|
| **Habilitado** | Botão ativo; sem tooltip |
| **Desabilitado** | Botão com `disabled`; tooltip com texto mapeado do `impedimentCode` |

---

## Estratégia de testes

**Renderização com dados válidos:**
- `MeusCiclosPage` com `cycles: []` renderiza `ActiveCyclesEmptyState` com `StartCfButton` habilitado.
- `MeusCiclosPage` com ciclo CF ativo renderiza `CycleCard` (sem botão "Iniciar CF" visível — empty state não é exibido).
- `StartCfButton` com `canStartCf = false` e `impedimentCode = "CF_ALREADY_ACTIVE"` é renderizado como `disabled` com tooltip correto.
- Tooltip dos três `impedimentCode` possíveis exibe textos distintos e corretos.
- `ActiveCyclesEmptyState` com `lastImpediment = "BLACKOUT_ACTIVE"` e `blackoutEndsAt` preenchido exibe a data de encerramento.
- `ActiveCyclesEmptyState` com `lastImpediment = "BLACKOUT_ACTIVE"` e `blackoutEndsAt = null` exibe mensagem sem data.

**Interações do usuário:**
- Clique em "Iniciar CF" (habilitado) → `StartSelfCfModal` é aberto.
- Clique em "Cancelar" no modal → modal fecha, nenhuma chamada à API é feita, lista permanece inalterada.
- Clique em "Confirmar" no modal → chamada `POST` é executada; botão "Confirmar" entra em estado de loading.
- Clique em "Tentar novamente" no estado de erro da página → re-executa `GET /api/me/ciclos/ativos` (comportamento já existente na feature 003).

**Tratamento de erros de API:**
- `POST /api/me/ciclos/cf` retorna `409` com `errorCode = "CF_ALREADY_ACTIVE"` → modal fecha, mensagem inline aparece; `StartCfButton` passa para `disabled` com tooltip correspondente.
- `POST /api/me/ciclos/cf` retorna `409` com `errorCode = "BLACKOUT_ACTIVE"` e `blackoutEndsAt` preenchido → modal fecha, mensagem inline com data de encerramento.
- `POST /api/me/ciclos/cf` retorna `409` com `errorCode = "PR_ALREADY_ACTIVE"` → modal fecha, mensagem inline.
- `POST /api/me/ciclos/cf` retorna `500` → modal permanece aberto com mensagem genérica.
- `POST /api/me/ciclos/cf` retorna `201` → modal fecha, toast exibido, `GET /api/me/ciclos/ativos` é re-executado.

**Renderização condicional por permissão:**
- Perfis `CIETER` e `PDM` veem o botão "Iniciar CF" em `/meus-ciclos`.
- Perfil `CALIBRATOR` ou `BP` sem acumulação de `CIETER`/`PDM` é redirecionado para `/acesso-negado` pelo `ProtectedRoute` (comportamento já existente na feature 003 — sem lógica adicional).

---

## Riscos técnicos e dependências

- **Dependência da feature 003:** esta feature modifica componentes já definidos e implementados pela feature 003 (`MeusCiclosPage`, `ActiveCyclesEmptyState`). Os componentes devem ser estendidos sem quebrar o comportamento somente-leitura existente. O desenvolvimento desta feature pressupõe que a feature 003 esteja implementada.

- **Elegibilidade não disponível antes da tentativa:** diferente da feature 006 (onde `GET /api/meu-time` retorna `eligibility` pré-calculada por liderado), o colaborador não possui um endpoint dedicado de pré-verificação. A detecção de blackout ocorre apenas via `POST` retornando `409`. Isso significa que o botão pode ficar habilitado mesmo quando há blackout — o usuário verá o impedimento somente após clicar em "Confirmar". Este é o comportamento esperado dado o escopo atual da API.

- **Extensão de `ActiveCyclesEmptyState`:** o componente existente (feature 003) é stateless e sem props. A extensão proposta introduz três props opcionais (`eligibility`, `onStartCf`, `lastImpediment`). Para manter compatibilidade retroativa, todas devem ser opcionais e o componente deve funcionar identicamente quando não fornecidas.

- **Sincronização após `409`:** se o `POST` retornar `409` com `errorCode = "CF_ALREADY_ACTIVE"` (o colaborador criou o ciclo em outra aba/sessão), o `GET /api/me/ciclos/ativos` deve ser re-executado para refletir o estado atual. Caso contrário, o empty state continuará exibido com o botão em estado de erro mesmo havendo ciclo ativo. Recomenda-se disparar refetch também após `409`.

- **Reutilização de `StartCfModal` da feature 006:** a feature 006 define `StartCfModal` para o contexto do PDM. Por contexto semântico distinto (o ator e a mensagem são diferentes), define-se aqui `StartSelfCfModal` como componente separado. Se o projeto optar por unificar em um componente genérico de confirmação, isso é decisão de implementação — não há impedimento técnico.