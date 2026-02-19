"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.referenceValidation = exports.experienceValidation = exports.educationValidation = exports.addressValidation = exports.personalDetailsValidation = exports.profileUpdateValidation = exports.loginValidation = exports.registerValidation = exports.validateRequest = void 0;
// src/utils/validation.ts
const express_validator_1 = require("express-validator");
const validateRequest = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            status: 'error',
            errors: errors.array()
        });
    }
    next();
};
exports.validateRequest = validateRequest;
exports.registerValidation = [
    (0, express_validator_1.body)('first_name').notEmpty().withMessage('First name is required').trim(),
    (0, express_validator_1.body)('last_name').notEmpty().withMessage('Last name is required').trim(),
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
    (0, express_validator_1.body)('confirm_password').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Password confirmation does not match password');
        }
        return true;
    }),
];
exports.loginValidation = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
];
exports.profileUpdateValidation = [
    (0, express_validator_1.body)('professional_summary').optional().trim(),
    (0, express_validator_1.body)('field_of_expertise').optional().trim(),
    (0, express_validator_1.body)('qualification_level').optional().trim(),
    (0, express_validator_1.body)('years_experience').optional().isInt({ min: 0 }).withMessage('Years experience must be a positive number'),
];
exports.personalDetailsValidation = [
    (0, express_validator_1.body)('first_name').notEmpty().withMessage('First name is required').trim(),
    (0, express_validator_1.body)('last_name').notEmpty().withMessage('Last name is required').trim(),
    (0, express_validator_1.body)('middle_name').optional().trim(),
    (0, express_validator_1.body)('gender')
        .notEmpty()
        .withMessage('Gender is required')
        .isIn(['Male', 'Female', 'Other', 'Prefer not to say']),
    (0, express_validator_1.body)('date_of_birth')
        .notEmpty()
        .withMessage('Date of birth is required')
        .isISO8601()
        .toDate(),
    (0, express_validator_1.body)('nationality').notEmpty().withMessage('Nationality is required').trim(),
    (0, express_validator_1.body)('id_type').optional().trim().notEmpty().withMessage('ID Type cannot be empty'),
    (0, express_validator_1.body)('id_number').optional().trim().notEmpty().withMessage('ID/Passport Number cannot be empty'),
    (0, express_validator_1.body)('marital_status').optional().trim(),
    (0, express_validator_1.body)('disability_status').optional().isBoolean(),
];
exports.addressValidation = [
    (0, express_validator_1.body)('address_line1').optional().trim(),
    (0, express_validator_1.body)('address_line2').optional().trim(),
    (0, express_validator_1.body)('city').optional().trim(),
    (0, express_validator_1.body)('state').optional().trim(),
    (0, express_validator_1.body)('country').optional().trim(),
    (0, express_validator_1.body)('postal_code').optional().trim(),
    (0, express_validator_1.body)('is_primary').optional().isBoolean(),
];
exports.educationValidation = [
    (0, express_validator_1.body)('institution_name').notEmpty().withMessage('Institution name is required'),
    (0, express_validator_1.body)('qualification').notEmpty().withMessage('Qualification is required'),
    (0, express_validator_1.body)('field_of_study').optional().trim(),
    (0, express_validator_1.body)('start_date').optional().isISO8601().toDate(),
    (0, express_validator_1.body)('end_date').optional().isISO8601().toDate(),
    (0, express_validator_1.body)('is_current').optional().isBoolean(),
    (0, express_validator_1.body)('grade').optional().trim(),
];
exports.experienceValidation = [
    (0, express_validator_1.body)('company_name').notEmpty().withMessage('Company name is required'),
    (0, express_validator_1.body)('job_title').notEmpty().withMessage('Job title is required'),
    (0, express_validator_1.body)('employment_type').optional().trim(),
    (0, express_validator_1.body)('start_date').optional().isISO8601().toDate(),
    (0, express_validator_1.body)('end_date').optional().isISO8601().toDate(),
    (0, express_validator_1.body)('is_current').optional().isBoolean(),
    (0, express_validator_1.body)('responsibilities').optional().trim(),
    (0, express_validator_1.body)('salary').optional().isNumeric(),
];
exports.referenceValidation = [
    (0, express_validator_1.body)('full_name').notEmpty().withMessage('Reference full name is required'),
    (0, express_validator_1.body)('relationship').optional().trim(),
    (0, express_validator_1.body)('company').optional().trim(),
    (0, express_validator_1.body)('email').optional().isEmail(),
    (0, express_validator_1.body)('phone').optional().trim(),
];
//# sourceMappingURL=validation.js.map