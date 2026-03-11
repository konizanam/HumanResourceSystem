import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteNotification,
  getNotificationPreferences,
  listPublicIndustries,
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

type LoginDetails = {
  login_date_time: string;
  login_ip: string;
  login_location: string;
  login_device: string;
};

const JOB_SEEKER_ALERT_OPTIONS: Array<{
  value: "application_submitted" | "application_withdrawn";
  label: string;
  description: string;
}> = [
  {
    value: "application_submitted",
    label: "New applications submitted",
    description: "Notify when a job seeker submits a new application.",
  },
  {
    value: "application_withdrawn",
    label: "Application withdrawals",
    description: "Notify when a job seeker withdraws an application.",
  },
];

function parseLoginDetails(item: NotificationItem): LoginDetails | null {
  if (String(item.type ?? "").trim().toLowerCase() !== "system_alert") return null;

  const rawData = item.data;
  const data = (() => {
    if (!rawData) return null;
    if (typeof rawData === "string") {
      try {
        return JSON.parse(rawData) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    if (typeof rawData === "object") return rawData as Record<string, unknown>;
    return null;
  })();

  if (!data) return null;
  if (String(data.event ?? "").trim().toLowerCase() !== "login_notification") return null;

  const fallbackDate = item.created_at
    ? new Date(item.created_at).toLocaleString("en-GB")
    : "Unknown";

  return {
    login_date_time: String(data.login_date_time ?? "").trim() || fallbackDate,
    login_ip: String(data.login_ip ?? "").trim() || "Unknown",
    login_location: String(data.login_location ?? "").trim() || "Unknown",
    login_device: String(data.login_device ?? "").trim() || "Unknown",
  };
}

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

  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
  const [pageSize, setPageSize] = useState(5);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 5, total: 0, pages: 1 });
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<NotificationItem | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [categories, setCategories] = useState<JobCategory[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [industryOptions, setIndustryOptions] = useState<string[]>([]);

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

  const canUseJobAlerts = hasPermission(
    "APPLY_JOB",
    "VIEW_JOB",
    "CREATE_JOB",
    "VIEW_APPLICATIONS",
    "MANAGE_USERS",
  );
  const canApplyAsJobSeeker = hasPermission("APPLY_JOB");
  const showPreferences = Boolean(canUseJobAlerts && mode === "job-alerts" && preferences);

  const load = useCallback(async (nextPage?: number) => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);

      const safePage = Math.max(1, Number(nextPage ?? page ?? 1));

      if (mode === "job-alerts") {
        const [pref, categoryData, companyData, publicIndustryData] = await Promise.all([
          getNotificationPreferences(accessToken),
          listJobCategories(accessToken),
          listCompanies(accessToken),
          listPublicIndustries(),
        ]);
        const normalizedPref: NotificationPreferences = {
          ...pref,
          job_seeker_alert_types: Array.isArray(pref.job_seeker_alert_types)
            ? pref.job_seeker_alert_types
            : JOB_SEEKER_ALERT_OPTIONS.map((opt) => opt.value),
        };
        setNotifications([]);
        setPage(1);
        setPagination({ page: 1, limit: pageSize, total: 0, pages: 1 });
        setUnreadTotal(0);
        setCategories(Array.isArray(categoryData.categories) ? categoryData.categories : []);
        setCompanies(Array.isArray(companyData) ? companyData : []);
        setIndustryOptions(
          Array.from(
            new Set(
              (Array.isArray(publicIndustryData.industries) ? publicIndustryData.industries : [])
                .map((item) => String(item?.name ?? "").trim())
                .filter(Boolean),
            ),
          ).sort((a, b) => a.localeCompare(b)),
        );
        setPreferences(normalizedPref);
      } else {
        const data = await listNotifications(accessToken, { page: safePage, limit: pageSize });
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
        setPage(Number(data.pagination?.page ?? safePage));
        setPagination({
          page: Number(data.pagination?.page ?? safePage),
          limit: Number(data.pagination?.limit ?? pageSize),
          total: Number(data.pagination?.total ?? 0),
          pages: Number(data.pagination?.pages ?? 1),
        });
        setUnreadTotal(Number((data as any)?.unread_count?.total ?? 0));
        setPreferences(null);
        setCategories([]);
        setCompanies([]);
        setIndustryOptions([]);
      }
    } catch (e) {
      setError((e as Error)?.message ?? copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [accessToken, copy.loadError, mode, page, pageSize]);

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
      setConfirmDeleteItem(null);
      await load(page);
    } catch (e) {
      setError((e as Error)?.message ?? copy.deleteError);
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    if (!confirmDeleteItem) return;
    await onDelete(confirmDeleteItem);
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
        job_seeker_alert_types: Array.isArray(preferences.job_seeker_alert_types)
          ? preferences.job_seeker_alert_types
          : JOB_SEEKER_ALERT_OPTIONS.map((opt) => opt.value),
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
    if (mode !== "messages") return null;

    return (
      <div className="publicJobsPager" role="navigation" aria-label="Messages pagination">
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
            disabled={saving || loading}
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
  }, [PAGE_SIZE_OPTIONS, load, loading, mode, page, pageSize, pagination.pages, pagination.total, saving]);

  if (loading && notifications.length === 0) {
    return (
      <div className="page">
        <div className="companiesHeader">
          <h1 className="pageTitle">{copy.title}</h1>
        </div>
        <div className="placeholderSpinnerWrap" role="status" aria-live="polite"><span className="placeholderSpinner" aria-hidden="true" /><span className="srOnly">Loading</span></div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">{copy.title}</h1>
        {mode !== "messages" ? (
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
        ) : null}
      </div>

      {canUseJobAlerts && mode === "job-alerts" ? (
        <p className="pageText" style={{ marginTop: 6 }}>
          {copy.intro}
        </p>
      ) : null}

      {error ? (
        <div
          className="errorBox"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btnGhost btnSm"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            style={{ minWidth: 32, padding: "2px 8px", lineHeight: 1 }}
          >
            x
          </button>
        </div>
      ) : null}
      {success ? (
        <div
          className="successBox"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
        >
          <span>{success}</span>
          <button
            type="button"
            className="btn btnGhost btnSm"
            onClick={() => setSuccess(null)}
            aria-label="Dismiss success"
            style={{ minWidth: 32, padding: "2px 8px", lineHeight: 1 }}
          >
            x
          </button>
        </div>
      ) : null}

      {mode === "messages" ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
          {renderMessagesPager()}
        </div>
      ) : null}

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

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      border: "1px solid var(--stroke)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "var(--card)",
                    }}
                  >
                    <label className="fieldCheckbox" style={{ marginBottom: 6 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(preferences.job_alerts)}
                        disabled={!canApplyAsJobSeeker}
                        onChange={(e) =>
                          setPreferences((prev) =>
                            prev ? { ...prev, job_alerts: e.target.checked } : prev,
                          )
                        }
                      />
                      <span className="fieldLabel">Job Alerts (As Job Seeker)</span>
                    </label>
                    <div className="inboxCardMeta">
                      Receive new job posting alerts for your selected categories, companies, and industries.
                    </div>
                    {!canApplyAsJobSeeker ? (
                      <div className="inboxCardMeta" style={{ marginTop: 6 }}>
                        Requires APPLY_JOB permission.
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      border: "1px solid var(--stroke)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      background: "var(--card)",
                    }}
                  >
                    <label className="fieldCheckbox" style={{ marginBottom: 6 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(preferences.application_updates)}
                        onChange={(e) =>
                          setPreferences((prev) =>
                            prev ? { ...prev, application_updates: e.target.checked } : prev,
                          )
                        }
                      />
                      <span className="fieldLabel">Alerts From Job Seekers</span>
                    </label>
                    <div className="inboxCardMeta">
                      Receive alerts when job seekers submit or update applications relevant to your access.
                    </div>

                    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                      {JOB_SEEKER_ALERT_OPTIONS.map((option) => (
                        <label key={option.value} className="fieldCheckbox">
                          <input
                            type="checkbox"
                            checked={Boolean(preferences.job_seeker_alert_types?.includes(option.value))}
                            disabled={!preferences.application_updates}
                            onChange={(e) =>
                              setPreferences((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      job_seeker_alert_types: toggleSelection(
                                        prev.job_seeker_alert_types,
                                        option.value,
                                        e.target.checked,
                                      ) as ("application_submitted" | "application_withdrawn")[],
                                    }
                                  : prev,
                              )
                            }
                          />
                          <span className="fieldLabel">{option.label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="inboxCardMeta" style={{ marginTop: 4 }}>
                      Select exactly which job seeker alerts you want to receive.
                    </div>
                  </div>
                </div>
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
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    }}
                  >
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
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    }}
                  >
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
                {industryOptions.length === 0 ? (
                  <p className="pageText">No industries found.</p>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 6,
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    }}
                  >
                    {industryOptions.map((industry) => (
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
            const loginDetails = parseLoginDetails(item);

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

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="chipBadge">
                      {item.is_read ? "Read" : "Unread"}
                    </span>
                    <button
                      type="button"
                      className="btn btnGhost btnSm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteItem(item);
                      }}
                      disabled={saving}
                      aria-label="Close alert"
                      title="Close alert"
                      style={{ minWidth: 30, padding: "2px 8px", lineHeight: 1 }}
                    >
                      x
                    </button>
                  </div>
                </div>

                <div className="inboxCardBody">
                  {fromLabel ? (
                    <div className="inboxCardMeta" style={{ marginTop: 2 }}>
                      From: {fromLabel}
                    </div>
                  ) : null}
                  <div className="inboxCardMessage">{displayMessage || "—"}</div>
                  {loginDetails ? (
                    <div
                      style={{
                        marginTop: 10,
                        border: "1px solid var(--stroke)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        background: "var(--card)",
                      }}
                    >
                      <div className="inboxCardMeta" style={{ fontWeight: 700, marginBottom: 8 }}>
                        Login Details
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 6, columnGap: 10 }}>
                        <div className="inboxCardMeta">Date / Time</div>
                        <div className="inboxCardMessage" style={{ margin: 0 }}>{loginDetails.login_date_time}</div>
                        <div className="inboxCardMeta">IP Address</div>
                        <div className="inboxCardMessage" style={{ margin: 0 }}>{loginDetails.login_ip}</div>
                        <div className="inboxCardMeta">Location</div>
                        <div className="inboxCardMessage" style={{ margin: 0 }}>{loginDetails.login_location}</div>
                        <div className="inboxCardMeta">Device / Browser</div>
                        <div className="inboxCardMessage" style={{ margin: 0, wordBreak: "break-word" }}>
                          {loginDetails.login_device}
                        </div>
                      </div>
                    </div>
                  ) : null}
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
                      setConfirmDeleteItem(item);
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

      <ConfirmModal
        open={Boolean(confirmDeleteItem)}
        title="Delete message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmLabel={saving ? "Deleting…" : "Delete"}
        busy={saving}
        onCancel={() => {
          if (saving) return;
          setConfirmDeleteItem(null);
        }}
        onConfirm={() => void onConfirmDelete()}
      />
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
      <div
        className="modalCard"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modalTitle">{title}</div>
        <div className="modalMessage">{message}</div>
        <div className="modalActions">
          <button className="btn btnGhost" type="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="btn btnDanger" type="button" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
