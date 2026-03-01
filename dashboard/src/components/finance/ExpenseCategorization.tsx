import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  useTheme,
  alpha,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Category as CategoryIcon,
  LocalOffer,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toDateSafe } from '../../utils/dateUtils';
import type { FinancialTransaction } from '../../types/finance.types';

interface ExpenseCategorizationProps {
  transactions: FinancialTransaction[];
  onUpdateTransaction: (transactionId: string, updates: Partial<FinancialTransaction>) => Promise<void>;
  onBulkCategorize: (transactionIds: string[], category: string) => Promise<void>;
}

interface CategoryDialogData {
  open: boolean;
  mode: 'single' | 'bulk';
  transactionIds: string[];
  currentCategory?: string;
}

const defaultCategories = [
  { id: 'rent', nameEn: 'Rent', nameAr: 'الإيجار', type: 'expense' },
  { id: 'salaries', nameEn: 'Salaries', nameAr: 'الرواتب', type: 'expense' },
  { id: 'utilities', nameEn: 'Utilities', nameAr: 'المرافق', type: 'expense' },
  { id: 'supplies', nameEn: 'Supplies', nameAr: 'المستلزمات', type: 'expense' },
  { id: 'marketing', nameEn: 'Marketing', nameAr: 'التسويق', type: 'expense' },
  { id: 'equipment', nameEn: 'Equipment', nameAr: 'المعدات', type: 'expense' },
  { id: 'maintenance', nameEn: 'Maintenance', nameAr: 'الصيانة', type: 'expense' },
  { id: 'insurance', nameEn: 'Insurance', nameAr: 'التأمين', type: 'expense' },
  { id: 'taxes', nameEn: 'Taxes', nameAr: 'الضرائب', type: 'expense' },
  { id: 'other', nameEn: 'Other', nameAr: 'أخرى', type: 'expense' },
  { id: 'sales', nameEn: 'Sales', nameAr: 'المبيعات', type: 'income' },
  { id: 'services', nameEn: 'Services', nameAr: 'الخدمات', type: 'income' },
  { id: 'products', nameEn: 'Products', nameAr: 'المنتجات', type: 'income' },
  { id: 'investments', nameEn: 'Investments', nameAr: 'الاستثمارات', type: 'income' },
];

export default function ExpenseCategorization({
  transactions,
  onUpdateTransaction,
  onBulkCategorize,
}: ExpenseCategorizationProps) {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogData>({
    open: false,
    mode: 'single',
    transactionIds: [],
  });
  const [selectedCategory, setSelectedCategory] = useState('');

  // Filter uncategorized transactions
  const uncategorizedTransactions = useMemo(() => {
    return transactions.filter(t => !t.category || t.category === 'uncategorized');
  }, [transactions]);

  // Search filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return uncategorizedTransactions;
    
    const query = searchQuery.toLowerCase();
    return uncategorizedTransactions.filter(t => 
      t.description?.toLowerCase().includes(query) ||
      t.notes?.toLowerCase().includes(query) ||
      t.paymentMethod?.toLowerCase().includes(query)
    );
  }, [uncategorizedTransactions, searchQuery]);

  // Category statistics
  const categoryStats = useMemo(() => {
    const stats = new Map<string, { count: number; total: number; type: 'income' | 'expense' }>();
    
    transactions.forEach(t => {
      if (t.category && t.category !== 'uncategorized') {
        const existing = stats.get(t.category) || { count: 0, total: 0, type: t.type };
        stats.set(t.category, {
          count: existing.count + 1,
          total: existing.total + t.totalAmount,
          type: t.type,
        });
      }
    });
    
    return Array.from(stats.entries()).map(([category, data]) => ({
      category,
      ...data,
      name: defaultCategories.find(c => c.id === category)?.[isRTL ? 'nameAr' : 'nameEn'] || category,
    }));
  }, [transactions, isRTL]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSelectTransaction = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTransactions.size === filteredTransactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  const handleOpenCategoryDialog = (mode: 'single' | 'bulk', transactionIds: string[], currentCategory?: string) => {
    setCategoryDialog({
      open: true,
      mode,
      transactionIds,
      currentCategory,
    });
    setSelectedCategory(currentCategory || '');
  };

  const handleCloseCategoryDialog = () => {
    setCategoryDialog({
      open: false,
      mode: 'single',
      transactionIds: [],
    });
    setSelectedCategory('');
  };

  const handleSaveCategory = async () => {
    if (!selectedCategory) return;

    try {
      if (categoryDialog.mode === 'single' && categoryDialog.transactionIds.length === 1) {
        await onUpdateTransaction(categoryDialog.transactionIds[0], { category: selectedCategory });
      } else {
        await onBulkCategorize(categoryDialog.transactionIds, selectedCategory);
      }
      
      handleCloseCategoryDialog();
      setSelectedTransactions(new Set());
    } catch (error) {
      console.error('Error updating category:', error);
    }
  };

  const handleBulkCategorize = () => {
    const transactionIds = Array.from(selectedTransactions);
    if (transactionIds.length > 0) {
      handleOpenCategoryDialog('bulk', transactionIds);
    }
  };

  return (
    <Box>
      {/* Category Statistics */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {isRTL ? 'إحصائيات الفئات' : 'Category Statistics'}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
          {categoryStats.map((stat) => (
            <Paper
              key={stat.category}
              sx={{
                p: 2,
                flex: '1 1 200px',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: alpha(stat.type === 'income' ? theme.palette.success.main : theme.palette.error.main, 0.05),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CategoryIcon
                  sx={{
                    color: stat.type === 'income' ? 'success.main' : 'error.main',
                    mr: 1,
                  }}
                />
                <Typography variant="subtitle2">
                  {stat.name}
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(stat.total)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stat.count} {isRTL ? 'معاملة' : 'transactions'}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Paper>

      {/* Uncategorized Transactions */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6">
              {isRTL ? 'المعاملات غير المصنفة' : 'Uncategorized Transactions'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {uncategorizedTransactions.length} {isRTL ? 'معاملة تحتاج إلى تصنيف' : 'transactions need categorization'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder={isRTL ? 'بحث...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            {selectedTransactions.size > 0 && (
              <Button
                variant="contained"
                startIcon={<LocalOffer />}
                onClick={handleBulkCategorize}
              >
                {isRTL ? `تصنيف (${selectedTransactions.size})` : `Categorize (${selectedTransactions.size})`}
              </Button>
            )}
          </Box>
        </Box>

        {filteredTransactions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CategoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {isRTL ? 'لا توجد معاملات غير مصنفة' : 'No Uncategorized Transactions'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isRTL ? 'جميع المعاملات تم تصنيفها' : 'All transactions have been categorized'}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.size === filteredTransactions.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell>{isRTL ? 'التاريخ' : 'Date'}</TableCell>
                  <TableCell>{isRTL ? 'الوصف' : 'Description'}</TableCell>
                  <TableCell>{isRTL ? 'النوع' : 'Type'}</TableCell>
                  <TableCell align="right">{isRTL ? 'المبلغ' : 'Amount'}</TableCell>
                  <TableCell>{isRTL ? 'طريقة الدفع' : 'Payment'}</TableCell>
                  <TableCell align="center">{isRTL ? 'إجراءات' : 'Actions'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow 
                    key={transaction.id}
                    selected={selectedTransactions.has(transaction.id)}
                    hover
                  >
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.has(transaction.id)}
                        onChange={() => handleSelectTransaction(transaction.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {format(toDateSafe(transaction.date), 'dd/MM/yyyy', { locale })}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {transaction.description || (isRTL ? 'بدون وصف' : 'No description')}
                        </Typography>
                        {transaction.notes && (
                          <Typography variant="caption" color="text.secondary">
                            {transaction.notes}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={transaction.type === 'income' ? (isRTL ? 'دخل' : 'Income') : (isRTL ? 'مصروف' : 'Expense')}
                        color={transaction.type === 'income' ? 'success' : 'error'}
                        icon={transaction.type === 'income' ? <TrendingUp /> : <TrendingDown />}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        fontWeight="medium"
                        color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                      >
                        {formatCurrency(transaction.totalAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {transaction.paymentMethod?.replace('_', ' ').toUpperCase() || '-'}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenCategoryDialog('single', [transaction.id], transaction.category)}
                      >
                        <LocalOffer />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Category Dialog */}
      <Dialog open={categoryDialog.open} onClose={handleCloseCategoryDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {categoryDialog.mode === 'single' 
            ? (isRTL ? 'تصنيف المعاملة' : 'Categorize Transaction')
            : (isRTL ? `تصنيف ${categoryDialog.transactionIds.length} معاملة` : `Categorize ${categoryDialog.transactionIds.length} Transactions`)
          }
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>{isRTL ? 'الفئة' : 'Category'}</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              label={isRTL ? 'الفئة' : 'Category'}
            >
              {defaultCategories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      size="small"
                      label={cat.type === 'income' ? (isRTL ? 'دخل' : 'Income') : (isRTL ? 'مصروف' : 'Expense')}
                      color={cat.type === 'income' ? 'success' : 'error'}
                    />
                    <Typography>{isRTL ? cat.nameAr : cat.nameEn}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryDialog}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSaveCategory} variant="contained" disabled={!selectedCategory}>
            {isRTL ? 'حفظ' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}