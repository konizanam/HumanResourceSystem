"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/resumes');
        // Create directory if it doesn't exist
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = crypto_1.default.randomBytes(16).toString('hex');
        const ext = path_1.default.extname(file.originalname);
        cb(null, `resume-${Date.now()}-${uniqueSuffix}${ext}`);
    }
});
const fileFilter = (req, file, cb) => {
    // Accept only PDF, DOC, DOCX files
    const allowedMimes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});
// Validation middleware
const validateResumeId = [
    (0, express_validator_1.param)('id').isUUID().withMessage('Invalid resume ID')
];
/**
 * @swagger
 * components:
 *   schemas:
 *     Resume:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         job_seeker_id:
 *           type: string
 *           format: uuid
 *         file_name:
 *           type: string
 *         file_path:
 *           type: string
 *         file_size:
 *           type: integer
 *         mime_type:
 *           type: string
 *         is_primary:
 *           type: boolean
 *         uploaded_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         created_at:
 *           type: string
 *           format: date-time
 *         download_url:
 *           type: string
 *     ResumeUploadResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         resume:
 *           $ref: '#/components/schemas/Resume'
 */
/**
 * @swagger
 * tags:
 *   name: Job Seeker Resume
 *   description: Resume management endpoints for job seekers
 */
// ============================================================================
// POST /api/job-seeker/resume - Upload a new resume
// ============================================================================
/**
 * @swagger
 * /job-seeker/resume:
 *   post:
 *     summary: Upload a new resume
 *     tags: [Job Seeker Resume]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - resume
 *             properties:
 *               resume:
 *                 type: string
 *                 format: binary
 *                 description: Resume file (PDF, DOC, DOCX only, max 5MB)
 *               is_primary:
 *                 type: boolean
 *                 description: Set as primary resume
 *     responses:
 *       201:
 *         description: Resume uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResumeUploadResponse'
 *       400:
 *         description: Validation error or invalid file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Job seeker access required
 *       413:
 *         description: File too large (max 5MB)
 */
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
        if (err) {
            if (err instanceof multer_1.default.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
                }
            }
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const jobSeekerId = req.user.userId;
        const isPrimary = req.body.is_primary === 'true' || req.body.is_primary === true;
        // Start transaction
        await (0, database_1.query)('BEGIN');
        try {
            // If this resume is set as primary, unset any existing primary resumes
            if (isPrimary) {
                await (0, database_1.query)('UPDATE resumes SET is_primary = FALSE WHERE job_seeker_id = $1', [jobSeekerId]);
            }
            // Insert new resume
            const result = await (0, database_1.query)(`INSERT INTO resumes (
            job_seeker_id, file_name, file_path, file_size, mime_type, is_primary, uploaded_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
          RETURNING *`, [
                jobSeekerId,
                req.file.originalname,
                req.file.path,
                req.file.size,
                req.file.mimetype,
                isPrimary
            ]);
            // Update user's resume_url for backward compatibility
            if (isPrimary) {
                // Construct URL for the resume (adjust based on your static file serving setup)
                const resumeUrl = `/uploads/resumes/${path_1.default.basename(req.file.path)}`;
                await (0, database_1.query)('UPDATE users SET resume_url = $1 WHERE id = $2', [resumeUrl, jobSeekerId]);
            }
            await (0, database_1.query)('COMMIT');
            const resume = result.rows[0];
            // Add download URL
            resume.download_url = `/api/job-seeker/resume/${resume.id}/download`;
            res.status(201).json({
                message: 'Resume uploaded successfully',
                resume
            });
        }
        catch (error) {
            await (0, database_1.query)('ROLLBACK');
            // Delete uploaded file if database insert fails
            if (req.file && fs_1.default.existsSync(req.file.path)) {
                fs_1.default.unlinkSync(req.file.path);
            }
            throw error;
        }
    }
    catch (error) {
        console.error('Error uploading resume:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// GET /api/job-seeker/resume - Get all resumes for the job seeker
// ============================================================================
/**
 * @swagger
 * /job-seeker/resume:
 *   get:
 *     summary: Get all resumes for the logged-in job seeker
 *     tags: [Job Seeker Resume]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include_download_urls
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Include download URLs in response
 *     responses:
 *       200:
 *         description: List of resumes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resumes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Resume'
 *                 primary_resume:
 *                   $ref: '#/components/schemas/Resume'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Job seeker access required
 */
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), [
    (0, express_validator_1.query)('include_download_urls').optional().isBoolean().toBoolean()
], async (req, res) => {
    try {
        const jobSeekerId = req.user.userId;
        const includeDownloadUrls = req.query.include_download_urls !== 'false';
        // Get all resumes for the job seeker
        const resumesResult = await (0, database_1.query)(`SELECT * FROM resumes 
         WHERE job_seeker_id = $1 
         ORDER BY is_primary DESC, created_at DESC`, [jobSeekerId]);
        // Get primary resume
        const primaryResult = await (0, database_1.query)(`SELECT * FROM resumes 
         WHERE job_seeker_id = $1 AND is_primary = TRUE 
         LIMIT 1`, [jobSeekerId]);
        const resumes = resumesResult.rows;
        const primaryResume = primaryResult.rows[0] || null;
        // Add download URLs if requested
        if (includeDownloadUrls) {
            resumes.forEach(resume => {
                resume.download_url = `/api/job-seeker/resume/${resume.id}/download`;
            });
            if (primaryResume) {
                primaryResume.download_url = `/api/job-seeker/resume/${primaryResume.id}/download`;
            }
        }
        res.json({
            resumes,
            primary_resume: primaryResume,
            total_count: resumes.length
        });
    }
    catch (error) {
        console.error('Error fetching resumes:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// GET /api/job-seeker/resume/:id - Get specific resume
// ============================================================================
/**
 * @swagger
 * /job-seeker/resume/{id}:
 *   get:
 *     summary: Get a specific resume
 *     tags: [Job Seeker Resume]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Resume ID
 *     responses:
 *       200:
 *         description: Resume details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Resume'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your resume
 *       404:
 *         description: Resume not found
 */
router.get('/:id', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), validateResumeId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const resumeId = req.params.id;
        const jobSeekerId = req.user.userId;
        // Get resume
        const result = await (0, database_1.query)(`SELECT * FROM resumes WHERE id = $1`, [resumeId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resume not found' });
        }
        const resume = result.rows[0];
        // Check if resume belongs to the job seeker
        if (resume.job_seeker_id !== jobSeekerId) {
            return res.status(403).json({ error: 'You do not have permission to view this resume' });
        }
        // Add download URL
        resume.download_url = `/api/job-seeker/resume/${resume.id}/download`;
        res.json(resume);
    }
    catch (error) {
        console.error('Error fetching resume:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// GET /api/job-seeker/resume/:id/download - Download resume file
// ============================================================================
/**
 * @swagger
 * /job-seeker/resume/{id}/download:
 *   get:
 *     summary: Download resume file
 *     tags: [Job Seeker Resume]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Resume ID
 *     responses:
 *       200:
 *         description: Resume file
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your resume
 *       404:
 *         description: Resume not found
 */
router.get('/:id/download', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), validateResumeId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const resumeId = req.params.id;
        const jobSeekerId = req.user.userId;
        // Get resume
        const result = await (0, database_1.query)(`SELECT * FROM resumes WHERE id = $1`, [resumeId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resume not found' });
        }
        const resume = result.rows[0];
        // Check if resume belongs to the job seeker
        if (resume.job_seeker_id !== jobSeekerId) {
            return res.status(403).json({ error: 'You do not have permission to download this resume' });
        }
        // Check if file exists
        if (!fs_1.default.existsSync(resume.file_path)) {
            return res.status(404).json({ error: 'Resume file not found' });
        }
        // Set appropriate headers
        res.setHeader('Content-Type', resume.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(resume.file_name)}"`);
        res.setHeader('Content-Length', resume.file_size);
        // Send file
        res.sendFile(path_1.default.resolve(resume.file_path));
    }
    catch (error) {
        console.error('Error downloading resume:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// DELETE /api/job-seeker/resume/:id - Delete a resume
// ============================================================================
/**
 * @swagger
 * /job-seeker/resume/{id}:
 *   delete:
 *     summary: Delete a resume
 *     tags: [Job Seeker Resume]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Resume ID
 *     responses:
 *       200:
 *         description: Resume deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 deleted_resume:
 *                   $ref: '#/components/schemas/Resume'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your resume
 *       404:
 *         description: Resume not found
 */
router.delete('/:id', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), validateResumeId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const resumeId = req.params.id;
        const jobSeekerId = req.user.userId;
        // Get resume
        const result = await (0, database_1.query)(`SELECT * FROM resumes WHERE id = $1`, [resumeId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resume not found' });
        }
        const resume = result.rows[0];
        // Check if resume belongs to the job seeker
        if (resume.job_seeker_id !== jobSeekerId) {
            return res.status(403).json({ error: 'You do not have permission to delete this resume' });
        }
        // Start transaction
        await (0, database_1.query)('BEGIN');
        try {
            // Delete from database
            await (0, database_1.query)('DELETE FROM resumes WHERE id = $1', [resumeId]);
            // If this was the primary resume, set another resume as primary if available
            if (resume.is_primary) {
                const otherResume = await (0, database_1.query)(`SELECT id FROM resumes 
             WHERE job_seeker_id = $1 AND id != $2 
             ORDER BY created_at DESC 
             LIMIT 1`, [jobSeekerId, resumeId]);
                if (otherResume.rows.length > 0) {
                    await (0, database_1.query)('UPDATE resumes SET is_primary = TRUE WHERE id = $1', [otherResume.rows[0].id]);
                    // Update user's resume_url
                    const newPrimary = await (0, database_1.query)('SELECT file_path FROM resumes WHERE id = $1', [otherResume.rows[0].id]);
                    if (newPrimary.rows.length > 0) {
                        const resumeUrl = `/uploads/resumes/${path_1.default.basename(newPrimary.rows[0].file_path)}`;
                        await (0, database_1.query)('UPDATE users SET resume_url = $1 WHERE id = $2', [resumeUrl, jobSeekerId]);
                    }
                }
                else {
                    // No resumes left, clear resume_url
                    await (0, database_1.query)('UPDATE users SET resume_url = NULL WHERE id = $1', [jobSeekerId]);
                }
            }
            await (0, database_1.query)('COMMIT');
            // Delete file from disk
            if (fs_1.default.existsSync(resume.file_path)) {
                fs_1.default.unlinkSync(resume.file_path);
            }
            res.json({
                message: 'Resume deleted successfully',
                deleted_resume: resume
            });
        }
        catch (error) {
            await (0, database_1.query)('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Error deleting resume:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
// ============================================================================
// PATCH /api/job-seeker/resume/:id/primary - Set resume as primary
// ============================================================================
/**
 * @swagger
 * /job-seeker/resume/{id}/primary:
 *   patch:
 *     summary: Set a resume as primary
 *     tags: [Job Seeker Resume]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Resume ID
 *     responses:
 *       200:
 *         description: Resume set as primary successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 resume:
 *                   $ref: '#/components/schemas/Resume'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Not your resume
 *       404:
 *         description: Resume not found
 */
router.patch('/:id/primary', auth_1.authenticate, (0, auth_1.authorize)('JOB_SEEKER'), validateResumeId, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const resumeId = req.params.id;
        const jobSeekerId = req.user.userId;
        // Get resume
        const result = await (0, database_1.query)(`SELECT * FROM resumes WHERE id = $1`, [resumeId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resume not found' });
        }
        const resume = result.rows[0];
        // Check if resume belongs to the job seeker
        if (resume.job_seeker_id !== jobSeekerId) {
            return res.status(403).json({ error: 'You do not have permission to modify this resume' });
        }
        // Check if already primary
        if (resume.is_primary) {
            return res.json({
                message: 'Resume is already primary',
                resume
            });
        }
        // Start transaction
        await (0, database_1.query)('BEGIN');
        try {
            // Unset current primary
            await (0, database_1.query)('UPDATE resumes SET is_primary = FALSE WHERE job_seeker_id = $1', [jobSeekerId]);
            // Set new primary
            await (0, database_1.query)('UPDATE resumes SET is_primary = TRUE, updated_at = NOW() WHERE id = $1', [resumeId]);
            // Update user's resume_url
            const resumeUrl = `/uploads/resumes/${path_1.default.basename(resume.file_path)}`;
            await (0, database_1.query)('UPDATE users SET resume_url = $1 WHERE id = $2', [resumeUrl, jobSeekerId]);
            await (0, database_1.query)('COMMIT');
            // Get updated resume
            const updatedResult = await (0, database_1.query)('SELECT * FROM resumes WHERE id = $1', [resumeId]);
            res.json({
                message: 'Resume set as primary successfully',
                resume: updatedResult.rows[0]
            });
        }
        catch (error) {
            await (0, database_1.query)('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error('Error setting primary resume:', error);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=jobSeekerResumeRoutes.js.map