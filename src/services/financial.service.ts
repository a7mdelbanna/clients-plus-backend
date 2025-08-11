import { 
  PrismaClient, 
  Prisma, 
  FinancialAccountType,
  FinancialTransactionType,
  TransactionStatus,
  TransferStatus,
  ExpenseStatus,
  BudgetType,
  BudgetPeriod,
  CashRegisterStatus,
  FinancialReportType,
  PaymentMethod
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

interface CreateAccountData {
  companyId: string;
  branchId?: string;
  name: string;
  accountNumber?: string;
  accountType: FinancialAccountType;
  subType?: string;
  initialBalance?: number;
  currency?: string;
  creditLimit?: number;
  minimumBalance?: number;
  bankName?: string;
  bankBranch?: string;
  iban?: string;
  swiftCode?: string;
  isDefault?: boolean;
  allowOverdraft?: boolean;
  description?: string;
  tags?: string[];
  notes?: string;
}

interface UpdateAccountData {
  name?: string;
  accountNumber?: string;
  subType?: string;
  creditLimit?: number;
  minimumBalance?: number;
  bankName?: string;
  bankBranch?: string;
  iban?: string;
  swiftCode?: string;
  isDefault?: boolean;
  allowOverdraft?: boolean;
  description?: string;
  tags?: string[];
  notes?: string;
  isActive?: boolean;
}

interface CreateTransactionData {
  companyId: string;
  accountId: string;
  branchId?: string;
  type: FinancialTransactionType;
  category?: string;
  subcategory?: string;
  amount: number;
  description: string;
  reference?: string;
  transactionDate?: Date;
  effectiveDate?: Date;
  paymentMethod?: PaymentMethod;
  checkNumber?: string;
  invoiceId?: string;
  appointmentId?: string;
  clientId?: string;
  vendorId?: string;
  expenseId?: string;
  currency?: string;
  exchangeRate?: number;
  originalAmount?: number;
  originalCurrency?: string;
  taxAmount?: number;
  taxRate?: number;
  taxCategory?: string;
  isVatApplicable?: boolean;
  attachments?: any[];
  tags?: string[];
  notes?: string;
  internalNotes?: string;
}

interface CreateTransferData {
  companyId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description: string;
  reference?: string;
  transferFee?: number;
  feeAccount?: string;
  exchangeRate?: number;
  fromCurrency?: string;
  toCurrency?: string;
  transferDate?: Date;
}

interface CreateExpenseData {
  companyId: string;
  branchId?: string;
  categoryId?: string;
  title: string;
  description?: string;
  amount: number;
  currency?: string;
  taxAmount?: number;
  taxRate?: number;
  netAmount?: number;
  vendorName?: string;
  vendorId?: string;
  paymentMethod?: PaymentMethod;
  accountId?: string;
  checkNumber?: string;
  reference?: string;
  expenseDate: Date;
  dueDate?: Date;
  isReimbursable?: boolean;
  hasReceipt?: boolean;
  receiptUrl?: string;
  attachments?: any[];
  tags?: string[];
  notes?: string;
  internalNotes?: string;
}

interface CreateBudgetData {
  companyId: string;
  branchId?: string;
  name: string;
  description?: string;
  budgetType: BudgetType;
  categoryId?: string;
  accountId?: string;
  budgetAmount: number;
  periodStart: Date;
  periodEnd: Date;
  periodType: BudgetPeriod;
  alertThreshold?: number;
}

interface PaginationOptions {
  page: number;
  limit: number;
}

interface AccountFilters {
  companyId: string;
  branchId?: string;
  accountType?: FinancialAccountType;
  currency?: string;
  isActive?: boolean;
  search?: string;
}

interface TransactionFilters {
  companyId: string;
  branchId?: string;
  accountId?: string;
  type?: FinancialTransactionType;
  category?: string;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

interface ExpenseFilters {
  companyId: string;
  branchId?: string;
  categoryId?: string;
  status?: ExpenseStatus;
  submittedBy?: string;
  approvedBy?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

// ============================================================================
// FINANCIAL SERVICE CLASS
// ============================================================================

export class FinancialService {
  constructor(private prisma: PrismaClient) {}

  // ============================================================================
  // ACCOUNT MANAGEMENT
  // ============================================================================

  /**
   * Create a new financial account
   */
  async createAccount(data: CreateAccountData, createdBy: string) {
    // Validate if account number already exists for the company
    if (data.accountNumber) {
      const existingAccount = await this.prisma.financialAccount.findFirst({
        where: {
          companyId: data.companyId,
          accountNumber: data.accountNumber
        }
      });

      if (existingAccount) {
        throw new Error('Account number already exists for this company');
      }
    }

    // If this is marked as default, unset other default accounts of the same type
    if (data.isDefault) {
      await this.prisma.financialAccount.updateMany({
        where: {
          companyId: data.companyId,
          accountType: data.accountType,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const account = await this.prisma.financialAccount.create({
      data: {
        ...data,
        initialBalance: data.initialBalance ? new Decimal(data.initialBalance) : new Decimal(0),
        balance: data.initialBalance ? new Decimal(data.initialBalance) : new Decimal(0),
        availableBalance: data.initialBalance ? new Decimal(data.initialBalance) : new Decimal(0),
        creditLimit: data.creditLimit ? new Decimal(data.creditLimit) : null,
        minimumBalance: data.minimumBalance ? new Decimal(data.minimumBalance) : null,
        createdBy
      },
      include: {
        branch: {
          select: { id: true, name: true }
        }
      }
    });

    // Create initial transaction if there's an opening balance
    if (data.initialBalance && data.initialBalance > 0) {
      await this.createTransaction({
        companyId: data.companyId,
        accountId: account.id,
        branchId: data.branchId,
        type: 'DEPOSIT',
        category: 'Initial Balance',
        amount: data.initialBalance,
        description: 'Opening balance',
        reference: 'OPENING_BALANCE'
      }, createdBy);
    }

    return account;
  }

  /**
   * Get account by ID
   */
  async getAccountById(id: string, companyId: string) {
    return await this.prisma.financialAccount.findFirst({
      where: { id, companyId },
      include: {
        branch: {
          select: { id: true, name: true }
        },
        _count: {
          select: {
            transactions: true
          }
        }
      }
    });
  }

  /**
   * Get accounts with filters and pagination
   */
  async getAccounts(filters: AccountFilters, pagination: PaginationOptions) {
    const { companyId, branchId, accountType, currency, isActive, search } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.FinancialAccountWhereInput = {
      companyId,
      ...(branchId && { branchId }),
      ...(accountType && { accountType }),
      ...(currency && { currency }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { accountNumber: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { bankName: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [accounts, total] = await Promise.all([
      this.prisma.financialAccount.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { isDefault: 'desc' },
          { accountType: 'asc' },
          { name: 'asc' }
        ],
        include: {
          branch: {
            select: { id: true, name: true }
          },
          _count: {
            select: {
              transactions: true
            }
          }
        }
      }),
      this.prisma.financialAccount.count({ where })
    ]);

    return {
      accounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update account
   */
  async updateAccount(id: string, data: UpdateAccountData, companyId: string) {
    const existingAccount = await this.prisma.financialAccount.findFirst({
      where: { id, companyId }
    });

    if (!existingAccount) {
      throw new Error('Account not found');
    }

    // If setting as default, unset other default accounts of the same type
    if (data.isDefault) {
      await this.prisma.financialAccount.updateMany({
        where: {
          companyId,
          accountType: existingAccount.accountType,
          isDefault: true,
          id: { not: id }
        },
        data: {
          isDefault: false
        }
      });
    }

    return await this.prisma.financialAccount.update({
      where: { id },
      data: {
        ...data,
        creditLimit: data.creditLimit ? new Decimal(data.creditLimit) : undefined,
        minimumBalance: data.minimumBalance ? new Decimal(data.minimumBalance) : undefined
      },
      include: {
        branch: {
          select: { id: true, name: true }
        }
      }
    });
  }

  /**
   * Delete account (only if no transactions exist)
   */
  async deleteAccount(id: string, companyId: string) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id, companyId },
      include: {
        _count: {
          select: {
            transactions: true,
            fromTransfers: true,
            toTransfers: true
          }
        }
      }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const totalTransactions = account._count.transactions + 
                             account._count.fromTransfers + 
                             account._count.toTransfers;

    if (totalTransactions > 0) {
      throw new Error('Cannot delete account with existing transactions. Please archive it instead.');
    }

    return await this.prisma.financialAccount.delete({
      where: { id }
    });
  }

  // ============================================================================
  // TRANSACTION MANAGEMENT
  // ============================================================================

  /**
   * Create a new transaction
   */
  async createTransaction(data: CreateTransactionData, createdBy: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Validate account exists and belongs to company
      const account = await tx.financialAccount.findFirst({
        where: {
          id: data.accountId,
          companyId: data.companyId
        }
      });

      if (!account) {
        throw new Error('Account not found');
      }

      // Create the transaction
      const transaction = await tx.financialTransaction.create({
        data: {
          ...data,
          amount: new Decimal(data.amount),
          exchangeRate: data.exchangeRate ? new Decimal(data.exchangeRate) : null,
          originalAmount: data.originalAmount ? new Decimal(data.originalAmount) : null,
          taxAmount: data.taxAmount ? new Decimal(data.taxAmount) : null,
          taxRate: data.taxRate ? new Decimal(data.taxRate) : null,
          attachments: data.attachments || undefined,
          transactionDate: data.transactionDate || new Date(),
          currency: data.currency || account.currency,
          status: TransactionStatus.PENDING,
          createdBy
        },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              accountType: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Update account balance (pending transactions affect available balance)
      const isDebit = ['EXPENSE', 'WITHDRAWAL', 'PAYMENT', 'FEE', 'TAX'].includes(data.type);
      const balanceChange = isDebit ? new Decimal(data.amount).negated() : new Decimal(data.amount);

      await tx.financialAccount.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: balanceChange
          },
          availableBalance: {
            increment: balanceChange
          }
        }
      });

      return transaction;
    });
  }

  /**
   * Get transactions with filters and pagination
   */
  async getTransactions(filters: TransactionFilters, pagination: PaginationOptions) {
    const { 
      companyId, 
      branchId, 
      accountId, 
      type, 
      category, 
      status, 
      startDate, 
      endDate, 
      search 
    } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.FinancialTransactionWhereInput = {
      companyId,
      ...(branchId && { branchId }),
      ...(accountId && { accountId }),
      ...(type && { type }),
      ...(category && { category }),
      ...(status && { status }),
      ...(startDate && endDate && {
        transactionDate: {
          gte: startDate,
          lte: endDate
        }
      }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: 'insensitive' } },
          { reference: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { checkNumber: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [transactions, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              accountType: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      this.prisma.financialTransaction.count({ where })
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Approve transaction
   */
  async approveTransaction(id: string, companyId: string, approvedBy: string) {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: { id, companyId }
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new Error('Only pending transactions can be approved');
    }

    return await this.prisma.financialTransaction.update({
      where: { id },
      data: {
        status: TransactionStatus.APPROVED,
        approvedBy,
        approvedAt: new Date()
      }
    });
  }

  /**
   * Reject transaction
   */
  async rejectTransaction(id: string, companyId: string, rejectedBy: string, reason?: string) {
    return await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.financialTransaction.findFirst({
        where: { id, companyId }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        throw new Error('Only pending transactions can be rejected');
      }

      // Reverse the balance change
      const isDebit = ['EXPENSE', 'WITHDRAWAL', 'PAYMENT', 'FEE', 'TAX'].includes(transaction.type);
      const balanceChange = isDebit ? transaction.amount : transaction.amount.negated();

      await tx.financialAccount.update({
        where: { id: transaction.accountId },
        data: {
          balance: {
            increment: balanceChange
          },
          availableBalance: {
            increment: balanceChange
          }
        }
      });

      return await tx.financialTransaction.update({
        where: { id },
        data: {
          status: TransactionStatus.REJECTED,
          notes: reason ? `${transaction.notes || ''}\nRejection reason: ${reason}` : transaction.notes
        }
      });
    });
  }

  // ============================================================================
  // ACCOUNT TRANSFERS
  // ============================================================================

  /**
   * Create account transfer
   */
  async createTransfer(data: CreateTransferData, createdBy: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Validate accounts
      const [fromAccount, toAccount] = await Promise.all([
        tx.financialAccount.findFirst({
          where: { id: data.fromAccountId, companyId: data.companyId }
        }),
        tx.financialAccount.findFirst({
          where: { id: data.toAccountId, companyId: data.companyId }
        })
      ]);

      if (!fromAccount || !toAccount) {
        throw new Error('One or both accounts not found');
      }

      if (fromAccount.id === toAccount.id) {
        throw new Error('Cannot transfer to the same account');
      }

      // Check available balance
      if (fromAccount.balance.lessThan(new Decimal(data.amount))) {
        throw new Error('Insufficient balance for transfer');
      }

      // Create transfer record
      const transfer = await tx.accountTransfer.create({
        data: {
          ...data,
          amount: new Decimal(data.amount),
          transferFee: data.transferFee ? new Decimal(data.transferFee) : null,
          exchangeRate: data.exchangeRate ? new Decimal(data.exchangeRate) : null,
          fromCurrencyAmount: data.amount ? new Decimal(data.amount) : null,
          toCurrencyAmount: data.exchangeRate 
            ? new Decimal(data.amount).mul(new Decimal(data.exchangeRate))
            : new Decimal(data.amount),
          transferDate: data.transferDate || new Date(),
          fromCurrency: data.fromCurrency || fromAccount.currency,
          toCurrency: data.toCurrency || toAccount.currency,
          status: TransferStatus.PENDING,
          createdBy
        },
        include: {
          fromAccount: {
            select: { id: true, name: true, accountType: true }
          },
          toAccount: {
            select: { id: true, name: true, accountType: true }
          }
        }
      });

      // Create corresponding transactions
      await Promise.all([
        // Debit from source account
        tx.financialTransaction.create({
          data: {
            companyId: data.companyId,
            accountId: data.fromAccountId,
            type: FinancialTransactionType.TRANSFER,
            amount: new Decimal(data.amount).negated(),
            description: `Transfer to ${toAccount.name}`,
            reference: transfer.id,
            transactionDate: data.transferDate || new Date(),
            currency: fromAccount.currency,
            status: TransactionStatus.PENDING,
            createdBy
          }
        }),
        // Credit to destination account
        tx.financialTransaction.create({
          data: {
            companyId: data.companyId,
            accountId: data.toAccountId,
            type: FinancialTransactionType.TRANSFER,
            amount: transfer.toCurrencyAmount || new Decimal(data.amount),
            description: `Transfer from ${fromAccount.name}`,
            reference: transfer.id,
            transactionDate: data.transferDate || new Date(),
            currency: toAccount.currency,
            status: TransactionStatus.PENDING,
            createdBy
          }
        })
      ]);

      return transfer;
    });
  }

  /**
   * Approve transfer
   */
  async approveTransfer(id: string, companyId: string, approvedBy: string) {
    return await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.accountTransfer.findFirst({
        where: { id, companyId },
        include: {
          fromAccount: true,
          toAccount: true
        }
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      if (transfer.status !== TransferStatus.PENDING) {
        throw new Error('Only pending transfers can be approved');
      }

      // Update transfer status
      const updatedTransfer = await tx.accountTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.APPROVED,
          approvedBy,
          approvedAt: new Date()
        }
      });

      // Update account balances
      await Promise.all([
        tx.financialAccount.update({
          where: { id: transfer.fromAccountId },
          data: {
            balance: { decrement: transfer.amount }
          }
        }),
        tx.financialAccount.update({
          where: { id: transfer.toAccountId },
          data: {
            balance: { increment: transfer.toCurrencyAmount || transfer.amount }
          }
        })
      ]);

      // Update related transactions
      await tx.financialTransaction.updateMany({
        where: {
          reference: transfer.id,
          companyId
        },
        data: {
          status: TransactionStatus.APPROVED,
          approvedBy,
          approvedAt: new Date()
        }
      });

      return updatedTransfer;
    });
  }

  // ============================================================================
  // EXPENSE MANAGEMENT
  // ============================================================================

  /**
   * Create expense
   */
  async createExpense(data: CreateExpenseData, createdBy: string) {
    return await this.prisma.expense.create({
      data: {
        ...data,
        amount: new Decimal(data.amount),
        taxAmount: data.taxAmount ? new Decimal(data.taxAmount) : null,
        taxRate: data.taxRate ? new Decimal(data.taxRate) : null,
        netAmount: data.netAmount ? new Decimal(data.netAmount) : null,
        attachments: data.attachments || undefined,
        currency: data.currency || 'EGP',
        status: ExpenseStatus.DRAFT,
        createdBy
      },
      include: {
        category: {
          select: { id: true, name: true, code: true }
        },
        branch: {
          select: { id: true, name: true }
        }
      }
    });
  }

  /**
   * Get expenses with filters and pagination
   */
  async getExpenses(filters: ExpenseFilters, pagination: PaginationOptions) {
    const { 
      companyId, 
      branchId, 
      categoryId, 
      status, 
      submittedBy, 
      approvedBy,
      startDate, 
      endDate, 
      search 
    } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {
      companyId,
      ...(branchId && { branchId }),
      ...(categoryId && { categoryId }),
      ...(status && { status }),
      ...(submittedBy && { submittedBy }),
      ...(approvedBy && { approvedBy }),
      ...(startDate && endDate && {
        expenseDate: {
          gte: startDate,
          lte: endDate
        }
      }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { vendorName: { contains: search, mode: 'insensitive' } },
          { reference: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          category: {
            select: { id: true, name: true, code: true }
          },
          branch: {
            select: { id: true, name: true }
          }
        }
      }),
      this.prisma.expense.count({ where })
    ]);

    return {
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Submit expense for approval
   */
  async submitExpense(id: string, companyId: string, submittedBy: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId }
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new Error('Only draft expenses can be submitted');
    }

    return await this.prisma.expense.update({
      where: { id },
      data: {
        status: ExpenseStatus.SUBMITTED,
        submittedBy,
        submittedAt: new Date()
      }
    });
  }

  /**
   * Approve expense
   */
  async approveExpense(id: string, companyId: string, approvedBy: string) {
    return await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findFirst({
        where: { id, companyId }
      });

      if (!expense) {
        throw new Error('Expense not found');
      }

      if (expense.status !== ExpenseStatus.SUBMITTED) {
        throw new Error('Only submitted expenses can be approved');
      }

      const updatedExpense = await tx.expense.update({
        where: { id },
        data: {
          status: ExpenseStatus.APPROVED,
          approvedBy,
          approvedAt: new Date()
        }
      });

      // Create financial transaction if account is specified
      if (expense.accountId) {
        await tx.financialTransaction.create({
          data: {
            companyId: expense.companyId,
            accountId: expense.accountId,
            branchId: expense.branchId,
            type: FinancialTransactionType.EXPENSE,
            category: 'Approved Expense',
            amount: expense.amount.negated(),
            description: expense.title,
            reference: expense.reference || `EXP-${expense.id}`,
            transactionDate: expense.expenseDate,
            paymentMethod: expense.paymentMethod,
            checkNumber: expense.checkNumber,
            expenseId: expense.id,
            currency: expense.currency,
            taxAmount: expense.taxAmount,
            taxRate: expense.taxRate,
            status: TransactionStatus.APPROVED,
            createdBy: approvedBy,
            approvedBy,
            approvedAt: new Date()
          }
        });

        // Update expense with transaction link
        await tx.expense.update({
          where: { id },
          data: {
            transactionId: expense.id // This should be the transaction ID, but we'll handle this properly
          }
        });
      }

      return updatedExpense;
    });
  }

  // ============================================================================
  // BUDGET MANAGEMENT
  // ============================================================================

  /**
   * Create budget
   */
  async createBudget(data: CreateBudgetData, createdBy: string) {
    const budget = await this.prisma.budget.create({
      data: {
        ...data,
        budgetAmount: new Decimal(data.budgetAmount),
        spentAmount: new Decimal(0),
        remainingAmount: new Decimal(data.budgetAmount),
        alertThreshold: data.alertThreshold ? new Decimal(data.alertThreshold) : null,
        isActive: true,
        createdBy
      },
      include: {
        category: {
          select: { id: true, name: true, code: true }
        },
        account: {
          select: { id: true, name: true, accountType: true }
        },
        branch: {
          select: { id: true, name: true }
        }
      }
    });

    return budget;
  }

  /**
   * Update budget spent amount
   */
  async updateBudgetSpentAmount(budgetId: string, additionalAmount: number) {
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId }
    });

    if (!budget) {
      throw new Error('Budget not found');
    }

    const newSpentAmount = budget.spentAmount.add(new Decimal(additionalAmount));
    const newRemainingAmount = budget.budgetAmount.sub(newSpentAmount);

    return await this.prisma.budget.update({
      where: { id: budgetId },
      data: {
        spentAmount: newSpentAmount,
        remainingAmount: newRemainingAmount
      }
    });
  }

  // ============================================================================
  // CASH REGISTER OPERATIONS
  // ============================================================================

  /**
   * Open cash register for a day
   */
  async openCashRegister(
    companyId: string, 
    branchId: string, 
    accountId: string, 
    openingBalance: number,
    openedBy: string
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already opened for today
    const existing = await this.prisma.cashRegisterDay.findUnique({
      where: {
        branchId_accountId_date: {
          branchId,
          accountId,
          date: today
        }
      }
    });

    if (existing) {
      throw new Error('Cash register already opened for today');
    }

    return await this.prisma.cashRegisterDay.create({
      data: {
        companyId,
        branchId,
        accountId,
        date: today,
        openingBalance: new Decimal(openingBalance),
        expectedClosing: new Decimal(openingBalance),
        openedBy,
        openedAt: new Date(),
        status: CashRegisterStatus.OPEN
      },
      include: {
        account: {
          select: { id: true, name: true }
        },
        branch: {
          select: { id: true, name: true }
        }
      }
    });
  }

  /**
   * Close cash register for a day
   */
  async closeCashRegister(
    id: string,
    companyId: string,
    actualCash: number,
    closingNotes: string,
    closedBy: string
  ) {
    const cashRegisterDay = await this.prisma.cashRegisterDay.findFirst({
      where: { id, companyId }
    });

    if (!cashRegisterDay) {
      throw new Error('Cash register day not found');
    }

    if (cashRegisterDay.status !== CashRegisterStatus.OPEN) {
      throw new Error('Cash register is not open');
    }

    const actualCashDecimal = new Decimal(actualCash);
    const variance = actualCashDecimal.sub(cashRegisterDay.expectedClosing);

    return await this.prisma.cashRegisterDay.update({
      where: { id },
      data: {
        actualCash: actualCashDecimal,
        variance,
        closingNotes,
        status: CashRegisterStatus.CLOSED,
        closedBy,
        closedAt: new Date()
      }
    });
  }

  // ============================================================================
  // FINANCIAL REPORTS
  // ============================================================================

  /**
   * Generate Profit & Loss report
   */
  async generateProfitLossReport(
    companyId: string, 
    branchId: string | undefined,
    startDate: Date, 
    endDate: Date
  ) {
    const where = {
      companyId,
      ...(branchId && { branchId }),
      transactionDate: {
        gte: startDate,
        lte: endDate
      },
      status: TransactionStatus.APPROVED
    };

    const transactions = await this.prisma.financialTransaction.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            accountType: true
          }
        }
      }
    });

    const income = transactions
      .filter(t => ['INCOME', 'PAYMENT'].includes(t.type))
      .reduce((sum, t) => sum.add(t.amount), new Decimal(0));

    const expenses = transactions
      .filter(t => ['EXPENSE', 'FEE', 'TAX'].includes(t.type))
      .reduce((sum, t) => sum.add(t.amount.abs()), new Decimal(0));

    const netIncome = income.sub(expenses);

    return {
      period: { startDate, endDate },
      summary: {
        totalIncome: income.toNumber(),
        totalExpenses: expenses.toNumber(),
        netIncome: netIncome.toNumber(),
        profitMargin: income.greaterThan(0) 
          ? netIncome.div(income).mul(100).toNumber() 
          : 0
      },
      details: {
        income: transactions
          .filter(t => ['INCOME', 'PAYMENT'].includes(t.type))
          .map(t => ({
            id: t.id,
            date: t.transactionDate,
            description: t.description,
            category: t.category,
            amount: t.amount.toNumber(),
            account: t.account.name
          })),
        expenses: transactions
          .filter(t => ['EXPENSE', 'FEE', 'TAX'].includes(t.type))
          .map(t => ({
            id: t.id,
            date: t.transactionDate,
            description: t.description,
            category: t.category,
            amount: t.amount.abs().toNumber(),
            account: t.account.name
          }))
      }
    };
  }

  /**
   * Generate Cash Flow report
   */
  async generateCashFlowReport(
    companyId: string,
    branchId: string | undefined,
    startDate: Date,
    endDate: Date
  ) {
    const where = {
      companyId,
      ...(branchId && { branchId }),
      transactionDate: {
        gte: startDate,
        lte: endDate
      },
      status: TransactionStatus.APPROVED,
      account: {
        accountType: {
          in: ['CASH', 'CHECKING', 'SAVINGS'] as any[]
        }
      }
    };

    const transactions = await this.prisma.financialTransaction.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            accountType: true
          }
        }
      },
      orderBy: { transactionDate: 'asc' }
    });

    const cashFlow = transactions.map(t => ({
      date: t.transactionDate,
      description: t.description,
      category: t.category,
      type: t.type,
      amount: t.amount.toNumber(),
      account: t.account.name,
      runningTotal: 0 // Will be calculated
    }));

    // Calculate running totals
    let runningTotal = 0;
    cashFlow.forEach(item => {
      runningTotal += item.amount;
      item.runningTotal = runningTotal;
    });

    const totalInflows = transactions
      .filter(t => t.amount.greaterThan(0))
      .reduce((sum, t) => sum.add(t.amount), new Decimal(0));

    const totalOutflows = transactions
      .filter(t => t.amount.lessThan(0))
      .reduce((sum, t) => sum.add(t.amount.abs()), new Decimal(0));

    return {
      period: { startDate, endDate },
      summary: {
        totalInflows: totalInflows.toNumber(),
        totalOutflows: totalOutflows.toNumber(),
        netCashFlow: totalInflows.sub(totalOutflows).toNumber()
      },
      transactions: cashFlow
    };
  }

  /**
   * Get financial summary/dashboard data
   */
  async getFinancialSummary(companyId: string, branchId?: string) {
    const where = {
      companyId,
      ...(branchId && { branchId }),
      isActive: true
    };

    // Get account balances by type
    const accounts = await this.prisma.financialAccount.findMany({
      where,
      select: {
        accountType: true,
        balance: true,
        currency: true
      }
    });

    const accountSummary = accounts.reduce((acc, account) => {
      const type = account.accountType;
      if (!acc[type]) {
        acc[type] = new Decimal(0);
      }
      acc[type] = acc[type].add(account.balance);
      return acc;
    }, {} as Record<string, Decimal>);

    // Get recent transactions
    const recentTransactions = await this.prisma.financialTransaction.findMany({
      where: {
        companyId,
        ...(branchId && { branchId })
      },
      take: 10,
      orderBy: { transactionDate: 'desc' },
      include: {
        account: {
          select: { name: true, accountType: true }
        }
      }
    });

    // Get pending expenses
    const pendingExpenses = await this.prisma.expense.count({
      where: {
        companyId,
        ...(branchId && { branchId }),
        status: ExpenseStatus.SUBMITTED
      }
    });

    return {
      accountSummary: Object.entries(accountSummary).map(([type, balance]) => ({
        accountType: type,
        balance: balance.toNumber()
      })),
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        date: t.transactionDate,
        description: t.description,
        amount: t.amount.toNumber(),
        type: t.type,
        account: t.account.name,
        status: t.status
      })),
      pendingExpenses,
      totalCash: (accountSummary.CASH || new Decimal(0)).toNumber(),
      totalBank: ((accountSummary.CHECKING || new Decimal(0)).add(accountSummary.SAVINGS || new Decimal(0))).toNumber()
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Get default accounts for a company
   */
  async getDefaultAccounts(companyId: string) {
    const accounts = await this.prisma.financialAccount.findMany({
      where: {
        companyId,
        isDefault: true,
        isActive: true
      }
    });

    return accounts.reduce((acc, account) => {
      acc[account.accountType] = account;
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Validate account balance for operation
   */
  async validateAccountBalance(accountId: string, amount: number): Promise<boolean> {
    const account = await this.prisma.financialAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const requiredAmount = new Decimal(amount);
    
    // For overdraft-enabled accounts, check against credit limit
    if (account.allowOverdraft && account.creditLimit) {
      const availableCredit = account.balance.add(account.creditLimit);
      return availableCredit.greaterThanOrEqualTo(requiredAmount);
    }

    return account.balance.greaterThanOrEqualTo(requiredAmount);
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accountId: string, companyId: string) {
    const account = await this.prisma.financialAccount.findFirst({
      where: { id: accountId, companyId }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return {
      balance: account.balance.toNumber(),
      availableBalance: account.availableBalance.toNumber(),
      currency: account.currency
    };
  }
}