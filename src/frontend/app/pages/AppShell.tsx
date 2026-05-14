import { Navigate, Outlet, useLocation } from 'react-router';
import { AuthProvider, useAuthContext } from '../context/AuthContext';
import { SideNav } from '../components/SideNav';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';

function AppShellContent() {
  const { user, menuItems, defaultRoute, loading, error, retry } = useAuthContext();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F8F9FA]">
        <aside className="w-72 bg-[#2D2A96] rounded-r-3xl shrink-0 flex flex-col p-6 gap-4">
          <Skeleton className="h-12 w-40 bg-white/10" />
          <div className="flex flex-col gap-3 mt-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-2xl bg-white/10" />
            ))}
          </div>
        </aside>
        <main className="flex-1 p-10">
          <Skeleton className="h-full w-full rounded-2xl bg-gray-200" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-bold text-gray-700">Falha ao carregar o menu.</p>
          <p className="text-sm text-gray-500">Verifique sua conexão e tente novamente.</p>
          <Button onClick={retry} className="bg-[#2D2A96] hover:bg-[#24217D]">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (location.pathname === '/') {
    return <Navigate to={defaultRoute} replace />;
  }

  return (
    <div className="flex h-screen bg-[#F8F9FA] font-['DM_Sans']">
      <SideNav items={menuItems} user={user} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto p-10 relative">
          <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#2D2A96]/5 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export function AppShell() {
  return (
    <AuthProvider>
      <AppShellContent />
    </AuthProvider>
  );
}
