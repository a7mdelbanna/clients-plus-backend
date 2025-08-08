import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { clientController } from '../controllers/client.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { ClientStatus, Gender } from '@prisma/client';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     ClientPhone:
 *       type: object
 *       properties:
 *         number:
 *           type: string
 *         type:
 *           type: string
 *           enum: [mobile, home, work]
 *         isPrimary:
 *           type: boolean
 *         isVerified:
 *           type: boolean
 *         canReceiveSMS:
 *           type: boolean
 *         notes:
 *           type: string
 *     ClientEmail:
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *           format: email
 *         type:
 *           type: string
 *           enum: [personal, work]
 *         isPrimary:
 *           type: boolean
 *         isVerified:
 *           type: boolean
 *         canReceiveEmails:
 *           type: boolean
 *         bounced:
 *           type: boolean
 *     ClientAddress:
 *       type: object
 *       properties:
 *         street:
 *           type: string
 *         city:
 *           type: string
 *         state:
 *           type: string
 *         zipCode:
 *           type: string
 *         country:
 *           type: string
 *         notes:
 *           type: string
 *     Client:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         phone:
 *           type: string
 *         dateOfBirth:
 *           type: string
 *           format: date
 *         gender:
 *           type: string
 *           enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED, ARCHIVED]
 *         phones:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ClientPhone'
 *         emails:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ClientEmail'
 *         address:
 *           $ref: '#/components/schemas/ClientAddress'
 *         notes:
 *           type: string
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * tags:
 *   name: Clients
 *   description: Client management endpoints
 */

/**
 * @swagger
 * /clients:
 *   get:
 *     summary: Get clients with filtering and pagination
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for client name, email, or phone
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED, ARCHIVED, all]
 *         description: Client status filter
 *       - in: query
 *         name: gender
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *             enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
 *         description: Gender filter
 *       - in: query
 *         name: tags
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Tags filter
 *       - in: query
 *         name: quickFilter
 *         schema:
 *           type: string
 *           enum: [all, new_this_month, vip, birthday_this_month, with_balance, inactive, recent_visits]
 *         description: Quick filter presets
 *       - in: query
 *         name: minAge
 *         schema:
 *           type: integer
 *         description: Minimum age filter
 *       - in: query
 *         name: maxAge
 *         schema:
 *           type: integer
 *         description: Maximum age filter
 *       - in: query
 *         name: birthdayMonth
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Filter by birthday month (1-12)
 *       - in: query
 *         name: upcomingBirthdays
 *         schema:
 *           type: integer
 *         description: Filter by upcoming birthdays within X days
 *       - in: query
 *         name: acceptsSMS
 *         schema:
 *           type: boolean
 *         description: Filter by SMS acceptance
 *       - in: query
 *         name: acceptsEmail
 *         schema:
 *           type: boolean
 *         description: Filter by email acceptance
 *       - in: query
 *         name: hasValidEmail
 *         schema:
 *           type: boolean
 *         description: Filter by valid email presence
 *       - in: query
 *         name: hasValidPhone
 *         schema:
 *           type: boolean
 *         description: Filter by valid phone presence
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Branch ID filter
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, createdAt, updatedAt, totalRevenue, lastVisit, totalVisits, balance]
 *         description: Sort field
 *       - in: query
 *         name: sortDirection
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: Clients retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Client'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/', clientController.getClients.bind(clientController));

/**
 * @swagger
 * /clients/all:
 *   get:
 *     summary: Get all clients (for dropdown/autocomplete)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All clients retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/all', clientController.getAllClients.bind(clientController));

/**
 * @swagger
 * /clients/suggestions:
 *   get:
 *     summary: Get client suggestions for autocomplete
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *     responses:
 *       200:
 *         description: Client suggestions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/suggestions', clientController.getClientSuggestions.bind(clientController));

/**
 * @swagger
 * /clients/stats:
 *   get:
 *     summary: Get client statistics
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Branch ID for filtering stats
 *     responses:
 *       200:
 *         description: Client statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', clientController.getClientStats.bind(clientController));

/**
 * @swagger
 * /clients/search:
 *   get:
 *     summary: Search clients
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, SUSPENDED, ARCHIVED, all]
 *         description: Client status filter
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Branch ID filter
 *     responses:
 *       200:
 *         description: Client search completed successfully
 *       400:
 *         description: Missing search term
 *       401:
 *         description: Unauthorized
 */
router.get('/search', clientController.searchClients.bind(clientController));

/**
 * @swagger
 * /clients/check-duplicates:
 *   post:
 *     summary: Check for duplicate clients
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Duplicate check completed
 *       401:
 *         description: Unauthorized
 */
router.post('/check-duplicates', clientController.checkDuplicates.bind(clientController));

/**
 * @swagger
 * /clients/bulk-update:
 *   post:
 *     summary: Bulk update multiple clients
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientIds
 *               - updates
 *             properties:
 *               clientIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               updates:
 *                 type: object
 *     responses:
 *       200:
 *         description: Bulk update completed
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/bulk-update', 
  [
    body('clientIds').isArray({ min: 1 }).withMessage('Client IDs array is required'),
    body('updates').isObject().withMessage('Updates object is required'),
  ],
  clientController.bulkUpdateClients.bind(clientController)
);

/**
 * @swagger
 * /clients/health:
 *   get:
 *     summary: Client service health check
 *     tags: [Clients]
 *     responses:
 *       200:
 *         description: Service is healthy
 */
router.get('/health', clientController.healthCheck.bind(clientController));

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Create a new client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, SUSPENDED, ARCHIVED]
 *                 default: ACTIVE
 *               phones:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ClientPhone'
 *               emails:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ClientEmail'
 *               address:
 *                 $ref: '#/components/schemas/ClientAddress'
 *               notes:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               checkDuplicates:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to check for duplicates before creating
 *     responses:
 *       201:
 *         description: Client created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Duplicate client detected
 */
router.post('/',
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').optional().isString(),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString(),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date is required'),
    body('gender').optional().isIn(Object.values(Gender)),
    body('status').optional().isIn(Object.values(ClientStatus)),
  ],
  clientController.createClient.bind(clientController)
);

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Get client by ID
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     client:
 *                       $ref: '#/components/schemas/Client'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Client not found
 */
router.get('/:id',
  [
    param('id').notEmpty().withMessage('Client ID is required'),
  ],
  clientController.getClient.bind(clientController)
);

/**
 * @swagger
 * /clients/{id}:
 *   put:
 *     summary: Update client
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: [MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE, SUSPENDED, ARCHIVED]
 *               phones:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ClientPhone'
 *               emails:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/ClientEmail'
 *               address:
 *                 $ref: '#/components/schemas/ClientAddress'
 *               notes:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               checkDuplicates:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to check for duplicates before updating
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Client not found
 *       409:
 *         description: Update would create duplicate client
 */
router.put('/:id',
  [
    param('id').notEmpty().withMessage('Client ID is required'),
    body('firstName').optional().isString(),
    body('lastName').optional().isString(),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone').optional().isString(),
    body('dateOfBirth').optional().isISO8601().withMessage('Valid date is required'),
    body('gender').optional().isIn(Object.values(Gender)),
    body('status').optional().isIn(Object.values(ClientStatus)),
  ],
  clientController.updateClient.bind(clientController)
);

/**
 * @swagger
 * /clients/{id}:
 *   delete:
 *     summary: Delete client (soft delete)
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Client not found
 */
router.delete('/:id',
  [
    param('id').notEmpty().withMessage('Client ID is required'),
  ],
  clientController.deleteClient.bind(clientController)
);

/**
 * @swagger
 * /clients/{id}/update-stats:
 *   post:
 *     summary: Update client statistics
 *     tags: [Clients]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client statistics updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Client not found
 */
router.post('/:id/update-stats',
  [
    param('id').notEmpty().withMessage('Client ID is required'),
  ],
  clientController.updateClientStats.bind(clientController)
);

export default router;