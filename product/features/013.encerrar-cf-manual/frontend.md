# Encerrar CF Manual pela Sujeita — Frontend

**Referência:** `business.md` e `backend.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature não introduz nenhuma nova página nem nova rota. Todas as alterações são modificações em arquivos existentes da feature 012:

- `CfProgressPage.tsx` — adiciona estado de modal de confirmação e orquestra a chamada de encerramento
- `CfProgressPanel.tsx` — recebe nova prop `onCloseCycle` e renderiza o botão "Encerrar CF" condicionalmente
- `cfProgressService.ts` — adiciona função `closeCfCycle`
- `types/cfProgress.ts` — adiciona campo `initiatedBy` ao tipo `CfProgressDTO`

Além disso, é criado um novo componente modal reutilizável:

- `ConfirmCloseModal.tsx` — modal de confirmação de encerramento (novo arquivo)

O ator é o **colaborador** autenticado (sujeita do CF manual ativo). O botão "Encerrar CF" é exibido somente quando `data.initiatedBy` for `"MANUAL_SUBJECT"` ou `"MANUAL_PDM"` e `data.cycleStatus` for `"COLLECTING"`. Em todos os outros casos, o botão não é renderizado.

## Rotas e navegação

Nenhuma nova rota. Esta feature opera inteiramente dentro de `/ciclos/cf/:id` (já registrada em `routes.tsx` como `CfProgressPage`).

```
/ciclos/cf/:id  (CfProgressPage — feature 012, modificada por esta feature)
  └── [ciclo CF manual + status COLLECTING]
        └── botão "Encerrar CF" (CfProgressPanel via prop onCloseCycle)
              └── [clique] → ConfirmCloseModal (isOpen=true)
                    ├── [confirmar] → POST /api/me/ciclos/cf/:id/encerrar
                    │     ├── [204] → navigate('/ciclos/cf/:id/resumo')  (feature 014)
                    │     └── [409 CYCLE_ALREADY_CLOSED] → exibir mensagem de erro inline
                    └── [cancelar] → ConfirmCloseModal (isOpen=false) → /ciclos/cf/:id sem alterações
```

**Observação sobre a rota de destino após confirmação:** a rota `/ciclos/cf/:id/resumo` é introduzida pela feature 014 e ainda não existe no `routes.tsx`. O `navigate` deve ser programado para esse caminho; se a rota não estiver registrada quando o usuário confirmar, o React Router renderizará a tela de rota não encontrada. Isso é aceitável durante o desenvolvimento incremental.

## Componentes

### `ConfirmCloseModal` — novo arquivo em `app/components/ConfirmCloseModal.tsx`

- **Tipo:** modal
- **Propósito:** Modal de confirmação de encerramento irreversível. Stateless — todo controle de abertura e estado de loading é gerenciado pelo pai (`CfProgressPage`).
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `isOpen` | `boolean` | sim | Controla a visibilidade do modal |
| `isLoading` | `boolean` | sim | Desabilita botões e exibe indicador durante o POST |
| `error` | `string \| null` | sim | Mensagem de erro a exibir dentro do modal (ex: "Este ciclo já foi encerrado") |
| `onConfirm` | `() => void` | sim | Callback acionado ao clicar em "Confirmar encerramento" |
| `onCancel` | `() => void` | sim | Callback acionado ao clicar em "Cancelar" ou fechar o modal |

- **Conteúdo fixo do modal:**
  - Título: "Encerrar ciclo CF"
  - Corpo: "Esta ação é irreversível. O ciclo CF será encerrado e não poderá ser reaberto."
  - Área de erro: exibida condicionalmente quando `error != null`, com a mensagem recebida via prop
  - Botão primário: "Confirmar encerramento" — desabilitado quando `isLoading = true`
  - Botão secundário: "Cancelar" — desabilitado quando `isLoading = true`

- **Estado interno:** nenhum

### Modificação em `CfProgressPage.tsx` — arquivo existente (feature 012)

Três blocos de mudança:

**1. Adicionar estado de modal:**

| State | Tipo | Valor inicial | Descrição |
|-------|------|---------------|-----------|
| `showConfirmModal` | `boolean` | `false` | Controla a visibilidade do `ConfirmCloseModal` |
| `isClosing` | `boolean` | `false` | `true` durante o POST de encerramento |
| `closeError` | `string \| null` | `null` | Mensagem de erro exibida dentro do modal após falha no POST |

**2. Adicionar função `handleCloseCycle`:**

```
async function handleCloseCycle():
  setIsClosing(true)
  setCloseError(null)
  try:
    await closeCfCycle(id)
    navigate(`/ciclos/cf/${id}/resumo`)
  catch (err):
    if 409 → setCloseError("Este ciclo CF já foi encerrado.")
    else    → setCloseError("Ocorreu um erro ao encerrar o ciclo. Tente novamente.")
  finally:
    setIsClosing(false)
```

**3. Montar `onCloseCycle` para passar ao `CfProgressPanel`:**

A prop `onCloseCycle` deve ser `() => setShowConfirmModal(true)` quando o ciclo é manual E está em `COLLECTING`. Caso contrário, deve ser `null`.

```
const onCloseCycle =
  data &&
  (data.initiatedBy === 'MANUAL_SUBJECT' || data.initiatedBy === 'MANUAL_PDM') &&
  data.cycleStatus === 'COLLECTING'
    ? () => setShowConfirmModal(true)
    : null;
```

Adicionar ao JSX retornado:
- Passar `onCloseCycle` para `<CfProgressPanel>`
- Renderizar `<ConfirmCloseModal>` com as props correspondentes

### Modificação em `CfProgressPanel.tsx` — arquivo existente (feature 012)

Uma única mudança: adicionar a prop `onCloseCycle` e renderizar o botão condicionalmente.

**Nova prop:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `onCloseCycle` | `(() => void) \| null` | sim | Callback que abre o modal de confirmação; `null` quando o botão não deve ser exibido |

**Renderização condicional:** se `onCloseCycle != null`, renderizar o botão "Encerrar CF" no painel. O botão não precisa de estado interno — chama `onCloseCycle()` ao ser clicado. Sugestão de posicionamento: ao final do painel, após as seções de status das avaliações, convidados e prazo.

**Nenhuma outra prop é alterada.** A lógica de decisão sobre se o botão deve aparecer não é responsabilidade do `CfProgressPanel` — ela já está computada pelo pai via `onCloseCycle`.

### Modificação em `cfProgressService.ts` — arquivo existente (feature 012)

Adicionar a função de encerramento:

```ts
export async function closeCfCycle(cycleSubjectId: string): Promise<void> {
  await axios.post(`/api/me/ciclos/cf/${cycleSubjectId}/encerrar`);
}
```

### Modificação em `types/cfProgress.ts` — arquivo existente (feature 012)

Adicionar o campo `initiatedBy` ao tipo `CfProgressDTO`:

```ts
export type CfProgressDTO = {
  cycleSubjectId: string;
  cycleStatus: string;
  selfEvaluationStatus: "PENDING" | "SUBMITTED";
  pdmEvaluationStatus: "PENDING" | "RESPONDED";
  guestTotal: number;
  guestResponded: number;
  collectionDeadline: string | null;
  daysRemaining: number | null;
  initiatedBy: string | null;   // novo campo — ex: "MANUAL_SUBJECT", "MANUAL_PDM", "QUARTERLY_AUTO"
};
```

O campo é `string | null` no tipo TypeScript porque o backend pode retornar `null` se `cycle.trigger_type` for nulo (embora na prática isso não ocorra para ciclos CF ativos). Usar `null` como fallback seguro evita erros de parsing.

## Integração com API

| Endpoint | Gatilho | Sucesso | Tratamento de erro |
|----------|---------|---------|-------------------|
| `GET /api/me/ciclos/cf/{cycleSubjectId}/progresso` | Montagem de `CfProgressPage` (já existente — feature 012) | Popular `data` incluindo o novo campo `initiatedBy`; derivar `onCloseCycle` a partir de `data.initiatedBy` e `data.cycleStatus` | Sem alteração no tratamento de erro existente |
| `POST /api/me/ciclos/cf/{cycleSubjectId}/encerrar` | Confirmação no `ConfirmCloseModal` (botão "Confirmar encerramento") | `204` → `navigate('/ciclos/cf/:id/resumo')` | `409` → `setCloseError("Este ciclo CF já foi encerrado.")` — exibir dentro do modal; outros erros → `setCloseError("Ocorreu um erro ao encerrar o ciclo. Tente novamente.")` — exibir dentro do modal |

Contrato completo do endpoint `POST`: ver `backend.md` desta pasta — seção `POST /api/me/ciclos/cf/{cycleSubjectId}/encerrar`.

## Estados de interface

### `CfProgressPage` — adições ao comportamento existente

| Estado | O que é exibido |
|--------|----------------|
| **Ciclo CF manual + COLLECTING** | Botão "Encerrar CF" visível em `CfProgressPanel` via `onCloseCycle != null` |
| **Ciclo CF automático/por evento** | Botão "Encerrar CF" ausente (`onCloseCycle = null`) |
| **Ciclo já CLOSED** | Botão "Encerrar CF" ausente (`cycleStatus != "COLLECTING"`) |
| **Modal fechado** | `showConfirmModal = false`; `CfProgressPanel` visível normalmente |
| **Modal aberto (idle)** | `ConfirmCloseModal` visível; botões "Confirmar" e "Cancelar" habilitados |
| **Modal aberto + POST em progresso** | `isLoading = true`; botões "Confirmar" e "Cancelar" desabilitados; indicador de loading no botão "Confirmar" |
| **Modal aberto + erro após POST** | Mensagem de erro visível dentro do modal; botões reabilitados para nova tentativa |
| **POST concluído com sucesso** | Navegação para `/ciclos/cf/:id/resumo` (feature 014) — a página atual é desmontada |

### `ConfirmCloseModal`

| Estado | O que é exibido |
|--------|----------------|
| **`isOpen = false`** | Modal não renderizado (ou oculto, dependendo da implementação) |
| **`isOpen = true, isLoading = false, error = null`** | Modal com aviso de irreversibilidade; botões "Cancelar" e "Confirmar encerramento" habilitados |
| **`isOpen = true, isLoading = true`** | Botões desabilitados; indicador de loading no botão "Confirmar encerramento" |
| **`isOpen = true, isLoading = false, error != null`** | Área de erro visível com a mensagem recebida; botões reabilitados |

## Estratégia de testes

**Renderização condicional do botão:**
- `CfProgressPage` com `initiatedBy = "MANUAL_SUBJECT"` e `cycleStatus = "COLLECTING"` → botão "Encerrar CF" presente no DOM.
- `CfProgressPage` com `initiatedBy = "QUARTERLY_AUTO"` → botão "Encerrar CF" ausente do DOM.
- `CfProgressPage` com `initiatedBy = "EVENT"` → botão "Encerrar CF" ausente do DOM.
- `CfProgressPage` com `initiatedBy = "MANUAL_PDM"` e `cycleStatus = "COLLECTING"` → botão "Encerrar CF" presente.
- `CfProgressPage` com `initiatedBy = "MANUAL_SUBJECT"` e `cycleStatus = "CLOSED"` → botão "Encerrar CF" ausente (ciclo já encerrado).
- `CfProgressPage` com `initiatedBy = null` → botão "Encerrar CF" ausente.

**Interações do usuário:**
- Clicar em "Encerrar CF" → `ConfirmCloseModal` torna-se visível (`isOpen = true`).
- Clicar em "Cancelar" no modal → modal fecha (`isOpen = false`); a página permanece em `/ciclos/cf/:id` sem alteração.
- Clicar em "Confirmar encerramento" → botões desabilitados (`isLoading = true`); após resposta `204` → `navigate('/ciclos/cf/:id/resumo')`.

**Tratamento de erros de API no POST:**
- POST retorna `409` → modal permanece aberto; mensagem "Este ciclo CF já foi encerrado." visível; botões reabilitados.
- POST retorna `500` ou erro de rede → modal permanece aberto; mensagem de erro genérica visível; botões reabilitados.
- POST retorna `403` → modal permanece aberto; mensagem de erro genérica visível (o 403 neste contexto indica inconsistência de estado — o usuário já estava na tela do próprio ciclo).

**Modificação no tipo `CfProgressDTO`:**
- Verificar que o campo `initiatedBy` é lido corretamente do JSON retornado pelo GET de progresso e repassado para a lógica de `onCloseCycle`.
- Verificar que `initiatedBy = null` não quebra a lógica (resultado: `onCloseCycle = null`, botão ausente).

**Isolamento de componentes:**
- `ConfirmCloseModal` com `isOpen = true, isLoading = false, error = null` → renderiza aviso de irreversibilidade e dois botões.
- `ConfirmCloseModal` com `isLoading = true` → botões desabilitados.
- `ConfirmCloseModal` com `error = "mensagem de erro"` → mensagem visível no DOM.
- `CfProgressPanel` com `onCloseCycle = () => {}` → botão "Encerrar CF" presente.
- `CfProgressPanel` com `onCloseCycle = null` → botão "Encerrar CF" ausente.

**Renderização condicional por permissão:**
- A rota `/ciclos/cf/:id` já é protegida por `PrivateRoute` para `CIETER` e `PDM`. Nenhuma proteção adicional de rota é necessária para esta feature.

## Riscos técnicos e dependências

- **Dependência do campo `initiatedBy` no backend (feature 012):** o campo `initiatedBy` precisa ser adicionado ao `CfProgressDto` Java e serializado no GET de progresso. Se a extensão do backend não estiver implementada, o campo chegará como `undefined` no frontend, a condição `data.initiatedBy === 'MANUAL_SUBJECT'` será sempre falsa e o botão não aparecerá — comportamento silencioso sem erro. Garantir que backend e frontend desta feature sejam entregues em conjunto.

- **Rota de destino `/ciclos/cf/:id/resumo` (feature 014) não existe ainda:** o `navigate` após o `204` aponta para uma rota que só existirá quando a feature 014 for implementada. Enquanto não existir, o usuário será redirecionado para uma tela de rota não encontrada. Comunicar essa dependência de sequência ao time.

- **`ConfirmCloseModal` como componente novo vs. modal genérico:** o projeto ainda não possui um componente de modal genérico reutilizável. `ConfirmCloseModal` é um componente específico criado para esta feature. Se o projeto adotar um sistema de modal genérico no futuro, este componente poderá ser refatorado — sem impacto funcional na feature 013.

- **`PdmCfProgressPage` não recebe botão de encerramento:** o botão é exclusivo da visão do colaborador (`CfProgressPage`). `PdmCfProgressPage` e `CfProgressPanel` quando usado pelo PDM devem sempre passar `onCloseCycle = null`. Verificar que a modificação no `CfProgressPanel.tsx` não introduz o botão inadvertidamente na visão do PDM.
