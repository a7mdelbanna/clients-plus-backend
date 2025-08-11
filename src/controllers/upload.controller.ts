import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service';
import { logger } from '../config/logger';
import { validationResult } from 'express-validator';
import path from 'path';
import fs from 'fs/promises';

export class UploadController {
  /**
   * Upload single file
   */
  async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      const user = (req as any).user;
      const fileType = req.params.type || 'document';

      // Upload file using storage service
      const fileData = await storageService.uploadFile(req.file.path, {
        companyId: user.companyId,
        userId: user.id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        type: fileType as any,
        metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
      });

      logger.info(`File uploaded successfully: ${fileData.id}`, {
        fileId: fileData.id,
        userId: user.id,
        companyId: user.companyId,
        type: fileType,
      });

      res.status(201).json({
        success: true,
        data: fileData,
      });
    } catch (error) {
      logger.error('Error uploading file:', error);
      next(error);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          errors: errors.array(),
        });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files uploaded',
        });
        return;
      }

      const user = (req as any).user;
      const fileType = req.params.type || 'document';

      // Upload all files
      const uploadPromises = files.map((file) =>
        storageService.uploadFile(file.path, {
          companyId: user.companyId,
          userId: user.id,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          type: fileType as any,
          metadata: req.body.metadata ? JSON.parse(req.body.metadata) : undefined,
        })
      );

      const uploadedFiles = await Promise.all(uploadPromises);

      logger.info(`Multiple files uploaded successfully`, {
        count: uploadedFiles.length,
        userId: user.id,
        companyId: user.companyId,
        type: fileType,
      });

      res.status(201).json({
        success: true,
        data: uploadedFiles,
      });
    } catch (error) {
      logger.error('Error uploading multiple files:', error);
      next(error);
    }
  }

  /**
   * Get file by ID
   */
  async getFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileId } = req.params;
      const user = (req as any).user;

      const file = await storageService.getFile(fileId, user.companyId);

      if (!file) {
        res.status(404).json({
          success: false,
          error: 'File not found',
        });
        return;
      }

      res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      logger.error('Error getting file:', error);
      next(error);
    }
  }

  /**
   * Serve local file
   */
  async serveLocalFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filePath = req.params[0]; // Capture everything after /local/
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const fullPath = path.join(uploadDir, filePath);

      // Security: Prevent directory traversal
      const normalizedPath = path.normalize(fullPath);
      if (!normalizedPath.startsWith(path.resolve(uploadDir))) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
        });
        return;
      }

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        res.status(404).json({
          success: false,
          error: 'File not found',
        });
        return;
      }

      // Get file stats for caching headers
      const stats = await fs.stat(fullPath);
      
      // Set caching headers
      res.set({
        'Cache-Control': 'public, max-age=31536000', // 1 year
        'ETag': `"${stats.size}-${stats.mtime.getTime()}"`,
        'Last-Modified': stats.mtime.toUTCString(),
      });

      // Check if client has cached version
      const ifNoneMatch = req.headers['if-none-match'];
      const ifModifiedSince = req.headers['if-modified-since'];
      
      if (
        ifNoneMatch === `"${stats.size}-${stats.mtime.getTime()}"` ||
        (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime)
      ) {
        res.status(304).end();
        return;
      }

      // Send file
      res.sendFile(fullPath);
    } catch (error) {
      logger.error('Error serving local file:', error);
      next(error);
    }
  }

  /**
   * Delete file
   */
  async deleteFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileId } = req.params;
      const user = (req as any).user;

      const deleted = await storageService.deleteFile(fileId, user.companyId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'File not found',
        });
        return;
      }

      logger.info(`File deleted successfully: ${fileId}`, {
        fileId,
        userId: user.id,
        companyId: user.companyId,
      });

      res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting file:', error);
      next(error);
    }
  }

  /**
   * Get company files
   */
  async getCompanyFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;
      const { type, limit = '20', offset = '0' } = req.query;

      const result = await storageService.getFilesByCompany(user.companyId, {
        type: type as string,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      });

      res.json({
        success: true,
        data: result.files,
        meta: {
          total: result.total,
          limit: parseInt(limit as string, 10),
          offset: parseInt(offset as string, 10),
        },
      });
    } catch (error) {
      logger.error('Error getting company files:', error);
      next(error);
    }
  }

  /**
   * Get storage usage
   */
  async getStorageUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as any).user;

      const usage = await storageService.getStorageUsage(user.companyId);

      res.json({
        success: true,
        data: {
          totalSize: usage.totalSize,
          totalSizeMB: (usage.totalSize / (1024 * 1024)).toFixed(2),
          fileCount: usage.fileCount,
          byType: Object.entries(usage.byType).map(([type, data]) => ({
            type,
            size: data.size,
            sizeMB: (data.size / (1024 * 1024)).toFixed(2),
            count: data.count,
          })),
        },
      });
    } catch (error) {
      logger.error('Error getting storage usage:', error);
      next(error);
    }
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      const user = (req as any).user;

      // Upload file
      const fileData = await storageService.uploadFile(req.file.path, {
        companyId: user.companyId,
        userId: user.id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        type: 'avatar',
        metadata: {
          entityType: req.body.entityType || 'user',
          entityId: req.body.entityId || user.id,
        },
      });

      // TODO: Update user/staff/client avatar URL in database
      // This would depend on entityType and entityId

      logger.info(`Avatar uploaded successfully: ${fileData.id}`, {
        fileId: fileData.id,
        userId: user.id,
        companyId: user.companyId,
      });

      res.status(201).json({
        success: true,
        data: {
          id: fileData.id,
          url: fileData.url,
          thumbnailUrl: fileData.thumbnailUrl,
        },
      });
    } catch (error) {
      logger.error('Error uploading avatar:', error);
      next(error);
    }
  }

  /**
   * Upload service images
   */
  async uploadServiceImages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files uploaded',
        });
        return;
      }

      const user = (req as any).user;
      const { serviceId } = req.body;

      if (!serviceId) {
        res.status(400).json({
          success: false,
          error: 'Service ID is required',
        });
        return;
      }

      // Upload all files
      const uploadPromises = files.map((file) =>
        storageService.uploadFile(file.path, {
          companyId: user.companyId,
          userId: user.id,
          fileName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          type: 'service',
          metadata: {
            serviceId,
          },
        })
      );

      const uploadedFiles = await Promise.all(uploadPromises);

      // TODO: Update service with image URLs in database

      logger.info(`Service images uploaded successfully`, {
        count: uploadedFiles.length,
        serviceId,
        userId: user.id,
        companyId: user.companyId,
      });

      res.status(201).json({
        success: true,
        data: uploadedFiles.map((file) => ({
          id: file.id,
          url: file.url,
          thumbnailUrl: file.thumbnailUrl,
        })),
      });
    } catch (error) {
      logger.error('Error uploading service images:', error);
      next(error);
    }
  }

  /**
   * Upload company logo
   */
  async uploadCompanyLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      const user = (req as any).user;

      // Upload file
      const fileData = await storageService.uploadFile(req.file.path, {
        companyId: user.companyId,
        userId: user.id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        type: 'logo',
        metadata: {
          branchId: req.body.branchId,
        },
      });

      // TODO: Update company/branch logo URL in database

      logger.info(`Company logo uploaded successfully: ${fileData.id}`, {
        fileId: fileData.id,
        userId: user.id,
        companyId: user.companyId,
      });

      res.status(201).json({
        success: true,
        data: {
          id: fileData.id,
          url: fileData.url,
          thumbnailUrl: fileData.thumbnailUrl,
        },
      });
    } catch (error) {
      logger.error('Error uploading company logo:', error);
      next(error);
    }
  }
}

export const uploadController = new UploadController();