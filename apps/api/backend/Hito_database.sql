-- =====================================================
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- MODULE 1: User & Role Management (RBAC)

-- 1.1 users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    password_reset_token TEXT,
    password_reset_expires_at TIMESTAMP,
    password_reset_requested_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT
);

-- 1.3 permissions table (separate from role_permissions for cleaner design)
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module_name VARCHAR(100) NOT NULL,
    action_type VARCHAR(100) NOT NULL
);

-- 1.4 role_permissions junction table
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 1.5 user_roles junction table
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- =====================================================
-- MODULE 2: Company Management
-- =====================================================

-- 2.1 companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    industry VARCHAR(100),
    description TEXT,
    website VARCHAR(255),
    logo_url TEXT,
    contact_email VARCHAR(150),
    contact_phone VARCHAR(50),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    country VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 company_users junction table
CREATE TABLE company_users (
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (company_id, user_id)
);

-- =====================================================
-- MODULE 3: Job Seeker Profiles & CV Database
-- =====================================================

-- 3.1 job_seeker_profiles table
CREATE TABLE job_seeker_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    professional_summary TEXT,
    field_of_expertise VARCHAR(100),
    qualification_level VARCHAR(100),
    years_experience INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 job_seeker_personal_details table
CREATE TABLE job_seeker_personal_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    gender VARCHAR(50),
    date_of_birth DATE,
    nationality VARCHAR(100),
    id_type VARCHAR(50),
    id_number VARCHAR(100),
    id_document_url TEXT,
    marital_status VARCHAR(50),
    disability_status BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.3 job_seeker_addresses table
CREATE TABLE job_seeker_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    is_primary BOOLEAN DEFAULT TRUE
);

-- 3.4 job_seeker_education table
CREATE TABLE job_seeker_education (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution_name VARCHAR(255) NOT NULL,
    qualification VARCHAR(255) NOT NULL,
    field_of_study VARCHAR(255),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    grade VARCHAR(100),
    certificate_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.5 job_seeker_experience table
CREATE TABLE job_seeker_experience (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    employment_type VARCHAR(100),
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    responsibilities TEXT,
    salary NUMERIC(12,2),
    reference_contact VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.6 job_seeker_references table
CREATE TABLE job_seeker_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100),
    company VARCHAR(255),
    email VARCHAR(150),
    phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MODULE 4: Job Management
-- =====================================================

-- 4.1 job_categories table
CREATE TABLE job_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL
);

-- 4.2 job_subcategories table
CREATE TABLE job_subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES job_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

-- 4.3 jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES job_categories(id),
    subcategory_id UUID REFERENCES job_subcategories(id),
    salary_min NUMERIC(12,2),
    salary_max NUMERIC(12,2),
    is_urgent BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'CLOSED')),
    application_deadline DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MODULE 5: Application Management
-- =====================================================

-- 5.1 applications table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(30) CHECK (status IN (
        'APPLIED', 'SCREENING', 'LONG_LISTED', 'SHORTLISTED',
        'ORAL_INTERVIEW', 'PRACTICAL_INTERVIEW', 'FINAL_INTERVIEW',
        'OFFER_MADE', 'HIRED', 'REJECTED', 'WITHDRAWN'
    )) DEFAULT 'APPLIED',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(job_id, user_id)
);

-- 5.2 application_notes table (for recruiter comments)
CREATE TABLE application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MODULE 6: Audit Logging
-- =====================================================

-- 6.1 audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action_type VARCHAR(50) NOT NULL,
    module_name VARCHAR(100),
    table_name VARCHAR(100),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES & PERFORMANCE OPTIMISATION
-- =====================================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Job Seeker Profile indexes
CREATE INDEX idx_jsp_field ON job_seeker_profiles(field_of_expertise);
CREATE INDEX idx_jsp_qualification ON job_seeker_profiles(qualification_level);
CREATE INDEX idx_jsp_experience ON job_seeker_profiles(years_experience);

-- Job Seeker Addresses indexes
CREATE INDEX idx_jsa_user ON job_seeker_addresses(user_id);
CREATE INDEX idx_jsa_city ON job_seeker_addresses(city);
CREATE INDEX idx_jsa_country ON job_seeker_addresses(country);
CREATE INDEX idx_jsa_primary ON job_seeker_addresses(is_primary);

-- Job Seeker Education indexes
CREATE INDEX idx_jse_user ON job_seeker_education(user_id);
CREATE INDEX idx_jse_field ON job_seeker_education(field_of_study);
CREATE INDEX idx_jse_current ON job_seeker_education(is_current);

-- Job Seeker Experience indexes
CREATE INDEX idx_jsex_user ON job_seeker_experience(user_id);
CREATE INDEX idx_jsex_company ON job_seeker_experience(company_name);
CREATE INDEX idx_jsex_current ON job_seeker_experience(is_current);
CREATE INDEX idx_jsex_dates ON job_seeker_experience(start_date, end_date);

-- Job Seeker References indexes
CREATE INDEX idx_jsref_user ON job_seeker_references(user_id);

-- Jobs indexes
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_category ON jobs(category_id);
CREATE INDEX idx_jobs_subcategory ON jobs(subcategory_id);
CREATE INDEX idx_jobs_urgent ON jobs(is_urgent);
CREATE INDEX idx_jobs_deadline ON jobs(application_deadline);
CREATE INDEX idx_jobs_created_by ON jobs(created_by);
CREATE INDEX idx_jobs_created_at ON jobs(created_at);

-- Applications indexes
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_applied_at ON applications(applied_at);

-- Audit logs indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action_type);
CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_module ON audit_logs(module_name);
CREATE INDEX idx_audit_record ON audit_logs(record_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_ip ON audit_logs(ip_address);

-- Company indexes
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_country ON companies(country);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default roles
INSERT INTO roles (name, description) VALUES
    ('ADMIN', 'Full system access'),
    ('HR_MANAGER', 'Manage company recruitment and team'),
    ('RECRUITER', 'Post jobs and review applications'),
    ('APPROVER', 'Approve/reject job postings'),
    ('JOB_SEEKER', 'Apply to jobs and manage profile');

-- Insert permissions
INSERT INTO permissions (name, description, module_name, action_type) VALUES
    -- Job permissions
    ('CREATE_JOB', 'Create new job postings', 'Jobs', 'CREATE'),
    ('VIEW_JOB', 'View job details', 'Jobs', 'VIEW'),
    ('EDIT_JOB', 'Edit existing jobs', 'Jobs', 'UPDATE'),
    ('DELETE_JOB', 'Delete job postings', 'Jobs', 'DELETE'),
    ('APPROVE_JOB', 'Approve pending jobs', 'Jobs', 'APPROVE'),
    
    -- Application permissions
    ('VIEW_APPLICATIONS', 'View job applications', 'Applications', 'VIEW'),
    ('UPDATE_APPLICATION_STATUS', 'Change application status', 'Applications', 'UPDATE'),
    ('SHORTLIST_CANDIDATE', 'Move candidates to shortlist', 'Applications', 'UPDATE'),
    
    -- Candidate permissions
    ('VIEW_CV_DATABASE', 'Access CV search', 'Candidates', 'VIEW'),
    ('VIEW_SENSITIVE_DATA', 'View personal details and ID documents', 'Candidates', 'VIEW'),
    ('CONTACT_REFERENCES', 'Contact candidate references', 'Candidates', 'UPDATE'),
    
    -- Company permissions
    ('MANAGE_COMPANY', 'Edit company profile', 'Company', 'UPDATE'),
    ('MANAGE_COMPANY_USERS', 'Add/remove company HR users', 'Company', 'UPDATE'),
    
    -- User management
    ('MANAGE_USERS', 'Create and manage users', 'Users', 'MANAGE'),
    ('VIEW_AUDIT_LOGS', 'Access audit logs', 'System', 'VIEW');

-- Assign permissions to roles (Admin gets all)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ADMIN';

-- HR Manager permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'HR_MANAGER' 
AND p.name IN ('CREATE_JOB', 'VIEW_JOB', 'EDIT_JOB', 'APPROVE_JOB',
               'VIEW_APPLICATIONS', 'UPDATE_APPLICATION_STATUS', 
               'SHORTLIST_CANDIDATE', 'VIEW_CV_DATABASE',
               'MANAGE_COMPANY', 'MANAGE_COMPANY_USERS');

-- Recruiter permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'RECRUITER'
AND p.name IN ('CREATE_JOB', 'VIEW_JOB', 'EDIT_JOB',
               'VIEW_APPLICATIONS', 'UPDATE_APPLICATION_STATUS',
               'SHORTLIST_CANDIDATE', 'VIEW_CV_DATABASE');

-- Approver permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'APPROVER'
AND p.name IN ('VIEW_JOB', 'APPROVE_JOB', 'VIEW_APPLICATIONS');

-- Job Seeker permissions (minimal)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'JOB_SEEKER'
AND p.name IN ('VIEW_JOB');

-- Insert default job categories
INSERT INTO job_categories (name) VALUES
    ('Technology'),
    ('Healthcare'),
    ('Finance & Accounting'),
    ('Sales & Marketing'),
    ('Engineering'),
    ('Human Resources'),
    ('Legal'),
    ('Education'),
    ('Hospitality'),
    ('Retail');

-- Insert sample subcategories for Technology
WITH tech_cat AS (SELECT id FROM job_categories WHERE name = 'Technology')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat
FROM tech_cat, (VALUES 
    ('Software Engineering'),
    ('Data Science'),
    ('IT Support'),
    ('DevOps'),
    ('Cybersecurity'),
    ('Product Management'),
    ('UI/UX Design'),
    ('Cloud Architecture')
) AS s(subcat);

-- Healthcare subcategories
WITH health_cat AS (SELECT id FROM job_categories WHERE name = 'Healthcare')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat
FROM health_cat, (VALUES 
    ('Nursing'),
    ('Physicians'),
    ('Medical Administration'),
    ('Pharmacy'),
    ('Allied Health'),
    ('Dentistry')
) AS s(subcat);

-- Finance subcategories
WITH finance_cat AS (SELECT id FROM job_categories WHERE name = 'Finance & Accounting')
INSERT INTO job_subcategories (category_id, name)
SELECT id, subcat
FROM finance_cat, (VALUES 
    ('Accounting'),
    ('Financial Analysis'),
    ('Investment Banking'),
    ('Auditing'),
    ('Tax'),
    ('Risk Management')
) AS s(subcat);

-- =====================================================
-- ADDITIONAL USEFUL VIEWS
-- =====================================================

-- View for active jobs with company and category info
CREATE VIEW v_active_jobs AS
SELECT 
    j.id,
    j.title,
    j.description,
    j.salary_min,
    j.salary_max,
    j.is_urgent,
    j.created_at,
    c.name AS company_name,
    c.city AS company_city,
    c.country AS company_country,
    cat.name AS category_name,
    subcat.name AS subcategory_name,
    u.first_name || ' ' || u.last_name AS created_by_name
FROM jobs j
JOIN companies c ON j.company_id = c.id
LEFT JOIN job_categories cat ON j.category_id = cat.id
LEFT JOIN job_subcategories subcat ON j.subcategory_id = subcat.id
LEFT JOIN users u ON j.created_by = u.id
WHERE j.status = 'APPROVED'
AND (j.application_deadline IS NULL OR j.application_deadline >= CURRENT_DATE);

-- View for application statistics by job
CREATE VIEW v_job_application_stats AS
SELECT 
    j.id AS job_id,
    j.title AS job_title,
    c.name AS company_name,
    COUNT(a.id) AS total_applications,
    COUNT(CASE WHEN a.status = 'APPLIED' THEN 1 END) AS applied,
    COUNT(CASE WHEN a.status = 'SCREENING' THEN 1 END) AS screening,
    COUNT(CASE WHEN a.status = 'SHORTLISTED' THEN 1 END) AS shortlisted,
    COUNT(CASE WHEN a.status LIKE '%INTERVIEW%' THEN 1 END) AS interviewing,
    COUNT(CASE WHEN a.status = 'OFFER_MADE' THEN 1 END) AS offers_made,
    COUNT(CASE WHEN a.status = 'HIRED' THEN 1 END) AS hired,
    COUNT(CASE WHEN a.status = 'REJECTED' THEN 1 END) AS rejected
FROM jobs j
JOIN companies c ON j.company_id = c.id
LEFT JOIN applications a ON j.id = a.job_id
GROUP BY j.id, j.title, c.name;

-- View for candidate profile summaries (for recruiter search)
CREATE VIEW v_candidate_search AS
SELECT 
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    jsp.field_of_expertise,
    jsp.qualification_level,
    jsp.years_experience,
    jsp.professional_summary,
    jpd.gender,
    jpd.date_of_birth,
    jpd.nationality,
    jpd.disability_status,
    ja.city AS current_city,
    ja.country AS current_country,
    (SELECT COUNT(*) FROM job_seeker_education jse WHERE jse.user_id = u.id) AS education_count,
    (SELECT COUNT(*) FROM job_seeker_experience jsex WHERE jsex.user_id = u.id) AS experience_count
FROM users u
JOIN job_seeker_profiles jsp ON u.id = jsp.user_id
LEFT JOIN job_seeker_personal_details jpd ON u.id = jpd.user_id
LEFT JOIN job_seeker_addresses ja ON u.id = ja.user_id AND ja.is_primary = TRUE
WHERE u.is_active = TRUE;

-- =====================================================
-- COMMENTS (Documentation)
-- =====================================================

COMMENT ON TABLE users IS 'Central user registry for all system users';
COMMENT ON TABLE roles IS 'System roles that group permissions together';
COMMENT ON TABLE permissions IS 'Granular system permissions';
COMMENT ON TABLE companies IS 'Multi-tenant company profiles';
COMMENT ON TABLE jobs IS 'Core table for job postings/vacancies';
COMMENT ON TABLE applications IS 'Tracks job applications and candidate progression';
COMMENT ON TABLE audit_logs IS 'Comprehensive activity tracking for compliance';
COMMENT ON TABLE job_seeker_profiles IS 'Professional summary and searchable profile data';
COMMENT ON TABLE job_seeker_personal_details IS 'Sensitive PII with restricted access';

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    document_type VARCHAR(100),
    category VARCHAR(100),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_documents_company ON documents(company_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_created ON documents(created_at);

-- Create job_seeker_documents junction table (for multiple document types)
CREATE TABLE IF NOT EXISTS job_seeker_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- 'resume', 'cover_letter', 'certificate', 'id', etc.
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, document_id)
);

-- Create company_documents table
CREATE TABLE IF NOT EXISTS company_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- 'logo', 'registration', 'tax', etc.
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, document_id)
);

-- Resumes table for multiple resume uploads
CREATE TABLE IF NOT EXISTS resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resumes_job_seeker ON resumes(job_seeker_id);
CREATE INDEX idx_resumes_is_primary ON resumes(is_primary);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
    years_of_experience INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(job_seeker_id, name)
);

CREATE INDEX idx_skills_job_seeker ON skills(job_seeker_id);
CREATE INDEX idx_skills_name ON skills(name);

-- Certifications table
CREATE TABLE IF NOT EXISTS certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_seeker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    issuing_organization VARCHAR(200) NOT NULL,
    issue_date DATE NOT NULL,
    expiration_date DATE,
    credential_id VARCHAR(100),
    credential_url TEXT,
    does_not_expire BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_certifications_job_seeker ON certifications(job_seeker_id);
CREATE INDEX idx_certifications_name ON certifications(name);
CREATE INDEX idx_certifications_issue_date ON certifications(issue_date);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'application_received', 'application_status_changed',
        'job_posted', 'job_closed', 'interview_scheduled',
        'message_received', 'profile_viewed', 'system_alert'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    action_url TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    in_app_notifications BOOLEAN DEFAULT TRUE,
    application_updates BOOLEAN DEFAULT TRUE,
    job_alerts BOOLEAN DEFAULT TRUE,
    message_notifications BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin logs table for audit trail
CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('user', 'job', 'application', 'company')),
    target_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_target ON admin_logs(target_type, target_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Backups tracking table
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    size_bytes BIGINT,
    status VARCHAR(50) DEFAULT 'completed',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Job reports table (for users to report inappropriate jobs)
CREATE TABLE IF NOT EXISTS job_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'fraud', 'other')),
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'action_taken')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_job ON job_reports(job_id);
CREATE INDEX idx_reports_status ON job_reports(status);

-- Saved jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    saved_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, job_id)
);

CREATE INDEX idx_saved_jobs_user ON saved_jobs(user_id);

-- Job alerts table
CREATE TABLE IF NOT EXISTS job_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    keywords TEXT,
    category_id UUID REFERENCES job_categories(id),
    location VARCHAR(255),
    salary_min NUMERIC(12,2),
    frequency VARCHAR(20) DEFAULT 'daily' CHECK (frequency IN ('instant', 'daily', 'weekly')),
    is_active BOOLEAN DEFAULT TRUE,
    last_sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alerts_user ON job_alerts(user_id);
CREATE INDEX idx_alerts_active ON job_alerts(is_active);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_description TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_website VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_size VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS industry VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS founded_year INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS headquarters_location VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_summary TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS field_of_expertise VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS years_experience INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS resume_url TEXT;

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS applications_count INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS flag_reason TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS remote BOOLEAN DEFAULT FALSE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS responsibilities JSONB DEFAULT '[]';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_level VARCHAR(50);

CREATE TABLE IF NOT EXISTS employer_stats (
    employer_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_jobs_posted INTEGER DEFAULT 0,
    active_jobs INTEGER DEFAULT 0,
    total_applications_received INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    average_response_time INTEGER,
    last_active TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Drop the existing constraint first
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

-- Then add it again with your desired values
ALTER TABLE jobs 
ADD CONSTRAINT jobs_status_check 
CHECK (status IN ('draft', 'active', 'closed', 'expired', 'flagged'));

-- Or if you want to modify the allowed values
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs 
ADD CONSTRAINT jobs_status_check 
CHECK (status IN ('draft', 'active', 'closed', 'expired', 'flagged', 'archived'));

ALTER TABLE IF EXISTS applications DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE IF EXISTS companies DROP CONSTRAINT IF EXISTS companies_status_check;
ALTER TABLE IF EXISTS backups DROP CONSTRAINT IF EXISTS backups_status_check;
ALTER TABLE IF EXISTS job_reports DROP CONSTRAINT IF EXISTS job_reports_status_check;
ALTER TABLE IF EXISTS users DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'applied';
UPDATE applications SET status = LOWER(TRIM(status)) WHERE status IS NOT NULL;
UPDATE applications SET status = 'applied' WHERE status IS NULL OR status = '';

UPDATE companies SET status = LOWER(TRIM(status)) WHERE status IS NOT NULL;
UPDATE companies SET status = 'active' WHERE status IS NULL OR status = '';

UPDATE backups SET status = LOWER(TRIM(status)) WHERE status IS NOT NULL;
UPDATE backups SET status = 'completed' WHERE status IS NULL OR status = '';

UPDATE job_reports SET status = LOWER(TRIM(status)) WHERE status IS NOT NULL;
UPDATE job_reports SET status = 'pending' WHERE status IS NULL OR status = '';

DO $$
BEGIN
    -- Add status column to users if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        ALTER TABLE users ADD COLUMN status VARCHAR(50);
    END IF;
END $$;

UPDATE users 
SET status = CASE 
    WHEN is_active = true THEN 'active'
    ELSE 'inactive'
END 
WHERE status IS NULL;

ALTER TABLE users ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE applications 
ADD CONSTRAINT applications_status_check 
CHECK (status IN (
    'applied', 
    'screening', 
    'shortlisted', 
    'interviewing', 
    'offered', 
    'hired', 
    'rejected'
));

ALTER TABLE companies 
ADD CONSTRAINT companies_status_check 
CHECK (status IN (
    'active', 
    'inactive', 
    'suspended', 
    'pending'
));

ALTER TABLE backups 
ADD CONSTRAINT backups_status_check 
CHECK (status IN (
    'pending', 
    'processing', 
    'completed', 
    'failed'
));

ALTER TABLE job_reports 
ADD CONSTRAINT job_reports_status_check 
CHECK (status IN (
    'pending', 
    'reviewed', 
    'resolved', 
    'dismissed'
));

ALTER TABLE users 
ADD CONSTRAINT users_status_check 
CHECK (status IN (
    'active', 
    'inactive', 
    'suspended', 
    'pending_verification',
    'blocked'
));

SELECT 
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE contype = 'c'  -- 'c' for check constraints
AND conrelid::regclass IN (
    'applications', 
    'jobs', 
    'companies', 
    'backups', 
    'job_reports',
    'users'
)
ORDER BY table_name, constraint_name;

SELECT 'applications' AS table_name, status, COUNT(*) 
FROM applications GROUP BY status ORDER BY status;

SELECT 'jobs' AS table_name, status, COUNT(*) 
FROM jobs GROUP BY status ORDER BY status;

SELECT 'companies' AS table_name, status, COUNT(*) 
FROM companies GROUP BY status ORDER BY status;

SELECT 'backups' AS table_name, status, COUNT(*) 
FROM backups GROUP BY status ORDER BY status;

SELECT 'job_reports' AS table_name, status, COUNT(*) 
FROM job_reports GROUP BY status ORDER BY status;

SELECT 'users' AS table_name, status, COUNT(*) 
FROM users GROUP BY status ORDER BY status;
