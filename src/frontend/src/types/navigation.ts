export type Role = 'Administrador' | 'Gerente' | 'Catalogador' | 'Caixa';

export type ModuleKey =
  | 'books-list'
  | 'books-register'
  | 'books-search'
  | 'stock'
  | 'labels'
  | 'pdv'
  | 'discounts'
  | 'vouchers'
  | 'used-purchase'
  | 'customers'
  | 'payment-methods'
  | 'reports'
  | 'price-history'
  | 'shelf-time'
  | 'users'
  | 'branches'
  | 'notifications';

export interface NavModule {
  key: ModuleKey;
  label: string;
  route: string;
  icon: string;
}
