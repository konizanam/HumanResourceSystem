import { useCallback, useEffect, useMemo, useState } from "react";
import { me } from "../api/client";
import { useAuth } from "./AuthContext";

function normalizePermissionName(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function usePermissions() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) {
      setPermissions([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const payload = await me(accessToken);
      const perms = Array.isArray((payload as any)?.user?.permissions)
        ? (payload as any).user.permissions.map((p: unknown) => String(p))
        : [];
      setPermissions(perms);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load permissions");
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const normalized = useMemo(() => new Set(permissions.map(normalizePermissionName)), [permissions]);

  const hasPermission = useCallback(
    (...candidates: string[]) => {
      return candidates.some((candidate) => normalized.has(normalizePermissionName(candidate)));
    },
    [normalized],
  );

  return {
    loading,
    error,
    permissions,
    hasPermission,
    refreshPermissions: load,
  };
}
