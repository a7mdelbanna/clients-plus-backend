import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

export interface FileUploadData {
  companyId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  size: number;
  type: 'avatar' | 'service' | 'document' | 'logo' | 'invoice';
  metadata?: Record<string, any>;
}

export interface FileData extends FileUploadData {
  id: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class StorageService {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private storageType: 'local' | 's3';
  private baseUrl: string;

  constructor() {
    this.storageType = (process.env.STORAGE_TYPE as 'local' | 's3') || 'local';
    this.bucketName = process.env.S3_BUCKET_NAME || '';
    this.baseUrl = process.env.API_URL || `http://localhost:${env.PORT}`;

    if (this.storageType === 's3') {
      this.initializeS3();
    }
  }

  private initializeS3() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      logger.warn('AWS credentials not configured, falling back to local storage');
      this.storageType = 'local';
      return;
    }

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  /**
   * Process and optimize images
   */
  async processImage(
    filePath: string,
    options: {
      generateThumbnail?: boolean;
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
    } = {}
  ): Promise<{ processedPath: string; thumbnailPath?: string }> {
    const {
      generateThumbnail = true,
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 85,
    } = options;

    const dir = path.dirname(filePath);
    const filename = path.basename(filePath, path.extname(filePath));
    const ext = '.webp'; // Convert all images to WebP for better compression

    // Process main image
    const processedPath = path.join(dir, `${filename}_processed${ext}`);
    await sharp(filePath)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toFile(processedPath);

    // Generate thumbnail if requested
    let thumbnailPath: string | undefined;
    if (generateThumbnail) {
      thumbnailPath = path.join(dir, `${filename}_thumb${ext}`);
      await sharp(filePath)
        .resize(200, 200, {
          fit: 'cover',
        })
        .webp({ quality: 80 })
        .toFile(thumbnailPath);
    }

    // Delete original file
    await fs.unlink(filePath);

    return { processedPath, thumbnailPath };
  }

  /**
   * Upload file to S3
   */
  async uploadToS3(
    filePath: string,
    key: string,
    mimeType: string
  ): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const fileContent = await fs.readFile(filePath);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: fileContent,
      ContentType: mimeType,
      ServerSideEncryption: 'AES256',
    });

    await this.s3Client.send(command);

    // Return S3 URL
    return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
  }

  /**
   * Get signed URL for S3 object
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Delete file from S3
   */
  async deleteFromS3(key: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Save file information to database
   */
  async saveFileRecord(data: FileUploadData): Promise<FileData> {
    const file = await prisma.file.create({
      data: {
        companyId: data.companyId,
        uploadedBy: data.userId,
        fileName: data.fileName,
        mimeType: data.mimeType,
        size: data.size,
        type: data.type,
        url: '', // Will be updated after upload
        metadata: data.metadata || {},
      },
    });

    return {
      ...file,
      userId: file.uploadedBy, // Map uploadedBy to userId for FileData interface
      url: file.url,
      thumbnailUrl: file.thumbnailUrl || undefined,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    } as FileData;
  }

  /**
   * Upload file (local or S3)
   */
  async uploadFile(
    filePath: string,
    data: FileUploadData
  ): Promise<FileData> {
    try {
      let url: string;
      let thumbnailUrl: string | undefined;
      let processedPath = filePath;

      // Process image if applicable
      if (data.mimeType.startsWith('image/') && data.type !== 'document') {
        const processed = await this.processImage(filePath);
        processedPath = processed.processedPath;
        
        if (processed.thumbnailPath) {
          if (this.storageType === 's3') {
            const thumbKey = `${data.companyId}/thumbnails/${uuidv4()}.webp`;
            thumbnailUrl = await this.uploadToS3(
              processed.thumbnailPath,
              thumbKey,
              'image/webp'
            );
            await fs.unlink(processed.thumbnailPath);
          } else {
            // For local storage, generate URL path
            const relativePath = path.relative(
              process.env.UPLOAD_DIR || './uploads',
              processed.thumbnailPath
            );
            thumbnailUrl = `${this.baseUrl}/api/v1/files/local/${relativePath}`;
          }
        }
      }

      // Upload to storage
      if (this.storageType === 's3') {
        const key = `${data.companyId}/${data.type}/${uuidv4()}${path.extname(data.fileName)}`;
        url = await this.uploadToS3(processedPath, key, data.mimeType);
        
        // Clean up local file
        await fs.unlink(processedPath);
      } else {
        // Local storage - generate URL
        const relativePath = path.relative(
          process.env.UPLOAD_DIR || './uploads',
          processedPath
        );
        url = `${this.baseUrl}/api/v1/files/local/${relativePath}`;
      }

      // Save to database
      const fileRecord = await prisma.file.create({
        data: {
          companyId: data.companyId,
          uploadedBy: data.userId,
          fileName: data.fileName,
          mimeType: data.mimeType,
          size: data.size,
          type: data.type,
          url,
          thumbnailUrl,
          metadata: data.metadata || {},
        },
      });

      return {
        id: fileRecord.id,
        companyId: fileRecord.companyId,
        userId: fileRecord.uploadedBy,
        fileName: fileRecord.fileName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        type: fileRecord.type as any,
        url: fileRecord.url,
        thumbnailUrl: fileRecord.thumbnailUrl || undefined,
        metadata: fileRecord.metadata as Record<string, any>,
        createdAt: fileRecord.createdAt,
        updatedAt: fileRecord.updatedAt,
      };
    } catch (error) {
      logger.error('Error uploading file:', error);
      
      // Clean up on error
      try {
        await fs.unlink(filePath);
      } catch {}
      
      throw error;
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string, companyId: string): Promise<FileData | null> {
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        companyId,
      },
    });

    if (!file) {
      return null;
    }

    // Generate signed URL if using S3
    let url = file.url;
    if (this.storageType === 's3' && this.s3Client) {
      const key = file.url.split('.com/')[1];
      if (key) {
        url = await this.getSignedUrl(key);
      }
    }

    return {
      id: file.id,
      companyId: file.companyId,
      userId: file.uploadedBy,
      fileName: file.fileName,
      mimeType: file.mimeType,
      size: file.size,
      type: file.type as any,
      url,
      thumbnailUrl: file.thumbnailUrl || undefined,
      metadata: file.metadata as Record<string, any>,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string, companyId: string): Promise<boolean> {
    const file = await prisma.file.findFirst({
      where: {
        id: fileId,
        companyId,
      },
    });

    if (!file) {
      return false;
    }

    // Delete from storage
    if (this.storageType === 's3' && this.s3Client) {
      const key = file.url.split('.com/')[1];
      if (key) {
        await this.deleteFromS3(key);
      }
      
      // Delete thumbnail if exists
      if (file.thumbnailUrl) {
        const thumbKey = file.thumbnailUrl.split('.com/')[1];
        if (thumbKey) {
          await this.deleteFromS3(thumbKey);
        }
      }
    } else {
      // Delete local files
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const filePath = path.join(uploadDir, file.url.split('/files/local/')[1]);
      
      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.warn(`Failed to delete local file: ${filePath}`, error);
      }
      
      // Delete thumbnail
      if (file.thumbnailUrl) {
        const thumbPath = path.join(uploadDir, file.thumbnailUrl.split('/files/local/')[1]);
        try {
          await fs.unlink(thumbPath);
        } catch (error) {
          logger.warn(`Failed to delete thumbnail: ${thumbPath}`, error);
        }
      }
    }

    // Delete from database
    await prisma.file.delete({
      where: { id: fileId },
    });

    return true;
  }

  /**
   * Get files by company
   */
  async getFilesByCompany(
    companyId: string,
    options: {
      type?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ files: FileData[]; total: number }> {
    const { type, limit = 20, offset = 0 } = options;

    const where: any = { companyId };
    if (type) {
      where.type = type;
    }

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.file.count({ where }),
    ]);

    // Generate signed URLs if needed
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        let url = file.url;
        if (this.storageType === 's3' && this.s3Client) {
          const key = file.url.split('.com/')[1];
          if (key) {
            url = await this.getSignedUrl(key);
          }
        }

        return {
          id: file.id,
          companyId: file.companyId,
          userId: file.uploadedBy,
          fileName: file.fileName,
          mimeType: file.mimeType,
          size: file.size,
          type: file.type as any,
          url,
          thumbnailUrl: file.thumbnailUrl || undefined,
          metadata: file.metadata as Record<string, any>,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
        };
      })
    );

    return { files: filesWithUrls, total };
  }

  /**
   * Get storage usage for company
   */
  async getStorageUsage(companyId: string): Promise<{
    totalSize: number;
    fileCount: number;
    byType: Record<string, { size: number; count: number }>;
  }> {
    const files = await prisma.file.findMany({
      where: { companyId },
      select: { size: true, type: true },
    });

    const byType: Record<string, { size: number; count: number }> = {};
    let totalSize = 0;

    for (const file of files) {
      totalSize += file.size;
      
      if (!byType[file.type]) {
        byType[file.type] = { size: 0, count: 0 };
      }
      
      byType[file.type].size += file.size;
      byType[file.type].count += 1;
    }

    return {
      totalSize,
      fileCount: files.length,
      byType,
    };
  }
}

export const storageService = new StorageService();