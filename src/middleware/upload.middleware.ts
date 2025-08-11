import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { logger } from '../config/logger';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File type configurations
const fileTypeConfigs = {
  avatar: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
    folder: 'avatars',
  },
  service: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'services',
  },
  document: {
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 20 * 1024 * 1024, // 20MB
    folder: 'documents',
  },
  logo: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
    maxSize: 2 * 1024 * 1024, // 2MB
    folder: 'logos',
  },
  invoice: {
    allowedMimeTypes: ['application/pdf'],
    maxSize: 10 * 1024 * 1024, // 10MB
    folder: 'invoices',
  },
};

// Custom storage configuration
const diskStorage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    const fileType = req.params.type || 'document';
    const config = fileTypeConfigs[fileType as keyof typeof fileTypeConfigs];
    const folder = config?.folder || 'misc';
    
    // Create company-specific folder
    const companyId = (req as any).user?.companyId || 'unknown';
    const destPath = path.join(uploadDir, companyId, folder);
    
    // Ensure directory exists
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    cb(null, destPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    // Generate unique filename
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    const filename = `${uniqueId}${extension}`;
    cb(null, filename);
  },
});

// File filter to validate file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const fileType = req.params.type || 'document';
  const config = fileTypeConfigs[fileType as keyof typeof fileTypeConfigs];
  
  if (!config) {
    logger.error(`Invalid file type: ${fileType}`);
    return cb(new Error('Invalid file type'));
  }
  
  if (!config.allowedMimeTypes.includes(file.mimetype)) {
    logger.error(`Invalid file mimetype: ${file.mimetype} for type: ${fileType}`);
    return cb(new Error(`Invalid file format. Allowed types: ${config.allowedMimeTypes.join(', ')}`));
  }
  
  cb(null, true);
};

// Create multer instance with configuration
const upload = multer({
  storage: diskStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // Max 20MB (will be checked per file type)
  },
});

// Middleware to check file size based on type
export const checkFileSize = (req: Request, res: any, next: any) => {
  if (!req.file && !req.files) {
    return next();
  }
  
  const fileType = req.params.type || 'document';
  const config = fileTypeConfigs[fileType as keyof typeof fileTypeConfigs];
  
  if (!config) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
    });
  }
  
  const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
  
  for (const file of files.filter(Boolean)) {
    if (file.size > config.maxSize) {
      // Delete the uploaded file
      if (file.path) {
        fs.unlinkSync(file.path);
      }
      
      return res.status(400).json({
        success: false,
        error: `File size exceeds limit of ${config.maxSize / (1024 * 1024)}MB`,
      });
    }
  }
  
  next();
};

// Export upload middleware for different scenarios
export const uploadSingle = (fieldName: string = 'file') => upload.single(fieldName);
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 10) => upload.array(fieldName, maxCount);
export const uploadFields = (fields: { name: string; maxCount?: number }[]) => upload.fields(fields);

// Memory storage for temporary operations (e.g., image processing)
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

export default upload;