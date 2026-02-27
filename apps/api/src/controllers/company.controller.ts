import { Request, Response, NextFunction } from 'express';
import { CompanyService } from '../services/company.service';
import { BadRequestError, ForbiddenError } from '../utils/errors';
import { getStringParam } from '../utils/params';
import {
  getCompanyApprovalMode,
  getSystemSettings,
  setCompanyApprovalMode,
  updateSystemSettings,
} from '../services/systemSettings.service';
import { logAudit } from '../helpers/auditLogger';

function hasPermission(req: Request, permission: string): boolean {
  const permissions = Array.isArray(req.user?.permissions) ? req.user?.permissions : [];
  return permissions.includes(permission);
}

function hasAnyPermission(req: Request, candidates: string[]): boolean {
  return candidates.some((permission) => hasPermission(req, permission));
}

export class CompanyController {
  private companyService: CompanyService;

  constructor() {
    this.companyService = new CompanyService();

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
    this.getSystemSettings = this.getSystemSettings.bind(this);
    this.updateSystemSettings = this.updateSystemSettings.bind(this);
  }

  // Get all companies
  async getAllCompanies(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const companies = await this.companyService.getAllCompanies(userId);
      
      res.json({
        status: 'success',
        data: companies
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single company by ID
  async getCompanyById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getStringParam(req, 'id'); // This already returns a string
      const userId = req.user!.userId;

      const company = await this.companyService.getCompanyById(id, userId);
      
      res.json({
        status: 'success',
        data: company
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new company
  async createCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY', 'CREATE_JOB'])) {
        throw new ForbiddenError('You do not have permission to create companies');
      }

      const company = await this.companyService.createCompany(userId, req.body);
      await logAudit({
        userId,
        action: 'COMPANY_CREATED',
        targetType: 'company',
        targetId: company.id,
      });
      
      res.status(201).json({
        status: 'success',
        data: company
      });
    } catch (error) {
      next(error);
    }
  }

  // Update company
  async updateCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getStringParam(req, 'id');
      const userId = req.user!.userId;

      if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY'])) {
        throw new ForbiddenError('You do not have permission to edit companies');
      }

      const company = await this.companyService.updateCompany(id, userId, req.body);
      await logAudit({
        userId,
        action: 'COMPANY_UPDATED',
        targetType: 'company',
        targetId: id,
      });
      
      res.json({
        status: 'success',
        data: company
      });
    } catch (error) {
      next(error);
    }
  }

  // Deactivate company
  async deactivateCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getStringParam(req, 'id');
      const userId = req.user!.userId;

      if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY'])) {
        throw new ForbiddenError('You do not have permission to deactivate companies');
      }

      const company = await this.companyService.deactivateCompany(id, userId);
      
      res.json({
        status: 'success',
        data: company,
        message: 'Company deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Reactivate company
  async reactivateCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getStringParam(req, 'id');
      const userId = req.user!.userId;

      if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY'])) {
        throw new ForbiddenError('You do not have permission to reactivate companies');
      }

      const company = await this.companyService.reactivateCompany(id, userId);
      
      res.json({
        status: 'success',
        data: company,
        message: 'Company reactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get company users
  async getCompanyUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getStringParam(req, 'id');
      const userId = req.user!.userId;
      
      const users = await this.companyService.getCompanyUsers(id, userId);
      
      res.json({
        status: 'success',
        data: users
      });
    } catch (error) {
      next(error);
    }
  }

  // Add user to company
  async addUserToCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getStringParam(req, 'id');
      const { userId: targetUserId } = req.body;
      const currentUserId = req.user!.userId;

      if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY_USERS'])) {
        throw new ForbiddenError('You do not have permission to manage company users');
      }

      const result = await this.companyService.addUserToCompany(id, targetUserId, currentUserId);
      
      res.status(201).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Remove user from company
  async removeUserFromCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getStringParam(req, 'id');
      const targetUserId = getStringParam(req, 'userId');
      const currentUserId = req.user!.userId;

      if (!hasAnyPermission(req, ['MANAGE_USERS', 'MANAGE_COMPANY_USERS'])) {
        throw new ForbiddenError('You do not have permission to manage company users');
      }

      await this.companyService.removeUserFromCompany(id, targetUserId, currentUserId);
      
      res.json({
        status: 'success',
        message: 'User removed from company successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  async approveCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const id = getStringParam(req, 'id');
      const userId = req.user!.userId;

      if (!hasAnyPermission(req, ['MANAGE_USERS', 'APPROVE_COMPANY'])) {
        throw new ForbiddenError('You do not have permission to approve companies');
      }

      const company = await this.companyService.approveCompany(id, userId);
      await logAudit({
        userId,
        action: 'COMPANY_APPROVED',
        targetType: 'company',
        targetId: id,
      });
      res.json({
        status: 'success',
        data: company,
        message: 'Company approved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getApprovalMode(req: Request, res: Response, next: NextFunction) {
    try {
      if (!hasPermission(req, 'MANAGE_USERS')) {
        throw new ForbiddenError('You do not have permission to view company approval settings');
      }

      const mode = await getCompanyApprovalMode();
      res.json({
        status: 'success',
        data: { company_approval_mode: mode },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateApprovalMode(req: Request, res: Response, next: NextFunction) {
    try {
      if (!hasPermission(req, 'MANAGE_USERS')) {
        throw new ForbiddenError('You do not have permission to update company approval settings');
      }

      const modeRaw = String(req.body?.company_approval_mode ?? '').trim();
      if (modeRaw !== 'auto_approved' && modeRaw !== 'pending') {
        throw new BadRequestError('Invalid company approval mode');
      }

      const mode = await setCompanyApprovalMode(modeRaw);
      res.json({
        status: 'success',
        data: { company_approval_mode: mode },
      });
    } catch (error) {
      next(error);
    }
  }

  async getSystemSettings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!hasPermission(req, 'MANAGE_USERS')) {
        throw new ForbiddenError('You do not have permission to view system settings');
      }

      const settings = await getSystemSettings();
      res.json({
        status: 'success',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateSystemSettings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!hasPermission(req, 'MANAGE_USERS')) {
        throw new ForbiddenError('You do not have permission to update system settings');
      }

      const systemName =
        req.body?.system_name === undefined ? undefined : String(req.body.system_name);
      const brandingLogo =
        req.body?.branding_logo_url === undefined
          ? undefined
          : String(req.body.branding_logo_url);

      if (systemName !== undefined && !systemName.trim()) {
        throw new BadRequestError('System name is required');
      }

      const settings = await updateSystemSettings({
        system_name: systemName,
        branding_logo_url: brandingLogo,
      });
      res.json({
        status: 'success',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }
}