import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticate, authorizePermission } from '../middleware/auth';
import { upload } from '../config/upload';

const router = Router();
const documentController = new DocumentController();

// All routes require authentication
router.use(authenticate);

// Job seeker document routes
router.post(
  '/upload',
  authorizePermission('APPLY_JOB'),
  upload.single('document'),
  documentController.uploadJobSeekerDocument
);

router.post(
  '/upload/multiple',
  authorizePermission('APPLY_JOB'),
  upload.array('documents', 5),
  documentController.uploadMultipleDocuments
);

router.get('/my-documents', authorizePermission('APPLY_JOB'), documentController.getUserDocuments);
router.get(
  '/user/:userId/documents',
  authorizePermission('view_users', 'manage_users', 'view_applications', 'manage_applications'),
  documentController.getDocumentsForUser,
);

// Generic document actions: require some relevant permission (job seeker, employer/company, or admin via bypass).
router.get(
  '/:documentId/download',
  authorizePermission('APPLY_JOB', 'CREATE_JOB', 'MANAGE_COMPANY', 'MANAGE_COMPANY_USERS', 'VIEW_APPLICATIONS', 'MANAGE_USERS'),
  documentController.downloadDocument
);

router.get(
  '/:documentId',
  authorizePermission('APPLY_JOB', 'CREATE_JOB', 'MANAGE_COMPANY', 'MANAGE_COMPANY_USERS', 'VIEW_APPLICATIONS', 'MANAGE_USERS'),
  documentController.getDocument
);
router.delete(
  '/:documentId',
  authorizePermission('APPLY_JOB', 'CREATE_JOB', 'MANAGE_COMPANY', 'MANAGE_COMPANY_USERS', 'VIEW_APPLICATIONS', 'MANAGE_USERS'),
  documentController.deleteDocument
);
router.patch(
  '/:documentId',
  authorizePermission('APPLY_JOB', 'CREATE_JOB', 'MANAGE_COMPANY', 'MANAGE_COMPANY_USERS', 'VIEW_APPLICATIONS', 'MANAGE_USERS'),
  documentController.updateDocument
);
router.patch(
  '/:documentId/primary',
  authorizePermission('APPLY_JOB', 'CREATE_JOB', 'MANAGE_COMPANY', 'MANAGE_COMPANY_USERS', 'VIEW_APPLICATIONS', 'MANAGE_USERS'),
  documentController.setPrimaryDocument
);

// Company document routes
router.post(
  '/company/:companyId/upload',
  authorizePermission('MANAGE_COMPANY', 'MANAGE_COMPANY_USERS', 'CREATE_JOB'),
  upload.single('document'),
  documentController.uploadCompanyDocument
);

router.get(
  '/company/:companyId/documents',
  authorizePermission('MANAGE_COMPANY', 'MANAGE_COMPANY_USERS', 'CREATE_JOB'),
  documentController.getCompanyDocuments
);

export default router;