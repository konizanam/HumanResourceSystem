import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { query as dbQuery } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { Request, Response } from 'express';

const router = express.Router();



// Validation middleware
const validateUserId = [
  param('id').isUUID().withMessage('Invalid user ID')
];

const validateJobId = [
  param('id').isUUID().withMessage('Invalid job ID')
];

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *           format: email
 *         first_name:
 *           type: string
 *         last_name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [JOB_SEEKER, EMPLOYER, ADMIN, HR]
 *         is_active:
 *           type: boolean
 *         is_blocked:
 *           type: boolean
 *         blocked_at:
 *           type: string
 *           format: date-time
 *         block_reason:
 *           type: string
 *         email_verified:
 *           type: boolean
 *         last_login:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         company_name:
 *           type: string
 *         phone:
 *           type: string
 *         login_count:
 *           type: integer
 *     AdminJob:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         title:
 *           type: string
 *         company:
 *           type: string
 *         employer_id:
 *           type: string
 *           format: uuid
 *         employer_name:
 *           type: string
 *         employer_email:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, closed, draft]
 *         views:
 *           type: integer
 *         applications_count:
 *           type: integer
 *         reports_count:
 *           type: integer
 *         is_featured:
 *           type: boolean
 *         is_flagged:
 *           type: boolean
 *         flag_reason:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     AdminStatistics:
 *       type: object
 *       properties:
 *         users:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             active:
 *               type: integer
 *             blocked:
 *               type: integer
 *             job_seekers:
 *               type: integer
 *             employers:
 *               type: integer
 *             admins:
 *               type: integer
 *             new_today:
 *               type: integer
 *             new_this_week:
 *               type: integer
 *             new_this_month:
 *               type: integer
 *         jobs:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             active:
 *               type: integer
 *             closed:
 *               type: integer
 *             draft:
 *               type: integer
 *             featured:
 *               type: integer
 *             flagged:
 *               type: integer
 *             new_today:
 *               type: integer
 *             new_this_week:
 *               type: integer
 *             total_views:
 *               type: integer
 *             total_applications:
 *               type: integer
 *         applications:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             pending:
 *               type: integer
 *             reviewed:
 *               type: integer
 *             accepted:
 *               type: integer
 *             rejected:
 *               type: integer
 *             withdrawn:
 *               type: integer
 *             new_today:
 *               type: integer
 *         system:
 *           type: object
 *           properties:
 *             api_requests_today:
 *               type: integer
 *             active_sessions:
 *               type: integer
 *             storage_used:
 *               type: string
 *             last_backup:
 *               type: string
 *               format: date-time
 *             version:
 *               type: string
 */

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative endpoints (Admin only)
 */

// ============================================================================
// GET /api/admin/users - Get all users with filters
// ============================================================================
/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Get all users with filters (Admin only)
 *     tags: [Admin]
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
 *         name: role
 *         schema:
 *           type: string
 *           enum: [JOB_SEEKER, EMPLOYER, ADMIN, HR]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, blocked, inactive]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: verified
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, last_login, email, name]
 *           default: created_at
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminUser'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_users:
 *                       type: integer
 *                     active_users:
 *                       type: integer
 *                     blocked_users:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/users',
  authenticate,
  authorize('ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('role').optional().isIn(['JOB_SEEKER', 'EMPLOYER', 'ADMIN', 'HR']),
    query('status').optional().isIn(['active', 'blocked', 'inactive']),
    query('search').optional().isString().trim(),
    query('verified').optional().isBoolean().toBoolean(),
    query('from_date').optional().isISO8601().toDate(),
    query('to_date').optional().isISO8601().toDate(),
    query('sort_by').optional().isIn(['created_at', 'last_login', 'email', 'name']),
    query('sort_order').optional().isIn(['ASC', 'DESC'])
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
      const { role, status, search, verified, from_date, to_date, sort_by = 'created_at', sort_order = 'DESC' } = req.query;

      // Build WHERE clause
      let whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (role) {
        whereConditions.push(`role = $${paramIndex++}`);
        queryParams.push(role);
      }

      if (status === 'blocked') {
        whereConditions.push(`is_blocked = $${paramIndex++}`);
        queryParams.push(true);
      } else if (status === 'active') {
        whereConditions.push(`is_active = $${paramIndex++} AND (is_blocked = $${paramIndex++} OR is_blocked IS NULL)`);
        queryParams.push(true, false);
      } else if (status === 'inactive') {
        whereConditions.push(`is_active = $${paramIndex++}`);
        queryParams.push(false);
      }

      if (verified !== undefined) {
        whereConditions.push(`email_verified = $${paramIndex++}`);
        queryParams.push(verified);
      }

      if (search) {
        whereConditions.push(`(
          email ILIKE $${paramIndex} OR 
          first_name ILIKE $${paramIndex} OR 
          last_name ILIKE $${paramIndex} OR 
          company_name ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (from_date) {
        whereConditions.push(`created_at >= $${paramIndex++}`);
        queryParams.push(from_date);
      }

      if (to_date) {
        whereConditions.push(`created_at <= $${paramIndex++}`);
        queryParams.push(to_date);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ') 
        : '';

      // Get total count
      const countResult = await dbQuery(
        `SELECT COUNT(*) FROM users ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count);

      // Get users
      const usersResult = await dbQuery(
        `SELECT 
          id, email, first_name, last_name, role, is_active, is_blocked,
          blocked_at, block_reason, email_verified, last_login, created_at,
          company_name, phone,
          (SELECT COUNT(*) FROM user_sessions WHERE user_id = users.id) as login_count
         FROM users
         ${whereClause}
         ORDER BY ${sort_by} ${sort_order}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      // Get summary counts
      const summaryResult = await dbQuery(
        `SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = TRUE AND (is_blocked = FALSE OR is_blocked IS NULL) THEN 1 END) as active_users,
          COUNT(CASE WHEN is_blocked = TRUE THEN 1 END) as blocked_users
         FROM users`
      );

      res.json({
        users: usersResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          total_users: parseInt(summaryResult.rows[0].total_users),
          active_users: parseInt(summaryResult.rows[0].active_users),
          blocked_users: parseInt(summaryResult.rows[0].blocked_users)
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// GET /api/admin/users/:id - Get user details
// ============================================================================
/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get detailed user information
 *     tags: [Admin]
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
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminUser'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.get('/users/:id',
  authenticate,
  authorize('ADMIN'),
  validateUserId,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.params.id;

      const result = await dbQuery(
        `SELECT 
          u.id, u.email, u.first_name, u.last_name, u.role, 
          u.is_active, u.is_blocked, u.blocked_at, u.block_reason,
          u.email_verified, u.last_login, u.created_at,
          u.company_name, u.company_description, u.company_website,
          u.company_logo_url, u.company_size, u.industry,
          u.founded_year, u.headquarters_location, u.phone,
          (SELECT COUNT(*) FROM user_sessions WHERE user_id = u.id) as login_count,
          (SELECT COUNT(*) FROM jobs WHERE employer_id = u.id) as jobs_posted,
          (SELECT COUNT(*) FROM applications WHERE applicant_id = u.id) as applications_submitted,
          (SELECT json_agg(json_build_object(
            'id', s.id,
            'name', s.name,
            'proficiency_level', s.proficiency_level
          )) FROM skills s WHERE s.job_seeker_id = u.id) as skills,
          (SELECT json_agg(json_build_object(
            'id', c.id,
            'name', c.name,
            'issuing_organization', c.issuing_organization
          )) FROM certifications c WHERE c.job_seeker_id = u.id) as certifications
         FROM users u
         WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching user details:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// PUT /api/admin/users/:id/block - Block/unblock a user
// ============================================================================
/**
 * @swagger
 * /admin/users/{id}/block:
 *   put:
 *     summary: Block or unblock a user
 *     tags: [Admin]
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
 *               - block
 *             properties:
 *               block:
 *                 type: boolean
 *                 description: true to block, false to unblock
 *               reason:
 *                 type: string
 *                 description: Reason for blocking (required when blocking)
 *     responses:
 *       200:
 *         description: User block status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/AdminUser'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 */
router.put('/users/:id/block',
  authenticate,
  authorize('ADMIN'),
  validateUserId,
  [
    body('block').isBoolean().withMessage('Block status must be a boolean'),
    body('reason').optional().isString().trim()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.params.id;
      const { block, reason } = req.body;

      // Check if user exists
      const userCheck = await dbQuery(
        'SELECT id, role FROM users WHERE id = $1',
        [userId]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userCheck.rows[0];

      // Prevent admin from blocking themselves
      if (user.id === req.user!.userId) {
        return res.status(400).json({ error: 'You cannot block yourself' });
      }

      // Validate reason when blocking
      if (block && !reason) {
        return res.status(400).json({ error: 'Reason is required when blocking a user' });
      }

      // Update user block status
      const result = await dbQuery(
        `UPDATE users 
         SET is_blocked = $1,
             blocked_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
             block_reason = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, email, first_name, last_name, role, is_blocked, blocked_at, block_reason`,
        [block, reason || null, userId]
      );

      // If blocking, invalidate all user sessions
      if (block) {
        await dbQuery(
          'DELETE FROM user_sessions WHERE user_id = $1',
          [userId]
        );
      }

      res.json({
        message: block ? 'User blocked successfully' : 'User unblocked successfully',
        user: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating user block status:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// GET /api/admin/jobs - Get all jobs with filters
// ============================================================================
/**
 * @swagger
 * /admin/jobs:
 *   get:
 *     summary: Get all jobs with filters (Admin only)
 *     tags: [Admin]
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
 *         name: employer_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: flagged
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: featured
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [created_at, views, applications_count]
 *           default: created_at
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminJob'
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_jobs:
 *                       type: integer
 *                     active_jobs:
 *                       type: integer
 *                     flagged_jobs:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/jobs',
  authenticate,
  authorize('ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['active', 'closed', 'draft']),
    query('employer_id').optional().isUUID(),
    query('search').optional().isString().trim(),
    query('flagged').optional().isBoolean().toBoolean(),
    query('featured').optional().isBoolean().toBoolean(),
    query('from_date').optional().isISO8601().toDate(),
    query('to_date').optional().isISO8601().toDate(),
    query('sort_by').optional().isIn(['created_at', 'views', 'applications_count']),
    query('sort_order').optional().isIn(['ASC', 'DESC'])
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
      const { 
        status, employer_id, search, flagged, featured, 
        from_date, to_date, sort_by = 'created_at', sort_order = 'DESC' 
      } = req.query;

      // Build WHERE clause
      let whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (status) {
        whereConditions.push(`j.status = $${paramIndex++}`);
        queryParams.push(status);
      }

      if (employer_id) {
        whereConditions.push(`j.employer_id = $${paramIndex++}`);
        queryParams.push(employer_id);
      }

      if (flagged !== undefined) {
        whereConditions.push(`j.is_flagged = $${paramIndex++}`);
        queryParams.push(flagged);
      }

      if (featured !== undefined) {
        whereConditions.push(`j.is_featured = $${paramIndex++}`);
        queryParams.push(featured);
      }

      if (search) {
        whereConditions.push(`(
          j.title ILIKE $${paramIndex} OR 
          j.description ILIKE $${paramIndex} OR 
          j.company ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (from_date) {
        whereConditions.push(`j.created_at >= $${paramIndex++}`);
        queryParams.push(from_date);
      }

      if (to_date) {
        whereConditions.push(`j.created_at <= $${paramIndex++}`);
        queryParams.push(to_date);
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

      // Get jobs
      const jobsResult = await dbQuery(
        `SELECT 
          j.*,
          u.email as employer_email,
          u.first_name || ' ' || u.last_name as employer_name,
          (SELECT COUNT(*) FROM reports WHERE job_id = j.id) as reports_count
         FROM jobs j
         LEFT JOIN users u ON j.employer_id = u.id
         ${whereClause}
         ORDER BY ${sort_by} ${sort_order}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      // Get summary counts
      const summaryResult = await dbQuery(
        `SELECT 
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_jobs,
          COUNT(CASE WHEN is_flagged = TRUE THEN 1 END) as flagged_jobs
         FROM jobs`
      );

      res.json({
        jobs: jobsResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        summary: {
          total_jobs: parseInt(summaryResult.rows[0].total_jobs),
          active_jobs: parseInt(summaryResult.rows[0].active_jobs),
          flagged_jobs: parseInt(summaryResult.rows[0].flagged_jobs)
        }
      });
    } catch (error) {
      console.error('Error fetching jobs:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// DELETE /api/admin/jobs/:id - Delete a job
// ============================================================================
/**
 * @swagger
 * /admin/jobs/{id}:
 *   delete:
 *     summary: Delete a job (Admin only)
 *     tags: [Admin]
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
 *         description: Job deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 job:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Job not found
 */
router.delete('/jobs/:id',
  authenticate,
  authorize('ADMIN'),
  validateJobId,
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const jobId = req.params.id;

      // Check if job exists
      const jobCheck = await dbQuery(
        'SELECT id, title, employer_id FROM jobs WHERE id = $1',
        [jobId]
      );

      if (jobCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      const job = jobCheck.rows[0];

      // Start transaction
      await dbQuery('BEGIN');

      try {
        // Delete related applications first
        await dbQuery('DELETE FROM applications WHERE job_id = $1', [jobId]);

        // Delete the job
        await dbQuery('DELETE FROM jobs WHERE id = $1', [jobId]);

        await dbQuery('COMMIT');

        // Log the action
        await dbQuery(
          `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, created_at)
           VALUES ($1, 'DELETE_JOB', 'job', $2, $3, NOW())`,
          [req.user!.userId, jobId, JSON.stringify({ title: job.title, employer_id: job.employer_id })]
        );

        res.json({
          message: 'Job deleted successfully',
          job: {
            id: job.id,
            title: job.title
          }
        });
      } catch (error) {
        await dbQuery('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// GET /api/admin/statistics - Get system statistics
// ============================================================================
/**
 * @swagger
 * /admin/statistics:
 *   get:
 *     summary: Get system statistics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: System statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminStatistics'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/statistics',
  authenticate,
  authorize('ADMIN'),
  [
    query('from_date').optional().isISO8601().toDate(),
    query('to_date').optional().isISO8601().toDate()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { from_date, to_date } = req.query;

      // User statistics
      const userStats = await dbQuery(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = TRUE AND (is_blocked = FALSE OR is_blocked IS NULL) THEN 1 END) as active,
          COUNT(CASE WHEN is_blocked = TRUE THEN 1 END) as blocked,
          COUNT(CASE WHEN role = 'JOB_SEEKER' THEN 1 END) as job_seekers,
          COUNT(CASE WHEN role = 'EMPLOYER' THEN 1 END) as employers,
          COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins,
          COUNT(CASE WHEN role = 'HR' THEN 1 END) as hr,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_this_week,
          COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as new_this_month
         FROM users`
      );

      // Job statistics
      const jobStats = await dbQuery(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
          COUNT(CASE WHEN is_featured = TRUE THEN 1 END) as featured,
          COUNT(CASE WHEN is_flagged = TRUE THEN 1 END) as flagged,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_today,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_this_week,
          COALESCE(SUM(views), 0) as total_views,
          (SELECT COUNT(*) FROM applications) as total_applications
         FROM jobs`
      );

      // Application statistics
      const appStats = await dbQuery(
        `SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'reviewed' THEN 1 END) as reviewed,
          COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN status = 'withdrawn' THEN 1 END) as withdrawn,
          COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_today
         FROM applications`
      );

      // Activity statistics
      const activityStats = await dbQuery(
        `SELECT 
          0 as api_requests_today,
          COUNT(DISTINCT user_id) as active_sessions
         FROM user_sessions`
      );

      // Date range specific statistics
      let dateRangeStats = null;
      if (from_date && to_date) {
        dateRangeStats = await dbQuery(
          `SELECT 
            (SELECT COUNT(*) FROM users WHERE created_at BETWEEN $1 AND $2) as users_created,
            (SELECT COUNT(*) FROM jobs WHERE created_at BETWEEN $1 AND $2) as jobs_created,
            (SELECT COUNT(*) FROM applications WHERE created_at BETWEEN $1 AND $2) as applications_created
           FROM (SELECT 1) t`,
          [from_date, to_date]
        );
      }

      // System information
      const systemInfo = {
        api_requests_today: parseInt(activityStats.rows[0].api_requests_today),
        active_sessions: parseInt(activityStats.rows[0].active_sessions),
        storage_used: await getStorageUsed(),
        last_backup: await getLastBackupTime(),
        version: process.env.npm_package_version || '1.0.0'
      };

      res.json({
        users: {
          total: parseInt(userStats.rows[0].total),
          active: parseInt(userStats.rows[0].active),
          blocked: parseInt(userStats.rows[0].blocked),
          job_seekers: parseInt(userStats.rows[0].job_seekers),
          employers: parseInt(userStats.rows[0].employers),
          admins: parseInt(userStats.rows[0].admins),
          hr: parseInt(userStats.rows[0].hr),
          new_today: parseInt(userStats.rows[0].new_today),
          new_this_week: parseInt(userStats.rows[0].new_this_week),
          new_this_month: parseInt(userStats.rows[0].new_this_month),
          ...(dateRangeStats && {
            created_in_range: parseInt(dateRangeStats.rows[0].users_created)
          })
        },
        jobs: {
          total: parseInt(jobStats.rows[0].total),
          active: parseInt(jobStats.rows[0].active),
          closed: parseInt(jobStats.rows[0].closed),
          draft: parseInt(jobStats.rows[0].draft),
          featured: parseInt(jobStats.rows[0].featured),
          flagged: parseInt(jobStats.rows[0].flagged),
          new_today: parseInt(jobStats.rows[0].new_today),
          new_this_week: parseInt(jobStats.rows[0].new_this_week),
          total_views: parseInt(jobStats.rows[0].total_views),
          total_applications: parseInt(jobStats.rows[0].total_applications),
          ...(dateRangeStats && {
            created_in_range: parseInt(dateRangeStats.rows[0].jobs_created)
          })
        },
        applications: {
          total: parseInt(appStats.rows[0].total),
          pending: parseInt(appStats.rows[0].pending),
          reviewed: parseInt(appStats.rows[0].reviewed),
          accepted: parseInt(appStats.rows[0].accepted),
          rejected: parseInt(appStats.rows[0].rejected),
          withdrawn: parseInt(appStats.rows[0].withdrawn),
          new_today: parseInt(appStats.rows[0].new_today),
          ...(dateRangeStats && {
            created_in_range: parseInt(dateRangeStats.rows[0].applications_created)
          })
        },
        system: systemInfo
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// GET /api/admin/audit-logs - Get admin action logs
// ============================================================================
/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     summary: Get admin action logs
 *     tags: [Admin]
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
 *         name: admin_id
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: target_type
 *         schema:
 *           type: string
 *           enum: [user, job, application, company]
 *     responses:
 *       200:
 *         description: Audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       admin_id:
 *                         type: string
 *                       admin_name:
 *                         type: string
 *                       action:
 *                         type: string
 *                       target_type:
 *                         type: string
 *                       target_id:
 *                         type: string
 *                       details:
 *                         type: object
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/audit-logs',
  authenticate,
  authorize('ADMIN'),
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('admin_id').optional().isUUID(),
    query('action').optional().isString(),
    query('target_type').optional().isIn(['user', 'job', 'application', 'company'])
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
      const { admin_id, action, target_type } = req.query;

      // Build WHERE clause
      let whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (admin_id) {
        whereConditions.push(`admin_id = $${paramIndex++}`);
        queryParams.push(admin_id);
      }

      if (action) {
        whereConditions.push(`action = $${paramIndex++}`);
        queryParams.push(action);
      }

      if (target_type) {
        whereConditions.push(`target_type = $${paramIndex++}`);
        queryParams.push(target_type);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ') 
        : '';

      // Get total count
      const countResult = await dbQuery(
        `SELECT COUNT(*) FROM admin_logs ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count);

      // Get logs
      const logsResult = await dbQuery(
        `SELECT 
          l.*,
          u.email as admin_email,
          u.first_name || ' ' || u.last_name as admin_name
         FROM admin_logs l
         LEFT JOIN users u ON l.admin_id = u.id
         ${whereClause}
         ORDER BY l.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      res.json({
        logs: logsResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// POST /api/admin/jobs/:id/feature - Feature/unfeature a job
// ============================================================================
/**
 * @swagger
 * /admin/jobs/{id}/feature:
 *   post:
 *     summary: Feature or unfeature a job
 *     tags: [Admin]
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
 *               - featured
 *             properties:
 *               featured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Job feature status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Job not found
 */
router.post('/jobs/:id/feature',
  authenticate,
  authorize('ADMIN'),
  validateJobId,
  [
    body('featured').isBoolean().withMessage('Featured status must be a boolean')
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const jobId = req.params.id;
      const { featured } = req.body;

      const result = await dbQuery(
        `UPDATE jobs 
         SET is_featured = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, title, is_featured`,
        [featured, jobId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      // Log the action
      await dbQuery(
        `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, created_at)
         VALUES ($1, $2, 'job', $3, $4, NOW())`,
        [req.user!.userId, featured ? 'FEATURE_JOB' : 'UNFEATURE_JOB', jobId, JSON.stringify({ title: result.rows[0].title })]
      );

      res.json({
        message: featured ? 'Job featured successfully' : 'Job unfeatured successfully',
        job: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating job feature status:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// ============================================================================
// Helper functions
// ============================================================================

async function getStorageUsed(): Promise<string> {
  try {
    // This would need to be implemented based on your storage solution
    // For example, if using AWS S3, you'd sum up file sizes
    return '2.3 GB';
  } catch (error) {
    return 'Unknown';
  }
}

async function getLastBackupTime(): Promise<string | null> {
  try {
    // This would need to be implemented based on your backup system
    const result = await dbQuery(
      'SELECT created_at FROM backups ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0]?.created_at || null;
  } catch (error) {
    return null;
  }
}

export default router;