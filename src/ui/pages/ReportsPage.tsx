import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  type Company,
  type AdminUser,
  type JobApplication,
  type JobListItem,
  getJobSeekerFullProfile,
  listCompanies,
  listAdminUsers,
  listJobApplicationsForJob,
  listJobs,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="reportsCardTitle" style={{ margin: "0", fontSize: "1.25rem", fontWeight: 800, color: "var(--heading)", letterSpacing: "0.01em" }}>{children}</h2>;
}

type ReportType = "job_seekers" | "companies";
type SortBy = "created_at" | "last_login" | "email" | "name";
type SortOrder = "ASC" | "DESC";
type ReportKey =
  | "applicants_by_job"
  | "applications_by_status"
  | "directory"
  | "monthly_signups"
  | "hiring_funnel"
  | "jobs_without_applicants"
  | "company_hiring_performance";

const PAGE_SIZE = 100;
const APP_PAGE_SIZE = 100;
const REPORT_PAGE_SIZE = 10;

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB");
}

function normalizePage(totalItems: number, page: number, pageSize = REPORT_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(totalItems / pageSize));
  return Math.min(Math.max(1, page), pages);
}

function normalizeGender(value?: string | null) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (["male", "m"].includes(raw)) return "male";
  if (["female", "f"].includes(raw)) return "female";
  return "other";
}

function fullName(user: AdminUser) {
  const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
  return name || "—";
}

function statusLabel(user: AdminUser) {
  if (user.is_blocked) return "Blocked";
  if (user.is_active) return "Active";
  return "Inactive";
}

function monthKey(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function normalizeApplicationStatus(input?: string | null) {
  const raw = String(input ?? "").trim().toLowerCase();
  if (!raw) return "unknown";
  if (["pending", "applied"].includes(raw)) return "applied";
  if (["reviewed", "screening"].includes(raw)) return "screening";
  if (["long_listed", "longlisted", "longlist"].includes(raw)) return "longlisted";
  if (["shortlisted", "shortlist"].includes(raw)) return "shortlisted";
  if (["oral_interview", "practical_interview", "final_interview", "interview"].includes(raw)) return "interview";
  if (["assessment"].includes(raw)) return "assessment";
  if (["hired", "accepted"].includes(raw)) return "hired";
  if (["rejected"].includes(raw)) return "rejected";
  if (["withdrawn"].includes(raw)) return "withdrawn";
  return raw;
}

function titleStatus(status: string) {
  if (!status) return "Unknown";
  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function isLikelyJobSeeker(user: AdminUser) {
  const role = String(user.role ?? "").trim().toLowerCase();
  if (role.includes("job") && role.includes("seek")) return true;
  if (role === "candidate") return true;
  if (String(user.company_name ?? "").trim()) return false;
  return true;
}

function isLikelyCompanyUser(user: AdminUser) {
  const role = String(user.role ?? "").trim().toLowerCase();
  if (role.includes("employer") || role.includes("recruiter")) return true;
  return Boolean(String(user.company_name ?? "").trim());
}

type ApplicantDetailsRow = {
  app: JobApplication;
  profile: any;
  personalDetails: any;
  addresses: any[];
  education: any[];
  experience: any[];
  skills: string;
  certifications: string;
};

export function ReportsPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = usePermissions();
  const canManageUsers = hasPermission("MANAGE_USERS");
  const canViewApplicantsReport = hasPermission("MANAGE_USERS", "VIEW_APPLICANTS_REPORT");
  const canViewReports = hasPermission("MANAGE_USERS", "VIEW_AUDIT_LOGS", "VIEW_APPLICANTS_REPORT");

  const [reportType, setReportType] = useState<ReportType>("job_seekers");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [verified, setVerified] = useState<"" | "true" | "false">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");
  const [directoryGenderFilter, setDirectoryGenderFilter] = useState<string>("");

  const [rows, setRows] = useState<AdminUser[]>([]);
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string>("");

  const [allJobs, setAllJobs] = useState<JobListItem[]>([]);
  const [allApplications, setAllApplications] = useState<JobApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<string>(() => {
    return normalizeApplicationStatus(searchParams.get("application_status") ?? "");
  });

  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedJobInput, setSelectedJobInput] = useState<string>("");
  const [showJobSuggestions, setShowJobSuggestions] = useState(false);
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("");
  const [selectedJobCompany, setSelectedJobCompany] = useState<string>("");
  const [jobApplicantRows, setJobApplicantRows] = useState<ApplicantDetailsRow[]>([]);
  const [loadingJobApplicants, setLoadingJobApplicants] = useState(false);

  const [applicationFilterJobId, setApplicationFilterJobId] = useState<string>("");
  const [applicationFilterSearch, setApplicationFilterSearch] = useState<string>("");
  const [applicationFilterFromDate, setApplicationFilterFromDate] = useState<string>("");
  const [applicationFilterToDate, setApplicationFilterToDate] = useState<string>("");

  const [jobApplicantsSearch, setJobApplicantsSearch] = useState<string>("");
  const [jobApplicantsStatusFilter, setJobApplicantsStatusFilter] = useState<string>("");
  const [jobApplicantsGenderFilter, setJobApplicantsGenderFilter] = useState<string>("");
  const [jobApplicantsFromDate, setJobApplicantsFromDate] = useState<string>("");
  const [jobApplicantsToDate, setJobApplicantsToDate] = useState<string>("");

  const [directoryGenderByUserId, setDirectoryGenderByUserId] = useState<Record<string, string>>({});

  const [applicantsPage, setApplicantsPage] = useState(1);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [jobsWithoutApplicantsPage, setJobsWithoutApplicantsPage] = useState(1);
  const [companyPerformancePage, setCompanyPerformancePage] = useState(1);
  const [statusPageByKey, setStatusPageByKey] = useState<Record<string, number>>({});
  const [jobsWithoutApplicantsSearch, setJobsWithoutApplicantsSearch] = useState("");
  const [companyPerformanceSearch, setCompanyPerformanceSearch] = useState("");
  const [funnelFilterJobId, setFunnelFilterJobId] = useState("");
  const [funnelFromDate, setFunnelFromDate] = useState("");
  const [funnelToDate, setFunnelToDate] = useState("");
  const [openReports, setOpenReports] = useState<Record<ReportKey, boolean>>({
    applicants_by_job: false,
    applications_by_status: false,
    directory: false,
    monthly_signups: false,
    hiring_funnel: false,
    jobs_without_applicants: false,
    company_hiring_performance: false,
  });
  const [ranReports, setRanReports] = useState<Record<ReportKey, boolean>>({
    applicants_by_job: false,
    applications_by_status: false,
    directory: false,
    monthly_signups: false,
    hiring_funnel: false,
    jobs_without_applicants: false,
    company_hiring_performance: false,
  });

  const loadDirectoryReport = useCallback(async () => {
    if (!accessToken) return;

    if (!canManageUsers && reportType === "job_seekers") {
      setRows([]);
      setLastGeneratedAt(new Date().toISOString());
      return;
    }

    if (!canManageUsers && reportType === "companies") {
      const companies = await listCompanies(accessToken);
      const mapped = (Array.isArray(companies) ? companies : []).map((company: Company) => ({
        id: String(company.id),
        email: String(company.contact_email ?? "—"),
        first_name: null,
        last_name: null,
        company_name: company.name,
        phone: company.contact_phone ?? null,
        is_active: String(company.status ?? "").toLowerCase() !== "inactive",
        is_blocked: String(company.status ?? "").toLowerCase() === "blocked",
        email_verified: undefined,
        created_at: company.created_at ?? undefined,
      })) as AdminUser[];
      setRows(mapped);
      setLastGeneratedAt(new Date().toISOString());
      return;
    }

    const baseParams = {
      limit: PAGE_SIZE,
      search: search || undefined,
      status: status || undefined,
      verified: verified === "" ? undefined : verified === "true",
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      sort_by: sortBy,
      sort_order: sortOrder,
    } as const;

    const firstPage = await listAdminUsers(accessToken, {
      ...baseParams,
      page: 1,
    });

    const allUsers = [...firstPage.users];
    const totalPages = Math.max(1, Number(firstPage.pagination.pages || 1));

    for (let page = 2; page <= totalPages; page++) {
      const nextPage = await listAdminUsers(accessToken, {
        ...baseParams,
        page,
      });
      allUsers.push(...nextPage.users);
    }

    const normalizedUsers = reportType === "job_seekers"
      ? allUsers.filter((user) => isLikelyJobSeeker(user))
      : allUsers.filter((user) => isLikelyCompanyUser(user));

    setRows(normalizedUsers);
    setLastGeneratedAt(new Date().toISOString());
  }, [accessToken, canManageUsers, reportType, search, status, verified, fromDate, toDate, sortBy, sortOrder]);

  const loadDirectoryGenders = useCallback(async (userIds: string[]) => {
    if (!accessToken || userIds.length === 0) return;

    const toFetch = userIds.filter((id) => !directoryGenderByUserId[id]);
    if (toFetch.length === 0) return;

    const nextMap: Record<string, string> = {};
    const batchSize = 8;

    for (let index = 0; index < toFetch.length; index += batchSize) {
      const batch = toFetch.slice(index, index + batchSize);
      const results = await Promise.all(
        batch.map(async (userId) => {
          try {
            const profile = await getJobSeekerFullProfile(accessToken, userId);
            const gender = normalizeGender(String((profile.personalDetails as any)?.gender ?? ""));
            return { userId, gender };
          } catch {
            return { userId, gender: "" };
          }
        }),
      );

      results.forEach((result) => {
        nextMap[result.userId] = result.gender;
      });
    }

    setDirectoryGenderByUserId((prev) => ({ ...prev, ...nextMap }));
  }, [accessToken, directoryGenderByUserId]);

  const loadAdminStatsAndApplications = useCallback(async () => {
    if (!accessToken) return;
    if (!canViewApplicantsReport) {
      setAllJobs([]);
      setAllApplications([]);
      return;
    }
    setLoadingApplications(true);
    const jobsPromise = listJobs(accessToken, { page: 1, limit: 100, my_jobs: !canManageUsers });

    const jobsPage1 = await jobsPromise;
    const jobs = Array.isArray(jobsPage1.jobs) ? [...jobsPage1.jobs] : [];
    const jobsPages = Math.max(1, Number(jobsPage1.pagination?.pages ?? 1));

    for (let page = 2; page <= jobsPages; page++) {
      const next = await listJobs(accessToken, { page, limit: 100, my_jobs: !canManageUsers });
      jobs.push(...(Array.isArray(next.jobs) ? next.jobs : []));
    }

    setAllJobs(jobs);

    const apps: JobApplication[] = [];
    const uniqueById = new Map<string, JobApplication>();

    await Promise.all(
      jobs.map(async (job) => {
        const jobId = String(job.id ?? "").trim();
        if (!jobId) return;

        const first = await listJobApplicationsForJob(accessToken, jobId, { page: 1, limit: APP_PAGE_SIZE });
        const pages = Math.max(1, Number(first.pagination?.pages ?? 1));

        const firstApps = Array.isArray(first.applications) ? first.applications : [];
        for (const app of firstApps) uniqueById.set(String(app.id), app);

        for (let page = 2; page <= pages; page++) {
          const next = await listJobApplicationsForJob(accessToken, jobId, { page, limit: APP_PAGE_SIZE });
          const nextApps = Array.isArray(next.applications) ? next.applications : [];
          for (const app of nextApps) uniqueById.set(String(app.id), app);
        }
      }),
    );

    for (const app of uniqueById.values()) apps.push(app);
    setAllApplications(apps);
    setLoadingApplications(false);
  }, [accessToken, canManageUsers, canViewApplicantsReport]);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        await Promise.all([loadDirectoryReport(), loadAdminStatsAndApplications()]);
      } catch (e) {
        if (active) setError((e as any)?.message ?? "Failed to load report data");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [accessToken, canManageUsers, canViewApplicantsReport]);

  const metrics = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((row) => row.is_active && !row.is_blocked).length;
    const blocked = rows.filter((row) => row.is_blocked).length;
    const verifiedUsers = rows.filter((row) => row.email_verified).length;
    const unverifiedUsers = rows.filter((row) => !row.email_verified).length;

    return {
      total,
      active,
      blocked,
      verifiedUsers,
      unverifiedUsers,
    };
  }, [rows]);

  const registrationByMonth = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row) => {
      const key = monthKey(row.created_at);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, count]) => ({ month, count }));
  }, [rows]);

  const directoryFilteredRows = useMemo(() => {
    if (reportType !== "job_seekers") return rows;
    if (!directoryGenderFilter) return rows;

    return rows.filter((row) => {
      const key = String(row.id ?? "");
      return normalizeGender(directoryGenderByUserId[key]) === directoryGenderFilter;
    });
  }, [rows, reportType, directoryGenderFilter, directoryGenderByUserId]);

  const applicationsFilteredBase = useMemo(() => {
    const searchQuery = applicationFilterSearch.trim().toLowerCase();
    const fromTs = applicationFilterFromDate ? new Date(`${applicationFilterFromDate}T00:00:00`).getTime() : NaN;
    const toTs = applicationFilterToDate ? new Date(`${applicationFilterToDate}T23:59:59`).getTime() : NaN;

    return allApplications.filter((app) => {
      if (applicationFilterJobId && String(app.job_id) !== applicationFilterJobId) return false;

      if (searchQuery) {
        const name = String(app.applicant_name ?? "").toLowerCase();
        const email = String(app.applicant_email ?? "").toLowerCase();
        const phone = String(app.applicant_phone ?? "").toLowerCase();
        if (!name.includes(searchQuery) && !email.includes(searchQuery) && !phone.includes(searchQuery)) return false;
      }

      const appliedTs = app.created_at ? new Date(String(app.created_at)).getTime() : NaN;
      if (Number.isFinite(fromTs) && (!Number.isFinite(appliedTs) || appliedTs < fromTs)) return false;
      if (Number.isFinite(toTs) && (!Number.isFinite(appliedTs) || appliedTs > toTs)) return false;

      return true;
    });
  }, [allApplications, applicationFilterJobId, applicationFilterSearch, applicationFilterFromDate, applicationFilterToDate]);

  const applicationStatusRows = useMemo(() => {
    const statusOrder = [
      "applied",
      "screening",
      "longlisted",
      "shortlisted",
      "interview",
      "assessment",
      "hired",
      "rejected",
      "withdrawn",
    ];

    const breakdown = applicationsFilteredBase.reduce<Record<string, number>>((acc, app) => {
      const key = normalizeApplicationStatus(app.workflow_status ?? app.status);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return statusOrder.map((status) => ({ status, count: Number(breakdown[status] ?? 0) }));
  }, [applicationsFilteredBase]);

  const funnelFilteredApplications = useMemo(() => {
    const fromTs = funnelFromDate ? new Date(`${funnelFromDate}T00:00:00`).getTime() : NaN;
    const toTs = funnelToDate ? new Date(`${funnelToDate}T23:59:59`).getTime() : NaN;

    return allApplications.filter((app) => {
      if (funnelFilterJobId && String(app.job_id) !== funnelFilterJobId) return false;
      const appliedTs = app.created_at ? new Date(String(app.created_at)).getTime() : NaN;
      if (Number.isFinite(fromTs) && (!Number.isFinite(appliedTs) || appliedTs < fromTs)) return false;
      if (Number.isFinite(toTs) && (!Number.isFinite(appliedTs) || appliedTs > toTs)) return false;
      return true;
    });
  }, [allApplications, funnelFilterJobId, funnelFromDate, funnelToDate]);

  const funnelRows = useMemo(() => {
    const stages = ["applied", "screening", "longlisted", "shortlisted", "interview", "assessment", "hired"];
    const total = funnelFilteredApplications.length;
    const counts = stages.map((stage) => {
      const count = funnelFilteredApplications.filter((app) => normalizeApplicationStatus(app.workflow_status ?? app.status) === stage).length;
      const conversion = total > 0 ? `${((count / total) * 100).toFixed(1)}%` : "0.0%";
      return { stage: titleStatus(stage), count, conversion };
    });
    return { total, rows: counts };
  }, [funnelFilteredApplications]);

  const jobsWithoutApplicantsRows = useMemo(() => {
    const searchQuery = jobsWithoutApplicantsSearch.trim().toLowerCase();
    const appsByJob = new Map<string, number>();
    for (const app of allApplications) {
      const jobId = String(app.job_id ?? "").trim();
      if (!jobId) continue;
      appsByJob.set(jobId, (appsByJob.get(jobId) ?? 0) + 1);
    }

    return allJobs
      .filter((job) => {
        const jobId = String(job.id ?? "").trim();
        if (!jobId) return false;
        if ((appsByJob.get(jobId) ?? 0) > 0) return false;
        if (!searchQuery) return true;
        const title = String(job.title ?? "").toLowerCase();
        const company = String(job.company ?? job.company_name ?? "").toLowerCase();
        return title.includes(searchQuery) || company.includes(searchQuery);
      })
      .map((job) => ({
        id: String(job.id ?? ""),
        title: String(job.title ?? "—"),
        company: String(job.company ?? job.company_name ?? "—"),
        status: titleStatus(String(job.status ?? "unknown")),
        createdAt: formatDate(job.created_at),
      }));
  }, [allJobs, allApplications, jobsWithoutApplicantsSearch]);

  const companyHiringPerformanceRows = useMemo(() => {
    const searchQuery = companyPerformanceSearch.trim().toLowerCase();
    const jobsById = new Map<string, JobListItem>();
    for (const job of allJobs) jobsById.set(String(job.id ?? ""), job);

    const map = new Map<string, { company: string; jobs: Set<string>; applicants: number; hired: number; rejected: number }>();

    for (const app of allApplications) {
      const job = jobsById.get(String(app.job_id ?? ""));
      const company = String(job?.company ?? job?.company_name ?? "Unknown Company");
      const key = company.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { company, jobs: new Set<string>(), applicants: 0, hired: 0, rejected: 0 });
      }
      const bucket = map.get(key)!;
      bucket.jobs.add(String(app.job_id ?? ""));
      bucket.applicants += 1;
      const normalized = normalizeApplicationStatus(app.workflow_status ?? app.status);
      if (normalized === "hired") bucket.hired += 1;
      if (normalized === "rejected") bucket.rejected += 1;
    }

    return Array.from(map.values())
      .filter((row) => !searchQuery || row.company.toLowerCase().includes(searchQuery))
      .sort((a, b) => b.applicants - a.applicants)
      .map((row) => ({
        company: row.company,
        jobs: row.jobs.size,
        applicants: row.applicants,
        hired: row.hired,
        rejected: row.rejected,
        hireRate: row.applicants > 0 ? `${((row.hired / row.applicants) * 100).toFixed(1)}%` : "0.0%",
      }));
  }, [allJobs, allApplications, companyPerformanceSearch]);

  const filteredApplicationsBySelectedStatus = useMemo(() => {
    if (!selectedStatus) return [];
    return applicationsFilteredBase.filter(
      (app) => normalizeApplicationStatus(app.workflow_status ?? app.status) === selectedStatus,
    );
  }, [applicationsFilteredBase, selectedStatus]);

  const jobTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const job of allJobs) {
      const id = String(job.id ?? "").trim();
      const title = String(job.title ?? "").trim();
      if (id && title) map.set(id, title);
    }
    return map;
  }, [allJobs]);

  const resolvedTypedJob = useMemo(() => {
    const input = selectedJobInput.trim().toLowerCase();
    if (!input) return null;

    const exact = allJobs.find((job) => {
      const title = String(job.title ?? "").trim().toLowerCase();
      const company = String(job.company ?? job.company_name ?? "").trim().toLowerCase();
      const label = `${title} (${company || "company"})`;
      return title === input || label === input;
    });
    if (exact) return exact;

    return allJobs.find((job) => {
      const title = String(job.title ?? "").trim().toLowerCase();
      const company = String(job.company ?? job.company_name ?? "").trim().toLowerCase();
      const label = `${title} (${company || "company"})`;
      return title.includes(input) || company.includes(input) || label.includes(input);
    }) ?? null;
  }, [allJobs, selectedJobInput]);

  const filteredJobSuggestions = useMemo(() => {
    const input = selectedJobInput.trim().toLowerCase();
    if (!input) return [] as JobListItem[];
    return allJobs
      .filter((job) => {
        const title = String(job.title ?? "").trim().toLowerCase();
        const company = String(job.company ?? job.company_name ?? "").trim().toLowerCase();
        const label = `${title} (${company || "company"})`;
        return title.includes(input) || company.includes(input) || label.includes(input);
      })
      .slice(0, 8);
  }, [allJobs, selectedJobInput]);

  useEffect(() => {
    const matched = resolvedTypedJob;
    if (!matched) {
      setSelectedJobId("");
      setSelectedJobTitle("");
      setSelectedJobCompany("");
      return;
    }

    setSelectedJobId(String(matched.id ?? ""));
    setSelectedJobTitle(String(matched.title ?? ""));
    setSelectedJobCompany(String(matched.company ?? matched.company_name ?? ""));
  }, [resolvedTypedJob]);

  const filteredJobApplicantRows = useMemo(() => {
    const q = jobApplicantsSearch.trim().toLowerCase();
    const fromTs = jobApplicantsFromDate ? new Date(`${jobApplicantsFromDate}T00:00:00`).getTime() : NaN;
    const toTs = jobApplicantsToDate ? new Date(`${jobApplicantsToDate}T23:59:59`).getTime() : NaN;

    return jobApplicantRows.filter((row) => {
      const status = normalizeApplicationStatus(row.app.workflow_status ?? row.app.status);
      if (jobApplicantsStatusFilter && status !== jobApplicantsStatusFilter) return false;

      const gender = normalizeGender(String((row.personalDetails as any)?.gender ?? ""));
      if (jobApplicantsGenderFilter && gender !== jobApplicantsGenderFilter) return false;

      if (q) {
        const name = String(row.app.applicant_name ?? "").toLowerCase();
        const email = String(row.app.applicant_email ?? "").toLowerCase();
        const phone = String(row.app.applicant_phone ?? "").toLowerCase();
        if (!name.includes(q) && !email.includes(q) && !phone.includes(q)) return false;
      }

      const appliedTs = row.app.created_at ? new Date(String(row.app.created_at)).getTime() : NaN;
      if (Number.isFinite(fromTs) && (!Number.isFinite(appliedTs) || appliedTs < fromTs)) return false;
      if (Number.isFinite(toTs) && (!Number.isFinite(appliedTs) || appliedTs > toTs)) return false;

      return true;
    });
  }, [jobApplicantRows, jobApplicantsSearch, jobApplicantsStatusFilter, jobApplicantsGenderFilter, jobApplicantsFromDate, jobApplicantsToDate]);

  const pagedApplicantsRows = useMemo(() => {
    const page = normalizePage(filteredJobApplicantRows.length, applicantsPage);
    const start = (page - 1) * REPORT_PAGE_SIZE;
    return {
      page,
      pages: Math.max(1, Math.ceil(filteredJobApplicantRows.length / REPORT_PAGE_SIZE)),
      total: filteredJobApplicantRows.length,
      rows: filteredJobApplicantRows.slice(start, start + REPORT_PAGE_SIZE),
    };
  }, [filteredJobApplicantRows, applicantsPage]);

  const pagedDirectoryRows = useMemo(() => {
    const page = normalizePage(directoryFilteredRows.length, directoryPage);
    const start = (page - 1) * REPORT_PAGE_SIZE;
    return {
      page,
      pages: Math.max(1, Math.ceil(directoryFilteredRows.length / REPORT_PAGE_SIZE)),
      total: directoryFilteredRows.length,
      rows: directoryFilteredRows.slice(start, start + REPORT_PAGE_SIZE),
    };
  }, [directoryFilteredRows, directoryPage]);

  const pagedMonthlyRows = useMemo(() => {
    const page = normalizePage(registrationByMonth.length, monthlyPage);
    const start = (page - 1) * REPORT_PAGE_SIZE;
    return {
      page,
      pages: Math.max(1, Math.ceil(registrationByMonth.length / REPORT_PAGE_SIZE)),
      total: registrationByMonth.length,
      rows: registrationByMonth.slice(start, start + REPORT_PAGE_SIZE),
    };
  }, [registrationByMonth, monthlyPage]);

  const pagedJobsWithoutApplicantsRows = useMemo(() => {
    const page = normalizePage(jobsWithoutApplicantsRows.length, jobsWithoutApplicantsPage);
    const start = (page - 1) * REPORT_PAGE_SIZE;
    return {
      page,
      pages: Math.max(1, Math.ceil(jobsWithoutApplicantsRows.length / REPORT_PAGE_SIZE)),
      total: jobsWithoutApplicantsRows.length,
      rows: jobsWithoutApplicantsRows.slice(start, start + REPORT_PAGE_SIZE),
    };
  }, [jobsWithoutApplicantsRows, jobsWithoutApplicantsPage]);

  const pagedCompanyPerformanceRows = useMemo(() => {
    const page = normalizePage(companyHiringPerformanceRows.length, companyPerformancePage);
    const start = (page - 1) * REPORT_PAGE_SIZE;
    return {
      page,
      pages: Math.max(1, Math.ceil(companyHiringPerformanceRows.length / REPORT_PAGE_SIZE)),
      total: companyHiringPerformanceRows.length,
      rows: companyHiringPerformanceRows.slice(start, start + REPORT_PAGE_SIZE),
    };
  }, [companyHiringPerformanceRows, companyPerformancePage]);

  useEffect(() => {
    setApplicantsPage(1);
  }, [selectedJobId, jobApplicantsSearch, jobApplicantsStatusFilter, jobApplicantsGenderFilter, jobApplicantsFromDate, jobApplicantsToDate, jobApplicantRows]);

  useEffect(() => {
    setDirectoryPage(1);
    setMonthlyPage(1);
  }, [directoryFilteredRows, registrationByMonth]);

  useEffect(() => {
    setJobsWithoutApplicantsPage(1);
  }, [jobsWithoutApplicantsSearch, jobsWithoutApplicantsRows.length]);

  useEffect(() => {
    setCompanyPerformancePage(1);
  }, [companyPerformanceSearch, companyHiringPerformanceRows.length]);

  useEffect(() => {
    if (reportType !== "job_seekers") return;
    const ids = rows.map((row) => String(row.id ?? "")).filter(Boolean);
    void loadDirectoryGenders(ids);
  }, [reportType, rows, directoryGenderFilter, loadDirectoryGenders]);

  useEffect(() => {
    const urlStatus = normalizeApplicationStatus(searchParams.get("application_status") ?? "");
    if (urlStatus !== selectedStatus) {
      setSelectedStatus(urlStatus);
    }
  }, [searchParams, selectedStatus]);

  function onClickStatus(statusKey: string) {
    const nextStatus = selectedStatus === statusKey ? "" : statusKey;
    const next = new URLSearchParams(searchParams);
    if (nextStatus) {
      next.set("application_status", nextStatus);
    } else {
      next.delete("application_status");
    }
    setSearchParams(next, { replace: true });
    setSelectedStatus(nextStatus);
    navigate(`/app/reports?${next.toString()}`);
  }

  async function loadApplicantsForSelectedJob() {
    if (!accessToken || !selectedJobId) return;
    setLoadingJobApplicants(true);
    setError(null);

    try {
      const first = await listJobApplicationsForJob(accessToken, selectedJobId, { page: 1, limit: APP_PAGE_SIZE });
      const pages = Math.max(1, Number(first.pagination?.pages ?? 1));
      const apps = Array.isArray(first.applications) ? [...first.applications] : [];
      setSelectedJobTitle(String(first.job_title ?? ""));
      const selectedJob = allJobs.find((job) => String(job.id) === String(selectedJobId));
      setSelectedJobCompany(String(selectedJob?.company ?? selectedJob?.company_name ?? ""));

      for (let page = 2; page <= pages; page++) {
        const next = await listJobApplicationsForJob(accessToken, selectedJobId, { page, limit: APP_PAGE_SIZE });
        if (Array.isArray(next.applications)) apps.push(...next.applications);
      }

      const withProfile = await Promise.all(
        apps.map(async (app) => {
          let profileData: any = null;
          try {
            if (app.applicant_id) {
              profileData = await getJobSeekerFullProfile(accessToken, String(app.applicant_id));
            }
          } catch {
            profileData = null;
          }

          const profile = profileData?.profile ?? null;
          const personalDetails = profileData?.personalDetails ?? null;
          const addresses = Array.isArray(profileData?.addresses) ? profileData.addresses : [];
          const education = Array.isArray(profileData?.education) ? profileData.education : [];
          const experience = Array.isArray(profileData?.experience) ? profileData.experience : [];

          const skills = Array.isArray((profile as any)?.skills)
            ? (profile as any).skills.map((s: any) => s?.name ?? s).filter(Boolean).join(", ")
            : "";

          const certifications = Array.isArray((profile as any)?.certifications)
            ? (profile as any).certifications.map((c: any) => c?.name ?? c).filter(Boolean).join(", ")
            : "";

          return {
            app,
            profile,
            personalDetails,
            addresses,
            education,
            experience,
            skills,
            certifications,
          } as ApplicantDetailsRow;
        }),
      );

      setJobApplicantRows(withProfile);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to load applicants for selected job");
      setJobApplicantRows([]);
    } finally {
      setLoadingJobApplicants(false);
    }
  }

  function buildDirectoryExportRows() {
    if (reportType === "job_seekers") {
      return directoryFilteredRows.map((row) => ({
        Name: fullName(row),
        Email: row.email ?? "—",
        Phone: row.phone ?? "—",
        Gender: titleStatus(normalizeGender(directoryGenderByUserId[String(row.id ?? "")]) || "unknown"),
        Status: statusLabel(row),
        Verified: row.email_verified ? "Yes" : "No",
        "Created At": formatDate(row.created_at),
        "Last Login": formatDate(row.last_login),
      }));
    }

    return directoryFilteredRows.map((row) => ({
      "Company Name": row.company_name ?? "—",
      Contact: fullName(row),
      Email: row.email ?? "—",
      Phone: row.phone ?? "—",
      Status: statusLabel(row),
      Verified: row.email_verified ? "Yes" : "No",
      "Created At": formatDate(row.created_at),
      "Last Login": formatDate(row.last_login),
    }));
  }

  function buildApplicantReportRows() {
    return filteredJobApplicantRows.map((row) => {
      const addr = row.addresses[0] ?? {};
      const edu = row.education[0] ?? {};
      const exp = row.experience[0] ?? {};
      return {
        Applicant: row.app.applicant_name ?? "—",
        Email: row.app.applicant_email ?? "—",
        Phone: row.app.applicant_phone ?? "—",
        Status: titleStatus(normalizeApplicationStatus(row.app.workflow_status ?? row.app.status)),
        "Applied Date": formatDate(row.app.created_at),
        "Date of Birth": formatDateOnly(String((row.personalDetails as any)?.date_of_birth ?? "")),
        Nationality: String((row.personalDetails as any)?.nationality ?? "—"),
        Gender: String((row.personalDetails as any)?.gender ?? "—"),
        Address: [addr?.address_line1, addr?.address_line2, addr?.city, addr?.country].filter(Boolean).join(", ") || "—",
        "Top Education": String(edu?.qualification_type ?? edu?.institution_name ?? "—"),
        "Latest Experience": String(exp?.job_title ?? exp?.company_name ?? "—"),
        Skills: row.skills || "—",
        Certifications: row.certifications || "—",
      };
    });
  }

  function exportDirectoryExcel() {
    const reportRows = buildDirectoryExportRows();
    const workbook = XLSX.utils.book_new();

    const reportSheet = XLSX.utils.json_to_sheet(reportRows);
    XLSX.utils.book_append_sheet(workbook, reportSheet, "Records");

    const summarySheet = XLSX.utils.json_to_sheet([
      { Metric: "Report Type", Value: reportType === "job_seekers" ? "Job Seekers" : "Companies" },
      { Metric: "Generated At", Value: formatDate(lastGeneratedAt) },
      { Metric: "Total Records", Value: metrics.total },
      { Metric: "Active", Value: metrics.active },
      { Metric: "Blocked", Value: metrics.blocked },
      { Metric: "Verified", Value: metrics.verifiedUsers },
      { Metric: "Unverified", Value: metrics.unverifiedUsers },
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    const monthlySheet = XLSX.utils.json_to_sheet(registrationByMonth.map((item) => ({
      Month: item.month,
      Count: item.count,
    })));
    XLSX.utils.book_append_sheet(workbook, monthlySheet, "Monthly Signups");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `${reportType}-report-${stamp}.xlsx`);
  }

  function exportDirectoryPdf() {
    const reportRows = buildDirectoryExportRows();
    const columns = reportRows.length > 0 ? Object.keys(reportRows[0]) : [];
    const body = reportRows.map((row) => columns.map((column) => String((row as any)[column] ?? "")));

    const doc = new jsPDF({ orientation: "landscape" });
    const reportTitle = reportType === "job_seekers" ? "Job Seekers Report" : "Companies Report";
    doc.setFillColor(26, 54, 93);
    doc.rect(0, 0, 297, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text(reportTitle, 14, 12);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDate(lastGeneratedAt)}`, 14, 20);
    doc.text(`Total Records: ${directoryFilteredRows.length}`, 110, 20);
    doc.setTextColor(40, 40, 40);

    autoTable(doc, {
      startY: 34,
      head: [columns],
      body,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fontSize: 9, fillColor: [26, 54, 93], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`${reportType}-report-${stamp}.pdf`);
  }

  function exportApplicantsExcel() {
    const rows = buildApplicantReportRows();
    if (rows.length === 0) return;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Applicants");

    const summary = XLSX.utils.json_to_sheet([
      { Metric: "Report", Value: "Applicants Report By Job" },
      { Metric: "Job", Value: selectedJobTitle || selectedJobId },
      { Metric: "Company", Value: selectedJobCompany || "—" },
      { Metric: "Total Applicants", Value: filteredJobApplicantRows.length },
      { Metric: "Generated At", Value: formatDate(new Date().toISOString()) },
    ]);
    XLSX.utils.book_append_sheet(workbook, summary, "Summary");

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `job-applicants-${stamp}.xlsx`);
  }

  function exportApplicantsPdf() {
    const rows = buildApplicantReportRows();
    if (rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    const body = rows.map((row) => columns.map((column) => String((row as any)[column] ?? "")));

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFillColor(31, 111, 235);
    doc.rect(0, 0, 297, 34, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Applicants Report By Job", 14, 12);
    doc.setFontSize(10);
    doc.text(`Job: ${selectedJobTitle || selectedJobId}`, 14, 20);
    doc.text(`Company: ${selectedJobCompany || "—"}`, 14, 27);
    doc.text(`Total Applicants: ${filteredJobApplicantRows.length}`, 170, 27);
    doc.setTextColor(40, 40, 40);

    autoTable(doc, {
      startY: 40,
      head: [columns],
      body,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fontSize: 8, fillColor: [31, 111, 235], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [244, 248, 255] },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`job-applicants-${stamp}.pdf`);
  }

  function exportStatusExcel() {
    if (!selectedStatus || filteredApplicationsBySelectedStatus.length === 0) return;
    const rows = filteredApplicationsBySelectedStatus.map((app) => {
      const jobName = String(app.job_title ?? "").trim() || jobTitleById.get(String(app.job_id)) || "Unknown Job";
      return {
        Applicant: app.applicant_name ?? "—",
        Email: app.applicant_email ?? "—",
        Phone: app.applicant_phone ?? "—",
        Job: jobName,
        Status: titleStatus(normalizeApplicationStatus(app.workflow_status ?? app.status)),
        "Date Applied": formatDate(app.created_at),
      };
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Applications");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `applications-${selectedStatus}-${stamp}.xlsx`);
  }

  function exportStatusPdf() {
    if (!selectedStatus || filteredApplicationsBySelectedStatus.length === 0) return;
    const rows = filteredApplicationsBySelectedStatus.map((app) => {
      const jobName = String(app.job_title ?? "").trim() || jobTitleById.get(String(app.job_id)) || "Unknown Job";
      return {
        Applicant: app.applicant_name ?? "—",
        Email: app.applicant_email ?? "—",
        Phone: app.applicant_phone ?? "—",
        Job: jobName,
        Status: titleStatus(normalizeApplicationStatus(app.workflow_status ?? app.status)),
        "Date Applied": formatDate(app.created_at),
      };
    });

    const columns = Object.keys(rows[0]);
    const body = rows.map((row) => columns.map((column) => String((row as any)[column] ?? "")));

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFillColor(73, 95, 152);
    doc.rect(0, 0, 297, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text(`Applications by Status: ${titleStatus(selectedStatus)}`, 14, 12);
    doc.setFontSize(10);
    doc.text(`Records: ${rows.length}`, 14, 20);
    doc.setTextColor(40, 40, 40);

    autoTable(doc, {
      startY: 36,
      head: [columns],
      body,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fontSize: 9, fillColor: [73, 95, 152], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 247, 252] },
    });

    const stamp = new Date().toISOString().slice(0, 10);
    doc.save(`applications-${selectedStatus}-${stamp}.pdf`);
  }

  function exportMonthlySignupsExcel() {
    const rows = registrationByMonth.map((item) => ({ Month: item.month, Count: item.count }));
    if (rows.length === 0) return;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Monthly Signups");
    XLSX.writeFile(workbook, `directory-monthly-signups-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportMonthlySignupsPdf() {
    const rows = registrationByMonth.map((item) => ({ Month: item.month, Count: item.count }));
    if (rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    const body = rows.map((row) => columns.map((column) => String((row as any)[column] ?? "")));
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFillColor(26, 54, 93);
    doc.rect(0, 0, 297, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Directory Monthly Signups", 14, 12);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 14, 20);
    doc.setTextColor(40, 40, 40);
    autoTable(doc, {
      startY: 34,
      head: [columns],
      body,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [26, 54, 93], textColor: [255, 255, 255] },
    });
    doc.save(`directory-monthly-signups-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportFunnelExcel() {
    if (funnelRows.rows.length === 0) return;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(funnelRows.rows), "Hiring Funnel");
    XLSX.writeFile(workbook, `hiring-funnel-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportFunnelPdf() {
    if (funnelRows.rows.length === 0) return;
    const columns = Object.keys(funnelRows.rows[0]);
    const body = funnelRows.rows.map((row) => columns.map((column) => String((row as any)[column] ?? "")));
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFillColor(31, 111, 235);
    doc.rect(0, 0, 297, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Hiring Funnel Overview", 14, 12);
    doc.setFontSize(10);
    doc.text(`Total Applications: ${funnelRows.total}`, 14, 20);
    doc.setTextColor(40, 40, 40);
    autoTable(doc, {
      startY: 34,
      head: [columns],
      body,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [31, 111, 235], textColor: [255, 255, 255] },
    });
    doc.save(`hiring-funnel-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportJobsWithoutApplicantsExcel() {
    if (jobsWithoutApplicantsRows.length === 0) return;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(jobsWithoutApplicantsRows), "Jobs Without Applicants");
    XLSX.writeFile(workbook, `jobs-without-applicants-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportJobsWithoutApplicantsPdf() {
    if (jobsWithoutApplicantsRows.length === 0) return;
    const columns = Object.keys(jobsWithoutApplicantsRows[0]);
    const body = jobsWithoutApplicantsRows.map((row) => columns.map((column) => String((row as any)[column] ?? "")));
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFillColor(73, 95, 152);
    doc.rect(0, 0, 297, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Jobs Without Applicants", 14, 12);
    doc.setFontSize(10);
    doc.text(`Records: ${jobsWithoutApplicantsRows.length}`, 14, 20);
    doc.setTextColor(40, 40, 40);
    autoTable(doc, {
      startY: 34,
      head: [columns],
      body,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [73, 95, 152], textColor: [255, 255, 255] },
    });
    doc.save(`jobs-without-applicants-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function exportCompanyPerformanceExcel() {
    if (companyHiringPerformanceRows.length === 0) return;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(companyHiringPerformanceRows), "Company Performance");
    XLSX.writeFile(workbook, `company-hiring-performance-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportCompanyPerformancePdf() {
    if (companyHiringPerformanceRows.length === 0) return;
    const columns = Object.keys(companyHiringPerformanceRows[0]);
    const body = companyHiringPerformanceRows.map((row) => columns.map((column) => String((row as any)[column] ?? "")));
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFillColor(26, 54, 93);
    doc.rect(0, 0, 297, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("Company Hiring Performance", 14, 12);
    doc.setFontSize(10);
    doc.text(`Records: ${companyHiringPerformanceRows.length}`, 14, 20);
    doc.setTextColor(40, 40, 40);
    autoTable(doc, {
      startY: 34,
      head: [columns],
      body,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [26, 54, 93], textColor: [255, 255, 255] },
    });
    doc.save(`company-hiring-performance-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  useEffect(() => {
    setStatusPageByKey({});
  }, [applicationFilterJobId, applicationFilterSearch, applicationFilterFromDate, applicationFilterToDate, allApplications]);

  function renderPager(
    page: number,
    pages: number,
    total: number,
    onPageChange: (nextPage: number) => void,
    label: string,
  ) {
    return (
      <div className="publicJobsPager" role="navigation" aria-label={label} style={{ marginTop: 10 }}>
        <button
          className="btn btnPrimary btnSm"
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          {"<-"} Previous
        </button>
        <span className="publicJobsPagerInfo">Page {page} of {pages} ({total} records)</span>
        <button
          className="btn btnPrimary btnSm"
          type="button"
          onClick={() => onPageChange(Math.min(pages, page + 1))}
          disabled={page >= pages}
        >
          Next {"->"}
        </button>
      </div>
    );
  }

  function toggleReport(report: ReportKey) {
    setOpenReports((prev) => ({ ...prev, [report]: !prev[report] }));
  }

  function reportButtonClass(report: ReportKey) {
    void report;
    return "btn btnPrimary btnSm";
  }

  function reportSummary(report: ReportKey) {
    const summaries: Record<ReportKey, string> = {
      applicants_by_job: "Shows applicant details for a selected job and application stage.",
      applications_by_status: "Breaks down application totals by status with drill-down records.",
      directory: "Lists job seeker or company profiles using selected filters.",
      monthly_signups: "Shows how many new directory users signed up each month.",
      hiring_funnel: "Summarizes movement and conversion across hiring workflow stages.",
      jobs_without_applicants: "Highlights active jobs that currently have zero applicants.",
      company_hiring_performance: "Compares company-level hiring outcomes and hire rates.",
    };
    return summaries[report];
  }

  function renderCollapsedArrow(report: ReportKey) {
    return (
      <div className="reportsExpandWrap">
        <button
          type="button"
          className="reportsExpandBracket"
          aria-label="Expand report"
          onClick={() => toggleReport(report)}
        >
          <span className="reportsExpandGlyph">⌄</span>
        </button>
      </div>
    );
  }

  async function runReport(report: ReportKey) {
    if (report === "directory") {
      await loadDirectoryReport();
    }
    if (report === "applications_by_status" || report === "hiring_funnel" || report === "jobs_without_applicants" || report === "company_hiring_performance") {
      await loadAdminStatsAndApplications();
    }
    setRanReports((prev) => ({ ...prev, [report]: true }));
  }

  if (loading) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Reports &amp; Statistics</h1></div>
        <div className="placeholderSpinnerWrap" role="status" aria-live="polite">
          <span className="placeholderSpinner" aria-hidden="true" />
          <span className="srOnly">Loading</span>
        </div>
      </div>
    );
  }

  if (!canViewReports) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Reports &amp; Statistics</h1></div>
        <div className="errorBox">Insufficient permissions. Required permission: VIEW_AUDIT_LOGS or MANAGE_USERS.</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle" style={{ fontSize: "2rem", fontWeight: 800, color: "var(--heading)", letterSpacing: "0.02em" }}>Reports &amp; Statistics</h1>
      </div>

      {error ? <div className="errorBox">{error}</div> : null}

      {canViewApplicantsReport ? (
        <>
          <div className={`dropPanel reportsCard ${openReports.applicants_by_job ? "reportsCardExpanded" : "reportsCardCollapsed"}`} style={{ marginTop: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <SectionTitle>Applicants Report By Specific Job</SectionTitle>
              {!openReports.applicants_by_job ? <p className="reportsCardHint">{reportSummary("applicants_by_job")}</p> : null}
              {openReports.applicants_by_job ? (
              <div className="reportsCardActions">
                <button
                  type="button"
                  className={reportButtonClass("applicants_by_job")}
                  onClick={() => toggleReport("applicants_by_job")}
                >
                  {openReports.applicants_by_job ? "Collapse" : "Expand"}
                </button>
                <button
                  type="button"
                  className={reportButtonClass("applicants_by_job")}
                  onClick={() => void runReport("applicants_by_job")}
                >
                  Run Report
                </button>
                <button
                  type="button"
                  className={reportButtonClass("applicants_by_job")}
                  disabled={filteredJobApplicantRows.length === 0}
                  onClick={exportApplicantsPdf}
                >
                  Export Applicants PDF
                </button>
                <button
                  type="button"
                  className={reportButtonClass("applicants_by_job")}
                  disabled={filteredJobApplicantRows.length === 0}
                  onClick={exportApplicantsExcel}
                >
                  Export Applicants Excel
                </button>
              </div>
              ) : null}
            </div>

            {openReports.applicants_by_job ? (
              <>
                <div className="dropPanel" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ minWidth: 360, flex: "1 1 360px" }}>
              <label className="fieldLabel">Select Job (Type to search)</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  value={selectedJobInput}
                  placeholder="Type job name..."
                  onFocus={() => setShowJobSuggestions(true)}
                  onBlur={() => {
                    window.setTimeout(() => setShowJobSuggestions(false), 150);
                  }}
                  onChange={(e) => {
                    setSelectedJobInput(e.target.value);
                    setShowJobSuggestions(true);
                    setJobApplicantRows([]);
                  }}
                />
                {showJobSuggestions && filteredJobSuggestions.length > 0 ? (
                  <div
                    className="dropPanel"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "calc(100% + 4px)",
                      zIndex: 20,
                      maxHeight: 220,
                      overflowY: "auto",
                      padding: 6,
                    }}
                  >
                    {filteredJobSuggestions.map((job) => {
                      const label = `${String(job.title ?? "Untitled Job")} (${String(job.company ?? job.company_name ?? "Company")})`;
                      return (
                        <button
                          key={String(job.id)}
                          type="button"
                          className="btn btnGhost btnSm"
                          style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4 }}
                          onClick={() => {
                            setSelectedJobInput(label);
                            setSelectedJobId(String(job.id ?? ""));
                            setSelectedJobTitle(String(job.title ?? ""));
                            setSelectedJobCompany(String(job.company ?? job.company_name ?? ""));
                            setShowJobSuggestions(false);
                            setJobApplicantRows([]);
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
            <div style={{ minWidth: 220, flex: "1 1 220px" }}>
              <label className="fieldLabel">Applicant Search</label>
              <input
                className="input"
                value={jobApplicantsSearch}
                onChange={(e) => setJobApplicantsSearch(e.target.value)}
                placeholder="Name, email, phone"
              />
            </div>
            <div style={{ minWidth: 180, flex: "1 1 180px" }}>
              <label className="fieldLabel">Application Status</label>
              <select className="input" value={jobApplicantsStatusFilter} onChange={(e) => setJobApplicantsStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="applied">Applied</option>
                <option value="screening">Screening</option>
                <option value="longlisted">Longlisted</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="interview">Interview</option>
                <option value="assessment">Assessment</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
                <option value="withdrawn">Withdrawn</option>
              </select>
            </div>
            <div style={{ minWidth: 160, flex: "1 1 160px" }}>
              <label className="fieldLabel">Gender</label>
              <select className="input" value={jobApplicantsGenderFilter} onChange={(e) => setJobApplicantsGenderFilter(e.target.value)}>
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ minWidth: 160, flex: "1 1 160px" }}>
              <label className="fieldLabel">Applied From</label>
              <input className="input" type="date" value={jobApplicantsFromDate} onChange={(e) => setJobApplicantsFromDate(e.target.value)} />
            </div>
            <div style={{ minWidth: 160, flex: "1 1 160px" }}>
              <label className="fieldLabel">Applied To</label>
              <input className="input" type="date" value={jobApplicantsToDate} onChange={(e) => setJobApplicantsToDate(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                className={reportButtonClass("applicants_by_job")}
                disabled={!selectedJobId || loadingJobApplicants}
                onClick={() => void loadApplicantsForSelectedJob()}
              >
                {loadingJobApplicants ? "Loading..." : "Generate Applicants Report"}
              </button>
            </div>
                </div>

                {!ranReports.applicants_by_job ? (
                  <p className="pageText">Click Run Report, choose a job, then click Generate Applicants Report.</p>
                ) : null}

                <div className="tableWrap">
            {renderPager(
              pagedApplicantsRows.page,
              pagedApplicantsRows.pages,
              pagedApplicantsRows.total,
              setApplicantsPage,
              "Applicants report pagination top",
            )}
            <table className="table companiesTable">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Gender</th>
                  <th>Date of Birth</th>
                  <th>Nationality</th>
                  <th>Address</th>
                  <th>Education</th>
                  <th>Experience</th>
                  <th>Skills</th>
                  <th>Certifications</th>
                </tr>
              </thead>
              <tbody>
                {pagedApplicantsRows.total === 0 ? (
                  <tr>
                    <td colSpan={12}>
                      {selectedJobId
                        ? "No applicants found for this job or report not generated yet."
                        : "Select a job and click Generate Applicants Report."}
                    </td>
                  </tr>
                ) : (
                  pagedApplicantsRows.rows.map((row) => {
                    const addr = row.addresses[0] ?? {};
                    const edu = row.education[0] ?? {};
                    const exp = row.experience[0] ?? {};
                    return (
                      <tr key={row.app.id}>
                        <td>{row.app.applicant_name ?? "—"}</td>
                        <td>{row.app.applicant_email ?? "—"}</td>
                        <td>{row.app.applicant_phone ?? "—"}</td>
                        <td>{titleStatus(normalizeApplicationStatus(row.app.workflow_status ?? row.app.status))}</td>
                        <td>{String((row.personalDetails as any)?.gender ?? "—")}</td>
                        <td>{formatDateOnly(String((row.personalDetails as any)?.date_of_birth ?? ""))}</td>
                        <td>{String((row.personalDetails as any)?.nationality ?? "—")}</td>
                        <td>{[addr?.address_line1, addr?.address_line2, addr?.city, addr?.country].filter(Boolean).join(", ") || "—"}</td>
                        <td>{String(edu?.qualification_type ?? edu?.institution_name ?? "—")}</td>
                        <td>{String(exp?.job_title ?? exp?.company_name ?? "—")}</td>
                        <td>{row.skills || "—"}</td>
                        <td>{row.certifications || "—"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
                </div>
                {renderPager(
                  pagedApplicantsRows.page,
                  pagedApplicantsRows.pages,
                  pagedApplicantsRows.total,
                  setApplicantsPage,
                  "Applicants report pagination",
                )}
              </>
            ) : renderCollapsedArrow("applicants_by_job")}
          </div>

          <div className={`dropPanel reportsCard ${openReports.applications_by_status ? "reportsCardExpanded" : "reportsCardCollapsed"}`} style={{ marginTop: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <SectionTitle>Applications by Status</SectionTitle>
              {!openReports.applications_by_status ? <p className="reportsCardHint">{reportSummary("applications_by_status")}</p> : null}
              {openReports.applications_by_status ? (
              <div className="reportsCardActions">
                <button
                  type="button"
                  className={reportButtonClass("applications_by_status")}
                  onClick={() => toggleReport("applications_by_status")}
                >
                  {openReports.applications_by_status ? "Collapse" : "Expand"}
                </button>
                <button
                  type="button"
                  className={reportButtonClass("applications_by_status")}
                  onClick={() => void runReport("applications_by_status")}
                >
                  Run Report
                </button>
                <button
                  type="button"
                  className={reportButtonClass("applications_by_status")}
                  disabled={!selectedStatus || filteredApplicationsBySelectedStatus.length === 0}
                  onClick={exportStatusPdf}
                >
                  Export Status PDF
                </button>
                <button
                  type="button"
                  className={reportButtonClass("applications_by_status")}
                  disabled={!selectedStatus || filteredApplicationsBySelectedStatus.length === 0}
                  onClick={exportStatusExcel}
                >
                  Export Status Excel
                </button>
              </div>
              ) : null}
            </div>

            {openReports.applications_by_status ? (
              <>
                {!ranReports.applications_by_status ? (
                  <p className="pageText">Click Run Report to load latest status analytics.</p>
                ) : null}
                <div className="dropPanel" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ minWidth: 280, flex: "1 1 280px" }}>
              <label className="fieldLabel">Filter by Job</label>
              <select className="input" value={applicationFilterJobId} onChange={(e) => setApplicationFilterJobId(e.target.value)}>
                <option value="">All jobs</option>
                {allJobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: 220, flex: "1 1 220px" }}>
              <label className="fieldLabel">Applicant Search</label>
              <input
                className="input"
                value={applicationFilterSearch}
                onChange={(e) => setApplicationFilterSearch(e.target.value)}
                placeholder="Name, email, phone"
              />
            </div>
            <div style={{ minWidth: 160, flex: "1 1 160px" }}>
              <label className="fieldLabel">Applied From</label>
              <input className="input" type="date" value={applicationFilterFromDate} onChange={(e) => setApplicationFilterFromDate(e.target.value)} />
            </div>
            <div style={{ minWidth: 160, flex: "1 1 160px" }}>
              <label className="fieldLabel">Applied To</label>
              <input className="input" type="date" value={applicationFilterToDate} onChange={(e) => setApplicationFilterToDate(e.target.value)} />
            </div>
                </div>
                <div className="tableWrap">
            <table className="table companiesTable">
              <thead>
                <tr>
                  <th>Status</th>
                  <th className="thRight">Count</th>
                  <th className="thRight">Action</th>
                </tr>
              </thead>
              <tbody>
                {applicationStatusRows.length === 0 ? (
                  <tr><td colSpan={3}>No application status data available.</td></tr>
                ) : (
                  applicationStatusRows.map((row) => {
                    const isOpen = selectedStatus === row.status;
                    const scoped = isOpen ? filteredApplicationsBySelectedStatus : [];
                    const statusPage = normalizePage(scoped.length, statusPageByKey[row.status] ?? 1);
                    const statusPages = Math.max(1, Math.ceil(scoped.length / REPORT_PAGE_SIZE));
                    const scopedStart = (statusPage - 1) * REPORT_PAGE_SIZE;
                    const scopedRows = scoped.slice(scopedStart, scopedStart + REPORT_PAGE_SIZE);
                    return (
                      <Fragment key={row.status}>
                        <tr>
                          <td>{titleStatus(row.status)}</td>
                          <td className="tdRight">{row.count}</td>
                          <td className="tdRight">
                            <button
                              type="button"
                              className={reportButtonClass("applications_by_status")}
                              onClick={() => onClickStatus(row.status)}
                            >
                              {isOpen ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>
                        {isOpen ? (
                          <tr className="tableExpandRow">
                            <td colSpan={3}>
                              <div className="dropPanel" style={{ marginTop: 0 }}>
                                {scoped.length === 0 ? (
                                  <div className="emptyState">No applications found for this status.</div>
                                ) : (
                                  <>
                                    {renderPager(
                                      pagedApplicantsRows.page,
                                      pagedApplicantsRows.pages,
                                      pagedApplicantsRows.total,
                                      setApplicantsPage,
                                      "Applicants report pagination top",
                                    )}
                                    {renderPager(
                                      statusPage,
                                      statusPages,
                                      scoped.length,
                                      (nextPage) => setStatusPageByKey((prev) => ({ ...prev, [row.status]: nextPage })),
                                      `${row.status} applications pagination top`,
                                    )}
                                    <div className="tableWrap">
                                      <table className="table companiesTable">
                                        <thead>
                                          <tr>
                                            <th>Applicant</th>
                                            <th>Email</th>
                                            <th>Phone</th>
                                            <th>Job</th>
                                            <th>Status</th>
                                            <th>Date Applied</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {scopedRows.map((app) => {
                                            const jobName = String(app.job_title ?? "").trim() || jobTitleById.get(String(app.job_id)) || "Unknown Job";
                                            return (
                                              <tr key={app.id}>
                                                <td>{app.applicant_name ?? "—"}</td>
                                                <td>{app.applicant_email ?? "—"}</td>
                                                <td>{app.applicant_phone ?? "—"}</td>
                                                <td>{jobName}</td>
                                                <td>{titleStatus(normalizeApplicationStatus(app.workflow_status ?? app.status))}</td>
                                                <td>{formatDate(app.created_at)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                    {renderPager(
                                      statusPage,
                                      statusPages,
                                      scoped.length,
                                      (nextPage) => setStatusPageByKey((prev) => ({ ...prev, [row.status]: nextPage })),
                                      `${row.status} applications pagination`,
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
                </div>
              </>
            ) : renderCollapsedArrow("applications_by_status")}
          </div>
        </>
      ) : (
        <div className="errorBox" style={{ marginTop: 12 }}>
          Applicants reports are restricted. Required permission: VIEW_APPLICANTS_REPORT.
        </div>
      )}

      <div className={`dropPanel reportsCard ${openReports.directory ? "reportsCardExpanded" : "reportsCardCollapsed"}`} style={{ marginTop: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SectionTitle>Company &amp; Job Seeker Directory Report</SectionTitle>
          {!openReports.directory ? <p className="reportsCardHint">{reportSummary("directory")}</p> : null}
          {openReports.directory ? (
          <div className="reportsCardActions">
            <button type="button" className={reportButtonClass("directory")} onClick={() => toggleReport("directory")}>{openReports.directory ? "Collapse" : "Expand"}</button>
            <button type="button" className={reportButtonClass("directory")} onClick={() => void runReport("directory")} disabled={loading}>Run Report</button>
            <button type="button" className={reportButtonClass("directory")} onClick={exportDirectoryPdf} disabled={loading || rows.length === 0}>Export Directory PDF</button>
            <button type="button" className={reportButtonClass("directory")} onClick={exportDirectoryExcel} disabled={loading || rows.length === 0}>Export Directory Excel</button>
          </div>
          ) : null}
        </div>

        {openReports.directory ? (
          <>
            {!ranReports.directory ? <p className="pageText">Click Run Report to load the directory with your filters.</p> : null}
            <div className="dropPanel" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
              <div style={{ minWidth: 180, flex: "1 1 180px" }}>
                <label className="fieldLabel">Report Type</label>
                <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)}>
                  <option value="job_seekers">Job Seekers</option>
                  <option value="companies">Companies</option>
                </select>
              </div>
              <div style={{ minWidth: 220, flex: "1 1 220px" }}>
                <label className="fieldLabel">Search</label>
                <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, company" />
              </div>
              <div style={{ minWidth: 150, flex: "1 1 150px" }}>
                <label className="fieldLabel">Status</label>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div style={{ minWidth: 150, flex: "1 1 150px" }}>
                <label className="fieldLabel">Gender</label>
                <select
                  className="input"
                  value={directoryGenderFilter}
                  onChange={(e) => setDirectoryGenderFilter(e.target.value)}
                  disabled={reportType !== "job_seekers"}
                >
                  <option value="">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ minWidth: 150, flex: "1 1 150px" }}>
                <label className="fieldLabel">Verified</label>
                <select className="input" value={verified} onChange={(e) => setVerified(e.target.value as "" | "true" | "false") }>
                  <option value="">All</option>
                  <option value="true">Verified</option>
                  <option value="false">Unverified</option>
                </select>
              </div>
              <div style={{ minWidth: 150, flex: "1 1 150px" }}>
                <label className="fieldLabel">From Date</label>
                <input className="input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div style={{ minWidth: 150, flex: "1 1 150px" }}>
                <label className="fieldLabel">To Date</label>
                <input className="input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <div style={{ minWidth: 150, flex: "1 1 150px" }}>
                <label className="fieldLabel">Sort By</label>
                <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                  <option value="created_at">Created Date</option>
                  <option value="last_login">Last Login</option>
                  <option value="email">Email</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <div style={{ minWidth: 120, flex: "1 1 120px" }}>
                <label className="fieldLabel">Sort Order</label>
                <select className="input" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)}>
                  <option value="DESC">Descending</option>
                  <option value="ASC">Ascending</option>
                </select>
              </div>
            </div>

            {!canManageUsers && reportType === "job_seekers" ? (
              <div className="errorBox" style={{ marginTop: 12 }}>
                Job seeker directory reports require MANAGE_USERS permission.
              </div>
            ) : null}

            {renderPager(pagedDirectoryRows.page, pagedDirectoryRows.pages, pagedDirectoryRows.total, setDirectoryPage, "Directory records pagination top")}

            <div className="tableWrap" style={{ marginTop: 12 }}>
              <table className="table companiesTable">
                <thead>
                  <tr>
                    {reportType === "job_seekers" ? (
                      <>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Gender</th>
                        <th>Status</th>
                        <th>Verified</th>
                        <th>Created</th>
                        <th>Last Login</th>
                      </>
                    ) : (
                      <>
                        <th>Company</th>
                        <th>Contact</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Verified</th>
                        <th>Created</th>
                        <th>Last Login</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pagedDirectoryRows.total === 0 ? (
                    <tr><td colSpan={8}>No records found for the selected filters.</td></tr>
                  ) : (
                    pagedDirectoryRows.rows.map((row) => (
                      <tr key={row.id}>
                        {reportType === "job_seekers" ? (
                          <>
                            <td>{fullName(row)}</td>
                            <td>{row.email ?? "—"}</td>
                            <td>{row.phone ?? "—"}</td>
                            <td>{titleStatus(normalizeGender(directoryGenderByUserId[String(row.id ?? "")]) || "unknown")}</td>
                            <td>{statusLabel(row)}</td>
                            <td>{row.email_verified ? "Yes" : "No"}</td>
                            <td>{formatDate(row.created_at)}</td>
                            <td>{formatDate(row.last_login)}</td>
                          </>
                        ) : (
                          <>
                            <td>{row.company_name ?? "—"}</td>
                            <td>{fullName(row)}</td>
                            <td>{row.email ?? "—"}</td>
                            <td>{row.phone ?? "—"}</td>
                            <td>{statusLabel(row)}</td>
                            <td>{row.email_verified ? "Yes" : "No"}</td>
                            <td>{formatDate(row.created_at)}</td>
                            <td>{formatDate(row.last_login)}</td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPager(pagedDirectoryRows.page, pagedDirectoryRows.pages, pagedDirectoryRows.total, setDirectoryPage, "Directory records pagination")}
          </>
        ) : renderCollapsedArrow("directory")}
      </div>

      <div className={`dropPanel reportsCard ${openReports.monthly_signups ? "reportsCardExpanded" : "reportsCardCollapsed"}`} style={{ marginTop: 12, padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SectionTitle>Directory Monthly Signups</SectionTitle>
          {!openReports.monthly_signups ? <p className="reportsCardHint">{reportSummary("monthly_signups")}</p> : null}
          {openReports.monthly_signups ? (
          <div className="reportsCardActions">
            <button type="button" className={reportButtonClass("monthly_signups")} onClick={() => toggleReport("monthly_signups")}>{openReports.monthly_signups ? "Collapse" : "Expand"}</button>
            <button type="button" className={reportButtonClass("monthly_signups")} onClick={() => void runReport("monthly_signups")}>Run Report</button>
            <button type="button" className={reportButtonClass("monthly_signups")} onClick={exportMonthlySignupsPdf} disabled={registrationByMonth.length === 0}>Export Monthly PDF</button>
            <button type="button" className={reportButtonClass("monthly_signups")} onClick={exportMonthlySignupsExcel} disabled={registrationByMonth.length === 0}>Export Monthly Excel</button>
          </div>
          ) : null}
        </div>
        {openReports.monthly_signups ? (
          <>
            {!ranReports.monthly_signups ? <p className="pageText">Click Run Report to view signup trends.</p> : null}
            {renderPager(pagedMonthlyRows.page, pagedMonthlyRows.pages, pagedMonthlyRows.total, setMonthlyPage, "Monthly signups pagination top")}
            <div className="tableWrap">
              <table className="table companiesTable">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="thRight">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedMonthlyRows.total === 0 ? (
                    <tr><td colSpan={2}>No data available.</td></tr>
                  ) : (
                    pagedMonthlyRows.rows.map((item) => (
                      <tr key={item.month}>
                        <td>{item.month}</td>
                        <td className="tdRight">{item.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {renderPager(pagedMonthlyRows.page, pagedMonthlyRows.pages, pagedMonthlyRows.total, setMonthlyPage, "Monthly signups pagination")}
          </>
        ) : renderCollapsedArrow("monthly_signups")}
      </div>

      {canViewApplicantsReport ? (
        <>
          <div className={`dropPanel reportsCard ${openReports.hiring_funnel ? "reportsCardExpanded" : "reportsCardCollapsed"}`} style={{ marginTop: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <SectionTitle>Hiring Funnel Overview</SectionTitle>
              {!openReports.hiring_funnel ? <p className="reportsCardHint">{reportSummary("hiring_funnel")}</p> : null}
              {openReports.hiring_funnel ? (
              <div className="reportsCardActions">
                <button type="button" className={reportButtonClass("hiring_funnel")} onClick={() => toggleReport("hiring_funnel")}>{openReports.hiring_funnel ? "Collapse" : "Expand"}</button>
                <button type="button" className={reportButtonClass("hiring_funnel")} onClick={() => void runReport("hiring_funnel")}>Run Report</button>
                <button type="button" className={reportButtonClass("hiring_funnel")} onClick={exportFunnelPdf} disabled={funnelRows.rows.length === 0}>Export Funnel PDF</button>
                <button type="button" className={reportButtonClass("hiring_funnel")} onClick={exportFunnelExcel} disabled={funnelRows.rows.length === 0}>Export Funnel Excel</button>
              </div>
              ) : null}
            </div>
            {openReports.hiring_funnel ? (
              <>
                <div className="dropPanel" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <div style={{ minWidth: 280, flex: "1 1 280px" }}>
                    <label className="fieldLabel">Filter by Job</label>
                    <select className="input" value={funnelFilterJobId} onChange={(e) => setFunnelFilterJobId(e.target.value)}>
                      <option value="">All jobs</option>
                      {allJobs.map((job) => (
                        <option key={job.id} value={job.id}>{job.title}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ minWidth: 160, flex: "1 1 160px" }}>
                    <label className="fieldLabel">Applied From</label>
                    <input className="input" type="date" value={funnelFromDate} onChange={(e) => setFunnelFromDate(e.target.value)} />
                  </div>
                  <div style={{ minWidth: 160, flex: "1 1 160px" }}>
                    <label className="fieldLabel">Applied To</label>
                    <input className="input" type="date" value={funnelToDate} onChange={(e) => setFunnelToDate(e.target.value)} />
                  </div>
                </div>
                {!ranReports.hiring_funnel ? <p className="pageText">Click Run Report to refresh funnel metrics.</p> : null}
                <div className="tableWrap">
                  <table className="table companiesTable">
                    <thead>
                      <tr>
                        <th>Stage</th>
                        <th className="thRight">Applicants</th>
                        <th className="thRight">Conversion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnelRows.rows.map((row) => (
                        <tr key={row.stage}>
                          <td>{row.stage}</td>
                          <td className="tdRight">{row.count}</td>
                          <td className="tdRight">{row.conversion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="pageText" style={{ marginTop: 8 }}>Total applications in funnel: {funnelRows.total}</p>
              </>
            ) : renderCollapsedArrow("hiring_funnel")}
          </div>

          <div className={`dropPanel reportsCard ${openReports.jobs_without_applicants ? "reportsCardExpanded" : "reportsCardCollapsed"}`} style={{ marginTop: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <SectionTitle>Jobs Without Applicants</SectionTitle>
              {!openReports.jobs_without_applicants ? <p className="reportsCardHint">{reportSummary("jobs_without_applicants")}</p> : null}
              {openReports.jobs_without_applicants ? (
              <div className="reportsCardActions">
                <button type="button" className={reportButtonClass("jobs_without_applicants")} onClick={() => toggleReport("jobs_without_applicants")}>{openReports.jobs_without_applicants ? "Collapse" : "Expand"}</button>
                <button type="button" className={reportButtonClass("jobs_without_applicants")} onClick={() => void runReport("jobs_without_applicants")}>Run Report</button>
                <button type="button" className={reportButtonClass("jobs_without_applicants")} onClick={exportJobsWithoutApplicantsPdf} disabled={jobsWithoutApplicantsRows.length === 0}>Export Jobs PDF</button>
                <button type="button" className={reportButtonClass("jobs_without_applicants")} onClick={exportJobsWithoutApplicantsExcel} disabled={jobsWithoutApplicantsRows.length === 0}>Export Jobs Excel</button>
              </div>
              ) : null}
            </div>
            {openReports.jobs_without_applicants ? (
              <>
                <div style={{ minWidth: 260, marginBottom: 10 }}>
                  <label className="fieldLabel">Search Job/Company</label>
                  <input
                    className="input"
                    value={jobsWithoutApplicantsSearch}
                    onChange={(e) => {
                      setJobsWithoutApplicantsSearch(e.target.value);
                      setJobsWithoutApplicantsPage(1);
                    }}
                    placeholder="Type job title or company"
                  />
                </div>
                {!ranReports.jobs_without_applicants ? <p className="pageText">Click Run Report to list open gaps.</p> : null}
                {renderPager(
                  pagedJobsWithoutApplicantsRows.page,
                  pagedJobsWithoutApplicantsRows.pages,
                  pagedJobsWithoutApplicantsRows.total,
                  setJobsWithoutApplicantsPage,
                  "Jobs without applicants pagination top",
                )}
                <div className="tableWrap">
                  <table className="table companiesTable">
                    <thead>
                      <tr>
                        <th>Job</th>
                        <th>Company</th>
                        <th>Status</th>
                        <th>Created At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedJobsWithoutApplicantsRows.total === 0 ? (
                        <tr><td colSpan={4}>All visible jobs currently have applicants.</td></tr>
                      ) : (
                        pagedJobsWithoutApplicantsRows.rows.map((row) => (
                          <tr key={row.id}>
                            <td>{row.title}</td>
                            <td>{row.company}</td>
                            <td>{row.status}</td>
                            <td>{row.createdAt}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPager(
                  pagedJobsWithoutApplicantsRows.page,
                  pagedJobsWithoutApplicantsRows.pages,
                  pagedJobsWithoutApplicantsRows.total,
                  setJobsWithoutApplicantsPage,
                  "Jobs without applicants pagination",
                )}
              </>
            ) : renderCollapsedArrow("jobs_without_applicants")}
          </div>

          <div className={`dropPanel reportsCard ${openReports.company_hiring_performance ? "reportsCardExpanded" : "reportsCardCollapsed"}`} style={{ marginTop: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <SectionTitle>Company Hiring Performance</SectionTitle>
              {!openReports.company_hiring_performance ? <p className="reportsCardHint">{reportSummary("company_hiring_performance")}</p> : null}
              {openReports.company_hiring_performance ? (
              <div className="reportsCardActions">
                <button type="button" className={reportButtonClass("company_hiring_performance")} onClick={() => toggleReport("company_hiring_performance")}>{openReports.company_hiring_performance ? "Collapse" : "Expand"}</button>
                <button type="button" className={reportButtonClass("company_hiring_performance")} onClick={() => void runReport("company_hiring_performance")}>Run Report</button>
                <button type="button" className={reportButtonClass("company_hiring_performance")} onClick={exportCompanyPerformancePdf} disabled={companyHiringPerformanceRows.length === 0}>Export Performance PDF</button>
                <button type="button" className={reportButtonClass("company_hiring_performance")} onClick={exportCompanyPerformanceExcel} disabled={companyHiringPerformanceRows.length === 0}>Export Performance Excel</button>
              </div>
              ) : null}
            </div>
            {openReports.company_hiring_performance ? (
              <>
                <div style={{ minWidth: 260, marginBottom: 10 }}>
                  <label className="fieldLabel">Filter Company</label>
                  <input
                    className="input"
                    value={companyPerformanceSearch}
                    onChange={(e) => {
                      setCompanyPerformanceSearch(e.target.value);
                      setCompanyPerformancePage(1);
                    }}
                    placeholder="Type company name"
                  />
                </div>
                {!ranReports.company_hiring_performance ? <p className="pageText">Click Run Report to refresh company performance.</p> : null}
                {renderPager(
                  pagedCompanyPerformanceRows.page,
                  pagedCompanyPerformanceRows.pages,
                  pagedCompanyPerformanceRows.total,
                  setCompanyPerformancePage,
                  "Company hiring performance pagination top",
                )}
                <div className="tableWrap">
                  <table className="table companiesTable">
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th className="thRight">Jobs</th>
                        <th className="thRight">Applicants</th>
                        <th className="thRight">Hired</th>
                        <th className="thRight">Rejected</th>
                        <th className="thRight">Hire Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedCompanyPerformanceRows.total === 0 ? (
                        <tr><td colSpan={6}>No company performance rows for current scope.</td></tr>
                      ) : (
                        pagedCompanyPerformanceRows.rows.map((row) => (
                          <tr key={row.company}>
                            <td>{row.company}</td>
                            <td className="tdRight">{row.jobs}</td>
                            <td className="tdRight">{row.applicants}</td>
                            <td className="tdRight">{row.hired}</td>
                            <td className="tdRight">{row.rejected}</td>
                            <td className="tdRight">{row.hireRate}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {renderPager(
                  pagedCompanyPerformanceRows.page,
                  pagedCompanyPerformanceRows.pages,
                  pagedCompanyPerformanceRows.total,
                  setCompanyPerformancePage,
                  "Company hiring performance pagination",
                )}
              </>
            ) : renderCollapsedArrow("company_hiring_performance")}
          </div>
        </>
      ) : null}


      <p className="pageText" style={{ marginTop: 10 }}>
        Last generated: {lastGeneratedAt ? formatDate(lastGeneratedAt) : "—"}
      </p>

      {loadingApplications && canViewApplicantsReport ? (
        <div className="placeholderSpinnerWrap" role="status" aria-live="polite">
          <span className="placeholderSpinner" aria-hidden="true" />
          <span className="srOnly">Loading</span>
        </div>
      ) : null}
    </div>
  );
}
