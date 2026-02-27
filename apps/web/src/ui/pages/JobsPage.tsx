import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  applyToJob,
  type Company,
  createJob,
  deleteJob,
  getCompany,
  getJobSeekerFullProfile,
  listCompanies,
  listJobCategories,
  listJobApplicationsForJob,
  listJobs,
  listMyApplications,
  type JobCategory,
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
  const [searchParams, setSearchParams] = useSearchParams();

  const canManageAllJobs = hasPermission("MANAGE_USERS");
  const canCreate = hasPermission("CREATE_JOB");
  const canViewApplications = hasPermission("VIEW_APPLICATIONS");
  const canManageCompany = hasPermission("MANAGE_COMPANY");
  const canViewJob = hasPermission("VIEW_JOB");
  const canApplyJob = hasPermission("APPLY_JOB") && !canCreate && !canManageAllJobs;
  const isJobSeekerView = !canCreate && !canManageAllJobs;
  const shouldRestrictToAssignedCompanies =
    !canManageCompany && !canViewJob && (canCreate || canViewApplications);

  const companyIdFromUrl = searchParams.get("company_id")?.trim() || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [allowedCompanyIds, setAllowedCompanyIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [applyConfirmJob, setApplyConfirmJob] = useState<JobListItem | null>(null);
  const [profileIncompleteModalOpen, setProfileIncompleteModalOpen] = useState(false);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [form, setForm] = useState<JobFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [addInlineOpen, setAddInlineOpen] = useState(false);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [companyQuery, setCompanyQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [companyResults, setCompanyResults] = useState<Company[]>([]);
  const [categoryResults, setCategoryResults] = useState<JobCategory[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyModalLoading, setCompanyModalLoading] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);

  const currentUserId = useMemo(() => {
    if (!accessToken) return "";
    try {
      const [, payload] = accessToken.split(".");
      if (!payload) return "";
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      const json = atob(padded);
      const parsed = JSON.parse(json) as { sub?: unknown };
      return typeof parsed.sub === "string" ? parsed.sub : "";
    } catch {
      return "";
    }
  }, [accessToken]);

  function isOwnJob(job: JobListItem) {
    const ownerFromCreatedBy = String((job as any).created_by ?? "");
    const ownerFromEmployerId = String(job.employer_id ?? "");
    return Boolean(currentUserId) && (
      ownerFromCreatedBy === currentUserId ||
      ownerFromEmployerId === currentUserId
    );
  }

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    void listCompanies(accessToken)
      .then((list) => {
        if (cancelled) return;
        const safeList = Array.isArray(list) ? list : [];
        setCompanies(safeList);
        setAllowedCompanyIds(safeList.map((c) => c.id));
      })
      .catch(() => {
        if (cancelled) return;
        setCompanies([]);
        setAllowedCompanyIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !addInlineOpen) return;
    let cancelled = false;
    void listJobCategories(accessToken)
      .then((data) => {
        if (cancelled) return;
        setJobCategories(Array.isArray(data.categories) ? data.categories : []);
      })
      .catch(() => {
        if (cancelled) return;
        setJobCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, addInlineOpen]);

  useEffect(() => {
    if (!accessToken || !addInlineOpen) return;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        const allCompanies = await listCompanies(accessToken);
        if (cancelled) return;
        const q = companyQuery.trim().toLowerCase();
        const matches = q
          ? allCompanies.filter((company) => String(company.name ?? "").toLowerCase().includes(q))
          : allCompanies;
        setCompanyResults(matches.slice(0, 10));
      } catch {
        if (!cancelled) setCompanyResults([]);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [accessToken, addInlineOpen, companyQuery]);

  useEffect(() => {
    if (!addInlineOpen) return;
    const q = categoryQuery.trim().toLowerCase();
    const matches = q
      ? jobCategories.filter((category) => String(category.name ?? "").toLowerCase().includes(q))
      : jobCategories;
    setCategoryResults(matches.slice(0, 10));
  }, [addInlineOpen, categoryQuery, jobCategories]);

  const load = useCallback(async (page = 1) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const data = await listJobs(accessToken, {
        page,
        limit: pagination.limit,
        status: statusFilter || undefined,
        my_jobs: false,
        company_id: companyIdFromUrl || undefined,
      });
      const fetched = Array.isArray(data.jobs) ? data.jobs : [];
      const list = shouldRestrictToAssignedCompanies
        ? fetched.filter((job) => job.company_id && allowedCompanyIds.includes(job.company_id))
        : fetched;
      setJobs(list);
      const totalFromApi = Number(data.pagination?.total ?? list.length);
      const total = shouldRestrictToAssignedCompanies ? list.length : totalFromApi;
      setPagination({
        page: Number(data.pagination?.page ?? page),
        limit: Number(data.pagination?.limit ?? pagination.limit),
        total,
        pages: Math.max(1, Math.ceil(total / Number(data.pagination?.limit ?? pagination.limit))),
      });

      if (canViewApplications) {
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
      } else {
        setApplicationCounts({});
      }

      if (canApplyJob) {
        try {
          // Backend caps limit at 100; higher values return 400.
          const applications = await listMyApplications(accessToken, { page: 1, limit: 100 });
          const appliedIds = Array.from(
            new Set((applications.applications ?? []).map((item) => String(item.job_id)).filter(Boolean)),
          );
          setAppliedJobIds(appliedIds);
        } catch {
          setAppliedJobIds([]);
        }
      } else {
        setAppliedJobIds([]);
      }
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    allowedCompanyIds,
    companyIdFromUrl,
    pagination.limit,
    shouldRestrictToAssignedCompanies,
    statusFilter,
    canViewApplications,
    canApplyJob,
  ]);

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

  const activeCompany = useMemo(
    () => companies.find((company) => company.id === companyIdFromUrl) ?? null,
    [companies, companyIdFromUrl],
  );

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
    setAddInlineOpen((prev) => !prev);
    setEditJobId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSelectedCompany(null);
    setSelectedCategory(null);
    setSelectedSubcategory("");
    setCompanyQuery("");
    setCategoryQuery("");
    setDescriptionHtml("");
  }

  function openEditModal(job: JobListItem) {
    setEditJobId(job.id);
    setForm(mapJobToForm(job));
    setFormErrors({});
    setModalMode("edit");
  }

  async function onSaveModal() {
    if (!accessToken || modalMode !== "edit") return;
    if (!canCreate) return;
    if (!validateForm()) return;
    try {
      setSaving(true);
      setError(null);
      const payload = mapFormToPayload(form);
      if (editJobId) {
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

  async function onCreateInlineJob() {
    if (!accessToken || !canCreate) return;
    const plainDescription = (descriptionRef.current?.innerText ?? "").trim();
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!selectedCompany?.id) errs.company = "Company is required";
    if (!selectedCategory?.id) errs.category = "Category is required";
    if (!selectedSubcategory.trim()) errs.subcategory = "Subcategory is required";
    if (!plainDescription) errs.description = "Description is required";
    if (!form.location.trim()) errs.location = "Location is required";
    if (!form.salary_min.trim()) errs.salary_min = "Minimum salary is required";
    if (!form.salary_max.trim()) errs.salary_max = "Maximum salary is required";
    if (!form.application_deadline.trim()) errs.application_deadline = "Deadline is required";
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setSaving(true);
      setError(null);
      await createJob(accessToken, {
        title: form.title.trim(),
        description: descriptionHtml || plainDescription,
        company: selectedCompany.name,
        company_id: selectedCompany.id,
        category: selectedCategory.name,
        category_id: selectedCategory.id,
        subcategory: selectedSubcategory.trim(),
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
      });
      setSuccess("Job created successfully");
      setAddInlineOpen(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
      setSelectedCompany(null);
      setSelectedCategory(null);
      setSelectedSubcategory("");
      setCompanyQuery("");
      setCategoryQuery("");
      setDescriptionHtml("");
      await load(1);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  function formatCommand(command: string) {
    document.execCommand(command);
    const html = descriptionRef.current?.innerHTML ?? "";
    setDescriptionHtml(html);
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

  function getApplyProfileCompleteness(profile: Awaited<ReturnType<typeof getJobSeekerFullProfile>>) {
    const profileObj = (profile ?? {}) as Record<string, unknown>;
    const details = (
      profileObj.personalDetails ??
      profileObj.personal_details ??
      null
    ) as Record<string, unknown> | null;

    const firstName = String(
      details?.first_name ?? details?.firstName ?? "",
    ).trim();
    const lastName = String(
      details?.last_name ?? details?.lastName ?? "",
    ).trim();

    const education = Array.isArray(profileObj.education)
      ? profileObj.education
      : Array.isArray(profileObj.educations)
        ? profileObj.educations
        : [];

    const reasons: string[] = [];
    if (!details) reasons.push("missing personal details object");
    if (!firstName) reasons.push("missing first name (first_name or firstName)");
    if (!lastName) reasons.push("missing last name (last_name or lastName)");
    if (!Array.isArray(education) || education.length < 1) {
      reasons.push("education array missing or empty");
    }

    return {
      complete: reasons.length === 0,
      reasons,
      debug: {
        rootKeys: Object.keys(profileObj),
        detailsKeys: details ? Object.keys(details) : [],
        educationCount: Array.isArray(education) ? education.length : 0,
        firstName,
        lastName,
      },
    };
  }

  async function onApplyClick(job: JobListItem) {
    if (!accessToken || !canApplyJob) return;
    try {
      setSaving(true);
      setError(null);
      const profile = await getJobSeekerFullProfile(accessToken);
      console.log("[JobsPage] /job-seeker/full-profile response:", profile);
      const completeness = getApplyProfileCompleteness(profile);
      if (!completeness.complete) {
        console.log(
          "[JobsPage] Profile marked incomplete for apply:",
          completeness.reasons,
          completeness.debug,
        );
        setProfileIncompleteModalOpen(true);
        return;
      }
      console.log("[JobsPage] Profile marked complete for apply:", completeness.debug);
      setApplyConfirmJob(job);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to validate profile completeness");
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmApply() {
    if (!accessToken || !applyConfirmJob) return;
    try {
      setSaving(true);
      setError(null);
      await applyToJob(accessToken, { job_id: applyConfirmJob.id });
      setAppliedJobIds((prev) => (prev.includes(applyConfirmJob.id) ? prev : [...prev, applyConfirmJob.id]));
      setSuccess(`Application submitted for "${applyConfirmJob.title}".`);
      setApplyConfirmJob(null);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to apply for job");
    } finally {
      setSaving(false);
    }
  }

  async function onOpenCompanyInfo(job: JobListItem) {
    if (!accessToken) return;
    try {
      setCompanyModalOpen(true);
      setCompanyModalLoading(true);
      setCompanyDetails(null);
      setError(null);
      const id = String(job.company_id ?? "").trim();
      if (id) {
        const company = await getCompany(accessToken, id);
        setCompanyDetails(company);
        return;
      }
      const fallback = companies.find(
        (item) =>
          String(item.name ?? "").trim().toLowerCase() ===
          String(job.company ?? "").trim().toLowerCase(),
      );
      if (fallback) {
        setCompanyDetails(fallback);
      } else {
        setError("Company details are not available for this job.");
      }
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load company details");
    } finally {
      setCompanyModalLoading(false);
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
            {addInlineOpen ? "Cancel" : "Add Job"}
          </button>
        )}
      </div>
      {addInlineOpen && canCreate && (
        <div className="dropPanel" style={{ marginBottom: 16 }}>
          <div className="editForm">
            <h2 className="editFormTitle">Add Job</h2>
            <div className="editGrid">
              <Field label="Title" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} error={formErrors.title} />
              <div className="field">
                <label className="fieldLabel">Company</label>
                <input className="input" value={companyQuery} onChange={(e) => { setCompanyQuery(e.target.value); setSelectedCompany(null); }} placeholder="Search company..." />
                {formErrors.company && <span className="fieldError">{formErrors.company}</span>}
                {companyResults.length > 0 && (
                  <div className="typeaheadList">
                    {companyResults.map((company) => (
                      <button key={company.id} type="button" className="actionMenuItem" onClick={() => { setSelectedCompany(company); setCompanyQuery(company.name); setCompanyResults([]); }}>
                        {company.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="field">
                <label className="fieldLabel">Category</label>
                <input className="input" value={categoryQuery} onChange={(e) => { setCategoryQuery(e.target.value); setSelectedCategory(null); setSelectedSubcategory(""); }} placeholder="Search category..." />
                {formErrors.category && <span className="fieldError">{formErrors.category}</span>}
                {categoryResults.length > 0 && (
                  <div className="typeaheadList">
                    {categoryResults.map((category) => (
                      <button key={category.id} type="button" className="actionMenuItem" onClick={() => { setSelectedCategory(category); setCategoryQuery(category.name); setCategoryResults([]); }}>
                        {category.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="field">
                <label className="fieldLabel">Subcategory</label>
                <select className="input" value={selectedSubcategory} onChange={(e) => setSelectedSubcategory(e.target.value)} disabled={!selectedCategory}>
                  <option value="">Select subcategory</option>
                  {(selectedCategory?.subcategories ?? []).map((sub) => (
                    <option key={sub.id} value={sub.name}>{sub.name}</option>
                  ))}
                </select>
                {formErrors.subcategory && <span className="fieldError">{formErrors.subcategory}</span>}
              </div>
              <Field label="Location" value={form.location} onChange={(v) => setForm((p) => ({ ...p, location: v }))} error={formErrors.location} />
              <Field label="Salary Min" type="number" value={form.salary_min} onChange={(v) => setForm((p) => ({ ...p, salary_min: v }))} error={formErrors.salary_min} />
              <Field label="Salary Max" type="number" value={form.salary_max} onChange={(v) => setForm((p) => ({ ...p, salary_max: v }))} error={formErrors.salary_max} />
              <Field label="Application Deadline" type="date" value={form.application_deadline} onChange={(v) => setForm((p) => ({ ...p, application_deadline: v }))} error={formErrors.application_deadline} />
              <div className="field">
                <label className="fieldLabel">Employment Type</label>
                <select className="input" value={form.employment_type} onChange={(e) => setForm((p) => ({ ...p, employment_type: e.target.value as JobUpsertPayload["employment_type"] }))}>
                  <option value="Full-time">Full-time</option><option value="Part-time">Part-time</option><option value="Contract">Contract</option><option value="Internship">Internship</option>
                </select>
              </div>
              <div className="field">
                <label className="fieldLabel">Experience Level</label>
                <select className="input" value={form.experience_level} onChange={(e) => setForm((p) => ({ ...p, experience_level: e.target.value as JobUpsertPayload["experience_level"] }))}>
                  <option value="Entry">Entry</option><option value="Intermediate">Intermediate</option><option value="Senior">Senior</option><option value="Lead">Lead</option>
                </select>
              </div>
              <label className="field fieldCheckbox">
                <input type="checkbox" checked={form.remote} onChange={(e) => setForm((p) => ({ ...p, remote: e.target.checked }))} />
                <span className="fieldLabel">Remote</span>
              </label>
              <div className="field fieldFull">
                <label className="fieldLabel">Description</label>
                <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                  <button className="btn btnGhost btnSm" type="button" onClick={() => formatCommand("bold")}>Bold</button>
                  <button className="btn btnGhost btnSm" type="button" onClick={() => formatCommand("italic")}>Italic</button>
                  <button className="btn btnGhost btnSm" type="button" onClick={() => formatCommand("insertUnorderedList")}>Bullets</button>
                  <button className="btn btnGhost btnSm" type="button" onClick={() => formatCommand("insertOrderedList")}>Numbered</button>
                </div>
                <div
                  ref={descriptionRef}
                  className="input textarea"
                  contentEditable
                  role="textbox"
                  onInput={() => setDescriptionHtml(descriptionRef.current?.innerHTML ?? "")}
                  style={{ minHeight: 120 }}
                />
                {formErrors.description && <span className="fieldError">{formErrors.description}</span>}
              </div>
            </div>
            <div className="stepperActions">
              <button className="btn btnGhost" type="button" onClick={() => setAddInlineOpen(false)} disabled={saving}>Cancel</button>
              <button className="btn btnGhost btnSm stepperSaveBtn" type="button" onClick={onCreateInlineJob} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}


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

      {companyIdFromUrl && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <span className="chipBadge">
            Company: {activeCompany?.name ?? companyIdFromUrl}
          </span>
          <button
            type="button"
            className="btn btnGhost btnSm"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("company_id");
              setSearchParams(next);
            }}
          >
            Remove
          </button>
        </div>
      )}

      <div className="tableWrap" role="region" aria-label="Jobs table">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Category</th>
              <th>Status</th>
              {canViewApplications ? <th className="thRight">Applications</th> : null}
              <th>Deadline</th>
              <th className="thRight">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleJobs.length === 0 ? (
              <tr><td colSpan={canViewApplications ? 7 : 6}><div className="emptyState">No jobs found.</div></td></tr>
            ) : (
              visibleJobs.map((job) => {
                const applications = applicationCounts[job.id] ?? Number(job.applications_count ?? 0);
                const canManageThisJob = canCreate && (canManageAllJobs || isOwnJob(job));
                const alreadyApplied = appliedJobIds.includes(job.id);
                const actions = [
                  {
                    key: "view",
                    label: openJobId === job.id ? "Close Details" : "View Details",
                    onClick: () => setOpenJobId((prev) => (prev === job.id ? null : job.id)),
                  },
                  ...(canManageThisJob ? [{
                    key: "edit",
                    label: "Edit",
                    onClick: () => openEditModal(job),
                  }] : []),
                  ...(canManageThisJob ? [{
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
                      <td>
                        {isJobSeekerView ? (
                          <button
                            type="button"
                            className="linkBtn"
                            onClick={() => void onOpenCompanyInfo(job)}
                            disabled={saving}
                          >
                            {job.company ?? "—"}
                          </button>
                        ) : (
                          job.company ?? "—"
                        )}
                      </td>
                      <td>{job.category ?? "—"}</td>
                      <td>{job.status ?? "—"}</td>
                      {canViewApplications ? <td className="tdRight">{applications}</td> : null}
                      <td>{job.application_deadline ? new Date(job.application_deadline).toLocaleDateString() : "—"}</td>
                      <td className="tdRight">
                        <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                          {canApplyJob ? (
                            <button
                              type="button"
                              className="btn btnGhost btnSm stepperSaveBtn"
                              onClick={() => void onApplyClick(job)}
                              disabled={saving || alreadyApplied}
                            >
                              {alreadyApplied ? "Applied" : "Apply"}
                            </button>
                          ) : null}
                          <ActionMenu label="Action" items={actions} disabled={saving} />
                        </div>
                      </td>
                    </tr>
                    {openJobId === job.id && (
                      <tr className="tableExpandRow">
                        <td colSpan={canViewApplications ? 7 : 6}>
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

      {modalMode === "edit" && (
        <div className="modalOverlay" role="presentation" onMouseDown={() => !saving && setModalMode(null)}>
          <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()} style={{ maxWidth: 820 }}>
            <div className="modalTitle">Edit Job</div>
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

      {profileIncompleteModalOpen ? (
        <div
          className="modalOverlay"
          role="presentation"
          onMouseDown={() => !saving && setProfileIncompleteModalOpen(false)}
        >
          <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Profile Incomplete</div>
            <div className="modalMessage">
              Your profile is incomplete. Please fill in your personal details and at least one education
              record before applying.
            </div>
            <div className="modalActions">
              <button
                className="btn btnGhost"
                type="button"
                onClick={() => setProfileIncompleteModalOpen(false)}
              >
                Close
              </button>
              <button
                className="btn btnGhost btnSm stepperSaveBtn"
                type="button"
                onClick={() => navigate("/app/job-seekers")}
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {applyConfirmJob ? (
        <div className="modalOverlay" role="presentation" onMouseDown={() => !saving && setApplyConfirmJob(null)}>
          <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Confirm Application</div>
            <div className="modalMessage">
              Apply for <strong>{applyConfirmJob.title}</strong>?
            </div>
            <div className="modalActions">
              <button className="btn btnGhost" type="button" onClick={() => setApplyConfirmJob(null)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btnGhost btnSm stepperSaveBtn" type="button" onClick={onConfirmApply} disabled={saving}>
                {saving ? "Applying..." : "Confirm Apply"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {companyModalOpen ? (
        <div className="modalOverlay" role="presentation" onMouseDown={() => !companyModalLoading && setCompanyModalOpen(false)}>
          <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Company Information</div>
            <div className="modalMessage">
              {companyModalLoading ? (
                "Loading company details..."
              ) : companyDetails ? (
                <div className="profileReadGrid">
                  <ReadField label="Company Name" value={companyDetails.name} />
                  <ReadField label="Industry" value={companyDetails.industry} />
                  <ReadField label="Contact Email" value={companyDetails.contact_email} />
                  <ReadField label="Contact Phone" value={companyDetails.contact_phone} />
                  <ReadField label="City" value={companyDetails.city} />
                  <ReadField label="Country" value={companyDetails.country} />
                  <ReadField label="Website" value={companyDetails.website} />
                  <ReadField label="Description" value={companyDetails.description} />
                </div>
              ) : (
                "No company details found."
              )}
            </div>
            <div className="modalActions">
              <button className="btn btnGhost" type="button" onClick={() => setCompanyModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
