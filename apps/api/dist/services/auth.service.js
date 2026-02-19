"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
// src/services/auth.service.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_service_1 = require("./database.service");
const errors_1 = require("../utils/errors");
class AuthService {
    constructor() {
        this.db = new database_service_1.DatabaseService();
    }
    async register(firstName, lastName, email, password) {
        // Check if user already exists
        const existingUser = await this.db.getUserByEmail(email);
        if (existingUser) {
            throw new errors_1.ConflictError('User with this email already exists');
        }
        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
        const passwordHash = await bcrypt_1.default.hash(password, saltRounds);
        // Create user
        const user = await this.db.createUser(firstName, lastName, email, passwordHash);
        // Assign JOB_SEEKER role
        await this.db.assignJobSeekerRole(user.id);
        // Create initial job seeker profile
        await this.db.createJobSeekerProfile(user.id, {});
        // Get user roles
        const roles = await this.db.getUserRoles(user.id);
        // Generate token
        const token = this.generateToken(user, roles);
        return {
            token,
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                roles
            }
        };
    }
    async login(email, password) {
        // Get user
        const user = await this.db.getUserByEmail(email);
        if (!user) {
            throw new errors_1.UnauthorizedError('Invalid email or password');
        }
        // Check if user is active
        if (!user.is_active) {
            throw new errors_1.UnauthorizedError('Account is deactivated');
        }
        // Verify password
        const isValidPassword = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new errors_1.UnauthorizedError('Invalid email or password');
        }
        // Get user roles
        const roles = await this.db.getUserRoles(user.id);
        // Generate token
        const token = this.generateToken(user, roles);
        return {
            token,
            user: {
                id: user.id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                roles
            }
        };
    }
    generateToken(user, roles) {
        const payload = {
            userId: user.id,
            email: user.email,
            roles
        };
        // Fix: Ensure JWT_SECRET is a string and handle expiration properly
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        // Fix: Use expiresIn as a string in the options object
        const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
        const options = { expiresIn: expiresIn };
        return jsonwebtoken_1.default.sign(payload, jwtSecret, options);
    }
    async validateToken(token) {
        try {
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                throw new Error('JWT_SECRET is not defined in environment variables');
            }
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            return decoded;
        }
        catch (error) {
            throw new errors_1.UnauthorizedError('Invalid token');
        }
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.service.js.map