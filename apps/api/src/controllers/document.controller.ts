import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';
import { getFileUrl } from '../config/upload';
import { ForbiddenError } from '../utils/errors';
import { query } from '../config/database';
import { getStringParam, getQueryString } from '../utils/params';

const documentService = new DocumentService();

export class DocumentController {
  
  // Upload document for job seeker
  async uploadJobSeekerDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = req.user!.userId;
      const { document_type, description, is_primary } = req.body;

      // Determine file type folder
      const fileType = file.mimetype.startsWith('image/') ? 'image' : 'document';
      const fileUrl = getFileUrl(file.filename, fileType as any);

      // Save document metadata
      const document = await documentService.saveDocumentMetadata({
        user_id: userId,
        file_name: file.filename,
        original_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        file_path: file.path,
        file_url: fileUrl,
        document_type: document_type || 'general',
        description: description,
        uploaded_by: userId
      });

      // Associate with job seeker
      await documentService.associateWithJobSeeker(
        document.id,
        userId,
        document_type || 'general',
        is_primary === 'true'
      );

      res.status(201).json({
        status: 'success',
        data: {
          document,
          url: fileUrl
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Upload document for company
  async uploadCompanyDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const userId = req.user!.userId;
      const companyId = getStringParam(req, 'companyId');
      const { document_type, description, is_primary } = req.body;

      // Check if user has access to company
      const companyAccess = await query(
        'SELECT 1 FROM company_users WHERE company_id = $1 AND user_id = $2',
        [companyId, userId]
      );

      if (companyAccess.rows.length === 0 && !req.user!.roles.includes('ADMIN')) {
        throw new ForbiddenError('You do not have access to this company');
      }

      const fileType = file.mimetype.startsWith('image/') ? 'image' : 'document';
      const fileUrl = getFileUrl(file.filename, fileType as any);

      // Save document metadata
      const document = await documentService.saveDocumentMetadata({
        company_id: companyId,
        file_name: file.filename,
        original_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        file_path: file.path,
        file_url: fileUrl,
        document_type: document_type || 'general',
        description: description,
        uploaded_by: userId
      });

      // Associate with company
      await documentService.associateWithCompany(
        document.id,
        companyId,
        document_type || 'general',
        is_primary === 'true'
      );

      res.status(201).json({
        status: 'success',
        data: {
          document,
          url: fileUrl
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Multiple file upload
  async uploadMultipleDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const userId = req.user!.userId;
      const { document_type, description } = req.body;

      const uploadedDocs = [];

      for (const file of files) {
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 'document';
        const fileUrl = getFileUrl(file.filename, fileType as any);

        const document = await documentService.saveDocumentMetadata({
          user_id: userId,
          file_name: file.filename,
          original_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
          file_path: file.path,
          file_url: fileUrl,
          document_type: document_type || 'general',
          description: description,
          uploaded_by: userId
        });

        await documentService.associateWithJobSeeker(
          document.id,
          userId,
          document_type || 'general',
          false
        );

        uploadedDocs.push(document);
      }

      res.status(201).json({
        status: 'success',
        data: {
          documents: uploadedDocs,
          count: uploadedDocs.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user documents
  async getUserDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const documentType = getQueryString(req, 'type');

      const documents = await documentService.getUserDocuments(userId, documentType);

      res.json({
        status: 'success',
        data: documents
      });
    } catch (error) {
      next(error);
    }
  }

  // Get company documents
  async getCompanyDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = getStringParam(req, 'companyId');
      const userId = req.user!.userId;
      const documentType = getQueryString(req, 'type');

      // Check if user has access to company
      const companyAccess = await query(
        'SELECT 1 FROM company_users WHERE company_id = $1 AND user_id = $2',
        [companyId, userId]
      );

      if (companyAccess.rows.length === 0 && !req.user!.roles.includes('ADMIN')) {
        throw new ForbiddenError('You do not have access to this company');
      }

      const documents = await documentService.getCompanyDocuments(companyId, documentType);

      res.json({
        status: 'success',
        data: documents
      });
    } catch (error) {
      next(error);
    }
  }

  // Get single document
  async getDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const documentId = getStringParam(req, 'documentId');
      const userId = req.user!.userId;

      const document = await documentService.getDocumentById(documentId, userId);

      res.json({
        status: 'success',
        data: document
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete document
  async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const documentId = getStringParam(req, 'documentId');
      const userId = req.user!.userId;

      await documentService.deleteDocument(documentId, userId);

      res.json({
        status: 'success',
        message: 'Document deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Update document metadata
  async updateDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const documentId = getStringParam(req, 'documentId');
      const userId = req.user!.userId;

      const document = await documentService.updateDocument(documentId, userId, req.body);

      res.json({
        status: 'success',
        data: document
      });
    } catch (error) {
      next(error);
    }
  }

  // Set primary document
  async setPrimaryDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const documentId = getStringParam(req, 'documentId');
      const userId = req.user!.userId;
      const { document_type } = req.body;

      const result = await documentService.setPrimaryJobSeekerDocument(
        userId,
        documentId,
        document_type
      );

      res.json({
        status: 'success',
        data: result,
        message: 'Primary document updated'
      });
    } catch (error) {
      next(error);
    }
  }
}