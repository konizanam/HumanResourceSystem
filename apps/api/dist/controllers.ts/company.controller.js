"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyController = void 0;
const company_service_1 = require("../services/company.service");
const errors_1 = require("../utils/errors");
const params_1 = require("../utils/params");
class CompanyController {
    constructor() {
        this.companyService = new company_service_1.CompanyService();
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
            const userRoles = req.user.roles || [];
            // Check if user has permission to create company (ADMIN or HR_MANAGER)
            if (!userRoles.includes('ADMIN') && !userRoles.includes('HR_MANAGER')) {
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
            const userRoles = req.user.roles || [];
            // Check if user has edit permission
            if (!userRoles.includes('ADMIN') && !userRoles.includes('HR_MANAGER')) {
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
            const userRoles = req.user.roles || [];
            // Only ADMIN can deactivate companies
            if (!userRoles.includes('ADMIN')) {
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
            const userRoles = req.user.roles || [];
            // Only ADMIN can reactivate companies
            if (!userRoles.includes('ADMIN')) {
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
            const userRoles = req.user.roles || [];
            // Check if user has permission to manage company users
            if (!userRoles.includes('ADMIN') && !userRoles.includes('HR_MANAGER')) {
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
            const userRoles = req.user.roles || [];
            // Check if user has permission to manage company users
            if (!userRoles.includes('ADMIN') && !userRoles.includes('HR_MANAGER')) {
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
}
exports.CompanyController = CompanyController;
//# sourceMappingURL=company.controller.js.map