import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { forgotPassword, getPublicSystemSettings, me, requestTwoFactorChallenge, verifyTwoFactor } from "../api/client";

const THEME_KEY = "hrs-theme";

/** Returns the current effective theme without touching data-theme. */
function getStoredTheme(): "light" | "dark" {
  try {
    const s = localStorage.getItem(THEME_KEY);
    if (s === "dark" || s === "light") return s;
  } catch { /* ignore */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function LoginPage() {
  const { accessToken, authenticate, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [systemName, setSystemName] = useState<string>("Human Resource System");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"credentials" | "twoFactor">("credentials");
  const [pending, setPending] = useState<{ challengeId: string; userEmail: string } | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [twoFactorExpiresAt, setTwoFactorExpiresAt] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">(getStoredTheme);

  useEffect(() => {
    let cancelled = false;
    const loadBranding = async () => {
      try {
        const settings = await getPublicSystemSettings();
        if (cancelled) return;
        const name = String(settings.system_name ?? "Human Resource System").trim() || "Human Resource System";
        setSystemName(name);
      } catch {
        if (cancelled) return;
        setSystemName("Human Resource System");
      }
    };

    void loadBranding();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const name = String(systemName ?? "Human Resource System").trim() || "Human Resource System";
    document.title = name;
  }, [systemName]);

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  }, [theme]);

  const redirectTo = useMemo(() => {
    const from = (location.state as any)?.from;
    return typeof from === "string" && from.trim() ? from : "/app/dashboard";
  }, [location.state]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    const resolveExistingSession = async () => {
      try {
        const payload = await me(accessToken);
        const permissions = Array.isArray((payload as any)?.user?.permissions)
          ? (payload as any).user.permissions.map((p: unknown) => String(p))
          : [];
        if (!cancelled) {
          void permissions;
          navigate(redirectTo, { replace: true });
        }
      } catch {
        if (!cancelled) {
          navigate(redirectTo, { replace: true });
        }
      }
    };

    void resolveExistingSession();

    return () => {
      cancelled = true;
    };
  }, [accessToken, navigate, redirectTo]);

  useEffect(() => {
    if (!twoFactorExpiresAt || step !== "twoFactor") {
      setCountdownSeconds(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, Math.ceil((twoFactorExpiresAt - Date.now()) / 1000));
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
        const normalizedEmail = email.trim().toLowerCase();
        const result = await authenticate(normalizedEmail, password);
        if ("requiresTwoFactor" in result) {
          setPending({ challengeId: result.challengeId, userEmail: normalizedEmail });
          setStep("twoFactor");
          setCode("");
          setTwoFactorExpiresAt(Date.now() + result.expiresInSeconds * 1000);
          return;
        }

        setSession(result.accessToken, result.user.email, result.user.name);
        const payload = await me(result.accessToken);
        const permissions = Array.isArray((payload as any)?.user?.permissions)
          ? (payload as any).user.permissions.map((p: unknown) => String(p))
          : [];
        void permissions;
        navigate(redirectTo, { replace: true });
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

      if (!/^\d{6}$/.test(normalized)) {
        setError("Enter a valid 6-digit authentication code");
        return;
      }

      if (!pending) {
        setError("Please sign in again");
        setStep("credentials");
        return;
      }

      const result = await verifyTwoFactor(pending.challengeId, normalized);
      setSession(result.accessToken, result.user.email, result.user.name);
      const payload = await me(result.accessToken);
      const permissions = Array.isArray((payload as any)?.user?.permissions)
        ? (payload as any).user.permissions.map((p: unknown) => String(p))
        : [];
      void permissions;
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="loginPage authScreen">
      <button
        type="button"
        className="btn themeToggleBtn loginThemeToggle"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
      <div className="authWrap">
        <aside className="authVisual" aria-hidden="true">
          <div className="authVisualBadge">{systemName}</div>
          <h2 className="authVisualTitle">Welcome to your recruitment command center</h2>
          <p className="authVisualText">
            Sign in to hire, apply, and stay updated on applications — all in one secure place.
          </p>
          <div className="authVisualMeta">Fast • Secure • Reliable</div>
        </aside>

        <div className="loginCard authPanel">
          <div className="loginHeader">
            <div className="loginLogo">
              <img src="/hito-logo.png" alt="Hito HR Logo" className="loginLogoImg" />
            </div>
            <h1 className="loginTitle">Welcome Back</h1>
            <p className="loginSubtitle">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={onSubmit} className="form" aria-busy={busy}>
            <div className="authModeRow" role="status" aria-live="polite">
              <span className={`authModePill ${step === "credentials" && !showForgot ? "authModePillActive" : ""}`}>
                Sign In
              </span>
              <span className={`authModePill ${showForgot ? "authModePillActive" : ""}`}>
                Recovery
              </span>
              <span className={`authModePill ${step === "twoFactor" ? "authModePillActive" : ""}`}>
                Auth Code
              </span>
            </div>

          {step === "credentials" ? (
            <>
              {!showForgot ? (
                <>
                  <label className="field">
                    <span className="fieldLabel">Email address</span>
                    <input
                      className="input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      placeholder="name@company.com"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
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
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                    />
                  </label>

                  <div className="loginRow">
                    <button
                      type="button"
                      className="linkBtn"
                      onClick={() => {
                        setShowForgot(true);
                        setForgotEmail(email.trim());
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
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="name@company.com"
                      required
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
                    disabled={busy}
                    onClick={async () => {
                      const value = forgotEmail.trim();
                      if (!value || !value.includes("@")) {
                        setForgotMessage("Enter a valid email address.");
                        return;
                      }
                      setBusy(true);
                      setForgotMessage(null);
                      try {
                        await forgotPassword(value);
                        setForgotMessage(
                          `If an account exists for ${value}, a reset link has been sent.`
                        );
                      } catch {
                        setForgotMessage("Something went wrong. Please try again.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {busy ? "Sending…" : "Send reset link"}
                  </button>

                  {forgotMessage ? (
                    <div className="hintBox" role="status" aria-live="polite">
                      {forgotMessage}
                    </div>
                  ) : null}
                </>
              )}
            </>
          ) : (
            <>
              <div className="hintBox" role="note" aria-live="polite">
                Enter the 6-digit authentication code sent to {pending?.userEmail ?? email}.
                <br />
                {countdownSeconds > 0
                  ? `Code expires in ${countdownLabel}.`
                  : "Code expired. Please sign in again."}
              </div>
              <label className="field">
                <span className="fieldLabel">Authentication code</span>
                <input
                  className="input authCodeInput"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D+/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  required
                />
              </label>

              <div className="loginRow loginRowSplit">
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

                <button
                  type="button"
                  className="linkBtn"
                  onClick={async () => {
                    setError(null);
                    setBusy(true);
                    try {
                      const nextChallenge = await requestTwoFactorChallenge(
                        (pending?.userEmail ?? email).trim().toLowerCase(),
                        password
                      );

                      setPending((p) =>
                        p
                          ? { ...p, challengeId: nextChallenge.challengeId }
                          : { challengeId: nextChallenge.challengeId, userEmail: email }
                      );
                      setTwoFactorExpiresAt(
                        Date.now() + nextChallenge.expiresInSeconds * 1000
                      );
                      setCode("");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to resend code");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy || countdownSeconds > 0}
                >
                  {countdownSeconds > 0 ? `Resend in ${countdownLabel}` : "Resend code"}
                </button>
              </div>
            </>
          )}

          {error ? (
            <div className="errorBox" role="alert" aria-live="assertive">
              {error}
            </div>
          ) : null}

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
            <div className="loginCopyright">© 2026 {systemName}. All rights reserved.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
