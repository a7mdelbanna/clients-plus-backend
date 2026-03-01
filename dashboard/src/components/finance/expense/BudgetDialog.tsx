import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  AccountBalance,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { expenseService } from '../../../services/expense.service';
import { toast } from 'react-toastify';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { toDateSafe } from '../../../utils/dateUtils';
import type { Budget, CategoryBudget, ExpenseCategory } from '../../../types/expense.types';

interface BudgetDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingBudget?: Budget;
}

export default function BudgetDialog({ open, onClose, onSuccess, existingBudget }: BudgetDialogProps) {
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    period: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });

  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);

  console.log('BudgetDialog rendered, open:', open);

  useEffect(() => {
    console.log('BudgetDialog useEffect, open:', open, 'companyId:', currentUser?.companyId);
    if (open && currentUser?.companyId) {
      loadCategories();
      
      if (existingBudget) {
        // Load existing budget data
        setFormData({
          name: existingBudget.name,
          period: existingBudget.period,
          startDate: toDateSafe(existingBudget.startDate),
          endDate: toDateSafe(existingBudget.endDate),
        });
        setCategoryBudgets(existingBudget.categoryBudgets || []);
      } else {
        // Initialize new budget
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        
        setFormData({
          name: `ميزانية ${now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`,
          period: 'monthly',
          startDate: start,
          endDate: end,
        });
      }
    }
  }, [open, currentUser, existingBudget]);

  const loadCategories = async () => {
    if (!currentUser?.companyId) return;
    
    try {
      const fetchedCategories = await expenseService.getCategories(currentUser.companyId);
      setCategories(fetchedCategories);
      
      // Initialize category budgets if not editing
      if (!existingBudget) {
        const initialBudgets: CategoryBudget[] = fetchedCategories.map(cat => ({
          categoryId: cat.id!,
          categoryName: cat.name,
          categoryNameAr: cat.nameAr,
          allocatedAmount: 0,
          spentAmount: 0,
          availableAmount: 0,
          percentageUsed: 0,
          alertThreshold: 80, // Alert at 80% by default
        }));
        setCategoryBudgets(initialBudgets);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('خطأ في تحميل الفئات');
    }
  };

  const handlePeriodChange = (period: 'monthly' | 'quarterly' | 'yearly') => {
    const now = new Date();
    let start = startOfMonth(now);
    let end = endOfMonth(now);
    
    if (period === 'quarterly') {
      end = endOfMonth(addMonths(start, 2));
    } else if (period === 'yearly') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }
    
    setFormData({
      ...formData,
      period,
      startDate: start,
      endDate: end,
    });
  };

  const handleCategoryBudgetChange = (index: number, field: keyof CategoryBudget, value: any) => {
    const newBudgets = [...categoryBudgets];
    newBudgets[index] = {
      ...newBudgets[index],
      [field]: value,
    };
    
    // Calculate available amount
    if (field === 'allocatedAmount') {
      newBudgets[index].availableAmount = value - (newBudgets[index].spentAmount || 0);
      newBudgets[index].percentageUsed = value > 0 
        ? ((newBudgets[index].spentAmount || 0) / value) * 100 
        : 0;
    }
    
    setCategoryBudgets(newBudgets);
  };

  const calculateTotalBudget = () => {
    return categoryBudgets.reduce((sum, cb) => sum + (cb.allocatedAmount || 0), 0);
  };

  const handleSubmit = async () => {
    if (!currentUser?.companyId || !currentBranch?.id) {
      toast.error('معلومات الشركة أو الفرع غير متوفرة');
      return;
    }

    const totalBudget = calculateTotalBudget();
    if (totalBudget === 0) {
      toast.error('يرجى تحديد ميزانية لفئة واحدة على الأقل');
      return;
    }

    try {
      setLoading(true);

      const budgetData: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId: currentUser.companyId,
        branchId: currentBranch.id,
        name: formData.name,
        period: formData.period,
        startDate: formData.startDate,
        endDate: formData.endDate,
        categoryBudgets: categoryBudgets.filter(cb => cb.allocatedAmount > 0),
        totalBudget,
        totalAllocated: totalBudget,
        unallocated: 0,
        status: 'active',
        createdBy: currentUser.id,
      };

      if (existingBudget?.id) {
        // Update existing budget
        await expenseService.updateBudget(currentUser.companyId, existingBudget.id, budgetData);
        toast.success('تم تحديث الميزانية بنجاح');
      } else {
        // Create new budget
        await expenseService.createBudget(budgetData);
        toast.success('تم إنشاء الميزانية بنجاح');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving budget:', error);
      toast.error(error.message || 'حدث خطأ في حفظ الميزانية');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalance color="primary" />
            <Typography variant="h6">
              {existingBudget ? 'تعديل الميزانية' : 'إنشاء ميزانية جديدة'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              المعلومات الأساسية
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="اسم الميزانية"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>الفترة</InputLabel>
                  <Select
                    value={formData.period}
                    onChange={(e) => handlePeriodChange(e.target.value as any)}
                    label="الفترة"
                  >
                    <MenuItem value="monthly">شهرية</MenuItem>
                    <MenuItem value="quarterly">ربع سنوية</MenuItem>
                    <MenuItem value="yearly">سنوية</MenuItem>
                  </Select>
                </FormControl>
                
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="تاريخ البداية"
                    value={formData.startDate}
                    onChange={(newValue) => {
                      if (newValue) setFormData({ ...formData, startDate: newValue });
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: { flex: 1 },
                      },
                    }}
                  />
                  <DatePicker
                    label="تاريخ النهاية"
                    value={formData.endDate}
                    onChange={(newValue) => {
                      if (newValue) setFormData({ ...formData, endDate: newValue });
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: { flex: 1 },
                      },
                    }}
                  />
                </LocalizationProvider>
              </Box>
            </Box>
          </Box>

          {/* Category Budgets */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              ميزانيات الفئات
            </Typography>
            
            {categoryBudgets.length === 0 ? (
              <Alert severity="info">
                جاري تحميل الفئات...
              </Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الفئة</TableCell>
                      <TableCell>الميزانية المخصصة</TableCell>
                      <TableCell>حد التنبيه (%)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryBudgets.map((cb, index) => (
                      <TableRow key={cb.categoryId}>
                        <TableCell>
                          <Typography variant="body2">
                            {cb.categoryNameAr || cb.categoryName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={cb.allocatedAmount}
                            onChange={(e) => handleCategoryBudgetChange(
                              index, 
                              'allocatedAmount', 
                              parseFloat(e.target.value) || 0
                            )}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">ج.م</InputAdornment>,
                            }}
                            sx={{ width: 150 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={cb.alertThreshold}
                            onChange={(e) => handleCategoryBudgetChange(
                              index, 
                              'alertThreshold', 
                              parseFloat(e.target.value) || 80
                            )}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                            sx={{ width: 100 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>إجمالي الميزانية:</span>
                <span>{calculateTotalBudget().toFixed(2)} ج.م</span>
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || calculateTotalBudget() === 0}
          startIcon={loading ? null : <AccountBalance />}
        >
          {loading ? 'جاري الحفظ...' : existingBudget ? 'تحديث الميزانية' : 'إنشاء الميزانية'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}