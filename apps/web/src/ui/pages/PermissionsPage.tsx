import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Permission,
  listPermissions,
  createPermission,
  deletePermission,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

function ActionMenu({
  label, items, disabled,
}: {
  label: string; disabled: boolean;
  items: { key: string; label: string; onClick: () => void; danger?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); }
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [open]);
  return (
    <div ref={wrapRef} className={"actionMenu" + (open ? " actionMenuOpen" : "")}>
      <button type="button" className={"btn btnGhost btnSm actionMenuBtn stepperSaveBtn" + (disabled ? " actionMenuBtnDisabled" : "")} disabled={disabled} aria-haspopup="menu" aria-expanded={open} onClick={(e) => { e.stopPropagation(); if (!disabled) setOpen((v) => !v); }}>{label}</button>
      {open && (
        <div className="actionMenuList" role="menu">
          {items.map((it) => (
            <button key={it.key} type="button" className={"actionMenuItem" + (it.danger ? " actionMenuItemDanger" : "")} onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }} disabled={disabled} role="menuitem">{it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmLabel, busy, onCancel, onConfirm }: { open: boolean; title: string; message: string; confirmLabel: string; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
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

const MODULE_OPTIONS = ["Jobs", "Applications", "Candidates", "Company", "Users", "System", "Reports"];
const ACTION_OPTIONS = ["CREATE", "VIEW", "UPDATE", "DELETE", "APPROVE", "MANAGE"];

export function PermissionsPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canManageUsers = hasPermission("MANAGE_USERS");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Permission[]>>({});
  const [search, setSearch] = useState("");

  // Add form
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addModule, setAddModule] = useState("");
  const [addAction, setAddAction] = useState("");
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({});

  // Delete
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredGrouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return grouped;
    const filtered: Record<string, Permission[]> = {};
    for (const [mod, perms] of Object.entries(grouped)) {
      const matches = perms.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q) || p.module_name.toLowerCase().includes(q),
      );
      if (matches.length > 0) filtered[mod] = matches;
    }
    return filtered;
  }, [grouped, search]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true); setError(null);
      const data = await listPermissions(accessToken);
      setPermissions(data.permissions);
      setGrouped(data.grouped);
    } catch (e) { setError((e as any)?.message ?? "Failed to load permissions"); }
    finally { setLoading(false); }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  function clearMessages() { setError(null); setSuccess(null); }

  async function onAddPermission() {
    if (!accessToken || !canManageUsers) return;
    const errs: Record<string, string> = {};
    if (!addName.trim()) errs.name = "Permission name is required";
    if (!addModule.trim()) errs.module_name = "Module is required";
    if (!addAction.trim()) errs.action_type = "Action type is required";
    setAddFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      clearMessages(); setSaving(true);
      await createPermission(accessToken, {
        name: addName.trim(),
        description: addDesc.trim() || undefined,
        module_name: addModule.trim(),
        action_type: addAction.trim(),
      });
      // Refresh list to get proper grouping
      const data = await listPermissions(accessToken);
      setPermissions(data.permissions);
      setGrouped(data.grouped);
      setSuccess("Permission created successfully");
      setAddOpen(false); setAddName(""); setAddDesc(""); setAddModule(""); setAddAction(""); setAddFieldErrors({});
    } catch (e) { setError((e as any)?.message ?? "Failed to create permission"); }
    finally { setSaving(false); }
  }

  async function onConfirmDelete() {
    if (!accessToken || !confirmDeleteId || !canManageUsers) return;
    try {
      clearMessages(); setSaving(true);
      await deletePermission(accessToken, confirmDeleteId);
      // Refresh list
      const data = await listPermissions(accessToken);
      setPermissions(data.permissions);
      setGrouped(data.grouped);
      setSuccess("Permission deleted successfully");
      setConfirmDeleteId(null);
    } catch (e) { setError((e as any)?.message ?? "Failed to delete permission"); }
    finally { setSaving(false); }
  }

  if (loading) {
    return (<div className="page"><div className="companiesHeader"><h1 className="pageTitle">Permissions</h1></div><p className="pageText">Loading…</p></div>);
  }

  const moduleKeys = Object.keys(filteredGrouped).sort();

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Permissions ({permissions.length})</h1>
        {canManageUsers && (
          <button type="button" className="btn btnGhost btnSm stepperSaveBtn" onClick={() => { clearMessages(); setAddOpen((v) => !v); }} disabled={saving}>{addOpen ? "Cancel" : "Add Permission"}</button>
        )}
      </div>

      {error && <div className="errorBox">{error}</div>}
      {success && <div className="successBox">{success}</div>}

      <div style={{ marginBottom: 16 }}>
        <input className="input" placeholder="Search permissions…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320 }} />
      </div>

      {/* Add form */}
      {addOpen && canManageUsers && (
        <div className="dropPanel" role="region" aria-label="Add permission">
          <div className="editForm">
            <h2 className="editFormTitle">Add Permission</h2>
            <div className="editGrid">
              <div className="field">
                <label className="fieldLabel">Permission Name *</label>
                <input className="input" value={addName} onChange={(e) => { setAddFieldErrors({}); setAddName(e.target.value); }} placeholder="e.g. CREATE_JOB" required />
                {addFieldErrors.name && <span className="fieldError">{addFieldErrors.name}</span>}
              </div>
              <div className="field">
                <label className="fieldLabel">Module *</label>
                <select className="input" value={addModule} onChange={(e) => { setAddFieldErrors({}); setAddModule(e.target.value); }}>
                  <option value="">Select module</option>
                  {MODULE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                {addFieldErrors.module_name && <span className="fieldError">{addFieldErrors.module_name}</span>}
              </div>
              <div className="field">
                <label className="fieldLabel">Action Type *</label>
                <select className="input" value={addAction} onChange={(e) => { setAddFieldErrors({}); setAddAction(e.target.value); }}>
                  <option value="">Select action</option>
                  {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                {addFieldErrors.action_type && <span className="fieldError">{addFieldErrors.action_type}</span>}
              </div>
              <div className="field">
                <label className="fieldLabel">Description</label>
                <input className="input" value={addDesc} onChange={(e) => setAddDesc(e.target.value)} placeholder="Optional description" />
              </div>
            </div>
            <div className="stepperActions">
              <button className="btn btnGhost btnSm stepperSaveBtn" onClick={onAddPermission} disabled={saving} type="button">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Grouped table */}
      {moduleKeys.length === 0 ? (
        <div className="emptyState">No permissions found.</div>
      ) : (
        moduleKeys.map((mod) => (
          <div key={mod} style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: "1rem", fontWeight: 600 }}>{mod}</h3>
            <div className="tableWrap">
              <table className="table companiesTable">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Action Type</th>
                    <th className="thRight">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGrouped[mod].map((p) => (
                    <tr key={p.id}>
                      <td className="tdStrong">{p.name}</td>
                      <td>{p.description ?? "—"}</td>
                      <td><span className="chipBadge">{p.action_type}</span></td>
                      <td className="tdRight">
                        {canManageUsers ? (
                          <ActionMenu disabled={saving} label="Action" items={[
                            { key: "delete", label: "Delete", onClick: () => { clearMessages(); setConfirmDeleteId(p.id); }, danger: true },
                          ]} />
                        ) : (
                          <span className="readValue">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <ConfirmModal open={Boolean(confirmDeleteId)} title="Delete Permission" message="Are you sure you want to delete this permission? Roles using it will lose this permission." confirmLabel={saving ? "Deleting…" : "Delete"} busy={saving} onCancel={() => setConfirmDeleteId(null)} onConfirm={onConfirmDelete} />
    </div>
  );
}
