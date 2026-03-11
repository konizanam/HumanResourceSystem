import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  type JobCategory,
  type JobSubcategory,
  listJobCategories,
  createJobCategory,
  updateJobCategory,
  deleteJobCategory,
  createJobSubcategory,
  updateJobSubcategory,
  deleteJobSubcategory,
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

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export function JobCategoriesPage() {
  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canManageCompany = hasPermission("MANAGE_COMPANY");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add category
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addFieldErrors, setAddFieldErrors] = useState<Record<string, string>>({});

  // Expanded category for subcategories
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);
  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");

  // Subcategory forms
  const [addSubOpen, setAddSubOpen] = useState<string | null>(null);
  const [addSubName, setAddSubName] = useState("");
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");

  // Delete
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const pagination = useMemo(() => {
    const total = filteredCategories.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pages);
    return { page: safePage, pages, total, limit: pageSize };
  }, [filteredCategories.length, page, pageSize]);

  useEffect(() => {
    if (page > pagination.pages) {
      setPage(pagination.pages);
    }
  }, [page, pagination.pages]);

  const visibleCategories = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return filteredCategories.slice(start, start + pagination.limit);
  }, [filteredCategories, pagination.limit, pagination.page]);

  const renderPager = (ariaLabel: string, marginTop?: number) => (
    <div className="publicJobsPager" role="navigation" aria-label={ariaLabel} style={marginTop ? { marginTop } : undefined}>
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
        Page {pagination.page} of {pagination.pages} ({pagination.total} categories)
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

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const data = await listJobCategories(accessToken);
      setCategories(data.categories);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { load(); }, [load]);

  function clearMessages() { setError(null); setSuccess(null); }

  /* -- Add category -- */
  async function onAddCategory() {
    if (!accessToken || !canManageCompany) return;
    const errs: Record<string, string> = {};
    if (!addName.trim()) errs.name = "Category name is required";
    setAddFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      clearMessages();
      setSaving(true);
      const created = await createJobCategory(accessToken, { name: addName.trim() });
      setCategories((prev) => [...prev, { ...created, subcategories: created.subcategories ?? [] }]);
      setSuccess("Category created successfully");
      setAddOpen(false);
      setAddName("");
    } catch (e) {
      setError((e as any)?.message ?? "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  /* -- Edit category -- */
  function startEditCat(cat: JobCategory) {
    clearMessages();
    setEditCatId(cat.id);
    setEditCatName(cat.name);
  }

  async function onSaveEditCat() {
    if (!accessToken || !editCatId || !canManageCompany) return;
    try {
      clearMessages();
      setSaving(true);
      const updated = await updateJobCategory(accessToken, editCatId, { name: editCatName.trim() });
      setCategories((prev) => prev.map((c) => (c.id === editCatId ? { ...c, name: updated.name } : c)));
      setSuccess("Category updated successfully");
      setEditCatId(null);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  /* -- Delete category -- */
  async function onConfirmDeleteCat() {
    if (!accessToken || !confirmDeleteCat || !canManageCompany) return;
    try {
      clearMessages();
      setSaving(true);
      await deleteJobCategory(accessToken, confirmDeleteCat);
      setCategories((prev) => prev.filter((c) => c.id !== confirmDeleteCat));
      setSuccess("Category deleted successfully");
      setConfirmDeleteCat(null);
      if (expandedCatId === confirmDeleteCat) setExpandedCatId(null);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to delete category");
    } finally {
      setSaving(false);
    }
  }

  /* -- Add subcategory -- */
  async function onAddSubcategory(categoryId: string) {
    if (!accessToken || !canManageCompany) return;
    if (!addSubName.trim()) return;
    try {
      clearMessages();
      setSaving(true);
      const created = await createJobSubcategory(accessToken, {
        category_id: categoryId,
        name: addSubName.trim(),
      });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId ? { ...c, subcategories: [...c.subcategories, created] } : c,
        ),
      );
      setSuccess("Subcategory created successfully");
      setAddSubOpen(null);
      setAddSubName("");
    } catch (e) {
      setError((e as any)?.message ?? "Failed to create subcategory");
    } finally {
      setSaving(false);
    }
  }

  /* -- Edit subcategory -- */
  function startEditSub(sub: JobSubcategory) {
    setEditSubId(sub.id);
    setEditSubName(sub.name);
  }

  async function onSaveEditSub(categoryId: string) {
    if (!accessToken || !editSubId || !canManageCompany) return;
    try {
      clearMessages();
      setSaving(true);
      const updated = await updateJobSubcategory(accessToken, editSubId, { name: editSubName.trim() });
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? { ...c, subcategories: c.subcategories.map((s) => (s.id === editSubId ? { ...s, name: updated.name } : s)) }
            : c,
        ),
      );
      setSuccess("Subcategory updated successfully");
      setEditSubId(null);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to update subcategory");
    } finally {
      setSaving(false);
    }
  }

  /* -- Delete subcategory -- */
  async function onConfirmDeleteSub() {
    if (!accessToken || !confirmDeleteSub || !canManageCompany) return;
    try {
      clearMessages();
      setSaving(true);
      await deleteJobSubcategory(accessToken, confirmDeleteSub);
      setCategories((prev) =>
        prev.map((c) => ({
          ...c,
          subcategories: c.subcategories.filter((s) => s.id !== confirmDeleteSub),
        })),
      );
      setSuccess("Subcategory deleted successfully");
      setConfirmDeleteSub(null);
    } catch (e) {
      setError((e as any)?.message ?? "Failed to delete subcategory");
    } finally {
      setSaving(false);
    }
  }

  /* -- Render -- */
  if (loading) {
    return (
      <div className="page">
        <div className="companiesHeader"><h1 className="pageTitle">Job Categories</h1></div>
        <div className="placeholderSpinnerWrap" role="status" aria-live="polite">
          <span className="placeholderSpinner" aria-hidden="true" />
          <span className="srOnly">Loading</span>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Job Categories</h1>
      </div>

      {error && <div className="errorBox">{error}</div>}
      {success && <div className="successBox">{success}</div>}

      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <input
          className="input"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: 260, maxWidth: 320, flex: "1 1 320px" }}
        />

        {canManageCompany && (
          <button
            type="button"
            className="btn btnGhost btnSm addToggleBtn"
            onClick={() => { clearMessages(); setExpandedCatId(null); setAddOpen((v) => !v); }}
            disabled={saving}
          >
            {addOpen ? "Cancel" : "Add Category"}
          </button>
        )}

        <div style={{ marginLeft: "auto" }}>
          {renderPager("Job categories pagination top")}
        </div>
      </div>

      {/* Add category panel */}
      {addOpen && canManageCompany && (
        <div className="dropPanel" role="region" aria-label="Add category">
          <div className="editForm">
            <h2 className="editFormTitle">Add Category</h2>
            <div className="editGrid">
              <div className="field">
                <label className="fieldLabel">Category Name</label>
                <input
                  className="input"
                  value={addName}
                  onChange={(e) => { setAddFieldErrors({}); setAddName(e.target.value); }}
                  placeholder="e.g. Information Technology"
                  required
                />
                {addFieldErrors.name && <span className="fieldError">{addFieldErrors.name}</span>}
              </div>
            </div>
            <div className="stepperActions">
              <button className="btn btnGhost btnSm stepperSaveBtn" onClick={onAddCategory} disabled={saving} type="button">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="tableWrap" role="region" aria-label="Job categories table">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Category Name</th>
              <th className="thRight">Subcategories</th>
              <th className="thRight">Total Jobs</th>
              <th className="thRight">Active Jobs</th>
              <th className="thRight">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredCategories.length === 0 ? (
              <tr><td colSpan={5}><div className="emptyState">No categories found.</div></td></tr>
            ) : (
              visibleCategories.map((cat) => {
                const isExpanded = expandedCatId === cat.id;
                const isEditing = editCatId === cat.id;
                return (
                  <CategoryRow
                    key={cat.id}
                    category={cat}
                    expanded={isExpanded}
                    saving={saving}
                    onToggle={() => {
                      clearMessages();
                      setAddOpen(false);
                      setExpandedCatId(isExpanded ? null : cat.id);
                    }}
                    onEdit={() => startEditCat(cat)}
                    onDelete={() => { clearMessages(); setConfirmDeleteCat(cat.id); }}
                    canManageCompany={canManageCompany}
                  >
                    {/* Inline edit for category name */}
                    {isEditing && (
                      <tr className="tableExpandRow">
                        <td colSpan={5}>
                          <div className="dropPanel">
                            <div className="editForm">
                              <h2 className="editFormTitle">Edit Category</h2>
                              <div className="editGrid">
                                <div className="field">
                                  <label className="fieldLabel">Category Name</label>
                                  <input className="input" value={editCatName} onChange={(e) => setEditCatName(e.target.value)} />
                                </div>
                              </div>
                              <div className="stepperActions">
                                <button className="btn btnGhost" type="button" onClick={() => setEditCatId(null)} disabled={saving}>Cancel</button>
                                <button className="btn btnGhost btnSm stepperSaveBtn" type="button" onClick={onSaveEditCat} disabled={saving}>
                                  {saving ? "Saving…" : "Save"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Subcategories panel */}
                    {isExpanded && !isEditing && (
                      <tr className="tableExpandRow">
                        <td colSpan={5}>
                          <div className="dropPanel">
                            <div className="editForm">
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <h2 className="editFormTitle" style={{ margin: 0 }}>Subcategories — {cat.name}</h2>
                                {canManageCompany && (
                                  <button
                                    type="button"
                                    className="btn btnGhost btnSm stepperSaveBtn addToggleBtn"
                                    onClick={() => { setAddSubOpen(addSubOpen === cat.id ? null : cat.id); setAddSubName(""); }}
                                    disabled={saving}
                                  >
                                    {addSubOpen === cat.id ? "Cancel" : "Add Subcategory"}
                                  </button>
                                )}
                              </div>

                              {/* Add subcategory form */}
                              {addSubOpen === cat.id && canManageCompany && (
                                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                                  <input
                                    className="input"
                                    value={addSubName}
                                    onChange={(e) => setAddSubName(e.target.value)}
                                    placeholder="Subcategory name"
                                    style={{ flex: 1 }}
                                    onKeyDown={(e) => { if (e.key === "Enter") onAddSubcategory(cat.id); }}
                                  />
                                  <button className="btn btnGhost btnSm stepperSaveBtn" onClick={() => onAddSubcategory(cat.id)} disabled={saving} type="button">
                                    {saving ? "…" : "Add"}
                                  </button>
                                </div>
                              )}

                              {/* Subcategory list */}
                              {cat.subcategories.length === 0 ? (
                                <p className="pageText">No subcategories yet.</p>
                              ) : (
                                <table className="table" style={{ marginBottom: 0 }}>
                                  <thead>
                                    <tr>
                                      <th>Subcategory Name</th>
                                      <th className="thRight">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {cat.subcategories.map((sub) => {
                                      const isEditingSub = editSubId === sub.id;
                                      return (
                                        <tr key={sub.id}>
                                          <td>
                                            {isEditingSub ? (
                                              <div style={{ display: "flex", gap: 8 }}>
                                                <input
                                                  className="input"
                                                  value={editSubName}
                                                  onChange={(e) => setEditSubName(e.target.value)}
                                                  style={{ flex: 1 }}
                                                  onKeyDown={(e) => { if (e.key === "Enter") onSaveEditSub(cat.id); }}
                                                />
                                                <button className="btn btnGhost btnSm stepperSaveBtn" onClick={() => onSaveEditSub(cat.id)} disabled={saving} type="button">
                                                  {saving ? "…" : "Save"}
                                                </button>
                                                <button className="btn btnGhost btnSm" onClick={() => setEditSubId(null)} disabled={saving} type="button">
                                                  Cancel
                                                </button>
                                              </div>
                                            ) : (
                                              sub.name
                                            )}
                                          </td>
                                          <td className="tdRight">
                                            {!isEditingSub && canManageCompany && (
                                              <ActionMenu
                                                disabled={saving}
                                                label="Action"
                                                items={[
                                                  { key: "edit", label: "Edit", onClick: () => startEditSub(sub) },
                                                  { key: "delete", label: "Delete", onClick: () => { clearMessages(); setConfirmDeleteSub(sub.id); }, danger: true },
                                                ]}
                                              />
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </CategoryRow>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {renderPager("Job categories pagination", 16)}

      {/* Delete category modal */}
      <ConfirmModal
        open={Boolean(confirmDeleteCat)}
        title="Delete category"
        message="Are you sure you want to delete this category? You can only delete categories without subcategories or jobs."
        confirmLabel={saving ? "Deleting…" : "Delete"}
        busy={saving}
        onCancel={() => setConfirmDeleteCat(null)}
        onConfirm={onConfirmDeleteCat}
      />

      {/* Delete subcategory modal */}
      <ConfirmModal
        open={Boolean(confirmDeleteSub)}
        title="Delete subcategory"
        message="Are you sure you want to delete this subcategory?"
        confirmLabel={saving ? "Deleting…" : "Delete"}
        busy={saving}
        onCancel={() => setConfirmDeleteSub(null)}
        onConfirm={onConfirmDeleteSub}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category row                                                       */
/* ------------------------------------------------------------------ */

function CategoryRow({
  category,
  expanded,
  saving,
  onToggle,
  onEdit,
  onDelete,
  canManageCompany,
  children,
}: {
  category: JobCategory;
  expanded: boolean;
  saving: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canManageCompany: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <tr className={expanded ? "tableRowActive" : undefined}>
        <td className="tdStrong">{category.name}</td>
        <td className="tdRight">{category.subcategories?.length ?? 0}</td>
        <td className="tdRight">{category.job_counts?.total_jobs ?? "—"}</td>
        <td className="tdRight">{category.job_counts?.active_jobs ?? "—"}</td>
        <td className="tdRight">
          <ActionMenu
            disabled={saving}
            label="Action"
            items={[
              { key: "subcategories", label: expanded ? "Close" : "Subcategories", onClick: onToggle },
              ...(canManageCompany ? [{ key: "edit", label: "Edit", onClick: onEdit }] : []),
              ...(canManageCompany ? [{ key: "delete", label: "Delete", onClick: onDelete, danger: true }] : []),
            ]}
          />
        </td>
      </tr>
      {children}
    </>
  );
}
