import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getAdminStatistics,
  getEmployerDashboard,
  getFullProfile,
  listAuditLogs,
  listJobs,
  listMyApplications,
  type AdminStatistics,
  type AuditLog,
  type EmployerDashboardData,
  type JobApplication,
  type JobListItem,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

export function DashboardPage() {
  const { accessToken } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStatistics | null>(null);
  const [adminLogs, setAdminLogs] = useState<AuditLog[]>([]);
  const [employerData, setEmployerData] = useState<EmployerDashboardData | null>(null);
  const [seekerJobs, setSeekerJobs] = useState<JobListItem[]>([]);
  const [seekerApplications, setSeekerApplications] = useState<JobApplication[]>([]);
  const [profileComplete, setProfileComplete] = useState(false);

  const isAdmin = hasPermission("MANAGE_USERS");
  const isEmployer = hasPermission("CREATE_JOB") && !isAdmin;
  const isJobSeeker = !isAdmin && !isEmployer;

  const load = useCallback(async () => {
    if (!accessToken || permissionsLoading) return;
    try {
      setLoading(true);
      setError(null);
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
        setProfileComplete(Boolean(profile.personalDetails) && (profile.education?.length ?? 0) > 0);
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

  if (loading || permissionsLoading) {
    return <div className="page"><h1 className="pageTitle">Dashboard</h1><p className="pageText">Loading...</p></div>;
  }

  return (
    <div className="page">
      <div className="companiesHeader"><h1 className="pageTitle">Dashboard</h1></div>
      {error && <div className="errorBox">{error}</div>}

      {isAdmin && adminStats && (
        <>
          <div className="profileReadGrid">
            <StatCard label="Total Users" value={adminStats.users.total} />
            <StatCard label="Total Jobs" value={adminStats.jobs.total} />
            <StatCard label="Total Applications" value={adminStats.applications.total} />
            <StatCard label="Total Companies" value={adminStats.users.employers} />
          </div>
          <div className="dropPanel" style={{ marginTop: 16 }}>
            <h2 className="editFormTitle">Recent Audit Logs</h2>
            {adminLogs.length === 0 ? <div className="emptyState">No audit logs found.</div> : (
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
          <div className="dropPanel" style={{ marginTop: 16 }}>
            <h2 className="editFormTitle">Applications by Status</h2>
            <div className="profileReadGrid">
              <StatCard label="Applied" value={(adminStats.applications as any).applied ?? 0} />
              <StatCard label="Screening" value={(adminStats.applications as any).screening ?? 0} />
              <StatCard label="Longlisted" value={(adminStats.applications as any).longlisted ?? 0} />
              <StatCard label="Shortlisted" value={(adminStats.applications as any).shortlisted ?? 0} />
              <StatCard label="Interview" value={(adminStats.applications as any).interview ?? 0} />
              <StatCard label="Assessment" value={(adminStats.applications as any).assessment ?? 0} />
              <StatCard label="Hired" value={(adminStats.applications as any).hired ?? 0} />
              <StatCard label="Rejected" value={(adminStats.applications as any).rejected ?? 0} />
              <StatCard label="Withdrawn" value={(adminStats.applications as any).withdrawn ?? 0} />
            </div>
          </div>
        </>
      )}

      {isEmployer && employerData && (
        <>
          <div className="profileReadGrid">
            <StatCard label="My Jobs" value={Number(employerData.stats?.total_jobs_posted ?? 0)} />
            <StatCard label="Applications on My Jobs" value={Number(employerData.stats?.total_applications_received ?? 0)} />
          </div>
          <div className="dropPanel" style={{ marginTop: 16 }}>
            <h2 className="editFormTitle">Recent Applications</h2>
            {(employerData.recent_applications?.length ?? 0) === 0 ? <div className="emptyState">No recent applications.</div> : (
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
            <div className="stepperActions">
              <Link className="btn btnGhost btnSm stepperSaveBtn" to="/app/jobs">Post Job</Link>
            </div>
          </div>
        </>
      )}

      {isJobSeeker && (
        <>
          <div className="profileReadGrid">
            <StatCard label="Profile Completion" value={profileComplete ? "Complete" : "Incomplete"} />
            <StatCard label="Jobs Available" value={seekerJobs.length} />
            <StatCard label="My Applications" value={seekerApplications.length} />
          </div>
          <div className="dropPanel" style={{ marginTop: 16 }}>
            <h2 className="editFormTitle">My Application Status Breakdown</h2>
            {Object.keys(seekerStatusBreakdown).length === 0 ? <div className="emptyState">No applications yet.</div> : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(seekerStatusBreakdown).map(([status, count]) => (
                  <span key={status} className="chipBadge">{status}: {count}</span>
                ))}
              </div>
            )}
          </div>
          <div className="dropPanel" style={{ marginTop: 16 }}>
            <h2 className="editFormTitle">Recently Posted Jobs</h2>
            {seekerJobs.length === 0 ? <div className="emptyState">No jobs found.</div> : (
              <div className="tableWrap">
                <table className="table companiesTable">
                  <thead><tr><th>Title</th><th>Company</th><th>Date</th></tr></thead>
                  <tbody>
                    {seekerJobs.slice(0, 5).map((job) => (
                      <tr key={job.id}>
                        <td>{job.title}</td>
                        <td>{job.company ?? "—"}</td>
                        <td>{job.created_at ? new Date(job.created_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="stepperActions" style={{ display: "flex", gap: 8 }}>
              <Link className="btn btnGhost" to="/app/job-seekers">Complete Profile</Link>
              <Link className="btn btnGhost btnSm stepperSaveBtn" to="/app/jobs">Browse Jobs</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="readField">
      <span className="readLabel">{label}</span>
      <span className="readValue">{String(value)}</span>
    </div>
  );
}
