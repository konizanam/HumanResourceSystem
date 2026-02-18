import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { register } from "../api/client";

const STEPS = [
  { label: "Name", icon: "1" },
  { label: "Account", icon: "2" },
  { label: "Security", icon: "3" },
  { label: "Confirm", icon: "4" },
] as const;

type FormData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const INITIAL: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function SignupPage() {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  /* ── Per-step validation ──────────────────────────── */

  function validateStep(): boolean {
    const errs: Record<string, string> = {};

    if (step === 0) {
      if (!form.firstName.trim()) errs.firstName = "First name is required";
      if (!form.lastName.trim()) errs.lastName = "Last name is required";
    }

    if (step === 1) {
      if (!form.email.trim()) errs.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        errs.email = "Invalid email format";
    }

    if (step === 2) {
      if (form.password.length < 8)
        errs.password = "At least 8 characters";
      else if (
        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/.test(
          form.password
        )
      )
        errs.password =
          "Must include upper, lower, number & special character";

      if (form.confirmPassword !== form.password)
        errs.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function onNext() {
    setError(null);
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function onBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // on last step, submit
    if (step < STEPS.length - 1) {
      onNext();
      return;
    }

    setBusy(true);
    try {
      const result = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      setSession(result.accessToken, result.user.email);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  /* ── Step renderers ───────────────────────────────── */

  function renderStepContent() {
    switch (step) {
      case 0:
        return (
          <>
            <label className="field">
              <span className="fieldLabel">First Name</span>
              <input
                className="input"
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Enter your first name"
                autoFocus
              />
              {fieldErrors.firstName && (
                <span className="fieldError">{fieldErrors.firstName}</span>
              )}
            </label>
            <label className="field">
              <span className="fieldLabel">Last Name</span>
              <input
                className="input"
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Enter your last name"
              />
              {fieldErrors.lastName && (
                <span className="fieldError">{fieldErrors.lastName}</span>
              )}
            </label>
          </>
        );

      case 1:
        return (
          <label className="field">
            <span className="fieldLabel">Email Address</span>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
            />
            {fieldErrors.email && (
              <span className="fieldError">{fieldErrors.email}</span>
            )}
          </label>
        );

      case 2:
        return (
          <>
            <label className="field">
              <span className="fieldLabel">Password</span>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="Min 8 chars, upper, lower, number, special"
                autoComplete="new-password"
                autoFocus
              />
              {fieldErrors.password && (
                <span className="fieldError">{fieldErrors.password}</span>
              )}
            </label>
            <label className="field">
              <span className="fieldLabel">Confirm Password</span>
              <input
                className="input"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set("confirmPassword", e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword && (
                <span className="fieldError">
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </label>
          </>
        );

      case 3:
        return (
          <div className="confirmSection">
            <h3 className="confirmTitle">Review Your Information</h3>
            <div className="confirmGrid">
              <div className="confirmItem">
                <span className="confirmLabel">Name</span>
                <span className="confirmValue">
                  {form.firstName} {form.lastName}
                </span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Email</span>
                <span className="confirmValue">{form.email}</span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Password</span>
                <span className="confirmValue">{"•".repeat(form.password.length)}</span>
              </div>
              <div className="confirmItem">
                <span className="confirmLabel">Role</span>
                <span className="confirmValue chipBadge">Job Seeker</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="loginPage">
      <div className="loginCard signupCard">
        <div className="loginHeader">
          <div className="loginLogo">
            <img src="/hito-logo.png" alt="Hito HR Logo" className="loginLogoImg" />
          </div>
          <div className="loginTitle">Create Account</div>
          <div className="loginSubtitle">Sign up as a Job Seeker</div>
        </div>

        {/* ── Stepper ─────────────────────────────── */}
        <div className="stepper">
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={
                "stepperItem" +
                (i === step ? " stepperActive" : "") +
                (i < step ? " stepperDone" : "")
              }
            >
              <div className="stepperCircle">
                {i < step ? (
                  <svg viewBox="0 0 20 20" className="stepperCheck">
                    <path d="M6 10l3 3 5-6" />
                  </svg>
                ) : (
                  s.icon
                )}
              </div>
              <span className="stepperLabel">{s.label}</span>
              {i < STEPS.length - 1 && <div className="stepperLine" />}
            </div>
          ))}
        </div>

        <form onSubmit={onSubmit} className="form">
          {renderStepContent()}

          {error && <div className="errorBox">{error}</div>}

          <div className="stepperActions">
            {step > 0 && (
              <button
                type="button"
                className="btn btnGhost"
                onClick={onBack}
                disabled={busy}
              >
                Back
              </button>
            )}
            <button
              type="submit"
              className="btn btnPrimary stepperNextBtn"
              disabled={busy}
            >
              {busy
                ? "Creating account…"
                : step === STEPS.length - 1
                  ? "Create Account"
                  : "Continue"}
            </button>
          </div>
        </form>

        <div className="loginFooter">
          Already have an account?{" "}
          <Link to="/login" className="linkBtn">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
