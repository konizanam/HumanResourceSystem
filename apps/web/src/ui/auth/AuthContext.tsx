import React, { createContext, useContext, useMemo, useState } from "react";
import { login as loginApi } from "../api/client";

type AuthState = {
  accessToken: string | null;
  userEmail: string | null;
};

type AuthContextValue = {
  accessToken: string | null;
  userEmail: string | null;
  authenticate: (email: string, password: string) => Promise<{ accessToken: string; userEmail: string }>;
  setSession: (accessToken: string, userEmail: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "hrs_access_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    return { accessToken: token, userEmail: null };
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken: state.accessToken,
      userEmail: state.userEmail,
      authenticate: async (email, password) => {
        const result = await loginApi(email, password);
        return { accessToken: result.accessToken, userEmail: result.user.email };
      },
      setSession: (accessToken, userEmail) => {
        localStorage.setItem(STORAGE_KEY, accessToken);
        setState({ accessToken, userEmail });
      },
      logout: () => {
        localStorage.removeItem(STORAGE_KEY);
        setState({ accessToken: null, userEmail: null });
      },
    }),
    [state.accessToken, state.userEmail]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
