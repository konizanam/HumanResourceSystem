import { useCallback, useEffect, useState } from "react";
import { type AdminStatistics, getAdminStatistics } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="dropPanel" style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "14px 16px" }}>
      <div style={{ fontSize: "1.6rem", fontWeight: 700, color: color ?? "inherit" }}>{value}</div>
      <div className="readLabel">{label}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 style={{ margin: "24px 0 12px 0", fontSize: "1.1rem", fontWeight: 600 }}>{children}</h2>;
}

export function ReportsPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canViewReports = hasPermission("VIEW_AUDIT_LOGS");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStatistics | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true); setError(null);
      const data = await getAdminStatistics(accessToken);
      setStats(data);
    } catch (e) { setError((e as any)?.message ?? "Failed to load statistics"); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (<div className="page"><div className="companiesHeader"><h1 className="pageTitle">Reports &amp; Statistics</h1></div><p className="pageText">Loading…</p></div>);
  }

  if (!canViewReports) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Reports &amp; Statistics</h1></div>
        <div className="errorBox">You do not have permission to view reports.</div>
      </div>
    );
  }

  if (error) {
    return (<div className="page"><div className="companiesHeader"><h1 className="pageTitle">Reports &amp; Statistics</h1></div><div className="errorBox">{error}</div></div>);
  }

  if (!stats) return null;

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Reports &amp; Statistics</h1>
        <button type="button" className="btn btnGhost btnSm stepperSaveBtn" onClick={load}>Refresh</button>
      </div>

      <SectionTitle>Summary</SectionTitle>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Total Users" value={stats.users.total} />
        <StatCard label="Total Jobs" value={stats.jobs.total} />
        <StatCard label="Total Applications" value={stats.applications.total} />
        <StatCard label="Active Companies" value={stats.users.employers} color="#166534" />
      </div>

      <SectionTitle>Applications by Status</SectionTitle>
      <div className="tableWrap">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Status</th>
              <th className="thRight">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Pending</td><td className="tdRight">{stats.applications.pending}</td></tr>
            <tr><td>Reviewed</td><td className="tdRight">{stats.applications.reviewed}</td></tr>
            <tr><td>Accepted</td><td className="tdRight">{stats.applications.accepted}</td></tr>
            <tr><td>Rejected</td><td className="tdRight">{stats.applications.rejected}</td></tr>
            <tr><td>Withdrawn</td><td className="tdRight">{stats.applications.withdrawn}</td></tr>
          </tbody>
        </table>
      </div>

      <SectionTitle>Recent Activity</SectionTitle>
      <div className="tableWrap">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Metric</th>
              <th className="thRight">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>New users today</td><td className="tdRight">{stats.users.new_today}</td></tr>
            <tr><td>New users this week</td><td className="tdRight">{stats.users.new_this_week}</td></tr>
            <tr><td>New users this month</td><td className="tdRight">{stats.users.new_this_month}</td></tr>
            <tr><td>New jobs today</td><td className="tdRight">{stats.jobs.new_today}</td></tr>
            <tr><td>New jobs this week</td><td className="tdRight">{stats.jobs.new_this_week}</td></tr>
            <tr><td>New applications today</td><td className="tdRight">{stats.applications.new_today}</td></tr>
          </tbody>
        </table>
      </div>

      {/* System */}
      <SectionTitle>System</SectionTitle>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="API Requests Today" value={stats.system.api_requests_today} />
        <StatCard label="Active Sessions" value={stats.system.active_sessions} />
        <StatCard label="Storage Used" value={stats.system.storage_used ?? "—"} />
        <StatCard label="Last Backup" value={stats.system.last_backup ? new Date(stats.system.last_backup).toLocaleString() : "Never"} />
        <StatCard label="Version" value={stats.system.version} />
      </div>
    </div>
  );
}
