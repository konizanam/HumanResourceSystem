import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getFullProfile,
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

/* ================================================================== */
/*  Main component                                                     */
/* ================================================================== */

export function JobSeekerProfilePage() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
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

      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [accessToken, logout, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

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
        <button
          className={editing ? "btn btnGhost" : "btn btnPrimary"}
          onClick={() => {
            setEditing((v) => !v);
            clearMessages();
          }}
          type="button"
        >
          {editing ? "Cancel" : "Edit Profile"}
        </button>
      </div>

      {error && <div className="errorBox">{error}</div>}
      {success && <div className="successBox">{success}</div>}

      {/* ── Profile Stepper Nav ─────────────────── */}
      <div className="profileStepperNav">
        {PROFILE_STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            className={
              "profileStepBtn" + (i === activeStep ? " profileStepBtnActive" : "")
            }
            onClick={() => {
              setActiveStep(i);
              clearMessages();
            }}
          >
            <span className="profileStepNum">{i + 1}</span>
            {label}
          </button>
        ))}
      </div>

      {/* ── Step Content ────────────────────────── */}
      <div className="profileStepContent">
        {activeStep === 0 && (
          <PersonalDetailsSection
            data={data.personalDetails}
            editing={editing}
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
            items={data.addresses}
            editing={editing}
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
            items={data.education}
            editing={editing}
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
            items={data.experience}
            editing={editing}
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
            items={data.references}
            editing={editing}
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
            data={data.profile}
            editing={editing}
            token={accessToken!}
            saving={saving}
            setSaving={setSaving}
            setError={setError}
            setSuccess={setSuccess}
            reload={load}
          />
        )}
      </div>

      {/* ── Step Navigation ─────────────────────── */}
      <div className="stepperActions">
        {activeStep > 0 && (
          <button
            type="button"
            className="btn btnGhost"
            onClick={() => {
              setActiveStep((s) => s - 1);
              clearMessages();
            }}
          >
            Previous
          </button>
        )}
        {activeStep < PROFILE_STEPS.length - 1 && (
          <button
            type="button"
            className="btn btnPrimary"
            onClick={() => {
              setActiveStep((s) => s + 1);
              clearMessages();
            }}
          >
            Next
          </button>
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

  async function onSave() {
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
        <EditField label="First Name" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
        <EditField label="Last Name" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
        <EditField label="Middle Name" value={form.middleName} onChange={(v) => setForm({ ...form, middleName: v })} />
        <label className="field">
          <span className="fieldLabel">Gender</span>
          <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <EditField label="Date of Birth" value={form.dateOfBirth} onChange={(v) => setForm({ ...form, dateOfBirth: v })} type="date" />
        <EditField label="Nationality" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
        <EditField label="ID Type" value={form.idType} onChange={(v) => setForm({ ...form, idType: v })} />
        <EditField label="ID Number" value={form.idNumber} onChange={(v) => setForm({ ...form, idNumber: v })} />
        <label className="field">
          <span className="fieldLabel">Marital Status</span>
          <select className="input" value={form.maritalStatus} onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}>
            <option value="">Select</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </label>
        <label className="field fieldCheckbox">
          <input type="checkbox" checked={form.disabilityStatus} onChange={(e) => setForm({ ...form, disabilityStatus: e.target.checked })} />
          <span className="fieldLabel">Disability status</span>
        </label>
      </div>
      <button className="btn btnPrimary" onClick={onSave} disabled={saving} type="button">
        {saving ? "Saving…" : "Save Personal Details"}
      </button>
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

  function startEdit(item: Record<string, unknown>) {
    setEditId(item.id as string);
    setForm({
      addressLine1: (item.address_line1 as string) ?? "",
      addressLine2: (item.address_line2 as string) ?? "",
      city: (item.city as string) ?? "",
      state: (item.state as string) ?? "",
      country: (item.country as string) ?? "",
      postalCode: (item.postal_code as string) ?? "",
      isPrimary: (item.is_primary as boolean) ?? true,
    });
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await saveAddress(token, form, editId ?? undefined);
      setSuccess(editId ? "Address updated" : "Address added");
      setForm(empty);
      setEditId(null);
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
                  <button className="btn btnDanger btnSm" onClick={() => onDelete(a.id as string)} type="button">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && (
        <div className="editForm">
          <h4 className="editFormTitle">{editId ? "Edit Address" : "Add Address"}</h4>
          <div className="editGrid">
            <EditField label="Address Line 1" value={form.addressLine1} onChange={(v) => setForm({ ...form, addressLine1: v })} />
            <EditField label="Address Line 2" value={form.addressLine2} onChange={(v) => setForm({ ...form, addressLine2: v })} />
            <EditField label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
            <EditField label="State/Province" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
            <EditField label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
            <EditField label="Postal Code" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} />
          </div>
          <div className="stepperActions">
            {editId && (
              <button className="btn btnGhost" type="button" onClick={() => { setEditId(null); setForm(empty); }}>
                Cancel
              </button>
            )}
            <button className="btn btnPrimary" onClick={onSave} disabled={saving} type="button">
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

  function startEdit(item: Record<string, unknown>) {
    setEditId(item.id as string);
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
    setSaving(true);
    setError(null);
    try {
      await saveEducation(token, form, editId ?? undefined);
      setSuccess(editId ? "Education updated" : "Education added");
      setForm(empty);
      setEditId(null);
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
                  <button className="btn btnDanger btnSm" onClick={() => onDelete(e.id as string)} type="button">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && (
        <div className="editForm">
          <h4 className="editFormTitle">{editId ? "Edit Education" : "Add Education"}</h4>
          <div className="editGrid">
            <EditField label="Institution" value={form.institutionName} onChange={(v) => setForm({ ...form, institutionName: v })} />
            <EditField label="Qualification" value={form.qualification} onChange={(v) => setForm({ ...form, qualification: v })} />
            <EditField label="Field of Study" value={form.fieldOfStudy} onChange={(v) => setForm({ ...form, fieldOfStudy: v })} />
            <EditField label="Start Date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} type="date" />
            <EditField label="End Date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} type="date" />
            <EditField label="Grade" value={form.grade} onChange={(v) => setForm({ ...form, grade: v })} />
            <label className="field fieldCheckbox">
              <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} />
              <span className="fieldLabel">Currently studying here</span>
            </label>
          </div>
          <div className="stepperActions">
            {editId && (
              <button className="btn btnGhost" type="button" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</button>
            )}
            <button className="btn btnPrimary" onClick={onSave} disabled={saving} type="button">
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

  function startEdit(item: Record<string, unknown>) {
    setEditId(item.id as string);
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
    setSaving(true);
    setError(null);
    try {
      await saveExperience(token, form, editId ?? undefined);
      setSuccess(editId ? "Experience updated" : "Experience added");
      setForm(empty);
      setEditId(null);
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
                  <button className="btn btnDanger btnSm" onClick={() => onDelete(e.id as string)} type="button">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && (
        <div className="editForm">
          <h4 className="editFormTitle">{editId ? "Edit Experience" : "Add Experience"}</h4>
          <div className="editGrid">
            <EditField label="Company Name" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} />
            <EditField label="Job Title" value={form.jobTitle} onChange={(v) => setForm({ ...form, jobTitle: v })} />
            <label className="field">
              <span className="fieldLabel">Employment Type</span>
              <select className="input" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
                <option value="">Select</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Freelance">Freelance</option>
                <option value="Internship">Internship</option>
              </select>
            </label>
            <EditField label="Start Date" value={form.startDate} onChange={(v) => setForm({ ...form, startDate: v })} type="date" />
            <EditField label="End Date" value={form.endDate} onChange={(v) => setForm({ ...form, endDate: v })} type="date" />
            <label className="field fieldFull">
              <span className="fieldLabel">Responsibilities</span>
              <textarea className="input textarea" value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} rows={3} />
            </label>
            <label className="field fieldCheckbox">
              <input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} />
              <span className="fieldLabel">Currently working here</span>
            </label>
          </div>
          <div className="stepperActions">
            {editId && (
              <button className="btn btnGhost" type="button" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</button>
            )}
            <button className="btn btnPrimary" onClick={onSave} disabled={saving} type="button">
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

  function startEdit(item: Record<string, unknown>) {
    setEditId(item.id as string);
    setForm({
      fullName: (item.full_name as string) ?? "",
      relationship: (item.relationship as string) ?? "",
      company: (item.company as string) ?? "",
      email: (item.email as string) ?? "",
      phone: (item.phone as string) ?? "",
    });
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await saveReference(token, form, editId ?? undefined);
      setSuccess(editId ? "Reference updated" : "Reference added");
      setForm(empty);
      setEditId(null);
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
                  <button className="btn btnDanger btnSm" onClick={() => onDelete(r.id as string)} type="button">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && (
        <div className="editForm">
          <h4 className="editFormTitle">{editId ? "Edit Reference" : "Add Reference"}</h4>
          <div className="editGrid">
            <EditField label="Full Name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} />
            <EditField label="Relationship" value={form.relationship} onChange={(v) => setForm({ ...form, relationship: v })} />
            <EditField label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
            <EditField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <EditField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} type="tel" />
          </div>
          <div className="stepperActions">
            {editId && (
              <button className="btn btnGhost" type="button" onClick={() => { setEditId(null); setForm(empty); }}>Cancel</button>
            )}
            <button className="btn btnPrimary" onClick={onSave} disabled={saving} type="button">
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
    professionalSummary: (d.professional_summary as string) ?? "",
    fieldOfExpertise: (d.field_of_expertise as string) ?? "",
    qualificationLevel: (d.qualification_level as string) ?? "",
    yearsExperience: (d.years_experience as number) ?? 0,
  });

  useEffect(() => {
    const nd = data ?? {};
    setForm({
      professionalSummary: (nd.professional_summary as string) ?? "",
      fieldOfExpertise: (nd.field_of_expertise as string) ?? "",
      qualificationLevel: (nd.qualification_level as string) ?? "",
      yearsExperience: (nd.years_experience as number) ?? 0,
    });
  }, [data]);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await updateProfile(token, form);
      setSuccess("Professional summary saved");
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
        <ReadField label="Field of Expertise" value={d.field_of_expertise} />
        <ReadField label="Qualification Level" value={d.qualification_level} />
        <ReadField label="Years of Experience" value={d.years_experience} />
        <div className="readFieldFull">
          <span className="readLabel">Professional Summary</span>
          <span className="readValue">{(d.professional_summary as string) || "—"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="editForm">
      <div className="editGrid">
        <EditField label="Field of Expertise" value={form.fieldOfExpertise} onChange={(v) => setForm({ ...form, fieldOfExpertise: v })} />
        <label className="field">
          <span className="fieldLabel">Qualification Level</span>
          <select className="input" value={form.qualificationLevel} onChange={(e) => setForm({ ...form, qualificationLevel: e.target.value })}>
            <option value="">Select</option>
            <option value="High School">High School</option>
            <option value="Certificate">Certificate</option>
            <option value="Diploma">Diploma</option>
            <option value="Bachelor's Degree">Bachelor's Degree</option>
            <option value="Master's Degree">Master's Degree</option>
            <option value="PhD">PhD</option>
          </select>
        </label>
        <EditField
          label="Years of Experience"
          value={String(form.yearsExperience)}
          onChange={(v) => setForm({ ...form, yearsExperience: Number(v) || 0 })}
          type="number"
        />
        <label className="field fieldFull">
          <span className="fieldLabel">Professional Summary</span>
          <textarea
            className="input textarea"
            value={form.professionalSummary}
            onChange={(e) => setForm({ ...form, professionalSummary: e.target.value })}
            rows={5}
            placeholder="Describe your professional background, skills and career goals…"
          />
        </label>
      </div>
      <button className="btn btnPrimary" onClick={onSave} disabled={saving} type="button">
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="field">
      <span className="fieldLabel">{label}</span>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="emptyState">{label}</p>;
}
