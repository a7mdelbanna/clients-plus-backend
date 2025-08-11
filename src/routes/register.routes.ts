import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { registerController } from '../controllers/register.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Cash Register
 *   description: Cash register management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     OpenRegister:
 *       type: object
 *       required:
 *         - branchId
 *         - accountId
 *         - openingBalance
 *       properties:
 *         branchId:
 *           type: string
 *         accountId:
 *           type: string
 *         openingBalance:
 *           type: number
 *           minimum: 0
 *         date:
 *           type: string
 *           format: date
 *     CloseRegister:
 *       type: object
 *       required:
 *         - actualCashAmount
 *       properties:
 *         expectedCashAmount:
 *           type: number
 *         actualCashAmount:
 *           type: number
 *           minimum: 0
 *         notes:
 *           type: string
 *     CashDrop:
 *       type: object
 *       required:
 *         - amount
 *         - reason
 *       properties:
 *         amount:
 *           type: number
 *           minimum: 0.01
 *         reason:
 *           type: string
 *         notes:
 *           type: string
 *     Adjustment:
 *       type: object
 *       required:
 *         - amount
 *         - type
 *         - reason
 *       properties:
 *         amount:
 *           type: number
 *           minimum: 0.01
 *         type:
 *           type: string
 *           enum: [IN, OUT]
 *         reason:
 *           type: string
 *         notes:
 *           type: string
 */

// Validation middleware
const openRegisterValidation = [
  body('branchId').notEmpty().withMessage('Branch ID is required'),
  body('accountId').notEmpty().withMessage('Account ID is required'),
  body('openingBalance').isFloat({ min: 0 }).withMessage('Opening balance must be non-negative'),
  body('date').optional().isISO8601().withMessage('Date must be valid ISO date'),
];

const closeRegisterValidation = [
  param('id').notEmpty().withMessage('Register ID is required'),
  body('actualCashAmount').isFloat({ min: 0 }).withMessage('Actual cash amount must be non-negative'),
  body('expectedCashAmount').optional().isFloat({ min: 0 }).withMessage('Expected cash amount must be non-negative'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
];

const cashDropValidation = [
  param('id').notEmpty().withMessage('Register ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('reason').notEmpty().withMessage('Reason is required'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
];

const adjustmentValidation = [
  param('id').notEmpty().withMessage('Register ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('type').isIn(['IN', 'OUT']).withMessage('Type must be IN or OUT'),
  body('reason').notEmpty().withMessage('Reason is required'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
];

/**
 * @swagger
 * /register/open:
 *   post:
 *     summary: Open daily register
 *     tags: [Cash Register]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OpenRegister'
 *     responses:
 *       201:
 *         description: Register opened successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Register already open for this date
 */
router.post('/open', openRegisterValidation, registerController.openRegister.bind(registerController));

/**
 * @swagger
 * /register/{id}/close:
 *   post:
 *     summary: Close and reconcile register
 *     tags: [Cash Register]
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
 *             $ref: '#/components/schemas/CloseRegister'
 *     responses:
 *       200:
 *         description: Register closed successfully
 *       400:
 *         description: Invalid input data or register cannot be closed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Register not found
 */
router.post('/:id/close', closeRegisterValidation, registerController.closeRegister.bind(registerController));

/**
 * @swagger
 * /register/current:
 *   get:
 *     summary: Get current register shift
 *     tags: [Cash Register]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         required: true
 *         schema:
 *           type: string
 *         description: Branch ID to get current shift for
 *     responses:
 *       200:
 *         description: Current shift retrieved successfully
 *       400:
 *         description: Branch ID is required
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active register shift found
 */
router.get('/current', registerController.getCurrentShift.bind(registerController));

/**
 * @swagger
 * /register/{id}/cash-drop:
 *   post:
 *     summary: Record cash drop
 *     tags: [Cash Register]
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
 *             $ref: '#/components/schemas/CashDrop'
 *     responses:
 *       200:
 *         description: Cash drop recorded successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Register not found
 */
router.post('/:id/cash-drop', cashDropValidation, registerController.recordCashDrop.bind(registerController));

/**
 * @swagger
 * /register/{id}/adjustment:
 *   post:
 *     summary: Record cash adjustment
 *     tags: [Cash Register]
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
 *             $ref: '#/components/schemas/Adjustment'
 *     responses:
 *       200:
 *         description: Adjustment recorded successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Register not found
 */
router.post('/:id/adjustment', adjustmentValidation, registerController.recordAdjustment.bind(registerController));

/**
 * @swagger
 * /register/history:
 *   get:
 *     summary: Get register history
 *     tags: [Cash Register]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by branch
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for history
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for history
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
 *     responses:
 *       200:
 *         description: Register history retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       date:
 *                         type: string
 *                         format: date
 *                       openingBalance:
 *                         type: number
 *                       closingBalance:
 *                         type: number
 *                       salesAmount:
 *                         type: number
 *                       cashVariance:
 *                         type: number
 *                       status:
 *                         type: string
 *                       branch:
 *                         type: object
 *                       account:
 *                         type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/history', registerController.getRegisterHistory.bind(registerController));

/**
 * @swagger
 * /register/{id}/summary:
 *   get:
 *     summary: Get detailed register summary
 *     tags: [Cash Register]
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
 *         description: Register summary retrieved successfully
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
 *                     register:
 *                       type: object
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalSales:
 *                           type: number
 *                         totalTransactions:
 *                           type: integer
 *                         totalRefunds:
 *                           type: number
 *                         refundTransactions:
 *                           type: integer
 *                         netSales:
 *                           type: number
 *                         averageTransaction:
 *                           type: number
 *                         paymentMethods:
 *                           type: object
 *                     topItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           quantity:
 *                             type: number
 *                           amount:
 *                             type: number
 *                           count:
 *                             type: integer
 *                     cashFlow:
 *                       type: object
 *                       properties:
 *                         openingBalance:
 *                           type: number
 *                         cashSales:
 *                           type: number
 *                         cashIn:
 *                           type: number
 *                         cashOut:
 *                           type: number
 *                         expectedClosing:
 *                           type: number
 *                         actualClosing:
 *                           type: number
 *                         variance:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Register not found
 */
router.get('/:id/summary', param('id').notEmpty(), registerController.getRegisterSummary.bind(registerController));

/**
 * @swagger
 * /register/{id}/reconcile:
 *   post:
 *     summary: Reconcile register
 *     tags: [Cash Register]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes:
 *                 type: string
 *                 description: Reconciliation notes
 *     responses:
 *       200:
 *         description: Register reconciled successfully
 *       400:
 *         description: Register cannot be reconciled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Register not found
 */
router.post('/:id/reconcile', 
  param('id').notEmpty(),
  body('notes').optional().isString().withMessage('Notes must be a string'),
  registerController.reconcileRegister.bind(registerController)
);

export default router;