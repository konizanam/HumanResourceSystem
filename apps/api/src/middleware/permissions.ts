import type { RequestHandler } from "express";
import { query } from "../db";

/**
 * Express middleware that checks whether the authenticated user
 * holds **at least one** of the listed permissions.
 *
 * Must be placed AFTER `requireAuth` in the middleware chain.
 */
export function requirePermission(
  ...permissionNames: string[]
): RequestHandler {
  return async (req, res, next) => {
    if (!req.auth) {
      return res
        .status(401)
        .json({ error: { message: "Authentication required" } });
    }

    try {
      const userPerms = await getUserPermissions(req.auth.sub);
      const allowed = permissionNames.some((p) => userPerms.includes(p));

      if (!allowed) {
        return res
          .status(403)
          .json({ error: { message: "Insufficient permissions" } });
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/**
 * Fetch all permission names granted to a user (via their roles).
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const { rows } = await query<{ name: string }>(
    `SELECT DISTINCT p.name
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     JOIN user_roles ur ON rp.role_id = ur.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  return rows.map((r) => r.name);
}
