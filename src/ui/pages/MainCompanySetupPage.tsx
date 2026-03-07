import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicSetupStatus, setupMainCompany, type MainCompanySetupPayload } from "../api/client";
import {
  CALLING_CODE_OPTIONS,
  DEFAULT_CALLING_CODE,
  composeInternationalPhone,
  sanitizePhoneLocalInput,
  splitInternationalPhone,
  validateInternationalPhone,
} from "../utils/phoneCountryCodes";

type SetupFormState = MainCompanySetupPayload;

const EMPTY_FORM: SetupFormState = {
  name: "",
  industry: "",
  description: "",
  website: "",
  contact_email: "",
  contact_phone: "",
  address_line1: "",
  address_line2: "",
  city: "",
  country: "",
};

function validatePhone(raw: string): string | null {
  return validateInternationalPhone(raw, "Contact phone is required.");
}

async function waitForSetupCompletion(maxAttempts = 12, delayMs = 500): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const status = await getPublicSetupStatus();
      if (!status.setup_required) return true;
    } catch {
      // Ignore transient polling errors and retry.
    }

    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    }
  }

  return false;
}

export function MainCompanySetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SetupFormState>(EMPTY_FORM);
  const initialPhone = splitInternationalPhone(EMPTY_FORM.contact_phone ?? "", DEFAULT_CALLING_CODE);
  const [phoneCode, setPhoneCode] = useState(initialPhone.code);
  const [phoneLocal, setPhoneLocal] = useState(initialPhone.local);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const status = await getPublicSetupStatus();
        if (cancelled) return;

        if (!status.setup_required) {
          navigate("/login", { replace: true });
          return;
        }
      } catch {
        if (!cancelled) {
          setError("Failed to check setup status. Please refresh and try again.");
        }
      } finally {
        if (!cancelled) {
          setBootstrapping(false);
        }
      }
    };

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const canSubmit = useMemo(() => {
    if (busy || bootstrapping) return false;
    return (
      form.name.trim() &&
      form.industry.trim() &&
      form.description.trim() &&
      form.contact_email.trim() &&
      form.contact_phone.trim() &&
      form.address_line1.trim() &&
      form.address_line2.trim() &&
      form.city.trim() &&
      form.country.trim()
    );
  }, [busy, bootstrapping, form]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const email = form.contact_email.trim();
    const website = form.website?.trim() ?? "";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid contact email address.");
      return;
    }

    if (website && !/^https?:\/\//i.test(website)) {
      setError("Website must start with http:// or https://");
      return;
    }

    const phoneValidation = validatePhone(form.contact_phone);
    if (phoneValidation) {
      setError(phoneValidation);
      return;
    }

    setBusy(true);

    try {
      await setupMainCompany({
        name: form.name.trim(),
        industry: form.industry.trim(),
        description: form.description.trim(),
        website,
        contact_email: email,
        contact_phone: composeInternationalPhone(phoneCode, phoneLocal),
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
      });

      const completed = await waitForSetupCompletion();
      if (!completed) {
        setError("Main company was saved, but setup status is still syncing. Please wait a moment and try again.");
        return;
      }

      setSuccess("Setup completed successfully. Redirecting to login...");
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete main company setup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="loginPage authScreen">
      <div className="authWrap setupOnlyWrap">
        <div className="loginCard authPanel setupOnlyCard">
          <div className="loginHeader">
            <h1 className="loginTitle">Setup Main Company Information</h1>
            <p className="loginSubtitle">This main company becomes the default system identity.</p>
          </div>

          <form onSubmit={onSubmit} className="form" aria-busy={busy || bootstrapping}>
            <label className="field">
              <span className="fieldLabel">Company name</span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter company name"
                required
              />
            </label>

            <label className="field">
              <span className="fieldLabel">Industry</span>
              <input
                className="input"
                value={form.industry}
                onChange={(e) => setForm((prev) => ({ ...prev, industry: e.target.value }))}
                placeholder="Enter industry"
                required
              />
            </label>

            <label className="field">
              <span className="fieldLabel">Description</span>
              <textarea
                className="input"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the company"
                rows={4}
                required
              />
            </label>

            <label className="field">
              <span className="fieldLabel">Website (optional)</span>
              <input
                className="input"
                type="url"
                value={form.website}
                onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </label>

            <label className="field">
              <span className="fieldLabel">Contact email</span>
              <input
                className="input"
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                placeholder="info@company.com"
                required
              />
            </label>

            <label className="field">
              <span className="fieldLabel">Contact phone</span>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  className="input"
                  value={phoneCode}
                  onChange={(e) => {
                    const nextCode = e.target.value;
                    setPhoneCode(nextCode);
                    setForm((prev) => ({ ...prev, contact_phone: composeInternationalPhone(nextCode, phoneLocal) }));
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
                  value={phoneLocal}
                  onChange={(e) => {
                    const nextLocal = sanitizePhoneLocalInput(e.target.value, 15);
                    setPhoneLocal(nextLocal);
                    setForm((prev) => ({ ...prev, contact_phone: composeInternationalPhone(phoneCode, nextLocal) }));
                  }}
                  placeholder="Phone number"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span className="fieldLabel">Address line 1</span>
              <input
                className="input"
                value={form.address_line1}
                onChange={(e) => setForm((prev) => ({ ...prev, address_line1: e.target.value }))}
                placeholder="Street and number"
                required
              />
            </label>

            <label className="field">
              <span className="fieldLabel">Address line 2</span>
              <input
                className="input"
                value={form.address_line2}
                onChange={(e) => setForm((prev) => ({ ...prev, address_line2: e.target.value }))}
                placeholder="Area or suburb"
                required
              />
            </label>

            <label className="field">
              <span className="fieldLabel">City</span>
              <input
                className="input"
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                placeholder="City"
                required
              />
            </label>

            <label className="field">
              <span className="fieldLabel">Country</span>
              <input
                className="input"
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                placeholder="Country"
                required
              />
            </label>

            {error ? (
              <div className="errorBox" role="alert" aria-live="assertive">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="hintBox" role="status" aria-live="polite">
                {success}
              </div>
            ) : null}

            <button className="btn btnPrimary" type="submit" disabled={!canSubmit}>
              {busy ? "Saving..." : "Complete Setup"}
            </button>
          </form>

          <div className="loginFooter">
            Already configured?{" "}
            <Link to="/login" className="linkBtn">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
