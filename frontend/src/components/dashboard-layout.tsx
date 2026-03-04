import {
  BarChart3,
  Truck,
  Users,
  PackageCheck,
  Route,
  MapPinned,
} from "lucide-react";
import { ReactNode, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type StatCard = {
  label: string;
  value: string | number;
};

type NavSection = "Fleet" | "Drivers" | "Shipments" | "Analytics";

type VehicleRow = {
  id: string;
  model: string;
  plate: string;
  status: string;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastGpsAt?: string | null;
};

type DriverRow = {
  id: string;
  userId?: string | null;
  name: string;
  phone: string;
  availability: string;
  license: string;
};

type ShipmentRow = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  driverDecision?: string;
  assignedDriverId?: string | null;
  assignedVehicleId?: string | null;
  declineReason?: string | null;
  createdAt?: string;
};

type DashboardOverview = {
  activeDeliveries: number;
  totalVehicles: number;
  onlineDrivers: number;
  weeklyCompletedTrips: number;
  totalTrips: number;
  inTransitOrders: number;
  pickedOrders: number;
  notPickedOrders: number;
  acceptedOrders: number;
  declinedOrders: number;
  driversWaiting: number;
  driversInTransit: number;
};

type NearbyShipment = {
  id: string;
  origin: string;
  destination: string;
  distanceKm: number;
};

type CommandCenter = {
  activeTrips: Array<{
    id: string;
    origin: string;
    destination: string;
    status: string;
    assignedDriver?: { name: string; availability: string } | null;
    assignedVehicle?: { plate: string; status: string } | null;
  }>;
  pendingOrders: Array<{ id: string; origin: string; destination: string; driverDecision: string }>;
  waitingDrivers: Array<{ id: string; name: string; availability: string }>;
};

const navItems = [
  { label: "Fleet", icon: Truck },
  { label: "Drivers", icon: Users },
  { label: "Shipments", icon: PackageCheck },
  { label: "Analytics", icon: BarChart3 },
] as const;

const kenyaLocationOptions = [
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

type DashboardLayoutProps = {
  mapSlot?: ReactNode;
  role: "ADMIN" | "DISPATCHER" | "DRIVER";
  viewMode: "modern" | "classic";
  onToggleViewMode: () => void;
  userName: string;
  tenantLabel: string;
  onLogout: () => void;
  overview: DashboardOverview;
  vehicles: VehicleRow[];
  drivers: DriverRow[];
  shipments: ShipmentRow[];
  onRefresh: () => Promise<void>;
  onCreateShipment: (origin: string, destination: string) => Promise<void>;
  onDispatchShipment: (shipmentId: string, driverId: string, vehicleId: string) => Promise<void>;
  onDriverAction: (shipmentId: string, action: "ACCEPT" | "DECLINE") => Promise<void>;
  onClaimShipment: (shipmentId: string) => Promise<void>;
  onUpdateMyLocation: () => Promise<void>;
  onCompleteShipment: (shipmentId: string) => Promise<void>;
  nearbyShipments: NearbyShipment[];
  commandCenter: CommandCenter | null;
};

export function DashboardLayout({
  mapSlot,
  role,
  viewMode,
  onToggleViewMode,
  userName,
  tenantLabel,
  onLogout,
  overview,
  vehicles,
  drivers,
  shipments,
  onRefresh,
  onCreateShipment,
  onDispatchShipment,
  onDriverAction,
  onClaimShipment,
  onUpdateMyLocation,
  onCompleteShipment,
  nearbyShipments,
  commandCenter,
}: DashboardLayoutProps) {
  const allowedSections: NavSection[] = useMemo(() => {
    if (role === "DRIVER") return ["Fleet", "Shipments"];
    if (role === "DISPATCHER") return ["Fleet", "Drivers", "Shipments"];
    return ["Fleet", "Drivers", "Shipments", "Analytics"];
  }, [role]);

  const [activeSection, setActiveSection] = useState<NavSection>("Fleet");
  const [origin, setOrigin] = useState("Nairobi CBD");
  const [destination, setDestination] = useState("Westlands");
  const [dispatchShipmentId, setDispatchShipmentId] = useState("");
  const [dispatchDriverId, setDispatchDriverId] = useState("");
  const [dispatchVehicleId, setDispatchVehicleId] = useState("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const stats: StatCard[] = [
    { label: "Active Deliveries", value: overview.activeDeliveries },
    { label: "Total Vehicles", value: overview.totalVehicles },
    { label: "Online Drivers", value: overview.onlineDrivers },
    { label: "Weekly Trips", value: overview.weeklyCompletedTrips },
  ];

  const sectionTitle = useMemo(() => {
    if (activeSection === "Fleet") return "Fleet Operations";
    if (activeSection === "Drivers") return "Driver Availability";
    if (activeSection === "Shipments") return "Shipment Control";
    return "Analytics Overview";
  }, [activeSection]);

  const weeklyCompletions = [
    { day: "Total Trips", completed: overview.totalTrips },
    { day: "Weekly", completed: overview.weeklyCompletedTrips },
    { day: "Active", completed: overview.activeDeliveries },
  ];

  const canDispatch = role === "ADMIN" || role === "DISPATCHER";
  const canCreate = role === "ADMIN" || role === "DISPATCHER";
  const pendingForDispatch = shipments.filter((s) => s.status === "PENDING" && !s.assignedDriverId);
  const dispatchableDrivers = drivers.filter((d) => d.availability !== "OFFLINE");
  const dispatchableVehicles = vehicles.filter((v) => v.status !== "MAINTENANCE");
  const shellClass =
    viewMode === "modern"
      ? "h-screen overflow-hidden bg-slate-950 text-slate-100 [font-family:Inter,sans-serif]"
      : "h-screen overflow-hidden bg-[#0b1320] text-slate-100 [font-family:Inter,sans-serif]";
  const panelClass =
    viewMode === "modern"
      ? "rounded-xl border border-slate-800 bg-slate-900"
      : "rounded-md border border-slate-700 bg-slate-900";

  return (
    <div className={shellClass}>
      <div className="grid h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-800 bg-slate-900/80 px-4 py-4">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-md bg-[#FF4F00] p-2 text-slate-950">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-400">MTS Logistics</p>
              <h1 className="text-lg font-semibold text-slate-100">Ops Dashboard</h1>
            </div>
          </div>

          <div className={`${panelClass} mb-4 p-3`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{tenantLabel}</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{userName}</p>
            <p className="text-xs text-[#FF4F00]">{role}</p>
          </div>

          <nav className="space-y-2">
            {navItems
              .filter((item) => allowedSections.includes(item.label))
              .map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setActiveSection(label as NavSection)}
                aria-pressed={activeSection === label}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeSection === label
                    ? "bg-[#FF4F00] text-slate-950"
                    : "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
              ))}
          </nav>

          <button
            onClick={() => void onRefresh()}
            className="mt-6 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-[#FF4F00] hover:text-[#FF4F00]"
          >
            Refresh Data
          </button>
          <button
            onClick={onToggleViewMode}
            className="mt-2 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-[#FF4F00] hover:text-[#FF4F00]"
          >
            Switch to {viewMode === "modern" ? "Classic" : "Modern"} View
          </button>
          <button
            onClick={onLogout}
            className="mt-2 w-full rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-[#FF4F00] hover:text-[#FF4F00]"
          >
            Logout
          </button>
        </aside>

        <main className="flex h-screen min-h-0 flex-col gap-3 overflow-hidden px-5 py-4">
          <header className={`${panelClass} px-4 py-3`}>
            <h2 className="text-sm uppercase tracking-wide text-slate-400">{activeSection}</h2>
            <p className="mt-1 text-xl font-semibold text-slate-100">{sectionTitle}</p>
          </header>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article
                key={stat.label}
                className={`${panelClass} p-4`}
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold text-[#FF4F00]">{stat.value}</p>
              </article>
            ))}
          </section>

          {activeSection === "Fleet" && (role === "ADMIN" || role === "DISPATCHER") && commandCenter && (
            <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              <article className={`${panelClass} p-4`}>
                <h3 className="mb-2 text-sm font-semibold">Central Command KPIs</h3>
                <p className="text-xs text-slate-400">Live operations snapshot</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p>In Transit: <span className="text-[#FF4F00]">{overview.inTransitOrders}</span></p>
                  <p>Picked Up: <span className="text-[#FF4F00]">{overview.pickedOrders}</span></p>
                  <p>Not Picked: <span className="text-[#FF4F00]">{overview.notPickedOrders}</span></p>
                  <p>Accepted: <span className="text-[#FF4F00]">{overview.acceptedOrders}</span></p>
                  <p>Declined: <span className="text-[#FF4F00]">{overview.declinedOrders}</span></p>
                  <p>Drivers Waiting: <span className="text-[#FF4F00]">{overview.driversWaiting}</span></p>
                  <p>Drivers In Transit: <span className="text-[#FF4F00]">{overview.driversInTransit}</span></p>
                </div>
              </article>
              <article className={`${panelClass} p-4`}>
                <h3 className="mb-2 text-sm font-semibold">Drivers On Trip</h3>
                <div className="max-h-[16vh] space-y-2 overflow-auto pr-1">
                  {commandCenter.activeTrips.slice(0, 8).map((trip) => (
                    <div key={trip.id} className="rounded border border-slate-800 bg-slate-950 p-2 text-xs">
                      <p className="font-semibold">{trip.origin}{" -> "}{trip.destination}</p>
                      <p className="text-slate-400">
                        {trip.assignedDriver?.name ?? "Unassigned"} | {trip.assignedVehicle?.plate ?? "No vehicle"}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
              <article className={`${panelClass} p-4`}>
                <h3 className="mb-2 text-sm font-semibold">Orders Awaiting Pickup</h3>
                <div className="max-h-[16vh] space-y-2 overflow-auto pr-1">
                  {commandCenter.pendingOrders.slice(0, 8).map((order) => (
                    <div key={order.id} className="rounded border border-slate-800 bg-slate-950 p-2 text-xs">
                      <p className="font-semibold">{order.origin}{" -> "}{order.destination}</p>
                      <p className="text-slate-400">Decision: {order.driverDecision}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )}

          {activeSection === "Fleet" && (
            <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[1.35fr_1fr]">
              <article className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <header className="mb-3 flex items-center gap-2 px-1 text-sm text-slate-300">
                  <MapPinned className="h-4 w-4 text-[#FF4F00]" />
                  <span>Nairobi Live Vehicle Map (Command View)</span>
                </header>
                <div className="h-[30vh] overflow-hidden rounded-lg border border-slate-800 bg-slate-950 xl:h-[36vh]">
                  {mapSlot ?? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Mount your Leaflet map here (orange markers for active vehicles).
                    </div>
                  )}
                </div>
              </article>
              <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <h3 className="text-sm font-semibold text-slate-100">Fleet Units</h3>
                <div className="mt-3 max-h-[30vh] space-y-2 overflow-auto pr-1 xl:max-h-[36vh]">
                  {vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                      <p className="text-sm font-semibold text-slate-100">{vehicle.plate}</p>
                      <p className="text-xs text-slate-400">{vehicle.model}</p>
                      <p className="mt-1 text-xs text-[#FF4F00]">
                        {vehicle.status}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )}

          {activeSection === "Drivers" && (
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-100">Driver Roster</h3>
              <div className="max-h-[52vh] space-y-2 overflow-auto pr-1">
                {drivers.map((driver) => (
                  <div key={driver.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-sm font-semibold text-slate-100">{driver.name}</p>
                    <p className="text-xs text-slate-400">{driver.phone}</p>
                    <p className="mt-1 text-xs text-[#FF4F00]">{driver.availability}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeSection === "Shipments" && (
            <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[1.1fr_1fr]">
              <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-100">Active Shipment Queue</h3>
              <div className="max-h-[44vh] space-y-2 overflow-auto pr-1">
                {shipments.map((shipment) => (
                  <div key={shipment.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <p className="text-sm font-semibold text-slate-100">{shipment.origin} → {shipment.destination}</p>
                    <p className="text-xs text-slate-400">
                      Status: {shipment.status} | Decision: {shipment.driverDecision ?? "N/A"}
                    </p>
                    {shipment.declineReason && (
                      <p className="mt-1 text-xs text-red-400">Decline note: {shipment.declineReason}</p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      {role === "DRIVER" && shipment.driverDecision === "PENDING" && (
                        <>
                          <button
                            onClick={() => void onDriverAction(shipment.id, "ACCEPT")}
                            className="rounded bg-[#FF4F00] px-2 py-1 text-xs font-semibold text-slate-950"
                          >
                            Accept Order
                          </button>
                          <button
                            onClick={() => void onDriverAction(shipment.id, "DECLINE")}
                            className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200"
                          >
                            Decline Order
                          </button>
                        </>
                      )}
                      {(role !== "DRIVER" || shipment.driverDecision === "ACCEPTED") &&
                        (shipment.status === "IN_TRANSIT" || shipment.status === "PICKED_UP") && (
                          <button
                            onClick={() => void onCompleteShipment(shipment.id)}
                            className="rounded bg-emerald-500 px-2 py-1 text-xs font-semibold text-slate-950"
                          >
                            Mark Completed
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
              </article>

              <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                {canCreate && (
                  <div className={`${panelClass} mb-4 bg-slate-950 p-3`}>
                    <h4 className="text-sm font-semibold text-slate-100">Create New Order</h4>
                    <select
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                    >
                      {kenyaLocationOptions.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                    >
                      {kenyaLocationOptions.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => void onCreateShipment(origin, destination)}
                      className="mt-2 w-full rounded bg-[#FF4F00] px-2 py-1 text-sm font-semibold text-slate-950"
                    >
                      Create Order
                    </button>
                  </div>
                )}

                {canDispatch && (
                  <div className={`${panelClass} bg-slate-950 p-3`}>
                    <h4 className="text-sm font-semibold text-slate-100">Dispatch Center</h4>
                    <select
                      value={dispatchShipmentId}
                      onChange={(e) => setDispatchShipmentId(e.target.value)}
                      className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                    >
                      <option value="">Select Pending Order</option>
                      {pendingForDispatch.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.origin} → {item.destination}
                        </option>
                      ))}
                    </select>
                    <select
                      value={dispatchDriverId}
                      onChange={(e) => setDispatchDriverId(e.target.value)}
                      className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                    >
                      <option value="">Select Driver</option>
                      {dispatchableDrivers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.availability})
                        </option>
                      ))}
                    </select>
                    <select
                      value={dispatchVehicleId}
                      onChange={(e) => setDispatchVehicleId(e.target.value)}
                      className="mt-2 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
                    >
                      <option value="">Select Vehicle</option>
                      {dispatchableVehicles.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.plate} ({item.status})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={async () => {
                        if (!dispatchShipmentId || !dispatchDriverId || !dispatchVehicleId) {
                          setActionMessage("Select order, driver, and vehicle.");
                          return;
                        }
                        await onDispatchShipment(dispatchShipmentId, dispatchDriverId, dispatchVehicleId);
                        setActionMessage("Order dispatched. Waiting for driver decision.");
                      }}
                      className="mt-2 w-full rounded bg-[#FF4F00] px-2 py-1 text-sm font-semibold text-slate-950"
                    >
                      Dispatch Order
                    </button>
                    {actionMessage && <p className="mt-2 text-xs text-slate-400">{actionMessage}</p>}
                  </div>
                )}
              </article>
            </section>
          )}

          {activeSection === "Shipments" && role === "DRIVER" && (
            <section className={`${panelClass} p-4`}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Nearby Available Orders</h3>
                  <p className="text-xs text-slate-400">Sorted by your geolocation to minimize fuel use.</p>
                </div>
                <button
                  onClick={() => void onUpdateMyLocation()}
                  className="rounded bg-[#FF4F00] px-3 py-1 text-xs font-semibold text-slate-950"
                >
                  Use My Location
                </button>
              </div>
              <div className="max-h-[42vh] space-y-2 overflow-auto pr-1">
                {nearbyShipments.map((item) => (
                  <div key={item.id} className="rounded border border-slate-800 bg-slate-950 p-3">
                    <p className="text-sm font-semibold">{item.origin}{" -> "}{item.destination}</p>
                    <p className="text-xs text-slate-400">Distance: {item.distanceKm} km</p>
                    <button
                      onClick={() => void onClaimShipment(item.id)}
                      className="mt-2 rounded bg-[#FF4F00] px-2 py-1 text-xs font-semibold text-slate-950"
                    >
                      Pick This Order
                    </button>
                  </div>
                ))}
                {nearbyShipments.length === 0 && (
                  <p className="text-sm text-slate-400">No nearby unassigned orders right now.</p>
                )}
              </div>
            </section>
          )}

          {activeSection === "Analytics" && (
            <section className={`${panelClass} p-4`}>
              <h3 className="mb-3 text-sm font-semibold text-slate-100">Weekly Delivery Throughput</h3>
              <div className="h-[34vh] rounded-lg border border-slate-800 bg-slate-950 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyCompletions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="day" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #334155",
                        color: "#f8fafc",
                      }}
                    />
                    <Bar dataKey="completed" fill="#FF4F00" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
