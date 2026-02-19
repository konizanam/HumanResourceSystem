"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isJobSeeker = exports.authorizePermission = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../utils/errors");
const database_1 = require("../config/database");
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('No token provided');
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Check if user still exists and is active
        const result = await (0, database_1.query)('SELECT id, email, is_active FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows.length === 0 || !result.rows[0].is_active) {
            throw new errors_1.UnauthorizedError('User not found or inactive');
        }
        // Get user permissions
        const permissionsResult = await (0, database_1.query)(`SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`, [decoded.userId]);
        const permissions = permissionsResult.rows.map(row => row.name);
        // Add permissions to the user object
        req.user = {
            ...decoded,
            permissions
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errors_1.UnauthorizedError('Invalid token'));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errors_1.UnauthorizedError('Token expired'));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError('Authentication required'));
        }
        const hasRole = req.user.roles.some(role => allowedRoles.includes(role));
        if (!hasRole) {
            return next(new errors_1.ForbiddenError('Insufficient permissions'));
        }
        next();
    };
};
exports.authorize = authorize;
// New middleware for permission-based authorization
const authorizePermission = (...allowedPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError('Authentication required'));
        }
        // Admin always has all permissions
        if (req.user.roles.includes('ADMIN')) {
            return next();
        }
        const hasPermission = req.user.permissions?.some(permission => allowedPermissions.includes(permission));
        if (!hasPermission) {
            return next(new errors_1.ForbiddenError('Insufficient permissions'));
        }
        next();
    };
};
exports.authorizePermission = authorizePermission;
const isJobSeeker = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errors_1.UnauthorizedError('Authentication required');
        }
        // Check if user has JOB_SEEKER role
        if (!req.user.roles.includes('JOB_SEEKER')) {
            throw new errors_1.ForbiddenError('This endpoint is for job seekers only');
        }
        // Verify job seeker profile exists
        const result = await (0, database_1.query)('SELECT user_id FROM job_seeker_profiles WHERE user_id = $1', [req.user.userId]);
        if (result.rows.length === 0) {
            throw new errors_1.ForbiddenError('Job seeker profile not found');
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.isJobSeeker = isJobSeeker;
//# sourceMappingURL=auth.js.map