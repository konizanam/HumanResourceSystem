import React, { createContext, useContext, useMemo, useState } from "react";
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
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_EMAIL_KEY);
        localStorage.removeItem(STORAGE_NAME_KEY);
        setState({ accessToken: null, userEmail: null, userName: null });
      },
    }),
    [state.accessToken, state.userEmail, state.userName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
