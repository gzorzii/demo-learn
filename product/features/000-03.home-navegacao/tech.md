# Home e Navegação — Technical Design

**Reference:** `business.md` nesta pasta
**Status:** Rascunho

## Visão geral

Feature de infraestrutura frontend que define a estrutura de roteamento da aplicação React, o layout persistente (sidebar + topbar), a tela de home com cards de acesso rápido e o controle de visibilidade de módulos por perfil.

O backend não tem papel novo nesta feature além do endpoint `GET /api/notifications` (já suportado pela tabela `notification` de `000-01` e autenticação JWT de `000-02`). Toda a lógica de autorização visível — quais módulos e itens de navegação aparecem — é computada no frontend a partir do claim `roles` do JWT, sem requisição adicional ao servidor.

Camadas afetadas:

- **Frontend**: roteamento (`React Router`), contexto de autenticação (leitura, sem alteração — definido em `000-02`), novos componentes `AppLayout`, `Sidebar`, `TopBar`, `HomePage`, `NotificationBell`, utilitário `navigationConfig`.
- **Backend**: leitura do endpoint `GET /api/notifications` via polling. Nenhuma alteração de schema ou novo endpoint além deste.

Depende diretamente de:

- `000-01`: tabela `notification` e `NotificationRepository` (para `GET /api/notifications`)
- `000-02`: `AuthContext`, `useAuth`, `PrivateRoute`, payload JWT (`roles`, `branchId`, `name`)

---

## Modelo de dados

### Novas tabelas / alterações de schema

Esta feature não introduz novas tabelas nem altera o schema existente. Utiliza a tabela `notification` já definida em `000-01`:

| Tabela         | Uso nesta feature                                                         |
|----------------|---------------------------------------------------------------------------|
| `notification` | Consultada pelo endpoint `GET /api/notifications` para o `NotificationBell` |

Nenhuma coluna nova é necessária.

### Estratégia de migração

Nenhuma migration necessária. Rollback não aplicável.

---

## Contratos de API

### `GET /api/notifications`

Este endpoint é o único ponto de contato backend desta feature. Retorna notificações não lidas do usuário autenticado. O frontend consome via polling periódico no componente `NotificationBell`.

- **Authorization**: qualquer usuário autenticado com JWT válido. Na prática, apenas Gerente e Caixa verão o componente (filtragem no frontend), mas o endpoint não restringe por perfil — a validação é feita no lado do cliente.
- **Request body**: nenhum
- **Query params**: nenhum
- **Response `200`**:

```json
[
  {
    "id": "uuid",
    "type": "WISHLIST_ARRIVAL | SHELF_OVERDUE",
    "title": "string",
    "body": "string",
    "createdAt": "ISO-8601 datetime"
  }
]
```

Retorna apenas registros onde `user_id = <sub do JWT>` e `read = false`, ordenados por `created_at DESC`.

- **Status codes**:

| Código | Quando ocorre |
|--------|---------------|
| 200    | Lista retornada com sucesso (pode ser vazia) |
| 401    | JWT ausente, expirado ou inválido |
| 500    | Erro inesperado no servidor |

- **Edge cases**: se o usuário não possuir notificações não lidas, retorna array vazio `[]` — não retorna 404.

---

## Contratos frontend

### Estrutura de rotas

O React Router é configurado com um layout raiz que envolve todas as rotas internas. A rota `/` redireciona para `/home` quando autenticado — o redirecionamento ocorre no nível do roteador, não no `PrivateRoute`.

```
/                        → redirect para /home (se autenticado) ou /login (se não)
/login                   → LoginPage (pública)
/auth/callback           → AuthCallbackPage (pública — definida em 000-02)
/auth/error              → AuthErrorPage (pública — definida em 000-02)

Layout raiz: AppLayout (envolve todas as rotas abaixo via <Outlet>)
  /home                  → HomePage
  /books                 → BooksPage (lazy)
  /stock                 → StockPage (lazy)
  /labels                → LabelsPage (lazy)
  /pos                   → POSPage (lazy)
  /discounts             → DiscountsPage (lazy)
  /vouchers              → VouchersPage (lazy)
  /purchases             → PurchasesPage (lazy)
  /customers             → CustomersPage (lazy)
  /payment-methods       → PaymentMethodsPage (lazy)
  /users                 → UsersPage (lazy)
  /branches              → BranchesPage (lazy)
  /reports               → ReportsPage (lazy)
  /book-search           → BookSearchPage (lazy)
  /shelf                 → ShelfPage (lazy)
  /price-history         → PriceHistoryPage (lazy)
  /shelf-config          → ShelfConfigPage (lazy)
```

Todas as rotas sob `AppLayout` são protegidas por `PrivateRoute` (de `000-02`). Rotas de módulos individuais aplicam verificação adicional de permissão — se o usuário autenticado não possuir o perfil necessário para aquela rota, é redirecionado para `/home`.

Todas as páginas de módulo (exceto `/home`) são carregadas com `React.lazy` + `Suspense` para reduzir o bundle inicial.

### `navigationConfig`

Array estático exportado que descreve todos os 16 módulos do sistema. Serve como fonte única de verdade para sidebar, topnav e cards da HomePage. Nenhum item de navegação é derivado de backend.

```typescript
interface NavItem {
  label: string;          // label em pt-BR para exibição
  path: string;           // rota React Router (ex: "/books")
  roles: string[];        // perfis que podem acessar (ex: ["Administrador", "Gerente", "Catalogador"])
  icon: string;           // identificador de ícone (ex: "book", "pos", "report")
}

const navigationConfig: NavItem[] = [
  { label: "Cadastro de Livros",                    path: "/books",           roles: ["Administrador", "Gerente", "Catalogador"], icon: "book" },
  { label: "Gerenciamento de Estoque",              path: "/stock",           roles: ["Administrador", "Gerente", "Catalogador"], icon: "stock" },
  { label: "Config. e Impressão de Etiquetas",      path: "/labels",          roles: ["Administrador", "Gerente", "Catalogador"], icon: "label" },
  { label: "PDV / Ponto de Venda",                  path: "/pos",             roles: ["Administrador", "Gerente", "Caixa"],       icon: "pos" },
  { label: "Gerenciamento de Descontos",            path: "/discounts",       roles: ["Administrador", "Gerente"],                icon: "discount" },
  { label: "Vouchers",                              path: "/vouchers",        roles: ["Administrador", "Gerente"],                icon: "voucher" },
  { label: "Compra de Livros Usados",               path: "/purchases",       roles: ["Administrador", "Gerente"],                icon: "purchase" },
  { label: "Gestão de Clientes",                    path: "/customers",       roles: ["Administrador", "Gerente"],                icon: "customer" },
  { label: "Métodos de Pagamento",                  path: "/payment-methods", roles: ["Administrador", "Gerente"],                icon: "payment" },
  { label: "Gestão de Usuários",                    path: "/users",           roles: ["Administrador", "Gerente"],                icon: "users" },
  { label: "Gestão de Filiais",                     path: "/branches",        roles: ["Administrador"],                          icon: "branch" },
  { label: "Relatórios",                            path: "/reports",         roles: ["Administrador", "Gerente"],                icon: "report" },
  { label: "Busca de Livros",                       path: "/book-search",     roles: ["Administrador", "Gerente", "Catalogador", "Caixa"], icon: "search" },
  { label: "Prateleira (livros em atraso)",         path: "/shelf",           roles: ["Administrador", "Gerente"],                icon: "shelf" },
  { label: "Histórico de Preços",                   path: "/price-history",   roles: ["Administrador", "Gerente"],                icon: "price-history" },
  { label: "Configuração de Prateleira",            path: "/shelf-config",    roles: ["Administrador", "Gerente"],                icon: "shelf-config" },
];
```

### Função utilitária `getPermittedRoutes`

Filtra o `navigationConfig` com base nos perfis do usuário autenticado. A lógica de união de múltiplos perfis é resolvida aqui: um item é exibido se ao menos um dos perfis do usuário estiver em `item.roles`.

```typescript
function getPermittedRoutes(userRoles: string[]): NavItem[]
```

- Entrada: array de strings com os nomes de perfil do JWT (`roles`)
- Saída: subconjunto de `navigationConfig` onde `item.roles` intersecta `userRoles`
- Sem efeito colateral — função pura
- Itens duplicados não são possíveis pois `navigationConfig` é flat e sem repetição

### Componente `AppLayout`

Wrapper de layout que envolve todas as telas internas. Responsável por:

- Renderizar `Sidebar` (ou `TopNav` em mobile) com os itens de `getPermittedRoutes(user.roles)`
- Renderizar `TopBar` com nome do usuário, perfis, filial condicional, botão de logout e `NotificationBell`
- Renderizar a área de conteúdo principal via `<Outlet>`
- Não renderiza rota própria — é apenas o wrapper do layout

Props esperadas: nenhuma — consome `useAuth()` internamente para obter `user`.

### Componente `Sidebar` / `TopNav`

Renderiza a lista de itens de navegação permitidos ao perfil atual.

Responsabilidades:

- Recebe `items: NavItem[]` como prop (resultado de `getPermittedRoutes`)
- Exibe cada item com label e ícone; item ativo é destacado conforme rota atual (`useLocation`)
- Não exibe itens proibidos — nem desabilitados, nem com cadeado
- Persiste em todas as telas internas (renderizado pelo `AppLayout`)

### Componente `TopBar`

Barra superior persistente. Responsabilidades:

- Exibir nome do usuário (`user.name`) e perfis ativos (`user.roles.join(", ")`)
- Exibir nome da filial condicionalmente: somente se `user.branchId !== null`. O nome da filial não está no JWT — a exibição requer uma requisição ou cache. Ver seção de riscos técnicos.
- Renderizar `NotificationBell` condicionalmente: somente se `user.roles` inclui `"Gerente"` ou `"Caixa"`
- Botão de logout sempre visível: ao clicar, chama `logout()` do `useAuth()`

### Componente `HomePage`

Tela inicial após autenticação. Responsabilidades:

- Chama `getPermittedRoutes(user.roles)` para obter a lista de módulos permitidos
- Renderiza um grid de cards, um por módulo permitido
- Cada card contém: ícone, label e link para a rota correspondente (`path`)
- Não exibe cards de módulos proibidos
- Não tem estado próprio além da renderização dos cards

### Componente `NotificationBell`

Ícone de sino no canto superior direito da `TopBar`. Responsabilidades:

- Visível apenas quando `user.roles` inclui `"Gerente"` ou `"Caixa"` — verificação feita no `TopBar` antes de renderizar o componente
- Realiza polling de `GET /api/notifications` a cada **30 segundos** usando `setInterval` em um `useEffect`; cancela o intervalo no cleanup do effect
- Exibe badge numérico com a contagem de itens retornados (não lidos)
- Badge oculto quando contagem é zero
- Ao clicar: abre painel/dropdown com a lista de notificações (título + corpo)
- O polling usa o token JWT do `localStorage` via header `Authorization: Bearer <token>` — utilizar a função de fetch autenticado já definida em `000-02` ou equivalente

Interface TypeScript para o item de notificação consumido:

```typescript
interface NotificationItem {
  id: string;
  type: "WISHLIST_ARRIVAL" | "SHELF_OVERDUE";
  title: string;
  body: string;
  createdAt: string; // ISO-8601
}
```

### `PrivateRoute` com verificação de módulo

O `PrivateRoute` de `000-02` já redireciona para `/login` se não autenticado. Para esta feature, é necessário estender o comportamento para verificação de permissão de rota:

- Cada rota de módulo declara o `roles` necessário (derivado do `navigationConfig`)
- Se o usuário estiver autenticado mas `user.roles` não intersectar o `roles` da rota: redirecionar para `/home`
- A prop `requiredRoles?: string[]` é adicionada ao `PrivateRoute` existente (já prevista na especificação de `000-02` como prop opcional `requiredRole`)

> A verificação no `PrivateRoute` é uma camada de defesa frontend — não substitui autorização server-side nas features de negócio.

---

## Requisitos de qualidade

- [ ] Operações de I/O identificadas? O polling de `GET /api/notifications` é I/O-bound no backend — o handler do endpoint é candidato a virtual thread (já coberto pela configuração de `000-02` com `spring.threads.virtual.enabled=true`).
- [ ] Compatibilidade com GraalVM AOT? Não aplicável a esta feature (frontend apenas; backend não adiciona componentes novos além do endpoint de notificações).
- [ ] Dados sensíveis tratados corretamente? `user.name`, `user.roles` e `user.branchId` exibidos na UI são derivados do JWT já armazenado em `localStorage` — sem exposição adicional. `branchId` (UUID) não é dado sensível.
- [ ] Casos de autorização cobertos por perfil? Sim: `navigationConfig` define explicitamente os perfis por módulo; `getPermittedRoutes` filtra antes de qualquer renderização; `PrivateRoute` com `requiredRoles` previne acesso direto por URL.

---

## Estratégia de testes

### `getPermittedRoutes` (função pura — testes unitários)

- Perfil único `Caixa`: retorna apenas "PDV / Ponto de Venda" e "Busca de Livros"
- Perfil único `Catalogador`: retorna exatamente "Cadastro de Livros", "Gerenciamento de Estoque", "Config. e Impressão de Etiquetas" e "Busca de Livros"
- Perfil único `Gerente`: retorna todos os módulos exceto "Gestão de Filiais"
- Perfil único `Administrador`: retorna todos os 16 módulos
- Múltiplos perfis `["Catalogador", "Caixa"]`: retorna união sem duplicatas (5 módulos distintos)
- Array vazio `[]`: retorna array vazio

### `AppLayout` / `Sidebar`

- Usuário com perfil `Caixa` autenticado: sidebar exibe apenas os 2 módulos permitidos
- Nenhum item proibido presente no DOM (nem oculto via CSS)
- Item ativo destacado conforme rota atual

### `TopBar`

- Nome do usuário exibido corretamente
- Perfis ativos exibidos
- Filial exibida quando `branchId !== null` (perfil com escopo de filial)
- Filial não exibida quando `branchId === null` (Administrador)
- `NotificationBell` renderizado para Gerente e Caixa
- `NotificationBell` não renderizado para Catalogador e Administrador
- Clique em logout: chama `logout()`, remove token do localStorage, redireciona para `/login`

### `NotificationBell`

- Polling iniciado ao montar o componente; cancelado ao desmontar
- Badge exibido com contagem correta quando API retorna itens
- Badge oculto quando API retorna array vazio
- Requisição usa header `Authorization: Bearer <token>`

### `PrivateRoute` com `requiredRoles`

- Usuário autenticado sem permissão para a rota: redirecionado para `/home`
- Usuário não autenticado: redirecionado para `/login` (comportamento herdado de `000-02`)
- Usuário autenticado com permissão: renderiza o conteúdo normalmente

### Redirecionamentos de raiz

- Acesso a `/` com JWT válido: redireciona para `/home`
- Acesso a `/` sem JWT: redireciona para `/login`
- Acesso a `/home` sem JWT: redireciona para `/login`

### Rota direta por URL (proteção de rota)

- Usuário `Caixa` acessa `/branches` diretamente via URL: redirecionado para `/home`
- Usuário `Catalogador` acessa `/pos` diretamente via URL: redirecionado para `/home`

---

## Riscos técnicos e dependências

1. **Nome da filial não está no JWT**: o claim `branchId` do JWT contém apenas o UUID da filial. Para exibir o nome da filial na `TopBar`, o frontend precisa resolver o UUID para um nome. Opções: (a) adicionar claim `branchName` ao JWT no backend — mudança de contrato com `000-02`; (b) fazer uma requisição `GET /api/branches/{id}` ao montar o `AppLayout` e armazenar em cache local; (c) incluir o nome no JWT (mais simples, sem requisição adicional). Esta decisão deve ser tomada antes da implementação — a opção (c) é a de menor custo se o nome da filial raramente muda durante a sessão de 8 horas do JWT.

2. **Dependência de `000-02`**: os componentes `PrivateRoute`, `AuthContext`, `useAuth` e `logout()` devem estar implementados antes desta feature. A extensão de `PrivateRoute` com `requiredRoles` deve ser coordenada com o agente responsável por `000-02` para evitar conflito de implementação.

3. **Polling de notificações e expiração do JWT**: o intervalo de 30 segundos do `NotificationBell` pode realizar requisições após a expiração do JWT (tokens de 8 horas). O handler do polling deve tratar 401 como sinal de sessão expirada e invocar `logout()` — caso contrário, o usuário verá erros silenciosos até navegar para outra tela.

4. **Lazy loading e Suspense**: todas as páginas de módulo são carregadas com `React.lazy`. É necessário um componente `Suspense` com fallback de loading no `AppLayout` para evitar tela em branco durante o carregamento dos chunks. O fallback deve ser um spinner ou skeleton compatível com o design do sistema.

5. **Ausência de backend para esta feature**: o endpoint `GET /api/notifications` já está coberto pelo modelo de dados de `000-01` e pela segurança de `000-02`, mas ainda não foi implementado como controller REST. Esta feature depende de que ele seja criado — pode ser feito em paralelo com o frontend, mas deve ser concluído antes dos testes de integração do `NotificationBell`.
