import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./common/auth/roles.guard";
import { TenantContextMiddleware } from "./common/tenant/tenant-context.middleware";
import { TenantModule } from "./common/tenant/tenant.module";
import { TenantScopeInterceptor } from "./common/tenant/tenant-scope.interceptor";
import { OperationsController } from "./operations.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { SuperAdminController } from "./super-admin/super-admin.controller";
import { TrackingGateway } from "./tracking/tracking.gateway";

@Module({
  imports: [TenantModule, PrismaModule, AuthModule],
  controllers: [AppController, SuperAdminController, OperationsController],
  providers: [
    TrackingGateway,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantScopeInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes("*");
  }
}
