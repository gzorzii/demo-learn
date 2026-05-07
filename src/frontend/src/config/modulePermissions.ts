import type { ModuleKey, Role } from '../types/navigation';

export const MODULE_PERMISSIONS: Record<ModuleKey, Role[]> = {
  'books-register':  ['Administrador', 'Gerente', 'Catalogador'],
  'books-search':    ['Administrador', 'Gerente', 'Catalogador', 'Caixa'],
  'stock':           ['Administrador', 'Gerente', 'Catalogador'],
  'labels':          ['Administrador', 'Gerente', 'Catalogador'],
  'pdv':             ['Administrador', 'Gerente', 'Caixa'],
  'discounts':       ['Administrador', 'Gerente'],
  'vouchers':        ['Administrador', 'Gerente'],
  'used-purchase':   ['Administrador', 'Gerente'],
  'customers':       ['Administrador', 'Gerente'],
  'payment-methods': ['Administrador', 'Gerente'],
  'reports':         ['Administrador', 'Gerente'],
  'price-history':   ['Administrador', 'Gerente'],
  'shelf-time':      ['Administrador', 'Gerente'],
  'users':           ['Administrador', 'Gerente'],
  'branches':        ['Administrador'],
  'notifications':   ['Administrador', 'Gerente', 'Caixa'],
};
