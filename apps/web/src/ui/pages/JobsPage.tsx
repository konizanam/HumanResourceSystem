import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createJob,
  deleteJob,
  listJobApplicationsForJob,
  listJobs,
  type JobListItem,
  type JobUpsertPayload,
  updateJob,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

function ActionMenu({
  label,
  items,
  disabled,
}: {
  label: string;
  disabled: boolean;
  items: { key: string; label: string; onClick: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div ref={wrapRef} className={"actionMenu" + (open ? " actionMenuOpen" : "")}>
      <button
        type="button"
        className={"btn btnGhost btnSm actionMenuBtn stepperSaveBtn" + (disabled ? " actionMenuBtnDisabled" : "")}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((v) => !v);
        }}
      >
        {label}
      </button>
      {open && (
        <div className="actionMenuList" role="menu">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              className={"actionMenuItem" + (it.danger ? " actionMenuItemDanger" : "")}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                it.onClick();
              }}
              disabled={disabled}
              role="menuitem"
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
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

type JobFormState = {
  title: string;
  description: string;
  company: string;
  category: string;
  employment_type: JobUpsertPayload["employment_type"];
  experience_level: JobUpsertPayload["experience_level"];
  location: string;
  remote: boolean;
  salary_min: string;
  salary_max: string;
  application_deadline: string;
  status: "active" | "closed" | "draft";
};

const EMPTY_FORM: JobFormState = {
  title: "",
  description: "",
  company: "",
  category: "",
  employment_type: "Full-time",
  experience_level: "Entry",
  location: "",
  remote: false,
  salary_min: "",
  salary_max: "",
  application_deadline: "",
  status: "active",
};

function mapJobToForm(job: JobListItem): JobFormState {
  return {
    title: String(job.title ?? ""),
    description: String(job.description ?? ""),
    company: String(job.company ?? ""),
    category: String(job.category ?? ""),
    employment_type: (job.employment_type as JobUpsertPayload["employment_type"]) || "Full-time",
    experience_level: (job.experience_level as JobUpsertPayload["experience_level"]) || "Entry",
    location: String(job.location ?? ""),
    remote: Boolean(job.remote),
    salary_min: job.salary_min != null ? String(job.salary_min) : "",
    salary_max: job.salary_max != null ? String(job.salary_max) : "",
    application_deadline: job.application_deadline ? String(job.application_deadline).slice(0, 10) : "",
    status: (job.status as "active" | "closed" | "draft") || "active",
  };
}

function mapFormToPayload(form: JobFormState): JobUpsertPayload {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    company: form.company.trim(),
    category: form.category.trim(),
    employment_type: form.employment_type,
    experience_level: form.experience_level,
    location: form.location.trim(),
    remote: form.remote,
    salary_min: Number(form.salary_min),
    salary_max: Number(form.salary_max),
    salary_currency: "NAD",
    requirements: [],
    responsibilities: [],
    benefits: [],
    application_deadline: form.application_deadline,
    status: form.status,
  };
}

export function JobsPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const canCreate = hasPermission("CREATE_JOB");
  const canEdit = hasPermission("EDIT_JOB");
  const canDelete = hasPermission("DELETE_JOB");
  const canViewApplications = hasPermission("VIEW_APPLICATIONS");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [openJobId, setOpenJobId] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async (page = 1) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const data = await listJobs(accessToken, {
        page,
        limit: pagination.limit,
        status: statusFilter || undefined,
        my_jobs: true,
      });
      const list = Array.isArray(data.jobs) ? data.jobs : [];
      setJobs(list);
      setPagination(data.pagination ?? { page, limit: pagination.limit, total: list.length, pages: 1 });

      const countsEntries = await Promise.all(
        list.map(async (job) => {
          try {
            const stats = await listJobApplicationsForJob(accessToken, job.id, { page: 1, limit: 1 });
            return [job.id, Number(stats.pagination?.total ?? 0)] as const;
          } catch {
            return [job.id, Number(job.applications_count ?? 0)] as const;
          }
        }),
      );
      setApplicationCounts(Object.fromEntries(countsEntries));
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [accessToken, pagination.limit, statusFilter]);

  useEffect(() => {
    void load(1);
  }, [load]);

  const visibleJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) => {
      return (
        String(job.title ?? "").toLowerCase().includes(q) ||
        String(job.company ?? "").toLowerCase().includes(q) ||
        String(job.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [jobs, search]);

  function validateForm() {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Title is required";
    if (!form.description.trim()) next.description = "Description is required";
    if (!form.company.trim()) next.company = "Company is required";
    if (!form.category.trim()) next.category = "Category is required";
    if (!form.location.trim()) next.location = "Location is required";
    if (!form.salary_min.trim()) next.salary_min = "Minimum salary is required";
    if (!form.salary_max.trim()) next.salary_max = "Maximum salary is required";
    if (!form.application_deadline.trim()) next.application_deadline = "Deadline is required";
    setFormErrors(next);
    return Object.keys(next).length === 0;
  }

  function openCreateModal() {
    setEditJobId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalMode("create");
  }

  function openEditModal(job: JobListItem) {
    setEditJobId(job.id);
    setForm(mapJobToForm(job));
    setFormErrors({});
    setModalMode("edit");
  }

  async function onSaveModal() {
    if (!accessToken || !modalMode) return;
    if (!validateForm()) return;
    try {
      setSaving(true);
      setError(null);
      const payload = mapFormToPayload(form);
      if (modalMode === "create") {
        await createJob(accessToken, payload);
        setSuccess("Job created successfully");
      } else if (editJobId) {
        await updateJob(accessToken, editJobId, payload);
        setSuccess("Job updated successfully");
      }
      setModalMode(null);
      setEditJobId(null);
      await load(pagination.page);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to save job");
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    if (!accessToken || !confirmDeleteId) return;
    try {
      setSaving(true);
      setError(null);
      await deleteJob(accessToken, confirmDeleteId);
      setSuccess("Job deleted successfully");
      setConfirmDeleteId(null);
      await load(pagination.page);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to delete job");
    } finally {
      setSaving(false);
    }
  }

  if (loading && jobs.length === 0) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Jobs</h1></div>
        <p className="pageText">Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Jobs</h1>
        {canCreate && (
          <button type="button" className="btn btnGhost btnSm stepperSaveBtn" onClick={openCreateModal}>
            Add Job
          </button>
        )}
      </div>

      {error && <div className="errorBox">{error}</div>}
      {success && <div className="successBox">{success}</div>}

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label className="fieldLabel">Search</label>
          <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title/company/category..." />
        </div>
        <div style={{ minWidth: 160 }}>
          <label className="fieldLabel">Status</label>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="tableWrap" role="region" aria-label="Jobs table">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Category</th>
              <th>Status</th>
              <th className="thRight">Applications</th>
              <th>Deadline</th>
              <th className="thRight">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleJobs.length === 0 ? (
              <tr><td colSpan={7}><div className="emptyState">No jobs found.</div></td></tr>
            ) : (
              visibleJobs.map((job) => {
                const applications = applicationCounts[job.id] ?? Number(job.applications_count ?? 0);
                const actions = [
                  {
                    key: "view",
                    label: openJobId === job.id ? "Close Details" : "View Details",
                    onClick: () => setOpenJobId((prev) => (prev === job.id ? null : job.id)),
                  },
                  ...(canEdit ? [{
                    key: "edit",
                    label: "Edit",
                    onClick: () => openEditModal(job),
                  }] : []),
                  ...(canDelete ? [{
                    key: "delete",
                    label: "Delete",
                    danger: true,
                    onClick: () => setConfirmDeleteId(job.id),
                  }] : []),
                  ...(canViewApplications ? [{
                    key: "applications",
                    label: `Applications (${applications})`,
                    onClick: () => navigate(`/app/jobs/${job.id}/applications`),
                  }] : []),
                ];

                return (
                  <Fragment key={job.id}>
                    <tr className={openJobId === job.id ? "tableRowActive" : undefined}>
                      <td className="tdStrong">{job.title}</td>
                      <td>{job.company ?? "—"}</td>
                      <td>{job.category ?? "—"}</td>
                      <td>{job.status ?? "—"}</td>
                      <td className="tdRight">{applications}</td>
                      <td>{job.application_deadline ? new Date(job.application_deadline).toLocaleDateString() : "—"}</td>
                      <td className="tdRight">
                        <ActionMenu label="Action" items={actions} disabled={saving} />
                      </td>
                    </tr>
                    {openJobId === job.id && (
                      <tr className="tableExpandRow">
                        <td colSpan={7}>
                          <div className="dropPanel">
                            <h2 className="editFormTitle">Job Details</h2>
                            <div className="profileReadGrid">
                              <ReadField label="Title" value={job.title} />
                              <ReadField label="Company" value={job.company} />
                              <ReadField label="Category" value={job.category} />
                              <ReadField label="Employment Type" value={job.employment_type} />
                              <ReadField label="Experience Level" value={job.experience_level} />
                              <ReadField label="Location" value={job.location} />
                              <ReadField label="Remote" value={job.remote ? "Yes" : "No"} />
                              <ReadField label="Salary Range" value={`${job.salary_min ?? "—"} - ${job.salary_max ?? "—"}`} />
                              <ReadField label="Deadline" value={job.application_deadline ? new Date(job.application_deadline).toLocaleString() : "—"} />
                              <ReadField label="Status" value={job.status} />
                            </div>
                            <div style={{ marginTop: 12 }}>
                              <span className="readLabel">Description</span>
                              <p className="readValue" style={{ whiteSpace: "pre-wrap" }}>{job.description ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
          <button className="btn btnGhost btnSm" type="button" onClick={() => load(pagination.page - 1)} disabled={pagination.page <= 1 || loading}>{"<-"} Previous</button>
          <span className="readLabel">Page {pagination.page} of {pagination.pages} ({pagination.total} jobs)</span>
          <button className="btn btnGhost btnSm" type="button" onClick={() => load(pagination.page + 1)} disabled={pagination.page >= pagination.pages || loading}>Next {"->"}</button>
        </div>
      )}

      {modalMode && (
        <div className="modalOverlay" role="presentation" onMouseDown={() => !saving && setModalMode(null)}>
          <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 820 }}>
            <div className="modalTitle">{modalMode === "create" ? "Add Job" : "Edit Job"}</div>
            <div className="editGrid">
              <Field label="Title" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} error={formErrors.title} />
              <Field label="Company" value={form.company} onChange={(v) => setForm((p) => ({ ...p, company: v }))} error={formErrors.company} />
              <Field label="Category" value={form.category} onChange={(v) => setForm((p) => ({ ...p, category: v }))} error={formErrors.category} />
              <Field label="Location" value={form.location} onChange={(v) => setForm((p) => ({ ...p, location: v }))} error={formErrors.location} />
              <Field label="Salary Min" type="number" value={form.salary_min} onChange={(v) => setForm((p) => ({ ...p, salary_min: v }))} error={formErrors.salary_min} />
              <Field label="Salary Max" type="number" value={form.salary_max} onChange={(v) => setForm((p) => ({ ...p, salary_max: v }))} error={formErrors.salary_max} />
              <Field label="Application Deadline" type="date" value={form.application_deadline} onChange={(v) => setForm((p) => ({ ...p, application_deadline: v }))} error={formErrors.application_deadline} />
              <div className="field">
                <label className="fieldLabel">Employment Type</label>
                <select className="input" value={form.employment_type} onChange={(e) => setForm((p) => ({ ...p, employment_type: e.target.value as JobUpsertPayload["employment_type"] }))}>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  <option value="Internship">Internship</option>
                </select>
              </div>
              <div className="field">
                <label className="fieldLabel">Experience Level</label>
                <select className="input" value={form.experience_level} onChange={(e) => setForm((p) => ({ ...p, experience_level: e.target.value as JobUpsertPayload["experience_level"] }))}>
                  <option value="Entry">Entry</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead</option>
                </select>
              </div>
              <div className="field">
                <label className="fieldLabel">Status</label>
                <select className="input" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as JobFormState["status"] }))}>
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <label className="field fieldCheckbox">
                <input type="checkbox" checked={form.remote} onChange={(e) => setForm((p) => ({ ...p, remote: e.target.checked }))} />
                <span className="fieldLabel">Remote</span>
              </label>
              <div className="field fieldFull">
                <label className="fieldLabel">Description</label>
                <textarea className="input textarea" rows={4} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                {formErrors.description && <span className="fieldError">{formErrors.description}</span>}
              </div>
            </div>
            <div className="modalActions">
              <button className="btn btnGhost" type="button" onClick={() => setModalMode(null)} disabled={saving}>Cancel</button>
              <button className="btn btnGhost btnSm stepperSaveBtn" type="button" onClick={onSaveModal} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title="Delete Job"
        message="Are you sure you want to delete this job?"
        confirmLabel={saving ? "Deleting..." : "Delete"}
        busy={saving}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
}) {
  return (
    <div className="field">
      <label className="fieldLabel">{label}</label>
      <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      {error && <span className="fieldError">{error}</span>}
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
  return (
    <div className="readField">
      <span className="readLabel">{label}</span>
      <span className="readValue">{display}</span>
    </div>
  );
}
