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
import { applyAppThemeColor } from "../utils/themeColor";

function normalizeHexColor(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "#6366f1";
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#([0-9a-fA-F]{3})$/.test(withHash)) {
    const shortHex = withHash.slice(1);
    return `#${shortHex.split("").map((c) => `${c}${c}`).join("").toLowerCase()}`;
  }
  if (/^#([0-9a-fA-F]{6})$/.test(withHash)) {
    return withHash.toLowerCase();
  }
  return "#6366f1";
}

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
    logoFile: null as File | null,
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
  const [appColor, setAppColor] = useState("#6366f1");
  const canEdit = hasPermission("MANAGE_USERS");
  const canChangeAppColor = hasPermission("CHANGE_APP_COLOR");
  const canEditSystemSettings = canEdit || canChangeAppColor;
  const currentAppColor = normalizeHexColor(appColor);

  const applySelectedColor = (nextColor: string) => {
    setAppColor(nextColor);
    applyAppThemeColor(nextColor);
  };

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
            app_color: "#6366f1",
          };
        }),
      ]);
      setMode(settings.company_approval_mode);
      setSystemName(settings.system_name);
      setBrandingLogoUrl(settings.branding_logo_url);
      setAppColor(settings.app_color || "#6366f1");
      applyAppThemeColor(settings.app_color || "#6366f1");
      const firstCompany = companies[0] ?? null;
      setPrimaryCompany(firstCompany);
      setCompanyForm({
        name: firstCompany?.name ?? "",
        logoFile: null,
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
    if (!accessToken) {
      setError("You are not signed in.");
      return;
    }
    if (!canEditSystemSettings) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updates: Promise<any>[] = [];

      if (canEdit) {
        updates.push(updateCompanyApprovalMode(accessToken, mode));
      }

      const systemPayload: Partial<{ system_name: string; branding_logo_url: string; app_color: string }> = {};
      if (canEdit) {
        systemPayload.system_name = systemName;
        systemPayload.branding_logo_url = brandingLogoUrl;
      }
      if (canChangeAppColor) {
        systemPayload.app_color = appColor;
      }

      updates.push(updateSystemSettings(accessToken, systemPayload));

      const results = await Promise.all(updates);
      const updatedMode = canEdit ? (results[0] as CompanyApprovalMode) : mode;
      const updatedSettings = results[results.length - 1] as Awaited<ReturnType<typeof updateSystemSettings>>;
      setSystemName(updatedSettings.system_name);
      setBrandingLogoUrl(updatedSettings.branding_logo_url);
      setAppColor(updatedSettings.app_color || "#6366f1");
      applyAppThemeColor(updatedSettings.app_color || "#6366f1");
      setMode(updatedMode);
      setSuccess("Global settings updated.");
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to save global settings");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveCompany() {
    if (!accessToken) {
      setError("You are not signed in.");
      return;
    }
    if (!canEdit || !primaryCompany) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const updated = await updateCompany(accessToken, primaryCompany.id, {
        name: companyForm.name.trim(),
        logoFile: companyForm.logoFile,
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
        logoFile: null,
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
      {!canEditSystemSettings ? (
        <div className="pageText">You can view settings, but only users with MANAGE_USERS or CHANGE_APP_COLOR can edit.</div>
      ) : null}

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
                <span className="fieldLabel">Company Logo</span>
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
                    setCompanyForm((p) => ({ ...p, logoFile: file }));
                  }}
                  disabled={!canEdit || saving}
                />
                <p className="pageText">Leave empty to keep the current logo.</p>
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
            <span className="fieldLabel">App Color (Current: {currentAppColor})</span>
            <div style={{ display: "grid", gridTemplateColumns: "80px minmax(0, 1fr)", gap: 10, alignItems: "center" }}>
              <input
                className="input"
                type="color"
                value={currentAppColor}
                onChange={(e) => {
                  applySelectedColor(e.target.value);
                }}
                disabled={!canChangeAppColor || saving || loading}
                aria-label="Select app color"
              />
              <input
                className="input"
                value={appColor}
                onChange={(e) => {
                  const raw = e.target.value;
                  setAppColor(raw);
                  if (/^#?[0-9a-fA-F]{3}$/.test(raw) || /^#?[0-9a-fA-F]{6}$/.test(raw)) {
                    applyAppThemeColor(raw);
                  }
                }}
                disabled={!canChangeAppColor || saving || loading}
                placeholder="#6366f1"
                aria-label="App color hex code"
              />
            </div>
            <p className="pageText">Use the picker or a valid hex value (for example, #6366f1).</p>
          </div>
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
          <button className="btn btnGhost btnSm stepperSaveBtn" type="button" disabled={saving || loading || !canEditSystemSettings} onClick={onSaveSettings}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
