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
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  TablePagination,
  Avatar,
} from '@mui/material';
import { 
  Add, 
  Receipt, 
  Search,
  Edit,
  Delete,
  AttachMoney,
  CalendarMonth,
  Business,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { financeService } from '../../../services/finance.service';
import { expenseService } from '../../../services/expense.service';
import { contactService } from '../../../services/contact.service';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toDateSafe } from '../../../utils/dateUtils';

interface ExpenseListProps {
  onAddExpense?: () => void;
}

export default function ExpenseList({ onAddExpense }: ExpenseListProps) {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    // Load expenses even without branch - we'll get all company expenses
    if (currentUser?.companyId) {
      console.log('ExpenseList: Loading expenses for company:', currentUser.companyId);
      console.log('ExpenseList: Current branch:', currentBranch);
      loadExpenses();
    }
  }, [currentUser, currentBranch]);

  const loadExpenses = async () => {
    if (!currentUser?.companyId || !currentBranch?.id) {
      console.log('ExpenseList: Waiting for branch context...', {
        hasUser: !!currentUser,
        companyId: currentUser?.companyId,
        hasBranch: !!currentBranch,
        branchId: currentBranch?.id
      });
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('ExpenseList: Loading expenses for branch:', currentBranch.id);
      console.log('ExpenseList: Company ID:', currentUser.companyId);
      
      // Load expense transactions (using the new helper method), categories, and contacts in parallel
      const [transactionsResult, categoriesData, contactsResult] = await Promise.all([
        financeService.getExpenseTransactions(currentUser.companyId, {
          branchId: currentBranch.id, // Filter by current branch
        }),
        expenseService.getCategories(currentUser.companyId),
        contactService.getContacts(currentUser.companyId, {}, 200)
      ]);
      
      console.log('Loaded expense transactions result:', transactionsResult);
      console.log('Expense transactions:', transactionsResult.transactions);
      console.log('Number of expenses found:', transactionsResult.transactions.length);
      
      setExpenses(transactionsResult.transactions);
      setCategories(categoriesData);
      setContacts(contactsResult.contacts);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (expense: any) => {
    const categoryId = expense.expenseDetails?.categoryId || expense.categoryId || expense.metadata?.categoryId;
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category ? (isRTL ? category.nameAr || category.name : category.name) : '-';
  };

  const getCategoryColor = (expense: any) => {
    const categoryId = expense.expenseDetails?.categoryId || expense.categoryId || expense.metadata?.categoryId;
    if (!categoryId) return '#gray';
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#gray';
  };

  const getContactName = (expense: any) => {
    const vendorId = expense.expenseDetails?.vendorId || expense.vendorId || expense.metadata?.vendorId;
    if (!vendorId) return '-';
    const contact = contacts.find(c => c.id === vendorId);
    return contact?.displayName || '-';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    if (isRTL) {
      switch (status) {
        case 'completed': return 'مكتمل';
        case 'cancelled': return 'ملغي';
        default: return status;
      }
    }
    return status;
  };

  const filteredExpenses = expenses.filter(expense => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    const contactName = getContactName(expense).toLowerCase();
    const categoryName = getCategoryName(expense).toLowerCase();
    const description = (expense.description || '').toLowerCase();
    const reference = (expense.reference || '').toLowerCase();
    
    return contactName.includes(searchLower) ||
           categoryName.includes(searchLower) ||
           description.includes(searchLower) ||
           reference.includes(searchLower);
  });

  const paginatedExpenses = filteredExpenses.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // For debugging - let's show what we have
  if (expenses.length === 0) {
    return (
      <Box>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Receipt sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isRTL ? 'لا توجد مصروفات' : 'No Expenses Yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {isRTL 
                ? 'ابدأ بإضافة أول مصروف لشركتك'
                : 'Start by adding your first expense'
              }
            </Typography>
            {onAddExpense && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={onAddExpense}
              >
                {isRTL ? 'إضافة مصروف' : 'Add Expense'}
              </Button>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      {/* Search and Actions Bar */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <TextField
          placeholder={isRTL ? 'البحث في المصروفات...' : 'Search expenses...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        {onAddExpense && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onAddExpense}
          >
            {isRTL ? 'مصروف جديد' : 'New Expense'}
          </Button>
        )}
      </Box>

      {/* Expenses Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{isRTL ? 'التاريخ' : 'Date'}</TableCell>
              <TableCell>{isRTL ? 'المستفيد' : 'Beneficiary'}</TableCell>
              <TableCell>{isRTL ? 'الفئة' : 'Category'}</TableCell>
              <TableCell>{isRTL ? 'الوصف' : 'Description'}</TableCell>
              <TableCell>{isRTL ? 'المبلغ' : 'Amount'}</TableCell>
              <TableCell>{isRTL ? 'الحالة' : 'Status'}</TableCell>
              <TableCell>{isRTL ? 'رقم الفاتورة' : 'Invoice #'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedExpenses.map((expense) => (
              <TableRow key={expense.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarMonth fontSize="small" color="action" />
                    {(() => {
                      try {
                        return format(toDateSafe(expense.date), 'dd/MM/yyyy', { locale: isRTL ? ar : enUS });
                      } catch (e) {
                        return '-';
                      }
                    })()}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business fontSize="small" color="action" />
                    {getContactName(expense)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getCategoryName(expense)}
                    size="small"
                    sx={{
                      bgcolor: getCategoryColor(expense),
                      color: 'white',
                    }}
                  />
                </TableCell>
                <TableCell>{expense.description || '-'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                    {expense.totalAmount?.toFixed(2) || '0.00'}
                    <Typography variant="caption" color="text.secondary">ج.م</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(expense.status || 'completed')}
                    size="small"
                    color={getStatusColor(expense.status || 'completed')}
                  />
                </TableCell>
                <TableCell>{expense.reference || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredExpenses.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={isRTL ? 'الصفوف لكل صفحة:' : 'Rows per page:'}
        />
      </TableContainer>
    </Box>
  );
}