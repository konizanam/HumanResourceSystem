import { DatabaseService } from './database.service';
import { query } from '../config/database';  // Add this import
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { getCompanyApprovalMode } from './systemSettings.service';

export class CompanyService {
  private db: DatabaseService;

  constructor() {
    this.db = new DatabaseService();
  }

  private normalizePermissionName(input: string) {
    return String(input ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private async isAdminUser(userId: string): Promise<boolean> {
    const roles = await this.db.getUserRoles(userId);
    return Array.isArray(roles) && roles.some((r) => String(r).toUpperCase() === 'ADMIN');
  }

  private async hasSystemCompanyAccess(userId: string): Promise<boolean> {
    if (await this.isAdminUser(userId)) return true;
    const userPermissions = await this.db.getUserPermissions(userId);
    const normalized = new Set((userPermissions ?? []).map((p) => this.normalizePermissionName(p)));
    return normalized.has(this.normalizePermissionName('MANAGE_USERS'));
  }

  async getAllCompanies(userId: string) {
    const userPermissions = await this.db.getUserPermissions(userId);
    const isSystemManager = await this.hasSystemCompanyAccess(userId);
    const userRoles = await this.db.getUserRoles(userId);
    const isJobSeeker = userRoles.includes('JOB_SEEKER');

    const safeCompanySelect = `
      c.id,
      c.name,
      c.industry,
      c.description,
      c.website,
      c.logo_url,
      c.contact_email,
      c.contact_phone,
      c.address_line1,
      c.address_line2,
      c.city,
      c.country,
      c.created_by,
      c.created_at,
      COALESCE(c.status, 'active') as status,
      (c.logo_data IS NOT NULL) as has_logo
    `;

    // Get companies based on role / association
    let companies;
    if (isSystemManager) {
      // Admin sees all companies - use query directly
      companies = await query(
        `SELECT ${safeCompanySelect},
          (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
          (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
             FROM company_users cu2
             JOIN users u2 ON u2.id = cu2.user_id
            WHERE cu2.company_id = c.id) as user_names,
          u.first_name || ' ' || u.last_name as created_by_name
         FROM companies c
         LEFT JOIN users u ON c.created_by = u.id
         ORDER BY c.created_at DESC`
      );
    } else if (isJobSeeker) {
      // Job seekers can filter alerts by company, so return active companies.
      // Keep the payload lean (avoid exposing internal user linkage details).
      companies = await query(
        `SELECT
           c.id,
           c.name,
           c.industry,
           c.logo_url,
           (c.logo_data IS NOT NULL) as has_logo,
           COALESCE(c.status, 'active') as status,
           c.created_at
         FROM companies c
         WHERE COALESCE(c.status, 'active') = 'active'
         ORDER BY c.created_at DESC`
      );
    } else {
      // Regular users see only companies they're associated with
      companies = await query(
        `SELECT ${safeCompanySelect},
          (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
          (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
             FROM company_users cu2
             JOIN users u2 ON u2.id = cu2.user_id
            WHERE cu2.company_id = c.id) as user_names,
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
    const isSystemManager = await this.hasSystemCompanyAccess(userId);
    if (!isSystemManager) {
      const hasAccess = await this.db.checkCompanyAccess(companyId, userId);
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this company');
      }
    }

    const result = await query(
      `SELECT
        c.id,
        c.name,
        c.industry,
        c.description,
        c.website,
        c.logo_url,
        c.contact_email,
        c.contact_phone,
        c.address_line1,
        c.address_line2,
        c.city,
        c.country,
        c.created_by,
        c.created_at,
        COALESCE(c.status, 'active') as status,
        (c.logo_data IS NOT NULL) as has_logo,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
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

  async createCompany(userId: string, companyData: any, logoFile?: Express.Multer.File) {
    const { name, industry, description, website, contact_email, contact_phone, address_line1, address_line2, city, country } = companyData;
    const approvalMode = await getCompanyApprovalMode();
    const initialStatus = approvalMode === 'pending' ? 'pending' : 'active';

    const logoData = logoFile?.buffer ?? null;
    const logoMime = logoFile?.mimetype ?? null;
    const logoFilename = logoFile?.originalname ?? null;

    // Create company
    const result = await query(
      `INSERT INTO companies (
        name, industry, description, website, logo_url, logo_data, logo_mime, logo_filename, logo_updated_at,
        contact_email, contact_phone, address_line1, address_line2, city, country, created_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id`,
      [
        name,
        industry,
        description,
        website,
        null,
        logoData,
        logoMime,
        logoFilename,
        contact_email,
        contact_phone,
        address_line1,
        address_line2,
        city,
        country,
        userId,
        initialStatus,
      ]
    );

    const company = { id: result.rows[0]?.id };

    // Automatically add creator to company users
    await query(
      'INSERT INTO company_users (company_id, user_id) VALUES ($1, $2)',
      [company.id, userId]
    );

    // Return enriched company (created_by_name, user_names, user_count, status)
    const enriched = await query(
      `SELECT
        c.id,
        c.name,
        c.industry,
        c.description,
        c.website,
        c.logo_url,
        c.contact_email,
        c.contact_phone,
        c.address_line1,
        c.address_line2,
        c.city,
        c.country,
        c.created_by,
        c.created_at,
        COALESCE(c.status, 'active') as status,
        (c.logo_data IS NOT NULL) as has_logo,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [company.id]
    );

    return enriched.rows[0] ?? company;
  }

  async updateCompany(companyId: string, userId: string, updates: any, logoFile?: Express.Multer.File) {
    // Check if user has edit permission
    const hasEditPermission = await this.checkCompanyPermission(companyId, userId, 'MANAGE_COMPANY');
    if (!hasEditPermission) {
      throw new ForbiddenError('You do not have permission to edit this company');
    }

    // Build dynamic update query
    const allowedFields = ['name', 'industry', 'description', 'website', 'contact_email', 'contact_phone', 'address_line1', 'address_line2', 'city', 'country'];
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

    if (logoFile?.buffer) {
      updateFields.push(`logo_data = $${paramIndex}`);
      values.push(logoFile.buffer);
      paramIndex++;

      updateFields.push(`logo_mime = $${paramIndex}`);
      values.push(logoFile.mimetype);
      paramIndex++;

      updateFields.push(`logo_filename = $${paramIndex}`);
      values.push(logoFile.originalname);
      paramIndex++;

      updateFields.push(`logo_updated_at = NOW()`);
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(companyId);
    const updateQuery = `
      UPDATE companies 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      throw new NotFoundError('Company not found');
    }

    const enriched = await query(
      `SELECT
        c.id,
        c.name,
        c.industry,
        c.description,
        c.website,
        c.logo_url,
        c.contact_email,
        c.contact_phone,
        c.address_line1,
        c.address_line2,
        c.city,
        c.country,
        c.created_by,
        c.created_at,
        COALESCE(c.status, 'active') as status,
        (c.logo_data IS NOT NULL) as has_logo
       FROM companies c
       WHERE c.id = $1`,
      [companyId]
    );

    return enriched.rows[0];
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
      `SELECT
        c.id,
        c.name,
        c.industry,
        c.description,
        c.website,
        c.logo_url,
        c.contact_email,
        c.contact_phone,
        c.address_line1,
        c.address_line2,
        c.city,
        c.country,
        c.created_by,
        c.created_at,
        COALESCE(c.status, 'active') as status,
        (c.logo_data IS NOT NULL) as has_logo,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name
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
      `SELECT
        c.id,
        c.name,
        c.industry,
        c.description,
        c.website,
        c.logo_url,
        c.contact_email,
        c.contact_phone,
        c.address_line1,
        c.address_line2,
        c.city,
        c.country,
        c.created_by,
        c.created_at,
        COALESCE(c.status, 'active') as status,
        (c.logo_data IS NOT NULL) as has_logo,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name
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
      `SELECT
        c.id,
        c.name,
        c.industry,
        c.description,
        c.website,
        c.logo_url,
        c.contact_email,
        c.contact_phone,
        c.address_line1,
        c.address_line2,
        c.city,
        c.country,
        c.created_by,
        c.created_at,
        COALESCE(c.status, 'active') as status,
        (c.logo_data IS NOT NULL) as has_logo,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`,
      [companyId]
    );

    return enriched.rows[0];
  }

  async getCompanyUsers(companyId: string, userId: string) {
    const isSystemManager = await this.hasSystemCompanyAccess(userId);
    if (!isSystemManager) {
      const hasAccess = await this.db.checkCompanyAccess(companyId, userId);
      if (!hasAccess) {
        throw new ForbiddenError('You do not have access to this company');
      }
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
    const hasManagePermission =
      (await this.checkCompanyPermission(companyId, currentUserId, 'MANAGE_COMPANY')) ||
      (await this.checkCompanyPermission(companyId, currentUserId, 'MANAGE_COMPANY_USERS'));
    if (!hasManagePermission) {
      throw new ForbiddenError('You do not have permission to manage company users');
    }

    // Check if company exists
    const company = await query('SELECT id FROM companies WHERE id = $1', [companyId]);
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
    const hasManagePermission =
      (await this.checkCompanyPermission(companyId, currentUserId, 'MANAGE_COMPANY')) ||
      (await this.checkCompanyPermission(companyId, currentUserId, 'MANAGE_COMPANY_USERS'));
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
    if (await this.hasSystemCompanyAccess(userId)) return true;

    const userPermissions = await this.db.getUserPermissions(userId);
    const normalized = new Set((userPermissions ?? []).map((p) => this.normalizePermissionName(p)));
    if (!normalized.has(this.normalizePermissionName(permission))) return false;

    // Check if user is associated with company
    return this.db.checkCompanyAccess(companyId, userId);
  }
}