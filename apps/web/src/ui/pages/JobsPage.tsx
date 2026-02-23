import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  type AdminJob,
  listAdminJobs,
  deleteAdminJob,
  featureAdminJob,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";

/* ------------------------------------------------------------------ */
/*  Reusable helpers                                                   */
/* ------------------------------------------------------------------ */

function ActionMenu({
  label, items, disabled,
}: {
  label: string; disabled: boolean;
  items: { key: string; label: string; onClick: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); }
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);
  return (
    <div ref={wrapRef} className={"actionMenu" + (open ? " actionMenuOpen" : "")}>
      <button type="button" className={"btn btnGhost btnSm actionMenuBtn stepperSaveBtn" + (disabled ? " actionMenuBtnDisabled" : "")} disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={(e) => { e.stopPropagation(); if (!disabled) setOpen((v) => !v); }}>{label}</button>
      {open && (
        <div className="actionMenuList" role="menu">
          {items.map((it) => (
            <button key={it.key} type="button" className={"actionMenuItem" + (it.danger ? " actionMenuItemDanger" : "")} onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }} disabled={disabled} role="menuitem">{it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmLabel, busy, onCancel, onConfirm }: { open: boolean; title: string; message: string; confirmLabel: string; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return (
    <div className="modalOverlay" role="presentation" onMouseDown={onCancel}>
      <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalTitle">{title}</div>
        <div className="modalMessage">{message}</div>
        <div className="modalActions">
          <button className="btn btnGhost" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn btnDanger" type="button" onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
  return (<div className="readField"><span className="readLabel">{label}</span><span className="readValue">{display}</span></div>);
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export function JobsPage() {
  const { accessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [summary, setSummary] = useState({ total_jobs: 0, active_jobs: 0, flagged_jobs: 0 });

  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openJob = useMemo(() => jobs.find((j) => j.id === openJobId) ?? null, [jobs, openJobId]);

  const load = useCallback(async (page = 1) => {
    if (!accessToken) return;
    try {
      setLoading(true); setError(null);
      const data = await listAdminJobs(accessToken, {
        page, limit: pagination.limit,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setJobs(data.jobs); setPagination(data.pagination); setSummary(data.summary);
    } catch (e) { setError((e as any)?.message ?? "Failed to load jobs"); }
    finally { setLoading(false); }
  }, [accessToken, pagination.limit, search, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  function clearMessages() { setError(null); setSuccess(null); }

  async function onConfirmDelete() {
    if (!accessToken || !confirmDeleteId) return;
    try {
      clearMessages(); setSaving(true);
      await deleteAdminJob(accessToken, confirmDeleteId);
      setJobs((prev) => prev.filter((j) => j.id !== confirmDeleteId));
      setSuccess("Job deleted successfully");
      setConfirmDeleteId(null);
      if (openJobId === confirmDeleteId) setOpenJobId(null);
    } catch (e) { setError((e as any)?.message ?? "Failed to delete job"); }
    finally { setSaving(false); }
  }

  async function onToggleFeature(job: AdminJob) {
    if (!accessToken) return;
    try {
      clearMessages(); setSaving(true);
      const newVal = !job.is_featured;
      await featureAdminJob(accessToken, job.id, newVal);
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, is_featured: newVal } : j));
      setSuccess(newVal ? "Job featured" : "Job unfeatured");
    } catch (e) { setError((e as any)?.message ?? "Failed to update feature status"); }
    finally { setSaving(false); }
  }

  function goToPage(page: number) { if (page >= 1 && page <= pagination.pages) load(page); }

  if (loading && jobs.length === 0) {
    return (<div className="page"><div className="companiesHeader"><h1 className="pageTitle">Jobs</h1></div><p className="pageText">Loading…</p></div>);
  }

  return (
    <div className="page">
      <div className="companiesHeader"><h1 className="pageTitle">Jobs</h1></div>

      {error && <div className="errorBox">{error}</div>}
      {success && <div className="successBox">{success}</div>}

      {/* Summary */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="dropPanel" style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "12px 16px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{summary.total_jobs}</div>
          <div className="readLabel">Total Jobs</div>
        </div>
        <div className="dropPanel" style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "12px 16px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#166534" }}>{summary.active_jobs}</div>
          <div className="readLabel">Active</div>
        </div>
        <div className="dropPanel" style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "12px 16px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#b91c1c" }}>{summary.flagged_jobs}</div>
          <div className="readLabel">Flagged</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="fieldLabel">Search</label>
          <input className="input" placeholder="Search by title, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ minWidth: 140 }}>
          <label className="fieldLabel">Status</label>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="tableWrap" role="region" aria-label="Jobs table">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Location</th>
              <th>Status</th>
              <th className="thRight">Applications</th>
              <th className="thRight">Views</th>
              <th>Created</th>
              <th className="thRight">Action</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr><td colSpan={8}><div className="emptyState">No jobs found.</div></td></tr>
            ) : jobs.map((job) => {
              const isOpen = openJobId === job.id;
              return (
                <JobRow key={job.id} job={job} open={isOpen} saving={saving}
                  onView={() => { clearMessages(); setOpenJobId(isOpen ? null : job.id); }}
                  onFeature={() => onToggleFeature(job)}
                  onDelete={() => { clearMessages(); setConfirmDeleteId(job.id); }}
                >
                  {isOpen && openJob && (
                    <tr className="tableExpandRow">
                      <td colSpan={8}>
                        <div className="dropPanel">
                          <div className="editForm">
                            <h2 className="editFormTitle">Job Details</h2>
                            <div className="profileReadGrid">
                              <ReadField label="Title" value={openJob.title} />
                              <ReadField label="Company" value={openJob.company} />
                              <ReadField label="Location" value={openJob.location} />
                              <ReadField label="Category" value={openJob.category} />
                              <ReadField label="Experience Level" value={openJob.experience_level} />
                              <ReadField label="Employment Type" value={openJob.employment_type} />
                              <ReadField label="Remote" value={openJob.remote ? "Yes" : "No"} />
                              <ReadField label="Status" value={openJob.status} />
                              <ReadField label="Salary" value={openJob.salary_min && openJob.salary_max ? `${openJob.salary_currency ?? "N$"} ${openJob.salary_min} – ${openJob.salary_max}` : null} />
                              <ReadField label="Applications" value={openJob.applications_count} />
                              <ReadField label="Views" value={openJob.views} />
                              <ReadField label="Featured" value={openJob.is_featured ? "Yes" : "No"} />
                              <ReadField label="Flagged" value={openJob.is_flagged ? "Yes" : "No"} />
                              <ReadField label="Employer" value={openJob.employer_name} />
                              <ReadField label="Employer Email" value={openJob.employer_email} />
                              <ReadField label="Deadline" value={openJob.application_deadline ? new Date(openJob.application_deadline).toLocaleDateString() : null} />
                              <ReadField label="Created" value={openJob.created_at ? new Date(openJob.created_at).toLocaleString() : null} />
                            </div>
                            {openJob.description && (
                              <div style={{ marginTop: 12 }}>
                                <span className="readLabel">Description</span>
                                <p className="readValue" style={{ whiteSpace: "pre-wrap" }}>{openJob.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </JobRow>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
          <button className="btn btnGhost btnSm" type="button" onClick={() => goToPage(pagination.page - 1)} disabled={pagination.page <= 1 || loading}>← Previous</button>
          <span className="readLabel">Page {pagination.page} of {pagination.pages} ({pagination.total} jobs)</span>
          <button className="btn btnGhost btnSm" type="button" onClick={() => goToPage(pagination.page + 1)} disabled={pagination.page >= pagination.pages || loading}>Next →</button>
        </div>
      )}

      <ConfirmModal open={Boolean(confirmDeleteId)} title="Delete Job" message="Are you sure you want to delete this job? This cannot be undone." confirmLabel={saving ? "Deleting…" : "Delete"} busy={saving} onCancel={() => setConfirmDeleteId(null)} onConfirm={onConfirmDelete} />
    </div>
  );
}

function JobRow({ job, open, saving, onView, onFeature, onDelete, children }: {
  job: AdminJob; open: boolean; saving: boolean;
  onView: () => void; onFeature: () => void; onDelete: () => void; children: ReactNode;
}) {
  return (
    <>
      <tr className={open ? "tableRowActive" : undefined}>
        <td className="tdStrong">{job.title}</td>
        <td>{job.company ?? "—"}</td>
        <td>{job.location ?? "—"}</td>
        <td>
          <span className="chipBadge" style={{
            background: job.status === "active" ? "#dcfce7" : job.status === "draft" ? "#fef3c7" : "#f3f4f6",
            color: job.status === "active" ? "#166534" : job.status === "draft" ? "#92400e" : "#374151",
          }}>{job.status ?? "—"}</span>
        </td>
        <td className="tdRight">{job.applications_count ?? 0}</td>
        <td className="tdRight">{job.views ?? 0}</td>
        <td>{job.created_at ? new Date(job.created_at).toLocaleDateString() : "—"}</td>
        <td className="tdRight">
          <ActionMenu disabled={saving} label="Action" items={[
            { key: "view", label: open ? "Close" : "View", onClick: onView },
            { key: "feature", label: job.is_featured ? "Unfeature" : "Feature", onClick: onFeature },
            { key: "delete", label: "Delete", onClick: onDelete, danger: true },
          ]} />
        </td>
      </tr>
      {children}
    </>
  );
}
