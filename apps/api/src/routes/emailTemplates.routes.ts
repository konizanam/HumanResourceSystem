import { Router, type Request, type Response, type NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import { BadRequestError } from '../utils/errors';
import {
  getEmailTemplates,
  isEmailTemplateKey,
  parsePlaceholdersList,
  updateEmailTemplate,
} from '../services/emailTemplates.service';

const router = Router();

// Email template editing is an admin function.
router.use(authenticate);
router.use(authorize('ADMIN', 'HR_MANAGER'));

router.get('/', async (req, res, next) => {
  try {
    const templates = await getEmailTemplates();
    return res.json({ status: 'success', data: templates });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  [
    body('key').isString().notEmpty().withMessage('Key is required'),
    body('title').isString().notEmpty().withMessage('Title is required'),
    body('description').optional({ nullable: true }).isString(),
    body('subject').isString().notEmpty().withMessage('Subject is required'),
    body('body_text').isString().notEmpty().withMessage('Body text is required'),
    body('placeholders').optional({ nullable: true }),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = String(req.body.key ?? '').trim();
      if (!isEmailTemplateKey(key)) {
        throw new BadRequestError('Invalid key format');
      }

      const existing = await getEmailTemplates();
      if (existing.some((t) => t.key === key)) {
        throw new BadRequestError('A template with this key already exists');
      }

      const title = String(req.body.title ?? '').trim();
      const description = String(req.body.description ?? '').trim();
      const subject = String(req.body.subject ?? '').trim();
      const body_text = String(req.body.body_text ?? '');
      const placeholders = parsePlaceholdersList(req.body.placeholders);

      if (!title) throw new BadRequestError('Title is required');
      if (!subject) throw new BadRequestError('Subject is required');
      if (!body_text.trim()) throw new BadRequestError('Body text is required');

      const created = await updateEmailTemplate(key, {
        title,
        description,
        subject,
        body_text,
        placeholders,
      });

      return res.status(201).json({ status: 'success', data: created });
    } catch (err) {
      next(err);
    }
  },
);

router.put(
  '/:key',
  [
    param('key').notEmpty().withMessage('Template key is required'),
    body('title').optional({ nullable: true }).isString(),
    body('description').optional({ nullable: true }).isString(),
    body('subject').isString().notEmpty().withMessage('Subject is required'),
    body('body_text').isString().notEmpty().withMessage('Body text is required'),
    body('placeholders').optional({ nullable: true }),
  ],
  validateRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const keyRaw = String(req.params.key ?? '').trim();
      if (!isEmailTemplateKey(keyRaw)) {
        throw new BadRequestError('Invalid template key');
      }

      const subject = String(req.body.subject ?? '').trim();
      const body_text = String(req.body.body_text ?? '');
      const title = typeof req.body.title === 'string' ? String(req.body.title).trim() : undefined;
      const description = typeof req.body.description === 'string' ? String(req.body.description) : undefined;
      const placeholders = parsePlaceholdersList(req.body.placeholders);

      if (!subject) throw new BadRequestError('Subject is required');
      if (!body_text.trim()) throw new BadRequestError('Body text is required');

      const updated = await updateEmailTemplate(keyRaw, {
        title,
        description,
        subject,
        body_text,
        placeholders,
      });
      return res.json({ status: 'success', data: updated });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
