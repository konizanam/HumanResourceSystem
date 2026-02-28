"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const zod_1 = require("zod");
const notFoundHandler = (_req, res) => {
    res.status(404).json({ error: { message: "Not found" } });
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            error: {
                message: "Validation error",
                issues: err.issues,
            },
        });
    }
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = typeof err?.message === "string" ? err.message : "Server error";
    return res.status(status).json({ error: { message } });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errors.js.map