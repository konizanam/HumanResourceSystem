"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("../controllers.ts/company.controller");
const auth_1 = require("../middleware/auth");
const express_validator_1 = require("express-validator");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
const companyController = new company_controller_1.CompanyController();
// All company routes require authentication
router.use(auth_1.authenticate);
// Validation rules
const companyValidation = [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Company name is required'),
    (0, express_validator_1.body)('industry').optional(),
    (0, express_validator_1.body)('website').optional().isURL().withMessage('Invalid website URL'),
    (0, express_validator_1.body)('contact_email').optional().isEmail().withMessage('Invalid email'),
    (0, express_validator_1.body)('contact_phone').optional()
];
// Company CRUD routes
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompanyById);
router.post('/', companyValidation, validation_1.validateRequest, companyController.createCompany);
router.put('/:id', companyValidation, validation_1.validateRequest, companyController.updateCompany);
router.patch('/:id/deactivate', companyController.deactivateCompany);
router.patch('/:id/reactivate', companyController.reactivateCompany);
// Company user management routes
router.get('/:id/users', companyController.getCompanyUsers);
router.post('/:id/users', companyController.addUserToCompany);
router.delete('/:id/users/:userId', companyController.removeUserFromCompany);
exports.default = router;
//# sourceMappingURL=company.routes.js.map