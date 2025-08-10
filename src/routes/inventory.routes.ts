import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { inventoryController } from '../controllers/inventory.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { InventoryMovementType } from '@prisma/client';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryLevel:
 *       type: object
 *       properties:
 *         productId:
 *           type: string
 *         productName:
 *           type: string
 *         productSku:
 *           type: string
 *         branchId:
 *           type: string
 *         branchName:
 *           type: string
 *         quantity:
 *           type: integer
 *         reservedQuantity:
 *           type: integer
 *         availableQuantity:
 *           type: integer
 *         lowStockThreshold:
 *           type: integer
 *         isLowStock:
 *           type: boolean
 *         isOutOfStock:
 *           type: boolean
 *         lastRestocked:
 *           type: string
 *           format: date-time
 *         lastCountDate:
 *           type: string
 *           format: date-time
 *     
 *     StockAdjustment:
 *       type: object
 *       required:
 *         - productId
 *         - branchId
 *         - newQuantity
 *         - reason
 *       properties:
 *         productId:
 *           type: string
 *         branchId:
 *           type: string
 *         newQuantity:
 *           type: integer
 *           minimum: 0
 *         reason:
 *           type: string
 *           minLength: 1
 *           maxLength: 500
 *         notes:
 *           type: string
 *           maxLength: 1000
 *     
 *     StockTransfer:
 *       type: object
 *       required:
 *         - productId
 *         - fromBranchId
 *         - toBranchId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *         fromBranchId:
 *           type: string
 *         toBranchId:
 *           type: string
 *         quantity:
 *           type: integer
 *           minimum: 1
 *         notes:
 *           type: string
 *           maxLength: 1000
 *     
 *     StockOperation:
 *       type: object
 *       required:
 *         - productId
 *         - branchId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *         branchId:
 *           type: string
 *         quantity:
 *           type: integer
 *           minimum: 1
 *         unitCost:
 *           type: number
 *           minimum: 0
 *         reference:
 *           type: string
 *           maxLength: 100
 *         notes:
 *           type: string
 *           maxLength: 1000
 *     
 *     StockReservation:
 *       type: object
 *       required:
 *         - productId
 *         - branchId
 *         - quantity
 *       properties:
 *         productId:
 *           type: string
 *         branchId:
 *           type: string
 *         quantity:
 *           type: integer
 *           minimum: 1
 *         reference:
 *           type: string
 *           maxLength: 100
 *     
 *     InventoryMovement:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         productId:
 *           type: string
 *         branchId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [IN, OUT, TRANSFER, ADJUSTMENT]
 *         quantity:
 *           type: integer
 *         reference:
 *           type: string
 *         referenceType:
 *           type: string
 *         notes:
 *           type: string
 *         unitCost:
 *           type: number
 *         performedBy:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         product:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             sku:
 *               type: string
 *         branch:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 */

// ==================== Inventory Levels ====================

/**
 * @swagger
 * /inventory/levels:
 *   get:
 *     summary: Get inventory levels
 *     description: Get inventory levels with optional filtering by branch or low stock only
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by specific branch
 *       - in: query
 *         name: lowStockOnly
 *         schema:
 *           type: boolean
 *         description: Show only low stock items
 *     responses:
 *       200:
 *         description: Inventory levels retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryLevel'
 *                 message:
 *                   type: string
 */
router.get('/levels', 
  [
    query('branchId').optional().isString().isLength({ min: 1 }),
    query('lowStockOnly').optional().isBoolean(),
  ],
  inventoryController.getInventoryLevels
);

/**
 * @swagger
 * /inventory/product/{productId}:
 *   get:
 *     summary: Get product inventory across all branches
 *     description: Get inventory levels for a specific product across all branches
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product inventory retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryLevel'
 *                 message:
 *                   type: string
 */
router.get('/product/:productId',
  [
    param('productId').isString().isLength({ min: 1 }),
  ],
  inventoryController.getProductInventory
);

/**
 * @swagger
 * /inventory/availability/{productId}/{branchId}:
 *   get:
 *     summary: Check product availability
 *     description: Check if a specific quantity of product is available in a branch
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch ID
 *       - in: query
 *         name: quantity
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Requested quantity
 *     responses:
 *       200:
 *         description: Availability checked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     available:
 *                       type: boolean
 *                     currentStock:
 *                       type: integer
 *                     reservedQuantity:
 *                       type: integer
 *                     availableQuantity:
 *                       type: integer
 *                     message:
 *                       type: string
 *                 message:
 *                   type: string
 */
router.get('/availability/:productId/:branchId',
  [
    param('productId').isString().isLength({ min: 1 }),
    param('branchId').isString().isLength({ min: 1 }),
    query('quantity').isInt({ min: 1 }),
  ],
  inventoryController.checkAvailability
);

// ==================== Stock Adjustments ====================

/**
 * @swagger
 * /inventory/adjust:
 *   post:
 *     summary: Adjust stock levels
 *     description: Manually adjust stock levels for a product in a branch
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StockAdjustment'
 *     responses:
 *       201:
 *         description: Stock adjusted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/InventoryMovement'
 *                 message:
 *                   type: string
 */
router.post('/adjust',
  [
    body('productId').isString().isLength({ min: 1 }),
    body('branchId').isString().isLength({ min: 1 }),
    body('newQuantity').isInt({ min: 0 }),
    body('reason').isString().isLength({ min: 1, max: 500 }),
    body('notes').optional().isString().isLength({ max: 1000 }),
  ],
  inventoryController.adjustStock
);

/**
 * @swagger
 * /inventory/transfer:
 *   post:
 *     summary: Transfer stock between branches
 *     description: Transfer stock from one branch to another
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StockTransfer'
 *     responses:
 *       201:
 *         description: Stock transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     outMovement:
 *                       $ref: '#/components/schemas/InventoryMovement'
 *                     inMovement:
 *                       $ref: '#/components/schemas/InventoryMovement'
 *                 message:
 *                   type: string
 */
router.post('/transfer',
  [
    body('productId').isString().isLength({ min: 1 }),
    body('fromBranchId').isString().isLength({ min: 1 }),
    body('toBranchId').isString().isLength({ min: 1 }),
    body('quantity').isInt({ min: 1 }),
    body('notes').optional().isString().isLength({ max: 1000 }),
  ],
  inventoryController.transferStock
);

// ==================== Stock Operations ====================

/**
 * @swagger
 * /inventory/add:
 *   post:
 *     summary: Add stock (receive inventory)
 *     description: Add stock to inventory (purchase, return, etc.)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StockOperation'
 *     responses:
 *       201:
 *         description: Stock added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/InventoryMovement'
 *                 message:
 *                   type: string
 */
router.post('/add',
  [
    body('productId').isString().isLength({ min: 1 }),
    body('branchId').isString().isLength({ min: 1 }),
    body('quantity').isInt({ min: 1 }),
    body('unitCost').optional().isFloat({ min: 0 }),
    body('reference').optional().isString().isLength({ max: 100 }),
    body('notes').optional().isString().isLength({ max: 1000 }),
  ],
  inventoryController.addStock
);

/**
 * @swagger
 * /inventory/remove:
 *   post:
 *     summary: Remove stock (consume/sell inventory)
 *     description: Remove stock from inventory (sale, damage, theft, etc.)
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/StockOperation'
 *               - type: object
 *                 properties:
 *                   unitCost:
 *                     not: true
 *     responses:
 *       201:
 *         description: Stock removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/InventoryMovement'
 *                 message:
 *                   type: string
 */
router.post('/remove',
  [
    body('productId').isString().isLength({ min: 1 }),
    body('branchId').isString().isLength({ min: 1 }),
    body('quantity').isInt({ min: 1 }),
    body('reference').optional().isString().isLength({ max: 100 }),
    body('notes').optional().isString().isLength({ max: 1000 }),
  ],
  inventoryController.removeStock
);

// ==================== Stock Movements & History ====================

/**
 * @swagger
 * /inventory/movements:
 *   get:
 *     summary: Get stock movements
 *     description: Get stock movements with filtering and pagination
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *         description: Filter by product
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by branch
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [IN, OUT, TRANSFER, ADJUSTMENT]
 *         description: Filter by movement type
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for filtering
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for filtering
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Stock movements retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryMovement'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                 message:
 *                   type: string
 */
router.get('/movements',
  [
    query('productId').optional().isString(),
    query('branchId').optional().isString(),
    query('type').optional().isIn(Object.values(InventoryMovementType)),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  inventoryController.getMovements
);

// ==================== Stock Reservations ====================

/**
 * @swagger
 * /inventory/reserve:
 *   post:
 *     summary: Reserve stock
 *     description: Reserve stock for orders/appointments
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StockReservation'
 *     responses:
 *       200:
 *         description: Stock reserved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/reserve',
  [
    body('productId').isString().isLength({ min: 1 }),
    body('branchId').isString().isLength({ min: 1 }),
    body('quantity').isInt({ min: 1 }),
    body('reference').optional().isString().isLength({ max: 100 }),
  ],
  inventoryController.reserveStock
);

/**
 * @swagger
 * /inventory/release:
 *   post:
 *     summary: Release stock reservation
 *     description: Release previously reserved stock
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - branchId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               branchId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Stock reservation released successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/release',
  [
    body('productId').isString().isLength({ min: 1 }),
    body('branchId').isString().isLength({ min: 1 }),
    body('quantity').isInt({ min: 1 }),
  ],
  inventoryController.releaseReservation
);

// ==================== Alerts & Reports ====================

/**
 * @swagger
 * /inventory/alerts/low-stock:
 *   get:
 *     summary: Get low stock alerts
 *     description: Get list of products with low stock levels
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by specific branch
 *     responses:
 *       200:
 *         description: Low stock alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/InventoryLevel'
 *                 message:
 *                   type: string
 */
router.get('/alerts/low-stock',
  [
    query('branchId').optional().isString(),
  ],
  inventoryController.getLowStockAlerts
);

/**
 * @swagger
 * /inventory/valuation:
 *   get:
 *     summary: Get inventory valuation
 *     description: Get total inventory value and statistics
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by specific branch
 *     responses:
 *       200:
 *         description: Inventory valuation calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalValue:
 *                       type: number
 *                     totalQuantity:
 *                       type: integer
 *                     averageCostPerUnit:
 *                       type: number
 *                     itemsCount:
 *                       type: integer
 *                 message:
 *                   type: string
 */
router.get('/valuation',
  [
    query('branchId').optional().isString(),
  ],
  inventoryController.getInventoryValuation
);

export default router;