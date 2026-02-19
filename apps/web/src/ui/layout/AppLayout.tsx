import { useMemo, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useSettings } from "../context/SettingsContext";

type IconName =
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
  const { logout, user } = useAuth();
  const settings = useSettings();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const systemName = settings.system_name || "HR System";
  const systemShort = systemName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  const sidebarClassName =
    (collapsed ? "sidebar sidebarCollapsed" : "sidebar") +
    (mobileOpen ? " sidebarMobileOpen" : "");

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
            <span className="brandText">{systemName}</span>
            <span className="brandMono" aria-hidden="true">
              {systemShort}
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
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "navItem navItemActive" : "navItem"
              }
              aria-label={item.title}
              title={collapsed ? item.title : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <span className="navItemIcon" aria-hidden="true">
                <Icon name={item.icon} />
              </span>
              <span className="navItemLabel">{item.title}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebarFooter">
          {user && (
            <div className="sidebarUser">
              <span className="sidebarUserName">{user.name}</span>
              <span className="sidebarUserRole">
                {user.roles?.[0] ?? "User"}
              </span>
            </div>
          )}
          <button
            className={
              collapsed
                ? "btn btnGhost logoutBtn logoutBtnCollapsed"
                : "btn btnGhost logoutBtn"
            }
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
        <Outlet />
      </main>
    </div>
  );
}
