import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { forgotPassword, requestTwoFactorChallenge, verifyTwoFactor } from "../api/client";

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
  const [pending, setPending] = useState<{ challengeId: string; userEmail: string } | null>(null);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [twoFactorExpiresAt, setTwoFactorExpiresAt] = useState<number | null>(null);
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
        const result = await authenticate(email, password);
        if ("requiresTwoFactor" in result) {
          setPending({ challengeId: result.challengeId, userEmail: email });
          setStep("twoFactor");
          setCode("");
          setTwoFactorExpiresAt(Date.now() + result.expiresInSeconds * 1000);
          return;
        }

        setSession(result.accessToken, result.user.email, result.user.name);
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

      if (!pending) {
        setError("Please sign in again");
        setStep("credentials");
        return;
      }

      const result = await verifyTwoFactor(pending.challengeId, normalized);
      setSession(result.accessToken, result.user.email, result.user.name);
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
          <div className="loginLogo">
            <img src="/hito-logo.png" alt="Hito HR Logo" className="loginLogoImg" />
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
                Enter the 6-digit authentication code sent to {pending?.userEmail ?? email}.
                <br />
                {countdownSeconds > 0
                  ? `Code expires in ${countdownLabel}.`
                  : "Code expired. Please sign in again."}
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
                        pending?.userEmail ?? email,
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
                  disabled={busy}
                >
                  Resend code
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
          <div className="loginCopyright">© 2026 Human Resource System. All rights reserved.</div>
        </div>
      </div>
    </div>
  );
}
