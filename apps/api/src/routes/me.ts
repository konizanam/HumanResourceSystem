import { Router } from "express";
import { authenticate } from "../middleware/auth"; // Use your existing auth middleware
import { query } from "../config/database";
import { ForbiddenError } from "../utils/errors";

export const meRouter = Router();

// Use your existing authenticate middleware
meRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    // Get user from database using the userId from the token
    const userId = req.user?.userId; // This comes from your JWT payload
    
    if (!userId) {
      return res.status(401).json({ error: { message: "User not found in token" } });
    }

    const result = await query(
      `SELECT id, first_name, last_name, email, is_active, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ error: { message: "User not found" } });
    }

    // Get user roles
    const rolesResult = await query(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );

    const roles = rolesResult.rows.map(row => row.name);

    // Get user permissions
    const permissionsResult = await query(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );

    const permissions = permissionsResult.rows.map(row => row.name);

    return res.json({ 
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        is_active: user.is_active,
        created_at: user.created_at,
        roles,
        permissions
      } 
    });
  } catch (err) {
    return next(err);
  }
});

meRouter.get("/search", authenticate, async (req, res, next) => {
  try {
    const userRoles = req.user?.roles ?? [];
    if (!userRoles.includes("ADMIN") && !userRoles.includes("HR_MANAGER")) {
      throw new ForbiddenError("You do not have permission to search users");
    }

    const q = typeof req.query?.q === "string" ? req.query.q.trim() : "";
    if (q.length < 2) {
      return res.json({ status: "success", data: [] });
    }

    const like = `%${q}%`;
    const result = await query(
      `SELECT id, first_name, last_name, email
       FROM users
       WHERE is_active = true
         AND (
           first_name ILIKE $1
           OR last_name ILIKE $1
           OR email ILIKE $1
           OR (first_name || ' ' || last_name) ILIKE $1
         )
       ORDER BY first_name ASC, last_name ASC
       LIMIT 10`,
      [like],
    );

    const users = result.rows.map((u: any) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
    }));

    return res.json({
      status: "success",
      data: users,
    });
  } catch (err) {
    return next(err);
  }
});