import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { query as dbQuery } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = express.Router();



// Validation middleware
const validateEmployerRegistration = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  body('company_name').notEmpty().withMessage('Company name is required').trim(),
  body('company_description').optional().isString().trim(),
  body('company_website').optional().isURL().withMessage('Valid website URL is required'),
  body('company_size').optional().isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']),
  body('industry').optional().isString().trim(),
  body('founded_year').optional().isInt({ min: 1800, max: new Date().getFullYear() }),
  body('headquarters_location').optional().isString().trim(),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number is required'),
  body('firstName').notEmpty().withMessage('First name is required').trim(),
  body('lastName').notEmpty().withMessage('Last name is required').trim()
];

const validateEmployerProfile = [
  body('company_name').optional().notEmpty().withMessage('Company name cannot be empty').trim(),
  body('company_description').optional().isString().trim(),
  body('company_website').optional().isURL().withMessage('Valid website URL is required'),
  body('company_size').optional().isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']),
  body('industry').optional().isString().trim(),
  body('founded_year').optional().isInt({ min: 1800, max: new Date().getFullYear() }),
  body('headquarters_location').optional().isString().trim(),
  body('phone').optional().isMobilePhone('any').withMessage('Valid phone number is required'),
  body('company_logo_url').optional().isURL().withMessage('Valid logo URL is required')
];

/**
 * @swagger
 * components:
 *   schemas:
 *     EmployerProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         company_name:
 *           type: string
 *         company_description:
 *           type: string
 *         company_website:
 *           type: string
 *         company_logo_url:
 *           type: string
 *         company_size:
 *           type: string
 *           enum: [1-10, 11-50, 51-200, 201-500, 501-1000, 1000+]
 *         industry:
 *           type: string
 *         founded_year:
 *           type: integer
 *         headquarters_location:
 *           type: string
 *         phone:
 *           type: string
 *         is_verified:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     EmployerStats:
 *       type: object
 *       properties:
 *         total_jobs_posted:
 *           type: integer
 *         active_jobs:
 *           type: integer
 *         total_applications_received:
 *           type: integer
 *         total_views:
 *           type: integer
 *         average_response_time:
 *           type: integer
 *         last_active:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Employers
 *   description: Employer management endpoints
 */

// ============================================================================
// POST /api/employers/register - Register a new employer
// ============================================================================
/**
 * @swagger
 * /employers/register:
 *   post:
 *     summary: Register a new employer account
 *     tags: [Employers]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - confirmPassword
 *               - company_name
 *               - firstName
 *               - lastName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               company_name:
 *                 type: string
 *               company_description:
 *                 type: string
 *               company_website:
 *                 type: string
 *               company_size:
 *                 type: string
 *                 enum: [1-10, 11-50, 51-200, 201-500, 501-1000, 1000+]
 *               industry:
 *                 type: string
 *               founded_year:
 *                 type: integer
 *               headquarters_location:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employer registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 employer:
 *                   $ref: '#/components/schemas/EmployerProfile'
 *                 token:
 *                   type: string
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already registered
 */
router.post('/register',
  validateEmployerRegistration,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        email, password, firstName, lastName, company_name,
        company_description, company_website, company_size,
        industry, founded_year, headquarters_location, phone
      } = req.body;

      // Check if user already exists
      const existingUser = await dbQuery(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Start transaction
      await dbQuery('BEGIN');

      try {
        // Create user with employer role
        const userResult = await dbQuery(
          `INSERT INTO users (
            email, password, first_name, last_name, role,
            company_name, company_description, company_website,
            company_size, industry, founded_year, headquarters_location,
            phone, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          RETURNING id, email, first_name, last_name, company_name, created_at`,
          [
            email, hashedPassword, firstName, lastName, 'EMPLOYER',
            company_name, company_description, company_website,
            company_size, industry, founded_year, headquarters_location, phone
          ]
        );

        const employer = userResult.rows[0];

        // Create employer stats
        await dbQuery(
          `INSERT INTO employer_stats (employer_id, last_active, updated_at)
           VALUES ($1, NOW(), NOW())`,
          [employer.id]
        );

        // Generate JWT token (you'll need to implement this)
        const token = generateJWTToken(employer.id, employer.email, ['EMPLOYER']);

        await dbQuery('COMMIT');

        res.status(201).json({
          message: 'Employer registered successfully',
          employer: {
            id: employer.id,
            email: employer.email,
            firstName: employer.first_name,
            lastName: employer.last_name,
            company_name: employer.company_name,
            created_at: employer.created_at
          },
          token
        });
      } catch (error) {
        await dbQuery('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error registering employer:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// GET /api/employers/profile - Get employer profile
// ============================================================================
/**
 * @swagger
 * /employers/profile:
 *   get:
 *     summary: Get employer profile
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employer profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile:
 *                   $ref: '#/components/schemas/EmployerProfile'
 *                 stats:
 *                   $ref: '#/components/schemas/EmployerStats'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Employer access required
 *       404:
 *         description: Employer not found
 */
router.get('/profile',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const employerId = req.user!.userId;

      // Get employer profile
      const profileResult = await dbQuery(
        `SELECT id, email, first_name, last_name, 
          company_name, company_description, company_website,
          company_logo_url, company_size, industry, founded_year,
          headquarters_location, phone, is_verified, created_at, updated_at
         FROM users
         WHERE id = $1 AND role = 'EMPLOYER'`,
        [employerId]
      );

      if (profileResult.rows.length === 0) {
        return res.status(404).json({ error: 'Employer not found' });
      }

      // Get employer stats
      const statsResult = await dbQuery(
        `SELECT * FROM employer_stats WHERE employer_id = $1`,
        [employerId]
      );

      const profile = profileResult.rows[0];
      
      // Format response
      const formattedProfile = {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        company_name: profile.company_name,
        company_description: profile.company_description,
        company_website: profile.company_website,
        company_logo_url: profile.company_logo_url,
        company_size: profile.company_size,
        industry: profile.industry,
        founded_year: profile.founded_year,
        headquarters_location: profile.headquarters_location,
        phone: profile.phone,
        is_verified: profile.is_verified,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };

      res.json({
        profile: formattedProfile,
        stats: statsResult.rows[0] || null
      });
    } catch (error) {
      console.error('Error fetching employer profile:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// PUT /api/employers/profile - Update employer profile
// ============================================================================
/**
 * @swagger
 * /employers/profile:
 *   put:
 *     summary: Update employer profile
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               company_name:
 *                 type: string
 *               company_description:
 *                 type: string
 *               company_website:
 *                 type: string
 *               company_logo_url:
 *                 type: string
 *               company_size:
 *                 type: string
 *                 enum: [1-10, 11-50, 51-200, 201-500, 501-1000, 1000+]
 *               industry:
 *                 type: string
 *               founded_year:
 *                 type: integer
 *               headquarters_location:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployerProfile'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Employer access required
 *       404:
 *         description: Employer not found
 */
router.put('/profile',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  validateEmployerProfile,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const employerId = req.user!.userId;
      const {
        firstName, lastName, company_name, company_description,
        company_website, company_logo_url, company_size, industry,
        founded_year, headquarters_location, phone
      } = req.body;

      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (firstName) {
        updateFields.push(`first_name = $${paramIndex++}`);
        values.push(firstName);
      }
      if (lastName) {
        updateFields.push(`last_name = $${paramIndex++}`);
        values.push(lastName);
      }
      if (company_name) {
        updateFields.push(`company_name = $${paramIndex++}`);
        values.push(company_name);
      }
      if (company_description !== undefined) {
        updateFields.push(`company_description = $${paramIndex++}`);
        values.push(company_description);
      }
      if (company_website !== undefined) {
        updateFields.push(`company_website = $${paramIndex++}`);
        values.push(company_website);
      }
      if (company_logo_url !== undefined) {
        updateFields.push(`company_logo_url = $${paramIndex++}`);
        values.push(company_logo_url);
      }
      if (company_size) {
        updateFields.push(`company_size = $${paramIndex++}`);
        values.push(company_size);
      }
      if (industry) {
        updateFields.push(`industry = $${paramIndex++}`);
        values.push(industry);
      }
      if (founded_year) {
        updateFields.push(`founded_year = $${paramIndex++}`);
        values.push(founded_year);
      }
      if (headquarters_location) {
        updateFields.push(`headquarters_location = $${paramIndex++}`);
        values.push(headquarters_location);
      }
      if (phone) {
        updateFields.push(`phone = $${paramIndex++}`);
        values.push(phone);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Add updated_at
      updateFields.push(`updated_at = NOW()`);

      // Add employerId to values
      values.push(employerId);

      const result = await dbQuery(
        `UPDATE users 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex} AND role = 'EMPLOYER'
         RETURNING id, email, first_name, last_name, 
          company_name, company_description, company_website,
          company_logo_url, company_size, industry, founded_year,
          headquarters_location, phone, is_verified, created_at, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Employer not found' });
      }

      const profile = result.rows[0];
      
      // Format response
      const formattedProfile = {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        company_name: profile.company_name,
        company_description: profile.company_description,
        company_website: profile.company_website,
        company_logo_url: profile.company_logo_url,
        company_size: profile.company_size,
        industry: profile.industry,
        founded_year: profile.founded_year,
        headquarters_location: profile.headquarters_location,
        phone: profile.phone,
        is_verified: profile.is_verified,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      };

      // Update last_active in stats
      await dbQuery(
        'UPDATE employer_stats SET last_active = NOW(), updated_at = NOW() WHERE employer_id = $1',
        [employerId]
      );

      res.json(formattedProfile);
    } catch (error) {
      console.error('Error updating employer profile:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// GET /api/employers/jobs - Get employer's jobs
// ============================================================================
/**
 * @swagger
 * /employers/jobs:
 *   get:
 *     summary: Get employer's jobs
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, closed, draft]
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, most_viewed, most_applied]
 *           default: newest
 *     responses:
 *       200:
 *         description: List of employer's jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_jobs:
 *                       type: integer
 *                     active_jobs:
 *                       type: integer
 *                     draft_jobs:
 *                       type: integer
 *                     closed_jobs:
 *                       type: integer
 *                     total_applications:
 *                       type: integer
 *                     total_views:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Employer access required
 */
router.get('/jobs',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['active', 'closed', 'draft']),
    query('sort').optional().isIn(['newest', 'oldest', 'most_viewed', 'most_applied'])
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const employerId = req.user!.userId;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = (page - 1) * limit;
      const status = req.query.status;
      const sort = req.query.sort || 'newest';

      // Build WHERE clause
      let whereConditions = ['employer_id = $1'];
      const queryParams: any[] = [employerId];
      let paramIndex = 2;

      if (status) {
        whereConditions.push(`status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      // Determine sort order
      let orderBy = 'created_at DESC';
      switch (sort) {
        case 'oldest':
          orderBy = 'created_at ASC';
          break;
        case 'most_viewed':
          orderBy = 'views DESC';
          break;
        case 'most_applied':
          orderBy = 'applications_count DESC';
          break;
        default:
          orderBy = 'created_at DESC';
      }

      // Get total count
      const countResult = await dbQuery(
        `SELECT COUNT(*) FROM jobs ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count);

      // Get jobs with application stats
      const jobsResult = await dbQuery(
        `SELECT j.*,
          COUNT(a.id) as total_applications,
          COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_applications,
          COUNT(CASE WHEN a.status = 'reviewed' THEN 1 END) as reviewed_applications,
          COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_applications,
          COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_applications
         FROM jobs j
         LEFT JOIN applications a ON j.id = a.job_id
         ${whereClause}
         GROUP BY j.id
         ORDER BY ${orderBy}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      // Get summary stats
      const summaryResult = await dbQuery(
        `SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_jobs,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_jobs,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_jobs,
          COALESCE(SUM(applications_count), 0) as total_applications,
          COALESCE(SUM(views), 0) as total_views
         FROM jobs
         WHERE employer_id = $1`,
        [employerId]
      );

      res.json({
        jobs: jobsResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: summaryResult.rows[0]
      });
    } catch (error) {
      console.error('Error fetching employer jobs:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// GET /api/employers/applications - Get all applications for employer's jobs
// ============================================================================
/**
 * @swagger
 * /employers/applications:
 *   get:
 *     summary: Get all applications for employer's jobs
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed, accepted, rejected, withdrawn]
 *       - in: query
 *         name: job_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by specific job
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *     responses:
 *       200:
 *         description: List of applications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 applications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Application'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_applications:
 *                       type: integer
 *                     pending:
 *                       type: integer
 *                     reviewed:
 *                       type: integer
 *                     accepted:
 *                       type: integer
 *                     rejected:
 *                       type: integer
 *                     withdrawn:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Employer access required
 */
router.get('/applications',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['pending', 'reviewed', 'accepted', 'rejected', 'withdrawn']),
    query('job_id').optional().isUUID(),
    query('sort').optional().isIn(['newest', 'oldest'])
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const employerId = req.user!.userId;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = (page - 1) * limit;
      const status = req.query.status;
      const jobId = req.query.job_id;
      const sort = req.query.sort || 'newest';

      // Build WHERE clause
      let whereConditions = ['j.employer_id = $1'];
      const queryParams: any[] = [employerId];
      let paramIndex = 2;

      if (status) {
        whereConditions.push(`a.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (jobId) {
        whereConditions.push(`a.job_id = $${paramIndex}`);
        queryParams.push(jobId);
        paramIndex++;
      }

      const whereClause = 'WHERE ' + whereConditions.join(' AND ');

      // Determine sort order
      const sortOrder = sort === 'oldest' ? 'ASC' : 'DESC';

      // Get total count
      const countResult = await dbQuery(
        `SELECT COUNT(*) 
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count);

      // Get applications with details
      const applicationsResult = await dbQuery(
        `SELECT a.*,
          j.title as job_title,
          j.company,
          j.location,
          u.first_name,
          u.last_name,
          u.email as applicant_email,
          u.phone as applicant_phone
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         LEFT JOIN users u ON a.applicant_id = u.id
         ${whereClause}
         ORDER BY a.created_at ${sortOrder}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      // Get summary stats
      const summaryResult = await dbQuery(
        `SELECT 
          COUNT(*) as total_applications,
          COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN a.status = 'reviewed' THEN 1 END) as reviewed,
          COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted,
          COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN a.status = 'withdrawn' THEN 1 END) as withdrawn
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         WHERE j.employer_id = $1`,
        [employerId]
      );

      // Format applications
      const applications = applicationsResult.rows.map(app => ({
        ...app,
        applicant_name: `${app.first_name} ${app.last_name}`.trim(),
        first_name: undefined,
        last_name: undefined
      }));

      res.json({
        applications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: summaryResult.rows[0]
      });
    } catch (error) {
      console.error('Error fetching employer applications:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// GET /api/employers/dashboard - Employer dashboard with overview
// ============================================================================
/**
 * @swagger
 * /employers/dashboard:
 *   get:
 *     summary: Get employer dashboard overview
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profile:
 *                   $ref: '#/components/schemas/EmployerProfile'
 *                 stats:
 *                   $ref: '#/components/schemas/EmployerStats'
 *                 recent_jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *                 recent_applications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Application'
 *                 chart_data:
 *                   type: object
 *                   properties:
 *                     applications_over_time:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     jobs_by_status:
 *                       type: object
 *                       properties:
 *                         active:
 *                           type: integer
 *                         draft:
 *                           type: integer
 *                         closed:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Employer access required
 */
router.get('/dashboard',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  async (req: Request, res: Response) => {
    try {
      const employerId = req.user!.userId;

      // Get employer profile
      const profileResult = await dbQuery(
        `SELECT id, email, first_name, last_name, company_name, company_logo_url
         FROM users WHERE id = $1`,
        [employerId]
      );

      // Get employer stats
      const statsResult = await dbQuery(
        `SELECT * FROM employer_stats WHERE employer_id = $1`,
        [employerId]
      );

      // Get recent jobs (last 5)
      const recentJobsResult = await dbQuery(
        `SELECT id, title, status, views, applications_count, created_at
         FROM jobs
         WHERE employer_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [employerId]
      );

      // Get recent applications (last 10)
      const recentApplicationsResult = await dbQuery(
        `SELECT a.*, j.title as job_title, u.first_name, u.last_name
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         LEFT JOIN users u ON a.applicant_id = u.id
         WHERE j.employer_id = $1
         ORDER BY a.created_at DESC
         LIMIT 10`,
        [employerId]
      );

      // Get applications over time (last 30 days)
      const appsOverTimeResult = await dbQuery(
        `SELECT DATE(a.created_at) as date, COUNT(*) as count
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         WHERE j.employer_id = $1
           AND a.created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(a.created_at)
         ORDER BY date`,
        [employerId]
      );

      // Get jobs by status
      const jobsByStatusResult = await dbQuery(
        `SELECT status, COUNT(*) as count
         FROM jobs
         WHERE employer_id = $1
         GROUP BY status`,
        [employerId]
      );

      const jobsByStatus: any = { active: 0, draft: 0, closed: 0 };
      jobsByStatusResult.rows.forEach(row => {
        jobsByStatus[row.status] = parseInt(row.count);
      });

      // Format recent applications
      const recentApplications = recentApplicationsResult.rows.map(app => ({
        ...app,
        applicant_name: `${app.first_name} ${app.last_name}`.trim(),
        first_name: undefined,
        last_name: undefined
      }));

      res.json({
        profile: profileResult.rows[0],
        stats: statsResult.rows[0] || null,
        recent_jobs: recentJobsResult.rows,
        recent_applications: recentApplications,
        chart_data: {
          applications_over_time: appsOverTimeResult.rows,
          jobs_by_status: jobsByStatus
        }
      });
    } catch (error) {
      console.error('Error fetching employer dashboard:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Helper function to generate JWT token (implement this based on your auth system)
function generateJWTToken(userId: string, email: string, roles: string[]): string {
  // This should match your existing JWT implementation
  // Example using jsonwebtoken:
  // return jwt.sign({ userId, email, roles }, process.env.JWT_SECRET!, { expiresIn: '7d' });
  return 'token'; // Replace with actual implementation
}

export default router;