import { useCallback, useEffect, useState } from "react";
import {
  getCompanyApprovalMode,
  type CompanyApprovalMode,
  updateCompanyApprovalMode,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function GlobalSettingsPage() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<CompanyApprovalMode>("auto_approved");

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const value = await getCompanyApprovalMode(accessToken);
      setMode(value);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load global settings");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    if (!accessToken) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await updateCompanyApprovalMode(accessToken, mode);
      setMode(updated);
      setSuccess("Company approval mode updated.");
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to save global settings");
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

      <div className="dropPanel">
        <h2 className="editFormTitle">Company Approval</h2>
        {loading ? <p className="pageText">Loading...</p> : null}
        <div style={{ display: "grid", gap: 10 }}>
          <label className="fieldCheckbox">
            <input
              type="radio"
              name="company-approval-mode"
              checked={mode === "auto_approved"}
              onChange={() => setMode("auto_approved")}
            />
            <span className="fieldLabel">Auto approved</span>
          </label>
          <label className="fieldCheckbox">
            <input
              type="radio"
              name="company-approval-mode"
              checked={mode === "pending"}
              onChange={() => setMode("pending")}
            />
            <span className="fieldLabel">Pending approval</span>
          </label>
        </div>

        <div className="stepperActions">
          <button
            className="btn btnGhost btnSm stepperSaveBtn"
            type="button"
            disabled={saving || loading}
            onClick={onSave}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
