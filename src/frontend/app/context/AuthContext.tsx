import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchMenu } from '../services/menuService';
import type { MenuItem, MenuUser } from '../types/menu';

interface AuthContextType {
  user: MenuUser;
  menuItems: MenuItem[];
  defaultRoute: string;
  hasRole: (role: string) => boolean;
  loading: boolean;
  error: boolean;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<MenuUser | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [defaultRoute, setDefaultRoute] = useState<string>('/');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const data = await fetchMenu();
        if (!cancelled) {
          setUser(data.user);
          setMenuItems(data.menuItems);
          setDefaultRoute(data.defaultRoute);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  function retry() {
    setRetryCount(c => c + 1);
  }

  function hasRole(role: string): boolean {
    return user?.roles.includes(role) ?? false;
  }

  const value: AuthContextType = {
    user: user!,
    menuItems,
    defaultRoute,
    hasRole,
    loading,
    error,
    retry,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
