import { type MouseEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../auth/AuthContext";
import { COUNTRY_NAMES } from "../utils/countries";
import { NAMIBIA_REGIONS, NAMIBIA_TOWNS_CITIES } from "../utils/namibia";
import {
  CALLING_CODE_OPTIONS,
  DEFAULT_CALLING_CODE,
  composeInternationalPhone,
  sanitizePhoneLocalInput,
  splitInternationalPhone,
  validateInternationalPhone,
} from "../utils/phoneCountryCodes";
import {
  applyToJob,
  blockUser,
  listJobSeekerResumes,
  listUserResumes,
  listMyDocuments,
  getFullProfile,
  getJobSeekerFullProfile,
  listJobSeekers,
  listUserDocuments,
  getIpLocation,
  me,
  uploadJobSeekerDocument,
  uploadProfilePicture,
  uploadJobSeekerResume,
  updateProfile,
  updatePersonalDetails,
  updateMyAccount,
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
  type JobSeekerResume,
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

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_PROFILE_PICTURE_BYTES = 10 * 1024 * 1024;

function validatePdfUpload(file: File | null): string | null {
  if (!file) return "No file selected.";
  const ext = String(file.name ?? "").toLowerCase();
  const mime = String(file.type ?? "").toLowerCase();
  const isPdf = mime === "application/pdf" || mime === "application/x-pdf" || ext.endsWith(".pdf");
  if (!isPdf) return "Only PDF files are allowed.";
  if (file.size > MAX_UPLOAD_BYTES) return "File too large. Maximum size is 10MB.";
  return null;
}

function validateProfilePictureUpload(file: File | null): string | null {
  if (!file) return "No image selected.";
  const mime = String(file.type ?? "").toLowerCase();
  if (!mime.startsWith("image/")) return "Only image files are allowed for profile picture.";
  if (file.size > MAX_PROFILE_PICTURE_BYTES) return "Profile picture is too large. Maximum size is 10MB.";
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

type DirectoryResumeBundle = {
  primary_resume: JobSeekerResume | null;
  resumes: JobSeekerResume[];
};

type PrefetchedBlobEntry = { url: string; mimeType: string } | null;

async function fetchProfilePictureObjectUrl(
  token: string,
  opts?: { userId?: string | null },
): Promise<string | null> {
  const apiBase = String(import.meta.env.VITE_API_URL ?? "http://localhost:4000").trim().replace(/\/$/, "");

  const userId = String(opts?.userId ?? "").trim();
  const url = userId
    ? `${apiBase}/api/v1/users/profile-picture/${encodeURIComponent(userId)}`
    : `${apiBase}/api/v1/profile/picture`;

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

async function fetchProfilePictureDataUrl(
  token: string,
  opts?: { userId?: string | null },
): Promise<string | null> {
  const apiBase = String(import.meta.env.VITE_API_URL ?? "http://localhost:4000").trim().replace(/\/$/, "");
  const userId = String(opts?.userId ?? "").trim();
  const url = userId
    ? `${apiBase}/api/v1/users/profile-picture/${encodeURIComponent(userId)}`
    : `${apiBase}/api/v1/profile/picture`;

  try {
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return blobToDataUrl(blob);
  } catch {
    return null;
  }
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
  if (/\.(docx?|xlsx?|pptx?|txt|csv|zip|rar)$/i.test(fileName)) return "none";
  // Default to PDF for all other non-empty URLs (covers API paths without extensions)
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
  onToggleExternalPreview?: (blobUrl: string, title: string) => void;
  prefetchedBlob?: PrefetchedBlobEntry;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobLoading, setBlobLoading] = useState(false);
  const [authFetchFallback, setAuthFetchFallback] = useState(false);

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

  // For blob: and data: URLs (local staged files) use directly, otherwise fetch with auth
  const isLocalUrl = resolvedUrl.startsWith("blob:") || resolvedUrl.startsWith("data:");
  const needsAuthFetch = hasFile && !isLocalUrl && Boolean(token) && !hasPrefetchedBlob;

  // Pre-fetch authenticated blob URL whenever the source URL changes
  useEffect(() => {
    if (hasPrefetchedBlob) {
      setBlobLoading(false);
      setAuthFetchFallback(false);
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      return;
    }
    if (!needsAuthFetch || !resolvedUrl || !token) {
      setAuthFetchFallback(false);
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
      return;
    }
    let cancelled = false;

    setBlobLoading(true);
    setAuthFetchFallback(false);
    fetch(resolvedUrl, { headers: { authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setAuthFetchFallback(true);
          return;
        }
        const arrayBuffer = await res.arrayBuffer();
        const mimeType = detectMimeTypeFromBlobPayload({
          arrayBuffer,
          resolvedUrl,
          contentType: res.headers.get("content-type") ?? "",
        });
        const blob = new Blob([arrayBuffer], { type: mimeType });
        // Wrap blob with correct MIME type so browsers can preview/open it
        const objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          // Fetch raced with unmount/url-change — discard immediately
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return objectUrl; });
        setAuthFetchFallback(false);
      })
      .catch(() => {
        if (!cancelled) setAuthFetchFallback(true);
      })
      .finally(() => { if (!cancelled) setBlobLoading(false); });

    // Only cancel the in-flight fetch; do NOT revoke any objectUrl here
    // because setBlobUrl state may already hold it (revoking would blank the preview).
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedUrl, token, hasPrefetchedBlob]);

  // Revoke blob URL on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, []);

  // Prefer authenticated blob URLs when available, but keep direct URLs usable as fallback.
  const effectiveUrl = prefetchedBlobUrl || blobUrl || resolvedUrl;
  const isLegacyUploadsUrl = /\/uploads\//i.test(resolvedUrl);

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
      {isLegacyUploadsUrl ? (
        <span className="uploadedDocCardHint">
          Legacy upload path detected (`/upload` or `/uploads`). This document is still linked to old file storage and should be re-uploaded so it is saved in the database.
        </span>
      ) : null}
      {authFetchFallback && !isLegacyUploadsUrl ? (
        <span className="uploadedDocCardHint">
          Could not fetch this file for preview. You can still use Download.
        </span>
      ) : null}
    </div>
  );
}

function DirectoryProfilePicture({ token, userId, fullName }: { token: string; userId: string; fullName: string }) {
  const [pictureUrl, setPictureUrl] = useState("");

  useEffect(() => {
    if (!token || !userId) {
      setPictureUrl("");
      return;
    }

    let cancelled = false;
    let objectUrlToRevoke: string | null = null;

    (async () => {
      const objectUrl = await fetchProfilePictureObjectUrl(token, { userId });
      if (!objectUrl || cancelled) {
        if (!cancelled) setPictureUrl("");
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        return;
      }

      objectUrlToRevoke = objectUrl;
      setPictureUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });
    })();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [token, userId]);

  return (
    <div className="field fieldFull" style={{ marginBottom: 4 }}>
      <div className="readLabel">Profile Picture</div>
      {pictureUrl ? (
        <div style={{ marginTop: 6 }}>
          <img
            src={pictureUrl}
            alt={`${fullName || "User"} profile picture`}
            style={{ width: 84, height: 84, borderRadius: "999px", objectFit: "contain", background: "var(--card)", border: "2px solid var(--stroke)" }}
          />
        </div>
      ) : (
        <div className="pageText" style={{ marginTop: 6 }}>No profile picture uploaded.</div>
      )}
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

type ProfileDocumentEntry = {
  title: string;
  url: string;
  hint?: string;
  fileName?: string;
};

function isGeneratedProfileExportDoc(entry: { title?: string; fileName?: string; url?: string }): boolean {
  const probe = `${entry.title ?? ""} ${entry.fileName ?? ""} ${entry.url ?? ""}`.toLowerCase();
  return /(full[_\s-]?profile|candidate[_\s-]?profile)/i.test(probe);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file blob."));
    reader.readAsDataURL(blob);
  });
}

function resolveImageFormat(mimeType: string): "PNG" | "JPEG" | null {
  const mime = String(mimeType ?? "").toLowerCase();
  if (mime.includes("png")) return "PNG";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "JPEG";
  return null;
}

function downloadPdfBlob(fileName: string, blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function readProfileValue(obj: Record<string, unknown> | null | undefined, ...keys: string[]) {
  if (!obj) return null;
  for (const k of keys) {
    const v = (obj as any)[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
}

function formatDateValue(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "-";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB");
}

function collectProfileDocuments(params: {
  personal: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  education: Record<string, unknown>[];
  docs?: UserDocument[];
  resumes?: Array<{ file_name?: string; download_url?: string; file_path?: string; is_primary?: boolean }>;
}): ProfileDocumentEntry[] {
  const cards: ProfileDocumentEntry[] = [];

  // Treat education records as active unless they are explicitly marked inactive/deleted.
  const activeEducation = (Array.isArray(params.education) ? params.education : []).filter((edu) => {
    const status = String((edu as any)?.status ?? "").trim().toLowerCase();
    if (status && ["inactive", "deleted", "archived"].includes(status)) return false;
    if (Boolean((edu as any)?.is_deleted)) return false;
    if ((edu as any)?.deleted_at) return false;
    return true;
  });

  // Deduplicate uploaded docs by document_type — keep only the latest per type.
  const uploadedDocs: UserDocument[] = Array.isArray(params.docs) ? params.docs : [];
  const latestByType = new Map<string, UserDocument>();
  for (const d of uploadedDocs) {
    const type = String(d.document_type ?? "Document").trim() || "Document";
    const existing = latestByType.get(type);
    if (!existing) {
      latestByType.set(type, d);
    } else {
      const existingDate = new Date(String(existing.created_at ?? "")).getTime();
      const newDate = new Date(String(d.created_at ?? "")).getTime();
      if (!Number.isNaN(newDate) && (Number.isNaN(existingDate) || newDate > existingDate)) {
        latestByType.set(type, d);
      }
    }
  }

  const latestIdDocument = latestByType.get("id_document");
  const latestIdDocumentUrl = String(
    latestIdDocument?.download_url ?? latestIdDocument?.file_url ?? "",
  ).trim();

  const latestProfileCertificate = latestByType.get("certificate");
  const latestProfileCertificateUrl = String(
    latestProfileCertificate?.download_url ?? latestProfileCertificate?.file_url ?? "",
  ).trim();

  const idDoc = latestIdDocumentUrl || String(readProfileValue(params.personal, "id_document_url", "idDocumentUrl") ?? "").trim();
  if (idDoc) cards.push({ title: "Identification Document", url: idDoc });

  const profileCert = latestProfileCertificateUrl || String(readProfileValue(params.profile, "certificate_url", "certificateUrl") ?? "").trim();
  if (profileCert) cards.push({ title: "Profile Certificate", url: profileCert });

  const educationCertificateUrls = new Set<string>();
  for (let eduIndex = 0; eduIndex < activeEducation.length; eduIndex += 1) {
    const edu = activeEducation[eduIndex];
    const cert = String(readProfileValue(edu, "certificate_url", "certificateUrl") ?? "").trim();
    if (!cert) continue;
    const inst = String(readProfileValue(edu, "institution", "institution_name", "institutionName") ?? "").trim();
    const title = inst
      ? `Education Certificate ${eduIndex + 1} - ${inst}`
      : `Education Certificate ${eduIndex + 1}`;
    educationCertificateUrls.add(cert);
    cards.push({
      title,
      url: cert,
      hint: inst || undefined,
      fileName: undefined,
    });
  }

  for (const d of latestByType.values()) {
    const url = String(d.download_url ?? d.file_url ?? "").trim();
    if (!url) continue;
    const docType = String(d.document_type ?? "Document").trim() || "Document";
    if (docType.toLowerCase() === "id_document" && url === idDoc) continue;
    if (docType.toLowerCase() === "certificate" && url === profileCert) continue;
    if (docType.toLowerCase() === "qualification_evidence" && educationCertificateUrls.has(url)) {
      continue;
    }
    cards.push({
      title: docType,
      url,
      fileName: String(d.original_name ?? "").trim() || undefined,
      hint: String(d.description ?? "").trim() || undefined,
    });
  }

  const resumes = Array.isArray(params.resumes) ? params.resumes : [];
  // Keep only primary resume, or the latest one
  const primaryResume = resumes.find((r) => r.is_primary) ?? resumes[0];
  if (primaryResume) {
    const url = String(primaryResume.download_url ?? primaryResume.file_path ?? "").trim();
    if (url) {
      cards.push({
        title: "CV / Resume",
        url,
        fileName: String(primaryResume.file_name ?? "").trim() || undefined,
      });
    }
  }

  const seen = new Set<string>();
  return cards.filter((c) => {
    if (isGeneratedProfileExportDoc(c)) return false;
    const resolved = resolveFileUrl(c.url);
    const key = (resolved || c.url || c.title || "")
      .split("#")[0]
      .split("?")[0]
      .trim()
      .toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function createProfilePdfReport(params: {
  fileName: string;
  fullName: string;
  email?: string;
  phone?: string;
  accessToken?: string;
  personal: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  addresses: Record<string, unknown>[];
  education: Record<string, unknown>[];
  experience: Record<string, unknown>[];
  references: Record<string, unknown>[];
  documents: ProfileDocumentEntry[];
  profilePictureDataUrl?: string;
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ── Design tokens ──────────────────────────────────────────────────────
  const NAVY: [number, number, number] = [22, 36, 90];
  const NAVY_MID: [number, number, number] = [44, 62, 140];
  const ACCENT: [number, number, number] = [59, 130, 246];
  const DARK_TEXT: [number, number, number] = [30, 30, 45];
  const MUTED: [number, number, number] = [100, 110, 130];
  const WHITE: [number, number, number] = [255, 255, 255];
  const LIGHT_BG: [number, number, number] = [247, 249, 252];
  const DIVIDER: [number, number, number] = [220, 226, 240];

  // ── Helper: draw a styled section heading with accent bar ──────────────
  const drawSectionHeading = (title: string, y: number): number => {
    // Accent bar
    doc.setFillColor(...ACCENT);
    doc.rect(margin, y, 3.5, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(title.toUpperCase(), margin + 6, y + 4.5);
    // Light separator line
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 8, pageWidth - margin, y + 8);
    return y + 11;
  };

  // ── Helper: ensure enough vertical space, add page if needed ───────────
  const ensureSpace = (currentY: number, needed: number): number => {
    if (currentY + needed > pageHeight - 18) {
      doc.addPage();
      drawPageHeader();
      return 28;
    }
    return currentY;
  };

  // ── Helper: draw running page header (for continuation pages) ──────────
  const drawPageHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text("CANDIDATE PROFILE", margin, 6.5);
    const name = String(params.fullName || "").trim();
    if (name) {
      doc.setFont("helvetica", "normal");
      const nameW = doc.getTextWidth(name);
      doc.text(name, pageWidth - margin - nameW, 6.5);
    }
  };

  // ── Cover header ────────────────────────────────────────────────────────
  const HEADER_H = 44;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, HEADER_H, "F");

  // Subtle diagonal accent stripe
  doc.setFillColor(...NAVY_MID);
  doc.triangle(pageWidth - 60, 0, pageWidth, 0, pageWidth, HEADER_H, "F");

  // Profile picture (circle-ish, right side of header)
  let picEmbedded = false;
  if (params.profilePictureDataUrl) {
    try {
      const picMime = params.profilePictureDataUrl.split(";")[0]?.split(":")[1] ?? "";
      const picFormat = resolveImageFormat(picMime);
      if (picFormat) {
        const picW = 30;
        const picH = 30;
        const picX = pageWidth - picW - margin;
        const picY = (HEADER_H - picH) / 2;
        // White border behind picture
        doc.setFillColor(...WHITE);
        doc.roundedRect(picX - 1.5, picY - 1.5, picW + 3, picH + 3, 3, 3, "F");
        doc.addImage(params.profilePictureDataUrl, picFormat, picX, picY, picW, picH);
        picEmbedded = true;
      }
    } catch {
      // Skip silently
    }
  }

  const textMaxX = picEmbedded ? pageWidth - 50 : pageWidth - margin;
  void textMaxX;

  // Title label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 240);
  doc.text("CURRICULUM VITAE", margin, 10);

  // Candidate name
  const name = String(params.fullName || "Job Seeker").trim();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...WHITE);
  doc.text(name, margin, 22);

  // Contact info
  const contactParts = [
    String(params.email ?? "").trim(),
    String(params.phone ?? "").trim(),
  ].filter(Boolean);
  if (contactParts.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 218, 255);
    doc.text(contactParts.join("   |   "), margin, 30);
  }

  // Date generated
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(160, 180, 220);
  doc.text(`Generated: ${new Date().toLocaleString("en-GB")}`, margin, 38);

  // Light bottom accent bar below header
  doc.setFillColor(...ACCENT);
  doc.rect(0, HEADER_H, pageWidth, 1.5, "F");

  // ── Personal Details table ──────────────────────────────────────────────
  const personalRows: [string, string][] = [
    ["First Name", String(readProfileValue(params.personal, "first_name", "firstName") ?? "-")],
    ["Last Name", String(readProfileValue(params.personal, "last_name", "lastName") ?? "-")],
    ["Middle Name", String(readProfileValue(params.personal, "middle_name", "middleName") ?? "-")],
    ["Gender", String(readProfileValue(params.personal, "gender") ?? "-")],
    ["Date of Birth", formatDateValue(readProfileValue(params.personal, "date_of_birth", "dateOfBirth"))],
    ["Nationality", String(readProfileValue(params.personal, "nationality") ?? "-")],
    ["ID Type", String(readProfileValue(params.personal, "id_type", "idType") ?? "-")],
    ["ID Number", String(readProfileValue(params.personal, "id_number", "idNumber") ?? "-")],
    ["Marital Status", String(readProfileValue(params.personal, "marital_status", "maritalStatus") ?? "-")],
    ["Disability Status", Boolean(readProfileValue(params.personal, "disability_status", "disabilityStatus")) ? "Yes" : "No"],
  ];

  let sectionY = HEADER_H + 10;
  sectionY = drawSectionHeading("Personal Details", sectionY);

  autoTable(doc, {
    startY: sectionY,
    margin: { left: margin, right: margin },
    head: [],
    body: personalRows,
    styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 5, right: 5 }, textColor: DARK_TEXT },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 52, fontStyle: "bold", textColor: NAVY_MID },
      1: { cellWidth: contentWidth - 52 },
    },
    tableLineColor: DIVIDER,
    tableLineWidth: 0.2,
  });

  // ── Professional Summary ────────────────────────────────────────────────
  const summary = String(readProfileValue(params.profile, "professional_summary", "professionalSummary") ?? "").trim();

  let currentY = ((doc as any).lastAutoTable?.finalY ?? sectionY) + 10;
  currentY = ensureSpace(currentY, 30);
  currentY = drawSectionHeading("Professional Summary", currentY);

  if (summary) {
    doc.setFillColor(...LIGHT_BG);
    const summaryLines = doc.splitTextToSize(summary, contentWidth - 10);
    const summaryBoxH = summaryLines.length * 4.5 + 8;
    doc.roundedRect(margin, currentY, contentWidth, summaryBoxH, 3, 3, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text(summaryLines, margin + 5, currentY + 5.5);
    currentY += summaryBoxH + 6;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No professional summary provided.", margin, currentY + 4);
    currentY += 10;
  }

  // Professional overview table
  const profRows = [[
    String(readProfileValue(params.profile, "field_of_expertise", "fieldOfExpertise") ?? "-"),
    String(readProfileValue(params.profile, "qualification_level", "qualificationLevel") ?? "-"),
    String(readProfileValue(params.profile, "years_experience", "yearsExperience") ?? "-"),
  ]];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Field of Expertise", "Qualification Level", "Years of Experience"]],
    body: profRows,
    styles: { fontSize: 9, cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 }, textColor: DARK_TEXT },
    headStyles: { fillColor: NAVY_MID, textColor: WHITE, fontStyle: "bold", fontSize: 8.5 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    tableLineColor: DIVIDER,
    tableLineWidth: 0.2,
  });

  // ── Address ─────────────────────────────────────────────────────────────
  const addressRows = (Array.isArray(params.addresses) ? params.addresses : []).map((address) => [
    String(readProfileValue(address, "address_line1", "addressLine1") ?? "-"),
    String(readProfileValue(address, "address_line2", "addressLine2") ?? "-"),
    String(readProfileValue(address, "city") ?? "-"),
    String(readProfileValue(address, "state") ?? "-"),
    String(readProfileValue(address, "country") ?? "-"),
  ]);

  currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
  currentY = ensureSpace(currentY, 28);
  currentY = drawSectionHeading("Address", currentY);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Address Line 1", "Address Line 2", "City", "State/Region", "Country"]],
    body: addressRows.length > 0 ? addressRows : [["-", "-", "-", "-", "-"]],
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: DARK_TEXT },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    tableLineColor: DIVIDER,
    tableLineWidth: 0.2,
  });

  // ── Education ───────────────────────────────────────────────────────────
  const educationRows = (Array.isArray(params.education) ? params.education : []).map((edu) => [
    String(readProfileValue(edu, "institution", "institution_name", "institutionName") ?? "-"),
    String(readProfileValue(edu, "qualification") ?? "-"),
    String(readProfileValue(edu, "field_of_study", "fieldOfStudy") ?? "-"),
    formatDateValue(readProfileValue(edu, "start_date", "startDate", "start_year", "startYear")),
    formatDateValue(readProfileValue(edu, "end_date", "endDate", "end_year", "endYear")),
  ]);

  currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
  currentY = ensureSpace(currentY, 28);
  currentY = drawSectionHeading("Education", currentY);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Institution", "Qualification", "Field of Study", "Start", "End"]],
    body: educationRows.length > 0 ? educationRows : [["-", "-", "-", "-", "-"]],
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: DARK_TEXT },
    headStyles: { fillColor: NAVY_MID, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: { 0: { cellWidth: 50 }, 3: { cellWidth: 18 }, 4: { cellWidth: 18 } },
    tableLineColor: DIVIDER,
    tableLineWidth: 0.2,
  });

  // ── Experience ──────────────────────────────────────────────────────────
  const experienceRows = (Array.isArray(params.experience) ? params.experience : []).map((exp) => [
    String(readProfileValue(exp, "job_title", "jobTitle", "position") ?? "-"),
    String(readProfileValue(exp, "company_name", "companyName", "company") ?? "-"),
    String(readProfileValue(exp, "employment_type", "employmentType") ?? "-"),
    formatDateValue(readProfileValue(exp, "start_date", "startDate")),
    formatDateValue(readProfileValue(exp, "end_date", "endDate")),
    String(readProfileValue(exp, "responsibilities", "description") ?? "-").slice(0, 200) || "-",
  ]);

  currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
  currentY = ensureSpace(currentY, 28);
  currentY = drawSectionHeading("Work Experience", currentY);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Job Title", "Company", "Employment Type", "Start", "End", "Responsibilities"]],
    body: experienceRows.length > 0 ? experienceRows : [["-", "-", "-", "-", "-", "-"]],
    styles: { fontSize: 8.2, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: DARK_TEXT, overflow: "linebreak" },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 33 },
      1: { cellWidth: 33 },
      2: { cellWidth: 25 },
      3: { cellWidth: 17 },
      4: { cellWidth: 17 },
      5: { cellWidth: contentWidth - 125 },
    },
    tableLineColor: DIVIDER,
    tableLineWidth: 0.2,
  });

  // ── References ──────────────────────────────────────────────────────────
  const referencesRows = (Array.isArray(params.references) ? params.references : []).map((ref) => [
    String(readProfileValue(ref, "full_name", "fullName", "name") ?? "-"),
    String(readProfileValue(ref, "relationship") ?? "-"),
    String(readProfileValue(ref, "company") ?? "-"),
    String(readProfileValue(ref, "email") ?? "-"),
    String(readProfileValue(ref, "phone") ?? "-"),
  ]);

  currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
  currentY = ensureSpace(currentY, 28);
  currentY = drawSectionHeading("References", currentY);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Full Name", "Relationship", "Company", "Email", "Phone"]],
    body: referencesRows.length > 0 ? referencesRows : [["-", "-", "-", "-", "-"]],
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: DARK_TEXT },
    headStyles: { fillColor: NAVY_MID, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    tableLineColor: DIVIDER,
    tableLineWidth: 0.2,
  });

  // ── Uploaded Documents list ─────────────────────────────────────────────
  const documentRows = (Array.isArray(params.documents) ? params.documents : []).map((d) => [
    d.title || "Document",
    d.hint || "-",
    d.fileName || extractFileName(d.url) || "—",
  ]);

  currentY = ((doc as any).lastAutoTable?.finalY ?? currentY) + 10;
  currentY = ensureSpace(currentY, 28);
  currentY = drawSectionHeading("Supporting Documents", currentY);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [["Document Type", "Notes", "File Name"]],
    body: documentRows.length > 0 ? documentRows : [["-", "-", "-"]],
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: DARK_TEXT, overflow: "linebreak" },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 60 },
      2: { cellWidth: contentWidth - 102 },
    },
    tableLineColor: DIVIDER,
    tableLineWidth: 0.2,
  });

  // ── Collect PDF attachments to append after profile pages ──────────────
  const pdfAttachments: Array<{ name: string; bytes: ArrayBuffer }> = [];
  const seenAttachmentSources = new Set<string>();
  if (params.documents.length > 0) {
    for (const entry of params.documents) {
      if (isGeneratedProfileExportDoc(entry)) continue;
      const resolvedUrl = resolveFileUrl(entry.url);
      if (!resolvedUrl) continue;
      const sourceKey = resolvedUrl.split("#")[0].split("?")[0].trim().toLowerCase();
      if (seenAttachmentSources.has(sourceKey)) continue;
      try {
        const headers: Record<string, string> = {};
        if (params.accessToken) headers.authorization = `Bearer ${params.accessToken}`;
        const response = await fetch(resolvedUrl, { headers });
        if (!response.ok) continue;

        const arrayBuffer = await response.arrayBuffer();
        const contentType = String(response.headers.get("content-type") ?? "").toLowerCase();
        let isPdf = contentType.includes("application/pdf") || /\.pdf(\?|$)/i.test(resolvedUrl);
        if (!isPdf && arrayBuffer.byteLength >= 4) {
          const header = new Uint8Array(arrayBuffer.slice(0, 4));
          const magic = String.fromCharCode(...header);
          isPdf = magic === "%PDF";
        }
        if (!isPdf) continue;

        seenAttachmentSources.add(sourceKey);

        pdfAttachments.push({
          name: entry.fileName || extractFileName(resolvedUrl) || "document.pdf",
          bytes: arrayBuffer,
        });
      } catch {
        // Skip attachment fetch failure, profile PDF generation should continue.
      }
    }
  }

  // ── Page numbers + footer ───────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    const footerY = pageHeight - 8;
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - doc.getTextWidth(`Page ${i} of ${totalPages}`), footerY);
    doc.text("CONFIDENTIAL — For authorised use only", margin, footerY);
  }

  const basePdfBytes = doc.output("arraybuffer");

  if (pdfAttachments.length === 0) {
    downloadPdfBlob(params.fileName, new Blob([basePdfBytes], { type: "application/pdf" }));
    return;
  }

  try {
    const { PDFDocument } = await import("pdf-lib");
    const mergedPdf = await PDFDocument.load(basePdfBytes);

    for (const attachment of pdfAttachments) {
      try {
        const sourcePdf = await PDFDocument.load(attachment.bytes);
        const indices = sourcePdf.getPageIndices();
        if (indices.length === 0) continue;
        const copiedPages = await mergedPdf.copyPages(sourcePdf, indices);
        copiedPages.forEach((p) => mergedPdf.addPage(p));
      } catch {
        // Ignore malformed/unsupported attached PDFs and continue with others.
      }
    }

    const mergedBytes = await mergedPdf.save();
    downloadPdfBlob(params.fileName, new Blob([new Uint8Array(mergedBytes)], { type: "application/pdf" }));
  } catch {
    // Fallback: return the generated profile PDF when merge dependency fails.
    downloadPdfBlob(params.fileName, new Blob([basePdfBytes], { type: "application/pdf" }));
  }
}

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */

const DEFAULT_DIRECTORY_PAGE_LIMIT = 5;

export function JobSeekerProfilePage({ forcedMode }: { forcedMode?: "self" | "directory" }) {
  const DIRECTORY_PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = forcedMode === "directory"
    ? "Job Seeker Profiles"
    : forcedMode === "self"
      ? "My Profile"
      : "Job Seeker Profile";
  const [data, setData] = useState<FullProfile | null>(null);
  const [mode, setMode] = useState<"self" | "directory" | "forbidden">("self");
  const [jobSeekers, setJobSeekers] = useState<JobSeekerListItem[]>([]);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryPageLimit, setDirectoryPageLimit] = useState(DEFAULT_DIRECTORY_PAGE_LIMIT);
  const [directoryPagination, setDirectoryPagination] = useState({
    page: 1,
    limit: DEFAULT_DIRECTORY_PAGE_LIMIT,
    total: 0,
    pages: 1,
  });
  const [directoryOverallStats, setDirectoryOverallStats] = useState({
    total: 0,
    active: 0,
    blocked: 0,
    inactive: 0,
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
    Record<string, { url: string; title: string; key?: string } | null | undefined>
  >({});

  const [directoryResumesByUserId, setDirectoryResumesByUserId] = useState<
    Record<string, DirectoryResumeBundle | undefined>
  >({});
  const [directoryPrefetchedBlobsByUserId, setDirectoryPrefetchedBlobsByUserId] = useState<
    Record<string, Record<string, PrefetchedBlobEntry>>
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
  const [downloadingSelfProfile, setDownloadingSelfProfile] = useState(false);
  const [downloadingDirectoryProfileId, setDownloadingDirectoryProfileId] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);

      if (forcedMode === "directory") {
        setMode("directory");
        setError(null);
        setSuccess(null);
        setPendingJob(null);
        setData(null);
        setJobSeekers([]);

        // Resolve permissions in the background so the page can start
        // loading directory data immediately.
        void me(accessToken)
          .then((session) => {
            const permissions: string[] = Array.isArray((session as any)?.user?.permissions)
              ? (session as any).user.permissions.map((p: unknown) => String(p))
              : [];
            const normalizedPerms = permissions.map((p) => p.toLowerCase());
            const canViewJobSeekerProfiles = normalizedPerms.some((p) =>
              [
                "view_users",
                "manage_users",
                "view_applications",
                "manage_applications",
                "view_cv_database",
              ].includes(p),
            );

            if (!canViewJobSeekerProfiles) {
              setMode("forbidden");
              setData(null);
              setError("Access denied. Required permission: VIEW_CV_DATABASE (or admin/user-management permissions).");
              return;
            }

            setDirectoryCanManageUsers(normalizedPerms.includes("manage_users"));
          })
          .catch(() => {
            setMode("forbidden");
            setData(null);
            setError("Access denied. Required permission: VIEW_CV_DATABASE (or admin/user-management permissions).");
          });
        return;
      }

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
      void normalizedRoles;
      const canApplyJob = normalizedPerms.includes("apply_job");
      const canViewJobSeekerProfiles = normalizedPerms.some((p) =>
        [
          "view_users",
          "manage_users",
          "view_applications",
          "manage_applications",
          "view_cv_database",
        ].includes(p),
      );
      setDirectoryCanManageUsers(normalizedPerms.includes("manage_users"));

      if (forcedMode === "self") {
        setMode("self");
        const [profile, selfSession] = await Promise.all([
          getFullProfile(accessToken),
          me(accessToken).catch(() => null),
        ]);
        if (!profile.personalDetails) {
          try {
            const user = (selfSession as any)?.user ?? (session as any)?.user ?? {};
            profile.personalDetails = {
              first_name: user.first_name ?? "",
              last_name: user.last_name ?? "",
            };
          } catch {
            // Best-effort fallback only.
          }
        }
        setData(profile);
        return;
      }

      if (!canApplyJob && canViewJobSeekerProfiles) {
        setMode("directory");
        setError(null);
        setSuccess(null);
        setPendingJob(null);
        setData(null);

        // Directory list is loaded via the dedicated paginated loader (page/filters).
        setJobSeekers([]);
        return;
      }

      if (!canApplyJob) {
        setMode("forbidden");
        setData(null);
        setError("Access denied. Required permission: APPLY_JOB or VIEW_CV_DATABASE (or admin/user-management permissions).");
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
  }, [accessToken, forcedMode]);

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

  const pendingJobCompanyName = useMemo(() => {
    if (!pendingJob) return "—";
    const direct = String((pendingJob as any).company ?? "").trim();
    if (direct) return direct;
    const fromCompanyName = String((pendingJob as any).company_name ?? (pendingJob as any).companyName ?? "").trim();
    if (fromCompanyName) return fromCompanyName;
    const employerCompany = String((pendingJob as any).employer_company ?? "").trim();
    if (employerCompany) return employerCompany;
    return "—";
  }, [pendingJob]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function toFileSafeName(value: string, fallback: string) {
    const cleaned = String(value ?? "")
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return cleaned || fallback;
  }

  async function onDownloadSelfFullProfile() {
    if (!accessToken || !data) return;
    try {
      setDownloadingSelfProfile(true);
      setError(null);

      const personal = (data.personalDetails ?? null) as Record<string, unknown> | null;
      const profile = (data.profile ?? null) as Record<string, unknown> | null;
      const addresses = Array.isArray(data.addresses) ? data.addresses : [];
      const education = Array.isArray(data.education) ? data.education : [];
      const experience = Array.isArray(data.experience) ? data.experience : [];
      const references = Array.isArray(data.references) ? data.references : [];

      const [docs, resumes, profilePicDataUrl] = await Promise.all([
        listMyDocuments(accessToken).catch(() => [] as UserDocument[]),
        listJobSeekerResumes(accessToken).catch(() => ({ resumes: [], primary_resume: null, total_count: 0 })),
        fetchProfilePictureDataUrl(accessToken).catch(() => null),
      ]);

      const fullName = [
        String(readProfileValue(personal, "first_name", "firstName") ?? "").trim(),
        String(readProfileValue(personal, "last_name", "lastName") ?? "").trim(),
      ]
        .filter(Boolean)
        .join(" ") || "Job Seeker";

      const email = String(readProfileValue(personal, "email") ?? "").trim();
      const phone = String(readProfileValue(personal, "phone", "contact_phone", "contactPhone") ?? "").trim();

      const resumeList = resumes.primary_resume ? [resumes.primary_resume] : [];

      await createProfilePdfReport({
        fileName: `${toFileSafeName(fullName, "job_seeker")}_full_profile.pdf`,
        fullName,
        email,
        phone,
        accessToken,
        personal,
        profile,
        addresses,
        education,
        experience,
        references,
        documents: collectProfileDocuments({
          personal,
          profile,
          education,
          docs,
          resumes: resumeList,
        }),
        profilePictureDataUrl: profilePicDataUrl ?? undefined,
      });
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to download full profile PDF");
    } finally {
      setDownloadingSelfProfile(false);
    }
  }

  async function onDownloadDirectoryFullProfile(seeker: JobSeekerListItem) {
    const userId = String(seeker.id ?? "").trim();
    if (!userId || !accessToken) return;

    try {
      setDownloadingDirectoryProfileId(userId);
      setError(null);

      let profile = directoryProfileByUserId[userId];
      if (profile === undefined) {
        profile = await getJobSeekerFullProfile(accessToken, userId);
        setDirectoryProfileByUserId((prev) => ({ ...prev, [userId]: profile ?? null }));
      }

      if (!profile) {
        throw new Error("Profile details are not available for this job seeker.");
      }

      let docs = directoryDocumentsByUserId[userId];
      if (docs === undefined) {
        docs = await listUserDocuments(accessToken, userId);
        setDirectoryDocumentsByUserId((prev) => ({ ...prev, [userId]: Array.isArray(docs) ? docs : [] }));
      }

      let resumeResult: DirectoryResumeBundle | undefined = directoryResumesByUserId[userId] as DirectoryResumeBundle | undefined;
      if (!resumeResult) {
        const fetchedResumes = await listUserResumes(accessToken, userId).catch(() => ({ primary_resume: null, resumes: [] }));
        resumeResult = fetchedResumes as DirectoryResumeBundle;
        setDirectoryResumesByUserId((prev) => ({ ...prev, [userId]: fetchedResumes as DirectoryResumeBundle }));
      }

      const profilePicDataUrl = await fetchProfilePictureDataUrl(accessToken, { userId }).catch(() => null);

      const personal = ((profile as any).personalDetails ?? null) as Record<string, unknown> | null;
      const mainProfile = ((profile as any).profile ?? null) as Record<string, unknown> | null;
      const addresses = Array.isArray((profile as any).addresses) ? ((profile as any).addresses as Record<string, unknown>[]) : [];
      const education = Array.isArray((profile as any).education) ? ((profile as any).education as Record<string, unknown>[]) : [];
      const experience = Array.isArray((profile as any).experience) ? ((profile as any).experience as Record<string, unknown>[]) : [];
      const references = Array.isArray((profile as any).references) ? ((profile as any).references as Record<string, unknown>[]) : [];

      const fullName = [
        String(readProfileValue(personal, "first_name", "firstName") ?? seeker.first_name ?? "").trim(),
        String(readProfileValue(personal, "last_name", "lastName") ?? seeker.last_name ?? "").trim(),
      ]
        .filter(Boolean)
        .join(" ") || String(seeker.email ?? "Job Seeker").trim();

      const email = String(readProfileValue(personal, "email") ?? seeker.email ?? "").trim();
      const phone = String(readProfileValue(personal, "phone", "contact_phone", "contactPhone") ?? seeker.phone ?? "").trim();

      await createProfilePdfReport({
        fileName: `${toFileSafeName(fullName, "job_seeker")}_full_profile.pdf`,
        fullName,
        email,
        phone,
        accessToken,
        personal,
        profile: mainProfile,
        addresses,
        education,
        experience,
        references,
        documents: collectProfileDocuments({
          personal,
          profile: mainProfile,
          education,
          docs: Array.isArray(docs) ? docs : [],
          resumes: resumeResult?.primary_resume ? [resumeResult.primary_resume] : [],
        }),
        profilePictureDataUrl: profilePicDataUrl ?? undefined,
      });
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to download full profile PDF");
    } finally {
      setDownloadingDirectoryProfileId((prev) => (prev === userId ? null : prev));
    }
  }

  const loadDirectory = useCallback(
    async (pageToLoad: number) => {
      if (!accessToken) return;
      try {
        setDirectoryLoading(true);
        setError(null);

        const res = await listJobSeekers(accessToken, {
          page: pageToLoad,
          limit: directoryPageLimit,
          search: directorySearch.trim() || undefined,
          status: directoryStatus || undefined,
        });

        const allSeekers = Array.isArray((res as any)?.job_seekers) ? (res as any).job_seekers : [];
        const pag = (res as any)?.pagination ?? {};

        const requestedLimit = directoryPageLimit;
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
        setDirectoryPagination({ page: 1, limit: directoryPageLimit, total: 0, pages: 1 });
        setError((e as any)?.message ?? "Failed to load job seeker profiles");
      } finally {
        setDirectoryLoading(false);
      }
    },
    [accessToken, directorySearch, directoryStatus, directoryPageLimit],
  );

  const loadDirectoryOverallStats = useCallback(async () => {
    if (!accessToken) return;
    const search = directorySearch.trim() || undefined;

    const readTotal = (payload: any): number => {
      const total = Number(payload?.pagination?.total);
      if (Number.isFinite(total) && total >= 0) return total;
      const rows = Array.isArray(payload?.job_seekers) ? payload.job_seekers.length : 0;
      return rows;
    };

    try {
      const [allRes, activeRes, blockedRes, inactiveRes] = await Promise.all([
        listJobSeekers(accessToken, { page: 1, limit: 1, search }),
        listJobSeekers(accessToken, { page: 1, limit: 1, search, status: "active" }),
        listJobSeekers(accessToken, { page: 1, limit: 1, search, status: "blocked" }),
        listJobSeekers(accessToken, { page: 1, limit: 1, search, status: "inactive" }),
      ]);

      const active = readTotal(activeRes);
      const blocked = readTotal(blockedRes);
      const inactive = readTotal(inactiveRes);
      const totalFromBreakdown = active + blocked + inactive;
      const total = Math.max(readTotal(allRes), totalFromBreakdown);

      setDirectoryOverallStats({ total, active, blocked, inactive });
    } catch {
      setDirectoryOverallStats((prev) => {
        const total = Number(directoryPagination.total ?? 0);
        if (prev.total === total && total > 0) return prev;
        return {
          total,
          active: prev.active,
          blocked: prev.blocked,
          inactive: prev.inactive,
        };
      });
    }
  }, [accessToken, directorySearch, directoryPagination.total]);

  useEffect(() => {
    if (mode !== "directory") return;
    loadDirectory(directoryPage);
  }, [directoryPage, loadDirectory, mode]);

  useEffect(() => {
    if (mode !== "directory") return;
    void loadDirectoryOverallStats();
  }, [mode, loadDirectoryOverallStats]);

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

  async function prefetchDirectoryDocumentBlobs(userId: string, docUrls: string[], token: string) {
    const normalizedUrls = Array.from(
      new Set(
        docUrls
          .map((raw) => resolveFileUrl(raw))
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
    if (!normalizedUrls.length) return;

    const existing = directoryPrefetchedBlobsByUserId[userId] ?? {};
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

    setDirectoryPrefetchedBlobsByUserId((prev) => {
      const currentByUrl = prev[userId] ?? {};
      const nextByUrl = { ...currentByUrl };
      for (const [docUrl, blobEntry] of prefetchedEntries) {
        if (Object.prototype.hasOwnProperty.call(nextByUrl, docUrl)) continue;
        nextByUrl[docUrl] = blobEntry;
      }
      return { ...prev, [userId]: nextByUrl };
    });
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
    const hasResumes = Object.prototype.hasOwnProperty.call(directoryResumesByUserId, id);
    if (hasProfile && hasDocs && hasResumes) return;

    if (!hasProfile) setDirectoryProfileByUserId((prev) => ({ ...prev, [id]: undefined }));
    if (!hasDocs) setDirectoryDocumentsByUserId((prev) => ({ ...prev, [id]: undefined }));

    // Load each resource independently so profile details can render without
    // waiting for documents/resumes to finish.
    if (!hasProfile) {
      void getJobSeekerFullProfile(accessToken, id)
        .then((profile) => {
          setDirectoryProfileByUserId((prev) => ({ ...prev, [id]: profile }));
          const profileDocuments = collectProfileDocuments({
            personal: ((profile as any)?.personalDetails ?? null) as Record<string, unknown> | null,
            profile: ((profile as any)?.profile ?? null) as Record<string, unknown> | null,
            education: Array.isArray((profile as any)?.education)
              ? ((profile as any).education as Record<string, unknown>[])
              : [],
            docs: Array.isArray(directoryDocumentsByUserId[id]) ? directoryDocumentsByUserId[id] ?? [] : [],
            resumes: Array.isArray(directoryResumesByUserId[id]?.resumes) ? directoryResumesByUserId[id]!.resumes : [],
          });
          void prefetchDirectoryDocumentBlobs(
            id,
            profileDocuments.map((entry) => entry.url),
            accessToken,
          );
        })
        .catch(() => {
          setDirectoryProfileByUserId((prev) => ({ ...prev, [id]: null }));
        });
    }

    if (!hasDocs) {
      void listUserDocuments(accessToken, id)
        .then((docs) => {
          const nextDocs = Array.isArray(docs) ? docs : [];
          setDirectoryDocumentsByUserId((prev) => ({ ...prev, [id]: nextDocs }));
          const profile = directoryProfileByUserId[id] ?? null;
          const profileDocuments = collectProfileDocuments({
            personal: ((profile as any)?.personalDetails ?? null) as Record<string, unknown> | null,
            profile: ((profile as any)?.profile ?? null) as Record<string, unknown> | null,
            education: Array.isArray((profile as any)?.education)
              ? ((profile as any).education as Record<string, unknown>[])
              : [],
            docs: nextDocs,
            resumes: Array.isArray(directoryResumesByUserId[id]?.resumes) ? directoryResumesByUserId[id]!.resumes : [],
          });
          void prefetchDirectoryDocumentBlobs(
            id,
            profileDocuments.map((entry) => entry.url),
            accessToken,
          );
        })
        .catch(() => {
          setDirectoryDocumentsByUserId((prev) => ({ ...prev, [id]: null }));
        });
    }

    if (!hasResumes) {
      void listUserResumes(accessToken, id)
        .then((resumeResult) => {
          setDirectoryResumesByUserId((prev) => ({ ...prev, [id]: resumeResult }));
          const profile = directoryProfileByUserId[id] ?? null;
          const profileDocuments = collectProfileDocuments({
            personal: ((profile as any)?.personalDetails ?? null) as Record<string, unknown> | null,
            profile: ((profile as any)?.profile ?? null) as Record<string, unknown> | null,
            education: Array.isArray((profile as any)?.education)
              ? ((profile as any).education as Record<string, unknown>[])
              : [],
            docs: Array.isArray(directoryDocumentsByUserId[id]) ? directoryDocumentsByUserId[id] ?? [] : [],
            resumes: Array.isArray(resumeResult?.resumes) ? resumeResult.resumes : [],
          });
          void prefetchDirectoryDocumentBlobs(
            id,
            profileDocuments.map((entry) => entry.url),
            accessToken,
          );
        })
        .catch(() => {
          setDirectoryResumesByUserId((prev) => ({
            ...prev,
            [id]: { primary_resume: null, resumes: [] },
          }));
        });
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
    const primaryResume = userId ? (directoryResumesByUserId[userId]?.primary_resume ?? null) : null;
    const resumeRows = userId ? (Array.isArray(directoryResumesByUserId[userId]?.resumes) ? directoryResumesByUserId[userId]!.resumes : []) : [];
    const directoryResumeList = primaryResume
      ? [primaryResume, ...resumeRows.filter((r: JobSeekerResume) => String((r as any)?.id ?? "") !== String((primaryResume as any)?.id ?? ""))]
      : resumeRows;

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
    const references = Array.isArray((profile as any)?.references) ? ((profile as any).references as any[]) : [];

    const firstName = String(readValue(personal, "first_name", "firstName") ?? seeker.first_name ?? "").trim();
    const lastName = String(readValue(personal, "last_name", "lastName") ?? seeker.last_name ?? "").trim();
    const middleName = String(readValue(personal, "middle_name", "middleName") ?? "").trim();
    const computedFullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const resolvedFullName = computedFullName || String(seeker.email ?? "—").trim() || "—";

    return (
      <div className="dropPanel">
        <h3 className="editFormTitle" style={{ marginBottom: 8 }}>Candidate Full Profile</h3>
        {profile === undefined ? (
          <div className="placeholderSpinnerWrap" role="status" aria-live="polite"><span className="placeholderSpinner" aria-hidden="true" /><span className="srOnly">Loading</span></div>
        ) : profile === null ? (
          <p className="pageText">Profile details are not available for this job seeker.</p>
        ) : (
          <>
            <div style={{ marginTop: 10 }}>
              <div className="profileSectionHeading">Personal Details</div>
              <div className="profileReadGrid" style={{ marginTop: 6 }}>
                <DirectoryProfilePicture
                  token={accessToken!}
                  userId={userId}
                  fullName={resolvedFullName}
                />
                <ReadField label="First Name" value={readValue(personal, "first_name", "firstName") ?? seeker.first_name} />
                <ReadField label="Last Name" value={readValue(personal, "last_name", "lastName") ?? seeker.last_name} />
                {middleName ? <ReadField label="Middle Name" value={middleName} /> : null}
                <ReadField label="Email" value={seeker.email} />
                <ReadField label="Phone" value={seeker.phone} />
                <ReadField label="Gender" value={readValue(personal, "gender")} />
                <ReadField label="Date of Birth" value={String(readValue(personal, "date_of_birth", "dateOfBirth") ?? "—").split("T")[0] || "—"} />
                <ReadField label="Nationality" value={readValue(personal, "nationality")} />
                <ReadField label="Marital Status" value={readValue(personal, "marital_status", "maritalStatus")} />
                <ReadField label="ID Type" value={readValue(personal, "id_type", "idType")} />
                <ReadField label="ID Number" value={readValue(personal, "id_number", "idNumber")} />
                <ReadField label="Disability Status" value={readValue(personal, "disability_status", "disabilityStatus") ? "Yes" : "No"} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="profileSectionHeading">Professional Summary</div>
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
              <div className="profileSectionHeading">Address</div>
              <div style={{ marginTop: 6 }}>
                {addresses.length === 0 ? (
                  <p className="pageText">No address records.</p>
                ) : (
                  addresses.map((address, idx) => {
                    const isPrimary = Boolean(readValue(address, "is_primary", "isPrimary"));
                    const line1 = String(readValue(address, "address_line1", "addressLine1") ?? "");
                    const line2 = String(readValue(address, "address_line2", "addressLine2") ?? "");
                    const city = String(readValue(address, "city") ?? "");
                    const state = String(readValue(address, "state") ?? "");
                    const country = String(readValue(address, "country") ?? "");
                    const postal = String(readValue(address, "postal_code", "postalCode") ?? "");
                    return (
                      <div key={`${userId}-addr-${idx}`} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: idx < addresses.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                        {isPrimary && <span className="chipBadge" style={{ marginBottom: 6, display: "inline-block" }}>Primary</span>}
                        <div className="profileReadGrid" style={{ marginTop: 0 }}>
                          {line1 ? <ReadField label="Address Line 1" value={line1} /> : null}
                          {line2 ? <ReadField label="Address Line 2" value={line2} /> : null}
                          {city ? <ReadField label="City" value={city} /> : null}
                          {state ? <ReadField label="Region / State" value={state} /> : null}
                          {country ? <ReadField label="Country" value={country} /> : null}
                          {postal ? <ReadField label="Postal Code" value={postal} /> : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="profileSectionHeading">Education</div>
              <div style={{ marginTop: 6 }}>
                {education.length === 0 ? (
                  <p className="pageText">No education records.</p>
                ) : (
                  education.map((edu, idx) => {
                    const institution = String(readValue(edu, "institution_name", "institution") ?? "—");
                    const qualification = String(readValue(edu, "qualification") ?? "");
                    const fieldOfStudy = String(readValue(edu, "field_of_study", "fieldOfStudy") ?? "");
                    const grade = String(readValue(edu, "grade") ?? "");
                    const isCurrent = Boolean(readValue(edu, "is_current", "isCurrent"));
                    const startRaw = String(readValue(edu, "start_date", "startDate") ?? "");
                    const endRaw = String(readValue(edu, "end_date", "endDate") ?? "");
                    const start = startRaw ? startRaw.split("T")[0] : "";
                    const end = isCurrent ? "Present" : (endRaw ? endRaw.split("T")[0] : "");
                    return (
                      <div key={`${userId}-edu-${idx}`} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: idx < education.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                        <div className="profileReadGrid" style={{ marginTop: 0 }}>
                          <ReadField label="Institution" value={institution} />
                          <ReadField label="Qualification" value={qualification} />
                          {fieldOfStudy ? <ReadField label="Field of Study" value={fieldOfStudy} /> : null}
                          {grade ? <ReadField label="Grade" value={grade} /> : null}
                          {start ? <ReadField label="Start Date" value={start} /> : null}
                          {end ? <ReadField label="End Date" value={end} /> : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="profileSectionHeading">Experience</div>
              <div style={{ marginTop: 6 }}>
                {experience.length === 0 ? (
                  <p className="pageText">No experience records.</p>
                ) : (
                  experience.map((exp, idx) => {
                    const jobTitle = String(readValue(exp, "job_title", "jobTitle", "position") ?? "—");
                    const companyName = String(readValue(exp, "company_name", "companyName", "company") ?? "—");
                    const employmentType = String(readValue(exp, "employment_type", "employmentType") ?? "");
                    const isCurrent = Boolean(readValue(exp, "is_current", "isCurrent"));
                    const startRaw = String(readValue(exp, "start_date", "startDate") ?? "");
                    const endRaw = String(readValue(exp, "end_date", "endDate") ?? "");
                    const start = startRaw ? startRaw.split("T")[0] : "";
                    const end = isCurrent ? "Present" : (endRaw ? endRaw.split("T")[0] : "");
                    const responsibilities = String(readValue(exp, "responsibilities", "description") ?? "");
                    return (
                      <div key={`${userId}-exp-${idx}`} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: idx < experience.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                        <div className="profileReadGrid" style={{ marginTop: 0 }}>
                          <ReadField label="Job Title" value={jobTitle} />
                          <ReadField label="Company" value={companyName} />
                          {employmentType ? <ReadField label="Employment Type" value={employmentType} /> : null}
                          {start ? <ReadField label="Start Date" value={start} /> : null}
                          {end ? <ReadField label="End Date" value={end} /> : null}
                          {responsibilities ? (
                            <div className="readFieldFull">
                              <span className="readLabel">Responsibilities</span>
                              <span className="readValue" style={{ whiteSpace: "pre-wrap" }}>{responsibilities}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="profileSectionHeading">References</div>
              <div style={{ marginTop: 6 }}>
                {references.length === 0 ? (
                  <p className="pageText">No references listed.</p>
                ) : (
                  references.map((ref, idx) => (
                    <div key={`${userId}-ref-${idx}`} className="profileReadGrid" style={{ marginBottom: 8, paddingBottom: 8, borderBottom: idx < references.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                      <ReadField label="Name" value={readValue(ref, "full_name", "fullName", "name")} />
                      <ReadField label="Relationship" value={readValue(ref, "relationship")} />
                      <ReadField label="Email" value={readValue(ref, "email")} />
                      <ReadField label="Phone" value={readValue(ref, "phone")} />
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="profileSectionHeading">Documents</div>
              <div style={{ marginTop: 8 }}>
                {(() => {
                  const unique = collectProfileDocuments({
                    personal,
                    profile: mainProfile,
                    education,
                    docs: Array.isArray(docs) ? docs : [],
                    resumes: directoryResumeList,
                  });

                  if (docs === undefined || !Object.prototype.hasOwnProperty.call(directoryResumesByUserId, userId)) {
                    return <div className="placeholderSpinnerWrap" role="status" aria-live="polite"><span className="placeholderSpinner" aria-hidden="true" /><span className="srOnly">Loading</span></div>;
                  }

                  if (docs === null) {
                    return <p className="pageText">Documents are not available for this job seeker.</p>;
                  }

                  if (unique.length === 0) {
                    return <p className="pageText">No documents uploaded.</p>;
                  }

                  return (
                    <>
                      <div className="uploadedDocsGrid" style={{ marginTop: 0 }}>
                        {unique.map((c, idx) => {
                          const prefetchedBlobKey = resolveFileUrl(c.url);
                          return (
                            <UploadedDocumentCard
                              key={`${userId}-doc-${idx}`}
                              title={c.title}
                              url={c.url}
                              token={accessToken ?? ""}
                              fallbackText="—"
                              hint={c.hint}
                              originalName={c.fileName}
                              prefetchedBlob={directoryPrefetchedBlobsByUserId[userId]?.[prefetchedBlobKey] ?? null}
                              previewKey={`${String(c.url ?? "").trim()}::${idx}`}
                              previewMode="external"
                              externalPreviewOpen={selectedPreview?.key === `${String(c.url ?? "").trim()}::${idx}`}
                              onToggleExternalPreview={(blobUrl, key) => {
                                setDirectoryDocPreviewByUserId((prev) => {
                                  const current = prev[userId];
                                  return {
                                    ...prev,
                                    [userId]: current?.key === key ? null : { url: blobUrl, title: c.title, key },
                                  };
                                });
                              }}
                            />
                          );
                        })}
                      </div>

                      {selectedPreview?.url ? (
                        <div style={{ marginTop: 10 }}>
                          <div className="readLabel">{selectedPreview.title} Preview</div>
                          <div className="uploadedDocPreview" style={{ marginTop: 6 }}>
                            {(() => {
                              const kind = getInlinePreviewKind(selectedPreview.url);
                              if (kind === "image") {
                                return (
                                  <img
                                    className="uploadedDocPreviewImage"
                                    src={selectedPreview.url}
                                    alt={selectedPreview.title}
                                  />
                                );
                              }
                              if (kind === "pdf") {
                                return (
                                  <iframe
                                    className="uploadedDocPreviewFrame"
                                    src={selectedPreview.url}
                                    title={selectedPreview.title}
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
    return [
      { label: "Total Profiles", value: Number(directoryOverallStats.total ?? 0) },
      { label: "Active", value: Number(directoryOverallStats.active ?? 0) },
      { label: "Blocked", value: Number(directoryOverallStats.blocked ?? 0) },
      { label: "Inactive", value: Number(directoryOverallStats.inactive ?? 0) },
    ];
  }, [directoryOverallStats]);

  if (loading) {
    return (
      <div className="page">
        <h1 className="pageTitle">{pageTitle}</h1>
        <div className="placeholderSpinnerWrap" role="status" aria-live="polite">
          <span className="placeholderSpinner" aria-hidden="true" />
          <span className="srOnly">Loading</span>
        </div>
      </div>
    );
  }

  if (mode === "directory") {
    return (
      <div className="page">
        <div className="profileHeader">
          <h1 className="pageTitle">Job Seeker Profiles</h1>
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

          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginLeft: "auto" }}>
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

            <div className="publicJobsPager" role="navigation" aria-label="Job seeker profiles pagination top" style={{ marginLeft: 0 }}>
              <label className="publicJobsPagerSelect">
                Records
                <select
                  className="input"
                  value={String(directoryPageLimit)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (!Number.isFinite(next) || next <= 0) return;
                    setDirectoryPage(1);
                    setDirectoryPageLimit(next);
                  }}
                  disabled={directoryLoading}
                >
                  {DIRECTORY_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
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
          </div>
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

                    <button
                      type="button"
                      className="btn btnGhost btnSm"
                      onClick={() => void onDownloadDirectoryFullProfile(seeker)}
                      disabled={Boolean(downloadingDirectoryProfileId) || directoryLoading}
                    >
                      {downloadingDirectoryProfileId === String(seeker.id)
                        ? "Preparing PDF..."
                        : "Download Full Profile"}
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

        <div className="publicJobsPager" role="navigation" aria-label="Job seeker profiles pagination" style={{ marginTop: 16, marginLeft: "auto" }}>
          <label className="publicJobsPagerSelect">
            Records
            <select
              className="input"
              value={String(directoryPageLimit)}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (!Number.isFinite(next) || next <= 0) return;
                setDirectoryPage(1);
                setDirectoryPageLimit(next);
              }}
              disabled={directoryLoading}
            >
              {DIRECTORY_PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
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
        <h1 className="pageTitle">{pageTitle}</h1>
        <p className="pageText">{error ?? "Access denied."}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <h1 className="pageTitle">{pageTitle}</h1>
        <p className="pageText">
          {error ?? "No profile data found. Please contact support."}
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="profileHeader">
        <h1 className="pageTitle">{pageTitle}</h1>
        <button
          type="button"
          className="btn btnPrimary btnSm"
          onClick={() => void onDownloadSelfFullProfile()}
          disabled={downloadingSelfProfile || saving || loading}
        >
          {downloadingSelfProfile ? "Preparing PDF..." : "Download Full Profile"}
        </button>
      </div>

      {error && <div className="errorBox">{error}</div>}
      {success && <div className="successBox">{success}</div>}

      {pendingJob ? (
        <div className="dashCard pendingApplicationCard">
          <div className="dashCardHeader">
            <h2 className="dashCardTitle">Pending Job Application</h2>
          </div>

          <div className="profileReadGrid" style={{ marginTop: 6 }}>
            <ReadField label="Job" value={pendingJob.title} />
            <div className="readField">
              <span className="readLabel">Company</span>
              <span className="readValue">
                <button
                  type="button"
                  className="linkBtn"
                  onClick={() => {
                    const companyId = String((pendingJob as any).company_id ?? "").trim();
                    if (companyId) {
                      navigate(`/app/jobs?company_id=${encodeURIComponent(companyId)}`);
                      return;
                    }
                    navigate("/app/jobs");
                  }}
                >
                  {pendingJobCompanyName}
                </button>
              </span>
            </div>
            <ReadField label="Location" value={pendingJob.location ?? "—"} />
            <ReadField
              label="Due Date"
              value={pendingJob.application_deadline ? new Date(pendingJob.application_deadline).toLocaleDateString("en-GB") : "—"}
            />
          </div>

          <div className="dashCardFooter" style={{ gap: 8 }}>
            <button
              className="btn btnPrimary pendingApplicationBtn"
              type="button"
              onClick={() => void onCompletePendingApplication()}
              disabled={applyingPending || saving}
            >
              {applyingPending ? "Applying..." : "Complete job application"}
            </button>
          </div>
        </div>
      ) : null}

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
        {activeStep === 0 && (
          <PersonalDetailsSection
            key={`step-0-${editResetToken}`}
            data={data.personalDetails}
            profilePictureUrl={String(data.profile_picture_url ?? "").trim()}
            profilePictureUpdatedAt={data.profile_picture_updated_at ?? null}
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
  profilePictureUrl,
  profilePictureUpdatedAt,
  editing,
  token,
  saving,
  setSaving,
  setError,
  setSuccess,
  reload,
}: SectionProps & {
  data: Record<string, unknown> | null;
  profilePictureUrl?: string;
  profilePictureUpdatedAt?: string | null;
}) {
  const d = data ?? {};
  const [form, setForm] = useState({
    firstName: (d.first_name as string) ?? "",
    lastName: (d.last_name as string) ?? "",
    middleName: (d.middle_name as string) ?? "",
    email: "",
    phone: "",
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
  const [docsRefreshKey, setDocsRefreshKey] = useState(0);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);

  // Original filenames from API (for display in cards)
  const [idDocOriginalName, setIdDocOriginalName] = useState("");
  const [licenseOriginalName, setLicenseOriginalName] = useState("");
  const [conductOriginalName, setConductOriginalName] = useState("");

  // Pending (staged) files — uploaded only when Save is clicked
  const [pendingIdDocFile, setPendingIdDocFile] = useState<File | null>(null);
  const [pendingIdDocLocalUrl, setPendingIdDocLocalUrl] = useState("");
  const [pendingLicenseFile, setPendingLicenseFile] = useState<File | null>(null);
  const [pendingLicenseLocalUrl, setPendingLicenseLocalUrl] = useState("");
  const [pendingConductFile, setPendingConductFile] = useState<File | null>(null);
  const [pendingConductLocalUrl, setPendingConductLocalUrl] = useState("");
  const [cvLoading, setCvLoading] = useState(false);
  const [primaryResume, setPrimaryResume] = useState<{ id: string; file_name?: string; download_url?: string; file_path?: string } | null>(null);
  const [pendingCvFile, setPendingCvFile] = useState<File | null>(null);
  const [pendingCvLocalUrl, setPendingCvLocalUrl] = useState("");
  const [selectedProfilePictureName, setSelectedProfilePictureName] = useState("");
  const [pendingProfilePictureFile, setPendingProfilePictureFile] = useState<File | null>(null);
  const pendingProfilePictureFileRef = useRef<File | null>(null);
  const [profilePictureUrlState, setProfilePictureUrlState] = useState("");
  const [profilePictureRefreshKey, setProfilePictureRefreshKey] = useState(0);
  const [externalDocPreview, setExternalDocPreview] = useState<{ url: string; title: string } | null>(null);
  const [accountContact, setAccountContact] = useState<{ email: string; phone: string }>({ email: "", phone: "" });

  const resolvedProfilePictureUrl = profilePictureUrlState;

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
    let cancelled = false;
    (async () => {
      try {
        const response = await me(token);
        if (cancelled) return;
        const user = (response as any)?.user ?? {};
        setAccountContact({
          email: String(user?.email ?? "").trim(),
          phone: String(user?.phone ?? "").trim(),
        });
        setForm((prev) => ({
          ...prev,
          email: String(user?.email ?? "").trim(),
          phone: String(user?.phone ?? "").trim(),
        }));
      } catch {
        if (cancelled) return;
        setAccountContact({ email: "", phone: "" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const nd = data ?? {};
    setForm({
      firstName: (nd.first_name as string) ?? "",
      lastName: (nd.last_name as string) ?? "",
      middleName: (nd.middle_name as string) ?? "",
      email: accountContact.email,
      phone: accountContact.phone,
      gender: (nd.gender as string) ?? "",
      dateOfBirth: (nd.date_of_birth as string)?.split("T")[0] ?? "",
      nationality: (nd.nationality as string) ?? "",
      idType: (nd.id_type as string) ?? "",
      idNumber: (nd.id_number as string) ?? "",
      idDocumentUrl: (nd.id_document_url as string) ?? "",
      maritalStatus: (nd.marital_status as string) ?? "",
      disabilityStatus: (nd.disability_status as boolean) ?? false,
    });
  }, [data, accountContact.email, accountContact.phone]);

  useEffect(() => {
    let cancelled = false;
    let objectUrlToRevoke: string | null = null;

    (async () => {
      const objectUrl = await fetchProfilePictureObjectUrl(token);
      if (!objectUrl || cancelled) {
        if (!cancelled) setProfilePictureUrlState("");
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        return;
      }

      objectUrlToRevoke = objectUrl;
      setProfilePictureUrlState((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return objectUrl;
      });
    })();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [token, profilePictureRefreshKey, profilePictureUpdatedAt, profilePictureUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setDocumentsLoading(true);
        const docs = await listMyDocuments(token);
        if (cancelled) return;
        const findDoc = (type: string) =>
          (docs ?? []).find((doc) => String(doc.document_type ?? "").trim().toLowerCase() === type);
        const licenseDoc = findDoc("license_document");
        const conductDoc = findDoc("conduct_certificate");
        const idDoc = findDoc("id_document");
        setLicenseDocumentUrl(String(licenseDoc?.download_url ?? licenseDoc?.file_url ?? "").trim());
        setConductCertificateUrl(String(conductDoc?.download_url ?? conductDoc?.file_url ?? "").trim());
        setLicenseOriginalName(String(licenseDoc?.original_name ?? "").trim());
        setConductOriginalName(String(conductDoc?.original_name ?? "").trim());
        setIdDocOriginalName(String(idDoc?.original_name ?? "").trim());
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
  }, [token, docsRefreshKey]);

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

  function stageDocument(file: File | null, type: "id" | "license" | "conduct") {
    if (!file) return;
    const fileError = validatePdfUpload(file);
    if (fileError) { setError(fileError); return; }
    setError(null);
    const localUrl = URL.createObjectURL(file);
    if (type === "id") {
      setPendingIdDocFile(file);
      setPendingIdDocLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return localUrl; });
      setFieldErrors((prev) => { const next = { ...prev }; delete next.idDocumentUrl; return next; });
    } else if (type === "license") {
      setPendingLicenseFile(file);
      setPendingLicenseLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return localUrl; });
    } else {
      setPendingConductFile(file);
      setPendingConductLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return localUrl; });
    }
  }

  function stageCv(file: File | null) {
    if (!file) return;
    const fileError = validatePdfUpload(file);
    if (fileError) { setError(fileError); return; }
    setError(null);
    const localUrl = URL.createObjectURL(file);
    setPendingCvFile(file);
    setPendingCvLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return localUrl; });
  }

  function onSelectProfilePicture(file: File | null) {
    if (!file) return;
    const imageError = validateProfilePictureUpload(file);
    if (imageError) {
      setError(imageError);
      return;
    }

    setError(null);
    setSuccess(null);
    setPendingProfilePictureFile(file);
    pendingProfilePictureFileRef.current = file;
    setSelectedProfilePictureName(file.name || "");

    // Preview locally; actual upload happens on Save Personal Details.
    const localPreview = URL.createObjectURL(file);
    setProfilePictureUrlState((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return localPreview;
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Enter a valid email address";
    }
    const phoneErr = validateInternationalPhone(form.phone, "Phone number is required");
    if (phoneErr) errs.phone = phoneErr;
    if (!form.gender) errs.gender = "Gender is required";
    if (!form.dateOfBirth) errs.dateOfBirth = "Date of birth is required";
    if (!form.nationality.trim()) errs.nationality = "Nationality is required";
    if (!form.idType) errs.idType = "ID Type is required";
    if (!form.idNumber.trim()) errs.idNumber = "ID Number is required";
    if (!form.idDocumentUrl.trim() && !pendingIdDocFile) errs.idDocumentUrl = "Identification document is required";
    if (!form.maritalStatus) errs.maritalStatus = "Marital status is required";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function onSave() {
    if (!validate()) return;

    setSaving(true);
    setError(null);
    try {
      const fileToUpload = pendingProfilePictureFileRef.current ?? pendingProfilePictureFile;
      if (fileToUpload) {
        setUploadingProfilePicture(true);
        const uploaded = await uploadProfilePicture(token, fileToUpload);
        void uploaded;
        setPendingProfilePictureFile(null);
        pendingProfilePictureFileRef.current = null;
        setSelectedProfilePictureName("");
        setProfilePictureRefreshKey((v) => v + 1);
        window.dispatchEvent(new CustomEvent("hrs:profile-picture-updated"));
      }

      // Upload staged documents
      let finalIdDocUrl = form.idDocumentUrl;
      if (pendingIdDocFile) {
        const up = await uploadJobSeekerDocument(token, pendingIdDocFile, "id_document", "Identification document", true);
        finalIdDocUrl = String(up.url ?? "").trim();
        setIdDocOriginalName(String(up.document?.original_name ?? pendingIdDocFile.name ?? "").trim());
        setPendingIdDocFile(null);
        setPendingIdDocLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
      }
      if (pendingLicenseFile) {
        const up = await uploadJobSeekerDocument(token, pendingLicenseFile, "license_document", "License", true);
        setLicenseDocumentUrl(String(up.url ?? "").trim());
        setLicenseOriginalName(String(up.document?.original_name ?? pendingLicenseFile.name ?? "").trim());
        setPendingLicenseFile(null);
        setPendingLicenseLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
      }
      if (pendingConductFile) {
        const up = await uploadJobSeekerDocument(token, pendingConductFile, "conduct_certificate", "Conduct certificate", true);
        setConductCertificateUrl(String(up.url ?? "").trim());
        setConductOriginalName(String(up.document?.original_name ?? pendingConductFile.name ?? "").trim());
        setPendingConductFile(null);
        setPendingConductLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
      }
      if (pendingCvFile) {
        const uploaded = await uploadJobSeekerResume(token, pendingCvFile, true);
        setPrimaryResume(uploaded);
        setPendingCvFile(null);
        setPendingCvLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
      }

      await updateMyAccount(token, {
        email: form.email,
        phone: form.phone.trim(),
      });
      setAccountContact({ email: form.email.trim(), phone: form.phone.trim() });

      await updatePersonalDetails(token, { ...form, idDocumentUrl: finalIdDocUrl });
      setSuccess("Personal details saved");
      setDocsRefreshKey((v) => v + 1);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setUploadingProfilePicture(false);
      setSaving(false);
    }
  }

  const currentIdDocumentUrl = String(form.idDocumentUrl ?? d.id_document_url ?? "").trim();

  useEffect(() => {
    setExternalDocPreview(null);
  }, [editing, currentIdDocumentUrl, licenseDocumentUrl, conductCertificateUrl, form.idDocumentUrl, primaryResume]);

  if (!editing) {
    return (
      <div className="editForm" style={{ marginTop: 0 }}>
        <div className="editGrid">
          <div className="field fieldFull">
            <span className="fieldLabel">Profile Picture</span>
            {resolvedProfilePictureUrl ? (
              <div className="uploadedDocPreview" style={{ marginTop: 6, maxWidth: 280 }}>
                <img
                  className="uploadedDocPreviewImage"
                  src={resolvedProfilePictureUrl}
                  alt="Profile picture"
                />
              </div>
            ) : (
              <span className="readValue">No profile picture uploaded.</span>
            )}
          </div>
          <EditField label="First Name" value={String(d.first_name ?? "")} onChange={() => {}} disabled />
          <EditField label="Last Name" value={String(d.last_name ?? "")} onChange={() => {}} disabled />
          <EditField label="Middle Name (optional)" value={String(d.middle_name ?? "")} onChange={() => {}} disabled />
          <EditField label="Email" value={accountContact.email || "-"} onChange={() => {}} disabled />
          <EditField label="Phone Number" value={accountContact.phone || "-"} onChange={() => {}} disabled />
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
                originalName={idDocOriginalName}
                token={token}
                fallbackText="No file uploaded yet."
                previewMode="external"
                externalPreviewOpen={externalDocPreview?.title === "Identification Document"}
                onToggleExternalPreview={(blobUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.title === title ? null : { url: blobUrl, title }))
                }
              />
              <UploadedDocumentCard
                title="License (Optional)"
                url={licenseDocumentUrl}
                originalName={licenseOriginalName}
                token={token}
                fallbackText="No file uploaded."
                previewMode="external"
                externalPreviewOpen={externalDocPreview?.title === "License (Optional)"}
                onToggleExternalPreview={(blobUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.title === title ? null : { url: blobUrl, title }))
                }
              />
              <UploadedDocumentCard
                title="Conduct Certificate (Optional)"
                url={conductCertificateUrl}
                originalName={conductOriginalName}
                token={token}
                fallbackText="No file uploaded."
                previewMode="external"
                externalPreviewOpen={externalDocPreview?.title === "Conduct Certificate (Optional)"}
                onToggleExternalPreview={(blobUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.title === title ? null : { url: blobUrl, title }))
                }
              />
              <UploadedDocumentCard
                title="My CV"
                url={String(primaryResume?.download_url ?? primaryResume?.file_path ?? "")}
                originalName={String(primaryResume?.file_name ?? "")}
                token={token}
                fallbackText="No CV uploaded yet."
                previewMode="external"
                externalPreviewOpen={externalDocPreview?.title === "My CV"}
                onToggleExternalPreview={(blobUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.title === title ? null : { url: blobUrl, title }))
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
                        title={externalDocPreview.title}
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
        <label className="field fieldFull">
          <span className="fieldLabel">Profile Picture</span>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const file = e.target.files?.[0] ?? null;
              onSelectProfilePicture(file);
            }}
            disabled={uploadingProfilePicture || saving}
          />
          {selectedProfilePictureName ? (
            <span className="uploadedDocCardHint" style={{ marginTop: 4, display: "inline-block" }}>
              {uploadingProfilePicture
                ? `Uploading: ${selectedProfilePictureName}`
                : `Selected: ${selectedProfilePictureName} (will upload when you click Save Personal Details)`}
            </span>
          ) : null}
          {resolvedProfilePictureUrl ? (
            <div className="uploadedDocPreview" style={{ marginTop: 6, maxWidth: 280 }}>
              <img
                className="uploadedDocPreviewImage"
                src={resolvedProfilePictureUrl}
                alt="Profile picture"
              />
            </div>
          ) : (
            <span className="uploadedDocCardHint">No profile picture uploaded yet.</span>
          )}
        </label>
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
        <EditField
          label="Email"
          value={form.email}
          onChange={(v) => set("email", v)}
          required
          error={fieldErrors.email}
        />
        <EditField
          label="Phone Number"
          value={form.phone}
          onChange={(v) => set("phone", v)}
          required
          error={fieldErrors.phone}
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
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  stageDocument(e.target.files?.[0] ?? null, "id");
                  e.currentTarget.value = "";
                }}
                disabled={saving}
                required={!form.idDocumentUrl.trim() && !pendingIdDocFile}
              />
              {pendingIdDocFile && (
                <span className="fieldHint" style={{ color: "var(--accent)" }}>
                  Selected: {pendingIdDocFile.name} — will be uploaded on Save
                </span>
              )}
              <UploadedDocumentCard
                title="Identification Document"
                url={pendingIdDocLocalUrl || form.idDocumentUrl}
                originalName={pendingIdDocFile ? pendingIdDocFile.name : idDocOriginalName}
                token={token}
                fallbackText="No file uploaded yet."
                hint={(pendingIdDocLocalUrl || form.idDocumentUrl) ? "Upload another file to replace the current one." : undefined}
                previewMode="external"
                externalPreviewOpen={externalDocPreview?.title === "Identification Document"}
                onToggleExternalPreview={(blobUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.title === title ? null : { url: blobUrl, title }))
                }
              />
              {fieldErrors.idDocumentUrl && <span className="fieldError">{fieldErrors.idDocumentUrl}</span>}
            </label>
            <label className="field">
              <span className="fieldLabel">License (Optional)</span>
              <input
                className="input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  stageDocument(e.target.files?.[0] ?? null, "license");
                  e.currentTarget.value = "";
                }}
                disabled={saving || documentsLoading}
              />
              {pendingLicenseFile && (
                <span className="fieldHint" style={{ color: "var(--accent)" }}>
                  Selected: {pendingLicenseFile.name} — will be uploaded on Save
                </span>
              )}
              <UploadedDocumentCard
                title="License (Optional)"
                url={pendingLicenseLocalUrl || licenseDocumentUrl}
                originalName={pendingLicenseFile ? pendingLicenseFile.name : licenseOriginalName}
                token={token}
                fallbackText="No file uploaded."
                hint={(pendingLicenseLocalUrl || licenseDocumentUrl) ? "Upload another file to replace the current one." : undefined}
                previewMode="external"
                externalPreviewOpen={externalDocPreview?.title === "License (Optional)"}
                onToggleExternalPreview={(blobUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.title === title ? null : { url: blobUrl, title }))
                }
              />
            </label>
            <label className="field">
              <span className="fieldLabel">Conduct Certificate (Optional)</span>
              <input
                className="input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  stageDocument(e.target.files?.[0] ?? null, "conduct");
                  e.currentTarget.value = "";
                }}
                disabled={saving || documentsLoading}
              />
              {pendingConductFile && (
                <span className="fieldHint" style={{ color: "var(--accent)" }}>
                  Selected: {pendingConductFile.name} — will be uploaded on Save
                </span>
              )}
              <UploadedDocumentCard
                title="Conduct Certificate (Optional)"
                url={pendingConductLocalUrl || conductCertificateUrl}
                originalName={pendingConductFile ? pendingConductFile.name : conductOriginalName}
                token={token}
                fallbackText="No file uploaded."
                hint={(pendingConductLocalUrl || conductCertificateUrl) ? "Upload another file to replace the current one." : undefined}
                previewMode="external"
                externalPreviewOpen={externalDocPreview?.title === "Conduct Certificate (Optional)"}
                onToggleExternalPreview={(blobUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.title === title ? null : { url: blobUrl, title }))
                }
              />
            </label>
            <label className="field">
              <span className="fieldLabel">My CV</span>
              <input
                className="input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  stageCv(e.target.files?.[0] ?? null);
                  e.currentTarget.value = "";
                }}
                disabled={saving || cvLoading}
              />
              {pendingCvFile && (
                <span className="fieldHint" style={{ color: "var(--accent)" }}>
                  Selected: {pendingCvFile.name} — will be uploaded on Save
                </span>
              )}
              <UploadedDocumentCard
                title="My CV"
                url={pendingCvLocalUrl || String(primaryResume?.download_url ?? primaryResume?.file_path ?? "")}
                originalName={pendingCvFile ? pendingCvFile.name : (primaryResume?.file_name ?? "")}
                token={token}
                fallbackText="No CV uploaded yet."
                hint={(pendingCvLocalUrl || primaryResume?.id) ? "Upload another file to replace the current CV." : undefined}
                previewMode="external"
                externalPreviewOpen={externalDocPreview?.title === "My CV"}
                onToggleExternalPreview={(blobUrl, title) =>
                  setExternalDocPreview((prev) => (prev?.title === title ? null : { url: blobUrl, title }))
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
                      title={externalDocPreview.title}
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
            <button className={editId ? "btn btnGhost btnSm stepperSaveBtn" : "btn btnPrimary btnSm addActionBtn"} onClick={onSave} disabled={saving} type="button">
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
  const [certDocPreview, setCertDocPreview] = useState<{ url: string; title: string; key: string } | null>(null);
  const [pendingCertFile, setPendingCertFile] = useState<File | null>(null);
  const [pendingCertLocalUrl, setPendingCertLocalUrl] = useState("");
  const [latestQualificationEvidence, setLatestQualificationEvidence] = useState<UserDocument | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const docs = await listMyDocuments(token, "qualification_evidence");
        if (cancelled) return;
        const sorted = (docs ?? []).slice().sort((a, b) => {
          const at = new Date(String(a.created_at ?? "")).getTime();
          const bt = new Date(String(b.created_at ?? "")).getTime();
          return (Number.isFinite(bt) ? bt : 0) - (Number.isFinite(at) ? at : 0);
        });
        setLatestQualificationEvidence(sorted[0] ?? null);
      } catch {
        if (!cancelled) setLatestQualificationEvidence(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, items]);

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
    resetCertStaging();
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

  function stageCertificate(file: File | null) {
    if (!file) return;
    const fileError = validatePdfUpload(file);
    if (fileError) { setError(fileError); return; }
    setError(null);
    const localUrl = URL.createObjectURL(file);
    setPendingCertFile(file);
    setPendingCertLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return localUrl; });
    setFieldErrors((prev) => { const next = { ...prev }; delete next.certificateUrl; return next; });
  }

  function resetCertStaging() {
    setPendingCertFile(null);
    setPendingCertLocalUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return ""; });
  }

  async function onSave() {
    const errs: Record<string, string> = {};
    if (!form.institutionName.trim()) errs.institutionName = "Institution is required";
    if (!form.qualification.trim()) errs.qualification = "Qualification is required";
    if (!form.fieldOfStudy.trim()) errs.fieldOfStudy = "Field of study is required";
    if (!form.startDate) errs.startDate = "Start date is required";
    if (!form.isCurrent && !form.endDate) errs.endDate = "End date is required";
    if (!form.grade.trim()) errs.grade = "Grade is required";
    if (!form.certificateUrl.trim() && !pendingCertFile) errs.certificateUrl = "Qualification evidence is required";

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      let certUrl = form.certificateUrl;
      if (pendingCertFile) {
        const up = await uploadJobSeekerDocument(token, pendingCertFile, "qualification_evidence", "Qualification evidence");
        certUrl = String(up.url ?? "").trim();
        resetCertStaging();
      }
      await saveEducation(token, {
        ...form,
        certificateUrl: certUrl,
      }, editId ?? undefined);
      setSuccess(editId ? "Education updated" : "Education added");
      setForm(empty);
      setEditId(null);
      setFieldErrors({});
      resetCertStaging();
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
      <>
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
          const latestCertUrl = String(
            latestQualificationEvidence?.download_url ??
            latestQualificationEvidence?.file_url ??
            "",
          ).trim();
          const latestCertOriginalName = String(latestQualificationEvidence?.original_name ?? "").trim();
          const certificateUrl = latestCertUrl || String(e.certificate_url ?? "").trim();
          const certPreviewKey = `qualification-evidence-${String(e.id ?? idx)}`;

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
                  <div className="field fieldFull">
                    <span className="fieldLabel">Qualification Evidence</span>
                    <UploadedDocumentCard
                      title="Qualification Evidence"
                      url={certificateUrl}
                      originalName={latestCertOriginalName || undefined}
                      token={token}
                      fallbackText="No file uploaded yet."
                      previewKey={certPreviewKey}
                      previewMode="external"
                      externalPreviewOpen={certDocPreview?.key === certPreviewKey}
                      onToggleExternalPreview={(blobUrl, key) =>
                        setCertDocPreview((prev) =>
                          prev?.key === key ? null : { url: blobUrl, title: "Qualification Evidence", key },
                        )
                      }
                    />
                  </div>
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
      {certDocPreview?.url ? (
        <div className="field fieldFull" style={{ marginTop: 10 }}>
          <div className="readLabel">{certDocPreview.title} Preview</div>
          <div className="uploadedDocPreview" style={{ marginTop: 6 }}>
            {(() => {
              const kind = getInlinePreviewKind(certDocPreview.url);
              if (kind === "image") return <img className="uploadedDocPreviewImage" src={certDocPreview.url} alt={certDocPreview.title} />;
              if (kind === "pdf") return <iframe className="uploadedDocPreviewFrame" src={certDocPreview.url} title={certDocPreview.title} />;
              return <span className="uploadedDocCardHint">Preview is not available for this file type. Use Download.</span>;
            })()}
          </div>
        </div>
      ) : null}
      </>
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
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  stageCertificate(e.target.files?.[0] ?? null);
                  e.currentTarget.value = "";
                }}
                disabled={saving}
                required={!form.certificateUrl.trim() && !pendingCertFile}
              />
              {pendingCertFile && (
                <span className="fieldHint" style={{ color: "var(--accent)" }}>
                  Selected: {pendingCertFile.name} — will be uploaded on Save
                </span>
              )}
              <UploadedDocumentCard
                title="Qualification Evidence"
                url={pendingCertLocalUrl || form.certificateUrl}
                token={token}
                fallbackText="No file uploaded yet."
                hint={(pendingCertLocalUrl || form.certificateUrl) ? "Upload another file to replace the current one." : undefined}
                previewKey="qualification-evidence-edit"
                previewMode="external"
                externalPreviewOpen={certDocPreview?.key === "qualification-evidence-edit"}
                onToggleExternalPreview={(blobUrl, key) =>
                  setCertDocPreview((prev) =>
                    prev?.key === key ? null : { url: blobUrl, title: "Qualification Evidence", key },
                  )
                }
              />
              {certDocPreview?.url ? (
                <div className="field fieldFull" style={{ marginTop: 6 }}>
                  <div className="readLabel">{certDocPreview.title} Preview</div>
                  <div className="uploadedDocPreview" style={{ marginTop: 4 }}>
                    {(() => {
                      const kind = getInlinePreviewKind(certDocPreview.url);
                      if (kind === "image") return <img className="uploadedDocPreviewImage" src={certDocPreview.url} alt={certDocPreview.title} />;
                      if (kind === "pdf") return <iframe className="uploadedDocPreviewFrame" src={certDocPreview.url} title={certDocPreview.title} />;
                      return <span className="uploadedDocCardHint">Preview is not available for this file type. Use Download.</span>;
                    })()}
                  </div>
                </div>
              ) : null}
              {fieldErrors.certificateUrl && <span className="fieldError">{fieldErrors.certificateUrl}</span>}
            </label>
          </div>
          <div className="stepperActions">
            {editId && (
              <button className="btn btnGhost" type="button" onClick={() => { setEditId(null); setForm(empty); setFieldErrors({}); resetCertStaging(); }}>Cancel</button>
            )}
            <button className={editId ? "btn btnGhost btnSm stepperSaveBtn" : "btn btnPrimary btnSm addActionBtn"} onClick={onSave} disabled={saving} type="button">
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
    return (
      <div className="recordList">
        {(!items || items.length === 0) ? (
          <EmptyState label="No experience records added yet." />
        ) : (
          items.map((e, idx) => {
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
          })
        )}
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
              <div className="recordActions">
                <button className="btn btnGhost btnSm" onClick={() => startEdit(e)} type="button">Edit</button>
                <button className="btn btnDanger btnSm" onClick={() => setConfirmDeleteId(e.id as string)} type="button">Delete</button>
              </div>
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

      <div className="editForm">
        <h4 className="editFormTitle">{editId ? "Edit Experience" : "Add Experience"}</h4>
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
          <button className={editId ? "btn btnGhost btnSm stepperSaveBtn" : "btn btnPrimary btnSm addActionBtn"} onClick={onSave} disabled={saving} type="button">
            {saving ? "Saving…" : editId ? "Update Experience" : "Add Experience"}
          </button>
        </div>
      </div>
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
    const phoneErr = validateInternationalPhone(form.phone, "Phone is required");
    if (phoneErr) errs.phone = phoneErr;
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
            <div className="field">
              <label className="fieldLabel">Phone</label>
              {(() => {
                const parts = splitInternationalPhone(form.phone, DEFAULT_CALLING_CODE);
                return (
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      className="input"
                      value={parts.code}
                      onChange={(e) => {
                        const nextCode = e.target.value;
                        setForm({ ...form, phone: composeInternationalPhone(nextCode, parts.local) });
                      }}
                      style={{ maxWidth: 220 }}
                    >
                      {CALLING_CODE_OPTIONS.map((option) => (
                        <option key={option.label} value={option.code}>{option.label}</option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="tel"
                      inputMode="tel"
                      value={parts.local}
                      onChange={(e) => {
                        const nextLocal = sanitizePhoneLocalInput(e.target.value, 15);
                        setForm({ ...form, phone: composeInternationalPhone(parts.code, nextLocal) });
                      }}
                    />
                  </div>
                );
              })()}
              {fieldErrors.phone ? <span className="fieldError">{fieldErrors.phone}</span> : null}
            </div>
          </div>
          <div className="stepperActions">
            {editId && (
              <button className="btn btnGhost" type="button" onClick={() => { setEditId(null); setForm(empty); setFieldErrors({}); }}>Cancel</button>
            )}
            <button className={editId ? "btn btnGhost btnSm stepperSaveBtn" : "btn btnPrimary btnSm addActionBtn"} onClick={onSave} disabled={saving} type="button">
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
