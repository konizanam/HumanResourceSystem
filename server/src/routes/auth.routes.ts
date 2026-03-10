import { Router } from "express";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash } from "node:crypto";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import geoip from "geoip-lite";
import { query, getClient } from "../db";
import { findUserByEmail, findUserById, publicUser } from "../users";
import { sendTemplatedEmail, apiOrigin, appName, webOrigin, formatLoginDateTime, describeIpLocation } from "../services/emailSender.service";
import { authenticate } from "../middleware/auth";
import { getSystemSettings } from "../services/systemSettings.service";

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

async function isMainCompanyConfigured(): Promise<boolean> {
  const settings = await getSystemSettings();
  const mainCompanyId = String(settings.main_company_id ?? "").trim();
  if (!mainCompanyId) return false;

  const result = await query<{ id: string }>(
    `SELECT id
       FROM companies
      WHERE id = $1
      LIMIT 1`,
    [mainCompanyId],
  );

  return result.rows.length > 0;
}

function maskEmailAddress(rawEmail: string): string {
  const value = String(rawEmail ?? "").trim();
  const atIndex = value.indexOf("@");
  if (atIndex <= 0 || atIndex === value.length - 1) return value;

  const localPart = value.slice(0, atIndex);
  const domainPart = value.slice(atIndex + 1);
  const domainLabels = domainPart.split(".");
  const domainName = domainLabels.shift() ?? "";
  const tld = domainLabels.length ? `.${domainLabels.join(".")}` : "";

  const maskSegment = (segment: string): string => {
    if (segment.length <= 1) return "*";
    if (segment.length === 2) return `${segment[0]}*`;
    return `${segment[0]}${"*".repeat(Math.max(1, segment.length - 2))}${segment[segment.length - 1]}`;
  };

  return `${maskSegment(localPart)}@${maskSegment(domainName)}${tld}`;
}

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

  return {
    challengeId,
    code,
    expiresInSeconds: 300,
  };
}

function logDevOtpToTerminal(params: { email: string; challengeId: string; code: string }) {
  if (process.env.NODE_ENV === "production") return;
  console.info(`[Auth DEV] OTP for ${params.email} (challenge ${params.challengeId}): ${params.code}`);
}

async function sendTwoFactorCodeEmail(params: {
  to: string;
  userFullName: string;
  code: string;
  expiresInSeconds: number;
}) {
  const expiresMinutes = Math.max(1, Math.ceil(params.expiresInSeconds / 60));

  try {
    await sendTemplatedEmail({
      templateKey: "auth_code",
      to: params.to,
      data: {
        app_name: appName(),
        user_full_name: params.userFullName,
        otp_code: params.code,
        otp_expires_minutes: String(expiresMinutes),
        support_email: process.env.SUPPORT_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || "",
      },
    });
  } catch (e) {
    console.error(
      "[Email] Failed to send 2FA code email:",
      e instanceof Error ? e.message : e
    );
  }
}

async function sendLoginNotificationEmail(params: {
  to: string;
  userFullName: string;
  ip: string | null;
  userAgent: string | null;
  location?: string | null;
}) {
  try {
    const dateTime = formatLoginDateTime(new Date());
    const location = String(params.location ?? "").trim() || describeIpLocation(params.ip);

    await sendTemplatedEmail({
      templateKey: "login_notification",
      to: params.to,
      accent: "security",
      data: {
        app_name: appName(),
        user_full_name: params.userFullName,
        login_info_block: "",          // sentinel — rendered specially by token engine
        login_date_time: dateTime,
        login_ip: params.ip ?? "Unknown",
        login_location: location,
        login_device: params.userAgent ?? "Unknown",
        support_email: process.env.SUPPORT_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || "",
      },
    });
  } catch (e) {
    console.error(
      "[Email] Failed to send login notification email:",
      e instanceof Error ? e.message : e
    );
  }
}

function normalizeAlertIp(ip: string | null | undefined): string {
  const raw = String(ip ?? "").trim();
  if (!raw) return "unknown";
  return raw.replace(/^::ffff:/, "").trim().toLowerCase() || "unknown";
}

async function lastLoginAlertIp(userId: string): Promise<string | null> {
  const result = await query<{ data: any }>(
    `SELECT data
       FROM notifications
      WHERE user_id = $1
        AND type = 'system_alert'
        AND COALESCE(data->>'event', '') = 'login_notification'
      ORDER BY created_at DESC
      LIMIT 1`,
    [userId]
  );

  if (!result.rows.length) return null;
  const raw = String(result.rows[0]?.data?.login_ip ?? "").trim();
  return raw || null;
}

async function createLoginInboxNotification(params: {
  userId: string;
  userFullName: string;
  ip: string | null;
  userAgent: string;
  location: string;
}): Promise<void> {
  const safeIp = String(params.ip ?? "").trim() || "Unknown";
  const title = "New Sign-In Detected";
  const message = `A new login was detected for your account from IP ${safeIp}.`;

  await query(
    `INSERT INTO notifications (
      user_id, type, title, message, data, action_url, priority, created_at, updated_at
    ) VALUES ($1, 'system_alert', $2, $3, $4::jsonb, $5, 'high', NOW(), NOW())`,
    [
      params.userId,
      title,
      message,
      JSON.stringify({
        event: 'login_notification',
        user_full_name: params.userFullName,
        login_date_time: formatLoginDateTime(new Date()),
        login_ip: safeIp,
        login_location: params.location,
        login_device: params.userAgent,
      }),
      '/app/notifications',
    ]
  );
}

async function notifyLoginChannelsIfIpChanged(params: {
  userId: string;
  to: string;
  userFullName: string;
  ip: string | null;
  userAgent: string;
  location: string;
}): Promise<void> {
  const previousIp = await lastLoginAlertIp(params.userId);
  const currentIpNorm = normalizeAlertIp(params.ip);
  const previousIpNorm = normalizeAlertIp(previousIp);

  if (previousIp && currentIpNorm === previousIpNorm) {
    return;
  }

  await createLoginInboxNotification({
    userId: params.userId,
    userFullName: params.userFullName,
    ip: params.ip,
    userAgent: params.userAgent,
    location: params.location,
  });

  await sendLoginNotificationEmail({
    to: params.to,
    userFullName: params.userFullName,
    ip: params.ip,
    userAgent: params.userAgent,
    location: params.location,
  });
}

function firstForwardedIp(headerValue: string): string {
  const first = String(headerValue ?? "").split(",")[0] ?? "";
  return first.trim();
}

function normalizeIp(rawIp: string | null | undefined): string | null {
  const trimmed = String(rawIp ?? "").trim();
  if (!trimmed) return null;
  return trimmed;
}

function resolveClientIp(req: any): string | null {
  const forwarded = firstForwardedIp(String(req?.headers?.["x-forwarded-for"] ?? ""));
  if (forwarded) return normalizeIp(forwarded);

  const realIp = normalizeIp(String(req?.headers?.["x-real-ip"] ?? ""));
  if (realIp) return realIp;

  return normalizeIp(req?.ip ?? null);
}

function countryNameFromGeoValue(rawCountry: string | null | undefined): string {
  const value = String(rawCountry ?? "").trim();
  if (!value) return "";

  if (value.length !== 2) return value;

  const code = value.toUpperCase();
  if (code === "NA") return "Namibia";

  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

function resolveLocationFromIp(ip: string | null): string {
  const fallback = describeIpLocation(ip);
  const cleanIp = String(ip ?? "").replace(/^::ffff:/, "").trim();
  if (!cleanIp) return fallback;

  const lookedUp = geoip.lookup(cleanIp);
  if (!lookedUp) return fallback;

  const city = String(lookedUp.city ?? "").trim();
  const country = countryNameFromGeoValue(String(lookedUp.country ?? "").trim());

  if (city && country) return `${city}, ${country}`;
  if (country) return country;
  if (city) return city;

  return fallback;
}

function resolveDeviceFromUserAgent(userAgentRaw: string | null | undefined): string {
  const userAgent = String(userAgentRaw ?? "").trim();
  if (!userAgent) return "Unknown";
  return userAgent.length > 220 ? `${userAgent.slice(0, 217)}...` : userAgent;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function jwtExpiresIn(): SignOptions["expiresIn"] {
  const raw = process.env.JWT_EXPIRES_IN;
  if (!raw) return "8h";
  const trimmed = raw.trim();
  if (!trimmed) return "8h";
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (/^\d+(ms|s|m|h|d|w|y)$/.test(trimmed))
    return trimmed as SignOptions["expiresIn"];
  return "8h";
}

function signToken(payload: object) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(payload, secret, { expiresIn: jwtExpiresIn() });
}

function getTokenExpiryDate(token: string): Date {
  try {
    const decoded = jwt.decode(token) as { exp?: number } | null;
    const exp = Number(decoded?.exp);
    if (Number.isFinite(exp) && exp > 0) {
      return new Date(exp * 1000);
    }
  } catch {
    // Ignore decode errors and fallback below.
  }
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

function tokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function persistUserSession(params: {
  userId: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  previousToken?: string | null;
}) {
  const expiresAt = getTokenExpiryDate(params.token);
  const tokenKey = tokenFingerprint(params.token);
  const previousToken = String(params.previousToken ?? "").trim();
  const previousTokenKey = previousToken ? tokenFingerprint(previousToken) : "";

  if (previousToken) {
    const updated = await query(
      `UPDATE user_sessions
          SET token = $1,
              ip_address = $2,
              user_agent = $3,
              expires_at = $4,
              last_activity = NOW()
        WHERE user_id = $5
          AND (token = $6 OR token = $7)`,
      [
        tokenKey,
        params.ipAddress,
        params.userAgent,
        expiresAt.toISOString(),
        params.userId,
        previousTokenKey,
        previousToken,
      ]
    );

    if (updated.rowCount && updated.rowCount > 0) {
      return;
    }
  }

  await query(
    `INSERT INTO user_sessions (user_id, token, ip_address, user_agent, expires_at, created_at, last_activity)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [params.userId, tokenKey, params.ipAddress, params.userAgent, expiresAt.toISOString()]
  );
}

function activationExpiresIn(): SignOptions["expiresIn"] {
  const raw = process.env.ACTIVATION_TOKEN_EXPIRES_IN;
  if (!raw) return "24h";
  const trimmed = raw.trim();
  if (!trimmed) return "24h";
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (/^\d+(ms|s|m|h|d|w|y)$/.test(trimmed))
    return trimmed as SignOptions["expiresIn"];
  return "24h";
}

function signActivationToken(payload: { sub: string; email: string }) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return jwt.sign(
    { sub: payload.sub, email: payload.email, type: "activation" },
    secret,
    { expiresIn: activationExpiresIn() }
  );
}

async function applyActivationToken(token: string): Promise<{
  userId: string;
  user: NonNullable<Awaited<ReturnType<typeof findUserById>>>;
  accessToken: string;
}> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");

  const decoded = jwt.verify(token, secret) as any;
  if (decoded?.type !== "activation" || typeof decoded?.sub !== "string") {
    throw Object.assign(new Error("Invalid activation token"), { statusCode: 400, isOperational: true });
  }

  const userId = decoded.sub as string;
  const tokenEmail = typeof decoded?.email === "string" ? decoded.email : "";

  const activationUpdate = await query(
    `UPDATE users
        SET is_active = TRUE,
            email_verified = TRUE,
            updated_at = NOW()
      WHERE id = $1
         OR (LOWER(email) = LOWER($2))`,
    [userId, tokenEmail]
  );

  if (!activationUpdate.rowCount || activationUpdate.rowCount < 1) {
    throw Object.assign(new Error("User not found"), { statusCode: 404, isOperational: true });
  }

  const user = (await findUserById(userId)) ?? (tokenEmail ? await findUserByEmail(tokenEmail) : null);
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404, isOperational: true });
  }

  const pub = publicUser(user);
  const accessToken = signToken({
    sub: user.id,
    email: pub.email,
    name: pub.name,
    roles: user.roles,
  });

  return {
    userId: user.id,
    user,
    accessToken,
  };
}

async function getPendingPasswordSetupToken(userId: string): Promise<string | null> {
  const result = await query<{ password_reset_token: string | null }>(
    `SELECT password_reset_token
       FROM users
      WHERE id = $1
        AND password_reset_token IS NOT NULL
        AND password_reset_expires_at > NOW()
      LIMIT 1`,
    [userId],
  );

  const token = String(result.rows[0]?.password_reset_token ?? '').trim();
  return token || null;
}

/* ------------------------------------------------------------------ */
/*  POST /api/auth/register                                            */
/* ------------------------------------------------------------------ */

const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().email("Invalid email address"),
  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .refine((value) => /^\+?[\d\s]+$/.test(value), "Invalid phone format")
    .refine((value) => value.replace(/\D/g, "").length >= 6, "Phone number appears too short")
    .refine((value) => value.replace(/\D/g, "").length <= 15, "Phone number must not exceed 15 digits"),
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
    const normalizedPhone = data.phone.trim();

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
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5, FALSE)
       RETURNING id`,
      [data.firstName, data.lastName, data.email, normalizedPhone, passwordHash]
    );
    const userId = userRows[0].id;
    res.locals.auditUserId = userId;
    res.locals.auditAction = "AUTH_REGISTER";
    res.locals.auditTargetType = "auth";
    res.locals.auditTargetId = userId;

    // Assign JOB_SEEKER role
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = 'JOB_SEEKER'`,
      [userId]
    );

    // Keep legacy users.role column in sync when present.
    const roleColumn = await client.query(
      `SELECT 1
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND column_name = 'role'
        LIMIT 1`,
    );
    if (roleColumn.rows.length > 0) {
      await client.query(
        `UPDATE users
            SET role = 'JOB_SEEKER',
                updated_at = NOW()
          WHERE id = $1`,
        [userId],
      );
    }

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
      preActivation: true,
    });

    // Send activation email (best-effort). This does NOT block signup.
    try {
      const activationToken = signActivationToken({ sub: userId, email: data.email });
      const activationLink = `${webOrigin()}/activate?token=${encodeURIComponent(
        activationToken
      )}`;

      await sendTemplatedEmail({
        templateKey: "registration_activation",
        to: data.email,
        data: {
          app_name: appName(),
          user_full_name: `${data.firstName} ${data.lastName}`.trim(),
          activation_link: activationLink,
        },
      });
    } catch (e) {
      // Don't break registration if email fails; log for dev.
      console.error("[Email] Failed to send activation email:",
        e instanceof Error ? e.message : e
      );
    }

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
/*  GET /api/v1/auth/activate                                         */
/* ------------------------------------------------------------------ */

const activateSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

authRouter.get("/activate", async (req, res, next) => {
  try {
    const { token } = activateSchema.parse(req.query);
    const activationResult = await applyActivationToken(token);
    const user = activationResult.user;
    const userId = activationResult.userId;
    const accessToken = activationResult.accessToken;

    const pub = publicUser(user);
    const pendingPasswordSetupToken = await getPendingPasswordSetupToken(userId);

    await persistUserSession({
      userId,
      token: accessToken,
      ipAddress: req.ip ?? null,
      userAgent: req.get("user-agent") ?? null,
    });

    // Best-effort: send an activation confirmation email.
    try {
      await sendTemplatedEmail({
        templateKey: "account_activated",
        to: pub.email,
        data: {
          app_name: appName(),
          user_full_name: pub.name || pub.email,
          login_link: `${webOrigin()}/login`,
          support_email: process.env.SUPPORT_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || "",
        },
      });
    } catch (e) {
      console.error(
        "[Email] Failed to send account activated email:",
        e instanceof Error ? e.message : e
      );
    }

    const origin = webOrigin();
    if (origin) {
      if (pendingPasswordSetupToken) {
        return res.redirect(
          `${origin}/reset-password?token=${encodeURIComponent(pendingPasswordSetupToken)}&activated=1`,
        );
      }
      // Keep activation feedback in URL while requiring an explicit login.
      return res.redirect(`${origin}/login#activated=1`);
    }

    return res.json({
      status: "success",
      message: "Account activated successfully",
      tokenType: "Bearer",
      accessToken,
      expiresIn: jwtExpiresIn(),
      user: pub,
      ...(pendingPasswordSetupToken
        ? {
            requiresPasswordSetup: true,
            passwordSetupToken: pendingPasswordSetupToken,
          }
        : {}),
    });
  } catch (err) {
    return next(err);
  }
});

authRouter.post("/activate", async (req, res, next) => {
  try {
    const { token } = activateSchema.parse(req.body ?? {});
    const activationResult = await applyActivationToken(token);
    const user = activationResult.user;
    const pendingPasswordSetupToken = await getPendingPasswordSetupToken(activationResult.userId);

    const pub = publicUser(user);

    return res.json({
      status: "success",
      message: "Account activated successfully",
      tokenType: "Bearer",
      accessToken: activationResult.accessToken,
      expiresIn: jwtExpiresIn(),
      user: pub,
      ...(pendingPasswordSetupToken
        ? {
            requiresPasswordSetup: true,
            passwordSetupToken: pendingPasswordSetupToken,
          }
        : {}),
    });
  } catch (err) {
    return next(err);
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
    if (!(await isMainCompanyConfigured())) {
      return res.status(403).json({
        error: {
          message: "System setup incomplete. Please set up the main company information first.",
        },
      });
    }

    const { email, password } = loginSchema.parse(req.body);
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: { message: "Your account is not active. Please contact support." },
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res
        .status(401)
        .json({ error: { message: "Invalid credentials" } });
    }

    // Account not activated (email not verified)
    if (!user.email_verified) {
      // Self-heal inconsistent records where account is already active.
      if (user.is_active) {
        await query(
          "UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1",
          [user.id]
        );
      } else {
      // Best-effort: resend activation email (only after verifying credentials).
        try {
          const activationToken = signActivationToken({ sub: user.id, email: user.email });
          const activationLink = `${webOrigin()}/activate?token=${encodeURIComponent(
            activationToken
          )}`;

          await sendTemplatedEmail({
            templateKey: "registration_activation",
            to: user.email,
            data: {
              app_name: appName(),
              user_full_name: publicUser(user).name || user.email,
              activation_link: activationLink,
            },
          });
        } catch (e) {
          console.error(
            "[Email] Failed to resend activation email:",
            e instanceof Error ? e.message : e
          );
        }

        return res.status(403).json({
          error: {
            message:
              "Your account is not activated. Please check your email for the activation link.",
          },
        });
      }
    }

    // Account deactivated
    if (!user.is_active) {
      return res.status(403).json({
        error: { message: "Your account is deactivated. Please contact support." },
      });
    }

    const pub = publicUser(user);
    const challenge = createTwoFactorChallenge({
      userId: user.id,
      email: user.email,
      name: pub.name,
      roles: user.roles,
    });

    res.locals.auditUserId = user.id;
    res.locals.auditAction = "AUTH_LOGIN_CHALLENGE";
    res.locals.auditTargetType = "auth";
    res.locals.auditTargetId = user.id;

    // Best-effort: send the OTP to the user's email.
    void sendTwoFactorCodeEmail({
      to: user.email,
      userFullName: pub.name,
      code: challenge.code,
      expiresInSeconds: challenge.expiresInSeconds,
    });

    logDevOtpToTerminal({
      email: user.email,
      challengeId: challenge.challengeId,
      code: challenge.code,
    });

    return res.status(202).json({
      requiresTwoFactor: true,
      challengeId: challenge.challengeId,
      expiresInSeconds: challenge.expiresInSeconds,
      message: "Authentication code sent to your email.",
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

const twoFactorResendSchema = z.object({
  challengeId: z.string().uuid("Invalid challengeId"),
});

authRouter.post("/2fa/challenge", async (req, res, next) => {
  try {
    if (!(await isMainCompanyConfigured())) {
      return res.status(403).json({
        error: {
          message: "System setup incomplete. Please set up the main company information first.",
        },
      });
    }

    const { email, password } = twoFactorChallengeSchema.parse(req.body);
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ error: { message: "Invalid credentials" } });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: { message: "Your account is not active. Please contact support." },
      });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res
        .status(401)
        .json({ error: { message: "Invalid credentials" } });
    }

    if (!user.email_verified) {
      // Self-heal inconsistent records where account is already active.
      if (user.is_active) {
        await query(
          "UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1",
          [user.id]
        );
      } else {
      // Best-effort: resend activation email (only after verifying credentials).
        try {
          const activationToken = signActivationToken({ sub: user.id, email: user.email });
          const activationLink = `${webOrigin()}/activate?token=${encodeURIComponent(
            activationToken
          )}`;

          await sendTemplatedEmail({
            templateKey: "registration_activation",
            to: user.email,
            data: {
              app_name: appName(),
              user_full_name: publicUser(user).name || user.email,
              activation_link: activationLink,
            },
          });
        } catch (e) {
          console.error(
            "[Email] Failed to resend activation email:",
            e instanceof Error ? e.message : e
          );
        }

        return res.status(403).json({
          error: {
            message:
              "Your account is not activated. Please check your email for the activation link.",
          },
        });
      }
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: { message: "Your account is deactivated. Please contact support." },
      });
    }

    const pub = publicUser(user);
    const challenge = createTwoFactorChallenge({
      userId: user.id,
      email: user.email,
      name: pub.name,
      roles: user.roles,
    });

    res.locals.auditUserId = user.id;
    res.locals.auditAction = "AUTH_2FA_CHALLENGE";
    res.locals.auditTargetType = "auth";
    res.locals.auditTargetId = user.id;

    void sendTwoFactorCodeEmail({
      to: user.email,
      userFullName: pub.name,
      code: challenge.code,
      expiresInSeconds: challenge.expiresInSeconds,
    });

    logDevOtpToTerminal({
      email: user.email,
      challengeId: challenge.challengeId,
      code: challenge.code,
    });

    return res.json({
      message: "2FA challenge created",
      challengeId: challenge.challengeId,
      expiresInSeconds: challenge.expiresInSeconds,
    });
  } catch (err) {
    return next(err);
  }
});

authRouter.post("/2fa/resend", async (req, res, next) => {
  try {
    const { challengeId } = twoFactorResendSchema.parse(req.body ?? {});
    const existing = twoFactorChallenges.get(challengeId);

    if (!existing) {
      return res
        .status(400)
        .json({ error: { message: "Invalid or expired challenge" } });
    }

    const next = createTwoFactorChallenge({
      userId: existing.userId,
      email: existing.email,
      name: existing.name,
      roles: existing.roles,
    });
    twoFactorChallenges.delete(challengeId);

    // Best-effort: send new OTP to email.
    void sendTwoFactorCodeEmail({
      to: existing.email,
      userFullName: existing.name,
      code: next.code,
      expiresInSeconds: next.expiresInSeconds,
    });

    logDevOtpToTerminal({
      email: existing.email,
      challengeId: next.challengeId,
      code: next.code,
    });

    return res.json({
      message: "Authentication code resent",
      challengeId: next.challengeId,
      expiresInSeconds: next.expiresInSeconds,
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

    const ipAddress = resolveClientIp(req);
    const userAgent = resolveDeviceFromUserAgent(req.get("user-agent") ?? null);
    const location = resolveLocationFromIp(ipAddress);

    await persistUserSession({
      userId: challenge.userId,
      token: accessToken,
      ipAddress,
      userAgent,
    });

    res.locals.auditUserId = challenge.userId;
    res.locals.auditAction = "AUTH_LOGIN_SUCCESS";
    res.locals.auditTargetType = "auth";
    res.locals.auditTargetId = challenge.userId;

    await notifyLoginChannelsIfIpChanged({
      userId: challenge.userId,
      to: challenge.email,
      userFullName: challenge.name,
      ip: ipAddress,
      userAgent,
      location,
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
/*  POST /api/auth/refresh                                            */
/* ------------------------------------------------------------------ */

authRouter.post("/refresh", authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: { message: "Authentication required" } });
    }

    const { rows } = await query<{
      id: string;
      email: string;
      first_name: string | null;
      last_name: string | null;
      role_name: string | null;
    }>(
      `SELECT u.id,
              u.email,
              u.first_name,
              u.last_name,
              r.name AS role_name
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [userId]
    );

    if (!rows.length) {
      return res.status(401).json({ error: { message: "User not found or inactive" } });
    }

    const email = String(rows[0].email ?? "");
    const firstName = String(rows[0].first_name ?? "").trim();
    const lastName = String(rows[0].last_name ?? "").trim();
    const fullName = `${firstName} ${lastName}`.trim() || email;
    const roles = Array.from(
      new Set(
        rows
          .map((row) => String(row.role_name ?? "").trim())
          .filter((role) => role.length > 0)
      )
    );

    const accessToken = signToken({
      sub: userId,
      email,
      name: fullName,
      roles,
    });

    const authHeader = String(req.headers.authorization ?? "");
    const previousToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;

    const ipAddress = resolveClientIp(req);
    const userAgent = resolveDeviceFromUserAgent(req.get("user-agent") ?? null);
    const location = resolveLocationFromIp(ipAddress);

    await persistUserSession({
      userId,
      token: accessToken,
      previousToken,
      ipAddress,
      userAgent,
    });

    await notifyLoginChannelsIfIpChanged({
      userId,
      to: email,
      userFullName: fullName,
      ip: ipAddress,
      userAgent,
      location,
    });

    return res.json({
      tokenType: "Bearer",
      accessToken,
      expiresIn: jwtExpiresIn(),
      user: {
        id: userId,
        email,
        name: fullName,
        roles,
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
    const normalizedEmail = String(email).trim().toLowerCase();
    const maskedEmail = maskEmailAddress(normalizedEmail);
    const user = await findUserByEmail(normalizedEmail);

    // Always return success to avoid leaking whether email exists
    if (!user) {
      return res.json({
        message: "If the email exists, a reset link has been sent.",
        maskedEmail,
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

    const origin = webOrigin() || apiOrigin();
    const resetPath = `/reset-password?token=${encodeURIComponent(resetToken)}`;
    const resetLink = origin ? `${origin}${resetPath}` : resetPath;

    // Best-effort: keep generic response shape even if email transport fails.
    try {
      await sendTemplatedEmail({
        templateKey: "password_reset",
        to: user.email,
        data: {
          app_name: appName(),
          user_full_name: publicUser(user).name || user.email,
          reset_link: resetLink,
          reset_expires_minutes: "60",
          support_email: process.env.SUPPORT_EMAIL?.trim() || process.env.EMAIL_FROM?.trim() || "",
        },
        accent: "security",
      });
    } catch (e) {
      console.error(
        "[Email] Failed to send password reset email:",
        e instanceof Error ? e.message : e
      );
    }

    return res.json({
      message: "If the email exists, a reset link has been sent.",
      maskedEmail,
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

    res.locals.auditUserId = rows[0].id;
    res.locals.auditAction = "AUTH_PASSWORD_RESET";
    res.locals.auditTargetType = "auth";
    res.locals.auditTargetId = rows[0].id;

    return res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    return next(err);
  }
});
