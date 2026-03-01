import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  Menu,
  ListItemIcon,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Payment,
  AccountBalance,
  CreditCard,
  AccountBalanceWallet,
  LocalAtm,
  Download,
  Search,
  AttachMoney,
  Person,
  Schedule,
  Cancel,
  Pending,
  MoneyOff,
  MoreVert,
  Print,
  Delete,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { financeService } from '../../services/finance.service';
import { clientService } from '../../services/client.service';
import type {
  FinancialTransaction,
  TransactionType,
  FinancialAccount,
  TransactionCategory,
} from '../../types/finance.types';
import type { Client } from '../../services/client.service';
import TransferDialog from '../../components/finance/TransferDialog';
import NewExpenseDialog from '../../components/finance/expense/NewExpenseDialog';
import { toDateSafe } from '../../utils/dateUtils';


// Income categories - kept for display purposes only
const incomeCategories: TransactionCategory[] = [
  { id: 'service', name: 'Service', nameAr: 'خدمة', icon: '✂️', color: '#27AE60' },
  { id: 'product', name: 'Product Sale', nameAr: 'بيع منتج', icon: '🛍️', color: '#E74C3C' },
  { id: 'appointment', name: 'Appointment', nameAr: 'موعد', icon: '📅', color: '#3498DB' },
  { id: 'package', name: 'Package', nameAr: 'باقة', icon: '🎁', color: '#9B59B6' },
  { id: 'membership', name: 'Membership', nameAr: 'عضوية', icon: '💳', color: '#F39C12' },
  { id: 'other', name: 'Other', nameAr: 'أخرى', icon: '💵', color: '#95A5A6' },
];

// Expense categories - kept for display purposes only
const expenseCategories: TransactionCategory[] = [
  { id: 'salary', name: 'Salary', nameAr: 'مرتبات', icon: '💰', color: '#FF6B6B' },
  { id: 'rent', name: 'Rent', nameAr: 'إيجار', icon: '🏠', color: '#4ECDC4' },
  { id: 'utilities', name: 'Utilities', nameAr: 'مرافق', icon: '💡', color: '#45B7D1' },
  { id: 'supplies', name: 'Supplies', nameAr: 'مستلزمات', icon: '📦', color: '#F7DC6F' },
  { id: 'marketing', name: 'Marketing', nameAr: 'تسويق', icon: '📢', color: '#BB8FCE' },
  { id: 'maintenance', name: 'Maintenance', nameAr: 'صيانة', icon: '🔧', color: '#85C1E2' },
  { id: 'other', name: 'Other', nameAr: 'أخرى', icon: '📌', color: '#AAB7B8' },
];

const FinanceTransactionsPage: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';

  // State
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<FinancialTransaction | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    dateRange: { start: new Date(new Date().setDate(1)), end: new Date() },
    type: 'all' as 'all' | TransactionType,
    accountId: '',
    categoryId: '',
    search: '',
    status: 'all' as 'all' | 'completed' | 'pending' | 'cancelled',
  });


  // Load data
  useEffect(() => {
    if (currentUser?.companyId) {
      loadData();
    }
  }, [currentUser?.companyId, currentBranch?.id, filters]);

  const loadData = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);

      // Load accounts
      const accountsData = await financeService.getAccounts(
        currentUser.companyId,
        { branchId: currentBranch?.id }
      );
      setAccounts(accountsData);

      // Load transactions
      const { transactions: transactionsData } = await financeService.getTransactions(
        currentUser.companyId,
        {
          branchId: currentBranch?.id,
          startDate: filters.dateRange.start,
          endDate: filters.dateRange.end,
          type: filters.type === 'all' ? undefined : filters.type,
          accountId: filters.accountId || undefined,
          categoryId: filters.categoryId || undefined,
        }
      );
      setTransactions(transactionsData);

      // Load clients for display
      const { clients: clientsData } = await clientService.getClients(currentUser.companyId);
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleTransferSuccess = () => {
    setTransferDialogOpen(false);
    loadData();
  };

  const handleExpenseSuccess = () => {
    setExpenseDialogOpen(false);
    loadData();
  };

  // Get filtered transactions
  const getFilteredTransactions = () => {
    return transactions.filter(transaction => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const client = clients.find(c => c.id === transaction.clientId);
        const matchesSearch = 
          transaction.description?.toLowerCase().includes(searchLower) ||
          transaction.descriptionAr?.toLowerCase().includes(searchLower) ||
          client?.name.toLowerCase().includes(searchLower) ||
          transaction.tags?.some(tag => tag.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== 'all' && transaction.status !== filters.status) {
        return false;
      }

      return true;
    });
  };

  // Get transaction icon
  const getTransactionIcon = (transaction: FinancialTransaction) => {
    const account = accounts.find(a => a.id === transaction.accountId);
    if (account?.type === 'cash' || account?.type === 'petty_cash') return <LocalAtm />;
    if (account?.type === 'bank') return <AccountBalance />;
    if (account?.type === 'credit_card') return <CreditCard />;
    if (account?.type === 'digital_wallet') return <AccountBalanceWallet />;
    return <Payment />;
  };

  // Get category for display
  const getCategory = (categoryId: string, type: TransactionType) => {
    const categories = type === 'expense' ? expenseCategories : incomeCategories;
    return categories.find(c => c.id === categoryId);
  };

  // Calculate totals
  const calculateTotals = () => {
    const filtered = getFilteredTransactions();
    const income = filtered
      .filter(t => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const expenses = filtered
      .filter(t => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    const transfers = filtered
      .filter(t => t.type === 'transfer' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);

    return { income, expenses, transfers, net: income - expenses };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="xl" sx={{ mt: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h4" component="h1">
              {isRTL ? 'المعاملات المالية' : 'Financial Transactions'}
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => {
                  // TODO: Export transactions
                }}
              >
                {isRTL ? 'تصدير' : 'Export'}
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<MoneyOff />}
                onClick={() => setExpenseDialogOpen(true)}
              >
                {isRTL ? 'إضافة مصروف' : 'Add Expense'}
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SwapHoriz />}
                onClick={() => setTransferDialogOpen(true)}
              >
                {isRTL ? 'تحويل' : 'Transfer'}
              </Button>
            </Stack>
          </Stack>

          {/* Stats Cards */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
            <Box>
              <Card>
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <TrendingUp color="success" />
                      <Typography variant="h5" color="success.main">
                        +{totals.income.toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'الإيرادات' : 'Income'}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            <Box>
              <Card>
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <TrendingDown color="error" />
                      <Typography variant="h5" color="error.main">
                        -{totals.expenses.toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'المصروفات' : 'Expenses'}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            <Box>
              <Card>
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <SwapHoriz color="primary" />
                      <Typography variant="h5" color="primary.main">
                        {totals.transfers.toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'التحويلات' : 'Transfers'}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            <Box>
              <Card sx={{ bgcolor: totals.net >= 0 ? 'success.main' : 'error.main', color: 'white' }}>
                <CardContent>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <AttachMoney sx={{ color: 'white' }} />
                      <Typography variant="h5" sx={{ color: 'white' }}>
                        {totals.net >= 0 ? '+' : ''}{totals.net.toLocaleString()}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                      {isRTL ? 'صافي الربح' : 'Net Profit'}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3, overflow: 'visible' }}>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'center',
              '& > *': {
                minWidth: 0,
              }
            }}>
              {/* Date Range */}
              <Box sx={{ 
                display: 'flex', 
                gap: 1,
                flex: { xs: '1 1 100%', md: '0 1 280px' }
              }}>
                <DatePicker
                  label={isRTL ? 'من' : 'From'}
                  value={filters.dateRange.start}
                  onChange={(newValue) => setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange, start: newValue || new Date() }
                  })}
                  slotProps={{ 
                    textField: { 
                      size: 'small', 
                      fullWidth: true,
                      sx: { bgcolor: 'background.paper' }
                    } 
                  }}
                />
                <DatePicker
                  label={isRTL ? 'إلى' : 'To'}
                  value={filters.dateRange.end}
                  onChange={(newValue) => setFilters({
                    ...filters,
                    dateRange: { ...filters.dateRange, end: newValue || new Date() }
                  })}
                  slotProps={{ 
                    textField: { 
                      size: 'small', 
                      fullWidth: true,
                      sx: { bgcolor: 'background.paper' }
                    } 
                  }}
                />
              </Box>

              {/* Type Toggle */}
              <Box sx={{ flex: { xs: '1 1 100%', sm: '0 1 auto' } }}>
                <ToggleButtonGroup
                  value={filters.type}
                  exclusive
                  onChange={(_, newType) => setFilters({ ...filters, type: newType || 'all' })}
                  size="small"
                  sx={{ 
                    height: '40px',
                    '& .MuiToggleButton-root': {
                      px: { xs: 1, sm: 2 },
                      fontSize: { xs: '0.75rem', sm: '0.875rem' }
                    }
                  }}
                >
                  <ToggleButton value="all">{isRTL ? 'الكل' : 'All'}</ToggleButton>
                  <ToggleButton value="income" color="success">
                    <TrendingUp fontSize="small" sx={{ mr: 0.5 }} />
                    {isRTL ? 'إيرادات' : 'Income'}
                  </ToggleButton>
                  <ToggleButton value="expense" color="error">
                    <TrendingDown fontSize="small" sx={{ mr: 0.5 }} />
                    {isRTL ? 'مصروفات' : 'Expenses'}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Account Select */}
              <Box sx={{ flex: { xs: '1 1 45%', sm: '0 1 180px' } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{isRTL ? 'الحساب' : 'Account'}</InputLabel>
                  <Select
                    value={filters.accountId}
                    onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
                    label={isRTL ? 'الحساب' : 'Account'}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <MenuItem value="">{isRTL ? 'جميع الحسابات' : 'All Accounts'}</MenuItem>
                    {accounts.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        {isRTL ? account.nameAr : account.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Status Select */}
              <Box sx={{ flex: { xs: '1 1 45%', sm: '0 1 140px' } }}>
                <FormControl fullWidth size="small">
                  <InputLabel>{isRTL ? 'الحالة' : 'Status'}</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                    label={isRTL ? 'الحالة' : 'Status'}
                    sx={{ bgcolor: 'background.paper' }}
                  >
                    <MenuItem value="all">{isRTL ? 'جميع الحالات' : 'All Status'}</MenuItem>
                    <MenuItem value="completed">{isRTL ? 'مكتملة' : 'Completed'}</MenuItem>
                    <MenuItem value="pending">{isRTL ? 'معلقة' : 'Pending'}</MenuItem>
                    <MenuItem value="cancelled">{isRTL ? 'ملغية' : 'Cancelled'}</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Search Field */}
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 200px' } }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={isRTL ? 'بحث...' : 'Search...'}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  sx={{ bgcolor: 'background.paper' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Transactions List */}
        <List>
          {getFilteredTransactions().map((transaction) => {
            const account = accounts.find(a => a.id === transaction.accountId);
            const client = clients.find(c => c.id === transaction.clientId);
            const category = transaction.categoryId ? getCategory(transaction.categoryId, transaction.type) : null;

            return (
              <React.Fragment key={transaction.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ListItem
                    sx={{
                      bgcolor: 'background.paper',
                      mb: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: transaction.type === 'income' ? 'success.light' :
                                  transaction.type === 'expense' ? 'error.light' : 'primary.light',
                        }}
                      >
                        {category ? (
                          <span style={{ fontSize: 24 }}>{category.icon}</span>
                        ) : (
                          getTransactionIcon(transaction)
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography variant="body1">
                            {transaction.description || (category ? (isRTL ? category.nameAr : category.name) : transaction.type)}
                          </Typography>
                          {client && (
                            <Chip
                              icon={<Person />}
                              label={client.name}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          {transaction.status !== 'completed' && (
                            <Chip
                              label={transaction.status}
                              size="small"
                              color={transaction.status === 'pending' ? 'warning' : 'error'}
                              icon={transaction.status === 'pending' ? <Pending /> : <Cancel />}
                            />
                          )}
                          {transaction.isRecurring && (
                            <Chip
                              label={isRTL ? 'متكرر' : 'Recurring'}
                              size="small"
                              color="primary"
                              variant="outlined"
                              icon={<Schedule />}
                            />
                          )}
                        </Stack>
                      }
                      secondary={
                        <Box component="div">
                          <Stack spacing={0.5}>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Typography component="span" variant="body2" color="text.secondary">
                                {account && (isRTL ? account.nameAr : account.name)}
                              </Typography>
                              <Typography component="span" variant="caption" color="text.secondary">
                                {toDateSafe(transaction.date).toLocaleDateString()}
                              </Typography>
                            </Stack>
                            {transaction.tags && transaction.tags.length > 0 && (
                              <Stack direction="row" spacing={0.5}>
                                {transaction.tags.map((tag, index) => (
                                  <Chip key={index} label={tag} size="small" variant="outlined" />
                                ))}
                              </Stack>
                            )}
                          </Stack>
                        </Box>
                      }
                      primaryTypographyProps={{ component: 'div' }}
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                    <ListItemSecondaryAction>
                      <Stack alignItems="flex-end" spacing={1}>
                        <Typography
                          variant="h6"
                          color={transaction.type === 'income' ? 'success.main' : transaction.type === 'expense' ? 'error.main' : 'primary.main'}
                        >
                          {transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '-' : ''}
                          {transaction.amount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setSelectedTransaction(transaction);
                          }}
                        >
                          <MoreVert />
                        </IconButton>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                </motion.div>
              </React.Fragment>
            );
          })}
        </List>

        {getFilteredTransactions().length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Receipt sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {isRTL ? 'لا توجد معاملات' : 'No transactions found'}
            </Typography>
          </Box>
        )}

        {/* Transfer Dialog */}
        <TransferDialog
          open={transferDialogOpen}
          onClose={() => setTransferDialogOpen(false)}
          onSuccess={handleTransferSuccess}
          accounts={accounts}
        />

        {/* Expense Dialog */}
        <NewExpenseDialog
          open={expenseDialogOpen}
          onClose={() => setExpenseDialogOpen(false)}
          onSuccess={handleExpenseSuccess}
        />

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => {
            setAnchorEl(null);
            setSelectedTransaction(null);
          }}
        >
          <MenuItem
            onClick={() => {
              // TODO: Print receipt
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <Print fontSize="small" />
            </ListItemIcon>
            <ListItemText>{isRTL ? 'طباعة' : 'Print'}</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              // TODO: Delete transaction
              setAnchorEl(null);
            }}
            disabled
          >
            <ListItemIcon>
              <Delete fontSize="small" />
            </ListItemIcon>
            <ListItemText>{isRTL ? 'حذف' : 'Delete'}</ListItemText>
          </MenuItem>
        </Menu>
      </Container>
    </LocalizationProvider>
  );
};

export default FinanceTransactionsPage;