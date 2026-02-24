import { type FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/client";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordChecks = useMemo(() => {
    return {
      minLength: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&#]/.test(password),
    };
  }, [password]);

  const allChecksPassed =
    passwordChecks.minLength &&
    passwordChecks.upper &&
    passwordChecks.lower &&
    passwordChecks.number &&
    passwordChecks.special;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing reset token. Please use the link from your email.");
      return;
    }

    if (!allChecksPassed) {
      setError("Password does not meet the requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await resetPassword(token, password, confirmPassword);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Password reset failed. The link may have expired."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="loginPage">
        <div className="loginCard">
          <div className="loginHeader">
            <div className="loginLogo">
              <img src="/hito-logo.png" alt="Hito HR Logo" className="loginLogoImg" />
            </div>
            <div className="loginTitle">Invalid Link</div>
          </div>
          <div className="errorBox">
            This reset link is invalid or has expired. Please request a new one.
          </div>
          <div className="loginFooter">
            <Link to="/login" className="linkBtn">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="loginPage">
        <div className="loginCard">
          <div className="loginHeader">
            <div className="loginLogo">
              <img src="/hito-logo.png" alt="Hito HR Logo" className="loginLogoImg" />
            </div>
            <div className="loginTitle">Password Reset</div>
          </div>
          <div className="hintBox" role="note">
            Your password has been reset successfully. You can now sign in with your new password.
          </div>
          <div className="loginFooter">
            <Link to="/login" className="btn btnPrimary" style={{ textDecoration: "none", textAlign: "center" }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginHeader">
          <div className="loginLogo">
            <img src="/hito-logo.png" alt="Hito HR Logo" className="loginLogoImg" />
          </div>
          <div className="loginTitle">Reset Password</div>
        </div>

        <form onSubmit={onSubmit} className="form">
          <label className="field">
            <span className="fieldLabel">New Password</span>
            <div className="inputWithIcon">
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, upper, lower, number, special"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="inputIconBtn"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
              >
                <svg className="icon" viewBox="0 0 24 24" aria-hidden>
                  {showPassword ? (
                    <>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <path d="M4 4 20 20" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            {password.length > 0 && (
              <ul className="passwordRules" aria-label="Password requirements">
                {(
                  [
                    [passwordChecks.minLength, "At least 8 characters"],
                    [passwordChecks.upper, "Contains an uppercase letter"],
                    [passwordChecks.lower, "Contains a lowercase letter"],
                    [passwordChecks.number, "Contains a number"],
                    [passwordChecks.special, "Contains a special character (@$!%*?&#)"],
                  ] as [boolean, string][]
                ).map(([met, label]) => (
                  <li
                    key={label}
                    className={met ? "passwordRule passwordRuleMet" : "passwordRule passwordRuleUnmet"}
                  >
                    <span className="passwordRuleIcon" aria-hidden>
                      {met ? "✓" : "✕"}
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            )}
          </label>

          <label className="field">
            <span className="fieldLabel">Confirm Password</span>
            <div className="inputWithIcon">
              <input
                className="input"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="inputIconBtn"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                onClick={() => setShowConfirmPassword((v) => !v)}
              >
                <svg className="icon" viewBox="0 0 24 24" aria-hidden>
                  {showConfirmPassword ? (
                    <>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                      <path d="M4 4 20 20" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </label>

          {error && <div className="errorBox">{error}</div>}

          <button className="btn btnPrimary" disabled={busy} type="submit">
            {busy ? "Resetting…" : "Reset Password"}
          </button>
        </form>

        <div className="loginFooter">
          <Link to="/login" className="linkBtn">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
