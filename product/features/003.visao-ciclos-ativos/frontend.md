# Visão CF + PR: Acompanhar Ciclos Ativos do Colaborador — Frontend

**Referência:** `business.md` e `backend.md` nesta pasta
**Status:** Rascunho

---

## Visão geral

Esta feature substitui o placeholder `MeusCiclosPage` (já registrado no router) pela implementação real do painel de ciclos ativos do colaborador autenticado. A tela é somente leitura e exibe cards individuais para cada ciclo ativo (CF e/ou PR). Não há formulários nem ações de escrita.

Ator principal: **Colaborador** (`CIETER`) acessando seus próprios ciclos. O PDM também pode acessar esta tela para visualizar seus próprios ciclos como colaborador — a visão dos seus liderados está fora do escopo desta feature (ver `business.md`, seção "Fora de escopo").

Tela modificada: `MeusCiclosPage` (substituição de placeholder).

---

## Rotas e navegação

| Rota | Componente de página | Propósito |
|------|---------------------|-----------|
| `/meus-ciclos` | `MeusCiclosPage` | Painel somente leitura com CF e PR ativos do colaborador autenticado |

**Entrada:** item "Meus Ciclos" no `SideNav` (definido na feature 002). Disponível para os perfis `CIETER` e `PDM`.

**Transições a partir desta tela:**

- Ação de autoavaliação CF → `/ciclos/cf/:id/autoavaliacao` (feature 010 — fora do escopo desta feature; o link pode aparecer no card mas levará a uma rota ainda não implementada)
- Ação de autoavaliação PR → `/ciclos/pr/:id/autoavaliacao` (feature 019 — idem)
- Sem ciclo ativo → permanece em `/meus-ciclos` com empty state

```
[SideNav — item "Meus Ciclos"]
  └── /meus-ciclos  (MeusCiclosPage)
        ├── [loading]      → skeletons dos cards
        ├── [erro de API]  → mensagem de erro + botão "Tentar novamente"
        ├── [sem ciclos]   → empty state com mensagem informativa
        ├── [CF ativo]     → CycleCard (type=CF)
        │     └── [link autoavaliação] → /ciclos/cf/:id/autoavaliacao (010)
        └── [PR ativo]     → CycleCard (type=PR)
              └── [link autoavaliação] → /ciclos/pr/:id/autoavaliacao (019)
```

---

## Componentes

### `CyclesDashboard`
- **Tipo:** section (componente reutilizável)
- **Propósito:** Orquestra o carregamento dos dados de ciclos ativos, gerencia os estados de loading/erro/empty/sucesso e renderiza os cards. **Componente compartilhado** entre duas rotas: `/meus-ciclos` (colaborador vê seus próprios ciclos) e `/meu-time/:id/ciclos` (PDM vê ciclos de um liderado). Quando `userId` está ausente, usa o ID do usuário autenticado.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `userId` | `string` | não | ID do colaborador a exibir; se omitido, usa o ID do JWT (caso do CIETER) |

- **Estado interno:**
  - `cycles`: array do tipo `ActiveCycleDTO[]`
  - `loading`: `boolean` — controla exibição dos skeletons
  - `error`: `boolean` — controla exibição do estado de erro

### `MeusCiclosPage`
- **Tipo:** page
- **Propósito:** Página da rota `/meus-ciclos`. Renderiza `<CyclesDashboard />` sem `userId` (usa o colaborador autenticado).
- **Props:** nenhuma

### `CycleCard`
- **Tipo:** section (card de ciclo ativo)
- **Propósito:** Exibe as informações de um único ciclo ativo (CF ou PR): tipo, fase atual, prazo restante e percentual de respostas coletadas. Componente stateless — recebe todos os dados via props.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `cycleSubjectId` | `string` | sim | ID do `cycle_subject` — usado para compor links de ação |
| `cycleType` | `"CF" \| "PR"` | sim | Define a cor/identidade visual do card |
| `cycleName` | `string \| null` | não | Nome do ciclo; exibido apenas se presente (PR) |
| `currentPhase` | `string` | sim | Fase atual formatada para exibição (ex: `"Coletando respostas"`) |
| `collectionDeadline` | `string \| null` | não | ISO-8601 com timezone; nulo se sem prazo definido |
| `daysRemaining` | `number \| null` | não | Dias restantes já calculados pela API; exibir "sem prazo" se nulo |
| `responseRate` | `number` | sim | Valor entre 0 e 1; exibido como percentual (ex: `0.67` → `"67%"`) |
| `totalEvaluators` | `number` | sim | Total de avaliadores vinculados |
| `respondedEvaluators` | `number` | sim | Avaliadores que responderam ou foram pulados |

- **Estado interno:** nenhum (stateless)

### `CycleCardSkeleton`
- **Tipo:** widget
- **Propósito:** Placeholder animado com o mesmo layout visual do `CycleCard`, exibido durante o carregamento da API. Deve ser renderizado em duplicata (um para CF, um para PR) para indicar que podem existir até dois cards.
- **Props:** nenhuma
- **Estado interno:** nenhum

### `ActiveCyclesEmptyState`
- **Tipo:** widget
- **Propósito:** Exibido quando `cycles` é uma lista vazia. Mensagem informativa indicando ausência de ciclos ativos em andamento.
- **Props:** nenhuma
- **Estado interno:** nenhum

### Tipos TypeScript

```ts
type ActiveCycleDTO = {
  cycleSubjectId: string;
  cycleId: string;
  cycleType: "CF" | "PR";
  cycleName: string | null;
  currentPhase: string;
  collectionDeadline: string | null;
  daysRemaining: number | null;
  responseRate: number;
  totalEvaluators: number;
  respondedEvaluators: number;
};

type ActiveCyclesResponse = {
  cycles: ActiveCycleDTO[];
};
```

---

## Integração com API

| Endpoint | Gatilho | Sucesso | Tratamento de erro |
|----------|---------|---------|-------------------|
| `GET /api/me/ciclos/ativos` | Montagem do `MeusCiclosPage` (uma única vez; sem polling) | Popular `cycles` com a lista retornada; se vazia, exibir `ActiveCyclesEmptyState` | `401` → interceptor global de `api.ts` redireciona para `/login`; `403` → redirecionar para `/acesso-negado` (feature 002); `500` ou erro de rede → exibir estado de erro com botão "Tentar novamente" que re-executa a chamada |

Contrato completo do endpoint: ver `backend.md` desta pasta — seção `GET /api/me/ciclos/ativos`.

**Nota sobre retry:** o botão "Tentar novamente" deve re-executar a mesma chamada sem recarregar a página. A implementação com `useState` + trigger manual de re-fetch (ou invalidação de cache via React Query) é suficiente — não há necessidade de polling automático.

---

## Estados de interface

### `MeusCiclosPage`

| Estado | O que é exibido |
|--------|----------------|
| **Loading** | Dois `CycleCardSkeleton` lado a lado (um para CF, um para PR potenciais) |
| **Erro** | Mensagem genérica de falha ao carregar os ciclos + botão "Tentar novamente" |
| **Empty** | `ActiveCyclesEmptyState` com mensagem indicando que não há ciclos em andamento |
| **Sucesso** | Um ou dois `CycleCard` (CF e/ou PR) com todos os dados preenchidos |

### `CycleCard`

| Estado | O que é exibido |
|--------|----------------|
| **Com prazo** | `daysRemaining` exibido em destaque (ex: `"12 dias restantes"`) |
| **Sem prazo** | Campo de prazo exibe `"Sem prazo definido"` |
| **Prazo vencido** | `daysRemaining = 0`; exibir em estado de alerta visual (ex: badge vermelho `"Prazo encerrado"`) |
| **Sem avaliadores** | `responseRate = 0%`, `"0 de 0 respostas"` — sem erro de renderização |

---

## Estratégia de testes

**Renderização com dados válidos:**
- `MeusCiclosPage` com resposta de API contendo um ciclo CF renderiza exatamente um `CycleCard` com `cycleType="CF"`.
- `MeusCiclosPage` com resposta de API contendo um ciclo PR renderiza exatamente um `CycleCard` com `cycleType="PR"`.
- `MeusCiclosPage` com `cycles: []` renderiza `ActiveCyclesEmptyState` (sem cards).
- `CycleCard` com `daysRemaining = null` exibe texto `"Sem prazo definido"` sem erros de renderização.
- `CycleCard` com `responseRate = 0` exibe `"0%"` sem erros de renderização.
- `CycleCard` com `cycleName = null` (caso CF) não exibe campo de nome.

**Interações do usuário:**
- Clique em "Tentar novamente" no estado de erro dispara nova chamada a `GET /api/me/ciclos/ativos`.
- Loading exibe dois `CycleCardSkeleton` enquanto a chamada está em andamento.

**Tratamento de erros de API:**
- `GET /api/me/ciclos/ativos` retorna `401` → interceptor de `api.ts` redireciona para `/login` (sem lógica adicional na página).
- `GET /api/me/ciclos/ativos` retorna `403` → usuário redirecionado para `/acesso-negado`.
- `GET /api/me/ciclos/ativos` retorna `500` → `MeusCiclosPage` exibe estado de erro com opção de retry.
- Erro de rede (timeout, offline) → mesmo comportamento do `500`.

**Renderização condicional por permissão:**
- `ProtectedRoute` em `/meus-ciclos` deve permitir perfis `CIETER` e `PDM`.
- Perfil `CALIBRATOR` ou `BP` sem acumulação de `CIETER`/`PDM` deve ser redirecionado para `/acesso-negado`.

---

## Riscos técnicos e dependências

- **Placeholder existente:** o componente `MeusCiclosPage` já existe como placeholder. A implementação deve substituir o conteúdo deste arquivo sem alterar o nome do componente exportado, para não quebrar as referências no router definidas na feature 002.

- **Rota confirmada como `/meus-ciclos`:** alinhada com o `backend.md` da feature 002 e o item de menu "Meus Ciclos".

- **Links de ação nos cards (features 010 e 019):** os cards CF e PR podem exibir links para autoavaliação (`/ciclos/cf/:id/autoavaliacao` e `/ciclos/pr/:id/autoavaliacao`), mas essas rotas pertencem às features 010 e 019, ainda não especificadas. Se os links forem incluídos nesta entrega, devem ser renderizados mas desabilitados ou ausentes até que as rotas existam. Não bloquear o card por conta de links não implementados.

- **Formatação de `currentPhase`:** o campo `currentPhase` retornado pela API é o valor bruto do enum `cycle_subject.status` (ex: `"COLLECTING"`, `"VALIDATING_EVALUATORS"`). A tradução para texto legível ao usuário (ex: `"Coletando respostas"`) deve ser feita no frontend. O mapeamento deve ser acordado entre os times antes da implementação — se novos status forem adicionados ao backend sem atualização do frontend, o valor bruto pode vazar para a UI.

- **Dependência do `SideNav` e `AppShell`:** esta feature depende que a feature 002 esteja implementada (shell principal, rota `/meus-ciclos` registrada, item no menu visível para `CIETER` e `PDM`). Não há lógica de navegação a ser implementada nesta feature além da página em si.
