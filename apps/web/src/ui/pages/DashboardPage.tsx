import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  applyToJob,
  getAdminStatistics,
  getCompany,
  getEmployerDashboard,
  getFullProfile,
  getJob,
  getPublicCompany,
  listJobCategories,
  listCompanies,
  listAuditLogs,
  listJobs,
  listMyApplications,
  withdrawMyApplication,
  type Company,
  type AdminStatistics,
  type AuditLog,
  type EmployerDashboardData,
  type FullProfile,
  type JobApplication,
  type JobListItem,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { ActionMenu } from "../components/ActionMenu";

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

function ReadField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="readField">
      <span className="readLabel">{label}</span>
      <span className="readValue">{value}</span>
    </div>
  );
}

export function DashboardPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [openSeekerJobId, setOpenSeekerJobId] = useState<string | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStatistics | null>(null);
  const [adminLogs, setAdminLogs] = useState<AuditLog[]>([]);
  const [employerData, setEmployerData] = useState<EmployerDashboardData | null>(null);
  const [seekerJobs, setSeekerJobs] = useState<JobListItem[]>([]);
  const [seekerJobsPage, setSeekerJobsPage] = useState(1);
  const [seekerJobsPagination, setSeekerJobsPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pages: 1,
  });
  const [seekerApplications, setSeekerApplications] = useState<JobApplication[]>([]);
  const [seekerProfile, setSeekerProfile] = useState<FullProfile | null>(null);
  const [updateProfileBeforeApplyJob, setUpdateProfileBeforeApplyJob] = useState<JobListItem | null>(null);
  const [seekerCompanies, setSeekerCompanies] = useState<Company[]>([]);
  const [seekerCategories, setSeekerCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyModalLoading, setCompanyModalLoading] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<Company | null>(null);
  const [jobDetailsModalOpen, setJobDetailsModalOpen] = useState(false);
  const [jobDetailsModalLoading, setJobDetailsModalLoading] = useState(false);
  const [jobDetails, setJobDetails] = useState<JobListItem | null>(null);
  const [recallTarget, setRecallTarget] = useState<JobApplication | null>(null);
  const [recalling, setRecalling] = useState(false);
  const [seekerApplicationsPage, setSeekerApplicationsPage] = useState(1);
  const [seekerApplicationsPagination, setSeekerApplicationsPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    pages: 1,
  });

  const canViewAdminDashboard = hasPermission("MANAGE_USERS");
  const canViewEmployerDashboard =
    !canViewAdminDashboard &&
    (hasPermission("CREATE_JOB") || hasPermission("VIEW_APPLICATIONS"));
  const isJobSeekerUser =
    !canViewAdminDashboard &&
    !hasPermission("CREATE_JOB") &&
    !hasPermission("VIEW_APPLICATIONS");
  const isStandardDashboardUser = !isJobSeekerUser;
  const canViewSeekerDashboard = isJobSeekerUser;
  const canApplyJob = canViewSeekerDashboard && hasPermission("APPLY_JOB");

  const load = useCallback(async () => {
    if (!accessToken || permissionsLoading) return;

    const isPermissionDeniedError = (err: unknown) => {
      const status = Number((err as any)?.status ?? 0);
      const msg = String((err as any)?.message ?? "").toLowerCase();
      return status === 403 || msg.includes("insufficient permissions") || msg.includes("forbidden");
    };

    const loadAdminDashboard = async () => {
      const [stats, logs] = await Promise.all([
        getAdminStatistics(accessToken),
        listAuditLogs(accessToken, { page: 1, limit: 5 }),
      ]);
      setAdminStats(stats);
      setAdminLogs(logs.logs ?? []);
    };

    const loadEmployerDashboardData = async () => {
      const data = await getEmployerDashboard(accessToken);
      setEmployerData(data);
    };

    const loadJobSeekerDashboard = async () => {
      const [jobs, applications, profile, companies] = await Promise.all([
        listJobs(accessToken, { page: seekerJobsPage, limit: 5, status: "active" }),
        listMyApplications(accessToken, { page: seekerApplicationsPage, limit: 5, sort: "newest" }),
        getFullProfile(accessToken),
        listCompanies(accessToken),
      ]);
      setSeekerJobs(jobs.jobs ?? []);
      setSeekerJobsPagination({
        page: Number(jobs.pagination?.page ?? seekerJobsPage),
        limit: Number(jobs.pagination?.limit ?? 5),
        total: Number(jobs.pagination?.total ?? 0),
        pages: Number(jobs.pagination?.pages ?? 1),
      });
      setSeekerApplications(applications.applications ?? []);
      setSeekerApplicationsPagination({
        page: Number(applications.pagination?.page ?? seekerApplicationsPage),
        limit: Number(applications.pagination?.limit ?? 5),
        total: Number(applications.pagination?.total ?? 0),
        pages: Number(applications.pagination?.pages ?? 1),
      });
      setSeekerProfile(profile);
      setSeekerCompanies(Array.isArray(companies) ? companies : []);
    };

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      setAdminStats(null);
      setAdminLogs([]);
      setEmployerData(null);
      setSeekerJobs([]);
      setSeekerApplications([]);
      setSeekerProfile(null);
      setSeekerCompanies([]);

      if (canViewAdminDashboard) {
        try {
          await loadAdminDashboard();
        } catch (e) {
          if (!isPermissionDeniedError(e)) {
            setError("Some dashboard sections are temporarily unavailable.");
          }
        }
      }

      if (canViewEmployerDashboard) {
        try {
          await loadEmployerDashboardData();
        } catch (e) {
          if (!isPermissionDeniedError(e)) {
            setError("Some dashboard sections are temporarily unavailable.");
          }
        }
      }

      if (canViewSeekerDashboard) {
        try {
          await loadJobSeekerDashboard();
        } catch (e) {
          if (!isPermissionDeniedError(e)) {
            setError("Some dashboard sections are temporarily unavailable.");
          }
        }
      }
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    permissionsLoading,
    seekerApplicationsPage,
    seekerJobsPage,
    isJobSeekerUser,
    isStandardDashboardUser,
    canViewAdminDashboard,
    canViewEmployerDashboard,
    canViewSeekerDashboard,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const seekerStatusBreakdown = useMemo(() => {
    return seekerApplications.reduce<Record<string, number>>((acc, app) => {
      const key = String(app.status ?? "unknown");
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [seekerApplications]);

  const seekerStatusBreakdownList = useMemo(() => {
    return Object.entries(seekerStatusBreakdown)
      .map(([status, count]) => ({ status, count: Number(count) || 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [seekerStatusBreakdown]);

  const seekerActivitySpark = useMemo(() => {
    return toDailySeries(seekerApplications, 14);
  }, [seekerApplications]);

  const seekerAppliedJobIds = useMemo(() => {
    return new Set(
      (seekerApplications ?? [])
        .map((a) => String(a.job_id ?? "").trim())
        .filter(Boolean),
    );
  }, [seekerApplications]);

  const seekerActiveJobs = useMemo(() => {
    return (seekerJobs ?? []).filter((job) => {
      const raw = String(job.status ?? "").toLowerCase();
      return raw === "active" || raw === "approved";
    });
  }, [seekerJobs]);

  const seekerCompanyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of seekerCompanies) {
      const id = String(company.id ?? "").trim();
      const name = String(company.name ?? "").trim();
      if (id && name) map.set(id, name);
    }
    return map;
  }, [seekerCompanies]);

  const seekerCategoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const category of seekerCategories) {
      const id = String(category.id ?? "").trim();
      const name = String(category.name ?? "").trim();
      if (id && name) map.set(id, name);
    }
    return map;
  }, [seekerCategories]);

  const resolveSeekerJobCompanyName = useCallback((job: JobListItem) => {
    const direct = String(job.company ?? "").trim();
    if (direct) return direct;
    const employerCompany = String((job as any).employer_company ?? "").trim();
    if (employerCompany) return employerCompany;
    const id = String(job.company_id ?? "").trim();
    if (id) {
      const fromMap = seekerCompanyNameById.get(id);
      if (fromMap) return fromMap;
    }
    return "—";
  }, [seekerCompanyNameById]);

  const resolveSeekerJobCategoryName = useCallback((job: JobListItem) => {
    const direct = String(job.category ?? "").trim();
    if (direct) return direct;
    const fromCategoryName = String(job.category_name ?? "").trim();
    if (fromCategoryName) return fromCategoryName;
    const categoryId = String(job.category_id ?? "").trim();
    if (categoryId) {
      const fromMap = seekerCategoryNameById.get(categoryId);
      if (fromMap) return fromMap;
    }
    const fromSubcategory = String(job.subcategory ?? "").trim();
    if (fromSubcategory) return fromSubcategory;
    return "—";
  }, [seekerCategoryNameById]);

  useEffect(() => {
    if (!accessToken || permissionsLoading || !canViewSeekerDashboard) return;
    let cancelled = false;
    void listJobCategories(accessToken)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data.categories) ? data.categories : [];
        setSeekerCategories(list.map((category) => ({
          id: String(category.id ?? ""),
          name: String(category.name ?? ""),
        })));
      })
      .catch(() => {
        if (!cancelled) setSeekerCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, canViewSeekerDashboard, permissionsLoading]);

  const seekerRecentApplications = useMemo(() => {
    return [...(seekerApplications ?? [])].sort((a, b) => {
      const aRaw = (a as any).applied_at ?? a.created_at;
      const bRaw = (b as any).applied_at ?? b.created_at;
      const aT = aRaw ? new Date(aRaw).getTime() : 0;
      const bT = bRaw ? new Date(bRaw).getTime() : 0;
      return bT - aT;
    });
  }, [seekerApplications]);

  const renderSeekerJobsPager = useCallback(() => {
    if (seekerJobsPagination.pages <= 1) return null;
    return (
      <div className="publicJobsPager" role="navigation" aria-label="Recently posted jobs pagination">
        <button
          className="btn btnPrimary btnSm"
          style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
          type="button"
          onClick={() => setSeekerJobsPage((p) => Math.max(1, p - 1))}
          disabled={seekerJobsPage <= 1 || loading}
        >
          {"<-"} Previous
        </button>
        <span className="publicJobsPagerInfo">
          Page {seekerJobsPagination.page} of {seekerJobsPagination.pages} ({seekerJobsPagination.total} jobs)
        </span>
        <button
          className="btn btnPrimary btnSm"
          style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
          type="button"
          onClick={() => setSeekerJobsPage((p) => Math.min(seekerJobsPagination.pages, p + 1))}
          disabled={seekerJobsPage >= seekerJobsPagination.pages || loading}
        >
          Next {"->"}
        </button>
      </div>
    );
  }, [loading, seekerJobsPage, seekerJobsPagination.page, seekerJobsPagination.pages, seekerJobsPagination.total]);

  const onApplyFromDashboard = useCallback(async (job: JobListItem) => {
    if (!accessToken || !canApplyJob) return;
    const jobId = String(job.id);
    if (!jobId) return;
    if (seekerAppliedJobIds.has(jobId)) return;

    try {
      setApplyingJobId(jobId);
      setError(null);
      setSuccess(null);

      const created = await applyToJob(accessToken, { job_id: jobId });
      setSeekerApplications((prev) => [created, ...prev]);
      setSuccess(`Application submitted for "${job.title}".`);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to apply for job");
    } finally {
      setApplyingJobId(null);
    }
  }, [accessToken, canApplyJob, seekerAppliedJobIds]);

  const onStartApplyFromDashboard = useCallback((job: JobListItem) => {
    setUpdateProfileBeforeApplyJob(job);
  }, []);

  const onOpenCompanyInfo = useCallback(async (job: JobListItem) => {
    if (!accessToken) return;
    try {
      setCompanyModalOpen(true);
      setCompanyModalLoading(true);
      setCompanyDetails(null);
      setError(null);

      const id = String(job.company_id ?? "").trim();
      const byId = id
        ? seekerCompanies.find((item) => String(item.id ?? "").trim() === id)
        : undefined;
      const byName = seekerCompanies.find(
        (item) =>
          String(item.name ?? "").trim().toLowerCase() ===
          String(job.company ?? "").trim().toLowerCase(),
      );

      if (canViewSeekerDashboard) {
        try {
          const publicCompany = await getPublicCompany(String(job.id));
          setCompanyDetails(publicCompany);
          return;
        } catch {
          // Fallback to locally available company data.
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
  }, [accessToken, canViewSeekerDashboard, seekerCompanies]);

  const seekerCompletion = useMemo(() => {
    const total = 5;
    const done =
      (seekerProfile?.personalDetails ? 1 : 0) +
      ((seekerProfile?.addresses?.length ?? 0) > 0 ? 1 : 0) +
      ((seekerProfile?.education?.length ?? 0) > 0 ? 1 : 0) +
      ((seekerProfile?.experience?.length ?? 0) > 0 ? 1 : 0) +
      ((seekerProfile?.references?.length ?? 0) > 0 ? 1 : 0);

    const percent = Math.round((done / total) * 100);
    return { done, total, percent };
  }, [seekerProfile]);

  const employerStatusChart = useMemo(() => {
    const breakdown = (employerData?.recent_applications ?? []).reduce<Record<string, number>>(
      (acc, app) => {
        const key = String(app.status ?? "unknown");
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {},
    );
    return toChartData(breakdown, 6);
  }, [employerData]);

  const employerJobsChart = useMemo(() => {
    const total = Number(employerData?.stats?.total_jobs_posted ?? 0);
    const active = Number(employerData?.stats?.active_jobs ?? 0);
    const inactive = Math.max(0, total - active);
    const data: Record<string, number> = { active, inactive };
    return toChartData(data, 4);
  }, [employerData]);

  const employerRecentJobsStatusChart = useMemo(() => {
    const breakdown = (employerData?.recent_jobs ?? []).reduce<Record<string, number>>(
      (acc, job) => {
        const key = String(job.status ?? "unknown");
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {},
    );
    return toChartData(breakdown, 6);
  }, [employerData]);

  const isJobExpiredForApplication = useCallback((app: JobApplication) => {
    const raw = (app as any).application_deadline ?? app.application_deadline;
    if (!raw) return true;
    const dt = new Date(String(raw));
    const t = dt.getTime();
    if (Number.isNaN(t)) return true;
    return t < Date.now();
  }, []);

  const canRecallApplication = useCallback((app: JobApplication) => {
    const status = String(app.status ?? "").toUpperCase();
    if (!status) return false;
    if (status === "WITHDRAWN") return false;
    if (isJobExpiredForApplication(app)) return false;
    return true;
  }, [isJobExpiredForApplication]);

  const onViewJobDetails = useCallback(async (jobId: string) => {
    if (!accessToken) return;
    const id = String(jobId ?? "").trim();
    if (!id) return;
    try {
      setJobDetailsModalOpen(true);
      setJobDetailsModalLoading(true);
      setJobDetails(null);
      setError(null);
      const job = await getJob(accessToken, id);
      setJobDetails(job);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load job details");
    } finally {
      setJobDetailsModalLoading(false);
    }
  }, [accessToken]);

  const onConfirmRecallApplication = useCallback(async () => {
    if (!accessToken || !recallTarget) return;
    try {
      setRecalling(true);
      setError(null);
      setSuccess(null);
      await withdrawMyApplication(accessToken, String(recallTarget.id));
      setSeekerApplications((prev) =>
        (prev ?? []).map((a) =>
          String(a.id) === String(recallTarget.id)
            ? ({ ...a, status: "WITHDRAWN" } as JobApplication)
            : a,
        ),
      );
      setSuccess("Application recalled.");
      setRecallTarget(null);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to recall application");
    } finally {
      setRecalling(false);
    }
  }, [accessToken, recallTarget]);

  const adminApplicationsChart = useMemo(() => {
    if (!adminStats) return [];
    const appStats = (adminStats as any).applications ?? (adminStats as any).application_stats ?? {};
    const data = {
      applied: Number(appStats.applied ?? appStats.pending ?? 0),
      screening: Number(appStats.screening ?? appStats.reviewed ?? 0),
      longlisted: Number(appStats.longlisted ?? appStats.long_listed ?? 0),
      shortlisted: Number(appStats.shortlisted ?? appStats.short_listed ?? 0),
      interview: Number(appStats.interview ?? 0),
      assessment: Number(appStats.assessment ?? 0),
      hired: Number(appStats.hired ?? appStats.accepted ?? 0),
      rejected: Number(appStats.rejected ?? 0),
      withdrawn: Number(appStats.withdrawn ?? 0),
    };
    return toChartData(data, 9);
  }, [adminStats]);

  const adminUsersRoleChart = useMemo(() => {
    if (!adminStats) return [];
    const userStats = (adminStats as any).users ?? (adminStats as any).user_stats ?? {};
    const data = {
      job_seekers: Number(userStats.job_seekers ?? userStats.jobSeekers ?? 0),
      employers: Number(userStats.employers ?? 0),
      admins: Number(userStats.admins ?? 0),
      hr: Number(userStats.hr ?? userStats.human_resources ?? 0),
    };
    return toChartData(data, 8);
  }, [adminStats]);

  const adminGrowthSpark = useMemo(() => {
    if (!adminStats) return [];
    return [
      Number(adminStats.users.new_today ?? 0),
      Number(adminStats.users.new_this_week ?? 0),
      Number(adminStats.users.new_this_month ?? 0),
    ];
  }, [adminStats]);

  if (loading || permissionsLoading) {
    return <div className="page"><h1 className="pageTitle">Dashboard</h1><p className="pageText">Loading...</p></div>;
  }

  return (
    <div className="page">
      <div className="companiesHeader"><h1 className="pageTitle">Dashboard</h1></div>
      {success && <div className="successBox">{success}</div>}
      {error && <div className="errorBox">{error}</div>}

      {isStandardDashboardUser && (
        <>
          {(!adminStats && !employerData) ? (
            <div className="dashCard" style={{ marginBottom: 12 }}>
              <div className="dashCardHeader">
                <h2 className="dashCardTitle">Welcome</h2>
                <span className="dashCardMeta">Dashboard</span>
              </div>
              <p className="pageText" style={{ margin: 0 }}>
                Your dashboard is available. Additional widgets will appear based on your assigned permissions.
              </p>
            </div>
          ) : null}

          <div className="dashGraphs">
            {canViewAdminDashboard && adminStats ? (
              <>
                <div className="dashCard">
                  <div className="dashCardHeader">
                    <h2 className="dashCardTitle">User Growth</h2>
                    <span className="dashCardMeta">Today / Week / Month</span>
                  </div>
                  <Sparkline values={adminGrowthSpark} />
                  <div className="dashLegend">
                    <span className="dashLegendItem"><span className="dashLegendDot" />Today: {adminStats.users.new_today}</span>
                    <span className="dashLegendItem"><span className="dashLegendDot" />Week: {adminStats.users.new_this_week}</span>
                    <span className="dashLegendItem"><span className="dashLegendDot" />Month: {adminStats.users.new_this_month}</span>
                  </div>
                </div>

                <div className="dashCard">
                  <div className="dashCardHeader">
                    <h2 className="dashCardTitle">Applications by Status</h2>
                    <span className="dashCardMeta">Distribution</span>
                  </div>
                  <BarChart data={adminApplicationsChart} emptyText="No application status data." />
                </div>

                <div className="dashCard">
                  <div className="dashCardHeader">
                    <h2 className="dashCardTitle">Users by Role</h2>
                    <span className="dashCardMeta">Composition</span>
                  </div>
                  <BarChart data={adminUsersRoleChart} emptyText="No role data." />
                </div>
              </>
            ) : null}

            {canViewEmployerDashboard && employerData ? (
              <>
                <div className="dashCard">
                  <div className="dashCardHeader">
                    <h2 className="dashCardTitle">Jobs Overview</h2>
                    <span className="dashCardMeta">Active vs Inactive</span>
                  </div>
                  <BarChart data={employerJobsChart} emptyText="No job data." />
                </div>

                <div className="dashCard">
                  <div className="dashCardHeader">
                    <h2 className="dashCardTitle">Applications by Status</h2>
                    <span className="dashCardMeta">Recent</span>
                  </div>
                  <BarChart data={employerStatusChart} emptyText="No recent applications yet." />
                </div>

                <div className="dashCard">
                  <div className="dashCardHeader">
                    <h2 className="dashCardTitle">Recent Jobs Status</h2>
                    <div className="dashCardActions">
                      <Link className="btn btnGhost btnSm" to="/app/jobs">Post Job</Link>
                    </div>
                  </div>
                  <BarChart data={employerRecentJobsStatusChart} emptyText="No recent jobs yet." />
                </div>
              </>
            ) : null}
          </div>

          {canViewAdminDashboard ? (
            <div className="dashCard" style={{ marginTop: 12 }}>
              <div className="dashCardHeader">
                <h2 className="dashCardTitle">Recent Audit Logs</h2>
                <span className="dashCardMeta">Last 5</span>
              </div>
              {adminLogs.length === 0 ? (
                <div className="emptyState">No audit logs found.</div>
              ) : (
                <div className="tableWrap">
                  <table className="table companiesTable">
                    <thead><tr><th>Date</th><th>Action</th><th>Target</th></tr></thead>
                    <tbody>
                      {adminLogs.slice(0, 5).map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.created_at).toLocaleString("en-GB")}</td>
                          <td>{log.action}</td>
                          <td>{log.target_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}

          {canViewEmployerDashboard && employerData ? (
            <div className="dashCard" style={{ marginTop: 12 }}>
              <div className="dashCardHeader">
                <h2 className="dashCardTitle">Recent Applications</h2>
                <span className="dashCardMeta">Last 5</span>
              </div>
              {(employerData.recent_applications?.length ?? 0) === 0 ? (
                <div className="emptyState">No recent applications.</div>
              ) : (
                <div className="tableWrap">
                  <table className="table companiesTable">
                    <thead><tr><th>Applicant</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                      {(employerData.recent_applications ?? []).slice(0, 5).map((app) => (
                        <tr key={app.id}>
                          <td>{app.applicant_name ?? app.applicant_email ?? "Applicant"}</td>
                          <td>{app.status}</td>
                          <td>{app.created_at ? new Date(app.created_at).toLocaleString("en-GB") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}

      {canViewSeekerDashboard && (
        <>
          <div className="dashGraphs">
            <div className="dashCard">
              <div className="dashCardHeader">
                <h2 className="dashCardTitle">Profile Completion</h2>
                <span className="dashCardMeta">Keep it updated</span>
              </div>
              <ProgressBar value={seekerCompletion.percent} />
              <div className="dashCardFooter">
                <Link className="btn btnGhost btnSm" to="/app/job-seekers">Complete Profile</Link>
              </div>
            </div>

            <div className="dashCard">
              <div className="dashCardHeader">
                <h2 className="dashCardTitle">Application Activity</h2>
                <span className="dashCardMeta">Last 14 days</span>
              </div>
              <Sparkline values={seekerActivitySpark} />
            </div>
          </div>

          <div className="dashCard" style={{ marginTop: 16 }}>
            <div className="dashCardHeader">
              <h2 className="dashCardTitle">My Applications</h2>
              <span className="dashCardMeta">Most recent</span>
            </div>

            {seekerStatusBreakdownList.length ? (
              <div className="dashLegend" style={{ marginTop: 8, marginBottom: 4 }}>
                {seekerStatusBreakdownList.map((it) => (
                  <span className="dashLegendItem" key={it.status}>
                    <span className="dashLegendDot" />
                    {it.status}: {it.count}
                  </span>
                ))}
              </div>
            ) : null}
            {seekerRecentApplications.length === 0 ? (
              <div className="emptyState">You have not applied to any jobs yet.</div>
            ) : (
              <>
                <div className="tableWrap">
                  <table className="table companiesTable" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>Job</th>
                        <th>Company</th>
                        <th>Status</th>
                        <th>Date Applied</th>
                        <th className="thRight">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {seekerRecentApplications.map((app) => {
                        const jobId = String(app.job_id ?? "").trim();
                        const actions = [
                          {
                            key: "view",
                            label: "View job details",
                            onClick: () => void onViewJobDetails(jobId),
                          },
                          ...(canRecallApplication(app)
                            ? [
                                {
                                  key: "recall",
                                  label: "Recall application",
                                  danger: true,
                                  onClick: () => setRecallTarget(app),
                                },
                              ]
                            : []),
                        ];

                        return (
                          <tr key={app.id}>
                            <td>{app.job_title ?? app.job_id}</td>
                            <td>{app.company ?? app.company_name ?? "—"}</td>
                            <td>{app.status ?? "—"}</td>
                            <td>
                              {(app as any).applied_at || app.created_at
                                ? new Date(String((app as any).applied_at ?? app.created_at)).toLocaleDateString("en-GB")
                                : "—"}
                            </td>
                            <td className="tdRight">
                              <ActionMenu
                                label="⋯"
                                disabled={!jobId || recalling}
                                items={actions}
                                menuLabel="Application actions"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {seekerApplicationsPagination.pages > 1 ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="btn btnGhost btnSm"
                      type="button"
                      onClick={() => setSeekerApplicationsPage((p) => Math.max(1, p - 1))}
                      disabled={seekerApplicationsPage <= 1}
                    >
                      {"<-"} Previous
                    </button>
                    <span className="readLabel">
                      Page {seekerApplicationsPagination.page} of {seekerApplicationsPagination.pages}
                    </span>
                    <button
                      className="btn btnGhost btnSm"
                      type="button"
                      onClick={() =>
                        setSeekerApplicationsPage((p) =>
                          Math.min(seekerApplicationsPagination.pages, p + 1),
                        )
                      }
                      disabled={seekerApplicationsPage >= seekerApplicationsPagination.pages}
                    >
                      Next {"->"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="dashCard" style={{ marginTop: 16 }}>
            <div className="dashCardHeader">
              <h2 className="dashCardTitle">Recently Posted Jobs</h2>
              <div className="dashCardActions">
                {renderSeekerJobsPager()}
                <Link className="btn btnGhost btnSm" to="/app/jobs?browse=1">Browse Jobs</Link>
              </div>
            </div>
            {seekerJobs.length === 0 ? (
              <div className="emptyState">No jobs found.</div>
            ) : (
              <div className="jobCardsGrid" role="region" aria-label="Recently posted jobs">
                {seekerActiveJobs.map((job, idx) => {
                  const alreadyApplied = seekerAppliedJobIds.has(String(job.id));
                  const busy = applyingJobId === String(job.id);
                  const company = resolveSeekerJobCompanyName(job);
                  const categoryName = resolveSeekerJobCategoryName(job);
                  const isOpen = openSeekerJobId === String(job.id);
                  const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";

                  const shareBaseUrl =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/jobs/${encodeURIComponent(String(job.id))}`
                      : `/jobs/${encodeURIComponent(String(job.id))}`;
                  const shareText = `${job.title}${company ? ` - ${company}` : ""}`;
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
                              disabled={companyModalLoading}
                            >
                              {company}
                            </button>
                          </span>
                        </div>
                        <ReadField label="Category" value={categoryName} />
                        <ReadField label="Location" value={job.location ?? "—"} />
                        <ReadField label="Remote" value={job.remote ? "Yes" : "No"} />
                        <ReadField label="Due Date" value={job.application_deadline ? new Date(job.application_deadline).toLocaleDateString("en-GB") : "—"} />
                        <ReadField label="Salary Range" value={`${job.salary_min ?? "—"} - ${job.salary_max ?? "—"}`} />
                      </div>

                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
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
                            className={alreadyApplied ? "btn btnGhost btnSm" : "btn btnPrimary btnSm"}
                            type="button"
                            onClick={() => onStartApplyFromDashboard(job)}
                            disabled={busy || alreadyApplied}
                          >
                            {alreadyApplied ? "Applied" : busy ? "Applying..." : "Apply"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btnGhost btnSm"
                          onClick={() => setOpenSeekerJobId((prev) => (prev === String(job.id) ? null : String(job.id)))}
                        >
                          {isOpen ? "Hide Details" : "View Details"}
                        </button>
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
                            <p className="readValue" style={{ whiteSpace: "pre-wrap" }}>{job.description ?? "—"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </>
      )}

      {updateProfileBeforeApplyJob ? (
        <div
          className="modalOverlay"
          role="presentation"
          onMouseDown={() => !applyingJobId && setUpdateProfileBeforeApplyJob(null)}
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
                disabled={Boolean(applyingJobId)}
              >
                Cancel
              </button>
              <button
                className="btn btnGhost"
                type="button"
                onClick={() => {
                  const job = updateProfileBeforeApplyJob;
                  setUpdateProfileBeforeApplyJob(null);
                  void onApplyFromDashboard(job);
                }}
                disabled={Boolean(applyingJobId)}
              >
                No, apply now
              </button>
              <button
                className="btn btnGhost btnSm stepperSaveBtn"
                type="button"
                onClick={() => {
                  const job = updateProfileBeforeApplyJob;
                  setUpdateProfileBeforeApplyJob(null);
                  navigate("/app/job-seekers", { state: { pendingJob: job } });
                }}
                disabled={Boolean(applyingJobId)}
              >
                Yes, update profile
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
                  <div className="readField"><span className="readLabel">Company Name</span><span className="readValue">{companyDetails.name ?? "—"}</span></div>
                  <div className="readField"><span className="readLabel">Industry</span><span className="readValue">{companyDetails.industry ?? "—"}</span></div>
                  <div className="readField"><span className="readLabel">Contact Email</span><span className="readValue">{companyDetails.contact_email ?? "—"}</span></div>
                  <div className="readField"><span className="readLabel">Contact Phone</span><span className="readValue">{companyDetails.contact_phone ?? "—"}</span></div>
                  <div className="readField"><span className="readLabel">City</span><span className="readValue">{companyDetails.city ?? "—"}</span></div>
                  <div className="readField"><span className="readLabel">Country</span><span className="readValue">{companyDetails.country ?? "—"}</span></div>
                  <div className="readField"><span className="readLabel">Website</span><span className="readValue">{companyDetails.website ?? "—"}</span></div>
                  <div className="readField"><span className="readLabel">Description</span><span className="readValue">{companyDetails.description ?? "—"}</span></div>
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

      {jobDetailsModalOpen ? (
        <div
          className="modalOverlay"
          role="presentation"
          onMouseDown={() => !jobDetailsModalLoading && setJobDetailsModalOpen(false)}
        >
          <div
            className="modalCard"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modalTitle">Job Details</div>
            <div className="modalMessage">
              {jobDetailsModalLoading ? (
                "Loading job details..."
              ) : jobDetails ? (
                <>
                  <div className="profileReadGrid">
                    <div className="readField"><span className="readLabel">Title</span><span className="readValue">{jobDetails.title ?? "—"}</span></div>
                    <div className="readField"><span className="readLabel">Company</span><span className="readValue">{jobDetails.company ?? "—"}</span></div>
                    <div className="readField"><span className="readLabel">Category</span><span className="readValue">{resolveSeekerJobCategoryName(jobDetails) ?? "—"}</span></div>
                    <div className="readField"><span className="readLabel">Employment Type</span><span className="readValue">{jobDetails.employment_type ?? "—"}</span></div>
                    <div className="readField"><span className="readLabel">Experience Level</span><span className="readValue">{jobDetails.experience_level ?? "—"}</span></div>
                    <div className="readField"><span className="readLabel">Location</span><span className="readValue">{jobDetails.location ?? "—"}</span></div>
                    <div className="readField"><span className="readLabel">Remote</span><span className="readValue">{jobDetails.remote ? "Yes" : "No"}</span></div>
                    <div className="readField"><span className="readLabel">Salary Range</span><span className="readValue">{`${jobDetails.salary_min ?? "—"} - ${jobDetails.salary_max ?? "—"}`}</span></div>
                    <div className="readField"><span className="readLabel">Deadline</span><span className="readValue">{jobDetails.application_deadline ? new Date(jobDetails.application_deadline).toLocaleString("en-GB") : "—"}</span></div>
                    <div className="readField"><span className="readLabel">Status</span><span className="readValue">{jobDetails.status ?? "—"}</span></div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <span className="readLabel">Description</span>
                    <p className="readValue" style={{ whiteSpace: "pre-wrap" }}>{jobDetails.description ?? "—"}</p>
                  </div>
                </>
              ) : (
                "No job details found."
              )}
            </div>
            <div className="modalActions">
              <button
                className="btn btnGhost"
                type="button"
                onClick={() => setJobDetailsModalOpen(false)}
                disabled={jobDetailsModalLoading}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {recallTarget ? (
        <div className="modalOverlay" role="presentation" onMouseDown={() => !recalling && setRecallTarget(null)}>
          <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Recall Application?</div>
            <div className="modalMessage">
              Recall your application for <strong>{recallTarget.job_title ?? recallTarget.job_id}</strong>?
            </div>
            <div className="modalActions">
              <button className="btn btnGhost" type="button" onClick={() => setRecallTarget(null)} disabled={recalling}>
                Cancel
              </button>
              <button
                className="btn btnGhost btnSm stepperSaveBtn"
                type="button"
                onClick={() => void onConfirmRecallApplication()}
                disabled={recalling}
              >
                {recalling ? "Recalling..." : "Recall"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ChartDatum = { label: string; value: number };

function toChartData(map: Record<string, number>, limit: number): ChartDatum[] {
  return Object.entries(map)
    .map(([label, value]) => ({ label, value: Number(value) || 0 }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, Math.max(1, limit));
}

function toDailySeries(items: { created_at?: string }[], days: number): number[] {
  const countDays = Math.max(1, Math.floor(Number(days) || 0));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - (countDays - 1));

  const buckets = Array.from({ length: countDays }, () => 0);
  const msPerDay = 86400000;

  for (const item of items ?? []) {
    const raw = item?.created_at;
    if (!raw) continue;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) continue;
    dt.setHours(0, 0, 0, 0);

    const idx = Math.floor((dt.getTime() - start.getTime()) / msPerDay);
    if (idx >= 0 && idx < buckets.length) {
      buckets[idx] += 1;
    }
  }

  return buckets;
}

function BarChart({ data, emptyText }: { data: ChartDatum[]; emptyText: string }) {
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data]);

  if (!data.length) {
    return <div className="emptyState">{emptyText}</div>;
  }

  return (
    <div className="dashBars">
      {data.map((d) => (
        <div className="dashBarRow" key={d.label}>
          <div className="dashBarLabel" title={d.label}>{d.label}</div>
          <div className="dashBarTrack" aria-hidden="true">
            <div className="dashBarFill" style={{ width: `${Math.round((d.value / max) * 100)}%` }} />
          </div>
          <div className="dashBarValue">{d.value}</div>
        </div>
      ))}
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return (
    <div className="dashProgress" aria-label={`Completion ${v}%`}>
      <div className="dashProgressTrack" aria-hidden="true">
        <div className="dashProgressFill" style={{ width: `${v}%` }} />
      </div>
      <div className="dashProgressMeta">{v}%</div>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const clean = (values ?? []).map((n) => (Number.isFinite(n) ? Number(n) : 0));
  const max = Math.max(1, ...clean);
  const min = Math.min(0, ...clean);
  const range = Math.max(1, max - min);

  const w = 320;
  const h = 80;
  const padX = 8;
  const padY = 10;

  const pts = clean.map((v, i) => {
    const x = padX + (i * (w - padX * 2)) / Math.max(1, clean.length - 1);
    const y = padY + (1 - (v - min) / range) * (h - padY * 2);
    return { x, y };
  });

  const d = pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  return (
    <div className="dashSpark">
      <svg viewBox={`0 0 ${w} ${h}`} className="dashSparkSvg" aria-hidden="true">
        <polyline className="dashSparkLine" points={d} />
        {pts.map((p, idx) => (
          <circle key={idx} className="dashSparkDot" cx={p.x} cy={p.y} r={3.25} />
        ))}
      </svg>
    </div>
  );
}
