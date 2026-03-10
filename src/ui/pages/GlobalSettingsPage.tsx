import { useCallback, useEffect, useState } from "react";
import {
  listCompanies,
  updateCompany,
  getCompanyApprovalMode,
  getSystemSettings,
  getPublicCompanyById,
  type Company,
  type CompanyApprovalMode,
  updateCompanyApprovalMode,
  updateSystemSettings,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { applyAppThemeColor } from "../utils/themeColor";

const APPLICATION_STATUS_NOTIFICATION_OPTIONS = [
  { key: "APPLIED", label: "Applied" },
  { key: "SCREENING", label: "Screening" },
  { key: "LONG_LISTED", label: "Long Listed" },
  { key: "SHORTLISTED", label: "Shortlisted" },
  { key: "ORAL_INTERVIEW", label: "Oral Interview" },
  { key: "PRACTICAL_INTERVIEW", label: "Practical Interview" },
  { key: "FINAL_INTERVIEW", label: "Final Interview" },
  { key: "OFFER_MADE", label: "Offer Made" },
  { key: "HIRED", label: "Hired" },
  { key: "REJECTED", label: "Rejected" },
  { key: "WITHDRAWN", label: "Withdrawn" },
] as const;

const DEFAULT_APPLICATION_STATUS_NOTIFICATIONS: Record<string, boolean> =
  Object.fromEntries(APPLICATION_STATUS_NOTIFICATION_OPTIONS.map((o) => [o.key, true]));
const DEFAULT_APP_COLOR = "#6b7280";

function normalizeHexColor(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return DEFAULT_APP_COLOR;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#([0-9a-fA-F]{3})$/.test(withHash)) {
    const shortHex = withHash.slice(1);
    return `#${shortHex.split("").map((c) => `${c}${c}`).join("").toLowerCase()}`;
  }
  if (/^#([0-9a-fA-F]{6})$/.test(withHash)) {
    return withHash.toLowerCase();
  }
  return DEFAULT_APP_COLOR;
}

function resolveCompanyLogoUrl(company: Company): string {
  const id = String((company as any)?.id ?? "").trim();
  const hasLogo = Boolean((company as any)?.has_logo ?? (company as any)?.hasLogo);
  const legacy = String((company as any)?.logo_url ?? "").trim();

  if (id && hasLogo) {
    const apiUrl =
      import.meta.env.VITE_API_URL ??
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:4000");
    const apiBase = `${String(apiUrl).replace(/\/$/, "")}/api/v1`;
    return `${apiBase}/public/companies/${encodeURIComponent(id)}/logo`;
  }

  return legacy;
}

export function GlobalSettingsPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [primaryCompany, setPrimaryCompany] = useState<Company | null>(null);
  const [mainCompanyId, setMainCompanyId] = useState("");
  const [loadedMainCompanyId, setLoadedMainCompanyId] = useState<string | null>(null);
  const [existingLogoFailed, setExistingLogoFailed] = useState(false);
  const [logoCacheBuster, setLogoCacheBuster] = useState(1);
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
  const [appColor, setAppColor] = useState(DEFAULT_APP_COLOR);
  const [loginWelcomeTitle, setLoginWelcomeTitle] = useState("");
  const [loginWelcomeSubtitle, setLoginWelcomeSubtitle] = useState("");
  const [applicationStatusNotifications, setApplicationStatusNotifications] = useState<Record<string, boolean>>(
    DEFAULT_APPLICATION_STATUS_NOTIFICATIONS,
  );
  const canEdit = hasPermission("MANAGE_USERS");
  const canChangeAppColor = canEdit || hasPermission("CHANGE_APP_COLOR");
  const canEditSystemSettings = canEdit || canChangeAppColor;
  const currentAppColor = normalizeHexColor(appColor);
  const existingLogoUrl = primaryCompany ? resolveCompanyLogoUrl(primaryCompany) : "";
  const existingLogoSrc = existingLogoUrl
    ? `${existingLogoUrl}${existingLogoUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(String(logoCacheBuster))}`
    : "";

  const applySelectedColor = (nextColor: string) => {
    setAppColor(nextColor);
    applyAppThemeColor(nextColor);
  };

  const resetAppColor = () => {
    setAppColor(DEFAULT_APP_COLOR);
    applyAppThemeColor(DEFAULT_APP_COLOR);
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
            system_name: "",
            branding_logo_url: "",
            app_color: DEFAULT_APP_COLOR,
            main_company_id: null,
            application_status_notifications: DEFAULT_APPLICATION_STATUS_NOTIFICATIONS,
            login_welcome_title: "",
            login_welcome_subtitle: "",
          };
        }),
      ]);
      const preferredId = String(settings.main_company_id ?? "").trim();
      let companiesForSelection = companies;
      let selectedCompany =
        (preferredId ? companies.find((c) => String(c.id) === preferredId) : null) ?? null;

      if (preferredId && !selectedCompany) {
        try {
          const mainCompany = await getPublicCompanyById(preferredId);
          selectedCompany = mainCompany;
          companiesForSelection = [mainCompany, ...companies.filter((c) => String(c.id) !== preferredId)];
        } catch {
          // Keep list as-is and fall back below.
        }
      }

      if (!selectedCompany) {
        selectedCompany = companiesForSelection[0] ?? null;
      }

      setCompanies(companiesForSelection);
      setMode(settings.company_approval_mode);
      setAppColor(settings.app_color || DEFAULT_APP_COLOR);
      applyAppThemeColor(settings.app_color || DEFAULT_APP_COLOR);

      const nextNotifications = {
        ...DEFAULT_APPLICATION_STATUS_NOTIFICATIONS,
        ...(settings.application_status_notifications ?? {}),
      };
      setApplicationStatusNotifications(nextNotifications);
      setLoginWelcomeTitle(String(settings.login_welcome_title ?? ""));
      setLoginWelcomeSubtitle(String(settings.login_welcome_subtitle ?? ""));

      setLoadedMainCompanyId(preferredId || null);
      setMainCompanyId(selectedCompany?.id ?? "");
      setPrimaryCompany(selectedCompany);
      setExistingLogoFailed(false);
      setLogoCacheBuster(Date.now());
      setCompanyForm({
        name: selectedCompany?.name ?? "",
        logoFile: null,
        contact_email: selectedCompany?.contact_email ?? "",
        contact_phone: selectedCompany?.contact_phone ?? "",
        address_line1: selectedCompany?.address_line1 ?? "",
        address_line2: selectedCompany?.address_line2 ?? "",
        city: selectedCompany?.city ?? "",
        country: selectedCompany?.country ?? "",
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

      const systemPayload: Partial<{
        app_color: string;
        application_status_notifications: Record<string, boolean>;
        login_welcome_title: string;
        login_welcome_subtitle: string;
      }> = {};
      if (canEdit) {
        systemPayload.application_status_notifications = applicationStatusNotifications;
        systemPayload.login_welcome_title = loginWelcomeTitle.trim();
        systemPayload.login_welcome_subtitle = loginWelcomeSubtitle.trim();
      }
      if (canChangeAppColor) {
        systemPayload.app_color = appColor;
      }

      updates.push(updateSystemSettings(accessToken, systemPayload));

      const results = await Promise.all(updates);
      const updatedMode = canEdit ? (results[0] as CompanyApprovalMode) : mode;
      const updatedSettings = results[results.length - 1] as Awaited<ReturnType<typeof updateSystemSettings>>;
      setAppColor(updatedSettings.app_color || DEFAULT_APP_COLOR);
      applyAppThemeColor(updatedSettings.app_color || DEFAULT_APP_COLOR);
      setApplicationStatusNotifications({
        ...DEFAULT_APPLICATION_STATUS_NOTIFICATIONS,
        ...(updatedSettings.application_status_notifications ?? {}),
      });
      setLoginWelcomeTitle(String(updatedSettings.login_welcome_title ?? ""));
      setLoginWelcomeSubtitle(String(updatedSettings.login_welcome_subtitle ?? ""));
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

      const selectedMainId = mainCompanyId.trim();
      if (selectedMainId && selectedMainId !== loadedMainCompanyId) {
        const updatedSettings = await updateSystemSettings(accessToken, { main_company_id: selectedMainId });
        setLoadedMainCompanyId(updatedSettings.main_company_id ?? null);
      }

      const companyIdToUpdate = selectedMainId || primaryCompany.id;
      if (companyIdToUpdate !== primaryCompany.id) {
        const nextCompany = companies.find((c) => String(c.id) === String(companyIdToUpdate)) ?? null;
        setPrimaryCompany(nextCompany);
        setExistingLogoFailed(false);
      }

      const updated = await updateCompany(accessToken, companyIdToUpdate, {
        name: companyForm.name.trim(),
        logoFile: companyForm.logoFile,
        contact_email: companyForm.contact_email.trim(),
        contact_phone: companyForm.contact_phone.trim(),
        address_line1: companyForm.address_line1.trim(),
        address_line2: companyForm.address_line2.trim(),
        city: companyForm.city.trim(),
        country: companyForm.country.trim(),
      });

      setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setPrimaryCompany(updated);
      setExistingLogoFailed(false);
      setLogoCacheBuster(Date.now());
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
    <div className="page globalSettingsPage">
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
        {loading ? <div className="placeholderSpinnerWrap" role="status" aria-live="polite"><span className="placeholderSpinner" aria-hidden="true" /><span className="srOnly">Loading</span></div> : null}
        {!loading && !primaryCompany ? <div className="emptyState">No company found. Create a company first.</div> : null}
        {!loading && primaryCompany ? (
          <>
            <div className="editGrid">
              <label className="field">
                <span className="fieldLabel">Main Company</span>
                <select
                  className="input"
                  value={mainCompanyId}
                  onChange={(e) => {
                    const nextId = String(e.target.value ?? "");
                    setMainCompanyId(nextId);
                    const next = companies.find((c) => String(c.id) === nextId) ?? null;
                    setPrimaryCompany(next);
                    setExistingLogoFailed(false);
                    setLogoCacheBuster(Date.now());
                    setCompanyForm({
                      name: next?.name ?? "",
                      logoFile: null,
                      contact_email: next?.contact_email ?? "",
                      contact_phone: next?.contact_phone ?? "",
                      address_line1: next?.address_line1 ?? "",
                      address_line2: next?.address_line2 ?? "",
                      city: next?.city ?? "",
                      country: next?.country ?? "",
                    });
                  }}
                  disabled={!canEdit || saving}
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <p className="pageText">This company is used for system-wide branding/company info.</p>
              </label>
              <label className="field">
                <span className="fieldLabel">Company Name</span>
                <input className="input" value={companyForm.name} onChange={(e) => setCompanyForm((p) => ({ ...p, name: e.target.value }))} disabled={!canEdit || saving} />
              </label>
              <label className="field">
                <span className="fieldLabel">Company Logo</span>
                {existingLogoSrc && !existingLogoFailed ? (
                  <div style={{ marginBottom: 10 }}>
                    <img
                      key={existingLogoSrc}
                      src={existingLogoSrc}
                      alt="Current company logo"
                      style={{ maxWidth: "100%", height: 56, objectFit: "contain", display: "block" }}
                      onError={() => setExistingLogoFailed(true)}
                    />
                  </div>
                ) : null}
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
        <h2 className="editFormTitle">System Settings</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 16,
            alignItems: "start",
            marginTop: 12,
          }}
        >
          <section className="dashCard">
            <h3 className="editFormTitle" style={{ margin: "0 0 10px" }}>Branding</h3>
            <div className="editGrid">
              <p className="pageText" style={{ margin: 0 }}>
                App name is sourced from the Main Company name.
              </p>
            </div>
            <p className="pageText" style={{ marginTop: 8 }}>
              Branding logo is sourced from the Main Company logo.
            </p>
            <h3 className="editFormTitle" style={{ margin: "14px 0 10px" }}>App Color</h3>
            <div className="editGrid" style={{ marginBottom: 0 }}>
              <div className="field fieldFull">
                <span className="fieldLabel">Current: {currentAppColor}</span>
                <div className="appColorControls">
                  <input
                    className="input appColorPickerInput"
                    type="color"
                    value={currentAppColor}
                    onChange={(e) => applySelectedColor(e.target.value)}
                    onInput={(e) => applySelectedColor((e.target as HTMLInputElement).value)}
                    disabled={!canChangeAppColor || saving || loading}
                    aria-label="Select app color"
                  />
                  <input
                    className="input appColorHexInput"
                    value={appColor}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setAppColor(raw);
                      if (/^#?[0-9a-fA-F]{3}$/.test(raw) || /^#?[0-9a-fA-F]{6}$/.test(raw)) {
                        applyAppThemeColor(raw);
                      }
                    }}
                    disabled={!canChangeAppColor || saving || loading}
                    placeholder={DEFAULT_APP_COLOR}
                    aria-label="App color hex code"
                  />
                  <button
                    type="button"
                    className="btn btnGhost btnSm appColorResetBtn"
                    onClick={resetAppColor}
                    disabled={!canChangeAppColor || saving || loading}
                  >
                    Reset color
                  </button>
                </div>
                <p className="pageText">Use the picker or a valid hex value (for example, {DEFAULT_APP_COLOR}).</p>
                {!canChangeAppColor ? (
                  <p className="pageText">You need `MANAGE_USERS` or `CHANGE_APP_COLOR` permission to edit App Color.</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="dashCard">
            <h3 className="editFormTitle" style={{ margin: "0 0 10px" }}>Company Registration Approval</h3>
            <div className="editGrid">
              <div className="field fieldFull">
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
            </div>
          </section>

          <section className="dashCard">
            <h3 className="editFormTitle" style={{ margin: "0 0 10px" }}>Application Status Notifications</h3>
            <div className="editGrid">
              <div className="field fieldFull">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  {APPLICATION_STATUS_NOTIFICATION_OPTIONS.map((option) => (
                    <label key={option.key} className="fieldCheckbox">
                      <input
                        type="checkbox"
                        checked={applicationStatusNotifications[option.key] !== false}
                        onChange={(e) => {
                          const enabled = Boolean(e.target.checked);
                          setApplicationStatusNotifications((prev) => ({
                            ...prev,
                            [option.key]: enabled,
                          }));
                        }}
                        disabled={!canEdit || saving || loading}
                      />
                      <span className="fieldLabel">{option.label}</span>
                    </label>
                  ))}
                </div>
                <p className="pageText">Controls whether job seekers receive application update notifications per status.</p>
              </div>
            </div>
          </section>

          <section className="dashCard" style={{ gridColumn: "1 / -1" }}>
            <h3 className="editFormTitle" style={{ margin: "0 0 10px" }}>Login Welcome Content</h3>
            <div className="editGrid">
              <label className="field fieldFull">
                <span className="fieldLabel">Welcome Title</span>
                <input
                  className="input"
                  value={loginWelcomeTitle}
                  onChange={(e) => setLoginWelcomeTitle(e.target.value)}
                  disabled={!canEdit || saving || loading}
                  placeholder="Welcome to your recruitment command center"
                />
              </label>
              <label className="field fieldFull">
                <span className="fieldLabel">Welcome Subtitle</span>
                <textarea
                  className="input"
                  value={loginWelcomeSubtitle}
                  onChange={(e) => setLoginWelcomeSubtitle(e.target.value)}
                  disabled={!canEdit || saving || loading}
                  rows={3}
                  placeholder="Sign in to hire, apply, and stay updated on applications - all in one secure place."
                />
              </label>
              <div className="field fieldFull">
                <p className="pageText" style={{ margin: 0 }}>
                  If these are left blank, no welcome title/subtitle is shown on the login screen.
                </p>
              </div>
            </div>
          </section>

          <section className="dashCard" style={{ gridColumn: "1 / -1" }}>
            <h3 className="editFormTitle" style={{ margin: "0 0 10px" }}>Other Global Settings</h3>
            <div className="editGrid">
              <div className="field fieldFull">
                <p className="pageText">Email templates are managed from the Email Templates page.</p>
              </div>
            </div>
          </section>
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
