// src/utils/validation.ts
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      status: 'error',
      errors: errors.array() 
    });
  }
  next();
};

export const registerValidation = [
  body('first_name').notEmpty().withMessage('First name is required').trim(),
  body('last_name').notEmpty().withMessage('Last name is required').trim(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Password confirmation does not match password');
    }
    return true;
  }),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const profileUpdateValidation = [
  body('professional_summary').optional().trim(),
  body('field_of_expertise').optional().trim(),
  body('qualification_level').optional().trim(),
  body('years_experience').optional().isInt({ min: 0 }).withMessage('Years experience must be a positive number'),
];

export const personalDetailsValidation = [
  body('first_name').optional().trim(),
  body('last_name').optional().trim(),
  body('middle_name').optional().trim(),
  body('gender').optional().isIn(['Male', 'Female', 'Other', 'Prefer not to say']),
  body('date_of_birth').optional().isISO8601().toDate(),
  body('nationality').optional().trim(),
  body('marital_status').optional().trim(),
  body('disability_status').optional().isBoolean(),
];

export const addressValidation = [
  body('address_line1').optional().trim(),
  body('address_line2').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('country').optional().trim(),
  body('postal_code').optional().trim(),
  body('is_primary').optional().isBoolean(),
];

export const educationValidation = [
  body('institution_name').notEmpty().withMessage('Institution name is required'),
  body('qualification').notEmpty().withMessage('Qualification is required'),
  body('field_of_study').optional().trim(),
  body('start_date').optional().isISO8601().toDate(),
  body('end_date').optional().isISO8601().toDate(),
  body('is_current').optional().isBoolean(),
  body('grade').optional().trim(),
];

export const experienceValidation = [
  body('company_name').notEmpty().withMessage('Company name is required'),
  body('job_title').notEmpty().withMessage('Job title is required'),
  body('employment_type').optional().trim(),
  body('start_date').optional().isISO8601().toDate(),
  body('end_date').optional().isISO8601().toDate(),
  body('is_current').optional().isBoolean(),
  body('responsibilities').optional().trim(),
  body('salary').optional().isNumeric(),
];

export const referenceValidation = [
  body('full_name').notEmpty().withMessage('Reference full name is required'),
  body('relationship').optional().trim(),
  body('company').optional().trim(),
  body('email').optional().isEmail(),
  body('phone').optional().trim(),
];