import { useCallback, useEffect, useState } from "react";
import {
  listCompanies,
  updateCompany,
  getCompanyApprovalMode,
  getSystemSettings,
  type Company,
  type CompanyApprovalMode,
  updateCompanyApprovalMode,
  updateSystemSettings,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

export function GlobalSettingsPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [primaryCompany, setPrimaryCompany] = useState<Company | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    logo_url: "",
    contact_email: "",
    contact_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    country: "",
  });
  const [mode, setMode] = useState<CompanyApprovalMode>("auto_approved");
  const [systemName, setSystemName] = useState("Human Resource System");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState("");
  const canEdit = hasPermission("MANAGE_USERS");

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const [companies, settings] = await Promise.all([
        listCompanies(accessToken),
        getSystemSettings(accessToken).catch(async () => {
          const fallbackMode = await getCompanyApprovalMode(accessToken);
          return {
            company_approval_mode: fallbackMode,
            system_name: "Human Resource System",
            branding_logo_url: "",
          };
        }),
      ]);
      setMode(settings.company_approval_mode);
      setSystemName(settings.system_name);
      setBrandingLogoUrl(settings.branding_logo_url);
      const firstCompany = companies[0] ?? null;
      setPrimaryCompany(firstCompany);
      setCompanyForm({
        name: firstCompany?.name ?? "",
        logo_url: firstCompany?.logo_url ?? "",
        contact_email: firstCompany?.contact_email ?? "",
        contact_phone: firstCompany?.contact_phone ?? "",
        address_line1: firstCompany?.address_line1 ?? "",
        address_line2: firstCompany?.address_line2 ?? "",
        city: firstCompany?.city ?? "",
        country: firstCompany?.country ?? "",
      });
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load global settings");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSaveSettings() {
    if (!accessToken || !canEdit) return;
    try {
      setSaving(true);
      setError(null);
      const [updatedMode, updatedSettings] = await Promise.all([
        updateCompanyApprovalMode(accessToken, mode),
        updateSystemSettings(accessToken, {
          system_name: systemName,
          branding_logo_url: brandingLogoUrl,
        }),
      ]);
      setSystemName(updatedSettings.system_name);
      setBrandingLogoUrl(updatedSettings.branding_logo_url);
      setMode(updatedMode);
      setSuccess("Global settings updated.");
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to save global settings");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveCompany() {
    if (!accessToken || !canEdit || !primaryCompany) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await updateCompany(accessToken, primaryCompany.id, {
        name: companyForm.name.trim(),
        logo_url: companyForm.logo_url.trim(),
        contact_email: companyForm.contact_email.trim(),
        contact_phone: companyForm.contact_phone.trim(),
        address_line1: companyForm.address_line1.trim(),
        address_line2: companyForm.address_line2.trim(),
        city: companyForm.city.trim(),
        country: companyForm.country.trim(),
      });
      setPrimaryCompany(updated);
      setCompanyForm({
        name: updated.name ?? "",
        logo_url: updated.logo_url ?? "",
        contact_email: updated.contact_email ?? "",
        contact_phone: updated.contact_phone ?? "",
        address_line1: updated.address_line1 ?? "",
        address_line2: updated.address_line2 ?? "",
        city: updated.city ?? "",
        country: updated.country ?? "",
      });
      setSuccess("Primary company information updated.");
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to save company information");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Global Settings</h1>
      </div>

      {error ? <div className="errorBox">{error}</div> : null}
      {success ? <div className="successBox">{success}</div> : null}
      {!canEdit ? <div className="pageText">You can view settings, but only users with MANAGE_USERS can edit.</div> : null}

      <div className="dropPanel">
        <h2 className="editFormTitle">Main Company Information</h2>
        {loading ? <p className="pageText">Loading...</p> : null}
        {!loading && !primaryCompany ? <div className="emptyState">No company found. Create a company first.</div> : null}
        {!loading && primaryCompany ? (
          <>
            <div className="editGrid">
              <label className="field">
                <span className="fieldLabel">Company Name</span>
                <input className="input" value={companyForm.name} onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))} disabled={!canEdit || saving} />
              </label>
              <label className="field">
                <span className="fieldLabel">Logo URL</span>
                <input className="input" value={companyForm.logo_url} onChange={(e) => setCompanyForm((p) => ({ ...p, logo_url: e.target.value }))} disabled={!canEdit || saving} />
              </label>
              <label className="field">
                <span className="fieldLabel">Contact Email</span>
                <input className="input" value={companyForm.contact_email} onChange={(e) => setCompanyForm((p) => ({ ...p, contact_email: e.target.value }))} disabled={!canEdit || saving} />
              </label>
              <label className="field">
                <span className="fieldLabel">Phone</span>
                <input className="input" value={companyForm.contact_phone} onChange={(e) => setCompanyForm((p) => ({ ...p, contact_phone: e.target.value }))} disabled={!canEdit || saving} />
              </label>
              <label className="field">
                <span className="fieldLabel">Address Line 1</span>
                <input className="input" value={companyForm.address_line1} onChange={(e) => setCompanyForm((p) => ({ ...p, address_line1: e.target.value }))} disabled={!canEdit || saving} />
              </label>
              <label className="field">
                <span className="fieldLabel">Address Line 2</span>
                <input className="input" value={companyForm.address_line2} onChange={(e) => setCompanyForm((p) => ({ ...p, address_line2: e.target.value }))} disabled={!canEdit || saving} />
              </label>
              <label className="field">
                <span className="fieldLabel">City</span>
                <input className="input" value={companyForm.city} onChange={(e) => setCompanyForm((p) => ({ ...p, city: e.target.value }))} disabled={!canEdit || saving} />
              </label>
              <label className="field">
                <span className="fieldLabel">Country</span>
                <input className="input" value={companyForm.country} onChange={(e) => setCompanyForm((p) => ({ ...p, country: e.target.value }))} disabled={!canEdit || saving} />
              </label>
            </div>
            <div className="stepperActions">
              <button className="btn btnGhost btnSm stepperSaveBtn" type="button" disabled={saving || !canEdit} onClick={onSaveCompany}>
                {saving ? "Saving..." : "Save Company Info"}
              </button>
            </div>
          </>
        ) : null}
      </div>

      <div className="dropPanel">
        <h2 className="editFormTitle">System & Approval Settings</h2>
        <div className="editGrid">
          <label className="field">
            <span className="fieldLabel">System Name / Branding</span>
            <input className="input" value={systemName} onChange={(e) => setSystemName(e.target.value)} disabled={!canEdit || saving || loading} />
          </label>
          <label className="field">
            <span className="fieldLabel">Branding Logo URL</span>
            <input className="input" value={brandingLogoUrl} onChange={(e) => setBrandingLogoUrl(e.target.value)} disabled={!canEdit || saving || loading} />
          </label>
          <div className="field fieldFull">
            <span className="fieldLabel">Company Approval Mode</span>
            <div style={{ display: "grid", gap: 10 }}>
              <label className="fieldCheckbox">
                <input
                  type="radio"
                  name="company-approval-mode"
                  checked={mode === "auto_approved"}
                  onChange={() => setMode("auto_approved")}
                  disabled={!canEdit || saving || loading}
                />
                <span className="fieldLabel">auto_approved</span>
              </label>
              <label className="fieldCheckbox">
                <input
                  type="radio"
                  name="company-approval-mode"
                  checked={mode === "pending"}
                  onChange={() => setMode("pending")}
                  disabled={!canEdit || saving || loading}
                />
                <span className="fieldLabel">pending</span>
              </label>
            </div>
          </div>
          <div className="field fieldFull">
            <span className="fieldLabel">Other Global Settings</span>
            <p className="pageText">Email templates are managed from the Email Templates page.</p>
          </div>
        </div>
        <div className="stepperActions">
          <button className="btn btnGhost btnSm stepperSaveBtn" type="button" disabled={saving || loading || !canEdit} onClick={onSaveSettings}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
