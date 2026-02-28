import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/upload';

const router = Router();
const documentController = new DocumentController();

// All routes require authentication
router.use(authenticate);

// Job seeker document routes
router.post(
  '/upload',
  upload.single('document'),
  documentController.uploadJobSeekerDocument
);

router.post(
  '/upload/multiple',
  upload.array('documents', 5),
  documentController.uploadMultipleDocuments
);

router.get('/my-documents', documentController.getUserDocuments);
router.get('/:documentId', documentController.getDocument);
router.delete('/:documentId', documentController.deleteDocument);
router.patch('/:documentId', documentController.updateDocument);
router.patch('/:documentId/primary', documentController.setPrimaryDocument);

// Company document routes
router.post(
  '/company/:companyId/upload',
  upload.single('document'),
  documentController.uploadCompanyDocument
);

router.get('/company/:companyId/documents', documentController.getCompanyDocuments);

export default router;