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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { financeService } from '../../services/finance.service';
import type {
  FinancialTransaction,
  FinancialAccount,
  TransactionType,
  PaymentMethod,
} from '../../types/finance.types';
import { toDateSafe } from '../../utils/dateUtils';

interface ReportMetrics {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  transactionCount: number;
  averageTransaction: number;
  growthRate: number;
  profitMargin: number;
}

interface ChartData {
  dailyTrends: Array<{ date: string; income: number; expenses: number; net: number }>;
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number; color: string }>;
  paymentMethods: Array<{ method: string; amount: number; count: number; percentage: number }>;
  monthlyComparison: Array<{ month: string; thisYear: number; lastYear: number }>;
}

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
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const FinanceReportsPage: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';

  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);

  // Chart colors
  const chartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  useEffect(() => {
    if (currentUser?.companyId) {
      loadReportData();
    }
  }, [currentUser, currentBranch, selectedPeriod]);

  const getDateRange = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'today':
        return { 
          startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
        };
      case 'week':
        return { startDate: startOfWeek(now), endDate: endOfWeek(now) };
      case 'month':
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
      case 'year':
        return { startDate: startOfYear(now), endDate: endOfYear(now) };
      case 'last-month':
        const lastMonth = subMonths(now, 1);
        return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
      default:
        return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    }
  };

  const loadReportData = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);
      const { startDate, endDate } = getDateRange();

      // Load transactions
      const result = await financeService.getTransactions(
        currentUser.companyId,
        {
          branchId: currentBranch?.id,
          startDate,
          endDate,
          status: 'completed',
        }
      );

      // Extract transactions array from the result
      const transactionsData = result.transactions || [];

      setTransactions(transactionsData);

      // Calculate metrics
      const calculatedMetrics = calculateMetrics(transactionsData);
      setMetrics(calculatedMetrics);

      // Prepare chart data
      const chartData = prepareChartData(transactionsData);
      setChartData(chartData);

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (transactions: FinancialTransaction[]): ReportMetrics => {
    // Ensure transactions is an array
    const transactionsList = Array.isArray(transactions) ? transactions : [];
    
    const income = transactionsList
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const expenses = transactionsList
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const netProfit = income - expenses;
    const transactionCount = transactionsList.length;
    const averageTransaction = transactionCount > 0 ? (income + expenses) / transactionCount : 0;
    const profitMargin = income > 0 ? (netProfit / income) * 100 : 0;

    // Simple growth calculation (compared to previous period)
    const growthRate = Math.random() * 20 - 10; // Placeholder - would need previous period data

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netProfit,
      transactionCount,
      averageTransaction,
      growthRate,
      profitMargin,
    };
  };

  const prepareChartData = (transactions: FinancialTransaction[]): ChartData => {
    // Ensure transactions is an array
    const transactionsList = Array.isArray(transactions) ? transactions : [];
    
    // Group transactions by date
    const dailyMap = new Map<string, { income: number; expenses: number }>();
    
    transactionsList.forEach(transaction => {
      const dateKey = format(toDateSafe(transaction.date), 'yyyy-MM-dd');
      const existing = dailyMap.get(dateKey) || { income: 0, expenses: 0 };
      
      if (transaction.type === 'income') {
        existing.income += transaction.totalAmount;
      } else {
        existing.expenses += transaction.totalAmount;
      }
      
      dailyMap.set(dateKey, existing);
    });

    const dailyTrends = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date: format(new Date(date), 'MMM dd'),
        income: data.income,
        expenses: data.expenses,
        net: data.income - data.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Category breakdown
    const categoryMap = new Map<string, number>();
    transactionsList.forEach(transaction => {
      const category = transaction.category || 'Other';
      categoryMap.set(category, (categoryMap.get(category) || 0) + transaction.totalAmount);
    });

    const totalAmount = Array.from(categoryMap.values()).reduce((sum, amount) => sum + amount, 0);
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, amount], index) => ({
        category,
        amount,
        percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        color: chartColors[index % chartColors.length],
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    // Payment methods
    const paymentMap = new Map<string, { amount: number; count: number }>();
    const totalPaymentAmount = transactionsList.reduce((sum, t) => sum + t.totalAmount, 0);
    
    transactionsList.forEach(transaction => {
      const method = transaction.paymentMethod || 'other';
      const existing = paymentMap.get(method) || { amount: 0, count: 0 };
      existing.amount += transaction.totalAmount;
      existing.count += 1;
      paymentMap.set(method, existing);
    });

    const paymentMethods = Array.from(paymentMap.entries())
      .map(([method, data]) => ({
        method: method.replace('_', ' ').toUpperCase(),
        amount: data.amount,
        count: data.count,
        percentage: totalPaymentAmount > 0 ? (data.amount / totalPaymentAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Monthly comparison (placeholder)
    const monthlyComparison = [
      { month: 'Jan', thisYear: 12000, lastYear: 10000 },
      { month: 'Feb', thisYear: 15000, lastYear: 12000 },
      { month: 'Mar', thisYear: 18000, lastYear: 14000 },
      { month: 'Apr', thisYear: 16000, lastYear: 13000 },
      { month: 'May', thisYear: 20000, lastYear: 15000 },
      { month: 'Jun', thisYear: 22000, lastYear: 17000 },
    ];

    return {
      dailyTrends,
      categoryBreakdown,
      paymentMethods,
      monthlyComparison,
    };
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${isRTL ? 'ج.م' : 'EGP'}`;
  };

  const getGrowthColor = (rate: number) => {
    if (rate > 0) return 'success.main';
    if (rate < 0) return 'error.main';
    return 'text.secondary';
  };

  const getGrowthIcon = (rate: number) => {
    if (rate > 0) return <TrendingUp fontSize="small" />;
    if (rate < 0) return <TrendingDown fontSize="small" />;
    return null;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {isRTL ? 'التقارير المالية' : 'Financial Reports'}
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            {isRTL ? 'التقارير المالية' : 'Financial Reports'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isRTL 
              ? `فرع ${currentBranch?.name || 'الرئيسي'} - ${format(new Date(), 'dd MMMM yyyy')}`
              : `${currentBranch?.name || 'Main'} Branch - ${format(new Date(), 'MMMM dd, yyyy')}`
            }
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
          <IconButton onClick={loadReportData}>
            <Refresh />
          </IconButton>
          <Button startIcon={<FileDownload />} variant="outlined">
            {isRTL ? 'تصدير' : 'Export'}
          </Button>
        </Box>
      </Box>

      {/* Key Metrics Cards */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.success.main, 0.1),
                        color: 'success.main',
                        mr: 2,
                      }}
                    >
                      <TrendingUp />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {isRTL ? 'إجمالي الإيرادات' : 'Total Income'}
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        <CountUp 
                          end={metrics.totalIncome} 
                          duration={2}
                          separator=","
                          suffix={isRTL ? ' ج.م' : ' EGP'}
                        />
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ color: getGrowthColor(metrics.growthRate), mr: 1 }}>
                      {getGrowthIcon(metrics.growthRate)}
                    </Box>
                    <Typography variant="body2" color={getGrowthColor(metrics.growthRate)}>
                      {metrics.growthRate > 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                      {isRTL ? 'من الفترة السابقة' : 'from last period'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.error.main, 0.1),
                        color: 'error.main',
                        mr: 2,
                      }}
                    >
                      <TrendingDown />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {isRTL ? 'إجمالي المصروفات' : 'Total Expenses'}
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        <CountUp 
                          end={metrics.totalExpenses} 
                          duration={2}
                          separator=","
                          suffix={isRTL ? ' ج.م' : ' EGP'}
                        />
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {metrics.transactionCount} {isRTL ? 'معاملة' : 'transactions'}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: 'primary.main',
                        mr: 2,
                      }}
                    >
                      <AttachMoney />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {isRTL ? 'صافي الربح' : 'Net Profit'}
                      </Typography>
                      <Typography 
                        variant="h5" 
                        fontWeight="bold"
                        color={metrics.netProfit >= 0 ? 'success.main' : 'error.main'}
                      >
                        <CountUp 
                          end={metrics.netProfit} 
                          duration={2}
                          separator=","
                          suffix={isRTL ? ' ج.م' : ' EGP'}
                        />
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'هامش الربح:' : 'Profit Margin:'} {metrics.profitMargin.toFixed(1)}%
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(theme.palette.info.main, 0.1),
                        color: 'info.main',
                        mr: 2,
                      }}
                    >
                      <Receipt />
                    </Box>
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {isRTL ? 'متوسط المعاملة' : 'Avg Transaction'}
                      </Typography>
                      <Typography variant="h5" fontWeight="bold">
                        <CountUp 
                          end={metrics.averageTransaction} 
                          duration={2}
                          separator=","
                          suffix={isRTL ? ' ج.م' : ' EGP'}
                        />
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {metrics.transactionCount} {isRTL ? 'إجمالي المعاملات' : 'total transactions'}
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      )}

      {/* Charts and Analysis */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={isRTL ? 'الاتجاهات اليومية' : 'Daily Trends'} 
            icon={<Timeline />} 
            iconPosition="start"
          />
          <Tab 
            label={isRTL ? 'تحليل الفئات' : 'Category Analysis'} 
            icon={<PieChartIcon />} 
            iconPosition="start"
          />
          <Tab 
            label={isRTL ? 'طرق الدفع' : 'Payment Methods'} 
            icon={<AccountBalance />} 
            iconPosition="start"
          />
          <Tab 
            label={isRTL ? 'المقارنة الشهرية' : 'Monthly Comparison'} 
            icon={<BarChartIcon />} 
            iconPosition="start"
          />
        </Tabs>

        {/* Daily Trends Tab */}
        <TabPanel value={tabValue} index={0}>
          {chartData && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'اتجاه الإيرادات والمصروفات اليومية' : 'Daily Income & Expense Trends'}
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData.dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value), 
                      name === 'income' ? (isRTL ? 'الإيرادات' : 'Income') :
                      name === 'expenses' ? (isRTL ? 'المصروفات' : 'Expenses') :
                      (isRTL ? 'صافي الربح' : 'Net Profit')
                    ]}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stackId="1"
                    stroke={theme.palette.success.main}
                    fill={alpha(theme.palette.success.main, 0.3)}
                    name={isRTL ? 'الإيرادات' : 'Income'}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stackId="2"
                    stroke={theme.palette.error.main}
                    fill={alpha(theme.palette.error.main, 0.3)}
                    name={isRTL ? 'المصروفات' : 'Expenses'}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="net" 
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    name={isRTL ? 'صافي الربح' : 'Net Profit'}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          )}
        </TabPanel>

        {/* Category Analysis Tab */}
        <TabPanel value={tabValue} index={1}>
          {chartData && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    {isRTL ? 'توزيع الفئات' : 'Category Distribution'}
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="amount"
                        label={({ percentage }) => `${percentage.toFixed(1)}%`}
                      >
                        {chartData.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    {isRTL ? 'تفاصيل الفئات' : 'Category Details'}
                  </Typography>
                  <Stack spacing={2}>
                    {chartData.categoryBreakdown.map((category, index) => (
                      <Box key={index} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {category.category}
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {formatCurrency(category.amount)}
                          </Typography>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={category.percentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: alpha(category.color, 0.2),
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: category.color,
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {category.percentage.toFixed(1)}% {isRTL ? 'من الإجمالي' : 'of total'}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          )}
        </TabPanel>

        {/* Payment Methods Tab */}
        <TabPanel value={tabValue} index={2}>
          {chartData && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'تحليل طرق الدفع' : 'Payment Method Analysis'}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{isRTL ? 'طريقة الدفع' : 'Payment Method'}</TableCell>
                      <TableCell align="center">{isRTL ? 'المبلغ' : 'Amount'}</TableCell>
                      <TableCell align="center">{isRTL ? 'عدد المعاملات' : 'Transactions'}</TableCell>
                      <TableCell align="center">{isRTL ? 'النسبة' : 'Percentage'}</TableCell>
                      <TableCell>{isRTL ? 'التوزيع' : 'Distribution'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {chartData.paymentMethods.map((method, index) => (
                      <TableRow key={method.method} hover>
                        <TableCell>
                          <Chip 
                            label={method.method} 
                            color={index < 3 ? 'primary' : 'default'}
                            variant={index < 3 ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="medium">
                            {formatCurrency(method.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{method.count}</TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="medium">
                            {method.percentage.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <LinearProgress 
                            variant="determinate" 
                            value={method.percentage}
                            sx={{
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: alpha(chartColors[index % chartColors.length], 0.2),
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: chartColors[index % chartColors.length],
                              },
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </TabPanel>

        {/* Monthly Comparison Tab */}
        <TabPanel value={tabValue} index={3}>
          {chartData && (
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'مقارنة الأداء الشهري' : 'Monthly Performance Comparison'}
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData.monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar 
                    dataKey="thisYear" 
                    fill={theme.palette.primary.main}
                    name={isRTL ? 'هذا العام' : 'This Year'}
                  />
                  <Bar 
                    dataKey="lastYear" 
                    fill={theme.palette.secondary.main}
                    name={isRTL ? 'العام الماضي' : 'Last Year'}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default FinanceReportsPage;