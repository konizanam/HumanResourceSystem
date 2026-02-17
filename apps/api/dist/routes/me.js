"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRouter = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
exports.meRouter = (0, express_1.Router)();
exports.meRouter.get("/me", auth_1.requireAuth, (req, res) => {
    res.json({ user: req.auth });
});
//# sourceMappingURL=me.js.map