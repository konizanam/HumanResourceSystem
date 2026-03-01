import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listCompanies, listJobs, type JobListItem } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

function ReadField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="readField">
      <span className="readLabel">{label}</span>
      <span className="readValue">{value}</span>
    </div>
  );
}

function resolveCompanyName(job: JobListItem, companyNameById?: Record<string, string>): string {
  const direct = String(job.company ?? "").trim();
  if (direct) return direct;

  const employerCompany = String(job.employer_company ?? "").trim();
  if (employerCompany) return employerCompany;

  const companyName = String((job as any)?.company_name ?? "").trim();
  if (companyName) return companyName;

  const companyId = String(job.company_id ?? "").trim();
  if (companyId && companyNameById && companyNameById[companyId]) {
    return companyNameById[companyId];
  }

  return "—";
}

export function ApplicationsPage() {
  const PAGE_LIMIT = 5;
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [companyNameById, setCompanyNameById] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_LIMIT, total: 0, pages: 1 });

  const isAdminView = hasPermission("MANAGE_USERS");

  useEffect(() => {
    if (!accessToken) {
      setCompanyNameById({});
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const companies = await listCompanies(accessToken);
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const c of companies ?? []) {
          const id = String((c as any)?.id ?? "").trim();
          const name = String((c as any)?.name ?? "").trim();
          if (id && name) map[id] = name;
        }
        setCompanyNameById(map);
      } catch {
        if (!cancelled) setCompanyNameById({});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const load = useCallback(async (nextPage = 1) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const data = await listJobs(accessToken, {
        page: nextPage,
        limit: PAGE_LIMIT,
        my_jobs: !isAdminView,
      });
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      const resolvedPage = Number(data.pagination?.page ?? nextPage);
      const resolvedLimit = Number(data.pagination?.limit ?? PAGE_LIMIT);
      const resolvedTotal = Number(data.pagination?.total ?? (Array.isArray(data.jobs) ? data.jobs.length : 0));
      const resolvedPages = Number(data.pagination?.pages ?? Math.max(1, Math.ceil(resolvedTotal / resolvedLimit)));
      setPage(resolvedPage);
      setPagination({ page: resolvedPage, limit: resolvedLimit, total: resolvedTotal, pages: resolvedPages });
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAdminView]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  const visibleJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) => {
      const title = String(job.title ?? "").toLowerCase();
      const company = resolveCompanyName(job, companyNameById).toLowerCase();
      const location = String(job.location ?? "").toLowerCase();
      const status = String(job.status ?? "").toLowerCase();
      return title.includes(q) || company.includes(q) || location.includes(q) || status.includes(q);
    });
  }, [jobs, search, companyNameById]);

  const statsCards = useMemo(() => {
    const loadedJobs = jobs.length;
    const matchingJobs = visibleJobs.length;

    let openJobs = 0;
    let closedJobs = 0;
    let totalApplications = 0;

    for (const job of visibleJobs) {
      const status = String(job.status ?? "").trim().toLowerCase();
      const applications = Number(job.applications_count ?? 0);
      if (Number.isFinite(applications)) totalApplications += applications;

      if (status === "open" || status === "active") openJobs += 1;
      if (status === "closed" || status === "inactive" || status === "expired") closedJobs += 1;
    }

    return [
      { label: "Jobs Loaded", value: loadedJobs },
      { label: "Matches", value: matchingJobs },
      { label: "Open Jobs", value: openJobs },
      { label: "Closed Jobs", value: closedJobs },
      { label: "Applications", value: totalApplications },
    ];
  }, [jobs, visibleJobs]);

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Applications</h1>
      </div>

      {error ? <div className="errorBox">{error}</div> : null}

      {loading && jobs.length === 0 ? (
        <p className="pageText">Loading...</p>
      ) : (
        <>
          <div className="statsCardsGrid" role="region" aria-label="Applications statistics">
            {statsCards.map((c, idx) => {
              const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
              return (
                <div key={c.label} className={`dashCard statsCard ${toneClass}`}>
                  <div className="readLabel">{c.label}</div>
                  <div className="statsCardValue">{c.value}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 260, flex: "1 1 340px" }}>
              <label className="fieldLabel">Search</label>
              <input
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title/company/location/status..."
              />
            </div>

            <div className="publicJobsPager" role="navigation" aria-label="Applications pagination top">
              <button
                className="btn btnPrimary btnSm"
                style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
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
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages || loading}
              >
                Next {"->"}
              </button>
            </div>
          </div>

          <div className="jobCardsGrid" role="region" aria-label="Applications jobs list">
            {visibleJobs.length === 0 ? (
              <div className="dashCard jobCardsGridItem jobCardToneA"><div className="emptyState">No jobs available for application review.</div></div>
            ) : (
              visibleJobs.map((job, idx) => {
                const applications = Number(job.applications_count ?? 0);
                const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
                const companyName = resolveCompanyName(job, companyNameById);
                return (
                  <article key={job.id} className={`dashCard jobCardsGridItem ${toneClass}`}>
                    <div className="dashCardHeader" style={{ marginBottom: 6 }}>
                      <h2 className="dashCardTitle" style={{ fontSize: 15 }}>{job.title}</h2>
                      {null}
                    </div>

                    <div className="profileReadGrid" style={{ marginTop: 6 }}>
                      <ReadField label="Company" value={companyName} />
                      <ReadField label="Location" value={job.location ?? "—"} />
                      <ReadField label="Status" value={job.status ?? "—"} />
                      <ReadField
                        label="Deadline"
                        value={job.application_deadline ? new Date(job.application_deadline).toLocaleDateString("en-GB") : "—"}
                      />
                      <ReadField label="Applications" value={applications} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                      <button
                        type="button"
                        className="btn btnGhost btnSm stepperSaveBtn"
                        onClick={() => navigate(`/app/jobs/${job.id}/applications`)}
                      >
                        View Applications
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          <div className="publicJobsPager" role="navigation" aria-label="Applications pagination" style={{ marginTop: 16 }}>
            <button
              className="btn btnPrimary btnSm"
              style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
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
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page >= pagination.pages || loading}
            >
              Next {"->"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
