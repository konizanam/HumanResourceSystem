import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  applyToJob,
  type Company,
  createJob,
  deleteJob,
  getCompany,
  getPublicCompany,
  getJobSeekerFullProfile,
  listJobSeekerResumes,
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
import { RichTextEditor, RichTextView, normalizeRichTextForSave, richTextToPlainText } from "../components/RichText";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

function ShareIconBase({ children }: { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block" }}
    >
      {children}
    </svg>
  );
}

function FacebookIcon() {
  return (
    <ShareIconBase>
      <path
        d="M14 13.5h2.25l.75-3H14V8.75c0-.86.28-1.25 1.22-1.25H17V5h-2.3C12.4 5 11 6.3 11 8.7V10.5H9v3h2v6h3v-6Z"
        fill="currentColor"
      />
    </ShareIconBase>
  );
}

function XIcon() {
  return (
    <ShareIconBase>
      <path
        d="M18.9 3H21l-6.7 7.65L22 21h-6.8l-4.4-5.74L5.7 21H3.6l7.2-8.24L2 3h6.9l4 5.27L18.9 3Zm-1.2 16h1.16L8.28 4.9H7.05L17.7 19Z"
        fill="currentColor"
      />
    </ShareIconBase>
  );
}

function WhatsAppIcon() {
  return (
    <ShareIconBase>
      <path
        d="M12.04 2C6.5 2 2 6.39 2 11.8c0 2.11.7 4.06 1.89 5.64L3 22l4.73-1.53a10.3 10.3 0 0 0 4.31.94c5.54 0 10.04-4.39 10.04-9.8C22.08 6.39 17.58 2 12.04 2Zm0 17.62c-1.36 0-2.62-.34-3.73-.94l-.27-.15-2.8.9.9-2.67-.17-.27a7.57 7.57 0 0 1-1.2-4.07c0-4.22 3.55-7.65 7.94-7.65 4.38 0 7.94 3.43 7.94 7.65 0 4.22-3.56 7.65-7.94 7.65Zm4.64-5.73c-.25-.12-1.47-.72-1.7-.8-.23-.08-.4-.12-.57.12-.17.25-.65.8-.8.97-.15.17-.3.19-.55.06-.25-.12-1.06-.39-2.02-1.23-.75-.65-1.25-1.45-1.4-1.7-.15-.25-.02-.38.1-.5.1-.1.25-.3.37-.44.12-.15.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.57-1.35-.78-1.85-.2-.48-.4-.41-.57-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.02 2.61.12.17 1.78 2.77 4.32 3.88.6.26 1.06.41 1.42.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.23-.17-.48-.29Z"
        fill="currentColor"
      />
    </ShareIconBase>
  );
}

function EmailIcon() {
  return (
    <ShareIconBase>
      <path
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5L4 8V6l8 5 8-5v2Z"
        fill="currentColor"
      />
    </ShareIconBase>
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
  const rawExperienceLevel = String(job.experience_level ?? "").trim().toLowerCase();
  const normalizedExperienceLevel: JobUpsertPayload["experience_level"] =
    rawExperienceLevel === "intermediate"
      ? "Intermediate"
      : rawExperienceLevel === "senior"
        ? "Senior"
        : rawExperienceLevel === "lead"
          ? "Lead"
          : "Entry";

  const rawStatus = String(job.status ?? "").trim().toLowerCase();
  const normalizedStatus: JobFormState["status"] =
    rawStatus === "closed"
      ? "closed"
      : rawStatus === "draft" || rawStatus === "pending"
        ? "draft"
        : "active";

  return {
    title: String(job.title ?? ""),
    description: String(job.description ?? ""),
    company: String(job.company ?? ""),
    category: String(job.category ?? ""),
    employment_type: (job.employment_type as JobUpsertPayload["employment_type"]) || "Full-time",
    experience_level: normalizedExperienceLevel,
    location: String(job.location ?? ""),
    remote: Boolean(job.remote),
    salary_min: job.salary_min != null ? String(job.salary_min) : "",
    salary_max: job.salary_max != null ? String(job.salary_max) : "",
    application_deadline: job.application_deadline ? String(job.application_deadline).slice(0, 10) : "",
    status: normalizedStatus,
  };
}

function mapFormToPayload(form: JobFormState): JobUpsertPayload {
  return {
    title: form.title.trim(),
    description: normalizeRichTextForSave(form.description),
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
  const canApplyJob = hasPermission("APPLY_JOB");
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
  const [filterCategory, setFilterCategory] = useState("");
  const [filterEmploymentType, setFilterEmploymentType] = useState("");
  const [filterExperienceLevel, setFilterExperienceLevel] = useState("");
  const [filterRemote, setFilterRemote] = useState<"all" | "remote" | "onsite">("all");
  const [filterLocation, setFilterLocation] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [applicationCounts, setApplicationCounts] = useState<Record<string, number>>({});
  const [appliedJobIds, setAppliedJobIds] = useState<string[]>([]);
  const [pagination, setPagination] = useState(() => ({ page: 1, limit: isJobSeekerView ? 5 : 20, total: 0, pages: 0 }));
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [applyConfirmJob, setApplyConfirmJob] = useState<JobListItem | null>(null);
  const [profileIncompleteModalOpen, setProfileIncompleteModalOpen] = useState(false);
  const [updateProfileBeforeApplyJob, setUpdateProfileBeforeApplyJob] = useState<JobListItem | null>(null);
  const [applyContextJob, setApplyContextJob] = useState<JobListItem | null>(null);

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
  const [showSeekerFilters, setShowSeekerFilters] = useState(searchParams.get("browse") !== "0");
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyModalLoading, setCompanyModalLoading] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);

  useEffect(() => {
    if (!isJobSeekerView) return;
    setPagination((p) => (p.limit === 5 ? p : { ...p, limit: 5, page: 1 }));
  }, [isJobSeekerView]);

  const companyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of companies) {
      const id = String(company.id ?? "").trim();
      const name = String(company.name ?? "").trim();
      if (id && name) map.set(id, name);
    }
    return map;
  }, [companies]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of jobCategories) {
      const id = String(category.id ?? "").trim();
      const name = String(category.name ?? "").trim();
      if (id && name) map.set(id, name);
    }
    return map;
  }, [jobCategories]);

  const resolveJobCompanyName = useCallback((job: JobListItem) => {
    const direct = String(job.company ?? "").trim();
    if (direct) return direct;
    const employerCompany = String((job as any).employer_company ?? "").trim();
    if (employerCompany) return employerCompany;
    const id = String(job.company_id ?? "").trim();
    if (id) {
      const fromMap = companyNameById.get(id);
      if (fromMap) return fromMap;
    }
    return "—";
  }, [companyNameById]);

  const resolveJobCategoryName = useCallback((job: JobListItem) => {
    const direct = String(job.category ?? "").trim();
    if (direct) return direct;
    const fromCategoryName = String(job.category_name ?? "").trim();
    if (fromCategoryName) return fromCategoryName;
    const categoryId = String(job.category_id ?? "").trim();
    if (categoryId) {
      const fromMap = categoryNameById.get(categoryId);
      if (fromMap) return fromMap;
    }
    const fromSubcategory = String(job.subcategory ?? "").trim();
    if (fromSubcategory) return fromSubcategory;
    return "—";
  }, [categoryNameById]);

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
    if (!accessToken) return;
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
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || (!addInlineOpen && modalMode !== "edit")) return;
    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        const q = companyQuery.trim().toLowerCase();
        if (!q) {
          setCompanyResults([]);
          return;
        }
        const allCompanies = await listCompanies(accessToken);
        if (cancelled) return;
        const matches = allCompanies.filter((company) => String(company.name ?? "").toLowerCase().includes(q));
        setCompanyResults(matches.slice(0, 10));
      } catch {
        if (!cancelled) setCompanyResults([]);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [accessToken, addInlineOpen, modalMode, companyQuery]);

  useEffect(() => {
    if (!addInlineOpen && modalMode !== "edit") return;
    const q = categoryQuery.trim().toLowerCase();
    if (!q) {
      setCategoryResults([]);
      return;
    }
    const matches = jobCategories.filter((category) => String(category.name ?? "").toLowerCase().includes(q));
    setCategoryResults(matches.slice(0, 10));
  }, [addInlineOpen, modalMode, categoryQuery, jobCategories]);

  const load = useCallback(async (page = 1) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const effectiveStatus = isJobSeekerView ? "active" : statusFilter;
      const data = await listJobs(accessToken, {
        page,
        limit: pagination.limit,
        status: effectiveStatus || undefined,
        my_jobs: !isJobSeekerView,
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
    return jobs.filter((job) => {
      const companyName = resolveJobCompanyName(job);
      const categoryName = resolveJobCategoryName(job);
      const matchesQuery = !q || (
        String(job.title ?? "").toLowerCase().includes(q) ||
        String(companyName).toLowerCase().includes(q) ||
        String(categoryName).toLowerCase().includes(q)
      );

      if (!matchesQuery) return false;

      if (filterCategory) {
        if (String(categoryName).toLowerCase() !== filterCategory.toLowerCase()) return false;
      }

      if (filterEmploymentType) {
        if (String(job.employment_type ?? "").toLowerCase() !== filterEmploymentType.toLowerCase()) return false;
      }

      if (filterExperienceLevel) {
        if (String(job.experience_level ?? "").toLowerCase() !== filterExperienceLevel.toLowerCase()) return false;
      }

      if (filterRemote !== "all") {
        const isRemote = Boolean(job.remote);
        if (filterRemote === "remote" && !isRemote) return false;
        if (filterRemote === "onsite" && isRemote) return false;
      }

      if (filterLocation) {
        const location = String(job.location ?? "").toLowerCase();
        if (!location.includes(filterLocation.toLowerCase())) return false;
      }

      return true;
    });
  }, [filterCategory, filterEmploymentType, filterExperienceLevel, filterLocation, filterRemote, jobs, resolveJobCategoryName, resolveJobCompanyName, search]);

  const seekerFilterOptions = useMemo(() => {
    const categories = new Set<string>();
    const employmentTypes = new Set<string>();
    const experienceLevels = new Set<string>();
    const locations = new Set<string>();

    for (const job of jobs) {
      const category = resolveJobCategoryName(job);
      if (category && category !== "—") categories.add(category);
      const employmentType = String(job.employment_type ?? "").trim();
      if (employmentType) employmentTypes.add(employmentType);
      const experience = String(job.experience_level ?? "").trim();
      if (experience) experienceLevels.add(experience);
      const location = String(job.location ?? "").trim();
      if (location) locations.add(location);
    }

    const sortAlpha = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "base" });
    return {
      categories: Array.from(categories).sort(sortAlpha),
      employmentTypes: Array.from(employmentTypes).sort(sortAlpha),
      experienceLevels: Array.from(experienceLevels).sort(sortAlpha),
      locations: Array.from(locations).sort(sortAlpha),
    };
  }, [jobs, resolveJobCategoryName]);

  useEffect(() => {
    const browseParam = searchParams.get("browse");
    setShowSeekerFilters(browseParam !== "0");
  }, [searchParams]);

  const renderSeekerPager = useCallback(() => {
    return (
      <div className="publicJobsPager" role="navigation" aria-label="Jobs pagination">
        <button
          className="btn btnPrimary btnSm"
          style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
          type="button"
          onClick={() => void load(pagination.page - 1)}
          disabled={pagination.page <= 1 || loading}
        >
          {"<-"} Previous
        </button>
        <span className="publicJobsPagerInfo">
          Page {pagination.page} of {pagination.pages} ({pagination.total} jobs)
        </span>
        <button
          className="btn btnPrimary btnSm"
          style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
          type="button"
          onClick={() => void load(pagination.page + 1)}
          disabled={pagination.page >= pagination.pages || loading}
        >
          Next {"->"}
        </button>
      </div>
    );
  }, [load, loading, pagination.page, pagination.pages, pagination.total]);

  const seekerVisibleJobs = useMemo(() => {
    if (!isJobSeekerView) return visibleJobs;
    return visibleJobs.filter((job) => {
      const raw = String(job.status ?? "").toLowerCase();
      return raw === "active" || raw === "approved";
    });
  }, [isJobSeekerView, visibleJobs]);

  const jobsStatsCards = useMemo(() => {
    const displayedJobs = isJobSeekerView ? seekerVisibleJobs : visibleJobs;

    let openJobs = 0;
    let draftJobs = 0;
    let closedJobs = 0;
    let remoteJobs = 0;
    let totalApplications = 0;
    let appliedJobs = 0;

    for (const job of displayedJobs) {
      const status = String(job.status ?? "").trim().toLowerCase();
      if (status === "active" || status === "approved" || status === "open") openJobs += 1;
      else if (status === "draft" || status === "pending") draftJobs += 1;
      else if (status === "closed" || status === "inactive" || status === "expired") closedJobs += 1;

      if (Boolean(job.remote)) remoteJobs += 1;

      const applications = applicationCounts[job.id] ?? Number(job.applications_count ?? 0);
      if (Number.isFinite(applications)) totalApplications += applications;

      if (appliedJobIds.includes(job.id)) appliedJobs += 1;
    }

    if (isJobSeekerView) {
      return [
        { label: "Jobs on Page", value: displayedJobs.length },
        { label: "Open Jobs", value: openJobs },
        { label: "Remote Jobs", value: remoteJobs },
        { label: "Applied", value: appliedJobs },
        { label: "Not Applied", value: Math.max(0, displayedJobs.length - appliedJobs) },
      ];
    }

    return [
      { label: "Jobs on Page", value: displayedJobs.length },
      { label: "Open Jobs", value: openJobs },
      { label: "Draft Jobs", value: draftJobs },
      { label: "Closed Jobs", value: closedJobs },
      { label: "Applications", value: totalApplications },
    ];
  }, [appliedJobIds, applicationCounts, isJobSeekerView, seekerVisibleJobs, visibleJobs]);

  const activeCompany = useMemo(
    () => companies.find((company) => company.id === companyIdFromUrl) ?? null,
    [companies, companyIdFromUrl],
  );

  function validateForm() {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Title is required";
    if (!richTextToPlainText(form.description).trim()) next.description = "Description is required";
    if (!selectedCompany?.id) next.company = "Company is required";
    if (!selectedCategory?.id) next.category = "Category is required";
    if (!selectedSubcategory.trim()) next.subcategory = "Subcategory is required";
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
    setModalMode(null);
  }

  function openEditModal(job: JobListItem) {
    const company = companies.find((item) => String(item.id ?? "") === String(job.company_id ?? ""))
      ?? companies.find((item) => String(item.name ?? "").trim().toLowerCase() === String((job as any).company ?? (job as any).company_name ?? "").trim().toLowerCase())
      ?? null;
    const subcategoryId = String((job as any).subcategory_id ?? "").trim();

    let category = jobCategories.find((item) => String(item.id ?? "") === String(job.category_id ?? ""))
      ?? jobCategories.find((item) => String(item.name ?? "").trim().toLowerCase() === String((job as any).category ?? (job as any).category_name ?? "").trim().toLowerCase())
      ?? null;

    if (!category && subcategoryId) {
      category =
        jobCategories.find((item) =>
          (item.subcategories ?? []).some((sub) => String(sub.id ?? "") === subcategoryId),
        ) ?? null;
    }

    const resolvedSubcategoryName = (() => {
      const direct = String((job as any).subcategory ?? (job as any).subcategory_name ?? "").trim();
      if (direct) return direct;

      if (!subcategoryId) return "";

      const fromCategory = (category?.subcategories ?? []).find(
        (sub) => String(sub.id ?? "") === subcategoryId,
      );
      if (fromCategory?.name) return String(fromCategory.name);

      const fromAll = jobCategories
        .flatMap((item) => item.subcategories ?? [])
        .find((sub) => String(sub.id ?? "") === subcategoryId);
      return fromAll?.name ? String(fromAll.name) : "";
    })();

    setEditJobId(job.id);
    setForm(mapJobToForm(job));
    setFormErrors({});
    setAddInlineOpen(false);
    setSelectedCompany(company);
    setSelectedCategory(category);
    setSelectedSubcategory(resolvedSubcategoryName);
    setCompanyQuery(company?.name ?? String((job as any).company ?? (job as any).company_name ?? ""));
    setCategoryQuery(category?.name ?? String((job as any).category ?? (job as any).category_name ?? ""));
    setModalMode("edit");
  }

  async function onSaveModal() {
    if (!accessToken || modalMode !== "edit") return;
    if (!canCreate) return;
    if (!validateForm()) return;
    try {
      setSaving(true);
      setError(null);
      const payload = {
        ...mapFormToPayload(form),
        company: selectedCompany?.name ?? form.company,
        company_id: selectedCompany?.id,
        category: selectedCategory?.name ?? form.category,
        category_id: selectedCategory?.id,
        subcategory: selectedSubcategory.trim(),
      };
      if (editJobId) {
        await updateJob(accessToken, editJobId, payload);
        setSuccess("Job updated successfully");
      }
      setModalMode(null);
      setEditJobId(null);
      setSelectedCompany(null);
      setSelectedCategory(null);
      setSelectedSubcategory("");
      setCompanyQuery("");
      setCategoryQuery("");
      await load(pagination.page);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to save job");
    } finally {
      setSaving(false);
    }
  }

  async function onCreateInlineJob() {
    if (!accessToken || !canCreate) return;
    const plainDescription = richTextToPlainText(form.description).trim();
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

    const company = selectedCompany;
    const category = selectedCategory;
    if (!company?.id || !category?.id) return;

    try {
      setSaving(true);
      setError(null);
      await createJob(accessToken, {
        title: form.title.trim(),
        description: normalizeRichTextForSave(form.description) || plainDescription,
        company: company.name,
        company_id: company.id,
        category: category.name,
        category_id: category.id,
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
      await load(1);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to create job");
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

  function renderEditDropForm() {
    return (
      <div className="dropPanel" style={{ marginTop: 12, marginBottom: 4 }}>
        <div className="editForm">
          <h2 className="editFormTitle">Edit Job</h2>
          <div className="editGrid">
            <Field label="Title" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} error={formErrors.title} />
            <div className="field">
              <label className="fieldLabel">Company</label>
              <input className={`input${formErrors.company ? " inputError" : ""}`} value={companyQuery} onChange={(e) => { setCompanyQuery(e.target.value); setSelectedCompany(null); }} placeholder="Type company name to search..." />
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
              <input className={`input${formErrors.category ? " inputError" : ""}`} value={categoryQuery} onChange={(e) => { setCategoryQuery(e.target.value); setSelectedCategory(null); setSelectedSubcategory(""); }} placeholder="Type category name to search..." />
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
              <select className={`input${formErrors.subcategory ? " inputError" : ""}`} value={selectedSubcategory} onChange={(e) => setSelectedSubcategory(e.target.value)} disabled={!selectedCategory}>
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
              <RichTextEditor
                value={form.description}
                onChange={(html) => setForm((p) => ({ ...p, description: html }))}
                disabled={saving}
                placeholder="Type job description…"
              />
              {formErrors.description && <span className="fieldError">{formErrors.description}</span>}
            </div>
          </div>
          <div className="stepperActions">
            <button className="btn btnGhost" type="button" onClick={() => {
              setModalMode(null);
              setEditJobId(null);
              setSelectedCompany(null);
              setSelectedCategory(null);
              setSelectedSubcategory("");
              setCompanyQuery("");
              setCategoryQuery("");
            }} disabled={saving}>Cancel</button>
            <button className="btn btnGhost btnSm stepperSaveBtn" type="button" onClick={onSaveModal} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>
      </div>
    );
  }

  function getApplyProfileCompleteness(
    profile: Awaited<ReturnType<typeof getJobSeekerFullProfile>>,
    hasCv: boolean,
  ) {
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
    const idDocumentUrl = String(
      details?.id_document_url ?? details?.idDocumentUrl ?? "",
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
    if (!idDocumentUrl) reasons.push("missing identification document (id_document_url or idDocumentUrl)");
    if (!Array.isArray(education) || education.length < 1) {
      reasons.push("education array missing or empty");
    }
    if (Array.isArray(education) && education.some((item: any) => !String(item?.certificate_url ?? item?.certificateUrl ?? "").trim())) {
      reasons.push("education evidence missing for one or more entries");
    }
    if (!hasCv) {
      reasons.push("CV missing");
    }

    return {
      complete: reasons.length === 0,
      reasons,
      debug: {
        rootKeys: Object.keys(profileObj),
        detailsKeys: details ? Object.keys(details) : [],
        educationCount: Array.isArray(education) ? education.length : 0,
        idDocumentUrl,
        hasCv,
        firstName,
        lastName,
      },
    };
  }

  async function onApplyClick(job: JobListItem) {
    if (!accessToken || !canApplyJob) return;
    try {
      setApplyContextJob(job);
      setSaving(true);
      setError(null);
      const [profile, resumes] = await Promise.all([
        getJobSeekerFullProfile(accessToken),
        listJobSeekerResumes(accessToken),
      ]);
      console.log("[JobsPage] /job-seeker/full-profile response:", profile);
      const hasCv = Boolean(resumes.primary_resume || (Array.isArray(resumes.resumes) && resumes.resumes.length > 0));
      const completeness = getApplyProfileCompleteness(profile, hasCv);
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

  function onStartApply(job: JobListItem) {
    setUpdateProfileBeforeApplyJob(job);
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
      const byId = id
        ? companies.find((item) => String(item.id ?? "").trim() === id)
        : undefined;
      const byName = companies.find(
        (item) =>
          String(item.name ?? "").trim().toLowerCase() ===
          String(job.company ?? "").trim().toLowerCase(),
      );

      if (isJobSeekerView) {
        try {
          const publicCompany = await getPublicCompany(String(job.id));
          setCompanyDetails(publicCompany);
          return;
        } catch {
          // Fallback to local/search-based company details.
        }

        const local = byId ?? byName;
        if (local) {
          setCompanyDetails(local);
          return;
        }

        const refreshed = await listCompanies(accessToken);
        const refreshedList = Array.isArray(refreshed) ? refreshed : [];
        const refreshedMatch =
          (id
            ? refreshedList.find((item) => String(item.id ?? "").trim() === id)
            : undefined) ??
          refreshedList.find(
            (item) =>
              String(item.name ?? "").trim().toLowerCase() ===
              String(job.company ?? "").trim().toLowerCase(),
          );

        if (refreshedMatch) {
          setCompanyDetails(refreshedMatch);
        } else {
          setError("Company details are not available for this job.");
        }

        return;
      }

      if (id) {
        const company = await getCompany(accessToken, id);
        setCompanyDetails(company);
        return;
      }

      const fallback = byName;
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
                <input className={`input${formErrors.company ? " inputError" : ""}`} value={companyQuery} onChange={(e) => { setCompanyQuery(e.target.value); setSelectedCompany(null); }} placeholder="Type company name to search..." />
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
                <input className={`input${formErrors.category ? " inputError" : ""}`} value={categoryQuery} onChange={(e) => { setCategoryQuery(e.target.value); setSelectedCategory(null); setSelectedSubcategory(""); }} placeholder="Type category name to search..." />
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
                <select className={`input${formErrors.subcategory ? " inputError" : ""}`} value={selectedSubcategory} onChange={(e) => setSelectedSubcategory(e.target.value)} disabled={!selectedCategory}>
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
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => setForm((p) => ({ ...p, description: html }))}
                  disabled={saving}
                  placeholder="Type job description…"
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

      <div className="statsCardsGrid" role="region" aria-label="Jobs statistics">
        {jobsStatsCards.map((card, idx) => {
          const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
          return (
            <div key={card.label} className={`dashCard statsCard ${toneClass}`}>
              <div className="readLabel">{card.label}</div>
              <div className="statsCardValue">{card.value}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 260, flex: "1 1 480px", display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          {isJobSeekerView ? (
            <button
              type="button"
              className="btn btnGhost btnSm"
              onClick={() => {
                const nextOpen = !showSeekerFilters;
                setShowSeekerFilters(nextOpen);
                const next = new URLSearchParams(searchParams);
                if (nextOpen) next.set("browse", "1");
                else next.delete("browse");
                setSearchParams(next, { replace: true });
              }}
            >
              Browse Jobs
            </button>
          ) : null}

          {!isJobSeekerView ? (
            <div style={{ minWidth: 240, flex: "1 1 280px" }}>
              <label className="fieldLabel">Search</label>
              <input
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title/company/category..."
              />
            </div>
          ) : null}

          {!isJobSeekerView ? (
            <div style={{ minWidth: 160 }}>
              <label className="fieldLabel">Status</label>
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          ) : null}
        </div>

        {!isJobSeekerView ? <div style={{ width: "100%" }}>{renderSeekerPager()}</div> : null}
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

        {isJobSeekerView ? (
          <>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {showSeekerFilters ? (
              <div className="dashCard" style={{ width: 280, flex: "0 0 280px" }}>
                <div className="dashCardHeader" style={{ marginBottom: 8 }}>
                  <h2 className="dashCardTitle" style={{ fontSize: 16 }}>Filters</h2>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="fieldLabel">Search</label>
                    <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Title, company, category..." />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="fieldLabel">Category</label>
                    <select className="input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                      <option value="">All Categories</option>
                      {seekerFilterOptions.categories.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="fieldLabel">Employment Type</label>
                    <select className="input" value={filterEmploymentType} onChange={(e) => setFilterEmploymentType(e.target.value)}>
                      <option value="">All Employment Types</option>
                      {seekerFilterOptions.employmentTypes.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="fieldLabel">Experience Level</label>
                    <select className="input" value={filterExperienceLevel} onChange={(e) => setFilterExperienceLevel(e.target.value)}>
                      <option value="">All Experience Levels</option>
                      {seekerFilterOptions.experienceLevels.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="fieldLabel">Remote</label>
                    <select className="input" value={filterRemote} onChange={(e) => setFilterRemote(e.target.value as "all" | "remote" | "onsite")}>
                      <option value="all">All</option>
                      <option value="remote">Remote</option>
                      <option value="onsite">On Site</option>
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="fieldLabel">Location</label>
                    <select className="input" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
                      <option value="">All Locations</option>
                      {seekerFilterOptions.locations.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btnGhost btnSm"
                    onClick={() => {
                      setSearch("");
                      setFilterCategory("");
                      setFilterEmploymentType("");
                      setFilterExperienceLevel("");
                      setFilterRemote("all");
                      setFilterLocation("");
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>
            ) : null}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: 12 }}>
              {renderSeekerPager()}
            </div>
          <div className="jobCardsGrid" role="region" aria-label="Jobs cards" style={{ minWidth: 0 }}>
            {seekerVisibleJobs.length === 0 ? (
              <div className="dashCard jobCardsGridItem jobCardToneA"><div className="emptyState">No jobs found.</div></div>
            ) : (
              seekerVisibleJobs.map((job, idx) => {
                const alreadyApplied = appliedJobIds.includes(job.id);
                const isOpen = openJobId === job.id;
                const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
                const companyName = resolveJobCompanyName(job);
                const categoryName = resolveJobCategoryName(job);

                const shareBaseUrl =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/jobs/${encodeURIComponent(String(job.id))}`
                    : `/jobs/${encodeURIComponent(String(job.id))}`;
                const shareText = `${job.title}${companyName ? ` - ${companyName}` : ""}`;
                const facebookShareHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareBaseUrl)}&quote=${encodeURIComponent(shareText)}`;
                const xShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareBaseUrl)}`;
                const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareBaseUrl}`)}`;
                const emailShareHref = `mailto:?subject=${encodeURIComponent(`Job: ${shareText}`)}&body=${encodeURIComponent(`Check out this job: ${shareBaseUrl}`)}`;

                return (
                  <div key={job.id} className={`dashCard jobCardsGridItem ${toneClass}`}>
                    <div className="dashCardHeader" style={{ marginBottom: 6 }}>
                      <h2 className="dashCardTitle" style={{ fontSize: 15 }}>{job.title}</h2>
                      {null}
                    </div>

                    <div className="profileReadGrid" style={{ marginTop: 6 }}>
                      <div className="readField">
                        <span className="readLabel">Company</span>
                        <span className="readValue">
                          <button
                            type="button"
                            className="linkBtn"
                            onClick={() => void onOpenCompanyInfo(job)}
                            disabled={saving}
                          >
                            {companyName}
                          </button>
                        </span>
                      </div>
                      <ReadField label="Category" value={categoryName} />
                      <ReadField label="Location" value={job.location ?? "—"} />
                      <ReadField label="Remote" value={job.remote ? "Yes" : "No"} />
                      <ReadField
                        label="Due Date"
                        value={job.application_deadline ? new Date(job.application_deadline).toLocaleDateString("en-GB") : "—"}
                      />
                      <ReadField label="Salary Range" value={`${job.salary_min ?? "—"} - ${job.salary_max ?? "—"}`} />
                    </div>

                    <div
                      style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, flexWrap: "wrap", alignItems: "center" }}
                    >
                      <span className="muted" style={{ fontSize: 12, marginRight: 2 }}>
                        Share on
                      </span>
                      <a
                        className="btn btnGhost btnSm"
                        href={facebookShareHref}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Share on Facebook"
                        title="Share on Facebook"
                        style={{ color: "var(--menu-icon-active)" }}
                      >
                        <FacebookIcon />
                      </a>
                      <a
                        className="btn btnGhost btnSm"
                        href={xShareHref}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Share on X"
                        title="Share on X"
                        style={{ color: "var(--text)" }}
                      >
                        <XIcon />
                      </a>
                      <a
                        className="btn btnGhost btnSm"
                        href={whatsappShareHref}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Share on WhatsApp"
                        title="Share on WhatsApp"
                        style={{ color: "#166534" }}
                      >
                        <WhatsAppIcon />
                      </a>
                      <a
                        className="btn btnGhost btnSm"
                        href={emailShareHref}
                        aria-label="Share via Email"
                        title="Share via Email"
                        style={{ color: "var(--text)" }}
                      >
                        <EmailIcon />
                      </a>
                      {canApplyJob ? (
                        <button
                          type="button"
                          className={alreadyApplied ? "btn btnSm jobActionBtn jobActionBtnApplied" : "btn btnPrimary btnSm jobActionBtn"}
                          onClick={() => onStartApply(job)}
                          disabled={saving || alreadyApplied}
                        >
                          {alreadyApplied ? "Applied" : "Apply"}
                        </button>
                      ) : null}
                      {!isOpen ? (
                        <button
                          type="button"
                          className="btn btnSm jobActionBtn jobActionBtnDetails"
                          onClick={() => setOpenJobId((prev) => (prev === job.id ? null : job.id))}
                          disabled={saving}
                        >
                          View Details
                        </button>
                      ) : null}
                    </div>

                    {isOpen && (
                      <div className="dropPanel" style={{ marginTop: 10 }}>
                        <div className="profileReadGrid">
                          <ReadField label="Employment Type" value={job.employment_type ?? "—"} />
                          <ReadField label="Experience Level" value={job.experience_level ?? "—"} />
                          <ReadField label="Status" value={job.status ?? "—"} />
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <span className="readLabel">Description</span>
                          <RichTextView value={job.description} className="readValue" />
                        </div>
                        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                          {canApplyJob ? (
                            <button
                              type="button"
                              className={alreadyApplied ? "btn btnSm jobActionBtn jobActionBtnApplied" : "btn btnPrimary btnSm jobActionBtn"}
                              onClick={() => onStartApply(job)}
                              disabled={saving || alreadyApplied}
                            >
                              {alreadyApplied ? "Applied" : "Apply"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn btnSm jobActionBtn jobActionBtnDetails"
                            onClick={() => setOpenJobId((prev) => (prev === job.id ? null : job.id))}
                            disabled={saving}
                          >
                            Hide Details
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
            <div style={{ marginTop: 16 }}>
              {renderSeekerPager()}
            </div>
          </div>
          </div>
          </>
        ) : (
          <div className="jobCardsGrid" role="region" aria-label="Jobs cards">
            {visibleJobs.length === 0 ? (
              <div className="dashCard jobCardsGridItem jobCardToneA"><div className="emptyState">No jobs found.</div></div>
            ) : (
              visibleJobs.map((job, idx) => {
                const applications = applicationCounts[job.id] ?? Number(job.applications_count ?? 0);
                const canManageThisJob = canCreate && (canManageAllJobs || isOwnJob(job));
                const companyName = resolveJobCompanyName(job);
                const categoryName = resolveJobCategoryName(job);
                const isOpen = openJobId === job.id;
                const alreadyApplied = appliedJobIds.includes(job.id);
                const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";

                return (
                  <article key={job.id} className={`dashCard jobCardsGridItem ${toneClass}`}>
                    <div className="dashCardHeader" style={{ marginBottom: 6 }}>
                      <div>
                        <h2 className="dashCardTitle" style={{ fontSize: 15 }}>{job.title}</h2>
                      </div>
                      {null}
                    </div>

                    <div className="profileReadGrid" style={{ marginTop: 6 }}>
                      <ReadField label="Company" value={companyName} />
                      <ReadField label="Category" value={categoryName} />
                      <ReadField label="Location" value={job.location ?? "—"} />
                      <ReadField label="Status" value={job.status ?? "—"} />
                      <ReadField
                        label="Due Date"
                        value={job.application_deadline ? new Date(job.application_deadline).toLocaleDateString("en-GB") : "—"}
                      />
                      {canViewApplications ? <ReadField label="Applications" value={applications} /> : null}
                    </div>

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
                      {canApplyJob ? (
                        <button
                          type="button"
                          className={alreadyApplied ? "btn btnSm jobActionBtn jobActionBtnApplied" : "btn btnPrimary btnSm jobActionBtn"}
                          onClick={() => onStartApply(job)}
                          disabled={saving || alreadyApplied}
                        >
                          {alreadyApplied ? "Applied" : "Apply"}
                        </button>
                      ) : null}
                      {!isOpen ? (
                        <button
                          type="button"
                          className="btn btnSm jobActionBtn jobActionBtnDetails"
                          onClick={() => setOpenJobId((prev) => (prev === job.id ? null : job.id))}
                          disabled={saving}
                        >
                          View Details
                        </button>
                      ) : null}
                      {canManageThisJob ? (
                        <button
                          type="button"
                          className="btn btnGhost btnSm"
                          onClick={() => openEditModal(job)}
                          disabled={saving}
                        >
                          Edit
                        </button>
                      ) : null}
                      {canManageThisJob ? (
                        <button
                          type="button"
                          className="btn btnGhost btnSm"
                          onClick={() => setConfirmDeleteId(job.id)}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      ) : null}
                      {canViewApplications ? (
                        <button
                          type="button"
                          className="btn btnGhost btnSm stepperSaveBtn"
                          onClick={() => navigate(`/app/jobs/${job.id}/applications`)}
                          disabled={saving}
                        >
                          Applications ({applications})
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="btn btnGhost btnSm"
                        onClick={() => navigate(`/app/audit?target_type=job&target_id=${encodeURIComponent(job.id)}`)}
                        disabled={saving}
                      >
                        Audit
                      </button>
                    </div>

                    {isOpen ? (
                      <div className="dropPanel" style={{ marginTop: 12 }}>
                        <h2 className="editFormTitle">Job Details</h2>
                        <div className="profileReadGrid">
                          <ReadField label="Title" value={job.title} />
                          <ReadField label="Company" value={companyName} />
                          <ReadField label="Category" value={categoryName} />
                          <ReadField label="Employment Type" value={job.employment_type} />
                          <ReadField label="Experience Level" value={job.experience_level} />
                          <ReadField label="Location" value={job.location} />
                          <ReadField label="Remote" value={job.remote ? "Yes" : "No"} />
                          <ReadField label="Salary Range" value={`${job.salary_min ?? "—"} - ${job.salary_max ?? "—"}`} />
                          <ReadField label="Deadline" value={job.application_deadline ? new Date(job.application_deadline).toLocaleString("en-GB") : "—"} />
                          <ReadField label="Status" value={job.status} />
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <span className="readLabel">Description</span>
                          <RichTextView value={job.description} className="readValue" />
                        </div>
                        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                          {canApplyJob ? (
                            <button
                              type="button"
                              className={alreadyApplied ? "btn btnSm jobActionBtn jobActionBtnApplied" : "btn btnPrimary btnSm jobActionBtn"}
                              onClick={() => onStartApply(job)}
                              disabled={saving || alreadyApplied}
                              style={{ marginRight: 8 }}
                            >
                              {alreadyApplied ? "Applied" : "Apply"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="btn btnSm jobActionBtn jobActionBtnDetails"
                            onClick={() => setOpenJobId((prev) => (prev === job.id ? null : job.id))}
                            disabled={saving}
                          >
                            Hide Details
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {modalMode === "edit" && editJobId === job.id ? renderEditDropForm() : null}
                  </article>
                );
              })
            )}
          </div>
        )}

      {!isJobSeekerView ? (
        <div style={{ marginTop: 16 }}>
          {renderSeekerPager()}
        </div>
      ) : null}

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
              Your profile is incomplete. Please fill in your personal details, add at least one education
              record, and upload your CV before applying.
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
                onClick={() => navigate("/app/my-profile", { state: { pendingJob: applyContextJob } })}
              >
                Go to Profile
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {updateProfileBeforeApplyJob ? (
        <div
          className="modalOverlay"
          role="presentation"
          onMouseDown={() => !saving && setUpdateProfileBeforeApplyJob(null)}
        >
          <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Update Profile?</div>
            <div className="modalMessage">
              Would you like to update your profile before applying for{" "}
              <strong>{updateProfileBeforeApplyJob.title}</strong>?
            </div>
            <div className="modalActions">
              <button
                className="btn btnGhost"
                type="button"
                onClick={() => setUpdateProfileBeforeApplyJob(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn btnGhost"
                type="button"
                onClick={() => {
                  const job = updateProfileBeforeApplyJob;
                  setUpdateProfileBeforeApplyJob(null);
                  void onApplyClick(job);
                }}
                disabled={saving}
              >
                No, apply now
              </button>
              <button
                className="btn btnGhost btnSm stepperSaveBtn"
                type="button"
                onClick={() => {
                  const job = updateProfileBeforeApplyJob;
                  setUpdateProfileBeforeApplyJob(null);
                  navigate("/app/my-profile", { state: { pendingJob: job } });
                }}
                disabled={saving}
              >
                Yes, update profile
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
      <input className={`input${error ? " inputError" : ""}`} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
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
