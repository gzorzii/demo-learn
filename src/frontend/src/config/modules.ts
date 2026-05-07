import type { NavModule } from '../types/navigation';

export const MODULES: NavModule[] = [
  { key: 'books-register',  label: 'Cadastro de Livros',     route: '/livros/cadastro',  icon: '📚' },
  { key: 'books-search',    label: 'Busca de Livros',         route: '/livros/busca',     icon: '🔍' },
  { key: 'stock',           label: 'Controle de Estoque',     route: '/estoque',          icon: '📦' },
  { key: 'labels',          label: 'Impressão de Etiquetas',  route: '/etiquetas',        icon: '🏷️' },
  { key: 'pdv',             label: 'PDV / Vendas',            route: '/pdv',              icon: '🛒' },
  { key: 'discounts',       label: 'Descontos',               route: '/descontos',        icon: '🏷' },
  { key: 'vouchers',        label: 'Vouchers',                route: '/vouchers',         icon: '🎟️' },
  { key: 'used-purchase',   label: 'Compra de Usados',        route: '/compra-usados',    icon: '♻️' },
  { key: 'customers',       label: 'Clientes',                route: '/clientes',         icon: '👥' },
  { key: 'payment-methods', label: 'Métodos de Pagamento',    route: '/pagamentos',       icon: '💳' },
  { key: 'reports',         label: 'Relatórios',              route: '/relatorios',       icon: '📊' },
  { key: 'price-history',   label: 'Histórico de Preços',     route: '/historico-precos', icon: '📈' },
  { key: 'shelf-time',      label: 'Tempo em Prateleira',     route: '/prateleira',       icon: '⏱️' },
  { key: 'users',           label: 'Usuários',                route: '/usuarios',         icon: '👤' },
  { key: 'branches',        label: 'Filiais',                 route: '/filiais',          icon: '🏪' },
  { key: 'notifications',   label: 'Notificações',            route: '/notificacoes',     icon: '🔔' },
];
