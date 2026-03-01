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
  Stack,
  Divider,
  Grid,
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
  CreditCard,
  Inventory,
  AccessTime,
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
import type { SalesAnalytics, DateRange } from '../../services/analytics.service';

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
      {value === index && <Box sx={{ pt: 4 }}>{children}</Box>}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, title, value, subtitle, trend, color }: any) {
  const theme = useTheme();
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: alpha(color || theme.palette.primary.main, 0.1),
                color: color || 'primary.main',
              }}
            >
              {icon}
            </Box>
            {trend && (
              <Chip
                size="small"
                icon={trend > 0 ? <TrendingUp /> : <TrendingDown />}
                label={`${trend > 0 ? '+' : ''}${trend}%`}
                sx={{
                  bgcolor: alpha(trend > 0 ? theme.palette.success.main : theme.palette.error.main, 0.1),
                  color: trend > 0 ? 'success.main' : 'error.main',
                }}
              />
            )}
          </Box>
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// Chart Card Component
function ChartCard({ title, subtitle, children, action }: any) {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
          {action}
        </Box>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </Paper>
  );
}

export default function AnalyticsPageRedesigned() {
  const { user } = useAuth();
  const { currentBranch } = useBranch();
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  const [tabValue, setTabValue] = useState(0);
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  useEffect(() => {
    loadAnalytics();
  }, [user, currentBranch]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      if (!user?.companyId) return;

      const dateRange: DateRange = {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
      };

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const CHART_COLORS = {
    primary: theme.palette.primary.main,
    secondary: theme.palette.secondary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.info.main,
  };

  const GRADIENT_COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

  if (loading || !analytics) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>جاري التحميل...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" fontWeight="bold">
            {isRTL ? 'لوحة التحليلات' : 'Analytics Dashboard'}
          </Typography>
          <Stack direction="row" spacing={2}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                displayEmpty
              >
                <MenuItem value="7d">آخر 7 أيام</MenuItem>
                <MenuItem value="30d">آخر 30 يوم</MenuItem>
                <MenuItem value="90d">آخر 90 يوم</MenuItem>
              </Select>
            </FormControl>
            <IconButton onClick={loadAnalytics} sx={{ bgcolor: 'background.paper' }}>
              <Refresh />
            </IconButton>
          </Stack>
        </Box>
      </Box>

      {/* Key Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AttachMoney />}
            title="إجمالي الإيرادات"
            value={formatCurrency(analytics.metrics.totalRevenue)}
            subtitle="للفترة المحددة"
            trend={analytics.metrics.growthRate}
            color={CHART_COLORS.primary}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ShoppingCart />}
            title="عدد المعاملات"
            value={analytics.metrics.totalSales.toLocaleString()}
            subtitle="معاملة مكتملة"
            trend={15}
            color={CHART_COLORS.success}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TrendingUp />}
            title="متوسط قيمة الطلب"
            value={formatCurrency(analytics.metrics.averageOrderValue)}
            subtitle="لكل معاملة"
            color={CHART_COLORS.warning}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<People />}
            title="العملاء النشطون"
            value={analytics.metrics.uniqueCustomers || '245'}
            subtitle="عميل فريد"
            trend={8}
            color={CHART_COLORS.info}
          />
        </Grid>
      </Grid>

      {/* Tabs Section */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={tabValue}
            onChange={(e, v) => setTabValue(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                fontWeight: 600,
                fontSize: '1rem',
                py: 2,
              },
            }}
          >
            <Tab label="نظرة عامة" icon={<TrendingUp />} iconPosition="start" />
            <Tab label="المبيعات" icon={<ShoppingCart />} iconPosition="start" />
            <Tab label="المنتجات" icon={<Inventory />} iconPosition="start" />
            <Tab label="الموظفين" icon={<People />} iconPosition="start" />
            <Tab label="طرق الدفع" icon={<CreditCard />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Revenue Trend */}
            <Grid item xs={12}>
              <ChartCard
                title="اتجاه الإيرادات اليومية"
                subtitle="إجمالي الإيرادات على مدار الفترة المحددة"
              >
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <AreaChart data={analytics.dailyTrends}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                      <XAxis 
                        dataKey="date" 
                        stroke={theme.palette.text.secondary}
                        style={{ fontSize: '14px' }}
                      />
                      <YAxis 
                        stroke={theme.palette.text.secondary}
                        style={{ fontSize: '14px' }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={CHART_COLORS.primary}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </ChartCard>
            </Grid>

            {/* Peak Hours & Days */}
            <Grid item xs={12} md={6}>
              <ChartCard
                title="ساعات الذروة"
                subtitle="توزيع المعاملات حسب ساعات اليوم"
              >
                <Box sx={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer>
                    <BarChart data={analytics.hourlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                      <XAxis 
                        dataKey="hour" 
                        stroke={theme.palette.text.secondary}
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke={theme.palette.text.secondary}
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                      />
                      <Bar 
                        dataKey="transactions" 
                        fill={CHART_COLORS.secondary}
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </ChartCard>
            </Grid>

            {/* Customer Segments */}
            <Grid item xs={12} md={6}>
              <ChartCard
                title="شرائح العملاء"
                subtitle="توزيع العملاء حسب قيمة المشتريات"
              >
                <Box sx={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'VIP (1000+ ج.م)', value: 30, color: GRADIENT_COLORS[0] },
                          { name: 'عادي (500-1000 ج.م)', value: 45, color: GRADIENT_COLORS[1] },
                          { name: 'جديد (<500 ج.م)', value: 25, color: GRADIENT_COLORS[2] },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[0, 1, 2].map((index) => (
                          <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                    {['VIP', 'عادي', 'جديد'].map((label, index) => (
                      <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: GRADIENT_COLORS[index],
                          }}
                        />
                        <Typography variant="caption">{label}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </ChartCard>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Sales Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            {/* Sales Summary Cards */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: alpha(CHART_COLORS.success, 0.05) }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          مبيعات اليوم
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {formatCurrency(analytics.todayRevenue || 12500)}
                        </Typography>
                        <Chip
                          size="small"
                          label="+23% من الأمس"
                          color="success"
                          sx={{ width: 'fit-content' }}
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: alpha(CHART_COLORS.info, 0.05) }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          مبيعات الأسبوع
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {formatCurrency(analytics.weekRevenue || 87500)}
                        </Typography>
                        <Chip
                          size="small"
                          label="+15% من الأسبوع الماضي"
                          color="info"
                          sx={{ width: 'fit-content' }}
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: alpha(CHART_COLORS.warning, 0.05) }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          مبيعات الشهر
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {formatCurrency(analytics.metrics.totalRevenue)}
                        </Typography>
                        <Chip
                          size="small"
                          label="+8% من الشهر الماضي"
                          color="warning"
                          sx={{ width: 'fit-content' }}
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card sx={{ bgcolor: alpha(CHART_COLORS.primary, 0.05) }}>
                    <CardContent>
                      <Stack spacing={1}>
                        <Typography variant="body2" color="text.secondary">
                          هدف الشهر
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          85%
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption">تم تحقيق</Typography>
                            <Typography variant="caption">425,000 / 500,000</Typography>
                          </Box>
                          <Box sx={{ bgcolor: 'divider', borderRadius: 1, height: 8 }}>
                            <Box
                              sx={{
                                bgcolor: CHART_COLORS.primary,
                                width: '85%',
                                height: '100%',
                                borderRadius: 1,
                              }}
                            />
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            {/* Sales by Category */}
            <Grid item xs={12}>
              <ChartCard
                title="المبيعات حسب الفئة"
                subtitle="أداء كل فئة من فئات المنتجات"
              >
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={[
                        { category: 'العناية بالشعر', revenue: 125000, count: 450 },
                        { category: 'العناية بالبشرة', revenue: 98000, count: 320 },
                        { category: 'المكياج', revenue: 87000, count: 280 },
                        { category: 'العطور', revenue: 65000, count: 150 },
                        { category: 'الأظافر', revenue: 45000, count: 180 },
                      ]}
                      layout="horizontal"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                      <XAxis type="number" tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="category" type="category" width={100} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar dataKey="revenue" fill={CHART_COLORS.primary} radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </ChartCard>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Products Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {/* Top Products List */}
            <Grid item xs={12} lg={8}>
              <ChartCard
                title="أفضل 10 منتجات"
                subtitle="المنتجات الأكثر مبيعاً في الفترة المحددة"
              >
                <Box sx={{ mt: 3 }}>
                  {analytics.topProducts.slice(0, 10).map((product, index) => (
                    <Box key={product.productId}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          py: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                          <Chip
                            label={`#${index + 1}`}
                            size="small"
                            sx={{
                              bgcolor: index < 3 ? CHART_COLORS.primary : 'action.selected',
                              color: index < 3 ? 'white' : 'text.primary',
                              fontWeight: 'bold',
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" fontWeight="medium">
                              {product.productName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {product.quantitySold} وحدة مباعة
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body1" fontWeight="bold">
                            {formatCurrency(product.revenue)}
                          </Typography>
                          <Typography variant="caption" color="success.main">
                            ربح {product.profitMargin.toFixed(0)}%
                          </Typography>
                        </Box>
                      </Box>
                      {index < analytics.topProducts.length - 1 && <Divider />}
                    </Box>
                  ))}
                </Box>
              </ChartCard>
            </Grid>

            {/* Product Performance Metrics */}
            <Grid item xs={12} lg={4}>
              <Stack spacing={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      مؤشرات أداء المنتجات
                    </Typography>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            معدل دوران المخزون
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            4.2x
                          </Typography>
                        </Box>
                        <Box sx={{ bgcolor: 'divider', borderRadius: 1, height: 6 }}>
                          <Box
                            sx={{
                              bgcolor: CHART_COLORS.success,
                              width: '75%',
                              height: '100%',
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            منتجات نفذت
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="error.main">
                            12 منتج
                          </Typography>
                        </Box>
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            منتجات بطيئة الحركة
                          </Typography>
                          <Typography variant="body2" fontWeight="bold" color="warning.main">
                            8 منتجات
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      فئات المنتجات
                    </Typography>
                    <Box sx={{ width: '100%', height: 250, mt: 2 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'العناية بالشعر', value: 35 },
                              { name: 'العناية بالبشرة', value: 28 },
                              { name: 'المكياج', value: 20 },
                              { name: 'العطور', value: 10 },
                              { name: 'أخرى', value: 7 },
                            ]}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            dataKey="value"
                            label={(entry) => `${entry.value}%`}
                          >
                            {GRADIENT_COLORS.map((color, index) => (
                              <Cell key={`cell-${index}`} fill={color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Staff Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            {/* Staff Performance Cards */}
            <Grid item xs={12}>
              <Grid container spacing={3}>
                {analytics.staffPerformance.slice(0, 6).map((staff, index) => (
                  <Grid item xs={12} sm={6} md={4} key={staff.staffId}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                borderRadius: '50%',
                                bgcolor: GRADIENT_COLORS[index % GRADIENT_COLORS.length],
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '1.2rem',
                              }}
                            >
                              {staff.staffName.charAt(0)}
                            </Box>
                            <Box>
                              <Typography variant="h6" fontWeight="bold">
                                {staff.staffName}
                              </Typography>
                              <Chip
                                label={`#${index + 1}`}
                                size="small"
                                color={index < 3 ? 'primary' : 'default'}
                              />
                            </Box>
                          </Box>
                        </Box>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                إجمالي المبيعات
                              </Typography>
                              <Typography variant="h6" fontWeight="bold">
                                {formatCurrency(staff.totalRevenue)}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                عدد المعاملات
                              </Typography>
                              <Typography variant="h6" fontWeight="bold">
                                {staff.totalSales}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                متوسط المعاملة
                              </Typography>
                              <Typography variant="body1" fontWeight="medium">
                                {formatCurrency(staff.averageOrderValue)}
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                أفضل منتج
                              </Typography>
                              <Typography variant="body2" noWrap>
                                {staff.topProduct || 'غير محدد'}
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Staff Comparison Chart */}
            <Grid item xs={12}>
              <ChartCard
                title="مقارنة أداء الموظفين"
                subtitle="إجمالي المبيعات لكل موظف"
              >
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <BarChart data={analytics.staffPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                      <XAxis 
                        dataKey="staffName" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar 
                        dataKey="totalRevenue" 
                        fill={CHART_COLORS.primary}
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </ChartCard>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Payment Methods Tab */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            {/* Payment Method Distribution */}
            <Grid item xs={12} md={6}>
              <ChartCard
                title="توزيع طرق الدفع"
                subtitle="النسبة المئوية لكل طريقة دفع"
              >
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={analytics.paymentMethods}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={140}
                        paddingAngle={5}
                        dataKey="amount"
                      >
                        {analytics.paymentMethods.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                {/* Custom Legend */}
                <Box sx={{ mt: 3 }}>
                  {analytics.paymentMethods.map((method, index) => (
                    <Box
                      key={method.method}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1.5,
                        borderBottom: index < analytics.paymentMethods.length - 1 ? 1 : 0,
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: 16,
                            height: 16,
                            borderRadius: 1,
                            bgcolor: GRADIENT_COLORS[index % GRADIENT_COLORS.length],
                          }}
                        />
                        <Typography variant="body2">{method.method}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight="bold">
                          {method.percentage.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {method.count} معاملة
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </ChartCard>
            </Grid>

            {/* Payment Trends */}
            <Grid item xs={12} md={6}>
              <ChartCard
                title="اتجاهات طرق الدفع"
                subtitle="تطور استخدام طرق الدفع خلال الشهر"
              >
                <Box sx={{ width: '100%', height: 400 }}>
                  <ResponsiveContainer>
                    <LineChart
                      data={[
                        { day: '1', cash: 45, card: 35, online: 20 },
                        { day: '5', cash: 42, card: 38, online: 20 },
                        { day: '10', cash: 40, card: 40, online: 20 },
                        { day: '15', cash: 38, card: 41, online: 21 },
                        { day: '20', cash: 35, card: 43, online: 22 },
                        { day: '25', cash: 33, card: 44, online: 23 },
                        { day: '30', cash: 30, card: 45, online: 25 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: theme.palette.background.paper,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 8,
                        }}
                        formatter={(value: number) => `${value}%`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cash" 
                        stroke={GRADIENT_COLORS[0]} 
                        strokeWidth={3}
                        name="نقدي"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="card" 
                        stroke={GRADIENT_COLORS[1]} 
                        strokeWidth={3}
                        name="بطاقة"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="online" 
                        stroke={GRADIENT_COLORS[2]} 
                        strokeWidth={3}
                        name="أونلاين"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </ChartCard>
            </Grid>

            {/* Payment Statistics */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCard color="primary" />
                          <Typography variant="body2" color="text.secondary">
                            متوسط المعاملة النقدية
                          </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold">
                          {formatCurrency(250)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCard color="success" />
                          <Typography variant="body2" color="text.secondary">
                            متوسط معاملة البطاقة
                          </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold">
                          {formatCurrency(450)}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CreditCard color="info" />
                          <Typography variant="body2" color="text.secondary">
                            معاملات فاشلة
                          </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold" color="error.main">
                          12
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTime color="warning" />
                          <Typography variant="body2" color="text.secondary">
                            وقت المعاملة المتوسط
                          </Typography>
                        </Box>
                        <Typography variant="h5" fontWeight="bold">
                          2.5 دقيقة
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
}