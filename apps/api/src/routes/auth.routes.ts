import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { findUserByEmail, publicUser } from "../users";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: { message: "JWT_SECRET is not configured" } });
    }

    const expiresIn: SignOptions["expiresIn"] = (() => {
      const raw = process.env.JWT_EXPIRES_IN;
      if (!raw) return "15m";

      const trimmed = raw.trim();
      if (!trimmed) return "15m";

      if (/^\d+$/.test(trimmed)) return Number(trimmed);
      if (/^\d+(ms|s|m|h|d|w|y)$/.test(trimmed)) return trimmed as SignOptions["expiresIn"];

      return "15m";
    })();

    const accessToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
      },
      secret,
      { expiresIn }
    );

    return res.json({
      tokenType: "Bearer",
      accessToken,
      expiresIn,
      user: publicUser(user),
    });
  } catch (err) {
    return next(err);
  }
});
