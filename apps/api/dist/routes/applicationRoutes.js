"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const notificationsRoutes_1 = require("./notificationsRoutes");
const router = express_1.default.Router();
// Validation middleware
const validateApplication = [
    (0, express_validator_1.body)('job_id').isUUID().withMessage('Valid job ID is required'),
    (0, express_validator_1.body)('cover_letter').optional().isString().trim(),
    (0, express_validator_1.body)('resume_url').optional().isURL().withMessage('Valid resume URL is required')
];
const validateStatusUpdate = [
    (0, express_validator_1.body)('status').isIn(['pending', 'reviewed', 'accepted', 'rejected']).withMessage('Invalid status'),
    (0, express_validator_1.body)('notes').optional().isString().trim()
];
// Helper function to check if user is HR/Employer
const isHRorEmployer = (user) => {
    return user?.roles?.includes('EMPLOYER') || user?.roles?.includes('ADMIN') || user?.roles?.includes('HR');
};
/**
 * @swagger
 * components:
 *   schemas:
 *     Application:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         job_id:
 *           type: string
 *           format: uuid
 *         applicant_id:
 *           type: string
 *           format: uuid
 *         cover_letter:
 *           type: string
 *         resume_url:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, reviewed, accepted, rejected, withdrawn]
 *         notes:
 *           type: string
 *         reviewed_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         job_title:
 *           type: string
 *         company:
 *           type: string
 *         applicant_name:
 *           type: string
 *         applicant_email:
 *           type: string
 */
/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Job application management endpoints
 */
// ============================================================================
// POST /api/applications - Apply for a job
// ============================================================================
/**
 * @swagger
 * /applications:
 *   post:
 *     summary: Apply for a job
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - job_id
 *             properties:
 *               job_id:
 *                 type: string
 *                 format: uuid
 *               cover_letter:
 *                 type: string
 *               resume_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *       400:
 *         description: Validation error or duplicate application
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Job not found
 *       403:
 *         description: Cannot apply to closed/draft job
 */
router.post('/', auth_1.authenticate, (0, auth_1.authorizePermission)('APPLY_JOB'), validateApplication, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { job_id, cover_letter, resume_url } = req.body;
        const applicant_id = req.user.userId;
        // Check if job exists and is active
        const jobCheck = await (0, database_1.query)('SELECT id, title, status, employer_id FROM jobs WHERE id = $1', [job_id]);
        if (jobCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        const job = jobCheck.rows[0];
        const applicantResult = await (0, database_1.query)(`SELECT
           COALESCE(NULLIF(TRIM(first_name || ' ' || last_name), ''), email, 'A job seeker') AS applicant_name
         FROM users
         WHERE id = $1
         LIMIT 1`, [applicant_id]);
        const applicantName = String(applicantResult.rows[0]?.applicant_name ?? 'A job seeker');
        // Check if job is active
        if (job.status !== 'active') {
            return res.status(403).json({ error: 'Cannot apply to a job that is not active' });
        }
        // Check if user already applied
        const existingApplication = await (0, database_1.query)('SELECT id FROM applications WHERE job_id = $1 AND applicant_id = $2', [job_id, applicant_id]);
        if (existingApplication.rows.length > 0) {
            return res.status(400).json({ error: 'You have already applied to this job' });
        }
        // Check if user is trying to apply to their own job (employers can't apply to their own jobs)
        if (job.employer_id === applicant_id) {
            return res.status(403).json({ error: 'Employers cannot apply to their own jobs' });
        }
        // Start a transaction
        await (0, database_1.query)('BEGIN');
        try {
            // Create application
            const result = await (0, database_1.query)(`INSERT INTO applications (
            job_id, applicant_id, cover_letter, resume_url, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, 'applied', NOW(), NOW())
          RETURNING *`, [job_id, applicant_id, cover_letter, resume_url]);
            // Increment applications count on job if the column exists in this environment.
            // Some databases in this project history do not have jobs.applications_count.
            try {
                await (0, database_1.query)('UPDATE jobs SET applications_count = applications_count + 1 WHERE id = $1', [job_id]);
            }
            catch (countError) {
                if (countError?.code !== '42703') {
                    throw countError;
                }
                console.warn('jobs.applications_count missing; skipping increment');
            }
            await (0, database_1.query)('COMMIT');
            // Get job details for response
            const application = result.rows[0];
            application.job_title = job.title;
            // Notify the employer that a new application was submitted.
            if (job.employer_id) {
                try {
                    await (0, notificationsRoutes_1.createNotification)(job.employer_id, 'application_received', 'New Application Received', `${applicantName} has applied for ${job.title}`, { job_id, application_id: application.id, applicant_id, applicant_name: applicantName, job_title: job.title }, `/app/jobs/${job_id}/applications`, 'high');
                }
                catch (notificationError) {
                    console.error('Failed to create employer notification:', notificationError);
                }
            }
            // Notify admins (users with MANAGE_USERS permission).
            try {
                const adminsResult = await (0, database_1.query)(`SELECT DISTINCT u.id
             FROM users u
             JOIN user_roles ur ON ur.user_id = u.id
             JOIN role_permissions rp ON rp.role_id = ur.role_id
             JOIN permissions p ON p.id = rp.permission_id
             WHERE p.name = 'MANAGE_USERS'
               AND u.is_active = TRUE`);
                const adminIds = adminsResult.rows
                    .map((row) => String(row.id))
                    .filter((id) => id && id !== applicant_id && id !== String(job.employer_id ?? ''));
                await Promise.allSettled(adminIds.map((adminId) => (0, notificationsRoutes_1.createNotification)(adminId, 'application_received', 'New Job Application', `${applicantName} applied for ${job.title}`, { job_id, application_id: application.id, applicant_id, applicant_name: applicantName, job_title: job.title }, `/app/jobs/${job_id}/applications`, 'normal')));
            }
            catch (notificationError) {
                console.error('Failed to create admin notifications:', notificationError);
            }
            // Notify the applicant that submission succeeded.
            try {
                await (0, notificationsRoutes_1.createNotification)(applicant_id, 'application_success', 'Application Submitted', `Your application for ${job.title} has been submitted successfully`, { application_id: application.id, job_id, status: 'applied', job_title: job.title }, '/app/job-applications', 'normal');
            }
            catch (notificationError) {
                console.error('Failed to create applicant submission notification:', notificationError);
            }
            res.status(201).json(application);
        }
        catch (error) {
            await (0, database_1.query)('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Error creating application:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// GET /api/applications - Get my applications (for job seekers)
// ============================================================================
/**
 * @swagger
 * /applications:
 *   get:
 *     summary: Get my applications
 *     description: Get all applications for the logged-in job seeker
 *     tags: [Applications]
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
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth_1.authenticate, [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('status').optional().isIn(['pending', 'reviewed', 'accepted', 'rejected', 'withdrawn']),
    (0, express_validator_1.query)('sort').optional().isIn(['newest', 'oldest'])
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const offset = (page - 1) * limit;
        const applicant_id = req.user.userId;
        let whereConditions = ['a.applicant_id = $1'];
        const queryParams = [applicant_id];
        let paramIndex = 2;
        if (req.query.status) {
            whereConditions.push(`a.status = $${paramIndex}`);
            queryParams.push(req.query.status);
            paramIndex++;
        }
        const whereClause = 'WHERE ' + whereConditions.join(' AND ');
        // Determine sort order
        const sortOrder = req.query.sort === 'oldest' ? 'ASC' : 'DESC';
        // Get total count
        const countResult = await (0, database_1.query)(`SELECT COUNT(*) FROM applications a ${whereClause}`, queryParams);
        const total = parseInt(countResult.rows[0].count);
        // Get applications with job details
        const applications = await (0, database_1.query)(`SELECT a.*, 
          j.title as job_title,
          j.company,
          j.location,
          j.salary_min,
          j.salary_max,
          j.salary_currency,
          j.employment_type,
          j.remote
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         ${whereClause}
         ORDER BY a.created_at ${sortOrder}
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...queryParams, limit, offset]);
        res.json({
            applications: applications.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching applications:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// GET /api/applications/:id - Get application details
// ============================================================================
/**
 * @swagger
 * /applications/{id}:
 *   get:
 *     summary: Get application details
 *     description: Get detailed information about a specific application
 *     tags: [Applications]
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
 *         description: Application details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your application
 *       404:
 *         description: Application not found
 */
router.get('/:id', auth_1.authenticate, (0, express_validator_1.param)('id').isUUID().withMessage('Invalid application ID'), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const applicationId = req.params.id;
        const userId = req.user.userId;
        const userRoles = req.user.roles;
        // Get application with all related details
        const result = await (0, database_1.query)(`SELECT a.*,
          j.title as job_title,
          j.description as job_description,
          j.company,
          j.location,
          j.salary_min,
          j.salary_max,
          j.salary_currency,
          j.experience_level,
          j.employment_type,
          j.remote,
          j.status as job_status,
          j.employer_id,
          u.name as applicant_name,
          u.email as applicant_email,
          u.phone as applicant_phone,
          emp.name as employer_name,
          emp.email as employer_email
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         LEFT JOIN users u ON a.applicant_id = u.id
         LEFT JOIN users emp ON j.employer_id = emp.id
         WHERE a.id = $1`, [applicationId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }
        const application = result.rows[0];
        // Check authorization:
        // - Applicant can view their own application
        // - Employer who posted the job can view applications
        // - Admin/HR can view any application
        const isApplicant = application.applicant_id === userId;
        const isEmployer = application.employer_id === userId;
        const isAdminOrHR = userRoles.includes('ADMIN') || userRoles.includes('HR');
        if (!isApplicant && !isEmployer && !isAdminOrHR) {
            return res.status(403).json({ error: 'You do not have permission to view this application' });
        }
        // Remove sensitive information for applicants
        if (isApplicant && !isEmployer && !isAdminOrHR) {
            delete application.employer_email;
            delete application.employer_name;
            delete application.notes;
        }
        res.json(application);
    }
    catch (error) {
        console.error('Error fetching application:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// PUT /api/applications/:id/status - Update application status (HR/Employer only)
// ============================================================================
/**
 * @swagger
 * /applications/{id}/status:
 *   put:
 *     summary: Update application status
 *     description: Update the status of an application (HR/Employer only)
 *     tags: [Applications]
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, reviewed, accepted, rejected]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Application'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not authorized
 *       404:
 *         description: Application not found
 */
router.put('/:id/status', auth_1.authenticate, (0, auth_1.authorizePermission)('UPDATE_APPLICATION_STATUS'), (0, express_validator_1.param)('id').isUUID().withMessage('Invalid application ID'), validateStatusUpdate, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const applicationId = req.params.id;
        const { status, notes } = req.body;
        const userId = req.user.userId;
        // Check if application exists and get job details
        const appCheck = await (0, database_1.query)(`SELECT a.*, j.employer_id, j.title as job_title
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         WHERE a.id = $1`, [applicationId]);
        if (appCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }
        const application = appCheck.rows[0];
        const hasManageUsers = req.user.permissions?.includes('MANAGE_USERS');
        // Check if user is authorized (employer who posted the job, or permissioned admin)
        if (application.employer_id !== userId && !hasManageUsers) {
            return res.status(403).json({ error: 'Not authorized to update this application' });
        }
        // Check if application is already withdrawn
        if (application.status === 'withdrawn') {
            return res.status(400).json({ error: 'Cannot update a withdrawn application' });
        }
        // Update application
        const result = await (0, database_1.query)(`UPDATE applications 
         SET status = $1, 
             notes = COALESCE($2, notes),
             reviewed_at = CASE WHEN $1 IN ('reviewed', 'accepted', 'rejected') AND status != $1 THEN NOW() ELSE reviewed_at END,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`, [status, notes, applicationId]);
        try {
            await (0, notificationsRoutes_1.createNotification)(application.applicant_id, 'application_update', 'Application Status Update', `Your application for ${application.job_title} has been updated to ${status}`, { application_id: applicationId, job_id: application.job_id, status }, '/app/job-applications', status === 'rejected' ? 'normal' : 'high');
        }
        catch (notificationError) {
            console.error('Failed to create applicant notification:', notificationError);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// DELETE /api/applications/:id - Withdraw application
// ============================================================================
/**
 * @swagger
 * /applications/{id}:
 *   delete:
 *     summary: Withdraw application
 *     description: Withdraw your own application (Job Seeker only)
 *     tags: [Applications]
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
 *         description: Application withdrawn successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 application:
 *                   $ref: '#/components/schemas/Application'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your application
 *       404:
 *         description: Application not found
 *       400:
 *         description: Cannot withdraw application
 */
router.delete('/:id', auth_1.authenticate, (0, express_validator_1.param)('id').isUUID().withMessage('Invalid application ID'), async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const applicationId = req.params.id;
        const userId = req.user.userId;
        // Check if application exists and belongs to user
        const appCheck = await (0, database_1.query)('SELECT * FROM applications WHERE id = $1', [applicationId]);
        if (appCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }
        const application = appCheck.rows[0];
        // Check if user owns this application
        if (application.applicant_id !== userId) {
            return res.status(403).json({ error: 'You can only withdraw your own applications' });
        }
        // Check if application can be withdrawn (only pending or reviewed)
        if (!['pending', 'reviewed'].includes(application.status)) {
            return res.status(400).json({
                error: `Cannot withdraw application with status '${application.status}'`
            });
        }
        // Start transaction
        await (0, database_1.query)('BEGIN');
        try {
            // Update application status to withdrawn instead of deleting
            const result = await (0, database_1.query)(`UPDATE applications 
           SET status = 'withdrawn', updated_at = NOW()
           WHERE id = $1
           RETURNING *`, [applicationId]);
            // Decrement applications count on job
            await (0, database_1.query)('UPDATE jobs SET applications_count = applications_count - 1 WHERE id = $1', [application.job_id]);
            await (0, database_1.query)('COMMIT');
            res.json({
                message: 'Application withdrawn successfully',
                application: result.rows[0]
            });
        }
        catch (error) {
            await (0, database_1.query)('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Error withdrawing application:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// GET /api/applications/employer/jobs - Get applications for employer's jobs
// ============================================================================
/**
 * @swagger
 * /applications/employer/jobs:
 *   get:
 *     summary: Get applications for employer's jobs
 *     description: Get all applications for jobs posted by the logged-in employer
 *     tags: [Applications]
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
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Employer access required
 */
router.get('/employer/jobs', auth_1.authenticate, (0, auth_1.authorize)('EMPLOYER', 'ADMIN', 'HR'), [
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }).toInt(),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    (0, express_validator_1.query)('status').optional().isIn(['pending', 'reviewed', 'accepted', 'rejected', 'withdrawn']),
    (0, express_validator_1.query)('job_id').optional().isUUID()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;
        const offset = (page - 1) * limit;
        const employerId = req.user.userId;
        let whereConditions = ['j.employer_id = $1'];
        const queryParams = [employerId];
        let paramIndex = 2;
        if (req.query.status) {
            whereConditions.push(`a.status = $${paramIndex}`);
            queryParams.push(req.query.status);
            paramIndex++;
        }
        if (req.query.job_id) {
            whereConditions.push(`a.job_id = $${paramIndex}`);
            queryParams.push(req.query.job_id);
            paramIndex++;
        }
        const whereClause = 'WHERE ' + whereConditions.join(' AND ');
        // Get total count
        const countResult = await (0, database_1.query)(`SELECT COUNT(*) 
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         ${whereClause}`, queryParams);
        const total = parseInt(countResult.rows[0].count);
        // Get applications with details
        const applications = await (0, database_1.query)(`SELECT a.*, 
          j.title as job_title,
          j.company,
          j.location,
          u.name as applicant_name,
          u.email as applicant_email
         FROM applications a
         LEFT JOIN jobs j ON a.job_id = j.id
         LEFT JOIN users u ON a.applicant_id = u.id
         ${whereClause}
         ORDER BY a.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...queryParams, limit, offset]);
        res.json({
            applications: applications.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Error fetching employer applications:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=applicationRoutes.js.map