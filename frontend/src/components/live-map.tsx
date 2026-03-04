// @ts-nocheck
import "leaflet/dist/leaflet.css";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

const vehicleIcon = L.divIcon({
  className: "custom-vehicle-marker",
  html: `<div style="width:14px;height:14px;border-radius:9999px;background:#FF4F00;border:2px solid #020617;"></div>`,
  iconSize: [14, 14],
});

export type MapVehicle = {
  id: string;
  label: string;
  status: string;
  lat?: number | null;
  lng?: number | null;
};

type LiveMapProps = {
  vehicles: MapVehicle[];
};

const fallbackVehicles: MapVehicle[] = [
  { id: "sample-1", label: "KDA 301A", status: "IN_TRANSIT", lat: -1.2833, lng: 36.8167 },
  { id: "sample-2", label: "KDJ 442P", status: "IN_TRANSIT", lat: -1.2667, lng: 36.8 },
  { id: "sample-3", label: "KCY 981N", status: "IDLE", lat: -1.3192, lng: 36.9278 },
];

export function LiveMap({ vehicles }: LiveMapProps) {
  const displayVehicles = vehicles.length > 0 ? vehicles : fallbackVehicles;
  return (
    <MapContainer
      center={[-1.286389, 36.817223]}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {displayVehicles
        .filter((vehicle) => typeof vehicle.lat === "number" && typeof vehicle.lng === "number")
        .map((vehicle) => (
        <Marker key={vehicle.id} position={[vehicle.lat!, vehicle.lng!]} icon={vehicleIcon}>
          <Popup>
            <strong>{vehicle.label}</strong>
            <br />
            Status: {vehicle.status}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
