"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Validation middleware for certifications
const validateCertification = [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Certification name is required').trim(),
    (0, express_validator_1.body)('issuing_organization').notEmpty().withMessage('Issuing organization is required').trim(),
    (0, express_validator_1.body)('issue_date').isISO8601().toDate().withMessage('Valid issue date is required'),
    (0, express_validator_1.body)('expiration_date').optional().isISO8601().toDate(),
    (0, express_validator_1.body)('credential_id').optional().isString().trim(),
    (0, express_validator_1.body)('credential_url').optional().isURL().withMessage('Valid URL is required'),
    (0, express_validator_1.body)('does_not_expire').optional().isBoolean().toBoolean(),
    (0, express_validator_1.body)('description').optional().isString().trim()
];
const validateCertificationId = [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid certification ID')
];
/**
 * @swagger
 * components:
 *   schemas:
 *     Certification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         job_seeker_id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         issuing_organization:
 *           type: string
 *         issue_date:
 *           type: string
 *           format: date
 *         expiration_date:
 *           type: string
 *           format: date
 *         credential_id:
 *           type: string
 *         credential_url:
 *           type: string
 *         does_not_expire:
 *           type: boolean
 *         description:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */
/**
 * @swagger
 * tags:
 *   name: Job Seeker Certifications
 *   description: Certifications management endpoints for job seekers
 */
// ============================================================================
// GET /api/job-seeker/certifications - Get all certifications
// ============================================================================
/**
 * @swagger
 * /job-seeker/certifications:
 *   get:
 *     summary: Get all certifications for the logged-in job seeker
 *     tags: [Job Seeker Certifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: issuer
 *         schema:
 *           type: string
 *         description: Filter by issuing organization
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by certification name
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, expiring_soon]
 *           default: newest
 *     responses:
 *       200:
 *         description: List of certifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 certifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Certification'
 *                 total_count:
 *                   type: integer
 *                 expired_count:
 *                   type: integer
 *                 expiring_soon_count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Job seeker access required
 */
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), [
    (0, express_validator_1.query)('issuer').optional().isString().trim(),
    (0, express_validator_1.query)('search').optional().isString().trim(),
    (0, express_validator_1.query)('sort').optional().isIn(['newest', 'oldest', 'expiring_soon'])
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const jobSeekerId = req.user.userId;
        const { issuer, search, sort = 'newest' } = req.query;
        // Build query
        let queryText = 'SELECT * FROM certifications WHERE job_seeker_id = $1';
        const queryParams = [jobSeekerId];
        let paramIndex = 2;
        if (issuer) {
            queryText += ` AND issuing_organization ILIKE $${paramIndex}`;
            queryParams.push(`%${issuer}%`);
            paramIndex++;
        }
        if (search) {
            queryText += ` AND name ILIKE $${paramIndex}`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        // Add sorting
        switch (sort) {
            case 'oldest':
                queryText += ' ORDER BY issue_date ASC';
                break;
            case 'expiring_soon':
                queryText += ` ORDER BY 
            CASE WHEN does_not_expire THEN 1 ELSE 0 END,
            expiration_date ASC NULLS LAST,
            issue_date DESC`;
                break;
            default: // newest
                queryText += ' ORDER BY issue_date DESC';
        }
        const result = await (0, database_1.query)(queryText, queryParams);
        // Get counts
        const countsResult = await (0, database_1.query)(`SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN expiration_date < NOW() AND NOT does_not_expire THEN 1 END) as expired_count,
          COUNT(CASE 
            WHEN expiration_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' 
            AND NOT does_not_expire 
            THEN 1 END) as expiring_soon_count
         FROM certifications 
         WHERE job_seeker_id = $1`, [jobSeekerId]);
        res.json({
            certifications: result.rows,
            total_count: parseInt(countsResult.rows[0].total),
            expired_count: parseInt(countsResult.rows[0].expired_count),
            expiring_soon_count: parseInt(countsResult.rows[0].expiring_soon_count)
        });
    }
    catch (error) {
        console.error('Error fetching certifications:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// POST /api/job-seeker/certifications - Add a new certification
// ============================================================================
/**
 * @swagger
 * /job-seeker/certifications:
 *   post:
 *     summary: Add a new certification
 *     tags: [Job Seeker Certifications]
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
 *               - issuing_organization
 *               - issue_date
 *             properties:
 *               name:
 *                 type: string
 *               issuing_organization:
 *                 type: string
 *               issue_date:
 *                 type: string
 *                 format: date
 *               expiration_date:
 *                 type: string
 *                 format: date
 *               credential_id:
 *                 type: string
 *               credential_url:
 *                 type: string
 *               does_not_expire:
 *                 type: boolean
 *                 default: false
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Certification added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certification'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Job seeker access required
 */
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), validateCertification, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const jobSeekerId = req.user.userId;
        const { name, issuing_organization, issue_date, expiration_date, credential_id, credential_url, does_not_expire = false, description } = req.body;
        // Validate expiration date logic
        if (!does_not_expire && expiration_date && new Date(expiration_date) <= new Date(issue_date)) {
            return res.status(400).json({
                error: 'Expiration date must be after issue date'
            });
        }
        // Insert new certification
        const result = await (0, database_1.query)(`INSERT INTO certifications (
          job_seeker_id, name, issuing_organization, issue_date, 
          expiration_date, credential_id, credential_url, 
          does_not_expire, description, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *`, [
            jobSeekerId, name, issuing_organization, issue_date,
            does_not_expire ? null : expiration_date,
            credential_id, credential_url, does_not_expire, description
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error adding certification:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// DELETE /api/job-seeker/certifications/:id - Delete a certification
// ============================================================================
/**
 * @swagger
 * /job-seeker/certifications/{id}:
 *   delete:
 *     summary: Delete a certification
 *     tags: [Job Seeker Certifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Certification ID
 *     responses:
 *       200:
 *         description: Certification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deleted_certification:
 *                   $ref: '#/components/schemas/Certification'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your certification
 *       404:
 *         description: Certification not found
 */
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), validateCertificationId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const certificationId = req.params.id;
        const jobSeekerId = req.user.userId;
        // Get certification to check ownership
        const certResult = await (0, database_1.query)('SELECT * FROM certifications WHERE id = $1', [certificationId]);
        if (certResult.rows.length === 0) {
            return res.status(404).json({ error: 'Certification not found' });
        }
        const certification = certResult.rows[0];
        // Check if certification belongs to the job seeker
        if (certification.job_seeker_id !== jobSeekerId) {
            return res.status(403).json({ error: 'You do not have permission to delete this certification' });
        }
        // Delete certification
        await (0, database_1.query)('DELETE FROM certifications WHERE id = $1', [certificationId]);
        res.json({
            message: 'Certification deleted successfully',
            deleted_certification: certification
        });
    }
    catch (error) {
        console.error('Error deleting certification:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// PUT /api/job-seeker/certifications/:id - Update a certification
// ============================================================================
/**
 * @swagger
 * /job-seeker/certifications/{id}:
 *   put:
 *     summary: Update a certification
 *     tags: [Job Seeker Certifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Certification ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               issuing_organization:
 *                 type: string
 *               issue_date:
 *                 type: string
 *                 format: date
 *               expiration_date:
 *                 type: string
 *                 format: date
 *               credential_id:
 *                 type: string
 *               credential_url:
 *                 type: string
 *               does_not_expire:
 *                 type: boolean
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Certification updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certification'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your certification
 *       404:
 *         description: Certification not found
 */
router.put('/:id', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), validateCertificationId, validateCertification, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const certificationId = req.params.id;
        const jobSeekerId = req.user.userId;
        // Check if certification exists and belongs to user
        const checkResult = await (0, database_1.query)('SELECT id FROM certifications WHERE id = $1 AND job_seeker_id = $2', [certificationId, jobSeekerId]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Certification not found' });
        }
        const { name, issuing_organization, issue_date, expiration_date, credential_id, credential_url, does_not_expire, description } = req.body;
        // Validate expiration date logic
        if (!does_not_expire && expiration_date && new Date(expiration_date) <= new Date(issue_date)) {
            return res.status(400).json({
                error: 'Expiration date must be after issue date'
            });
        }
        // Update certification
        const result = await (0, database_1.query)(`UPDATE certifications SET
          name = $1,
          issuing_organization = $2,
          issue_date = $3,
          expiration_date = $4,
          credential_id = $5,
          credential_url = $6,
          does_not_expire = $7,
          description = $8,
          updated_at = NOW()
        WHERE id = $9 AND job_seeker_id = $10
        RETURNING *`, [
            name, issuing_organization, issue_date,
            does_not_expire ? null : expiration_date,
            credential_id, credential_url, does_not_expire,
            description, certificationId, jobSeekerId
        ]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating certification:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=jobSeekerCertificationsRoutes.js.map