"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("../controllers/company.controller");
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
const companyController = new company_controller_1.CompanyController();
// All company routes require authentication
router.use(auth_1.authenticate);
// Validation rules
// Create: all fields required except website
const companyCreateValidation = [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Company name is required'),
    (0, express_validator_1.body)('industry').notEmpty().withMessage('Industry is required'),
    (0, express_validator_1.body)('description').notEmpty().withMessage('Description is required'),
    (0, express_validator_1.body)('website').optional({ checkFalsy: true }).isURL().withMessage('Invalid website URL'),
    (0, express_validator_1.body)('logo_url').notEmpty().isURL().withMessage('Invalid logo URL'),
    (0, express_validator_1.body)('contact_email').notEmpty().isEmail().withMessage('Invalid email'),
    (0, express_validator_1.body)('contact_phone')
        .notEmpty()
        .withMessage('Contact phone is required')
        .bail()
        .custom((value) => {
        const raw = String(value ?? '').trim();
        const digits = raw.replace(/\D/g, '');
        if (digits.length > 13) {
            throw new Error('Phone number must not exceed 13 digits');
        }
        if (!digits.startsWith('264')) {
            throw new Error('Phone number must start with +264');
        }
        if (!/^\+?[\d\s]+$/.test(raw)) {
            throw new Error('Invalid phone format');
        }
        return true;
    }),
    (0, express_validator_1.body)('address_line1').notEmpty().withMessage('Address line 1 is required'),
    (0, express_validator_1.body)('address_line2').notEmpty().withMessage('Address line 2 is required'),
    (0, express_validator_1.body)('city').notEmpty().withMessage('City is required'),
    (0, express_validator_1.body)('country').notEmpty().withMessage('Country is required')
];
// Update: keep permissive (frontend may send partial payload)
const companyUpdateValidation = [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Company name is required'),
    (0, express_validator_1.body)('industry').optional({ checkFalsy: true }),
    (0, express_validator_1.body)('description').optional({ checkFalsy: true }),
    (0, express_validator_1.body)('website').optional({ checkFalsy: true }).isURL().withMessage('Invalid website URL'),
    (0, express_validator_1.body)('logo_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid logo URL'),
    (0, express_validator_1.body)('contact_email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email'),
    (0, express_validator_1.body)('contact_phone')
        .optional({ checkFalsy: true })
        .custom((value) => {
        const raw = String(value ?? '').trim();
        const digits = raw.replace(/\D/g, '');
        if (digits.length > 13) {
            throw new Error('Phone number must not exceed 13 digits');
        }
        if (!digits.startsWith('264')) {
            throw new Error('Phone number must start with +264');
        }
        if (!/^\+?[\d\s]+$/.test(raw)) {
            throw new Error('Invalid phone format');
        }
        return true;
    }),
    (0, express_validator_1.body)('address_line1').optional({ checkFalsy: true }),
    (0, express_validator_1.body)('address_line2').optional({ checkFalsy: true }),
    (0, express_validator_1.body)('city').optional({ checkFalsy: true }),
    (0, express_validator_1.body)('country').optional({ checkFalsy: true })
];
// Company CRUD routes
router.get('/approval-mode', companyController.getApprovalMode);
router.put('/approval-mode', companyController.updateApprovalMode);
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompanyById);
router.post('/', companyCreateValidation, validation_1.validateRequest, companyController.createCompany);
router.put('/:id', companyUpdateValidation, validation_1.validateRequest, companyController.updateCompany);
router.patch('/:id/approve', companyController.approveCompany);
router.patch('/:id/deactivate', companyController.deactivateCompany);
router.patch('/:id/reactivate', companyController.reactivateCompany);
// Company user management routes
router.get('/:id/users', companyController.getCompanyUsers);
router.post('/:id/users', companyController.addUserToCompany);
router.delete('/:id/users/:userId', companyController.removeUserFromCompany);
exports.default = router;
//# sourceMappingURL=company.routes.js.map