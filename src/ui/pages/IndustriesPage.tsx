import { useCallback, useEffect, useMemo, useState } from "react";
import {
  activateIndustry,
  createIndustry,
  deactivateIndustry,
  deleteIndustry,
  listIndustries,
  type Industry,
  updateIndustry,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { ActionMenu } from "../components/ActionMenu";

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

export function IndustriesPage() {
  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canManageIndustries = hasPermission("MANAGE_COMPANY", "MANAGE_USERS");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [industries, setIndustries] = useState<Industry[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [editIndustry, setEditIndustry] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return industries;
    return industries.filter((industry) => String(industry.name ?? "").toLowerCase().includes(q));
  }, [industries, search]);

  const pagination = useMemo(() => {
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pages);
    const start = (safePage - 1) * pageSize;
    return {
      page: safePage,
      pages,
      total,
      items: filtered.slice(start, start + pageSize),
    };
  }, [filtered, page, pageSize]);

  useEffect(() => {
    if (page > pagination.pages) setPage(pagination.pages);
  }, [page, pagination.pages]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const response = await listIndustries(accessToken, { page: 1, limit: 100, includeInactive: true });
      setIndustries(Array.isArray(response.industries) ? response.industries : []);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load industries");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function onAddIndustry() {
    if (!accessToken || !canManageIndustries) return;
    const name = addName.trim();
    if (!name) return;

    try {
      clearMessages();
      setSaving(true);
      const created = await createIndustry(accessToken, { name });
      setIndustries((prev) => [...prev, created].sort((a, b) => String(a.name).localeCompare(String(b.name))));
      setSuccess("Industry created successfully");
      setAddName("");
      setAddOpen(false);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to create industry");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEditIndustry() {
    if (!accessToken || !canManageIndustries || !editIndustry) return;

    const name = editIndustry.name.trim();
    if (!name) return;

    try {
      clearMessages();
      setSaving(true);
      const updated = await updateIndustry(accessToken, editIndustry.id, { name });
      setIndustries((prev) =>
        prev
          .map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
          .sort((a, b) => String(a.name).localeCompare(String(b.name))),
      );
      setSuccess("Industry updated successfully");
      setEditIndustry(null);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to update industry");
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    if (!accessToken || !canManageIndustries || !confirmDeleteId) return;

    try {
      clearMessages();
      setSaving(true);
      await deleteIndustry(accessToken, confirmDeleteId);
      setIndustries((prev) => prev.filter((item) => item.id !== confirmDeleteId));
      setSuccess("Industry deleted successfully");
      setConfirmDeleteId(null);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to delete industry");
    } finally {
      setSaving(false);
    }
  }

  async function onDeactivateIndustry(industryId: string) {
    if (!accessToken || !canManageIndustries) return;

    try {
      clearMessages();
      setSaving(true);
      const updated = await deactivateIndustry(accessToken, industryId);
      setIndustries((prev) =>
        prev
          .map((item) => (item.id === industryId ? { ...item, ...updated } : item))
          .sort((a, b) => String(a.name).localeCompare(String(b.name))),
      );
      setSuccess("Industry deactivated successfully");
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to deactivate industry");
    } finally {
      setSaving(false);
    }
  }

  async function onActivateIndustry(industryId: string) {
    if (!accessToken || !canManageIndustries) return;

    try {
      clearMessages();
      setSaving(true);
      const updated = await activateIndustry(accessToken, industryId);
      setIndustries((prev) =>
        prev
          .map((item) => (item.id === industryId ? { ...item, ...updated } : item))
          .sort((a, b) => String(a.name).localeCompare(String(b.name))),
      );
      setSuccess("Industry activated successfully");
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to activate industry");
    } finally {
      setSaving(false);
    }
  }

  const renderPager = (label: string, marginTop?: number) => (
    <div className="publicJobsPager" role="navigation" aria-label={label} style={marginTop ? { marginTop } : undefined}>
      <label className="publicJobsPagerSelect">
        Records
        <select
          className="input"
          value={String(pageSize)}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (!Number.isFinite(next) || next <= 0) return;
            setPage(1);
            setPageSize(next);
          }}
          disabled={loading}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </label>

      <button
        className="btn btnPrimary btnSm"
        style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
        type="button"
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={pagination.page <= 1 || loading}
      >
        {"<-"} Previous
      </button>

      <span className="publicJobsPagerInfo">
        Page {pagination.page} of {pagination.pages} ({pagination.total} industries)
      </span>

      <button
        className="btn btnPrimary btnSm"
        style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
        type="button"
        onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
        disabled={pagination.page >= pagination.pages || loading}
      >
        Next {"->"}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Industries</h1></div>
        <div className="placeholderSpinnerWrap" role="status" aria-live="polite"><span className="placeholderSpinner" aria-hidden="true" /><span className="srOnly">Loading</span></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Industries</h1>
      </div>

      {error ? <div className="errorBox">{error}</div> : null}
      {success ? <div className="successBox">{success}</div> : null}

      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Search industries..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: 260, maxWidth: 320, flex: "1 1 320px" }}
        />

        {canManageIndustries ? (
          <button
            type="button"
            className="btn btnGhost btnSm addToggleBtn"
            onClick={() => {
              clearMessages();
              setEditIndustry(null);
              setAddOpen((prev) => !prev);
            }}
            disabled={saving}
          >
            {addOpen ? "Cancel" : "Add Industry"}
          </button>
        ) : null}

        <div style={{ marginLeft: "auto" }}>
          {renderPager("Industries pagination top")}
        </div>
      </div>

      {addOpen && canManageIndustries ? (
        <div className="dropPanel" role="region" aria-label="Add industry">
          <div className="editForm">
            <h2 className="editFormTitle">Add Industry</h2>
            <div className="editGrid">
              <label className="field">
                <span className="fieldLabel">Industry Name</span>
                <input
                  className="input"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Information Technology"
                  required
                />
              </label>
            </div>
            <div className="stepperActions">
              <button
                className="btn btnGhost btnSm stepperSaveBtn"
                type="button"
                onClick={() => void onAddIndustry()}
                disabled={saving || !addName.trim()}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editIndustry && canManageIndustries ? (
        <div className="dropPanel" role="region" aria-label="Edit industry">
          <div className="editForm">
            <h2 className="editFormTitle">Edit Industry</h2>
            <div className="editGrid">
              <label className="field">
                <span className="fieldLabel">Industry Name</span>
                <input
                  className="input"
                  value={editIndustry.name}
                  onChange={(e) => setEditIndustry((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
                  required
                />
              </label>
            </div>
            <div className="stepperActions">
              <button className="btn btnGhost" type="button" onClick={() => setEditIndustry(null)} disabled={saving}>Cancel</button>
              <button
                className="btn btnGhost btnSm stepperSaveBtn"
                type="button"
                onClick={() => void onSaveEditIndustry()}
                disabled={saving || !editIndustry.name.trim()}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="tableWrap" role="region" aria-label="Industries table">
        <table className="table">
          <thead>
            <tr>
              <th>Industry</th>
              <th className="thRight">Companies</th>
              <th className="thRight">Jobs</th>
              <th>Updated</th>
              <th className="thRight">Action</th>
            </tr>
          </thead>
          <tbody>
            {pagination.items.length === 0 ? (
              <tr>
                <td colSpan={5}><div className="emptyState">No industries found.</div></td>
              </tr>
            ) : (
              pagination.items.map((industry) => {
                const updated = industry.updated_at
                  ? new Date(industry.updated_at).toLocaleDateString("en-GB")
                  : "-";
                const companyCount = Number(industry.company_count ?? 0);
                const isActive = String(industry.status ?? "active").toLowerCase() !== "inactive";
                const canDelete = companyCount === 0;

                return (
                  <tr key={industry.id}>
                    <td className="tdStrong">{industry.name}</td>
                    <td className="tdRight">{Number(industry.company_count ?? 0)}</td>
                    <td className="tdRight">{Number(industry.job_count ?? 0)}</td>
                    <td>{updated}</td>
                    <td className="tdRight">
                      {canManageIndustries ? (
                        <ActionMenu
                          label="Action"
                          disabled={saving}
                          items={[
                            {
                              key: "edit",
                              label: "Edit",
                              onClick: () => setEditIndustry({ id: industry.id, name: industry.name }),
                            },
                            isActive
                              ? {
                                  key: "deactivate",
                                  label: "Deactivate",
                                  onClick: () => void onDeactivateIndustry(industry.id),
                                }
                              : {
                                  key: "activate",
                                  label: "Activate",
                                  onClick: () => void onActivateIndustry(industry.id),
                                },
                            ...(canDelete
                              ? [
                                  {
                                    key: "delete",
                                    label: "Delete",
                                    onClick: () => setConfirmDeleteId(industry.id),
                                    danger: true,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      ) : (
                        <span className="pageText">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {renderPager("Industries pagination", 16)}

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title="Delete industry"
        message="Are you sure you want to delete this industry? This cannot be undone."
        confirmLabel={saving ? "Deleting..." : "Delete"}
        busy={saving}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => void onConfirmDelete()}
      />
    </div>
  );
}
