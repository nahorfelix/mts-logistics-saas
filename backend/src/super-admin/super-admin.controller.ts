import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Roles } from "../common/auth/roles.decorator";
import { SkipTenantScope } from "../common/tenant/skip-tenant-scope.decorator";

@Controller("super-admin")
@Roles("SUPER_ADMIN")
@SkipTenantScope()
export class SuperAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("overview")
  async overview() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [tenantCount, userCount, vehicleCount, shipmentCount, activeDeliveries, deliveredToday] =
      await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.vehicle.count(),
      this.prisma.shipment.count(),
      this.prisma.shipment.count({ where: { status: { in: ["PICKED_UP", "IN_TRANSIT"] } } }),
      this.prisma.shipment.count({ where: { status: "DELIVERED", deliveredAt: { gte: todayStart } } }),
    ]);

    return {
      tenantCount,
      userCount,
      vehicleCount,
      shipmentCount,
      activeDeliveries,
      deliveredToday,
    };
  }

  @Get("tenants")
  async tenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        domain: true,
        planType: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            vehicles: true,
            drivers: true,
            shipments: true,
          },
        },
      },
    });
  }
}
