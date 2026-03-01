import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Chip,
  LinearProgress,
  useTheme,
  alpha,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
  AccountBalance,
  Assessment,
  FileDownload,
  Refresh,
  DateRange,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Timeline,
  Category,
  Dashboard,
  AccountBalanceWallet,
  CompareArrows,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfYear, endOfYear, subDays } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { financeService } from '../../services/finance.service';
import FinancialKPIDashboard from '../../components/finance/FinancialKPIDashboard';
import ProfitLossStatement from '../../components/finance/ProfitLossStatement';
import CashFlowChart from '../../components/finance/CashFlowChart';
import ExpenseCategorization from '../../components/finance/ExpenseCategorization';
import type {
  FinancialTransaction,
  FinancialAccount,
  TransactionType,
  PaymentMethod,
} from '../../types/finance.types';

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
      id={`finance-tabpanel-${index}`}
      aria-labelledby={`finance-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const FinanceReportsPageEnhanced: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';

  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [previousTransactions, setPreviousTransactions] = useState<FinancialTransaction[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  useEffect(() => {
    if (currentUser?.companyId) {
      loadFinancialData();
    }
  }, [currentUser, currentBranch, selectedPeriod]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (selectedPeriod) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        previousStartDate = subDays(startDate, 1);
        previousEndDate = subDays(endDate, 1);
        break;
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        previousStartDate = startOfWeek(subDays(now, 7));
        previousEndDate = endOfWeek(subDays(now, 7));
        break;
      case 'month':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        previousStartDate = startOfMonth(subMonths(now, 1));
        previousEndDate = endOfMonth(subMonths(now, 1));
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        previousStartDate = startOfYear(subMonths(now, 12));
        previousEndDate = endOfYear(subMonths(now, 12));
        break;
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        previousStartDate = startOfMonth(subMonths(lastMonth, 1));
        previousEndDate = endOfMonth(subMonths(lastMonth, 1));
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        previousStartDate = startOfMonth(subMonths(now, 1));
        previousEndDate = endOfMonth(subMonths(now, 1));
    }

    return { startDate, endDate, previousStartDate, previousEndDate };
  };

  const loadFinancialData = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);
      const { startDate, endDate, previousStartDate, previousEndDate } = getDateRange();

      // Load current period transactions
      const currentResult = await financeService.getTransactions(
        currentUser.companyId,
        {
          branchId: currentBranch?.id,
          startDate,
          endDate,
        }
      );

      // Load previous period transactions
      const previousResult = await financeService.getTransactions(
        currentUser.companyId,
        {
          branchId: currentBranch?.id,
          startDate: previousStartDate,
          endDate: previousEndDate,
        }
      );

      // Load accounts
      const accountsData = await financeService.getAccounts(currentUser.companyId);

      setTransactions(currentResult.transactions || []);
      setPreviousTransactions(previousResult.transactions || []);
      setAccounts(accountsData || []);

    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: 'daily' | 'weekly' | 'monthly' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleUpdateTransaction = async (transactionId: string, updates: Partial<FinancialTransaction>) => {
    if (!currentUser?.companyId) return;

    try {
      await financeService.updateTransaction(currentUser.companyId, transactionId, updates);
      await loadFinancialData(); // Reload data
    } catch (error) {
      console.error('Error updating transaction:', error);
    }
  };

  const handleBulkCategorize = async (transactionIds: string[], category: string) => {
    if (!currentUser?.companyId) return;

    try {
      // Update each transaction
      await Promise.all(
        transactionIds.map(id => 
          financeService.updateTransaction(currentUser.companyId, id, { category })
        )
      );
      await loadFinancialData(); // Reload data
    } catch (error) {
      console.error('Error bulk categorizing:', error);
    }
  };

  const { startDate, endDate } = getDateRange();

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {isRTL ? 'التقارير المالية المتقدمة' : 'Advanced Financial Reports'}
        </Typography>
        <LinearProgress sx={{ my: 3 }} />
        <Typography color="text.secondary" align="center">
          {isRTL ? 'جاري تحميل البيانات المالية...' : 'Loading financial data...'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {isRTL ? 'التقارير المالية المتقدمة' : 'Advanced Financial Reports'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isRTL 
              ? `فرع ${currentBranch?.name || 'الرئيسي'} - ${format(new Date(), 'dd MMMM yyyy')}`
              : `${currentBranch?.name || 'Main'} Branch - ${format(new Date(), 'MMMM dd, yyyy')}`
            }
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{isRTL ? 'الفترة' : 'Period'}</InputLabel>
            <Select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              label={isRTL ? 'الفترة' : 'Period'}
            >
              <MenuItem value="today">{isRTL ? 'اليوم' : 'Today'}</MenuItem>
              <MenuItem value="week">{isRTL ? 'هذا الأسبوع' : 'This Week'}</MenuItem>
              <MenuItem value="month">{isRTL ? 'هذا الشهر' : 'This Month'}</MenuItem>
              <MenuItem value="last-month">{isRTL ? 'الشهر الماضي' : 'Last Month'}</MenuItem>
              <MenuItem value="year">{isRTL ? 'هذا العام' : 'This Year'}</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={loadFinancialData}>
            <Refresh />
          </IconButton>
          <Button startIcon={<FileDownload />} variant="outlined">
            {isRTL ? 'تصدير' : 'Export'}
          </Button>
        </Box>
      </Box>

      {/* Enhanced Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={isRTL ? 'لوحة المؤشرات' : 'KPI Dashboard'} 
            icon={<Dashboard />} 
            iconPosition="start"
          />
          <Tab 
            label={isRTL ? 'بيان الأرباح والخسائر' : 'Profit & Loss'} 
            icon={<AccountBalance />} 
            iconPosition="start"
          />
          <Tab 
            label={isRTL ? 'التدفق النقدي' : 'Cash Flow'} 
            icon={<Timeline />} 
            iconPosition="start"
          />
          <Tab 
            label={isRTL ? 'تصنيف المصروفات' : 'Expense Categorization'} 
            icon={<Category />} 
            iconPosition="start"
          />
          <Tab 
            label={isRTL ? 'المقارنات' : 'Comparisons'} 
            icon={<CompareArrows />} 
            iconPosition="start"
          />
        </Tabs>

        {/* KPI Dashboard Tab */}
        <TabPanel value={tabValue} index={0}>
          <FinancialKPIDashboard
            transactions={transactions}
            previousPeriodTransactions={previousTransactions}
            startDate={startDate}
            endDate={endDate}
          />
        </TabPanel>

        {/* Profit & Loss Tab */}
        <TabPanel value={tabValue} index={1}>
          <ProfitLossStatement
            transactions={transactions}
            startDate={startDate}
            endDate={endDate}
            previousPeriodTransactions={previousTransactions}
          />
        </TabPanel>

        {/* Cash Flow Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
              >
                <ToggleButton value="daily">
                  {isRTL ? 'يومي' : 'Daily'}
                </ToggleButton>
                <ToggleButton value="weekly">
                  {isRTL ? 'أسبوعي' : 'Weekly'}
                </ToggleButton>
                <ToggleButton value="monthly">
                  {isRTL ? 'شهري' : 'Monthly'}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <CashFlowChart
              transactions={transactions}
              startDate={startDate}
              endDate={endDate}
              viewMode={viewMode}
            />
          </Box>
        </TabPanel>

        {/* Expense Categorization Tab */}
        <TabPanel value={tabValue} index={3}>
          <ExpenseCategorization
            transactions={transactions}
            onUpdateTransaction={handleUpdateTransaction}
            onBulkCategorize={handleBulkCategorize}
          />
        </TabPanel>

        {/* Comparisons Tab */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            {/* Period Comparison */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {isRTL ? 'مقارنة الفترات' : 'Period Comparison'}
                </Typography>
                <Box sx={{ mt: 3 }}>
                  {/* Current Period */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {isRTL ? 'الفترة الحالية' : 'Current Period'}
                    </Typography>
                    <Typography variant="h4">
                      {new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
                        style: 'currency',
                        currency: 'EGP',
                      }).format(
                        transactions
                          .filter(t => t.type === 'income')
                          .reduce((sum, t) => sum + t.totalAmount, 0)
                      )}
                    </Typography>
                  </Box>
                  {/* Previous Period */}
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      {isRTL ? 'الفترة السابقة' : 'Previous Period'}
                    </Typography>
                    <Typography variant="h4" color="text.secondary">
                      {new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
                        style: 'currency',
                        currency: 'EGP',
                      }).format(
                        previousTransactions
                          .filter(t => t.type === 'income')
                          .reduce((sum, t) => sum + t.totalAmount, 0)
                      )}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Account Balances */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {isRTL ? 'أرصدة الحسابات' : 'Account Balances'}
                </Typography>
                <Stack spacing={2} sx={{ mt: 3 }}>
                  {accounts.map((account) => (
                    <Box key={account.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalanceWallet color="primary" />
                        <Typography>{account.name}</Typography>
                      </Box>
                      <Typography variant="h6" fontWeight="bold">
                        {new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
                          style: 'currency',
                          currency: 'EGP',
                        }).format(account.currentBalance || 0)}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default FinanceReportsPageEnhanced;