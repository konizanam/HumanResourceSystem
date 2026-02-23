import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { query as dbQuery } from '../config/database';
import { authenticate, authorize, authorizePermission } from '../middleware/auth';
import { Request, Response } from 'express';

const router = express.Router();

// Express Request 'user' type is declared in src/types/index.ts

// Validation middleware
const validateJob = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('company').notEmpty().withMessage('Company is required'),
  body('location').notEmpty().withMessage('Location is required'),
  body('salary_min').isNumeric().withMessage('Minimum salary must be a number'),
  body('salary_max').isNumeric().withMessage('Maximum salary must be a number'),
  body('salary_currency').optional().isString().withMessage('Currency must be a string'),
  body('category').notEmpty().withMessage('Category is required'),
  body('experience_level').isIn(['Entry', 'Intermediate', 'Senior', 'Lead']).withMessage('Invalid experience level'),
  body('employment_type').isIn(['Full-time', 'Part-time', 'Contract', 'Internship']).withMessage('Invalid employment type'),
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

// GET /api/jobs - List all jobs (with employer access)
router.get('/', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status').optional().isIn(['active', 'closed', 'draft']),
  query('my_jobs').optional().isBoolean().toBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = (page - 1) * limit;
    const showMyJobs = req.query.my_jobs === 'true';

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
        whereConditions.push(`employer_id = $${paramIndex}`);
        queryParams.push(req.user.userId);
        paramIndex++;
      }
      // Admins can optionally filter by employer
      else if (req.user.roles.includes('ADMIN') && req.query.employer_id) {
        whereConditions.push(`employer_id = $${paramIndex}`);
        queryParams.push(req.query.employer_id);
        paramIndex++;
      }
    } else {
      // Public view - only show active jobs
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push('active');
      paramIndex++;
    }

    // Add status filter if provided and user is employer/admin
    if (req.query.status && req.user && isEmployerOrAdmin(req.user)) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(req.query.status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countResult = await dbQuery(
      `SELECT COUNT(*) FROM jobs ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated jobs with employer info
    const jobsResult = await dbQuery(
      `SELECT j.*, 
        u.name as employer_name, 
        u.email as employer_email,
        u.company as employer_company,
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
          u.name as applicant_name,
          u.email as applicant_email
         FROM applications a
         JOIN jobs j ON a.job_id = j.id
         JOIN users u ON a.applicant_id = u.id
         WHERE j.employer_id = $1
         ORDER BY a.created_at DESC
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
        u.name as employer_name,
        u.company as employer_company
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
        u.name as employer_name,
        u.company as employer_company
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
router.get('/:id', [
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
        u.name as employer_name,
        u.email as employer_email,
        u.company as employer_company
       FROM jobs j
       LEFT JOIN users u ON j.employer_id = u.id
       WHERE j.id = $1`,
      [req.params.id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobResult.rows[0];

    // Check if user can view this job (public can only view active jobs)
    if (job.status !== 'active' && !req.user?.roles?.includes('EMPLOYER') && !req.user?.roles?.includes('ADMIN')) {
      return res.status(403).json({ error: 'This job is not publicly available' });
    }

    // Check if employer can view their own non-active jobs
    if (job.status !== 'active' && req.user?.roles?.includes('EMPLOYER') && job.employer_id !== req.user.userId) {
      return res.status(403).json({ error: 'You do not have permission to view this job' });
    }

    // Increment view count only for active jobs and public views
    if (job.status === 'active' && !req.user?.roles?.includes('EMPLOYER')) {
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
  authorize('EMPLOYER', 'ADMIN'),
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
        category, experience_level, employment_type,
        remote = false, requirements = [], responsibilities = [],
        benefits = [], application_deadline, status = 'active'
      } = req.body;

      const result = await dbQuery(
        `INSERT INTO jobs (
          title, description, company, location,
          salary_min, salary_max, salary_currency,
          category, experience_level, employment_type,
          remote, requirements, responsibilities, benefits,
          application_deadline, status, employer_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING *`,
        [
          title, description, company, location,
          salary_min, salary_max, salary_currency,
          category, experience_level, employment_type,
          remote, JSON.stringify(requirements), JSON.stringify(responsibilities), JSON.stringify(benefits),
          application_deadline, status, req.user!.userId
        ]
      );

      res.status(201).json(result.rows[0]);
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
        'SELECT employer_id FROM jobs WHERE id = $1',
        [req.params.id]
      );

      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobCheck.rows[0];

      // Check if user is the employer who created the job or an admin
      if (job.employer_id !== req.user!.userId && !req.user!.roles.includes('ADMIN')) {
        return res.status(403).json({ error: 'Not authorized to update this job' });
      }

      const {
        title, description, company, location,
        salary_min, salary_max, salary_currency,
        category, experience_level, employment_type,
        remote, requirements, responsibilities, benefits,
        application_deadline, status
      } = req.body;

      const result = await dbQuery(
        `UPDATE jobs SET
          title = $1, description = $2, company = $3, location = $4,
          salary_min = $5, salary_max = $6, salary_currency = $7,
          category = $8, experience_level = $9, employment_type = $10,
          remote = $11, requirements = $12, responsibilities = $13,
          benefits = $14, application_deadline = $15, status = $16,
          updated_at = NOW()
        WHERE id = $17
        RETURNING *`,
        [
          title, description, company, location,
          salary_min, salary_max, salary_currency,
          category, experience_level, employment_type,
          remote, JSON.stringify(requirements), JSON.stringify(responsibilities),
          JSON.stringify(benefits), application_deadline, status, req.params.id
        ]
      );

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
        return res.json({ 
          message: 'Job has applications, marked as closed instead of deleted',
          job_title: job.title,
          status: 'closed'
        });
      }

      // No applications, safe to delete
      await dbQuery('DELETE FROM jobs WHERE id = $1', [req.params.id]);
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
        `SELECT a.*, 
          u.name as applicant_name, 
          u.email as applicant_email,
          u.phone as applicant_phone,
          u.resume_url as applicant_resume
         FROM applications a
         LEFT JOIN users u ON a.applicant_id = u.id
         ${whereClause}
         ORDER BY a.created_at DESC
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
  body('status').isIn(['pending', 'reviewed', 'accepted', 'rejected']).withMessage('Invalid status'),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
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
      const result = await dbQuery(
        `UPDATE applications 
         SET status = $1, updated_at = NOW()
         WHERE id = $2 AND job_id = $3
         RETURNING *`,
        [req.body.status, req.params.applicationId, req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Application not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;