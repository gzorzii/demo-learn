import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import { useRole, RoleProvider } from "../context/RoleContext";
import {
  LayoutDashboard, Users, History as HistoryIcon, HelpCircle,
  Menu, ChevronLeft, RefreshCcw, Sliders, Briefcase, LogOut
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { authService } from "../services/authService";
import { useAuth } from "../hooks/useAuth";

export function Root() {
  return (
    <RoleProvider>
      <LayoutContent />
    </RoleProvider>
  );
}

export function LayoutContent() {
  const [expanded, setExpanded] = useState(true);
  const { isManager, setIsManager } = useRole();
  const navigate = useNavigate();
  const { user } = useAuth();

  async function handleLogout() {
    await authService.logout();
    navigate('/login', { replace: true });
  }

  const forYouMenu = [
    { name: "Home", path: "/", icon: LayoutDashboard },
    { name: "Performance Cycle", path: "/performance-cycle", icon: RefreshCcw },
    { name: "History & Actions", path: "/history", icon: HistoryIcon },
    { name: "FAQ & Methodology", path: "/faq", icon: HelpCircle },
  ];

  const forTeamMenu = [
    { name: "Team Management", path: "/team", icon: Users },
    { name: "Calibration", path: "/calibration", icon: Sliders },
  ];

  return (
    <div className="flex h-screen bg-[#F8F9FA] text-gray-800 font-['DM_Sans']">
      {/* Sidebar - Nova cor suave e fontes maiores */}
      <aside className={`bg-[#2D2A96] text-white transition-all duration-300 flex flex-col ${expanded ? "w-72" : "w-24"} shrink-0 shadow-2xl z-20 relative rounded-r-3xl`}>
        <div className="flex items-center justify-between p-6 h-24 border-b border-white/10 bg-[#24217D] rounded-tr-3xl">
          {expanded ? <span className="font-black text-2xl tracking-tight">CI&T Perform</span> : <span className="font-black text-xl mx-auto">CI&T</span>}
          <button onClick={() => setExpanded(!expanded)} className="p-2 rounded-xl hover:bg-white/10 text-indigo-200 transition-colors">
            {expanded ? <ChevronLeft size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <nav className="flex-1 py-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
          <div>
            {expanded && <div className="px-8 mb-4 text-xs font-black text-indigo-300 uppercase tracking-widest">For You (CI&Ter)</div>}
            <div className="flex flex-col gap-2 px-4">
              {forYouMenu.map((item) => (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center px-4 py-3.5 rounded-2xl transition-all font-bold text-base ${isActive ? "bg-[#FF7C6B] text-white shadow-lg" : "text-indigo-100 hover:bg-white/10 hover:text-white"}`}>
                  <item.icon size={22} className={expanded ? "mr-4 shrink-0" : "mx-auto shrink-0"} />
                  {expanded && <span className="truncate">{item.name}</span>}
                </NavLink>
              ))}
            </div>
          </div>

          {isManager && (
            <div>
              {expanded && (
                <div className="px-8 mb-4 flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">For Your Team</span>
                  <span className="bg-indigo-500 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-sm">MANAGER</span>
                </div>
              )}
              <div className="flex flex-col gap-2 px-4">
                {forTeamMenu.map((item) => (
                  <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center px-4 py-3.5 rounded-2xl transition-all font-bold text-base ${isActive ? "bg-indigo-600 text-white shadow-lg" : "text-indigo-100 hover:bg-white/10 hover:text-white"}`}>
                    <item.icon size={22} className={expanded ? "mr-4 shrink-0" : "mx-auto shrink-0"} />
                    {expanded && <span className="truncate">{item.name}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`h-24 border-b flex items-center justify-between px-10 shrink-0 transition-colors ${isManager ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-4">
            <h1 className={`text-2xl font-black tracking-tight ${isManager ? 'text-indigo-900' : 'text-[#2D2A96]'}`}>{isManager ? "Manager Portal" : "Collaborator Portal"}</h1>
            {isManager && <span className="bg-indigo-500 text-white text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm"><Briefcase size={14} /> MANAGER VIEW</span>}
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-2xl border border-gray-200/50 shadow-inner">
              <button className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${!isManager ? "bg-white shadow-sm text-[#2D2A96]" : "text-gray-500 hover:text-gray-700"}`} onClick={() => setIsManager(false)}>Collaborator</button>
              <button className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${isManager ? "bg-[#2D2A96] text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`} onClick={() => setIsManager(true)}>Manager (PDM)</button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-12 w-12 rounded-full overflow-hidden border-4 border-white shadow-md ring-2 ring-gray-100 cursor-pointer hover:ring-[#2D2A96] transition-all">
                  {user?.picture
                    ? <img src={user.picture} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <div className="w-full h-full bg-[#2D2A96] flex items-center justify-center text-white font-black text-lg">{user?.name?.[0]?.toUpperCase() ?? '?'}</div>
                  }
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 font-bold cursor-pointer gap-2">
                  <LogOut size={16} /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-10 relative">
          <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#2D2A96]/5 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-[1400px] mx-auto"><Outlet /></div>
        </div>
      </main>
    </div>
  );
}