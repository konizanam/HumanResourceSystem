import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { login as loginApi, me as meApi, type UserInfo } from "../api/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AuthState = {
  accessToken: string | null;
  userEmail: string | null;
  user: UserInfo | null;
};

type AuthContextValue = {
  accessToken: string | null;
  userEmail: string | null;
  user: UserInfo | null;
  /** Calls POST /api/auth/login – returns token + email for 2FA flow */
  authenticate: (
    email: string,
    password: string
  ) => Promise<{ accessToken: string; userEmail: string }>;
  /** Persist the token (after 2FA or registration) and fetch user */
  setSession: (accessToken: string, userEmail: string) => void;
  logout: () => void;
  /** Convenience: check whether the current user has a given permission */
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "hrs_access_token";

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    return { accessToken: token, userEmail: null, user: null };
  });

  /* Fetch user info + permissions from /api/me */
  const fetchUser = useCallback(async (token: string) => {
    try {
      const data = await meApi(token);
      setState((prev) => ({
        ...prev,
        user: data.user,
        userEmail: data.user.email,
      }));
    } catch {
      // Token expired or invalid – clear everything
      localStorage.removeItem(STORAGE_KEY);
      setState({ accessToken: null, userEmail: null, user: null });
    }
  }, []);

  /* On mount: if we already have a stored token, hydrate user */
  useEffect(() => {
    if (state.accessToken) {
      fetchUser(state.accessToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken: state.accessToken,
      userEmail: state.userEmail,
      user: state.user,

      authenticate: async (email, password) => {
        const result = await loginApi(email, password);
        return {
          accessToken: result.accessToken,
          userEmail: result.user.email,
        };
      },

      setSession: (accessToken, userEmail) => {
        localStorage.setItem(STORAGE_KEY, accessToken);
        setState((prev) => ({ ...prev, accessToken, userEmail }));
        fetchUser(accessToken);
      },

      logout: () => {
        localStorage.removeItem(STORAGE_KEY);
        setState({ accessToken: null, userEmail: null, user: null });
      },

      hasPermission: (permission: string) => {
        return state.user?.permissions?.includes(permission) ?? false;
      },
    }),
    [state.accessToken, state.userEmail, state.user, fetchUser]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
