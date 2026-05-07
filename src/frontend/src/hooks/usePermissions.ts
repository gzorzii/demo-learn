import { useAuth } from './useAuth';
import { MODULE_PERMISSIONS } from '../config/modulePermissions';
import type { ModuleKey, Role } from '../types/navigation';

export function usePermissions() {
  const { user } = useAuth();

  function canAccess(moduleKey: ModuleKey): boolean {
    if (!user?.roles?.length) return false;
    return user.roles.some(role =>
      MODULE_PERMISSIONS[moduleKey].includes(role as Role)
    );
  }

  return { canAccess };
}
