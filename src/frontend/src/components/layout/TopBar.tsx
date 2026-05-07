import { useAuth } from '../../hooks/useAuth';
import './TopBar.css';

export function TopBar() {
  const { user } = useAuth();

  const showNotifications = user?.roles?.some(r =>
    ['Administrador', 'Gerente', 'Caixa'].includes(r)
  );

  const branchLabel = user?.branchId ? 'Filial' : 'Todas as filiais';

  return (
    <header className="topbar">
      <span className="topbar-brand">📖 Livraria</span>
      <div className="topbar-user">
        <span className="topbar-name">{user?.name}</span>
        <span className="topbar-branch">{branchLabel}</span>
      </div>
      {showNotifications && (
        <button className="topbar-notif" aria-label="Notificações">
          🔔
        </button>
      )}
    </header>
  );
}
