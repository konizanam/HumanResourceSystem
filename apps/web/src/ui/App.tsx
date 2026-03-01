import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
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

const menu = [
  { path: "dashboard", title: "Dashboard", icon: "home" },
  { path: "global-settings", title: "Global Settings", icon: "settings" },
  { path: "job-seekers", title: "Job Seeker Profiles", icon: "users" },
  { path: "jobs", title: "Jobs", icon: "briefcase" },
  { path: "applications", title: "Applications", icon: "list" },
  { path: "companies", title: "Companies", icon: "building" },
  { path: "notifications", title: "Job Alerts", icon: "bell" },
  { path: "my-permissions", title: "My Permissions", icon: "key" },
  { path: "messages", title: "Messages", icon: "message" },
  { path: "users", title: "Users", icon: "users" },
  { path: "roles", title: "Roles", icon: "shield" },
  { path: "permission", title: "Permission", icon: "key" },
  { path: "status", title: "Status", icon: "list" },
  { path: "job-categories", title: "Job Categories", icon: "tag" },
  { path: "audit", title: "Audit", icon: "file" },
  { path: "email-templates", title: "Email Templates", icon: "file" },
  { path: "reports", title: "Reports", icon: "chart" },
] as const;

type HasPermissionFn = (...candidates: string[]) => boolean;

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

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
            <PermissionGate allow={(hasPermission) => hasPermission("MANAGE_USERS")}>
              <GlobalSettingsPage />
            </PermissionGate>
          }
        />
        <Route
          path="job-seekers"
          element={
            <PermissionGate
              allow={(hasPermission) =>
                hasPermission("MANAGE_USERS") ||
                (!hasPermission("MANAGE_USERS") && !hasPermission("CREATE_JOB"))
              }
            >
              <JobSeekerProfilePage />
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
            <PermissionGate allow={(hasPermission) => hasPermission("MANAGE_USERS")} requiredPermissions={["MANAGE_USERS"]}>
              <ReportsPage />
            </PermissionGate>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
