import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { saleController } from '../controllers/sale.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Sales
 *   description: Sales and POS management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SaleItem:
 *       type: object
 *       required:
 *         - type
 *         - name
 *         - unitPrice
 *         - quantity
 *       properties:
 *         type:
 *           type: string
 *           enum: [PRODUCT, SERVICE, CUSTOM]
 *         productId:
 *           type: string
 *         serviceId:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         unitPrice:
 *           type: number
 *           minimum: 0
 *         quantity:
 *           type: number
 *           minimum: 0.001
 *         discount:
 *           type: number
 *           minimum: 0
 *         taxRate:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *     CreateSale:
 *       type: object
 *       required:
 *         - branchId
 *         - items
 *         - paymentMethod
 *         - amountPaid
 *       properties:
 *         branchId:
 *           type: string
 *         staffId:
 *           type: string
 *         clientId:
 *           type: string
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SaleItem'
 *         discountType:
 *           type: string
 *           enum: [PERCENTAGE, FIXED]
 *         discountValue:
 *           type: number
 *           minimum: 0
 *         paymentMethod:
 *           type: string
 *           enum: [CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PAYPAL, STRIPE, SQUARE, OTHER]
 *         amountPaid:
 *           type: number
 *           minimum: 0
 *         notes:
 *           type: string
 *         internalNotes:
 *           type: string
 */

// Validation middleware
const createSaleValidation = [
  body('branchId').notEmpty().withMessage('Branch ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.type').isIn(['PRODUCT', 'SERVICE', 'CUSTOM']).withMessage('Invalid item type'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
  body('items.*.quantity').isFloat({ min: 0.001 }).withMessage('Quantity must be greater than 0'),
  body('items.*.discount').optional().isFloat({ min: 0 }).withMessage('Discount must be non-negative'),
  body('items.*.taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100'),
  body('discountValue').optional().isFloat({ min: 0 }).withMessage('Discount value must be non-negative'),
  body('paymentMethod').isIn(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'SQUARE', 'OTHER']).withMessage('Invalid payment method'),
  body('amountPaid').isFloat({ min: 0 }).withMessage('Amount paid must be non-negative'),
];

const refundValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Refund amount must be greater than 0'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  body('refundMethod').optional().isIn(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'SQUARE', 'OTHER']).withMessage('Invalid refund method'),
];

const discountValidation = [
  body('saleId').notEmpty().withMessage('Sale ID is required'),
  body('discountType').isIn(['PERCENTAGE', 'FIXED']).withMessage('Invalid discount type'),
  body('discountValue').isFloat({ min: 0 }).withMessage('Discount value must be non-negative'),
];

/**
 * @swagger
 * /sales:
 *   post:
 *     summary: Create a new sale transaction
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSale'
 *     responses:
 *       201:
 *         description: Sale created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/', createSaleValidation, saleController.createSale.bind(saleController));

/**
 * @swagger
 * /sales:
 *   get:
 *     summary: Get all sales with filtering and pagination
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in sale number, receipt number, client, or staff name
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: staffId
 *         schema:
 *           type: string
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PAYPAL, STRIPE, SQUARE, OTHER]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, COMPLETED, CANCELLED, REFUNDED, PARTIALLY_REFUNDED]
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', saleController.getSales.bind(saleController));

/**
 * @swagger
 * /sales/daily-summary:
 *   get:
 *     summary: Get daily sales summary
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Daily summary retrieved successfully
 */
router.get('/daily-summary', saleController.getDailySummary.bind(saleController));

/**
 * @swagger
 * /sales/discount:
 *   post:
 *     summary: Apply discount to a sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Discount applied successfully
 */
router.post('/discount', discountValidation, saleController.applyDiscount.bind(saleController));

/**
 * @swagger
 * /sales/{id}:
 *   get:
 *     summary: Get sale by ID
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sale retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sale not found
 */
router.get('/:id', param('id').notEmpty(), saleController.getSaleById.bind(saleController));

/**
 * @swagger
 * /sales/{id}/refund:
 *   post:
 *     summary: Process a refund for a sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               reason:
 *                 type: string
 *               refundItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     itemId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     amount:
 *                       type: number
 *               refundMethod:
 *                 type: string
 *                 enum: [CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PAYPAL, STRIPE, SQUARE, OTHER]
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *       400:
 *         description: Invalid refund data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sale not found
 */
router.post('/:id/refund', param('id').notEmpty(), ...refundValidation, saleController.processRefund.bind(saleController));

/**
 * @swagger
 * /sales/{id}/receipt:
 *   post:
 *     summary: Generate receipt for a sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, pdf]
 *           default: json
 *       - in: query
 *         name: template
 *         schema:
 *           type: string
 *           enum: [standard, thermal, modern]
 *           default: standard
 *     responses:
 *       200:
 *         description: Receipt generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sale not found
 */
router.post('/:id/receipt', param('id').notEmpty(), saleController.generateReceipt.bind(saleController));

export default router;