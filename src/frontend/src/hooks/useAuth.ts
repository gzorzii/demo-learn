import { useMemo } from 'react';
import type { AuthUser, JwtPayload } from '../types/auth';

function readAuthInfoCookie(): JwtPayload | null {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth_info='));
  if (!match) return null;
  const value = match.split('=')[1];
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    const payload = JSON.parse(json) as JwtPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function useAuth(): { user: AuthUser | null; isAuthenticated: boolean } {
  const user = useMemo(() => {
    const payload = readAuthInfoCookie();
    if (!payload) return null;
    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      roles: payload.roles,
      branchId: payload.branchId,
    } satisfies AuthUser;
  }, []);

  return { user, isAuthenticated: user !== null };
}
