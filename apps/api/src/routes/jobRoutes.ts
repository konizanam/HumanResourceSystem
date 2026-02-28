import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { query as dbQuery } from '../config/database';
import { authenticate, authorize, authorizePermission } from '../middleware/auth';
import { Request, Response } from 'express';
import { createNotification } from './notificationsRoutes';
import { logAdminAction } from '../middleware/adminLogger';
import { logAudit } from '../helpers/auditLogger';

const router = express.Router();

// Express Request 'user' type is declared in src/types/index.ts

// Validation middleware
const validateJob = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('company').notEmpty().withMessage('Company is required'),
  body('company_id').optional().isUUID().withMessage('Invalid company ID'),
  body('location').notEmpty().withMessage('Location is required'),
  body('salary_min').isNumeric().withMessage('Minimum salary must be a number'),
  body('salary_max').isNumeric().withMessage('Maximum salary must be a number'),
  body('salary_currency').optional().isString().withMessage('Currency must be a string'),
  body('category').notEmpty().withMessage('Category is required'),
  body('category_id').optional().isUUID().withMessage('Invalid category ID'),
  body('experience_level')
    .customSanitizer((value) => {
      const normalized = String(value ?? '').trim().toLowerCase();
      if (normalized === 'entry') return 'Entry';
      if (normalized === 'intermediate') return 'Intermediate';
      if (normalized === 'senior') return 'Senior';
      if (normalized === 'lead') return 'Lead';
      return value;
    })
    .isIn(['Entry', 'Intermediate', 'Senior', 'Lead'])
    .withMessage('Invalid experience level'),
  body('employment_type')
    .customSanitizer((value) => {
      const normalized = String(value ?? '').trim().toLowerCase();
      if (normalized === 'full-time' || normalized === 'full time') return 'Full-time';
      if (normalized === 'part-time' || normalized === 'part time') return 'Part-time';
      if (normalized === 'contract') return 'Contract';
      if (normalized === 'internship') return 'Internship';
      return value;
    })
    .isIn(['Full-time', 'Part-time', 'Contract', 'Internship'])
    .withMessage('Invalid employment type'),
  body('remote').optional().isBoolean().toBoolean(),
  body('requirements').optional().isArray(),
  body('responsibilities').optional().isArray(),
  body('benefits').optional().isArray(),
  body('application_deadline').isISO8601().toDate().withMessage('Valid deadline is required')
];

// Helper function to check if user is employer or admin
const isEmployerOrAdmin = (user: any): boolean => {
  return user?.roles?.includes('EMPLOYER') || user?.roles?.includes('ADMIN');
};

// Some routes (like GET /jobs) support both public and authenticated views.
// If a Bearer token is provided, attach req.user; otherwise continue as public.
const authenticateOptional = (req: Request, res: Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return authenticate(req, res, next);
};

const mapStatusFilter = (status: string) => {
  // Support both legacy status values (active/closed/draft)
  // and schema values (APPROVED/CLOSED/DRAFT).
  const normalized = String(status).toLowerCase();
  if (normalized === 'active') return ['active', 'APPROVED'];
  if (normalized === 'closed') return ['closed', 'CLOSED'];
  if (normalized === 'draft') return ['draft', 'DRAFT'];
  // If the caller sends an unknown status, keep it as-is.
  return [status];
};

async function resolveCompanyId(input: { company_id?: string; company?: string }): Promise<string | null> {
  if (input.company_id) return String(input.company_id);
  const companyName = String(input.company ?? '').trim();
  if (!companyName) return null;

  const byName = await dbQuery(
    `SELECT id FROM companies WHERE LOWER(name) = LOWER($1) ORDER BY created_at DESC LIMIT 1`,
    [companyName]
  );
  return byName.rows[0]?.id ? String(byName.rows[0].id) : null;
}

async function resolveCategoryId(input: { category_id?: string; category?: string }): Promise<string | null> {
  if (input.category_id) return String(input.category_id);
  const categoryName = String(input.category ?? '').trim();
  if (!categoryName) return null;

  const byName = await dbQuery(
    `SELECT id FROM job_categories WHERE LOWER(name) = LOWER($1) ORDER BY name ASC LIMIT 1`,
    [categoryName]
  );
  return byName.rows[0]?.id ? String(byName.rows[0].id) : null;
}

async function resolveSubcategoryId(input: { subcategory?: string; categoryId?: string | null }): Promise<string | null> {
  const subcategoryName = String(input.subcategory ?? '').trim();
  if (!subcategoryName) return null;

  if (input.categoryId) {
    const byNameAndCategory = await dbQuery(
      `SELECT id
       FROM job_subcategories
       WHERE category_id = $1 AND LOWER(name) = LOWER($2)
       ORDER BY name ASC
       LIMIT 1`,
      [input.categoryId, subcategoryName]
    );
    if (byNameAndCategory.rows[0]?.id) return String(byNameAndCategory.rows[0].id);
  }

  const byName = await dbQuery(
    `SELECT id FROM job_subcategories WHERE LOWER(name) = LOWER($1) ORDER BY name ASC LIMIT 1`,
    [subcategoryName]
  );
  return byName.rows[0]?.id ? String(byName.rows[0].id) : null;
}

let cachedJobsColumns: Set<string> | null = null;

async function getJobsColumns(): Promise<Set<string>> {
  if (cachedJobsColumns) return cachedJobsColumns;
  const result = await dbQuery(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'jobs'`
  );
  cachedJobsColumns = new Set(result.rows.map((row: any) => String(row.column_name)));
  return cachedJobsColumns;
}

function normalizeJobStatus(statusRaw: unknown): string {
  const raw = String(statusRaw ?? '').trim();
  const normalized = raw.toLowerCase();

  if (!normalized) return 'DRAFT';
  if (normalized === 'active' || normalized === 'approved') return 'APPROVED';
  if (normalized === 'closed') return 'CLOSED';
  if (normalized === 'pending') return 'PENDING';
  if (normalized === 'draft') return 'DRAFT';

  return raw;
}

// GET /api/jobs - List all jobs (with employer access)
router.get('/', authenticateOptional, [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['active', 'closed', 'draft']),
  query('my_jobs').optional().isBoolean().toBoolean(),
  query('company_id').optional().isUUID().withMessage('Invalid company ID')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = (page - 1) * limit;
    const showMyJobs = String(req.query.my_jobs) === 'true';

    let whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Handle different access levels
    if (showMyJobs) {
      // If user wants to see their jobs, they must be authenticated
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required to view your jobs' });
      }
      
      // Employers see their own jobs, admins see all
      if (req.user.roles.includes('EMPLOYER') && !req.user.roles.includes('ADMIN')) {
        whereConditions.push(`j.employer_id = $${paramIndex}`);
        queryParams.push(req.user.userId);
        paramIndex++;
      }
      // Admins can optionally filter by employer
      else if (req.user.roles.includes('ADMIN') && req.query.employer_id) {
        whereConditions.push(`j.employer_id = $${paramIndex}`);
        queryParams.push(req.query.employer_id);
        paramIndex++;
      }
    } else {
      // Public view - only show active jobs
      const statuses = mapStatusFilter('active');
      whereConditions.push(`j.status = ANY($${paramIndex}::text[])`);
      queryParams.push(statuses);
      paramIndex++;
    }

    // Add status filter if provided and user is employer/admin
    if (req.query.status && req.user && isEmployerOrAdmin(req.user)) {
      const statuses = mapStatusFilter(String(req.query.status));
      whereConditions.push(`j.status = ANY($${paramIndex}::text[])`);
      queryParams.push(statuses);
      paramIndex++;
    }

    if (req.query.company_id) {
      whereConditions.push(`j.company_id = $${paramIndex}`);
      queryParams.push(req.query.company_id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countResult = await dbQuery(
      `SELECT COUNT(*) FROM jobs j ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated jobs with employer info
    const jobsResult = await dbQuery(
      `SELECT j.*, 
        (u.first_name || ' ' || u.last_name) as employer_name, 
        u.email as employer_email,
        u.company_name as employer_company,
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as applications_count
       FROM jobs j
       LEFT JOIN users u ON j.employer_id = u.id
       ${whereClause}
       ORDER BY 
         CASE WHEN j.employer_id = $${paramIndex} AND $${paramIndex + 1}::boolean THEN 0 ELSE 1 END,
         j.created_at DESC
       LIMIT $${paramIndex + 2} OFFSET $${paramIndex + 3}`,
      [...queryParams, req.user?.userId || null, showMyJobs, limit, offset]
    );

    res.json({
      jobs: jobsResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      showing: showMyJobs ? 'my_jobs' : 'all_jobs'
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/jobs/employer/dashboard - Employer dashboard with job stats
router.get('/employer/dashboard',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const employerId = req.user!.userId;

      // Get employer's job statistics
      const stats = await dbQuery(
        `SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_jobs,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_jobs,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_jobs,
          COALESCE(SUM(views), 0) as total_views,
          COALESCE(SUM(applications_count), 0) as total_applications,
          AVG(views) as avg_views_per_job
         FROM jobs
         WHERE employer_id = $1`,
        [employerId]
      );

      // Get recent applications for employer's jobs
      const recentApplications = await dbQuery(
        `SELECT a.*, 
          j.title as job_title,
          (u.first_name || ' ' || u.last_name) as applicant_name,
          u.email as applicant_email
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
           JOIN users u ON a.user_id = u.id
         WHERE j.employer_id = $1
           ORDER BY a.applied_at DESC
         LIMIT 10`,
        [employerId]
      );

      // Get jobs with application counts
      const jobsWithApplications = await dbQuery(
        `SELECT j.id, j.title, j.status, j.created_at, j.views,
          COUNT(a.id) as application_count,
          COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN a.status = 'reviewed' THEN 1 END) as reviewed_count,
          COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_count,
          COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_count
         FROM jobs j
         LEFT JOIN applications a ON j.id = a.job_id
         WHERE j.employer_id = $1
         GROUP BY j.id
         ORDER BY j.created_at DESC`,
        [employerId]
      );

      res.json({
        stats: stats.rows[0],
        recent_applications: recentApplications.rows,
        jobs: jobsWithApplications.rows
      });
    } catch (error) {
      console.error('Error fetching employer dashboard:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/jobs/employer/jobs - Get all jobs for logged-in employer
router.get('/employer/jobs',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['active', 'closed', 'draft'])
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = (page - 1) * limit;
      const employerId = req.user!.userId;

      let whereConditions = ['employer_id = $1'];
      const queryParams: any[] = [employerId];
      let paramIndex = 2;

      if (req.query.status) {
        whereConditions.push(`status = $${paramIndex}`);
        queryParams.push(req.query.status);
        paramIndex++;
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      // Get total count
      const countResult = await dbQuery(
        `SELECT COUNT(*) FROM jobs ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count);

      // Get employer's jobs with application counts
      const jobsResult = await dbQuery(
        `SELECT j.*, 
          COUNT(a.id) as applications_count,
          COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_applications,
          COUNT(CASE WHEN a.status = 'reviewed' THEN 1 END) as reviewed_applications,
          COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_applications,
          COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_applications
         FROM jobs j
         LEFT JOIN applications a ON j.id = a.job_id
         ${whereClause}
         GROUP BY j.id
         ORDER BY j.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      res.json({
        jobs: jobsResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching employer jobs:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/jobs/search - Search jobs (public)
router.get('/search', [
  query('q').optional().isString(),
  query('location').optional().isString(),
  query('min_salary').optional().isNumeric().toInt(),
  query('max_salary').optional().isNumeric().toInt()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { q, location, min_salary, max_salary } = req.query;
    let whereConditions = ['status = $1'];
    const queryParams: any[] = ['active'];
    let paramIndex = 2;

    // Text search in title and description
    if (q) {
      whereConditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${q}%`);
      paramIndex++;
    }

    // Location search
    if (location) {
      whereConditions.push(`location ILIKE $${paramIndex}`);
      queryParams.push(`%${location}%`);
      paramIndex++;
    }

    // Salary range
    if (min_salary) {
      whereConditions.push(`salary_max >= $${paramIndex}`);
      queryParams.push(min_salary);
      paramIndex++;
    }
    if (max_salary) {
      whereConditions.push(`salary_min <= $${paramIndex}`);
      queryParams.push(max_salary);
      paramIndex++;
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const jobsResult = await dbQuery(
      `SELECT j.*, 
        (u.first_name || ' ' || u.last_name) as employer_name,
        u.company_name as employer_company
       FROM jobs j
       LEFT JOIN users u ON j.employer_id = u.id
       ${whereClause}
       ORDER BY j.created_at DESC`,
      queryParams
    );

    res.json(jobsResult.rows);
  } catch (error) {
    console.error('Error searching jobs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/jobs/filter - Filter jobs (public)
router.get('/filter', [
  query('category').optional().isString(),
  query('experience_level').optional().isIn(['Entry', 'Intermediate', 'Senior', 'Lead']),
  query('employment_type').optional().isIn(['Full-time', 'Part-time', 'Contract', 'Internship']),
  query('remote').optional().isBoolean().toBoolean(),
  query('min_salary').optional().isNumeric().toInt(),
  query('max_salary').optional().isNumeric().toInt()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, experience_level, employment_type, remote, min_salary, max_salary } = req.query;
    const whereConditions = ['status = $1'];
    const queryParams: any[] = ['active'];
    let paramIndex = 2;

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }
    
    if (experience_level) {
      whereConditions.push(`experience_level = $${paramIndex}`);
      queryParams.push(experience_level);
      paramIndex++;
    }
    
    if (employment_type) {
      whereConditions.push(`employment_type = $${paramIndex}`);
      queryParams.push(employment_type);
      paramIndex++;
    }
    
    if (remote !== undefined) {
      whereConditions.push(`remote = $${paramIndex}`);
      queryParams.push(remote);
      paramIndex++;
    }
    
    if (min_salary) {
      whereConditions.push(`salary_max >= $${paramIndex}`);
      queryParams.push(min_salary);
      paramIndex++;
    }
    
    if (max_salary) {
      whereConditions.push(`salary_min <= $${paramIndex}`);
      queryParams.push(max_salary);
      paramIndex++;
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const jobsResult = await dbQuery(
      `SELECT j.*, 
        (u.first_name || ' ' || u.last_name) as employer_name,
        u.company_name as employer_company
       FROM jobs j
       LEFT JOIN users u ON j.employer_id = u.id
       ${whereClause}
       ORDER BY j.created_at DESC`,
      queryParams
    );

    res.json(jobsResult.rows);
  } catch (error) {
    console.error('Error filtering jobs:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/jobs/:id - Get single job details
router.get('/:id([0-9a-fA-F-]{36})', [
  param('id').isUUID().withMessage('Invalid job ID')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get job details with employer info
    const jobResult = await dbQuery(
      `SELECT j.*, 
        (u.first_name || ' ' || u.last_name) as employer_name,
        u.email as employer_email,
        u.company_name as employer_company
       FROM jobs j
       LEFT JOIN users u ON j.employer_id = u.id
       WHERE j.id = $1`,
      [req.params.id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobResult.rows[0];

    const isPubliclyActive = job.status === 'active' || job.status === 'APPROVED';

    // Check if user can view this job (public can only view active/approved jobs)
    if (!isPubliclyActive && !req.user?.roles?.includes('EMPLOYER') && !req.user?.roles?.includes('ADMIN')) {
      return res.status(403).json({ error: 'This job is not publicly available' });
    }

    // Check if employer can view their own non-active jobs
    if (!isPubliclyActive && req.user?.roles?.includes('EMPLOYER') && job.employer_id !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to view this job' });
    }

    // Increment view count only for active jobs and public views
    if (isPubliclyActive && !req.user?.roles?.includes('EMPLOYER')) {
      await dbQuery(
        'UPDATE jobs SET views = views + 1 WHERE id = $1',
        [req.params.id]
      );
      job.views = (job.views || 0) + 1;
    }

    // Get application count (only for employers/admins)
    if (req.user && isEmployerOrAdmin(req.user)) {
      const appsResult = await dbQuery(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed,
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
         FROM applications 
         WHERE job_id = $1`,
        [req.params.id]
      );
      job.applications = appsResult.rows[0];
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/jobs - Create job (Employer only)
router.post('/', 
  authenticate, 
  authorizePermission('CREATE_JOB'),
  logAdminAction('CREATE_JOB', 'job'),
  validateJob, 
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title, description, company, location,
        salary_min, salary_max, salary_currency = 'USD',
        category, category_id, company_id, subcategory, experience_level, employment_type,
        remote = false, requirements = [], responsibilities = [],
        benefits = [], application_deadline, status = 'active'
      } = req.body;

      const jobsColumns = await getJobsColumns();
      const ownerColumn = jobsColumns.has('employer_id') ? 'employer_id' : jobsColumns.has('created_by') ? 'created_by' : null;
      const statusValue = normalizeJobStatus(status);

      const resolvedCompanyId = await resolveCompanyId({ company_id, company });
      const resolvedCategoryId = await resolveCategoryId({ category_id, category });
      const resolvedSubcategoryId = await resolveSubcategoryId({ subcategory, categoryId: resolvedCategoryId });

      if (!resolvedCompanyId) {
        return res.status(400).json({ error: 'Company is required and must exist' });
      }
      if (!resolvedCategoryId) {
        return res.status(400).json({ error: 'Category is required and must exist' });
      }

      const insertColumns: string[] = [];
      const insertValues: any[] = [];
      const insertParams: string[] = [];
      const pushParam = (column: string, value: any) => {
        insertColumns.push(column);
        insertValues.push(value);
        insertParams.push(`$${insertValues.length}`);
      };

      pushParam('title', title);
      if (jobsColumns.has('description')) pushParam('description', description);
      if (jobsColumns.has('company_id')) pushParam('company_id', resolvedCompanyId);
      if (jobsColumns.has('location')) pushParam('location', location);
      if (jobsColumns.has('salary_min')) pushParam('salary_min', salary_min);
      if (jobsColumns.has('salary_max')) pushParam('salary_max', salary_max);
      if (jobsColumns.has('salary_currency')) pushParam('salary_currency', salary_currency);
      if (jobsColumns.has('category_id')) pushParam('category_id', resolvedCategoryId);
      if (jobsColumns.has('subcategory_id')) pushParam('subcategory_id', resolvedSubcategoryId);
      if (jobsColumns.has('experience_level')) pushParam('experience_level', experience_level);
      if (jobsColumns.has('employment_type')) pushParam('employment_type', employment_type);
      if (jobsColumns.has('remote')) pushParam('remote', remote);
      if (jobsColumns.has('requirements')) pushParam('requirements', JSON.stringify(requirements));
      if (jobsColumns.has('responsibilities')) pushParam('responsibilities', JSON.stringify(responsibilities));
      if (jobsColumns.has('benefits')) pushParam('benefits', JSON.stringify(benefits));
      if (jobsColumns.has('application_deadline')) pushParam('application_deadline', application_deadline);
      if (jobsColumns.has('status')) pushParam('status', statusValue);
      if (ownerColumn) pushParam(ownerColumn, req.user!.userId);
      if (jobsColumns.has('created_at')) {
        insertColumns.push('created_at');
        insertParams.push('NOW()');
      }
      if (jobsColumns.has('updated_at')) {
        insertColumns.push('updated_at');
        insertParams.push('NOW()');
      }

      const result = await dbQuery(
        `INSERT INTO jobs (
          ${insertColumns.join(', ')}
        ) VALUES (${insertParams.join(', ')})
        RETURNING *`,
        insertValues
      );

      const createdJob = result.rows[0];
      try {
        // Notify only job seekers who explicitly selected this job's category or company.
        if (resolvedCategoryId || resolvedCompanyId) {
          const seekers = await dbQuery(
            `SELECT DISTINCT jsp.user_id
               FROM job_seeker_profiles jsp
               JOIN notification_preferences np ON np.user_id = jsp.user_id
              WHERE np.job_alerts = true
                AND np.in_app_notifications = true
                AND (
                  ($1::uuid IS NOT NULL AND EXISTS (
                    SELECT 1
                      FROM jsonb_array_elements_text(COALESCE(np.category_ids, '[]'::jsonb)) pref_category
                     WHERE pref_category = $1::text
                  ))
                  OR
                  ($2::uuid IS NOT NULL AND EXISTS (
                    SELECT 1
                      FROM jsonb_array_elements_text(COALESCE(np.company_ids, '[]'::jsonb)) pref_company
                     WHERE pref_company = $2::text
                  ))
                )
              LIMIT 300`,
            [resolvedCategoryId ?? null, resolvedCompanyId ?? null]
          );

          await Promise.allSettled(
            seekers.rows.map((row) =>
              createNotification(
                row.user_id,
                'job_posted',
                'New job posted in your selected preferences',
                `A new "${title}" position was posted in ${category}.`,
                { job_id: createdJob.id, category, category_id: resolvedCategoryId, company_id: resolvedCompanyId, title },
                '/app/jobs',
                'normal'
              )
            )
          );
        }
      } catch (notificationError) {
        console.error('Failed to notify job seekers for new job posting:', notificationError);
      }

      await logAudit({
        userId: req.user!.userId,
        action: 'JOB_CREATED',
        targetType: 'job',
        targetId: createdJob.id,
        details: { title: createdJob.title },
      });
      res.status(201).json(createdJob);
    } catch (error) {
      console.error('Error creating job:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PUT /api/jobs/:id - Update job (Employer who owns it or Admin)
router.put('/:id',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  logAdminAction('UPDATE_JOB', 'job'),
  param('id').isUUID().withMessage('Invalid job ID'),
  validateJob,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if job exists and user owns it
      const jobCheck = await dbQuery(
        'SELECT * FROM jobs WHERE id = $1',
        [req.params.id]
      );

      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobCheck.rows[0];
      const beforeJobSnapshot = { ...job };

      // Check if user is the employer who created the job or an admin
      if (job.employer_id !== req.user!.userId && !req.user!.roles.includes('ADMIN')) {
        return res.status(403).json({ error: 'Not authorized to update this job' });
      }

      const {
        title, description, company, location,
        salary_min, salary_max, salary_currency,
        category, category_id, company_id, subcategory, experience_level, employment_type,
        remote, requirements, responsibilities, benefits,
        application_deadline, status
      } = req.body;

      const jobsColumns = await getJobsColumns();
      const statusValue = normalizeJobStatus(status);

      const resolvedCompanyId = await resolveCompanyId({ company_id, company });
      const resolvedCategoryId = await resolveCategoryId({ category_id, category });
      const resolvedSubcategoryId = await resolveSubcategoryId({ subcategory, categoryId: resolvedCategoryId });

      if (!resolvedCompanyId) {
        return res.status(400).json({ error: 'Company is required and must exist' });
      }
      if (!resolvedCategoryId) {
        return res.status(400).json({ error: 'Category is required and must exist' });
      }

      const updateValues: any[] = [];
      const updateSets: string[] = [];
      const pushSet = (column: string, value: any) => {
        updateValues.push(value);
        updateSets.push(`${column} = $${updateValues.length}`);
      };

      pushSet('title', title);
      if (jobsColumns.has('description')) pushSet('description', description);
      if (jobsColumns.has('company_id')) pushSet('company_id', resolvedCompanyId);
      if (jobsColumns.has('location')) pushSet('location', location);
      if (jobsColumns.has('salary_min')) pushSet('salary_min', salary_min);
      if (jobsColumns.has('salary_max')) pushSet('salary_max', salary_max);
      if (jobsColumns.has('salary_currency')) pushSet('salary_currency', salary_currency);
      if (jobsColumns.has('category_id')) pushSet('category_id', resolvedCategoryId);
      if (jobsColumns.has('subcategory_id')) {
        updateValues.push(resolvedSubcategoryId);
        updateSets.push(`subcategory_id = COALESCE($${updateValues.length}, subcategory_id)`);
      }
      if (jobsColumns.has('experience_level')) pushSet('experience_level', experience_level);
      if (jobsColumns.has('employment_type')) pushSet('employment_type', employment_type);
      if (jobsColumns.has('remote')) pushSet('remote', remote);
      if (jobsColumns.has('requirements')) pushSet('requirements', JSON.stringify(requirements));
      if (jobsColumns.has('responsibilities')) pushSet('responsibilities', JSON.stringify(responsibilities));
      if (jobsColumns.has('benefits')) pushSet('benefits', JSON.stringify(benefits));
      if (jobsColumns.has('application_deadline')) pushSet('application_deadline', application_deadline);
      if (jobsColumns.has('status')) pushSet('status', statusValue);
      if (jobsColumns.has('updated_at')) updateSets.push('updated_at = NOW()');

      updateValues.push(req.params.id);
      const jobIdPlaceholder = `$${updateValues.length}`;

      const result = await dbQuery(
        `UPDATE jobs SET
          ${updateSets.join(',\n          ')}
        WHERE id = ${jobIdPlaceholder}
        RETURNING *`,
        updateValues
      );

      await logAudit({
        userId: req.user!.userId,
        action: 'JOB_UPDATED',
        targetType: 'job',
        targetId: String(req.params.id),
        details: {
          before: beforeJobSnapshot,
          after: result.rows[0] ?? null,
        },
      });
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating job:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /api/jobs/:id - Delete job (Employer who owns it or Admin)
router.delete('/:id',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  logAdminAction('DELETE_JOB', 'job'),
  param('id').isUUID().withMessage('Invalid job ID'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if job exists and user owns it
      const jobCheck = await dbQuery(
        'SELECT employer_id, title FROM jobs WHERE id = $1',
        [req.params.id]
      );

      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobCheck.rows[0];

      // Check if user is the employer who created the job or an admin
      if (job.employer_id !== req.user!.userId && !req.user!.roles.includes('ADMIN')) {
        return res.status(403).json({ error: 'Not authorized to delete this job' });
      }

      // Check if there are applications for this job
      const appsCheck = await dbQuery(
        'SELECT COUNT(*) as count FROM applications WHERE job_id = $1',
        [req.params.id]
      );

      if (parseInt(appsCheck.rows[0].count) > 0) {
        // Instead of deleting, just mark as closed if there are applications
        await dbQuery(
          'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2',
          ['closed', req.params.id]
        );
        await logAudit({
          userId: req.user!.userId,
          action: 'JOB_DELETED',
          targetType: 'job',
          targetId: String(req.params.id),
          details: { closed_instead_of_deleted: true },
        });
        return res.json({ 
          message: 'Job has applications, marked as closed instead of deleted',
          job_title: job.title,
          status: 'closed'
        });
      }

      // No applications, safe to delete
      await dbQuery('DELETE FROM jobs WHERE id = $1', [req.params.id]);
      await logAudit({
        userId: req.user!.userId,
        action: 'JOB_DELETED',
        targetType: 'job',
        targetId: String(req.params.id),
      });
      res.json({ 
        message: 'Job deleted successfully',
        job_title: job.title
      });
    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /api/jobs/:id/applications - Get applications for a job (Employer who owns it or Admin)
router.get('/:id/applications',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  param('id').isUUID().withMessage('Invalid job ID'),
  [
    query('status').optional().isIn(['pending', 'reviewed', 'accepted', 'rejected']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = (page - 1) * limit;

      // Check if job exists and user owns it
      const jobCheck = await dbQuery(
        'SELECT employer_id, title FROM jobs WHERE id = $1',
        [req.params.id]
      );

      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobCheck.rows[0];

      // Check if user is the employer who created the job or an admin
      if (job.employer_id !== req.user!.userId && !req.user!.roles.includes('ADMIN')) {
        return res.status(403).json({ error: 'Not authorized to view applications for this job' });
      }

      let whereConditions = ['a.job_id = $1'];
      const queryParams: any[] = [req.params.id];
      let paramIndex = 2;

      if (req.query.status) {
        whereConditions.push(`a.status = $${paramIndex}`);
        queryParams.push(req.query.status);
        paramIndex++;
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      // Get total count
      const countResult = await dbQuery(
        `SELECT COUNT(*) FROM applications a ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count);

      // Get applications with pagination
      const applications = await dbQuery(
        `SELECT
          a.id,
          a.job_id,
          a.user_id as applicant_id,
          NULL::text as cover_letter,
          NULL::text as resume_url,
          a.status,
          a.applied_at as created_at,
          NULL::timestamp as updated_at,
          (u.first_name || ' ' || u.last_name) as applicant_name,
          u.email as applicant_email,
          u.phone as applicant_phone,
          u.resume_url as applicant_resume
         FROM applications a
         LEFT JOIN users u ON a.user_id = u.id
         ${whereClause}
         ORDER BY a.applied_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      res.json({
        job_title: job.title,
        applications: applications.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching applications:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PATCH /api/jobs/:id/applications/:applicationId/status - Update application status (Employer only)
router.patch('/:id/applications/:applicationId/status',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  param('id').isUUID().withMessage('Invalid job ID'),
  param('applicationId').isUUID().withMessage('Invalid application ID'),
  body('status').isString().withMessage('Invalid status'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const statusMap: Record<string, string> = {
        applied: 'APPLIED',
        pending: 'APPLIED',
        screening: 'SCREENING',
        reviewed: 'SCREENING',
        longlisted: 'LONG_LISTED',
        long_listed: 'LONG_LISTED',
        shortlist: 'SHORTLISTED',
        shortlisted: 'SHORTLISTED',
        interview: 'ORAL_INTERVIEW',
        oral_interview: 'ORAL_INTERVIEW',
        practical_interview: 'PRACTICAL_INTERVIEW',
        final_interview: 'FINAL_INTERVIEW',
        assessment: 'PRACTICAL_INTERVIEW',
        offer_made: 'OFFER_MADE',
        accepted: 'HIRED',
        hired: 'HIRED',
        rejected: 'REJECTED',
        withdrawn: 'WITHDRAWN',
      };

      const rawStatus = String(req.body.status ?? '').trim();
      const normalizedStatus = statusMap[rawStatus.toLowerCase()] ?? rawStatus.toUpperCase();

      const allowedStatuses = new Set([
        'APPLIED',
        'SCREENING',
        'LONG_LISTED',
        'SHORTLISTED',
        'ORAL_INTERVIEW',
        'PRACTICAL_INTERVIEW',
        'FINAL_INTERVIEW',
        'OFFER_MADE',
        'HIRED',
        'REJECTED',
        'WITHDRAWN',
      ]);

      if (!allowedStatuses.has(normalizedStatus)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      // Check if job exists and user owns it
      const jobCheck = await dbQuery(
        'SELECT employer_id FROM jobs WHERE id = $1',
        [req.params.id]
      );

      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobCheck.rows[0];

      // Check if user is the employer who created the job or an admin
      if (job.employer_id !== req.user!.userId && !req.user!.roles.includes('ADMIN')) {
        return res.status(403).json({ error: 'Not authorized to update applications for this job' });
      }

      // Update application status
      const beforeApplicationResult = await dbQuery(
        `SELECT * FROM applications WHERE id = $1 AND job_id = $2 LIMIT 1`,
        [req.params.applicationId, req.params.id]
      );

      const result = await dbQuery(
        `UPDATE applications 
         SET status = $1
         WHERE id = $2 AND job_id = $3
         RETURNING *`,
        [normalizedStatus, req.params.applicationId, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      const updatedApplication = result.rows[0] as { id: string; user_id?: string; status?: string; job_id?: string };

      await logAudit({
        userId: req.user!.userId,
        action: 'APPLICATION_STATUS_UPDATED',
        targetType: 'application',
        targetId: updatedApplication.id,
        details: {
          before: beforeApplicationResult.rows[0] ?? null,
          after: updatedApplication,
          application_id: updatedApplication.id,
          job_id: req.params.id,
          status: updatedApplication.status,
        },
      });

      if (updatedApplication.user_id) {
        await logAudit({
          userId: req.user!.userId,
          action: 'APPLICANT_STATUS_UPDATED',
          targetType: 'applicant',
          targetId: updatedApplication.user_id,
          details: {
            application_id: updatedApplication.id,
            job_id: req.params.id,
            status: updatedApplication.status,
          },
        });
      }

      res.json(updatedApplication);
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);
// ============================================================================
// JOB CATEGORIES ENDPOINTS
// ============================================================================

/**
 * @swagger
 * components:
 *   schemas:
 *     JobCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         subcategories:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/JobSubcategory'
 *     JobSubcategory:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         category_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 */

/**
 * @swagger
 * tags:
 *   name: Job Categories
 *   description: Job categories and subcategories management
 */

// GET /api/jobs/categories - Get all job categories with subcategories
/**
 * @swagger
 * /jobs/categories:
 *   get:
 *     summary: Get all job categories with their subcategories
 *     tags: [Job Categories]
 *     parameters:
 *       - in: query
 *         name: include_counts
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include job counts for each category
 *     responses:
 *       200:
 *         description: List of categories with subcategories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 categories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/JobCategory'
 *                 total_categories:
 *                   type: integer
 */
router.get('/categories', [
  query('include_counts').optional().isBoolean().toBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const includeCounts = req.query.include_counts === 'true';

    // Get all categories
    const categoriesResult = await dbQuery(
      'SELECT * FROM job_categories ORDER BY name'
    );

    // Get all subcategories
    const subcategoriesResult = await dbQuery(
      'SELECT * FROM job_subcategories ORDER BY name'
    );

    // Group subcategories by category_id
    const subcategoriesByCategory = subcategoriesResult.rows.reduce((acc, sub) => {
      if (!acc[sub.category_id]) {
        acc[sub.category_id] = [];
      }
      acc[sub.category_id].push(sub);
      return acc;
    }, {});

    let categories = categoriesResult.rows.map(category => ({
      ...category,
      subcategories: subcategoriesByCategory[category.id] || []
    }));

    // Include job counts if requested
    if (includeCounts) {
      const jobCounts = await dbQuery(
        `SELECT 
          category_id,
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_jobs
         FROM jobs 
         GROUP BY category_id`
      );

      const countsMap = jobCounts.rows.reduce((acc, row) => {
        acc[row.category_id] = {
          total_jobs: parseInt(row.total_jobs),
          active_jobs: parseInt(row.active_jobs)
        };
        return acc;
      }, {});

      categories = categories.map(category => ({
        ...category,
        job_counts: countsMap[category.id] || { total_jobs: 0, active_jobs: 0 }
      }));
    }

    res.json({
      categories,
      total_categories: categories.length
    });
  } catch (error) {
    console.error('Error fetching job categories:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/jobs/categories/:id - Get single category with subcategories
/**
 * @swagger
 * /jobs/categories/{id}:
 *   get:
 *     summary: Get a specific category with its subcategories
 *     tags: [Job Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: include_jobs
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include recent jobs in this category
 *     responses:
 *       200:
 *         description: Category details with subcategories
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobCategory'
 *       404:
 *         description: Category not found
 */
router.get('/categories/:id', [
  param('id').isUUID().withMessage('Invalid category ID'),
  query('include_jobs').optional().isBoolean().toBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const categoryId = req.params.id;
    const includeJobs = req.query.include_jobs === 'true';

    // Get category
    const categoryResult = await dbQuery(
      'SELECT * FROM job_categories WHERE id = $1',
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = categoryResult.rows[0];

    // Get subcategories
    const subcategoriesResult = await dbQuery(
      'SELECT * FROM job_subcategories WHERE category_id = $1 ORDER BY name',
      [categoryId]
    );

    // Get job counts
    const jobCounts = await dbQuery(
      `SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_jobs
       FROM jobs 
       WHERE category_id = $1`,
      [categoryId]
    );

    const result = {
      ...category,
      subcategories: subcategoriesResult.rows,
      job_counts: {
        total_jobs: parseInt(jobCounts.rows[0].total_jobs),
        active_jobs: parseInt(jobCounts.rows[0].active_jobs)
      }
    };

    // Include recent jobs if requested
    if (includeJobs) {
      const jobsResult = await dbQuery(
        `SELECT j.id, j.title, j.company, j.location, j.salary_min, j.salary_max,
                j.salary_currency, j.status, j.created_at,
                (u.first_name || ' ' || u.last_name) as employer_name
         FROM jobs j
         LEFT JOIN users u ON j.employer_id = u.id
         WHERE j.category_id = $1 AND j.status = 'active'
         ORDER BY j.created_at DESC
         LIMIT 10`,
        [categoryId]
      );
      
      result.recent_jobs = jobsResult.rows;
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/jobs/subcategories - Get all subcategories
/**
 * @swagger
 * /jobs/subcategories:
 *   get:
 *     summary: Get all job subcategories
 *     tags: [Job Categories]
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search subcategories by name
 *     responses:
 *       200:
 *         description: List of subcategories
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subcategories:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/JobSubcategory'
 *                 total:
 *                   type: integer
 */
router.get('/subcategories', [
  query('category_id').optional().isUUID(),
  query('search').optional().isString().trim()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category_id, search } = req.query;

    let queryText = 'SELECT sc.*, c.name as category_name FROM job_subcategories sc LEFT JOIN job_categories c ON sc.category_id = c.id';
    const queryParams: any[] = [];
    const conditions: string[] = [];

    if (category_id) {
      conditions.push(`sc.category_id = $${queryParams.length + 1}`);
      queryParams.push(category_id);
    }

    if (search) {
      conditions.push(`sc.name ILIKE $${queryParams.length + 1}`);
      queryParams.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY c.name, sc.name';

    const result = await dbQuery(queryText, queryParams);

    res.json({
      subcategories: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/jobs/subcategories/:id - Get single subcategory
/**
 * @swagger
 * /jobs/subcategories/{id}:
 *   get:
 *     summary: Get a specific subcategory
 *     tags: [Job Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Subcategory details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSubcategory'
 *       404:
 *         description: Subcategory not found
 */
router.get('/subcategories/:id', [
  param('id').isUUID().withMessage('Invalid subcategory ID')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const subcategoryId = req.params.id;

    const result = await dbQuery(
      `SELECT sc.*, c.name as category_name, c.id as category_id
       FROM job_subcategories sc
       LEFT JOIN job_categories c ON sc.category_id = c.id
       WHERE sc.id = $1`,
      [subcategoryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    // Get job counts for this subcategory
    const jobCounts = await dbQuery(
      `SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_jobs
       FROM jobs 
       WHERE subcategory_id = $1`,
      [subcategoryId]
    );

    res.json({
      ...result.rows[0],
      job_counts: {
        total_jobs: parseInt(jobCounts.rows[0].total_jobs),
        active_jobs: parseInt(jobCounts.rows[0].active_jobs)
      }
    });
  } catch (error) {
    console.error('Error fetching subcategory:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================================
// ADMIN ONLY: Category Management
// ============================================================================

// POST /api/jobs/categories - Create new category (Admin only)
/**
 * @swagger
 * /jobs/categories:
 *   post:
 *     summary: Create a new job category (Admin only)
 *     tags: [Job Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobCategory'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       409:
 *         description: Category already exists
 */
router.post('/categories',
  authenticate,
  authorize('ADMIN'),
  [
    body('name').notEmpty().withMessage('Category name is required').trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name } = req.body;

      // Check if category already exists
      const existing = await dbQuery(
        'SELECT id FROM job_categories WHERE name = $1',
        [name]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Category already exists' });
      }

      const result = await dbQuery(
        'INSERT INTO job_categories (name) VALUES ($1) RETURNING *',
        [name]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PUT /api/jobs/categories/:id - Update category (Admin only)
/**
 * @swagger
 * /jobs/categories/{id}:
 *   put:
 *     summary: Update a job category (Admin only)
 *     tags: [Job Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobCategory'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name already exists
 */
router.put('/categories/:id',
  authenticate,
  authorize('ADMIN'),
  param('id').isUUID().withMessage('Invalid category ID'),
  [
    body('name').notEmpty().withMessage('Category name is required').trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const categoryId = req.params.id;
      const { name } = req.body;

      // Check if category exists
      const categoryCheck = await dbQuery(
        'SELECT id FROM job_categories WHERE id = $1',
        [categoryId]
      );

      if (categoryCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Check if new name conflicts with existing category
      const nameCheck = await dbQuery(
        'SELECT id FROM job_categories WHERE name = $1 AND id != $2',
        [name, categoryId]
      );

      if (nameCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Category name already exists' });
      }

      const result = await dbQuery(
        'UPDATE job_categories SET name = $1 WHERE id = $2 RETURNING *',
        [name, categoryId]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /api/jobs/categories/:id - Delete category (Admin only)
/**
 * @swagger
 * /jobs/categories/{id}:
 *   delete:
 *     summary: Delete a job category (Admin only)
 *     tags: [Job Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       400:
 *         description: Category has subcategories or jobs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Category not found
 */
router.delete('/categories/:id',
  authenticate,
  authorize('ADMIN'),
  param('id').isUUID().withMessage('Invalid category ID'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const categoryId = req.params.id;

      // Check if category exists
      const categoryCheck = await dbQuery(
        'SELECT name FROM job_categories WHERE id = $1',
        [categoryId]
      );

      if (categoryCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Check if category has subcategories
      const subcatCheck = await dbQuery(
        'SELECT COUNT(*) as count FROM job_subcategories WHERE category_id = $1',
        [categoryId]
      );

      if (parseInt(subcatCheck.rows[0].count) > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete category that has subcategories',
          subcategory_count: parseInt(subcatCheck.rows[0].count)
        });
      }

      // Check if category has jobs
      const jobsCheck = await dbQuery(
        'SELECT COUNT(*) as count FROM jobs WHERE category_id = $1',
        [categoryId]
      );

      if (parseInt(jobsCheck.rows[0].count) > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete category that has jobs',
          job_count: parseInt(jobsCheck.rows[0].count)
        });
      }

      await dbQuery('DELETE FROM job_categories WHERE id = $1', [categoryId]);

      res.json({ 
        message: 'Category deleted successfully',
        deleted_category: categoryCheck.rows[0].name
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// ADMIN ONLY: Subcategory Management
// ============================================================================

// POST /api/jobs/subcategories - Create new subcategory (Admin only)
/**
 * @swagger
 * /jobs/subcategories:
 *   post:
 *     summary: Create a new job subcategory (Admin only)
 *     tags: [Job Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - name
 *             properties:
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Subcategory created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSubcategory'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Category not found
 *       409:
 *         description: Subcategory already exists in this category
 */
router.post('/subcategories',
  authenticate,
  authorize('ADMIN'),
  [
    body('category_id').isUUID().withMessage('Valid category ID is required'),
    body('name').notEmpty().withMessage('Subcategory name is required').trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { category_id, name } = req.body;

      // Check if category exists
      const categoryCheck = await dbQuery(
        'SELECT id FROM job_categories WHERE id = $1',
        [category_id]
      );

      if (categoryCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Category not found' });
      }

      // Check if subcategory already exists in this category
      const existing = await dbQuery(
        'SELECT id FROM job_subcategories WHERE category_id = $1 AND name = $2',
        [category_id, name]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Subcategory already exists in this category' });
      }

      const result = await dbQuery(
        'INSERT INTO job_subcategories (category_id, name) VALUES ($1, $2) RETURNING *',
        [category_id, name]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating subcategory:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// PUT /api/jobs/subcategories/:id - Update subcategory (Admin only)
/**
 * @swagger
 * /jobs/subcategories/{id}:
 *   put:
 *     summary: Update a job subcategory (Admin only)
 *     tags: [Job Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Subcategory updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JobSubcategory'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Subcategory not found
 */
router.put('/subcategories/:id',
  authenticate,
  authorize('ADMIN'),
  param('id').isUUID().withMessage('Invalid subcategory ID'),
  [
    body('name').optional().notEmpty().withMessage('Subcategory name cannot be empty').trim(),
    body('category_id').optional().isUUID().withMessage('Valid category ID is required')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const subcategoryId = req.params.id;
      const { name, category_id } = req.body;

      // Check if subcategory exists
      const subcatCheck = await dbQuery(
        'SELECT * FROM job_subcategories WHERE id = $1',
        [subcategoryId]
      );

      if (subcatCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Subcategory not found' });
      }

      // Build update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (name) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }

      if (category_id) {
        // Check if new category exists
        const categoryCheck = await dbQuery(
          'SELECT id FROM job_categories WHERE id = $1',
          [category_id]
        );

        if (categoryCheck.rows.length === 0) {
          return res.status(404).json({ error: 'Category not found' });
        }

        updates.push(`category_id = $${paramIndex++}`);
        values.push(category_id);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      values.push(subcategoryId);

      const result = await dbQuery(
        `UPDATE job_subcategories SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating subcategory:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// DELETE /api/jobs/subcategories/:id - Delete subcategory (Admin only)
/**
 * @swagger
 * /jobs/subcategories/{id}:
 *   delete:
 *     summary: Delete a job subcategory (Admin only)
 *     tags: [Job Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Subcategory deleted successfully
 *       400:
 *         description: Subcategory has jobs
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Subcategory not found
 */
router.delete('/subcategories/:id',
  authenticate,
  authorize('ADMIN'),
  param('id').isUUID().withMessage('Invalid subcategory ID'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const subcategoryId = req.params.id;

      // Check if subcategory exists
      const subcatCheck = await dbQuery(
        'SELECT name FROM job_subcategories WHERE id = $1',
        [subcategoryId]
      );

      if (subcatCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Subcategory not found' });
      }

      // Check if subcategory has jobs
      const jobsCheck = await dbQuery(
        'SELECT COUNT(*) as count FROM jobs WHERE subcategory_id = $1',
        [subcategoryId]
      );

      if (parseInt(jobsCheck.rows[0].count) > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete subcategory that has jobs',
          job_count: parseInt(jobsCheck.rows[0].count)
        });
      }

      await dbQuery('DELETE FROM job_subcategories WHERE id = $1', [subcategoryId]);

      res.json({ 
        message: 'Subcategory deleted successfully',
        deleted_subcategory: subcatCheck.rows[0].name
      });
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;