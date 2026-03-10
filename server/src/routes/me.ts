import { Router } from "express";
import { authenticate } from "../middleware/auth"; // Use your existing auth middleware
import { query } from "../config/database";
import { ForbiddenError } from "../utils/errors";

export const meRouter = Router();

function canViewUserProfilePicture(req: any, targetUserId: string): boolean {
  const requesterId = String(req.user?.userId ?? '').trim();
  if (requesterId && requesterId === targetUserId) return true;

  const roles = Array.isArray(req.user?.roles)
    ? req.user.roles.map((r: unknown) => String(r).toUpperCase())
    : [];
  if (roles.includes('ADMIN')) return true;

  const permissions = Array.isArray(req.user?.permissions)
    ? req.user.permissions.map((p: unknown) => String(p).toUpperCase())
    : [];

  return permissions.some((p: string) => ['MANAGE_USERS', 'VIEW_CV_DATABASE', 'VIEW_APPLICATIONS'].includes(p));
}

// Use your existing authenticate middleware
meRouter.get("/me", authenticate, async (req, res, next) => {
  try {
    // Get user from database using the userId from the token
    const userId = req.user?.userId; // This comes from your JWT payload
    
    if (!userId) {
      return res.status(401).json({ error: { message: "User not found in token" } });
    }

    const result = await query(
      `SELECT id, first_name, last_name, email, phone, is_active, created_at,
              (profile_picture_data IS NOT NULL) as has_profile_picture,
              profile_picture_updated_at
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
        phone: user.phone,
        is_active: user.is_active,
        created_at: user.created_at,
        has_profile_picture: Boolean(user.has_profile_picture),
        profile_picture_url: user.has_profile_picture ? '/api/v1/profile/picture' : null,
        profile_picture_updated_at: user.profile_picture_updated_at ?? null,
        roles,
        permissions
      } 
    });
  } catch (err) {
    return next(err);
  }
});

meRouter.patch("/me", authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: { message: "User not found in token" } });
    }

    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const phoneRaw = req.body?.phone;
    const phone = phoneRaw === null || phoneRaw === undefined ? null : String(phoneRaw).trim();

    if (!email) {
      return res.status(400).json({ error: { message: "Email is required" } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: { message: "Invalid email format" } });
    }

    if (!phone) {
      return res.status(400).json({ error: { message: "Phone number is required" } });
    }

    if (!/^\+?[\d\s]+$/.test(phone)) {
      return res.status(400).json({ error: { message: "Invalid phone format" } });
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length > 15) {
      return res.status(400).json({ error: { message: "Phone number must not exceed 15 digits" } });
    }
    if (phoneDigits.length < 6) {
      return res.status(400).json({ error: { message: "Phone number appears too short" } });
    }

    const existing = await query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
      [email, userId],
    );
    if ((existing.rows?.length ?? 0) > 0) {
      return res.status(409).json({ error: { message: "Email already in use" } });
    }

    const result = await query(
      `UPDATE users
          SET email = $1,
              phone = $2,
              updated_at = NOW()
        WHERE id = $3
      RETURNING id, first_name, last_name, email, phone, is_active, created_at,
                (profile_picture_data IS NOT NULL) as has_profile_picture,
                profile_picture_updated_at`,
      [email, phone, userId],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: { message: "User not found" } });
    }

    return res.json({
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        is_active: user.is_active,
        created_at: user.created_at,
        has_profile_picture: Boolean(user.has_profile_picture),
        profile_picture_url: user.has_profile_picture ? '/api/v1/profile/picture' : null,
        profile_picture_updated_at: user.profile_picture_updated_at ?? null,
      },
    });
  } catch (err) {
    return next(err);
  }
});

meRouter.get("/search", authenticate, async (req, res, next) => {
  try {
    const userRoles = (req.user?.roles ?? []).map((r) => String(r).toUpperCase());
    const userPermissions = (req.user?.permissions ?? []).map((p) => String(p).toUpperCase());

    const canSearchUsers =
      userRoles.includes("ADMIN") ||
      userPermissions.includes("MANAGE_USERS") ||
      userPermissions.includes("MANAGE_COMPANY");

    if (!canSearchUsers) {
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
         AND NOT EXISTS (
           SELECT 1
             FROM user_roles ur
             JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = users.id
              AND UPPER(COALESCE(r.name, '')) = 'JOB_SEEKER'
         )
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

meRouter.get("/profile-picture/:userId", authenticate, async (req, res, next) => {
  try {
    const userId = String(req.params?.userId ?? '').trim();
    if (!userId) {
      return res.status(400).json({ error: { message: 'Missing user id' } });
    }

    if (!canViewUserProfilePicture(req, userId)) {
      throw new ForbiddenError('You do not have permission to view this profile picture');
    }

    const result = await query(
      `SELECT profile_picture_data, profile_picture_mime
         FROM users
        WHERE id = $1`,
      [userId],
    );

    const row = result.rows[0] as any;
    const raw = row?.profile_picture_data as unknown;
    const mime = String(row?.profile_picture_mime ?? '').trim();

    if (!(raw instanceof Buffer) || raw.length === 0) {
      return res.status(404).json({ error: { message: 'Profile picture not found' } });
    }

    res.setHeader('Content-Type', mime || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.send(raw);
  } catch (err) {
    return next(err);
  }
});