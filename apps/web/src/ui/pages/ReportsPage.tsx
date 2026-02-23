import { useCallback, useEffect, useState } from "react";
import { type AdminStatistics, getAdminStatistics } from "../api/client";
import { useAuth } from "../auth/AuthContext";

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

      {/* Users */}
      <SectionTitle>Users</SectionTitle>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Total" value={stats.users.total} />
        <StatCard label="Active" value={stats.users.active} color="#166534" />
        <StatCard label="Blocked" value={stats.users.blocked} color="#b91c1c" />
        <StatCard label="Job Seekers" value={stats.users.job_seekers} />
        <StatCard label="Employers" value={stats.users.employers} />
        <StatCard label="Admins" value={stats.users.admins} />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        <StatCard label="New Today" value={stats.users.new_today} color="#2563eb" />
        <StatCard label="New This Week" value={stats.users.new_this_week} color="#2563eb" />
        <StatCard label="New This Month" value={stats.users.new_this_month} color="#2563eb" />
      </div>

      {/* Jobs */}
      <SectionTitle>Jobs</SectionTitle>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Total" value={stats.jobs.total} />
        <StatCard label="Active" value={stats.jobs.active} color="#166534" />
        <StatCard label="Closed" value={stats.jobs.closed} />
        <StatCard label="Draft" value={stats.jobs.draft} color="#92400e" />
        <StatCard label="Featured" value={stats.jobs.featured} color="#7c3aed" />
        <StatCard label="Flagged" value={stats.jobs.flagged} color="#b91c1c" />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
        <StatCard label="New Today" value={stats.jobs.new_today} color="#2563eb" />
        <StatCard label="New This Week" value={stats.jobs.new_this_week} color="#2563eb" />
        <StatCard label="Total Views" value={stats.jobs.total_views} />
        <StatCard label="Total Applications" value={stats.jobs.total_applications} />
      </div>

      {/* Applications */}
      <SectionTitle>Applications</SectionTitle>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <StatCard label="Total" value={stats.applications.total} />
        <StatCard label="Pending" value={stats.applications.pending} color="#92400e" />
        <StatCard label="Reviewed" value={stats.applications.reviewed} color="#2563eb" />
        <StatCard label="Accepted" value={stats.applications.accepted} color="#166534" />
        <StatCard label="Rejected" value={stats.applications.rejected} color="#b91c1c" />
        <StatCard label="Withdrawn" value={stats.applications.withdrawn} />
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
