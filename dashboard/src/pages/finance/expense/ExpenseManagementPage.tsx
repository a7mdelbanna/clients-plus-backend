import React, { useState, useEffect } from 'react';
import NewExpenseDialog from '../../../components/finance/expense/NewExpenseDialog';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Avatar,
  useTheme,
  alpha,
  Stack,
  Chip,
  Badge,
  LinearProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add,
  Receipt,
  Category,
  Store,
  TrendingUp,
  AttachMoney,
  Warning,
  CheckCircle,
  Schedule,
  CameraAlt,
  Upload,
  Description,
  Business,
  LocalShipping,
  Engineering,
  Campaign,
  AccountBalance,
  ArrowUpward,
  ArrowDownward,
  MoreVert,
  Assessment,
  Settings,
  FileDownload,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { motion } from 'framer-motion';
import ExpenseDashboard from '../../../components/finance/expense/ExpenseDashboard';
import ExpenseList from '../../../components/finance/expense/ExpenseList';
import ExpenseBudgets from '../../../components/finance/expense/ExpenseBudgets';
import { expenseService } from '../../../services/expense.service';
import { financeService } from '../../../services/finance.service';
import { contactService } from '../../../services/contact.service';
import { ContactType } from '../../../types/contact.types';
import type { ExpenseCategory, ExpenseTransaction, Vendor } from '../../../types/expense.types';
import { startOfMonth, endOfMonth } from 'date-fns';
import { CircularProgress } from '@mui/material';
import { toDateSafe } from '../../../utils/dateUtils';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`expense-tabpanel-${index}`}
      aria-labelledby={`expense-tab-${index}`}
      style={{ 
        height: '100%', 
        flex: 1, 
        overflow: 'hidden',
        display: value === index ? 'flex' : 'none',
        flexDirection: 'column'
      }}
      {...other}
    >
      {value === index && <Box sx={{ py: 3, width: '100%', height: '100%', overflow: 'auto', flex: 1 }}>{children}</Box>}
    </div>
  );
}

interface SummaryData {
  totalExpenses: number;
  expenseCount: number;
  budgetRemaining: number;
  budgetPercentage: number;
  activeContacts: number;
  newContacts: number;
  expenseChange: number;
}

const ExpenseManagementPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch, loading: branchLoading } = useBranch();
  const isRTL = theme.direction === 'rtl';

  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loading, setLoading] = useState(true);
  const [openNewExpenseDialog, setOpenNewExpenseDialog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [summaryData, setSummaryData] = useState<SummaryData>({
    totalExpenses: 0,
    expenseCount: 0,
    budgetRemaining: 0,
    budgetPercentage: 0,
    activeContacts: 0,
    newContacts: 0,
    expenseChange: 0,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Load summary data function
  const loadSummaryData = async () => {
    if (!currentUser?.companyId || !currentBranch?.id) {
      console.log('ExpenseManagementPage: Waiting for branch context...', {
        hasUser: !!currentUser,
        companyId: currentUser?.companyId,
        hasBranch: !!currentBranch,
        branchId: currentBranch?.id
      });
      return;
    }
      
      setLoading(true);
      try {
        const now = new Date();
        const startOfMonthDate = startOfMonth(now);
        const endOfMonthDate = endOfMonth(now);
        
        // Load current month expense transactions from finance service
        const result = await financeService.getExpenseTransactions(
          currentUser.companyId,
          {
            branchId: currentBranch.id,
            startDate: startOfMonthDate,
            endDate: endOfMonthDate
          }
        );
        
        const transactions = result.transactions;
        
        // Load categories for budget calculation
        const categories = await expenseService.getCategories(currentUser.companyId);
        
        // Load contacts (beneficiaries - vendors, suppliers, etc.)
        const contactsResult = await contactService.getContacts(
          currentUser.companyId,
          {
            types: [ContactType.VENDOR, ContactType.SUPPLIER],
            status: ['active', 'inactive']
          },
          100
        );
        const contacts = contactsResult.contacts;
        
        // Calculate summary metrics
        const totalExpenses = transactions.reduce((sum, t) => sum + (t.totalAmount || t.amount || 0), 0);
        const expenseCount = transactions.length; // Total number of expense transactions
        
        // Try to get active budget for this branch
        const activeBudget = await expenseService.getActiveBudget(
          currentUser.companyId,
          currentBranch.id,
          new Date()
        );
        
        let budgetRemaining = 0;
        let budgetPercentage = 0;
        
        if (activeBudget && activeBudget.totalBudget) {
          // Use actual budget from the system
          const totalSpent = totalExpenses;
          budgetRemaining = Math.max(0, activeBudget.totalBudget - totalSpent);
          budgetPercentage = activeBudget.totalBudget > 0 ? (totalSpent / activeBudget.totalBudget) * 100 : 0;
        } else {
          // No budget set - show 0
          budgetRemaining = 0;
          budgetPercentage = 0;
        }
        
        // Contact metrics
        const activeContacts = contacts.filter(c => c.status === 'active').length;
        const thisMonthStart = startOfMonth(now);
        const newContacts = contacts.filter(c => 
          c.createdAt && toDateSafe(c.createdAt) >= thisMonthStart
        ).length;
        
        // Calculate expense change (would need last month data for real calculation)
        // For now, using a placeholder
        const expenseChange = Math.floor(Math.random() * 20) - 10;
        
        setSummaryData({
          totalExpenses,
          expenseCount,
          budgetRemaining,
          budgetPercentage: Math.min(100, budgetPercentage),
          activeContacts,
          newContacts,
          expenseChange,
        });
        
      } catch (error) {
        console.error('Error loading expense summary:', error);
      } finally {
        setLoading(false);
      }
  };

  // Load summary data on component mount and when dependencies change
  useEffect(() => {
    loadSummaryData();
  }, [currentUser, currentBranch]);

  // Show loading state while contexts are initializing
  if (branchLoading || !currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show error state if required context data is missing
  if (!currentUser.companyId || !currentBranch) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          {isRTL ? 'خطأ في تحميل البيانات' : 'Data Loading Error'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isRTL 
            ? 'لا يمكن تحميل صفحة المصروفات. تأكد من إعداد الشركة والفرع بشكل صحيح.'
            : 'Cannot load expense page. Please ensure company and branch are properly configured.'
          }
        </Typography>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          {isRTL ? 'العودة للوحة الرئيسية' : 'Return to Dashboard'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, width: '100%', height: '100%', overflow: 'auto' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {isRTL ? 'إدارة المصروفات' : 'Expense Management'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isRTL 
              ? `فرع ${currentBranch?.name || 'الرئيسي'} - إدارة وتتبع جميع مصروفات الشركة`
              : `${currentBranch?.name || 'Main'} Branch - Manage and track all company expenses`
            }
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => navigate('/finance/expense/upload')}
          >
            {isRTL ? 'رفع فاتورة' : 'Upload Receipt'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            color="primary"
            onClick={() => setOpenNewExpenseDialog(true)}
          >
            {isRTL ? 'مصروف جديد' : 'New Expense'}
          </Button>
          <IconButton onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
        </Stack>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), mr: 2 }}>
                    <AttachMoney color="primary" />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'إجمالي المصروفات' : 'Total Expenses'}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {loading ? <CircularProgress size={24} /> : formatCurrency(summaryData.totalExpenses)}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <ArrowUpward color="error" fontSize="small" />
                  <Typography variant="body2" color={summaryData.expenseChange >= 0 ? "error" : "success"}>
                    {summaryData.expenseChange >= 0 ? '+' : ''}{summaryData.expenseChange}% {isRTL ? 'من الشهر الماضي' : 'from last month'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), mr: 2 }}>
                    <TrendingUp color="success" />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'الميزانية المتبقية' : 'Budget Remaining'}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {loading ? <CircularProgress size={24} /> : formatCurrency(summaryData.budgetRemaining)}
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={summaryData.budgetPercentage} 
                  sx={{ height: 8, borderRadius: 4 }}
                  color={summaryData.budgetPercentage > 90 ? 'error' : summaryData.budgetPercentage > 70 ? 'warning' : 'success'}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), mr: 2 }}>
                    <Store color="info" />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'المستفيدين النشطين' : 'Active Beneficiaries'}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold">
                      {loading ? <CircularProgress size={24} /> : summaryData.activeContacts}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {isRTL 
                    ? `${summaryData.newContacts} مستفيدين جدد هذا الشهر`
                    : `${summaryData.newContacts} new this month`
                  }
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%', height: 'calc(100vh - 400px)', display: 'flex', flexDirection: 'column' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
        >
          <Tab 
            label={isRTL ? 'نظرة عامة' : 'Overview'} 
            icon={<Assessment />}
            iconPosition="start"
          />
          <Tab 
            label={
              <Badge badgeContent={summaryData.expenseCount} color="primary">
                {isRTL ? 'المصروفات' : 'Expenses'}
              </Badge>
            }
            icon={<Receipt />}
            iconPosition="start"
          />
          <Tab 
            label={isRTL ? 'الميزانيات' : 'Budgets'} 
            icon={<AccountBalance />}
            iconPosition="start"
          />
        </Tabs>

        {/* Tab Panels */}
        <TabPanel value={tabValue} index={0}>
          <ExpenseDashboard />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <ExpenseList key={refreshKey} onAddExpense={() => setOpenNewExpenseDialog(true)} />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <ExpenseBudgets key={`budget-${refreshKey}-${tabValue}`} />
        </TabPanel>
      </Paper>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => { navigate('/finance/expense/contacts'); handleMenuClose(); }}>
          <ListItemIcon>
            <Store fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'إدارة الموردين' : 'Manage Vendors'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { navigate('/finance/expense/categories'); handleMenuClose(); }}>
          <ListItemIcon>
            <Category fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'إدارة الفئات' : 'Manage Categories'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { navigate('/finance/expense/settings'); handleMenuClose(); }}>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'الإعدادات' : 'Settings'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { navigate('/finance/expense/reports'); handleMenuClose(); }}>
          <ListItemIcon>
            <Description fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'التقارير' : 'Reports'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <FileDownload fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'تصدير البيانات' : 'Export Data'}</ListItemText>
        </MenuItem>
      </Menu>

      {/* New Expense Dialog */}
      <NewExpenseDialog
        open={openNewExpenseDialog}
        onClose={() => setOpenNewExpenseDialog(false)}
        onSuccess={() => {
          setOpenNewExpenseDialog(false);
          // Reload summary data after creating new expense
          loadSummaryData();
          // Force refresh the expense list
          setRefreshKey(prev => prev + 1);
        }}
      />
    </Box>
  );
};

export default ExpenseManagementPage;