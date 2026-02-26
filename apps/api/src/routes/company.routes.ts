import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authenticate } from '../middleware/auth';
import { body } from 'express-validator';
import { validateRequest } from '../utils/validation';

const router = Router();
const companyController = new CompanyController();

// All company routes require authentication
router.use(authenticate);

// Validation rules
// Create: all fields required except website
const companyCreateValidation = [
  body('name').notEmpty().withMessage('Company name is required'),
  body('industry').notEmpty().withMessage('Industry is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('website').optional({ checkFalsy: true }).isURL().withMessage('Invalid website URL'),
  body('logo_url').notEmpty().isURL().withMessage('Invalid logo URL'),
  body('contact_email').notEmpty().isEmail().withMessage('Invalid email'),
  body('contact_phone')
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
  body('address_line1').notEmpty().withMessage('Address line 1 is required'),
  body('address_line2').notEmpty().withMessage('Address line 2 is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('country').notEmpty().withMessage('Country is required')
];

// Update: keep permissive (frontend may send partial payload)
const companyUpdateValidation = [
  body('name').notEmpty().withMessage('Company name is required'),
  body('industry').optional({ checkFalsy: true }),
  body('description').optional({ checkFalsy: true }),
  body('website').optional({ checkFalsy: true }).isURL().withMessage('Invalid website URL'),
  body('logo_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid logo URL'),
  body('contact_email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email'),
  body('contact_phone')
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
  body('address_line1').optional({ checkFalsy: true }),
  body('address_line2').optional({ checkFalsy: true }),
  body('city').optional({ checkFalsy: true }),
  body('country').optional({ checkFalsy: true })
];

// Company CRUD routes
router.get('/approval-mode', companyController.getApprovalMode);
router.put('/approval-mode', companyController.updateApprovalMode);
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompanyById);
router.post('/', companyCreateValidation, validateRequest, companyController.createCompany);
router.put('/:id', companyUpdateValidation, validateRequest, companyController.updateCompany);
router.patch('/:id/approve', companyController.approveCompany);
router.patch('/:id/deactivate', companyController.deactivateCompany);
router.patch('/:id/reactivate', companyController.reactivateCompany);

// Company user management routes
router.get('/:id/users', companyController.getCompanyUsers);
router.post('/:id/users', companyController.addUserToCompany);
router.delete('/:id/users/:userId', companyController.removeUserFromCompany);

export default router;