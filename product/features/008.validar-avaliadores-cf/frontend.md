# Validar e Ajustar Lista de Avaliadores no CF — Frontend

**Referência:** `business.md` e `backend.md` nesta pasta
**Status:** Rascunho

## Visão geral

Esta feature introduz a tela `/ciclos/cf/:id/avaliadores`, acessada a partir do card do CF ativo quando o ciclo está na fase `VALIDATING_EVALUATORS`. A tela exibe a lista de avaliadores sugeridos pelo ONA (mock) e permite ao colaborador adicionar ou remover convidados, além de confirmar a lista explicitamente antes do prazo de 7 dias.

O PDM acessa a mesma tela para consultar e adicionar avaliadores aos ciclos dos seus liderados (sem poder remover avaliadores adicionados pelo colaborador).

Atores principais: **Colaborador** (`CIETER` ou `PDM` agindo sobre si mesmo) e **PDM** (agindo sobre o liderado).

Telas introduzidas: `CfEvaluatorsPage` na rota `/ciclos/cf/:id/avaliadores`.

## Rotas e navegação

| Rota | Componente de página | Propósito |
|------|---------------------|-----------|
| `/ciclos/cf/:id/avaliadores` | `CfEvaluatorsPage` | Listagem e edição da lista de avaliadores do ciclo CF durante a fase de validação |

O parâmetro `:id` é o `cycleSubjectId` (ID do `cycle_subject`), não o ID do `cycle`.

**Entrada:** card do CF ativo em `/ciclos` (feature 003), visível quando o `cycleStatus = "VALIDATING_EVALUATORS"`. O card deve exibir um link/botão "Validar avaliadores" que leva a esta tela.

**Transições a partir desta tela:**

- Adição de avaliador (modal) → sucesso → retorna à lista com avaliador incluído
- Remoção de avaliador → confirmação inline → lista atualizada
- Confirmar lista → `POST .../confirm` → `204` → navega para `/ciclos/cf/:id` (visão do ciclo)
- Prazo expirado (usuário abre a tela após expiração mas antes do scheduler rodar) → estado informativo + botão de confirmação desabilitado
- Cancelar / voltar → retorna a `/ciclos`

```
/ciclos  (003.visao-ciclos-ativos)
  └── [CF ativo — status: VALIDATING_EVALUATORS]
        └── /ciclos/cf/:id/avaliadores  (CfEvaluatorsPage)
              ├── [loading]           → EvaluatorListSkeleton
              ├── [erro de API]       → mensagem de erro + botão "Tentar novamente"
              ├── [lista carregada]
              │     ├── EvaluatorList
              │     │     ├── [avaliador obrigatório] → sem ação de remoção
              │     │     └── [avaliador convidado]   → botão "Remover"
              │     │           └── [confirmar inline] → DELETE .../evaluators/:evaluatorId
              │     │                 ├── [204] → atualizar lista localmente
              │     │                 └── [erro] → mensagem inline
              │     ├── [guestCount < 10] → botão "Adicionar avaliador"
              │     │     └── AddEvaluatorModal
              │     │           ├── [buscar usuário] → campo de busca
              │     │           ├── [selecionar]     → POST .../evaluators
              │     │           │     ├── [201] → fechar modal + atualizar lista
              │     │           │     └── [409] → mensagem de erro no modal
              │     │           └── [cancelar] → fechar modal
              │     └── ValidationActions
              │           ├── [prazo não expirado] → botão "Confirmar lista" habilitado
              │           │     └── [clicar] → ConfirmEvaluatorsModal
              │           │           ├── [confirmar] → POST .../evaluators/confirm
              │           │           │     ├── [204] → navegar para /ciclos/cf/:id
              │           │           │     └── [erro] → mensagem no modal
              │           │           └── [cancelar] → fechar modal
              │           └── [prazo expirado] → botão desabilitado + mensagem informativa
              └── [PDM acessando liderado] → mesma estrutura; botão "Remover" oculto
```

## Componentes

### `CfEvaluatorsPage`

- **Tipo:** page
- **Propósito:** Página da rota `/ciclos/cf/:id/avaliadores`. Extrai `cycleSubjectId` do path param `:id`, chama `GET /api/me/cycles/:id/evaluators` (ou o endpoint do PDM se estiver acessando o ciclo de um liderado), e orquestra todos os estados da tela.
- **Props:** nenhuma (lê parâmetro de rota via hook de router)
- **Estado interno:**
  - `evaluatorData`: `EvaluatorListResponse | null` — resposta completa da API
  - `loading`: `boolean`
  - `error`: `boolean`
  - `isAddModalOpen`: `boolean` — controla `AddEvaluatorModal`
  - `isConfirmModalOpen`: `boolean` — controla `ConfirmEvaluatorsModal`
  - `isConfirming`: `boolean` — loading do botão de confirmação
  - `removingEvaluatorId`: `string | null` — ID do avaliador em processo de remoção (para loading inline)
  - `removeError`: `{ evaluatorId: string; message: string } | null` — erro de remoção inline

> A tela detecta se o usuário autenticado é o colaborador sujeita ou o PDM inspecionando o campo `subject_user_id` do `cycle_subject` retornado pela API versus o `userId` do token (disponível no contexto de autenticação). Isso determina quais ações de edição são exibidas.

---

### `EvaluatorList`

- **Tipo:** section
- **Propósito:** Renderiza a lista de avaliadores, diferenciando obrigatórios de convidados. Avaliadores obrigatórios (`isMandatory = true`) não possuem botão de remoção. Avaliadores convidados exibem botão "Remover" com confirmação inline. Componente stateless.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `evaluators` | `EvaluatorItem[]` | sim | Lista de avaliadores |
| `canRemove` | `boolean` | sim | `true` se o usuário autenticado pode remover avaliadores (colaborador) |
| `removingEvaluatorId` | `string \| null` | não | ID do avaliador com loading de remoção |
| `removeError` | `{ evaluatorId: string; message: string } \| null` | não | Erro inline de remoção |
| `onRemove` | `(evaluatorId: string) => void` | sim | Callback de remoção por ID |

- **Estado interno:** nenhum

---

### `EvaluatorCard`

- **Tipo:** widget
- **Propósito:** Exibe os dados de um único avaliador: nome, e-mail, tipo (`evaluatorType`), origem (`source`) e badge de obrigatório quando aplicável. Exibe botão "Remover" se `canRemove = true` e `isMandatory = false`. Componente stateless.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `evaluatorId` | `string` | sim | ID do `cycle_evaluator` |
| `userId` | `string` | sim | ID do usuário avaliador |
| `name` | `string` | sim | Nome completo |
| `email` | `string` | sim | E-mail |
| `evaluatorType` | `"SELF" \| "PDM" \| "PEER"` | sim | Tipo do avaliador |
| `isMandatory` | `boolean` | sim | Exibe badge "Obrigatório" quando `true` |
| `source` | `"ONA_SUGGESTION" \| "MANUAL_SUBJECT" \| "MANUAL_PDM"` | sim | Exibe label de origem |
| `canRemove` | `boolean` | sim | Exibe botão "Remover" quando `true` e `isMandatory = false` |
| `isRemoving` | `boolean` | não | Exibe loading no botão de remoção |
| `removeError` | `string \| null` | não | Mensagem de erro inline abaixo do card |
| `onRemove` | `() => void` | sim | Callback de remoção |

- **Estado interno:** nenhum

---

### `AddEvaluatorModal`

- **Tipo:** modal
- **Propósito:** Modal com campo de busca de usuários para selecionar e adicionar um novo avaliador convidado. O campo de busca é livre (nome ou e-mail) e filtra os usuários retornados por uma lista pré-carregada ou por chamada de busca. No MVP, pode-se carregar a lista de usuários ativos do sistema e filtrar localmente. Exibe erro quando o `POST` retorna `409` (avaliador já na lista, limite atingido, etc.).
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `isOpen` | `boolean` | sim | Controla visibilidade |
| `isSubmitting` | `boolean` | sim | Loading durante o POST |
| `apiError` | `string \| null` | não | Mensagem de erro retornada pelo `409` |
| `onAdd` | `(userId: string) => void` | sim | Callback com o `userId` selecionado |
| `onCancel` | `() => void` | sim | Fechar sem ação |

- **Estado interno:**
  - `searchQuery`: `string` — texto digitado no campo de busca
  - `selectedUserId`: `string | null` — usuário selecionado antes de confirmar

> A busca de usuários disponíveis para adicionar como avaliadores não possui endpoint dedicado nesta feature. No MVP, a tela pode reutilizar a lista de membros do time do PDM (`GET /api/my-team`) se disponível, ou carregar uma lista global de usuários ativos (endpoint a definir em feature futura). Se nenhuma fonte estiver disponível, o campo aceita apenas entrada de UUID diretamente. Registrar este ponto como risco técnico.

---

### `ConfirmEvaluatorsModal`

- **Tipo:** modal
- **Propósito:** Modal de confirmação exibido antes de chamar `POST .../evaluators/confirm`. Apresenta resumo da lista (quantidade de avaliadores) e solicita confirmação explícita. Exibe loading durante a submissão. Componente stateless.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `isOpen` | `boolean` | sim | Controla visibilidade |
| `isSubmitting` | `boolean` | sim | Loading no botão de confirmação |
| `totalEvaluators` | `number` | sim | Quantidade total de avaliadores na lista |
| `apiError` | `string \| null` | não | Mensagem de erro de `500` no modal |
| `onConfirm` | `() => void` | sim | Callback de confirmação |
| `onCancel` | `() => void` | sim | Fechar sem ação |

- **Estado interno:** nenhum

---

### `ValidationDeadlineBanner`

- **Tipo:** widget
- **Propósito:** Exibe o prazo de validação e o status atual (dias restantes ou "prazo expirado"). Sempre visível no topo da tela. Quando expirado, exibe mensagem informativa e desabilita as ações de edição.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `validationDeadline` | `string` | sim | Data ISO-8601 do prazo |
| `validatedAt` | `string \| null` | não | Data de confirmação explícita; se preenchido, exibe badge "Confirmado em ..." |

- **Estado interno:** nenhum (cálculo de dias restantes é computação derivada do prop)

---

### `EvaluatorListSkeleton`

- **Tipo:** widget
- **Propósito:** Placeholder animado exibido durante o carregamento da lista de avaliadores.
- **Props:** nenhuma
- **Estado interno:** nenhum

---

### Tipos TypeScript

```ts
type EvaluatorSource = "ONA_SUGGESTION" | "MANUAL_SUBJECT" | "MANUAL_PDM";
type EvaluatorType = "SELF" | "PDM" | "PEER";

type EvaluatorItem = {
  evaluatorId: string;
  userId: string;
  name: string;
  email: string;
  evaluatorType: EvaluatorType;
  isMandatory: boolean;
  source: EvaluatorSource;
  addedBy: string | null;
};

type EvaluatorListResponse = {
  cycleSubjectId: string;
  validationDeadline: string;
  validatedAt: string | null;
  evaluators: EvaluatorItem[];
  guestCount: number;
  guestLimit: number;
};

// Resposta de erro 409 dos endpoints de edição
type EvaluatorErrorCode =
  | "NOT_IN_VALIDATION_PHASE"
  | "VALIDATION_DEADLINE_EXPIRED"
  | "EVALUATOR_ALREADY_MANDATORY"
  | "EVALUATOR_ALREADY_IN_LIST"
  | "GUEST_LIMIT_REACHED"
  | "CANNOT_REMOVE_MANDATORY_EVALUATOR";

type EvaluatorErrorResponse = {
  errorCode: EvaluatorErrorCode;
};
```

**Mapeamento de `errorCode` para texto exibido ao usuário:**

| `errorCode` | Texto exibido |
|-------------|--------------|
| `NOT_IN_VALIDATION_PHASE` | "Este ciclo não está mais na fase de validação de avaliadores" |
| `VALIDATION_DEADLINE_EXPIRED` | "O prazo de validação expirou. Os avaliadores foram selecionados automaticamente" |
| `EVALUATOR_ALREADY_MANDATORY` | "Este avaliador já faz parte da lista como avaliador obrigatório" |
| `EVALUATOR_ALREADY_IN_LIST` | "Este avaliador já está na lista" |
| `GUEST_LIMIT_REACHED` | "Limite de 10 avaliadores convidados atingido" |
| `CANNOT_REMOVE_MANDATORY_EVALUATOR` | "Avaliadores obrigatórios não podem ser removidos" |

**Mapeamento de `source` para rótulo exibido:**

| `source` | Rótulo |
|----------|--------|
| `ONA_SUGGESTION` | "Sugerido pelo ONA" |
| `MANUAL_SUBJECT` | "Adicionado por você" |
| `MANUAL_PDM` | "Adicionado pelo gestor" |

## Integração com API

| Endpoint | Gatilho | Sucesso | Tratamento de erro |
|----------|---------|---------|-------------------|
| `GET /api/me/cycles/:id/evaluators` | Montagem do `CfEvaluatorsPage` (quando o usuário é o colaborador sujeita) | Popular `evaluatorData`; calcular se o prazo já expirou | `401` → interceptor global redireciona para `/login`; `403` → redirecionar para `/acesso-negado`; `409 NOT_IN_VALIDATION_PHASE` → exibir mensagem e botão de volta para `/ciclos`; `404` → mensagem de ciclo não encontrado; `500` → estado de erro com retry |
| `GET /api/my-team/:subjectUserId/cycles/:cycleSubjectId/evaluators` | Montagem do `CfEvaluatorsPage` (quando o usuário autenticado é o PDM do colaborador) | Mesmo tratamento acima | Mesmos códigos de erro acima |
| `POST /api/me/cycles/:id/evaluators` | Clique em "Adicionar" no `AddEvaluatorModal` | Fechar modal + atualizar `evaluatorData` com o novo avaliador retornado + incrementar `guestCount` | `409` → exibir `errorCode` mapeado dentro do modal (sem fechar); `404` → usuário não encontrado; `500` → mensagem genérica no modal |
| `POST /api/my-team/:subjectUserId/cycles/:cycleSubjectId/evaluators` | Mesma ação quando o ator é o PDM | Mesmo tratamento acima | Mesmos erros acima |
| `DELETE /api/me/cycles/:id/evaluators/:evaluatorId` | Clique em "Remover" confirmado inline no `EvaluatorCard` | Remover o avaliador de `evaluatorData.evaluators` localmente + decrementar `guestCount` | `409` → exibir `errorCode` mapeado inline no card; `500` → mensagem inline no card |
| `POST /api/me/cycles/:id/evaluators/confirm` | Clique em "Confirmar" no `ConfirmEvaluatorsModal` | Fechar modal + navegar para `/ciclos/cf/:id` | `409` → fechar modal + exibir banner informativo (prazo expirado ou fora da fase); `500` → manter modal com mensagem genérica |

Contratos completos: ver `backend.md` desta pasta.

**Detecção do ator (colaborador vs. PDM do liderado):**

A `CfEvaluatorsPage` precisa determinar qual endpoint chamar ao montar. A rota `/ciclos/cf/:id/avaliadores` é a mesma para ambos os atores. A distinção é feita comparando o `subject_user_id` do `cycle_subject` com o `userId` do token:
- Se forem iguais → o usuário autenticado é o colaborador sujeita → usar `GET /api/me/cycles/:id/evaluators`.
- Se forem diferentes → o usuário autenticado é o PDM do colaborador → usar `GET /api/my-team/:subjectUserId/cycles/:cycleSubjectId/evaluators`.

> Para viabilizar essa distinção sem um round-trip extra, a rota `/ciclos/cf/:id/avaliadores` pode receber o `subjectUserId` como query param opcional: `/ciclos/cf/:id/avaliadores?subjectId=uuid`. Quando presente, a página usa o endpoint do PDM. Quando ausente, usa o endpoint do colaborador. Isso evita a necessidade de um endpoint de "descoberta" de quem é o sujeita do ciclo.

**Nota sobre atualização otimista vs. refetch:**
- Para adição: o avaliador retornado pelo `POST 201` é inserido diretamente no estado local — sem refetch completo.
- Para remoção: o avaliador é removido do estado local imediatamente após `DELETE 204` — sem refetch.
- Para confirmação: após `POST confirm 204`, navegar para `/ciclos/cf/:id` sem refetch (a tela destino tem seu próprio carregamento de dados).

## Estados de interface

### `CfEvaluatorsPage`

| Estado | O que é exibido |
|--------|----------------|
| **Loading** | `EvaluatorListSkeleton` + `ValidationDeadlineBanner` com placeholder |
| **Erro** | Mensagem genérica de falha ao carregar + botão "Tentar novamente" |
| **Carregado — prazo ativo** | `ValidationDeadlineBanner` com dias restantes + `EvaluatorList` + botão "Adicionar avaliador" (se `guestCount < 10`) + botão "Confirmar lista" |
| **Carregado — prazo expirado** | `ValidationDeadlineBanner` com "prazo expirado" + `EvaluatorList` (somente leitura) + botões de edição ocultos/desabilitados |
| **Carregado — já confirmado** | `ValidationDeadlineBanner` com "confirmado em [data]" + `EvaluatorList` (somente leitura) |

### `EvaluatorList`

| Estado | O que é exibido |
|--------|----------------|
| **Lista com avaliadores** | Um `EvaluatorCard` por avaliador |
| **Avaliador sendo removido** | `EvaluatorCard` do avaliador com loading no botão "Remover" |
| **Erro de remoção** | Mensagem inline abaixo do `EvaluatorCard` correspondente |

### `AddEvaluatorModal`

| Estado | O que é exibido |
|--------|----------------|
| **Aberto — aguardando seleção** | Campo de busca + lista de resultados; botão "Adicionar" desabilitado até seleção |
| **Avaliador selecionado** | Botão "Adicionar" habilitado |
| **Submetendo** | Botão "Adicionar" com loading; campo de busca desabilitado |
| **Erro `409`** | Mensagem mapeada do `errorCode` exibida no modal; formulário volta ao estado normal para nova tentativa |
| **Erro `500`** | Mensagem genérica no modal; botões voltam ao estado normal |

### `ConfirmEvaluatorsModal`

| Estado | O que é exibido |
|--------|----------------|
| **Aberto — aguardando confirmação** | Resumo da lista (N avaliadores); botões "Confirmar" e "Cancelar" habilitados |
| **Submetendo** | Botão "Confirmar" com loading; botão "Cancelar" desabilitado |
| **Erro `500`** | Mensagem genérica; botões voltam ao estado normal |

### `ValidationDeadlineBanner`

| Estado | O que é exibido |
|--------|----------------|
| **Prazo futuro** | "Você tem X dias para validar a lista de avaliadores" |
| **Prazo no dia** | "O prazo encerra hoje às HH:MM" |
| **Prazo expirado** | "O prazo de validação encerrou. Avaliadores selecionados automaticamente" |
| **Confirmado** | "Lista confirmada em [data formatada]" (badge verde) |

## Estratégia de testes

**Renderização com dados válidos:**
- `CfEvaluatorsPage` com resposta válida renderiza `ValidationDeadlineBanner`, `EvaluatorList` e botões de ação.
- `EvaluatorList` com avaliadores obrigatórios renderiza sem botão "Remover" para esses itens.
- `EvaluatorList` com `canRemove = false` (PDM visualizando) renderiza sem nenhum botão "Remover".
- `ValidationDeadlineBanner` com prazo no futuro exibe contagem de dias.
- `ValidationDeadlineBanner` com prazo expirado exibe mensagem de expiração.
- Botão "Adicionar avaliador" é ocultado ou desabilitado quando `guestCount >= guestLimit`.

**Interações do usuário:**
- Clique em "Adicionar avaliador" → `AddEvaluatorModal` abre.
- Seleção de usuário no modal + clique em "Adicionar" → `POST .../evaluators` é chamado.
- Clique em "Cancelar" no `AddEvaluatorModal` → modal fecha, nenhuma chamada à API.
- Clique em "Remover" em avaliador convidado → confirmação inline aparece.
- Confirmação de remoção → `DELETE .../evaluators/:evaluatorId` é chamado.
- Clique em "Confirmar lista" → `ConfirmEvaluatorsModal` abre.
- Clique em "Confirmar" no `ConfirmEvaluatorsModal` → `POST .../evaluators/confirm` é chamado.
- Confirmação bem-sucedida → navegação para `/ciclos/cf/:id`.

**Tratamento de erros de API:**
- `POST evaluators` retorna `409 GUEST_LIMIT_REACHED` → mensagem exibida no modal; modal não fecha.
- `POST evaluators` retorna `409 EVALUATOR_ALREADY_IN_LIST` → mensagem correta no modal.
- `DELETE evaluator` retorna `409 CANNOT_REMOVE_MANDATORY_EVALUATOR` → mensagem inline no card.
- `DELETE evaluator` retorna `500` → mensagem inline no card.
- `POST confirm` retorna `409 VALIDATION_DEADLINE_EXPIRED` → modal fecha; banner atualiza para expirado.
- `POST confirm` retorna `500` → modal permanece com mensagem de erro.
- `GET evaluators` retorna `401` → interceptor redireciona para `/login`.
- `GET evaluators` retorna `409 NOT_IN_VALIDATION_PHASE` → mensagem informativa + link de volta para `/ciclos`.

**Renderização condicional por permissão:**
- PDM acessando ciclo de liderado: botões "Remover" não são exibidos; botão "Adicionar" é exibido; botão "Confirmar lista" não é exibido (PDM não pode confirmar).
- Colaborador acessando próprio ciclo: todos os botões são exibidos conforme o estado.

## Riscos técnicos e dependências

- **Dependência da feature 003:** a navegação para `/ciclos/cf/:id/avaliadores` parte do card do CF ativo em `/ciclos`. O componente `CycleCard` (feature 003) precisa ser estendido para exibir o link "Validar avaliadores" quando `cycleStatus = "VALIDATING_EVALUATORS"`. Esse é um ponto de integração entre as features que requer coordenação.

- **Dependência das features 006 e 007:** como descrito no `backend.md`, a introdução da fase `VALIDATING_EVALUATORS` implica que o fluxo de criação de ciclo (features 006/007) deve ser ajustado. Se essas features já estiverem implementadas criando com `status = COLLECTING`, a tela `/ciclos/cf/:id/avaliadores` nunca será acessível a partir de ciclos criados por elas, pois o card do CF ativo só exibirá o link quando `cycleStatus = "VALIDATING_EVALUATORS"`.

- **Ausência de endpoint de busca de usuários para adição:** o `AddEvaluatorModal` precisa de uma fonte de dados para o campo de busca. No MVP, a alternativa mais direta é reutilizar `GET /api/my-team` (para o PDM) ou um endpoint genérico de busca de usuários (ainda não especificado). Se nenhuma fonte estiver disponível, o campo de busca fica como UI sem dados reais — registrar como bloqueio técnico para o agente de implementação.

- **Detecção do ator (colaborador vs. PDM):** a estratégia de query param `?subjectId=uuid` descrita na seção de integração com API é uma solução de MVP. Se o projeto preferir uma abordagem diferente (ex: rota separada `/ciclos/cf/:id/avaliadores/liderado/:subjectId`), o componente `CfEvaluatorsPage` deve ser ajustado. A decisão de implementação deve ser tomada antes de codificar o roteamento.

- **Atualização otimista e dessincronização:** a remoção e adição de avaliadores atualizam o estado local sem refetch. Se o servidor rejeitar a operação mas o cliente já tiver atualizado o estado (caso improvável com a estratégia de aguardar a resposta antes de atualizar), a lista ficará inconsistente. A implementação deve sempre aguardar a resposta de sucesso (`201`/`204`) antes de atualizar o estado local.

- **Rota `/ciclos/cf/:id` (destino após confirmação):** a tela de detalhes do ciclo CF identificada por `cycleSubjectId` não está especificada em nenhuma feature disponível. A navegação pós-confirmação deve apontar para `/ciclos` (tela de visão geral de ciclos, feature 003) como fallback seguro até que essa tela seja definida.