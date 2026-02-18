import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { findUserById, publicUser } from "../users";

export const meRouter = Router();

meRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.auth!.sub);
    if (!user) {
      return res.status(401).json({ error: { message: "User not found" } });
    }
    return res.json({ user: publicUser(user) });
  } catch (err) {
    return next(err);
  }
});
