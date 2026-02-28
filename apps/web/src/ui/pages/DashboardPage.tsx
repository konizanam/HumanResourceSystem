import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  applyToJob,
  getAdminStatistics,
  getEmployerDashboard,
  getFullProfile,
  listAuditLogs,
  listJobs,
  listMyApplications,
  type AdminStatistics,
  type AuditLog,
  type EmployerDashboardData,
  type FullProfile,
  type JobApplication,
  type JobListItem,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

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
  const [seekerApplications, setSeekerApplications] = useState<JobApplication[]>([]);
  const [seekerProfile, setSeekerProfile] = useState<FullProfile | null>(null);
  const [updateProfileBeforeApplyJob, setUpdateProfileBeforeApplyJob] = useState<JobListItem | null>(null);

  const isAdmin = hasPermission("MANAGE_USERS");
  const isEmployer = hasPermission("CREATE_JOB") && !isAdmin;
  const isJobSeeker = !isAdmin && !isEmployer;
  const canApplyJob = isJobSeeker && hasPermission("APPLY_JOB");

  const load = useCallback(async () => {
    if (!accessToken || permissionsLoading) return;
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      if (isAdmin) {
        const [stats, logs] = await Promise.all([
          getAdminStatistics(accessToken),
          listAuditLogs(accessToken, { page: 1, limit: 5 }),
        ]);
        setAdminStats(stats);
        setAdminLogs(logs.logs ?? []);
      } else if (isEmployer) {
        const data = await getEmployerDashboard(accessToken);
        setEmployerData(data);
      } else {
        const [jobs, applications, profile] = await Promise.all([
          listJobs(accessToken, { page: 1, limit: 5 }),
          listMyApplications(accessToken, { page: 1, limit: 100 }),
          getFullProfile(accessToken),
        ]);
        setSeekerJobs(jobs.jobs ?? []);
        setSeekerApplications(applications.applications ?? []);
        setSeekerProfile(profile);
      }
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAdmin, isEmployer, permissionsLoading]);

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

  const seekerRecentApplications = useMemo(() => {
    return [...(seekerApplications ?? [])]
      .sort((a, b) => {
        const aT = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bT = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bT - aT;
      })
      .slice(0, 8);
  }, [seekerApplications]);

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

  const seekerCompletion = useMemo(() => {
    const total = 5;
    const done =
      (seekerProfile?.personalDetails ? 1 : 0) +
      ((seekerProfile?.addresses?.length ?? 0) > 0 ? 1 : 0) +
      ((seekerProfile?.education?.length ?? 0) > 0 ? 1 : 0) +
      ((seekerProfile?.experience?.length ?? 0) > 0 ? 1 : 0) +
      ((seekerProfile?.references?.length ?? 0) > 0 ? 1 : 0);

    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
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

  const seekerStatusChart = useMemo(() => {
    return toChartData(seekerStatusBreakdown, 8);
  }, [seekerStatusBreakdown]);

  const adminApplicationsChart = useMemo(() => {
    if (!adminStats) return [];
    const data = {
      applied: adminStats.applications.applied,
      screening: adminStats.applications.screening,
      shortlisted: adminStats.applications.shortlisted,
      interview: adminStats.applications.interview,
      hired: adminStats.applications.hired,
      rejected: adminStats.applications.rejected,
      withdrawn: adminStats.applications.withdrawn,
    };
    return toChartData(data, 6);
  }, [adminStats]);

  const adminUsersRoleChart = useMemo(() => {
    if (!adminStats) return [];
    const data = {
      job_seekers: adminStats.users.job_seekers,
      employers: adminStats.users.employers,
      admins: adminStats.users.admins,
      hr: adminStats.users.hr,
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

      {isAdmin && adminStats && (
        <>
          <div className="dashGraphs">
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
          </div>

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
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td>{log.action}</td>
                        <td>{log.target_type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {isEmployer && employerData && (
        <>
          <div className="dashGraphs">
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
          </div>

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
                        <td>{app.created_at ? new Date(app.created_at).toLocaleString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {isJobSeeker && (
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
                <h2 className="dashCardTitle">My Application Status</h2>
                <span className="dashCardMeta">Distribution</span>
              </div>
              <BarChart data={seekerStatusChart} emptyText="No applications yet." />
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
            {seekerRecentApplications.length === 0 ? (
              <div className="emptyState">You have not applied to any jobs yet.</div>
            ) : (
              <div className="tableWrap">
                <table className="table companiesTable">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Company</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seekerRecentApplications.map((app) => (
                      <tr key={app.id}>
                        <td>{app.job_title ?? app.job_id}</td>
                        <td>{app.company ?? app.company_name ?? "—"}</td>
                        <td>{app.status ?? "—"}</td>
                        <td>{app.created_at ? new Date(app.created_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="dashCard" style={{ marginTop: 16 }}>
            <div className="dashCardHeader">
              <h2 className="dashCardTitle">Recently Posted Jobs</h2>
              <div className="dashCardActions">
                <Link className="btn btnGhost btnSm" to="/app/jobs">Browse Jobs</Link>
              </div>
            </div>
            {seekerJobs.length === 0 ? (
              <div className="emptyState">No jobs found.</div>
            ) : (
              <div className="jobCardsGrid" role="region" aria-label="Recently posted jobs">
                {seekerActiveJobs.slice(0, 8).map((job, idx) => {
                  const alreadyApplied = seekerAppliedJobIds.has(String(job.id));
                  const busy = applyingJobId === String(job.id);
                  const company = job.company ?? job.employer_company ?? "—";
                  const isOpen = openSeekerJobId === String(job.id);
                  const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";

                  return (
                    <div key={job.id} className={`dashCard jobCardsGridItem ${toneClass}`}>
                      <div className="dashCardHeader" style={{ marginBottom: 6 }}>
                        <h2 className="dashCardTitle" style={{ fontSize: 15 }}>{job.title}</h2>
                        {null}
                      </div>

                      <div className="profileReadGrid" style={{ marginTop: 6 }}>
                        <div className="readField">
                          <span className="readLabel">Company</span>
                          <span className="readValue">{company}</span>
                        </div>
                        <div className="readField">
                          <span className="readLabel">Location</span>
                          <span className="readValue">{job.location ?? "—"}</span>
                        </div>
                        <div className="readField">
                          <span className="readLabel">Due Date</span>
                          <span className="readValue">{job.application_deadline ? new Date(job.application_deadline).toLocaleDateString() : "—"}</span>
                        </div>
                        <div className="readField">
                          <span className="readLabel">Remote</span>
                          <span className="readValue">{job.remote ? "Yes" : "No"}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
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
