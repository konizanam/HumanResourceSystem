import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  forgotPassword,
  getPublicCompanyById,
  getPublicSystemSettings,
  me,
  resendTwoFactorCode,
  verifyTwoFactor,
} from "../api/client";
import { applyAppThemeColor } from "../utils/themeColor";

const THEME_KEY = "hrs-theme";
const DEFAULT_APP_COLOR = "#6b7280";

function joinBaseAndPath(base: string, path: string): string {
  const cleanBase = String(base ?? "").trim().replace(/\/$/, "");
  const cleanPath = String(path ?? "").trim();
  if (!cleanBase) return cleanPath;
  if (!cleanPath) return cleanBase;
  return `${cleanBase}${cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`}`;
}

function resolvePublicAssetPath(fileName: string): string {
  const baseUrl = String(import.meta.env.BASE_URL ?? "/").trim() || "/";
  return joinBaseAndPath(baseUrl, fileName);
}

function resolveBrandingUrl(rawValue: string, apiBase: string): string {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(raw)) return raw;
  if (apiBase) return joinBaseAndPath(apiBase, raw);
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getLoginTokenFromLocation(location: { search: string; hash: string }): string | null {
  const searchParams = new URLSearchParams(location.search);
  const rawHash = String(location.hash ?? "").replace(/^#/, "");
  const hashParams = new URLSearchParams(rawHash);
  return (
    hashParams.get("accessToken") ||
    hashParams.get("token") ||
    searchParams.get("accessToken") ||
    searchParams.get("token")
  );
}

function hasActivationFlag(location: { search: string; hash: string }): boolean {
  const searchParams = new URLSearchParams(location.search);
  const rawHash = String(location.hash ?? "").replace(/^#/, "");
  const hashParams = new URLSearchParams(rawHash);
  return (
    hashParams.get("activated") === "1" ||
    searchParams.get("activated") === "1"
  );
}

function maskEmail(rawEmail: string): string {
  const value = String(rawEmail ?? "").trim();
  const atIndex = value.indexOf("@");
  if (atIndex <= 0 || atIndex === value.length - 1) return value;

  const localPart = value.slice(0, atIndex);
  const domainPart = value.slice(atIndex + 1);
  const domainLabels = domainPart.split(".");
  const domainName = domainLabels.shift() ?? "";
  const tld = domainLabels.length ? `.${domainLabels.join(".")}` : "";

  const maskSegment = (segment: string): string => {
    if (segment.length <= 1) return "*";
    if (segment.length === 2) return `${segment[0]}*`;
    return `${segment[0]}${"*".repeat(Math.max(1, segment.length - 2))}${segment[segment.length - 1]}`;
  };

  return `${maskSegment(localPart)}@${maskSegment(domainName)}${tld}`;
}

type AuthErrorContext = "login" | "verify2fa" | "resend2fa" | "forgot";

function resolveAuthErrorMessage(error: unknown, context: AuthErrorContext): string {
  const rawStatus = (error as any)?.status;
  const status = typeof rawStatus === "number" && Number.isFinite(rawStatus) ? rawStatus : null;
  const raw = error instanceof Error ? error.message : "";
  const message = String(raw ?? "").trim();
  const lower = message.toLowerCase();

  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("cannot reach api server") ||
    status === 0
  ) {
    return "Unable to reach the server. Check your connection and try again.";
  }

  if (status === 429 || lower.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (status !== null && status >= 500) {
    return "The server is temporarily unavailable. Please try again shortly.";
  }

  if (context === "login") {
    if (
      status === 401 ||
      lower.includes("invalid credential") ||
      lower.includes("invalid email") ||
      lower.includes("invalid password") ||
      lower.includes("unauthorized") ||
      lower.includes("user not found")
    ) {
      return "Email or password is incorrect. Please try again.";
    }
  }

  if (context === "verify2fa" || context === "resend2fa") {
    if (lower.includes("expired")) {
      return "Your authentication code has expired. Request a new code and try again.";
    }
    if (lower.includes("invalid") || lower.includes("otp") || lower.includes("code")) {
      return "Invalid authentication code. Enter the latest 6-digit code and try again.";
    }
  }

  if (context === "forgot") {
    return "Could not process your reset request right now. Please try again in a moment.";
  }

  if (message) return message;

  if (context === "verify2fa") return "Verification failed. Please try again.";
  if (context === "resend2fa") return "Could not resend the code. Please try again.";
  return "Sign-in failed. Please try again.";
}

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
  const [systemName, setSystemName] = useState<string>("");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string>("");
  const [welcomeTitle, setWelcomeTitle] = useState<string>("");
  const [welcomeSubtitle, setWelcomeSubtitle] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activationNotice, setActivationNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"credentials" | "twoFactor">("credentials");
  const [pending, setPending] = useState<{ challengeId: string; userEmail: string } | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [twoFactorExpiresAt, setTwoFactorExpiresAt] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">(getStoredTheme);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const [lastAppColor, setLastAppColor] = useState<string>(DEFAULT_APP_COLOR);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const apiBase = useMemo(
    () => String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, ""),
    [],
  );
  const fallbackLogoSrc = useMemo(() => resolvePublicAssetPath("hito-logo.png"), []);

  useEffect(() => {
    document.body.classList.add("loginBodyNoScroll");
    return () => {
      document.body.classList.remove("loginBodyNoScroll");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadBranding = async () => {
      try {
        const settings = await getPublicSystemSettings();
        if (cancelled) return;
        const settingsName = String(settings.system_name ?? "").trim();
        const mainCompanyId = String(settings.main_company_id ?? "").trim();
        let resolvedName = settingsName;
        if (mainCompanyId) {
          try {
            const company = await getPublicCompanyById(mainCompanyId);
            if (!cancelled) {
              const companyName = String(company?.name ?? "").trim();
              resolvedName = companyName || settingsName;
            }
          } catch {
            resolvedName = settingsName;
          }
        }
        if (!cancelled) {
          setSystemName(resolvedName);
          const nextAppColor = String(settings.app_color ?? "").trim() || DEFAULT_APP_COLOR;
          setLastAppColor(nextAppColor);
          applyAppThemeColor(nextAppColor);
          const nextWelcomeTitle = String((settings as any).login_welcome_title ?? "").trim();
          const nextWelcomeSubtitle = String((settings as any).login_welcome_subtitle ?? "").trim();
          setWelcomeTitle(nextWelcomeTitle);
          setWelcomeSubtitle(nextWelcomeSubtitle);
        }

        const mainCompanyLogo = mainCompanyId && apiBase
          ? `${apiBase}/api/v1/public/companies/${encodeURIComponent(mainCompanyId)}/logo`
          : "";
        setBrandingLogoUrl(mainCompanyLogo || String(settings.branding_logo_url ?? ""));
        if (!cancelled) setSettingsLoaded(true);
      } catch {
        if (cancelled) return;
        setSystemName("");
        setBrandingLogoUrl("");
        setLastAppColor(DEFAULT_APP_COLOR);
        applyAppThemeColor(DEFAULT_APP_COLOR);
        setWelcomeTitle("");
        setWelcomeSubtitle("");
        setSettingsLoaded(true);
      }
    };

    void loadBranding();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const name = String(systemName ?? "").trim();
    document.title = name || "Login";
  }, [systemName]);

  const resolvedBrandingLogoUrl = useMemo(
    () => resolveBrandingUrl(brandingLogoUrl, apiBase),
    [apiBase, brandingLogoUrl],
  );

  useEffect(() => {
    if (!resolvedBrandingLogoUrl) return;

    const link =
      (document.querySelector('link[rel="icon"]') as HTMLLinkElement | null) ??
      (document.querySelector('link[rel~="icon"]') as HTMLLinkElement | null);

    if (link) {
      link.href = resolvedBrandingLogoUrl;
      return;
    }

    const created = document.createElement("link");
    created.rel = "icon";
    created.href = resolvedBrandingLogoUrl;
    document.head.appendChild(created);
  }, [resolvedBrandingLogoUrl]);

  const resolvedLogoSrc = useMemo(() => {
    if (!resolvedBrandingLogoUrl) return fallbackLogoSrc;
    return resolvedBrandingLogoUrl;
  }, [fallbackLogoSrc, resolvedBrandingLogoUrl]);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [resolvedLogoSrc]);

  const displayLogoSrc = logoLoadFailed ? fallbackLogoSrc : resolvedLogoSrc;

  const toggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    applyAppThemeColor(lastAppColor);
  }, [theme, lastAppColor]);

  const redirectTo = useMemo(() => {
    const from = (location.state as any)?.from;
    return typeof from === "string" && from.trim() ? from : "/app/dashboard";
  }, [location.state]);

  useEffect(() => {
    if (!hasActivationFlag(location)) return;
    setActivationNotice("Your account has been activated successfully. You can now sign in.");
  }, [location]);

  useEffect(() => {
    const token = getLoginTokenFromLocation(location);
    const activated = hasActivationFlag(location);

    if (!token) {
      if (!activated) return;

      // Clean activation flag from URL after we show a notice.
      navigate(
        { pathname: location.pathname, search: "", hash: "" },
        { replace: true, state: location.state }
      );
      return;
    }

    const payload = decodeJwtPayload(token);
    const email = typeof payload?.email === "string" ? payload.email : "";
    const name = typeof payload?.name === "string" ? payload.name : email;
    setSession(token, email, name);

    // Clean the URL (remove token) without losing navigation state.
    navigate(
      { pathname: location.pathname, search: "", hash: "" },
      { replace: true, state: location.state }
    );
  }, [location, navigate, setSession]);

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
    setNotice(null);
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
        setError("Enter your 6-digit authentication code.");
        return;
      }

      if (!/^\d{6}$/.test(normalized)) {
        setError("Authentication code must be exactly 6 digits.");
        return;
      }

      if (!pending) {
        setError("Your sign-in session has ended. Please sign in again.");
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
      setError(resolveAuthErrorMessage(err, step === "credentials" ? "login" : "verify2fa"));
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
          {welcomeTitle ? <h2 className="authVisualTitle">{welcomeTitle}</h2> : null}
          {welcomeSubtitle ? <p className="authVisualText">{welcomeSubtitle}</p> : null}
          <div className="authVisualMeta">Fast • Secure • Reliable</div>
        </aside>

        <div className="loginCard authPanel">
          <div className="loginHeader">
            <div className="loginLogo">
              <img
                src={displayLogoSrc}
                alt={settingsLoaded ? (systemName ? `${systemName} Logo` : "Company Logo") : ""}
                className="loginLogoImg"
                onError={() => {
                  if (displayLogoSrc !== fallbackLogoSrc) {
                    setLogoLoadFailed(true);
                  }
                }}
              />
            </div>
            <h1 className="loginTitle">Hi, Welcome Back!</h1>
            <p className="loginSubtitle">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={onSubmit} className="form" aria-busy={busy}>
            {activationNotice ? (
              <div className="hintBox" role="status" aria-live="polite">
                {activationNotice}
              </div>
            ) : null}

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
                      className="linkBtn authLinkBtn"
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
                      className="linkBtn authLinkBtn"
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
                        const response = await forgotPassword(value);
                        const safeEmail = response?.maskedEmail || maskEmail(value);
                        setForgotMessage(
                          `If an account exists for ${safeEmail}, a reset link has been sent.`
                        );
                      } catch (err) {
                        setForgotMessage(resolveAuthErrorMessage(err, "forgot"));
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
              <div className="hintBox hintBoxCentered" role="note" aria-live="polite">
                Enter the 6-digit authentication code sent to {maskEmail(pending?.userEmail ?? email)}.
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
                  className="linkBtn authLinkBtn"
                  onClick={() => {
                    setStep("credentials");
                    setPending(null);
                    setTwoFactorExpiresAt(null);
                    setError(null);
                    setNotice(null);
                  }}
                  disabled={busy}
                >
                  Back to sign in
                </button>

                <button
                  type="button"
                  className="linkBtn authLinkBtn"
                  onClick={async () => {
                    setError(null);
                    setNotice(null);
                    setBusy(true);
                    try {
                      if (!pending?.challengeId) {
                        setError("Your sign-in session has ended. Please sign in again.");
                        setStep("credentials");
                        setPending(null);
                        setTwoFactorExpiresAt(null);
                        return;
                      }

                      const nextChallenge = await resendTwoFactorCode(pending.challengeId);

                      setPending((p) =>
                        p
                          ? { ...p, challengeId: nextChallenge.challengeId }
                          : { challengeId: nextChallenge.challengeId, userEmail: email }
                      );
                      setTwoFactorExpiresAt(
                        Date.now() + nextChallenge.expiresInSeconds * 1000
                      );
                      setCode("");
                      setNotice("A new authentication code was sent to your email.");
                    } catch (err) {
                      setError(resolveAuthErrorMessage(err, "resend2fa"));
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                >
                  Resend code
                </button>
              </div>
            </>
          )}

          {error ? (
            <div className="errorBox" role="alert" aria-live="assertive">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="hintBox" role="status" aria-live="polite">
              {notice}
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
            <Link to="/register" className="linkBtn authLinkBtn">
              Sign up
            </Link>
          </div>
        </div>
      </div>
      <footer className="globalAppFooter authPageFooter">
        <span>© 2026 All Rights Reserved. {systemName || "Human Resource System"}. Developed By: </span>
        <a href="https://it.konizanam.com" target="_blank" rel="noreferrer">Koniza Information Technology</a>
      </footer>
    </div>
  );
}
