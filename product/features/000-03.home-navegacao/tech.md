# Tech — Home e Navegação

**Delivery status:** Draft

## Visão técnica

A home é a primeira tela exibida após login bem-sucedido. É inteiramente client-side: o backend não expõe endpoint específico para ela. O controle de acesso por perfil é feito no frontend via leitura do payload do JWT (campo `roles`), sem chamada adicional ao backend. Rotas protegidas redirecionam para `/login` se não houver sessão válida, e para `/` (ou `/acesso-negado`) se o perfil não tiver permissão.

## Stack

- React 19.2.5 / TypeScript 6.0.2 — componentes de home e navegação
- React Router — roteamento client-side com proteção de rotas por perfil
- Vite 8.0.10
- `useAuth` hook (definido em `000-02.autenticacao`) — fonte de `roles`, `name`, `branchId`, `isAuthenticated`
- Nenhum endpoint novo de backend necessário para esta feature

## Frontend — estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/pages/HomePage.tsx` | Grid de módulos filtrado pelos perfis do usuário autenticado |
| `src/components/layout/AppLayout.tsx` | Wrapper de layout para rotas autenticadas; inclui `Sidebar` e `TopBar` |
| `src/components/layout/Sidebar.tsx` | Menu lateral; exibe apenas módulos permitidos para os perfis do usuário |
| `src/components/layout/TopBar.tsx` | Header superior com nome do usuário, filial (quando aplicável) e ícone de notificações |
| `src/components/layout/NotificationBadge.tsx` | Ícone com contador de notificações não lidas (visível para Gerente, Caixa, Administrador com contexto de filial) |
| `src/components/routing/PrivateRoute.tsx` | Redireciona para `/login` se `isAuthenticated === false` |
| `src/components/routing/RoleRoute.tsx` | Redireciona para `/` se o usuário não possuir nenhum dos perfis requeridos pela rota |
| `src/router/AppRouter.tsx` | Define todas as rotas: `/login` pública; demais via `PrivateRoute` e `RoleRoute` |
| `src/config/modulePermissions.ts` | Mapa estático `Record<ModuleKey, Role[]>` — fonte única de verdade para permissões por módulo |
| `src/hooks/usePermissions.ts` | Retorna `canAccess(moduleKey: ModuleKey): boolean` baseado nos perfis do usuário atual |
| `src/types/navigation.ts` | Types: `ModuleKey`, `NavModule`, `Role` |

## Mapa de permissões — `modulePermissions.ts`

```typescript
// Fonte única de verdade para permissões de módulo no frontend.
// Alterações aqui propagam para home, sidebar e RoleRoute automaticamente.

export type Role = 'Administrador' | 'Gerente' | 'Catalogador' | 'Caixa';

export type ModuleKey =
  | 'books-register'
  | 'books-search'
  | 'stock'
  | 'labels'
  | 'pdv'
  | 'discounts'
  | 'vouchers'
  | 'used-purchase'
  | 'customers'
  | 'payment-methods'
  | 'reports'
  | 'price-history'
  | 'shelf-time'
  | 'users'
  | 'branches'
  | 'notifications';

export const MODULE_PERMISSIONS: Record<ModuleKey, Role[]> = {
  'books-register':   ['Administrador', 'Gerente', 'Catalogador'],
  'books-search':     ['Administrador', 'Gerente', 'Catalogador', 'Caixa'],
  'stock':            ['Administrador', 'Gerente', 'Catalogador'],
  'labels':           ['Administrador', 'Gerente', 'Catalogador'],
  'pdv':              ['Administrador', 'Gerente', 'Caixa'],
  'discounts':        ['Administrador', 'Gerente'],
  'vouchers':         ['Administrador', 'Gerente'],
  'used-purchase':    ['Administrador', 'Gerente'],
  'customers':        ['Administrador', 'Gerente'],
  'payment-methods':  ['Administrador', 'Gerente'],
  'reports':          ['Administrador', 'Gerente'],
  'price-history':    ['Administrador', 'Gerente'],
  'shelf-time':       ['Administrador', 'Gerente'],
  'users':            ['Administrador', 'Gerente'],
  'branches':         ['Administrador'],
  'notifications':    ['Administrador', 'Gerente', 'Caixa'],
};
```

> Gerente enxerga o módulo `users` mas sua lógica de isolamento por filial é aplicada no backend — o frontend exibe o módulo normalmente.

## Hook `usePermissions`

```typescript
import { useAuth } from './useAuth';
import { MODULE_PERMISSIONS, ModuleKey } from '../config/modulePermissions';

export function usePermissions() {
  const { user } = useAuth();

  function canAccess(moduleKey: ModuleKey): boolean {
    if (!user?.roles?.length) return false;
    const allowed = MODULE_PERMISSIONS[moduleKey];
    return user.roles.some(role => allowed.includes(role as any));
  }

  return { canAccess };
}
```

## Componente `RoleRoute`

```typescript
// Redireciona para '/' caso nenhum dos perfis do usuário esteja entre os permitidos.
interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: Role[];
}

export function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { user } = useAuth();
  const hasPermission = user?.roles?.some(r => allowedRoles.includes(r as Role));
  if (!hasPermission) return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

## Estrutura de rotas — `AppRouter.tsx`

```typescript
// Exemplo de estrutura de rotas (não exaustivo)
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
    <Route path="/" element={<HomePage />} />
    <Route path="/pdv" element={
      <RoleRoute allowedRoles={MODULE_PERMISSIONS['pdv']}>
        <PdvPage />
      </RoleRoute>
    } />
    {/* demais rotas seguem o mesmo padrão */}
  </Route>
</Routes>
```

## Componente `HomePage`

- Renderiza um grid de cards, um por módulo acessível ao usuário.
- Usa `usePermissions().canAccess(key)` para filtrar — módulos sem permissão **não aparecem** (nem desabilitados).
- Cada card contém: ícone, rótulo do módulo, e link de navegação para a rota correspondente.
- Estrutura de dados dos cards definida em `src/config/modules.ts` (ícone, rótulo pt-BR, rota, `moduleKey`).

## Componente `TopBar`

- Exibe: logo/nome do sistema (esquerda), nome do usuário + filial (centro/direita), `NotificationBadge` (extrema direita).
- `branchId` lido do payload JWT via `useAuth`; se `null` (Administrador global), exibe "Todas as filiais" ou sem filial.
- `NotificationBadge` visível para perfis `Gerente`, `Caixa` e `Administrador` (com ou sem filial).

## Componente `Sidebar`

- Menu lateral colapsável com os mesmos módulos da home, filtrados pelo mesmo `usePermissions`.
- Permanente em todas as telas autenticadas (`AppLayout` envolve todas as rotas protegidas).
- Item ativo destacado com base na rota atual (`useLocation`).

## Observações de implementação

- `modulePermissions.ts` é a **única** fonte de verdade para permissões no frontend. `Sidebar`, `HomePage`, e `RoleRoute` todos consomem este mapa — nunca duplicar a lógica.
- A proteção de rota via `RoleRoute` é uma camada de UX, não de segurança. A autorização real ocorre no backend via JWT.
- O campo `roles` no JWT pode conter múltiplos perfis; `canAccess` usa `some` para computar a união das permissões.
- O tipo `Role` no frontend é derivado dos dados do JWT — nenhuma chamada ao backend para listar perfis disponíveis.
- Notificações: `NotificationBadge` faz polling leve ou usa SSE (decisão de implementação); o componente apenas renderiza o contador lido de um hook ou store separado (`useNotifications`). A implementação do backend de notificações pertence à feature correspondente.
- A página de acesso negado pode ser um simples redirecionamento para `/` sem rota dedicada; uma página `403` explícita é fora do escopo desta feature.
