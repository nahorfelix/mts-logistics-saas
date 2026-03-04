import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { IS_PUBLIC_KEY } from "../auth/public.decorator";
import { SKIP_TENANT_SCOPE_KEY } from "./skip-tenant-scope.decorator";
import { TenantContextService } from "./tenant-context.service";
import { TenantRequest } from "./tenant-request.interface";

@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return next.handle();
    }

    const skipTenantScope = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skipTenantScope) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<TenantRequest>();
    const userTenantId = req.user?.tenantId;
    const tenantId = req.tenantId ?? userTenantId;

    if (!tenantId) {
      throw new BadRequestException("Missing tenant context.");
    }

    return new Observable((subscriber) => {
      this.tenantContext.run(tenantId, () => {
        const source$ = next.handle();
        source$.subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
