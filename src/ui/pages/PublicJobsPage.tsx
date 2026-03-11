import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  applyToJob,
  type Company,
  getPublicCompany,
  getPublicCompanyById,
  getJobSeekerFullProfile,
  listJobSeekerResumes,
  getPublicSystemSettings,
  getPublicJob,
  listMyApplications,
  listPublicJobCategories,
  listPublicJobs,
  me,
  type JobListItem,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { applyAppThemeColor } from "../utils/themeColor";
import { RichTextView } from "../components/RichText";

const THEME_KEY = "hrs-theme";

function getStoredTheme(): "light" | "dark" {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // ignore
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function ReadField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="readField">
      <span className="readLabel">{label}</span>
      <span className="readValue">{value}</span>
    </div>
  );
}

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

type ProfileCompleteness = {
  complete: boolean;
  reasons: string[];
};

function getApplyProfileCompleteness(profile: any, hasCv: boolean): ProfileCompleteness {
  const reasons: string[] = [];

  const personal = profile?.personal_details ?? profile?.personalDetails ?? profile?.personal_details?.[0] ?? null;
  const firstName = String(personal?.first_name ?? personal?.firstName ?? "").trim();
  const lastName = String(personal?.last_name ?? personal?.lastName ?? "").trim();
  const idDocumentUrl = String(personal?.id_document_url ?? personal?.idDocumentUrl ?? "").trim();
  if (!firstName) reasons.push("Missing first name");
  if (!lastName) reasons.push("Missing last name");
  if (!idDocumentUrl) reasons.push("Missing identification document");

  const addresses = Array.isArray(profile?.addresses) ? profile.addresses : [];
  if (addresses.length === 0) reasons.push("Missing address");

  const education = Array.isArray(profile?.education) ? profile.education : [];
  if (education.length === 0) reasons.push("Missing education");
  if (education.some((item: any) => !String(item?.certificate_url ?? item?.certificateUrl ?? "").trim())) {
    reasons.push("Missing qualification evidence for one or more education records");
  }

  if (!hasCv) reasons.push("Missing CV");

  const references = Array.isArray(profile?.references) ? profile.references : [];
  if (references.length === 0) reasons.push("Missing references");

  return { complete: reasons.length === 0, reasons };
}

export function PublicJobsPage() {
  const { accessToken, logout, userName, userEmail } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const { jobId } = useParams();

  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

  const [systemName, setSystemName] = useState<string>("");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string>("");
  const [brandingLogoFailed, setBrandingLogoFailed] = useState(false);

  const mainCompanyBrandingLogoUrl = useCallback((mainCompanyId: unknown): string => {
    const id = String(mainCompanyId ?? "").trim();
    if (!id) return "";

    const apiBase = String(import.meta.env.VITE_API_URL ?? "").trim();
    if (!apiBase) return "";

    const normalizedBase = apiBase.replace(/\/$/, "");
    return `${normalizedBase}/api/v1/public/companies/${encodeURIComponent(id)}/logo`;
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(5);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, pages: 1 });
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterEmploymentType, setFilterEmploymentType] = useState<string>("");
  const [filterExperienceLevel, setFilterExperienceLevel] = useState<string>("");
  const [filterRemote, setFilterRemote] = useState<"all" | "remote" | "onsite" | "hybrid">("all");
  const [filterLocation, setFilterLocation] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [updateProfileBeforeApplyJob, setUpdateProfileBeforeApplyJob] = useState<JobListItem | null>(null);
  const [applyConfirmJob, setApplyConfirmJob] = useState<JobListItem | null>(null);
  const [profileIncompleteModalOpen, setProfileIncompleteModalOpen] = useState(false);
  const [applyContextJob, setApplyContextJob] = useState<JobListItem | null>(null);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyModalLoading, setCompanyModalLoading] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(getStoredTheme);
  const [dbUserDisplayName, setDbUserDisplayName] = useState("");

  const displayName = useMemo(() => {
    const dbName = String(dbUserDisplayName ?? "").trim();
    if (dbName) return dbName;

    const name = String(userName ?? "").trim();
    if (name) return name;
    return String(userEmail ?? "").trim();
  }, [dbUserDisplayName, userEmail, userName]);

  useEffect(() => {
    if (!accessToken) {
      setDbUserDisplayName("");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const session = await me(accessToken);
        if (cancelled) return;
        const user = (session as any)?.user ?? {};
        const first = String(user?.first_name ?? "").trim();
        const last = String(user?.last_name ?? "").trim();
        const fullName = [first, last].filter(Boolean).join(" ").trim();
        setDbUserDisplayName(fullName);
      } catch {
        if (cancelled) return;
        setDbUserDisplayName("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const displayNameInitials = useMemo(() => {
    const base = String(displayName ?? "").trim();
    if (!base) return "U";
    const words = base.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
    }
    const compact = base.replace(/[^a-zA-Z0-9]/g, "");
    if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
    return compact.slice(0, 1).toUpperCase() || "U";
  }, [displayName]);

  const pageName = useMemo(() => {
    const rawJobId = String(jobId ?? "").trim();
    if (!rawJobId) return "Jobs";
    const job = jobs.find((item) => String(item?.id) === rawJobId);
    const title = String((job as any)?.title ?? "").trim();
    return title || "Jobs";
  }, [jobId, jobs]);

  useEffect(() => {
    const name = String(systemName ?? "").trim();
    const page = String(pageName ?? "").trim();
    if (name) {
      document.title = page ? `${name} | ${page}` : name;
      return;
    }
    document.title = page;
  }, [pageName, systemName]);

  useEffect(() => {
    const raw = String(brandingLogoUrl ?? "").trim();
    if (!raw) return;

    const apiBase = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
    const href = /^(https?:\/\/|data:)/i.test(raw)
      ? raw
      : apiBase
        ? `${apiBase}${raw.startsWith("/") ? raw : `/${raw}`}`
        : raw;

    const link =
      (document.querySelector('link[rel="icon"]') as HTMLLinkElement | null) ??
      (document.querySelector('link[rel~="icon"]') as HTMLLinkElement | null);

    if (link) {
      link.href = href;
      return;
    }

    const created = document.createElement("link");
    created.rel = "icon";
    created.href = href;
    document.head.appendChild(created);
  }, [brandingLogoUrl]);

  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [categoryNameById, setCategoryNameById] = useState<Record<string, string>>({});

  const canApplyJob = Boolean(accessToken) && hasPermission("APPLY_JOB");

  useEffect(() => {
    let cancelled = false;
    const loadBranding = async () => {
      try {
        const settings = await getPublicSystemSettings();
        if (cancelled) return;
        const mainCompanyId = String(settings.main_company_id ?? "").trim();
        if (mainCompanyId) {
          try {
            const company = await getPublicCompanyById(mainCompanyId);
            if (!cancelled) {
              const companyName = String(company?.name ?? "").trim();
              setSystemName(companyName);
            }
          } catch {
            if (!cancelled) {
              setSystemName("");
            }
          }
        } else {
          setSystemName("");
        }
        setBrandingLogoUrl(
          mainCompanyBrandingLogoUrl(settings.main_company_id) || String(settings.branding_logo_url ?? ""),
        );
        applyAppThemeColor(settings.app_color);
        setBrandingLogoFailed(false);
      } catch {
        if (cancelled) return;
        setSystemName("");
        setBrandingLogoUrl("");
        applyAppThemeColor("#6b7280");
        setBrandingLogoFailed(false);
      }
    };

    void loadBranding();
    return () => {
      cancelled = true;
    };
  }, []);

  const resolvedBrandingLogoSrc = useMemo(() => {
    if (brandingLogoFailed) return "/hito-logo.png";
    const raw = String(brandingLogoUrl ?? "").trim();
    if (!raw) return "/hito-logo.png";

    if (/^(https?:\/\/|data:)/i.test(raw)) return raw;

    const apiBase = String(import.meta.env.VITE_API_URL ?? "").trim();
    if (!apiBase) return raw;

    const normalizedBase = apiBase.replace(/\/$/, "");
    const normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
    return `${normalizedBase}${normalizedPath}`;
  }, [brandingLogoFailed, brandingLogoUrl]);

  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      try {
        const data = await listPublicJobCategories();
        const list = Array.isArray(data?.categories) ? data.categories : [];
        const idToName: Record<string, string> = {};
        for (const category of list) {
          const id = String((category as any)?.id ?? "").trim();
          const name = String((category as any)?.name ?? "").trim();
          if (id && name) idToName[id] = name;
        }
        const names = list
          .map((c) => String((c as any)?.name ?? "").trim())
          .filter(Boolean);
        const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
        if (!cancelled) {
          setCategoryOptions(unique);
          setCategoryNameById(idToName);
        }
      } catch {
        if (!cancelled) {
          setCategoryOptions([]);
          setCategoryNameById({});
        }
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async (page = 1, limitOverride?: number) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const search = filterSearch.trim();
      const limitToUse = Number.isFinite(Number(limitOverride)) && Number(limitOverride) > 0
        ? Number(limitOverride)
        : pageSize;
      const data = await listPublicJobs({ page, limit: limitToUse, search: search || undefined });
      const base = Array.isArray(data.jobs) ? data.jobs : [];
      const total = Number(data.pagination?.total ?? base.length);
      const limit = Number(data.pagination?.limit ?? limitToUse);
      setPagination({
        page: Number(data.pagination?.page ?? page),
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      });

      if (jobId) {
        const job = await getPublicJob(String(jobId));
        const id = String(job.id);
        setOpenJobId(id);
        setJobs(() => {
          const list = base.length ? base : [];
          const existingIdx = list.findIndex((j) => String(j.id) === id);
          let next = list;
          if (existingIdx >= 0) {
            next = [...list];
            next[existingIdx] = { ...next[existingIdx], ...job };
          } else {
            next = [job, ...list];
          }
          return next.slice(0, limitToUse);
        });
      } else {
        setOpenJobId(null);
        setJobs(base.slice(0, limitToUse));
      }
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [filterSearch, jobId, pageSize]);

  useEffect(() => {
    void load(1);
  }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setShowBackToTop(window.scrollY > 260);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const renderPager = useCallback(() => {
    return (
      <div className="publicJobsPager" role="navigation" aria-label="Jobs pagination">
        <label className="publicJobsPagerSelect">
          Records
          <select
            className="input"
            value={String(pageSize)}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next) || next <= 0) return;
              setPageSize(next);
              void load(1, next);
            }}
            disabled={loading || saving}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <button
          className="btn btnPrimary btnSm"
          style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
          type="button"
          onClick={() => void load(pagination.page - 1)}
          disabled={pagination.page <= 1 || loading || saving}
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
          disabled={pagination.page >= pagination.pages || loading || saving}
        >
          Next {"->"}
        </button>
      </div>
    );
  }, [PAGE_SIZE_OPTIONS, load, loading, pageSize, pagination.page, pagination.pages, pagination.total, saving]);

  useEffect(() => {
    if (!jobId) return;
    const params = new URLSearchParams(location.search);
    const wantsApply = params.get("apply") === "1";
    if (!wantsApply) return;
    if (!accessToken || permissionsLoading) return;
    if (!canApplyJob) return;

    setOpenJobId(String(jobId));
    const target = jobs.find((j) => String(j.id) === String(jobId));
    if (target) void onStartApply(target);
    params.delete("apply");
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
  }, [accessToken, canApplyJob, jobId, jobs, location.pathname, location.search, navigate, onStartApply, permissionsLoading]);

  useEffect(() => {
    if (!accessToken || permissionsLoading || !canApplyJob) {
      setAppliedJobIds(new Set());
      return;
    }

    let cancelled = false;
    const loadAppliedJobs = async () => {
      try {
        const ids = new Set<string>();
        let page = 1;
        let totalPages = 1;

        do {
          const response = await listMyApplications(accessToken, {
            page,
            limit: 100,
            sort: "newest",
          });

          const rows = Array.isArray(response?.applications) ? response.applications : [];
          for (const row of rows) {
            const id = String(row?.job_id ?? "").trim();
            if (id) ids.add(id);
          }

          const nextTotalPages = Number(response?.pagination?.pages ?? 1);
          totalPages = Number.isFinite(nextTotalPages) && nextTotalPages > 0 ? nextTotalPages : 1;
          page += 1;
        } while (page <= totalPages);

        if (!cancelled) {
          setAppliedJobIds(ids);
        }
      } catch {
        if (!cancelled) {
          setAppliedJobIds(new Set());
        }
      }
    };

    void loadAppliedJobs();
    return () => {
      cancelled = true;
    };
  }, [accessToken, canApplyJob, permissionsLoading]);

  async function onApplyClick(job: JobListItem) {
    if (!accessToken) {
      const next = `/jobs/${encodeURIComponent(String(job.id))}?apply=1`;
      navigate("/login", { replace: true, state: { from: next } });
      return;
    }

    if (!canApplyJob) {
      setError("Insufficient permissions. Required permission: APPLY_JOB.");
      return;
    }

    try {
      setApplyContextJob(job);
      setSaving(true);
      setError(null);
      const [profile, resumes] = await Promise.all([
        getJobSeekerFullProfile(accessToken),
        listJobSeekerResumes(accessToken),
      ]);
      const hasCv = Boolean(resumes.primary_resume || (Array.isArray(resumes.resumes) && resumes.resumes.length > 0));
      const completeness = getApplyProfileCompleteness(profile, hasCv);
      if (!completeness.complete) {
        setProfileIncompleteModalOpen(true);
        return;
      }
      setApplyConfirmJob(job);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to validate profile completeness");
    } finally {
      setSaving(false);
    }
  }

  async function onStartApply(job: JobListItem) {
    if (!accessToken) return;

    try {
      setApplyContextJob(job);
      setSaving(true);
      setError(null);
      const [profile, resumes] = await Promise.all([
        getJobSeekerFullProfile(accessToken),
        listJobSeekerResumes(accessToken),
      ]);
      const hasCv = Boolean(resumes.primary_resume || (Array.isArray(resumes.resumes) && resumes.resumes.length > 0));
      const completeness = getApplyProfileCompleteness(profile, hasCv);
      if (!completeness.complete) {
        setProfileIncompleteModalOpen(true);
        return;
      }
      setUpdateProfileBeforeApplyJob(job);
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
      setAppliedJobIds((prev) => {
        const next = new Set(prev);
        next.add(String(applyConfirmJob.id));
        return next;
      });
      setSuccess(`Application submitted for "${applyConfirmJob.title}".`);
      setApplyConfirmJob(null);
    } catch (e) {
      const message = String((e as Error)?.message ?? "").trim();
      setError(message || "Failed to apply for job");
    } finally {
      setSaving(false);
    }
  }

  async function onOpenCompanyInfo(job: JobListItem) {
    try {
      setCompanyModalOpen(true);
      setCompanyModalLoading(true);
      setCompanyDetails(null);
      setError(null);
      const company = await getPublicCompany(String(job.id));
      setCompanyDetails(company);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load company details");
    } finally {
      setCompanyModalLoading(false);
    }
  }

  const resolvePublicJobCompanyName = useCallback((job: JobListItem) => {
    const fromCompanyName = String((job as any).company_name ?? (job as any).companyName ?? "").replace(/\s+/g, " ").trim();
    if (fromCompanyName) return fromCompanyName;
    const direct = String(job.company ?? "").replace(/\s+/g, " ").trim();
    if (direct) return direct;
    const employerCompany = String(job.employer_company ?? "").replace(/\s+/g, " ").trim();
    if (employerCompany) return employerCompany;
    return "—";
  }, []);

  const resolvePublicJobCategoryName = useCallback((job: JobListItem) => {
    const direct = String(job.category ?? "").trim();
    if (direct) return direct;
    const fromCategoryName = String(job.category_name ?? "").trim();
    if (fromCategoryName) return fromCategoryName;
    const categoryId = String(job.category_id ?? "").trim();
    if (categoryId) {
      const fromIdMap = String(categoryNameById[categoryId] ?? "").trim();
      if (fromIdMap) return fromIdMap;
    }
    const fromSubcategory = String(job.subcategory ?? "").trim();
    if (fromSubcategory) return fromSubcategory;
    return "—";
  }, [categoryNameById]);

  const resolvePublicJobWorkMode = useCallback((job: JobListItem): "onsite" | "remote" | "hybrid" => {
    const raw = String((job as any).work_mode ?? "").trim().toLowerCase();
    if (raw === "onsite" || raw === "remote" || raw === "hybrid") return raw;
    return Boolean(job.remote) ? "remote" : "onsite";
  }, []);

  const visibleJobs = useMemo(() => {
    const list = Array.isArray(jobs) ? jobs : [];
    const categoryFilter = filterCategory.trim().toLowerCase();
    const employmentTypeFilter = filterEmploymentType.trim().toLowerCase();
    const experienceFilter = filterExperienceLevel.trim().toLowerCase();
    const locationFilter = filterLocation.trim().toLowerCase();

    const filtered = list.filter((job) => {
      if (categoryFilter) {
        const category = resolvePublicJobCategoryName(job).toLowerCase();
        if (category !== categoryFilter) return false;
      }

      if (employmentTypeFilter) {
        const employmentType = String(job.employment_type ?? "").toLowerCase();
        if (employmentType !== employmentTypeFilter) return false;
      }

      if (experienceFilter) {
        const experience = String(job.experience_level ?? "").toLowerCase();
        if (experience !== experienceFilter) return false;
      }

      if (filterRemote !== "all") {
        const workMode = resolvePublicJobWorkMode(job);
        if (filterRemote !== workMode) return false;
      }

      if (locationFilter) {
        const location = String(job.location ?? "").toLowerCase();
        if (!location.includes(locationFilter)) return false;
      }

      return true;
    });

    const openId = String(openJobId ?? "").trim();
    if (!openId) return filtered;

    const idx = filtered.findIndex((j) => String(j.id) === openId);
    if (idx <= 0) return filtered;
    const next = [...filtered];
    const [picked] = next.splice(idx, 1);
    return picked ? [picked, ...next] : filtered;
  }, [filterCategory, filterEmploymentType, filterExperienceLevel, filterLocation, filterRemote, jobs, openJobId, resolvePublicJobCategoryName, resolvePublicJobWorkMode]);

  const filterOptions = useMemo(() => {
    const list = Array.isArray(jobs) ? jobs : [];
    const categories = new Set<string>(Array.isArray(categoryOptions) ? categoryOptions : []);
    const employmentTypes = new Set<string>();
    const experienceLevels = new Set<string>();
    const locations = new Set<string>();

    for (const job of list) {
      const category = resolvePublicJobCategoryName(job);
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
  }, [categoryOptions, jobs, resolvePublicJobCategoryName]);

  return (
    <div className="page">
      <div className="publicJobsContainer">
        <div className="companiesHeader publicJobsHeader">
          <div className="publicJobsHeaderBrand">
            <img
              src={resolvedBrandingLogoSrc}
              alt={systemName ? `${systemName} logo` : "Company logo"}
              onError={() => setBrandingLogoFailed(true)}
              style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 16, border: "1px solid var(--stroke)", background: "var(--card)" }}
            />
            <div>
              <h1 className="pageTitle">{systemName || "Organization"}</h1>
            </div>
          </div>

          <div className="publicJobsHeaderActions">
            {!accessToken ? (
              <>
                <Link
                  className="btn btnPrimary btnSm"
                  style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
                  to="/login"
                >
                  Login
                </Link>
                <Link
                  className="btn btnPrimary btnSm"
                  style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
                  to="/register"
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                {displayName ? (
                  <div className="appTopUserName" title={displayName}>
                    <span className="appTopUserAvatarFallback" aria-hidden="true">
                      {displayNameInitials}
                    </span>
                    Hello, {displayName}
                  </div>
                ) : null}
                <button
                  type="button"
                  className="btn themeToggleBtn"
                  onClick={toggleTheme}
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                </button>
                <button
                  type="button"
                  className="btn btnPrimary btnSm"
                  onClick={() => navigate("/app/my-profile")}
                >
                  View My Profile
                </button>
                <button
                  className="btn btnPrimary btnSm"
                  onClick={logout}
                  type="button"
                  aria-label="Logout"
                >
                  <LogoutIcon />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </div>

        {error ? <div className="errorBox">{error}</div> : null}
        {success ? <div className="successBox">{success}</div> : null}

        <div className="publicJobsLayout">
          <aside className="dashCard publicJobsFilters" aria-label="Job filters">
            <div className="dashCardHeader">
              <div>
                <h2 className="dashCardTitle">Filters</h2>
                <div className="dashCardMeta">{loading ? "Loading jobs..." : `${visibleJobs.length} result(s)`}</div>
              </div>
              <button
                type="button"
                className="btn btnGhost btnSm"
                onClick={() => {
                  setFilterSearch("");
                  setFilterCategory("");
                  setFilterEmploymentType("");
                  setFilterExperienceLevel("");
                  setFilterRemote("all");
                  setFilterLocation("");
                }}
                disabled={loading}
              >
                Clear
              </button>
            </div>

            <div className="publicJobsFiltersGrid">
              <div className="publicJobsFilterField">
                <label className="fieldLabel">Search</label>
                <input
                  className="input"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Job title or company"
                  disabled={loading}
                />
              </div>

              <div className="publicJobsFilterField">
                <label className="fieldLabel">Category</label>
                <select className="input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} disabled={loading}>
                  <option value="">All categories</option>
                  {filterOptions.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="publicJobsFilterField">
                <label className="fieldLabel">Employment Type</label>
                <select
                  className="input"
                  value={filterEmploymentType}
                  onChange={(e) => setFilterEmploymentType(e.target.value)}
                  disabled={loading}
                >
                  <option value="">All</option>
                  {filterOptions.employmentTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="publicJobsFilterField">
                <label className="fieldLabel">Experience Level</label>
                <select
                  className="input"
                  value={filterExperienceLevel}
                  onChange={(e) => setFilterExperienceLevel(e.target.value)}
                  disabled={loading}
                >
                  <option value="">All</option>
                  {filterOptions.experienceLevels.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <div className="publicJobsFilterField">
                <label className="fieldLabel">Remote</label>
                <select
                  className="input"
                  value={filterRemote}
                  onChange={(e) => setFilterRemote(e.target.value as "all" | "remote" | "onsite" | "hybrid")}
                  disabled={loading}
                >
                  <option value="all">All</option>
                  <option value="remote">Remote only</option>
                  <option value="onsite">On-site only</option>
                  <option value="hybrid">Hybrid only</option>
                </select>
              </div>

              <div className="publicJobsFilterField">
                <label className="fieldLabel">Location contains</label>
                <input
                  className="input"
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  placeholder={filterOptions.locations.length ? "e.g. Windhoek" : "Location"}
                  disabled={loading}
                />
              </div>
            </div>
          </aside>

          <section>
            {loading ? (
              <div className="placeholderSpinnerWrap" role="status" aria-live="polite"><span className="placeholderSpinner" aria-hidden="true" /><span className="srOnly">Loading</span></div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                  <div>
                    <h1 className="pageTitle">Jobs</h1>
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  {renderPager()}
                </div>

                <div className="jobCardsGrid" role="region" aria-label="Jobs cards">
                  {visibleJobs.length === 0 ? (
                    <div className="dashCard jobCardsGridItem jobCardToneA"><div className="emptyState">No jobs found.</div></div>
                  ) : (
                    visibleJobs.map((job, idx) => {
                const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
                const isOpen = String(openJobId ?? "") === String(job.id);
                  const alreadyApplied = appliedJobIds.has(String(job.id));

                const shareHref =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/jobs/${encodeURIComponent(String(job.id))}`
                    : `/jobs/${encodeURIComponent(String(job.id))}`;
                const companyName = resolvePublicJobCompanyName(job);
                const categoryName = resolvePublicJobCategoryName(job);
                const workMode = resolvePublicJobWorkMode(job);
                const shareText = `${job.title}${companyName && companyName !== "—" ? ` - ${companyName}` : ""}`;
                const facebookShareHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareHref)}&quote=${encodeURIComponent(shareText)}`;
                const xShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareHref)}`;
                const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareHref}`)}`;
                const emailShareHref = `mailto:?subject=${encodeURIComponent(`Job: ${shareText}`)}&body=${encodeURIComponent(`Check out this job: ${shareHref}`)}`;

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
                            disabled={companyModalLoading}
                          >
                            {companyName}
                          </button>
                        </span>
                      </div>
                      <ReadField label="Category" value={categoryName} />
                      <ReadField label="Location" value={job.location ?? "—"} />
                      <ReadField label="Work Mode" value={workMode.charAt(0).toUpperCase() + workMode.slice(1)} />
                      <ReadField label="Due Date" value={job.application_deadline ? new Date(job.application_deadline).toLocaleDateString("en-GB") : "—"} />
                      <ReadField label="Salary Range" value={`${job.salary_min ?? "—"} - ${job.salary_max ?? "—"}`} />
                    </div>

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
                      <span className="muted" style={{ fontSize: 12, marginRight: 2 }}>
                        Share on
                      </span>
                      <a className="btn btnGhost btnSm" href={facebookShareHref} target="_blank" rel="noreferrer" aria-label="Share on Facebook" title="Share on Facebook" style={{ color: "var(--menu-icon-active)" }}>
                        <FacebookIcon />
                      </a>
                      <a className="btn btnGhost btnSm" href={xShareHref} target="_blank" rel="noreferrer" aria-label="Share on X" title="Share on X" style={{ color: "var(--text)" }}>
                        <XIcon />
                      </a>
                      <a className="btn btnGhost btnSm" href={whatsappShareHref} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp" title="Share on WhatsApp" style={{ color: "#166534" }}>
                        <WhatsAppIcon />
                      </a>
                      <a className="btn btnGhost btnSm" href={emailShareHref} aria-label="Share via Email" title="Share via Email" style={{ color: "var(--text)" }}>
                        <EmailIcon />
                      </a>

                      <button
                        type="button"
                        className={"btn btnPrimary btnSm"}
                        onClick={() => {
                          if (!accessToken) {
                            const next = `/jobs/${encodeURIComponent(String(job.id))}?apply=1`;
                            navigate("/login", { replace: true, state: { from: next } });
                            return;
                          }
                          onStartApply(job);
                        }}
                        disabled={saving || permissionsLoading || alreadyApplied}
                      >
                        {alreadyApplied ? "Applied" : "Apply"}
                      </button>

                      {!isOpen ? (
                        <button
                          type="button"
                          className="btn btnPrimary btnSm"
                          style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
                          onClick={() => {
                            setOpenJobId((prev) => (prev === String(job.id) ? null : String(job.id)));
                            navigate(`/jobs/${job.id}`);
                          }}
                          disabled={saving}
                        >
                          View Details
                        </button>
                      ) : null}
                    </div>

                    {isOpen ? (
                      <div className="dropPanel" style={{ marginTop: 10 }}>
                        <div className="profileReadGrid">
                          <ReadField label="Employment Type" value={job.employment_type ?? "—"} />
                          <ReadField label="Experience Level" value={job.experience_level ?? "—"} />
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <span className="readLabel">Description</span>
                          <RichTextView value={job.description} className="readValue" />
                        </div>
                        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className={"btn btnPrimary btnSm"}
                            onClick={() => {
                              if (!accessToken) {
                                const next = `/jobs/${encodeURIComponent(String(job.id))}?apply=1`;
                                navigate("/login", { replace: true, state: { from: next } });
                                return;
                              }
                              onStartApply(job);
                            }}
                            disabled={saving || permissionsLoading || alreadyApplied}
                          >
                            {alreadyApplied ? "Applied" : "Apply"}
                          </button>
                          <button
                            type="button"
                            className="btn btnPrimary btnSm"
                            style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
                            onClick={() => {
                              setOpenJobId((prev) => (prev === String(job.id) ? null : String(job.id)));
                              navigate(`/jobs/${job.id}`);
                            }}
                            disabled={saving}
                          >
                            Hide Details
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {showBackToTop ? (
                      <button
                        type="button"
                        className="btn btnPrimary btnSm backToTopBtn"
                        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                        aria-label="Back to top"
                      >
                        ↑ Back to Top
                      </button>
                    ) : null}
                  </div>
                );
                    })
                  )}
                </div>

                <div style={{ marginTop: 16 }}>
                  {renderPager()}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {profileIncompleteModalOpen ? (
        <div className="modalOverlay" role="presentation" onMouseDown={() => !saving && setProfileIncompleteModalOpen(false)}>
          <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Complete Your Profile</div>
            <div className="modalMessage">
              Complete your profile before applying. You must upload a CV / resume, add at least one
              education qualification, and upload an identity document.
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
                Complete Profile
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {updateProfileBeforeApplyJob ? (
        <div className="modalOverlay" role="presentation" onMouseDown={() => !saving && setUpdateProfileBeforeApplyJob(null)}>
          <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Update Profile?</div>
            <div className="modalMessage">
              Would you like to update your profile before applying for <strong>{updateProfileBeforeApplyJob.title}</strong>?
            </div>
            <div className="modalActions">
              <button className="btn btnGhost" type="button" onClick={() => setUpdateProfileBeforeApplyJob(null)} disabled={saving}>
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
            <div className="modalMessage">Apply for <strong>{applyConfirmJob.title}</strong>?</div>
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
            <div className="modalMessage" style={{ marginBottom: 8 }}>
              {companyModalLoading
                ? "Loading company details..."
                : companyDetails
                  ? `${companyDetails.name ?? "Company"}`
                  : "No company details found."}
            </div>

            {companyDetails ? (
              <div className="profileReadGrid" style={{ marginTop: 4 }}>
                <ReadField label="Name" value={companyDetails.name ?? "—"} />
                <ReadField label="Industry" value={companyDetails.industry ?? "—"} />
                <ReadField label="Website" value={companyDetails.website ?? "—"} />
                <ReadField label="Email" value={companyDetails.contact_email ?? "—"} />
                <ReadField label="Phone" value={companyDetails.contact_phone ?? "—"} />
                <ReadField label="City" value={companyDetails.city ?? "—"} />
                <ReadField label="Country" value={companyDetails.country ?? "—"} />
              </div>
            ) : null}

            {companyDetails?.description ? (
              <div style={{ marginTop: 8 }}>
                <span className="readLabel">Description</span>
                <p className="readValue" style={{ whiteSpace: "pre-wrap" }}>{companyDetails.description}</p>
              </div>
            ) : null}

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
