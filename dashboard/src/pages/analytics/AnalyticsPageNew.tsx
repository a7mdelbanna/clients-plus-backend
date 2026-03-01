import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
  Chip,
  useTheme,
  alpha,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Stack,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  ShoppingCart,
  People,
  CalendarToday,
  Refresh,
  Download,
  FilterList,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { analyticsService } from '../../services/analytics.service';
import type { SalesAnalytics, DateRange, TopProduct, StaffPerformance } from '../../services/analytics.service';

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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AnalyticsPageNew() {
  const { user } = useAuth();
  const { currentBranch } = useBranch();
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  const [tabValue, setTabValue] = useState(0);
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
  });
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [user, currentBranch, dateRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      if (!user?.companyId) return;

      const data = await analyticsService.getSalesAnalytics(
        user.companyId,
        dateRange,
        currentBranch?.id
      );
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    let start = new Date();

    switch (period) {
      case '7d':
        start.setDate(now.getDate() - 7);
        break;
      case '30d':
        start.setDate(now.getDate() - 30);
        break;
      case '90d':
        start.setDate(now.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    setDateRange({ startDate: start, endDate: now });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} ${isRTL ? 'ج.م' : 'EGP'}`;
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (loading || !analytics) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  const COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          {isRTL ? 'التحليلات والتقارير' : 'Analytics & Reports'}
        </Typography>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>{isRTL ? 'الفترة' : 'Period'}</InputLabel>
            <Select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value)}
              label={isRTL ? 'الفترة' : 'Period'}
            >
              <MenuItem value="7d">{isRTL ? '7 أيام' : '7 Days'}</MenuItem>
              <MenuItem value="30d">{isRTL ? '30 يوم' : '30 Days'}</MenuItem>
              <MenuItem value="90d">{isRTL ? '90 يوم' : '90 Days'}</MenuItem>
              <MenuItem value="1y">{isRTL ? 'سنة' : '1 Year'}</MenuItem>
            </Select>
          </FormControl>
          <IconButton onClick={loadAnalytics}>
            <Refresh />
          </IconButton>
          <Button startIcon={<Download />} variant="outlined">
            {isRTL ? 'تصدير' : 'Export'}
          </Button>
        </Stack>
      </Box>

      {/* Key Metrics Cards - Full Width Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  mr: 2,
                }}
              >
                <AttachMoney />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography color="text.secondary" variant="body2">
                  {isRTL ? 'إجمالي الإيرادات' : 'Total Revenue'}
                </Typography>
                <Typography variant="h5">
                  {formatCurrency(analytics.metrics.totalRevenue)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ color: getGrowthColor(analytics.metrics.growthRate), mr: 1 }}>
                {getGrowthIcon(analytics.metrics.growthRate)}
              </Box>
              <Typography variant="body2" color={getGrowthColor(analytics.metrics.growthRate)}>
                {analytics.metrics.growthRate > 0 ? '+' : ''}{analytics.metrics.growthRate.toFixed(1)}%
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  color: 'success.main',
                  mr: 2,
                }}
              >
                <ShoppingCart />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography color="text.secondary" variant="body2">
                  {isRTL ? 'إجمالي المبيعات' : 'Total Sales'}
                </Typography>
                <Typography variant="h5">
                  {analytics.metrics.totalSales.toLocaleString()}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {isRTL ? 'معاملة' : 'transactions'}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  color: 'warning.main',
                  mr: 2,
                }}
              >
                <TrendingUp />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography color="text.secondary" variant="body2">
                  {isRTL ? 'متوسط قيمة الطلب' : 'Average Order Value'}
                </Typography>
                <Typography variant="h5">
                  {formatCurrency(analytics.metrics.averageOrderValue)}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {isRTL ? 'لكل معاملة' : 'per transaction'}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.info.main, 0.1),
                  color: 'info.main',
                  mr: 2,
                }}
              >
                <AttachMoney />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography color="text.secondary" variant="body2">
                  {isRTL ? 'هامش الربح' : 'Profit Margin'}
                </Typography>
                <Typography variant="h5">
                  {analytics.metrics.profitMargin.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {formatCurrency(analytics.metrics.totalProfit)} {isRTL ? 'إجمالي الربح' : 'total profit'}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={isRTL ? 'اتجاهات المبيعات' : 'Sales Trends'} />
          <Tab label={isRTL ? 'أفضل المنتجات' : 'Top Products'} />
          <Tab label={isRTL ? 'أداء الموظفين' : 'Staff Performance'} />
          <Tab label={isRTL ? 'طرق الدفع' : 'Payment Methods'} />
        </Tabs>

        {/* Sales Trends Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr' }, gap: 3 }}>
            {/* Daily Revenue Trend - Full Width */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'اتجاه الإيرادات اليومية' : 'Daily Revenue Trend'}
              </Typography>
              <Box sx={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <AreaChart data={analytics.dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), isRTL ? 'الإيرادات' : 'Revenue']}
                      labelFormatter={(label) => `${isRTL ? 'التاريخ:' : 'Date:'} ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke={theme.palette.primary.main}
                      fill={alpha(theme.palette.primary.main, 0.3)}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            {/* Hourly Sales Pattern - Full Width */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'نمط المبيعات بالساعة' : 'Hourly Sales Pattern'}
              </Typography>
              <Box sx={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <BarChart data={analytics.hourlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number) => [value, isRTL ? 'المعاملات' : 'Transactions']}
                      labelFormatter={(label) => `${isRTL ? 'الساعة:' : 'Hour:'} ${label}:00`}
                    />
                    <Bar 
                      dataKey="transactions" 
                      fill={theme.palette.secondary.main}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>
        </TabPanel>

        {/* Top Products Tab */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            {/* Products Table */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'أفضل المنتجات مبيعاً' : 'Top Selling Products'}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{isRTL ? 'المنتج' : 'Product'}</TableCell>
                      <TableCell align="center">{isRTL ? 'الكمية المباعة' : 'Qty Sold'}</TableCell>
                      <TableCell align="center">{isRTL ? 'الإيرادات' : 'Revenue'}</TableCell>
                      <TableCell align="center">{isRTL ? 'الربح' : 'Profit'}</TableCell>
                      <TableCell align="center">{isRTL ? 'هامش الربح' : 'Margin'}</TableCell>
                      <TableCell align="center">{isRTL ? 'عدد المبيعات' : 'Sales Count'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.topProducts.map((product, index) => (
                      <TableRow key={product.productId} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip 
                              label={`#${index + 1}`} 
                              size="small" 
                              color={index < 3 ? 'primary' : 'default'}
                            />
                            <Typography variant="body2" fontWeight="medium">
                              {product.productName}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">{product.quantitySold}</TableCell>
                        <TableCell align="center">{formatCurrency(product.revenue)}</TableCell>
                        <TableCell align="center">{formatCurrency(product.profit)}</TableCell>
                        <TableCell align="center">
                          <Typography 
                            color={product.profitMargin > 20 ? 'success.main' : 'text.primary'}
                            fontWeight="medium"
                          >
                            {product.profitMargin.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{product.salesCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* Product Distribution Pie Chart */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'توزيع المنتجات' : 'Product Distribution'}
              </Typography>
              <Box sx={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={analytics.topProducts.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.productName} (${entry.quantitySold})`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {analytics.topProducts.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Stack>
        </TabPanel>

        {/* Staff Performance Tab */}
        <TabPanel value={tabValue} index={2}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {isRTL ? 'أداء الموظفين' : 'Staff Performance'}
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{isRTL ? 'الموظف' : 'Staff'}</TableCell>
                    <TableCell align="center">{isRTL ? 'المبيعات' : 'Sales'}</TableCell>
                    <TableCell align="center">{isRTL ? 'الإيرادات' : 'Revenue'}</TableCell>
                    <TableCell align="center">{isRTL ? 'متوسط قيمة الطلب' : 'Avg Order'}</TableCell>
                    <TableCell>{isRTL ? 'أفضل منتج' : 'Top Product'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.staffPerformance.map((staff, index) => (
                    <TableRow key={staff.staffId} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Chip 
                            label={`#${index + 1}`} 
                            size="small" 
                            color={index < 3 ? 'primary' : 'default'}
                          />
                          <Typography variant="body2" fontWeight="medium">
                            {staff.staffName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">{staff.totalSales}</TableCell>
                      <TableCell align="center">{formatCurrency(staff.totalRevenue)}</TableCell>
                      <TableCell align="center">{formatCurrency(staff.averageOrderValue)}</TableCell>
                      <TableCell>{staff.topProduct || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </TabPanel>

        {/* Payment Methods Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'توزيع طرق الدفع' : 'Payment Method Distribution'}
              </Typography>
              <Box sx={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={analytics.paymentMethods}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.method} (${entry.percentage.toFixed(1)}%)`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {analytics.paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'تفاصيل طرق الدفع' : 'Payment Method Details'}
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{isRTL ? 'الطريقة' : 'Method'}</TableCell>
                      <TableCell align="center">{isRTL ? 'العدد' : 'Count'}</TableCell>
                      <TableCell align="center">{isRTL ? 'المبلغ' : 'Amount'}</TableCell>
                      <TableCell align="center">{isRTL ? 'النسبة' : 'Percentage'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.paymentMethods.map((method) => (
                      <TableRow key={method.method} hover>
                        <TableCell>{method.method}</TableCell>
                        <TableCell align="center">{method.count}</TableCell>
                        <TableCell align="center">{formatCurrency(method.amount)}</TableCell>
                        <TableCell align="center">{method.percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
}