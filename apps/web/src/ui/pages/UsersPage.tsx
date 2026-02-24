import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  type AdminUser,
  listAdminUsers,
  getAdminUser,
  blockUser,
  getUserRoles,
  setUserRoles,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

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
  children,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="modalOverlay" role="presentation" onMouseDown={onCancel}>
      <div className="modalCard" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalTitle">{title}</div>
        <div className="modalMessage">{message}</div>
        {children}
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

function StatusBadge({ blocked, active }: { blocked?: boolean; active?: boolean }) {
  if (blocked) {
    return <span className="chipBadge" style={{ background: "#fee2e2", color: "#b91c1c" }}>Blocked</span>;
  }
  if (active === false) {
    return <span className="chipBadge" style={{ background: "#fef3c7", color: "#92400e" }}>Inactive</span>;
  }
  return <span className="chipBadge" style={{ background: "#dcfce7", color: "#166534" }}>Active</span>;
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function UsersPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canManageUsers = hasPermission("MANAGE_USERS");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [summary, setSummary] = useState({ total_users: 0, active_users: 0, blocked_users: 0 });

  // Detail panel
  const [openUserId, setOpenUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUser | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Block / Unblock
  const [blockModalUser, setBlockModalUser] = useState<AdminUser | null>(null);
  const [blockAction, setBlockAction] = useState<"block" | "unblock">("block");
  const [blockReason, setBlockReason] = useState("");

  // Assign roles
  const [rolesModalUser, setRolesModalUser] = useState<AdminUser | null>(null);
  const [allRoles, setAllRoles] = useState<{ id: string; name: string }[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [rolesLoading, setRolesLoading] = useState(false);

  const load = useCallback(async (page = 1) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const data = await listAdminUsers(accessToken, {
        page,
        limit: pagination.limit,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      setUsers(data.users);
      setPagination(data.pagination);
      setSummary(data.summary);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [accessToken, pagination.limit, search, roleFilter, statusFilter]);

  useEffect(() => { load(1); }, [load]);

  function clearMessages() { setError(null); setSuccess(null); }

  /* -- View user details -- */
  async function openDetail(user: AdminUser) {
    if (!accessToken) return;
    clearMessages();
    setOpenUserId(user.id);
    setDetailLoading(true);
    try {
      const detail = await getAdminUser(accessToken, user.id);
      setUserDetail(detail);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to load user details");
      setUserDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  /* -- Block / Unblock -- */
  function startBlock(user: AdminUser) {
    if (!canManageUsers) return;
    clearMessages();
    const action = user.is_blocked ? "unblock" : "block";
    setBlockAction(action);
    setBlockModalUser(user);
    setBlockReason("");
  }

  async function onConfirmBlock() {
    if (!accessToken || !blockModalUser || !canManageUsers) return;
    try {
      clearMessages();
      setSaving(true);
      const result = await blockUser(accessToken, blockModalUser.id, {
        block: blockAction === "block",
        reason: blockAction === "block" ? blockReason.trim() || undefined : undefined,
      });
      setSuccess(result.message ?? `User ${blockAction === "block" ? "blocked" : "unblocked"} successfully`);
      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === blockModalUser.id
            ? {
                ...u,
                is_blocked: blockAction === "block",
                blocked_at: blockAction === "block" ? new Date().toISOString() : null,
                block_reason: blockAction === "block" ? blockReason.trim() || null : null,
              }
            : u,
        ),
      );
      // Update summary counts
      setSummary((prev) => ({
        ...prev,
        blocked_users: blockAction === "block" ? prev.blocked_users + 1 : Math.max(0, prev.blocked_users - 1),
        active_users: blockAction === "block" ? Math.max(0, prev.active_users - 1) : prev.active_users + 1,
      }));
      // Update detail if viewing the same user
      if (openUserId === blockModalUser.id && userDetail) {
        setUserDetail({
          ...userDetail,
          is_blocked: blockAction === "block",
          blocked_at: blockAction === "block" ? new Date().toISOString() : null,
          block_reason: blockAction === "block" ? blockReason.trim() || null : null,
        });
      }
      setBlockModalUser(null);
      setBlockReason("");
    } catch (e) {
      setError((e as any)?.message ?? `Failed to ${blockAction} user`);
    } finally {
      setSaving(false);
    }
  }

  async function startAssignRoles(user: AdminUser) {
    if (!accessToken || !canManageUsers) return;
    try {
      setRolesLoading(true);
      setError(null);
      const data = await getUserRoles(accessToken, user.id);
      setAllRoles(data.all_roles ?? []);
      setSelectedRoleIds(new Set((data.roles ?? []).map((r) => r.id)));
      setRolesModalUser(user);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load user roles");
    } finally {
      setRolesLoading(false);
    }
  }

  async function onSaveAssignedRoles() {
    if (!accessToken || !rolesModalUser || !canManageUsers) return;
    try {
      setSaving(true);
      setError(null);
      await setUserRoles(accessToken, rolesModalUser.id, [...selectedRoleIds]);
      setSuccess("Roles updated successfully");
      setRolesModalUser(null);
      await load(pagination.page);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to assign roles");
    } finally {
      setSaving(false);
    }
  }

  /* -- Pagination -- */
  function goToPage(page: number) {
    if (page < 1 || page > pagination.pages) return;
    load(page);
  }

  /* -- Render -- */
  if (loading && users.length === 0) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Users</h1></div>
        <p className="pageText">Loading…</p>
      </div>
    );
  }

  const displayName = (u: AdminUser) => {
    const parts = [u.first_name, u.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "—";
  };

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Users</h1>
      </div>

      {error && <div className="errorBox">{error}</div>}
      {success && <div className="successBox">{success}</div>}

      {/* Summary cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="dropPanel" style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "12px 16px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{summary.total_users}</div>
          <div className="readLabel">Total Users</div>
        </div>
        <div className="dropPanel" style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "12px 16px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#166534" }}>{summary.active_users}</div>
          <div className="readLabel">Active</div>
        </div>
        <div className="dropPanel" style={{ flex: 1, minWidth: 140, textAlign: "center", padding: "12px 16px" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#b91c1c" }}>{summary.blocked_users}</div>
          <div className="readLabel">Blocked</div>
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label className="fieldLabel">Search</label>
          <input
            className="input"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ minWidth: 140 }}>
          <label className="fieldLabel">Role</label>
          <select
            className="input"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="employer">Employer</option>
            <option value="job_seeker">Job Seeker</option>
            <option value="hr_manager">HR Manager</option>
          </select>
        </div>
        <div style={{ minWidth: 140 }}>
          <label className="fieldLabel">Status</label>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="tableWrap" role="region" aria-label="Users table">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role(s)</th>
              <th>Company</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th className="thRight">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={7}><div className="emptyState">No users found.</div></td></tr>
            ) : (
              users.map((user) => {
                const isOpen = openUserId === user.id;
                return (
                  <UserRow
                    key={user.id}
                    user={user}
                    open={isOpen}
                    saving={saving}
                    displayName={displayName(user)}
                    canManageUsers={canManageUsers}
                    onView={() => {
                      if (isOpen) { setOpenUserId(null); return; }
                      openDetail(user);
                    }}
                    onBlock={() => startBlock(user)}
                    onAssignRoles={() => void startAssignRoles(user)}
                  >
                    {isOpen && (
                      <tr className="tableExpandRow">
                        <td colSpan={7}>
                          <div className="dropPanel">
                            {detailLoading ? (
                              <p className="pageText">Loading user details…</p>
                            ) : userDetail ? (
                              <div className="editForm">
                                <h2 className="editFormTitle">User Details</h2>
                                <div className="profileReadGrid">
                                  <ReadField label="First Name" value={userDetail.first_name} />
                                  <ReadField label="Last Name" value={userDetail.last_name} />
                                  <ReadField label="Email" value={userDetail.email} />
                                  <ReadField label="Phone" value={userDetail.phone} />
                                  <ReadField label="Role" value={userDetail.role} />
                                  <ReadField label="Company" value={userDetail.company_name} />
                                  <ReadField
                                    label="Email Verified"
                                    value={userDetail.email_verified ? "Yes" : "No"}
                                  />
                                  <ReadField label="Login Count" value={userDetail.login_count} />
                                  <ReadField
                                    label="Last Login"
                                    value={userDetail.last_login ? new Date(userDetail.last_login).toLocaleString() : null}
                                  />
                                  <ReadField
                                    label="Created"
                                    value={userDetail.created_at ? new Date(userDetail.created_at).toLocaleString() : null}
                                  />
                                  <ReadField label="Jobs Posted" value={userDetail.jobs_posted} />
                                  <ReadField label="Applications Submitted" value={userDetail.applications_submitted} />
                                </div>

                                {/* Block status details */}
                                {userDetail.is_blocked && (
                                  <div style={{ marginTop: 16, padding: "12px 16px", background: "#fee2e2", borderRadius: 8 }}>
                                    <strong style={{ color: "#b91c1c" }}>User is Blocked</strong>
                                    {userDetail.blocked_at && (
                                      <div style={{ marginTop: 4, fontSize: "0.9em", color: "#7f1d1d" }}>
                                        Blocked on: {new Date(userDetail.blocked_at).toLocaleString()}
                                      </div>
                                    )}
                                    {userDetail.block_reason && (
                                      <div style={{ marginTop: 4, fontSize: "0.9em", color: "#7f1d1d" }}>
                                        Reason: {userDetail.block_reason}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Skills */}
                                {userDetail.skills && userDetail.skills.length > 0 && (
                                  <div style={{ marginTop: 16 }}>
                                    <span className="readLabel">Skills:</span>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                      {userDetail.skills.map((s: any, i: number) => (
                                        <span key={i} className="chipBadge">{typeof s === "string" ? s : s.name ?? s.skill_name ?? JSON.stringify(s)}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Certifications */}
                                {userDetail.certifications && userDetail.certifications.length > 0 && (
                                  <div style={{ marginTop: 16 }}>
                                    <span className="readLabel">Certifications:</span>
                                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                      {userDetail.certifications.map((c: any, i: number) => (
                                        <span key={i} className="chipBadge">{typeof c === "string" ? c : c.name ?? c.certification_name ?? JSON.stringify(c)}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="stepperActions" style={{ marginTop: 16 }}>
                                  <button
                                    className="btn btnGhost"
                                    type="button"
                                    onClick={() => setOpenUserId(null)}
                                  >
                                    Close
                                  </button>
                                  {canManageUsers && (
                                    <>
                                      <button
                                        className={userDetail.is_blocked ? "btn btnGhost btnSm stepperSaveBtn" : "btn btnDanger"}
                                        type="button"
                                        onClick={() => startBlock(userDetail)}
                                        disabled={saving}
                                      >
                                        {userDetail.is_blocked ? "Unblock User" : "Block User"}
                                      </button>
                                      <button
                                        className="btn btnGhost btnSm stepperSaveBtn"
                                        type="button"
                                        onClick={() => void startAssignRoles(userDetail)}
                                        disabled={saving}
                                      >
                                        Assign Roles
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="pageText">Failed to load user details.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </UserRow>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 16 }}>
          <button
            className="btn btnGhost btnSm"
            type="button"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || loading}
          >
            ← Previous
          </button>
          <span className="readLabel">
            Page {pagination.page} of {pagination.pages} ({pagination.total} users)
          </span>
          <button
            className="btn btnGhost btnSm"
            type="button"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.pages || loading}
          >
            Next →
          </button>
        </div>
      )}

      {/* Block / Unblock modal */}
      <ConfirmModal
        open={Boolean(blockModalUser)}
        title={blockAction === "block" ? "Block User" : "Unblock User"}
        message={
          blockAction === "block"
            ? `Are you sure you want to block ${blockModalUser?.first_name ?? ""} ${blockModalUser?.last_name ?? ""} (${blockModalUser?.email ?? ""})? They will not be able to log in.`
            : `Are you sure you want to unblock ${blockModalUser?.first_name ?? ""} ${blockModalUser?.last_name ?? ""} (${blockModalUser?.email ?? ""})? They will be able to log in again.`
        }
        confirmLabel={
          saving
            ? (blockAction === "block" ? "Blocking…" : "Unblocking…")
            : (blockAction === "block" ? "Block" : "Unblock")
        }
        busy={saving}
        onCancel={() => { setBlockModalUser(null); setBlockReason(""); }}
        onConfirm={onConfirmBlock}
      >
        {blockAction === "block" && (
          <div style={{ padding: "0 24px", marginBottom: 8 }}>
            <label className="fieldLabel">Reason (optional)</label>
            <textarea
              className="input textarea"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Provide a reason for blocking this user…"
              rows={3}
            />
          </div>
        )}
      </ConfirmModal>

      <ConfirmModal
        open={Boolean(rolesModalUser)}
        title="Assign Roles"
        message={rolesModalUser ? `Assign roles for ${rolesModalUser.email}` : ""}
        confirmLabel={saving ? "Saving..." : "Save Roles"}
        busy={saving || rolesLoading}
        onCancel={() => setRolesModalUser(null)}
        onConfirm={() => void onSaveAssignedRoles()}
      >
        <div style={{ padding: "0 24px", marginBottom: 8 }}>
          {rolesLoading ? (
            <p className="pageText">Loading roles...</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
              {allRoles.map((role) => (
                <label key={role.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.has(role.id)}
                    onChange={() =>
                      setSelectedRoleIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(role.id)) next.delete(role.id);
                        else next.add(role.id);
                        return next;
                      })
                    }
                  />
                  <span>{role.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  User row with expand/collapse                                      */
/* ------------------------------------------------------------------ */

function UserRow({
  user,
  open,
  saving,
  canManageUsers,
  displayName,
  onView,
  onBlock,
  onAssignRoles,
  children,
}: {
  user: AdminUser;
  open: boolean;
  saving: boolean;
  canManageUsers: boolean;
  displayName: string;
  onView: () => void;
  onBlock: () => void;
  onAssignRoles: () => void;
  children: ReactNode;
}) {
  const joinedDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : "—";
  const isBlocked = Boolean(user.is_blocked);

  return (
    <>
      <tr className={open ? "tableRowActive" : undefined}>
        <td className="tdStrong">{displayName}</td>
        <td>{user.email}</td>
        <td>{user.role ?? "—"}</td>
        <td>{user.company_name ?? "—"}</td>
        <td>
          <StatusBadge blocked={user.is_blocked} active={user.is_active} />
        </td>
        <td>{joinedDate}</td>
        <td className="tdRight">
          <ActionMenu
            disabled={saving}
            label="Action"
            items={[
              { key: "view", label: open ? "Close" : "View Details", onClick: onView },
              ...(canManageUsers
                ? [{
                    key: isBlocked ? "unblock" : "block",
                    label: isBlocked ? "Unblock" : "Block",
                    onClick: onBlock,
                    danger: !isBlocked,
                  }]
                : []),
              ...(canManageUsers
                ? [{ key: "assign-roles", label: "Assign Roles", onClick: onAssignRoles }]
                : []),
            ]}
          />
        </td>
      </tr>
      {children}
    </>
  );
}
