"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.getFileUrl = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
// Create upload directories if they don't exist
const createUploadDirs = () => {
    const dirs = [
        path_1.default.join(__dirname, '../../uploads'),
        path_1.default.join(__dirname, '../../uploads/documents'),
        path_1.default.join(__dirname, '../../uploads/images'),
        path_1.default.join(__dirname, '../../uploads/temp')
    ];
    dirs.forEach(dir => {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
            console.log(`📁 Created upload directory: ${dir}`);
        }
    });
};
createUploadDirs();
// Configure storage
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        // Determine destination based on file type
        let uploadPath = path_1.default.join(__dirname, '../../uploads/documents');
        if (file.mimetype.startsWith('image/')) {
            uploadPath = path_1.default.join(__dirname, '../../uploads/images');
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueId = (0, uuid_1.v4)();
        const fileExt = path_1.default.extname(file.originalname);
        const fileName = `${uniqueId}${fileExt}`;
        cb(null, fileName);
    }
});
// File filter function
const fileFilter = (req, file, cb) => {
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
    }
    else {
        cb(new Error('Invalid file type. Only images, PDFs, and documents are allowed.'), false);
    }
};
// Create multer instance
exports.upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
        files: 5 // Max 5 files per upload
    }
});
// Helper function to get file URL
const getFileUrl = (filename, type = 'document') => {
    const baseUrl = process.env.API_URL || 'http://localhost:4000';
    const folder = type === 'image' ? 'images' : 'documents';
    return `${baseUrl}/uploads/${folder}/${filename}`;
};
exports.getFileUrl = getFileUrl;
// Helper function to delete file
const deleteFile = async (filename, type = 'document') => {
    try {
        const folder = type === 'image' ? 'images' : 'documents';
        const filePath = path_1.default.join(__dirname, `../../uploads/${folder}`, filename);
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
};
exports.deleteFile = deleteFile;
//# sourceMappingURL=upload.js.map