-- Seed script for three test users in the hito database.
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING).
--
-- Usage example:
--   psql -d hito -f apps/api/seed-users.sql

BEGIN;

-- Required for bcrypt hashing via crypt(..., gen_salt('bf', 10)).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure baseline roles exist (aligned with backend/Hito_database.sql).
INSERT INTO roles (name, description) VALUES
  ('ADMIN', 'Full system access'),
  ('HR_MANAGER', 'Manage company recruitment and team'),
  ('JOB_SEEKER', 'Apply to jobs and manage profile')
ON CONFLICT (name) DO NOTHING;

-- Ensure known permissions exist (aligned with backend/Hito_database.sql).
INSERT INTO permissions (name, description, module_name, action_type) VALUES
  ('CREATE_JOB', 'Create new job postings', 'Jobs', 'CREATE'),
  ('VIEW_JOB', 'View job details', 'Jobs', 'VIEW'),
  ('EDIT_JOB', 'Edit existing jobs', 'Jobs', 'UPDATE'),
  ('DELETE_JOB', 'Delete job postings', 'Jobs', 'DELETE'),
  ('APPROVE_JOB', 'Approve pending jobs', 'Jobs', 'APPROVE'),
  ('VIEW_APPLICATIONS', 'View job applications', 'Applications', 'VIEW'),
  ('UPDATE_APPLICATION_STATUS', 'Change application status', 'Applications', 'UPDATE'),
  ('SHORTLIST_CANDIDATE', 'Move candidates to shortlist', 'Applications', 'UPDATE'),
  ('VIEW_CV_DATABASE', 'Access CV search', 'Candidates', 'VIEW'),
  ('VIEW_SENSITIVE_DATA', 'View personal details and ID documents', 'Candidates', 'VIEW'),
  ('CONTACT_REFERENCES', 'Contact candidate references', 'Candidates', 'UPDATE'),
  ('MANAGE_COMPANY', 'Edit company profile', 'Company', 'UPDATE'),
  ('MANAGE_COMPANY_USERS', 'Add/remove company HR users', 'Company', 'UPDATE'),
  ('APPROVE_COMPANY', 'Can approve pending companies', 'Company', 'APPROVE'),
  ('APPLY_JOB', 'Can apply for jobs', 'Applications', 'CREATE'),
  ('MANAGE_NOTIFICATIONS', 'Can manage notification preferences', 'Notifications', 'MANAGE'),
  ('MANAGE_USERS', 'Create and manage users', 'Users', 'MANAGE'),
  ('VIEW_AUDIT_LOGS', 'Access audit logs', 'System', 'VIEW')
ON CONFLICT (name) DO NOTHING;

-- Ensure ADMIN has all permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure Job Seeker has apply + notification preference permissions.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('APPLY_JOB', 'MANAGE_NOTIFICATIONS')
WHERE r.name = 'JOB_SEEKER'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ensure Employer/HR manager can manage notification preferences and approve company if assigned.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('MANAGE_NOTIFICATIONS', 'APPROVE_COMPANY')
WHERE r.name IN ('HR_MANAGER', 'EMPLOYER')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User 1: Admin
INSERT INTO users (id, first_name, last_name, email, password_hash, is_active)
VALUES (
  'f9fa7048-4ecf-4f60-b4e2-1d5e0d2db77d',
  'Xander',
  'Shadoey',
  'xshadoey@gmail.com',
  crypt('!Shadoey01', gen_salt('bf', 10)),
  TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ADMIN'
WHERE u.email = 'xshadoey@gmail.com'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- User 2: Job Seeker
INSERT INTO users (id, first_name, last_name, email, password_hash, is_active)
VALUES (
  'bd66db8d-d60f-4af5-a3f2-77e75455d7af',
  'Lenton',
  'Losper',
  'llosperofficial@gmail.com',
  crypt('!Shadoey01', gen_salt('bf', 10)),
  TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'JOB_SEEKER'
WHERE u.email = 'llosperofficial@gmail.com'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO job_seeker_profiles (
  user_id,
  professional_summary,
  field_of_expertise,
  qualification_level,
  years_experience
)
SELECT
  u.id,
  'Detail-oriented candidate seeking operations and administration roles. Strong organizational, communication, and computer skills.',
  'Business Administration',
  'Diploma',
  3
FROM users u
WHERE u.email = 'llosperofficial@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO job_seeker_personal_details (
  id,
  user_id,
  first_name,
  last_name,
  middle_name,
  gender,
  date_of_birth,
  nationality,
  id_type,
  id_number,
  marital_status,
  disability_status
)
SELECT
  '9e874f8d-1a45-4584-8718-2573da2d61ef',
  u.id,
  'Lenton',
  'Losper',
  'M',
  'Male',
  DATE '1998-09-14',
  'South African',
  'National ID',
  '9809145509087',
  'Single',
  FALSE
FROM users u
WHERE u.email = 'llosperofficial@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO job_seeker_addresses (
  id,
  user_id,
  address_line1,
  address_line2,
  city,
  state,
  country,
  postal_code,
  is_primary
)
SELECT
  '2d9ffea4-a09f-4fc2-a7c2-3cd0b0f1fbff',
  u.id,
  '12 Cedar Street',
  'Unit 4',
  'Johannesburg',
  'Gauteng',
  'South Africa',
  '2001',
  TRUE
FROM users u
WHERE u.email = 'llosperofficial@gmail.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_seeker_education (
  id,
  user_id,
  institution_name,
  qualification,
  field_of_study,
  start_date,
  end_date,
  is_current,
  grade
)
SELECT
  '56f18ae0-4e57-4d76-bfdf-73ceef2df3fd',
  u.id,
  'Johannesburg Technical College',
  'National Diploma',
  'Business Administration',
  DATE '2017-01-10',
  DATE '2019-11-30',
  FALSE,
  'B+'
FROM users u
WHERE u.email = 'llosperofficial@gmail.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_seeker_experience (
  id,
  user_id,
  company_name,
  job_title,
  employment_type,
  start_date,
  end_date,
  is_current,
  responsibilities,
  salary,
  reference_contact
)
SELECT
  '5d4e9439-1e22-4b9d-88ea-95ef5ca95cbf',
  u.id,
  'Metro Office Supplies',
  'Administrative Assistant',
  'Full-time',
  DATE '2020-02-03',
  DATE '2024-08-31',
  FALSE,
  'Managed scheduling, prepared reports, coordinated vendor communication, and supported day-to-day office operations.',
  18000.00,
  'Grace Mokoena - +27 82 334 5566'
FROM users u
WHERE u.email = 'llosperofficial@gmail.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_seeker_references (
  id,
  user_id,
  full_name,
  relationship,
  company,
  email,
  phone
)
SELECT
  '8c8f18bb-85f5-4318-b5f8-2d2098ec7a6a',
  u.id,
  'Grace Mokoena',
  'Former Supervisor',
  'Metro Office Supplies',
  'grace.mokoena@example.com',
  '+27 82 334 5566'
FROM users u
WHERE u.email = 'llosperofficial@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- User 3: Employer (fallback to HR_MANAGER if EMPLOYER role does not exist).
INSERT INTO users (id, first_name, last_name, email, password_hash, is_active)
VALUES (
  '6767999f-6f26-4586-ab8f-239a8849dfd9',
  'Lenton',
  'Employer',
  'llosper@konizanam.com',
  crypt('!Shadoey01', gen_salt('bf', 10)),
  TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT
  u.id,
  COALESCE(
    (SELECT id FROM roles WHERE name = 'EMPLOYER' LIMIT 1),
    (SELECT id FROM roles WHERE name = 'HR_MANAGER' LIMIT 1)
  ) AS role_id
FROM users u
WHERE u.email = 'llosper@konizanam.com'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO companies (
  id,
  name,
  industry,
  description,
  website,
  contact_email,
  contact_phone,
  address_line1,
  city,
  country,
  created_by
)
SELECT
  'df2ba8ec-0c2d-497e-8d32-7f2d8bbf7d7a',
  'Konizanam Holdings (Demo)',
  'Human Resources',
  'Demo company for employer account seeding.',
  'https://konizanam.example.com',
  'careers@konizanam.com',
  '+27 11 555 0199',
  '100 Rivonia Road',
  'Johannesburg',
  'South Africa',
  u.id
FROM users u
WHERE u.email = 'llosper@konizanam.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO company_users (company_id, user_id)
SELECT
  c.id,
  u.id
FROM companies c
JOIN users u ON u.email = 'llosper@konizanam.com'
WHERE c.id = 'df2ba8ec-0c2d-497e-8d32-7f2d8bbf7d7a'
ON CONFLICT (company_id, user_id) DO NOTHING;

COMMIT;
