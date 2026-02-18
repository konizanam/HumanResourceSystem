"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const db_1 = require("../db");
const users_1 = require("../users");
exports.authRouter = (0, express_1.Router)();
/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function jwtExpiresIn() {
    const raw = process.env.JWT_EXPIRES_IN;
    if (!raw)
        return "15m";
    const trimmed = raw.trim();
    if (!trimmed)
        return "15m";
    if (/^\d+$/.test(trimmed))
        return Number(trimmed);
    if (/^\d+(ms|s|m|h|d|w|y)$/.test(trimmed))
        return trimmed;
    return "15m";
}
function signToken(payload) {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error("JWT_SECRET is not configured");
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: jwtExpiresIn() });
}
/* ------------------------------------------------------------------ */
/*  POST /api/auth/register                                            */
/* ------------------------------------------------------------------ */
const registerSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1, "First name is required").max(100),
    lastName: zod_1.z.string().min(1, "Last name is required").max(100),
    email: zod_1.z.string().email("Invalid email address"),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, "Password must include upper, lower, number and special character"),
    confirmPassword: zod_1.z.string(),
}).refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
exports.authRouter.post("/register", async (req, res, next) => {
    const client = await (0, db_1.getClient)();
    try {
        const data = registerSchema.parse(req.body);
        // Check if email already exists
        const existing = await (0, users_1.findUserByEmail)(data.email);
        if (existing) {
            return res
                .status(409)
                .json({ error: { message: "Email is already registered" } });
        }
        const passwordHash = await bcryptjs_1.default.hash(data.password, 12);
        await client.query("BEGIN");
        // Insert user
        const { rows: userRows } = await client.query(`INSERT INTO users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id`, [data.firstName, data.lastName, data.email, passwordHash]);
        const userId = userRows[0].id;
        // Assign JOB_SEEKER role
        await client.query(`INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = 'JOB_SEEKER'`, [userId]);
        // Create empty job seeker profile
        await client.query(`INSERT INTO job_seeker_profiles (user_id) VALUES ($1)`, [userId]);
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
    }
    catch (err) {
        await client.query("ROLLBACK").catch(() => { });
        return next(err);
    }
    finally {
        client.release();
    }
});
/* ------------------------------------------------------------------ */
/*  POST /api/auth/login                                               */
/* ------------------------------------------------------------------ */
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.authRouter.post("/login", async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await (0, users_1.findUserByEmail)(email);
        if (!user || !user.is_active) {
            return res
                .status(401)
                .json({ error: { message: "Invalid credentials" } });
        }
        const ok = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!ok) {
            return res
                .status(401)
                .json({ error: { message: "Invalid credentials" } });
        }
        const pub = (0, users_1.publicUser)(user);
        const accessToken = signToken({
            sub: user.id,
            email: user.email,
            name: pub.name,
            roles: user.roles,
        });
        return res.json({
            tokenType: "Bearer",
            accessToken,
            expiresIn: jwtExpiresIn(),
            user: pub,
        });
    }
    catch (err) {
        return next(err);
    }
});
/* ------------------------------------------------------------------ */
/*  POST /api/auth/forgot-password                                     */
/* ------------------------------------------------------------------ */
const forgotSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.authRouter.post("/forgot-password", async (req, res, next) => {
    try {
        const { email } = forgotSchema.parse(req.body);
        const user = await (0, users_1.findUserByEmail)(email);
        // Always return success to avoid leaking whether email exists
        if (!user) {
            return res.json({
                message: "If the email exists, a reset link has been sent.",
            });
        }
        const resetToken = (0, uuid_1.v4)();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await (0, db_1.query)(`UPDATE users
       SET password_reset_token = $1,
           password_reset_expires_at = $2,
           password_reset_requested_at = NOW()
       WHERE id = $3`, [resetToken, expiresAt.toISOString(), user.id]);
        // In production, send an email with the reset link.
        // For development, log the token.
        console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
        return res.json({
            message: "If the email exists, a reset link has been sent.",
            // Include token in response for development only:
            ...(process.env.NODE_ENV !== "production" && { resetToken }),
        });
    }
    catch (err) {
        return next(err);
    }
});
/* ------------------------------------------------------------------ */
/*  POST /api/auth/reset-password                                      */
/* ------------------------------------------------------------------ */
const resetSchema = zod_1.z.object({
    token: zod_1.z.string().uuid("Invalid reset token"),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/, "Password must include upper, lower, number and special character"),
    confirmPassword: zod_1.z.string(),
}).refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
exports.authRouter.post("/reset-password", async (req, res, next) => {
    try {
        const { token, password } = resetSchema.parse(req.body);
        const { rows } = await (0, db_1.query)(`SELECT id FROM users
       WHERE password_reset_token = $1
         AND password_reset_expires_at > NOW()`, [token]);
        if (rows.length === 0) {
            return res
                .status(400)
                .json({ error: { message: "Invalid or expired reset token" } });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        await (0, db_1.query)(`UPDATE users
       SET password_hash = $1,
           password_reset_token = NULL,
           password_reset_expires_at = NULL,
           password_reset_requested_at = NULL,
           updated_at = NOW()
       WHERE id = $2`, [passwordHash, rows[0].id]);
        return res.json({ message: "Password has been reset successfully" });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=auth.js.map