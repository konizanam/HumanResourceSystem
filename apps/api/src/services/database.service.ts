import { query } from '../config/database';

export class DatabaseService {
  // ==================== USER METHODS ====================

  async createUser(firstName: string, lastName: string, email: string, passwordHash: string) {
    const result = await query(
      `INSERT INTO users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, first_name, last_name, email, created_at`,
      [firstName, lastName, email, passwordHash]
    );
    return result.rows[0];
  }

  async getUserByEmail(email: string) {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  async getUserById(id: string) {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  }

  // ==================== ROLE & PERMISSION METHODS ====================

  async assignJobSeekerRole(userId: string) {
    const roleResult = await query("SELECT id FROM roles WHERE name = 'JOB_SEEKER'");
    if (roleResult.rows.length === 0) return;
    
    const roleId = roleResult.rows[0].id;
    
    await query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, roleId]
    );
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const result = await query(
      `SELECT r.name FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return result.rows.map(row => row.name);
  }
  async getCompleteProfile(userId: string): Promise<any> {
  // Get all profile data in parallel for efficiency
  const [
    profile,
    personalDetails,
    addresses,
    education,
    experience,
    references
  ] = await Promise.all([
    this.getJobSeekerProfile(userId),
    this.getPersonalDetails(userId),
    this.getAddresses(userId),
    this.getEducation(userId),
    this.getExperience(userId),
    this.getReferences(userId)
  ]);

  return {
    profile: profile || null,
    personalDetails: personalDetails || null,
    addresses: addresses || [],
    education: education || [],
    experience: experience || [],
    references: references || []
  };
}

  async getUserPermissions(userId: string): Promise<string[]> {
    const result = await query(
      `SELECT DISTINCT p.name
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    
    return result.rows.map(row => row.name);
  }

  async getUserPermissionsWithCompany(userId: string, companyId?: string): Promise<string[]> {
    let sql = `
      SELECT DISTINCT p.name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_roles ur ON rp.role_id = ur.role_id
      WHERE ur.user_id = $1
    `;
    
    const params: any[] = [userId];
    
    if (companyId) {
      sql += ` AND EXISTS (
        SELECT 1 FROM company_users 
        WHERE company_id = $2 AND user_id = $1
      )`;
      params.push(companyId);
    }
    
    const result = await query(sql, params);
    return result.rows.map(row => row.name);
  }

  // ==================== COMPANY METHODS ====================

  async checkCompanyAccess(companyId: string, userId: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM company_users WHERE company_id = $1 AND user_id = $2',
      [companyId, userId]
    );
    return result.rows.length > 0;
  }

  async getCompanyById(companyId: string) {
    const result = await query('SELECT * FROM companies WHERE id = $1', [companyId]);
    return result.rows[0];
  }

  async getCompanyUsers(companyId: string) {
    const result = await query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.is_active
       FROM users u
       JOIN company_users cu ON u.id = cu.user_id
       WHERE cu.company_id = $1
       ORDER BY u.created_at DESC`,
      [companyId]
    );
    return result.rows;
  }

  async addUserToCompany(companyId: string, userId: string) {
    await query(
      'INSERT INTO company_users (company_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [companyId, userId]
    );
  }

  async removeUserFromCompany(companyId: string, userId: string) {
    await query(
      'DELETE FROM company_users WHERE company_id = $1 AND user_id = $2',
      [companyId, userId]
    );
  }

  async getUserCompanies(userId: string) {
    const result = await query(
      `SELECT c.* 
       FROM companies c
       JOIN company_users cu ON c.id = cu.company_id
       WHERE cu.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  // ==================== JOB SEEKER PROFILE METHODS ====================

  async createJobSeekerProfile(userId: string, data: any) {
    const { professional_summary, field_of_expertise, qualification_level, years_experience } = data;
    
    const result = await query(
      `INSERT INTO job_seeker_profiles 
       (user_id, professional_summary, field_of_expertise, qualification_level, years_experience)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, professional_summary, field_of_expertise, qualification_level, years_experience]
    );
    
    return result.rows[0];
  }

  async getJobSeekerProfile(userId: string) {
    const result = await query(
      'SELECT * FROM job_seeker_profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  async updateJobSeekerProfile(userId: string, data: any) {
    const { professional_summary, field_of_expertise, qualification_level, years_experience } = data;
    
    const result = await query(
      `INSERT INTO job_seeker_profiles
       (user_id, professional_summary, field_of_expertise, qualification_level, years_experience)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id)
       DO UPDATE SET
         professional_summary = COALESCE(EXCLUDED.professional_summary, job_seeker_profiles.professional_summary),
         field_of_expertise = COALESCE(EXCLUDED.field_of_expertise, job_seeker_profiles.field_of_expertise),
         qualification_level = COALESCE(EXCLUDED.qualification_level, job_seeker_profiles.qualification_level),
         years_experience = COALESCE(EXCLUDED.years_experience, job_seeker_profiles.years_experience)
       RETURNING *`,
      [
        userId,
        professional_summary ?? null,
        field_of_expertise ?? null,
        qualification_level ?? null,
        years_experience ?? null,
      ]
    );
    
    return result.rows[0];
  }

  // ==================== JOB SEEKER PERSONAL DETAILS ====================

  async upsertPersonalDetails(userId: string, data: any) {
    const { first_name, last_name, middle_name, gender, date_of_birth, nationality, id_type, id_number, marital_status, disability_status } = data;
    
    const result = await query(
      `INSERT INTO job_seeker_personal_details 
       (user_id, first_name, last_name, middle_name, gender, date_of_birth, nationality, id_type, id_number, marital_status, disability_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id) 
       DO UPDATE SET
         first_name = COALESCE(EXCLUDED.first_name, job_seeker_personal_details.first_name),
         last_name = COALESCE(EXCLUDED.last_name, job_seeker_personal_details.last_name),
         middle_name = COALESCE(EXCLUDED.middle_name, job_seeker_personal_details.middle_name),
         gender = COALESCE(EXCLUDED.gender, job_seeker_personal_details.gender),
         date_of_birth = COALESCE(EXCLUDED.date_of_birth, job_seeker_personal_details.date_of_birth),
         nationality = COALESCE(EXCLUDED.nationality, job_seeker_personal_details.nationality),
         id_type = COALESCE(EXCLUDED.id_type, job_seeker_personal_details.id_type),
         id_number = COALESCE(EXCLUDED.id_number, job_seeker_personal_details.id_number),
         marital_status = COALESCE(EXCLUDED.marital_status, job_seeker_personal_details.marital_status),
         disability_status = COALESCE(EXCLUDED.disability_status, job_seeker_personal_details.disability_status)
       RETURNING *`,
      [userId, first_name, last_name, middle_name, gender, date_of_birth, nationality, id_type, id_number, marital_status, disability_status]
    );
    
    return result.rows[0];
  }

  async getPersonalDetails(userId: string) {
    const result = await query(
      'SELECT * FROM job_seeker_personal_details WHERE user_id = $1',
      [userId]
    );
    return result.rows[0];
  }

  // ==================== ADDRESS METHODS ====================

  async createAddress(userId: string, data: any) {
    const { address_line1, address_line2, city, state, country, postal_code, is_primary } = data;
    
    // If this is primary, unset other primary addresses
    if (is_primary) {
      await query(
        'UPDATE job_seeker_addresses SET is_primary = false WHERE user_id = $1',
        [userId]
      );
    }
    
    const result = await query(
      `INSERT INTO job_seeker_addresses 
       (user_id, address_line1, address_line2, city, state, country, postal_code, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [userId, address_line1, address_line2, city, state, country, postal_code, is_primary || false]
    );
    
    return result.rows[0];
  }

  async getAddresses(userId: string) {
    const result = await query(
      'SELECT * FROM job_seeker_addresses WHERE user_id = $1 ORDER BY is_primary DESC, id DESC',
      [userId]
    );
    return result.rows;
  }

  async updateAddress(addressId: string, userId: string, data: any) {
    const { address_line1, address_line2, city, state, country, postal_code, is_primary } = data;
    
    // If setting as primary, unset other primary addresses
    if (is_primary) {
      await query(
        'UPDATE job_seeker_addresses SET is_primary = false WHERE user_id = $1',
        [userId]
      );
    }
    
    const result = await query(
      `UPDATE job_seeker_addresses
       SET address_line1 = COALESCE($1, address_line1),
           address_line2 = COALESCE($2, address_line2),
           city = COALESCE($3, city),
           state = COALESCE($4, state),
           country = COALESCE($5, country),
           postal_code = COALESCE($6, postal_code),
           is_primary = COALESCE($7, is_primary)
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [address_line1, address_line2, city, state, country, postal_code, is_primary, addressId, userId]
    );
    
    return result.rows[0];
  }

  async deleteAddress(addressId: string, userId: string) {
    await query(
      'DELETE FROM job_seeker_addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );
  }

  // ==================== EDUCATION METHODS ====================

  async createEducation(userId: string, data: any) {
    const { institution_name, qualification, field_of_study, start_date, end_date, is_current, grade, certificate_url } = data;
    
    const result = await query(
      `INSERT INTO job_seeker_education 
       (user_id, institution_name, qualification, field_of_study, start_date, end_date, is_current, grade, certificate_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, institution_name, qualification, field_of_study, start_date, end_date, is_current, grade, certificate_url]
    );
    
    return result.rows[0];
  }

  async getEducation(userId: string) {
    const result = await query(
      'SELECT * FROM job_seeker_education WHERE user_id = $1 ORDER BY end_date DESC NULLS FIRST, start_date DESC',
      [userId]
    );
    return result.rows;
  }

  async updateEducation(educationId: string, userId: string, data: any) {
    const { institution_name, qualification, field_of_study, start_date, end_date, is_current, grade, certificate_url } = data;
    
    const result = await query(
      `UPDATE job_seeker_education
       SET institution_name = COALESCE($1, institution_name),
           qualification = COALESCE($2, qualification),
           field_of_study = COALESCE($3, field_of_study),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           is_current = COALESCE($6, is_current),
           grade = COALESCE($7, grade),
           certificate_url = COALESCE($8, certificate_url)
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [institution_name, qualification, field_of_study, start_date, end_date, is_current, grade, certificate_url, educationId, userId]
    );
    
    return result.rows[0];
  }

  async deleteEducation(educationId: string, userId: string) {
    await query(
      'DELETE FROM job_seeker_education WHERE id = $1 AND user_id = $2',
      [educationId, userId]
    );
  }

  // ==================== EXPERIENCE METHODS ====================

  async createExperience(userId: string, data: any) {
    const { company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities, salary } = data;
    
    const result = await query(
      `INSERT INTO job_seeker_experience 
       (user_id, company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities, salary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities, salary]
    );
    
    return result.rows[0];
  }

  async getExperience(userId: string) {
    const result = await query(
      'SELECT * FROM job_seeker_experience WHERE user_id = $1 ORDER BY end_date DESC NULLS FIRST, start_date DESC',
      [userId]
    );
    return result.rows;
  }

  async updateExperience(experienceId: string, userId: string, data: any) {
    const { company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities, salary } = data;
    
    const result = await query(
      `UPDATE job_seeker_experience
       SET company_name = COALESCE($1, company_name),
           job_title = COALESCE($2, job_title),
           employment_type = COALESCE($3, employment_type),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           is_current = COALESCE($6, is_current),
           responsibilities = COALESCE($7, responsibilities),
           salary = COALESCE($8, salary)
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities, salary, experienceId, userId]
    );
    
    return result.rows[0];
  }

  async deleteExperience(experienceId: string, userId: string) {
    await query(
      'DELETE FROM job_seeker_experience WHERE id = $1 AND user_id = $2',
      [experienceId, userId]
    );
  }

  // ==================== REFERENCES METHODS ====================

  async createReference(userId: string, data: any) {
    const { full_name, relationship, company, email, phone } = data;
    
    const result = await query(
      `INSERT INTO job_seeker_references 
       (user_id, full_name, relationship, company, email, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, full_name, relationship, company, email, phone]
    );
    
    return result.rows[0];
  }

  async getReferences(userId: string) {
    const result = await query(
      'SELECT * FROM job_seeker_references WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  async updateReference(referenceId: string, userId: string, data: any) {
    const { full_name, relationship, company, email, phone } = data;
    
    const result = await query(
      `UPDATE job_seeker_references
       SET full_name = COALESCE($1, full_name),
           relationship = COALESCE($2, relationship),
           company = COALESCE($3, company),
           email = COALESCE($4, email),
           phone = COALESCE($5, phone)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [full_name, relationship, company, email, phone, referenceId, userId]
    );
    
    return result.rows[0];
  }

  async deleteReference(referenceId: string, userId: string) {
    await query(
      'DELETE FROM job_seeker_references WHERE id = $1 AND user_id = $2',
      [referenceId, userId]
    );
  }
}