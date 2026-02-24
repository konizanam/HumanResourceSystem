import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getJobSeekerFullProfile,
  listJobApplicationsForJob,
  type JobApplication,
  type JobSeekerFullProfile,
  updateJobApplicationStatus,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

type StageKey =
  | "longlisted"
  | "shortlisted"
  | "rejected"
  | "interview"
  | "assessment"
  | "hired";

const STATUS_ACTIONS: { key: StageKey; label: string }[] = [
  { key: "longlisted", label: "Longlist" },
  { key: "shortlisted", label: "Shortlist" },
  { key: "rejected", label: "Rejected" },
  { key: "interview", label: "Interview" },
  { key: "assessment", label: "Assessment" },
  { key: "hired", label: "Hired" },
];

const LEGACY_STATUS_MAP: Record<StageKey, string> = {
  longlisted: "reviewed",
  shortlisted: "reviewed",
  rejected: "rejected",
  interview: "reviewed",
  assessment: "reviewed",
  hired: "accepted",
};

function detectStage(app: JobApplication, overrides: Record<string, StageKey>): StageKey {
  if (overrides[app.id]) return overrides[app.id];

  const workflowStatus = String(app.workflow_status ?? "").toLowerCase();
  const status = String(app.status ?? "").toLowerCase();
  const merged = `${workflowStatus} ${status}`;

  if (merged.includes("shortlist")) return "shortlisted";
  if (merged.includes("interview")) return "interview";
  if (merged.includes("assessment")) return "assessment";
  if (merged.includes("hire") || merged.includes("accepted")) return "hired";
  if (merged.includes("reject")) return "rejected";
  if (merged.includes("longlist")) return "longlisted";
  if (merged.includes("reviewed")) return "shortlisted";

  return "longlisted";
}

function readValue(source: Record<string, unknown> | null | undefined, ...keys: string[]) {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return null;
}

export function JobApplicationsPage() {
  const { accessToken } = useAuth();
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [jobTitle, setJobTitle] = useState("");
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [stageOverrides, setStageOverrides] = useState<Record<string, StageKey>>({});

  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const [profileByAppId, setProfileByAppId] = useState<Record<string, JobSeekerFullProfile | null>>({});
  const [documentUrlByAppId, setDocumentUrlByAppId] = useState<Record<string, string | null>>({});
  const [openGroups, setOpenGroups] = useState<Record<StageKey, boolean>>({
    longlisted: true,
    shortlisted: true,
    rejected: true,
    interview: true,
    assessment: true,
    hired: true,
  });

  const canUpdateStatus = hasPermission(
    "UPDATE_APPLICATION_STATUS",
    "APPLICATIONS_UPDATE_STATUS",
    "applications.update_status",
  );

  const loadAll = useCallback(async () => {
    if (!accessToken || !jobId) return;
    try {
      setLoading(true);
      setError(null);
      const first = await listJobApplicationsForJob(accessToken, jobId, { page: 1, limit: 100 });
      const pages = Math.max(1, Number(first.pagination?.pages ?? 1));
      let allApps = Array.isArray(first.applications) ? [...first.applications] : [];
      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, idx) =>
            listJobApplicationsForJob(accessToken, jobId, { page: idx + 2, limit: 100 }),
          ),
        );
        for (const chunk of rest) {
          if (Array.isArray(chunk.applications)) allApps = allApps.concat(chunk.applications);
        }
      }
      setApplications(allApps);
      setJobTitle(String(first.job_title ?? ""));
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [accessToken, jobId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const grouped = useMemo(() => {
    const map: Record<StageKey, JobApplication[]> = {
      longlisted: [],
      shortlisted: [],
      rejected: [],
      interview: [],
      assessment: [],
      hired: [],
    };
    for (const app of applications) {
      map[detectStage(app, stageOverrides)].push(app);
    }
    return map;
  }, [applications, stageOverrides]);

  async function onUpdateStage(app: JobApplication, next: StageKey) {
    if (!accessToken || !jobId) return;
    try {
      setSavingId(app.id);
      setError(null);
      setSuccess(null);
      const preferredStatus = next;
      let updated: JobApplication | null = null;
      try {
        updated = await updateJobApplicationStatus(accessToken, jobId, app.id, preferredStatus);
      } catch {
        updated = await updateJobApplicationStatus(accessToken, jobId, app.id, LEGACY_STATUS_MAP[next]);
      }
      setApplications((prev) => prev.map((p) => (p.id === app.id ? { ...p, ...updated } : p)));
      setStageOverrides((prev) => ({ ...prev, [app.id]: next }));
      setSuccess(`Applicant moved to ${STATUS_ACTIONS.find((s) => s.key === next)?.label ?? next}.`);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to update status");
    } finally {
      setSavingId(null);
    }
  }

  async function onToggleProfile(app: JobApplication) {
    const nextOpen = openProfileId === app.id ? null : app.id;
    setOpenProfileId(nextOpen);
    setDocumentUrlByAppId((prev) => ({ ...prev, [app.id]: null }));
    if (!nextOpen || profileByAppId[app.id] !== undefined || !accessToken) return;
    try {
      const profile = await getJobSeekerFullProfile(accessToken, app.applicant_id);
      setProfileByAppId((prev) => ({ ...prev, [app.id]: profile }));
    } catch {
      setProfileByAppId((prev) => ({ ...prev, [app.id]: null }));
    }
  }

  function profileDocuments(app: JobApplication) {
    const profile = profileByAppId[app.id];
    const docs: { label: string; url: string }[] = [];
    const personal = profile?.personalDetails ?? null;
    const mainProfile = profile?.profile ?? null;

    const idDoc = readValue(personal, "id_document_url", "idDocumentUrl");
    if (idDoc) docs.push({ label: "ID Document", url: String(idDoc) });

    const certDocFromProfile = readValue(mainProfile, "certificate_url", "certificateUrl");
    if (certDocFromProfile) docs.push({ label: "Certificate", url: String(certDocFromProfile) });

    for (const edu of profile?.education ?? []) {
      const cert = readValue(edu, "certificate_url", "certificateUrl");
      if (cert) docs.push({ label: "Certificate", url: String(cert) });
    }

    const resume = app.applicant_resume ?? app.resume_url;
    if (resume) docs.push({ label: "Resume", url: String(resume) });

    return docs;
  }

  function renderProfilePanel(app: JobApplication) {
    const profile = profileByAppId[app.id];
    const personal = profile?.personalDetails ?? null;
    const selectedDoc = documentUrlByAppId[app.id];
    const docs = profileDocuments(app);

    return (
      <div className="dropPanel">
        <h3 className="editFormTitle" style={{ marginBottom: 8 }}>Job Seeker Profile</h3>
        {profile === undefined ? (
          <p className="pageText">Loading profile...</p>
        ) : profile === null ? (
          <p className="pageText">Profile details are not available for this applicant.</p>
        ) : (
          <>
            <Section title="Personal Details">
              <ReadField label="Full Name" value={readValue(personal, "full_name", "fullName")} />
              <ReadField label="Email" value={app.applicant_email} />
              <ReadField label="Phone" value={app.applicant_phone} />
              <ReadField label="Gender" value={readValue(personal, "gender")} />
              <ReadField label="Nationality" value={readValue(personal, "nationality")} />
            </Section>

            <Section title="Address">
              {(profile.addresses ?? []).length === 0 ? (
                <p className="pageText">No address records.</p>
              ) : (
                (profile.addresses ?? []).map((address, idx) => (
                  <div key={`${app.id}-addr-${idx}`} className="readValue" style={{ marginBottom: 6 }}>
                    {[
                      readValue(address, "address_line1", "addressLine1"),
                      readValue(address, "address_line2", "addressLine2"),
                      readValue(address, "city"),
                      readValue(address, "state"),
                      readValue(address, "country"),
                    ]
                      .filter(Boolean)
                      .map(String)
                      .join(", ") || "—"}
                  </div>
                ))
              )}
            </Section>

            <Section title="Education">
              {(profile.education ?? []).length === 0 ? (
                <p className="pageText">No education records.</p>
              ) : (
                (profile.education ?? []).map((edu, idx) => (
                  <div key={`${app.id}-edu-${idx}`} className="readValue" style={{ marginBottom: 6 }}>
                    <strong>{String(readValue(edu, "qualification") ?? "Qualification")}</strong>
                    {" - "}
                    {String(readValue(edu, "institution_name", "institutionName") ?? "Institution")}
                  </div>
                ))
              )}
            </Section>

            <Section title="Experience">
              {(profile.experience ?? []).length === 0 ? (
                <p className="pageText">No experience records.</p>
              ) : (
                (profile.experience ?? []).map((exp, idx) => (
                  <div key={`${app.id}-exp-${idx}`} className="readValue" style={{ marginBottom: 6 }}>
                    <strong>{String(readValue(exp, "job_title", "jobTitle") ?? "Role")}</strong>
                    {" at "}
                    {String(readValue(exp, "company_name", "companyName") ?? "Company")}
                  </div>
                ))
              )}
            </Section>

            <Section title="References">
              {(profile.references ?? []).length === 0 ? (
                <p className="pageText">No references listed.</p>
              ) : (
                (profile.references ?? []).map((ref, idx) => (
                  <div key={`${app.id}-ref-${idx}`} className="readValue" style={{ marginBottom: 6 }}>
                    {String(readValue(ref, "full_name", "fullName") ?? "Reference")} - {String(readValue(ref, "relationship") ?? "—")}
                  </div>
                ))
              )}
            </Section>

            <Section title="Professional Summary">
              <p className="readValue" style={{ whiteSpace: "pre-wrap" }}>
                {String(readValue(profile.profile, "professional_summary", "professionalSummary") ?? "—")}
              </p>
            </Section>

            <Section title="Documents">
              {docs.length === 0 ? (
                <p className="pageText">No document links found.</p>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {docs.map((doc) => (
                    <button
                      key={`${app.id}-${doc.label}-${doc.url}`}
                      type="button"
                      className="btn btnGhost btnSm"
                      onClick={() =>
                        setDocumentUrlByAppId((prev) => ({ ...prev, [app.id]: doc.url }))
                      }
                    >
                      View Document ({doc.label})
                    </button>
                  ))}
                </div>
              )}
            </Section>

            {selectedDoc && (
              <div style={{ marginTop: 10 }}>
                <div className="readLabel">Document Preview</div>
                <iframe
                  src={selectedDoc}
                  title="Document preview"
                  style={{
                    width: "100%",
                    height: 560,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    background: "#fff",
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Job Applications</h1></div>
        <p className="pageText">Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="companiesHeader" style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <h1 className="pageTitle">Applications {jobTitle ? `- ${jobTitle}` : ""}</h1>
        <button type="button" className="btn btnGhost btnSm" onClick={() => navigate("/app/jobs")}>Back to Jobs</button>
      </div>

      {error && <div className="errorBox">{error}</div>}
      {success && <div className="successBox">{success}</div>}

      <div className="tableWrap" role="region" aria-label="Job applicants table">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Applied Date</th>
              <th>Current Status</th>
              <th className="thRight">Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.length === 0 ? (
              <tr><td colSpan={5}><div className="emptyState">No applicants found for this job.</div></td></tr>
            ) : (
              applications.map((app) => {
                const current = detectStage(app, stageOverrides);
                return (
                  <Fragment key={app.id}>
                    <tr className={openProfileId === app.id ? "tableRowActive" : undefined}>
                      <td className="tdStrong">{app.applicant_name ?? "—"}</td>
                      <td>{app.applicant_email ?? "—"}</td>
                      <td>{app.created_at ? new Date(app.created_at).toLocaleDateString() : "—"}</td>
                      <td>{current}</td>
                      <td className="tdRight">
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {canUpdateStatus &&
                            STATUS_ACTIONS.filter((s) => s.key !== current).map((action) => (
                              <button
                                key={`${app.id}-${action.key}`}
                                type="button"
                                className="btn btnGhost btnSm"
                                onClick={() => onUpdateStage(app, action.key)}
                                disabled={savingId === app.id}
                              >
                                {action.label}
                              </button>
                            ))}
                          <button type="button" className="btn btnPrimary btnSm" onClick={() => onToggleProfile(app)}>
                            {openProfileId === app.id ? "Hide Profile" : "View Profile"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {openProfileId === app.id && (
                      <tr className="tableExpandRow">
                        <td colSpan={5}>{renderProfilePanel(app)}</td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {(Object.keys(grouped) as StageKey[]).map((stage) => (
        <div key={stage} style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn btnGhost btnSm"
            onClick={() => setOpenGroups((prev) => ({ ...prev, [stage]: !prev[stage] }))}
          >
            {openGroups[stage] ? "Hide" : "Show"} {STATUS_ACTIONS.find((s) => s.key === stage)?.label ?? stage} ({grouped[stage].length})
          </button>
          {openGroups[stage] && (
            <div className="tableWrap" style={{ marginTop: 8 }}>
              <table className="table companiesTable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Applied Date</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped[stage].length === 0 ? (
                    <tr><td colSpan={3}><div className="emptyState">No applicants in this status.</div></td></tr>
                  ) : (
                    grouped[stage].map((app) => (
                      <tr key={`${stage}-${app.id}`}>
                        <td className="tdStrong">{app.applicant_name ?? "—"}</td>
                        <td>{app.applicant_email ?? "—"}</td>
                        <td>{app.created_at ? new Date(app.created_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="readLabel">{title}</div>
      <div style={{ marginTop: 6 }}>{children}</div>
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
