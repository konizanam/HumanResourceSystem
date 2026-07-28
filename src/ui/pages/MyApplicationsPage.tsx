import { useCallback, useEffect, useMemo, useState } from "react";
import { listMyApplications, type JobApplication } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;

// Friendly label for a raw workflow status (e.g. "LONG_LISTED" -> "Long Listed").
function formatStatus(status: unknown): string {
  const raw = String(status ?? "").trim();
  if (!raw) return "—";
  return raw
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Status options shown in the filter (value = raw status, label = friendly).
const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "APPLIED", label: "Applied" },
  { value: "SCREENING", label: "Screening" },
  { value: "LONG_LISTED", label: "Longlisted" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "ORAL_INTERVIEW", label: "Oral Interview" },
  { value: "PRACTICAL_INTERVIEW", label: "Practical Interview" },
  { value: "FINAL_INTERVIEW", label: "Final Interview" },
  { value: "OFFER_MADE", label: "Offer Made" },
  { value: "HIRED", label: "Hired" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

function ReadField({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
  return (
    <div className="readField">
      <span className="readLabel">{label}</span>
      <span className="readValue">{display}</span>
    </div>
  );
}

export function MyApplicationsPage() {
  const { accessToken } = useAuth();

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch every application (paged) so client-side filters/pagination are accurate.
      const collected: JobApplication[] = [];
      const first = await listMyApplications(accessToken, { page: 1, limit: 100, sort: "newest" });
      collected.push(...(first.applications ?? []));
      const pages = Math.max(1, Number(first.pagination?.pages ?? 1));
      for (let p = 2; p <= pages; p++) {
        const next = await listMyApplications(accessToken, { page: p, limit: 100, sort: "newest" });
        collected.push(...(next.applications ?? []));
      }
      setApplications(collected);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load your applications");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter !== "all" && String(app.status ?? "").toUpperCase() !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        app.job_title,
        app.company,
        app.company_name,
        app.location,
        formatStatus(app.status),
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [applications, search, statusFilter]);

  const statsCards = useMemo(() => {
    const lower = (s: unknown) => String(s ?? "").toLowerCase();
    const total = applications.length;
    const shortlisted = applications.filter((a) => lower(a.status).includes("short")).length;
    const interviews = applications.filter((a) => lower(a.status).includes("interview")).length;
    const hired = applications.filter((a) => ["hired", "accepted"].includes(lower(a.status))).length;
    return [
      { label: "Total Applications", value: total },
      { label: "Shortlisted", value: shortlisted },
      { label: "Interviews", value: interviews },
      { label: "Hired", value: hired },
    ];
  }, [applications]);

  const pagination = useMemo(() => {
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), pages);
    return { page: safePage, pages, total, limit: pageSize };
  }, [filtered.length, page, pageSize]);

  useEffect(() => {
    if (page > pagination.pages) setPage(pagination.pages);
  }, [page, pagination.pages]);

  const visible = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return filtered.slice(start, start + pagination.limit);
  }, [filtered, pagination.limit, pagination.page]);

  return (
    <div className="page">
      <div className="companiesHeader" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h1 className="pageTitle">My Applications</h1>
        <button type="button" className="btn btnGhost btnSm" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error ? <div className="errorBox">{error}</div> : null}

      {loading && applications.length === 0 ? (
        <div className="placeholderSpinnerWrap" role="status" aria-live="polite">
          <span className="placeholderSpinner" aria-hidden="true" />
          <span className="srOnly">Loading</span>
        </div>
      ) : (
        <>
          <div className="statsCardsGrid" role="region" aria-label="My application statistics">
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
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", flex: "1 1 340px" }}>
              <div style={{ minWidth: 220, flex: "1 1 240px" }}>
                <label className="fieldLabel">Search</label>
                <input
                  className="input"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search job, company, location, status..."
                />
              </div>
              <div style={{ minWidth: 180 }}>
                <label className="fieldLabel">Status</label>
                <select
                  className="input"
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                >
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="publicJobsPager" role="navigation" aria-label="Applications pagination top">
              <label className="publicJobsPagerSelect">
                Records
                <select
                  className="input"
                  value={String(pageSize)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (!Number.isFinite(next) || next <= 0) return;
                    setPage(1);
                    setPageSize(next);
                  }}
                  disabled={loading}
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || loading}
              >
                {"<-"} Previous
              </button>
              <span className="publicJobsPagerInfo">
                Page {pagination.page} of {pagination.pages} ({pagination.total} applications)
              </span>
              <button
                className="btn btnPrimary btnSm"
                style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={pagination.page >= pagination.pages || loading}
              >
                Next {"->"}
              </button>
            </div>
          </div>

          <div className="jobCardsGrid" role="region" aria-label="My applications list">
            {visible.length === 0 ? (
              <div className="dashCard jobCardsGridItem jobCardToneA">
                <div className="emptyState">
                  {applications.length === 0
                    ? "You have not applied to any jobs yet."
                    : "No applications match your filters."}
                </div>
              </div>
            ) : (
              visible.map((app, idx) => {
                const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
                const appliedDate = app.created_at ? new Date(app.created_at).toLocaleDateString("en-GB") : "—";
                const company = String(app.company ?? app.company_name ?? "—");
                const salaryRange =
                  app.salary_min != null || app.salary_max != null
                    ? `${app.salary_min ?? "—"} - ${app.salary_max ?? "—"}`
                    : "—";
                const expectedSalary =
                  app.expected_salary != null
                    ? `N$ ${Number(app.expected_salary).toLocaleString("en-US")}`
                    : "—";
                return (
                  <article key={app.id} className={`dashCard jobCardsGridItem ${toneClass}`}>
                    <div className="dashCardHeader" style={{ marginBottom: 6 }}>
                      <h2 className="dashCardTitle" style={{ fontSize: 15 }}>{app.job_title ?? "—"}</h2>
                    </div>
                    <div className="profileReadGrid" style={{ marginTop: 6 }}>
                      <ReadField label="Company" value={company} />
                      <ReadField label="Location" value={app.location} />
                      <ReadField label="Status" value={formatStatus(app.status)} />
                      <ReadField label="Applied Date" value={appliedDate} />
                      <ReadField label="Expected Salary" value={expectedSalary} />
                      <ReadField label="Salary Range" value={salaryRange} />
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default MyApplicationsPage;
