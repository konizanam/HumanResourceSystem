import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { forgotPassword } from "../api/client";

const STATIC_2FA_CODE = import.meta.env.VITE_STATIC_2FA_CODE ?? "123456";
const IS_DEV = import.meta.env.DEV; // true in Vite dev server

export function LoginPage() {
  const { accessToken, authenticate, setSession } = useAuth();
  const settings = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin@1234");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"credentials" | "twoFactor">("credentials");
  const [pending, setPending] = useState<{
    accessToken: string;
    userEmail: string;
  } | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [twoFactorExpiresAt, setTwoFactorExpiresAt] = useState<number | null>(
    null
  );
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    if (!state?.from || !state.from.startsWith("/")) {
      return "/app";
    }
    return state.from;
  }, [location.state]);

  useEffect(() => {
    if (accessToken) {
      navigate(redirectTo, { replace: true });
    }
  }, [accessToken, navigate, redirectTo]);

  useEffect(() => {
    if (!twoFactorExpiresAt || step !== "twoFactor") {
      setCountdownSeconds(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(
        0,
        Math.ceil((twoFactorExpiresAt - Date.now()) / 1000)
      );
      setCountdownSeconds(remaining);
    };

    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [twoFactorExpiresAt, step]);

  const countdownLabel = useMemo(() => {
    const minutes = Math.floor(countdownSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (countdownSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [countdownSeconds]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (step === "credentials") {
        const result = await authenticate(email, password);
        setPending(result);
        setStep("twoFactor");
        // In dev mode, auto-fill the code and log it to the console
        if (IS_DEV) {
          setCode(STATIC_2FA_CODE);
          console.log(
            `[DEV] 2FA bypass code: ${STATIC_2FA_CODE} (auto-filled)`
          );
        } else {
          setCode("");
        }
        setTwoFactorExpiresAt(Date.now() + 10 * 60 * 1000);
        return;
      }

      if (!twoFactorExpiresAt || Date.now() > twoFactorExpiresAt) {
        setError("Authentication code expired. Please sign in again.");
        setStep("credentials");
        setPending(null);
        setTwoFactorExpiresAt(null);
        return;
      }

      const normalized = code.replace(/\s+/g, "").trim();
      if (!normalized) {
        setError("Enter your authentication code");
        return;
      }

      if (normalized !== STATIC_2FA_CODE) {
        setError("Invalid authentication code");
        return;
      }

      if (!pending) {
        setError("Please sign in again");
        setStep("credentials");
        return;
      }

      setSession(pending.accessToken, pending.userEmail);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  /** Actually call the forgot-password API */
  async function handleForgotPassword() {
    const value = forgotEmail.trim();
    if (!value || !value.includes("@")) {
      setForgotMessage("Enter a valid email address.");
      return;
    }
    setForgotBusy(true);
    try {
      await forgotPassword(value);
      setForgotMessage(
        `If a user with that email exists, a password reset link has been sent to ${value}.`
      );
    } catch {
      setForgotMessage("Something went wrong. Please try again.");
    } finally {
      setForgotBusy(false);
    }
  }

  /* ── Logo helper ──────────────────────────────────── */
  const logoUrl = settings.system_logo_url;
  const systemName = settings.system_name || "HR System";

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginHeader">
          <div className="loginLogo">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`${systemName} Logo`}
                className="loginLogoImg"
              />
            ) : (
              <div className="loginLogoFallback">{systemName.charAt(0)}</div>
            )}
          </div>
          <div className="loginTitle">Welcome</div>
        </div>

        <form onSubmit={onSubmit} className="form">
          {step === "credentials" ? (
            <>
              {!showForgot ? (
                <>
                  <label className="field">
                    <span className="fieldLabel">Email</span>
                    <input
                      className="input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      autoComplete="username"
                      required
                    />
                  </label>

                  <label className="field">
                    <span className="fieldLabel">Password</span>
                    <input
                      className="input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      autoComplete="current-password"
                      required
                    />
                  </label>

                  <div className="loginRow">
                    <button
                      type="button"
                      className="linkBtn"
                      onClick={() => {
                        setShowForgot(true);
                        setForgotMessage(null);
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <label className="field">
                    <span className="fieldLabel">Recovery email</span>
                    <input
                      className="input"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      type="email"
                      autoComplete="email"
                      placeholder="name@company.com"
                    />
                  </label>

                  <div className="loginRow">
                    <button
                      type="button"
                      className="linkBtn"
                      onClick={() => {
                        setShowForgot(false);
                        setForgotMessage(null);
                      }}
                    >
                      Back to sign in
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btnPrimary fullActionBtn"
                    onClick={handleForgotPassword}
                    disabled={forgotBusy}
                  >
                    {forgotBusy ? "Sending…" : "Send reset link"}
                  </button>

                  {forgotMessage ? (
                    <div className="hintBox" role="note">
                      {forgotMessage}
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <>
              <div className="hintBox" role="note">
                {IS_DEV ? (
                  <>
                    <strong>DEV MODE</strong> — No email is sent. Use code:{" "}
                    <code style={{ fontWeight: "bold", letterSpacing: "2px" }}>
                      {STATIC_2FA_CODE}
                    </code>
                    <br />
                    The code field has been auto-filled. Just click Verify.
                  </>
                ) : (
                  <>
                    Enter the 6-digit authentication code sent to{" "}
                    {pending?.userEmail ?? email}.
                    <br />
                    {countdownSeconds > 0
                      ? `Code expires in ${countdownLabel}.`
                      : "Code expired. Please sign in again."}
                  </>
                )}
              </div>
              <label className="field">
                <span className="fieldLabel">Authentication code</span>
                <input
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  required
                />
              </label>

              <div className="loginRow">
                <button
                  type="button"
                  className="linkBtn"
                  onClick={() => {
                    setStep("credentials");
                    setPending(null);
                    setTwoFactorExpiresAt(null);
                    setError(null);
                  }}
                  disabled={busy}
                >
                  Back to sign in
                </button>
              </div>
            </>
          )}

          {error ? <div className="errorBox">{error}</div> : null}

          {!(step === "credentials" && showForgot) ? (
            <button className="btn btnPrimary" disabled={busy} type="submit">
              {busy
                ? step === "credentials"
                  ? "Signing in…"
                  : "Verifying…"
                : step === "credentials"
                  ? "Continue"
                  : "Verify"}
            </button>
          ) : null}
        </form>

        <div className="loginFooter">
          Don't have an account?{" "}
          <Link to="/register" className="linkBtn">
            Sign up
          </Link>
          <div className="loginCopyright">
            © {new Date().getFullYear()} {systemName}. All rights reserved.
          </div>
        </div>
      </div>

      <div className="loginAside">
        <div className="asideCard">
          <div className="asideTitle">JWT + REST API</div>
          <div className="asideText">
            This UI uses the REST login endpoint to obtain a JWT access token.
          </div>
          <div className="asideMeta">Swagger: http://localhost:4000/docs</div>
        </div>
      </div>
    </div>
  );
}
