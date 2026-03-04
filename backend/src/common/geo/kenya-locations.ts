export type GeoPoint = {
  lat: number;
  lng: number;
};

const KENYA_LOCATION_MAP: Record<string, GeoPoint> = {
  "Nairobi CBD": { lat: -1.286389, lng: 36.817223 },
  Westlands: { lat: -1.2676, lng: 36.8108 },
  "Upper Hill": { lat: -1.3004, lng: 36.8119 },
  "Industrial Area": { lat: -1.3067, lng: 36.8647 },
  Embakasi: { lat: -1.3172, lng: 36.8944 },
  "JKIA": { lat: -1.3192, lng: 36.9278 },
  Karen: { lat: -1.3196, lng: 36.7073 },
  Thika: { lat: -1.0332, lng: 37.0693 },
  Mombasa: { lat: -4.0435, lng: 39.6682 },
  Kisumu: { lat: -0.0917, lng: 34.768 },
  Nakuru: { lat: -0.3031, lng: 36.08 },
  Eldoret: { lat: 0.5143, lng: 35.2698 },
  Naivasha: { lat: -0.7177, lng: 36.4318 },
};

export const kenyaLocations = Object.keys(KENYA_LOCATION_MAP);

export function resolveKenyaLocation(location: string): GeoPoint | null {
  return KENYA_LOCATION_MAP[location] ?? null;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  return 2 * R * Math.asin(Math.sqrt(h));
}
