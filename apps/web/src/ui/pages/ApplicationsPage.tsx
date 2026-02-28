import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listJobs, type JobListItem } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

export function ApplicationsPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<JobListItem[]>([]);

  const isAdminView = hasPermission("MANAGE_USERS");

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const data = await listJobs(accessToken, {
        page: 1,
        limit: 100,
        my_jobs: !isAdminView,
      });
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAdminView]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Applications</h1>
      </div>

      {error ? <div className="errorBox">{error}</div> : null}

      {loading && jobs.length === 0 ? (
        <p className="pageText">Loading...</p>
      ) : (
        <div className="tableWrap" role="region" aria-label="Applications jobs table">
          <table className="table companiesTable">
            <thead>
              <tr>
                <th>Job Title</th>
                <th>Company</th>
                <th>Status</th>
                <th className="thRight">Applications</th>
                <th className="thRight">Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="emptyState">No jobs available for application review.</div>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="tdStrong">{job.title}</td>
                    <td>{job.company ?? "—"}</td>
                    <td>{job.status ?? "—"}</td>
                    <td className="tdRight">{Number(job.applications_count ?? 0)}</td>
                    <td className="tdRight">
                      <button
                        type="button"
                        className="btn btnGhost btnSm stepperSaveBtn"
                        onClick={() => navigate(`/app/jobs/${job.id}/applications`)}
                      >
                        View Applications
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
