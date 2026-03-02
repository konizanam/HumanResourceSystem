import { type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { COUNTRY_NAMES } from "../utils/countries";
import { NAMIBIA_REGIONS, NAMIBIA_TOWNS_CITIES } from "../utils/namibia";
import {
  applyToJob,
  blockUser,
  listJobSeekerResumes,
  listMyDocuments,
  getFullProfile,
  getJobSeekerFullProfile,
  listJobSeekers,
  listUserDocuments,
  getIpLocation,
  me,
  uploadJobSeekerDocument,
  uploadJobSeekerResume,
  updateProfile,
  updatePersonalDetails,
  saveAddress,
  deleteAddress,
  saveEducation,
  deleteEducation,
  saveExperience,
  deleteExperience,
  saveReference,
  deleteReference,
  type FullProfile,
  type JobListItem,
  type JobSeekerListItem,
  type JobSeekerFullProfile,
  type UserDocument,
} from "../api/client";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

const PROFILE_STEPS = [
  "Personal Details",
  "Address",
  "Education",
  "Experience",
  "References",
  "Professional Summary",
] as const;

const EDUCATION_QUALIFICATION_OPTIONS = [
  "Primary School",
  "Secondary School",
  "High School",
  "Certificate",
  "Diploma",
  "Advanced Diploma",
  "Bachelor's",
  "Honours",
  "Postgraduate Diploma",
  "Master's",
  "Doctorate (PhD)",
] as const;

const EDUCATION_FIELD_OF_STUDY_OPTIONS = [
  "Accounting",
  "Administration",
  "Agriculture",
  "Architecture",
  "Auditing",
  "Banking",
  "Business Analysis",
  "Business Development",
  "Civil Engineering",
  "Customer Service",
  "Data Science",
  "Education",
  "Electrical Engineering",
  "Finance",
  "Healthcare",
  "Human Resources",
  "Information Technology",
  "Law",
  "Logistics",
  "Marketing",
  "Mechanical Engineering",
  "Procurement",
  "Project Management",
  "Public Administration",
  "Sales",
  "Software Development",
] as const;

function resolveFileUrl(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (/^(https?:\/\/|data:)/i.test(value)) return value;
  const base = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
  if (!base) return value;
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}

function extractFileName(raw: unknown): string {
  const full = String(raw ?? "").trim();
  if (!full) return "";
  const clean = full.split("?")[0] ?? full;
  const parts = clean.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : clean;
}

function getInlinePreviewKind(resolvedUrl: string): "image" | "pdf" | "none" {
  const url = String(resolvedUrl ?? "").trim();
  if (!url) return "none";
  if (/^data:image\//i.test(url)) return "image";
  if (/^data:application\/pdf/i.test(url)) return "pdf";
  const fileName = extractFileName(url).toLowerCase();
  if (/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(fileName)) return "image";
  if (/\.pdf$/i.test(fileName)) return "pdf";
  return "none";
}

function UploadedDocumentCard({
  title,
  url,
  fallbackText,
  hint,
  previewMode = "inline",
  externalPreviewOpen,
  onToggleExternalPreview,
}: {
  title: string;
  url: string;
  fallbackText: string;
  hint?: string;
  previewMode?: "inline" | "external";
  externalPreviewOpen?: boolean;
  onToggleExternalPreview?: (resolvedUrl: string, title: string) => void;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const resolvedUrl = resolveFileUrl(url);
  const hasFile = Boolean(resolvedUrl);
  const fileName = extractFileName(url);
  const inlineKind = getInlinePreviewKind(resolvedUrl);
  const isImage = inlineKind === "image";
  const canInlinePreview = inlineKind !== "none";
  const isExternalPreview = previewMode === "external";
  const effectivePreviewOpen = isExternalPreview ? Boolean(externalPreviewOpen) : previewOpen;

  function onDownload(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!resolvedUrl) return;
    const anchor = document.createElement("a");
    anchor.href = resolvedUrl;
    anchor.download = fileName || "document";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  return (
    <div className="uploadedDocCard">
      <div className="uploadedDocCardTitle">{title}</div>
      {hasFile ? (
        <span className="uploadedDocCardLink" title={fileName}>
          {fileName || `View ${title.toLowerCase()}`}
        </span>
      ) : (
        <span className="readValue">{fallbackText}</span>
      )}
      {hasFile ? (
        <div className="uploadedDocCardActions">
          <button
            type="button"
            className="btn btnPrimary btnSm uploadedDocViewBtn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isExternalPreview) {
                onToggleExternalPreview?.(resolvedUrl, title);
                return;
              }
              setPreviewOpen((v) => !v);
            }}
          >
            {effectivePreviewOpen ? "Hide" : "View"}
          </button>
          <button
            type="button"
            className="btn btnGhost btnSm uploadedDocDownloadBtn"
            onClick={onDownload}
          >
            Download
          </button>
        </div>
      ) : null}

      {hasFile && !isExternalPreview && previewOpen ? (
        <div className="uploadedDocPreview">
          {canInlinePreview ? (
            isImage ? (
              <img className="uploadedDocPreviewImage" src={resolvedUrl} alt={fileName || title} />
            ) : (
              <iframe className="uploadedDocPreviewFrame" src={resolvedUrl} title={`${title} preview`} />
            )
          ) : (
            <span className="uploadedDocCardHint">Preview is not available for this file type. Use Download.</span>
          )}
        </div>
      ) : null}

      {hint ? <span className="uploadedDocCardHint">{hint}</span> : null}
    </div>
  );
}

function StepIcon({ step }: { step: number }) {
  const common = {
    className: "profileStepIcon",
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
    focusable: false as const,
  };

  switch (step) {
    case 0:
      return (
        <svg {...common}>
          <path
            d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-4.4 0-8 2.2-8 4.8V20h16v-1.2C20 16.2 16.4 14 12 14Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 1:
      return (
        <svg {...common}>
          <path
            d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 2:
      return (
        <svg {...common}>
          <path
            d="M12 4 3 8l9 4 9-4-9-4Zm-7 6v6c0 2.2 3.1 4 7 4s7-1.8 7-4v-6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 3:
      return (
        <svg {...common}>
          <path
            d="M9 6V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h4a1 1 0 0 1 1 1v4H3V8a1 1 0 0 1 1-1h5Zm12 8v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5h8v1h2v-1h8Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 4:
      return (
        <svg {...common}>
          <path
            d="M16 18c2.2 0 4-1.4 4-3.2S18.2 12 16 12s-4 1.4-4 3.2S13.8 18 16 18Zm-8 0c2.2 0 4-1.4 4-3.2S10.2 12 8 12s-4 1.4-4 3.2S5.8 18 8 18Zm8 2c-2.9 0-5.3 1.2-6 3h12c-.7-1.8-3.1-3-6-3Zm-8 0c-2.9 0-5.3 1.2-6 3h8.3c.2-1 .8-2 1.7-2.7-1.1-.2-2.4-.3-4-.3Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path
            d="M7 4h8l2 2v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm2 6h6M9 14h6"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */

const DIRECTORY_PAGE_LIMIT = 5;

export function JobSeekerProfilePage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [data, setData] = useState<FullProfile | null>(null);
  const [mode, setMode] = useState<"self" | "directory" | "forbidden">("self");
  const [jobSeekers, setJobSeekers] = useState<JobSeekerListItem[]>([]);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryPagination, setDirectoryPagination] = useState({
    page: 1,
    limit: DIRECTORY_PAGE_LIMIT,
    total: 0,
    pages: 1,
  });
  const [directorySearch, setDirectorySearch] = useState("");
  const [directoryStatus, setDirectoryStatus] = useState("");
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryCanManageUsers, setDirectoryCanManageUsers] = useState(false);

  const [openDirectoryProfileId, setOpenDirectoryProfileId] = useState<string | null>(null);
  const [directoryProfileByUserId, setDirectoryProfileByUserId] = useState<
    Record<string, JobSeekerFullProfile | null | undefined>
  >({});

  const [directoryDocumentsByUserId, setDirectoryDocumentsByUserId] = useState<
    Record<string, UserDocument[] | null | undefined>
  >({});

  const [directoryDocPreviewByUserId, setDirectoryDocPreviewByUserId] = useState<
    Record<string, { url: string; title: string } | null | undefined>
  >({});

  const [blockModalUser, setBlockModalUser] = useState<JobSeekerListItem | null>(null);
  const [blockAction, setBlockAction] = useState<"block" | "unblock">("block");
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editResetToken, setEditResetToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingJob, setPendingJob] = useState<JobListItem | null>(null);
  const [applyingPending, setApplyingPending] = useState(false);
  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);

      let session: any = null;
      try {
        session = await me(accessToken);
      } catch {
        session = null;
      }

      const roles: string[] = Array.isArray(session?.user?.roles)
        ? session.user.roles.map((r: unknown) => String(r))
        : [];
      const permissions: string[] = Array.isArray(session?.user?.permissions)
        ? session.user.permissions.map((p: unknown) => String(p))
        : [];

      const normalizedRoles = roles.map((r) => r.toUpperCase());
      const normalizedPerms = permissions.map((p) => p.toLowerCase());
      const isJobSeeker = normalizedRoles.includes("JOB_SEEKER");
      const canViewJobSeekerProfiles = normalizedPerms.some((p) =>
        ["view_users", "manage_users", "view_applications", "manage_applications"].includes(p),
      );
      setDirectoryCanManageUsers(normalizedPerms.includes("manage_users"));

      if (!isJobSeeker && canViewJobSeekerProfiles) {
        setMode("directory");
        setError(null);
        setSuccess(null);
        setPendingJob(null);
        setData(null);

        // Directory list is loaded via the dedicated paginated loader (page/filters).
        setJobSeekers([]);
        return;
      }

      if (!isJobSeeker) {
        setMode("forbidden");
        setData(null);
        setError("Access denied. You do not have permission to view job seeker profiles.");
        return;
      }

      setMode("self");
      const profile = await getFullProfile(accessToken);
      if (!profile.personalDetails) {
        try {
          const user = (session as any)?.user ?? {};
          profile.personalDetails = {
            first_name: user.first_name ?? "",
            last_name: user.last_name ?? "",
          };
        } catch {
          // Best-effort fallback only.
        }
      }
      setData(profile);
    } catch (err) {
      const status = (err as any)?.status;
      if (status === 403) {
        setError("Access denied. This page is available for job seeker accounts.");
        setData(null);
        return;
      }
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [accessToken, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const state = (location as any)?.state as { pendingJob?: JobListItem } | undefined;
    const job = state?.pendingJob;
    if (job && typeof job === "object" && String((job as any).id ?? "").trim()) {
      setPendingJob(job);
    }
  }, [location]);

  const onCompletePendingApplication = useCallback(async () => {
    if (!accessToken || !pendingJob) return;
    const jobId = String(pendingJob.id ?? "").trim();
    if (!jobId) return;

    try {
      setApplyingPending(true);
      setError(null);
      setSuccess(null);
      await applyToJob(accessToken, { job_id: jobId });
      setSuccess(`Application submitted for "${pendingJob.title}".`);
      setPendingJob(null);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to apply for job");
    } finally {
      setApplyingPending(false);
    }
  }, [accessToken, pendingJob]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  const loadDirectory = useCallback(
    async (pageToLoad: number) => {
      if (!accessToken) return;
      try {
        setDirectoryLoading(true);
        setError(null);

        const res = await listJobSeekers(accessToken, {
          page: pageToLoad,
          limit: DIRECTORY_PAGE_LIMIT,
          search: directorySearch.trim() || undefined,
          status: directoryStatus || undefined,
        });

        const allSeekers = Array.isArray((res as any)?.job_seekers) ? (res as any).job_seekers : [];
        const pag = (res as any)?.pagination ?? {};

        const requestedLimit = DIRECTORY_PAGE_LIMIT;
        const apiPageRaw = Number(pag.page);
        const apiLimitRaw = Number(pag.limit);
        const apiTotalRaw = Number(pag.total);
        const apiPagesRaw = Number(pag.pages);

        const hasApiPage = Number.isFinite(apiPageRaw) && apiPageRaw >= 1;
        const hasApiLimit = Number.isFinite(apiLimitRaw) && apiLimitRaw >= 1;
        const hasApiTotal = Number.isFinite(apiTotalRaw) && apiTotalRaw >= 0;
        const hasApiPages = Number.isFinite(apiPagesRaw) && apiPagesRaw >= 1;

        const resolvedPage = hasApiPage ? apiPageRaw : pageToLoad;
        const resolvedLimit = hasApiLimit ? apiLimitRaw : requestedLimit;
        const resolvedTotal = hasApiTotal ? apiTotalRaw : allSeekers.length;
        const resolvedPages = hasApiPages
          ? apiPagesRaw
          : Math.max(1, Math.ceil(resolvedTotal / Math.max(1, resolvedLimit)));

        const responseLooksPaged =
          allSeekers.length <= resolvedLimit &&
          (!hasApiPage || resolvedPage === pageToLoad);

        const seekers = responseLooksPaged
          ? allSeekers
          : allSeekers.slice(
              (pageToLoad - 1) * requestedLimit,
              (pageToLoad - 1) * requestedLimit + requestedLimit,
            );

        setJobSeekers(seekers);
        setDirectoryPagination({
          page: resolvedPage,
          limit: resolvedLimit,
          total: resolvedTotal,
          pages: resolvedPages,
        });
      } catch (e) {
        setJobSeekers([]);
        setDirectoryPagination({ page: 1, limit: DIRECTORY_PAGE_LIMIT, total: 0, pages: 1 });
        setError((e as any)?.message ?? "Failed to load job seeker profiles");
      } finally {
        setDirectoryLoading(false);
      }
    },
    [accessToken, directorySearch, directoryStatus],
  );

  useEffect(() => {
    if (mode !== "directory") return;
    loadDirectory(directoryPage);
  }, [directoryPage, loadDirectory, mode]);

  useEffect(() => {
    if (mode !== "directory") return;
    if (directoryPage > directoryPagination.pages) {
      setDirectoryPage(directoryPagination.pages);
    }
  }, [directoryPage, directoryPagination.pages, mode]);

  function readValue(obj: Record<string, unknown> | null | undefined, ...keys: string[]) {
    if (!obj) return null;
    for (const k of keys) {
      const v = (obj as any)[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") return v;
    }
    return null;
  }

  async function onToggleDirectoryProfile(seeker: JobSeekerListItem) {
    const id = String(seeker.id ?? "").trim();
    if (!id) return;
    const nextOpen = openDirectoryProfileId === id ? null : id;
    setOpenDirectoryProfileId(nextOpen);
    setDirectoryDocPreviewByUserId((prev) => ({ ...prev, [id]: null }));
    if (!nextOpen || !accessToken) return;

    const hasProfile = Object.prototype.hasOwnProperty.call(directoryProfileByUserId, id);
    const hasDocs = Object.prototype.hasOwnProperty.call(directoryDocumentsByUserId, id);
    if (hasProfile && hasDocs) return;

    if (!hasProfile) setDirectoryProfileByUserId((prev) => ({ ...prev, [id]: undefined }));
    if (!hasDocs) setDirectoryDocumentsByUserId((prev) => ({ ...prev, [id]: undefined }));

    try {
      const [profile, docs] = await Promise.all([
        hasProfile ? Promise.resolve(directoryProfileByUserId[id] as any) : getJobSeekerFullProfile(accessToken, id),
        hasDocs ? Promise.resolve(directoryDocumentsByUserId[id] as any) : listUserDocuments(accessToken, id),
      ]);
      if (!hasProfile) setDirectoryProfileByUserId((prev) => ({ ...prev, [id]: profile }));
      if (!hasDocs) setDirectoryDocumentsByUserId((prev) => ({ ...prev, [id]: Array.isArray(docs) ? docs : [] }));
    } catch {
      if (!hasProfile) setDirectoryProfileByUserId((prev) => ({ ...prev, [id]: null }));
      if (!hasDocs) setDirectoryDocumentsByUserId((prev) => ({ ...prev, [id]: null }));
    }
  }

  function startBlock(seeker: JobSeekerListItem) {
    if (!directoryCanManageUsers) return;
    clearMessages();
    const action = seeker.is_blocked ? "unblock" : "block";
    setBlockAction(action);
    setBlockModalUser(seeker);
    setBlockReason("");
  }

  async function onConfirmBlock() {
    if (!accessToken || !blockModalUser || !directoryCanManageUsers) return;
    try {
      clearMessages();
      setBlocking(true);
      const result = await blockUser(accessToken, blockModalUser.id, {
        block: blockAction === "block",
        reason: blockAction === "block" ? blockReason.trim() || undefined : undefined,
      });
      setSuccess(
        result.message ?? `User ${blockAction === "block" ? "blocked" : "unblocked"} successfully`,
      );
      setJobSeekers((prev) =>
        prev.map((u) =>
          u.id === blockModalUser.id
            ? {
                ...u,
                is_blocked: blockAction === "block",
                blocked_at: blockAction === "block" ? new Date().toISOString() : null,
                block_reason: blockAction === "block" ? blockReason.trim() || null : null,
              }
            : u,
        ),
      );
      setBlockModalUser(null);
      setBlockReason("");
    } catch (e) {
      setError((e as any)?.message ?? `Failed to ${blockAction} user`);
    } finally {
      setBlocking(false);
    }
  }

  function renderDirectoryProfilePanel(seeker: JobSeekerListItem) {
    const userId = String(seeker.id ?? "").trim();
    const profile = userId ? directoryProfileByUserId[userId] : null;
    const docs = userId ? directoryDocumentsByUserId[userId] : null;
    const selectedPreview = userId ? (directoryDocPreviewByUserId[userId] ?? null) : null;

    if (!userId) {
      return (
        <div className="dropPanel">
          <h3 className="editFormTitle" style={{ marginBottom: 8 }}>Job Seeker Profile</h3>
          <p className="pageText">Profile details are not available for this job seeker.</p>
        </div>
      );
    }

    const personal = (profile as any)?.personalDetails ?? null;
    const mainProfile = (profile as any)?.profile ?? null;
    const addresses = Array.isArray((profile as any)?.addresses) ? ((profile as any).addresses as any[]) : [];
    const education = Array.isArray((profile as any)?.education) ? ((profile as any).education as any[]) : [];
    const experience = Array.isArray((profile as any)?.experience) ? ((profile as any).experience as any[]) : [];

    const firstName = String(readValue(personal, "first_name", "firstName") ?? seeker.first_name ?? "").trim();
    const lastName = String(readValue(personal, "last_name", "lastName") ?? seeker.last_name ?? "").trim();
    const computedFullName = `${firstName} ${lastName}`.trim();
    const resolvedFullName = computedFullName || String(seeker.email ?? "—").trim() || "—";

    return (
      <div className="dropPanel">
        <h3 className="editFormTitle" style={{ marginBottom: 8 }}>Job Seeker Profile</h3>
        {profile === undefined ? (
          <p className="pageText">Loading profile...</p>
        ) : profile === null ? (
          <p className="pageText">Profile details are not available for this job seeker.</p>
        ) : (
          <>
            <div style={{ marginTop: 10 }}>
              <div className="readLabel">Personal Details</div>
              <div className="profileReadGrid" style={{ marginTop: 6 }}>
                <ReadField label="Full Name" value={resolvedFullName} />
                <ReadField label="Email" value={seeker.email} />
                <ReadField label="Phone" value={seeker.phone} />
                <ReadField label="Gender" value={readValue(personal, "gender")} />
                <ReadField label="Nationality" value={readValue(personal, "nationality")} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="readLabel">Professional Summary</div>
              <div style={{ marginTop: 6 }}>
                <div className="readValue" style={{ whiteSpace: "pre-wrap" }}>
                  {String(
                    readValue(mainProfile, "professional_summary", "professionalSummary") ??
                      "—",
                  )}
                </div>
                <div className="profileReadGrid" style={{ marginTop: 8 }}>
                  <ReadField
                    label="Field of Expertise"
                    value={readValue(mainProfile, "field_of_expertise", "fieldOfExpertise")}
                  />
                  <ReadField
                    label="Qualification Level"
                    value={readValue(mainProfile, "qualification_level", "qualificationLevel")}
                  />
                  <ReadField
                    label="Years Experience"
                    value={readValue(mainProfile, "years_experience", "yearsExperience")}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="readLabel">Address</div>
              <div style={{ marginTop: 6 }}>
                {addresses.length === 0 ? (
                  <p className="pageText">No address records.</p>
                ) : (
                  addresses.map((address, idx) => (
                    <div key={`${userId}-addr-${idx}`} className="readValue" style={{ marginBottom: 6 }}>
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
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="readLabel">Education</div>
              <div style={{ marginTop: 6 }}>
                {education.length === 0 ? (
                  <p className="pageText">No education records.</p>
                ) : (
                  education.map((edu, idx) => (
                    <div key={`${userId}-edu-${idx}`} className="readValue" style={{ marginBottom: 6 }}>
                      {[
                        readValue(edu, "institution"),
                        readValue(edu, "qualification"),
                        readValue(edu, "field_of_study", "fieldOfStudy"),
                        readValue(edu, "start_year", "startYear"),
                        readValue(edu, "end_year", "endYear"),
                      ]
                        .filter(Boolean)
                        .map(String)
                        .join(" • ") || "—"}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="readLabel">Experience</div>
              <div style={{ marginTop: 6 }}>
                {experience.length === 0 ? (
                  <p className="pageText">No experience records.</p>
                ) : (
                  experience.map((exp, idx) => (
                    <div key={`${userId}-exp-${idx}`} className="readValue" style={{ marginBottom: 6 }}>
                      {[
                        readValue(exp, "company"),
                        readValue(exp, "position"),
                        readValue(exp, "start_date", "startDate"),
                        readValue(exp, "end_date", "endDate"),
                      ]
                        .filter(Boolean)
                        .map(String)
                        .join(" • ") || "—"}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="readLabel">Documents</div>
              <div style={{ marginTop: 8 }}>
                {(() => {
                  const cards: { title: string; url: string; hint?: string }[] = [];

                  const idDoc = String(readValue(personal, "id_document_url", "idDocumentUrl") ?? "").trim();
                  if (idDoc) cards.push({ title: "ID Document", url: idDoc });

                  const profileCert = String(readValue(mainProfile, "certificate_url", "certificateUrl") ?? "").trim();
                  if (profileCert) cards.push({ title: "Certificate", url: profileCert, hint: "From profile" });

                  for (const edu of education) {
                    const cert = String(readValue(edu as any, "certificate_url", "certificateUrl") ?? "").trim();
                    if (!cert) continue;
                    const inst = String(readValue(edu as any, "institution", "institution_name", "institutionName") ?? "").trim();
                    cards.push({ title: "Certificate", url: cert, hint: inst || undefined });
                  }

                  const uploadedDocs: UserDocument[] = Array.isArray(docs) ? docs : [];
                  for (const d of uploadedDocs) {
                    const url = String(d.file_url ?? "").trim();
                    if (!url) continue;
                    const title = String(d.document_type ?? "Document").trim() || "Document";
                    const hint = String(d.description ?? d.original_name ?? "").trim() || undefined;
                    cards.push({ title, url, hint });
                  }

                  const seen = new Set<string>();
                  const unique = cards.filter((c) => {
                    const key = `${c.title}::${c.url}`;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });

                  if (docs === undefined) {
                    return <p className="pageText">Loading documents...</p>;
                  }

                  if (docs === null) {
                    return <p className="pageText">Documents are not available for this job seeker.</p>;
                  }

                  if (unique.length === 0) {
                    return <p className="pageText">No documents uploaded.</p>;
                  }

                  const previewKind = selectedPreview?.url ? getInlinePreviewKind(selectedPreview.url) : "none";

                  return (
                    <>
                      <div className="uploadedDocsGrid" style={{ marginTop: 0 }}>
                        {unique.map((c, idx) => (
                          <UploadedDocumentCard
                            key={`${userId}-doc-${idx}`}
                            title={c.title}
                            url={c.url}
                            fallbackText="—"
                            hint={c.hint}
                            previewMode="external"
                            externalPreviewOpen={Boolean(selectedPreview?.url && selectedPreview.url === resolveFileUrl(c.url))}
                            onToggleExternalPreview={(resolvedUrl, title) => {
                              setDirectoryDocPreviewByUserId((prev) => {
                                const current = prev[userId];
                                const isSame = Boolean(current?.url && current.url === resolvedUrl);
                                return {
                                  ...prev,
                                  [userId]: isSame ? null : { url: resolvedUrl, title },
                                };
                              });
                            }}
                          />
                        ))}
                      </div>

                      {selectedPreview?.url ? (
                        <div style={{ marginTop: 10 }}>
                          <div className="readLabel">{selectedPreview.title} Preview</div>
                          <div className="uploadedDocPreview" style={{ marginTop: 6 }}>
                            {previewKind === "image" ? (
                              <img
                                className="uploadedDocPreviewImage"
                                src={selectedPreview.url}
                                alt={selectedPreview.title}
                              />
                            ) : previewKind === "pdf" ? (
                              <iframe
                                className="uploadedDocPreviewFrame"
                                src={selectedPreview.url}
                                title={`${selectedPreview.title} preview`}
                              />
                            ) : (
                              <span className="uploadedDocCardHint">
                                Preview is not available for this file type. Use Download.
                              </span>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button
                type="button"
                className="btn btnPrimary btnSm"
                onClick={() => void onToggleDirectoryProfile(seeker)}
              >
                Hide Profile
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const isEditingThisStep = editingStep === activeStep;

  const directoryStatsCards = useMemo(() => {
    let active = 0;
    let blocked = 0;
    let inactive = 0;

    for (const seeker of jobSeekers) {
      if (seeker.is_blocked) {
        blocked += 1;
      } else if (seeker.is_active) {
        active += 1;
      } else {
        inactive += 1;
      }
    }

    return [
      { label: "Total Profiles", value: Number(directoryPagination.total ?? 0) },
      { label: "Profiles on Page", value: jobSeekers.length },
      { label: "Active", value: active },
      { label: "Blocked", value: blocked },
      { label: "Inactive", value: inactive },
    ];
  }, [directoryPagination.total, jobSeekers]);

  if (loading) {
    return (
      <div className="page">
        <h1 className="pageTitle">Job Seeker Profiles</h1>
        <p className="pageText">Loading…</p>
      </div>
    );
  }

  if (mode === "directory") {
    return (
      <div className="page">
        <div className="profileHeader">
          <h1 className="pageTitle">Job Seeker Profiles</h1>
          <p className="pageText">Browse job seeker profiles</p>
        </div>

        {error && <div className="errorBox">{error}</div>}
        {success && <div className="successBox">{success}</div>}

        <div className="statsCardsGrid" role="region" aria-label="Job seeker profile statistics">
          {directoryStatsCards.map((card, idx) => {
            const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
            return (
              <div key={card.label} className={`dashCard statsCard ${toneClass}`}>
                <div className="readLabel">{card.label}</div>
                <div className="statsCardValue">{card.value}</div>
              </div>
            );
          })}
        </div>

        {/* Filters + Pagination */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 260, flex: "1 1 340px" }}>
            <label className="fieldLabel">Search</label>
            <input
              className="input"
              value={directorySearch}
              onChange={(e) => {
                setDirectorySearch(e.target.value);
                setDirectoryPage(1);
              }}
              placeholder="Search name/email/phone…"
            />
          </div>

          <div style={{ minWidth: 180 }}>
            <label className="fieldLabel">Status</label>
            <select
              className="input"
              value={directoryStatus}
              onChange={(e) => {
                setDirectoryStatus(e.target.value);
                setDirectoryPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {directoryPagination.pages > 1 ? (
            <div className="publicJobsPager" role="navigation" aria-label="Job seeker profiles pagination top">
              <button
                className="btn btnPrimary btnSm"
                style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
                type="button"
                onClick={() => setDirectoryPage((p) => Math.max(1, p - 1))}
                disabled={directoryPagination.page <= 1 || directoryLoading}
              >
                {"<-"} Previous
              </button>
              <span className="publicJobsPagerInfo">
                Page {directoryPagination.page} of {directoryPagination.pages} ({directoryPagination.total} profiles)
              </span>
              <button
                className="btn btnPrimary btnSm"
                style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
                type="button"
                onClick={() => setDirectoryPage((p) => Math.min(directoryPagination.pages, p + 1))}
                disabled={directoryPagination.page >= directoryPagination.pages || directoryLoading}
              >
                Next {"->"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="jobCardsGrid" role="region" aria-label="Job seeker cards">
          {jobSeekers.length === 0 ? (
            <div className="dashCard jobCardsGridItem jobCardToneA">
              <div className="emptyState">
                {directoryLoading
                  ? "Loading job seeker profiles…"
                  : directorySearch.trim() || directoryStatus
                    ? "No job seeker profiles match your filters."
                    : "No job seeker profiles found."}
              </div>
            </div>
          ) : (
            jobSeekers.map((seeker, idx) => {
              const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
              const fullName = `${String(seeker.first_name ?? "").trim()} ${String(seeker.last_name ?? "").trim()}`.trim();
              const title = fullName || String(seeker.email ?? "Job Seeker");
              const createdLabel = seeker.created_at
                ? new Date(seeker.created_at).toLocaleDateString("en-GB")
                : "—";
              const statusLabel = seeker.is_blocked ? "Blocked" : seeker.is_active ? "Active" : "Inactive";
              const canBlock = directoryCanManageUsers;
              const isOpen = openDirectoryProfileId === seeker.id;

              return (
                <article key={seeker.id} className={`dashCard jobCardsGridItem ${toneClass}`}>
                  <div className="dashCardHeader" style={{ marginBottom: 6 }}>
                    <h2 className="dashCardTitle" style={{ fontSize: 15 }}>{title}</h2>
                  </div>

                  <div className="profileReadGrid" style={{ marginTop: 6 }}>
                    <ReadField label="Email" value={seeker.email} />
                    <ReadField label="Phone" value={seeker.phone} />
                    <ReadField label="Status" value={statusLabel} />
                    <ReadField label="Created" value={createdLabel} />
                  </div>

                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end", marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btnPrimary btnSm"
                      onClick={() => void onToggleDirectoryProfile(seeker)}
                      disabled={directoryLoading}
                    >
                      {isOpen ? "Hide Profile" : "View Profile"}
                    </button>

                    {canBlock ? (
                      <button
                        type="button"
                        className={seeker.is_blocked ? "btn btnGhost btnSm stepperSaveBtn" : "btn btnDanger btnSm"}
                        onClick={() => startBlock(seeker)}
                        disabled={blocking}
                      >
                        {seeker.is_blocked ? "Unblock User" : "Block User"}
                      </button>
                    ) : null}
                  </div>

                  {isOpen ? <div style={{ marginTop: 12 }}>{renderDirectoryProfilePanel(seeker)}</div> : null}
                </article>
              );
            })
          )}
        </div>

        {directoryPagination.pages > 1 ? (
          <div className="publicJobsPager" role="navigation" aria-label="Job seeker profiles pagination" style={{ marginTop: 16 }}>
            <button
              className="btn btnPrimary btnSm"
              style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
              type="button"
              onClick={() => setDirectoryPage((p) => Math.max(1, p - 1))}
              disabled={directoryPagination.page <= 1 || directoryLoading}
            >
              {"<-"} Previous
            </button>
            <span className="publicJobsPagerInfo">
              Page {directoryPagination.page} of {directoryPagination.pages} ({directoryPagination.total} profiles)
            </span>
            <button
              className="btn btnPrimary btnSm"
              style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
              type="button"
              onClick={() => setDirectoryPage((p) => Math.min(directoryPagination.pages, p + 1))}
              disabled={directoryPagination.page >= directoryPagination.pages || directoryLoading}
            >
              Next {"->"}
            </button>
          </div>
        ) : null}

        {/* Block / Unblock modal */}
        <ConfirmModal
          open={Boolean(blockModalUser)}
          title={blockAction === "block" ? "Block User" : "Unblock User"}
          message={
            blockAction === "block"
              ? `Are you sure you want to block ${blockModalUser?.first_name ?? ""} ${blockModalUser?.last_name ?? ""} (${blockModalUser?.email ?? ""})? They will not be able to log in.`
              : `Are you sure you want to unblock ${blockModalUser?.first_name ?? ""} ${blockModalUser?.last_name ?? ""} (${blockModalUser?.email ?? ""})? They will be able to log in again.`
          }
          confirmLabel={
            blocking
              ? (blockAction === "block" ? "Blocking…" : "Unblocking…")
              : (blockAction === "block" ? "Block" : "Unblock")
          }
          busy={blocking}
          onCancel={() => {
            setBlockModalUser(null);
            setBlockReason("");
          }}
          onConfirm={onConfirmBlock}
        >
          {blockAction === "block" ? (
            <div style={{ padding: "0 24px", marginBottom: 8 }}>
              <label className="fieldLabel">Reason (optional)</label>
              <textarea
                className="input textarea"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Provide a reason for blocking this user…"
                rows={3}
              />
            </div>
          ) : null}
        </ConfirmModal>
      </div>
    );
  }

  if (mode === "forbidden") {
    return (
      <div className="page">
        <h1 className="pageTitle">Job Seeker Profiles</h1>
        <p className="pageText">{error ?? "Access denied."}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <h1 className="pageTitle">Job Seeker Profile</h1>
        <p className="pageText">
          {error ?? "No profile data found. Please contact support."}
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="profileHeader">
        <h1 className="pageTitle">Job Seeker Profile</h1>
      </div>

      {error && <div className="errorBox">{error}</div>}
      {success && <div className="successBox">{success}</div>}

      {/* ── Profile Stepper Nav ─────────────────── */}
      <div className="profileStepperNav">
        {PROFILE_STEPS.map((label, i) => (
          <div key={label} className="profileStepItem">
            <button
              type="button"
              className={
                "profileStepBtn" +
                (i === activeStep ? " profileStepBtnActive" : "")
              }
              onClick={() => {
                setActiveStep(i);
                setEditingStep(null);
                setEditResetToken((t) => t + 1);
                clearMessages();
              }}
              aria-label={label}
            >
              <span className="profileStepNum">{i + 1}</span>
              <StepIcon step={i} />
              <span className="profileStepLabel">{label}</span>
            </button>

            <button
              type="button"
              className={
                "btn btnGhost btnSm profileStepEditBtn" +
                (editingStep === i ? " profileStepEditBtnActive" : "")
              }
              disabled={saving}
              onClick={() => {
                setActiveStep(i);

                if (editingStep === i) {
                  setEditingStep(null);
                  setEditResetToken((t) => t + 1);
                } else {
                  setEditingStep(i);
                }

                clearMessages();
              }}
            >
              {editingStep === i ? (
                "Cancel"
              ) : (
                <>
                  <span className="profileEditLong">Edit {label}</span>
                  <span className="profileEditShort">Edit</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* ── Step Content ────────────────────────── */}
      <div className="profileStepContent">
        <div className="profileStepHeader">
          <h2 className="profileStepTitle">{PROFILE_STEPS[activeStep]}</h2>
        </div>

        {activeStep === 0 && (
          <PersonalDetailsSection
            key={`step-0-${editResetToken}`}
            data={data.personalDetails}
            editing={isEditingThisStep}
            token={accessToken!}
            saving={saving}
            setSaving={setSaving}
            setError={setError}
            setSuccess={setSuccess}
            reload={load}
          />
        )}
        {activeStep === 1 && (
          <AddressSection
            key={`step-1-${editResetToken}`}
            items={data.addresses}
            editing={isEditingThisStep}
            token={accessToken!}
            saving={saving}
            setSaving={setSaving}
            setError={setError}
            setSuccess={setSuccess}
            reload={load}
          />
        )}
        {activeStep === 2 && (
          <EducationSection
            key={`step-2-${editResetToken}`}
            items={data.education}
            editing={isEditingThisStep}
            token={accessToken!}
            saving={saving}
            setSaving={setSaving}
            setError={setError}
            setSuccess={setSuccess}
            reload={load}
          />
        )}
        {activeStep === 3 && (
          <ExperienceSection
            key={`step-3-${editResetToken}`}
            items={data.experience}
            editing={isEditingThisStep}
            token={accessToken!}
            saving={saving}
            setSaving={setSaving}
            setError={setError}
            setSuccess={setSuccess}
            reload={load}
          />
        )}
        {activeStep === 4 && (
          <ReferencesSection
            key={`step-4-${editResetToken}`}
            items={data.references}
            editing={isEditingThisStep}
            token={accessToken!}
            saving={saving}
            setSaving={setSaving}
            setError={setError}
            setSuccess={setSuccess}
            reload={load}
          />
        )}
        {activeStep === 5 && (
          <ProfessionalSummarySection
            key={`step-5-${editResetToken}`}
            data={data.profile}
            editing={isEditingThisStep}
            token={accessToken!}
            saving={saving}
            setSaving={setSaving}
            setError={setError}
            setSuccess={setSuccess}
            reload={load}
          />
        )}
      </div>

      {pendingJob ? (
        <div className="dashCard" style={{ marginTop: 16 }}>
          <div className="dashCardHeader">
            <h2 className="dashCardTitle">Pending Job Application</h2>
          </div>

          <div className="profileReadGrid" style={{ marginTop: 6 }}>
            <ReadField label="Job" value={pendingJob.title} />
            <ReadField label="Company" value={pendingJob.company ?? "—"} />
            <ReadField label="Location" value={pendingJob.location ?? "—"} />
            <ReadField
              label="Due Date"
              value={pendingJob.application_deadline ? new Date(pendingJob.application_deadline).toLocaleDateString("en-GB") : "—"}
            />
          </div>

          <div className="dashCardFooter" style={{ gap: 8 }}>
            <button
              className="btn btnGhost btnSm stepperSaveBtn"
              type="button"
              onClick={() => void onCompletePendingApplication()}
              disabled={applyingPending || saving}
            >
              {applyingPending ? "Applying..." : "Complete job application"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ================================================================== */
/*  Shared section props                                                */
/* ================================================================== */

type SectionProps = {
  editing: boolean;
  token: string;
  saving: boolean;
  setSaving: (v: boolean) => void;
  setError: (v: string | null) => void;
  setSuccess: (v: string | null) => void;
  reload: () => Promise<void>;
};

/* ================================================================== */
/*  Personal Details Section                                            */
/* ================================================================== */

function PersonalDetailsSection({
  data,
  editing,
  token,
  saving,
  setSaving,
  setError,
  setSuccess,
  reload,
}: SectionProps & { data: Record<string, unknown> | null }) {
  const d = data ?? {};
  const [form, setForm] = useState({
    firstName: (d.first_name as string) ?? "",
    lastName: (d.last_name as string) ?? "",
    middleName: (d.middle_name as string) ?? "",
    gender: (d.gender as string) ?? "",
    dateOfBirth: (d.date_of_birth as string) ?? "",
    nationality: (d.nationality as string) ?? "",
    idType: (d.id_type as string) ?? "",
    idNumber: (d.id_number as string) ?? "",
    idDocumentUrl: (d.id_document_url as string) ?? "",
    maritalStatus: (d.marital_status as string) ?? "",
    disabilityStatus: (d.disability_status as boolean) ?? false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [licenseDocumentUrl, setLicenseDocumentUrl] = useState("");
  const [conductCertificateUrl, setConductCertificateUrl] = useState("");
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingDocType, setUploadingDocType] = useState<"id" | "license" | "conduct" | null>(null);
  const [externalDocPreview, setExternalDocPreview] = useState<{ url: string; title: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[String(key)];
      return next;
    });
  }

  const [nationalityOpen, setNationalityOpen] = useState(false);

  const nationalitySuggestions = useMemo(() => {
    const q = form.nationality.trim().toLowerCase();
    if (!q) return [];
    const matches = COUNTRY_NAMES.filter((c) => c.toLowerCase().startsWith(q));
    return matches.slice(0, 8);
  }, [form.nationality]);

  useEffect(() => {
    const nd = data ?? {};
    setForm({
      firstName: (nd.first_name as string) ?? "",
      lastName: (nd.last_name as string) ?? "",
      middleName: (nd.middle_name as string) ?? "",
      gender: (nd.gender as string) ?? "",
      dateOfBirth: (nd.date_of_birth as string)?.split("T")[0] ?? "",
      nationality: (nd.nationality as string) ?? "",
      idType: (nd.id_type as string) ?? "",
      idNumber: (nd.id_number as string) ?? "",
      idDocumentUrl: (nd.id_document_url as string) ?? "",
      maritalStatus: (nd.marital_status as string) ?? "",
      disabilityStatus: (nd.disability_status as boolean) ?? false,
    });
  }, [data]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setDocumentsLoading(true);
        const docs = await listMyDocuments(token);
        if (cancelled) return;
        const findByType = (type: string) => {
          const match = (docs ?? []).find(
            (doc) => String(doc.document_type ?? "").trim().toLowerCase() === type,
          );
          return String(match?.file_url ?? "").trim();
        };
        setLicenseDocumentUrl(findByType("license_document"));
        setConductCertificateUrl(findByType("conduct_certificate"));
      } catch {
        if (cancelled) return;
        setLicenseDocumentUrl("");
        setConductCertificateUrl("");
      } finally {
        if (!cancelled) setDocumentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onUploadDocument(file: File | null, type: "id" | "license" | "conduct") {
    if (!file) return;
    try {
      setUploadingDocType(type);
      setError(null);
      const mapping =
        type === "id"
          ? { key: "id_document", label: "Identification document" }
          : type === "license"
            ? { key: "license_document", label: "License" }
            : { key: "conduct_certificate", label: "Conduct certificate" };

      const uploaded = await uploadJobSeekerDocument(token, file, mapping.key, mapping.label, true);
      const uploadedUrl = String(uploaded.url ?? "").trim();
      if (type === "id") {
        setForm((prev) => ({ ...prev, idDocumentUrl: uploadedUrl }));
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next.idDocumentUrl;
          return next;
        });
      }
      if (type === "license") setLicenseDocumentUrl(uploadedUrl);
      if (type === "conduct") setConductCertificateUrl(uploadedUrl);
      setSuccess(`${mapping.label} uploaded`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Document upload failed");
    } finally {
      setUploadingDocType(null);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.gender) errs.gender = "Gender is required";
    if (!form.dateOfBirth) errs.dateOfBirth = "Date of birth is required";
    if (!form.nationality.trim()) errs.nationality = "Nationality is required";
    if (!form.idType) errs.idType = "ID Type is required";
    if (!form.idNumber.trim()) errs.idNumber = "ID Number is required";
    if (!form.idDocumentUrl.trim()) errs.idDocumentUrl = "Identification document is required";
    if (!form.maritalStatus) errs.maritalStatus = "Marital status is required";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSave() {
    if (!validate()) return;

    setSaving(true);
    setError(null);
    try {
      await updatePersonalDetails(token, form);
      setSuccess("Personal details saved");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const currentIdDocumentUrl = String(form.idDocumentUrl ?? d.id_document_url ?? "").trim();

  useEffect(() => {
    setExternalDocPreview(null);
  }, [editing, currentIdDocumentUrl, licenseDocumentUrl, conductCertificateUrl, form.idDocumentUrl]);

  if (!editing) {
    return (
      <div className="editForm" style={{ marginTop: 0 }}>
        <div className="editGrid">
          <EditField label="First Name" value={String(d.first_name ?? "")} onChange={() => {}} disabled />
          <EditField label="Last Name" value={String(d.last_name ?? "")} onChange={() => {}} disabled />
          <EditField label="Middle Name (optional)" value={String(d.middle_name ?? "")} onChange={() => {}} disabled />
          <EditField label="Gender" value={String(d.gender ?? "")} onChange={() => {}} disabled />
          <EditField
            label="Date of Birth"
            value={d.date_of_birth ? String(d.date_of_birth).split("T")[0] : ""}
            onChange={() => {}}
            disabled
          />
          <EditField label="Nationality" value={String(d.nationality ?? "")} onChange={() => {}} disabled />
          <EditField label="ID Type" value={String(d.id_type ?? "")} onChange={() => {}} disabled />
          <EditField label="ID Number" value={String(d.id_number ?? "")} onChange={() => {}} disabled />
          <div className="field fieldFull">
            <div className="uploadedDocsGrid">
              <UploadedDocumentCard
                title="Identification Document"
                url={currentIdDocumentUrl}
                fallbackText="No file uploaded yet."
                previewMode="external"
                externalPreviewOpen={Boolean(externalDocPreview?.url && externalDocPreview.url === resolveFileUrl(currentIdDocumentUrl))}
                onToggleExternalPreview={(resolvedUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.url === resolvedUrl ? null : { url: resolvedUrl, title }))
                }
              />
              <UploadedDocumentCard
                title="License (Optional)"
                url={licenseDocumentUrl}
                fallbackText="No file uploaded."
                previewMode="external"
                externalPreviewOpen={Boolean(externalDocPreview?.url && externalDocPreview.url === resolveFileUrl(licenseDocumentUrl))}
                onToggleExternalPreview={(resolvedUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.url === resolvedUrl ? null : { url: resolvedUrl, title }))
                }
              />
              <UploadedDocumentCard
                title="Conduct Certificate (Optional)"
                url={conductCertificateUrl}
                fallbackText="No file uploaded."
                previewMode="external"
                externalPreviewOpen={Boolean(externalDocPreview?.url && externalDocPreview.url === resolveFileUrl(conductCertificateUrl))}
                onToggleExternalPreview={(resolvedUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.url === resolvedUrl ? null : { url: resolvedUrl, title }))
                }
              />
            </div>
          </div>

          {externalDocPreview?.url ? (
            <div className="field fieldFull">
              <div className="readLabel">{externalDocPreview.title} Preview</div>
              <div className="uploadedDocPreview" style={{ marginTop: 6 }}>
                {(() => {
                  const kind = getInlinePreviewKind(externalDocPreview.url);
                  if (kind === "image") {
                    return (
                      <img
                        className="uploadedDocPreviewImage"
                        src={externalDocPreview.url}
                        alt={externalDocPreview.title}
                      />
                    );
                  }
                  if (kind === "pdf") {
                    return (
                      <iframe
                        className="uploadedDocPreviewFrame"
                        src={externalDocPreview.url}
                        title={`${externalDocPreview.title} preview`}
                      />
                    );
                  }
                  return (
                    <span className="uploadedDocCardHint">
                      Preview is not available for this file type. Use Download.
                    </span>
                  );
                })()}
              </div>
            </div>
          ) : null}
          <EditField label="Marital Status" value={String(d.marital_status ?? "")} onChange={() => {}} disabled />
          <label className="field fieldCheckbox">
            <input type="checkbox" checked={Boolean(d.disability_status)} disabled />
            <span className="fieldLabel">Disability status</span>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="editForm">
      <div className="editGrid">
        <EditField
          label="First Name"
          value={form.firstName}
          onChange={(v) => set("firstName", v)}
          required
          error={fieldErrors.firstName}
        />
        <EditField
          label="Last Name"
          value={form.lastName}
          onChange={(v) => set("lastName", v)}
          required
          error={fieldErrors.lastName}
        />
        <EditField
          label="Middle Name (optional)"
          value={form.middleName}
          onChange={(v) => set("middleName", v)}
        />
        <label className="field">
          <span className="fieldLabel">Gender</span>
          <select
            className="input"
            value={form.gender}
            onChange={(e) => set("gender", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
          {fieldErrors.gender && <span className="fieldError">{fieldErrors.gender}</span>}
        </label>
        <EditField
          label="Date of Birth"
          value={form.dateOfBirth}
          onChange={(v) => set("dateOfBirth", v)}
          type="date"
          required
          error={fieldErrors.dateOfBirth}
        />
        <label className="field">
          <span className="fieldLabel">Nationality</span>
          <input
            className="input"
            value={form.nationality}
            onChange={(e) => {
              set("nationality", e.target.value);
              setNationalityOpen(true);
            }}
            onFocus={() => setNationalityOpen(true)}
            onBlur={() => setNationalityOpen(false)}
            placeholder="Start typing (e.g. Namibia)"
            required
          />
          {nationalityOpen && nationalitySuggestions.length > 0 && (
            <div
              className="autocompleteList"
              role="listbox"
              aria-label="Nationality suggestions"
            >
              {nationalitySuggestions.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="autocompleteItem"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    set("nationality", c);
                    setNationalityOpen(false);
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {fieldErrors.nationality && <span className="fieldError">{fieldErrors.nationality}</span>}
        </label>

        <label className="field">
          <span className="fieldLabel">ID Type</span>
          <select
            className="input"
            value={form.idType}
            onChange={(e) => set("idType", e.target.value)}
            required
          >
            <option value="" disabled>
              Select ID type
            </option>
            <option value="National ID">National ID</option>
            <option value="Passport">Passport</option>
          </select>
          {fieldErrors.idType && <span className="fieldError">{fieldErrors.idType}</span>}
        </label>
        <EditField
          label="ID Number"
          value={form.idNumber}
          onChange={(v) => set("idNumber", v)}
          required
          error={fieldErrors.idNumber}
        />
        <div className="field fieldFull">
          <div className="uploadedDocsGrid">
            <label className="field">
              <span className="fieldLabel">Identification Document</span>
              <input
                className="input"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void onUploadDocument(file, "id");
                  e.currentTarget.value = "";
                }}
                disabled={uploadingDocType === "id" || saving}
                required={!form.idDocumentUrl.trim()}
              />
              <UploadedDocumentCard
                title="Identification Document"
                url={form.idDocumentUrl}
                fallbackText="No file uploaded yet."
                hint={form.idDocumentUrl ? "Upload another file to replace the current one." : undefined}
                previewMode="external"
                externalPreviewOpen={Boolean(externalDocPreview?.url && externalDocPreview.url === resolveFileUrl(form.idDocumentUrl))}
                onToggleExternalPreview={(resolvedUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.url === resolvedUrl ? null : { url: resolvedUrl, title }))
                }
              />
              {fieldErrors.idDocumentUrl && <span className="fieldError">{fieldErrors.idDocumentUrl}</span>}
            </label>
            <label className="field">
              <span className="fieldLabel">License (Optional)</span>
              <input
                className="input"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void onUploadDocument(file, "license");
                  e.currentTarget.value = "";
                }}
                disabled={uploadingDocType === "license" || saving || documentsLoading}
              />
              <UploadedDocumentCard
                title="License (Optional)"
                url={licenseDocumentUrl}
                fallbackText="No file uploaded."
                hint={licenseDocumentUrl ? "Upload another file to replace the current one." : undefined}
                previewMode="external"
                externalPreviewOpen={Boolean(externalDocPreview?.url && externalDocPreview.url === resolveFileUrl(licenseDocumentUrl))}
                onToggleExternalPreview={(resolvedUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.url === resolvedUrl ? null : { url: resolvedUrl, title }))
                }
              />
            </label>
            <label className="field">
              <span className="fieldLabel">Conduct Certificate (Optional)</span>
              <input
                className="input"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void onUploadDocument(file, "conduct");
                  e.currentTarget.value = "";
                }}
                disabled={uploadingDocType === "conduct" || saving || documentsLoading}
              />
              <UploadedDocumentCard
                title="Conduct Certificate (Optional)"
                url={conductCertificateUrl}
                fallbackText="No file uploaded."
                hint={conductCertificateUrl ? "Upload another file to replace the current one." : undefined}
                previewMode="external"
                externalPreviewOpen={Boolean(externalDocPreview?.url && externalDocPreview.url === resolveFileUrl(conductCertificateUrl))}
                onToggleExternalPreview={(resolvedUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.url === resolvedUrl ? null : { url: resolvedUrl, title }))
                }
              />
            </label>
          </div>
        </div>

        {externalDocPreview?.url ? (
          <div className="field fieldFull">
            <div className="readLabel">{externalDocPreview.title} Preview</div>
            <div className="uploadedDocPreview" style={{ marginTop: 6 }}>
              {(() => {
                const kind = getInlinePreviewKind(externalDocPreview.url);
                if (kind === "image") {
                  return (
                    <img
                      className="uploadedDocPreviewImage"
                      src={externalDocPreview.url}
                      alt={externalDocPreview.title}
                    />
                  );
                }
                if (kind === "pdf") {
                  return (
                    <iframe
                      className="uploadedDocPreviewFrame"
                      src={externalDocPreview.url}
                      title={`${externalDocPreview.title} preview`}
                    />
                  );
                }
                return (
                  <span className="uploadedDocCardHint">
                    Preview is not available for this file type. Use Download.
                  </span>
                );
              })()}
            </div>
          </div>
        ) : null}
        <label className="field">
          <span className="fieldLabel">Marital Status</span>
          <select
            className="input"
            value={form.maritalStatus}
            onChange={(e) => set("maritalStatus", e.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
          </select>
          {fieldErrors.maritalStatus && (
            <span className="fieldError">{fieldErrors.maritalStatus}</span>
          )}
        </label>
        <label className="field fieldCheckbox">
          <input
            type="checkbox"
            checked={form.disabilityStatus}
            onChange={(e) => set("disabilityStatus", e.target.checked)}
          />
          <span className="fieldLabel">Disability status</span>
        </label>
      </div>
      <div className="stepperActions">
        <button className="btn btnGhost btnSm stepperSaveBtn" onClick={onSave} disabled={saving} type="button">
          {saving ? "Saving…" : "Save Personal Details"}
        </button>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Address Section                                                     */
/* ================================================================== */

function AddressSection({
  items,
  editing,
  token,
  saving,
  setSaving,
  setError,
  setSuccess,
  reload,
}: SectionProps & { items: Record<string, unknown>[] }) {
  const empty = {
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    postalCode: "",
    isPrimary: true,
  };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ipCountryCode, setIpCountryCode] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  const isNamibia = ipCountryCode === "NA";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loc = await getIpLocation();
        if (cancelled) return;
        setIpCountryCode(loc.countryCode);

        if (loc.countryCode === "NA") {
          setForm((prev) => {
            if (editId) return prev;
            if (prev.country.trim()) return prev;
            return { ...prev, country: "Namibia" };
          });
        }
      } catch {
        // Best-effort only
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const namibiaCitySuggestions = useMemo(() => {
    if (!isNamibia) return [];
    const q = form.city.trim().toLowerCase();
    const options = NAMIBIA_TOWNS_CITIES as readonly string[];
    if (!q) return options.slice(0, 10);
    return options
      .filter((o) => o.toLowerCase().startsWith(q))
      .slice(0, 10);
  }, [form.city, isNamibia]);

  const namibiaRegionSuggestions = useMemo(() => {
    if (!isNamibia) return [];
    const q = form.state.trim().toLowerCase();
    const options = NAMIBIA_REGIONS as readonly string[];
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().startsWith(q));
  }, [form.state, isNamibia]);

  const countrySuggestions = useMemo(() => {
    const q = form.country.trim().toLowerCase();
    const options = COUNTRY_NAMES as readonly string[];
    if (!q) return options.slice(0, 10);
    return options
      .filter((o) => o.toLowerCase().startsWith(q))
      .slice(0, 10);
  }, [form.country]);

  function startEdit(item: Record<string, unknown>) {
    setEditId(item.id as string);
    setFieldErrors({});
    setForm({
      addressLine1:
        (item.address_line1 as string) ?? (item.addressLine1 as string) ?? "",
      addressLine2:
        (item.address_line2 as string) ?? (item.addressLine2 as string) ?? "",
      city: (item.city as string) ?? "",
      state: (item.state as string) ?? "",
      country: (item.country as string) ?? "",
      postalCode:
        (item.postal_code as string) ?? (item.postalCode as string) ?? "",
      isPrimary:
        (item.is_primary as boolean) ?? (item.isPrimary as boolean) ?? true,
    });
  }

  async function onSave() {
    const errs: Record<string, string> = {};
    if (!form.addressLine1.trim()) errs.addressLine1 = "Address line 1 is required";
    if (!form.addressLine2.trim()) errs.addressLine2 = "Address line 2 is required";
    if (!form.city.trim()) errs.city = "City is required";
    if (!form.state.trim()) errs.state = "State/Region is required";
    if (!form.country.trim()) errs.country = "Country is required";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await saveAddress(token, form, editId ?? undefined);
      setSuccess(editId ? "Address updated" : "Address added");
      setForm(empty);
      setEditId(null);
      setFieldErrors({});
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setSaving(true);
    try {
      await deleteAddress(token, id);
      setSuccess("Address deleted");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    if (!items || items.length === 0) return <EmptyState label="No addresses added yet." />;

    return (
      <div className="recordList">
        {items.map((a, idx) => {
          const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
          const addressLine1 = String(a.address_line1 ?? a.addressLine1 ?? "");
          const addressLine2 = String(a.address_line2 ?? a.addressLine2 ?? "");
          const city = String(a.city ?? "");
          const state = String(a.state ?? "");
          const country = String(a.country ?? "");
          const postal = String(a.postal_code ?? a.postalCode ?? "");
          const isPrimary = Boolean(a.is_primary ?? a.isPrimary);

          return (
            <div key={String(a.id ?? idx)} className={`dashCard ${toneClass}`}>
              <div className="editForm" style={{ marginTop: 0 }}>
                <div className="editGrid">
                  <EditField label="Address Line 1" value={addressLine1} onChange={() => {}} disabled />
                  <EditField label="Address Line 2" value={addressLine2} onChange={() => {}} disabled />
                  <EditField label="City" value={city} onChange={() => {}} disabled />
                  <EditField label="State/Region" value={state} onChange={() => {}} disabled />
                  <EditField label="Country" value={country} onChange={() => {}} disabled />
                  <EditField label="Postal Code" value={postal} onChange={() => {}} disabled />
                  <label className="field fieldCheckbox fieldCheckboxIcon">
                    <input type="checkbox" checked={isPrimary} disabled />
                    <span className="fieldLabel">Primary address</span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {items.length > 0 && (
        <div className="recordList">
          {items.map((a) => (
            <div key={a.id as string} className="recordCard">
              <div className="recordBody">
                <strong>{String(a.address_line1 ?? "")}</strong>
                {a.address_line2 ? `, ${String(a.address_line2)}` : ""}
                <br />
                {[a.city, a.state, a.country, a.postal_code].filter(Boolean).map(String).join(", ")}
                {Boolean(a.is_primary) && <span className="chipBadge">Primary</span>}
              </div>
              {editing && (
                <div className="recordActions">
                  <button className="btn btnGhost btnSm" onClick={() => startEdit(a)} type="button">Edit</button>
                  <button className="btn btnDanger btnSm" onClick={() => setConfirmDeleteId(a.id as string)} type="button">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title="Delete Address"
        message="Are you sure you want to delete this address? This cannot be undone."
        confirmLabel="Delete"
        busy={saving}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (!confirmDeleteId) return;
          const id = confirmDeleteId;
          setConfirmDeleteId(null);
          await onDelete(id);
        }}
      />
      {editing && (
        <div className="editForm">
          <h4 className="editFormTitle">{editId ? "Edit Address" : "Add Address"}</h4>
          <div className="editGrid">
            <EditField
              label="Address Line 1"
              value={form.addressLine1}
              onChange={(v) => setForm({ ...form, addressLine1: v })}
              required
              error={fieldErrors.addressLine1}
            />
            <EditField
              label="Address Line 2"
              value={form.addressLine2}
              onChange={(v) => setForm({ ...form, addressLine2: v })}
              required
              error={fieldErrors.addressLine2}
            />

            <label className="field">
              <span className="fieldLabel">City</span>
              <input
                className="input"
                value={form.city}
                onChange={(e) => {
                  setForm({ ...form, city: e.target.value });
                  if (isNamibia) setCityOpen(true);
                }}
                onFocus={() => {
                  if (isNamibia) setCityOpen(true);
                }}
                onBlur={() => setCityOpen(false)}
                placeholder="City"
                required
              />
              {fieldErrors.city && <span className="fieldError">{fieldErrors.city}</span>}
              {isNamibia && cityOpen && namibiaCitySuggestions.length > 0 && (
                <div
                  className="autocompleteList"
                  role="listbox"
                  aria-label="Namibia city suggestions"
                >
                  {namibiaCitySuggestions.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className="autocompleteItem"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => {
                        setForm({ ...form, city: o });
                        setCityOpen(false);
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">State/Region</span>
              <input
                className="input"
                value={form.state}
                onChange={(e) => {
                  setForm({ ...form, state: e.target.value });
                  if (isNamibia) setRegionOpen(true);
                }}
                onFocus={() => {
                  if (isNamibia) setRegionOpen(true);
                }}
                onBlur={() => setRegionOpen(false)}
                placeholder="State/Region"
                required
              />
              {fieldErrors.state && <span className="fieldError">{fieldErrors.state}</span>}
              {isNamibia && regionOpen && namibiaRegionSuggestions.length > 0 && (
                <div
                  className="autocompleteList"
                  role="listbox"
                  aria-label="Namibia region suggestions"
                >
                  {namibiaRegionSuggestions.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className="autocompleteItem"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => {
                        setForm({ ...form, state: o });
                        setRegionOpen(false);
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label className="field">
              <span className="fieldLabel">Country</span>
              <input
                className="input"
                value={form.country}
                onChange={(e) => {
                  setForm({ ...form, country: e.target.value });
                  setCountryOpen(true);
                }}
                onFocus={() => setCountryOpen(true)}
                onBlur={() => setCountryOpen(false)}
                placeholder="Start typing (e.g. Namibia)"
                required
              />
              {countryOpen && countrySuggestions.length > 0 && (
                <div
                  className="autocompleteList"
                  role="listbox"
                  aria-label="Country suggestions"
                >
                  {countrySuggestions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="autocompleteItem"
                      onMouseDown={(ev) => ev.preventDefault()}
                      onClick={() => {
                        setForm({ ...form, country: c });
                        setCountryOpen(false);
                      }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {fieldErrors.country && (
                <span className="fieldError">{fieldErrors.country}</span>
              )}
            </label>

            <EditField
              label="Postal Code"
              value={form.postalCode}
              onChange={(v) => setForm({ ...form, postalCode: v })}
            />
          </div>
          <div className="stepperActions">
            {editId && (
              <button className="btn btnGhost" type="button" onClick={() => { setEditId(null); setForm(empty); setFieldErrors({}); }}>
                Cancel
              </button>
            )}
            <button className="btn btnGhost btnSm stepperSaveBtn" onClick={onSave} disabled={saving} type="button">
              {saving ? "Saving…" : editId ? "Update Address" : "Add Address"}
            </button>
          </div>
        </div>
      )}
      {!editing && items.length === 0 && <EmptyState label="No addresses added yet." />}
    </>
  );
}

/* ================================================================== */
/*  Education Section                                                   */
/* ================================================================== */

function EducationSection({
  items,
  editing,
  token,
  saving,
  setSaving,
  setError,
  setSuccess,
  reload,
}: SectionProps & { items: Record<string, unknown>[] }) {
  const empty = {
    institutionName: "",
    qualification: "",
    fieldOfStudy: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    grade: "",
    certificateUrl: "",
  };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [qualificationOpen, setQualificationOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);

  const qualificationSuggestions = useMemo(() => {
    const q = form.qualification.trim().toLowerCase();
    const options = EDUCATION_QUALIFICATION_OPTIONS as readonly string[];
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().startsWith(q));
  }, [form.qualification]);

  const studySuggestions = useMemo(() => {
    const q = form.fieldOfStudy.trim().toLowerCase();
    const options = EDUCATION_FIELD_OF_STUDY_OPTIONS as readonly string[];
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().startsWith(q));
  }, [form.fieldOfStudy]);

  function startEdit(item: Record<string, unknown>) {
    setEditId(item.id as string);
    setFieldErrors({});
    setForm({
      institutionName: (item.institution_name as string) ?? "",
      qualification: (item.qualification as string) ?? "",
      fieldOfStudy: (item.field_of_study as string) ?? "",
      startDate: (item.start_date as string)?.split("T")[0] ?? "",
      endDate: (item.end_date as string)?.split("T")[0] ?? "",
      isCurrent: (item.is_current as boolean) ?? false,
      grade: (item.grade as string) ?? "",
      certificateUrl: (item.certificate_url as string) ?? "",
    });
  }

  async function onUploadQualificationEvidence(file: File | null) {
    if (!file) return;
    try {
      setUploadingCertificate(true);
      setError(null);
      const uploaded = await uploadJobSeekerDocument(
        token,
        file,
        "qualification_evidence",
        "Qualification evidence",
      );
      const uploadedUrl = String(uploaded.url ?? "").trim();
      setForm((prev) => ({ ...prev, certificateUrl: uploadedUrl }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.certificateUrl;
        return next;
      });
      setSuccess("Qualification evidence uploaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingCertificate(false);
    }
  }

  async function onSave() {
    const errs: Record<string, string> = {};
    if (!form.institutionName.trim()) errs.institutionName = "Institution is required";
    if (!form.qualification.trim()) errs.qualification = "Qualification is required";
    if (!form.fieldOfStudy.trim()) errs.fieldOfStudy = "Field of study is required";
    if (!form.startDate) errs.startDate = "Start date is required";
    if (!form.isCurrent && !form.endDate) errs.endDate = "End date is required";
    if (!form.grade.trim()) errs.grade = "Grade is required";
    if (!form.certificateUrl.trim()) errs.certificateUrl = "Qualification evidence is required";

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await saveEducation(token, {
        ...form,
        certificateUrl: form.certificateUrl,
      }, editId ?? undefined);
      setSuccess(editId ? "Education updated" : "Education added");
      setForm(empty);
      setEditId(null);
      setFieldErrors({});
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setSaving(true);
    try {
      await deleteEducation(token, id);
      setSuccess("Education deleted");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    if (!items || items.length === 0) return <EmptyState label="No education records added yet." />;

    return (
      <div className="recordList">
        {items.map((e, idx) => {
          const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
          const institution = String(e.institution_name ?? "");
          const qualification = String(e.qualification ?? "");
          const fieldOfStudy = String(e.field_of_study ?? "");
          const startDate = e.start_date ? String(e.start_date).split("T")[0] : "";
          const endDate = e.end_date ? String(e.end_date).split("T")[0] : "";
          const isCurrent = Boolean(e.is_current);
          const grade = String(e.grade ?? "");
          const certificateUrl = String(e.certificate_url ?? "").trim();

          return (
            <div key={String(e.id ?? idx)} className={`dashCard ${toneClass}`}>
              <div className="editForm" style={{ marginTop: 0 }}>
                <div className="editGrid">
                  <EditField label="Institution" value={institution} onChange={() => {}} disabled />
                  <EditField label="Qualification" value={qualification} onChange={() => {}} disabled />
                  <EditField label="Field of Study" value={fieldOfStudy} onChange={() => {}} disabled />
                  <EditField label="Start Date" value={startDate} onChange={() => {}} disabled />
                  <EditField label="End Date" value={endDate} onChange={() => {}} disabled />
                  <EditField label="Grade" value={grade} onChange={() => {}} disabled />
                  <label className="field fieldFull">
                    <span className="fieldLabel">Qualification Evidence</span>
                    <UploadedDocumentCard
                      title="Qualification Evidence"
                      url={certificateUrl}
                      fallbackText="No file uploaded yet."
                    />
                  </label>
                  <label className="field fieldCheckbox fieldCheckboxIcon">
                    <input type="checkbox" checked={isCurrent} disabled />
                    <span className="fieldLabel">Currently studying here</span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {items.length > 0 && (
        <div className="recordList">
          {items.map((e) => (
            <div key={e.id as string} className="recordCard">
              <div className="recordBody">
                <strong>{e.qualification as string}</strong> — {e.institution_name as string}
                <br />
                <span className="recordMeta">
                  {e.field_of_study as string}
                  {e.start_date ? ` | ${(e.start_date as string).split("T")[0]}` : ""}
                  {e.end_date ? ` → ${(e.end_date as string).split("T")[0]}` : ""}
                  {e.is_current ? " (Current)" : ""}
                </span>
              </div>
              {editing && (
                <div className="recordActions">
                  <button className="btn btnGhost btnSm" onClick={() => startEdit(e)} type="button">Edit</button>
                  <button className="btn btnDanger btnSm" onClick={() => setConfirmDeleteId(e.id as string)} type="button">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title="Delete Education"
        message="Are you sure you want to delete this education record? This cannot be undone."
        confirmLabel="Delete"
        busy={saving}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (!confirmDeleteId) return;
          const id = confirmDeleteId;
          setConfirmDeleteId(null);
          await onDelete(id);
        }}
      />
      {editing && (
        <div className="editForm">
          <h4 className="editFormTitle">{editId ? "Edit Education" : "Add Education"}</h4>
          <div className="editGrid">
            <label className="field">
              <span className="fieldLabel">Institution</span>
              <input
                className="input"
                value={form.institutionName}
                onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
                placeholder="Enter institution name"
                required
              />
              {fieldErrors.institutionName && (
                <span className="fieldError">{fieldErrors.institutionName}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Qualification</span>
              <input
                className="input"
                value={form.qualification}
                onChange={(e) => {
                  setForm({ ...form, qualification: e.target.value });
                  setQualificationOpen(true);
                }}
                onFocus={() => setQualificationOpen(true)}
                onBlur={() => setQualificationOpen(false)}
                placeholder="Start typing (e.g. Diploma)"
                required
              />
              {qualificationOpen && qualificationSuggestions.length > 0 && (
                <div className="autocompleteList" role="listbox" aria-label="Qualification suggestions">
                  {qualificationSuggestions.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className="autocompleteItem"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setForm({ ...form, qualification: o });
                        setQualificationOpen(false);
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              {fieldErrors.qualification && (
                <span className="fieldError">{fieldErrors.qualification}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Field of Study</span>
              <input
                className="input"
                value={form.fieldOfStudy}
                onChange={(e) => {
                  setForm({ ...form, fieldOfStudy: e.target.value });
                  setStudyOpen(true);
                }}
                onFocus={() => setStudyOpen(true)}
                onBlur={() => setStudyOpen(false)}
                placeholder="Start typing (e.g. Information Technology)"
                required
              />
              {studyOpen && studySuggestions.length > 0 && (
                <div className="autocompleteList" role="listbox" aria-label="Field of study suggestions">
                  {studySuggestions.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className="autocompleteItem"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setForm({ ...form, fieldOfStudy: o });
                        setStudyOpen(false);
                      }}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
              {fieldErrors.fieldOfStudy && (
                <span className="fieldError">{fieldErrors.fieldOfStudy}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">Start Date</span>
              <input
                className="input"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
              {fieldErrors.startDate && (
                <span className="fieldError">{fieldErrors.startDate}</span>
              )}
            </label>

            <label className="field">
              <span className="fieldLabel">End Date</span>
              <input
                className="input"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                disabled={form.isCurrent}
                required={!form.isCurrent}
              />
              {fieldErrors.endDate && (
                <span className="fieldError">{fieldErrors.endDate}</span>
              )}
            </label>
            <EditField
              label="Grade"
              value={form.grade}
              onChange={(v) => setForm({ ...form, grade: v })}
              required
              error={fieldErrors.grade}
            />
            <label className="field fieldCheckbox">
              <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} />
              <span className="fieldLabel">Currently studying here</span>
            </label>
            <label className="field fieldFull">
              <span className="fieldLabel">Qualification Evidence</span>
              <input
                className="input"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void onUploadQualificationEvidence(file);
                  e.currentTarget.value = "";
                }}
                disabled={saving || uploadingCertificate}
                required={!form.certificateUrl.trim()}
              />
              <UploadedDocumentCard
                title="Qualification Evidence"
                url={form.certificateUrl}
                fallbackText="No file uploaded yet."
                hint={form.certificateUrl ? "Upload another file to replace the current one." : undefined}
              />
              {fieldErrors.certificateUrl && <span className="fieldError">{fieldErrors.certificateUrl}</span>}
            </label>
          </div>
          <div className="stepperActions">
            {editId && (
              <button className="btn btnGhost" type="button" onClick={() => { setEditId(null); setForm(empty); setFieldErrors({}); }}>Cancel</button>
            )}
            <button className="btn btnGhost btnSm stepperSaveBtn" onClick={onSave} disabled={saving} type="button">
              {saving ? "Saving…" : editId ? "Update Education" : "Add Education"}
            </button>
          </div>
        </div>
      )}
      {!editing && items.length === 0 && <EmptyState label="No education records added yet." />}
    </>
  );
}

/* ================================================================== */
/*  Experience Section                                                  */
/* ================================================================== */

function ExperienceSection({
  items,
  editing,
  token,
  saving,
  setSaving,
  setError,
  setSuccess,
  reload,
}: SectionProps & { items: Record<string, unknown>[] }) {
  const empty = {
    companyName: "",
    jobTitle: "",
    employmentType: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    responsibilities: "",
  };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvLoading, setCvLoading] = useState(false);
  const [primaryResume, setPrimaryResume] = useState<{ id: string; file_name?: string; download_url?: string; file_path?: string } | null>(null);

  const hasCv = Boolean(primaryResume?.id);

  const loadResumes = useCallback(async () => {
    try {
      setCvLoading(true);
      const result = await listJobSeekerResumes(token);
      setPrimaryResume(result.primary_resume ?? null);
    } catch {
      setPrimaryResume(null);
    } finally {
      setCvLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadResumes();
  }, [loadResumes]);

  async function onUploadCv(file: File | null) {
    if (!file) return;
    try {
      setCvUploading(true);
      setError(null);
      await uploadJobSeekerResume(token, file, true);
      await loadResumes();
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.cv;
        return next;
      });
      setSuccess("CV uploaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload CV");
    } finally {
      setCvUploading(false);
    }
  }

  function startEdit(item: Record<string, unknown>) {
    setEditId(item.id as string);
    setFieldErrors({});
    setForm({
      companyName: (item.company_name as string) ?? "",
      jobTitle: (item.job_title as string) ?? "",
      employmentType: (item.employment_type as string) ?? "",
      startDate: (item.start_date as string)?.split("T")[0] ?? "",
      endDate: (item.end_date as string)?.split("T")[0] ?? "",
      isCurrent: (item.is_current as boolean) ?? false,
      responsibilities: (item.responsibilities as string) ?? "",
    });
  }

  async function onSave() {
    const errs: Record<string, string> = {};
    if (!hasCv) errs.cv = "CV is required";
    if (!form.companyName.trim()) errs.companyName = "Company name is required";
    if (!form.jobTitle.trim()) errs.jobTitle = "Job title is required";
    if (!form.employmentType.trim()) errs.employmentType = "Employment type is required";
    if (!form.startDate) errs.startDate = "Start date is required";
    if (!form.isCurrent && !form.endDate) errs.endDate = "End date is required";
    if (!form.responsibilities.trim()) errs.responsibilities = "Responsibilities are required";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await saveExperience(token, form, editId ?? undefined);
      setSuccess(editId ? "Experience updated" : "Experience added");
      setForm(empty);
      setEditId(null);
      setFieldErrors({});
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setSaving(true);
    try {
      await deleteExperience(token, id);
      setSuccess("Experience deleted");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    if (!items || items.length === 0) {
      return (
        <div className="recordList">
          <div className="dashCard jobCardToneA">
            <div className="editForm" style={{ marginTop: 0 }}>
              <div className="editGrid">
                <label className="field fieldFull">
                  <span className="fieldLabel">CV</span>
                  <UploadedDocumentCard
                    title="CV"
                    url={String(primaryResume?.download_url ?? primaryResume?.file_path ?? "")}
                    fallbackText="No CV uploaded yet."
                  />
                </label>
              </div>
            </div>
          </div>
          <EmptyState label="No experience records added yet." />
        </div>
      );
    }

    return (
      <div className="recordList">
        <div className="dashCard jobCardToneA">
          <div className="editForm" style={{ marginTop: 0 }}>
            <div className="editGrid">
              <label className="field fieldFull">
                <span className="fieldLabel">CV</span>
                <UploadedDocumentCard
                  title="CV"
                  url={String(primaryResume?.download_url ?? primaryResume?.file_path ?? "")}
                  fallbackText="No CV uploaded yet."
                />
              </label>
            </div>
          </div>
        </div>
        {items.map((e, idx) => {
          const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
          const companyName = String(e.company_name ?? "");
          const jobTitle = String(e.job_title ?? "");
          const employmentType = String(e.employment_type ?? "");
          const startDate = e.start_date ? String(e.start_date).split("T")[0] : "";
          const endDate = e.end_date ? String(e.end_date).split("T")[0] : "";
          const isCurrent = Boolean(e.is_current);
          const responsibilities = String(e.responsibilities ?? "");

          return (
            <div key={String(e.id ?? idx)} className={`dashCard ${toneClass}`}>
              <div className="editForm" style={{ marginTop: 0 }}>
                <div className="editGrid">
                  <EditField label="Company Name" value={companyName} onChange={() => {}} disabled />
                  <EditField label="Job Title" value={jobTitle} onChange={() => {}} disabled />
                  <EditField label="Employment Type" value={employmentType} onChange={() => {}} disabled />
                  <EditField label="Start Date" value={startDate} onChange={() => {}} disabled />
                  <EditField label="End Date" value={endDate} onChange={() => {}} disabled />
                  <label className="field fieldCheckbox fieldCheckboxIcon">
                    <input type="checkbox" checked={isCurrent} disabled />
                    <span className="fieldLabel">Currently working here</span>
                  </label>
                  <label className="field fieldFull">
                    <span className="fieldLabel">Responsibilities</span>
                    <textarea className="input textarea" value={responsibilities} readOnly disabled rows={3} />
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {items.length > 0 && (
        <div className="recordList">
          {items.map((e) => (
            <div key={e.id as string} className="recordCard">
              <div className="recordBody">
                <strong>{e.job_title as string}</strong> at {e.company_name as string}
                <br />
                <span className="recordMeta">
                  {e.employment_type as string}
                  {e.start_date ? ` | ${(e.start_date as string).split("T")[0]}` : ""}
                  {e.end_date ? ` → ${(e.end_date as string).split("T")[0]}` : ""}
                  {e.is_current ? " (Current)" : ""}
                </span>
              </div>
              {editing && (
                <div className="recordActions">
                  <button className="btn btnGhost btnSm" onClick={() => startEdit(e)} type="button">Edit</button>
                  <button className="btn btnDanger btnSm" onClick={() => setConfirmDeleteId(e.id as string)} type="button">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title="Delete Experience"
        message="Are you sure you want to delete this experience record? This cannot be undone."
        confirmLabel="Delete"
        busy={saving}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (!confirmDeleteId) return;
          const id = confirmDeleteId;
          setConfirmDeleteId(null);
          await onDelete(id);
        }}
      />
      {editing && (
        <div className="editForm">
          <h4 className="editFormTitle">{editId ? "Edit Experience" : "Add Experience"}</h4>
          <div className="editGrid" style={{ marginBottom: 10 }}>
            <label className="field fieldFull">
              <span className="fieldLabel">CV</span>
              <input
                className="input"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void onUploadCv(file);
                  e.currentTarget.value = "";
                }}
                disabled={saving || cvUploading || cvLoading}
                required={!hasCv}
              />
              <UploadedDocumentCard
                title="CV"
                url={String(primaryResume?.download_url ?? primaryResume?.file_path ?? "")}
                fallbackText="Upload your CV. It is mandatory."
                hint={hasCv ? "Upload another file to replace the current one." : undefined}
              />
              {fieldErrors.cv && <span className="fieldError">{fieldErrors.cv}</span>}
            </label>
          </div>
          <div className="editGrid">
            <EditField
              label="Company Name"
              value={form.companyName}
              onChange={(v) => setForm({ ...form, companyName: v })}
              required
              error={fieldErrors.companyName}
            />
            <EditField
              label="Job Title"
              value={form.jobTitle}
              onChange={(v) => setForm({ ...form, jobTitle: v })}
              required
              error={fieldErrors.jobTitle}
            />
            <label className="field">
              <span className="fieldLabel">Employment Type</span>
              <select
                className="input"
                value={form.employmentType}
                onChange={(e) => setForm({ ...form, employmentType: e.target.value })}
                required
              >
                <option value="">Select</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Freelance">Freelance</option>
                <option value="Internship">Internship</option>
              </select>
              {fieldErrors.employmentType && (
                <span className="fieldError">{fieldErrors.employmentType}</span>
              )}
            </label>
            <EditField
              label="Start Date"
              value={form.startDate}
              onChange={(v) => setForm({ ...form, startDate: v })}
              type="date"
              required
              error={fieldErrors.startDate}
            />

            <label className="field">
              <span className="fieldLabel">End Date</span>
              <input
                className="input"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                disabled={form.isCurrent}
                required={!form.isCurrent}
              />
              {fieldErrors.endDate && (
                <span className="fieldError">{fieldErrors.endDate}</span>
              )}
            </label>

            <label className="field fieldFull">
              <span className="fieldLabel">Responsibilities</span>
              <textarea
                className="input textarea"
                value={form.responsibilities}
                onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
                rows={3}
                required
              />
              {fieldErrors.responsibilities && (
                <span className="fieldError">{fieldErrors.responsibilities}</span>
              )}
            </label>
            <label className="field fieldCheckbox fieldCheckboxIcon">
              <input
                type="checkbox"
                checked={form.isCurrent}
                onChange={(e) => {
                  const isCurrent = e.target.checked;
                  setForm((prev) => ({
                    ...prev,
                    isCurrent,
                    endDate: isCurrent ? "" : prev.endDate,
                  }));
                  if (isCurrent) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.endDate;
                      return next;
                    });
                  }
                }}
              />
              <span className="fieldLabel">Currently working here</span>
            </label>
          </div>
          <div className="stepperActions">
            {editId && (
              <button className="btn btnGhost" type="button" onClick={() => { setEditId(null); setForm(empty); setFieldErrors({}); }}>Cancel</button>
            )}
            <button className="btn btnGhost btnSm stepperSaveBtn" onClick={onSave} disabled={saving} type="button">
              {saving ? "Saving…" : editId ? "Update Experience" : "Add Experience"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  References Section                                                  */
/* ================================================================== */

function ReferencesSection({
  items,
  editing,
  token,
  saving,
  setSaving,
  setError,
  setSuccess,
  reload,
}: SectionProps & { items: Record<string, unknown>[] }) {
  const empty = {
    fullName: "",
    relationship: "",
    company: "",
    email: "",
    phone: "",
  };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  function startEdit(item: Record<string, unknown>) {
    setEditId(item.id as string);
    setFieldErrors({});
    setForm({
      fullName: (item.full_name as string) ?? "",
      relationship: (item.relationship as string) ?? "",
      company: (item.company as string) ?? "",
      email: (item.email as string) ?? "",
      phone: (item.phone as string) ?? "",
    });
  }

  async function onSave() {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required";
    if (!form.relationship.trim()) errs.relationship = "Relationship is required";
    if (!form.company.trim()) errs.company = "Company is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.phone.trim()) errs.phone = "Phone is required";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await saveReference(token, form, editId ?? undefined);
      setSuccess(editId ? "Reference updated" : "Reference added");
      setForm(empty);
      setEditId(null);
      setFieldErrors({});
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setSaving(true);
    try {
      await deleteReference(token, id);
      setSuccess("Reference deleted");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    if (!items || items.length === 0) return <EmptyState label="No references added yet." />;

    return (
      <div className="recordList">
        {items.map((r, idx) => {
          const toneClass = idx % 2 === 0 ? "jobCardToneA" : "jobCardToneB";
          const fullName = String(r.full_name ?? "");
          const relationship = String(r.relationship ?? "");
          const company = String(r.company ?? "");
          const email = String(r.email ?? "");
          const phone = String(r.phone ?? "");

          return (
            <div key={String(r.id ?? idx)} className={`dashCard ${toneClass}`}>
              <div className="editForm" style={{ marginTop: 0 }}>
                <div className="editGrid">
                  <EditField label="Full Name" value={fullName} onChange={() => {}} disabled />
                  <EditField label="Relationship" value={relationship} onChange={() => {}} disabled />
                  <EditField label="Company" value={company} onChange={() => {}} disabled />
                  <EditField label="Email" value={email} onChange={() => {}} disabled />
                  <EditField label="Phone" value={phone} onChange={() => {}} disabled />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {items.length > 0 && (
        <div className="recordList">
          {items.map((r) => (
            <div key={r.id as string} className="recordCard">
              <div className="recordBody">
                <strong>{r.full_name as string}</strong>
                {r.relationship ? ` (${r.relationship})` : ""}
                <br />
                <span className="recordMeta">
                  {[r.company, r.email, r.phone].filter(Boolean).join(" · ")}
                </span>
              </div>
              {editing && (
                <div className="recordActions">
                  <button className="btn btnGhost btnSm" onClick={() => startEdit(r)} type="button">Edit</button>
                  <button className="btn btnDanger btnSm" onClick={() => setConfirmDeleteId(r.id as string)} type="button">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title="Delete Reference"
        message="Are you sure you want to delete this reference? This cannot be undone."
        confirmLabel="Delete"
        busy={saving}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (!confirmDeleteId) return;
          const id = confirmDeleteId;
          setConfirmDeleteId(null);
          await onDelete(id);
        }}
      />
      {editing && (
        <div className="editForm">
          <h4 className="editFormTitle">{editId ? "Edit Reference" : "Add Reference"}</h4>
          <div className="editGrid">
            <EditField
              label="Full Name"
              value={form.fullName}
              onChange={(v) => setForm({ ...form, fullName: v })}
              required
              error={fieldErrors.fullName}
            />
            <EditField
              label="Relationship"
              value={form.relationship}
              onChange={(v) => setForm({ ...form, relationship: v })}
              required
              error={fieldErrors.relationship}
            />
            <EditField
              label="Company"
              value={form.company}
              onChange={(v) => setForm({ ...form, company: v })}
              required
              error={fieldErrors.company}
            />
            <EditField
              label="Email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              type="email"
              required
              error={fieldErrors.email}
            />
            <EditField
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              type="tel"
              required
              error={fieldErrors.phone}
            />
          </div>
          <div className="stepperActions">
            {editId && (
              <button className="btn btnGhost" type="button" onClick={() => { setEditId(null); setForm(empty); setFieldErrors({}); }}>Cancel</button>
            )}
            <button className="btn btnGhost btnSm stepperSaveBtn" onClick={onSave} disabled={saving} type="button">
              {saving ? "Saving…" : editId ? "Update Reference" : "Add Reference"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ================================================================== */
/*  Professional Summary Section                                        */
/* ================================================================== */

function ProfessionalSummarySection({
  data,
  editing,
  token,
  saving,
  setSaving,
  setError,
  setSuccess,
  reload,
}: SectionProps & { data: Record<string, unknown> | null }) {
  const d = data ?? {};
  const [form, setForm] = useState({
    professionalSummary: (d.professional_summary as string) ?? (d.professionalSummary as string) ?? "",
    fieldOfExpertise: (d.field_of_expertise as string) ?? (d.fieldOfExpertise as string) ?? "",
    qualificationLevel: (d.qualification_level as string) ?? (d.qualificationLevel as string) ?? "",
    yearsExperience: Number(d.years_experience ?? d.yearsExperience ?? 0) || 0,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [expertiseOpen, setExpertiseOpen] = useState(false);
  const [qualificationOpen, setQualificationOpen] = useState(false);

  const expertiseSuggestions = useMemo(() => {
    const q = form.fieldOfExpertise.trim().toLowerCase();
    const options = EDUCATION_FIELD_OF_STUDY_OPTIONS as readonly string[];
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().startsWith(q));
  }, [form.fieldOfExpertise]);

  const qualificationSuggestions = useMemo(() => {
    const q = form.qualificationLevel.trim().toLowerCase();
    const options = EDUCATION_QUALIFICATION_OPTIONS as readonly string[];
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().startsWith(q));
  }, [form.qualificationLevel]);

  useEffect(() => {
    const nd = data ?? {};
    setForm({
      professionalSummary: (nd.professional_summary as string) ?? (nd.professionalSummary as string) ?? "",
      fieldOfExpertise: (nd.field_of_expertise as string) ?? (nd.fieldOfExpertise as string) ?? "",
      qualificationLevel: (nd.qualification_level as string) ?? (nd.qualificationLevel as string) ?? "",
      yearsExperience: Number(nd.years_experience ?? nd.yearsExperience ?? 0) || 0,
    });
    setFieldErrors({});
  }, [data]);

  async function onSave() {
    const errs: Record<string, string> = {};
    if (!form.fieldOfExpertise.trim()) errs.fieldOfExpertise = "Field of expertise is required";
    if (!form.qualificationLevel.trim()) errs.qualificationLevel = "Qualification level is required";
    if (!form.professionalSummary.trim()) errs.professionalSummary = "Professional summary is required";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await updateProfile(token, form);
      setSuccess("Professional summary saved");
      setFieldErrors({});
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="editForm" style={{ marginTop: 0 }}>
        <div className="editGrid">
          <EditField
            label="Field of Expertise"
            value={String(d.field_of_expertise ?? d.fieldOfExpertise ?? "")}
            onChange={() => {}}
            disabled
          />
          <EditField
            label="Qualification Level"
            value={String(d.qualification_level ?? d.qualificationLevel ?? "")}
            onChange={() => {}}
            disabled
          />
          <EditField
            label="Years of Experience"
            value={String(d.years_experience ?? d.yearsExperience ?? "")}
            onChange={() => {}}
            disabled
          />
          <label className="field fieldFull">
            <span className="fieldLabel">Professional Summary</span>
            <textarea
              className="input textarea"
              value={String((d.professional_summary as string) ?? (d.professionalSummary as string) ?? "")}
              readOnly
              disabled
              rows={5}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="editForm">
      <div className="editGrid">
        <label className="field">
          <span className="fieldLabel">Field of Expertise</span>
          <input
            className="input"
            value={form.fieldOfExpertise}
            onChange={(e) => {
              setForm({ ...form, fieldOfExpertise: e.target.value });
              setExpertiseOpen(true);
            }}
            onFocus={() => setExpertiseOpen(true)}
            onBlur={() => setExpertiseOpen(false)}
            placeholder="Start typing (e.g. Information Technology)"
            required
          />
          {expertiseOpen && expertiseSuggestions.length > 0 && (
            <div
              className="autocompleteList"
              role="listbox"
              aria-label="Field of expertise suggestions"
            >
              {expertiseSuggestions.map((o) => (
                <button
                  key={o}
                  type="button"
                  className="autocompleteItem"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setForm({ ...form, fieldOfExpertise: o });
                    setExpertiseOpen(false);
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
          {fieldErrors.fieldOfExpertise && (
            <span className="fieldError">{fieldErrors.fieldOfExpertise}</span>
          )}
        </label>

        <label className="field">
          <span className="fieldLabel">Qualification Level</span>
          <input
            className="input"
            value={form.qualificationLevel}
            onChange={(e) => {
              setForm({ ...form, qualificationLevel: e.target.value });
              setQualificationOpen(true);
            }}
            onFocus={() => setQualificationOpen(true)}
            onBlur={() => setQualificationOpen(false)}
            placeholder="Start typing (e.g. Bachelor's)"
            required
          />
          {qualificationOpen && qualificationSuggestions.length > 0 && (
            <div
              className="autocompleteList"
              role="listbox"
              aria-label="Qualification level suggestions"
            >
              {qualificationSuggestions.map((o) => (
                <button
                  key={o}
                  type="button"
                  className="autocompleteItem"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setForm({ ...form, qualificationLevel: o });
                    setQualificationOpen(false);
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
          )}
          {fieldErrors.qualificationLevel && (
            <span className="fieldError">{fieldErrors.qualificationLevel}</span>
          )}
        </label>
        <EditField
          label="Years of Experience"
          value={String(form.yearsExperience)}
          onChange={(v) => setForm({ ...form, yearsExperience: Number(v) || 0 })}
          type="number"
          required
        />
        <label className="field fieldFull">
          <span className="fieldLabel">Professional Summary</span>
          <textarea
            className="input textarea"
            value={form.professionalSummary}
            onChange={(e) => setForm({ ...form, professionalSummary: e.target.value })}
            rows={5}
            placeholder="Describe your professional background, skills and career goals…"
            required
          />
          {fieldErrors.professionalSummary && (
            <span className="fieldError">{fieldErrors.professionalSummary}</span>
          )}
        </label>
      </div>
      <button className="btn btnGhost btnSm stepperSaveBtn" onClick={onSave} disabled={saving} type="button">
        {saving ? "Saving…" : "Save Professional Summary"}
      </button>
    </div>
  );
}

/* ================================================================== */
/*  Utility Components                                                  */
/* ================================================================== */

function ReadField({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="readField">
      <span className="readLabel">{label}</span>
      <span className="readValue">{value != null && value !== "" ? String(value) : "—"}</span>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  type = "text",
  required,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span className="fieldLabel">{label}</span>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        readOnly={disabled}
      />
      {error && <span className="fieldError">{error}</span>}
    </label>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="emptyState">{label}</p>;
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      className="modalOverlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modalTitle">{title}</div>
        <div className="modalMessage">{message}</div>
        {children ? <div>{children}</div> : null}
        <div className="modalActions">
          <button className="btn btnGhost btnSm" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btnDanger btnSm" type="button" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
