import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteNotification,
  getNotificationPreferences,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
  type NotificationPreferences,
  updateNotificationPreferences,
} from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

export function NotificationsPage() {
  const { accessToken } = useAuth();
  const { hasPermission } = usePermissions();
  const canManageNotifications = hasPermission("MANAGE_NOTIFICATIONS", "MANAGE_USERS");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(null);
      const [data, pref] = await Promise.all([
        listNotifications(accessToken, { page: 1, limit: 100 }),
        canManageNotifications ? getNotificationPreferences(accessToken) : Promise.resolve(null),
      ]);
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setPreferences(pref);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [accessToken, canManageNotifications]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onMarkAsRead(item: NotificationItem) {
    if (!accessToken || item.is_read || !item?.id) return;
    try {
      setSaving(true);
      setError(null);
      await markNotificationAsRead(accessToken, item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)),
      );
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to mark notification as read");
    } finally {
      setSaving(false);
    }
  }

  async function onMarkAllAsRead() {
    if (!accessToken) return;
    try {
      setSaving(true);
      setError(null);
      const count = await markAllNotificationsAsRead(accessToken);
      setSuccess(count > 0 ? `${count} notification(s) marked as read.` : "No unread notifications.");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() })));
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to mark all notifications as read");
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
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to delete notification");
    } finally {
      setSaving(false);
    }
  }

  async function onSavePreferences() {
    if (!accessToken || !canManageNotifications || !preferences) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await updateNotificationPreferences(accessToken, {
        email_notifications: preferences.email_notifications,
        job_alerts: preferences.job_alerts,
        application_updates: preferences.application_updates,
      });
      setPreferences(updated);
      setSuccess("Notification preferences updated.");
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to update notification preferences");
    } finally {
      setSaving(false);
    }
  }

  if (loading && notifications.length === 0) {
    return (
      <div className="page">
        <div className="companiesHeader">
          <h1 className="pageTitle">Notifications</h1>
        </div>
        <p className="pageText">Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="companiesHeader">
        <h1 className="pageTitle">Notifications</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="chipBadge">Unread: {unreadCount}</span>
          <button className="btn btnGhost btnSm" type="button" onClick={() => void load()} disabled={saving}>
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
      </div>

      {error ? <div className="errorBox">{error}</div> : null}
      {success ? <div className="successBox">{success}</div> : null}

      {canManageNotifications && preferences ? (
        <div className="dropPanel" style={{ marginBottom: 12 }}>
          <h2 className="editFormTitle">Notification Preferences</h2>
          <div style={{ display: "grid", gap: 10 }}>
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
          <div className="stepperActions">
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
      ) : null}

      <div className="tableWrap" role="region" aria-label="Notifications table">
        <table className="table companiesTable">
          <thead>
            <tr>
              <th>Title</th>
              <th>Message</th>
              <th>Status</th>
              <th>Date</th>
              <th className="thRight">Actions</th>
            </tr>
          </thead>
          <tbody>
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="emptyState">No notifications found.</div>
                </td>
              </tr>
            ) : (
              notifications.map((item) => (
                <tr key={item.id}>
                  <td className="tdStrong">{item.title || "Notification"}</td>
                  <td>{item.message || "—"}</td>
                  <td>
                    <span className="chipBadge" style={item.is_read ? undefined : { background: "#e0e7ff", color: "#3730a3" }}>
                      {item.is_read ? "Read" : "Unread"}
                    </span>
                  </td>
                  <td>{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</td>
                  <td className="tdRight">
                    <div style={{ display: "inline-flex", gap: 8 }}>
                      <button
                        type="button"
                        className="btn btnGhost btnSm"
                        onClick={() => void onMarkAsRead(item)}
                        disabled={saving || item.is_read}
                      >
                        Mark as read
                      </button>
                      <button
                        type="button"
                        className="btn btnDanger btnSm"
                        onClick={() => void onDelete(item)}
                        disabled={saving}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
