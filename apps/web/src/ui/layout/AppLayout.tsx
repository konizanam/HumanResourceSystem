import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { getCompany, getSystemSettings, getUnreadNotificationCount } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { usePermissions } from "../auth/usePermissions";
import { applyAppThemeColor } from "../utils/themeColor";

const THEME_KEY = "hrs-theme";

function getMainCompanyBrandingLogoUrl(mainCompanyId: unknown): string {
  const id = String(mainCompanyId ?? "").trim();
  if (!id) return "";

  const apiUrl = String(import.meta.env.VITE_API_URL ?? "").trim().replace(/\/$/, "");
  if (!apiUrl) return "";

  return `${apiUrl}/api/v1/public/companies/${encodeURIComponent(id)}/logo`;
}

/** Returns the current effective theme without touching data-theme. */
function getInitialTheme(): "light" | "dark" {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // ignore
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Only called when the user explicitly picks a theme. */
function applyThemeToHtml(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

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
  | "bell"
  | "message"
  | "chart"
  | "logout"
  | "collapse"
  | "expand"
  | "menu"
  | "close"
  | "sun"
  | "moon";

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
      case "bell":
        return (
          <>
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </>
        );
      case "message":
        return (
          <>
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8z" />
            <path d="M7.5 9h9" />
            <path d="M7.5 12h6.5" />
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
      case "sun":
        return (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        );
      case "moon":
        return (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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
  const location = useLocation();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [systemName, setSystemName] = useState<string>("Human Resource System");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string>("");
  // Don't call applyThemeToHtml here — if no stored pref, let CSS prefers-color-scheme handle it.
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyThemeToHtml(next);
    try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  };

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

  const sidebarClassName =
    (collapsed ? "sidebar sidebarCollapsed" : "sidebar") +
    (mobileOpen ? " sidebarMobileOpen" : "");

  const isAdminView = hasPermission("MANAGE_USERS");
  const isEmployerView = hasPermission("CREATE_JOB") && !isAdminView;
  const isJobSeekerView = !isAdminView && !hasPermission("CREATE_JOB");
  const canChangeAppColor = hasPermission("CHANGE_APP_COLOR");

  const visibleMenuItems = useMemo(
    () => {
      let allowedPaths: Set<string>;

      if (isAdminView) {
        allowedPaths = new Set(menuItems.map((item) => item.path));
      } else if (isEmployerView) {
        allowedPaths = new Set(["dashboard", "jobs", "companies", "applications", "notifications", "my-permissions", "messages"]);
      } else if (isJobSeekerView) {
        allowedPaths = new Set(["dashboard", "job-seekers", "jobs", "notifications", "my-permissions", "messages"]);
      } else {
        allowedPaths = new Set(["dashboard", "notifications", "my-permissions", "messages"]);
      }

      if (canChangeAppColor) {
        allowedPaths.add("global-settings");
      }

      return menuItems.filter((item) => allowedPaths.has(item.path));
    },
    [
      isAdminView,
      isEmployerView,
      isJobSeekerView,
      canChangeAppColor,
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

  useEffect(() => {
    const onMessagesUnreadUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ total?: number }>).detail;
      const next = Number(detail?.total ?? 0);
      setUnreadNotificationCount(Number.isFinite(next) ? Math.max(0, next) : 0);
    };

    window.addEventListener("hrs:messages-unread-updated", onMessagesUnreadUpdated);
    return () => {
      window.removeEventListener("hrs:messages-unread-updated", onMessagesUnreadUpdated);
    };
  }, []);

  const [lastAppColor, setLastAppColor] = useState<unknown>("#6366f1");

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;
    const loadSettings = async () => {
      try {
        const settings = await getSystemSettings(accessToken);
        if (cancelled) return;
        const mainCompanyId = String(settings.main_company_id ?? "").trim();
        if (mainCompanyId) {
          try {
            const company = await getCompany(accessToken, mainCompanyId);
            if (!cancelled) {
              const companyName = String(company?.name ?? "").trim();
              setSystemName(companyName || String(settings.system_name ?? "Human Resource System") || "Human Resource System");
            }
          } catch {
            if (!cancelled) {
              setSystemName(String(settings.system_name ?? "Human Resource System") || "Human Resource System");
            }
          }
        } else {
          setSystemName(String(settings.system_name ?? "Human Resource System") || "Human Resource System");
        }
        setBrandingLogoUrl(
          getMainCompanyBrandingLogoUrl(settings.main_company_id) || String(settings.branding_logo_url ?? ""),
        );
        setLastAppColor(settings.app_color);
        applyAppThemeColor(settings.app_color);
      } catch {
        if (cancelled) return;
        setSystemName("Human Resource System");
        setBrandingLogoUrl("");
        setLastAppColor("#6366f1");
        applyAppThemeColor("#6366f1");
      }
    };

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const resolvedSystemName = useMemo(() => {
    const name = String(systemName ?? "").trim();
    return name || "Human Resource System";
  }, [systemName]);

  const brandMono = useMemo(() => {
    const words = resolvedSystemName.split(/\s+/).filter(Boolean);
    const initials = words
      .slice(0, 2)
      .map((w) => (w[0] ? w[0].toUpperCase() : ""))
      .join("");
    return initials || "HR";
  }, [resolvedSystemName]);

  // Re-apply theme color whenever dark/light mode changes
  useEffect(() => {
    applyAppThemeColor(lastAppColor);
  }, [theme, lastAppColor]);

  const pageName = useMemo(() => {
    const rawPath = String(location.pathname ?? "");
    const parts = rawPath.split("/").filter(Boolean);
    const appIdx = parts.indexOf("app");
    const segment = (appIdx >= 0 ? parts[appIdx + 1] : parts[0]) ?? "";

    if (!segment || segment === "app") return "Dashboard";

    if (segment === "jobs" && parts[appIdx + 2] && parts[appIdx + 3] === "applications") {
      return "Applications";
    }

    const menuItem = menuItems.find((item) => item.path === segment);
    const baseTitle = menuItem?.title ?? segment;

    const isAdminView = hasPermission("MANAGE_USERS");
    const isEmployerView = hasPermission("CREATE_JOB") && !isAdminView;
    const isJobSeekerView = !isAdminView && !isEmployerView;

    if (isJobSeekerView && segment === "job-seekers") return "My Profile";

    return baseTitle;
  }, [hasPermission, location.pathname, menuItems]);

  useEffect(() => {
    const name = resolvedSystemName;
    const page = String(pageName ?? "").trim();
    document.title = page ? `${name} | ${page}` : name;
  }, [pageName, resolvedSystemName]);

  useEffect(() => {
    const href = String(brandingLogoUrl ?? "").trim();
    if (!href) return;

    const link =
      (document.querySelector('link[rel="icon"]') as HTMLLinkElement | null) ??
      (document.querySelector('link[rel~="icon"]') as HTMLLinkElement | null);

    if (link) {
      link.href = href;
      return;
    }

    const created = document.createElement("link");
    created.rel = "icon";
    created.href = href;
    document.head.appendChild(created);
  }, [brandingLogoUrl]);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 260);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
            <span className="brandText">{resolvedSystemName}</span>
            <span className="brandMono" aria-hidden="true">
              {brandMono}
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
          {visibleMenuItems.map((item) => {
            const title = isJobSeekerView && item.path === "job-seekers" ? "My Profile" : item.title;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? "navItem navItemActive" : "navItem")}
                aria-label={title}
                title={collapsed ? title : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <span className="navItemIcon" aria-hidden="true">
                  <Icon name={item.icon} />
                  {collapsed && item.path === "messages" && unreadNotificationCount > 0 ? (
                    <span className="navItemBadge" aria-label="Unread messages">
                      {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                    </span>
                  ) : null}
                </span>
                <span className="navItemLabel">{title}</span>
                {!collapsed && item.path === "messages" && unreadNotificationCount > 0 ? (
                  <span
                    className="chipBadge"
                    style={{ marginLeft: "auto", minWidth: 24, textAlign: "center" }}
                  >
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

      </aside>

      <main className="content">
        <div className="appTopUserBar" role="region" aria-label="User controls">
          {displayName ? (
            <div className="appTopUserName" title={displayName}>
              {displayName}
            </div>
          ) : null}
          <button
            type="button"
            className="btn themeToggleBtn"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} />
          </button>
          <button
            className="btn btnGhost btnSm"
            onClick={logout}
            type="button"
            aria-label="Logout"
          >
            <Icon name="logout" />
            <span>Logout</span>
          </button>
        </div>

        <div className="mobileTopBar">
          <button
            type="button"
            className="btn btnGhost iconBtn"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <Icon name={mobileOpen ? "close" : "menu"} />
          </button>
          <div className="mobileTopBarTitle">{pageName}</div>
        </div>
        {permissionsLoading ? <div className="pageText">Loading permissions...</div> : <Outlet />}
      </main>

      {showBackToTop ? (
        <button
          type="button"
          className="btn btnPrimary btnSm backToTopBtn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
        >
          ↑ Back to Top
        </button>
      ) : null}
    </div>
  );
}
