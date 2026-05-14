# Iniciar CF Manual pelo PDM — Frontend

**Referência:** `business.md` e `backend.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature implementa a tela `/meu-time`, que ainda não existe (o placeholder foi registrado no menu lateral pela feature 002 mas nunca implementado). A tela lista os liderados diretos do PDM autenticado e permite que ele inicie um ciclo CF manual para qualquer liderado elegível.

Ator principal: **PDM** — único usuário que acessa esta tela e que pode acionar a criação de ciclo.

Telas introduzidas: `MeuTimePage` (substituição do placeholder em `/meu-time`).

## Rotas e navegação

| Rota | Componente de página | Propósito |
|------|---------------------|-----------|
| `/meu-time` | `MeuTimePage` | Lista de liderados do PDM com status de ciclo e ação "Iniciar CF" por liderado |

**Entrada:** item "Meu Time" no `SideNav` (definido na feature 002). Disponível exclusivamente para o perfil `PDM`.

**Transições a partir desta tela:**

- Confirmação de início de CF (modal) → criação bem-sucedida → permanece em `/meu-time` com toast de confirmação e lista atualizada
- Cancelamento do modal → permanece em `/meu-time` sem alteração
- Erro de elegibilidade → mensagem inline no card do liderado (sem navegação)

```
[SideNav — item "Meu Time"]
  └── /meu-time  (MeuTimePage)
        ├── [loading]             → skeletons dos cards de liderado
        ├── [erro de API]         → mensagem de erro + botão "Tentar novamente"
        ├── [sem liderados]       → empty state informativo
        └── [lista de liderados]
              └── [TeamMemberCard — por liderado]
                    ├── [liderado elegível]
                    │     └── botão "Iniciar CF" → StartCfModal
                    │           ├── [confirmar] → POST /api/meu-time/{id}/ciclos/cf
                    │           │     ├── [201] → fechar modal + toast sucesso + refetch lista
                    │           │     └── [409] → fechar modal + mensagem inline no card
                    │           └── [cancelar] → fechar modal, sem ação
                    └── [liderado inelegível]
                          └── botão "Iniciar CF" disabled + tooltip com motivo do impedimento
```

## Componentes

### `MeuTimePage`
- **Tipo:** page
- **Propósito:** Página da rota `/meu-time`. Orquestra o carregamento da lista de liderados via `GET /api/meu-time`, gerencia os estados de loading/erro/empty/sucesso e renderiza os cards.
- **Props:** nenhuma
- **Estado interno:**
  - `teamMembers`: array do tipo `TeamMemberDTO[]`
  - `loading`: `boolean` — controla exibição dos skeletons
  - `error`: `boolean` — controla exibição do estado de erro
  - `selectedMember`: `TeamMemberDTO | null` — liderado para quem o modal de confirmação está aberto

---

### `TeamMemberCard`
- **Tipo:** section (card de liderado)
- **Propósito:** Exibe as informações de um liderado: nome, e-mail, status do ciclo ativo (se houver) e o botão "Iniciar CF" habilitado ou desabilitado conforme elegibilidade. Componente stateless — recebe todos os dados via props. Também exibe a mensagem de impedimento inline quando `lastError` está preenchido (após retorno `409` do POST).
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `userId` | `string` | sim | ID do liderado |
| `name` | `string` | sim | Nome completo do liderado |
| `email` | `string` | sim | E-mail do liderado |
| `activeCycle` | `ActiveCycleSummary \| null` | não | Ciclo ativo do liderado; `null` se não houver |
| `eligibility` | `EligibilityStatus` | sim | Resultado da elegibilidade retornado pela API |
| `lastError` | `string \| null` | não | `errorCode` retornado pelo último `POST` com `409`; exibido como mensagem inline no card |
| `onStartCf` | `() => void` | sim | Callback acionado quando o PDM clica em "Iniciar CF" (abre o modal) |

- **Estado interno:** nenhum (stateless)

---

### `StartCfModal`
- **Tipo:** modal
- **Propósito:** Modal de confirmação exibido antes de chamar o endpoint de criação. Apresenta o nome do liderado e solicita confirmação explícita do PDM. Exibe indicador de loading enquanto a chamada está em andamento. Não exibe erros — em caso de `409`, o modal é fechado e a mensagem de impedimento é exibida inline no card pelo componente pai.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `memberName` | `string` | sim | Nome do liderado exibido no corpo do modal |
| `isOpen` | `boolean` | sim | Controla visibilidade do modal |
| `isSubmitting` | `boolean` | sim | Exibe loading no botão de confirmação durante o POST |
| `onConfirm` | `() => void` | sim | Callback acionado no clique de "Confirmar" |
| `onCancel` | `() => void` | sim | Callback acionado no clique de "Cancelar" ou fechamento do modal |

- **Estado interno:** nenhum (stateless — estado de loading e abertura são gerenciados pelo `MeuTimePage`)

---

### `TeamMemberCardSkeleton`
- **Tipo:** widget
- **Propósito:** Placeholder animado com o mesmo layout visual do `TeamMemberCard`, exibido durante o carregamento da lista.
- **Props:** nenhuma
- **Estado interno:** nenhum

---

### `TeamEmptyState`
- **Tipo:** widget
- **Propósito:** Exibido quando `teamMembers` é uma lista vazia. Mensagem informativa indicando que o PDM não possui liderados diretos cadastrados.
- **Props:** nenhuma
- **Estado interno:** nenhum

---

### Tipos TypeScript

```ts
type ActiveCycleSummary = {
  cycleType: "CF" | "PR";
  cycleStatus: string;
};

type EligibilityStatus = {
  canStartCf: boolean;
  impedimentCode: "CF_ALREADY_ACTIVE" | "PR_ALREADY_ACTIVE" | "BLACKOUT_ACTIVE" | null;
};

type TeamMemberDTO = {
  userId: string;
  name: string;
  email: string;
  activeCycle: ActiveCycleSummary | null;
  eligibility: EligibilityStatus;
};

type TeamMembersResponse = {
  teamMembers: TeamMemberDTO[];
};
```

**Mapeamento de `impedimentCode` para texto exibido ao usuário:**

| `impedimentCode` | Texto de tooltip / mensagem inline |
|------------------|-----------------------------------|
| `CF_ALREADY_ACTIVE` | "CF já ativo para este colaborador" |
| `PR_ALREADY_ACTIVE` | "PR ativo para este colaborador — aguarde o encerramento" |
| `BLACKOUT_ACTIVE` | "Período de blackout ativo — CF não pode ser iniciado agora" |

## Integração com API

| Endpoint | Gatilho | Sucesso | Tratamento de erro |
|----------|---------|---------|-------------------|
| `GET /api/meu-time` | Montagem do `MeuTimePage` e após criação bem-sucedida de ciclo (refetch) | Popular `teamMembers` com a lista retornada; se vazia, exibir `TeamEmptyState` | `401` → interceptor global redireciona para `/login`; `403` → redirecionar para `/acesso-negado` (feature 002); `500` ou erro de rede → exibir estado de erro com botão "Tentar novamente" |
| `POST /api/meu-time/{subjectUserId}/ciclos/cf` | Clique em "Confirmar" no `StartCfModal` | Fechar modal + exibir toast de confirmação com nome do liderado + refetch de `GET /api/meu-time` | `409` → fechar modal + definir `lastError` no card do liderado com o `errorCode` retornado; `403` → exibir mensagem de acesso negado no modal (situação anômala — elegibilidade deveria ter impedido o botão); `500` → exibir mensagem genérica de erro no modal sem fechar |

Contratos completos: ver `backend.md` desta pasta — seções `GET /api/meu-time` e `POST /api/meu-time/{subjectUserId}/ciclos/cf`.

**Nota sobre refetch:** após uma criação bem-sucedida (`201`), o `MeuTimePage` deve re-executar o `GET /api/meu-time` para refletir o novo status de ciclo do liderado (que agora terá `canStartCf = false` com `impedimentCode = "CF_ALREADY_ACTIVE"`). Isso garante que o botão fique desabilitado sem necessidade de lógica local de mutação de estado.

**Nota sobre `lastError`:** o `errorCode` retornado pelo `409` é armazenado no estado do `MeuTimePage` associado ao `userId` do liderado e repassado via prop `lastError` para o `TeamMemberCard` correspondente. O erro deve ser limpo quando o PDM abre o modal de outro liderado ou quando a lista é refetchada.

## Estados de interface

### `MeuTimePage`

| Estado | O que é exibido |
|--------|----------------|
| **Loading** | N `TeamMemberCardSkeleton` (sugestão: exibir 3 placeholders) |
| **Erro** | Mensagem genérica de falha ao carregar a lista + botão "Tentar novamente" que re-executa `GET /api/meu-time` |
| **Empty** | `TeamEmptyState` com mensagem indicando ausência de liderados cadastrados |
| **Sucesso** | Lista de `TeamMemberCard`, um por liderado |

### `TeamMemberCard`

| Estado | O que é exibido |
|--------|----------------|
| **Liderado elegível** | Botão "Iniciar CF" habilitado; nenhuma mensagem de impedimento |
| **Liderado inelegível** | Botão "Iniciar CF" desabilitado (`disabled`) com tooltip exibindo o texto mapeado do `impedimentCode` |
| **Com ciclo ativo** | Informação do ciclo (tipo e status) exibida no card |
| **Com `lastError`** | Mensagem inline abaixo do botão com texto do `impedimentCode` (erro retornado pelo POST após tentativa) |

### `StartCfModal`

| Estado | O que é exibido |
|--------|----------------|
| **Aberto, aguardando confirmação** | Nome do liderado, botão "Confirmar" habilitado, botão "Cancelar" habilitado |
| **Submetendo** | Botão "Confirmar" com indicador de loading, botão "Cancelar" desabilitado para evitar duplo submit |
| **Erro `500`** | Mensagem de erro genérica no corpo do modal; botões voltam ao estado normal para permitir nova tentativa |

## Estratégia de testes

**Renderização com dados válidos:**
- `MeuTimePage` com dois liderados (um elegível, um com `impedimentCode = "PR_ALREADY_ACTIVE"`) renderiza dois `TeamMemberCard`; o segundo tem botão desabilitado.
- `MeuTimePage` com `teamMembers: []` renderiza `TeamEmptyState`.
- `TeamMemberCard` com `activeCycle = null` renderiza sem bloco de status de ciclo.
- `TeamMemberCard` com `canStartCf = false` e `impedimentCode = "CF_ALREADY_ACTIVE"` exibe tooltip com texto correto.
- Tooltip dos três `impedimentCode` possíveis exibe textos distintos e corretos.

**Interações do usuário:**
- Clique em "Iniciar CF" (habilitado) → `StartCfModal` é aberto com o nome do liderado correto.
- Clique em "Cancelar" no modal → modal fecha, nenhuma chamada à API é feita, lista permanece inalterada.
- Clique em "Confirmar" no modal → chamada `POST` é executada; botão "Confirmar" entra em estado de loading.
- Clique em "Tentar novamente" no estado de erro da página → re-executa `GET /api/meu-time`.

**Tratamento de erros de API:**
- `POST` retorna `409` com `errorCode = "CF_ALREADY_ACTIVE"` → modal fecha, mensagem inline aparece no card do liderado correto.
- `POST` retorna `409` com `errorCode = "BLACKOUT_ACTIVE"` → modal fecha, mensagem inline com texto de blackout.
- `POST` retorna `500` → modal permanece aberto com mensagem de erro genérica.
- `GET /api/meu-time` retorna `401` → interceptor redireciona para `/login`.
- `GET /api/meu-time` retorna `500` → `MeuTimePage` exibe estado de erro com retry.

**Renderização condicional por permissão:**
- `ProtectedRoute` em `/meu-time` deve permitir exclusivamente o perfil `PDM`.
- Perfil `CIETER` sem acumulação de `PDM` deve ser redirecionado para `/acesso-negado`.

## Riscos técnicos e dependências

- **Dependência da feature 002:** o item de menu "Meu Time" apontando para `/meu-time` já está registrado no `SideNav` (feature 002), mas a rota `/meu-time` está como placeholder. Esta feature substitui o placeholder pela implementação real. O nome do componente exportado deve ser `MeuTimePage` para não quebrar referências no router.

- **Reutilização de `CyclesDashboard` da feature 003:** o `backend.md` da feature 003 documenta que `GET /api/me/ciclos/ativos` e o futuro `GET /api/meu-time/{userId}/ciclos/ativos` devem retornar o mesmo DTO para permitir reutilização do `CyclesDashboard`. Esta feature não implementa a visão de ciclos do liderado — mas o `TeamMemberCard` exibe um resumo (`activeCycle`) diferente do `CycleCard` completo. Se o PDM precisar ver os ciclos detalhados de um liderado, isso requer navegação para `/meu-time/:id/ciclos` (fora do escopo desta feature).

- **`lastError` e dessincronização de estado:** se o PDM clicar em "Iniciar CF" para um liderado que acabou de ter um ciclo criado por outra sessão (race condition), o `POST` retornará `409`. O `lastError` exibirá a mensagem inline corretamente, mas o `activeCycle` no card ainda mostrará o estado anterior (sem ciclo) até o próximo refetch. O refetch automático após `201` não ocorre neste caso — o frontend deve tratar `409` como sinal para também refazer o `GET /api/meu-time`, garantindo sincronização.

- **Tooltip de impedimento vs. `lastError`:** o `impedimentCode` do `GET /api/meu-time` (pré-validação) e o `errorCode` do `POST` (pós-tentativa) podem divergir se o estado mudar entre as duas chamadas. O tooltip usa o dado do GET; a mensagem inline usa o dado do POST. São canais distintos e isso é comportamento esperado.