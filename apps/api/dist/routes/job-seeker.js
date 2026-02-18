"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobSeekerRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
exports.jobSeekerRouter = (0, express_1.Router)();
// All routes require authentication
exports.jobSeekerRouter.use(auth_1.requireAuth);
/* ================================================================== */
/*  PROFILE (professional summary)                                     */
/* ================================================================== */
exports.jobSeekerRouter.get("/profile", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const { rows } = await (0, db_1.query)(`SELECT user_id, professional_summary, field_of_expertise,
              qualification_level, years_experience, created_at
       FROM job_seeker_profiles WHERE user_id = $1`, [userId]);
        return res.json({ profile: rows[0] ?? null });
    }
    catch (err) {
        return next(err);
    }
});
const profileSchema = zod_1.z.object({
    professionalSummary: zod_1.z.string().max(2000).optional().nullable(),
    fieldOfExpertise: zod_1.z.string().max(100).optional().nullable(),
    qualificationLevel: zod_1.z.string().max(100).optional().nullable(),
    yearsExperience: zod_1.z.number().int().min(0).max(60).optional().nullable(),
});
exports.jobSeekerRouter.put("/profile", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const data = profileSchema.parse(req.body);
        const { rows } = await (0, db_1.query)(`INSERT INTO job_seeker_profiles (user_id, professional_summary, field_of_expertise, qualification_level, years_experience)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         professional_summary = EXCLUDED.professional_summary,
         field_of_expertise = EXCLUDED.field_of_expertise,
         qualification_level = EXCLUDED.qualification_level,
         years_experience = EXCLUDED.years_experience
       RETURNING *`, [
            userId,
            data.professionalSummary ?? null,
            data.fieldOfExpertise ?? null,
            data.qualificationLevel ?? null,
            data.yearsExperience ?? null,
        ]);
        return res.json({ profile: rows[0] });
    }
    catch (err) {
        return next(err);
    }
});
/* ================================================================== */
/*  PERSONAL DETAILS                                                    */
/* ================================================================== */
exports.jobSeekerRouter.get("/personal-details", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const { rows } = await (0, db_1.query)(`SELECT * FROM job_seeker_personal_details WHERE user_id = $1`, [userId]);
        return res.json({ personalDetails: rows[0] ?? null });
    }
    catch (err) {
        return next(err);
    }
});
const personalDetailsSchema = zod_1.z.object({
    firstName: zod_1.z.string().max(100).optional().nullable(),
    lastName: zod_1.z.string().max(100).optional().nullable(),
    middleName: zod_1.z.string().max(100).optional().nullable(),
    gender: zod_1.z.string().max(50).optional().nullable(),
    dateOfBirth: zod_1.z.string().optional().nullable(),
    nationality: zod_1.z.string().max(100).optional().nullable(),
    idType: zod_1.z.string().max(50).optional().nullable(),
    idNumber: zod_1.z.string().max(100).optional().nullable(),
    maritalStatus: zod_1.z.string().max(50).optional().nullable(),
    disabilityStatus: zod_1.z.boolean().optional().nullable(),
});
exports.jobSeekerRouter.put("/personal-details", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const d = personalDetailsSchema.parse(req.body);
        const { rows } = await (0, db_1.query)(`INSERT INTO job_seeker_personal_details
         (user_id, first_name, last_name, middle_name, gender, date_of_birth,
          nationality, id_type, id_number, marital_status, disability_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (user_id) DO UPDATE SET
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         middle_name = EXCLUDED.middle_name,
         gender = EXCLUDED.gender,
         date_of_birth = EXCLUDED.date_of_birth,
         nationality = EXCLUDED.nationality,
         id_type = EXCLUDED.id_type,
         id_number = EXCLUDED.id_number,
         marital_status = EXCLUDED.marital_status,
         disability_status = EXCLUDED.disability_status
       RETURNING *`, [
            userId,
            d.firstName ?? null,
            d.lastName ?? null,
            d.middleName ?? null,
            d.gender ?? null,
            d.dateOfBirth ?? null,
            d.nationality ?? null,
            d.idType ?? null,
            d.idNumber ?? null,
            d.maritalStatus ?? null,
            d.disabilityStatus ?? null,
        ]);
        return res.json({ personalDetails: rows[0] });
    }
    catch (err) {
        return next(err);
    }
});
/* ================================================================== */
/*  ADDRESS                                                             */
/* ================================================================== */
exports.jobSeekerRouter.get("/addresses", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const { rows } = await (0, db_1.query)(`SELECT * FROM job_seeker_addresses WHERE user_id = $1 ORDER BY is_primary DESC`, [userId]);
        return res.json({ addresses: rows });
    }
    catch (err) {
        return next(err);
    }
});
const addressSchema = zod_1.z.object({
    addressLine1: zod_1.z.string().max(255).optional().nullable(),
    addressLine2: zod_1.z.string().max(255).optional().nullable(),
    city: zod_1.z.string().max(100).optional().nullable(),
    state: zod_1.z.string().max(100).optional().nullable(),
    country: zod_1.z.string().max(100).optional().nullable(),
    postalCode: zod_1.z.string().max(20).optional().nullable(),
    isPrimary: zod_1.z.boolean().optional(),
});
exports.jobSeekerRouter.post("/addresses", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const d = addressSchema.parse(req.body);
        const { rows } = await (0, db_1.query)(`INSERT INTO job_seeker_addresses
         (user_id, address_line1, address_line2, city, state, country, postal_code, is_primary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`, [
            userId,
            d.addressLine1 ?? null,
            d.addressLine2 ?? null,
            d.city ?? null,
            d.state ?? null,
            d.country ?? null,
            d.postalCode ?? null,
            d.isPrimary ?? true,
        ]);
        return res.status(201).json({ address: rows[0] });
    }
    catch (err) {
        return next(err);
    }
});
exports.jobSeekerRouter.put("/addresses/:id", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const d = addressSchema.parse(req.body);
        const { rows } = await (0, db_1.query)(`UPDATE job_seeker_addresses SET
         address_line1 = $3, address_line2 = $4, city = $5,
         state = $6, country = $7, postal_code = $8, is_primary = $9
       WHERE id = $1 AND user_id = $2
       RETURNING *`, [
            req.params.id,
            userId,
            d.addressLine1 ?? null,
            d.addressLine2 ?? null,
            d.city ?? null,
            d.state ?? null,
            d.country ?? null,
            d.postalCode ?? null,
            d.isPrimary ?? true,
        ]);
        if (rows.length === 0) {
            return res.status(404).json({ error: { message: "Address not found" } });
        }
        return res.json({ address: rows[0] });
    }
    catch (err) {
        return next(err);
    }
});
exports.jobSeekerRouter.delete("/addresses/:id", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const { rowCount } = await (0, db_1.query)(`DELETE FROM job_seeker_addresses WHERE id = $1 AND user_id = $2`, [req.params.id, userId]);
        if (rowCount === 0) {
            return res.status(404).json({ error: { message: "Address not found" } });
        }
        return res.json({ message: "Address deleted" });
    }
    catch (err) {
        return next(err);
    }
});
/* ================================================================== */
/*  EDUCATION                                                           */
/* ================================================================== */
exports.jobSeekerRouter.get("/education", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const { rows } = await (0, db_1.query)(`SELECT * FROM job_seeker_education WHERE user_id = $1 ORDER BY start_date DESC`, [userId]);
        return res.json({ education: rows });
    }
    catch (err) {
        return next(err);
    }
});
const educationSchema = zod_1.z.object({
    institutionName: zod_1.z.string().min(1).max(255),
    qualification: zod_1.z.string().min(1).max(255),
    fieldOfStudy: zod_1.z.string().max(255).optional().nullable(),
    startDate: zod_1.z.string().optional().nullable(),
    endDate: zod_1.z.string().optional().nullable(),
    isCurrent: zod_1.z.boolean().optional(),
    grade: zod_1.z.string().max(100).optional().nullable(),
});
exports.jobSeekerRouter.post("/education", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const d = educationSchema.parse(req.body);
        const { rows } = await (0, db_1.query)(`INSERT INTO job_seeker_education
         (user_id, institution_name, qualification, field_of_study, start_date, end_date, is_current, grade)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`, [
            userId,
            d.institutionName,
            d.qualification,
            d.fieldOfStudy ?? null,
            d.startDate ?? null,
            d.endDate ?? null,
            d.isCurrent ?? false,
            d.grade ?? null,
        ]);
        return res.status(201).json({ education: rows[0] });
    }
    catch (err) {
        return next(err);
    }
});
exports.jobSeekerRouter.put("/education/:id", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const d = educationSchema.parse(req.body);
        const { rows } = await (0, db_1.query)(`UPDATE job_seeker_education SET
         institution_name = $3, qualification = $4, field_of_study = $5,
         start_date = $6, end_date = $7, is_current = $8, grade = $9
       WHERE id = $1 AND user_id = $2
       RETURNING *`, [
            req.params.id,
            userId,
            d.institutionName,
            d.qualification,
            d.fieldOfStudy ?? null,
            d.startDate ?? null,
            d.endDate ?? null,
            d.isCurrent ?? false,
            d.grade ?? null,
        ]);
        if (rows.length === 0) {
            return res.status(404).json({ error: { message: "Education record not found" } });
        }
        return res.json({ education: rows[0] });
    }
    catch (err) {
        return next(err);
    }
});
exports.jobSeekerRouter.delete("/education/:id", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const { rowCount } = await (0, db_1.query)(`DELETE FROM job_seeker_education WHERE id = $1 AND user_id = $2`, [req.params.id, userId]);
        if (rowCount === 0) {
            return res.status(404).json({ error: { message: "Education record not found" } });
        }
        return res.json({ message: "Education record deleted" });
    }
    catch (err) {
        return next(err);
    }
});
/* ================================================================== */
/*  EXPERIENCE                                                          */
/* ================================================================== */
exports.jobSeekerRouter.get("/experience", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const { rows } = await (0, db_1.query)(`SELECT * FROM job_seeker_experience WHERE user_id = $1 ORDER BY start_date DESC`, [userId]);
        return res.json({ experience: rows });
    }
    catch (err) {
        return next(err);
    }
});
const experienceSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(1).max(255),
    jobTitle: zod_1.z.string().min(1).max(255),
    employmentType: zod_1.z.string().max(100).optional().nullable(),
    startDate: zod_1.z.string().optional().nullable(),
    endDate: zod_1.z.string().optional().nullable(),
    isCurrent: zod_1.z.boolean().optional(),
    responsibilities: zod_1.z.string().max(2000).optional().nullable(),
    salary: zod_1.z.number().optional().nullable(),
    referenceContact: zod_1.z.string().max(255).optional().nullable(),
});
exports.jobSeekerRouter.post("/experience", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const d = experienceSchema.parse(req.body);
        const { rows } = await (0, db_1.query)(`INSERT INTO job_seeker_experience
         (user_id, company_name, job_title, employment_type, start_date, end_date,
          is_current, responsibilities, salary, reference_contact)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`, [
            userId,
            d.companyName,
            d.jobTitle,
            d.employmentType ?? null,
            d.startDate ?? null,
            d.endDate ?? null,
            d.isCurrent ?? false,
            d.responsibilities ?? null,
            d.salary ?? null,
            d.referenceContact ?? null,
        ]);
        return res.status(201).json({ experience: rows[0] });
    }
    catch (err) {
        return next(err);
    }
});
exports.jobSeekerRouter.put("/experience/:id", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const d = experienceSchema.parse(req.body);
        const { rows } = await (0, db_1.query)(`UPDATE job_seeker_experience SET
         company_name = $3, job_title = $4, employment_type = $5,
         start_date = $6, end_date = $7, is_current = $8,
         responsibilities = $9, salary = $10, reference_contact = $11
       WHERE id = $1 AND user_id = $2
       RETURNING *`, [
            req.params.id,
            userId,
            d.companyName,
            d.jobTitle,
            d.employmentType ?? null,
            d.startDate ?? null,
            d.endDate ?? null,
            d.isCurrent ?? false,
            d.responsibilities ?? null,
            d.salary ?? null,
            d.referenceContact ?? null,
        ]);
        if (rows.length === 0) {
            return res.status(404).json({ error: { message: "Experience record not found" } });
        }
        return res.json({ experience: rows[0] });
    }
    catch (err) {
        return next(err);
    }
});
exports.jobSeekerRouter.delete("/experience/:id", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const { rowCount } = await (0, db_1.query)(`DELETE FROM job_seeker_experience WHERE id = $1 AND user_id = $2`, [req.params.id, userId]);
        if (rowCount === 0) {
            return res.status(404).json({ error: { message: "Experience record not found" } });
        }
        return res.json({ message: "Experience record deleted" });
    }
    catch (err) {
        return next(err);
    }
});
/* ================================================================== */
/*  REFERENCES                                                          */
/* ================================================================== */
exports.jobSeekerRouter.get("/references", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const { rows } = await (0, db_1.query)(`SELECT * FROM job_seeker_references WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
        return res.json({ references: rows });
    }
    catch (err) {
        return next(err);
    }
});
const referenceSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1).max(255),
    relationship: zod_1.z.string().max(100).optional().nullable(),
    company: zod_1.z.string().max(255).optional().nullable(),
    email: zod_1.z.string().email().optional().nullable(),
    phone: zod_1.z.string().max(50).optional().nullable(),
});
exports.jobSeekerRouter.post("/references", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const d = referenceSchema.parse(req.body);
        const { rows } = await (0, db_1.query)(`INSERT INTO job_seeker_references
         (user_id, full_name, relationship, company, email, phone)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`, [
            userId,
            d.fullName,
            d.relationship ?? null,
            d.company ?? null,
            d.email ?? null,
            d.phone ?? null,
        ]);
        return res.status(201).json({ reference: rows[0] });
    }
    catch (err) {
        return next(err);
    }
});
exports.jobSeekerRouter.put("/references/:id", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const d = referenceSchema.parse(req.body);
        const { rows } = await (0, db_1.query)(`UPDATE job_seeker_references SET
         full_name = $3, relationship = $4, company = $5, email = $6, phone = $7
       WHERE id = $1 AND user_id = $2
       RETURNING *`, [
            req.params.id,
            userId,
            d.fullName,
            d.relationship ?? null,
            d.company ?? null,
            d.email ?? null,
            d.phone ?? null,
        ]);
        if (rows.length === 0) {
            return res.status(404).json({ error: { message: "Reference not found" } });
        }
        return res.json({ reference: rows[0] });
    }
    catch (err) {
        return next(err);
    }
});
exports.jobSeekerRouter.delete("/references/:id", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const { rowCount } = await (0, db_1.query)(`DELETE FROM job_seeker_references WHERE id = $1 AND user_id = $2`, [req.params.id, userId]);
        if (rowCount === 0) {
            return res.status(404).json({ error: { message: "Reference not found" } });
        }
        return res.json({ message: "Reference deleted" });
    }
    catch (err) {
        return next(err);
    }
});
/* ================================================================== */
/*  FULL PROFILE (aggregate GET)                                        */
/* ================================================================== */
exports.jobSeekerRouter.get("/full-profile", async (req, res, next) => {
    try {
        const userId = req.auth.sub;
        const [profile, personal, addresses, education, experience, references] = await Promise.all([
            (0, db_1.query)(`SELECT * FROM job_seeker_profiles WHERE user_id = $1`, [userId]),
            (0, db_1.query)(`SELECT * FROM job_seeker_personal_details WHERE user_id = $1`, [userId]),
            (0, db_1.query)(`SELECT * FROM job_seeker_addresses WHERE user_id = $1 ORDER BY is_primary DESC`, [userId]),
            (0, db_1.query)(`SELECT * FROM job_seeker_education WHERE user_id = $1 ORDER BY start_date DESC`, [userId]),
            (0, db_1.query)(`SELECT * FROM job_seeker_experience WHERE user_id = $1 ORDER BY start_date DESC`, [userId]),
            (0, db_1.query)(`SELECT * FROM job_seeker_references WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
        ]);
        return res.json({
            profile: profile.rows[0] ?? null,
            personalDetails: personal.rows[0] ?? null,
            addresses: addresses.rows,
            education: education.rows,
            experience: experience.rows,
            references: references.rows,
        });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=job-seeker.js.map