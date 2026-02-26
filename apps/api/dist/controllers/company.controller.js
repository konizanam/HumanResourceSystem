"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyController = void 0;
const company_service_1 = require("../services/company.service");
const errors_1 = require("../utils/errors");
const params_1 = require("../utils/params");
const systemSettings_service_1 = require("../services/systemSettings.service");
function hasPermission(req, permission) {
    const permissions = Array.isArray(req.user?.permissions) ? req.user?.permissions : [];
    return permissions.includes(permission);
}
function hasAnyPermission(req, candidates) {
    return candidates.some((permission) => hasPermission(req, permission));
}
class CompanyController {
    constructor() {
        this.companyService = new company_service_1.CompanyService();
        // Bind handlers so `this.companyService` is available when passed to Express.
        this.getAllCompanies = this.getAllCompanies.bind(this);
        this.getCompanyById = this.getCompanyById.bind(this);
        this.createCompany = this.createCompany.bind(this);
        this.updateCompany = this.updateCompany.bind(this);
        this.deactivateCompany = this.deactivateCompany.bind(this);
        this.reactivateCompany = this.reactivateCompany.bind(this);
        this.getCompanyUsers = this.getCompanyUsers.bind(this);
        this.addUserToCompany = this.addUserToCompany.bind(this);
        this.removeUserFromCompany = this.removeUserFromCompany.bind(this);
        this.approveCompany = this.approveCompany.bind(this);
        this.getApprovalMode = this.getApprovalMode.bind(this);
        this.updateApprovalMode = this.updateApprovalMode.bind(this);
    }
    // Get all companies
    async getAllCompanies(req, res, next) {
        try {
            const userId = req.user.userId;
            const companies = await this.companyService.getAllCompanies(userId);
            res.json({
                status: 'success',
                data: companies
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Get single company by ID
    async getCompanyById(req, res, next) {
        try {
            const id = (0, params_1.getStringParam)(req, 'id'); // This already returns a string
            const userId = req.user.userId;
            const company = await this.companyService.getCompanyById(id, userId);
            res.json({
                status: 'success',
                data: company
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Create new company
    async createCompany(req, res, next) {
        try {
            const userId = req.user.userId;
            if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY', 'CREATE_JOB'])) {
                throw new errors_1.ForbiddenError('You do not have permission to create companies');
            }
            const company = await this.companyService.createCompany(userId, req.body);
            res.status(201).json({
                status: 'success',
                data: company
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Update company
    async updateCompany(req, res, next) {
        try {
            const id = (0, params_1.getStringParam)(req, 'id');
            const userId = req.user.userId;
            if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY'])) {
                throw new errors_1.ForbiddenError('You do not have permission to edit companies');
            }
            const company = await this.companyService.updateCompany(id, userId, req.body);
            res.json({
                status: 'success',
                data: company
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Deactivate company
    async deactivateCompany(req, res, next) {
        try {
            const id = (0, params_1.getStringParam)(req, 'id');
            const userId = req.user.userId;
            if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY'])) {
                throw new errors_1.ForbiddenError('You do not have permission to deactivate companies');
            }
            const company = await this.companyService.deactivateCompany(id, userId);
            res.json({
                status: 'success',
                data: company,
                message: 'Company deactivated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Reactivate company
    async reactivateCompany(req, res, next) {
        try {
            const id = (0, params_1.getStringParam)(req, 'id');
            const userId = req.user.userId;
            if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY'])) {
                throw new errors_1.ForbiddenError('You do not have permission to reactivate companies');
            }
            const company = await this.companyService.reactivateCompany(id, userId);
            res.json({
                status: 'success',
                data: company,
                message: 'Company reactivated successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Get company users
    async getCompanyUsers(req, res, next) {
        try {
            const id = (0, params_1.getStringParam)(req, 'id');
            const userId = req.user.userId;
            const users = await this.companyService.getCompanyUsers(id, userId);
            res.json({
                status: 'success',
                data: users
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Add user to company
    async addUserToCompany(req, res, next) {
        try {
            const id = (0, params_1.getStringParam)(req, 'id');
            const { userId: targetUserId } = req.body;
            const currentUserId = req.user.userId;
            if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY_USERS'])) {
                throw new errors_1.ForbiddenError('You do not have permission to manage company users');
            }
            const result = await this.companyService.addUserToCompany(id, targetUserId, currentUserId);
            res.status(201).json({
                status: 'success',
                data: result
            });
        }
        catch (error) {
            next(error);
        }
    }
    // Remove user from company
    async removeUserFromCompany(req, res, next) {
        try {
            const id = (0, params_1.getStringParam)(req, 'id');
            const targetUserId = (0, params_1.getStringParam)(req, 'userId');
            const currentUserId = req.user.userId;
            if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY_USERS'])) {
                throw new errors_1.ForbiddenError('You do not have permission to manage company users');
            }
            await this.companyService.removeUserFromCompany(id, targetUserId, currentUserId);
            res.json({
                status: 'success',
                message: 'User removed from company successfully'
            });
        }
        catch (error) {
            next(error);
        }
    }
    async approveCompany(req, res, next) {
        try {
            const id = (0, params_1.getStringParam)(req, 'id');
            const userId = req.user.userId;
            if (!hasAnyPermission(req, ['MANAGE_USERS', 'APPROVE_COMPANY'])) {
                throw new errors_1.ForbiddenError('You do not have permission to approve companies');
            }
            const company = await this.companyService.approveCompany(id, userId);
            res.json({
                status: 'success',
                data: company,
                message: 'Company approved successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getApprovalMode(req, res, next) {
        try {
            if (!hasPermission(req, 'MANAGE_USERS')) {
                throw new errors_1.ForbiddenError('You do not have permission to view company approval settings');
            }
            const mode = await (0, systemSettings_service_1.getCompanyApprovalMode)();
            res.json({
                status: 'success',
                data: { company_approval_mode: mode },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateApprovalMode(req, res, next) {
        try {
            if (!hasPermission(req, 'MANAGE_USERS')) {
                throw new errors_1.ForbiddenError('You do not have permission to update company approval settings');
            }
            const modeRaw = String(req.body?.company_approval_mode ?? '').trim();
            if (modeRaw !== 'auto_approved' && modeRaw !== 'pending') {
                throw new errors_1.BadRequestError('Invalid company approval mode');
            }
            const mode = await (0, systemSettings_service_1.setCompanyApprovalMode)(modeRaw);
            res.json({
                status: 'success',
                data: { company_approval_mode: mode },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CompanyController = CompanyController;
//# sourceMappingURL=company.controller.js.map