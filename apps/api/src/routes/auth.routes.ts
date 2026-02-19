import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { query, getClient } from "../db";
import { findUserByEmail, publicUser } from "../users";

export const authRouter = Router();

/* ------------------------------------------------------------------ */
/*  GET /api/v1/auth/email-available                                   */
/* ------------------------------------------------------------------ */

const emailAvailableSchema = z.object({
  email: z.string().email("Invalid email address"),
});

authRouter.get("/email-available", async (req, res, next) => {
  try {
    const parsed = emailAvailableSchema.parse(req.query);
    const existing = await findUserByEmail(parsed.email);

    return res.json({
      available: !existing,
    });
  } catch (err) {
    return next(err);
  }
});

type TwoFactorChallenge = {
  userId: string;
  email: string;
  name: string;
  roles: string[];
  code: string;
  expiresAt: number;
};

const twoFactorChallenges = new Map<string, TwoFactorChallenge>();

function createTwoFactorChallenge(input: {
  userId: string;
  email: string;
  name: string;
  roles: string[];
}) {
  const challengeId = uuidv4();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 5 * 60 * 1000;

  twoFactorChallenges.set(challengeId, {
    userId: input.userId,
    email: input.email,
    name: input.name,
    roles: input.roles,
    code,
    expiresAt,
  });

  console.log(`[2FA] Verification code for ${input.email}: ${code}`);

  return {
    challengeId,
    code,
    expiresInSeconds: 300,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function jwtExpiresIn(): SignOptions["expiresIn"] {
  const raw = process.env.JWT_EXPIRES_IN;
  if (!raw) return "15m";
  const trimmed = raw.trim();
  if (!trimmed) return "15m";
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (/^\d+(ms|s|m|h|d|w|y)$/.test(trimmed))
    return trimmed as SignOptions["expiresIn"];
  return "15m";
}

function signToken(payload: object) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(payload, secret, { expiresIn: jwtExpiresIn() });
}

/* ------------------------------------------------------------------ */
/*  POST /api/auth/register                                            */
/* ------------------------------------------------------------------ */

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,
      "Password must include upper, lower, number and special character"
    ),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

authRouter.post("/register", async (req, res, next) => {
  const client = await getClient();
  try {
    const data = registerSchema.parse(req.body);

    // Check if email already exists
    const existing = await findUserByEmail(data.email);
    if (existing) {
      return res
        .status(409)
        .json({ error: { message: "Email is already registered" } });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await client.query("BEGIN");

    // Insert user
    const { rows: userRows } = await client.query<{ id: string }>(
      `INSERT INTO users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [data.firstName, data.lastName, data.email, passwordHash]
    );
    const userId = userRows[0].id;

    // Assign JOB_SEEKER role
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = 'JOB_SEEKER'`,
      [userId]
    );

    // Create empty job seeker profile
    await client.query(
      `INSERT INTO job_seeker_profiles (user_id) VALUES ($1)`,
      [userId]
    );

    await client.query("COMMIT");

    // Build JWT
    const accessToken = signToken({
      sub: userId,
      email: data.email,
      name: `${data.firstName} ${data.lastName}`,
      roles: ["JOB_SEEKER"],
    });

    return res.status(201).json({
      tokenType: "Bearer",
      accessToken,
      expiresIn: jwtExpiresIn(),
      user: {
        id: userId,
        email: data.email,
        name: `${data.firstName} ${data.lastName}`,
        roles: ["JOB_SEEKER"],
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return next(err);
  } finally {
    client.release();
  }
});

/* ------------------------------------------------------------------ */
/*  POST /api/auth/login                                               */
/* ------------------------------------------------------------------ */

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await findUserByEmail(email);

    if (!user || !user.is_active) {
      return res
        .status(401)
        .json({ error: { message: "Invalid credentials" } });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res
        .status(401)
        .json({ error: { message: "Invalid credentials" } });
    }

    const pub = publicUser(user);
    const challenge = createTwoFactorChallenge({
      userId: user.id,
      email: user.email,
      name: pub.name,
      roles: user.roles,
    });

    return res.status(202).json({
      requiresTwoFactor: true,
      challengeId: challenge.challengeId,
      expiresInSeconds: challenge.expiresInSeconds,
      message: "2FA code generated. Check server terminal output.",
    });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  POST /api/auth/2fa/challenge                                      */
/* ------------------------------------------------------------------ */

const twoFactorChallengeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/2fa/challenge", async (req, res, next) => {
  try {
    const { email, password } = twoFactorChallengeSchema.parse(req.body);
    const user = await findUserByEmail(email);

    if (!user || !user.is_active) {
      return res
        .status(401)
        .json({ error: { message: "Invalid credentials" } });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res
        .status(401)
        .json({ error: { message: "Invalid credentials" } });
    }

    const pub = publicUser(user);
    const challenge = createTwoFactorChallenge({
      userId: user.id,
      email: user.email,
      name: pub.name,
      roles: user.roles,
    });

    return res.json({
      message: "2FA challenge created",
      challengeId: challenge.challengeId,
      expiresInSeconds: challenge.expiresInSeconds,
      ...(process.env.NODE_ENV !== "production" && { otpCode: challenge.code }),
    });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  POST /api/auth/2fa/verify                                         */
/* ------------------------------------------------------------------ */

const twoFactorVerifySchema = z.object({
  challengeId: z.string().uuid("Invalid challengeId"),
  code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

authRouter.post("/2fa/verify", async (req, res, next) => {
  try {
    const { challengeId, code } = twoFactorVerifySchema.parse(req.body);
    const challenge = twoFactorChallenges.get(challengeId);

    if (!challenge) {
      return res
        .status(400)
        .json({ error: { message: "Invalid or expired challenge" } });
    }

    if (Date.now() > challenge.expiresAt) {
      twoFactorChallenges.delete(challengeId);
      return res
        .status(400)
        .json({ error: { message: "Challenge expired" } });
    }

    if (challenge.code !== code) {
      return res
        .status(401)
        .json({ error: { message: "Invalid verification code" } });
    }

    twoFactorChallenges.delete(challengeId);

    const accessToken = signToken({
      sub: challenge.userId,
      email: challenge.email,
      name: challenge.name,
      roles: challenge.roles,
    });

    return res.json({
      tokenType: "Bearer",
      accessToken,
      expiresIn: jwtExpiresIn(),
      user: {
        id: challenge.userId,
        email: challenge.email,
        name: challenge.name,
        roles: challenge.roles,
      },
    });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  POST /api/auth/forgot-password                                     */
/* ------------------------------------------------------------------ */

const forgotSchema = z.object({
  email: z.string().email(),
});

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = forgotSchema.parse(req.body);
    const user = await findUserByEmail(email);

    // Always return success to avoid leaking whether email exists
    if (!user) {
      return res.json({
        message: "If the email exists, a reset link has been sent.",
      });
    }

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `UPDATE users
       SET password_reset_token = $1,
           password_reset_expires_at = $2,
           password_reset_requested_at = NOW()
       WHERE id = $3`,
      [resetToken, expiresAt.toISOString(), user.id]
    );

    // In production, send an email with the reset link.
    // For development, log the token.
    console.log(
      `[DEV] Password reset token for ${email}: ${resetToken}`
    );

    return res.json({
      message: "If the email exists, a reset link has been sent.",
      // Include token in response for development only:
      ...(process.env.NODE_ENV !== "production" && { resetToken }),
    });
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------------ */
/*  POST /api/auth/reset-password                                      */
/* ------------------------------------------------------------------ */

const resetSchema = z.object({
  token: z.string().uuid("Invalid reset token"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,
      "Password must include upper, lower, number and special character"
    ),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = resetSchema.parse(req.body);

    const { rows } = await query<{ id: string }>(
      `SELECT id FROM users
       WHERE password_reset_token = $1
         AND password_reset_expires_at > NOW()`,
      [token]
    );

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ error: { message: "Invalid or expired reset token" } });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await query(
      `UPDATE users
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_expires_at = NULL,
           password_reset_requested_at = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, rows[0].id]
    );

    return res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    return next(err);
  }
});
