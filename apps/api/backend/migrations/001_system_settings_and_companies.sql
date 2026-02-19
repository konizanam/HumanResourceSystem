-- =====================================================
-- Migration 001: System Settings, Company updates, New Permissions
-- Run this AFTER the initial Hito_database.sql setup
-- =====================================================

-- 1. System Settings table (for dynamic branding – no hardcoded names/logos)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_settings (key, value, description) VALUES
    ('system_name', 'HR System', 'Display name shown in sidebar, login and titles'),
    ('system_logo_url', '', 'URL to the system logo image (leave empty for text-only)'),
    ('primary_color', '#4f46e5', 'Primary brand colour (CSS hex)'),
    ('company_name', '', 'The company operating this system instance'),
    ('support_email', '', 'Support contact email shown in footer')
ON CONFLICT (key) DO NOTHING;

-- 2. Add is_active + updated_at to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. Add granular company management permissions
INSERT INTO permissions (name, description, module_name, action_type) VALUES
    ('CREATE_COMPANY', 'Create new companies', 'Company', 'CREATE'),
    ('VIEW_COMPANY', 'View company details', 'Company', 'VIEW'),
    ('EDIT_COMPANY', 'Edit company information', 'Company', 'UPDATE'),
    ('DEACTIVATE_COMPANY', 'Deactivate / reactivate companies', 'Company', 'DELETE')
ON CONFLICT (name) DO NOTHING;

-- 4. Assign new permissions to ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'ADMIN'
  AND p.name IN ('CREATE_COMPANY', 'VIEW_COMPANY', 'EDIT_COMPANY', 'DEACTIVATE_COMPANY')
ON CONFLICT DO NOTHING;

-- 5. Assign to HR_MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'HR_MANAGER'
  AND p.name IN ('CREATE_COMPANY', 'VIEW_COMPANY', 'EDIT_COMPANY', 'DEACTIVATE_COMPANY')
ON CONFLICT DO NOTHING;

-- 6. Recruiters can view companies
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'RECRUITER'
  AND p.name IN ('VIEW_COMPANY')
ON CONFLICT DO NOTHING;
