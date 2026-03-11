import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getJobSeekerFullProfile,
  listUserDocuments,
  listJobApplicationsForJob,
  listUserResumes,
  type JobSeekerResume,
  type JobApplication,
  type JobSeekerFullProfile,
  type UserDocument,
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

const STAGE_PERMISSION_MAP: Record<StageKey, string> = {
  longlisted: "SET_APPLICATION_STATUS_LONG_LISTED",
  shortlisted: "SET_APPLICATION_STATUS_SHORTLISTED",
  rejected: "SET_APPLICATION_STATUS_REJECTED",
  interview: "SET_APPLICATION_STATUS_ORAL_INTERVIEW",
  assessment: "SET_APPLICATION_STATUS_PRACTICAL_INTERVIEW",
  hired: "SET_APPLICATION_STATUS_HIRED",
};

function detectStage(app: JobApplication, overrides: Record<string, StageKey>): StageKey {
  if (overrides[app.id]) return overrides[app.id];

  const workflowStatus = String(app.workflow_status ?? "").toLowerCase();
  const status = String(app.status ?? "").toLowerCase();
  const merged = `${workflowStatus} ${status}`.replace(/[_-]+/g, " ");

  if (merged.includes("shortlist") || merged.includes("short listed")) return "shortlisted";
  if (merged.includes("interview")) return "interview";
  if (merged.includes("assessment")) return "assessment";
  if (merged.includes("screening")) return "longlisted";
  if (merged.includes("offer made")) return "hired";
  if (merged.includes("hire") || merged.includes("accepted")) return "hired";
  if (merged.includes("reject")) return "rejected";
  if (merged.includes("longlist") || merged.includes("long listed")) return "longlisted";
  if (merged.includes("reviewed")) return "longlisted";

  return "longlisted";
}

function isAssignedToStatus(app: JobApplication, overrides: Record<string, StageKey>): boolean {
  if (overrides[app.id]) return true;

  const workflowStatus = String(app.workflow_status ?? "").toLowerCase();
  const status = String(app.status ?? "").toLowerCase();
  const merged = `${workflowStatus} ${status}`.replace(/[_-]+/g, " ");

  return (
    merged.includes("longlist") ||
    merged.includes("long listed") ||
    merged.includes("shortlist") ||
    merged.includes("short listed") ||
    merged.includes("interview") ||
    merged.includes("assessment") ||
    merged.includes("screening") ||
    merged.includes("offer made") ||
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

function resolveFileUrl(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value;

  // Keep document URL resolution aligned with API client defaults.
  const configuredBase = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
  const base = configuredBase || "http://localhost:4000";

  if (value.startsWith("/")) return `${base}${value}`;
  return `${base}/${value.replace(/^\.?\//, "")}`;
}

function extractFileName(raw: unknown): string {
  const full = String(raw ?? "").trim();
  if (!full) return "";
  const clean = full.split("?")[0] ?? full;
  const parts = clean.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : clean;
}

type ProfileDocumentEntry = {
  title: string;
  url: string;
  hint?: string;
  fileName?: string;
};

type PrefetchedBlobEntry = { url: string; mimeType: string } | null;

function collectProfileDocuments(params: {
  personal: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  education: Record<string, unknown>[];
  docs?: UserDocument[];
  resumes?: Array<{ file_name?: string; download_url?: string; file_path?: string; is_primary?: boolean }>;
  fallbackResumeUrl?: string;
}): ProfileDocumentEntry[] {
  const normalizeDocumentKey = (raw: unknown): string => {
    const resolved = resolveFileUrl(raw);
    if (!resolved) return "";
    return resolved.split("#")[0].split("?")[0].trim().toLowerCase();
  };

  const cards: ProfileDocumentEntry[] = [];
  const uploadedDocs: UserDocument[] = Array.isArray(params.docs) ? params.docs : [];
  const documentNameByUrl = new Map<string, string>();

  for (const doc of uploadedDocs) {
    const originalName = String(doc.original_name ?? "").trim();
    if (!originalName) continue;
    const keys = [doc.download_url, doc.file_url]
      .map((value) => normalizeDocumentKey(value))
      .filter(Boolean);
    for (const key of keys) {
      if (!documentNameByUrl.has(key)) {
        documentNameByUrl.set(key, originalName);
      }
    }
  }

  const fileNameFromUrl = (raw: unknown): string | undefined => {
    const key = normalizeDocumentKey(raw);
    if (!key) return undefined;
    const name = String(documentNameByUrl.get(key) ?? "").trim();
    return name || undefined;
  };
  const activeEducation = (Array.isArray(params.education) ? params.education : []).filter((edu) => {
    const status = String((edu as any)?.status ?? "").trim().toLowerCase();
    if (status && ["inactive", "deleted", "archived"].includes(status)) return false;
    if (Boolean((edu as any)?.is_deleted)) return false;
    if ((edu as any)?.deleted_at) return false;
    return true;
  });

  const latestByType = new Map<string, UserDocument>();
  for (const d of uploadedDocs) {
    const type = String(d.document_type ?? "Document").trim() || "Document";
    const existing = latestByType.get(type);
    if (!existing) {
      latestByType.set(type, d);
      continue;
    }
    const existingDate = new Date(String(existing.created_at ?? "")).getTime();
    const newDate = new Date(String(d.created_at ?? "")).getTime();
    if (!Number.isNaN(newDate) && (Number.isNaN(existingDate) || newDate > existingDate)) {
      latestByType.set(type, d);
    }
  }

  const latestIdDocument = latestByType.get("id_document");
  const latestIdDocumentUrl = String(latestIdDocument?.download_url ?? latestIdDocument?.file_url ?? "").trim();
  const latestProfileCertificate = latestByType.get("certificate");
  const latestProfileCertificateUrl = String(
    latestProfileCertificate?.download_url ?? latestProfileCertificate?.file_url ?? "",
  ).trim();

  const idDoc = latestIdDocumentUrl || String(readValue(params.personal, "id_document_url", "idDocumentUrl") ?? "").trim();
  if (idDoc) cards.push({ title: "Identification Document", url: idDoc, fileName: fileNameFromUrl(idDoc) });

  const profileCert =
    latestProfileCertificateUrl || String(readValue(params.profile, "certificate_url", "certificateUrl") ?? "").trim();
  if (profileCert) cards.push({ title: "Profile Certificate", url: profileCert, fileName: fileNameFromUrl(profileCert) });

  const educationCertificateUrls = new Set<string>();
  for (let eduIndex = 0; eduIndex < activeEducation.length; eduIndex += 1) {
    const edu = activeEducation[eduIndex];
    const cert = String(readValue(edu, "certificate_url", "certificateUrl") ?? "").trim();
    if (!cert) continue;
    const inst = String(readValue(edu, "institution", "institution_name", "institutionName") ?? "").trim();
    const title = inst ? `Education Certificate ${eduIndex + 1} - ${inst}` : `Education Certificate ${eduIndex + 1}`;
    educationCertificateUrls.add(cert);
    cards.push({ title, url: cert, hint: inst || undefined, fileName: fileNameFromUrl(cert) });
  }

  for (const d of latestByType.values()) {
    const url = String(d.download_url ?? d.file_url ?? "").trim();
    if (!url) continue;
    const docType = String(d.document_type ?? "Document").trim() || "Document";
    if (docType.toLowerCase() === "id_document" && url === idDoc) continue;
    if (docType.toLowerCase() === "certificate" && url === profileCert) continue;
    if (docType.toLowerCase() === "qualification_evidence" && educationCertificateUrls.has(url)) continue;
    cards.push({
      title: docType,
      url,
      fileName: String(d.original_name ?? "").trim() || undefined,
      hint: String(d.description ?? "").trim() || undefined,
    });
  }

  const resumes = Array.isArray(params.resumes) ? params.resumes : [];
  const primaryResume = resumes.find((r) => r.is_primary) ?? resumes[0] ?? null;
  const resumeUrl = String(primaryResume?.download_url ?? primaryResume?.file_path ?? params.fallbackResumeUrl ?? "").trim();
  if (resumeUrl) {
    cards.push({
      title: "CV / Resume",
      url: resumeUrl,
      fileName: String(primaryResume?.file_name ?? "").trim() || undefined,
    });
  }

  const seen = new Set<string>();
  return cards.filter((c) => {
    const resolved = resolveFileUrl(c.url);
    const key = (resolved || c.url || c.title || "").split("#")[0].split("?")[0].trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getInlinePreviewKind(resolvedUrl: string): "image" | "pdf" | "none" {
  const url = String(resolvedUrl ?? "").trim();
  if (!url) return "none";
  if (/^data:image\//i.test(url)) return "image";
  if (/^data:application\/pdf/i.test(url)) return "pdf";
  const fileName = extractFileName(url).toLowerCase();
  if (/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(fileName)) return "image";
  if (/\.(docx?|xlsx?|pptx?|txt|csv|zip|rar)$/i.test(fileName)) return "none";
  return "pdf";
}

function detectMimeTypeFromBlobPayload(params: {
  arrayBuffer: ArrayBuffer;
  resolvedUrl: string;
  contentType?: string;
}): string {
  const contentType = String(params.contentType ?? "").trim();
  let mimeType = contentType.split(";")[0].trim();
  if (!mimeType || mimeType === "application/octet-stream") {
    const header = new Uint8Array(params.arrayBuffer.slice(0, 5));
    const magic = String.fromCharCode(...header);
    if (magic.startsWith("%PDF")) {
      mimeType = "application/pdf";
    } else if (header[0] === 0x89 && header[1] === 0x50) {
      mimeType = "image/png";
    } else if (header[0] === 0xFF && header[1] === 0xD8) {
      mimeType = "image/jpeg";
    } else {
      const urlPath = params.resolvedUrl.split("?")[0].toLowerCase();
      if (urlPath.endsWith(".pdf") || /\/(pdf|document|download|file)/i.test(urlPath)) {
        mimeType = "application/pdf";
      }
    }
  }
  return mimeType || "application/octet-stream";
}

function UploadedDocumentCard({
  title,
  url,
  fallbackText,
  hint,
  originalName,
  token,
  previewKey,
  previewMode = "inline",
  externalPreviewOpen,
  onToggleExternalPreview,
  prefetchedBlob,
}: {
  title: string;
  url: string;
  fallbackText: string;
  hint?: string;
  originalName?: string;
  token?: string;
  previewKey?: string;
  previewMode?: "inline" | "external";
  externalPreviewOpen?: boolean;
  onToggleExternalPreview?: (blobUrl: string, previewKey: string) => void;
  prefetchedBlob?: PrefetchedBlobEntry;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);

  const resolvedUrl = resolveFileUrl(url);
  const hasFile = Boolean(resolvedUrl);
  const rawFileName = extractFileName(url);
  const isGenericSegment = !rawFileName ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawFileName) ||
    /^[0-9a-f]{24,}$/i.test(rawFileName) ||
    ["download", "file", "view", "get", "document", "upload", "serve"].includes(rawFileName.toLowerCase());
  const fileName = originalName || (isGenericSegment ? title : rawFileName);
  const prefetchedBlobUrl = String(prefetchedBlob?.url ?? "").trim();
  const hasPrefetchedBlob = Boolean(prefetchedBlobUrl);

  const isLocalUrl = resolvedUrl.startsWith("blob:") || resolvedUrl.startsWith("data:");
  const needsAuthFetch = hasFile && !isLocalUrl && Boolean(token) && !hasPrefetchedBlob;

  useEffect(() => {
    if (hasPrefetchedBlob) {
      setBlobLoading(false);
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      return;
    }
    if (!needsAuthFetch || !resolvedUrl || !token) {
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      return;
    }
    let cancelled = false;

    setBlobLoading(true);
    fetch(resolvedUrl, { headers: { authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) return;
        const arrayBuffer = await res.arrayBuffer();
        const mimeType = detectMimeTypeFromBlobPayload({
          arrayBuffer,
          resolvedUrl,
          contentType: res.headers.get("content-type") ?? "",
        });
        const blob = new Blob([arrayBuffer], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return objectUrl; });
      })
      .catch(() => {
        // Silently fail
      })
      .finally(() => { if (!cancelled) setBlobLoading(false); });

    return () => { cancelled = true; };
  }, [resolvedUrl, token, needsAuthFetch, hasPrefetchedBlob]);

  useEffect(() => {
    return () => {
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, []);

  const effectiveUrl = prefetchedBlobUrl || blobUrl || resolvedUrl;
  const inlineKind = getInlinePreviewKind(effectiveUrl || resolvedUrl);
  const isImage = inlineKind === "image";
  const canInlinePreview = inlineKind !== "none";
  const isExternalPreview = previewMode === "external";
  const effectivePreviewOpen = isExternalPreview ? Boolean(externalPreviewOpen) : previewOpen;

  function onDownload(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    const dlUrl = effectiveUrl || resolvedUrl;
    if (!dlUrl) return;
    const anchor = document.createElement("a");
    anchor.href = dlUrl;
    anchor.download = fileName || "document";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  function onViewClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    const viewUrl = effectiveUrl || resolvedUrl;
    const previewIdentity = previewKey || title;
    if (isExternalPreview) {
      onToggleExternalPreview?.(viewUrl, previewIdentity);
      return;
    }
    setPreviewOpen((v) => !v);
  }

  return (
    <div className="uploadedDocCard">
      <div className="uploadedDocCardTitle">{title}</div>
      {hasFile ? (
        <span className="uploadedDocCardLink" title={fileName}>
          {blobLoading ? "Loading…" : (fileName || `View ${title.toLowerCase()}`)}
        </span>
      ) : (
        <span className="readValue">{fallbackText}</span>
      )}
      {hasFile ? (
        <div className="uploadedDocCardActions">
          <button
            type="button"
            className="btn btnPrimary btnSm uploadedDocViewBtn"
            onClick={onViewClick}
            disabled={blobLoading || !hasFile}
          >
            {blobLoading ? "…" : effectivePreviewOpen ? "Hide" : "View"}
          </button>
          <button
            type="button"
            className="btn btnGhost btnSm uploadedDocDownloadBtn"
            onClick={onDownload}
            disabled={blobLoading || !hasFile}
          >
            Download
          </button>
        </div>
      ) : null}

      {hasFile && !isExternalPreview && previewOpen ? (
        <div className="uploadedDocPreview">
          {canInlinePreview ? (
            isImage ? (
              <img className="uploadedDocPreviewImage" src={effectiveUrl} alt={fileName || title} />
            ) : (
              <iframe className="uploadedDocPreviewFrame" src={effectiveUrl} title={fileName || title} />
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

export function JobApplicationsPage() {
  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
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
  const [pageSize, setPageSize] = useState(5);

  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const [profileByAppId, setProfileByAppId] = useState<Record<string, JobSeekerFullProfile | null | undefined>>({});
  const [documentsByAppId, setDocumentsByAppId] = useState<Record<string, UserDocument[] | null | undefined>>({});
  const [resumesByAppId, setResumesByAppId] = useState<
    Record<string, { resumes: JobSeekerResume[]; primary_resume: JobSeekerResume | null } | null | undefined>
  >({});
  const [prefetchedBlobsByAppId, setPrefetchedBlobsByAppId] = useState<Record<string, Record<string, PrefetchedBlobEntry>>>({});
  const [externalDocPreviewByAppId, setExternalDocPreviewByAppId] = useState<Record<string, { url: string; key: string } | null>>({});
  const [interviewApp, setInterviewApp] = useState<JobApplication | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewVenue, setInterviewVenue] = useState("");
  const [interviewOnlineLink, setInterviewOnlineLink] = useState("");
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<StageKey, boolean>>({
    longlisted: true,
    shortlisted: true,
    rejected: true,
    interview: true,
    assessment: true,
    hired: true,
  });

  const canMoveBackToAll = hasPermission("MOVE_BACK_TO_ALL_APPLICANTS", "SET_APPLICATION_STATUS_APPLIED");

  const canSetStage = useCallback(
    (stage: StageKey) => {
      const required = STAGE_PERMISSION_MAP[stage];
      return hasPermission(required);
    },
    [hasPermission],
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
      const uniqueById = new Map<string, JobApplication>();
      for (const app of allApps) {
        uniqueById.set(String(app.id), app);
      }
      setApplications(Array.from(uniqueById.values()));
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

  const statsCards = useMemo(() => {
    const total = applications.length;
    const unassigned = mainListApplications.length;
    const cards = [
      { label: "Total Applicants", value: total },
      { label: "Unassigned", value: unassigned },
      { label: "Longlisted", value: grouped.longlisted.length },
      { label: "Shortlisted", value: grouped.shortlisted.length },
      { label: "Interview", value: grouped.interview.length },
      { label: "Assessment", value: grouped.assessment.length },
      { label: "Hired", value: grouped.hired.length },
      { label: "Rejected", value: grouped.rejected.length },
    ];
    return cards;
  }, [applications.length, grouped, mainListApplications.length]);

  const pagination = useMemo(() => {
    const total = mainListApplications.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pages);
    return { page: safePage, pages, total, limit: pageSize };
  }, [mainListApplications.length, page, pageSize]);

  useEffect(() => {
    if (page > pagination.pages) {
      setPage(pagination.pages);
    }
  }, [page, pagination.pages]);

  const visibleApplications = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return mainListApplications.slice(start, start + pagination.limit);
  }, [mainListApplications, pagination.limit, pagination.page]);

  async function onUpdateStage(
    app: JobApplication,
    next: StageKey,
    options?: { interviewDate?: string; interviewTime?: string; interviewVenue?: string; interviewOnlineLink?: string },
  ) {
    if (!accessToken || !jobId) return;
    try {
      setSavingId(app.id);
      setError(null);
      setSuccess(null);
      const preferredStatus = next;
      let updated: JobApplication | null = null;
      try {
        updated = await updateJobApplicationStatus(accessToken, jobId, app.id, preferredStatus, options);
      } catch {
        updated = await updateJobApplicationStatus(accessToken, jobId, app.id, LEGACY_STATUS_MAP[next], options);
      }
      setApplications((prev) => prev.map((p) => (p.id === app.id ? { ...p, ...updated } : p)));
      setStageOverrides((prev) => ({ ...prev, [app.id]: next }));
      if (next === "interview" && options?.interviewDate && options?.interviewTime) {
        const placeSummary =
          options.interviewVenue?.trim() ||
          (options.interviewOnlineLink?.trim() ? "Online" : "TBD");
        setSuccess(
          `Interview scheduled for ${options.interviewDate} at ${options.interviewTime} (${placeSummary}).`,
        );
      } else {
        setSuccess(`Applicant moved to ${STATUS_ACTIONS.find((s) => s.key === next)?.label ?? next}.`);
      }
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to update status");
    } finally {
      setSavingId(null);
    }
  }

  function onRequestStageChange(app: JobApplication, next: StageKey) {
    if (next !== "interview") {
      void onUpdateStage(app, next);
      return;
    }
    setInterviewApp(app);
    setInterviewDate("");
    setInterviewTime("");
    setInterviewVenue("");
    setInterviewOnlineLink("");
    setInterviewError(null);
  }

  function closeInterviewModal() {
    if (savingId) return;
    setInterviewApp(null);
    setInterviewError(null);
  }

  async function onConfirmInterviewSchedule() {
    if (!interviewApp) return;
    if (!interviewDate || !interviewTime) {
      setInterviewError("Interview date and time are required.");
      return;
    }

    if (!interviewVenue.trim() && !interviewOnlineLink.trim()) {
      setInterviewError("Provide at least a venue or an online interview link.");
      return;
    }

    setInterviewError(null);
    await onUpdateStage(interviewApp, "interview", {
      interviewDate,
      interviewTime,
      interviewVenue: interviewVenue.trim(),
      interviewOnlineLink: interviewOnlineLink.trim(),
    });
    setInterviewApp(null);
  }

  async function onMoveBackToAllApplicants(app: JobApplication) {
    if (!accessToken || !jobId) return;
    try {
      setSavingId(app.id);
      setError(null);
      setSuccess(null);

      let updated: JobApplication | null = null;
      try {
        updated = await updateJobApplicationStatus(accessToken, jobId, app.id, "applied");
      } catch {
        updated = await updateJobApplicationStatus(accessToken, jobId, app.id, "pending");
      }

      setApplications((prev) => prev.map((p) => (p.id === app.id ? { ...p, ...updated } : p)));
      setStageOverrides((prev) => {
        const nextOverrides = { ...prev };
        delete nextOverrides[app.id];
        return nextOverrides;
      });
      setSuccess("Applicant moved back to All Applicants.");
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to move applicant back to All Applicants");
    } finally {
      setSavingId(null);
    }
  }

  async function prefetchAppDocumentBlobs(appId: string, docUrls: string[], token: string) {
    const normalizedUrls = Array.from(
      new Set(
        docUrls
          .map((raw) => resolveFileUrl(raw))
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
    if (!normalizedUrls.length) return;

    const existing = prefetchedBlobsByAppId[appId] ?? {};
    const missingUrls = normalizedUrls.filter((docUrl) => !Object.prototype.hasOwnProperty.call(existing, docUrl));
    if (!missingUrls.length) return;

    const prefetchedEntries = await Promise.all(
      missingUrls.map(async (docUrl): Promise<[string, PrefetchedBlobEntry]> => {
        try {
          const res = await fetch(docUrl, { headers: { authorization: `Bearer ${token}` } });
          if (!res.ok) return [docUrl, null];
          const arrayBuffer = await res.arrayBuffer();
          const mimeType = detectMimeTypeFromBlobPayload({
            arrayBuffer,
            resolvedUrl: docUrl,
            contentType: res.headers.get("content-type") ?? "",
          });
          const objectUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: mimeType }));
          return [docUrl, { url: objectUrl, mimeType }];
        } catch {
          return [docUrl, null];
        }
      }),
    );

    setPrefetchedBlobsByAppId((prev) => {
      const currentByUrl = prev[appId] ?? {};
      const nextByUrl = { ...currentByUrl };
      for (const [docUrl, blobEntry] of prefetchedEntries) {
        if (Object.prototype.hasOwnProperty.call(nextByUrl, docUrl)) continue;
        nextByUrl[docUrl] = blobEntry;
      }
      return { ...prev, [appId]: nextByUrl };
    });
  }

  async function onToggleProfile(app: JobApplication) {
    const nextOpen = openProfileId === app.id ? null : app.id;
    setOpenProfileId(nextOpen);
    setExternalDocPreviewByAppId((prev) => ({ ...prev, [app.id]: null }));
    if (!nextOpen || !accessToken) return;
    const hasProfile = profileByAppId[app.id] !== undefined;
    const hasDocs = Object.prototype.hasOwnProperty.call(documentsByAppId, app.id);
    const hasResumes = Object.prototype.hasOwnProperty.call(resumesByAppId, app.id);
    if (hasProfile && hasDocs && hasResumes) return;

    // Load profile/details independently so the profile can render immediately,
    // while documents/resumes continue loading in the background.
    if (!hasProfile) {
      setProfileByAppId((prev) => ({ ...prev, [app.id]: undefined }));
      void getJobSeekerFullProfile(accessToken, app.applicant_id)
        .then((profile) => {
          setProfileByAppId((prev) => ({ ...prev, [app.id]: profile ?? null }));
          const profileDocs = collectProfileDocuments({
            personal: (profile?.personalDetails ?? null) as Record<string, unknown> | null,
            profile: (profile?.profile ?? null) as Record<string, unknown> | null,
            education: Array.isArray(profile?.education) ? (profile?.education as Record<string, unknown>[]) : [],
            docs: Array.isArray(documentsByAppId[app.id]) ? documentsByAppId[app.id] ?? [] : [],
            resumes: resumesByAppId[app.id]?.resumes ?? [],
            fallbackResumeUrl: String(app.applicant_resume ?? app.resume_url ?? "").trim(),
          });
          void prefetchAppDocumentBlobs(
            app.id,
            profileDocs.map((entry) => entry.url),
            accessToken,
          );
        })
        .catch(() => {
          setProfileByAppId((prev) => ({ ...prev, [app.id]: null }));
        });
    }

    if (!hasDocs) {
      setDocumentsByAppId((prev) => ({ ...prev, [app.id]: undefined }));
      void listUserDocuments(accessToken, app.applicant_id)
        .then((docs) => {
          const nextDocs = Array.isArray(docs) ? docs : [];
          setDocumentsByAppId((prev) => ({ ...prev, [app.id]: Array.isArray(docs) ? docs : null }));
          const profile = profileByAppId[app.id];
          const profileDocs = collectProfileDocuments({
            personal: (profile?.personalDetails ?? null) as Record<string, unknown> | null,
            profile: (profile?.profile ?? null) as Record<string, unknown> | null,
            education: Array.isArray(profile?.education) ? (profile?.education as Record<string, unknown>[]) : [],
            docs: nextDocs,
            resumes: resumesByAppId[app.id]?.resumes ?? [],
            fallbackResumeUrl: String(app.applicant_resume ?? app.resume_url ?? "").trim(),
          });
          void prefetchAppDocumentBlobs(
            app.id,
            profileDocs.map((entry) => entry.url),
            accessToken,
          );
        })
        .catch(() => {
          setDocumentsByAppId((prev) => ({ ...prev, [app.id]: null }));
        });
    }

    if (!hasResumes) {
      setResumesByAppId((prev) => ({ ...prev, [app.id]: undefined }));
      void listUserResumes(accessToken, app.applicant_id)
        .then((resumes) => {
          const nextResumes = resumes
            ? {
                resumes: Array.isArray(resumes.resumes) ? resumes.resumes : [],
                primary_resume: resumes.primary_resume ?? null,
              }
            : null;
          setResumesByAppId((prev) => ({
            ...prev,
            [app.id]: nextResumes,
          }));
          const profile = profileByAppId[app.id];
          const profileDocs = collectProfileDocuments({
            personal: (profile?.personalDetails ?? null) as Record<string, unknown> | null,
            profile: (profile?.profile ?? null) as Record<string, unknown> | null,
            education: Array.isArray(profile?.education) ? (profile?.education as Record<string, unknown>[]) : [],
            docs: Array.isArray(documentsByAppId[app.id]) ? documentsByAppId[app.id] ?? [] : [],
            resumes: nextResumes?.resumes ?? [],
            fallbackResumeUrl: String(app.applicant_resume ?? app.resume_url ?? "").trim(),
          });
          void prefetchAppDocumentBlobs(
            app.id,
            profileDocs.map((entry) => entry.url),
            accessToken,
          );
        })
        .catch(() => {
          setResumesByAppId((prev) => ({ ...prev, [app.id]: null }));
        });
    }
  }

  function profileDocuments(app: JobApplication) {
    const profile = profileByAppId[app.id];
    const docs = documentsByAppId[app.id];
    const resumes = resumesByAppId[app.id];
    return collectProfileDocuments({
      personal: (profile?.personalDetails ?? null) as Record<string, unknown> | null,
      profile: (profile?.profile ?? null) as Record<string, unknown> | null,
      education: Array.isArray(profile?.education) ? (profile?.education as Record<string, unknown>[]) : [],
      docs: Array.isArray(docs) ? docs : [],
      resumes: resumes?.resumes ?? [],
      fallbackResumeUrl: String(app.applicant_resume ?? app.resume_url ?? "").trim(),
    });
  }

  function renderProfilePanel(app: JobApplication) {
    const profile = profileByAppId[app.id];
    const documentsState = documentsByAppId[app.id];
    const resumesState = resumesByAppId[app.id];
    const personal = profile?.personalDetails ?? null;
    const docs = profileDocuments(app);

    const firstName = String(readValue(personal, "first_name", "firstName") ?? "").trim();
    const lastName = String(readValue(personal, "last_name", "lastName") ?? "").trim();
    const computedFullName = `${firstName} ${lastName}`.trim();
    const resolvedFullName =
      computedFullName ||
      String(readValue(personal, "full_name", "fullName") ?? "").trim() ||
      String(app.applicant_name ?? "").trim() ||
      String(app.applicant_email ?? "").trim() ||
      "—";

    return (
      <div className="dropPanel">
        <h3 className="editFormTitle" style={{ marginBottom: 8 }}>Job Seeker Profile</h3>
        {profile === undefined ? (
          <div className="placeholderSpinnerWrap" role="status" aria-live="polite"><span className="placeholderSpinner" aria-hidden="true" /><span className="srOnly">Loading</span></div>
        ) : profile === null ? (
          <p className="pageText">Profile details are not available for this applicant.</p>
        ) : (
          <>
            <Section title="Personal Details">
              <ReadField label="Full Name" value={resolvedFullName} />
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
              {documentsState === undefined || resumesState === undefined ? (
                <div className="placeholderSpinnerWrap" role="status" aria-live="polite">
                  <span className="placeholderSpinner" aria-hidden="true" />
                  <span className="srOnly">Loading</span>
                </div>
              ) : docs.length === 0 ? (
                <p className="pageText">No document links found.</p>
              ) : (
                <>
                  <div className="uploadedDocsGrid" style={{ marginTop: 0 }}>
                    {docs.map((doc, idx) => {
                      const previewKey = `${String(doc.url ?? "").trim()}::${idx}`;
                      const selectedPreview = externalDocPreviewByAppId[app.id];
                      const prefetchedBlobKey = resolveFileUrl(doc.url);
                      return (
                        <UploadedDocumentCard
                          key={`${app.id}-doc-${idx}`}
                          title={doc.title}
                          url={doc.url}
                          token={accessToken ?? ""}
                          fallbackText="—"
                          hint={doc.hint}
                          originalName={doc.fileName}
                          previewKey={previewKey}
                          previewMode="external"
                          prefetchedBlob={prefetchedBlobsByAppId[app.id]?.[prefetchedBlobKey] ?? null}
                          externalPreviewOpen={selectedPreview?.key === previewKey}
                          onToggleExternalPreview={(blobUrl, key) => {
                            setExternalDocPreviewByAppId((prev) => {
                              const current = prev[app.id];
                              return {
                                ...prev,
                                [app.id]: current?.key === key ? null : { url: blobUrl, key },
                              };
                            });
                          }}
                        />
                      );
                    })}
                  </div>

                  {externalDocPreviewByAppId[app.id]?.url ? (
                    <div style={{ marginTop: 10 }}>
                      <div className="readLabel">Document Preview</div>
                      <div className="uploadedDocPreview" style={{ marginTop: 6 }}>
                        {(() => {
                          const kind = getInlinePreviewKind(externalDocPreviewByAppId[app.id]!.url);
                          if (kind === "image") {
                            return (
                              <img
                                className="uploadedDocPreviewImage"
                                src={externalDocPreviewByAppId[app.id]!.url}
                                alt="Document preview"
                              />
                            );
                          }
                          if (kind === "pdf") {
                            return (
                              <iframe
                                className="uploadedDocPreviewFrame"
                                src={externalDocPreviewByAppId[app.id]!.url}
                                title="Document preview"
                                style={{ minHeight: 600 }}
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
                </>
              )}
            </Section>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button
                type="button"
                className="btn btnPrimary btnSm"
                onClick={() => void onToggleProfile(app)}
              >
                Hide Profile
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Job Applications</h1></div>
        <div className="placeholderSpinnerWrap" role="status" aria-live="polite"><span className="placeholderSpinner" aria-hidden="true" /><span className="srOnly">Loading</span></div>
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

      <div className="statsCardsGrid" role="region" aria-label="Application statistics">
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name/email/phone/status/date..."
          />
        </div>

        <div className="publicJobsPager" role="navigation" aria-label="Applicants pagination top">
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

      <div className="dashCardHeader" style={{ marginBottom: 10 }}>
        <h2 className="dashCardTitle" style={{ fontSize: 16 }}>
          All Applicants
        </h2>
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
                  {STATUS_ACTIONS.filter((s) => s.key !== current)
                    .filter((action) => canSetStage(action.key))
                    .map((action) => (
                      <button
                        key={`${app.id}-${action.key}`}
                        type="button"
                        className="btn btnGhost btnSm"
                        onClick={() => onRequestStageChange(app, action.key)}
                        disabled={savingId === app.id}
                      >
                        {action.label}
                      </button>
                    ))}
                  <button type="button" className="btn btnPrimary btnSm" onClick={() => onToggleProfile(app)}>
                    {openProfileId === app.id ? "Hide Profile" : "View Profile"}
                  </button>
                  <button
                    type="button"
                    className="btn btnGhost btnSm"
                    onClick={() => navigate(`/app/audit?target_type=application&target_id=${encodeURIComponent(app.id)}`)}
                  >
                    Application Audit
                  </button>
                  <button
                    type="button"
                    className="btn btnGhost btnSm"
                    onClick={() => navigate(`/app/audit?target_type=applicant&target_id=${encodeURIComponent(app.applicant_id)}`)}
                  >
                    Applicant Audit
                  </button>
                </div>

                {openProfileId === app.id ? <div style={{ marginTop: 12 }}>{renderProfilePanel(app)}</div> : null}
              </article>
            );
          })
        )}
      </div>

      <div className="publicJobsPager" role="navigation" aria-label="Applicants pagination" style={{ marginTop: 16 }}>
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
          <div
            className="dashCardHeader"
            style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}
          >
            <h2 className="dashCardTitle" style={{ fontSize: 16 }}>
              {(STATUS_ACTIONS.find((s) => s.key === stage)?.label ?? stage)} Applicants
            </h2>
            <button
              type="button"
              className="btn btnPrimary btnSm"
              style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
              onClick={() => setOpenGroups((prev) => ({ ...prev, [stage]: !prev[stage] }))}
            >
              {openGroups[stage] ? "Hide" : "Show"} {STATUS_ACTIONS.find((s) => s.key === stage)?.label ?? stage} ({grouped[stage].length})
            </button>
          </div>

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
                        {canMoveBackToAll && (
                          <button
                            type="button"
                            className="btn btnPrimary btnSm"
                            style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
                            onClick={() => onMoveBackToAllApplicants(app)}
                            disabled={savingId === app.id}
                          >
                            Move Back to All Applicants
                          </button>
                        )}
                        {STATUS_ACTIONS.filter((s) => s.key !== current)
                          .filter((action) => canSetStage(action.key))
                          .map((action) => (
                            <button
                              key={`${stage}-${app.id}-${action.key}`}
                              type="button"
                              className="btn btnGhost btnSm"
                              onClick={() => onRequestStageChange(app, action.key)}
                              disabled={savingId === app.id}
                            >
                              {action.label}
                            </button>
                          ))}
                        <button type="button" className="btn btnPrimary btnSm" onClick={() => onToggleProfile(app)}>
                          {openProfileId === app.id ? "Hide Profile" : "View Profile"}
                        </button>
                        <button
                          type="button"
                          className="btn btnGhost btnSm"
                          onClick={() => navigate(`/app/audit?target_type=application&target_id=${encodeURIComponent(app.id)}`)}
                        >
                          Application Audit
                        </button>
                        <button
                          type="button"
                          className="btn btnGhost btnSm"
                          onClick={() => navigate(`/app/audit?target_type=applicant&target_id=${encodeURIComponent(app.applicant_id)}`)}
                        >
                          Applicant Audit
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

      {interviewApp ? (
        <div className="modalOverlay" role="presentation" onMouseDown={closeInterviewModal}>
          <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalTitle">Schedule Interview</div>
            <div className="modalMessage" style={{ marginBottom: 10 }}>
              Set interview details for {interviewApp.applicant_name ?? "this applicant"}.
            </div>

            {interviewError ? <div className="errorBox" style={{ marginTop: 0 }}>{interviewError}</div> : null}

            <div className="profileReadGrid" style={{ marginTop: 8 }}>
              <div>
                <label className="fieldLabel" htmlFor="interview-date">Interview Date</label>
                <input
                  id="interview-date"
                  className="input"
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                />
              </div>
              <div>
                <label className="fieldLabel" htmlFor="interview-time">Interview Time</label>
                <input
                  id="interview-time"
                  className="input"
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="fieldLabel" htmlFor="interview-venue">Interview Venue</label>
                <input
                  id="interview-venue"
                  className="input"
                  value={interviewVenue}
                  onChange={(e) => setInterviewVenue(e.target.value)}
                  placeholder="Venue / location"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label className="fieldLabel" htmlFor="interview-online-link">Online Interview Link (optional)</label>
                <input
                  id="interview-online-link"
                  className="input"
                  value={interviewOnlineLink}
                  onChange={(e) => setInterviewOnlineLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="modalActions">
              <button className="btn btnGhost" type="button" onClick={closeInterviewModal} disabled={Boolean(savingId)}>
                Cancel
              </button>
              <button className="btn btnPrimary" type="button" onClick={() => void onConfirmInterviewSchedule()} disabled={Boolean(savingId)}>
                {savingId ? "Saving..." : "Schedule Interview"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
