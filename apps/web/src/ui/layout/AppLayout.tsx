import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { getUnreadNotificationCount } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";

type IconName =
  | "home"
  | "settings"
  | "users"
  | "briefcase"
  | "building"
  | "shield"
  | "key"
  | "tag"
  | "list"
  | "file"
  | "chart"
  | "logout"
  | "collapse"
  | "expand"
  | "menu"
  | "close";

function Icon({ name }: { name: IconName }) {
  const paths = useMemo(() => {
    switch (name) {
      case "home":
        return (
          <>
            <path d="M3 11.5 12 4l9 7.5" />
            <path d="M5.5 10.5V20h13v-9.5" />
            <path d="M10 20v-5h4v5" />
          </>
        );
      case "settings":
        return (
          <>
            <path d="M12 2l1 2.5 2.6 1-1.3 2.4 1.3 2.4-2.6 1L12 18l-1-2.5-2.6-1 1.3-2.4L8.4 9.7l2.6-1L12 2z" />
            <path d="M12 10.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z" />
          </>
        );
      case "users":
        return (
          <>
            <path d="M16 18c0-2-2-3-4-3s-4 1-4 3" />
            <path d="M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
            <path d="M19 18c0-1.5-1-2.5-2.5-2.9" />
            <path d="M16.5 5.7a2.5 2.5 0 0 1 0 4.8" />
          </>
        );
      case "briefcase":
        return (
          <>
            <path d="M9 6V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1" />
            <path d="M4 7h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />
            <path d="M4 11h16" />
          </>
        );
      case "building":
        return (
          <>
            <path d="M6 20V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16" />
            <path d="M9 7h2" />
            <path d="M9 11h2" />
            <path d="M9 15h2" />
            <path d="M13 7h2" />
            <path d="M13 11h2" />
            <path d="M13 15h2" />
            <path d="M4 20h16" />
          </>
        );
      case "shield":
        return (
          <>
            <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
            <path d="M9.5 12l1.8 1.8L14.8 10" />
          </>
        );
      case "key":
        return (
          <>
            <path d="M7.5 14.5a4.5 4.5 0 1 1 4.2-6.1" />
            <path d="M12 10h8" />
            <path d="M16 10v3" />
            <path d="M19 10v2" />
          </>
        );
      case "tag":
        return (
          <>
            <path d="M20 13l-7 7-11-11V2h7l11 11z" />
            <path d="M7 7h.01" />
          </>
        );
      case "list":
        return (
          <>
            <path d="M8 6h13" />
            <path d="M8 12h13" />
            <path d="M8 18h13" />
            <path d="M3 6h.01" />
            <path d="M3 12h.01" />
            <path d="M3 18h.01" />
          </>
        );
      case "file":
        return (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M8 13h8" />
            <path d="M8 17h6" />
          </>
        );
      case "chart":
        return (
          <>
            <path d="M4 19V5" />
            <path d="M4 19h16" />
            <path d="M8 15v-4" />
            <path d="M12 15V7" />
            <path d="M16 15v-6" />
          </>
        );
      case "logout":
        return (
          <>
            <path d="M10 17l-1 0a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h1" />
            <path d="M15 7l5 5-5 5" />
            <path d="M20 12H10" />
          </>
        );
      case "collapse":
        return (
          <>
            <path d="M14 6l-6 6 6 6" />
            <path d="M20 6v12" />
          </>
        );
      case "expand":
        return (
          <>
            <path d="M10 6l6 6-6 6" />
            <path d="M4 6v12" />
          </>
        );
      case "menu":
        return (
          <>
            <path d="M4 6h16" />
            <path d="M4 12h16" />
            <path d="M4 18h16" />
          </>
        );
      case "close":
        return (
          <>
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </>
        );
      default:
        return null;
    }
  }, [name]);

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths}
    </svg>
  );
}

export function AppLayout({
  menuItems,
}: {
  menuItems: readonly { path: string; title: string; icon: IconName }[];
}) {
  const { accessToken, logout, userName, userEmail } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const displayName = useMemo(() => {
    const name = (userName ?? "").trim();
    if (name) return name;
    const email = (userEmail ?? "").trim();
    if (email) return email;

    if (!accessToken) return "";
    try {
      const [, payload] = accessToken.split(".");
      if (!payload) return "";
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
      const json = atob(padded);
      const parsed = JSON.parse(json) as { name?: unknown; email?: unknown };
      if (typeof parsed.name === "string" && parsed.name.trim()) return parsed.name.trim();
      if (typeof parsed.email === "string" && parsed.email.trim()) return parsed.email.trim();
      return "";
    } catch {
      return "";
    }
  }, [accessToken, userEmail, userName]);

  const displayInitials = useMemo(() => {
    const raw = displayName.trim();
    if (!raw) return "";
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [displayName]);

  const sidebarClassName =
    (collapsed ? "sidebar sidebarCollapsed" : "sidebar") +
    (mobileOpen ? " sidebarMobileOpen" : "");

  const isAdminView = hasPermission("MANAGE_USERS");
  const isEmployerView = hasPermission("CREATE_JOB") && !isAdminView;
  const isJobSeekerView = !isAdminView && !hasPermission("CREATE_JOB");

  const visibleMenuItems = useMemo(
    () => {
      let allowedPaths: Set<string>;

      if (isAdminView) {
        allowedPaths = new Set(menuItems.map((item) => item.path));
      } else if (isEmployerView) {
        allowedPaths = new Set(["dashboard", "jobs", "companies", "applications", "notifications"]);
      } else if (isJobSeekerView) {
        allowedPaths = new Set(["dashboard", "job-seekers", "jobs", "notifications"]);
      } else {
        allowedPaths = new Set(["dashboard", "notifications"]);
      }

      return menuItems.filter((item) => allowedPaths.has(item.path));
    },
    [
      isAdminView,
      isEmployerView,
      isJobSeekerView,
      menuItems,
    ],
  );

  useEffect(() => {
    if (!accessToken) {
      setUnreadNotificationCount(0);
      return;
    }

    let cancelled = false;
    const loadUnreadCount = async () => {
      try {
        const count = await getUnreadNotificationCount(accessToken);
        if (!cancelled) {
          setUnreadNotificationCount(Number(count.total ?? 0));
        }
      } catch {
        if (!cancelled) {
          setUnreadNotificationCount(0);
        }
      }
    };

    void loadUnreadCount();
    const timer = window.setInterval(() => void loadUnreadCount(), 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [accessToken]);

  return (
    <div className={collapsed ? "appShell appShellCollapsed" : "appShell"}>
      <aside className={sidebarClassName}>
        <div className="sidebarHeader">
          <Link
            to="/app"
            className="brand"
            aria-label="Home"
            onClick={() => setMobileOpen(false)}
          >
            <span className="brandText">HR System</span>
            <span className="brandMono" aria-hidden="true">
              HR
            </span>
          </Link>

          <button
            type="button"
            className="btn btnGhost iconBtn mobileToggle"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <Icon name={mobileOpen ? "close" : "menu"} />
          </button>

          <button
            type="button"
            className="btn btnGhost iconBtn collapseToggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            aria-pressed={collapsed}
          >
            <Icon name={collapsed ? "expand" : "collapse"} />
          </button>
        </div>

        <nav className="nav">
          {visibleMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? "navItem navItemActive" : "navItem")}
              aria-label={item.title}
              title={collapsed ? item.title : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span className="navItemIcon" aria-hidden="true">
                <Icon name={item.icon} />
              </span>
              <span className="navItemLabel">{item.title}</span>
              {item.path === "notifications" && unreadNotificationCount > 0 ? (
                <span
                  className="chipBadge"
                  style={{ marginLeft: "auto", minWidth: 24, textAlign: "center" }}
                >
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebarFooter">
          {displayName ? (
            collapsed ? (
              <div className="sidebarUserBadge" title={displayName} aria-label={displayName}>
                {displayInitials}
              </div>
            ) : (
              <div className="sidebarUserName" title={displayName}>
                {displayName}
              </div>
            )
          ) : null}

          <button
            className={collapsed ? "btn btnGhost logoutBtn logoutBtnCollapsed" : "btn btnGhost logoutBtn"}
            onClick={logout}
            type="button"
            aria-label="Logout"
            title={collapsed ? "Logout" : undefined}
          >
            <Icon name="logout" />
            <span className="logoutLabel">Logout</span>
          </button>
        </div>
      </aside>

      <main className="content">
        {permissionsLoading ? <div className="pageText">Loading permissions...</div> : <Outlet />}
      </main>
    </div>
  );
}
