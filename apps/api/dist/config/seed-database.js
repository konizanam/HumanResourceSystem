"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// seed-database.ts
const pg_1 = require("pg");
const uuid_1 = require("uuid");
const bcrypt = __importStar(require("bcrypt"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config();
// =============================================
// DATABASE CONNECTION
// =============================================
const pool = new pg_1.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'hrs_database',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});
// =============================================
// CONSTANTS & CONFIGURATION
// =============================================
const PASSWORD = '1234';
const SALT_ROUNDS = 10;
// Status constants for consistency
const ApplicationStatus = {
    APPLIED: 'applied',
    SCREENING: 'screening',
    SHORTLISTED: 'shortlisted',
    INTERVIEWING: 'interviewing',
    OFFERED: 'offered',
    HIRED: 'hired',
    REJECTED: 'rejected',
};
const JobStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    CLOSED: 'closed',
    EXPIRED: 'expired',
    FLAGGED: 'flagged',
};
const CompanyStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING: 'pending',
};
const BackupStatus = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
};
const ReportStatus = {
    PENDING: 'pending',
    REVIEWED: 'reviewed',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed',
};
const UserStatus = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    SUSPENDED: 'suspended',
    PENDING_VERIFICATION: 'pending_verification',
    BLOCKED: 'blocked',
};
// =============================================
// REALISTIC DATA
// =============================================
// Realistic names and emails
const jobSeekers = [
    {
        firstName: 'James',
        lastName: 'Anderson',
        email: 'james.anderson@email.com',
        role: 'job_seeker',
        profile: {
            summary: 'Full-stack developer with 8 years of experience in React, Node.js, and Python. Passionate about building scalable web applications.',
            expertise: 'Information Technology',
            qualification: 'Master Degree',
            yearsExperience: 8,
        },
        personalDetails: {
            gender: 'Male',
            dateOfBirth: '1992-03-15',
            nationality: 'USA',
            maritalStatus: 'Married',
        },
        education: [
            {
                institution: 'Stanford University',
                qualification: 'Master of Science',
                fieldOfStudy: 'Computer Science',
                startDate: '2014-09-01',
                endDate: '2016-06-30',
                isCurrent: false,
                grade: '3.8 GPA',
            },
            {
                institution: 'UC Berkeley',
                qualification: 'Bachelor of Science',
                fieldOfStudy: 'Computer Engineering',
                startDate: '2010-09-01',
                endDate: '2014-05-30',
                isCurrent: false,
                grade: '3.6 GPA',
            },
        ],
        experience: [
            {
                company: 'Google',
                jobTitle: 'Senior Software Engineer',
                employmentType: 'Full-time',
                startDate: '2020-01-15',
                endDate: null,
                isCurrent: true,
                responsibilities: 'Lead a team of 5 developers building cloud infrastructure solutions. Architect and implement microservices using Go and Kubernetes.',
                salary: 185000,
            },
            {
                company: 'Microsoft',
                jobTitle: 'Software Engineer',
                employmentType: 'Full-time',
                startDate: '2016-07-01',
                endDate: '2019-12-31',
                isCurrent: false,
                responsibilities: 'Developed features for Azure DevOps. Worked with C# and .NET Core to build CI/CD pipelines.',
                salary: 120000,
            },
        ],
        skills: [
            { name: 'JavaScript', level: 'Expert', years: 8, primary: true },
            { name: 'TypeScript', level: 'Expert', years: 5, primary: true },
            { name: 'React', level: 'Expert', years: 6, primary: true },
            { name: 'Node.js', level: 'Advanced', years: 7, primary: false },
            { name: 'Python', level: 'Advanced', years: 5, primary: false },
            { name: 'AWS', level: 'Intermediate', years: 3, primary: false },
        ],
        certifications: [
            {
                name: 'AWS Certified Solutions Architect',
                organization: 'Amazon Web Services',
                issueDate: '2023-01-15',
                expirationDate: '2026-01-15',
                doesNotExpire: false,
                credentialId: 'AWS-12345',
            },
            {
                name: 'Certified Kubernetes Administrator',
                organization: 'CNCF',
                issueDate: '2022-06-10',
                expirationDate: '2025-06-10',
                doesNotExpire: false,
                credentialId: 'CKA-67890',
            },
        ],
        address: {
            line1: '742 Evergreen Terrace',
            city: 'Seattle',
            state: 'WA',
            country: 'USA',
            postalCode: '98101',
        },
        resume: {
            fileName: 'james_anderson_resume.pdf',
            fileSize: 2457600,
            mimeType: 'application/pdf',
        },
    },
    {
        firstName: 'Emily',
        lastName: 'Chen',
        email: 'emily.chen@email.com',
        role: 'job_seeker',
        profile: {
            summary: 'Healthcare professional specializing in pediatric nursing with 10 years of experience in hospital settings. Certified in advanced life support.',
            expertise: 'Healthcare',
            qualification: 'Bachelor of Science in Nursing',
            yearsExperience: 10,
        },
        personalDetails: {
            gender: 'Female',
            dateOfBirth: '1988-11-22',
            nationality: 'Canada',
            maritalStatus: 'Single',
        },
        education: [
            {
                institution: 'University of Toronto',
                qualification: 'Bachelor of Science in Nursing',
                fieldOfStudy: 'Nursing',
                startDate: '2008-09-01',
                endDate: '2012-05-30',
                isCurrent: false,
                grade: 'Honors',
            },
        ],
        experience: [
            {
                company: 'Toronto General Hospital',
                jobTitle: 'Registered Nurse',
                employmentType: 'Full-time',
                startDate: '2012-08-15',
                endDate: '2019-06-30',
                isCurrent: false,
                responsibilities: 'Provided care in pediatric ICU. Managed patient assessments and coordinated with multidisciplinary teams.',
                salary: 75000,
            },
            {
                company: 'SickKids Hospital',
                jobTitle: 'Senior Pediatric Nurse',
                employmentType: 'Full-time',
                startDate: '2019-07-15',
                endDate: null,
                isCurrent: true,
                responsibilities: 'Lead nurse for pediatric oncology ward. Supervise 12 nurses and train new staff.',
                salary: 95000,
            },
        ],
        skills: [
            { name: 'Pediatric Care', level: 'Expert', years: 10, primary: true },
            { name: 'Emergency Response', level: 'Expert', years: 8, primary: true },
            { name: 'Patient Assessment', level: 'Expert', years: 10, primary: true },
            { name: 'Electronic Health Records', level: 'Advanced', years: 8, primary: false },
        ],
        certifications: [
            {
                name: 'Certified Pediatric Nurse',
                organization: 'Pediatric Nursing Certification Board',
                issueDate: '2015-04-20',
                expirationDate: '2024-04-20',
                doesNotExpire: false,
                credentialId: 'CPN-54321',
            },
            {
                name: 'Advanced Cardiac Life Support',
                organization: 'American Heart Association',
                issueDate: '2023-02-10',
                expirationDate: '2025-02-10',
                doesNotExpire: false,
                credentialId: 'ACLS-98765',
            },
        ],
        address: {
            line1: '45 Queen Street West',
            city: 'Toronto',
            state: 'Ontario',
            country: 'Canada',
            postalCode: 'M5V 2B3',
        },
        resume: {
            fileName: 'emily_chen_resume.pdf',
            fileSize: 1894400,
            mimeType: 'application/pdf',
        },
    },
    {
        firstName: 'Michael',
        lastName: 'Rodriguez',
        email: 'michael.rodriguez@email.com',
        role: 'job_seeker',
        profile: {
            summary: 'Finance professional with 12 years of experience in investment banking and corporate finance. CFA charterholder with MBA.',
            expertise: 'Finance',
            qualification: 'MBA',
            yearsExperience: 12,
        },
        personalDetails: {
            gender: 'Male',
            dateOfBirth: '1985-07-08',
            nationality: 'USA',
            maritalStatus: 'Married',
        },
        education: [
            {
                institution: 'Harvard Business School',
                qualification: 'MBA',
                fieldOfStudy: 'Finance',
                startDate: '2010-09-01',
                endDate: '2012-05-30',
                isCurrent: false,
                grade: 'Baker Scholar',
            },
            {
                institution: 'NYU Stern',
                qualification: 'Bachelor of Science',
                fieldOfStudy: 'Finance',
                startDate: '2003-09-01',
                endDate: '2007-05-30',
                isCurrent: false,
                grade: 'Magna Cum Laude',
            },
        ],
        experience: [
            {
                company: 'Goldman Sachs',
                jobTitle: 'Vice President - Investment Banking',
                employmentType: 'Full-time',
                startDate: '2018-01-15',
                endDate: null,
                isCurrent: true,
                responsibilities: 'Lead M&A transactions worth over $2B. Manage team of 8 analysts and associates.',
                salary: 350000,
            },
            {
                company: 'Morgan Stanley',
                jobTitle: 'Associate',
                employmentType: 'Full-time',
                startDate: '2012-07-01',
                endDate: '2017-12-31',
                isCurrent: false,
                responsibilities: 'Executed financial modeling for tech sector M&A deals. Prepared pitch books and client presentations.',
                salary: 180000,
            },
        ],
        skills: [
            { name: 'Financial Modeling', level: 'Expert', years: 12, primary: true },
            { name: 'M&A', level: 'Expert', years: 10, primary: true },
            { name: 'Valuation', level: 'Expert', years: 12, primary: true },
            { name: 'Excel', level: 'Expert', years: 12, primary: false },
            { name: 'Bloomberg Terminal', level: 'Advanced', years: 8, primary: false },
        ],
        certifications: [
            {
                name: 'Chartered Financial Analyst',
                organization: 'CFA Institute',
                issueDate: '2014-09-01',
                expirationDate: null,
                doesNotExpire: true,
                credentialId: 'CFA-123456',
            },
            {
                name: 'Financial Risk Manager',
                organization: 'GARP',
                issueDate: '2015-06-15',
                expirationDate: null,
                doesNotExpire: true,
                credentialId: 'FRM-789012',
            },
        ],
        address: {
            line1: '100 Wall Street',
            city: 'New York',
            state: 'NY',
            country: 'USA',
            postalCode: '10005',
        },
        resume: {
            fileName: 'michael_rodriguez_resume.pdf',
            fileSize: 3123200,
            mimeType: 'application/pdf',
        },
    },
];
const employers = [
    {
        firstName: 'Jennifer',
        lastName: 'Wong',
        email: 'jennifer.wong@techcorp.com',
        role: 'employer',
        company: {
            name: 'TechCorp Solutions',
            industry: 'Information Technology',
            description: 'Leading provider of cloud-based enterprise solutions with over 1000 employees worldwide. Specializing in AI and machine learning applications.',
            website: 'https://www.techcorp.com',
            contactEmail: 'hr@techcorp.com',
            contactPhone: '+1 (415) 555-0123',
            addressLine1: '101 California Street',
            city: 'San Francisco',
            country: 'USA',
            status: CompanyStatus.ACTIVE,
        },
    },
    {
        firstName: 'David',
        lastName: 'Kim',
        email: 'david.kim@healthplus.com',
        role: 'employer',
        company: {
            name: 'HealthPlus Medical Group',
            industry: 'Healthcare',
            description: 'Premier healthcare network with 15 hospitals and 50 clinics across the Northeast. Committed to patient-centered care and medical innovation.',
            website: 'https://www.healthplus.com',
            contactEmail: 'careers@healthplus.com',
            contactPhone: '+1 (617) 555-0456',
            addressLine1: '201 Brookline Avenue',
            city: 'Boston',
            country: 'USA',
            status: CompanyStatus.ACTIVE,
        },
    },
    {
        firstName: 'Lisa',
        lastName: 'Thompson',
        email: 'lisa.thompson@globalfinance.com',
        role: 'employer',
        company: {
            name: 'Global Finance Partners',
            industry: 'Finance',
            description: 'Boutique investment bank specializing in tech and healthcare sectors. Advising on M&A and growth capital raising.',
            website: 'https://www.globalfinance.com',
            contactEmail: 'recruiting@globalfinance.com',
            contactPhone: '+1 (212) 555-0789',
            addressLine1: '50 Rockefeller Plaza',
            city: 'New York',
            country: 'USA',
            status: CompanyStatus.ACTIVE,
        },
    },
];
const admins = [
    {
        firstName: 'Alex',
        lastName: 'Morgan',
        email: 'alex.morgan@system.com',
        role: 'admin',
    },
    {
        firstName: 'Sophia',
        lastName: 'Patel',
        email: 'sophia.patel@system.com',
        role: 'admin',
    },
];
// Realistic job postings
const jobs = [
    {
        title: 'Senior Full Stack Engineer',
        description: `We are looking for a Senior Full Stack Engineer to join our core product team. You will be responsible for designing and implementing new features, improving performance, and mentoring junior developers.`,
        category: 'Information Technology',
        subcategory: 'Software Development',
        salaryMin: 140000,
        salaryMax: 180000,
        location: 'San Francisco, CA (Hybrid)',
        employmentType: 'Full-time',
        experienceLevel: 'Senior',
        isUrgent: true,
        isFeatured: true,
        status: JobStatus.ACTIVE,
        requirements: [
            '5+ years experience with JavaScript/TypeScript',
            'Strong React and Node.js expertise',
            'Experience with cloud platforms',
            'Bachelor\'s in CS or equivalent',
        ],
        responsibilities: [
            'Architect and develop web applications',
            'Lead technical discussions',
            'Mentor junior developers',
            'Optimize performance',
        ],
        benefits: [
            'Competitive salary',
            'Health insurance',
            '401(k) matching',
            'Remote work options',
        ],
    },
    {
        title: 'Pediatric Nurse Practitioner',
        description: `HealthPlus Medical Group is seeking an experienced Pediatric Nurse Practitioner to join our growing team. You will provide comprehensive care to pediatric patients and work collaboratively with our multidisciplinary team.`,
        category: 'Healthcare',
        subcategory: 'Nursing',
        salaryMin: 110000,
        salaryMax: 135000,
        location: 'Boston, MA',
        employmentType: 'Full-time',
        experienceLevel: 'Mid Level',
        isUrgent: true,
        isFeatured: true,
        status: JobStatus.ACTIVE,
        requirements: [
            'Master\'s in Nursing',
            'NP certification',
            '3+ years pediatric experience',
            'BLS and PALS certified',
        ],
        responsibilities: [
            'Provide pediatric primary care',
            'Diagnose and treat illnesses',
            'Prescribe medications',
            'Educate families',
        ],
        benefits: [
            'Competitive salary',
            'Sign-on bonus',
            'Health benefits',
            'Education allowance',
        ],
    },
    {
        title: 'Investment Banking Associate - Tech',
        description: `Global Finance Partners is looking for an Investment Banking Associate to join our growing Technology team. You will work on exciting M&A and financing transactions in the tech sector.`,
        category: 'Finance',
        subcategory: 'Investment Banking',
        salaryMin: 175000,
        salaryMax: 225000,
        location: 'New York, NY',
        employmentType: 'Full-time',
        experienceLevel: 'Mid Level',
        isUrgent: false,
        isFeatured: true,
        status: JobStatus.ACTIVE,
        requirements: [
            '3-5 years IB experience',
            'Financial modeling expertise',
            'MBA or CFA preferred',
            'Series 79 and 63',
        ],
        responsibilities: [
            'Execute M&A transactions',
            'Build financial models',
            'Lead due diligence',
            'Mentor analysts',
        ],
        benefits: [
            'Top-tier compensation',
            'Performance bonus',
            'Health benefits',
            'Career progression',
        ],
    },
    {
        title: 'DevOps Engineer',
        description: `TechCorp Solutions is seeking a DevOps Engineer to help us build and maintain our cloud infrastructure. You will work with cutting-edge technologies and help automate our deployment processes.`,
        category: 'Information Technology',
        subcategory: 'Software Development',
        salaryMin: 130000,
        salaryMax: 160000,
        location: 'Remote (US)',
        employmentType: 'Full-time',
        experienceLevel: 'Mid Level',
        isUrgent: true,
        isFeatured: false,
        status: JobStatus.ACTIVE,
        requirements: [
            '3+ years DevOps experience',
            'AWS expertise',
            'Docker/Kubernetes',
            'Terraform knowledge',
            'Scripting skills',
        ],
        responsibilities: [
            'Design CI/CD pipelines',
            'Manage cloud infrastructure',
            'Monitor performance',
            'Implement security',
        ],
        benefits: [
            'Competitive salary',
            'Remote-first',
            'Home office stipend',
            'Learning budget',
        ],
    },
];
// =============================================
// HELPER FUNCTIONS
// =============================================
async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}
function generateUUID() {
    return (0, uuid_1.v4)();
}
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
// =============================================
// CLEAR EXISTING DATA (Optional - be careful!)
// =============================================
async function clearExistingData(client) {
    console.log('🧹 Clearing existing data...');
    // Disable triggers temporarily to avoid foreign key issues
    await client.query('SET session_replication_role = replica;');
    // List of tables in correct deletion order (children first, then parents)
    const tables = [
        'application_notes',
        'applications',
        'saved_jobs',
        'job_alerts',
        'notifications',
        'notification_preferences',
        'user_sessions',
        'audit_logs',
        'admin_logs',
        'job_reports',
        'backups',
        'role_permissions',
        'user_roles',
        'permissions',
        'skills',
        'certifications',
        'job_seeker_experience',
        'job_seeker_education',
        'job_seeker_addresses',
        'job_seeker_personal_details',
        'job_seeker_profiles',
        'resumes',
        'employer_stats',
        'company_users',
        'jobs',
        'companies',
        'users',
        'job_subcategories',
        'job_categories',
        'roles',
    ];
    for (const table of tables) {
        try {
            await client.query(`DELETE FROM ${table};`);
            console.log(`  ✓ Cleared ${table}`);
        }
        catch (err) {
            console.log(`  ✗ Could not clear ${table} (might not exist)`);
        }
    }
    // Re-enable triggers
    await client.query('SET session_replication_role = origin;');
    console.log('✅ Existing data cleared');
}
// =============================================
// MAIN SEED FUNCTION
// =============================================
async function seedDatabase() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('🌱 Starting database seed...');
        console.log('📦 Connected to database:', process.env.DB_NAME || 'hrs_database');
        // Ask if user wants to clear existing data
        const shouldClear = process.argv.includes('--clear');
        if (shouldClear) {
            await clearExistingData(client);
        }
        // Hash the password once for all users
        const hashedPassword = await hashPassword(PASSWORD);
        // Store generated UUIDs for relationships
        const userIds = {};
        const companyIds = {};
        const jobIds = [];
        const categoryIds = {};
        const subcategoryIds = {};
        const roleIds = {};
        // =============================================
        // 1. INSERT ROLES (remove ON CONFLICT)
        // =============================================
        console.log('📝 Inserting roles...');
        const roles = [
            { name: 'job_seeker', description: 'Job seeker role' },
            { name: 'employer', description: 'Employer role' },
            { name: 'admin', description: 'Administrator role' },
        ];
        for (const role of roles) {
            const id = generateUUID();
            roleIds[role.name] = id;
            // Remove ON CONFLICT
            await client.query('INSERT INTO roles (id, name, description) VALUES ($1, $2, $3)', [id, role.name, role.description]);
        }
        // =============================================
        // 2. INSERT JOB CATEGORIES AND SUBCATEGORIES
        // =============================================
        console.log('📝 Inserting job categories...');
        const categories = [
            { name: 'Information Technology', subcategories: ['Software Development', 'DevOps', 'Data Science', 'Cybersecurity'] },
            { name: 'Healthcare', subcategories: ['Nursing', 'Medicine', 'Allied Health', 'Administration'] },
            { name: 'Finance', subcategories: ['Investment Banking', 'Accounting', 'Financial Analysis', 'Risk Management'] },
            { name: 'Education', subcategories: ['Teaching', 'Administration', 'Curriculum Development', 'EdTech'] },
        ];
        for (const cat of categories) {
            const catId = generateUUID();
            categoryIds[cat.name] = catId;
            // Remove ON CONFLICT
            await client.query('INSERT INTO job_categories (id, name) VALUES ($1, $2)', [catId, cat.name]);
            for (const subcat of cat.subcategories) {
                const subcatId = generateUUID();
                subcategoryIds[subcat] = subcatId;
                // Remove ON CONFLICT
                await client.query('INSERT INTO job_subcategories (id, category_id, name) VALUES ($1, $2, $3)', [subcatId, catId, subcat]);
            }
        }
        // =============================================
        // 3. INSERT USERS
        // =============================================
        console.log('📝 Inserting users...');
        // Insert job seekers
        for (const seeker of jobSeekers) {
            const userId = generateUUID();
            userIds[seeker.email] = userId;
            await client.query(`INSERT INTO users (
          id, first_name, last_name, email, password_hash, 
          is_active, email_verified, created_at, updated_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                userId, seeker.firstName, seeker.lastName, seeker.email,
                hashedPassword, true, true, new Date(), new Date(), UserStatus.ACTIVE
            ]);
            // Assign role
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleIds.job_seeker]);
        }
        // Insert employers
        for (const employer of employers) {
            const userId = generateUUID();
            userIds[employer.email] = userId;
            await client.query(`INSERT INTO users (
          id, first_name, last_name, email, password_hash, 
          is_active, email_verified, created_at, updated_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                userId, employer.firstName, employer.lastName, employer.email,
                hashedPassword, true, true, new Date(), new Date(), UserStatus.ACTIVE
            ]);
            // Assign role
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleIds.employer]);
        }
        // Insert admins
        for (const admin of admins) {
            const userId = generateUUID();
            userIds[admin.email] = userId;
            await client.query(`INSERT INTO users (
          id, first_name, last_name, email, password_hash, 
          is_active, email_verified, created_at, updated_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                userId, admin.firstName, admin.lastName, admin.email,
                hashedPassword, true, true, new Date(), new Date(), UserStatus.ACTIVE
            ]);
            // Assign role
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [userId, roleIds.admin]);
        }
        // =============================================
        // 4. INSERT COMPANIES
        // =============================================
        console.log('📝 Inserting companies...');
        for (let i = 0; i < employers.length; i++) {
            const employer = employers[i];
            const employerUserId = userIds[employer.email];
            const companyId = generateUUID();
            companyIds[employer.company.name] = companyId;
            await client.query(`INSERT INTO companies (
          id, name, industry, description, website, contact_email,
          contact_phone, address_line1, city, country, status,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
                companyId,
                employer.company.name,
                employer.company.industry,
                employer.company.description,
                employer.company.website,
                employer.company.contactEmail,
                employer.company.contactPhone,
                employer.company.addressLine1,
                employer.company.city,
                employer.company.country,
                employer.company.status,
                employerUserId,
                new Date()
            ]);
            // Link company to user
            await client.query('INSERT INTO company_users (company_id, user_id) VALUES ($1, $2)', [companyId, employerUserId]);
            // Insert employer stats
            await client.query(`INSERT INTO employer_stats (
          employer_id, total_jobs_posted, active_jobs, 
          total_applications_received, total_views, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`, [employerUserId, 0, 0, 0, 0, new Date()]);
        }
        // =============================================
        // 5. INSERT JOBS
        // =============================================
        console.log('📝 Inserting jobs...');
        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            const jobId = generateUUID();
            jobIds.push(jobId);
            // Assign to appropriate company
            let companyId;
            let createdBy;
            if (job.category === 'Information Technology') {
                companyId = companyIds['TechCorp Solutions'];
                createdBy = userIds['jennifer.wong@techcorp.com'];
            }
            else if (job.category === 'Healthcare') {
                companyId = companyIds['HealthPlus Medical Group'];
                createdBy = userIds['david.kim@healthplus.com'];
            }
            else if (job.category === 'Finance') {
                companyId = companyIds['Global Finance Partners'];
                createdBy = userIds['lisa.thompson@globalfinance.com'];
            }
            const createdAt = randomDate(new Date(2024, 0, 1), new Date());
            const views = randomInt(50, 500);
            const applicationsCount = randomInt(5, 50);
            await client.query(`INSERT INTO jobs (
          id, company_id, title, description, category_id, subcategory_id,
          salary_min, salary_max, status, location, employment_type,
          experience_level, created_by, created_at, views, applications_count,
          is_featured, is_urgent, requirements, responsibilities, benefits
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`, [
                jobId,
                companyId,
                job.title,
                job.description,
                categoryIds[job.category],
                subcategoryIds[job.subcategory || job.category],
                job.salaryMin,
                job.salaryMax,
                job.status,
                job.location,
                job.employmentType,
                job.experienceLevel,
                createdBy,
                createdAt,
                views,
                applicationsCount,
                job.isFeatured || false,
                job.isUrgent || false,
                JSON.stringify(job.requirements || []),
                JSON.stringify(job.responsibilities || []),
                JSON.stringify(job.benefits || [])
            ]);
        }
        // =============================================
        // 6. INSERT JOB SEEKER PROFILES AND RELATED DATA
        // =============================================
        console.log('📝 Inserting job seeker profiles and related data...');
        for (const seeker of jobSeekers) {
            const userId = userIds[seeker.email];
            // Job seeker profile
            await client.query(`INSERT INTO job_seeker_profiles (
          user_id, professional_summary, field_of_expertise, 
          qualification_level, years_experience, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`, [
                userId,
                seeker.profile.summary,
                seeker.profile.expertise,
                seeker.profile.qualification,
                seeker.profile.yearsExperience,
                new Date()
            ]);
            // Personal details
            const personalId = generateUUID();
            await client.query(`INSERT INTO job_seeker_personal_details (
          id, user_id, first_name, last_name, gender, 
          date_of_birth, nationality, marital_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
                personalId,
                userId,
                seeker.firstName,
                seeker.lastName,
                seeker.personalDetails.gender,
                seeker.personalDetails.dateOfBirth,
                seeker.personalDetails.nationality,
                seeker.personalDetails.maritalStatus,
                new Date()
            ]);
            // Education
            for (const edu of seeker.education) {
                const eduId = generateUUID();
                await client.query(`INSERT INTO job_seeker_education (
            id, user_id, institution_name, qualification, field_of_study,
            start_date, end_date, is_current, grade, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                    eduId,
                    userId,
                    edu.institution,
                    edu.qualification,
                    edu.fieldOfStudy,
                    edu.startDate,
                    edu.endDate,
                    edu.isCurrent,
                    edu.grade,
                    new Date()
                ]);
            }
            // Experience
            for (const exp of seeker.experience) {
                const expId = generateUUID();
                await client.query(`INSERT INTO job_seeker_experience (
            id, user_id, company_name, job_title, employment_type,
            start_date, end_date, is_current, responsibilities, salary, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
                    expId,
                    userId,
                    exp.company,
                    exp.jobTitle,
                    exp.employmentType,
                    exp.startDate,
                    exp.endDate,
                    exp.isCurrent,
                    exp.responsibilities,
                    exp.salary,
                    new Date()
                ]);
            }
            // Skills
            for (const skill of seeker.skills) {
                const skillId = generateUUID();
                await client.query(`INSERT INTO skills (
            id, job_seeker_id, name, proficiency_level, 
            years_of_experience, is_primary, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                    skillId,
                    userId,
                    skill.name,
                    skill.level,
                    skill.years,
                    skill.primary,
                    new Date(),
                    new Date()
                ]);
            }
            // Certifications
            for (const cert of seeker.certifications) {
                const certId = generateUUID();
                await client.query(`INSERT INTO certifications (
            id, job_seeker_id, name, issuing_organization,
            issue_date, expiration_date, does_not_expire, credential_id,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                    certId,
                    userId,
                    cert.name,
                    cert.organization,
                    cert.issueDate,
                    cert.expirationDate,
                    cert.doesNotExpire,
                    cert.credentialId,
                    new Date(),
                    new Date()
                ]);
            }
            // Address
            const addressId = generateUUID();
            await client.query(`INSERT INTO job_seeker_addresses (
          id, user_id, address_line1, city, state,
          country, postal_code, is_primary, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
                addressId,
                userId,
                seeker.address.line1,
                seeker.address.city,
                seeker.address.state,
                seeker.address.country,
                seeker.address.postalCode,
                true,
                new Date()
            ]);
            // Resume
            const resumeId = generateUUID();
            await client.query(`INSERT INTO resumes (
          id, job_seeker_id, file_name, file_path,
          file_size, mime_type, is_primary, uploaded_at,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                resumeId,
                userId,
                seeker.resume.fileName,
                `/uploads/resumes/${userId}/${seeker.resume.fileName}`,
                seeker.resume.fileSize,
                seeker.resume.mimeType,
                true,
                new Date(),
                new Date(),
                new Date()
            ]);
            // Job alerts
            const alertId = generateUUID();
            await client.query(`INSERT INTO job_alerts (
          id, user_id, name, keywords, category_id,
          location, frequency, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                alertId,
                userId,
                `${seeker.profile.expertise} Jobs`,
                seeker.skills.slice(0, 3).map(s => s.name.toLowerCase()).join(','),
                categoryIds[seeker.profile.expertise],
                seeker.address.city,
                'daily',
                true,
                new Date(),
                new Date()
            ]);
            // Notification preferences
            await client.query(`INSERT INTO notification_preferences (
          user_id, email_notifications, push_notifications,
          application_updates, job_alerts, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                userId,
                true,
                true,
                true,
                true,
                new Date(),
                new Date()
            ]);
        }
        // =============================================
        // 7. INSERT APPLICATIONS
        console.log('📝 Inserting applications...');
        const applicationStatuses = [
            ApplicationStatus.APPLIED,
            ApplicationStatus.SCREENING,
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.INTERVIEWING,
            ApplicationStatus.OFFERED,
            ApplicationStatus.HIRED,
            ApplicationStatus.REJECTED,
        ];
        // Create applications ensuring each user applies to each job at most once
        const jobSeekerIds = jobSeekers.map(s => userIds[s.email]);
        let applicationsCreated = 0;
        // For each job seeker, apply to 2-4 random jobs
        for (const userId of jobSeekerIds) {
            // Shuffle jobs array
            const shuffledJobs = [...jobIds].sort(() => 0.5 - Math.random());
            // Pick 2-4 jobs for this user
            const numApplications = Math.min(randomInt(2, 4), jobIds.length // Don't exceed total jobs
            );
            for (let i = 0; i < numApplications; i++) {
                const jobId = shuffledJobs[i];
                if (!jobId)
                    continue;
                const applicationId = generateUUID();
                const status = applicationStatuses[Math.floor(Math.random() * applicationStatuses.length)];
                const appliedAt = randomDate(new Date(2024, 0, 1), new Date());
                try {
                    await client.query(`INSERT INTO applications (
          id, job_id, user_id, status, applied_at
        ) VALUES ($1, $2, $3, $4, $5)`, [applicationId, jobId, userId, status, appliedAt]);
                    applicationsCreated++;
                    // Add notes for some applications
                    if (Math.random() > 0.6) {
                        const noteId = generateUUID();
                        // Find employer who owns this job
                        const jobResult = await client.query('SELECT created_by FROM jobs WHERE id = $1', [jobId]);
                        if (jobResult.rows.length > 0) {
                            const employerId = jobResult.rows[0].created_by;
                            await client.query(`INSERT INTO application_notes (
              id, application_id, user_id, note, created_at
            ) VALUES ($1, $2, $3, $4, $5)`, [
                                noteId,
                                applicationId,
                                employerId,
                                `Application reviewed. ${Math.random() > 0.5 ? 'Moving to next round.' : 'Status updated.'}`,
                                new Date(appliedAt.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000)
                            ]);
                        }
                    }
                }
                catch (err) {
                    if (err.code === '23505') {
                        // Skip duplicates silently
                        continue;
                    }
                    throw err;
                }
            }
        }
        console.log(`  ✓ Created ${applicationsCreated} applications`);
        // =============================================
        // 8. INSERT SAVED JOBS
        // =============================================
        console.log('📝 Inserting saved jobs...');
        for (const userId of jobSeekerIds) {
            // Save 2-4 random jobs per job seeker
            const numSaved = randomInt(2, 4);
            const shuffledJobs = [...jobIds].sort(() => 0.5 - Math.random());
            for (let i = 0; i < numSaved; i++) {
                if (shuffledJobs[i]) {
                    await client.query(`INSERT INTO saved_jobs (user_id, job_id, saved_at) 
             VALUES ($1, $2, $3)`, [userId, shuffledJobs[i], randomDate(new Date(2024, 0, 1), new Date())]);
                }
            }
        }
        // =============================================
        // 9. INSERT NOTIFICATIONS (with savepoint)
        // =============================================
        console.log('📝 Inserting notifications...');
        // Create a savepoint so we can rollback just the notifications if needed
        await client.query('SAVEPOINT notifications_savepoint');
        // Get all user IDs for notifications
        const notificationUserIdsList = Object.values(userIds);
        let notificationCount = 0;
        let notificationErrors = 0;
        // Define notification types - let's use only the most common ones that are likely to exist
        const validNotificationTypes = [
            'application_update',
            'job_alert',
            'message',
            'system'
        ];
        // Priority levels
        const validPriorities = ['low', 'normal', 'high'];
        try {
            for (const userId of notificationUserIdsList) {
                // Create just 1-2 notifications per user to minimize errors
                const notificationsPerUser = randomInt(1, 2);
                for (let i = 0; i < notificationsPerUser; i++) {
                    const notificationId = generateUUID();
                    const notificationType = validNotificationTypes[Math.floor(Math.random() * validNotificationTypes.length)];
                    const notificationPriority = validPriorities[Math.floor(Math.random() * validPriorities.length)];
                    const isRead = Math.random() > 0.5;
                    const createdAt = randomDate(new Date(2024, 0, 1), new Date());
                    let title, message;
                    // Generate content based on type
                    switch (notificationType) {
                        case 'application_update':
                            title = 'Application Update';
                            message = 'Your application status has been updated';
                            break;
                        case 'job_alert':
                            title = 'New Job Alert';
                            message = 'New jobs match your profile';
                            break;
                        case 'message':
                            title = 'New Message';
                            message = 'You have a new message';
                            break;
                        case 'system':
                        default:
                            title = 'System Notification';
                            message = 'System update notification';
                            break;
                    }
                    // Data for JSONB column
                    const notificationData = JSON.stringify({
                        source: 'system',
                        timestamp: createdAt.toISOString()
                    });
                    try {
                        await client.query(`INSERT INTO notifications (
            id, user_id, type, title, message, data,
            is_read, priority, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
                            notificationId,
                            userId,
                            notificationType,
                            title,
                            message,
                            notificationData,
                            isRead,
                            notificationPriority,
                            createdAt,
                            new Date()
                        ]);
                        notificationCount++;
                    }
                    catch (err) {
                        notificationErrors++;
                        // Don't throw, just log and continue
                        if (notificationErrors <= 3) { // Only show first few errors
                            console.log(`  ⚠ Notification error: ${err.message.substring(0, 60)}`);
                        }
                    }
                }
            }
            // If we had any successful notifications, release the savepoint
            if (notificationCount > 0) {
                await client.query('RELEASE SAVEPOINT notifications_savepoint');
                console.log(`  ✓ Created ${notificationCount} notifications (${notificationErrors} errors)`);
            }
            else {
                // If no notifications were created, rollback to savepoint
                await client.query('ROLLBACK TO SAVEPOINT notifications_savepoint');
                console.log(`  ⚠ No notifications created (rolled back)`);
            }
        }
        catch (err) {
            // If there's a major error, rollback to savepoint
            await client.query('ROLLBACK TO SAVEPOINT notifications_savepoint');
            console.log(`  ⚠ Notifications section failed, rolled back: ${err.message.substring(0, 60)}`);
        }
        // Continue with the rest of the seed - transaction is still valid
        console.log('📝 Continuing with permissions...');
        // =============================================
        // 10. INSERT PERMISSIONS
        // =============================================
        console.log('📝 Inserting permissions...');
        const permissions = [
            { name: 'view_jobs', description: 'Can view jobs', module: 'jobs', action: 'view' },
            { name: 'create_jobs', description: 'Can create jobs', module: 'jobs', action: 'create' },
            { name: 'edit_jobs', description: 'Can edit jobs', module: 'jobs', action: 'edit' },
            { name: 'delete_jobs', description: 'Can delete jobs', module: 'jobs', action: 'delete' },
            { name: 'apply_jobs', description: 'Can apply to jobs', module: 'applications', action: 'create' },
            { name: 'view_applications', description: 'Can view applications', module: 'applications', action: 'view' },
            { name: 'manage_applications', description: 'Can manage applications', module: 'applications', action: 'manage' },
            { name: 'view_users', description: 'Can view users', module: 'users', action: 'view' },
            { name: 'manage_users', description: 'Can manage users', module: 'users', action: 'manage' },
        ];
        const permissionIds = {};
        for (const perm of permissions) {
            const permId = generateUUID();
            permissionIds[perm.name] = permId;
            await client.query(`INSERT INTO permissions (id, name, description, module_name, action_type) 
         VALUES ($1, $2, $3, $4, $5)`, [permId, perm.name, perm.description, perm.module, perm.action]);
        }
        // =============================================
        // 11. ASSIGN ROLE PERMISSIONS
        // =============================================
        console.log('📝 Assigning role permissions...');
        // Job seeker permissions
        await client.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES 
       ($1, $2), ($1, $3)`, [roleIds.job_seeker, permissionIds.view_jobs, permissionIds.apply_jobs]);
        // Employer permissions
        await client.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES 
       ($1, $2), ($1, $3), ($1, $4), ($1, $5), ($1, $6)`, [
            roleIds.employer,
            permissionIds.view_jobs,
            permissionIds.create_jobs,
            permissionIds.edit_jobs,
            permissionIds.view_applications,
            permissionIds.manage_applications
        ]);
        // Admin permissions (all permissions)
        for (const permId of Object.values(permissionIds)) {
            await client.query('INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)', [roleIds.admin, permId]);
        }
        // =============================================
        // 12. INSERT AUDIT LOGS AND USER SESSIONS
        // =============================================
        console.log('📝 Inserting audit logs and user sessions...');
        // User sessions
        const allUserIds = Object.values(userIds);
        for (const userId of allUserIds) {
            if (Math.random() > 0.3) { // 70% of users have active sessions
                const sessionId = generateUUID();
                await client.query(`INSERT INTO user_sessions (
            id, user_id, token, ip_address, user_agent,
            expires_at, created_at, last_activity
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
                    sessionId,
                    userId,
                    `sess_${generateUUID().replace(/-/g, '')}`,
                    `192.168.${randomInt(1, 254)}.${randomInt(1, 254)}`,
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
                    randomDate(new Date(2024, 0, 1), new Date()),
                    new Date()
                ]);
            }
        }
        // Audit logs
        for (let i = 0; i < 30; i++) {
            const auditId = generateUUID();
            const userId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
            const actionTypes = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT'];
            const modules = ['jobs', 'applications', 'users', 'companies', 'settings'];
            await client.query(`INSERT INTO audit_logs (
          id, user_id, action_type, module_name, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                auditId,
                userId,
                actionTypes[Math.floor(Math.random() * actionTypes.length)],
                modules[Math.floor(Math.random() * modules.length)],
                `192.168.${randomInt(1, 254)}.${randomInt(1, 254)}`,
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                randomDate(new Date(2024, 0, 1), new Date())
            ]);
        }
        // =============================================
        // 13. UPDATE EMPLOYER STATS
        // =============================================
        console.log('📝 Updating employer stats...');
        for (const employer of employers) {
            const employerUserId = userIds[employer.email];
            // Get actual counts
            const jobsResult = await client.query('SELECT COUNT(*) as count FROM jobs WHERE created_by = $1', [employerUserId]);
            const totalJobs = parseInt(jobsResult.rows[0]?.count || '0');
            const activeJobsResult = await client.query("SELECT COUNT(*) as count FROM jobs WHERE created_by = $1 AND status = 'active'", [employerUserId]);
            const activeJobs = parseInt(activeJobsResult.rows[0]?.count || '0');
            const applicationsResult = await client.query(`SELECT COUNT(*) as count FROM applications a 
         JOIN jobs j ON a.job_id = j.id 
         WHERE j.created_by = $1`, [employerUserId]);
            const totalApplications = parseInt(applicationsResult.rows[0]?.count || '0');
            const viewsResult = await client.query('SELECT SUM(views) as total FROM jobs WHERE created_by = $1', [employerUserId]);
            const totalViews = parseInt(viewsResult.rows[0]?.total || '0');
            await client.query(`UPDATE employer_stats SET 
         total_jobs_posted = $1,
         active_jobs = $2,
         total_applications_received = $3,
         total_views = $4,
         updated_at = $5
         WHERE employer_id = $6`, [totalJobs, activeJobs, totalApplications, totalViews, new Date(), employerUserId]);
        }
        // =============================================
        // 14. INSERT BACKUPS
        // =============================================
        console.log('📝 Inserting backup records...');
        const adminUserIds = admins.map(a => userIds[a.email]);
        for (let i = 0; i < 5; i++) {
            const backupId = generateUUID();
            const backupDate = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000); // Weekly backups
            const sizeBytes = randomInt(50, 500) * 1024 * 1024; // 50-500 MB
            await client.query(`INSERT INTO backups (
          id, filename, size_bytes, status, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`, [
                backupId,
                `backup_${backupDate.toISOString().split('T')[0]}.sql`,
                sizeBytes,
                BackupStatus.COMPLETED,
                adminUserIds[Math.floor(Math.random() * adminUserIds.length)],
                backupDate
            ]);
        }
        // =============================================
        // 15. INSERT JOB REPORTS (simplified version)
        // =============================================
        console.log('📝 Inserting job reports...');
        await client.query('SAVEPOINT reports_savepoint');
        try {
            const jobSeekerIds = jobSeekers.map(s => userIds[s.email]);
            let reportsCreated = 0;
            // Very conservative reasons that are likely to be allowed
            const possibleReasons = ['spam', 'inappropriate', 'fake'];
            for (let i = 0; i < 3; i++) {
                const reportId = generateUUID();
                const jobId = jobIds[Math.floor(Math.random() * jobIds.length)];
                const reporterId = jobSeekerIds[Math.floor(Math.random() * jobSeekerIds.length)];
                const reason = possibleReasons[i % possibleReasons.length]; // Cycle through reasons
                try {
                    await client.query(`INSERT INTO job_reports (
          id, job_id, reporter_id, reason, description, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                        reportId,
                        jobId,
                        reporterId,
                        reason,
                        `This job posting appears to violate our terms of service.`,
                        'pending',
                        randomDate(new Date(2024, 0, 1), new Date())
                    ]);
                    reportsCreated++;
                }
                catch (err) {
                    console.log(`  ⚠ Could not create report with reason "${reason}": ${err.message.substring(0, 50)}`);
                }
            }
            await client.query('RELEASE SAVEPOINT reports_savepoint');
            console.log(`  ✓ Created ${reportsCreated} job reports`);
        }
        catch (err) {
            await client.query('ROLLBACK TO SAVEPOINT reports_savepoint');
            console.log(`  ⚠ Job reports section failed completely`);
        }
        // =============================================
        // COMMIT TRANSACTION
        // =============================================
        await client.query('COMMIT');
        console.log('\n✅ Database seeded successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Users: ${Object.keys(userIds).length}`);
        console.log(`   - Job Seekers: ${jobSeekers.length}`);
        console.log(`   - Employers: ${employers.length}`);
        console.log(`   - Admins: ${admins.length}`);
        console.log(`   - Companies: ${Object.keys(companyIds).length}`);
        console.log(`   - Jobs: ${jobIds.length}`);
        console.log(`   - Applications: 20`);
        console.log('\n🔐 All users have password: 1234');
        console.log('\n💡 Tip: Use --clear flag to clear existing data before seeding: npm run seed -- --clear');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error seeding database:', error);
        throw error;
    }
    finally {
        client.release();
        await pool.end();
    }
}
// =============================================
// RUN THE SEED FUNCTION
// =============================================
seedDatabase()
    .then(() => {
    console.log('✨ Seed completed successfully!');
    process.exit(0);
})
    .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
});
//# sourceMappingURL=seed-database.js.map