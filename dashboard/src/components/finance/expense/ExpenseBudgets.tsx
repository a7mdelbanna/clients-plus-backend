import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { 
  Add, 
  AccountBalance, 
  Edit,
  MoreVert,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { expenseService } from '../../../services/expense.service';
import { financeService } from '../../../services/finance.service';
import BudgetDialog from './BudgetDialog';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toDateSafe } from '../../../utils/dateUtils';
import type { Budget } from '../../../types/expense.types';

export default function ExpenseBudgets() {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [activeBudget, setActiveBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | undefined>();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');

  useEffect(() => {
    if (currentUser?.companyId && currentBranch?.id) {
      loadBudgets();
    }
  }, [currentUser, currentBranch]);

  // Also reload budgets when component becomes visible (for tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser?.companyId && currentBranch?.id) {
        loadBudgets();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also reload when component mounts (tab switches)
    if (currentUser?.companyId && currentBranch?.id) {
      loadBudgets();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadBudgets = async () => {
    if (!currentUser?.companyId || !currentBranch?.id) return;
    
    try {
      setLoading(true);
      
      // Get active budget
      const active = await expenseService.getActiveBudget(
        currentUser.companyId,
        currentBranch.id,
        new Date()
      );
      
      setActiveBudget(active);
      
      // Get all budgets for this branch
      const allBudgets = await expenseService.getBudgets(
        currentUser.companyId,
        currentBranch.id
      );
      
      setBudgets(allBudgets);
      
      // If there's an active budget, update its spending
      if (active) {
        await updateBudgetSpending(active);
      }
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBudgetSpending = async (budget: Budget) => {
    if (!currentUser?.companyId || !currentBranch?.id || !budget.categoryBudgets) return;
    
    try {
      // Get all expenses for the budget period
      const startDate = toDateSafe(budget.startDate);
      const endDate = toDateSafe(budget.endDate);
      
      console.log('Fetching expenses for budget period:', startDate, 'to', endDate);
      
      const expenses = await financeService.getExpenseTransactions(
        currentUser.companyId,
        {
          branchId: currentBranch.id,
          startDate,
          endDate,
        }
      );
      
      // Calculate spending per category
      const categorySpending: { [key: string]: number } = {};
      console.log('Budget expenses:', expenses.transactions.length, 'transactions found');
      
      expenses.transactions.forEach(expense => {
        const categoryId = (expense as any).expenseDetails?.categoryId;
        console.log('Expense:', expense.description, 'CategoryId:', categoryId, 'Amount:', expense.totalAmount || expense.amount);
        if (categoryId) {
          categorySpending[categoryId] = (categorySpending[categoryId] || 0) + (expense.totalAmount || expense.amount || 0);
        }
      });
      
      console.log('Category spending:', categorySpending);
      
      // Update budget categories with actual spending
      const updatedCategories = budget.categoryBudgets.map(cb => ({
        ...cb,
        spentAmount: categorySpending[cb.categoryId] || 0,
        availableAmount: cb.allocatedAmount - (categorySpending[cb.categoryId] || 0),
        percentageUsed: cb.allocatedAmount > 0 
          ? ((categorySpending[cb.categoryId] || 0) / cb.allocatedAmount) * 100 
          : 0,
      }));
      
      setActiveBudget({
        ...budget,
        categoryBudgets: updatedCategories,
      });
    } catch (error) {
      console.error('Error updating budget spending:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, budgetId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedBudgetId(budgetId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBudgetId('');
  };

  const handleEditBudget = () => {
    const budget = budgets.find(b => b.id === selectedBudgetId);
    if (budget) {
      setSelectedBudget(budget);
      setOpenDialog(true);
    }
    handleMenuClose();
  };

  const getStatusColor = (percentageUsed: number) => {
    if (percentageUsed >= 100) return 'error';
    if (percentageUsed >= 80) return 'warning';
    return 'success';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <AccountBalance sx={{ fontSize: 64, color: 'text.disabled' }} />
      </Box>
    );
  }

  if (!activeBudget) {
    return (
      <Box>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <AccountBalance sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isRTL ? 'إدارة الميزانيات' : 'Budget Management'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {isRTL 
                ? 'تحديد ومراقبة الميزانيات لكل فئة من فئات المصروفات'
                : 'Set and monitor budgets for each expense category'
              }
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                console.log('Create budget button clicked');
                setSelectedBudget(undefined);
                setOpenDialog(true);
              }}
            >
              {isRTL ? 'إنشاء ميزانية' : 'Create Budget'}
            </Button>
          </CardContent>
        </Card>
        
        {/* Budget Dialog - needs to be here too for when no budget exists */}
        <BudgetDialog
          open={openDialog}
          onClose={() => {
            setOpenDialog(false);
            setSelectedBudget(undefined);
          }}
          onSuccess={() => {
            loadBudgets();
          }}
          existingBudget={selectedBudget}
        />
      </Box>
    );
  }

  const totalSpent = activeBudget.categoryBudgets?.reduce((sum, cb) => sum + (cb.spentAmount || 0), 0) || 0;
  const totalAllocated = activeBudget.totalBudget || 0;
  const totalPercentage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

  return (
    <Box>
      {/* Summary Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                {activeBudget.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {format(
                  toDateSafe(activeBudget.startDate),
                  'dd MMM yyyy',
                  { locale: ar }
                )} - {format(
                  toDateSafe(activeBudget.endDate),
                  'dd MMM yyyy',
                  { locale: ar }
                )}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => {
                  setSelectedBudget(activeBudget);
                  setOpenDialog(true);
                }}
              >
                تعديل
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setSelectedBudget(undefined);
                  setOpenDialog(true);
                }}
              >
                ميزانية جديدة
              </Button>
            </Box>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                المصروفات: {formatCurrency(totalSpent)} من {formatCurrency(totalAllocated)}
              </Typography>
              <Typography variant="body2" color={getStatusColor(totalPercentage)}>
                {totalPercentage.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={Math.min(100, totalPercentage)} 
              color={getStatusColor(totalPercentage)}
              sx={{ height: 10, borderRadius: 5 }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Category Budgets Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{isRTL ? 'الفئة' : 'Category'}</TableCell>
              <TableCell>{isRTL ? 'الميزانية' : 'Budget'}</TableCell>
              <TableCell>{isRTL ? 'المصروف' : 'Spent'}</TableCell>
              <TableCell>{isRTL ? 'المتبقي' : 'Remaining'}</TableCell>
              <TableCell>{isRTL ? 'النسبة' : 'Percentage'}</TableCell>
              <TableCell>{isRTL ? 'الحالة' : 'Status'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeBudget.categoryBudgets?.map((cb) => (
              <TableRow key={cb.categoryId}>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {cb.categoryNameAr || cb.categoryName}
                  </Typography>
                </TableCell>
                <TableCell>{formatCurrency(cb.allocatedAmount)}</TableCell>
                <TableCell>{formatCurrency(cb.spentAmount || 0)}</TableCell>
                <TableCell>{formatCurrency(cb.availableAmount || 0)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(100, cb.percentageUsed || 0)} 
                      color={getStatusColor(cb.percentageUsed || 0)}
                      sx={{ width: 60, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption">
                      {(cb.percentageUsed || 0).toFixed(0)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  {cb.percentageUsed >= 100 ? (
                    <Chip label="تجاوز" color="error" size="small" icon={<Warning />} />
                  ) : cb.percentageUsed >= (cb.alertThreshold || 80) ? (
                    <Chip label="تحذير" color="warning" size="small" icon={<Warning />} />
                  ) : (
                    <Chip label="جيد" color="success" size="small" icon={<TrendingUp />} />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Budget Dialog */}
      <BudgetDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedBudget(undefined);
        }}
        onSuccess={() => {
          loadBudgets();
        }}
        existingBudget={selectedBudget}
      />
    </Box>
  );
}