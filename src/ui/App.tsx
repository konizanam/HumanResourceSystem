import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SignupPage } from "./pages/SignupPage";
import { RequireAuth } from "./auth/RequireAuth";
import { usePermissions } from "./auth/usePermissions";
import { AppLayout } from "./layout/AppLayout";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { JobSeekerProfilePage } from "./pages/JobSeekerProfilePage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { EmailTemplatesPage } from "./pages/EmailTemplatesPage";
import { RolesPage } from "./pages/RolesPage";
import { JobCategoriesPage } from "./pages/JobCategoriesPage";
import { UsersPage } from "./pages/UsersPage";
import { JobsPage } from "./pages/JobsPage";
import { JobApplicationsPage } from "./pages/JobApplicationsPage";
import { PermissionsPage } from "./pages/PermissionsPage";
import { AuditPage } from "./pages/AuditPage";
import { ReportsPage } from "./pages/ReportsPage";
import { StatusPage } from "./pages/StatusPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { ApplicationsPage } from "./pages/ApplicationsPage";
import { GlobalSettingsPage } from "./pages/GlobalSettingsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { PublicJobsPage } from "./pages/PublicJobsPage";
import { MyPermissionsPage } from "./pages/MyPermissionsPage";
import { MainCompanySetupPage } from "./pages/MainCompanySetupPage";
import { ActivateAccountPage } from "./pages/ActivateAccountPage";
import { IndustriesPage } from "./pages/IndustriesPage";
import { getPublicSetupStatus, getPublicSystemSettings } from "./api/client";
import { useAuth } from "./auth/AuthContext";

const menu = [
  { path: "dashboard", title: "Dashboard", icon: "home" },
  { path: "global-settings", title: "Global Settings", icon: "settings" },
  { path: "my-profile", title: "My Profile", icon: "users" },
  { path: "job-seeker-profiles", title: "Job Seeker Profiles", icon: "users" },
  { path: "jobs", title: "Jobs", icon: "briefcase" },
  { path: "applications", title: "Applications", icon: "list" },
  { path: "companies", title: "Companies", icon: "building" },
  { path: "notifications", title: "Job Alerts", icon: "bell" },
  { path: "my-permissions", title: "My Permissions", icon: "key" },
  { path: "messages", title: "Messages", icon: "message" },
  { path: "users", title: "Users", icon: "users" },
  { path: "roles", title: "Roles", icon: "shield" },
  { path: "permission", title: "Permissions", icon: "key" },
  { path: "status", title: "Status", icon: "list" },
  { path: "job-categories", title: "Job Categories", icon: "tag" },
  { path: "industries", title: "Industries", icon: "building" },
  { path: "audit", title: "Audit", icon: "shield" },
  { path: "email-templates", title: "Email Templates", icon: "file" },
  { path: "reports", title: "Reports", icon: "chart" },
] as const;

type HasPermissionFn = (...candidates: string[]) => boolean;

function LoginEntryRoute() {
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSetupStatus = async () => {
      try {
        const status = await getPublicSetupStatus();
        if (!cancelled) {
          setSetupRequired(status.setup_required);
        }
      } catch {
        if (!cancelled) {
          setSetupRequired(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSetupStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <PlaceholderPage title="Loading..." />;
  }

  if (setupRequired) {
    return <Navigate to="/setup/main-company" replace />;
  }

  return <LoginPage />;
}

function MainCompanySetupRoute() {
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSetupStatus = async () => {
      try {
        const status = await getPublicSetupStatus();
        if (!cancelled) {
          setSetupRequired(status.setup_required);
        }
      } catch {
        if (!cancelled) {
          setSetupRequired(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSetupStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <PlaceholderPage title="Loading setup..." />;
  }

  if (!setupRequired) {
    return <Navigate to="/login" replace />;
  }

  return <MainCompanySetupPage />;
}

function SetupGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { accessToken, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSetupStatus = async () => {
      try {
        const status = await getPublicSetupStatus();
        if (!cancelled) {
          setSetupRequired(status.setup_required);
        }
      } catch {
        if (!cancelled) {
          // Fail open if status API is unavailable.
          setSetupRequired(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSetupStatus();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!setupRequired) return;
    if (!accessToken) return;

    // Ensure incomplete setup cannot continue with an existing authenticated session.
    logout();
  }, [accessToken, loading, logout, setupRequired]);

  if (loading) {
    return <PlaceholderPage title="Loading setup status..." />;
  }

  const onSetupRoute = location.pathname.startsWith("/setup/main-company");

  if (setupRequired && !onSetupRoute) {
    return <Navigate to="/setup/main-company" replace />;
  }

  if (!setupRequired && onSetupRoute) {
    return <Navigate to={accessToken ? "/app/dashboard" : "/login"} replace />;
  }

  return <>{children}</>;
}

function resolveDashboardPath(hasPermission: HasPermissionFn) {
  void hasPermission;
  return "/app/dashboard";
}

function DashboardHomeRedirect() {
  const { loading, hasPermission } = usePermissions();

  if (loading) {
    return <PlaceholderPage title="Loading dashboard..." />;
  }

  return <Navigate to={resolveDashboardPath(hasPermission)} replace />;
}

function PermissionGate({
  allow,
  requiredPermissions,
  children,
}: {
  allow: (hasPermission: HasPermissionFn) => boolean;
  requiredPermissions?: string[];
  children: ReactNode;
}) {
  const { loading, hasPermission } = usePermissions();

  if (loading) {
    return <PlaceholderPage title="Loading..." />;
  }

  if (!allow(hasPermission)) {
    const requiredText =
      Array.isArray(requiredPermissions) && requiredPermissions.length > 0
        ? requiredPermissions.join(" or ")
        : "one of the required permissions";

    return (
      <div className="page">
        <h1 className="pageTitle">Insufficient permissions</h1>
        <div className="errorBox" style={{ marginTop: 10 }}>
          Required permission: {requiredText}.
        </div>
      </div>
    );
  }

  return children;
}

function NonJobSeekerGate({ children }: { children: ReactNode }) {
  const { loading, hasPermission } = usePermissions();

  if (loading) {
    return <PlaceholderPage title="Loading..." />;
  }

  const isAdminView = hasPermission("MANAGE_USERS");
  const isEmployerView = !isAdminView && (hasPermission("EMPLOYER_DASHBOARD") || hasPermission("CREATE_JOB"));
  const isJobSeekerView = !isAdminView && !isEmployerView && hasPermission("APPLY_JOB");

  if (isJobSeekerView) {
    return (
      <div className="page">
        <h1 className="pageTitle">Insufficient permissions</h1>
        <div className="errorBox" style={{ marginTop: 10 }}>
          This page is not available for job seekers.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function App() {
  const [footerCompanyName, setFooterCompanyName] = useState("Global Company Name");
  const location = useLocation();

  const hideShellFooter =
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/reset-password") ||
    location.pathname.startsWith("/activate") ||
    location.pathname.startsWith("/setup/main-company");

  useEffect(() => {
    if (typeof document === "undefined") return;

    const targetSelector = ".errorBox, .successBox, .hintBox";

    const decorateNode = (node: Element) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.dataset.dismissibleReady === "1") return;

      node.dataset.dismissibleReady = "1";
      node.classList.add("dismissibleNotice");

      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "alertCloseBtn";
      closeBtn.setAttribute("aria-label", "Dismiss message");
      closeBtn.title = "Dismiss";
      closeBtn.textContent = "x";
      closeBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        node.remove();
      });

      node.appendChild(closeBtn);
    };

    const decorateAll = (root: ParentNode) => {
      const nodes = root.querySelectorAll(targetSelector);
      nodes.forEach((node) => decorateNode(node));
    };

    decorateAll(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((addedNode) => {
          if (!(addedNode instanceof Element)) return;

          if (addedNode.matches(targetSelector)) {
            decorateNode(addedNode);
          }
          decorateAll(addedNode);
        });
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFooterCompanyName = async () => {
      try {
        const settings = await getPublicSystemSettings();
        if (cancelled) return;
        const companyName = String(settings.system_name ?? "").trim();
        setFooterCompanyName(companyName || "Global Company Name");
      } catch {
        if (cancelled) return;
        setFooterCompanyName("Global Company Name");
      }
    };

    void loadFooterCompanyName();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SetupGuard>
      <>
      <Routes>
        <Route path="/login" element={<LoginEntryRoute />} />
        <Route path="/activate" element={<ActivateAccountPage />} />
        <Route path="/setup/main-company" element={<MainCompanySetupRoute />} />
        <Route path="/register" element={<SignupPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/jobs" element={<PublicJobsPage />} />
        <Route path="/jobs/:jobId" element={<PublicJobsPage />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppLayout menuItems={menu} />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardHomeRedirect />} />
          <Route path="dashboard" element={<DashboardPage />} />

        <Route
          path="global-settings"
          element={
            <PermissionGate
              allow={(hasPermission) => hasPermission("MANAGE_USERS", "CHANGE_APP_COLOR")}
              requiredPermissions={["MANAGE_USERS", "CHANGE_APP_COLOR"]}
            >
              <GlobalSettingsPage />
            </PermissionGate>
          }
        />
        <Route
          path="my-profile"
          element={
            <PermissionGate
              allow={(hasPermission) =>
                hasPermission("APPLY_JOB")
              }
              requiredPermissions={["APPLY_JOB"]}
            >
              <JobSeekerProfilePage forcedMode="self" />
            </PermissionGate>
          }
        />

        <Route
          path="job-seeker-profiles"
          element={
            <PermissionGate
              allow={(hasPermission) =>
                hasPermission("MANAGE_USERS") ||
                hasPermission("VIEW_USERS") ||
                hasPermission("VIEW_APPLICATIONS") ||
                hasPermission("MANAGE_APPLICATIONS") ||
                hasPermission("VIEW_CV_DATABASE")
              }
              requiredPermissions={[
                "MANAGE_USERS",
                "VIEW_USERS",
                "VIEW_APPLICATIONS",
                "MANAGE_APPLICATIONS",
                "VIEW_CV_DATABASE",
              ]}
            >
              <JobSeekerProfilePage forcedMode="directory" />
            </PermissionGate>
          }
        />
        <Route path="jobs" element={<JobsPage />} />
        <Route
          path="applications"
          element={
            <PermissionGate
              allow={(hasPermission) =>
                hasPermission("MANAGE_USERS", "VIEW_APPLICATIONS")
              }
              requiredPermissions={["MANAGE_USERS", "VIEW_APPLICATIONS"]}
            >
              <ApplicationsPage />
            </PermissionGate>
          }
        />
        <Route
          path="jobs/:jobId/applications"
          element={
            <PermissionGate
              allow={(hasPermission) =>
                hasPermission("MANAGE_USERS", "VIEW_APPLICATIONS")
              }
              requiredPermissions={["MANAGE_USERS", "VIEW_APPLICATIONS"]}
            >
              <JobApplicationsPage />
            </PermissionGate>
          }
        />
        <Route
          path="companies"
          element={
            <PermissionGate
              allow={(hasPermission) =>
                hasPermission("MANAGE_USERS") || hasPermission("CREATE_JOB")
              }
              requiredPermissions={["MANAGE_USERS", "CREATE_JOB"]}
            >
              <CompaniesPage />
            </PermissionGate>
          }
        />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="my-permissions" element={<MyPermissionsPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route
          path="users"
          element={
            <PermissionGate allow={(hasPermission) => hasPermission("MANAGE_USERS")} requiredPermissions={["MANAGE_USERS"]}>
              <UsersPage />
            </PermissionGate>
          }
        />
        <Route
          path="roles"
          element={
            <PermissionGate allow={(hasPermission) => hasPermission("MANAGE_USERS")} requiredPermissions={["MANAGE_USERS"]}>
              <RolesPage />
            </PermissionGate>
          }
        />
        <Route
          path="permission"
          element={
            <PermissionGate allow={(hasPermission) => hasPermission("MANAGE_USERS")} requiredPermissions={["MANAGE_USERS"]}>
              <PermissionsPage />
            </PermissionGate>
          }
        />
        <Route
          path="status"
          element={
            <PermissionGate allow={(hasPermission) => hasPermission("MANAGE_USERS")} requiredPermissions={["MANAGE_USERS"]}>
              <StatusPage />
            </PermissionGate>
          }
        />
        <Route
          path="job-categories"
          element={
            <PermissionGate allow={(hasPermission) => hasPermission("MANAGE_USERS")} requiredPermissions={["MANAGE_USERS"]}>
              <JobCategoriesPage />
            </PermissionGate>
          }
        />
        <Route
          path="industries"
          element={
            <NonJobSeekerGate>
              <IndustriesPage />
            </NonJobSeekerGate>
          }
        />
        <Route
          path="audit"
          element={
            <PermissionGate allow={(hasPermission) => hasPermission("MANAGE_USERS")} requiredPermissions={["MANAGE_USERS"]}>
              <AuditPage />
            </PermissionGate>
          }
        />
        <Route
          path="email-templates"
          element={
            <PermissionGate allow={(hasPermission) => hasPermission("MANAGE_USERS")} requiredPermissions={["MANAGE_USERS"]}>
              <EmailTemplatesPage />
            </PermissionGate>
          }
        />
        <Route
          path="reports"
          element={
            <PermissionGate
              allow={(hasPermission) => hasPermission("MANAGE_USERS", "VIEW_APPLICANTS_REPORT", "VIEW_AUDIT_LOGS")}
              requiredPermissions={["MANAGE_USERS", "VIEW_APPLICANTS_REPORT", "VIEW_AUDIT_LOGS"]}
            >
              <ReportsPage />
            </PermissionGate>
          }
        />
        </Route>

        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
      {!hideShellFooter ? (
        <footer className="globalAppFooter">
          <span>© 2026 All Rights Reserved. {footerCompanyName}. Developed By: </span>
          <a href="https://it.konizanam.com" target="_blank" rel="noreferrer">Koniza Information Technology</a>
        </footer>
      ) : null}
      </>
    </SetupGuard>
  );
}
