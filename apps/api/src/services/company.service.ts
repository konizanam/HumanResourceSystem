import { DatabaseService } from './database.service';
import { query } from '../config/database';  // Add this import
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { getCompanyApprovalMode } from './systemSettings.service';

export class CompanyService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  async getAllCompanies(userId: string) {
    const userPermissions = await this.db.getUserPermissions(userId);
    const isSystemManager = userPermissions.includes('MANAGE_USERS');

    // Get companies based on role / association
    let companies;
    if (isSystemManager) {
      // Admin sees all companies - use query directly
      companies = await query(
        `SELECT c.*, 
          (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
          (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
             FROM company_users cu2
             JOIN users u2 ON u2.id = cu2.user_id
            WHERE cu2.company_id = c.id) as user_names,
          u.first_name || ' ' || u.last_name as created_by_name,
           COALESCE(c.status, 'active') as status
         FROM companies c
         LEFT JOIN users u ON c.created_by = u.id
         ORDER BY c.created_at DESC`
      );
    } else {
      // Regular users see only companies they're associated with
      companies = await query(
        `SELECT c.*, 
          (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
          (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
             FROM company_users cu2
             JOIN users u2 ON u2.id = cu2.user_id
            WHERE cu2.company_id = c.id) as user_names,
          u.first_name || ' ' || u.last_name as created_by_name,
          COALESCE(c.status, 'active') as status
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
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name,
        COALESCE(c.status, 'active') as status
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
    const { name, industry, description, website, logo_url, contact_email, contact_phone, address_line1, address_line2, city, country } = companyData;
    const approvalMode = await getCompanyApprovalMode();
    const initialStatus = approvalMode === 'pending' ? 'pending' : 'active';

    // Create company
    const result = await query(
      `INSERT INTO companies (
        name, industry, description, website, logo_url, contact_email, contact_phone,
        address_line1, address_line2, city, country, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [name, industry, description, website, logo_url, contact_email, contact_phone, address_line1, address_line2, city, country, userId, initialStatus]
    );

    const company = result.rows[0];

    // Automatically add creator to company users
    await query(
      'INSERT INTO company_users (company_id, user_id) VALUES ($1, $2)',
      [company.id, userId]
    );

    // Return enriched company (created_by_name, user_names, user_count, status)
    const enriched = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name,
        COALESCE(c.status, 'active') as status
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [company.id]
    );

    return enriched.rows[0] ?? company;
  }

  async updateCompany(companyId: string, userId: string, updates: any) {
    // Check if user has edit permission
    const hasEditPermission = await this.checkCompanyPermission(companyId, userId, 'MANAGE_COMPANY');
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
    const hasDeactivatePermission = await this.checkCompanyPermission(companyId, userId, 'MANAGE_COMPANY');
    if (!hasDeactivatePermission) {
      throw new ForbiddenError('You do not have permission to deactivate this company');
    }

    const result = await query(
      `UPDATE companies
         SET status = 'deactivated'
       WHERE id = $1
       RETURNING id`,
      [companyId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    const enriched = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name,
        COALESCE(c.status, 'active') as status
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [companyId]
    );

    return enriched.rows[0];
  }

  async reactivateCompany(companyId: string, userId: string) {
    // Check if user has manage permission
    const hasManagePermission = await this.checkCompanyPermission(companyId, userId, 'MANAGE_COMPANY');
    if (!hasManagePermission) {
      throw new ForbiddenError('You do not have permission to reactivate this company');
    }

    const result = await query(
      `UPDATE companies
         SET status = 'active'
       WHERE id = $1
       RETURNING id`,
      [companyId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    const enriched = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name,
        COALESCE(c.status, 'active') as status
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [companyId]
    );

    return enriched.rows[0];
  }

  async approveCompany(companyId: string, userId: string) {
    const hasApprovePermission = await this.checkCompanyPermission(companyId, userId, 'APPROVE_COMPANY');
    if (!hasApprovePermission) {
      throw new ForbiddenError('You do not have permission to approve this company');
    }

    const result = await query(
      `UPDATE companies
         SET status = 'active'
       WHERE id = $1
       RETURNING id`,
      [companyId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    const enriched = await query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name,
        COALESCE(c.status, 'active') as status
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [companyId]
    );

    return enriched.rows[0];
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
    // MANAGE_USERS acts as system admin capability in permission-based checks.
    const userPermissions = await this.db.getUserPermissions(userId);
    if (userPermissions.includes('MANAGE_USERS')) {
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