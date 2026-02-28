import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { login as loginApi } from "../api/client";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
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
        message.includes("no token provided") ||
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
