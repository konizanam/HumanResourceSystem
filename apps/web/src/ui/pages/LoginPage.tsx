import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const STATIC_2FA_CODE = import.meta.env.VITE_STATIC_2FA_CODE ?? "123456";

export function LoginPage() {
  const { accessToken, authenticate, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("Admin@1234");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"credentials" | "twoFactor">("credentials");
  const [pending, setPending] = useState<{ accessToken: string; userEmail: string } | null>(null);
  const [showForgot, setShowForgot] = useState(false);

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      if (step === "credentials") {
        const result = await authenticate(email, password);
        setPending(result);
        setStep("twoFactor");
        setCode("");
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

  return (
    <div className="loginPage">
      <div className="loginCard">
        <div className="loginHeader">
          <div className="loginLogo" aria-hidden="true">
            <svg className="loginLogoSvg" viewBox="0 0 48 48" aria-hidden="true">
              <rect x="6" y="6" width="36" height="36" rx="10" />
              <path d="M17 30V18h3v4h8v-4h3v12h-3v-5h-8v5h-3z" />
            </svg>
          </div>
          <div className="loginTitle">Welcome</div>
        </div>

        <form onSubmit={onSubmit} className="form">
          {step === "credentials" ? (
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
                <button type="button" className="linkBtn" onClick={() => setShowForgot((v) => !v)}>
                  Forgot password?
                </button>
              </div>

              {showForgot ? (
                <div className="hintBox" role="note">
                  Contact your administrator to reset your password.
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="hintBox" role="note">
                Enter the 6-digit authentication code.
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

              <div className="loginRow loginRowSplit">
                <button
                  type="button"
                  className="btn btnGhost"
                  onClick={() => {
                    setStep("credentials");
                    setPending(null);
                    setError(null);
                  }}
                  disabled={busy}
                >
                  Back
                </button>
              </div>
            </>
          )}

          {error ? <div className="errorBox">{error}</div> : null}

          <button className="btn btnPrimary" disabled={busy} type="submit">
            {busy
              ? step === "credentials"
                ? "Signing in…"
                : "Verifying…"
              : step === "credentials"
                ? "Continue"
                : "Verify"}
          </button>
        </form>

        <div className="loginFooter">Human Resource System</div>
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
