type Overview = {
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
  _count: {
    users: number;
    vehicles: number;
    drivers: number;
    shipments: number;
  };
};

type SuperAdminDashboardProps = {
  overview: Overview;
  tenants: TenantRow[];
  userEmail: string;
  viewMode: "modern" | "classic";
  onToggleViewMode: () => void;
  onRefresh: () => Promise<void>;
  onLogout: () => void;
};

export function SuperAdminDashboard({
  overview,
  tenants,
  userEmail,
  viewMode,
  onToggleViewMode,
  onRefresh,
  onLogout,
}: SuperAdminDashboardProps) {
  const shellClass =
    viewMode === "modern"
      ? "min-h-screen bg-slate-950 px-6 py-6 text-slate-100 [font-family:Inter,sans-serif]"
      : "min-h-screen bg-[#0b1320] px-6 py-6 text-slate-100 [font-family:Inter,sans-serif]";
  return (
    <div className={shellClass}>
      <header className="mb-5 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Platform Control</p>
          <h1 className="text-xl font-semibold">Super Admin Dashboard</h1>
          <p className="text-xs text-slate-500">{userEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void onRefresh()}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-[#FF4F00] hover:text-[#FF4F00]"
          >
            Refresh
          </button>
          <button
            onClick={onToggleViewMode}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-[#FF4F00] hover:text-[#FF4F00]"
          >
            {viewMode === "modern" ? "Classic" : "Modern"}
          </button>
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-[#FF4F00] hover:text-[#FF4F00]"
          >
            Logout
          </button>
        </div>
      </header>

      <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tenants" value={String(overview.tenantCount)} />
        <StatCard label="Users" value={String(overview.userCount)} />
        <StatCard label="Vehicles" value={String(overview.vehicleCount)} />
        <StatCard label="Shipments" value={String(overview.shipmentCount)} />
        <StatCard label="Active Deliveries" value={String(overview.activeDeliveries)} />
        <StatCard label="Delivered Today" value={String(overview.deliveredToday)} />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-100">Tenant Accounts</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
              <tr>
                <th className="px-2 py-2">Tenant</th>
                <th className="px-2 py-2">Domain</th>
                <th className="px-2 py-2">Plan</th>
                <th className="px-2 py-2">Users</th>
                <th className="px-2 py-2">Fleet</th>
                <th className="px-2 py-2">Shipments</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-t border-slate-800">
                  <td className="px-2 py-2">{tenant.name}</td>
                  <td className="px-2 py-2 text-slate-400">{tenant.domain}</td>
                  <td className="px-2 py-2 text-[#FF4F00]">{tenant.planType}</td>
                  <td className="px-2 py-2">{tenant._count.users}</td>
                  <td className="px-2 py-2">{tenant._count.vehicles}</td>
                  <td className="px-2 py-2">{tenant._count.shipments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#FF4F00]">{value}</p>
    </article>
  );
}
