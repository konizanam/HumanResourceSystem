"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const auth_1 = require("./routes/auth");
const me_1 = require("./routes/me");
const swagger_1 = require("./swagger");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const errors_1 = require("./errors");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
        credentials: false,
    }));
    app.use(express_1.default.json({ limit: "1mb" }));
    app.get("/api/health", (_req, res) => {
        res.json({ ok: true });
    });
    app.use("/api/auth", auth_1.authRouter);
    app.use("/api", me_1.meRouter);
    app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup((0, swagger_1.createOpenApiSpec)()));
    app.use(errors_1.notFoundHandler);
    app.use(errors_1.errorHandler);
    return app;
}
//# sourceMappingURL=server.js.map