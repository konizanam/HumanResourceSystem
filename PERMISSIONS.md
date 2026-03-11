## Page: Dashboard
- View page: authenticated user
- Admin widgets (system statistics + audit preview): `ADMIN_DASHBOARD`
- Employer widgets (my jobs/applications overview): `EMPLOYER_DASHBOARD`
- Job seeker widgets (my dashboard filters stats/charts): `JOB_SEEKER_DASHBOARD`
- Platform overview widgets: non-job-seeker dashboard users

## Page: Companies
- View page: `VIEW_JOB` (any authenticated user with access to app menu)
- Add Company: `MANAGE_COMPANY`
- Edit Company: `MANAGE_COMPANY`
- Deactivate / Reactivate Company: `MANAGE_COMPANY`
- Add user to company: `MANAGE_COMPANY`
- Approve pending company: `APPROVE_COMPANY`
- Company status badges:
  - `Pending` (yellow)
  - `Approved` (green)

## Page: Job Seeker Profile

## Job Seekers
- My Profile (job seeker self-service): APPLY_JOB
- Job Seeker Profiles (CV database / directory): VIEW_CV_DATABASE (or user/application management permissions)

## Page: Jobs
- View page: authenticated user
- Create Job: `CREATE_JOB`
- Edit Job: `EDIT_JOB`
- Delete Job: `DELETE_JOB`
- View Applications action: `VIEW_APPLICATIONS`
- Apply for job: `APPLY_JOB` (job seekers)
- View Details: authenticated user

## Page: Notifications
- View page: authenticated user
- Mark read / mark all / delete own notifications: authenticated user
- Manage notification preferences (email/job alerts/category/company/industry): authenticated user

## Page: Job Applications
- View page: `VIEW_APPLICATIONS` or route access from Jobs action
- View applicant profile panel: authenticated user on page
- Update application status (job-specific; buttons shown per permission):
  - Longlist: `SET_APPLICATION_STATUS_LONG_LISTED`
  - Shortlist: `SET_APPLICATION_STATUS_SHORTLISTED`
  - Rejected: `SET_APPLICATION_STATUS_REJECTED`
  - Interview: `SET_APPLICATION_STATUS_ORAL_INTERVIEW`
  - Assessment: `SET_APPLICATION_STATUS_PRACTICAL_INTERVIEW`
  - Hired: `SET_APPLICATION_STATUS_HIRED`
- Move applicant back to All Applicants:
  - `MOVE_BACK_TO_ALL_APPLICANTS` (or `SET_APPLICATION_STATUS_APPLIED`)
- Legacy compatibility (still accepted by backend, but not recommended for new role setups):
  - `CHANGE_JOBSEEKER_APP_STATUS`
  - `UPDATE_APPLICATION_STATUS`
- View inline documents: authenticated user on page

## Page: Roles
- View roles list/details: authenticated user
- Add Role: `MANAGE_USERS`
- Edit Role: `MANAGE_USERS`
- Delete Role: `MANAGE_USERS`
- Manage Role Permissions: `MANAGE_USERS`

## Page: Permissions
- View permissions list/grouping: authenticated user
- Add Permission: `MANAGE_USERS`
- Delete Permission: not allowed (system-defined)

## Page: Users
- View users list/details: authenticated user
- Block / Unblock user: `MANAGE_USERS`
- Assign Roles: `MANAGE_USERS`

## Page: Job Categories
- View categories/subcategories: authenticated user
- Add Category: `MANAGE_COMPANY`
- Edit Category: `MANAGE_COMPANY`
- Delete Category: `MANAGE_COMPANY`
- Add Subcategory: `MANAGE_COMPANY`
- Edit Subcategory: `MANAGE_COMPANY`
- Delete Subcategory: `MANAGE_COMPANY`

## Page: Audit
- View page: `VIEW_AUDIT_LOGS`
- Filter by action/date/target: `VIEW_AUDIT_LOGS`
- CRUD actions: not allowed (read-only)

## Page: Reports
- View page: `VIEW_AUDIT_LOGS`
- View summary cards: `VIEW_AUDIT_LOGS`
- View applications status breakdown: `VIEW_AUDIT_LOGS`
- View recent activity: `VIEW_AUDIT_LOGS`
- CRUD actions: not allowed (read-only)

## Page: Email Templates
- View templates: authenticated user
- Create / Edit templates: permission should be restricted by backend policy (recommended: `MANAGE_SYSTEM` or `MANAGE_USERS`)

## Page: Global Settings / Status (placeholder routes)
- View page: authenticated user
- Change app color theme: `CHANGE_APP_COLOR`
- Other mutations: `MANAGE_USERS`

## New Permissions
- `APPROVE_COMPANY` — Can approve pending companies
- `ADMIN_DASHBOARD` — Can access admin dashboard widgets
- `APPLY_JOB` — Can apply for jobs (job seekers)
- `CHANGE_JOBSEEKER_APP_STATUS` — Can update job seeker application status transitions
- `MOVE_BACK_TO_ALL_APPLICANTS` — Can move applicants from status lists back to All Applicants
- `SET_APPLICATION_STATUS_APPLIED` — Can set application status to APPLIED
- `SET_APPLICATION_STATUS_SCREENING` — Can set application status to SCREENING
- `SET_APPLICATION_STATUS_LONG_LISTED` — Can set application status to LONG_LISTED
- `SET_APPLICATION_STATUS_SHORTLISTED` — Can set application status to SHORTLISTED
- `SET_APPLICATION_STATUS_ORAL_INTERVIEW` — Can set application status to ORAL_INTERVIEW
- `SET_APPLICATION_STATUS_PRACTICAL_INTERVIEW` — Can set application status to PRACTICAL_INTERVIEW
- `SET_APPLICATION_STATUS_FINAL_INTERVIEW` — Can set application status to FINAL_INTERVIEW
- `SET_APPLICATION_STATUS_OFFER_MADE` — Can set application status to OFFER_MADE
- `SET_APPLICATION_STATUS_HIRED` — Can set application status to HIRED
- `SET_APPLICATION_STATUS_REJECTED` — Can set application status to REJECTED
- `SET_APPLICATION_STATUS_WITHDRAWN` — Can set application status to WITHDRAWN
- `CHANGE_APP_COLOR` — Can change application color theme
- `EMPLOYER_DASHBOARD` — Can access employer dashboard widgets
- `JOB_SEEKER_DASHBOARD` — Can access job seeker dashboard widgets
- `MANAGE_NOTIFICATIONS` — Can manage notification preferences
