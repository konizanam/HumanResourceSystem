import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { requireAuth } from "../middleware/auth";
import { requirePermission } from "../middleware/permissions";

export const companiesRouter = Router();

// All company routes require authentication
companiesRouter.use(requireAuth);

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

const companySchema = z.object({
  name: z.string().min(1, "Company name is required").max(150),
  industry: z.string().max(100).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  website: z.string().max(255).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
});

/* ------------------------------------------------------------------ */
/*  GET /api/companies  – list all companies                           */
/* ------------------------------------------------------------------ */

companiesRouter.get("/", async (req, res, next) => {
  try {
    const search = (req.query.search as string) ?? "";
    const statusFilter = (req.query.status as string) ?? "all";

    let sql = `
      SELECT c.*,
             u.first_name || ' ' || u.last_name AS created_by_name
      FROM companies c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(c.name) LIKE $${params.length}
                 OR LOWER(c.industry) LIKE $${params.length}
                 OR LOWER(c.city) LIKE $${params.length}
                 OR LOWER(c.country) LIKE $${params.length})`;
    }

    if (statusFilter === "active") {
      sql += ` AND c.is_active = TRUE`;
    } else if (statusFilter === "inactive") {
      sql += ` AND c.is_active = FALSE`;
    }

    sql += ` ORDER BY c.created_at DESC`;

    const { rows } = await query(sql, params);
    return res.json({ companies: rows });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  GET /api/companies/:id  – single company details                   */
/* ------------------------------------------------------------------ */

companiesRouter.get("/:id", async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*,
              u.first_name || ' ' || u.last_name AS created_by_name
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ error: { message: "Company not found" } });
    }

    return res.json({ company: rows[0] });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  POST /api/companies  – create a company                            */
/* ------------------------------------------------------------------ */

companiesRouter.post(
  "/",
  requirePermission("CREATE_COMPANY", "MANAGE_COMPANY"),
  async (req, res, next) => {
    try {
      const d = companySchema.parse(req.body);
      const userId = req.auth!.sub;

      const { rows } = await query(
        `INSERT INTO companies
           (name, industry, description, website, logo_url,
            contact_email, contact_phone,
            address_line1, address_line2, city, country,
            created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          d.name,
          d.industry ?? null,
          d.description ?? null,
          d.website ?? null,
          d.logoUrl ?? null,
          d.contactEmail ?? null,
          d.contactPhone ?? null,
          d.addressLine1 ?? null,
          d.addressLine2 ?? null,
          d.city ?? null,
          d.country ?? null,
          userId,
        ]
      );

      return res.status(201).json({ company: rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

/* ------------------------------------------------------------------ */
/*  PUT /api/companies/:id  – update a company                         */
/* ------------------------------------------------------------------ */

companiesRouter.put(
  "/:id",
  requirePermission("EDIT_COMPANY", "MANAGE_COMPANY"),
  async (req, res, next) => {
    try {
      const d = companySchema.parse(req.body);

      const { rows } = await query(
        `UPDATE companies SET
           name = $2, industry = $3, description = $4, website = $5,
           logo_url = $6, contact_email = $7, contact_phone = $8,
           address_line1 = $9, address_line2 = $10, city = $11,
           country = $12, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          req.params.id,
          d.name,
          d.industry ?? null,
          d.description ?? null,
          d.website ?? null,
          d.logoUrl ?? null,
          d.contactEmail ?? null,
          d.contactPhone ?? null,
          d.addressLine1 ?? null,
          d.addressLine2 ?? null,
          d.city ?? null,
          d.country ?? null,
        ]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: { message: "Company not found" } });
      }

      return res.json({ company: rows[0] });
    } catch (err) {
      return next(err);
    }
  }
);

/* ------------------------------------------------------------------ */
/*  POST /api/companies/:id/deactivate                                 */
/* ------------------------------------------------------------------ */

companiesRouter.post(
  "/:id/deactivate",
  requirePermission("DEACTIVATE_COMPANY", "MANAGE_COMPANY"),
  async (req, res, next) => {
    try {
      const { rows } = await query(
        `UPDATE companies SET is_active = FALSE, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [req.params.id]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: { message: "Company not found" } });
      }

      return res.json({ company: rows[0], message: "Company deactivated" });
    } catch (err) {
      return next(err);
    }
  }
);

/* ------------------------------------------------------------------ */
/*  POST /api/companies/:id/activate                                   */
/* ------------------------------------------------------------------ */

companiesRouter.post(
  "/:id/activate",
  requirePermission("DEACTIVATE_COMPANY", "MANAGE_COMPANY"),
  async (req, res, next) => {
    try {
      const { rows } = await query(
        `UPDATE companies SET is_active = TRUE, updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [req.params.id]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ error: { message: "Company not found" } });
      }

      return res.json({ company: rows[0], message: "Company activated" });
    } catch (err) {
      return next(err);
    }
  }
);
