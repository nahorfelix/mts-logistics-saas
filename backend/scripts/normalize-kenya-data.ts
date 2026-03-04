import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const kenya = [
  "Nairobi CBD",
  "Westlands",
  "Upper Hill",
  "Industrial Area",
  "Embakasi",
  "JKIA",
  "Karen",
  "Thika",
  "Nakuru",
  "Mombasa",
];

const points: Record<string, [number, number]> = {
  "Nairobi CBD": [-1.286389, 36.817223],
  Westlands: [-1.2676, 36.8108],
  "Upper Hill": [-1.3004, 36.8119],
  "Industrial Area": [-1.3067, 36.8647],
  Embakasi: [-1.3172, 36.8944],
  JKIA: [-1.3192, 36.9278],
  Karen: [-1.3196, 36.7073],
  Thika: [-1.0332, 37.0693],
  Nakuru: [-0.3031, 36.08],
  Mombasa: [-4.0435, 39.6682],
};

async function main(): Promise<void> {
  const shipments = await prisma.shipment.findMany();
  for (const s of shipments) {
    const origin = kenya.includes(s.origin) ? s.origin : "Nairobi CBD";
    const destination = kenya.includes(s.destination) ? s.destination : "Westlands";
    const [oLat, oLng] = points[origin];
    const [dLat, dLng] = points[destination];

    await prisma.shipment.update({
      where: { id: s.id },
      data: {
        origin,
        destination,
        originLatitude: oLat,
        originLongitude: oLng,
        destinationLatitude: dLat,
        destinationLongitude: dLng,
      },
    });
  }

  const vehicles = await prisma.vehicle.findMany();
  for (const vehicle of vehicles) {
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        lastLatitude: -1.35 + Math.random() * 0.4,
        lastLongitude: 36.7 + Math.random() * 0.35,
      },
    });
  }

  console.log(`Kenya normalization complete: ${shipments.length} shipments`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
