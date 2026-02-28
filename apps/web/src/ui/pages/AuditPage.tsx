import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { type AuditLog, listAuditLogs } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

export function AuditPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canViewAudit = hasPermission("VIEW_AUDIT_LOGS", "MANAGE_USERS");
  const isSpecificAuditView = Boolean(searchParams.get("target_type") && searchParams.get("target_id"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState(searchParams.get("target_type") ?? "");
  const [targetIdFilter, setTargetIdFilter] = useState(searchParams.get("target_id") ?? "");
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
        target_id: targetIdFilter || undefined,
      });
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (e) { setError((e as any)?.message ?? "Failed to load audit logs"); }
    finally { setLoading(false); }
  }, [accessToken, pagination.limit, actionFilter, targetFilter, targetIdFilter]);

  useEffect(() => { load(1); }, [load]);

  function goToPage(page: number) { if (page >= 1 && page <= pagination.pages) load(page); }

  if (loading && logs.length === 0) {
    return (<div className="page"><div className="companiesHeader"><h1 className="pageTitle">Audit Logs</h1></div><p className="pageText">Loading…</p></div>);
  }

  if (!canViewAudit) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Audit Logs</h1></div>
        <div className="errorBox">Insufficient permissions. Required permission: VIEW_AUDIT_LOGS or MANAGE_USERS.</div>
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
      <div className="companiesHeader" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 className="pageTitle">Audit Logs</h1>
        {isSpecificAuditView ? (
          <button
            type="button"
            className="btn btnPrimary btnSm stepperSaveBtn"
            onClick={() => navigate(-1)}
            aria-label="Go back to previous page"
          >
            ← Back to Previous Page
          </button>
        ) : null}
      </div>

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
        {!isSpecificAuditView ? (
          <div style={{ minWidth: 160 }}>
            <label className="fieldLabel">Target Type</label>
            <select className="input" value={targetFilter} onChange={(e) => setTargetFilter(e.target.value)}>
              <option value="">All</option>
              <option value="auth">Auth</option>
              <option value="user">User</option>
              <option value="applicant">Applicant</option>
              <option value="job">Job</option>
              <option value="application">Application</option>
              <option value="company">Company</option>
              <option value="role">Role</option>
              <option value="permission">Permission</option>
            </select>
          </div>
        ) : null}
        {!isSpecificAuditView ? (
          <div style={{ minWidth: 260 }}>
            <label className="fieldLabel">Target ID</label>
            <input className="input" placeholder="Filter by target id…" value={targetIdFilter} onChange={(e) => setTargetIdFilter(e.target.value)} />
          </div>
        ) : null}
      </div>

      {/* Table */}
      <div className="tableWrap" role="region" aria-label="Audit logs table">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Date</th>
              <th>Admin</th>
              <th>Action</th>
              {!isSpecificAuditView ? <th>Target Type</th> : null}
              {!isSpecificAuditView ? <th>Target ID</th> : null}
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr><td colSpan={isSpecificAuditView ? 4 : 6}><div className="emptyState">No audit logs found.</div></td></tr>
            ) : filteredLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.created_at ? new Date(log.created_at).toLocaleString("en-GB") : "—"}</td>
                <td>{`${log.first_name ?? ""} ${log.last_name ?? ""}`.trim() || log.user_email || (log.admin_name ?? log.admin_email ?? log.user_id ?? log.admin_id ?? "—")}</td>
                <td><span className="chipBadge">{log.action}</span></td>
                {!isSpecificAuditView ? <td>{log.target_type ?? "—"}</td> : null}
                {!isSpecificAuditView ? <td style={{ fontSize: "0.85em", fontFamily: "monospace" }}>{log.target_id ? log.target_id.substring(0, 8) + "…" : "—"}</td> : null}
                <td style={{ maxWidth: 360, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "0.8rem" }}>
                  {log.details ? JSON.stringify(log.details, null, 2) : "—"}
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