import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { ReactNode } from 'react';
import type { Role } from '../../types/navigation';

interface Props {
  children: ReactNode;
  allowedRoles: Role[];
}

export function RoleRoute({ children, allowedRoles }: Props) {
  const { user } = useAuth();
  const hasPermission = user?.roles?.some(r => allowedRoles.includes(r as Role));
  if (!hasPermission) return <Navigate to="/" replace />;
  return <>{children}</>;
}
