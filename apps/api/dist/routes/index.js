"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/index.ts
const express_1 = require("express");
const auth_routes_1 = require("./auth.routes");
const profile_routes_1 = __importDefault(require("./profile.routes"));
const company_routes_1 = __importDefault(require("./company.routes"));
const document_routes_1 = __importDefault(require("./document.routes"));
const me_1 = require("./me");
const geo_routes_1 = require("./geo.routes");
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.authRouter);
router.use('/profile', profile_routes_1.default);
router.use('/companies', company_routes_1.default);
router.use('/documents', document_routes_1.default);
router.use('/users', me_1.meRouter);
router.use('/geo', geo_routes_1.geoRouter);
// Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});
exports.default = router;
//# sourceMappingURL=index.js.map