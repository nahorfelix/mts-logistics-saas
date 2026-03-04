import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";

type TenantStore = {
  tenantId: string;
};

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantStore>();

  run(tenantId: string, callback: () => void): void {
    this.storage.run({ tenantId }, callback);
  }

  getTenantId(): string | undefined {
    return this.storage.getStore()?.tenantId;
  }
}
