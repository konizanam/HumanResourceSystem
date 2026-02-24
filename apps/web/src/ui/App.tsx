import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { SignupPage } from "./pages/SignupPage";
import { RequireAuth } from "./auth/RequireAuth";
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

const menu = [
  { path: "global-settings", title: "Global Settings", icon: "settings" },
  { path: "job-seekers", title: "Job Seeker", icon: "users" },
  { path: "users", title: "Users", icon: "users" },
  { path: "jobs", title: "Jobs", icon: "briefcase" },
  { path: "companies", title: "Companies", icon: "building" },
  { path: "roles", title: "Roles", icon: "shield" },
  { path: "permission", title: "Permission", icon: "key" },
  { path: "status", title: "Status", icon: "list" },
  { path: "job-categories", title: "Job Categories", icon: "tag" },
  { path: "audit", title: "Audit", icon: "file" },
  { path: "email-templates", title: "Email Templates", icon: "file" },
  { path: "reports", title: "Reports", icon: "chart" },
] as const;

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<SignupPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout menuItems={menu} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to={menu[0].path} replace />} />

        {/* Real pages connected to backend APIs */}
        <Route path="job-seekers" element={<JobSeekerProfilePage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="email-templates" element={<EmailTemplatesPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="job-categories" element={<JobCategoriesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="jobs/:jobId/applications" element={<JobApplicationsPage />} />
        <Route path="permission" element={<PermissionsPage />} />
        <Route path="status" element={<StatusPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="reports" element={<ReportsPage />} />

        {/* Remaining placeholders: global-settings */}
        {menu
          .filter(
            (m) =>
              m.path !== "job-seekers" &&
              m.path !== "companies" &&
              m.path !== "email-templates" &&
              m.path !== "roles" &&
              m.path !== "job-categories" &&
              m.path !== "users" &&
              m.path !== "jobs" &&
              m.path !== "permission" &&
              m.path !== "status" &&
              m.path !== "audit" &&
              m.path !== "reports",
          )
          .map((m) => (
            <Route
              key={m.path}
              path={m.path}
              element={<PlaceholderPage title={m.title} />}
            />
          ))}
      </Route>

      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
