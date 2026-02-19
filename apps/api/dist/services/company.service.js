"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyService = void 0;
const database_service_1 = require("./database.service");
const database_1 = require("../config/database"); // Add this import
const errors_1 = require("../utils/errors");
class CompanyService {
    constructor() {
        this.db = new database_service_1.DatabaseService();
    }
    async getAllCompanies(userId) {
        // Determine admin via roles (permissions list does not include role names).
        const userRoles = await this.db.getUserRoles(userId);
        // Get companies based on role / association
        let companies;
        if (userRoles.includes('ADMIN')) {
            // Admin sees all companies - use query directly
            companies = await (0, database_1.query)(`SELECT c.*, 
          (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
          (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
             FROM company_users cu2
             JOIN users u2 ON u2.id = cu2.user_id
            WHERE cu2.company_id = c.id) as user_names,
          u.first_name || ' ' || u.last_name as created_by_name,
           COALESCE(c.status, 'active') as status
         FROM companies c
         LEFT JOIN users u ON c.created_by = u.id
         ORDER BY c.created_at DESC`);
        }
        else {
            // Regular users see only companies they're associated with
            companies = await (0, database_1.query)(`SELECT c.*, 
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
         ORDER BY c.created_at DESC`, [userId]);
        }
        return companies.rows;
    }
    async getCompanyById(companyId, userId) {
        // Check if user has access to this company
        const hasAccess = await this.db.checkCompanyAccess(companyId, userId);
        if (!hasAccess) {
            throw new errors_1.ForbiddenError('You do not have access to this company');
        }
        const result = await (0, database_1.query)(`SELECT c.*, 
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name,
        COALESCE(c.status, 'active') as status
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`, [companyId]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Company not found');
        }
        return result.rows[0];
    }
    async createCompany(userId, companyData) {
        const { name, industry, description, website, logo_url, contact_email, contact_phone, address_line1, address_line2, city, country } = companyData;
        // Create company
        const result = await (0, database_1.query)(`INSERT INTO companies (
        name, industry, description, website, logo_url, contact_email, contact_phone,
        address_line1, address_line2, city, country, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`, [name, industry, description, website, logo_url, contact_email, contact_phone, address_line1, address_line2, city, country, userId]);
        const company = result.rows[0];
        // Automatically add creator to company users
        await (0, database_1.query)('INSERT INTO company_users (company_id, user_id) VALUES ($1, $2)', [company.id, userId]);
        // Return enriched company (created_by_name, user_names, user_count, status)
        const enriched = await (0, database_1.query)(`SELECT c.*,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name,
        COALESCE(c.status, 'active') as status
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`, [company.id]);
        return enriched.rows[0] ?? company;
    }
    async updateCompany(companyId, userId, updates) {
        // Check if user has edit permission
        const hasEditPermission = await this.checkCompanyPermission(companyId, userId, 'MANAGE_COMPANY');
        if (!hasEditPermission) {
            throw new errors_1.ForbiddenError('You do not have permission to edit this company');
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
        const result = await (0, database_1.query)(updateQuery, values);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Company not found');
        }
        return result.rows[0];
    }
    async deactivateCompany(companyId, userId) {
        // Check if user has deactivate permission
        const hasDeactivatePermission = await this.checkCompanyPermission(companyId, userId, 'MANAGE_COMPANY');
        if (!hasDeactivatePermission) {
            throw new errors_1.ForbiddenError('You do not have permission to deactivate this company');
        }
        const result = await (0, database_1.query)(`UPDATE companies
         SET status = 'deactivated'
       WHERE id = $1
       RETURNING id`, [companyId]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Company not found');
        }
        const enriched = await (0, database_1.query)(`SELECT c.*,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name,
        COALESCE(c.status, 'active') as status
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`, [companyId]);
        return enriched.rows[0];
    }
    async reactivateCompany(companyId, userId) {
        // Check if user has manage permission
        const hasManagePermission = await this.checkCompanyPermission(companyId, userId, 'MANAGE_COMPANY');
        if (!hasManagePermission) {
            throw new errors_1.ForbiddenError('You do not have permission to reactivate this company');
        }
        const result = await (0, database_1.query)(`UPDATE companies
         SET status = 'active'
       WHERE id = $1
       RETURNING id`, [companyId]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Company not found');
        }
        const enriched = await (0, database_1.query)(`SELECT c.*,
        (SELECT COUNT(*) FROM company_users WHERE company_id = c.id) as user_count,
        (SELECT STRING_AGG(TRIM(u2.first_name || ' ' || u2.last_name), ', ' ORDER BY u2.first_name, u2.last_name)
           FROM company_users cu2
           JOIN users u2 ON u2.id = cu2.user_id
          WHERE cu2.company_id = c.id) as user_names,
        u.first_name || ' ' || u.last_name as created_by_name,
        COALESCE(c.status, 'active') as status
       FROM companies c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = $1`, [companyId]);
        return enriched.rows[0];
    }
    async getCompanyUsers(companyId, userId) {
        // Check if user has access to this company
        const hasAccess = await this.db.checkCompanyAccess(companyId, userId);
        if (!hasAccess) {
            throw new errors_1.ForbiddenError('You do not have access to this company');
        }
        const result = await (0, database_1.query)(`SELECT u.id, u.first_name, u.last_name, u.email, u.is_active,
        array_agg(r.name) as roles
       FROM users u
       JOIN company_users cu ON u.id = cu.user_id
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE cu.company_id = $1
       GROUP BY u.id, u.first_name, u.last_name, u.email, u.is_active
       ORDER BY u.created_at DESC`, [companyId]);
        return result.rows;
    }
    async addUserToCompany(companyId, targetUserId, currentUserId) {
        // Check if current user has manage users permission
        const hasManagePermission = await this.checkCompanyPermission(companyId, currentUserId, 'MANAGE_COMPANY_USERS');
        if (!hasManagePermission) {
            throw new errors_1.ForbiddenError('You do not have permission to manage company users');
        }
        // Check if company exists
        const company = await (0, database_1.query)('SELECT * FROM companies WHERE id = $1', [companyId]);
        if (company.rows.length === 0) {
            throw new errors_1.NotFoundError('Company not found');
        }
        // Check if user exists
        const user = await (0, database_1.query)('SELECT * FROM users WHERE id = $1', [targetUserId]);
        if (user.rows.length === 0) {
            throw new errors_1.NotFoundError('User not found');
        }
        // Add user to company
        await (0, database_1.query)('INSERT INTO company_users (company_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [companyId, targetUserId]);
        return { message: 'User added to company successfully' };
    }
    async removeUserFromCompany(companyId, targetUserId, currentUserId) {
        // Check if current user has manage users permission
        const hasManagePermission = await this.checkCompanyPermission(companyId, currentUserId, 'MANAGE_COMPANY_USERS');
        if (!hasManagePermission) {
            throw new errors_1.ForbiddenError('You do not have permission to manage company users');
        }
        // Prevent removing yourself
        if (targetUserId === currentUserId) {
            throw new errors_1.ForbiddenError('You cannot remove yourself from the company');
        }
        // Remove user from company
        const result = await (0, database_1.query)('DELETE FROM company_users WHERE company_id = $1 AND user_id = $2', [companyId, targetUserId]);
        if (result.rowCount === 0) {
            throw new errors_1.NotFoundError('User not found in this company');
        }
    }
    async checkCompanyPermission(companyId, userId, permission) {
        // Check if user is admin via roles
        const userRoles = await this.db.getUserRoles(userId);
        if (userRoles.includes('ADMIN')) {
            return true;
        }
        // Check if user has specific permission and is associated with company
        const userPermissions = await this.db.getUserPermissions(userId);
        if (!userPermissions.includes(permission)) {
            return false;
        }
        // Check if user is associated with company
        return this.db.checkCompanyAccess(companyId, userId);
    }
}
exports.CompanyService = CompanyService;
//# sourceMappingURL=company.service.js.map