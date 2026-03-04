import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { PrismaService } from "../prisma/prisma.service";

type GpsUpdatePayload = {
  tenantId: string;
  vehicleId: string;
  lat: number;
  lng: number;
  timestamp?: string;
};

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class TrackingGateway {
  @WebSocketServer() server!: Server;

  constructor(private readonly prisma: PrismaService) {}

  @SubscribeMessage("JOIN_TENANT_ROOM")
  onJoinTenantRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tenantId: string },
  ): void {
    client.join(this.tenantRoom(payload.tenantId));
  }

  @SubscribeMessage("GPS_UPDATE")
  async onGpsUpdate(
    @MessageBody() payload: GpsUpdatePayload,
  ): Promise<{ ok: boolean; tenantId: string }> {
    await this.prisma.vehicle.updateMany({
      where: {
        id: payload.vehicleId,
        tenantId: payload.tenantId,
      },
      data: {
        status: "IN_TRANSIT",
        lastLatitude: payload.lat,
        lastLongitude: payload.lng,
        lastGpsAt: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      },
    });

    this.server.to(this.tenantRoom(payload.tenantId)).emit("GPS_BROADCAST", payload);
    return { ok: true, tenantId: payload.tenantId };
  }

  private tenantRoom(tenantId: string): string {
    return `tenant:${tenantId}`;
  }
}
