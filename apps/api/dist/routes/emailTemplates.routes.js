"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const errors_1 = require("../utils/errors");
const emailTemplates_service_1 = require("../services/emailTemplates.service");
const router = (0, express_1.Router)();
// Email template editing is an admin function.
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('ADMIN', 'HR_MANAGER'));
router.get('/', async (req, res, next) => {
    try {
        const templates = await (0, emailTemplates_service_1.getEmailTemplates)();
        return res.json({ status: 'success', data: templates });
    }
    catch (err) {
        next(err);
    }
});
router.post('/', [
    (0, express_validator_1.body)('key').isString().notEmpty().withMessage('Key is required'),
    (0, express_validator_1.body)('title').isString().notEmpty().withMessage('Title is required'),
    (0, express_validator_1.body)('description').optional({ nullable: true }).isString(),
    (0, express_validator_1.body)('subject').isString().notEmpty().withMessage('Subject is required'),
    (0, express_validator_1.body)('body_text').isString().notEmpty().withMessage('Body text is required'),
    (0, express_validator_1.body)('placeholders').optional({ nullable: true }),
], validation_1.validateRequest, async (req, res, next) => {
    try {
        const key = String(req.body.key ?? '').trim();
        if (!(0, emailTemplates_service_1.isEmailTemplateKey)(key)) {
            throw new errors_1.BadRequestError('Invalid key format');
        }
        const existing = await (0, emailTemplates_service_1.getEmailTemplates)();
        if (existing.some((t) => t.key === key)) {
            throw new errors_1.BadRequestError('A template with this key already exists');
        }
        const title = String(req.body.title ?? '').trim();
        const description = String(req.body.description ?? '').trim();
        const subject = String(req.body.subject ?? '').trim();
        const body_text = String(req.body.body_text ?? '');
        const placeholders = (0, emailTemplates_service_1.parsePlaceholdersList)(req.body.placeholders);
        if (!title)
            throw new errors_1.BadRequestError('Title is required');
        if (!subject)
            throw new errors_1.BadRequestError('Subject is required');
        if (!body_text.trim())
            throw new errors_1.BadRequestError('Body text is required');
        const created = await (0, emailTemplates_service_1.updateEmailTemplate)(key, {
            title,
            description,
            subject,
            body_text,
            placeholders,
        });
        return res.status(201).json({ status: 'success', data: created });
    }
    catch (err) {
        next(err);
    }
});
router.put('/:key', [
    (0, express_validator_1.param)('key').notEmpty().withMessage('Template key is required'),
    (0, express_validator_1.body)('title').optional({ nullable: true }).isString(),
    (0, express_validator_1.body)('description').optional({ nullable: true }).isString(),
    (0, express_validator_1.body)('subject').isString().notEmpty().withMessage('Subject is required'),
    (0, express_validator_1.body)('body_text').isString().notEmpty().withMessage('Body text is required'),
    (0, express_validator_1.body)('placeholders').optional({ nullable: true }),
], validation_1.validateRequest, async (req, res, next) => {
    try {
        const keyRaw = String(req.params.key ?? '').trim();
        if (!(0, emailTemplates_service_1.isEmailTemplateKey)(keyRaw)) {
            throw new errors_1.BadRequestError('Invalid template key');
        }
        const subject = String(req.body.subject ?? '').trim();
        const body_text = String(req.body.body_text ?? '');
        const title = typeof req.body.title === 'string' ? String(req.body.title).trim() : undefined;
        const description = typeof req.body.description === 'string' ? String(req.body.description) : undefined;
        const placeholders = (0, emailTemplates_service_1.parsePlaceholdersList)(req.body.placeholders);
        if (!subject)
            throw new errors_1.BadRequestError('Subject is required');
        if (!body_text.trim())
            throw new errors_1.BadRequestError('Body text is required');
        const updated = await (0, emailTemplates_service_1.updateEmailTemplate)(keyRaw, {
            title,
            description,
            subject,
            body_text,
            placeholders,
        });
        return res.json({ status: 'success', data: updated });
    }
    catch (err) {
        next(err);
    }
});
exports.default = router;
//# sourceMappingURL=emailTemplates.routes.js.map