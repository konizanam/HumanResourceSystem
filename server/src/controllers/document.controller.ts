import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';
import { getFileUrl } from '../config/upload';
import { ForbiddenError } from '../utils/errors';
import { query } from '../config/database';
import { getStringParam, getQueryString } from '../utils/params';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const documentService = new DocumentService();

function normalizeBytea(raw: unknown): Buffer | null {
  if (!raw) return null;
  if (raw instanceof Buffer) return raw;
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('\\x') && trimmed.length > 2) {
      return Buffer.from(trimmed.slice(2), 'hex');
    }
  }
  return null;
}

function withDownloadUrl(document: any) {
  if (!document || !document.id) return document;
  return {
    ...document,
    download_url: `/api/v1/documents/${document.id}/download`,
  };
}

function buildStoredName(file: Express.Multer.File): string {
  const ext = path.extname(String(file.originalname ?? '')).toLowerCase();
  return `${randomUUID()}${ext || ''}`;
}

export class DocumentController {
  
  // Upload document for job seeker
  async uploadJobSeekerDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      if (!file.buffer || file.buffer.length === 0) {
        return res.status(400).json({ error: 'Uploaded file is empty' });
      }

      const userId = req.user!.userId;
      const { document_type, description, is_primary } = req.body;
      const storedFileName = buildStoredName(file);

      // Determine file type folder
      const fileType = file.mimetype.startsWith('image/') ? 'image' : 'document';
      const fileUrl = getFileUrl(storedFileName, fileType as any);
      const fileData = file.buffer;

      // Save document metadata
      const document = await documentService.saveDocumentMetadata({
        user_id: userId,
        file_name: storedFileName,
        original_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        file_path: `db://documents/${storedFileName}`,
        file_url: fileUrl,
        file_data: fileData,
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
          document: withDownloadUrl(document),
          url: `/api/v1/documents/${document.id}/download`
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
      if (!file.buffer || file.buffer.length === 0) {
        return res.status(400).json({ error: 'Uploaded file is empty' });
      }

      const userId = req.user!.userId;
      const companyId = getStringParam(req, 'companyId');
      const { document_type, description, is_primary } = req.body;
      const storedFileName = buildStoredName(file);

      // Check if user has access to company
      const companyAccess = await query(
        'SELECT 1 FROM company_users WHERE company_id = $1 AND user_id = $2',
        [companyId, userId]
      );

      if (companyAccess.rows.length === 0 && !req.user!.roles.includes('ADMIN')) {
        throw new ForbiddenError('You do not have access to this company');
      }

      const fileType = file.mimetype.startsWith('image/') ? 'image' : 'document';
      const fileUrl = getFileUrl(storedFileName, fileType as any);
      const fileData = file.buffer;

      // Save document metadata
      const document = await documentService.saveDocumentMetadata({
        company_id: companyId,
        file_name: storedFileName,
        original_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        file_path: `db://documents/${storedFileName}`,
        file_url: fileUrl,
        file_data: fileData,
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
          document: withDownloadUrl(document),
          url: `/api/v1/documents/${document.id}/download`
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
        if (!file.buffer || file.buffer.length === 0) {
          continue;
        }
        const storedFileName = buildStoredName(file);
        const fileType = file.mimetype.startsWith('image/') ? 'image' : 'document';
        const fileUrl = getFileUrl(storedFileName, fileType as any);
        const fileData = file.buffer;

        const document = await documentService.saveDocumentMetadata({
          user_id: userId,
          file_name: storedFileName,
          original_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
          file_path: `db://documents/${storedFileName}`,
          file_url: fileUrl,
          file_data: fileData,
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
          documents: uploadedDocs.map((doc) => withDownloadUrl(doc)),
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
        data: documents.map((doc) => withDownloadUrl(doc))
      });
    } catch (error) {
      next(error);
    }
  }

  // Get documents for a specific user (admin/HR view)
  async getDocumentsForUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = getStringParam(req, 'userId');
      const documentType = getQueryString(req, 'type');

      const documents = await documentService.getUserDocuments(userId, documentType);

      res.json({
        status: 'success',
        data: documents.map((doc) => withDownloadUrl(doc)),
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
        data: documents.map((doc) => withDownloadUrl(doc))
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
        data: withDownloadUrl(document)
      });
    } catch (error) {
      next(error);
    }
  }

  // Download a document file by id using DB metadata and access checks
  async downloadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const documentId = getStringParam(req, 'documentId');
      const userId = req.user!.userId;

      // Admins and users with VIEW_CV_DATABASE permission (HR/employers reviewing profiles)
      // are allowed to download any document — skip the ownership check for them.
      const userRoles: string[] = (req.user!.roles ?? []).map((r: string) => String(r).toUpperCase());
      const userPermissions: string[] = (req.user!.permissions ?? []).map((p: string) => String(p).toUpperCase());
      const hasElevatedAccess =
        userRoles.includes('ADMIN') ||
        userPermissions.includes('VIEW_CV_DATABASE');
      const checkUserId = hasElevatedAccess ? undefined : userId;

      const document = await documentService.getDocumentById(documentId, checkUserId);
      const filePath = String(document?.file_path ?? '').trim();
      if (!filePath) {
        return res.status(404).json({ error: { message: 'Document file not found' } });
      }

      const resolvedPath = path.resolve(filePath);
      const existsOnDisk = Boolean(filePath) && fs.existsSync(resolvedPath);

      const mimeType = String(document?.mime_type ?? '').trim();
      const originalName = String(document?.original_name ?? '').trim();
      const fallbackName = String(document?.file_name ?? 'document').trim() || 'document';
      const fileName = originalName || fallbackName;

      if (mimeType) {
        res.setHeader('Content-Type', mimeType);
      }
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileName)}"`);

      if (existsOnDisk) {
        return res.sendFile(resolvedPath);
      }

      const fileData = normalizeBytea((document as any)?.file_data);
      if (fileData && fileData.length > 0) {
        return res.status(200).send(fileData);
      }

      return res.status(404).json({ error: { message: 'Document file not found' } });
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