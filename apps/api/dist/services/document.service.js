"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentService = void 0;
const database_1 = require("../config/database");
const upload_1 = require("../config/upload");
const errors_1 = require("../utils/errors");
class DocumentService {
    // Save document metadata to database
    async saveDocumentMetadata(data) {
        const result = await (0, database_1.query)(`INSERT INTO documents (
        user_id, company_id, file_name, original_name, file_size, 
        mime_type, file_path, file_url, document_type, category, 
        description, is_public, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`, [
            data.user_id || null,
            data.company_id || null,
            data.file_name,
            data.original_name,
            data.file_size,
            data.mime_type,
            data.file_path,
            data.file_url,
            data.document_type || null,
            data.category || null,
            data.description || null,
            data.is_public || false,
            data.uploaded_by
        ]);
        return result.rows[0];
    }
    // Get document by ID
    async getDocumentById(documentId, userId) {
        const result = await (0, database_1.query)(`SELECT d.*, 
        u.first_name || ' ' || u.last_name as uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.id = $1`, [documentId]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Document not found');
        }
        const document = result.rows[0];
        // Check permissions if userId is provided
        if (userId && !document.is_public) {
            if (document.user_id !== userId && document.company_id) {
                // Check if user belongs to the company
                const companyAccess = await (0, database_1.query)('SELECT 1 FROM company_users WHERE company_id = $1 AND user_id = $2', [document.company_id, userId]);
                if (companyAccess.rows.length === 0) {
                    throw new errors_1.ForbiddenError('You do not have access to this document');
                }
            }
            else if (document.user_id !== userId) {
                throw new errors_1.ForbiddenError('You do not have access to this document');
            }
        }
        return document;
    }
    // Get user documents
    async getUserDocuments(userId, documentType) {
        let sql = `
      SELECT d.*, 
        jsd.document_type as association_type,
        jsd.is_primary
      FROM documents d
      JOIN job_seeker_documents jsd ON d.id = jsd.document_id
      WHERE jsd.user_id = $1
    `;
        const params = [userId];
        if (documentType) {
            sql += ` AND jsd.document_type = $2`;
            params.push(documentType);
        }
        sql += ` ORDER BY jsd.is_primary DESC, d.created_at DESC`;
        const result = await (0, database_1.query)(sql, params);
        return result.rows;
    }
    // Get company documents
    async getCompanyDocuments(companyId, documentType) {
        let sql = `
      SELECT d.*, 
        cd.document_type as association_type,
        cd.is_primary
      FROM documents d
      JOIN company_documents cd ON d.id = cd.document_id
      WHERE cd.company_id = $1
    `;
        const params = [companyId];
        if (documentType) {
            sql += ` AND cd.document_type = $2`;
            params.push(documentType);
        }
        sql += ` ORDER BY cd.is_primary DESC, d.created_at DESC`;
        const result = await (0, database_1.query)(sql, params);
        return result.rows;
    }
    // Associate document with job seeker
    async associateWithJobSeeker(documentId, userId, documentType, isPrimary = false) {
        // If setting as primary, unset other primary documents of this type
        if (isPrimary) {
            await (0, database_1.query)(`UPDATE job_seeker_documents 
         SET is_primary = false 
         WHERE user_id = $1 AND document_type = $2`, [userId, documentType]);
        }
        const result = await (0, database_1.query)(`INSERT INTO job_seeker_documents (user_id, document_id, document_type, is_primary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, document_id) 
       DO UPDATE SET document_type = EXCLUDED.document_type, is_primary = EXCLUDED.is_primary
       RETURNING *`, [userId, documentId, documentType, isPrimary]);
        return result.rows[0];
    }
    // Associate document with company
    async associateWithCompany(documentId, companyId, documentType, isPrimary = false) {
        // If setting as primary, unset other primary documents of this type
        if (isPrimary) {
            await (0, database_1.query)(`UPDATE company_documents 
         SET is_primary = false 
         WHERE company_id = $1 AND document_type = $2`, [companyId, documentType]);
        }
        const result = await (0, database_1.query)(`INSERT INTO company_documents (company_id, document_id, document_type, is_primary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (company_id, document_id) 
       DO UPDATE SET document_type = EXCLUDED.document_type, is_primary = EXCLUDED.is_primary
       RETURNING *`, [companyId, documentId, documentType, isPrimary]);
        return result.rows[0];
    }
    // Delete document
    async deleteDocument(documentId, userId) {
        // Get document info
        const document = await this.getDocumentById(documentId, userId);
        // Delete from database
        await (0, database_1.query)('DELETE FROM documents WHERE id = $1', [documentId]);
        // Delete physical file
        const fileType = document.mime_type.startsWith('image/') ? 'image' : 'document';
        await (0, upload_1.deleteFile)(document.file_name, fileType);
        return { message: 'Document deleted successfully' };
    }
    // Update document metadata
    async updateDocument(documentId, userId, updates) {
        const { document_type, category, description, is_public } = updates;
        const result = await (0, database_1.query)(`UPDATE documents 
       SET document_type = COALESCE($1, document_type),
           category = COALESCE($2, category),
           description = COALESCE($3, description),
           is_public = COALESCE($4, is_public),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`, [document_type, category, description, is_public, documentId]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Document not found');
        }
        return result.rows[0];
    }
    // Set primary document for job seeker
    async setPrimaryJobSeekerDocument(userId, documentId, documentType) {
        // First, unset all primary for this type
        await (0, database_1.query)(`UPDATE job_seeker_documents 
       SET is_primary = false 
       WHERE user_id = $1 AND document_type = $2`, [userId, documentType]);
        // Then set the new primary
        const result = await (0, database_1.query)(`UPDATE job_seeker_documents 
       SET is_primary = true 
       WHERE user_id = $1 AND document_id = $2 AND document_type = $3
       RETURNING *`, [userId, documentId, documentType]);
        if (result.rows.length === 0) {
            throw new errors_1.NotFoundError('Document association not found');
        }
        return result.rows[0];
    }
}
exports.DocumentService = DocumentService;
//# sourceMappingURL=document.service.js.map