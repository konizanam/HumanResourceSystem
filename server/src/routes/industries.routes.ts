import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { query as dbQuery } from '../config/database';
import { authenticate, authorizePermission } from '../middleware/auth';
import { logAudit } from '../helpers/auditLogger';
import type { Request, Response } from 'express';

const router = Router();

function normalizeName(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function parsePagination(input: { page?: unknown; limit?: unknown }) {
  const page = Math.max(1, Number(input.page ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(input.limit ?? 10) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function parseIncludeInactive(value: unknown): boolean {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

// GET /api/v1/industries
router.get(
  '/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim().isLength({ max: 120 }),
    query('include_inactive').optional().isString().trim().isLength({ max: 8 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { page, limit, offset } = parsePagination(req.query);
      const search = String(req.query.search ?? '').trim();
      const includeInactive = parseIncludeInactive(req.query.include_inactive);

      const whereParts: string[] = [];
      const params: unknown[] = [];
      if (!includeInactive) {
        whereParts.push(`COALESCE(i.status, 'active') = 'active'`);
      }
      if (search) {
        whereParts.push(`i.name ILIKE $${params.length + 1}`);
        params.push(`%${search}%`);
      }

      const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

      const totalResult = await dbQuery(
        `SELECT COUNT(*)::int AS total
           FROM industries i
          ${whereClause}`,
        params as any[],
      );
      const total = Number(totalResult.rows[0]?.total ?? 0);
      const pages = Math.max(1, Math.ceil(total / limit));

      const listResult = await dbQuery(
        `SELECT
           i.id,
           i.name,
            COALESCE(i.status, 'active') AS status,
           i.created_at,
           i.updated_at,
           COUNT(DISTINCT c.id)::int AS company_count,
           COUNT(DISTINCT j.id)::int AS job_count
         FROM industries i
         LEFT JOIN companies c ON c.industry_id = i.id
         LEFT JOIN jobs j ON j.company_id = c.id
         ${whereClause}
         GROUP BY i.id, i.name, i.status, i.created_at, i.updated_at
         ORDER BY i.name ASC
         LIMIT $${params.length + 1}
         OFFSET $${params.length + 2}`,
        [...(params as any[]), limit, offset],
      );

      return res.json({
        industries: listResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      });
    } catch (error) {
      console.error('Error fetching industries:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  },
);

// POST /api/v1/industries
router.post(
  '/',
  authenticate,
  authorizePermission('MANAGE_COMPANY', 'MANAGE_USERS'),
  [body('name').isString().trim().notEmpty().withMessage('Industry name is required')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const name = normalizeName(req.body?.name);
      if (!name) {
        return res.status(400).json({ error: 'Industry name is required' });
      }

      const exists = await dbQuery(
        `SELECT id FROM industries WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
        [name],
      );
      if (exists.rows.length > 0) {
        return res.status(409).json({ error: 'Industry already exists' });
      }

      const created = await dbQuery(
        `INSERT INTO industries (name)
         VALUES ($1)
         RETURNING id, name, COALESCE(status, 'active') AS status, created_at, updated_at`,
        [name],
      );

      const row = created.rows[0];

      await logAudit({
        userId: String(req.user?.userId ?? ''),
        action: 'INDUSTRY_CREATE',
        targetType: 'industries',
        targetId: String(row?.id ?? ''),
        details: { name: row?.name ?? name },
      });

      return res.status(201).json({
        ...row,
        company_count: 0,
        job_count: 0,
      });
    } catch (error) {
      console.error('Error creating industry:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  },
);

// PUT /api/v1/industries/:id
router.put(
  '/:id',
  authenticate,
  authorizePermission('MANAGE_COMPANY', 'MANAGE_USERS'),
  [
    param('id').isUUID().withMessage('Invalid industry ID'),
    body('name').isString().trim().notEmpty().withMessage('Industry name is required'),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const id = String(req.params.id);
      const name = normalizeName(req.body?.name);

      const existing = await dbQuery(`SELECT id, name FROM industries WHERE id = $1 LIMIT 1`, [id]);
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Industry not found' });
      }

      const nameConflict = await dbQuery(
        `SELECT id FROM industries WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND id <> $2 LIMIT 1`,
        [name, id],
      );
      if (nameConflict.rows.length > 0) {
        return res.status(409).json({ error: 'Industry already exists' });
      }

      const updated = await dbQuery(
        `UPDATE industries
            SET name = $1,
                updated_at = NOW()
          WHERE id = $2
          RETURNING id, name, COALESCE(status, 'active') AS status, created_at, updated_at`,
        [name, id],
      );

      const row = updated.rows[0];

      await logAudit({
        userId: String(req.user?.userId ?? ''),
        action: 'INDUSTRY_UPDATE',
        targetType: 'industries',
        targetId: id,
        details: {
          before: existing.rows[0],
          after: row,
        },
      });

      return res.json(row);
    } catch (error) {
      console.error('Error updating industry:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  },
);

// DELETE /api/v1/industries/:id
router.delete(
  '/:id',
  authenticate,
  authorizePermission('MANAGE_COMPANY', 'MANAGE_USERS'),
  [param('id').isUUID().withMessage('Invalid industry ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const id = String(req.params.id);
      const existing = await dbQuery(
        `SELECT id, name FROM industries WHERE id = $1 LIMIT 1`,
        [id],
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Industry not found' });
      }

      const usage = await dbQuery(
        `SELECT COUNT(*)::int AS company_count
           FROM companies
          WHERE industry_id = $1`,
        [id],
      );
      const companyCount = Number(usage.rows[0]?.company_count ?? 0);
      if (companyCount > 0) {
        return res.status(409).json({
          error: 'Industry is linked to one or more companies and cannot be deleted',
        });
      }

      await dbQuery(`DELETE FROM industries WHERE id = $1`, [id]);

      await logAudit({
        userId: String(req.user?.userId ?? ''),
        action: 'INDUSTRY_DELETE',
        targetType: 'industries',
        targetId: id,
        details: existing.rows[0],
      });

      return res.json({
        message: 'Industry deleted successfully',
        deleted_industry: existing.rows[0]?.name,
      });
    } catch (error) {
      console.error('Error deleting industry:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  },
);

// POST /api/v1/industries/:id/deactivate
router.post(
  '/:id/deactivate',
  authenticate,
  authorizePermission('MANAGE_COMPANY', 'MANAGE_USERS'),
  [param('id').isUUID().withMessage('Invalid industry ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const id = String(req.params.id);
      const existing = await dbQuery(
        `SELECT id, name, COALESCE(status, 'active') AS status
           FROM industries
          WHERE id = $1
          LIMIT 1`,
        [id],
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Industry not found' });
      }

      const updated = await dbQuery(
        `UPDATE industries
            SET status = 'inactive',
                updated_at = NOW()
          WHERE id = $1
          RETURNING id, name, COALESCE(status, 'active') AS status, created_at, updated_at`,
        [id],
      );

      await logAudit({
        userId: String(req.user?.userId ?? ''),
        action: 'INDUSTRY_DEACTIVATE',
        targetType: 'industries',
        targetId: id,
        details: {
          before: existing.rows[0],
          after: updated.rows[0],
        },
      });

      return res.json(updated.rows[0]);
    } catch (error) {
      console.error('Error deactivating industry:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  },
);

// POST /api/v1/industries/:id/activate
router.post(
  '/:id/activate',
  authenticate,
  authorizePermission('MANAGE_COMPANY', 'MANAGE_USERS'),
  [param('id').isUUID().withMessage('Invalid industry ID')],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const id = String(req.params.id);
      const existing = await dbQuery(
        `SELECT id, name, COALESCE(status, 'active') AS status
           FROM industries
          WHERE id = $1
          LIMIT 1`,
        [id],
      );
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Industry not found' });
      }

      const updated = await dbQuery(
        `UPDATE industries
            SET status = 'active',
                updated_at = NOW()
          WHERE id = $1
          RETURNING id, name, COALESCE(status, 'active') AS status, created_at, updated_at`,
        [id],
      );

      await logAudit({
        userId: String(req.user?.userId ?? ''),
        action: 'INDUSTRY_ACTIVATE',
        targetType: 'industries',
        targetId: id,
        details: {
          before: existing.rows[0],
          after: updated.rows[0],
        },
      });

      return res.json(updated.rows[0]);
    } catch (error) {
      console.error('Error activating industry:', error);
      return res.status(500).json({ error: 'Server error' });
    }
  },
);

export default router;
