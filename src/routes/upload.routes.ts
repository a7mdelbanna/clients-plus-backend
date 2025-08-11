import { Router } from 'express';
import { uploadController } from '../controllers/upload.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { uploadSingle, uploadMultiple, checkFileSize } from '../middleware/upload.middleware';
import { param, body } from 'express-validator';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: File upload management endpoints
 */

/**
 * @swagger
 * /upload/{type}:
 *   post:
 *     summary: Upload a single file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [avatar, service, document, logo, invoice]
 *         description: Type of file being uploaded
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               metadata:
 *                 type: string
 *                 description: JSON string of additional metadata
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file or parameters
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/:type',
  authenticateToken,
  param('type').isIn(['avatar', 'service', 'document', 'logo', 'invoice']),
  uploadSingle('file'),
  checkFileSize,
  uploadController.uploadFile.bind(uploadController)
);

/**
 * @swagger
 * /upload/{type}/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [service, document]
 *         description: Type of files being uploaded
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               metadata:
 *                 type: string
 *                 description: JSON string of additional metadata
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *       400:
 *         description: Invalid files or parameters
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/:type/multiple',
  authenticateToken,
  param('type').isIn(['service', 'document']),
  uploadMultiple('files', 10),
  checkFileSize,
  uploadController.uploadMultipleFiles.bind(uploadController)
);

/**
 * @swagger
 * /upload/avatar:
 *   post:
 *     summary: Upload an avatar image
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               entityType:
 *                 type: string
 *                 enum: [user, staff, client]
 *                 description: Type of entity the avatar is for
 *               entityId:
 *                 type: string
 *                 description: ID of the entity
 *     responses:
 *       201:
 *         description: Avatar uploaded successfully
 *       400:
 *         description: Invalid file
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/avatar',
  authenticateToken,
  uploadSingle('file'),
  checkFileSize,
  uploadController.uploadAvatar.bind(uploadController)
);

/**
 * @swagger
 * /upload/service-images:
 *   post:
 *     summary: Upload service images
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *               - serviceId
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               serviceId:
 *                 type: string
 *                 description: ID of the service
 *     responses:
 *       201:
 *         description: Service images uploaded successfully
 *       400:
 *         description: Invalid files or missing service ID
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/service-images',
  authenticateToken,
  uploadMultiple('files', 10),
  checkFileSize,
  uploadController.uploadServiceImages.bind(uploadController)
);

/**
 * @swagger
 * /upload/company-logo:
 *   post:
 *     summary: Upload company logo
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               branchId:
 *                 type: string
 *                 description: Optional branch ID
 *     responses:
 *       201:
 *         description: Logo uploaded successfully
 *       400:
 *         description: Invalid file
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/company-logo',
  authenticateToken,
  uploadSingle('file'),
  checkFileSize,
  uploadController.uploadCompanyLogo.bind(uploadController)
);

/**
 * @swagger
 * /files/{fileId}:
 *   get:
 *     summary: Get file information
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File information retrieved
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/files/:fileId',
  authenticateToken,
  param('fileId').notEmpty(),
  uploadController.getFile.bind(uploadController)
);

/**
 * @swagger
 * /files/{fileId}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.delete(
  '/files/:fileId',
  authenticateToken,
  param('fileId').notEmpty(),
  uploadController.deleteFile.bind(uploadController)
);

/**
 * @swagger
 * /files:
 *   get:
 *     summary: Get company files
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [avatar, service, document, logo, invoice]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Files retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/files',
  authenticateToken,
  uploadController.getCompanyFiles.bind(uploadController)
);

/**
 * @swagger
 * /storage/usage:
 *   get:
 *     summary: Get storage usage statistics
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage usage retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/storage/usage',
  authenticateToken,
  uploadController.getStorageUsage.bind(uploadController)
);

// Serve local files (no auth for public files with proper URLs)
router.get(
  '/files/local/*',
  uploadController.serveLocalFile.bind(uploadController)
);

export default router;