-- Insert admin users (2)
WITH admin_users AS (
    INSERT INTO users (
        id, first_name, last_name, email, password_hash, 
        phone, is_active, email_verified, last_login, created_at
    ) VALUES
        (
            gen_random_uuid(), 'System', 'Administrator', 
            'admin@hrs.com', 
            '$2b$10$SAi3XebpbdDEB2BTSV2oxOpIgUTjntQtiXYB4BnYomN4tXUV85C.m',
            '+1234567890', TRUE, TRUE, NOW(), NOW()
        ),
        (
            gen_random_uuid(), 'Jane', 'Doe', 
            'jane.doe@hrs.com', 
            '$2b$10$SAi3XebpbdDEB2BTSV2oxOpIgUTjntQtiXYB4BnYomN4tXUV85C.m',
            '+1234567891', TRUE, TRUE, NOW(), NOW()
        )
    RETURNING id
)
INSERT INTO user_roles (user_id, role_id)
SELECT admin_users.id, roles.id
FROM admin_users, roles
WHERE roles.name = 'ADMIN';

-- Insert HR Managers (2)
WITH hr_users AS (
    INSERT INTO users (
        id, first_name, last_name, email, password_hash,
        phone, company_name, industry, is_active, email_verified, created_at
    ) VALUES 
        (
            gen_random_uuid(), 'Sarah', 'Johnson', 
            'sarah.johnson@techcorp.com', 
            '$2b$10$SAi3XebpbdDEB2BTSV2oxOpIgUTjntQtiXYB4BnYomN4tXUV85C.m',
            '+1234567892', 'TechCorp Solutions', 'Technology', TRUE, TRUE, NOW()
        ),
        (
            gen_random_uuid(), 'Michael', 'Chen', 
            'michael.chen@healthcare.com', 
            '$2b$10$SAi3XebpbdDEB2BTSV2oxOpIgUTjntQtiXYB4BnYomN4tXUV85C.m',
            '+1234567893', 'Healthcare Plus', 'Healthcare', TRUE, TRUE, NOW()
        )
    RETURNING id
)
INSERT INTO user_roles (user_id, role_id)
SELECT hr_users.id, roles.id
FROM hr_users, roles
WHERE roles.name = 'HR_MANAGER';

-- Insert Recruiters (2)
WITH recruiter_users AS (
    INSERT INTO users (
        id, first_name, last_name, email, password_hash,
        phone, company_name, industry, is_active, email_verified, created_at
    ) VALUES 
        (
            gen_random_uuid(), 'David', 'Brown', 
            'david.brown@techcorp.com', 
            '$2b$10$SAi3XebpbdDEB2BTSV2oxOpIgUTjntQtiXYB4BnYomN4tXUV85C.m',
            '+1234567895', 'TechCorp Solutions', 'Technology', TRUE, TRUE, NOW()
        ),
        (
            gen_random_uuid(), 'Lisa', 'Garcia', 
            'lisa.garcia@healthcare.com', 
            '$2b$10$SAi3XebpbdDEB2BTSV2oxOpIgUTjntQtiXYB4BnYomN4tXUV85C.m',
            '+1234567896', 'Healthcare Plus', 'Healthcare', TRUE, TRUE, NOW()
        )
    RETURNING id
)
INSERT INTO user_roles (user_id, role_id)
SELECT recruiter_users.id, roles.id
FROM recruiter_users, roles
WHERE roles.name = 'RECRUITER';

-- Insert Approvers (2)
WITH approver_users AS (
    INSERT INTO users (
        id, first_name, last_name, email, password_hash,
        phone, company_name, is_active, email_verified, created_at
    ) VALUES 
        (
            gen_random_uuid(), 'Robert', 'Taylor', 
            'robert.taylor@techcorp.com', 
            '$2b$10$SAi3XebpbdDEB2BTSV2oxOpIgUTjntQtiXYB4BnYomN4tXUV85C.m',
            '+1234567899', 'TechCorp Solutions', TRUE, TRUE, NOW()
        ),
        (
            gen_random_uuid(), 'Jennifer', 'Lee', 
            'jennifer.lee@healthcare.com', 
            '$2b$10$SAi3XebpbdDEB2BTSV2oxOpIgUTjntQtiXYB4BnYomN4tXUV85C.m',
            '+1234567900', 'Healthcare Plus', TRUE, TRUE, NOW()
        )
    RETURNING id
)
INSERT INTO user_roles (user_id, role_id)
SELECT approver_users.id, roles.id
FROM approver_users, roles
WHERE roles.name = 'APPROVER';

-- Insert Job Seekers (2)
WITH job_seeker_users AS (
    INSERT INTO users (
        id, first_name, last_name, email, password_hash,
        phone, is_active, email_verified, professional_summary,
        field_of_expertise, years_experience, resume_url, created_at
    ) VALUES 
        (
            gen_random_uuid(), 'Alice', 'Johnson', 
            'alice.johnson@email.com', 
            '$2b$10$SAi3XebpbdDEB2BTSV2oxOpIgUTjntQtiXYB4BnYomN4tXUV85C.m',
            '+1234567901', TRUE, TRUE,
            'Full-stack developer with 5 years experience in React and Node.js',
            'Software Development', 5, 'https://storage.hrs.com/resumes/alice_johnson.pdf', NOW()
        ),
        (
            gen_random_uuid(), 'Bob', 'Smith', 
            'bob.smith@email.com', 
            '$2b$10$SAi3XebpbdDEB2BTSV2oxOpIgUTjntQtiXYB4BnYomN4tXUV85C.m',
            '+1234567902', TRUE, TRUE,
            'Data scientist specializing in machine learning and AI',
            'Data Science', 3, 'https://storage.hrs.com/resumes/bob_smith.pdf', NOW()
        )
    RETURNING id
)
INSERT INTO user_roles (user_id, role_id)
SELECT job_seeker_users.id, roles.id
FROM job_seeker_users, roles
WHERE roles.name = 'JOB_SEEKER';

-- =====================================================
-- 3. JOB SEEKER PROFILES DETAILS
-- =====================================================

-- Insert job seeker profiles
INSERT INTO job_seeker_profiles (user_id, professional_summary, field_of_expertise, qualification_level, years_experience)
SELECT 
    u.id,
    u.professional_summary,
    u.field_of_expertise,
    CASE 
        WHEN u.field_of_expertise IN ('Medicine', 'Legal') THEN 'Masters Degree'
        WHEN u.years_experience > 5 THEN 'Bachelors Degree'
        ELSE 'Bachelors Degree'
    END,
    u.years_experience
FROM users u
WHERE u.id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'JOB_SEEKER');

-- Insert personal details for job seekers
INSERT INTO job_seeker_personal_details (user_id, first_name, last_name, gender, date_of_birth, nationality, marital_status, disability_status)
SELECT 
    u.id,
    u.first_name,
    u.last_name,
    CASE 
        WHEN u.first_name = 'Alice' THEN 'Female'
        ELSE 'Male'
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN '1995-03-15'::DATE
        ELSE '1992-07-22'::DATE
    END,
    'United States',
    CASE 
        WHEN u.first_name = 'Alice' THEN 'Single'
        ELSE 'Married'
    END,
    FALSE
FROM users u
WHERE u.id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'JOB_SEEKER');

-- Insert addresses for job seekers
INSERT INTO job_seeker_addresses (user_id, address_line1, city, state, country, postal_code, is_primary)
SELECT 
    u.id,
    CASE 
        WHEN u.first_name = 'Alice' THEN '123 Tech Avenue Apt 4B'
        ELSE '456 Data Street Suite 12'
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN 'San Francisco'
        ELSE 'Seattle'
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN 'CA'
        ELSE 'WA'
    END,
    'USA',
    CASE 
        WHEN u.first_name = 'Alice' THEN '94105'
        ELSE '98101'
    END,
    TRUE
FROM users u
WHERE u.id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'JOB_SEEKER');

-- Insert education for job seekers
INSERT INTO job_seeker_education (user_id, institution_name, qualification, field_of_study, start_date, end_date, is_current, grade)
SELECT 
    u.id,
    CASE 
        WHEN u.first_name = 'Alice' THEN 'Stanford University'
        ELSE 'University of Washington'
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN 'Bachelors Degree'
        ELSE 'Masters Degree'
    END,
    u.field_of_expertise,
    CASE 
        WHEN u.first_name = 'Alice' THEN '2013-09-01'
        ELSE '2010-09-01'::DATE
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN '2017-06-15'
        ELSE '2014-06-15'::DATE
    END,
    FALSE,
    CASE 
        WHEN u.first_name = 'Alice' THEN '3.8 GPA'
        ELSE '3.9 GPA'
    END
FROM users u
WHERE u.id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'JOB_SEEKER');

-- Insert work experience
INSERT INTO job_seeker_experience (user_id, company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities)
SELECT 
    u.id,
    CASE 
        WHEN u.first_name = 'Alice' THEN 'Google'
        ELSE 'Amazon'
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN 'Frontend Developer'
        ELSE 'Data Analyst'
    END,
    'Full-time',
    CASE 
        WHEN u.first_name = 'Alice' THEN '2018-01-15'
        ELSE '2019-03-01'::DATE
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN '2021-12-30' :: DATE
        ELSE NULL
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN FALSE
        ELSE TRUE
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN 'Developed React components, collaborated with UX team, implemented responsive designs'
        ELSE 'Analyzed large datasets, created reports, worked with cross-functional teams'
    END
FROM users u
WHERE u.id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'JOB_SEEKER');

-- Insert skills
INSERT INTO skills (job_seeker_id, name, proficiency_level, years_of_experience, is_primary)
SELECT 
    u.id,
    skill_name,
    proficiency,
    years,
    is_primary
FROM users u
CROSS JOIN (
    VALUES 
        ('JavaScript', 'Advanced', 5, true),
        ('React', 'Advanced', 4, true),
        ('Node.js', 'Intermediate', 3, false),
        ('Python', 'Expert', 4, true),
        ('SQL', 'Advanced', 3, false),
        ('Machine Learning', 'Intermediate', 2, true)
) AS skills(skill_name, proficiency, years, is_primary)
WHERE u.id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'JOB_SEEKER')
AND (
    (u.first_name = 'Alice' AND skill_name IN ('JavaScript', 'React', 'Node.js')) OR
    (u.first_name = 'Bob' AND skill_name IN ('Python', 'SQL', 'Machine Learning'))
);

-- Insert certifications
INSERT INTO certifications (job_seeker_id, name, issuing_organization, issue_date, expiration_date, does_not_expire, credential_id)
SELECT 
    u.id,
    CASE 
        WHEN u.first_name = 'Alice' THEN 'AWS Certified Developer'
        ELSE 'Google Data Analytics Certificate'
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN 'Amazon Web Services'
        ELSE 'Google'
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN '2022-03-15'
        ELSE '2023-01-20':: DATE
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN '2025-03-15' :: DATE
        ELSE NULL
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN FALSE
        ELSE TRUE
    END,
    CASE 
        WHEN u.first_name = 'Alice' THEN 'AWS-123456'
        ELSE 'GDA-789012'
    END
FROM users u
WHERE u.id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'JOB_SEEKER');

-- Insert resumes
INSERT INTO resumes (job_seeker_id, file_name, file_path, file_size, mime_type, is_primary, uploaded_at)
SELECT 
    u.id,
    u.first_name || '_' || u.last_name || '_Resume.pdf',
    '/resumes/' || u.id || '/resume.pdf',
    CASE 
        WHEN u.first_name = 'Alice' THEN 245760
        ELSE 312560
    END,
    'application/pdf',
    TRUE,
    NOW() - INTERVAL '5 days'
FROM users u
WHERE u.id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'JOB_SEEKER');

-- =====================================================
-- 4. COMPANIES (4 companies)
-- =====================================================

-- Insert companies
WITH inserted_companies AS (
    INSERT INTO companies (
        id, name, industry, description, website, 
        contact_email, contact_phone, address_line1, city, country, 
        status, created_at
    ) VALUES 
        (
            gen_random_uuid(), 'TechCorp Solutions', 'Technology',
            'Leading technology solutions provider specializing in cloud computing and AI',
            'https://www.techcorp.com',
            'contact@techcorp.com', '+1-800-TECH', '500 Tech Boulevard', 'San Francisco', 'USA',
            'active', NOW()
        ),
        (
            gen_random_uuid(), 'Healthcare Plus', 'Healthcare',
            'Comprehensive healthcare services and medical facilities',
            'https://www.healthcareplus.com',
            'hr@healthcareplus.com', '+1-800-HEALTH', '100 Health Park', 'Boston', 'USA',
            'active', NOW()
        ),
        (
            gen_random_uuid(), 'Finance Group', 'Finance',
            'Investment banking and financial services',
            'https://www.financegroup.com',
            'careers@financegroup.com', '+1-800-FINANCE', '50 Wall Street', 'New York', 'USA',
            'active', NOW()
        ),
        (
            gen_random_uuid(), 'Green Energy Solutions', 'Energy',
            'Renewable energy and sustainability solutions',
            'https://www.greenenergy.com',
            'hr@greenenergy.com', '+1-877-GREEN', '300 Solar Way', 'Denver', 'USA',
            'active', NOW()
        )
    RETURNING id, name
)
-- Link company users
INSERT INTO company_users (company_id, user_id)
SELECT 
    c.id,
    u.id
FROM inserted_companies c
JOIN users u ON u.company_name = c.name
WHERE u.company_name IS NOT NULL;

-- =====================================================
-- 5. JOBS (8 jobs - 2 per company)
-- =====================================================

-- First, get the category and subcategory IDs
DO $$
DECLARE
    tech_cat_id UUID;
    health_cat_id UUID;
    finance_cat_id UUID;
    engineering_cat_id UUID;
    software_subcat_id UUID;
    cloud_subcat_id UUID;
    nursing_subcat_id UUID;
    allied_subcat_id UUID;
    financial_analysis_subcat_id UUID;
    investment_subcat_id UUID;
    engineering_subcat_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO tech_cat_id FROM job_categories WHERE name = 'Technology';
    SELECT id INTO health_cat_id FROM job_categories WHERE name = 'Healthcare';
    SELECT id INTO finance_cat_id FROM job_categories WHERE name = 'Finance & Accounting';
    SELECT id INTO engineering_cat_id FROM job_categories WHERE name = 'Engineering';
    
    -- Get subcategory IDs
    SELECT id INTO software_subcat_id FROM job_subcategories WHERE name = 'Software Engineering' AND category_id = tech_cat_id;
    SELECT id INTO cloud_subcat_id FROM job_subcategories WHERE name = 'Cloud Architecture' AND category_id = tech_cat_id;
    SELECT id INTO nursing_subcat_id FROM job_subcategories WHERE name = 'Nursing' AND category_id = health_cat_id;
    SELECT id INTO allied_subcat_id FROM job_subcategories WHERE name = 'Allied Health' AND category_id = health_cat_id;
    SELECT id INTO financial_analysis_subcat_id FROM job_subcategories WHERE name = 'Financial Analysis' AND category_id = finance_cat_id;
    SELECT id INTO investment_subcat_id FROM job_subcategories WHERE name = 'Investment Banking' AND category_id = finance_cat_id;
    SELECT id INTO engineering_subcat_id FROM job_subcategories WHERE name = 'Engineering' AND category_id = engineering_cat_id;
    
    -- Insert jobs for TechCorp Solutions
    INSERT INTO jobs (
        company_id, title, description, category_id, subcategory_id,
        salary_min, salary_max, is_urgent, status, application_deadline,
        created_by, employer_id, location, remote, employment_type,
        experience_level, requirements, responsibilities, benefits,
        created_at, views, applications_count, is_featured
    )
    SELECT 
        c.id,
        job_data.job_title,
        'We are looking for an experienced professional to join our team. The ideal candidate will have a strong background in software development and cloud technologies.',
        job_data.cat_id,
        job_data.subcat_id,
        job_data.salary_min,
        job_data.salary_max,
        job_data.is_urgent,
        job_data.job_status,  -- Changed from 'status' to 'job_status' to avoid ambiguity
        NOW() + job_data.deadline,
        u.id,
        u.id,
        job_data.location,
        job_data.remote,
        job_data.employment_type,
        job_data.experience_level,
        job_data.requirements,
        job_data.responsibilities,
        job_data.benefits,
        NOW() - (random() * INTERVAL '15 days'),
        floor(random() * 200 + 50)::int,
        0,
        random() < 0.3
    FROM companies c
    CROSS JOIN LATERAL (
        SELECT id FROM users 
        WHERE company_name = c.name 
        AND id IN (
            SELECT user_id FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE r.name IN ('HR_MANAGER', 'RECRUITER')
        )
        LIMIT 1
    ) u
    CROSS JOIN (
        VALUES 
            ('Senior Software Engineer', tech_cat_id, software_subcat_id, 85000, 120000, false, 'APPROVED', INTERVAL '30 days', 'San Francisco, CA', false, 'Full-time', 'Senior Level',
             jsonb_build_array('Bachelor''s degree in Computer Science', '5+ years of experience', 'Strong communication skills'),
             jsonb_build_array('Lead technical projects', 'Mentor junior team members', 'Architect solutions'),
             jsonb_build_array('Competitive salary', 'Health insurance', '401k matching')),
            ('Cloud Architect', tech_cat_id, cloud_subcat_id, 120000, 160000, true, 'APPROVED', INTERVAL '45 days', 'Remote', true, 'Full-time', 'Mid Level',
             jsonb_build_array('Master''s degree preferred', 'Relevant certifications', 'Team leadership experience'),
             jsonb_build_array('Collaborate with stakeholders', 'Write technical documentation', 'Code reviews'),
             jsonb_build_array('Remote work options', 'Professional development', 'Flexible hours'))
    ) AS job_data(job_title, cat_id, subcat_id, salary_min, salary_max, is_urgent, job_status, deadline, location, remote, employment_type, experience_level, requirements, responsibilities, benefits)
    WHERE c.name = 'TechCorp Solutions';

    -- Insert jobs for Healthcare Plus
    INSERT INTO jobs (
        company_id, title, description, category_id, subcategory_id,
        salary_min, salary_max, is_urgent, status, application_deadline,
        created_by, employer_id, location, remote, employment_type,
        experience_level, requirements, responsibilities, benefits,
        created_at, views, applications_count, is_featured
    )
    SELECT 
        c.id,
        job_data.job_title,
        'We are looking for an experienced professional to join our team. The ideal candidate will have a strong background in patient care and medical procedures.',
        job_data.cat_id,
        job_data.subcat_id,
        job_data.salary_min,
        job_data.salary_max,
        job_data.is_urgent,
        job_data.job_status,
        NOW() + job_data.deadline,
        u.id,
        u.id,
        job_data.location,
        job_data.remote,
        job_data.employment_type,
        job_data.experience_level,
        job_data.requirements,
        job_data.responsibilities,
        job_data.benefits,
        NOW() - (random() * INTERVAL '15 days'),
        floor(random() * 200 + 50)::int,
        0,
        random() < 0.3
    FROM companies c
    CROSS JOIN LATERAL (
        SELECT id FROM users 
        WHERE company_name = c.name 
        AND id IN (
            SELECT user_id FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE r.name IN ('HR_MANAGER', 'RECRUITER')
        )
        LIMIT 1
    ) u
    CROSS JOIN (
        VALUES 
            ('Registered Nurse', health_cat_id, nursing_subcat_id, 75000, 95000, true, 'APPROVED', INTERVAL '30 days', 'Boston, MA', false, 'Full-time', 'Mid Level',
             jsonb_build_array('Valid nursing license', '2+ years experience', 'BLS certification'),
             jsonb_build_array('Patient care', 'Medication administration', 'Care coordination'),
             jsonb_build_array('Health insurance', 'Shift differential', 'Tuition reimbursement')),
            ('Medical Assistant', health_cat_id, allied_subcat_id, 45000, 60000, false, 'APPROVED', INTERVAL '45 days', 'Chicago, IL', false, 'Full-time', 'Entry Level',
             jsonb_build_array('Medical assistant certification', 'EMR experience', 'Patient care skills'),
             jsonb_build_array('Vital signs', 'Patient intake', 'Clinical support'),
             jsonb_build_array('Flexible schedule', 'Paid time off', 'Health benefits'))
    ) AS job_data(job_title, cat_id, subcat_id, salary_min, salary_max, is_urgent, job_status, deadline, location, remote, employment_type, experience_level, requirements, responsibilities, benefits)
    WHERE c.name = 'Healthcare Plus';

    -- Insert jobs for Finance Group
    INSERT INTO jobs (
        company_id, title, description, category_id, subcategory_id,
        salary_min, salary_max, is_urgent, status, application_deadline,
        created_by, employer_id, location, remote, employment_type,
        experience_level, requirements, responsibilities, benefits,
        created_at, views, applications_count, is_featured
    )
    SELECT 
        c.id,
        job_data.job_title,
        'We are looking for an experienced professional to join our team. The ideal candidate will have a strong background in financial analysis and investment strategies.',
        job_data.cat_id,
        job_data.subcat_id,
        job_data.salary_min,
        job_data.salary_max,
        job_data.is_urgent,
        job_data.job_status,
        NOW() + job_data.deadline,
        u.id,
        u.id,
        job_data.location,
        job_data.remote,
        job_data.employment_type,
        job_data.experience_level,
        job_data.requirements,
        job_data.responsibilities,
        job_data.benefits,
        NOW() - (random() * INTERVAL '15 days'),
        floor(random() * 200 + 50)::int,
        0,
        random() < 0.3
    FROM companies c
    CROSS JOIN LATERAL (
        SELECT id FROM users 
        WHERE company_name = c.name 
        AND id IN (
            SELECT user_id FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE r.name IN ('HR_MANAGER', 'RECRUITER')
        )
        LIMIT 1
    ) u
    CROSS JOIN (
        VALUES 
            ('Financial Analyst', finance_cat_id, financial_analysis_subcat_id, 70000, 90000, true, 'APPROVED', INTERVAL '30 days', 'New York, NY', false, 'Full-time', 'Mid Level',
             jsonb_build_array('Finance degree', 'Excel expertise', 'Financial modeling'),
             jsonb_build_array('Financial analysis', 'Report generation', 'Budget planning'),
             jsonb_build_array('Bonus eligible', '401k match', 'Professional development')),
            ('Investment Banker', finance_cat_id, investment_subcat_id, 120000, 180000, true, 'APPROVED', INTERVAL '45 days', 'Remote', true, 'Full-time', 'Senior Level',
             jsonb_build_array('MBA preferred', 'Deal experience', 'Client management'),
             jsonb_build_array('Deal execution', 'Client relationships', 'Market analysis'),
             jsonb_build_array('High bonus potential', 'Executive benefits', 'Travel opportunities'))
    ) AS job_data(job_title, cat_id, subcat_id, salary_min, salary_max, is_urgent, job_status, deadline, location, remote, employment_type, experience_level, requirements, responsibilities, benefits)
    WHERE c.name = 'Finance Group';

    -- Insert jobs for Green Energy Solutions
    INSERT INTO jobs (
        company_id, title, description, category_id, subcategory_id,
        salary_min, salary_max, is_urgent, status, application_deadline,
        created_by, employer_id, location, remote, employment_type,
        experience_level, requirements, responsibilities, benefits,
        created_at, views, applications_count, is_featured
    )
    SELECT 
        c.id,
        job_data.job_title,
        'We are looking for an experienced professional to join our team. The ideal candidate will have a strong background in renewable energy and sustainability.',
        job_data.cat_id,
        job_data.subcat_id,
        job_data.salary_min,
        job_data.salary_max,
        job_data.is_urgent,
        job_data.job_status,
        NOW() + job_data.deadline,
        u.id,
        u.id,
        job_data.location,
        job_data.remote,
        job_data.employment_type,
        job_data.experience_level,
        job_data.requirements,
        job_data.responsibilities,
        job_data.benefits,
        NOW() - (random() * INTERVAL '15 days'),
        floor(random() * 200 + 50)::int,
        0,
        random() < 0.3
    FROM companies c
    CROSS JOIN LATERAL (
        SELECT id FROM users 
        WHERE company_name = c.name 
        AND id IN (
            SELECT user_id FROM user_roles ur 
            JOIN roles r ON ur.role_id = r.id 
            WHERE r.name IN ('HR_MANAGER', 'RECRUITER')
        )
        LIMIT 1
    ) u
    CROSS JOIN (
        VALUES 
            ('Solar Energy Specialist', engineering_cat_id, engineering_subcat_id, 65000, 85000, false, 'APPROVED', INTERVAL '30 days', 'Denver, CO', false, 'Full-time', 'Entry Level',
             jsonb_build_array('Technical background', 'Customer service skills', 'Sales experience'),
             jsonb_build_array('Site assessment', 'System design', 'Customer consultations'),
             jsonb_build_array('Commission structure', 'Vehicle allowance', 'Training provided')),
            ('Sustainability Consultant', engineering_cat_id, engineering_subcat_id, 80000, 110000, true, 'APPROVED', INTERVAL '45 days', 'Austin, TX', true, 'Full-time', 'Mid Level',
             jsonb_build_array('Environmental degree', 'Consulting experience', 'Sustainability certifications'),
             jsonb_build_array('Client advisory', 'Sustainability audits', 'Strategy development'),
             jsonb_build_array('Flexible work', 'Great benefits', 'Impactful work'))
    ) AS job_data(job_title, cat_id, subcat_id, salary_min, salary_max, is_urgent, job_status, deadline, location, remote, employment_type, experience_level, requirements, responsibilities, benefits)
    WHERE c.name = 'Green Energy Solutions';
    
END $$;
-- =====================================================
-- 6. APPLICATIONS (4 applications)
-- =====================================================

-- Insert applications (job seekers applying to jobs)
WITH job_seekers AS (
    SELECT id FROM users 
    WHERE id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'JOB_SEEKER')
),
available_jobs AS (
    SELECT id FROM jobs WHERE status = 'APPROVED' LIMIT 4
)
INSERT INTO applications (job_id, user_id, status, applied_at)
SELECT 
    jobs.job_id,
    seekers.user_id,
    app_data.status_val,
    app_data.applied_date
FROM (
    SELECT 
        ROW_NUMBER() OVER () as rn,
        id as job_id
    FROM available_jobs
) jobs
CROSS JOIN (
    SELECT 
        ROW_NUMBER() OVER () as rn,
        id as user_id
    FROM job_seekers
) seekers
CROSS JOIN (
    SELECT 
        unnest(ARRAY['APPLIED', 'SCREENING', 'SHORTLISTED', 'ORAL_INTERVIEW']) as status_val,
        unnest(ARRAY[
            NOW() - INTERVAL '10 days',
            NOW() - INTERVAL '8 days',
            NOW() - INTERVAL '5 days',
            NOW() - INTERVAL '2 days'
        ]) as applied_date,
        unnest(ARRAY[1,2,1,2]) as job_rn,
        unnest(ARRAY[1,1,2,2]) as user_rn
) app_data
WHERE jobs.rn = app_data.job_rn AND seekers.rn = app_data.user_rn
ON CONFLICT (job_id, user_id) DO NOTHING;

-- =====================================================
-- 7. NOTIFICATIONS
-- =====================================================

-- Insert notifications for users
INSERT INTO notifications (
    user_id, type, title, message, data, is_read, priority, created_at
)
SELECT 
    u.id,
    notification_type,
    title,
    message,
    jsonb_build_object('reference_id', gen_random_uuid()),
    random() < 0.3,
    priority,
    NOW() - (random() * INTERVAL '7 days')
FROM users u
CROSS JOIN (
    VALUES 
        ('application_status_changed', 'Application Status Updated', 'Your application for Senior Software Engineer has been reviewed', 'normal'),
        ('job_posted', 'New Job Alert', 'New jobs matching your profile have been posted', 'high'),
        ('interview_scheduled', 'Interview Scheduled', 'Your interview has been scheduled for next week', 'high'),
        ('message_received', 'New Message', 'You have received a new message from the HR team', 'normal'),
        ('system_alert', 'Profile Completion', 'Please complete your profile to improve visibility', 'low')
) AS notif_data(notification_type, title, message, priority)
WHERE u.id IN (SELECT id FROM users LIMIT 5)
LIMIT 15;

-- =====================================================
-- 8. DOCUMENTS
-- =====================================================

-- Insert sample documents
INSERT INTO documents (
    user_id, company_id, file_name, original_name, file_size, 
    mime_type, file_path, file_url, document_type, category, 
    is_public, uploaded_by, created_at
)
SELECT 
    u.id,
    NULL,
    'resume_' || u.id || '.pdf',
    u.first_name || '_' || u.last_name || '_Resume.pdf',
    250000,
    'application/pdf',
    '/documents/' || u.id || '/resume.pdf',
    'https://storage.hrs.com/documents/' || u.id || '/resume.pdf',
    'resume',
    'personal',
    TRUE,
    u.id,
    NOW() - INTERVAL '10 days'
FROM users u
WHERE u.id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'JOB_SEEKER');

-- Link documents to job seekers
INSERT INTO job_seeker_documents (user_id, document_id, document_type, is_primary)
SELECT 
    u.id,
    d.id,
    'resume',
    TRUE
FROM users u
JOIN documents d ON d.user_id = u.id
WHERE u.id IN (SELECT user_id FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE r.name = 'JOB_SEEKER');

-- =====================================================
-- 9. NOTIFICATION PREFERENCES
-- =====================================================

-- Set notification preferences for all users
INSERT INTO notification_preferences (
    user_id, email_notifications, push_notifications, in_app_notifications,
    application_updates, job_alerts, message_notifications, marketing_emails,
    created_at, updated_at
)
SELECT 
    id,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    CASE WHEN role_name = 'JOB_SEEKER' THEN TRUE ELSE FALSE END,
    TRUE,
    FALSE,
    NOW(),
    NOW()
FROM users u
CROSS JOIN LATERAL (
    SELECT r.name as role_name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = u.id
    LIMIT 1
) roles
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 10. EMPLOYER STATS
-- =====================================================

TRUNCATE TABLE employer_stats;

-- Initialize employer stats
INSERT INTO employer_stats (user_id, total_jobs_posted, active_jobs, total_applications_received, last_active, updated_at)
SELECT 
    u.id,
    COUNT(DISTINCT j.id) as total_jobs_posted,
    COUNT(DISTINCT CASE WHEN j.status = 'APPROVED' THEN j.id END) as active_jobs,
    COUNT(DISTINCT a.id) as total_applications_received,
    NOW(),
    NOW()
FROM users u
LEFT JOIN jobs j ON u.id = j.created_by
LEFT JOIN applications a ON j.id = a.job_id
WHERE u.id IN (
    SELECT user_id FROM user_roles ur 
    JOIN roles r ON ur.role_id = r.id 
    WHERE r.name IN ('HR_MANAGER', 'RECRUITER', 'ADMIN')
)
GROUP BY u.id;
-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show summary of seeded data
SELECT '✅ Seed data inserted successfully!' AS message;

SELECT 
    'Users' as table_name, 
    COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 
    'Job Seeker Profiles', 
    COUNT(*) 
FROM job_seeker_profiles
UNION ALL
SELECT 
    'Companies', 
    COUNT(*) 
FROM companies
UNION ALL
SELECT 
    'Jobs', 
    COUNT(*) 
FROM jobs
UNION ALL
SELECT 
    'Applications', 
    COUNT(*) 
FROM applications
UNION ALL
SELECT 
    'Notifications', 
    COUNT(*) 
FROM notifications
ORDER BY table_name;

-- Show users by role
SELECT 
    r.name as role,
    COUNT(*) as user_count
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
GROUP BY r.name
ORDER BY r.name;