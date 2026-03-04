import { ForbiddenException, Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { TenantContextService } from "../common/tenant/tenant-context.service";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly tenantContext: TenantContextService) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  withTenantScope(): PrismaClient {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new ForbiddenException("Tenant context is required for data access.");
    }

    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({
            operation,
            args,
            query,
          }: {
            operation: string;
            args: Record<string, any> | undefined;
            query: (args: Record<string, any>) => Promise<unknown>;
          }) {
            const scopedArgs = { ...(args ?? {}) } as Record<string, any>;

            const withWhere = (): void => {
              scopedArgs.where = {
                ...(typeof scopedArgs.where === "object" && scopedArgs.where !== null
                  ? (scopedArgs.where as Record<string, any>)
                  : {}),
                tenantId,
              };
            };

            const withData = (): void => {
              if (Array.isArray(scopedArgs.data)) {
                scopedArgs.data = scopedArgs.data.map((row) => ({
                  ...(row as Record<string, any>),
                  tenantId,
                }));
                return;
              }

              scopedArgs.data = {
                ...(typeof scopedArgs.data === "object" && scopedArgs.data !== null
                  ? (scopedArgs.data as Record<string, any>)
                  : {}),
                tenantId,
              };
            };

            switch (operation) {
              case "findMany":
              case "findFirst":
              case "findUnique":
              case "updateMany":
              case "deleteMany":
              case "aggregate":
              case "count":
              case "groupBy":
                withWhere();
                break;
              case "update":
              case "delete":
                withWhere();
                break;
              case "create":
              case "createMany":
                withData();
                break;
              case "upsert":
                withWhere();
                scopedArgs.create = {
                  ...(typeof scopedArgs.create === "object" && scopedArgs.create !== null
                    ? scopedArgs.create
                    : {}),
                  tenantId,
                };
                scopedArgs.update = {
                  ...(typeof scopedArgs.update === "object" && scopedArgs.update !== null
                    ? scopedArgs.update
                    : {}),
                  tenantId,
                };
                break;
              case "findFirstOrThrow":
              case "findUniqueOrThrow":
                withWhere();
                break;
              default:
                break;
            }

            return query(scopedArgs);
          },
        },
      },
    }) as PrismaClient;
  }
}
