export type JwtPayload = {
  sub: string;
  tenantId?: string;
  email: string;
  role: string;
};
