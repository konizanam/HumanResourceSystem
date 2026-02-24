## Page: Companies
- View page: `VIEW_JOB` (any authenticated user with access to app menu)
- Add Company: `MANAGE_COMPANY`
- Edit Company: `MANAGE_COMPANY`
- Deactivate / Reactivate Company: `MANAGE_COMPANY`
- Add user to company: `MANAGE_COMPANY`

## Page: Job Seeker Profile
- View page: authenticated user
- Edit Personal Details: profile owner
- Edit Address: profile owner
- Edit Education: profile owner
- Edit Experience: profile owner
- Edit References: profile owner
- Edit Professional Summary: profile owner

## Page: Jobs
- View page: authenticated user
- Create Job: `CREATE_JOB`
- Edit Job: `EDIT_JOB`
- Delete Job: `DELETE_JOB`
- View Applications action: `VIEW_APPLICATIONS`
- View Details: authenticated user

## Page: Job Applications
- View page: `VIEW_APPLICATIONS` or route access from Jobs action
- View applicant profile panel: authenticated user on page
- Update application status (Longlist/Shortlist/Rejected/Interview/Assessment/Hired): `UPDATE_APPLICATION_STATUS`
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
- Delete Permission: `MANAGE_USERS`

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
- Mutations: TBD (define dedicated permissions before enabling)
