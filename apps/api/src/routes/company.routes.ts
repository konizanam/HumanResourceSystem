import { Router } from 'express';
import { CompanyController } from '../controllers.ts/company.controller';
import { authenticate } from '../middleware/auth';
import { body } from 'express-validator';
import { validateRequest } from '../utils/validation';

const router = Router();
const companyController = new CompanyController();

// All company routes require authentication
router.use(authenticate);

// Validation rules
const companyValidation = [
  body('name').notEmpty().withMessage('Company name is required'),
  body('industry').optional(),
  body('website').optional().isURL().withMessage('Invalid website URL'),
  body('contact_email').optional().isEmail().withMessage('Invalid email'),
  body('contact_phone').optional()
];

// Company CRUD routes
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompanyById);
router.post('/', companyValidation, validateRequest, companyController.createCompany);
router.put('/:id', companyValidation, validateRequest, companyController.updateCompany);
router.patch('/:id/deactivate', companyController.deactivateCompany);
router.patch('/:id/reactivate', companyController.reactivateCompany);

// Company user management routes
router.get('/:id/users', companyController.getCompanyUsers);
router.post('/:id/users', companyController.addUserToCompany);
router.delete('/:id/users/:userId', companyController.removeUserFromCompany);

export default router;