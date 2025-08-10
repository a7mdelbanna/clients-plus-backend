import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { financialController } from '../controllers/financial.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Financial Management
 *   description: Financial management endpoints for accounts, transactions, expenses, and reporting
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FinancialAccount:
 *       type: object
 *       required:
 *         - name
 *         - accountType
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         accountNumber:
 *           type: string
 *         accountType:
 *           type: string
 *           enum: [CASH, CHECKING, SAVINGS, CREDIT_CARD, LOAN, INVESTMENT, ACCOUNTS_RECEIVABLE, ACCOUNTS_PAYABLE, INVENTORY, FIXED_ASSET, OTHER_ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, OTHER]
 *         subType:
 *           type: string
 *         balance:
 *           type: number
 *         initialBalance:
 *           type: number
 *         currency:
 *           type: string
 *           default: EGP
 *         creditLimit:
 *           type: number
 *         minimumBalance:
 *           type: number
 *         bankName:
 *           type: string
 *         bankBranch:
 *           type: string
 *         iban:
 *           type: string
 *         swiftCode:
 *           type: string
 *         isDefault:
 *           type: boolean
 *         allowOverdraft:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *     FinancialTransaction:
 *       type: object
 *       required:
 *         - accountId
 *         - type
 *         - amount
 *         - description
 *       properties:
 *         id:
 *           type: string
 *         accountId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [INCOME, EXPENSE, TRANSFER, DEPOSIT, WITHDRAWAL, PAYMENT, REFUND, ADJUSTMENT, FEE, INTEREST, DIVIDEND, TAX, OTHER]
 *         category:
 *           type: string
 *         subcategory:
 *           type: string
 *         amount:
 *           type: number
 *         description:
 *           type: string
 *         reference:
 *           type: string
 *         transactionDate:
 *           type: string
 *           format: date-time
 *         paymentMethod:
 *           type: string
 *           enum: [CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PAYPAL, STRIPE, SQUARE, OTHER]
 *         status:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, COMPLETED, CANCELLED, FAILED, RECONCILED]
 *     Expense:
 *       type: object
 *       required:
 *         - title
 *         - amount
 *         - expenseDate
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         amount:
 *           type: number
 *         currency:
 *           type: string
 *         categoryId:
 *           type: string
 *         vendorName:
 *           type: string
 *         expenseDate:
 *           type: string
 *           format: date
 *         status:
 *           type: string
 *           enum: [DRAFT, SUBMITTED, APPROVED, REJECTED, PAID, CANCELLED]
 */

// ============================================================================
// FINANCIAL ACCOUNTS
// ============================================================================

const createAccountValidation = [
  body('name').notEmpty().withMessage('Account name is required'),
  body('accountType').isIn([
    'CASH', 'CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LOAN', 'INVESTMENT',
    'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'INVENTORY', 'FIXED_ASSET',
    'OTHER_ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'OTHER'
  ]).withMessage('Valid account type is required'),
  body('initialBalance').optional().isFloat({ min: 0 }).withMessage('Initial balance must be non-negative'),
  body('creditLimit').optional().isFloat({ min: 0 }).withMessage('Credit limit must be non-negative'),
  body('minimumBalance').optional().isFloat().withMessage('Minimum balance must be a valid number')
];

const updateAccountValidation = [
  param('id').notEmpty().withMessage('Account ID is required'),
  body('name').optional().notEmpty().withMessage('Account name cannot be empty'),
  body('creditLimit').optional().isFloat({ min: 0 }).withMessage('Credit limit must be non-negative'),
  body('minimumBalance').optional().isFloat().withMessage('Minimum balance must be a valid number')
];

/**
 * @swagger
 * /finance/accounts:
 *   get:
 *     summary: Get all financial accounts
 *     tags: [Financial Management]
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
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: accountType
 *         schema:
 *           type: string
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Accounts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/accounts', financialController.getAccounts);

/**
 * @swagger
 * /finance/accounts:
 *   post:
 *     summary: Create a new financial account
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - accountType
 *             properties:
 *               name:
 *                 type: string
 *               accountNumber:
 *                 type: string
 *               accountType:
 *                 type: string
 *                 enum: [CASH, CHECKING, SAVINGS, CREDIT_CARD, LOAN, INVESTMENT, ACCOUNTS_RECEIVABLE, ACCOUNTS_PAYABLE, INVENTORY, FIXED_ASSET, OTHER_ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, OTHER]
 *               subType:
 *                 type: string
 *               initialBalance:
 *                 type: number
 *                 minimum: 0
 *               currency:
 *                 type: string
 *                 default: EGP
 *               creditLimit:
 *                 type: number
 *               minimumBalance:
 *                 type: number
 *               bankName:
 *                 type: string
 *               bankBranch:
 *                 type: string
 *               iban:
 *                 type: string
 *               swiftCode:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               allowOverdraft:
 *                 type: boolean
 *               description:
 *                 type: string
 *               branchId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/accounts', createAccountValidation, financialController.createAccount);

/**
 * @swagger
 * /finance/accounts/defaults:
 *   get:
 *     summary: Get default accounts for the company
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Default accounts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/accounts/defaults', financialController.getDefaultAccounts);

/**
 * @swagger
 * /finance/accounts/{id}:
 *   get:
 *     summary: Get account by ID
 *     tags: [Financial Management]
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
 *         description: Account retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Account not found
 */
router.get('/accounts/:id', param('id').notEmpty(), financialController.getAccountById);

/**
 * @swagger
 * /finance/accounts/{id}:
 *   put:
 *     summary: Update account
 *     tags: [Financial Management]
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
 *             properties:
 *               name:
 *                 type: string
 *               accountNumber:
 *                 type: string
 *               subType:
 *                 type: string
 *               creditLimit:
 *                 type: number
 *               minimumBalance:
 *                 type: number
 *               bankName:
 *                 type: string
 *               bankBranch:
 *                 type: string
 *               iban:
 *                 type: string
 *               swiftCode:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               allowOverdraft:
 *                 type: boolean
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Account updated successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Account not found
 */
router.put('/accounts/:id', updateAccountValidation, financialController.updateAccount);

/**
 * @swagger
 * /finance/accounts/{id}:
 *   delete:
 *     summary: Delete account
 *     tags: [Financial Management]
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
 *         description: Account deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Account not found
 */
router.delete('/accounts/:id', param('id').notEmpty(), financialController.deleteAccount);

/**
 * @swagger
 * /finance/accounts/{id}/balance:
 *   get:
 *     summary: Get account balance
 *     tags: [Financial Management]
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
 *         description: Account balance retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Account not found
 */
router.get('/accounts/:id/balance', param('id').notEmpty(), financialController.getAccountBalance);

// ============================================================================
// FINANCIAL TRANSACTIONS
// ============================================================================

const createTransactionValidation = [
  body('accountId').notEmpty().withMessage('Account ID is required'),
  body('type').isIn([
    'INCOME', 'EXPENSE', 'TRANSFER', 'DEPOSIT', 'WITHDRAWAL', 'PAYMENT', 
    'REFUND', 'ADJUSTMENT', 'FEE', 'INTEREST', 'DIVIDEND', 'TAX', 'OTHER'
  ]).withMessage('Valid transaction type is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').notEmpty().withMessage('Description is required'),
  body('transactionDate').optional().isISO8601().withMessage('Valid transaction date is required')
];

/**
 * @swagger
 * /finance/transactions:
 *   get:
 *     summary: Get all financial transactions
 *     tags: [Financial Management]
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
 *         name: accountId
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/transactions', financialController.getTransactions);

/**
 * @swagger
 * /finance/transactions:
 *   post:
 *     summary: Create a new financial transaction
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountId
 *               - type
 *               - amount
 *               - description
 *             properties:
 *               accountId:
 *                 type: string
 *               branchId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE, TRANSFER, DEPOSIT, WITHDRAWAL, PAYMENT, REFUND, ADJUSTMENT, FEE, INTEREST, DIVIDEND, TAX, OTHER]
 *               category:
 *                 type: string
 *               subcategory:
 *                 type: string
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               description:
 *                 type: string
 *               reference:
 *                 type: string
 *               transactionDate:
 *                 type: string
 *                 format: date-time
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PAYPAL, STRIPE, SQUARE, OTHER]
 *               checkNumber:
 *                 type: string
 *               invoiceId:
 *                 type: string
 *               appointmentId:
 *                 type: string
 *               clientId:
 *                 type: string
 *               vendorId:
 *                 type: string
 *               expenseId:
 *                 type: string
 *               currency:
 *                 type: string
 *               taxAmount:
 *                 type: number
 *               taxRate:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/transactions', createTransactionValidation, financialController.createTransaction);

/**
 * @swagger
 * /finance/transactions/{id}/approve:
 *   post:
 *     summary: Approve transaction
 *     tags: [Financial Management]
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
 *         description: Transaction approved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 */
router.post('/transactions/:id/approve', param('id').notEmpty(), financialController.approveTransaction);

/**
 * @swagger
 * /finance/transactions/{id}/reject:
 *   post:
 *     summary: Reject transaction
 *     tags: [Financial Management]
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction rejected successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transaction not found
 */
router.post('/transactions/:id/reject', param('id').notEmpty(), financialController.rejectTransaction);

// ============================================================================
// ACCOUNT TRANSFERS
// ============================================================================

const createTransferValidation = [
  body('fromAccountId').notEmpty().withMessage('From account ID is required'),
  body('toAccountId').notEmpty().withMessage('To account ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('description').notEmpty().withMessage('Description is required')
];

/**
 * @swagger
 * /finance/transfers:
 *   post:
 *     summary: Create account transfer
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromAccountId
 *               - toAccountId
 *               - amount
 *               - description
 *             properties:
 *               fromAccountId:
 *                 type: string
 *               toAccountId:
 *                 type: string
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               description:
 *                 type: string
 *               reference:
 *                 type: string
 *               transferFee:
 *                 type: number
 *               exchangeRate:
 *                 type: number
 *               fromCurrency:
 *                 type: string
 *               toCurrency:
 *                 type: string
 *               transferDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Transfer created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/transfers', createTransferValidation, financialController.createTransfer);

/**
 * @swagger
 * /finance/transfers/{id}/approve:
 *   post:
 *     summary: Approve transfer
 *     tags: [Financial Management]
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
 *         description: Transfer approved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Transfer not found
 */
router.post('/transfers/:id/approve', param('id').notEmpty(), financialController.approveTransfer);

// ============================================================================
// EXPENSE MANAGEMENT
// ============================================================================

const createExpenseValidation = [
  body('title').notEmpty().withMessage('Expense title is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('expenseDate').isISO8601().withMessage('Valid expense date is required')
];

/**
 * @swagger
 * /finance/expenses:
 *   get:
 *     summary: Get all expenses
 *     tags: [Financial Management]
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
 *         name: branchId
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expenses retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/expenses', financialController.getExpenses);

/**
 * @swagger
 * /finance/expenses:
 *   post:
 *     summary: Create a new expense
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - amount
 *               - expenseDate
 *             properties:
 *               branchId:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *               currency:
 *                 type: string
 *               taxAmount:
 *                 type: number
 *               taxRate:
 *                 type: number
 *               netAmount:
 *                 type: number
 *               vendorName:
 *                 type: string
 *               vendorId:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER, PAYPAL, STRIPE, SQUARE, OTHER]
 *               accountId:
 *                 type: string
 *               checkNumber:
 *                 type: string
 *               reference:
 *                 type: string
 *               expenseDate:
 *                 type: string
 *                 format: date
 *               dueDate:
 *                 type: string
 *                 format: date
 *               isReimbursable:
 *                 type: boolean
 *               hasReceipt:
 *                 type: boolean
 *               receiptUrl:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Expense created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/expenses', createExpenseValidation, financialController.createExpense);

/**
 * @swagger
 * /finance/expenses/{id}/submit:
 *   post:
 *     summary: Submit expense for approval
 *     tags: [Financial Management]
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
 *         description: Expense submitted for approval
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Expense not found
 */
router.post('/expenses/:id/submit', param('id').notEmpty(), financialController.submitExpense);

/**
 * @swagger
 * /finance/expenses/{id}/approve:
 *   post:
 *     summary: Approve expense
 *     tags: [Financial Management]
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
 *         description: Expense approved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Expense not found
 */
router.post('/expenses/:id/approve', param('id').notEmpty(), financialController.approveExpense);

// ============================================================================
// EXPENSE CATEGORIES
// ============================================================================

const createExpenseCategoryValidation = [
  body('name').notEmpty().withMessage('Category name is required'),
  body('code').optional().notEmpty().withMessage('Category code cannot be empty if provided')
];

/**
 * @swagger
 * /finance/expense-categories:
 *   get:
 *     summary: Get all expense categories
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expense categories retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/expense-categories', financialController.getExpenseCategories);

/**
 * @swagger
 * /finance/expense-categories:
 *   post:
 *     summary: Create expense category
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               code:
 *                 type: string
 *               parentId:
 *                 type: string
 *               budgetLimit:
 *                 type: number
 *               alertLimit:
 *                 type: number
 *               requiresApproval:
 *                 type: boolean
 *               defaultTaxRate:
 *                 type: number
 *               isDeductible:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Expense category created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/expense-categories', createExpenseCategoryValidation, financialController.createExpenseCategory);

// ============================================================================
// BUDGET MANAGEMENT
// ============================================================================

const createBudgetValidation = [
  body('name').notEmpty().withMessage('Budget name is required'),
  body('budgetType').isIn(['EXPENSE_CATEGORY', 'ACCOUNT', 'DEPARTMENT', 'PROJECT', 'OVERALL']).withMessage('Valid budget type is required'),
  body('budgetAmount').isFloat({ min: 0.01 }).withMessage('Budget amount must be greater than 0'),
  body('periodStart').isISO8601().withMessage('Valid period start date is required'),
  body('periodEnd').isISO8601().withMessage('Valid period end date is required'),
  body('periodType').isIn(['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']).withMessage('Valid period type is required')
];

/**
 * @swagger
 * /finance/budgets:
 *   post:
 *     summary: Create budget
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - budgetType
 *               - budgetAmount
 *               - periodStart
 *               - periodEnd
 *               - periodType
 *             properties:
 *               branchId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               budgetType:
 *                 type: string
 *                 enum: [EXPENSE_CATEGORY, ACCOUNT, DEPARTMENT, PROJECT, OVERALL]
 *               categoryId:
 *                 type: string
 *               accountId:
 *                 type: string
 *               budgetAmount:
 *                 type: number
 *                 minimum: 0.01
 *               periodStart:
 *                 type: string
 *                 format: date
 *               periodEnd:
 *                 type: string
 *                 format: date
 *               periodType:
 *                 type: string
 *                 enum: [MONTHLY, QUARTERLY, YEARLY, CUSTOM]
 *               alertThreshold:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       201:
 *         description: Budget created successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/budgets', createBudgetValidation, financialController.createBudget);

// ============================================================================
// CASH REGISTER OPERATIONS
// ============================================================================

const openCashRegisterValidation = [
  body('branchId').notEmpty().withMessage('Branch ID is required'),
  body('accountId').notEmpty().withMessage('Account ID is required'),
  body('openingBalance').isFloat({ min: 0 }).withMessage('Opening balance must be non-negative')
];

const closeCashRegisterValidation = [
  param('id').notEmpty().withMessage('Cash register day ID is required'),
  body('actualCash').isFloat({ min: 0 }).withMessage('Actual cash must be non-negative')
];

/**
 * @swagger
 * /finance/cash-register/open:
 *   post:
 *     summary: Open cash register
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - branchId
 *               - accountId
 *               - openingBalance
 *             properties:
 *               branchId:
 *                 type: string
 *               accountId:
 *                 type: string
 *               openingBalance:
 *                 type: number
 *                 minimum: 0
 *     responses:
 *       201:
 *         description: Cash register opened successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 */
router.post('/cash-register/open', openCashRegisterValidation, financialController.openCashRegister);

/**
 * @swagger
 * /finance/cash-register/{id}/close:
 *   post:
 *     summary: Close cash register
 *     tags: [Financial Management]
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
 *               - actualCash
 *             properties:
 *               actualCash:
 *                 type: number
 *                 minimum: 0
 *               closingNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cash register closed successfully
 *       400:
 *         description: Invalid input data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Cash register day not found
 */
router.post('/cash-register/:id/close', closeCashRegisterValidation, financialController.closeCashRegister);

// ============================================================================
// FINANCIAL REPORTS
// ============================================================================

/**
 * @swagger
 * /finance/reports/profit-loss:
 *   get:
 *     summary: Generate Profit & Loss report
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profit & Loss report generated successfully
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/reports/profit-loss', financialController.getProfitLossReport);

/**
 * @swagger
 * /finance/reports/cash-flow:
 *   get:
 *     summary: Generate Cash Flow report
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cash Flow report generated successfully
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Unauthorized
 */
router.get('/reports/cash-flow', financialController.getCashFlowReport);

// ============================================================================
// FINANCIAL DASHBOARD
// ============================================================================

/**
 * @swagger
 * /finance/summary:
 *   get:
 *     summary: Get financial summary/dashboard
 *     tags: [Financial Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Financial summary retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/summary', financialController.getFinancialSummary);

export default router;