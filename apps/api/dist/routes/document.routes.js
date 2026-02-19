"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const document_controller_1 = require("../controllers.ts/document.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../config/upload");
const router = (0, express_1.Router)();
const documentController = new document_controller_1.DocumentController();
// All routes require authentication
router.use(auth_1.authenticate);
// Job seeker document routes
router.post('/upload', upload_1.upload.single('document'), documentController.uploadJobSeekerDocument);
router.post('/upload/multiple', upload_1.upload.array('documents', 5), documentController.uploadMultipleDocuments);
router.get('/my-documents', documentController.getUserDocuments);
router.get('/:documentId', documentController.getDocument);
router.delete('/:documentId', documentController.deleteDocument);
router.patch('/:documentId', documentController.updateDocument);
router.patch('/:documentId/primary', documentController.setPrimaryDocument);
// Company document routes
router.post('/company/:companyId/upload', upload_1.upload.single('document'), documentController.uploadCompanyDocument);
router.get('/company/:companyId/documents', documentController.getCompanyDocuments);
exports.default = router;
//# sourceMappingURL=document.routes.js.map