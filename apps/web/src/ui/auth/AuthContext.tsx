import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { login as loginApi, refreshAccessToken } from "../api/client";
import type { LoginResult } from "../api/client";

type AuthState = {
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
};

type AuthContextValue = {
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
  authenticate: (email: string, password: string) => Promise<LoginResult>;
  setSession: (accessToken: string, userEmail: string, userName: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "hrs_access_token";
const STORAGE_EMAIL_KEY = "hrs_user_email";
const STORAGE_NAME_KEY = "hrs_user_name";
const SESSION_REFRESH_CHECK_MS = 60 * 1000;
const SESSION_REFRESH_WINDOW_MS = 5 * 60 * 1000;
const ACTIVE_WINDOW_MS = 15 * 60 * 1000;
const ACTIVITY_THROTTLE_MS = 15 * 1000;

type UnauthorizedEventDetail = {
  status?: number;
  message?: string;
};

function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_EMAIL_KEY);
  localStorage.removeItem(STORAGE_NAME_KEY);
}

function isJwtExpired(token: string): boolean {
  try {
    const [, payload] = token.split(".");
    if (!payload) return false;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const parsed = JSON.parse(atob(padded)) as { exp?: unknown };
    const exp = typeof parsed.exp === "number" ? parsed.exp : Number(parsed.exp);
    if (!Number.isFinite(exp)) return false;
    return Date.now() >= exp * 1000;
  } catch {
    return false;
  }
}

function getJwtExpiryMs(token: string): number | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const parsed = JSON.parse(atob(padded)) as { exp?: unknown };
    const exp = typeof parsed.exp === "number" ? parsed.exp : Number(parsed.exp);
    if (!Number.isFinite(exp)) return null;
    return exp * 1000;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const lastActivityRef = useRef<number>(Date.now());
  const refreshInFlightRef = useRef<boolean>(false);

  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    const userEmail = localStorage.getItem(STORAGE_EMAIL_KEY);
    const userName = localStorage.getItem(STORAGE_NAME_KEY);
    return { accessToken: token, userEmail, userName };
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken: state.accessToken,
      userEmail: state.userEmail,
      userName: state.userName,
      authenticate: async (email, password) => loginApi(email, password),
      setSession: (accessToken, userEmail, userName) => {
        localStorage.setItem(STORAGE_KEY, accessToken);
        localStorage.setItem(STORAGE_EMAIL_KEY, userEmail);
        localStorage.setItem(STORAGE_NAME_KEY, userName);
        setState({ accessToken, userEmail, userName });
      },
      logout: () => {
        clearStoredSession();
        setState({ accessToken: null, userEmail: null, userName: null });
      },
    }),
    [state.accessToken, state.userEmail, state.userName]
  );

  useEffect(() => {
    function onUnauthorized(event: Event) {
      const token = localStorage.getItem(STORAGE_KEY);
      if (!token) {
        clearStoredSession();
        setState({ accessToken: null, userEmail: null, userName: null });
        return;
      }

      const detail = (event as CustomEvent<UnauthorizedEventDetail>)?.detail;
      const message = String(detail?.message ?? "").toLowerCase();
      const explicitlyInvalid =
        message.includes("token expired") ||
        message.includes("invalid token") ||
        message.includes("user not found or inactive");

      if (!isJwtExpired(token) && !explicitlyInvalid) {
        return;
      }

      clearStoredSession();
      setState({ accessToken: null, userEmail: null, userName: null });
    }

    window.addEventListener("hrs:unauthorized", onUnauthorized);
    return () => window.removeEventListener("hrs:unauthorized", onUnauthorized);
  }, []);

  useEffect(() => {
    const trackActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current >= ACTIVITY_THROTTLE_MS) {
        lastActivityRef.current = now;
      }
    };

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
      "focus",
    ];

    for (const eventName of events) {
      window.addEventListener(eventName, trackActivity, { passive: true });
    }

    return () => {
      for (const eventName of events) {
        window.removeEventListener(eventName, trackActivity);
      }
    };
  }, []);

  useEffect(() => {
    if (!state.accessToken) return;

    const maybeRefreshSession = async () => {
      if (refreshInFlightRef.current) return;

      const activeToken = localStorage.getItem(STORAGE_KEY) ?? state.accessToken;
      if (!activeToken) return;

      const now = Date.now();
      const isActiveRecently = now - lastActivityRef.current <= ACTIVE_WINDOW_MS;
      if (!isActiveRecently) return;

      const expiryMs = getJwtExpiryMs(activeToken);
      if (!expiryMs) return;

      const remainingMs = expiryMs - now;
      if (remainingMs > SESSION_REFRESH_WINDOW_MS) return;

      refreshInFlightRef.current = true;
      try {
        const refreshed = await refreshAccessToken(activeToken);
        const nextEmail = refreshed.user?.email ?? state.userEmail ?? "";
        const nextName = refreshed.user?.name ?? state.userName ?? "";

        localStorage.setItem(STORAGE_KEY, refreshed.accessToken);
        localStorage.setItem(STORAGE_EMAIL_KEY, nextEmail);
        localStorage.setItem(STORAGE_NAME_KEY, nextName);
        setState({ accessToken: refreshed.accessToken, userEmail: nextEmail, userName: nextName });
      } catch {
        // Let normal unauthorized flow handle hard auth failures.
      } finally {
        refreshInFlightRef.current = false;
      }
    };

    void maybeRefreshSession();
    const timer = window.setInterval(() => {
      void maybeRefreshSession();
    }, SESSION_REFRESH_CHECK_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [state.accessToken, state.userEmail, state.userName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
