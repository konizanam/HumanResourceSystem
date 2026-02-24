import { useCallback, useEffect, useState } from "react";
import { type AuditLog, listAuditLogs } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

export function AuditPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canViewAudit = hasPermission("VIEW_AUDIT_LOGS");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = useCallback(async (page = 1) => {
    if (!accessToken) return;
    try {
      setLoading(true); setError(null);
      const data = await listAuditLogs(accessToken, {
        page,
        limit: pagination.limit,
        action: actionFilter || undefined,
        target_type: targetFilter || undefined,
      });
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (e) { setError((e as any)?.message ?? "Failed to load audit logs"); }
    finally { setLoading(false); }
  }, [accessToken, pagination.limit, actionFilter, targetFilter]);

  useEffect(() => { load(1); }, [load]);

  function goToPage(page: number) { if (page >= 1 && page <= pagination.pages) load(page); }

  if (loading && logs.length === 0) {
    return (<div className="page"><div className="companiesHeader"><h1 className="pageTitle">Audit Logs</h1></div><p className="pageText">Loading…</p></div>);
  }

  if (!canViewAudit) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Audit Logs</h1></div>
        <div className="errorBox">You do not have permission to view audit logs.</div>
      </div>
    );
  }

  const filteredLogs = logs.filter((log) => {
    const at = log.created_at ? new Date(log.created_at).getTime() : 0;
    if (fromDate) {
      const from = new Date(`${fromDate}T00:00:00`).getTime();
      if (at < from) return false;
    }
    if (toDate) {
      const to = new Date(`${toDate}T23:59:59`).getTime();
      if (at > to) return false;
    }
    return true;
  });

  return (
    <div className="page">
      <div className="companiesHeader"><h1 className="pageTitle">Audit Logs</h1></div>

      {error && <div className="errorBox">{error}</div>}

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ minWidth: 180 }}>
          <label className="fieldLabel">From Date</label>
          <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div style={{ minWidth: 180 }}>
          <label className="fieldLabel">To Date</label>
          <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div style={{ minWidth: 160 }}>
          <label className="fieldLabel">Action</label>
          <input className="input" placeholder="Filter by action…" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} />
        </div>
        <div style={{ minWidth: 160 }}>
          <label className="fieldLabel">Target Type</label>
          <select className="input" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)}>
            <option value="">All</option>
            <option value="user">User</option>
            <option value="job">Job</option>
            <option value="application">Application</option>
            <option value="company">Company</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="tableWrap" role="region" aria-label="Audit logs table">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Date</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target Type</th>
              <th>Target ID</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr><td colSpan={6}><div className="emptyState">No audit logs found.</div></td></tr>
            ) : filteredLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
                <td>{log.admin_name ?? log.admin_email ?? log.admin_id ?? "—"}</td>
                <td><span className="chipBadge">{log.action}</span></td>
                <td>{log.target_type ?? "—"}</td>
                <td style={{ fontSize: "0.85em", fontFamily: "monospace" }}>{log.target_id ? log.target_id.substring(0, 8) + "…" : "—"}</td>
                <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {log.details ? JSON.stringify(log.details).substring(0, 100) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
          <button className="btn btnGhost btnSm" type="button" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1 || loading}>← Previous</button>
          <span className="readLabel">Page {pagination.page} of {pagination.pages} ({pagination.total} logs)</span>
          <button className="btn btnGhost btnSm" type="button" onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.pages || loading}>Next →</button>
        </div>
      )}
    </div>
  );
}
