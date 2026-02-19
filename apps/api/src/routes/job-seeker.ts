import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { requireAuth } from "../middleware/auth";

export const jobSeekerRouter = Router();

// All routes require authentication
jobSeekerRouter.use(requireAuth);

/* ================================================================== */
/*  PROFILE (professional summary)                                     */
/* ================================================================== */

jobSeekerRouter.get("/profile", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { rows } = await query(
      `SELECT user_id, professional_summary, field_of_expertise,
              qualification_level, years_experience, created_at
       FROM job_seeker_profiles WHERE user_id = $1`,
      [userId]
    );
    return res.json({ profile: rows[0] ?? null });
  } catch (err) {
    return next(err);
  }
});

const profileSchema = z.object({
  professionalSummary: z.string().max(2000).optional().nullable(),
  fieldOfExpertise: z.string().max(100).optional().nullable(),
  qualificationLevel: z.string().max(100).optional().nullable(),
  yearsExperience: z.number().int().min(0).max(60).optional().nullable(),
});

jobSeekerRouter.put("/profile", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const data = profileSchema.parse(req.body);

    const { rows } = await query(
      `INSERT INTO job_seeker_profiles (user_id, professional_summary, field_of_expertise, qualification_level, years_experience)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         professional_summary = EXCLUDED.professional_summary,
         field_of_expertise = EXCLUDED.field_of_expertise,
         qualification_level = EXCLUDED.qualification_level,
         years_experience = EXCLUDED.years_experience
       RETURNING *`,
      [
        userId,
        data.professionalSummary ?? null,
        data.fieldOfExpertise ?? null,
        data.qualificationLevel ?? null,
        data.yearsExperience ?? null,
      ]
    );

    return res.json({ profile: rows[0] });
  } catch (err) {
    return next(err);
  }
});

/* ================================================================== */
/*  PERSONAL DETAILS                                                    */
/* ================================================================== */

jobSeekerRouter.get("/personal-details", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { rows } = await query(
      `SELECT * FROM job_seeker_personal_details WHERE user_id = $1`,
      [userId]
    );
    return res.json({ personalDetails: rows[0] ?? null });
  } catch (err) {
    return next(err);
  }
});

const personalDetailsSchema = z.object({
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  middleName: z.string().max(100).optional().nullable(),
  gender: z.string().max(50).optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  nationality: z.string().max(100).optional().nullable(),
  idType: z.string().max(50).optional().nullable(),
  idNumber: z.string().max(100).optional().nullable(),
  idDocumentUrl: z.string().max(500).optional().nullable(),
  maritalStatus: z.string().max(50).optional().nullable(),
  disabilityStatus: z.boolean().optional().nullable(),
});

jobSeekerRouter.put("/personal-details", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const d = personalDetailsSchema.parse(req.body);

    const { rows } = await query(
      `INSERT INTO job_seeker_personal_details
         (user_id, first_name, last_name, middle_name, gender, date_of_birth,
          nationality, id_type, id_number, id_document_url, marital_status, disability_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (user_id) DO UPDATE SET
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
       RETURNING *`,
      [
        userId,
        d.firstName ?? null,
        d.lastName ?? null,
        d.middleName ?? null,
        d.gender ?? null,
        d.dateOfBirth ?? null,
        d.nationality ?? null,
        d.idType ?? null,
        d.idNumber ?? null,
        d.idDocumentUrl ?? null,
        d.maritalStatus ?? null,
        d.disabilityStatus ?? null,
      ]
    );

    return res.json({ personalDetails: rows[0] });
  } catch (err) {
    return next(err);
  }
});

/* ================================================================== */
/*  ADDRESS                                                             */
/* ================================================================== */

jobSeekerRouter.get("/addresses", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { rows } = await query(
      `SELECT * FROM job_seeker_addresses WHERE user_id = $1 ORDER BY is_primary DESC`,
      [userId]
    );
    return res.json({ addresses: rows });
  } catch (err) {
    return next(err);
  }
});

const addressSchema = z.object({
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

jobSeekerRouter.post("/addresses", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const d = addressSchema.parse(req.body);

    const { rows } = await query(
      `INSERT INTO job_seeker_addresses
         (user_id, address_line1, address_line2, city, state, country, postal_code, is_primary)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        userId,
        d.addressLine1 ?? null,
        d.addressLine2 ?? null,
        d.city ?? null,
        d.state ?? null,
        d.country ?? null,
        d.postalCode ?? null,
        d.isPrimary ?? true,
      ]
    );

    return res.status(201).json({ address: rows[0] });
  } catch (err) {
    return next(err);
  }
});

jobSeekerRouter.put("/addresses/:id", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const d = addressSchema.parse(req.body);

    const { rows } = await query(
      `UPDATE job_seeker_addresses SET
         address_line1 = $3, address_line2 = $4, city = $5,
         state = $6, country = $7, postal_code = $8, is_primary = $9
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        req.params.id,
        userId,
        d.addressLine1 ?? null,
        d.addressLine2 ?? null,
        d.city ?? null,
        d.state ?? null,
        d.country ?? null,
        d.postalCode ?? null,
        d.isPrimary ?? true,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: { message: "Address not found" } });
    }
    return res.json({ address: rows[0] });
  } catch (err) {
    return next(err);
  }
});

jobSeekerRouter.delete("/addresses/:id", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { rowCount } = await query(
      `DELETE FROM job_seeker_addresses WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: { message: "Address not found" } });
    }
    return res.json({ message: "Address deleted" });
  } catch (err) {
    return next(err);
  }
});

/* ================================================================== */
/*  EDUCATION                                                           */
/* ================================================================== */

jobSeekerRouter.get("/education", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { rows } = await query(
      `SELECT * FROM job_seeker_education WHERE user_id = $1 ORDER BY start_date DESC`,
      [userId]
    );
    return res.json({ education: rows });
  } catch (err) {
    return next(err);
  }
});

const educationSchema = z.object({
  institutionName: z.string().min(1).max(255),
  qualification: z.string().min(1).max(255),
  fieldOfStudy: z.string().max(255).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isCurrent: z.boolean().optional(),
  grade: z.string().max(100).optional().nullable(),
  certificateUrl: z.string().max(500).optional().nullable(),
});

jobSeekerRouter.post("/education", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const d = educationSchema.parse(req.body);

    const { rows } = await query(
      `INSERT INTO job_seeker_education
         (user_id, institution_name, qualification, field_of_study, start_date, end_date, is_current, grade, certificate_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        userId,
        d.institutionName,
        d.qualification,
        d.fieldOfStudy ?? null,
        d.startDate ?? null,
        d.endDate ?? null,
        d.isCurrent ?? false,
        d.grade ?? null,
        d.certificateUrl ?? null,
      ]
    );

    return res.status(201).json({ education: rows[0] });
  } catch (err) {
    return next(err);
  }
});

jobSeekerRouter.put("/education/:id", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const d = educationSchema.parse(req.body);

    const { rows } = await query(
      `UPDATE job_seeker_education SET
         institution_name = $3, qualification = $4, field_of_study = $5,
         start_date = $6, end_date = $7, is_current = $8, grade = $9,
         certificate_url = $10
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        req.params.id,
        userId,
        d.institutionName,
        d.qualification,
        d.fieldOfStudy ?? null,
        d.startDate ?? null,
        d.endDate ?? null,
        d.isCurrent ?? false,
        d.grade ?? null,
        d.certificateUrl ?? null,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: { message: "Education record not found" } });
    }
    return res.json({ education: rows[0] });
  } catch (err) {
    return next(err);
  }
});

jobSeekerRouter.delete("/education/:id", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { rowCount } = await query(
      `DELETE FROM job_seeker_education WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: { message: "Education record not found" } });
    }
    return res.json({ message: "Education record deleted" });
  } catch (err) {
    return next(err);
  }
});

/* ================================================================== */
/*  EXPERIENCE                                                          */
/* ================================================================== */

jobSeekerRouter.get("/experience", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { rows } = await query(
      `SELECT * FROM job_seeker_experience WHERE user_id = $1 ORDER BY start_date DESC`,
      [userId]
    );
    return res.json({ experience: rows });
  } catch (err) {
    return next(err);
  }
});

const experienceSchema = z.object({
  companyName: z.string().min(1).max(255),
  jobTitle: z.string().min(1).max(255),
  employmentType: z.string().max(100).optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isCurrent: z.boolean().optional(),
  responsibilities: z.string().max(2000).optional().nullable(),
  salary: z.number().optional().nullable(),
  referenceContact: z.string().max(255).optional().nullable(),
});

jobSeekerRouter.post("/experience", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const d = experienceSchema.parse(req.body);

    const { rows } = await query(
      `INSERT INTO job_seeker_experience
         (user_id, company_name, job_title, employment_type, start_date, end_date,
          is_current, responsibilities, salary, reference_contact)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
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
      ]
    );

    return res.status(201).json({ experience: rows[0] });
  } catch (err) {
    return next(err);
  }
});

jobSeekerRouter.put("/experience/:id", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const d = experienceSchema.parse(req.body);

    const { rows } = await query(
      `UPDATE job_seeker_experience SET
         company_name = $3, job_title = $4, employment_type = $5,
         start_date = $6, end_date = $7, is_current = $8,
         responsibilities = $9, salary = $10, reference_contact = $11
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
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
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: { message: "Experience record not found" } });
    }
    return res.json({ experience: rows[0] });
  } catch (err) {
    return next(err);
  }
});

jobSeekerRouter.delete("/experience/:id", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { rowCount } = await query(
      `DELETE FROM job_seeker_experience WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: { message: "Experience record not found" } });
    }
    return res.json({ message: "Experience record deleted" });
  } catch (err) {
    return next(err);
  }
});

/* ================================================================== */
/*  REFERENCES                                                          */
/* ================================================================== */

jobSeekerRouter.get("/references", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { rows } = await query(
      `SELECT * FROM job_seeker_references WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.json({ references: rows });
  } catch (err) {
    return next(err);
  }
});

const referenceSchema = z.object({
  fullName: z.string().min(1).max(255),
  relationship: z.string().max(100).optional().nullable(),
  company: z.string().max(255).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
});

jobSeekerRouter.post("/references", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const d = referenceSchema.parse(req.body);

    const { rows } = await query(
      `INSERT INTO job_seeker_references
         (user_id, full_name, relationship, company, email, phone)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        userId,
        d.fullName,
        d.relationship ?? null,
        d.company ?? null,
        d.email ?? null,
        d.phone ?? null,
      ]
    );

    return res.status(201).json({ reference: rows[0] });
  } catch (err) {
    return next(err);
  }
});

jobSeekerRouter.put("/references/:id", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const d = referenceSchema.parse(req.body);

    const { rows } = await query(
      `UPDATE job_seeker_references SET
         full_name = $3, relationship = $4, company = $5, email = $6, phone = $7
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [
        req.params.id,
        userId,
        d.fullName,
        d.relationship ?? null,
        d.company ?? null,
        d.email ?? null,
        d.phone ?? null,
      ]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: { message: "Reference not found" } });
    }
    return res.json({ reference: rows[0] });
  } catch (err) {
    return next(err);
  }
});

jobSeekerRouter.delete("/references/:id", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { rowCount } = await query(
      `DELETE FROM job_seeker_references WHERE id = $1 AND user_id = $2`,
      [req.params.id, userId]
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: { message: "Reference not found" } });
    }
    return res.json({ message: "Reference deleted" });
  } catch (err) {
    return next(err);
  }
});

/* ================================================================== */
/*  FULL PROFILE (aggregate GET)                                        */
/* ================================================================== */

jobSeekerRouter.get("/full-profile", async (req, res, next) => {
  try {
    const userId = req.auth!.sub;

    const [profile, personal, addresses, education, experience, references] =
      await Promise.all([
        query(
          `SELECT * FROM job_seeker_profiles WHERE user_id = $1`,
          [userId]
        ),
        query(
          `SELECT * FROM job_seeker_personal_details WHERE user_id = $1`,
          [userId]
        ),
        query(
          `SELECT * FROM job_seeker_addresses WHERE user_id = $1 ORDER BY is_primary DESC`,
          [userId]
        ),
        query(
          `SELECT * FROM job_seeker_education WHERE user_id = $1 ORDER BY start_date DESC`,
          [userId]
        ),
        query(
          `SELECT * FROM job_seeker_experience WHERE user_id = $1 ORDER BY start_date DESC`,
          [userId]
        ),
        query(
          `SELECT * FROM job_seeker_references WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        ),
      ]);

    return res.json({
      profile: profile.rows[0] ?? null,
      personalDetails: personal.rows[0] ?? null,
      addresses: addresses.rows,
      education: education.rows,
      experience: experience.rows,
      references: references.rows,
    });
  } catch (err) {
    return next(err);
  }
});
