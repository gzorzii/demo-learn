import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

export function PrivateRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}