import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Response } from "express";
import { TenantRequest } from "./tenant-request.interface";

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: TenantRequest, _res: Response, next: NextFunction): void {
    const headerTenantId = req.header("x-tenant-id");
    const userTenantId =
      typeof req.user === "object" && req.user !== null && "tenantId" in req.user
        ? String((req.user as { tenantId: string }).tenantId)
        : undefined;

    // Subdomain fallback for white-label setups: acme.mts-logistics.com -> acme
    const hostname = req.hostname ?? "";
    const subdomain = hostname.includes(".") ? hostname.split(".")[0] : undefined;

    req.tenantId = headerTenantId ?? userTenantId ?? subdomain;
    next();
  }
}
