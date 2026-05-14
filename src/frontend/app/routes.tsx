import { createBrowserRouter } from 'react-router';
import { LoginPage } from './pages/LoginPage';
import { AppShell } from './pages/AppShell';
import { PrivateRoute } from './components/routing/PrivateRoute';
import { MeusCiclosPage } from './pages/MeusCiclosPage';
import { MeuTimePage } from './pages/MeuTimePage';
import { CalibracaoPage } from './pages/CalibracaoPage';
import { AdminPage } from './pages/AdminPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';

export const router = createBrowserRouter([
  { path: '/login', Component: LoginPage },
  {
    Component: PrivateRoute,
    children: [
      {
        path: '/',
        Component: AppShell,
        children: [
          { path: 'meus-ciclos', Component: MeusCiclosPage },
          { path: 'meu-time', Component: MeuTimePage },
          { path: 'calibracao', Component: CalibracaoPage },
          { path: 'admin', Component: AdminPage },
          { path: 'acesso-negado', Component: AccessDeniedPage },
        ],
      },
    ],
  },
]);
