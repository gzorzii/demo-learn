import { Navigate } from 'react-router';
import type { ReactNode } from 'react';
import { useAuthContext } from '../../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles: string[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { hasRole } = useAuthContext();

  const permitted = allowedRoles.some(role => hasRole(role));

  if (!permitted) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return <>{children}</>;
}
