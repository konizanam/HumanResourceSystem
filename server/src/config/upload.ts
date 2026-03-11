import multer from 'multer';
import path from 'path';

// Store uploads in memory; controllers persist bytes to DB.
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types: PDF only
  const allowedMimes = ['application/pdf', 'application/x-pdf'];

  const ext = path.extname(String(file.originalname ?? '')).toLowerCase();
  const allowedExts = new Set(['.pdf']);

  const isAllowedByMime = allowedMimes.includes(file.mimetype);
  const isAllowedByExtension = allowedExts.has(ext);

  if (isAllowedByMime || isAllowedByExtension) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF files are allowed.') as any, false);
  }
};

// Create multer instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 5 // Max 5 files per upload
  }
});

// Helper function to get file URL
export const getFileUrl = (filename: string, type: 'document' | 'image' = 'document') => {
  const baseUrl = process.env.API_URL || 'http://localhost:4000';
  const folder = type === 'image' ? 'images' : 'documents';
  return `${baseUrl}/uploads/${folder}/${filename}`;
};