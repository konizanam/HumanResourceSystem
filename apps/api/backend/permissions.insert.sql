-- Consolidated permissions upsert script
-- Safe to run multiple times.

BEGIN;

INSERT INTO permissions (name, description, module_name, action_type) VALUES
  ('ADMIN_DASHBOARD', 'Access admin dashboard widgets', 'Dashboard', 'VIEW'),
  ('APPLY_JOB', 'Apply for jobs', 'Applications', 'CREATE'),
  ('APPROVE_COMPANY', 'Approve pending companies', 'Company', 'APPROVE'),
  ('APPROVE_JOB', 'Approve pending jobs', 'Jobs', 'APPROVE'),
  ('CHANGE_APP_COLOR', 'Change application color theme', 'System', 'UPDATE'),
  ('CHANGE_JOBSEEKER_APP_STATUS', 'Change job seeker application status', 'Applications', 'UPDATE'),
  ('CONTACT_REFERENCES', 'Contact candidate references', 'Candidates', 'UPDATE'),
  ('CREATE_JOB', 'Create new job postings', 'Jobs', 'CREATE'),
  ('DELETE_JOB', 'Delete job postings', 'Jobs', 'DELETE'),
  ('EDIT_JOB', 'Edit existing jobs', 'Jobs', 'UPDATE'),
  ('EMPLOYER_DASHBOARD', 'Access employer dashboard widgets', 'Dashboard', 'VIEW'),
  ('JOB_SEEKER_DASHBOARD', 'Access job seeker dashboard widgets', 'Dashboard', 'VIEW'),
  ('MANAGE_APPLICATIONS', 'Manage applications', 'Applications', 'MANAGE'),
  ('MANAGE_COMPANY', 'Edit company profile', 'Company', 'UPDATE'),
  ('MANAGE_COMPANY_USERS', 'Add/remove company HR users', 'Company', 'UPDATE'),
  ('MANAGE_NOTIFICATIONS', 'Manage notification preferences', 'Notifications', 'MANAGE'),
  ('MANAGE_SYSTEM', 'Manage system settings', 'System', 'MANAGE'),
  ('MANAGE_USERS', 'Create and manage users', 'Users', 'MANAGE'),
  ('MOVE_BACK_TO_ALL_APPLICANTS', 'Move applicant back to All Applicants list', 'Applications', 'UPDATE'),
  ('SET_APPLICATION_STATUS_APPLIED', 'Set application status to APPLIED', 'Applications', 'UPDATE'),
  ('SET_APPLICATION_STATUS_FINAL_INTERVIEW', 'Set application status to FINAL_INTERVIEW', 'Applications', 'UPDATE'),
  ('SET_APPLICATION_STATUS_HIRED', 'Set application status to HIRED', 'Applications', 'UPDATE'),
  ('SET_APPLICATION_STATUS_LONG_LISTED', 'Set application status to LONG_LISTED', 'Applications', 'UPDATE'),
  ('SET_APPLICATION_STATUS_OFFER_MADE', 'Set application status to OFFER_MADE', 'Applications', 'UPDATE'),
  ('SET_APPLICATION_STATUS_ORAL_INTERVIEW', 'Set application status to ORAL_INTERVIEW', 'Applications', 'UPDATE'),
  ('SET_APPLICATION_STATUS_PRACTICAL_INTERVIEW', 'Set application status to PRACTICAL_INTERVIEW', 'Applications', 'UPDATE'),
  ('SET_APPLICATION_STATUS_REJECTED', 'Set application status to REJECTED', 'Applications', 'UPDATE'),
  ('SET_APPLICATION_STATUS_SCREENING', 'Set application status to SCREENING', 'Applications', 'UPDATE'),
  ('SET_APPLICATION_STATUS_SHORTLISTED', 'Set application status to SHORTLISTED', 'Applications', 'UPDATE'),
  ('SET_APPLICATION_STATUS_WITHDRAWN', 'Set application status to WITHDRAWN', 'Applications', 'UPDATE'),
  ('SHORTLIST_CANDIDATE', 'Move candidates to shortlist', 'Applications', 'UPDATE'),
  ('UPDATE_APPLICATION_STATUS', 'Change application status', 'Applications', 'UPDATE'),
  ('VIEW_APPLICATIONS', 'View job applications', 'Applications', 'VIEW'),
  ('VIEW_AUDIT_LOGS', 'Access audit logs', 'System', 'VIEW'),
  ('VIEW_CV_DATABASE', 'Access CV search', 'Candidates', 'VIEW'),
  ('VIEW_JOB', 'View job details', 'Jobs', 'VIEW'),
  ('VIEW_SENSITIVE_DATA', 'View personal details and ID documents', 'Candidates', 'VIEW'),
  ('VIEW_USERS', 'View users list/details', 'Users', 'VIEW')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  module_name = EXCLUDED.module_name,
  action_type = EXCLUDED.action_type;

COMMIT;
