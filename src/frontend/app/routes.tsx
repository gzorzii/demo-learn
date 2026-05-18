import { createBrowserRouter } from 'react-router';
import { LoginPage } from './pages/LoginPage';
import { AppShell } from './pages/AppShell';
import { PrivateRoute } from './components/routing/PrivateRoute';
import { MeusCiclosPage } from './pages/MeusCiclosPage';
import { MeuTimePage } from './pages/MeuTimePage';
import { CalibracaoPage } from './pages/CalibracaoPage';
import { AdminPage } from './pages/AdminPage';
import { AccessDeniedPage } from './pages/AccessDeniedPage';
import { CfEvaluatorsPage } from './pages/CfEvaluatorsPage';
import { CfEvaluationFormPage } from './pages/CfEvaluationFormPage';
import { CfEvaluationConfirmationPage } from './pages/CfEvaluationConfirmationPage';
import { CfSelfEvaluationPage } from './pages/CfSelfEvaluationPage';
import { PdmCfEvaluationPage } from './pages/PdmCfEvaluationPage';
import { CfProgressPage } from './pages/CfProgressPage';
import { PdmCfProgressPage } from './pages/PdmCfProgressPage';
import { CfSummaryPage } from './pages/CfSummaryPage';
import { PdmCfSummaryPage } from './pages/PdmCfSummaryPage';

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
          { path: 'ciclos/cf/:id/avaliadores', Component: CfEvaluatorsPage },
          { path: 'avaliar/cf/:evaluatorId', Component: CfEvaluationFormPage },
          { path: 'avaliar/cf/:evaluatorId/confirmacao', Component: CfEvaluationConfirmationPage },
          { path: 'ciclos/cf/:id/autoavaliacao', Component: CfSelfEvaluationPage },
          { path: 'ciclos/cf/:id/resumo', Component: CfSummaryPage },
          { path: 'ciclos/cf/:id', Component: CfProgressPage },
          { path: 'meu-time/:colaboradorId/cf/:id/avaliar', Component: PdmCfEvaluationPage },
          { path: 'meu-time/:colaboradorId/cf/:id/resumo', Component: PdmCfSummaryPage },
          { path: 'meu-time/:colaboradorId/cf/:id', Component: PdmCfProgressPage },
        ],
      },
    ],
  },
]);
