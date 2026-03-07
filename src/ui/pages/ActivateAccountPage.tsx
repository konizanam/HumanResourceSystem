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
        await activateAccount(token);
        if (cancelled) return;
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
