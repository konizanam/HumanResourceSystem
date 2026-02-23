import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  type Role,
  type Permission,
  type RoleDetail,
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  setRolePermissions,
  listPermissions,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";

/* ------------------------------------------------------------------ */
/*  Reusable helpers (same pattern as CompaniesPage)                   */
/* ------------------------------------------------------------------ */

function ActionMenu({
  label,
  items,
  disabled,
}: {
  label: string;
  disabled: boolean;
  items: { key: string; label: string; onClick: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div ref={wrapRef} className={"actionMenu" + (open ? " actionMenuOpen" : "")}>
      <button
        type="button"
        className={"btn btnGhost btnSm actionMenuBtn stepperSaveBtn" + (disabled ? " actionMenuBtnDisabled" : "")}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); if (!disabled) setOpen((v) => !v); }}
      >
        {label}
      </button>
      {open && (
        <div className="actionMenuList" role="menu">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              className={"actionMenuItem" + (it.danger ? " actionMenuItemDanger" : "")}
              onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}
              disabled={disabled}
              role="menuitem"
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="modalOverlay" role="presentation" onMouseDown={onCancel}>
      <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalTitle">{title}</div>
        <div className="modalMessage">{message}</div>
        <div className="modalActions">
          <button className="btn btnGhost" type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className="btn btnDanger" type="button" onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: unknown }) {
  const display = value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
  return (
    <div className="readField">
      <span className="readLabel">{label}</span>
      <span className="readValue">{display}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

type PanelMode = "view" | "edit" | "permissions";

export function RolesPage() {
  const { accessToken } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState("");

  // Add panel
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({});

  // Detail panel
  const [openRoleId, setOpenRoleId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("view");
  const [roleDetail, setRoleDetail] = useState<RoleDetail | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Permissions assignment
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredRoles = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [roles, search]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const data = await listRoles(accessToken, { limit: 100 });
      setRoles(data.roles);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  function clearMessages() { setError(null); setSuccess(null); }

  /* -- Add role -- */
  async function onAddRole() {
    if (!accessToken) return;
    const errs: Record<string, string> = {};
    if (!addName.trim()) errs.name = "Role name is required";
    setAddFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      clearMessages();
      setSaving(true);
      const created = await createRole(accessToken, {
        name: addName.trim(),
        description: addDesc.trim() || undefined,
      });
      setRoles((prev) => [{ ...created, user_count: 0, permission_count: 0 }, ...prev]);
      setSuccess("Role created successfully");
      setAddOpen(false);
      setAddName("");
      setAddDesc("");
      setAddFieldErrors({});
    } catch (e) {
      setError((e as any)?.message ?? "Failed to create role");
    } finally {
      setSaving(false);
    }
  }

  /* -- View / Edit role -- */
  async function openPanel(role: Role, mode: PanelMode) {
    if (!accessToken) return;
    clearMessages();
    setAddOpen(false);
    setOpenRoleId(role.id);
    setPanelMode(mode);

    if (mode === "view" || mode === "edit") {
      try {
        const detail = await getRole(accessToken, role.id);
        setRoleDetail(detail);
        setEditName(detail.name);
        setEditDesc(detail.description ?? "");
      } catch (e) {
        setError((e as any)?.message ?? "Failed to load role details");
      }
    }

    if (mode === "permissions") {
      setPermissionsLoading(true);
      try {
        const data = await getRolePermissions(accessToken, role.id);
        setAllPermissions(data.all_permissions);
        setSelectedPermIds(new Set(data.permissions.map((p) => p.id)));
      } catch (e) {
        setError((e as any)?.message ?? "Failed to load permissions");
      } finally {
        setPermissionsLoading(false);
      }
    }
  }

  async function onSaveEdit() {
    if (!accessToken || !openRoleId) return;
    try {
      clearMessages();
      setSaving(true);
      const updated = await updateRole(accessToken, openRoleId, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)));
      setSuccess("Role updated successfully");
      setPanelMode("view");
      if (roleDetail) setRoleDetail({ ...roleDetail, ...updated });
    } catch (e) {
      setError((e as any)?.message ?? "Failed to update role");
    } finally {
      setSaving(false);
    }
  }

  async function onSavePermissions() {
    if (!accessToken || !openRoleId) return;
    try {
      clearMessages();
      setSaving(true);
      await setRolePermissions(accessToken, openRoleId, [...selectedPermIds]);
      setSuccess("Permissions assigned successfully");
      setRoles((prev) =>
        prev.map((r) => (r.id === openRoleId ? { ...r, permission_count: selectedPermIds.size } : r)),
      );
      setOpenRoleId(null);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to assign permissions");
    } finally {
      setSaving(false);
    }
  }

  /* -- Delete -- */
  async function onConfirmDelete() {
    if (!accessToken || !confirmDeleteId) return;
    try {
      clearMessages();
      setSaving(true);
      await deleteRole(accessToken, confirmDeleteId);
      setRoles((prev) => prev.filter((r) => r.id !== confirmDeleteId));
      setSuccess("Role deleted successfully");
      setConfirmDeleteId(null);
      if (openRoleId === confirmDeleteId) setOpenRoleId(null);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to delete role");
    } finally {
      setSaving(false);
    }
  }

  /* -- Permission grouping for the modal -- */
  const groupedPermissions = useMemo(() => {
    const map = new Map<string, Permission[]>();
    for (const p of allPermissions) {
      const mod = p.module_name || "General";
      if (!map.has(mod)) map.set(mod, []);
      map.get(mod)!.push(p);
    }
    return map;
  }, [allPermissions]);

  /* -- Render -- */
  if (loading) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Roles</h1></div>
        <p className="pageText">Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Roles</h1>
        <button
          type="button"
          className="btn btnGhost btnSm stepperSaveBtn"
          onClick={() => { clearMessages(); setOpenRoleId(null); setAddOpen((v) => !v); }}
          disabled={saving}
        >
          {addOpen ? "Cancel" : "Add Role"}
        </button>
      </div>

      {error && <div className="errorBox">{error}</div>}
      {success && <div className="successBox">{success}</div>}

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          className="input"
          placeholder="Search roles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
      </div>

      {/* Add panel */}
      {addOpen && (
        <div className="dropPanel" role="region" aria-label="Add role">
          <div className="editForm">
            <h2 className="editFormTitle">Add Role</h2>
            <div className="editGrid">
              <div className="field">
                <label className="fieldLabel">Role Name *</label>
                <input
                  className="input"
                  value={addName}
                  onChange={(e) => { setAddFieldErrors({}); setAddName(e.target.value); }}
                  placeholder="e.g. HR_MANAGER"
                  required
                />
                {addFieldErrors.name && <span className="fieldError">{addFieldErrors.name}</span>}
              </div>
              <div className="field">
                <label className="fieldLabel">Description</label>
                <input
                  className="input"
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <div className="stepperActions">
              <button className="btn btnGhost btnSm stepperSaveBtn" onClick={onAddRole} disabled={saving} type="button">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="tableWrap" role="region" aria-label="Roles table">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th className="thRight">Users</th>
              <th className="thRight">Permissions</th>
              <th>Created</th>
              <th className="thRight">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoles.length === 0 ? (
              <tr><td colSpan={6}><div className="emptyState">No roles found.</div></td></tr>
            ) : (
              filteredRoles.map((role) => {
                const isOpen = openRoleId === role.id;
                return (
                  <RoleRow
                    key={role.id}
                    role={role}
                    open={isOpen}
                    saving={saving}
                    onView={() => openPanel(role, "view")}
                    onEdit={() => openPanel(role, "edit")}
                    onPermissions={() => openPanel(role, "permissions")}
                    onDelete={() => { clearMessages(); setConfirmDeleteId(role.id); }}
                    onClose={() => setOpenRoleId(null)}
                  >
                    {isOpen && panelMode === "view" && roleDetail && (
                      <tr className="tableExpandRow">
                        <td colSpan={6}>
                          <div className="dropPanel">
                            <div className="editForm">
                              <h2 className="editFormTitle">View Role</h2>
                              <div className="profileReadGrid">
                                <ReadField label="Name" value={roleDetail.name} />
                                <ReadField label="Description" value={roleDetail.description} />
                                <ReadField label="Users" value={roleDetail.users?.length ?? 0} />
                                <ReadField label="Permissions" value={roleDetail.permissions?.length ?? 0} />
                              </div>
                              {roleDetail.permissions && roleDetail.permissions.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                  <span className="readLabel">Assigned Permissions:</span>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                    {roleDetail.permissions.map((p) => (
                                      <span key={p.id} className="chipBadge">{p.name}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {roleDetail.users && roleDetail.users.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                  <span className="readLabel">Assigned Users:</span>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                    {roleDetail.users.map((u) => (
                                      <span key={u.id} className="chipBadge">{u.first_name} {u.last_name} ({u.email})</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {isOpen && panelMode === "edit" && (
                      <tr className="tableExpandRow">
                        <td colSpan={6}>
                          <div className="dropPanel">
                            <div className="editForm">
                              <h2 className="editFormTitle">Edit Role</h2>
                              <div className="editGrid">
                                <div className="field">
                                  <label className="fieldLabel">Role Name *</label>
                                  <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                                </div>
                                <div className="field">
                                  <label className="fieldLabel">Description</label>
                                  <input className="input" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                                </div>
                              </div>
                              <div className="stepperActions">
                                <button className="btn btnGhost" type="button" onClick={() => setPanelMode("view")} disabled={saving}>Cancel</button>
                                <button className="btn btnGhost btnSm stepperSaveBtn" type="button" onClick={onSaveEdit} disabled={saving}>
                                  {saving ? "Saving…" : "Save"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {isOpen && panelMode === "permissions" && (
                      <tr className="tableExpandRow">
                        <td colSpan={6}>
                          <div className="dropPanel">
                            <div className="editForm">
                              <h2 className="editFormTitle">Manage Permissions — {role.name}</h2>
                              {permissionsLoading ? (
                                <p className="pageText">Loading permissions…</p>
                              ) : (
                                <>
                                  {[...groupedPermissions.entries()].map(([mod, perms]) => (
                                    <div key={mod} style={{ marginBottom: 16 }}>
                                      <strong className="readLabel">{mod}</strong>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                                        {perms.map((p) => (
                                          <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                                            <input
                                              type="checkbox"
                                              checked={selectedPermIds.has(p.id)}
                                              onChange={() => {
                                                setSelectedPermIds((prev) => {
                                                  const next = new Set(prev);
                                                  if (next.has(p.id)) next.delete(p.id);
                                                  else next.add(p.id);
                                                  return next;
                                                });
                                              }}
                                            />
                                            <span>{p.name}</span>
                                            {p.action_type && <span style={{ color: "#888", fontSize: "0.85em" }}>({p.action_type})</span>}
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                  {allPermissions.length === 0 && (
                                    <p className="pageText">No permissions defined yet.</p>
                                  )}
                                  <div className="stepperActions">
                                    <button className="btn btnGhost" type="button" onClick={() => setOpenRoleId(null)} disabled={saving}>Cancel</button>
                                    <button className="btn btnGhost btnSm stepperSaveBtn" type="button" onClick={onSavePermissions} disabled={saving}>
                                      {saving ? "Saving…" : `Save (${selectedPermIds.size} selected)`}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </RoleRow>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title="Delete role"
        message="Are you sure you want to delete this role? This cannot be undone."
        confirmLabel={saving ? "Deleting…" : "Delete"}
        busy={saving}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row component with expand/collapse                                 */
/* ------------------------------------------------------------------ */

function RoleRow({
  role,
  open,
  saving,
  onView,
  onEdit,
  onPermissions,
  onDelete,
  onClose,
  children,
}: {
  role: Role;
  open: boolean;
  saving: boolean;
  onView: () => void;
  onEdit: () => void;
  onPermissions: () => void;
  onDelete: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  const created = role.created_at ? new Date(role.created_at).toLocaleDateString() : "—";
  return (
    <>
      <tr className={open ? "tableRowActive" : undefined}>
        <td className="tdStrong">{role.name}</td>
        <td>{role.description ?? "—"}</td>
        <td className="tdRight">{role.user_count ?? 0}</td>
        <td className="tdRight">{role.permission_count ?? 0}</td>
        <td>{created}</td>
        <td className="tdRight">
          <ActionMenu
            disabled={saving}
            label="Action"
            items={[
              { key: "view", label: open ? "Close" : "View", onClick: open ? onClose : onView },
              { key: "edit", label: "Edit", onClick: onEdit },
              { key: "permissions", label: "Permissions", onClick: onPermissions },
              { key: "delete", label: "Delete", onClick: onDelete, danger: true },
            ]}
          />
        </td>
      </tr>
      {children}
    </>
  );
}
