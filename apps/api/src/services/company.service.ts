import { DatabaseService } from './database.service';
import { query } from '../config/database';  // Add this import
import { NotFoundError, ForbiddenError } from '../utils/errors';

export class CompanyService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  async getAllCompanies(userId: string) {
    // Get user's permissions
    const userPermissions = await this.db.getUserPermissions(userId);
    
    // Get companies based on permissions
    let companies;
    if (userPermissions.includes('ADMIN')) {
      // Admin sees all companies - use query directly
      companies = await query(
        `SELECT c.*, 
          (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
          u.first_name || ' ' || u.last_name as created_by_name
         FROM companies c
         LEFT JOIN users u ON c.created_by = u.id
         ORDER BY c.created_at DESC`
      );
    } else {
      // Regular users see only companies they're associated with
      companies = await query(
        `SELECT c.*, 
          (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
          u.first_name || ' ' || u.last_name as created_by_name
         FROM companies c
         LEFT JOIN users u ON c.created_by = u.id
         WHERE c.id IN (
           SELECT company_id FROM company_users WHERE user_id = $1
         )
         ORDER BY c.created_at DESC`,
        [userId]
      );
    }

    return companies.rows;
  }

  async getCompanyById(companyId: string, userId: string) {
    // Check if user has access to this company
    const hasAccess = await this.db.checkCompanyAccess(companyId, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this company');
    }

    const result = await query(
      `SELECT c.*, 
        u.first_name || ' ' || u.last_name as created_by_name
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [companyId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    return result.rows[0];
  }

  async createCompany(userId: string, companyData: any) {
    const { name, industry, description, website, contact_email, contact_phone, address_line1, address_line2, city, country } = companyData;

    // Create company
    const result = await query(
      `INSERT INTO companies (
        name, industry, description, website, contact_email, contact_phone,
        address_line1, address_line2, city, country, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [name, industry, description, website, contact_email, contact_phone, address_line1, address_line2, city, country, userId]
    );

    const company = result.rows[0];

    // Automatically add creator to company users
    await query(
      'INSERT INTO company_users (company_id, user_id) VALUES ($1, $2)',
      [company.id, userId]
    );

    return company;
  }

  async updateCompany(companyId: string, userId: string, updates: any) {
    // Check if user has edit permission
    const hasEditPermission = await this.checkCompanyPermission(companyId, userId, 'EDIT_COMPANY');
    if (!hasEditPermission) {
      throw new ForbiddenError('You do not have permission to edit this company');
    }

    // Build dynamic update query
    const allowedFields = ['name', 'industry', 'description', 'website', 'contact_email', 'contact_phone', 'address_line1', 'address_line2', 'city', 'country', 'logo_url'];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(companyId);
    const updateQuery = `
      UPDATE companies 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    return result.rows[0];
  }

  async deactivateCompany(companyId: string, userId: string) {
    // Check if user has deactivate permission
    const hasDeactivatePermission = await this.checkCompanyPermission(companyId, userId, 'DEACTIVATE_COMPANY');
    if (!hasDeactivatePermission) {
      throw new ForbiddenError('You do not have permission to deactivate this company');
    }

    // First, check if company exists
    const result = await query(
      'SELECT * FROM companies WHERE id = $1',
      [companyId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    // Update company status (you'll need to add a status column to companies table)
    // For now, we'll just return the company with a deactivated flag
    return { ...result.rows[0], status: 'deactivated' };
  }

  async reactivateCompany(companyId: string, userId: string) {
    // Check if user has manage permission
    const hasManagePermission = await this.checkCompanyPermission(companyId, userId, 'MANAGE_COMPANY');
    if (!hasManagePermission) {
      throw new ForbiddenError('You do not have permission to reactivate this company');
    }

    const result = await query(
      'SELECT * FROM companies WHERE id = $1',
      [companyId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    return { ...result.rows[0], status: 'active' };
  }

  async getCompanyUsers(companyId: string, userId: string) {
    // Check if user has access to this company
    const hasAccess = await this.db.checkCompanyAccess(companyId, userId);
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this company');
    }

    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active,
        array_agg(r.name) as roles
       FROM users u
       JOIN company_users cu ON u.id = cu.user_id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE cu.company_id = $1
       GROUP BY u.id, u.first_name, u.last_name, u.email, u.is_active
       ORDER BY u.created_at DESC`,
      [companyId]
    );

    return result.rows;
  }

  async addUserToCompany(companyId: string, targetUserId: string, currentUserId: string) {
    // Check if current user has manage users permission
    const hasManagePermission = await this.checkCompanyPermission(companyId, currentUserId, 'MANAGE_COMPANY_USERS');
    if (!hasManagePermission) {
      throw new ForbiddenError('You do not have permission to manage company users');
    }

    // Check if company exists
    const company = await query('SELECT * FROM companies WHERE id = $1', [companyId]);
    if (company.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    // Check if user exists
    const user = await query('SELECT * FROM users WHERE id = $1', [targetUserId]);
    if (user.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    // Add user to company
    await query(
      'INSERT INTO company_users (company_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [companyId, targetUserId]
    );

    return { message: 'User added to company successfully' };
  }

  async removeUserFromCompany(companyId: string, targetUserId: string, currentUserId: string) {
    // Check if current user has manage users permission
    const hasManagePermission = await this.checkCompanyPermission(companyId, currentUserId, 'MANAGE_COMPANY_USERS');
    if (!hasManagePermission) {
      throw new ForbiddenError('You do not have permission to manage company users');
    }

    // Prevent removing yourself
    if (targetUserId === currentUserId) {
      throw new ForbiddenError('You cannot remove yourself from the company');
    }

    // Remove user from company
    const result = await query(
      'DELETE FROM company_users WHERE company_id = $1 AND user_id = $2',
      [companyId, targetUserId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('User not found in this company');
    }
  }

  private async checkCompanyPermission(companyId: string, userId: string, permission: string): Promise<boolean> {
    // Check if user is admin
    const userPermissions = await this.db.getUserPermissions(userId);
    if (userPermissions.includes('ADMIN')) {
      return true;
    }

    // Check if user has specific permission and is associated with company
    if (!userPermissions.includes(permission)) {
      return false;
    }

    // Check if user is associated with company
    return this.db.checkCompanyAccess(companyId, userId);
  }
}