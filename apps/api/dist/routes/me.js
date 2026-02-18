"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const users_1 = require("../users");
exports.meRouter = (0, express_1.Router)();
exports.meRouter.get("/me", auth_1.requireAuth, async (req, res, next) => {
    try {
        const user = await (0, users_1.findUserById)(req.auth.sub);
        if (!user) {
            return res.status(401).json({ error: { message: "User not found" } });
        }
        return res.json({ user: (0, users_1.publicUser)(user) });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=me.js.map