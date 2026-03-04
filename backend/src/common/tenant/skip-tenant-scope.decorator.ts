import { SetMetadata } from "@nestjs/common";

export const SKIP_TENANT_SCOPE_KEY = "skipTenantScope";
export const SkipTenantScope = () => SetMetadata(SKIP_TENANT_SCOPE_KEY, true);
