import { useCallback, useEffect, useMemo, useState } from "react";
import { listPermissions, me, type Permission } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

type CurrentUser = {
  id?: string;
  name?: string;
  email?: string;
  roles?: Array<{ id?: string; name?: string } | string>;
  permissions?: Array<{ id?: string; name?: string } | string>;
};

type MeResponse = CurrentUser & {
  user?: CurrentUser;
};

function inferModuleFromPermissionName(permissionName: string): string {
  const raw = String(permissionName ?? "").trim().toUpperCase();
  if (!raw) return "General";

  const known: Record<string, string> = {
    JOB: "Jobs",
    JOBS: "Jobs",
    APPLICATION: "Applications",
    APPLICATIONS: "Applications",
    CANDIDATE: "Candidates",
    CANDIDATES: "Candidates",
    COMPANY: "Company",
    COMPANIES: "Company",
    USER: "Users",
    USERS: "Users",
    ROLE: "System",
    ROLES: "System",
    PERMISSION: "System",
    PERMISSIONS: "System",
    AUDIT: "System",
    SETTINGS: "System",
    SETTING: "System",
    REPORT: "Reports",
    REPORTS: "Reports",
    MESSAGE: "Messages",
    MESSAGES: "Messages",
    NOTIFICATION: "Notifications",
    NOTIFICATIONS: "Notifications",
  };

  const parts = raw.split("_").filter(Boolean);
  const modulePart = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
  return known[modulePart] ?? "General";
}

function inferActionFromPermissionName(permissionName: string): string {
  const raw = String(permissionName ?? "").trim().toUpperCase();
  if (!raw) return "VIEW";
  const action = raw.split("_")[0] ?? "VIEW";
  return action || "VIEW";
}

export function MyPermissionsPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [permissionCatalogByName, setPermissionCatalogByName] = useState<Map<string, Permission>>(new Map());

  const canManagePermissions = hasPermission("MANAGE_USERS");

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const [meData, permissionCatalogResult] = await Promise.allSettled([
        me(accessToken) as Promise<MeResponse>,
        listPermissions(accessToken),
      ]);

      if (meData.status !== "fulfilled") {
        throw meData.reason;
      }

      const normalizedUser = (meData.value?.user ?? meData.value) as CurrentUser;
      setUser(normalizedUser);

      if (permissionCatalogResult.status === "fulfilled") {
        const map = new Map<string, Permission>();
        for (const permission of permissionCatalogResult.value.permissions ?? []) {
          const key = String(permission.name ?? "").trim().toUpperCase();
          if (key) map.set(key, permission);
        }
        setPermissionCatalogByName(map);
      } else {
        setPermissionCatalogByName(new Map());
      }
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load your permissions");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const roles = useMemo(() => {
    const list = Array.isArray(user?.roles) ? user?.roles : [];
    return list
      .map((role) =>
        typeof role === "string"
          ? role.trim()
          : String(role?.name ?? "").trim(),
      )
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [user?.roles]);

  const permissions = useMemo(() => {
    const list = Array.isArray(user?.permissions) ? user?.permissions : [];
    return list
      .map((permission) =>
        typeof permission === "string"
          ? permission.trim()
          : String(permission?.name ?? "").trim(),
      )
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [user?.permissions]);

  const permissionsByModule = useMemo(() => {
    const grouped = new Map<string, string[]>();

    for (const permissionName of permissions) {
      const key = permissionName.toUpperCase();
      const moduleName = String(permissionCatalogByName.get(key)?.module_name ?? "").trim() || inferModuleFromPermissionName(permissionName);

      if (!grouped.has(moduleName)) {
        grouped.set(moduleName, []);
      }
      grouped.get(moduleName)!.push(permissionName);
    }

    const entries = Array.from(grouped.entries()).map(([moduleName, values]) => [
      moduleName,
      [...new Set(values)].sort((a, b) => a.localeCompare(b)),
    ] as const);

    entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries;
  }, [permissionCatalogByName, permissions]);

  const moduleTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const permission of permissionCatalogByName.values()) {
      const moduleName = String(permission.module_name ?? "").trim() || "General";
      totals.set(moduleName, (totals.get(moduleName) ?? 0) + 1);
    }
    return totals;
  }, [permissionCatalogByName]);

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Manage Roles — {roles.length > 0 ? roles.join(", ") : "No Role"}</h1>
      </div>

      {!canManagePermissions ? (
        <div className="warningBox" style={{ marginTop: 10 }}>
          You can view this information, but you do not have permission to add, edit, or remove roles and permissions.
        </div>
      ) : null}

      {error ? <div className="errorBox">{error}</div> : null}

      {loading ? (
        <div className="placeholderSpinnerWrap" role="status" aria-live="polite"><span className="placeholderSpinner" aria-hidden="true" /><span className="srOnly">Loading</span></div>
      ) : (
        permissionsByModule.length === 0 ? (
          <div className="dashCard" style={{ marginTop: 12 }}>
            <h2 className="editFormTitle">Assigned Permissions</h2>
            <p className="pageText">No permissions assigned.</p>
          </div>
        ) : (
          <div
            className="dashboardGrid"
            style={{
              marginTop: 12,
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            }}
          >
            {permissionsByModule.map(([moduleName, modulePermissions]) => {
              const total = moduleTotals.get(moduleName) ?? modulePermissions.length;
              return (
                <section key={moduleName} className="dashCard" aria-label={`${moduleName} permissions`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <h2 className="editFormTitle" style={{ marginBottom: 0 }}>{moduleName}</h2>
                    <span className="readLabel">{modulePermissions.length}/{total}</span>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {modulePermissions.map((permissionName) => {
                      const key = permissionName.toUpperCase();
                      const actionType = String(permissionCatalogByName.get(key)?.action_type ?? "").trim().toUpperCase() || inferActionFromPermissionName(permissionName);
                      return (
                        <label key={permissionName} className="fieldCheckbox" style={{ alignItems: "center" }}>
                          <input type="checkbox" checked readOnly />
                          <span className="fieldLabel" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span>{permissionName}</span>
                            <span className="readLabel">({actionType})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
