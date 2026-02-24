"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = require("./auth.routes");
const profile_routes_1 = __importDefault(require("./profile.routes"));
const company_routes_1 = __importDefault(require("./company.routes"));
const document_routes_1 = __importDefault(require("./document.routes"));
const me_1 = require("./me");
const geo_routes_1 = require("./geo.routes");
const emailTemplates_routes_1 = __importDefault(require("./emailTemplates.routes"));
const job_seeker_1 = require("./job-seeker");
const jobRoutes_1 = __importDefault(require("./jobRoutes"));
const applicationRoutes_1 = __importDefault(require("./applicationRoutes"));
const employerRoutes_1 = __importDefault(require("./employerRoutes"));
const jobSeekerResumeRoutes_1 = __importDefault(require("./jobSeekerResumeRoutes"));
const jobSeekerSkillsRoutes_1 = __importDefault(require("./jobSeekerSkillsRoutes"));
const jobSeekerCertificationsRoutes_1 = __importDefault(require("./jobSeekerCertificationsRoutes"));
const notificationsRoutes_1 = __importDefault(require("./notificationsRoutes"));
const adminRoutes_1 = __importDefault(require("./adminRoutes"));
const rolePermissionRoutes_1 = __importDefault(require("./rolePermissionRoutes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.authRouter);
router.use('/profile', profile_routes_1.default);
router.use('/companies', company_routes_1.default);
router.use('/documents', document_routes_1.default);
router.use('/users', me_1.meRouter);
router.use('/geo', geo_routes_1.geoRouter);
router.use('/email-templates', emailTemplates_routes_1.default);
router.use('/job-seeker', job_seeker_1.jobSeekerRouter);
router.use('/jobs', jobRoutes_1.default);
router.use('/applications', applicationRoutes_1.default);
router.use('/employers', employerRoutes_1.default);
router.use('/job-seeker/resume', jobSeekerResumeRoutes_1.default);
router.use('/job-seeker/skills', jobSeekerSkillsRoutes_1.default);
router.use('/job-seeker/certifications', jobSeekerCertificationsRoutes_1.default);
router.use('/notifications', notificationsRoutes_1.default);
router.use('/admin', adminRoutes_1.default);
router.use(rolePermissionRoutes_1.default);
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