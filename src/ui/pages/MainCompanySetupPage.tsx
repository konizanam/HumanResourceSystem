import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPublicSetupStatus, setupMainCompany, type MainCompanySetupPayload } from "../api/client";

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

function sanitizePhoneInput(raw: string): string {
  let value = raw.replace(/[^\d+\s]/g, "");
  value = value.replace(/\+(?=.)/g, (match, offset) => (offset === 0 ? match : ""));
  value = value.replace(/\s+/g, " ").trimStart();

  let digitCount = 0;
  let out = "";

  for (const char of value) {
    if (char >= "0" && char <= "9") {
      if (digitCount >= 13) continue;
      digitCount += 1;
      out += char;
      continue;
    }

    if (char === "+") {
      if (out.length === 0) out += char;
      continue;
    }

    if (char === " ") {
      if (out.length > 0 && out[out.length - 1] !== " ") {
        out += char;
      }
    }
  }

  return out;
}

function validatePhone(raw: string): string | null {
  const cleaned = sanitizePhoneInput(raw).trim();
  if (!cleaned) return "Contact phone is required.";

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length > 13) return "Phone number must not exceed 13 digits.";
  if (!digits.startsWith("264")) return "Phone number must start with +264.";
  return null;
}

export function MainCompanySetupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SetupFormState>(EMPTY_FORM);
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
        contact_phone: sanitizePhoneInput(form.contact_phone).trim(),
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim(),
        city: form.city.trim(),
        country: form.country.trim(),
      });

      setSuccess("Setup completed successfully. Redirecting to login...");
      window.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete main company setup");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="loginPage authScreen">
      <div className="authWrap">
        <aside className="authVisual" aria-hidden="true">
          <div className="authVisualBadge">System Setup</div>
          <h2 className="authVisualTitle">Setup Main Company Information</h2>
          <p className="authVisualText">
            Complete this one-time setup before users can sign in.
          </p>
          <div className="authVisualMeta">Initial Configuration</div>
        </aside>

        <div className="loginCard authPanel">
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
              <input
                className="input"
                value={form.contact_phone}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contact_phone: sanitizePhoneInput(e.target.value) }))
                }
                placeholder="+264 61 123 4567"
                required
              />
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
