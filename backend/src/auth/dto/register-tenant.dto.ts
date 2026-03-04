export type RegisterTenantDto = {
  tenantName: string;
  domain: string;
  planType?: "STARTER" | "GROWTH" | "ENTERPRISE";
  adminFullName: string;
  adminEmail: string;
  password: string;
};
