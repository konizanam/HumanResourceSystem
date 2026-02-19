import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  getCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deactivateCompany,
  activateCompany,
  type Company,
} from "../api/client";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

type ModalState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; company: Company }
  | { kind: "details"; company: Company }
  | { kind: "deactivate"; company: Company }
  | { kind: "activate"; company: Company };

type CompanyForm = {
  name: string;
  industry: string;
  description: string;
  website: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  country: string;
};

const EMPTY_FORM: CompanyForm = {
  name: "",
  industry: "",
  description: "",
  website: "",
  logoUrl: "",
  contactEmail: "",
  contactPhone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  country: "",
};

function companyToForm(c: Company): CompanyForm {
  return {
    name: c.name ?? "",
    industry: c.industry ?? "",
    description: c.description ?? "",
    website: c.website ?? "",
    logoUrl: c.logo_url ?? "",
    contactEmail: c.contact_email ?? "",
    contactPhone: c.contact_phone ?? "",
    addressLine1: c.address_line1 ?? "",
    addressLine2: c.address_line2 ?? "",
    city: c.city ?? "",
    country: c.country ?? "",
  };
}

/* ================================================================== */
/*  Page component                                                     */
/* ================================================================== */

export function CompaniesPage() {
  const { accessToken, hasPermission, user } = useAuth();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modal, setModal] = useState<ModalState>({ kind: "closed" });
  const [form, setForm] = useState<CompanyForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /* ── Dropdown state ─────────────────────────────── */
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  /* ── Load companies ─────────────────────────────── */
  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCompanies(accessToken, search, statusFilter);
      setCompanies(res.companies);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Open modals ────────────────────────────────── */
  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModal({ kind: "create" });
    setOpenDropdown(null);
  }

  async function openEdit(id: string) {
    setOpenDropdown(null);
    if (!accessToken) return;
    try {
      const res = await getCompany(accessToken, id);
      setForm(companyToForm(res.company));
      setFormError(null);
      setModal({ kind: "edit", company: res.company });
    } catch {
      setError("Failed to load company details for editing.");
    }
  }

  async function openDetails(id: string) {
    setOpenDropdown(null);
    if (!accessToken) return;
    try {
      const res = await getCompany(accessToken, id);
      setModal({ kind: "details", company: res.company });
    } catch {
      setError("Failed to load company details.");
    }
  }

  function openDeactivate(company: Company) {
    setOpenDropdown(null);
    setModal(
      company.is_active
        ? { kind: "deactivate", company }
        : { kind: "activate", company }
    );
  }

  function closeModal() {
    setModal({ kind: "closed" });
    setFormError(null);
  }

  /* ── Save (create / update) ─────────────────────── */
  async function handleSave() {
    if (!accessToken) return;
    if (!form.name.trim()) {
      setFormError("Company name is required.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      if (modal.kind === "create") {
        await createCompany(accessToken, form);
        setSuccessMsg("Company created successfully.");
      } else if (modal.kind === "edit") {
        await updateCompany(accessToken, modal.company.id, form);
        setSuccessMsg("Company updated successfully.");
      }
      closeModal();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  /* ── Deactivate / activate ──────────────────────── */
  async function handleToggleActive() {
    if (!accessToken) return;
    setBusy(true);
    setFormError(null);
    try {
      if (modal.kind === "deactivate") {
        await deactivateCompany(accessToken, modal.company.id);
        setSuccessMsg("Company deactivated.");
      } else if (modal.kind === "activate") {
        await activateCompany(accessToken, modal.company.id);
        setSuccessMsg("Company activated.");
      }
      closeModal();
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }

  /* ── Helpers ────────────────────────────────────── */
  function updateForm<K extends keyof CompanyForm>(
    key: K,
    value: CompanyForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* ── Permission helpers ─────────────────────────── */
  const userRoles = user?.roles ?? [];
  const isAdmin = userRoles.includes("ADMIN");
  const isHR = userRoles.includes("HR_MANAGER");

  /** Can register / add a new company */
  const canCreate =
    isAdmin ||
    isHR ||
    hasPermission("CREATE_COMPANY") ||
    hasPermission("MANAGE_COMPANY");

  /** Can open the Edit form for a company */
  const canEdit =
    isAdmin ||
    isHR ||
    hasPermission("EDIT_COMPANY") ||
    hasPermission("MANAGE_COMPANY");

  /** Can deactivate / reactivate a company */
  const canDeactivate =
    isAdmin ||
    isHR ||
    hasPermission("DEACTIVATE_COMPANY") ||
    hasPermission("MANAGE_COMPANY");

  /* ── Clear success after 4s ─────────────────────── */
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 4000);
    return () => clearTimeout(t);
  }, [successMsg]);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="page">
      {/* ── Header ───────────────────────────────── */}
      <div className="tablePageHeader">
        <h1 className="pageTitle">Companies</h1>
        {canCreate && (
          <button className="btn btnPrimary" type="button" onClick={openCreate}>
            + Add Company
          </button>
        )}
      </div>

      {successMsg && <div className="successBox">{successMsg}</div>}
      {error && <div className="errorBox">{error}</div>}

      {/* ── Filters ──────────────────────────────── */}
      <div className="tableFilters">
        <input
          className="input tableSearch"
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input tableSelect"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Table ────────────────────────────────── */}
      {loading ? (
        <p className="pageText">Loading companies…</p>
      ) : (
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Industry</th>
                <th>City</th>
                <th>Country</th>
                <th>Status</th>
                <th className="thAction">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                    No companies found.
                  </td>
                </tr>
              ) : (
                companies.map((c) => (
                  <tr key={c.id}>
                    <td className="tdBold">{c.name}</td>
                    <td>{c.industry ?? "—"}</td>
                    <td>{c.city ?? "—"}</td>
                    <td>{c.country ?? "—"}</td>
                    <td>
                      <span
                        className={
                          c.is_active ? "statusBadge statusActive" : "statusBadge statusInactive"
                        }
                      >
                        {c.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="tdAction" ref={openDropdown === c.id ? dropdownRef : undefined}>
                      <button
                        className="btn btnSm btnGhost dropdownToggle"
                        type="button"
                        onClick={() =>
                          setOpenDropdown((prev) => (prev === c.id ? null : c.id))
                        }
                      >
                        Actions ▾
                      </button>
                      {openDropdown === c.id && (
                        <div className="dropdownMenu">
                          {canEdit && (
                            <button
                              className="dropdownItem"
                              type="button"
                              onClick={() => openEdit(c.id)}
                            >
                              Edit
                            </button>
                          )}
                          {canDeactivate && (
                            <button
                              className="dropdownItem dropdownItemDanger"
                              type="button"
                              onClick={() => openDeactivate(c)}
                            >
                              {c.is_active ? "Deactivate" : "Activate"}
                            </button>
                          )}
                          <button
                            className="dropdownItem"
                            type="button"
                            onClick={() => openDetails(c.id)}
                          >
                            Details
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================================================================ */}
      {/*  MODALS                                                          */}
      {/* ================================================================ */}

      {modal.kind !== "closed" && (
        <div className="modalOverlay" onClick={closeModal}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            {/* ── Details Modal ───────────────────── */}
            {modal.kind === "details" && (
              <>
                <div className="modalHeader">
                  <h2 className="modalTitle">Company Details</h2>
                  <button className="btn btnGhost btnSm" type="button" onClick={closeModal}>
                    ✕
                  </button>
                </div>
                <div className="modalBody">
                  <div className="profileReadGrid">
                    <ReadField label="Name" value={modal.company.name} />
                    <ReadField label="Industry" value={modal.company.industry} />
                    <ReadField label="City" value={modal.company.city} />
                    <ReadField label="Country" value={modal.company.country} />
                    <ReadField label="Website" value={modal.company.website} />
                    <ReadField label="Contact Email" value={modal.company.contact_email} />
                    <ReadField label="Contact Phone" value={modal.company.contact_phone} />
                    <ReadField
                      label="Status"
                      value={modal.company.is_active ? "Active" : "Inactive"}
                    />
                    <ReadField label="Address" value={modal.company.address_line1} full />
                    {modal.company.address_line2 && (
                      <ReadField label="Address Line 2" value={modal.company.address_line2} full />
                    )}
                    <ReadField
                      label="Description"
                      value={modal.company.description}
                      full
                    />
                    <ReadField
                      label="Created By"
                      value={modal.company.created_by_name}
                    />
                    <ReadField
                      label="Created At"
                      value={
                        modal.company.created_at
                          ? new Date(modal.company.created_at).toLocaleDateString()
                          : null
                      }
                    />
                  </div>
                </div>
                <div className="modalFooter">
                  <button className="btn btnGhost" type="button" onClick={closeModal}>
                    Close
                  </button>
                </div>
              </>
            )}

            {/* ── Create / Edit Modal ────────────── */}
            {(modal.kind === "create" || modal.kind === "edit") && (
              <>
                <div className="modalHeader">
                  <h2 className="modalTitle">
                    {modal.kind === "create" ? "New Company" : "Edit Company"}
                  </h2>
                  <button className="btn btnGhost btnSm" type="button" onClick={closeModal}>
                    ✕
                  </button>
                </div>
                <div className="modalBody">
                  {formError && <div className="errorBox">{formError}</div>}
                  <div className="editGrid">
                    <label className="field">
                      <span className="fieldLabel">Company Name *</span>
                      <input
                        className="input"
                        value={form.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        placeholder="Company name"
                        autoFocus
                      />
                    </label>
                    <label className="field">
                      <span className="fieldLabel">Industry</span>
                      <input
                        className="input"
                        value={form.industry}
                        onChange={(e) => updateForm("industry", e.target.value)}
                        placeholder="e.g. Technology"
                      />
                    </label>
                    <label className="field">
                      <span className="fieldLabel">Contact Email</span>
                      <input
                        className="input"
                        type="email"
                        value={form.contactEmail}
                        onChange={(e) => updateForm("contactEmail", e.target.value)}
                        placeholder="info@company.com"
                      />
                    </label>
                    <label className="field">
                      <span className="fieldLabel">Contact Phone</span>
                      <input
                        className="input"
                        value={form.contactPhone}
                        onChange={(e) => updateForm("contactPhone", e.target.value)}
                        placeholder="+1 234 567 890"
                      />
                    </label>
                    <label className="field">
                      <span className="fieldLabel">Website</span>
                      <input
                        className="input"
                        value={form.website}
                        onChange={(e) => updateForm("website", e.target.value)}
                        placeholder="https://company.com"
                      />
                    </label>
                    <label className="field">
                      <span className="fieldLabel">Logo URL</span>
                      <input
                        className="input"
                        value={form.logoUrl}
                        onChange={(e) => updateForm("logoUrl", e.target.value)}
                        placeholder="https://..."
                      />
                    </label>
                    <label className="field">
                      <span className="fieldLabel">Address Line 1</span>
                      <input
                        className="input"
                        value={form.addressLine1}
                        onChange={(e) => updateForm("addressLine1", e.target.value)}
                        placeholder="Street address"
                      />
                    </label>
                    <label className="field">
                      <span className="fieldLabel">Address Line 2</span>
                      <input
                        className="input"
                        value={form.addressLine2}
                        onChange={(e) => updateForm("addressLine2", e.target.value)}
                        placeholder="Suite, floor, etc."
                      />
                    </label>
                    <label className="field">
                      <span className="fieldLabel">City</span>
                      <input
                        className="input"
                        value={form.city}
                        onChange={(e) => updateForm("city", e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span className="fieldLabel">Country</span>
                      <input
                        className="input"
                        value={form.country}
                        onChange={(e) => updateForm("country", e.target.value)}
                      />
                    </label>
                    <label className="field fieldFull">
                      <span className="fieldLabel">Description</span>
                      <textarea
                        className="input textarea"
                        value={form.description}
                        onChange={(e) => updateForm("description", e.target.value)}
                        placeholder="Brief description of the company…"
                        rows={3}
                      />
                    </label>
                  </div>
                </div>
                <div className="modalFooter">
                  <button className="btn btnGhost" type="button" onClick={closeModal} disabled={busy}>
                    Cancel
                  </button>
                  <button
                    className="btn btnPrimary"
                    type="button"
                    onClick={handleSave}
                    disabled={busy}
                  >
                    {busy ? "Saving…" : modal.kind === "create" ? "Create" : "Save Changes"}
                  </button>
                </div>
              </>
            )}

            {/* ── Deactivate / Activate confirm Modal ── */}
            {(modal.kind === "deactivate" || modal.kind === "activate") && (
              <>
                <div className="modalHeader">
                  <h2 className="modalTitle">
                    {modal.kind === "deactivate"
                      ? "Deactivate Company"
                      : "Activate Company"}
                  </h2>
                  <button className="btn btnGhost btnSm" type="button" onClick={closeModal}>
                    ✕
                  </button>
                </div>
                <div className="modalBody">
                  {formError && <div className="errorBox">{formError}</div>}
                  <p className="pageText" style={{ margin: 0 }}>
                    {modal.kind === "deactivate" ? (
                      <>
                        Are you sure you want to <strong>deactivate</strong>{" "}
                        <strong>{modal.company.name}</strong>? This company will
                        no longer be visible to users.
                      </>
                    ) : (
                      <>
                        Are you sure you want to <strong>activate</strong>{" "}
                        <strong>{modal.company.name}</strong>? This company will
                        become visible to users again.
                      </>
                    )}
                  </p>
                </div>
                <div className="modalFooter">
                  <button className="btn btnGhost" type="button" onClick={closeModal} disabled={busy}>
                    Cancel
                  </button>
                  <button
                    className={
                      modal.kind === "deactivate"
                        ? "btn btnDanger"
                        : "btn btnPrimary"
                    }
                    type="button"
                    onClick={handleToggleActive}
                    disabled={busy}
                  >
                    {busy
                      ? "Processing…"
                      : modal.kind === "deactivate"
                        ? "Deactivate"
                        : "Activate"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Small helpers                                                      */
/* ================================================================== */

function ReadField({
  label,
  value,
  full,
}: {
  label: string;
  value: string | null | undefined;
  full?: boolean;
}) {
  return (
    <div className={full ? "readFieldFull" : "readField"}>
      <span className="readLabel">{label}</span>
      <span className="readValue">{value || "—"}</span>
    </div>
  );
}
