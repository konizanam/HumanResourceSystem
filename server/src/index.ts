/**
 * Main application entry point
 * This file starts the server
 */

import app from './app';
import dotenv from 'dotenv';
import path from 'path';
import { query } from './config/database';

// Load environment variables (only in development — production uses platform env vars)
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.join(__dirname, '../.env') });
}

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function ensureSchema() {
  // Ensure companies.status exists for activate/deactivate.
  await query(
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'",
  );

  // New users should be inactive by default until email activation.
  // (Registration explicitly sets is_active too, but this helps fresh DB setups.)
  await query(
    "ALTER TABLE users ALTER COLUMN is_active SET DEFAULT FALSE",
  );

  // Store user profile pictures directly in DB.
  await query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_data BYTEA",
  );
  await query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_mime VARCHAR(100)",
  );
  await query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_updated_at TIMESTAMP",
  );
  await query(
    "ALTER TABLE job_seeker_experience ADD COLUMN IF NOT EXISTS notice_period VARCHAR(100)",
  );
  await query(
    `CREATE TABLE IF NOT EXISTS daily_unique_visitors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
      visitor_hash VARCHAR(64) NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      ip_address INET,
      user_agent TEXT,
      first_path TEXT,
      first_seen_at TIMESTAMP DEFAULT NOW(),
      last_seen_at TIMESTAMP DEFAULT NOW(),
      request_count INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT uq_daily_unique_visitors_date_hash UNIQUE (visit_date, visitor_hash)
    )`,
  );

  // Persist uploaded documents in DB so downloads survive ephemeral file systems.
  await query(
    "ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_data BYTEA",
  );

  // Persist resumes in DB instead of relying on local disk paths.
  await query(
    "ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_data BYTEA",
  );

  // Industries master table for dropdowns/management.
  await query(
    `CREATE TABLE IF NOT EXISTS industries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(120) NOT NULL UNIQUE,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`,
  );

  // Ensure status exists for activate/deactivate controls.
  await query(
    "ALTER TABLE industries ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'",
  );
  await query(
    "ALTER TABLE industries ALTER COLUMN status SET DEFAULT 'active'",
  );
  await query(
    "UPDATE industries SET status = 'active' WHERE status IS NULL OR TRIM(status) = ''",
  );
  await query(
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1
         FROM pg_constraint
         WHERE conname = 'industries_status_check'
       ) THEN
         ALTER TABLE industries
         ADD CONSTRAINT industries_status_check
         CHECK (status IN ('active', 'inactive'));
       END IF;
     END $$;`,
  );

  // Ensure companies use industry_id FK as source of truth.
  await query(
    "ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry_id UUID",
  );

  // Backfill industries from legacy companies.industry text column when present.
  await query(
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'companies'
           AND column_name = 'industry'
       ) THEN
         INSERT INTO industries (name)
         SELECT DISTINCT TRIM(industry) AS name
         FROM companies
         WHERE industry IS NOT NULL
           AND TRIM(industry) <> ''
         ON CONFLICT (name) DO NOTHING;
       END IF;
     END $$;`,
  );

  // Backfill industries from jobs.industry only for legacy schemas where that column exists.
  await query(
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'jobs'
           AND column_name = 'industry'
       ) THEN
         INSERT INTO industries (name)
         SELECT DISTINCT TRIM(industry) AS name
         FROM jobs
         WHERE industry IS NOT NULL
           AND TRIM(industry) <> ''
         ON CONFLICT (name) DO NOTHING;
       END IF;
     END $$;`,
  );

  // Map legacy companies.industry values into companies.industry_id.
  await query(
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'companies'
           AND column_name = 'industry'
       ) THEN
         UPDATE companies c
         SET industry_id = i.id
         FROM industries i
         WHERE c.industry_id IS NULL
           AND c.industry IS NOT NULL
           AND TRIM(c.industry) <> ''
           AND LOWER(TRIM(i.name)) = LOWER(TRIM(c.industry));
       END IF;
     END $$;`,
  );

  await query(
    "CREATE INDEX IF NOT EXISTS idx_companies_industry_id ON companies(industry_id)",
  );

  await query(
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1
         FROM pg_constraint
         WHERE conname = 'companies_industry_id_fkey'
       ) THEN
         ALTER TABLE companies
         ADD CONSTRAINT companies_industry_id_fkey
         FOREIGN KEY (industry_id)
         REFERENCES industries(id)
         ON UPDATE CASCADE
         ON DELETE RESTRICT;
       END IF;
     END $$;`,
  );

  // Ensure company delete permission exists for role assignment.
  await query(
    `INSERT INTO permissions (name, description, module_name, action_type)
     VALUES ('DELETE_COMPANY', 'Delete company records', 'Company', 'DELETE')
     ON CONFLICT (name) DO UPDATE
       SET description = EXCLUDED.description,
           module_name = EXCLUDED.module_name,
           action_type = EXCLUDED.action_type`,
  );

  await query(
    `INSERT INTO permissions (name, description, module_name, action_type)
     VALUES ('ADD_USER', 'Create users except job seekers', 'Users', 'CREATE')
     ON CONFLICT (name) DO UPDATE
       SET description = EXCLUDED.description,
           module_name = EXCLUDED.module_name,
           action_type = EXCLUDED.action_type`,
  );

  await query(
    `INSERT INTO role_permissions (role_id, permission_id)
     SELECT r.id, p.id
       FROM roles r
       JOIN permissions p ON p.name = 'ADD_USER'
      WHERE r.name = 'ADMIN'
     ON CONFLICT (role_id, permission_id) DO NOTHING`,
  );

  // Upgrade jobs.application_deadline to store time-of-day so posts
  // can be hidden at a precise moment (not just end-of-day).
  // The v_active_jobs view depends on this column, so drop+recreate around the ALTER.
  await query(
    `DO $$
     BEGIN
       IF EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_name = 'jobs'
            AND column_name = 'application_deadline'
            AND data_type = 'date'
       ) THEN
         DROP VIEW IF EXISTS v_active_jobs;
         ALTER TABLE jobs
           ALTER COLUMN application_deadline TYPE TIMESTAMP
             USING application_deadline::timestamp;
       END IF;
     END $$;`,
  );

  // Always (re)create v_active_jobs so it reflects the current column type
  // and the precise-time cutoff.
  await query(
    `CREATE OR REPLACE VIEW v_active_jobs AS
       SELECT j.id,
              j.title,
              j.description,
              j.salary_min,
              j.salary_max,
              j.is_urgent,
              j.created_at,
              j.location,
              j.remote,
              j.employment_type,
              j.experience_level,
              j.employer_id,
              c.name AS company_name,
              c.city AS company_city,
              c.country AS company_country,
              cat.name AS category_name,
              subcat.name AS subcategory_name,
              (u.first_name::text || ' '::text) || u.last_name::text AS created_by_name,
              (emp.first_name::text || ' '::text) || emp.last_name::text AS employer_name
         FROM jobs j
         JOIN companies c ON j.company_id = c.id
         LEFT JOIN job_categories cat ON j.category_id = cat.id
         LEFT JOIN job_subcategories subcat ON j.subcategory_id = subcat.id
         LEFT JOIN users u ON j.created_by = u.id
         LEFT JOIN users emp ON j.employer_id = emp.id
        WHERE j.status::text = 'APPROVED'::text
          AND (j.application_deadline IS NULL OR j.application_deadline > CURRENT_TIMESTAMP)`,
  );

  // Vacancy screening questions (auto-reject feature).
  await query(
    `CREATE TABLE IF NOT EXISTS job_screening_questions (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
       question_text TEXT NOT NULL,
       sort_order INT NOT NULL DEFAULT 0,
       created_at TIMESTAMP NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMP NOT NULL DEFAULT NOW()
     )`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_job_screening_questions_job_id
       ON job_screening_questions(job_id)`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS job_screening_options (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       question_id UUID NOT NULL REFERENCES job_screening_questions(id) ON DELETE CASCADE,
       option_text TEXT NOT NULL,
       is_correct BOOLEAN NOT NULL DEFAULT false,
       sort_order INT NOT NULL DEFAULT 0,
       created_at TIMESTAMP NOT NULL DEFAULT NOW()
     )`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_job_screening_options_question_id
       ON job_screening_options(question_id)`,
  );
  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_job_screening_options_one_correct
       ON job_screening_options(question_id) WHERE is_correct`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS application_screening_answers (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
       question_id UUID NOT NULL REFERENCES job_screening_questions(id) ON DELETE CASCADE,
       selected_option_id UUID REFERENCES job_screening_options(id) ON DELETE SET NULL,
       is_correct BOOLEAN NOT NULL DEFAULT false,
       answered_at TIMESTAMP NOT NULL DEFAULT NOW()
     )`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_application_screening_answers_application_id
       ON application_screening_answers(application_id)`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_application_screening_answers_question_id
       ON application_screening_answers(question_id)`,
  );
}

async function start() {
  await ensureSchema();

  // Start the server
  const server = app.listen(PORT, () => {
    console.log('\n=================================');
    console.log('🚀 Server started successfully!');
    console.log('=================================');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API v1: http://localhost:${PORT}/api/v1/health`);
      console.log(`📄 Swagger docs at http://localhost:${PORT}/docs`);
    console.log('=================================\n');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Shutting down gracefully...');
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });

  return server;
}

const serverPromise = start().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

export default serverPromise;