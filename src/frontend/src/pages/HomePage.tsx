import { Link } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../hooks/useAuth';
import { MODULES } from '../config/modules';
import './HomePage.css';

export function HomePage() {
  const { canAccess } = usePermissions();
  const { user } = useAuth();
  const allowed = MODULES.filter(m => canAccess(m.key));

  return (
    <div className="home">
      <h1 className="home-title">Olá, {user?.name?.split(' ')[0]}</h1>
      <p className="home-subtitle">Selecione um módulo para começar</p>
      <div className="home-grid">
        {allowed.map(m => (
          <Link key={m.key} to={m.route} className="module-card">
            <span className="module-icon">{m.icon}</span>
            <span className="module-label">{m.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
