import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { findUserById, publicUser } from "../users";
import { getUserPermissions } from "../middleware/permissions";

export const meRouter = Router();

/**
 * GET /api/me
 * Returns the current authenticated user with their roles AND permissions.
 */
meRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.auth!.sub);
    if (!user) {
      return res.status(401).json({ error: { message: "User not found" } });
    }

    let permissions: string[] = [];
    try {
      permissions = await getUserPermissions(user.id);
    } catch {
      // permissions table might not be populated yet – degrade gracefully
    }

    return res.json({
      user: {
        ...publicUser(user),
        permissions,
      },
    });
  } catch (err) {
    return next(err);
  }
});
