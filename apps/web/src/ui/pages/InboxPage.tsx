import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteNotification,
  getNotificationPreferences,
  listCompanies,
  listJobCategories,
  listNotifications,
  markNotificationAsRead,
  markNotificationAsUnread,
  type Company,
  type JobCategory,
  type NotificationItem,
  type NotificationPreferences,
  updateNotificationPreferences,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

type InboxMode = "job-alerts" | "messages";

function getPageCopy(mode: InboxMode) {
  if (mode === "messages") {
    return {
      title: "Messages",
      intro:
        "Your inbox for updates and messages. Unread items are highlighted so you can spot them quickly.",
      empty: "No messages yet.",
      loadError: "Failed to load messages",
      markReadError: "Failed to mark message as read",
      markUnreadError: "Failed to mark message as unread",
      deleteError: "Failed to delete message",
      markAllReadError: "Failed to mark all messages as read",
      markAllReadSuccess: (count: number) =>
        count > 0 ? `${count} message(s) marked as read.` : "No unread messages.",
    };
  }

  return {
    title: "Job Alert Preferences",
    intro:
      "Set your job alert preferences below. No messages are shown on this page.",
    empty: "",
    loadError: "Failed to load job alert preferences",
    markReadError: "",
    markUnreadError: "",
    deleteError: "",
    markAllReadError: "",
    markAllReadSuccess: (_count: number) => "",
  };
}

export function InboxPage({ mode }: { mode: InboxMode }) {
  const copy = useMemo(() => getPageCopy(mode), [mode]);
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();

  const PAGE_SIZE = 5;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const visibleNotifications = useMemo(() => {
    const list = Array.isArray(notifications) ? notifications : [];
    if (mode !== "messages") return [];

    return [...list].sort((a, b) => {
      const aT = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bT = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bT - aT;
    });
  }, [mode, notifications]);

  const unreadCount = useMemo(() => {
    const computed = visibleNotifications.filter((item) => !item.is_read).length;
    return unreadTotal > 0 ? unreadTotal : computed;
  }, [unreadTotal, visibleNotifications]);

  useEffect(() => {
    if (mode !== "messages") return;
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("hrs:messages-unread-updated", {
        detail: { total: Number(unreadCount) || 0 },
      }),
    );
  }, [mode, unreadCount]);

  const industries = useMemo(() => {
    const names = new Set<string>();
    for (const company of companies) {
      const value = String(company.industry ?? "").trim();
      if (value) names.add(value);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [companies]);

  const canUseJobAlerts = hasPermission(
    "APPLY_JOB",
    "VIEW_JOB",
    "CREATE_JOB",
    "VIEW_APPLICATIONS",
    "MANAGE_USERS",
  );
  const showPreferences = Boolean(canUseJobAlerts && mode === "job-alerts" && preferences);

  const load = useCallback(async (nextPage?: number) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);

      const safePage = Math.max(1, Number(nextPage ?? page ?? 1));

      if (mode === "job-alerts") {
        const [pref, categoryData, companyData] = await Promise.all([
          getNotificationPreferences(accessToken),
          listJobCategories(accessToken),
          listCompanies(accessToken),
        ]);
        setNotifications([]);
        setPage(1);
        setPagination({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
        setUnreadTotal(0);
        setCategories(Array.isArray(categoryData.categories) ? categoryData.categories : []);
        setCompanies(Array.isArray(companyData) ? companyData : []);
        setPreferences(pref);
      } else {
        const data = await listNotifications(accessToken, { page: safePage, limit: PAGE_SIZE });
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        setPage(Number(data.pagination?.page ?? safePage));
        setPagination({
          page: Number(data.pagination?.page ?? safePage),
          limit: Number(data.pagination?.limit ?? PAGE_SIZE),
          total: Number(data.pagination?.total ?? 0),
          pages: Number(data.pagination?.pages ?? 1),
        });
        setUnreadTotal(Number((data as any)?.unread_count?.total ?? 0));
        setPreferences(null);
        setCategories([]);
        setCompanies([]);
      }
    } catch (e) {
      setError((e as Error)?.message ?? copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, copy.loadError, mode]);

  useEffect(() => {
    void load(1);
  }, [load]);

  async function onMarkAsRead(item: NotificationItem) {
    if (!accessToken || item.is_read || !item?.id) return;
    try {
      setSaving(true);
      setError(null);
      await markNotificationAsRead(accessToken, item.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n,
        ),
      );
      setUnreadTotal((prev) => Math.max(0, (Number(prev) || 0) - 1));
    } catch (e) {
      setError((e as Error)?.message ?? copy.markReadError);
    } finally {
      setSaving(false);
    }
  }

  async function onMarkAsUnread(item: NotificationItem) {
    if (!accessToken || !item.is_read || !item?.id) return;
    try {
      setSaving(true);
      setError(null);
      await markNotificationAsUnread(accessToken, item.id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id ? { ...n, is_read: false, read_at: null } : n,
        ),
      );
      setUnreadTotal((prev) => (Number(prev) || 0) + 1);
    } catch (e) {
      setError((e as Error)?.message ?? copy.markUnreadError ?? "Failed to mark as unread");
    } finally {
      setSaving(false);
    }
  }

  async function onMarkAllAsRead() {
    if (!accessToken) return;
    try {
      setSaving(true);
      setError(null);
      const targets = visibleNotifications.filter((n) => !n.is_read && n.id);
      if (targets.length === 0) {
        setSuccess(copy.markAllReadSuccess(0));
        return;
      }

      await Promise.allSettled(
        targets.map((n) => markNotificationAsRead(accessToken, n.id)),
      );

      setSuccess(copy.markAllReadSuccess(targets.length));
      setUnreadTotal((prev) => Math.max(0, (Number(prev) || 0) - targets.length));
      const nowIso = new Date().toISOString();
      const targetIds = new Set(targets.map((t) => t.id));
      setNotifications((prev) =>
        prev.map((n) =>
          targetIds.has(n.id)
            ? { ...n, is_read: true, read_at: n.read_at ?? nowIso }
            : n,
        ),
      );
    } catch (e) {
      setError((e as Error)?.message ?? copy.markAllReadError);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(item: NotificationItem) {
    if (!accessToken || !item?.id) return;
    try {
      setSaving(true);
      setError(null);
      await deleteNotification(accessToken, item.id);
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
      if (!item.is_read) {
        setUnreadTotal((prev) => Math.max(0, (Number(prev) || 0) - 1));
      }
    } catch (e) {
      setError((e as Error)?.message ?? copy.deleteError);
    } finally {
      setSaving(false);
    }
  }

  async function onSavePreferences() {
    if (!accessToken || !preferences) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await updateNotificationPreferences(accessToken, {
        email_notifications: preferences.email_notifications,
        job_alerts: preferences.job_alerts,
        application_updates: preferences.application_updates,
        category_ids: Array.isArray(preferences.category_ids) ? preferences.category_ids : [],
        company_ids: Array.isArray(preferences.company_ids) ? preferences.company_ids : [],
        industry_names: Array.isArray(preferences.industry_names) ? preferences.industry_names : [],
      });
      setPreferences(updated);
      setSuccess("Preferences updated.");
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to update preferences");
    } finally {
      setSaving(false);
    }
  }

  function toggleSelection(
    source: string[] | undefined,
    value: string,
    checked: boolean,
  ): string[] {
    const current = Array.isArray(source) ? source : [];
    if (checked) {
      if (current.includes(value)) return current;
      return [...current, value];
    }
    return current.filter((item) => item !== value);
  }

  const renderMessagesPager = useCallback(() => {
    if (mode !== "messages" || pagination.pages <= 1) return null;

    return (
      <div className="publicJobsPager" role="navigation" aria-label="Messages pagination">
        <button
          className="btn btnPrimary btnSm"
          style={{ background: "var(--menu-icon)", borderColor: "var(--menu-icon)" }}
          type="button"
          onClick={() => void load(page - 1)}
          disabled={saving || loading || page <= 1}
        >
          {"<-"} Previous
        </button>
        <span className="publicJobsPagerInfo">
          Page {page} of {pagination.pages} ({pagination.total} messages)
        </span>
        <button
          className="btn btnPrimary btnSm"
          style={{ background: "var(--menu-icon-active)", borderColor: "var(--menu-icon-active)" }}
          type="button"
          onClick={() => void load(page + 1)}
          disabled={saving || loading || page >= pagination.pages}
        >
          Next {"->"}
        </button>
      </div>
    );
  }, [load, loading, mode, page, pagination.pages, pagination.total, saving]);

  if (loading && notifications.length === 0) {
    return (
      <div className="page">
        <div className="companiesHeader">
          <h1 className="pageTitle">{copy.title}</h1>
        </div>
        <p className="pageText">Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">{copy.title}</h1>
        {mode === "messages" ? (
          <div style={{ display: "flex", gap: 8 }}>
            <span className="chipBadge">Unread: {unreadCount}</span>
            <button
              className="btn btnGhost btnSm"
              type="button"
              onClick={() => void load(page)}
              disabled={saving}
            >
              Refresh
            </button>
            <button
              className="btn btnGhost btnSm stepperSaveBtn"
              type="button"
              onClick={onMarkAllAsRead}
              disabled={saving || unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn btnGhost btnSm"
              type="button"
              onClick={() => void load(1)}
              disabled={saving}
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {canUseJobAlerts && mode === "job-alerts" ? (
        <p className="pageText" style={{ marginTop: 6 }}>
          {copy.intro}
        </p>
      ) : null}

      {error ? <div className="errorBox">{error}</div> : null}
      {success ? <div className="successBox">{success}</div> : null}

      {mode === "messages" ? <div style={{ marginBottom: 12 }}>{renderMessagesPager()}</div> : null}

      <div className="inboxList" role="region" aria-label={`${copy.title} list`}>
        {showPreferences && preferences ? (
          <>
            <div className="inboxCard inboxCardRead" role="region" aria-label="Job alert preferences">
              <div className="inboxCardHeader">
                <div>
                  <div className="inboxCardTitle">Preferences</div>
                  <div className="inboxCardMeta">Choose what you want to be notified about.</div>
                </div>
              </div>
              <div className="inboxCardBody" style={{ display: "grid", gap: 10 }}>
                <label className="fieldCheckbox">
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.email_notifications)}
                    onChange={(e) =>
                      setPreferences((prev) =>
                        prev ? { ...prev, email_notifications: e.target.checked } : prev,
                      )
                    }
                  />
                  <span className="fieldLabel">Email notifications</span>
                </label>
                <label className="fieldCheckbox">
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.job_alerts)}
                    onChange={(e) =>
                      setPreferences((prev) =>
                        prev ? { ...prev, job_alerts: e.target.checked } : prev,
                      )
                    }
                  />
                  <span className="fieldLabel">Job alert notifications</span>
                </label>
                <label className="fieldCheckbox">
                  <input
                    type="checkbox"
                    checked={Boolean(preferences.application_updates)}
                    onChange={(e) =>
                      setPreferences((prev) =>
                        prev ? { ...prev, application_updates: e.target.checked } : prev,
                      )
                    }
                  />
                  <span className="fieldLabel">Application update notifications</span>
                </label>
              </div>
            </div>

            <div className="inboxCard inboxCardRead" role="region" aria-label="Job categories preferences">
              <div className="inboxCardHeader">
                <div>
                  <div className="inboxCardTitle">Job Categories</div>
                  <div className="inboxCardMeta">Select categories you’re interested in.</div>
                </div>
              </div>
              <div className="inboxCardBody inboxPrefSection">
                {categories.length === 0 ? (
                  <p className="pageText">No categories found.</p>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {categories.map((category) => (
                      <label key={category.id} className="fieldCheckbox">
                        <input
                          type="checkbox"
                          checked={Boolean(preferences.category_ids?.includes(category.id))}
                          onChange={(e) =>
                            setPreferences((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    category_ids: toggleSelection(
                                      prev.category_ids,
                                      category.id,
                                      e.target.checked,
                                    ),
                                  }
                                : prev,
                            )
                          }
                        />
                        <span className="fieldLabel">{category.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="inboxCard inboxCardRead" role="region" aria-label="Company preferences">
              <div className="inboxCardHeader">
                <div>
                  <div className="inboxCardTitle">Companies</div>
                  <div className="inboxCardMeta">Select companies you want alerts for.</div>
                </div>
              </div>
              <div className="inboxCardBody inboxPrefSection">
                {companies.length === 0 ? (
                  <p className="pageText">No companies found.</p>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    {companies.map((company) => (
                      <label key={company.id} className="fieldCheckbox">
                        <input
                          type="checkbox"
                          checked={Boolean(preferences.company_ids?.includes(company.id))}
                          onChange={(e) =>
                            setPreferences((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    company_ids: toggleSelection(
                                      prev.company_ids,
                                      company.id,
                                      e.target.checked,
                                    ),
                                  }
                                : prev,
                            )
                          }
                        />
                        <span className="fieldLabel">{company.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="inboxCard inboxCardRead" role="region" aria-label="Industry preferences">
              <div className="inboxCardHeader">
                <div>
                  <div className="inboxCardTitle">Industries</div>
                  <div className="inboxCardMeta">Select industries you want alerts for.</div>
                </div>
              </div>
              <div className="inboxCardBody inboxPrefSection">
                {industries.length === 0 ? (
                  <p className="pageText">No industries found.</p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    }}
                  >
                    {industries.map((industry) => (
                      <label key={industry} className="fieldCheckbox">
                        <input
                          type="checkbox"
                          checked={Boolean(preferences.industry_names?.includes(industry))}
                          onChange={(e) =>
                            setPreferences((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    industry_names: toggleSelection(
                                      prev.industry_names,
                                      industry,
                                      e.target.checked,
                                    ),
                                  }
                                : prev,
                            )
                          }
                        />
                        <span className="fieldLabel">{industry}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="inboxCard inboxCardRead" role="region" aria-label="Save preferences">
              <div className="inboxCardHeader">
                <div>
                  <div className="inboxCardTitle">Save</div>
                  <div className="inboxCardMeta">Apply your changes.</div>
                </div>
              </div>
              <div className="inboxCardBody">
                <button
                  className="btn btnGhost btnSm stepperSaveBtn"
                  type="button"
                  onClick={onSavePreferences}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save preferences"}
                </button>
              </div>
            </div>
          </>
        ) : null}

        {mode === "messages" ? (
          visibleNotifications.length === 0 ? (
            <div className="emptyState">{copy.empty}</div>
          ) : (
            visibleNotifications.map((item, idx) => {
            const isUnread = !item.is_read;
            const toneClass =
              mode === "messages" ? (idx % 2 === 0 ? " inboxCardToneA" : " inboxCardToneB") : "";
            const conversationClass = mode === "messages" ? " inboxCardConversation" : "";
            const cardClassName =
              "inboxCard" +
              (isUnread ? " inboxCardUnread" : " inboxCardRead") +
              toneClass +
              conversationClass;

            const rawMessage = String(item.message ?? "").trim();
            const splitIdx = mode === "messages" ? rawMessage.indexOf(":") : -1;
            const fromLabel =
              mode === "messages" && splitIdx > 0 && splitIdx < 40
                ? rawMessage.slice(0, splitIdx).trim()
                : "";
            const displayMessage =
              mode === "messages" && fromLabel
                ? rawMessage.slice(splitIdx + 1).trim()
                : rawMessage;

            return (
              <div
                key={item.id}
                className={cardClassName}
                role={isUnread ? "button" : undefined}
                tabIndex={isUnread ? 0 : undefined}
                aria-label={isUnread ? "Mark message as read" : undefined}
                onClick={() => {
                  if (!isUnread || saving) return;
                  void onMarkAsRead(item);
                }}
                onKeyDown={(e) => {
                  if (!isUnread || saving) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void onMarkAsRead(item);
                  }
                }}
              >
                <div className="inboxCardHeader">
                  <div style={{ minWidth: 0 }}>
                    <div className="inboxCardTitle">
                      {item.title || (mode === "messages" ? "Message" : "Job Alert")}
                    </div>
                    <div className="inboxCardMeta">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString("en-GB")
                        : "—"}
                    </div>
                  </div>

                  <span className="chipBadge">
                    {item.is_read ? "Read" : "Unread"}
                  </span>
                </div>

                <div className="inboxCardBody">
                  {fromLabel ? (
                    <div className="inboxCardMeta" style={{ marginTop: 2 }}>
                      From: {fromLabel}
                    </div>
                  ) : null}
                  <div className="inboxCardMessage">{displayMessage || "—"}</div>
                </div>

                <div className="inboxCardActions">
                  <button
                    type="button"
                    className="btn btnGhost btnSm"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onMarkAsRead(item);
                    }}
                    disabled={saving || item.is_read}
                  >
                    Mark as read
                  </button>
                  <button
                    type="button"
                    className="btn btnGhost btnSm"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onMarkAsUnread(item);
                    }}
                    disabled={saving || !item.is_read}
                  >
                    Mark unread
                  </button>
                  <button
                    type="button"
                    className="btn btnDanger btnSm"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onDelete(item);
                    }}
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
            })
          )
        ) : null}
      </div>

      {mode === "messages" ? <div style={{ marginTop: 16 }}>{renderMessagesPager()}</div> : null}
    </div>
  );
}
