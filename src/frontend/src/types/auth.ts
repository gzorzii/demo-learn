export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
  roles: string[];
  branchId: string | null;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  branchId: string | null;
}
