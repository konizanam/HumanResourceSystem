import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { activateAccount } from "../api/client";

function resolveTokenFromLocation(location: { search: string; hash: string }): string {
  const searchParams = new URLSearchParams(location.search);
  const hashRaw = String(location.hash ?? "").replace(/^#/, "");
  const hashParams = new URLSearchParams(hashRaw);
  return String(searchParams.get("token") || hashParams.get("token") || "").trim();
}

export function ActivateAccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Activating your account...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const token = resolveTokenFromLocation(location);
      if (!token) {
        setError("Activation token is missing.");
        return;
      }

      try {
        const result = await activateAccount(token);
        if (cancelled) return;
        const setupToken = String(result.passwordSetupToken ?? "").trim();
        if (result.requiresPasswordSetup && setupToken) {
          setMessage("Account activated. Redirecting to set your password...");
          window.setTimeout(() => {
            navigate(`/reset-password?token=${encodeURIComponent(setupToken)}&activated=1`, { replace: true });
          }, 600);
          return;
        }
        setMessage("Your account has been activated. Redirecting to login...");
        window.setTimeout(() => {
          navigate("/login#activated=1", { replace: true });
        }, 800);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Activation failed");
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [location, navigate]);

  return (
    <div className="page">
      <h1 className="pageTitle">Account Activation</h1>
      {error ? (
        <div className="errorBox" role="alert" aria-live="assertive">
          {error}
        </div>
      ) : (
        <div className="hintBox" role="status" aria-live="polite">
          {message}
        </div>
      )}
    </div>
  );
}
