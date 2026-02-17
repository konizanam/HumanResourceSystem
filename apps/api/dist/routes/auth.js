"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const users_1 = require("../users");
exports.authRouter = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.authRouter.post("/login", async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = (0, users_1.findUserByEmail)(email);
        if (!user) {
            return res.status(401).json({ error: { message: "Invalid credentials" } });
        }
        const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ error: { message: "Invalid credentials" } });
        }
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ error: { message: "JWT_SECRET is not configured" } });
        }
        const expiresIn = (() => {
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
        })();
        const accessToken = jsonwebtoken_1.default.sign({
            sub: user.id,
            email: user.email,
            name: user.name,
            roles: user.roles,
        }, secret, { expiresIn });
        return res.json({
            tokenType: "Bearer",
            accessToken,
            expiresIn,
            user: (0, users_1.publicUser)(user),
        });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=auth.js.map