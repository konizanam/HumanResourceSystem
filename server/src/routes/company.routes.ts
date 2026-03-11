import { Router } from 'express';
import { CompanyController } from '../controllers/company.controller';
import { authenticate } from '../middleware/auth';
import { logAdminAction } from '../middleware/adminLogger';
import { body } from 'express-validator';
import { validateRequest } from '../utils/validation';
import multer from 'multer';

const router = Router();
const companyController = new CompanyController();

const companyLogoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Invalid logo file type. Please upload an image.') as any);
  },
});

// All company routes require authentication
router.use(authenticate);

// Validation rules
// Create: all fields required except website
const companyCreateValidation = [
  body('name').notEmpty().withMessage('Company name is required'),
  body('industry').notEmpty().withMessage('Industry is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('website').optional({ checkFalsy: true }).isURL().withMessage('Invalid website URL'),
  body('logo_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid logo URL'),
  body('contact_email').notEmpty().isEmail().withMessage('Invalid email'),
  body('contact_phone')
    .notEmpty()
    .withMessage('Contact phone is required')
    .bail()
    .custom((value) => {
      const raw = String(value ?? '').trim();
      const digits = raw.replace(/\D/g, '');
      if (digits.length > 15) {
        throw new Error('Phone number must not exceed 15 digits');
      }
      if (digits.length < 6) {
        throw new Error('Phone number appears too short');
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
  body('name').optional().notEmpty().withMessage('Company name is required'),
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
      if (digits.length > 15) {
        throw new Error('Phone number must not exceed 15 digits');
      }
      if (digits.length < 6) {
        throw new Error('Phone number appears too short');
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
router.get('/settings', companyController.getSystemSettings);
router.put('/settings', companyController.updateSystemSettings);
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompanyById);
router.post('/', companyLogoUpload.single('logo'), companyCreateValidation, validateRequest, logAdminAction('CREATE_COMPANY', 'company'), companyController.createCompany);
router.put('/:id', companyLogoUpload.single('logo'), companyUpdateValidation, validateRequest, logAdminAction('UPDATE_COMPANY', 'company'), companyController.updateCompany);
router.delete('/:id', logAdminAction('DELETE_COMPANY', 'company'), companyController.deleteCompany);
router.patch('/:id/approve', logAdminAction('APPROVE_COMPANY', 'company'), companyController.approveCompany);
router.patch('/:id/deactivate', logAdminAction('DEACTIVATE_COMPANY', 'company'), companyController.deactivateCompany);
router.patch('/:id/reactivate', companyController.reactivateCompany);

// Company user management routes
router.get('/:id/users', companyController.getCompanyUsers);
router.post('/:id/users', companyController.addUserToCompany);
router.delete('/:id/users/:userId', companyController.removeUserFromCompany);

export default router;