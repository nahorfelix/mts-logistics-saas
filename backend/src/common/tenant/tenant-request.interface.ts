import { Request } from "express";

export interface TenantRequest extends Request {
  tenantId?: string;
  user?: {
    sub?: string;
    tenantId?: string;
    email?: string;
    role?: string;
  } & Record<string, unknown>;
}
