import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const vehicleModels = ["Volvo FH16", "Mercedes Actros", "Scania R500", "MAN TGX"];
const cityPairs = [
  ["Nairobi CBD", "Westlands"],
  ["JKIA", "Upper Hill"],
  ["Embakasi", "Industrial Area"],
  ["Nairobi CBD", "Karen"],
  ["Nairobi CBD", "Thika"],
  ["Nakuru", "Nairobi CBD"],
  ["Mombasa", "Nairobi CBD"],
];

const randomFrom = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
const randomPhone = (): string => `+2547${Math.floor(10000000 + Math.random() * 89999999)}`;

const kenyaPoints: Record<string, { lat: number; lng: number }> = {
  "Nairobi CBD": { lat: -1.286389, lng: 36.817223 },
  Westlands: { lat: -1.2676, lng: 36.8108 },
  "Upper Hill": { lat: -1.3004, lng: 36.8119 },
  "Industrial Area": { lat: -1.3067, lng: 36.8647 },
  Embakasi: { lat: -1.3172, lng: 36.8944 },
  JKIA: { lat: -1.3192, lng: 36.9278 },
  Karen: { lat: -1.3196, lng: 36.7073 },
  Thika: { lat: -1.0332, lng: 37.0693 },
  Nakuru: { lat: -0.3031, lng: 36.08 },
  Mombasa: { lat: -4.0435, lng: 39.6682 },
};

async function seed(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { domain: "acme.mts.local" },
    update: {},
    create: {
      name: "Acme Logistics",
      domain: "acme.mts.local",
      planType: "GROWTH",
    },
  });

  const vehicles = await Promise.all(
    Array.from({ length: 20 }).map((_, i) =>
      prisma.vehicle.create({
        data: {
          tenantId: tenant.id,
          model: randomFrom(vehicleModels),
          plate: `MTS-${1000 + i}`,
          status: randomFrom([
            "IDLE",
            "IN_TRANSIT",
            "MAINTENANCE",
          ]),
          lastLatitude: -1.35 + Math.random() * 0.4,
          lastLongitude: 36.7 + Math.random() * 0.35,
          lastGpsAt: new Date(),
        },
      }),
    ),
  );

  const drivers = await Promise.all(
    Array.from({ length: 25 }).map((_, i) =>
      prisma.driver.create({
        data: {
          tenantId: tenant.id,
          name: `Driver ${i + 1}`,
          license: `LIC-${20000 + i}`,
          phone: randomPhone(),
          availability: randomFrom([
            "ONLINE",
            "OFFLINE",
            "ON_DELIVERY",
          ]),
          currentLatitude: -1.33 + Math.random() * 0.45,
          currentLongitude: 36.7 + Math.random() * 0.4,
          lastLocationAt: new Date(),
        },
      }),
    ),
  );

  await Promise.all(
    Array.from({ length: 40 }).map((_, i) => {
      const [origin, destination] = randomFrom(cityPairs);
      return prisma.shipment.create({
        data: {
          tenantId: tenant.id,
          origin,
          destination,
          originLatitude: kenyaPoints[origin]?.lat,
          originLongitude: kenyaPoints[origin]?.lng,
          destinationLatitude: kenyaPoints[destination]?.lat,
          destinationLongitude: kenyaPoints[destination]?.lng,
          status: randomFrom([
            "PENDING",
            "PICKED_UP",
            "IN_TRANSIT",
            "DELIVERED",
          ]),
          driverDecision: randomFrom(["PENDING", "ACCEPTED", "DECLINED"]),
          assignedVehicleId: vehicles[i % vehicles.length]?.id,
          assignedDriverId: drivers[i % drivers.length]?.id,
          eta: new Date(Date.now() + (12 + i) * 60 * 60 * 1000),
        },
      });
    }),
  );

  console.log("Mock data generated for tenant:", tenant.name);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
