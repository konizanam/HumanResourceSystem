"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const requireAuth = (req, res, next) => {
    const header = req.header("authorization");
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
        return res.status(401).json({ error: { message: "Missing bearer token" } });
    }
    const token = header.slice("bearer ".length);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({ error: { message: "JWT_SECRET is not configured" } });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, secret);
        req.auth = payload;
        return next();
    }
    catch {
        return res.status(401).json({ error: { message: "Invalid or expired token" } });
    }
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=auth.js.map