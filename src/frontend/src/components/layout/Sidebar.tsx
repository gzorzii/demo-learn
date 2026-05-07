import { NavLink } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { MODULES } from '../../config/modules';
import './Sidebar.css';

export function Sidebar() {
  const { canAccess } = usePermissions();
  const allowed = MODULES.filter(m => canAccess(m.key));

  return (
    <nav className="sidebar">
      <ul>
        {allowed.map(m => (
          <li key={m.key}>
            <NavLink
              to={m.route}
              className={({ isActive }) =>
                isActive ? 'sidebar-link active' : 'sidebar-link'
              }
            >
              <span className="sidebar-icon">{m.icon}</span>
              <span className="sidebar-label">{m.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
