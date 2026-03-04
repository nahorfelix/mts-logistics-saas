import React from "react";
import ReactDOM from "react-dom/client";
import { DashboardLayout } from "./components/dashboard-layout";
import { LiveMap, MapVehicle } from "./components/live-map";
import { SuperAdminDashboard } from "./components/super-admin-dashboard";
import "./styles.css";

type Role = "ADMIN" | "DISPATCHER" | "DRIVER" | "SUPER_ADMIN";
type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  tenantId: string | null;
  tenant: { name: string; domain: string } | null;
};

type TenantOverview = {
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

type SuperOverview = {
  tenantCount: number;
  userCount: number;
  vehicleCount: number;
  shipmentCount: number;
  activeDeliveries: number;
  deliveredToday: number;
};

type TenantRow = {
  id: string;
  name: string;
  domain: string;
  planType: string;
  createdAt: string;
  _count: { users: number; vehicles: number; drivers: number; shipments: number };
};

type VehicleRow = {
  id: string;
  model: string;
  plate: string;
  status: string;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
};

type DriverRow = {
  id: string;
  userId?: string | null;
  name: string;
  phone: string;
  availability: string;
  license: string;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
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

const API_BASE = "http://localhost:3000";

function App() {
  const [email, setEmail] = React.useState("admin@acme.com");
  const [password, setPassword] = React.useState("StrongPass123");
  const [domain, setDomain] = React.useState("acme.mts.local");
  const [isSuperAdminLogin, setIsSuperAdminLogin] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tenantError, setTenantError] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"modern" | "classic">(
    (localStorage.getItem("mts_view_mode") as "modern" | "classic" | null) ?? "modern",
  );
  const [token, setToken] = React.useState<string | null>(localStorage.getItem("mts_token"));
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [tenantOverview, setTenantOverview] = React.useState<TenantOverview | null>(null);
  const [superOverview, setSuperOverview] = React.useState<SuperOverview | null>(null);
  const [vehicles, setVehicles] = React.useState<VehicleRow[]>([]);
  const [drivers, setDrivers] = React.useState<DriverRow[]>([]);
  const [shipments, setShipments] = React.useState<ShipmentRow[]>([]);
  const [nearbyShipments, setNearbyShipments] = React.useState<NearbyShipment[]>([]);
  const [commandCenter, setCommandCenter] = React.useState<CommandCenter | null>(null);
  const [tenants, setTenants] = React.useState<TenantRow[]>([]);

  const authHeaders = React.useCallback(
    () =>
      ({
        Authorization: `Bearer ${token}`,
      }) as HeadersInit,
    [token],
  );

  const loadTenantData = React.useCallback(async (role?: Role) => {
    if (!token) return;
    const [overviewRes, vehiclesRes, driversRes, shipmentsRes] = await Promise.all([
      fetch(`${API_BASE}/tenant/overview`, { headers: authHeaders() }),
      fetch(`${API_BASE}/tenant/vehicles`, { headers: authHeaders() }),
      fetch(`${API_BASE}/tenant/drivers`, { headers: authHeaders() }),
      fetch(`${API_BASE}/tenant/shipments`, { headers: authHeaders() }),
    ]);

    if (!overviewRes.ok || !vehiclesRes.ok || !driversRes.ok || !shipmentsRes.ok) {
      throw new Error("Unable to load tenant dashboard data.");
    }

    setTenantOverview((await overviewRes.json()) as TenantOverview);
    setVehicles((await vehiclesRes.json()) as VehicleRow[]);
    setDrivers((await driversRes.json()) as DriverRow[]);
    setShipments((await shipmentsRes.json()) as ShipmentRow[]);

    if (role === "ADMIN" || role === "DISPATCHER") {
      const commandRes = await fetch(`${API_BASE}/tenant/command-center`, { headers: authHeaders() });
      if (commandRes.ok) {
        setCommandCenter((await commandRes.json()) as CommandCenter);
      }
    } else {
      setCommandCenter(null);
    }

    if (role === "DRIVER") {
      const nearbyRes = await fetch(`${API_BASE}/tenant/shipments/available-for-driver`, {
        headers: authHeaders(),
      });
      if (nearbyRes.ok) {
        setNearbyShipments((await nearbyRes.json()) as NearbyShipment[]);
      }
    } else {
      setNearbyShipments([]);
    }
  }, [authHeaders, token]);

  const loadSuperAdminData = React.useCallback(async () => {
    if (!token) return;
    const [overviewRes, tenantsRes] = await Promise.all([
      fetch(`${API_BASE}/super-admin/overview`, { headers: authHeaders() }),
      fetch(`${API_BASE}/super-admin/tenants`, { headers: authHeaders() }),
    ]);
    if (!overviewRes.ok || !tenantsRes.ok) {
      throw new Error("Unable to load super admin data.");
    }
    setSuperOverview((await overviewRes.json()) as SuperOverview);
    setTenants((await tenantsRes.json()) as TenantRow[]);
  }, [authHeaders, token]);

  const loadMe = React.useCallback(async () => {
    if (!token) return;
    const meRes = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
    if (!meRes.ok) {
      throw new Error("Unable to fetch profile.");
    }
    const me = (await meRes.json()) as AuthUser;
    setUser(me);

    if (me.role === "SUPER_ADMIN") {
      await loadSuperAdminData();
      return;
    }
    await loadTenantData(me.role);
  }, [authHeaders, loadSuperAdminData, loadTenantData, token]);

  React.useEffect(() => {
    if (!token) return;
    loadMe().catch(() => {
      localStorage.removeItem("mts_token");
      setToken(null);
      setUser(null);
      setTenantOverview(null);
      setSuperOverview(null);
      setVehicles([]);
      setDrivers([]);
      setShipments([]);
      setNearbyShipments([]);
      setCommandCenter(null);
      setTenants([]);
    });
  }, [loadMe, token]);

  React.useEffect(() => {
    localStorage.setItem("mts_view_mode", viewMode);
  }, [viewMode]);

  const tenantMutation = React.useCallback(
    async (path: string, body: Record<string, unknown>) => {
      if (!token) return;
      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const result = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(result.message ?? "Action failed.");
      }
      await loadTenantData(user?.role);
    },
    [authHeaders, loadTenantData, token, user?.role],
  );

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        email,
        password,
        ...(isSuperAdminLogin ? {} : { domain }),
      };
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(result.message ?? "Invalid credentials.");
      }

      const data = (await response.json()) as { accessToken: string };
      localStorage.setItem("mts_token", data.accessToken);
      setToken(data.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("mts_token");
    setToken(null);
    setUser(null);
    setTenantOverview(null);
    setSuperOverview(null);
    setVehicles([]);
    setDrivers([]);
    setShipments([]);
    setNearbyShipments([]);
    setCommandCenter(null);
    setTenants([]);
    setTenantError(null);
  };

  if (!token || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100 [font-family:Inter,sans-serif]">
        <form onSubmit={handleLogin} className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-xl font-semibold">MTS Logistics Login</h1>
          <p className="mt-1 text-sm text-slate-400">Multi-tenant SaaS access portal</p>
          <div className="mt-4 flex gap-2 rounded-lg bg-slate-950 p-1 text-sm">
            <button
              type="button"
              onClick={() => setIsSuperAdminLogin(false)}
              className={`w-1/2 rounded-md py-2 ${!isSuperAdminLogin ? "bg-[#FF4F00] text-slate-950" : "text-slate-300"}`}
            >
              Tenant User
            </button>
            <button
              type="button"
              onClick={() => setIsSuperAdminLogin(true)}
              className={`w-1/2 rounded-md py-2 ${isSuperAdminLogin ? "bg-[#FF4F00] text-slate-950" : "text-slate-300"}`}
            >
              Super Admin
            </button>
          </div>

          {!isSuperAdminLogin && (
            <label className="mt-4 block text-sm">
              <span className="text-slate-300">Tenant Domain</span>
              <input value={domain} onChange={(e) => setDomain(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
            </label>
          )}

          <label className="mt-3 block text-sm">
            <span className="text-slate-300">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
          </label>
          <label className="mt-3 block text-sm">
            <span className="text-slate-300">Password</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100" />
          </label>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="mt-5 w-full rounded-lg bg-[#FF4F00] px-3 py-2 font-semibold text-slate-950 disabled:opacity-60">
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    );
  }

  if (user.role === "SUPER_ADMIN") {
    return (
      <SuperAdminDashboard
        overview={
          superOverview ?? {
            tenantCount: 0,
            userCount: 0,
            vehicleCount: 0,
            shipmentCount: 0,
            activeDeliveries: 0,
            deliveredToday: 0,
          }
        }
        tenants={tenants}
        userEmail={user.email}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((prev) => (prev === "modern" ? "classic" : "modern"))}
        onRefresh={loadSuperAdminData}
        onLogout={logout}
      />
    );
  }

  return (
    <div>
      {tenantError && (
        <div className="bg-red-900 px-4 py-2 text-sm text-red-100">{tenantError}</div>
      )}
      <DashboardLayout
        role={user.role as "ADMIN" | "DISPATCHER" | "DRIVER"}
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((prev) => (prev === "modern" ? "classic" : "modern"))}
        userName={user.fullName}
        tenantLabel={user.tenant?.name ?? user.tenant?.domain ?? domain}
        onLogout={logout}
        overview={
          tenantOverview ?? {
            activeDeliveries: 0,
            totalVehicles: 0,
            onlineDrivers: 0,
            weeklyCompletedTrips: 0,
            totalTrips: 0,
            inTransitOrders: 0,
            pickedOrders: 0,
            notPickedOrders: 0,
            acceptedOrders: 0,
            declinedOrders: 0,
            driversWaiting: 0,
            driversInTransit: 0,
          }
        }
        vehicles={vehicles}
        drivers={drivers}
        shipments={shipments}
        onRefresh={async () => {
          await loadTenantData(user.role);
        }}
        onCreateShipment={async (originValue, destinationValue) => {
          try {
            await tenantMutation("/tenant/shipments", {
              origin: originValue,
              destination: destinationValue,
            });
          } catch (err) {
            setTenantError(err instanceof Error ? err.message : "Could not create order.");
          }
        }}
        onDispatchShipment={async (shipmentId, driverId, vehicleId) => {
          try {
            await tenantMutation(`/tenant/shipments/${shipmentId}/dispatch`, {
              driverId,
              vehicleId,
            });
          } catch (err) {
            setTenantError(err instanceof Error ? err.message : "Dispatch failed.");
          }
        }}
        onDriverAction={async (shipmentId, action) => {
          try {
            await tenantMutation(`/tenant/shipments/${shipmentId}/driver-action`, { action });
          } catch (err) {
            setTenantError(err instanceof Error ? err.message : "Driver action failed.");
          }
        }}
        onCompleteShipment={async (shipmentId) => {
          try {
            await tenantMutation(`/tenant/shipments/${shipmentId}/complete`, {});
          } catch (err) {
            setTenantError(err instanceof Error ? err.message : "Unable to complete shipment.");
          }
        }}
        onClaimShipment={async (shipmentId) => {
          try {
            await tenantMutation(`/tenant/shipments/${shipmentId}/claim`, {});
            await loadTenantData(user.role);
          } catch (err) {
            setTenantError(err instanceof Error ? err.message : "Unable to claim shipment.");
          }
        }}
        onUpdateMyLocation={async () => {
          if (!navigator.geolocation) {
            setTenantError("Geolocation is not supported by this browser.");
            return;
          }
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                try {
                  await tenantMutation("/tenant/drivers/me/location", {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  });
                  const nearbyRes = await fetch(
                    `${API_BASE}/tenant/shipments/available-for-driver?lat=${position.coords.latitude}&lng=${position.coords.longitude}`,
                    { headers: authHeaders() },
                  );
                  if (nearbyRes.ok) {
                    setNearbyShipments((await nearbyRes.json()) as NearbyShipment[]);
                  }
                } catch (err) {
                  setTenantError(err instanceof Error ? err.message : "Unable to update location.");
                }
                resolve();
              },
              () => {
                setTenantError("Location access denied.");
                resolve();
              },
            );
          });
        }}
        nearbyShipments={nearbyShipments}
        commandCenter={commandCenter}
        mapSlot={
          <LiveMap
            vehicles={vehicles.map(
              (vehicle): MapVehicle => ({
                id: vehicle.id,
                label: vehicle.plate,
                status: vehicle.status,
                lat: vehicle.lastLatitude,
                lng: vehicle.lastLongitude,
              }),
            )}
          />
        }
      />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
