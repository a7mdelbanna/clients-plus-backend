import { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { FinancialService } from '../services/financial.service';
import { ApiResponse, errorResponse, successResponse } from '../utils/response';
import { validationResult } from 'express-validator';

const prisma = new PrismaClient();
const financialService = new FinancialService(prisma);

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    companyId: string;
    role: UserRole;
    permissions?: string[];
  };
}

export class FinancialController {

  // ============================================================================
  // FINANCIAL ACCOUNTS
  // ============================================================================

  /**
   * Create a new financial account
   * POST /api/v1/finance/accounts
   */
  async createAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { companyId, userId } = req.user!;
      
      const accountData = {
        companyId,
        ...req.body
      };

      const account = await financialService.createAccount(accountData, userId);

      return successResponse(res, 'Account created successfully', account, 201);
    } catch (error) {
      console.error('Create account error:', error);
      res.status(500).json(
        errorResponse('Failed to create account', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get all financial accounts
   * GET /api/v1/finance/accounts
   */
  async getAccounts(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;
      
      const {
        page = 1,
        limit = 20,
        branchId,
        accountType,
        currency,
        isActive,
        search
      } = req.query;

      const filters = {
        companyId,
        ...(branchId && { branchId: branchId as string }),
        ...(accountType && { accountType: accountType as any }),
        ...(currency && { currency: currency as string }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(search && { search: search as string })
      };

      const pagination = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100)
      };

      const result = await financialService.getAccounts(filters, pagination);

      res.json(
        successResponse(result, 'Accounts retrieved successfully')
      );
    } catch (error) {
      console.error('Get accounts error:', error);
      res.status(500).json(
        errorResponse('Failed to retrieve accounts', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get account by ID
   * GET /api/v1/finance/accounts/:id
   */
  async getAccountById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      const account = await financialService.getAccountById(id, companyId);

      if (!account) {
        return res.status(404).json(
          errorResponse('Account not found')
        );
      }

      res.json(
        successResponse(account, 'Account retrieved successfully')
      );
    } catch (error) {
      console.error('Get account error:', error);
      res.status(500).json(
        errorResponse('Failed to retrieve account', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Update account
   * PUT /api/v1/finance/accounts/:id
   */
  async updateAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const { companyId } = req.user!;

      const account = await financialService.updateAccount(id, req.body, companyId);

      res.json(
        successResponse(account, 'Account updated successfully')
      );
    } catch (error) {
      console.error('Update account error:', error);
      res.status(500).json(
        errorResponse('Failed to update account', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Delete account
   * DELETE /api/v1/finance/accounts/:id
   */
  async deleteAccount(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      await financialService.deleteAccount(id, companyId);

      res.json(
        successResponse(null, 'Account deleted successfully')
      );
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json(
        errorResponse('Failed to delete account', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get account balance
   * GET /api/v1/finance/accounts/:id/balance
   */
  async getAccountBalance(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId } = req.user!;

      const balance = await financialService.getAccountBalance(id, companyId);

      res.json(
        successResponse(balance, 'Account balance retrieved successfully')
      );
    } catch (error) {
      console.error('Get account balance error:', error);
      res.status(500).json(
        errorResponse('Failed to retrieve account balance', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // ============================================================================
  // FINANCIAL TRANSACTIONS
  // ============================================================================

  /**
   * Create a new transaction
   * POST /api/v1/finance/transactions
   */
  async createTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { companyId, userId } = req.user!;
      
      const transactionData = {
        companyId,
        ...req.body
      };

      const transaction = await financialService.createTransaction(transactionData, userId);

      return successResponse(res, 'Transaction created successfully', transaction, 201);
    } catch (error) {
      console.error('Create transaction error:', error);
      res.status(500).json(
        errorResponse('Failed to create transaction', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get all transactions
   * GET /api/v1/finance/transactions
   */
  async getTransactions(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;
      
      const {
        page = 1,
        limit = 20,
        branchId,
        accountId,
        type,
        category,
        status,
        startDate,
        endDate,
        search
      } = req.query;

      const filters = {
        companyId,
        ...(branchId && { branchId: branchId as string }),
        ...(accountId && { accountId: accountId as string }),
        ...(type && { type: type as any }),
        ...(category && { category: category as string }),
        ...(status && { status: status as any }),
        ...(startDate && { startDate: new Date(startDate as string) }),
        ...(endDate && { endDate: new Date(endDate as string) }),
        ...(search && { search: search as string })
      };

      const pagination = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100)
      };

      const result = await financialService.getTransactions(filters, pagination);

      res.json(
        successResponse(result, 'Transactions retrieved successfully')
      );
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json(
        errorResponse('Failed to retrieve transactions', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Approve transaction
   * POST /api/v1/finance/transactions/:id/approve
   */
  async approveTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId, userId } = req.user!;

      const transaction = await financialService.approveTransaction(id, companyId, userId);

      res.json(
        successResponse(transaction, 'Transaction approved successfully')
      );
    } catch (error) {
      console.error('Approve transaction error:', error);
      res.status(500).json(
        errorResponse('Failed to approve transaction', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Reject transaction
   * POST /api/v1/finance/transactions/:id/reject
   */
  async rejectTransaction(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId, userId } = req.user!;
      const { reason } = req.body;

      const transaction = await financialService.rejectTransaction(id, companyId, userId, reason);

      res.json(
        successResponse(transaction, 'Transaction rejected successfully')
      );
    } catch (error) {
      console.error('Reject transaction error:', error);
      res.status(500).json(
        errorResponse('Failed to reject transaction', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // ============================================================================
  // ACCOUNT TRANSFERS
  // ============================================================================

  /**
   * Create account transfer
   * POST /api/v1/finance/transfers
   */
  async createTransfer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { companyId, userId } = req.user!;
      
      const transferData = {
        companyId,
        ...req.body
      };

      const transfer = await financialService.createTransfer(transferData, userId);

      return successResponse(res, 'Transfer created successfully', transfer, 201);
    } catch (error) {
      console.error('Create transfer error:', error);
      res.status(500).json(
        errorResponse('Failed to create transfer', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Approve transfer
   * POST /api/v1/finance/transfers/:id/approve
   */
  async approveTransfer(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId, userId } = req.user!;

      const transfer = await financialService.approveTransfer(id, companyId, userId);

      res.json(
        successResponse(transfer, 'Transfer approved successfully')
      );
    } catch (error) {
      console.error('Approve transfer error:', error);
      res.status(500).json(
        errorResponse('Failed to approve transfer', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // ============================================================================
  // EXPENSE MANAGEMENT
  // ============================================================================

  /**
   * Create expense
   * POST /api/v1/finance/expenses
   */
  async createExpense(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { companyId, userId } = req.user!;
      
      const expenseData = {
        companyId,
        ...req.body
      };

      const expense = await financialService.createExpense(expenseData, userId);

      return successResponse(res, 'Expense created successfully', expense, 201);
    } catch (error) {
      console.error('Create expense error:', error);
      res.status(500).json(
        errorResponse('Failed to create expense', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get all expenses
   * GET /api/v1/finance/expenses
   */
  async getExpenses(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;
      
      const {
        page = 1,
        limit = 20,
        branchId,
        categoryId,
        status,
        submittedBy,
        approvedBy,
        startDate,
        endDate,
        search
      } = req.query;

      const filters = {
        companyId,
        ...(branchId && { branchId: branchId as string }),
        ...(categoryId && { categoryId: categoryId as string }),
        ...(status && { status: status as any }),
        ...(submittedBy && { submittedBy: submittedBy as string }),
        ...(approvedBy && { approvedBy: approvedBy as string }),
        ...(startDate && { startDate: new Date(startDate as string) }),
        ...(endDate && { endDate: new Date(endDate as string) }),
        ...(search && { search: search as string })
      };

      const pagination = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100)
      };

      const result = await financialService.getExpenses(filters, pagination);

      res.json(
        successResponse(result, 'Expenses retrieved successfully')
      );
    } catch (error) {
      console.error('Get expenses error:', error);
      res.status(500).json(
        errorResponse('Failed to retrieve expenses', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Submit expense for approval
   * POST /api/v1/finance/expenses/:id/submit
   */
  async submitExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId, userId } = req.user!;

      const expense = await financialService.submitExpense(id, companyId, userId);

      res.json(
        successResponse(expense, 'Expense submitted for approval')
      );
    } catch (error) {
      console.error('Submit expense error:', error);
      res.status(500).json(
        errorResponse('Failed to submit expense', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Approve expense
   * POST /api/v1/finance/expenses/:id/approve
   */
  async approveExpense(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { companyId, userId } = req.user!;

      const expense = await financialService.approveExpense(id, companyId, userId);

      res.json(
        successResponse(expense, 'Expense approved successfully')
      );
    } catch (error) {
      console.error('Approve expense error:', error);
      res.status(500).json(
        errorResponse('Failed to approve expense', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // ============================================================================
  // BUDGET MANAGEMENT
  // ============================================================================

  /**
   * Create budget
   * POST /api/v1/finance/budgets
   */
  async createBudget(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { companyId, userId } = req.user!;
      
      const budgetData = {
        companyId,
        ...req.body
      };

      const budget = await financialService.createBudget(budgetData, userId);

      return successResponse(res, 'Budget created successfully', budget, 201);
    } catch (error) {
      console.error('Create budget error:', error);
      res.status(500).json(
        errorResponse('Failed to create budget', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // ============================================================================
  // CASH REGISTER OPERATIONS
  // ============================================================================

  /**
   * Open cash register
   * POST /api/v1/finance/cash-register/open
   */
  async openCashRegister(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { companyId, userId } = req.user!;
      const { branchId, accountId, openingBalance } = req.body;

      const cashRegister = await financialService.openCashRegister(
        companyId,
        branchId,
        accountId,
        openingBalance,
        userId
      );

      return successResponse(res, 'Cash register opened successfully', cashRegister, 201);
    } catch (error) {
      console.error('Open cash register error:', error);
      res.status(500).json(
        errorResponse('Failed to open cash register', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Close cash register
   * POST /api/v1/finance/cash-register/:id/close
   */
  async closeCashRegister(req: AuthenticatedRequest, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const { companyId, userId } = req.user!;
      const { actualCash, closingNotes } = req.body;

      const cashRegister = await financialService.closeCashRegister(
        id,
        companyId,
        actualCash,
        closingNotes,
        userId
      );

      res.json(
        successResponse(cashRegister, 'Cash register closed successfully')
      );
    } catch (error) {
      console.error('Close cash register error:', error);
      res.status(500).json(
        errorResponse('Failed to close cash register', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // ============================================================================
  // FINANCIAL REPORTS
  // ============================================================================

  /**
   * Generate Profit & Loss report
   * GET /api/v1/finance/reports/profit-loss
   */
  async getProfitLossReport(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;
      const { branchId, startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json(
          errorResponse('Start date and end date are required')
        );
      }

      const report = await financialService.generateProfitLossReport(
        companyId,
        branchId as string | undefined,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(
        successResponse(report, 'Profit & Loss report generated successfully')
      );
    } catch (error) {
      console.error('Generate P&L report error:', error);
      res.status(500).json(
        errorResponse('Failed to generate P&L report', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Generate Cash Flow report
   * GET /api/v1/finance/reports/cash-flow
   */
  async getCashFlowReport(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;
      const { branchId, startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json(
          errorResponse('Start date and end date are required')
        );
      }

      const report = await financialService.generateCashFlowReport(
        companyId,
        branchId as string | undefined,
        new Date(startDate as string),
        new Date(endDate as string)
      );

      res.json(
        successResponse(report, 'Cash Flow report generated successfully')
      );
    } catch (error) {
      console.error('Generate cash flow report error:', error);
      res.status(500).json(
        errorResponse('Failed to generate cash flow report', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // ============================================================================
  // FINANCIAL DASHBOARD
  // ============================================================================

  /**
   * Get financial summary/dashboard
   * GET /api/v1/finance/summary
   */
  async getFinancialSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;
      const { branchId } = req.query;

      const summary = await financialService.getFinancialSummary(
        companyId,
        branchId as string | undefined
      );

      res.json(
        successResponse(summary, 'Financial summary retrieved successfully')
      );
    } catch (error) {
      console.error('Get financial summary error:', error);
      res.status(500).json(
        errorResponse('Failed to retrieve financial summary', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Get default accounts
   * GET /api/v1/finance/accounts/defaults
   */
  async getDefaultAccounts(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;

      const accounts = await financialService.getDefaultAccounts(companyId);

      res.json(
        successResponse(accounts, 'Default accounts retrieved successfully')
      );
    } catch (error) {
      console.error('Get default accounts error:', error);
      res.status(500).json(
        errorResponse('Failed to retrieve default accounts', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  // ============================================================================
  // EXPENSE CATEGORIES
  // ============================================================================

  /**
   * Get all expense categories
   * GET /api/v1/finance/expense-categories
   */
  async getExpenseCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const { companyId } = req.user!;

      const categories = await prisma.expenseCategory.findMany({
        where: {
          companyId,
          isActive: true
        },
        include: {
          children: {
            where: { isActive: true }
          },
          _count: {
            select: {
              expenses: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.json(
        successResponse(categories, 'Expense categories retrieved successfully')
      );
    } catch (error) {
      console.error('Get expense categories error:', error);
      res.status(500).json(
        errorResponse('Failed to retrieve expense categories', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }

  /**
   * Create expense category
   * POST /api/v1/finance/expense-categories
   */
  async createExpenseCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { companyId, userId } = req.user!;
      
      const categoryData = {
        companyId,
        ...req.body,
        createdBy: userId
      };

      const category = await prisma.expenseCategory.create({
        data: categoryData,
        include: {
          children: true,
          _count: {
            select: {
              expenses: true
            }
          }
        }
      });

      return successResponse(res, 'Expense category created successfully', category, 201);
    } catch (error) {
      console.error('Create expense category error:', error);
      res.status(500).json(
        errorResponse('Failed to create expense category', error instanceof Error ? error.message : 'Unknown error')
      );
    }
  }
}

// Create and export controller instance
export const financialController = new FinancialController();