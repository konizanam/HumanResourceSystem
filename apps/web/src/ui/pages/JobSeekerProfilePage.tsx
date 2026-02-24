import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { COUNTRY_NAMES } from "../utils/countries";
import { NAMIBIA_REGIONS, NAMIBIA_TOWNS_CITIES } from "../utils/namibia";
import {
  getFullProfile,
  getIpLocation,
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

export function JobSeekerProfilePage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editResetToken, setEditResetToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const tokenRoles = useMemo(() => {
    if (!accessToken) return [] as string[];
    try {
      const [, payload] = accessToken.split(".");
      if (!payload) return [];
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      const json = atob(padded);
      const parsed = JSON.parse(json) as { roles?: unknown; role?: unknown };
      const roles = Array.isArray(parsed.roles)
        ? (parsed.roles as unknown[]).map((r) => String(r).trim().toUpperCase()).filter(Boolean)
        : [];
      if (typeof parsed.role === "string" && parsed.role.trim()) {
        roles.push(parsed.role.trim().toUpperCase());
      }
      return roles;
    } catch {
      return [];
    }
  }, [accessToken]);
  const canOpenJobSeekerProfile = tokenRoles.includes("JOB_SEEKER");

  const load = useCallback(async () => {
    if (!accessToken) return;
    if (!canOpenJobSeekerProfile) {
      setData(null);
      setLoading(false);
      setError("Access denied. This page is available for job seeker accounts.");
      return;
    }
    try {
      setLoading(true);
      const profile = await getFullProfile(accessToken);
      setData(profile);
    } catch (err) {
      const status = (err as any)?.status;
      if (status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (status === 403) {
        setError("Access denied. This page is available for job seeker accounts.");
        setData(null);
        return;
      }
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [accessToken, canOpenJobSeekerProfile, logout, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  const isEditingThisStep = editingStep === activeStep;

  if (loading) {
    return (
      <div className="page">
        <h1 className="pageTitle">Job Seeker Profile</h1>
        <p className="pageText">Loading…</p>
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
    maritalStatus: (d.marital_status as string) ?? "",
    disabilityStatus: (d.disability_status as boolean) ?? false,
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
      maritalStatus: (nd.marital_status as string) ?? "",
      disabilityStatus: (nd.disability_status as boolean) ?? false,
    });
  }, [data]);

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.gender) errs.gender = "Gender is required";
    if (!form.dateOfBirth) errs.dateOfBirth = "Date of birth is required";
    if (!form.nationality.trim()) errs.nationality = "Nationality is required";
    if (!form.idType) errs.idType = "ID Type is required";
    if (!form.idNumber.trim()) errs.idNumber = "ID Number is required";
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

  if (!editing) {
    return (
      <div className="profileReadGrid">
        <ReadField label="First Name" value={d.first_name} />
        <ReadField label="Last Name" value={d.last_name} />
        <ReadField label="Middle Name" value={d.middle_name} />
        <ReadField label="Gender" value={d.gender} />
        <ReadField label="Date of Birth" value={d.date_of_birth ? String(d.date_of_birth).split("T")[0] : ""} />
        <ReadField label="Nationality" value={d.nationality} />
        <ReadField label="ID Type" value={d.id_type} />
        <ReadField label="ID Number" value={d.id_number} />
        <ReadField label="Marital Status" value={d.marital_status} />
        <ReadField label="Disability" value={d.disability_status ? "Yes" : "No"} />
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
  };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [qualificationOpen, setQualificationOpen] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);

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
    });
  }

  async function onSave() {
    const errs: Record<string, string> = {};
    if (!form.institutionName.trim()) errs.institutionName = "Institution is required";
    if (!form.qualification.trim()) errs.qualification = "Qualification is required";
    if (!form.fieldOfStudy.trim()) errs.fieldOfStudy = "Field of study is required";
    if (!form.startDate) errs.startDate = "Start date is required";
    if (!form.isCurrent && !form.endDate) errs.endDate = "End date is required";
    if (!form.grade.trim()) errs.grade = "Grade is required";

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await saveEducation(token, form, editId ?? undefined);
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
      {!editing && items.length === 0 && <EmptyState label="No experience records added yet." />}
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
      {!editing && items.length === 0 && <EmptyState label="No references added yet." />}
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
      <div className="profileReadGrid">
        <ReadField label="Field of Expertise" value={d.field_of_expertise ?? d.fieldOfExpertise} />
        <ReadField label="Qualification Level" value={d.qualification_level ?? d.qualificationLevel} />
        <ReadField label="Years of Experience" value={d.years_experience ?? d.yearsExperience} />
        <div className="readFieldFull">
          <span className="readLabel">Professional Summary</span>
          <span className="readValue">{(d.professional_summary as string) || (d.professionalSummary as string) || "—"}</span>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  error?: string;
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
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
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
