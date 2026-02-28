import { useCallback, useEffect, useMemo, useState } from "react";
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

function isAssignedToStatus(app: JobApplication, overrides: Record<string, StageKey>): boolean {
  if (overrides[app.id]) return true;

  const workflowStatus = String(app.workflow_status ?? "").toLowerCase();
  const status = String(app.status ?? "").toLowerCase();
  const merged = `${workflowStatus} ${status}`;

  return (
    merged.includes("longlist") ||
    merged.includes("shortlist") ||
    merged.includes("interview") ||
    merged.includes("assessment") ||
    merged.includes("hire") ||
    merged.includes("accepted") ||
    merged.includes("reject") ||
    merged.includes("reviewed")
  );
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
  const PAGE_LIMIT = 5;
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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
      setPage(1);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [accessToken, jobId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter((app) => {
      const name = String(app.applicant_name ?? "").toLowerCase();
      const email = String(app.applicant_email ?? "").toLowerCase();
      const phone = String(app.applicant_phone ?? "").toLowerCase();
      const status = detectStage(app, stageOverrides).toLowerCase();
      const applied = app.created_at ? new Date(app.created_at).toLocaleDateString("en-GB").toLowerCase() : "";
      return (
        name.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        status.includes(q) ||
        applied.includes(q)
      );
    });
  }, [applications, search, stageOverrides]);

  const mainListApplications = useMemo(
    () => filteredApplications.filter((app) => !isAssignedToStatus(app, stageOverrides)),
    [filteredApplications, stageOverrides],
  );

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
      if (!isAssignedToStatus(app, stageOverrides)) continue;
      map[detectStage(app, stageOverrides)].push(app);
    }
    return map;
  }, [applications, stageOverrides]);

  const pagination = useMemo(() => {
    const total = mainListApplications.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
    const safePage = Math.min(page, pages);
    return { page: safePage, pages, total, limit: PAGE_LIMIT };
  }, [mainListApplications.length, page]);

  useEffect(() => {
    if (page > pagination.pages) {
      setPage(pagination.pages);
    }
  }, [page, pagination.pages]);

  const visibleApplications = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return mainListApplications.slice(start, start + pagination.limit);
  }, [mainListApplications, pagination.limit, pagination.page]);

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

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 260, flex: "1 1 340px" }}>
          <label className="fieldLabel">Search</label>
          <input
            className="input"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name/email/phone/status/date..."
          />
        </div>

        <div className="publicJobsPager" role="navigation" aria-label="Applicants pagination top">
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
            Page {pagination.page} of {pagination.pages} ({pagination.total} applicants)
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

      <div className="jobCardsGrid" role="region" aria-label="Job applicants list">
        {visibleApplications.length === 0 ? (
          <div className="dashCard jobCardsGridItem jobCardToneA">
            <div className="emptyState">
              {applications.length === 0
                ? "No applicants found for this job."
                : mainListApplications.length === 0
                  ? "No applicants pending status assignment in the main list."
                  : "No applicants match your search."}
            </div>
          </div>
        ) : (
          visibleApplications.map((app, idx) => {
            const current = detectStage(app, stageOverrides);
            const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
            return (
              <article key={app.id} className={`dashCard jobCardsGridItem ${toneClass}`}>
                <div className="dashCardHeader" style={{ marginBottom: 6 }}>
                  <h2 className="dashCardTitle" style={{ fontSize: 15 }}>{app.applicant_name ?? "—"}</h2>
                </div>

                <div className="profileReadGrid" style={{ marginTop: 6 }}>
                  <ReadField label="Email" value={String(app.applicant_email ?? "—")} />
                  <ReadField label="Phone" value={String(app.applicant_phone ?? "—")} />
                  <ReadField
                    label="Applied Date"
                    value={app.created_at ? new Date(app.created_at).toLocaleDateString("en-GB") : "—"}
                  />
                  <ReadField label="Current Status" value={current} />
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 12 }}>
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

                {openProfileId === app.id ? <div style={{ marginTop: 12 }}>{renderProfilePanel(app)}</div> : null}
              </article>
            );
          })
        )}
      </div>

      <div className="publicJobsPager" role="navigation" aria-label="Applicants pagination" style={{ marginTop: 16 }}>
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
          Page {pagination.page} of {pagination.pages} ({pagination.total} applicants)
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

      {(Object.keys(grouped) as StageKey[]).map((stage) => (
        <section key={stage} style={{ marginTop: 18 }}>
          <button
            type="button"
            className="btn btnGhost btnSm"
            onClick={() => setOpenGroups((prev) => ({ ...prev, [stage]: !prev[stage] }))}
          >
            {openGroups[stage] ? "Hide" : "Show"} {STATUS_ACTIONS.find((s) => s.key === stage)?.label ?? stage} ({grouped[stage].length})
          </button>

          {openGroups[stage] ? (
            <div className="jobCardsGrid" role="region" aria-label={`${stage} applicants list`} style={{ marginTop: 10 }}>
              {grouped[stage].length === 0 ? (
                <div className="dashCard jobCardsGridItem jobCardToneA">
                  <div className="emptyState">No applicants in this status.</div>
                </div>
              ) : (
                grouped[stage].map((app, idx) => {
                  const current = detectStage(app, stageOverrides);
                  const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
                  return (
                    <article key={`${stage}-${app.id}`} className={`dashCard jobCardsGridItem ${toneClass}`}>
                      <div className="dashCardHeader" style={{ marginBottom: 6 }}>
                        <h3 className="dashCardTitle" style={{ fontSize: 15 }}>{app.applicant_name ?? "—"}</h3>
                      </div>
                      <div className="profileReadGrid" style={{ marginTop: 6 }}>
                        <ReadField label="Email" value={String(app.applicant_email ?? "—")} />
                        <ReadField label="Phone" value={String(app.applicant_phone ?? "—")} />
                        <ReadField
                          label="Applied Date"
                          value={app.created_at ? new Date(app.created_at).toLocaleDateString("en-GB") : "—"}
                        />
                        <ReadField label="Current Status" value={current} />
                      </div>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 12 }}>
                        {canUpdateStatus &&
                          STATUS_ACTIONS.filter((s) => s.key !== current).map((action) => (
                            <button
                              key={`${stage}-${app.id}-${action.key}`}
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

                      {openProfileId === app.id ? <div style={{ marginTop: 12 }}>{renderProfilePanel(app)}</div> : null}
                    </article>
                  );
                })
              )}
            </div>
          ) : null}
        </section>
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
