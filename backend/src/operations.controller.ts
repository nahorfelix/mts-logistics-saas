import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { haversineKm, resolveKenyaLocation } from "./common/geo/kenya-locations";
import { Roles } from "./common/auth/roles.decorator";
import { TenantRequest } from "./common/tenant/tenant-request.interface";
import { PrismaService } from "./prisma/prisma.service";

@Controller("tenant")
export class OperationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("overview")
  @Roles("ADMIN", "DISPATCHER", "DRIVER")
  async overview() {
    const db = this.prisma.withTenantScope();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const [
      vehicleCount,
      onlineDrivers,
      activeDeliveries,
      weeklyCompletedTrips,
      totalTrips,
      inTransitOrders,
      pickedOrders,
      notPickedOrders,
      acceptedOrders,
      declinedOrders,
      driversWaiting,
      driversInTransit,
    ] = await Promise.all([
      db.vehicle.count(),
      db.driver.count({ where: { availability: { in: ["ONLINE", "ON_DELIVERY"] } } }),
      db.shipment.count({ where: { status: { in: ["PICKED_UP", "IN_TRANSIT"] } } }),
      db.shipment.count({ where: { status: "DELIVERED", deliveredAt: { gte: weekStart } } }),
      db.shipment.count({ where: { status: "DELIVERED" } }),
      db.shipment.count({ where: { status: "IN_TRANSIT" } }),
      db.shipment.count({ where: { status: "PICKED_UP" } }),
      db.shipment.count({ where: { status: "PENDING", assignedDriverId: null } }),
      db.shipment.count({ where: { driverDecision: "ACCEPTED" } }),
      db.shipment.count({ where: { driverDecision: "DECLINED" } }),
      db.driver.count({ where: { availability: "ONLINE" } }),
      db.driver.count({ where: { availability: "ON_DELIVERY" } }),
    ]);

    return {
      activeDeliveries,
      totalVehicles: vehicleCount,
      onlineDrivers,
      weeklyCompletedTrips,
      totalTrips,
      inTransitOrders,
      pickedOrders,
      notPickedOrders,
      acceptedOrders,
      declinedOrders,
      driversWaiting,
      driversInTransit,
    };
  }

  @Get("vehicles")
  @Roles("ADMIN", "DISPATCHER", "DRIVER")
  async vehicles() {
    return this.prisma.withTenantScope().vehicle.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        model: true,
        plate: true,
        status: true,
        lastLatitude: true,
        lastLongitude: true,
        lastGpsAt: true,
      },
    });
  }

  @Get("drivers")
  @Roles("ADMIN", "DISPATCHER", "DRIVER")
  async drivers(@Req() req: TenantRequest) {
    const role = req.user?.role;
    const db = this.prisma.withTenantScope();
    if (role === "DRIVER") {
      const me = await db.driver.findFirst({
        where: { userId: req.user?.sub },
        select: {
          id: true,
          name: true,
          phone: true,
          availability: true,
          license: true,
        },
      });
      return me ? [me] : [];
    }

    return db.driver.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        availability: true,
        license: true,
        currentLatitude: true,
        currentLongitude: true,
        lastLocationAt: true,
      },
    });
  }

  @Get("shipments")
  @Roles("ADMIN", "DISPATCHER", "DRIVER")
  async shipments(@Req() req: TenantRequest) {
    const db = this.prisma.withTenantScope();
    const role = req.user?.role;

    if (role === "DRIVER") {
      const driver = await db.driver.findFirst({ where: { userId: req.user?.sub }, select: { id: true } });
      if (!driver) return [];
      return db.shipment.findMany({
        where: { assignedDriverId: driver.id },
        orderBy: { createdAt: "desc" },
      });
    }

    return db.shipment.findMany({ orderBy: { createdAt: "desc" } });
  }

  @Get("command-center")
  @Roles("ADMIN", "DISPATCHER")
  async commandCenter() {
    const db = this.prisma.withTenantScope();
    const [activeTrips, pendingOrders, waitingDrivers] = await Promise.all([
      db.shipment.findMany({
        where: { status: { in: ["PICKED_UP", "IN_TRANSIT"] } },
        include: {
          assignedDriver: {
            select: {
              id: true,
              name: true,
              availability: true,
              currentLatitude: true,
              currentLongitude: true,
            },
          },
          assignedVehicle: {
            select: {
              id: true,
              plate: true,
              status: true,
              lastLatitude: true,
              lastLongitude: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.shipment.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.driver.findMany({
        where: { availability: "ONLINE" },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return {
      activeTrips,
      pendingOrders,
      waitingDrivers,
    };
  }

  @Post("drivers/me/location")
  @Roles("DRIVER")
  async updateDriverLocation(
    @Req() req: TenantRequest,
    @Body() dto: { latitude: number; longitude: number },
  ) {
    if (typeof dto.latitude !== "number" || typeof dto.longitude !== "number") {
      throw new BadRequestException("latitude and longitude are required.");
    }

    const db = this.prisma.withTenantScope();
    const driver = await db.driver.findFirst({ where: { userId: req.user?.sub } });
    if (!driver) {
      throw new BadRequestException("Driver profile is not linked to this user.");
    }

    return db.driver.update({
      where: { id: driver.id },
      data: {
        currentLatitude: dto.latitude,
        currentLongitude: dto.longitude,
        lastLocationAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        currentLatitude: true,
        currentLongitude: true,
        lastLocationAt: true,
      },
    });
  }

  @Get("shipments/available-for-driver")
  @Roles("DRIVER")
  async nearbyShipments(
    @Req() req: TenantRequest,
    @Query("lat") latQuery?: string,
    @Query("lng") lngQuery?: string,
  ) {
    const db = this.prisma.withTenantScope();
    const driver = await db.driver.findFirst({
      where: { userId: req.user?.sub },
      select: {
        id: true,
        currentLatitude: true,
        currentLongitude: true,
      },
    });
    if (!driver) {
      throw new BadRequestException("Driver profile is not linked to this user.");
    }

    const lat = latQuery ? Number(latQuery) : driver.currentLatitude;
    const lng = lngQuery ? Number(lngQuery) : driver.currentLongitude;
    if (typeof lat !== "number" || Number.isNaN(lat) || typeof lng !== "number" || Number.isNaN(lng)) {
      throw new BadRequestException("Driver location is required. Update location first.");
    }

    const pool = await db.shipment.findMany({
      where: {
        status: "PENDING",
        assignedDriverId: null,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return pool
      .map((shipment) => {
        const originPoint =
          shipment.originLatitude && shipment.originLongitude
            ? { lat: shipment.originLatitude, lng: shipment.originLongitude }
            : resolveKenyaLocation(shipment.origin) ?? { lat: -1.286389, lng: 36.817223 };
        const distanceKm = haversineKm({ lat, lng }, originPoint);
        return {
          ...shipment,
          distanceKm: Number(distanceKm.toFixed(2)),
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  @Post("shipments")
  @Roles("ADMIN", "DISPATCHER")
  async createShipment(
    @Req() req: TenantRequest,
    @Body() dto: { origin: string; destination: string; eta?: string },
  ) {
    if (!dto.origin || !dto.destination) {
      throw new BadRequestException("origin and destination are required.");
    }
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException("Tenant context not found.");
    }
    const originPoint = resolveKenyaLocation(dto.origin);
    const destinationPoint = resolveKenyaLocation(dto.destination);
    return this.prisma.withTenantScope().shipment.create({
      data: {
        tenantId,
        origin: dto.origin,
        destination: dto.destination,
        originLatitude: originPoint?.lat,
        originLongitude: originPoint?.lng,
        destinationLatitude: destinationPoint?.lat,
        destinationLongitude: destinationPoint?.lng,
        status: "PENDING",
        eta: dto.eta ? new Date(dto.eta) : null,
      },
    });
  }

  @Post("shipments/:id/dispatch")
  @Roles("ADMIN", "DISPATCHER")
  async dispatchShipment(
    @Param("id") id: string,
    @Body() dto: { driverId: string; vehicleId: string; eta?: string },
  ) {
    if (!dto.driverId || !dto.vehicleId) {
      throw new BadRequestException("driverId and vehicleId are required.");
    }

    const db = this.prisma.withTenantScope();
    const [driver, vehicle] = await Promise.all([
      db.driver.findFirst({ where: { id: dto.driverId } }),
      db.vehicle.findFirst({ where: { id: dto.vehicleId } }),
    ]);
    if (!driver || !vehicle) {
      throw new BadRequestException("Driver or vehicle not found.");
    }
    if (driver.availability === "OFFLINE") {
      throw new BadRequestException("Driver is offline.");
    }

    await db.vehicle.update({ where: { id: vehicle.id }, data: { status: "IDLE" } });
    await db.driver.update({ where: { id: driver.id }, data: { availability: "ONLINE" } });

    return db.shipment.update({
      where: { id },
      data: {
        assignedDriverId: driver.id,
        assignedVehicleId: vehicle.id,
        status: "PENDING",
        driverDecision: "PENDING",
        dispatchedAt: new Date(),
        declinedAt: null,
        declineReason: null,
        acceptedAt: null,
        eta: dto.eta ? new Date(dto.eta) : undefined,
      },
    });
  }

  @Post("shipments/:id/driver-action")
  @Roles("DRIVER")
  async driverAction(
    @Req() req: TenantRequest,
    @Param("id") id: string,
    @Body() dto: { action: "ACCEPT" | "DECLINE"; reason?: string },
  ) {
    const db = this.prisma.withTenantScope();
    const driver = await db.driver.findFirst({ where: { userId: req.user?.sub } });
    if (!driver) {
      throw new BadRequestException("Driver profile is not linked to this user.");
    }
    const shipment = await db.shipment.findFirst({ where: { id, assignedDriverId: driver.id } });
    if (!shipment) {
      throw new BadRequestException("Shipment not assigned to this driver.");
    }

    if (dto.action === "ACCEPT") {
      if (!shipment.assignedVehicleId) {
        throw new BadRequestException("No vehicle assigned to this shipment.");
      }
      await db.driver.update({
        where: { id: driver.id },
        data: { availability: "ON_DELIVERY" },
      });
      await db.vehicle.update({
        where: { id: shipment.assignedVehicleId },
        data: { status: "IN_TRANSIT" },
      });
      return db.shipment.update({
        where: { id: shipment.id },
        data: {
          driverDecision: "ACCEPTED",
          status: "PICKED_UP",
          acceptedAt: new Date(),
          declinedAt: null,
          declineReason: null,
        },
      });
    }

    await db.driver.update({
      where: { id: driver.id },
      data: { availability: "ONLINE" },
    });
    return db.shipment.update({
      where: { id: shipment.id },
      data: {
        driverDecision: "DECLINED",
        status: "PENDING",
        declinedAt: new Date(),
        declineReason: dto.reason ?? "Driver declined order.",
        assignedDriverId: null,
        assignedVehicleId: null,
      },
    });
  }

  @Post("shipments/:id/claim")
  @Roles("DRIVER")
  async claimShipment(@Req() req: TenantRequest, @Param("id") id: string) {
    const db = this.prisma.withTenantScope();
    const driver = await db.driver.findFirst({ where: { userId: req.user?.sub } });
    if (!driver) {
      throw new BadRequestException("Driver profile is not linked to this user.");
    }

    const availableVehicle = await db.vehicle.findFirst({
      where: { status: { in: ["IDLE", "IN_TRANSIT"] } },
      orderBy: { updatedAt: "asc" },
    });
    if (!availableVehicle) {
      throw new BadRequestException("No available vehicle currently.");
    }

    const shipment = await db.shipment.findFirst({
      where: {
        id,
        status: "PENDING",
        assignedDriverId: null,
      },
    });
    if (!shipment) {
      throw new BadRequestException("Shipment is no longer available.");
    }

    await db.driver.update({
      where: { id: driver.id },
      data: { availability: "ON_DELIVERY" },
    });
    await db.vehicle.update({
      where: { id: availableVehicle.id },
      data: { status: "IN_TRANSIT" },
    });

    return db.shipment.update({
      where: { id: shipment.id },
      data: {
        assignedDriverId: driver.id,
        assignedVehicleId: availableVehicle.id,
        status: "PICKED_UP",
        driverDecision: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });
  }

  @Post("shipments/:id/complete")
  @Roles("ADMIN", "DISPATCHER", "DRIVER")
  async completeShipment(@Req() req: TenantRequest, @Param("id") id: string) {
    const db = this.prisma.withTenantScope();
    const shipment = await db.shipment.findFirst({ where: { id } });
    if (!shipment) {
      throw new BadRequestException("Shipment not found.");
    }

    if (req.user?.role === "DRIVER") {
      const me = await db.driver.findFirst({
        where: { userId: req.user?.sub },
        select: { id: true },
      });
      if (!me || shipment.assignedDriverId !== me.id) {
        throw new BadRequestException("This trip is not assigned to this driver.");
      }
    }

    if (shipment.assignedDriverId) {
      await db.driver.update({
        where: { id: shipment.assignedDriverId },
        data: { availability: "ONLINE" },
      });
    }
    if (shipment.assignedVehicleId) {
      await db.vehicle.update({
        where: { id: shipment.assignedVehicleId },
        data: { status: "IDLE" },
      });
    }

    return db.shipment.update({
      where: { id },
      data: {
        status: "DELIVERED",
        driverDecision: shipment.driverDecision === "ACCEPTED" ? "ACCEPTED" : shipment.driverDecision,
        deliveredAt: new Date(),
      },
    });
  }
}
