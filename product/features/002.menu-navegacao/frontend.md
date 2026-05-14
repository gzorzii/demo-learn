# Menu Lateral e Controle de Acesso por Perfil — Frontend

**Referência:** `business.md` e `backend.md` nesta pasta
**Status:** Rascunho

---

## Visão geral

Esta feature implementa o **shell principal da aplicação pós-login**: um layout persistente com menu lateral que filtra os itens de navegação conforme os roles do usuário autenticado. É o frame dentro do qual todas as demais features renderizam seu conteúdo.

Atores envolvidos: todos os perfis autenticados (COLABORADOR, PDM, CALIBRADOR, BP, ADMIN, GOVERNANCA).

Telas introduzidas: shell principal (`/`) com menu lateral dinâmico e área de conteúdo (`<Outlet>`). Não há página de conteúdo próprio — o shell é um container de rotas aninhadas.

---

## Rotas e navegação

| Rota | Componente de página | Propósito |
|------|---------------------|-----------|
| `/` | `AppShell` | Container principal pós-login: menu lateral + `<Outlet>` para conteúdo das sub-rotas |
| `/acesso-negado` | `AccessDeniedPage` | Exibida quando usuário tenta acessar rota não autorizada ao seu perfil |

**Rotas filhas gerenciadas por outras features (registradas sob `/`):**

| Rota | Feature responsável |
|------|-------------------|
| `/ciclos` | 003 — visao-ciclos-ativos |
| `/historico` | 032 — visualizar-historico-cf |
| `/resultados` | 031 — visualizar-relatorio-pr |
| `/meu-time` | (feature de gestão de time do PDM — a definir) |
| `/calibracao` | 028 — conduzir-sessao-calibracao |
| `/admin` | 025 — criar-ciclo-admin |

**Entrada na navegação:** Após o login bem-sucedido (`/login`), o sistema redireciona para a `defaultRoute` retornada por `GET /api/me/menu`. O shell é o ponto de entrada de toda a aplicação autenticada.

**Transições:**

```
[/login] (001, já implementado)
  └── autenticação bem-sucedida
        └── redirect para defaultRoute
              └── [AppShell — /]
                    ├── menu lateral (itens filtrados por role)
                    └── <Outlet> → rota ativa
                          ├── /ciclos          (003)
                          ├── /historico       (032)
                          ├── /resultados      (031)
                          ├── /meu-time        (PDM)
                          ├── /calibracao      (028)
                          └── /admin           (025)

[URL direta não autorizada]
  └── ProtectedRoute detecta role insuficiente
        └── redirect → /acesso-negado (com mensagem)
```

---

## Componentes

### `AppShell`
- **Tipo:** page (layout raiz)
- **Propósito:** Container persistente pós-login. Renderiza o `SideNav` à esquerda e o `<Outlet>` à direita. Carrega os dados de menu via `GET /api/me/menu` na montagem. Gerencia o estado de carregamento inicial e o redirecionamento padrão.
- **Props:** nenhuma (lê contexto de autenticação via hook)
- **Estado interno:**
  - `menuData`: resposta de `GET /api/me/menu` (itens, `defaultRoute`, dados do usuário)
  - `loading`: boolean — controla exibição do skeleton do menu
  - `error`: boolean — controla exibição do estado de erro do shell

### `SideNav`
- **Tipo:** section (menu lateral)
- **Propósito:** Renderiza a lista de itens de menu recebidos como props. Destaca o item ativo com base na rota atual. Exibe nome e avatar do usuário no rodapé.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `items` | `MenuItem[]` | sim | Lista de itens de menu retornados pela API |
| `user` | `MenuUser` | sim | Dados do usuário para exibição no rodapé (nome, email, picture) |
| `currentRoute` | `string` | sim | Rota ativa para destacar o item correspondente |

- **Estado interno:** nenhum (stateless — recebe tudo via props)

### `MenuItem` (tipo de dado, não componente)
```ts
type MenuItem = {
  key: string;
  label: string;
  route: string;
  roles: string[];
}
```

### `MenuUser` (tipo de dado, não componente)
```ts
type MenuUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
  picture?: string | null;
}
```

### `ProtectedRoute`
- **Tipo:** widget (wrapper de rota)
- **Propósito:** Envolve rotas filhas e verifica se o usuário possui ao menos um dos roles requeridos. Se não possuir, redireciona para `/acesso-negado`.
- **Props:**

| Prop | Tipo | Obrigatório | Descrição |
|------|------|-------------|-----------|
| `allowedRoles` | `string[]` | sim | Roles que têm acesso à rota protegida |
| `children` | `ReactNode` | sim | Conteúdo da rota |

- **Estado interno:** nenhum (lê roles do contexto de autenticação)

### `AccessDeniedPage`
- **Tipo:** page
- **Propósito:** Exibe mensagem de acesso negado e botão para retornar à rota padrão do perfil do usuário.
- **Props:** nenhuma
- **Estado interno:** nenhum (lê `defaultRoute` do contexto de autenticação)

### `AuthContext` / `useAuth` (hook de contexto)
- **Propósito:** Provê os dados do usuário autenticado (roles, nome, email, `defaultRoute`) para todos os componentes da árvore. Alimentado pela resposta de `GET /api/me/menu` na montagem do `AppShell`.
- **Valores expostos pelo contexto:**
  - `user: MenuUser`
  - `menuItems: MenuItem[]`
  - `defaultRoute: string`
  - `hasRole(role: string): boolean` — utilitário para verificação pontual de role

---

## Integração com API

| Endpoint | Gatilho | Sucesso | Tratamento de erro |
|----------|---------|---------|-------------------|
| `GET /api/me/menu` | Montagem do `AppShell` (uma única vez por sessão) | Popular `menuItems`, `user` e `defaultRoute` no `AuthContext`; redirecionar para `defaultRoute` se a rota atual for `/` | 401 → redirecionar para `/login`; 403 → redirecionar para `/login` (usuário sem roles válidos — estado inválido); 500 → exibir tela de erro do shell com opção de recarregar |

Referência dos contratos: ver `backend.md` desta pasta — seção `GET /api/me/menu`.

**Nota sobre cache:** a resposta de `GET /api/me/menu` deve ser armazenada no `AuthContext` pelo tempo de vida da sessão (sem re-fetch a cada troca de rota). Invalidar apenas em logout ou refresh manual de token.

---

## Estados de interface

### `AppShell` (carregamento inicial)

| Estado | O que é exibido |
|--------|----------------|
| **Loading** | Skeleton do menu lateral (itens com placeholder animado) + área de conteúdo em branco |
| **Erro** | Mensagem genérica de falha ao carregar a aplicação + botão "Tentar novamente" que dispara nova chamada a `GET /api/me/menu` |
| **Sucesso** | Menu lateral com itens reais + `<Outlet>` com a rota ativa |

### `SideNav`

| Estado | O que é exibido |
|--------|----------------|
| **Normal** | Lista de itens de menu; item ativo destacado |
| **Rota sem correspondência no menu** | Nenhum item destacado (rota de sub-feature não listada diretamente no menu) |

### `AccessDeniedPage`

| Estado | O que é exibido |
|--------|----------------|
| **Acesso negado** | Mensagem "Você não tem permissão para acessar esta página" + botão "Voltar ao início" que redireciona para `defaultRoute` |

---

## Estratégia de testes

**Renderização com dados válidos:**
- `AppShell` com roles `["COLABORADOR"]` renderiza somente os itens `ciclos`, `historico`, `resultados`.
- `AppShell` com roles `["PDM", "ADMIN"]` renderiza a união de itens de ambos os perfis sem duplicatas.
- `SideNav` destaca corretamente o item cujo `route` corresponde à rota atual.
- `SideNav` exibe nome e avatar do usuário no rodapé.

**Interações do usuário:**
- Clique em item do menu navega para a rota correspondente.
- Clique em "Tentar novamente" no estado de erro dispara nova chamada à API.
- Clique em "Voltar ao início" na `AccessDeniedPage` redireciona para `defaultRoute`.

**Tratamento de erros de API:**
- `GET /api/me/menu` retorna 401 → usuário é redirecionado para `/login`.
- `GET /api/me/menu` retorna 500 → shell exibe estado de erro com opção de retry.

**Renderização condicional por permissão:**
- `ProtectedRoute` com `allowedRoles: ["ADMIN"]` bloqueia usuário com role `["COLABORADOR"]` e redireciona para `/acesso-negado`.
- `ProtectedRoute` com `allowedRoles: ["CALIBRADOR", "BP"]` permite usuário com role `["BP", "ADMIN"]` (possui `BP`).
- Acesso direto por URL a rota não autorizada resulta em redirect para `/acesso-negado`, não em erro de renderização.

---

## Riscos técnicos e dependências

- **Dependência de rotas de features futuras:** Os valores de `route` nos itens de menu (`/ciclos`, `/historico`, `/resultados`, `/meu-time`, `/calibracao`, `/admin`) devem estar alinhados com os `frontend.md` das features 003, 025, 028, 031 e 032. Qualquer renomeação de rota nessas features quebra a navegação do menu.

- **Rota `/meu-time` indefinida:** O `business.md` menciona `/meu-time` como seção do PDM, mas não há feature explícita definida para ela neste conjunto. O item deve ser incluído no menu do PDM, mas a rota estará desativada até que a feature correspondente seja especificada. O `ProtectedRoute` deve lidar graciosamente com rotas sem página implementada.

- **Login via `/login`:** Esta feature assume que a feature 001 (login) já implementa o redirect pós-autenticação. O `AppShell` deve lidar com o caso em que o usuário acessa `/` diretamente sem token — nesse caso, redirecionar para `/login`.

- **`User.role` vs `UserPermission`:** Conforme descrito no `backend.md`, os roles no JWT vêm de `UserPermission.permission.description`. O frontend deve tratar apenas os valores da claim `"roles"` do token — nunca inferir roles a partir de outros campos. Ver nota de risco correspondente no `backend.md`.
