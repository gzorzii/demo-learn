import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { ChevronLeft, Menu, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { authService } from '../services/authService';
import type { MenuItem, MenuUser } from '../types/menu';

interface SideNavProps {
  items: MenuItem[];
  user: MenuUser;
}

export function SideNav({ items, user }: SideNavProps) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();

  async function handleLogout() {
    await authService.logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside
      className={`bg-[#2D2A96] text-white transition-all duration-300 flex flex-col shrink-0 shadow-2xl z-20 relative rounded-r-3xl ${expanded ? 'w-72' : 'w-24'}`}
    >
      <div className="flex items-center justify-between p-6 h-24 border-b border-white/10 bg-[#24217D] rounded-tr-3xl">
        {expanded ? (
          <span className="font-black text-2xl tracking-tight">CI&T Perform</span>
        ) : (
          <span className="font-black text-xl mx-auto">CI&T</span>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 rounded-xl hover:bg-white/10 text-indigo-200 transition-colors"
          aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
        >
          {expanded ? <ChevronLeft size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <nav className="flex-1 py-8 flex flex-col gap-2 overflow-y-auto px-4" aria-label="Menu principal">
        {items.map((item) => (
          <NavLink
            key={item.key}
            to={item.route}
            className={({ isActive }) =>
              `flex items-center px-4 py-3.5 rounded-2xl transition-all font-bold text-base ${
                isActive
                  ? 'bg-[#FF7C6B] text-white shadow-lg'
                  : 'text-indigo-100 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {expanded && <span className="truncate">{item.label}</span>}
            {!expanded && (
              <span className="mx-auto font-black text-lg uppercase">
                {item.label.charAt(0)}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4 flex flex-col gap-2">
        <div className={`flex items-center gap-3 px-2 py-2 ${!expanded ? 'justify-center' : ''}`}>
          <Avatar className="size-9 shrink-0">
            {user.picture ? (
              <AvatarImage src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
            ) : null}
            <AvatarFallback className="bg-indigo-400 text-white font-black text-sm">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {expanded && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate">{user.name}</span>
              <span className="text-xs text-indigo-300 truncate">{user.email}</span>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-indigo-200 hover:bg-white/10 hover:text-white transition-colors font-bold text-sm ${!expanded ? 'justify-center' : ''}`}
          aria-label="Sair"
        >
          <LogOut size={18} className="shrink-0" />
          {expanded && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
