export interface MenuItem {
  key: string;
  label: string;
  route: string;
  roles: string[];
}

export interface MenuUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  picture?: string | null;
}

export interface MenuResponse {
  user: MenuUser;
  defaultRoute: string;
  menuItems: MenuItem[];
}
