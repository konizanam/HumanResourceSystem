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
// Validation middleware for skills
const validateSkill = [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Skill name is required').trim(),
    (0, express_validator_1.body)('proficiency_level').optional().isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
    (0, express_validator_1.body)('years_of_experience').optional().isInt({ min: 0, max: 50 }).toInt(),
    (0, express_validator_1.body)('is_primary').optional().isBoolean().toBoolean()
];
const validateSkillId = [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid skill ID')
];
/**
 * @swagger
 * components:
 *   schemas:
 *     Skill:
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
 *         proficiency_level:
 *           type: string
 *           enum: [Beginner, Intermediate, Advanced, Expert]
 *         years_of_experience:
 *           type: integer
 *         is_primary:
 *           type: boolean
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
 *   name: Job Seeker Skills
 *   description: Skills management endpoints for job seekers
 */
// ============================================================================
// GET /api/job-seeker/skills - Get all skills for the logged-in job seeker
// ============================================================================
/**
 * @swagger
 * /job-seeker/skills:
 *   get:
 *     summary: Get all skills for the logged-in job seeker
 *     tags: [Job Seeker Skills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: proficiency
 *         schema:
 *           type: string
 *           enum: [Beginner, Intermediate, Advanced, Expert]
 *         description: Filter by proficiency level
 *       - in: query
 *         name: is_primary
 *         schema:
 *           type: boolean
 *         description: Filter by primary skills
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search skills by name
 *     responses:
 *       200:
 *         description: List of skills
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 skills:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Skill'
 *                 total_count:
 *                   type: integer
 *                 primary_count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Job seeker access required
 */
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), [
    (0, express_validator_1.query)('proficiency').optional().isIn(['Beginner', 'Intermediate', 'Advanced', 'Expert']),
    (0, express_validator_1.query)('is_primary').optional().isBoolean().toBoolean(),
    (0, express_validator_1.query)('search').optional().isString().trim()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const jobSeekerId = req.user.userId;
        const { proficiency, is_primary, search } = req.query;
        // Build query
        let queryText = 'SELECT * FROM skills WHERE job_seeker_id = $1';
        const queryParams = [jobSeekerId];
        let paramIndex = 2;
        if (proficiency) {
            queryText += ` AND proficiency_level = $${paramIndex}`;
            queryParams.push(proficiency);
            paramIndex++;
        }
        if (is_primary !== undefined) {
            queryText += ` AND is_primary = $${paramIndex}`;
            queryParams.push(is_primary);
            paramIndex++;
        }
        if (search) {
            queryText += ` AND name ILIKE $${paramIndex}`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        queryText += ' ORDER BY is_primary DESC, years_of_experience DESC NULLS LAST, name ASC';
        const result = await (0, database_1.query)(queryText, queryParams);
        // Get counts
        const countsResult = await (0, database_1.query)(`SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_primary = TRUE THEN 1 END) as primary_count
         FROM skills WHERE job_seeker_id = $1`, [jobSeekerId]);
        res.json({
            skills: result.rows,
            total_count: parseInt(countsResult.rows[0].total),
            primary_count: parseInt(countsResult.rows[0].primary_count)
        });
    }
    catch (error) {
        console.error('Error fetching skills:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// POST /api/job-seeker/skills - Add a new skill
// ============================================================================
/**
 * @swagger
 * /job-seeker/skills:
 *   post:
 *     summary: Add a new skill
 *     tags: [Job Seeker Skills]
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
 *               proficiency_level:
 *                 type: string
 *                 enum: [Beginner, Intermediate, Advanced, Expert]
 *               years_of_experience:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 50
 *               is_primary:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Skill added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Skill'
 *       400:
 *         description: Validation error or duplicate skill
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Job seeker access required
 *       409:
 *         description: Skill already exists
 */
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), validateSkill, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const jobSeekerId = req.user.userId;
        const { name, proficiency_level, years_of_experience, is_primary = false } = req.body;
        // Check if skill already exists
        const existingSkill = await (0, database_1.query)('SELECT id FROM skills WHERE job_seeker_id = $1 AND LOWER(name) = LOWER($2)', [jobSeekerId, name]);
        if (existingSkill.rows.length > 0) {
            return res.status(409).json({ error: 'Skill already exists' });
        }
        // If this skill is set as primary, unset any existing primary skills (optional behavior)
        if (is_primary) {
            await (0, database_1.query)('UPDATE skills SET is_primary = FALSE WHERE job_seeker_id = $1', [jobSeekerId]);
        }
        // Insert new skill
        const result = await (0, database_1.query)(`INSERT INTO skills (
          job_seeker_id, name, proficiency_level, years_of_experience, is_primary, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING *`, [jobSeekerId, name, proficiency_level, years_of_experience, is_primary]);
        res.status(201).json(result.rows[0]);
    }
    catch (error) {
        console.error('Error adding skill:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// DELETE /api/job-seeker/skills/:id - Delete a skill
// ============================================================================
/**
 * @swagger
 * /job-seeker/skills/{id}:
 *   delete:
 *     summary: Delete a skill
 *     tags: [Job Seeker Skills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Skill ID
 *     responses:
 *       200:
 *         description: Skill deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deleted_skill:
 *                   $ref: '#/components/schemas/Skill'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your skill
 *       404:
 *         description: Skill not found
 */
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), validateSkillId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const skillId = req.params.id;
        const jobSeekerId = req.user.userId;
        // Get skill to check ownership
        const skillResult = await (0, database_1.query)('SELECT * FROM skills WHERE id = $1', [skillId]);
        if (skillResult.rows.length === 0) {
            return res.status(404).json({ error: 'Skill not found' });
        }
        const skill = skillResult.rows[0];
        // Check if skill belongs to the job seeker
        if (skill.job_seeker_id !== jobSeekerId) {
            return res.status(403).json({ error: 'You do not have permission to delete this skill' });
        }
        // Delete skill
        await (0, database_1.query)('DELETE FROM skills WHERE id = $1', [skillId]);
        res.json({
            message: 'Skill deleted successfully',
            deleted_skill: skill
        });
    }
    catch (error) {
        console.error('Error deleting skill:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// PATCH /api/job-seeker/skills/:id/primary - Set skill as primary
// ============================================================================
/**
 * @swagger
 * /job-seeker/skills/{id}/primary:
 *   patch:
 *     summary: Set a skill as primary
 *     tags: [Job Seeker Skills]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Skill ID
 *     responses:
 *       200:
 *         description: Skill set as primary successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 skill:
 *                   $ref: '#/components/schemas/Skill'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your skill
 *       404:
 *         description: Skill not found
 */
router.patch('/:id/primary', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), validateSkillId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const skillId = req.params.id;
        const jobSeekerId = req.user.userId;
        // Get skill to check ownership
        const skillResult = await (0, database_1.query)('SELECT * FROM skills WHERE id = $1', [skillId]);
        if (skillResult.rows.length === 0) {
            return res.status(404).json({ error: 'Skill not found' });
        }
        const skill = skillResult.rows[0];
        // Check if skill belongs to the job seeker
        if (skill.job_seeker_id !== jobSeekerId) {
            return res.status(403).json({ error: 'You do not have permission to modify this skill' });
        }
        // Check if already primary
        if (skill.is_primary) {
            return res.json({
                message: 'Skill is already primary',
                skill
            });
        }
        // Start transaction
        await (0, database_1.query)('BEGIN');
        try {
            // Unset current primary skills
            await (0, database_1.query)('UPDATE skills SET is_primary = FALSE WHERE job_seeker_id = $1', [jobSeekerId]);
            // Set new primary skill
            const result = await (0, database_1.query)('UPDATE skills SET is_primary = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *', [skillId]);
            await (0, database_1.query)('COMMIT');
            res.json({
                message: 'Skill set as primary successfully',
                skill: result.rows[0]
            });
        }
        catch (error) {
            await (0, database_1.query)('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Error setting primary skill:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=jobSeekerSkillsRoutes.js.map