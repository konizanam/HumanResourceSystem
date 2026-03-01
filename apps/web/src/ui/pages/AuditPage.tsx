import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  type AuditLog,
  listAdminUsers,
  listAuditLogs,
  listCompanies,
  listJobCategories,
  listPermissions,
  listRoles,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

type JsonLine = {
  text: string;
  path: string;
};

type BeforeAfter = {
  before: unknown;
  after: unknown;
};

export function AuditPage() {
  const DETAILS_PREVIEW_LINES = 3;
  const DETAILS_PREVIEW_CHARS = 360;
  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canViewAudit = hasPermission("VIEW_AUDIT_LOGS", "MANAGE_USERS");
  const isSpecificAuditView = Boolean(searchParams.get("target_type") && searchParams.get("target_id"));

  const [idMaps, setIdMaps] = useState<{
    companies: Record<string, string>;
    categories: Record<string, string>;
    subcategories: Record<string, string>;
    roles: Record<string, string>;
    permissions: Record<string, string>;
    users: Record<string, string>;
  }>({
    companies: {},
    categories: {},
    subcategories: {},
    roles: {},
    permissions: {},
    users: {},
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, pages: 0 });
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState(searchParams.get("target_type") ?? "");
  const [targetIdFilter, setTargetIdFilter] = useState(searchParams.get("target_id") ?? "");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      const [companiesRes, categoriesRes, rolesRes, permissionsRes, usersRes] = await Promise.allSettled([
        listCompanies(accessToken),
        listJobCategories(accessToken),
        listRoles(accessToken, { page: 1, limit: 500 }),
        listPermissions(accessToken),
        listAdminUsers(accessToken, { page: 1, limit: 500 }),
      ]);

      const companies: Record<string, string> = {};
      if (companiesRes.status === "fulfilled") {
        for (const c of companiesRes.value) {
          if (c?.id && c?.name) companies[c.id] = c.name;
        }
      }

      const categories: Record<string, string> = {};
      const subcategories: Record<string, string> = {};
      if (categoriesRes.status === "fulfilled") {
        for (const cat of categoriesRes.value.categories ?? []) {
          if (cat?.id && cat?.name) categories[cat.id] = cat.name;
          for (const sub of cat?.subcategories ?? []) {
            if (sub?.id && sub?.name) subcategories[sub.id] = sub.name;
          }
        }
      }

      const roles: Record<string, string> = {};
      if (rolesRes.status === "fulfilled") {
        for (const r of rolesRes.value.roles ?? []) {
          if (r?.id && r?.name) roles[r.id] = r.name;
        }
      }

      const permissions: Record<string, string> = {};
      if (permissionsRes.status === "fulfilled") {
        for (const p of permissionsRes.value.permissions ?? []) {
          if (p?.id && p?.name) permissions[p.id] = p.name;
        }
      }

      const users: Record<string, string> = {};
      if (usersRes.status === "fulfilled") {
        for (const u of usersRes.value.users ?? []) {
          if (!u?.id) continue;
          const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
          users[u.id] = name || u.email || u.id;
        }
      }

      if (!cancelled) {
        setIdMaps({ companies, categories, subcategories, roles, permissions, users });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

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

  function goToPage(page: number) {
    const totalPages = Math.max(1, Number(pagination.pages ?? 1));
    if (page >= 1 && page <= totalPages) load(page);
  }

  function renderPager(ariaLabel: string) {
    const totalPages = Math.max(1, Number(pagination.pages ?? 1));
    const currentPage = Math.min(Math.max(1, Number(pagination.page ?? 1)), totalPages);
    return (
      <div className="publicJobsPager" role="navigation" aria-label={ariaLabel}>
        <button
          className="btn btnPrimary btnSm"
          style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
          type="button"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || loading}
        >
          {"<-"} Previous
        </button>
        <span className="publicJobsPagerInfo">Page {currentPage} of {totalPages} ({pagination.total} logs)</span>
        <button
          className="btn btnPrimary btnSm"
          style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
          type="button"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages || loading}
        >
          Next {"->"}
        </button>
      </div>
    );
  }

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

  function getDetailsText(log: AuditLog) {
    return log.details ? JSON.stringify(log.details, null, 2) : "—";
  }

  function isPrimitive(value: unknown) {
    return value === null || ["string", "number", "boolean"].includes(typeof value);
  }

  function getKeyNameFromPath(path: string) {
    const match = path.match(/(?:^|\.)([^.\[]+)(?:\[\d+\])?$/);
    return match?.[1] ?? "";
  }

  function resolveDisplayValue(path: string, value: unknown): string | undefined {
    if (value === null || value === undefined) return undefined;
    const keyName = getKeyNameFromPath(path);

    const id = typeof value === "string" || typeof value === "number" ? String(value) : null;
    if (!id) return undefined;

    switch (keyName) {
      case "company_id":
        return idMaps.companies[id];
      case "category_id":
      case "job_category_id":
        return idMaps.categories[id];
      case "subcategory_id":
      case "job_subcategory_id":
        return idMaps.subcategories[id];
      case "role_id":
        return idMaps.roles[id];
      case "permission_id":
      case "permission_ids":
        return idMaps.permissions[id];
      case "user_id":
      case "admin_id":
      case "created_by":
      case "updated_by":
      case "employer_id":
      case "employerId":
      case "applicant_id":
        return idMaps.users[id] ?? idMaps.companies[id];
      default:
        return undefined;
    }
  }

  function formatPrimitive(value: unknown, path = "") {
    if (value === undefined) return "null";
    const display = path ? resolveDisplayValue(path, value) : undefined;
    return display !== undefined ? JSON.stringify(display) : JSON.stringify(value);
  }

  function toJsonLines(value: unknown, depth = 0, path = ""): JsonLine[] {
    const indent = "  ".repeat(depth);
    const childIndent = "  ".repeat(depth + 1);

    if (isPrimitive(value) || value === undefined) {
      return [{ text: `${indent}${formatPrimitive(value, path)}`, path }];
    }

    if (Array.isArray(value)) {
      const lines: JsonLine[] = [{ text: `${indent}[`, path }];
      value.forEach((item, index) => {
        const itemPath = `${path}[${index}]`;
        const child = toJsonLines(item, depth + 1, itemPath);
        child[child.length - 1].text += index < value.length - 1 ? "," : "";
        lines.push(...child);
      });
      lines.push({ text: `${indent}]`, path });
      return lines;
    }

    if (typeof value === "object") {
      const entries = Object.entries(value as Record<string, unknown>);
      const lines: JsonLine[] = [{ text: `${indent}{`, path }];
      entries.forEach(([key, entryValue], index) => {
        const keyPath = path ? `${path}.${key}` : key;
        const isLast = index === entries.length - 1;
        if (isPrimitive(entryValue) || entryValue === undefined) {
          lines.push({
            text: `${childIndent}${JSON.stringify(key)}: ${formatPrimitive(entryValue, keyPath)}${isLast ? "" : ","}`,
            path: keyPath,
          });
          return;
        }

        const child = toJsonLines(entryValue, depth + 1, keyPath);
        const firstBody = child[0].text.trimStart();
        lines.push({ text: `${childIndent}${JSON.stringify(key)}: ${firstBody}`, path: keyPath });
        lines.push(...child.slice(1));
        lines[lines.length - 1].text += isLast ? "" : ",";
      });
      lines.push({ text: `${indent}}`, path });
      return lines;
    }

    return [{ text: `${indent}${JSON.stringify(value)}`, path }];
  }

  function valuesEqual(left: unknown, right: unknown) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function collectChangedPaths(left: unknown, right: unknown, basePath = "", set = new Set<string>()) {
    if (valuesEqual(left, right)) return set;

    if (
      left &&
      right &&
      typeof left === "object" &&
      typeof right === "object" &&
      !Array.isArray(left) &&
      !Array.isArray(right)
    ) {
      const keys = new Set([
        ...Object.keys(left as Record<string, unknown>),
        ...Object.keys(right as Record<string, unknown>),
      ]);
      for (const key of keys) {
        const path = basePath ? `${basePath}.${key}` : key;
        collectChangedPaths(
          (left as Record<string, unknown>)[key],
          (right as Record<string, unknown>)[key],
          path,
          set,
        );
      }
      return set;
    }

    if (Array.isArray(left) && Array.isArray(right)) {
      const max = Math.max(left.length, right.length);
      for (let index = 0; index < max; index += 1) {
        const path = `${basePath}[${index}]`;
        collectChangedPaths(left[index], right[index], path, set);
      }
      return set;
    }

    if (basePath) set.add(basePath);
    return set;
  }

  function pathHasChange(path: string, changedPaths: Set<string>) {
    if (!path) return false;
    for (const changed of changedPaths) {
      if (changed === path || changed.startsWith(`${path}.`) || changed.startsWith(`${path}[`)) {
        return true;
      }
    }
    return false;
  }

  function getBeforeAfter(details?: Record<string, unknown>): BeforeAfter | null {
    if (!details || typeof details !== "object") return null;
    const source = details as Record<string, unknown>;
    const before = source.before ?? source.previous ?? source.old ?? source.old_data;
    const after = source.after ?? source.current ?? source.new ?? source.new_data;
    if (before === undefined || after === undefined) return null;
    return { before, after };
  }

  function renderJsonLine(line: JsonLine, changedPaths: Set<string>) {
    const keyLine = line.text.match(/^(\s*)("(?:[^"\\]|\\.)+"\s*:\s*)(.*)$/);
    if (!keyLine) return <>{line.text}</>;

    const [, indent, keyPart, rest] = keyLine;
    const keyClass = pathHasChange(line.path, changedPaths)
      ? "auditJsonKey auditJsonKeyChanged"
      : "auditJsonKey";

    return (
      <>
        <span>{indent}</span>
        <span className={keyClass}>{keyPart}</span>
        <span>{rest}</span>
      </>
    );
  }

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
        <div style={{ minWidth: 170 }}>
          <label className="fieldLabel">Rows per page</label>
          <select
            className="input"
            value={String(pagination.limit)}
            onChange={(e) => {
              const nextLimit = Number(e.target.value);
              if (!Number.isFinite(nextLimit) || nextLimit <= 0) return;
              setPagination((prev) => ({ ...prev, limit: nextLimit, page: 1 }));
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        {renderPager("Audit logs pagination top")}
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
            ) : filteredLogs.map((log) => {
              const detailsText = getDetailsText(log);
              const isExpanded = Boolean(expandedDetails[log.id]);
              const beforeAfter = getBeforeAfter(log.details);
              const changedPaths = beforeAfter ? collectChangedPaths(beforeAfter.before, beforeAfter.after) : new Set<string>();
              const beforeLines = beforeAfter ? toJsonLines(beforeAfter.before) : [];
              const afterLines = beforeAfter ? toJsonLines(beforeAfter.after) : [];
              const totalDiffLines = beforeLines.length + afterLines.length;
              const isDiffLong = totalDiffLines > DETAILS_PREVIEW_LINES * 2;
              const visibleBefore = isExpanded ? beforeLines : beforeLines.slice(0, DETAILS_PREVIEW_LINES);
              const visibleAfter = isExpanded ? afterLines : afterLines.slice(0, DETAILS_PREVIEW_LINES);

              const detailsJsonLines = log.details ? toJsonLines(log.details) : [{ text: "—", path: "" }];
              const detailsIsLongByLines = detailsJsonLines.length > DETAILS_PREVIEW_LINES;
              const detailsIsLongByChars = detailsText.length > DETAILS_PREVIEW_CHARS;
              const detailsIsLong = detailsIsLongByLines || detailsIsLongByChars;
              const visibleDetails = isExpanded
                ? detailsJsonLines
                : detailsJsonLines.slice(0, DETAILS_PREVIEW_LINES);

              return (
              <tr key={log.id}>
                <td>{log.created_at ? new Date(log.created_at).toLocaleString("en-GB") : "—"}</td>
                <td>{`${log.first_name ?? ""} ${log.last_name ?? ""}`.trim() || log.user_email || (log.admin_name ?? log.admin_email ?? log.user_id ?? log.admin_id ?? "—")}</td>
                <td><span className="chipBadge">{log.action}</span></td>
                {!isSpecificAuditView ? <td>{log.target_type ?? "—"}</td> : null}
                {!isSpecificAuditView ? <td style={{ fontSize: "0.85em", fontFamily: "monospace" }}>{log.target_id ? log.target_id.substring(0, 8) + "…" : "—"}</td> : null}
                <td style={{ maxWidth: 360, whiteSpace: "pre-wrap", fontFamily: "monospace", fontSize: "0.8rem" }}>
                  {beforeAfter ? (
                    <div className="auditDiffWrap">
                      <div className="auditDiffSection">
                        <div className="auditDiffLabel">Before</div>
                        <pre className="auditJsonBlock">
                          {visibleBefore.map((line, index) => (
                            <div
                              key={`before-${log.id}-${index}`}
                              className="auditJsonLine"
                            >
                              {renderJsonLine(line, changedPaths)}
                            </div>
                          ))}
                          {!isExpanded && beforeLines.length > DETAILS_PREVIEW_LINES ? <div className="auditJsonLine">…</div> : null}
                        </pre>
                      </div>
                      <div className="auditDiffSection">
                        <div className="auditDiffLabel">After</div>
                        <pre className="auditJsonBlock">
                          {visibleAfter.map((line, index) => (
                            <div
                              key={`after-${log.id}-${index}`}
                              className="auditJsonLine"
                            >
                              {renderJsonLine(line, changedPaths)}
                            </div>
                          ))}
                          {!isExpanded && afterLines.length > DETAILS_PREVIEW_LINES ? <div className="auditJsonLine">…</div> : null}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <pre className="auditJsonBlock" style={{ background: "transparent", padding: 0 }}>
                      {visibleDetails.map((line, index) => (
                        <div key={`details-${log.id}-${index}`} className="auditJsonLine">
                          {renderJsonLine(line, new Set<string>())}
                        </div>
                      ))}
                      {!isExpanded && detailsJsonLines.length > DETAILS_PREVIEW_LINES ? (
                        <div className="auditJsonLine">…</div>
                      ) : null}
                      {!isExpanded && !detailsIsLongByLines && detailsIsLongByChars ? (
                        <div className="auditJsonLine">(truncated)</div>
                      ) : null}
                    </pre>
                  )}
                  {((beforeAfter && isDiffLong) || (!beforeAfter && detailsIsLong)) ? (
                    <div style={{ marginTop: 6 }}>
                      <button
                        type="button"
                        className="btn btnGhost btnSm"
                        onClick={() => setExpandedDetails((prev) => ({ ...prev, [log.id]: !prev[log.id] }))}
                      >
                        {isExpanded ? "View less" : "View more"}
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ marginTop: 16 }}>
        {renderPager("Audit logs pagination")}
      </div>
    </div>
  );
}