import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { invoiceController } from '../controllers/invoice.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateTenant } from '../middleware/tenant.middleware';

const router = Router();

// Apply authentication and tenant validation to all routes
router.use(authenticateToken);
router.use(validateTenant);

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Invoice management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     InvoiceItem:
 *       type: object
 *       required:
 *         - type
 *         - description
 *         - quantity
 *         - unitPrice
 *       properties:
 *         type:
 *           type: string
 *           enum: [SERVICE, PRODUCT, CUSTOM]
 *         itemId:
 *           type: string
 *         description:
 *           type: string
 *         quantity:
 *           type: number
 *           minimum: 0.001
 *         unitPrice:
 *           type: number
 *           minimum: 0
 *         discount:
 *           type: number
 *           minimum: 0
 *         taxRate:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *     CreateInvoice:
 *       type: object
 *       required:
 *         - branchId
 *         - clientId
 *         - dueDate
 *         - items
 *       properties:
 *         branchId:
 *           type: string
 *         clientId:
 *           type: string
 *         appointmentId:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date
 *         currency:
 *           type: string
 *           default: EGP
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/InvoiceItem'
 *         notes:
 *           type: string
 *         internalNotes:
 *           type: string
 *         terms:
 *           type: string
 *         termsConditions:
 *           type: string
 *         discountType:
 *           type: string
 *           enum: [PERCENTAGE, FIXED]
 *         discountValue:
 *           type: number
 *           minimum: 0
 *         taxRate:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 */

// Validation middleware
const createInvoiceValidation = [
  body('branchId').notEmpty().withMessage('Branch ID is required'),
  body('clientId').notEmpty().withMessage('Client ID is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.type').isIn(['SERVICE', 'PRODUCT', 'CUSTOM']).withMessage('Invalid item type'),
  body('items.*.description').notEmpty().withMessage('Item description is required'),
  body('items.*.quantity').isFloat({ min: 0.001 }).withMessage('Quantity must be greater than 0'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative'),
  body('discountValue').optional().isFloat({ min: 0 }).withMessage('Discount value must be non-negative'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100')
];

const updateInvoiceValidation = [
  param('id').notEmpty().withMessage('Invoice ID is required'),
  body('dueDate').optional().isISO8601().withMessage('Valid due date is required'),
  body('items').optional().isArray({ min: 1 }).withMessage('At least one item is required if provided'),
  body('discountValue').optional().isFloat({ min: 0 }).withMessage('Discount value must be non-negative'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0 and 100')
];

const paymentValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('paymentMethod').isIn(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER', 'PAYPAL', 'STRIPE', 'SQUARE', 'OTHER']).withMessage('Invalid payment method')
];

/**
 * @swagger
 * /invoices/summary:
 *   get:
 *     summary: Get invoice summary and statistics
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Invoice summary retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/summary', invoiceController.getInvoiceSummary);

/**
 * @swagger
 * /invoices/outstanding:
 *   get:
 *     summary: Get outstanding invoices (unpaid)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Outstanding invoices retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/outstanding', invoiceController.getOutstandingInvoices);

/**
 * @swagger
 * /invoices/overdue:
 *   get:
 *     summary: Get overdue invoices
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Overdue invoices retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/overdue', invoiceController.getOverdueInvoices);

/**
 * @swagger
 * /invoices/analytics:
 *   get:
 *     summary: Get invoice analytics and reporting data
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
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
 *         description: Invoice analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/analytics', invoiceController.getInvoiceAnalytics);

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: Get all invoices with filtering and pagination
 *     tags: [Invoices]
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
 *         name: branchId
 *         schema:
 *           type: string
 *         description: Filter by branch ID
 *       - in: query
 *         name: clientId
 *         schema:
 *           type: string
 *         description: Filter by client ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, SENT, VIEWED, PAID, PARTIAL, OVERDUE, CANCELLED, REFUNDED]
 *         description: Filter by invoice status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, PARTIAL, PAID, OVERDUE, CANCELLED, REFUNDED]
 *         description: Filter by payment status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in invoice number and client details
 *     responses:
 *       200:
 *         description: Invoices retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', invoiceController.getInvoices);

/**
 * @swagger
 * /invoices:
 *   post:
 *     summary: Create a new invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInvoice'
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/', createInvoiceValidation, invoiceController.createInvoice);

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.get('/:id', param('id').notEmpty(), invoiceController.getInvoiceById);

/**
 * @swagger
 * /invoices/{id}:
 *   put:
 *     summary: Update invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dueDate:
 *                 type: string
 *                 format: date
 *               items:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/InvoiceItem'
 *               notes:
 *                 type: string
 *               internalNotes:
 *                 type: string
 *               terms:
 *                 type: string
 *               termsConditions:
 *                 type: string
 *               discountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED]
 *               discountValue:
 *                 type: number
 *               taxRate:
 *                 type: number
 *               status:
 *                 type: string
 *                 enum: [DRAFT, SENT, VIEWED, PAID, PARTIAL, OVERDUE, CANCELLED, REFUNDED]
 *     responses:
 *       200:
 *         description: Invoice updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.put('/:id', updateInvoiceValidation, invoiceController.updateInvoice);

/**
 * @swagger
 * /invoices/{id}:
 *   delete:
 *     summary: Delete invoice (only draft invoices)
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.delete('/:id', param('id').notEmpty(), invoiceController.deleteInvoice);

/**
 * @swagger
 * /invoices/{id}/send:
 *   post:
 *     summary: Send invoice to client via email
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice sent successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.post('/:id/send', param('id').notEmpty(), invoiceController.sendInvoice);

/**
 * @swagger
 * /invoices/{id}/mark-paid:
 *   post:
 *     summary: Mark invoice as paid
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Invoice marked as paid successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.post('/:id/mark-paid', param('id').notEmpty(), invoiceController.markInvoiceAsPaid);

/**
 * @swagger
 * /invoices/{id}/pdf:
 *   get:
 *     summary: Generate and download invoice PDF
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *       - in: query
 *         name: template
 *         schema:
 *           type: string
 *           enum: [standard, modern, minimal]
 *           default: standard
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *           enum: [en, ar]
 *           default: en
 *       - in: query
 *         name: includePaymentQR
 *         schema:
 *           type: boolean
 *           default: false
 *       - in: query
 *         name: watermark
 *         schema:
 *           type: string
 *       - in: query
 *         name: download
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Force download instead of inline display
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.get('/:id/pdf', param('id').notEmpty(), invoiceController.generateInvoicePDF);

/**
 * @swagger
 * /invoices/{id}/duplicate:
 *   post:
 *     summary: Duplicate an existing invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID to duplicate
 *     responses:
 *       201:
 *         description: Invoice duplicated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.post('/:id/duplicate', param('id').notEmpty(), invoiceController.duplicateInvoice);

/**
 * @swagger
 * /invoices/{id}/cancel:
 *   post:
 *     summary: Cancel an invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *     responses:
 *       200:
 *         description: Invoice cancelled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.post('/:id/cancel', param('id').notEmpty(), invoiceController.cancelInvoice);

/**
 * @swagger
 * /invoices/{id}/payments:
 *   get:
 *     summary: Get payment history for invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.get('/:id/payments', param('id').notEmpty(), invoiceController.getInvoicePayments);

/**
 * @swagger
 * /invoices/{id}/payments:
 *   post:
 *     summary: Record a payment for invoice
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PAYPAL, STRIPE, SQUARE, OTHER]
 *               reference:
 *                 type: string
 *               notes:
 *                 type: string
 *               transactionId:
 *                 type: string
 *               paymentGateway:
 *                 type: string
 *               paymentDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Payment recorded successfully
 *       400:
 *         description: Invalid payment data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.post('/:id/payments', 
  param('id').notEmpty(),
  ...paymentValidation,
  invoiceController.recordPayment
);

/**
 * @swagger
 * /invoices/{id}/refund:
 *   post:
 *     summary: Process a refund for invoice payment
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *               - amount
 *             properties:
 *               paymentId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               reason:
 *                 type: string
 *               refundReference:
 *                 type: string
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *       400:
 *         description: Invalid refund data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.post('/:id/refund',
  param('id').notEmpty(),
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  invoiceController.processRefund
);

export default router;