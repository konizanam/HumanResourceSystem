"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
// src/services/database.service.ts
const database_1 = require("../config/database");
const errors_1 = require("../utils/errors");
class DatabaseService {
    // User methods
    async createUser(firstName, lastName, email, passwordHash) {
        const result = await (0, database_1.query)(`INSERT INTO users (first_name, last_name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [firstName, lastName, email, passwordHash]);
        return result.rows[0];
    }
    async getUserByEmail(email) {
        const result = await (0, database_1.query)('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0] || null;
    }
    async getUserById(id) {
        const result = await (0, database_1.query)('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    async assignJobSeekerRole(userId) {
        // Get JOB_SEEKER role ID
        const roleResult = await (0, database_1.query)("SELECT id FROM roles WHERE name = 'JOB_SEEKER'");
        if (roleResult.rows.length === 0) {
            throw new Error('JOB_SEEKER role not found');
        }
        const roleId = roleResult.rows[0].id;
        // Assign role to user
        await (0, database_1.query)('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, roleId]);
    }
    async getUserRoles(userId) {
        const result = await (0, database_1.query)(`SELECT r.name
       FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`, [userId]);
        return result.rows.map(row => row.name);
    }
    // Job Seeker Profile methods
    async createJobSeekerProfile(userId, data) {
        const result = await (0, database_1.query)(`INSERT INTO job_seeker_profiles 
       (user_id, professional_summary, field_of_expertise, qualification_level, years_experience)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [
            userId,
            data.professional_summary,
            data.field_of_expertise,
            data.qualification_level,
            data.years_experience
        ]);
        return result.rows[0];
    }
    async updateJobSeekerProfile(userId, data) {
        const result = await (0, database_1.query)(`UPDATE job_seeker_profiles
       SET professional_summary = COALESCE($1, professional_summary),
           field_of_expertise = COALESCE($2, field_of_expertise),
           qualification_level = COALESCE($3, qualification_level),
           years_experience = COALESCE($4, years_experience)
       WHERE user_id = $5
       RETURNING *`, [
            data.professional_summary,
            data.field_of_expertise,
            data.qualification_level,
            data.years_experience,
            userId
        ]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Job seeker profile not found');
        }
        return result.rows[0];
    }
    async getJobSeekerProfile(userId) {
        const result = await (0, database_1.query)('SELECT * FROM job_seeker_profiles WHERE user_id = $1', [userId]);
        return result.rows[0] || null;
    }
    // Personal Details methods
    async upsertPersonalDetails(userId, data) {
        const result = await (0, database_1.query)(`INSERT INTO job_seeker_personal_details 
       (user_id, first_name, last_name, middle_name, gender, date_of_birth, 
        nationality, id_type, id_number, id_document_url, marital_status, disability_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (user_id) 
       DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         middle_name = EXCLUDED.middle_name,
         gender = EXCLUDED.gender,
         date_of_birth = EXCLUDED.date_of_birth,
         nationality = EXCLUDED.nationality,
         id_type = EXCLUDED.id_type,
         id_number = EXCLUDED.id_number,
         id_document_url = EXCLUDED.id_document_url,
         marital_status = EXCLUDED.marital_status,
         disability_status = EXCLUDED.disability_status
       RETURNING *`, [
            userId,
            data.first_name,
            data.last_name,
            data.middle_name,
            data.gender,
            data.date_of_birth,
            data.nationality,
            data.id_type,
            data.id_number,
            data.id_document_url,
            data.marital_status,
            data.disability_status
        ]);
        return result.rows[0];
    }
    async getPersonalDetails(userId) {
        const result = await (0, database_1.query)('SELECT * FROM job_seeker_personal_details WHERE user_id = $1', [userId]);
        return result.rows[0] || null;
    }
    // Address methods
    async createAddress(userId, data) {
        // If this is primary, unset other primary addresses
        if (data.is_primary) {
            await (0, database_1.query)('UPDATE job_seeker_addresses SET is_primary = false WHERE user_id = $1', [userId]);
        }
        const result = await (0, database_1.query)(`INSERT INTO job_seeker_addresses 
       (user_id, address_line1, address_line2, city, state, country, postal_code, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`, [
            userId,
            data.address_line1,
            data.address_line2,
            data.city,
            data.state,
            data.country,
            data.postal_code,
            data.is_primary || false
        ]);
        return result.rows[0];
    }
    async updateAddress(addressId, userId, data) {
        // If setting as primary, unset other primary addresses
        if (data.is_primary) {
            await (0, database_1.query)('UPDATE job_seeker_addresses SET is_primary = false WHERE user_id = $1', [userId]);
        }
        const result = await (0, database_1.query)(`UPDATE job_seeker_addresses
       SET address_line1 = COALESCE($1, address_line1),
           address_line2 = COALESCE($2, address_line2),
           city = COALESCE($3, city),
           state = COALESCE($4, state),
           country = COALESCE($5, country),
           postal_code = COALESCE($6, postal_code),
           is_primary = COALESCE($7, is_primary)
       WHERE id = $8 AND user_id = $9
       RETURNING *`, [
            data.address_line1,
            data.address_line2,
            data.city,
            data.state,
            data.country,
            data.postal_code,
            data.is_primary,
            addressId,
            userId
        ]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Address not found');
        }
        return result.rows[0];
    }
    async getAddresses(userId) {
        const result = await (0, database_1.query)('SELECT * FROM job_seeker_addresses WHERE user_id = $1 ORDER BY is_primary DESC, created_at DESC', [userId]);
        return result.rows;
    }
    async deleteAddress(addressId, userId) {
        const result = await (0, database_1.query)('DELETE FROM job_seeker_addresses WHERE id = $1 AND user_id = $2', [addressId, userId]);
        if (result.rowCount === 0) {
            throw new errors_1.NotFoundError('Address not found');
        }
    }
    // Education methods
    async createEducation(userId, data) {
        const result = await (0, database_1.query)(`INSERT INTO job_seeker_education 
       (user_id, institution_name, qualification, field_of_study, start_date, end_date, is_current, grade, certificate_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [
            userId,
            data.institution_name,
            data.qualification,
            data.field_of_study,
            data.start_date,
            data.end_date,
            data.is_current || false,
            data.grade,
            data.certificate_url
        ]);
        return result.rows[0];
    }
    async updateEducation(educationId, userId, data) {
        const result = await (0, database_1.query)(`UPDATE job_seeker_education
       SET institution_name = COALESCE($1, institution_name),
           qualification = COALESCE($2, qualification),
           field_of_study = COALESCE($3, field_of_study),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           is_current = COALESCE($6, is_current),
           grade = COALESCE($7, grade),
           certificate_url = COALESCE($8, certificate_url)
       WHERE id = $9 AND user_id = $10
       RETURNING *`, [
            data.institution_name,
            data.qualification,
            data.field_of_study,
            data.start_date,
            data.end_date,
            data.is_current,
            data.grade,
            data.certificate_url,
            educationId,
            userId
        ]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Education record not found');
        }
        return result.rows[0];
    }
    async getEducation(userId) {
        const result = await (0, database_1.query)('SELECT * FROM job_seeker_education WHERE user_id = $1 ORDER BY end_date DESC NULLS FIRST, start_date DESC', [userId]);
        return result.rows;
    }
    async deleteEducation(educationId, userId) {
        const result = await (0, database_1.query)('DELETE FROM job_seeker_education WHERE id = $1 AND user_id = $2', [educationId, userId]);
        if (result.rowCount === 0) {
            throw new errors_1.NotFoundError('Education record not found');
        }
    }
    // Experience methods
    async createExperience(userId, data) {
        const result = await (0, database_1.query)(`INSERT INTO job_seeker_experience 
       (user_id, company_name, job_title, employment_type, start_date, end_date, is_current, responsibilities, salary, reference_contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`, [
            userId,
            data.company_name,
            data.job_title,
            data.employment_type,
            data.start_date,
            data.end_date,
            data.is_current || false,
            data.responsibilities,
            data.salary,
            data.reference_contact
        ]);
        return result.rows[0];
    }
    async updateExperience(experienceId, userId, data) {
        const result = await (0, database_1.query)(`UPDATE job_seeker_experience
       SET company_name = COALESCE($1, company_name),
           job_title = COALESCE($2, job_title),
           employment_type = COALESCE($3, employment_type),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           is_current = COALESCE($6, is_current),
           responsibilities = COALESCE($7, responsibilities),
           salary = COALESCE($8, salary),
           reference_contact = COALESCE($9, reference_contact)
       WHERE id = $10 AND user_id = $11
       RETURNING *`, [
            data.company_name,
            data.job_title,
            data.employment_type,
            data.start_date,
            data.end_date,
            data.is_current,
            data.responsibilities,
            data.salary,
            data.reference_contact,
            experienceId,
            userId
        ]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Experience record not found');
        }
        return result.rows[0];
    }
    async getExperience(userId) {
        const result = await (0, database_1.query)('SELECT * FROM job_seeker_experience WHERE user_id = $1 ORDER BY end_date DESC NULLS FIRST, start_date DESC', [userId]);
        return result.rows;
    }
    async deleteExperience(experienceId, userId) {
        const result = await (0, database_1.query)('DELETE FROM job_seeker_experience WHERE id = $1 AND user_id = $2', [experienceId, userId]);
        if (result.rowCount === 0) {
            throw new errors_1.NotFoundError('Experience record not found');
        }
    }
    // References methods
    async createReference(userId, data) {
        const result = await (0, database_1.query)(`INSERT INTO job_seeker_references 
       (user_id, full_name, relationship, company, email, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [
            userId,
            data.full_name,
            data.relationship,
            data.company,
            data.email,
            data.phone
        ]);
        return result.rows[0];
    }
    async updateReference(referenceId, userId, data) {
        const result = await (0, database_1.query)(`UPDATE job_seeker_references
       SET full_name = COALESCE($1, full_name),
           relationship = COALESCE($2, relationship),
           company = COALESCE($3, company),
           email = COALESCE($4, email),
           phone = COALESCE($5, phone)
       WHERE id = $6 AND user_id = $7
       RETURNING *`, [
            data.full_name,
            data.relationship,
            data.company,
            data.email,
            data.phone,
            referenceId,
            userId
        ]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Reference not found');
        }
        return result.rows[0];
    }
    async getReferences(userId) {
        const result = await (0, database_1.query)('SELECT * FROM job_seeker_references WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return result.rows;
    }
    async deleteReference(referenceId, userId) {
        const result = await (0, database_1.query)('DELETE FROM job_seeker_references WHERE id = $1 AND user_id = $2', [referenceId, userId]);
        if (result.rowCount === 0) {
            throw new errors_1.NotFoundError('Reference not found');
        }
    }
    // Complete profile methods
    async getCompleteProfile(userId) {
        const [profile, personalDetails, addresses, education, experience, references] = await Promise.all([
            this.getJobSeekerProfile(userId),
            this.getPersonalDetails(userId),
            this.getAddresses(userId),
            this.getEducation(userId),
            this.getExperience(userId),
            this.getReferences(userId)
        ]);
        if (!profile) {
            throw new errors_1.NotFoundError('Job seeker profile not found');
        }
        return {
            profile,
            personalDetails: personalDetails || undefined,
            addresses,
            education,
            experience,
            references
        };
    }
}
exports.DatabaseService = DatabaseService;
//# sourceMappingURL=database.service.js.map