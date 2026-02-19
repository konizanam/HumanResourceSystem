import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { RequireAuth } from "./auth/RequireAuth";
import { AppLayout } from "./layout/AppLayout";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { JobSeekerProfilePage } from "./pages/JobSeekerProfilePage";
import { CompaniesPage } from "./pages/CompaniesPage";
import { EmailTemplatesPage } from "./pages/EmailTemplatesPage";

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

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout menuItems={menu} />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to={menu[0].path} replace />} />

        {/* Job Seeker has a real page instead of placeholder */}
        <Route path="job-seekers" element={<JobSeekerProfilePage />} />

        {/* Companies has a real page instead of placeholder */}
        <Route path="companies" element={<CompaniesPage />} />

        {/* Email Templates has a real page instead of placeholder */}
        <Route path="email-templates" element={<EmailTemplatesPage />} />

        {menu
          .filter(
            (m) =>
              m.path !== "job-seekers" &&
              m.path !== "companies" &&
              m.path !== "email-templates",
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
