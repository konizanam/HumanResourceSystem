import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Create upload directories if they don't exist
const createUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/documents'),
    path.join(__dirname, '../../uploads/images'),
    path.join(__dirname, '../../uploads/temp')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created upload directory: ${dir}`);
    }
  });
};

createUploadDirs();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determine destination based on file type
    let uploadPath = path.join(__dirname, '../../uploads/documents');
    
    if (file.mimetype.startsWith('image/')) {
      uploadPath = path.join(__dirname, '../../uploads/images');
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueId = uuidv4();
    const fileExt = path.extname(file.originalname);
    const fileName = `${uniqueId}${fileExt}`;
    cb(null, fileName);
  }
});

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.') as any, false);
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

// Helper function to delete file
export const deleteFile = async (filename: string, type: 'document' | 'image' = 'document') => {
  try {
    const folder = type === 'image' ? 'images' : 'documents';
    const filePath = path.join(__dirname, `../../uploads/${folder}`, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};