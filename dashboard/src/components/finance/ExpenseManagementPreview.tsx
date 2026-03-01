import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  Stack,
  useTheme,
  alpha,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Tab,
  Tabs,
  LinearProgress,
  Badge,
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
  PendingActions,
  ThumbUp,
  ThumbDown,
} from '@mui/icons-material';

// Mock data for preview
const mockCategories = [
  { id: 1, name: 'الإيجار والمرافق', icon: Business, color: '#1976d2', budget: 25000, spent: 22000 },
  { id: 2, name: 'الرواتب والعمولات', icon: AccountBalance, color: '#388e3c', budget: 80000, spent: 75000 },
  { id: 3, name: 'المنتجات والمستلزمات', icon: LocalShipping, color: '#7b1fa2', budget: 30000, spent: 18000 },
  { id: 4, name: 'التسويق والإعلان', icon: Campaign, color: '#d32f2f', budget: 15000, spent: 12000 },
  { id: 5, name: 'الصيانة والإصلاحات', icon: Engineering, color: '#f57c00', budget: 10000, spent: 8500 },
];

const mockPendingExpenses = [
  { id: 1, vendor: 'شركة النور للتجميل', amount: 3500, category: 'المنتجات', date: '2025-08-01', status: 'pending' },
  { id: 2, vendor: 'الكهرباء المصرية', amount: 1200, category: 'المرافق', date: '2025-08-01', status: 'pending' },
  { id: 3, vendor: 'وكالة الإعلان الرقمي', amount: 5000, category: 'التسويق', date: '2025-07-31', status: 'pending' },
];

const mockVendors = [
  { id: 1, name: 'شركة النور للتجميل', type: 'مورد', totalSpent: 125000, rating: 4.5, transactions: 45 },
  { id: 2, name: 'مؤسسة الجمال', type: 'مورد', totalSpent: 98000, rating: 4.8, transactions: 38 },
  { id: 3, name: 'الكهرباء المصرية', type: 'مرافق', totalSpent: 14400, rating: 3.5, transactions: 12 },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ExpenseManagementPreview() {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const [tabValue, setTabValue] = useState(0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBudgetStatus = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 90) return { color: 'error', icon: Warning };
    if (percentage >= 70) return { color: 'warning', icon: Schedule };
    return { color: 'success', icon: CheckCircle };
  };

  return (
    <Box>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          {isRTL ? 'إدارة المصروفات' : 'Expense Management'}
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<Upload />}
          >
            {isRTL ? 'رفع فاتورة' : 'Upload Receipt'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            color="primary"
          >
            {isRTL ? 'مصروف جديد' : 'New Expense'}
          </Button>
        </Stack>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), mr: 2 }}>
                  <AttachMoney color="primary" />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'إجمالي المصروفات' : 'Total Expenses'}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(135500)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ArrowUpward color="error" fontSize="small" />
                <Typography variant="body2" color="error">
                  +12% {isRTL ? 'من الشهر الماضي' : 'from last month'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), mr: 2 }}>
                  <PendingActions color="warning" />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'بانتظار الموافقة' : 'Pending Approval'}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(9700)}
                  </Typography>
                </Box>
              </Box>
              <Badge badgeContent={3} color="warning">
                <Typography variant="body2">
                  {isRTL ? '3 مصروفات' : '3 expenses'}
                </Typography>
              </Badge>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), mr: 2 }}>
                  <TrendingUp color="success" />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'الميزانية المتبقية' : 'Budget Remaining'}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(24500)}
                  </Typography>
                </Box>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={85} 
                sx={{ height: 8, borderRadius: 4 }}
                color="warning"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), mr: 2 }}>
                  <Store color="info" />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'الموردين النشطين' : 'Active Vendors'}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    24
                  </Typography>
                </Box>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {isRTL ? '3 موردين جدد هذا الشهر' : '3 new this month'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={isRTL ? 'نظرة عامة' : 'Overview'} />
          <Tab label={isRTL ? 'الموافقات' : 'Approvals'} />
          <Tab label={isRTL ? 'الفئات' : 'Categories'} />
          <Tab label={isRTL ? 'الموردين' : 'Vendors'} />
          <Tab label={isRTL ? 'المتكررة' : 'Recurring'} />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Category Breakdown */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'توزيع المصروفات حسب الفئة' : 'Expenses by Category'}
              </Typography>
              <List>
                {mockCategories.map((category) => {
                  const Icon = category.icon;
                  const status = getBudgetStatus(category.spent, category.budget);
                  const StatusIcon = status.icon;
                  
                  return (
                    <React.Fragment key={category.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: alpha(category.color, 0.1) }}>
                            <Icon sx={{ color: category.color }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={category.name}
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                {formatCurrency(category.spent)} / {formatCurrency(category.budget)}
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={(category.spent / category.budget) * 100}
                                sx={{ 
                                  mt: 1, 
                                  height: 6, 
                                  borderRadius: 3,
                                  bgcolor: alpha(category.color, 0.1),
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: category.color,
                                  }
                                }}
                              />
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <StatusIcon color={status.color} />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  );
                })}
              </List>
            </Grid>

            {/* Recent Expenses */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'المصروفات الأخيرة' : 'Recent Expenses'}
              </Typography>
              <List>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                      <Receipt color="primary" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="شركة النور للتجميل"
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          منتجات العناية بالشعر
                        </Typography>
                        <Chip 
                          label="المنتجات" 
                          size="small" 
                          sx={{ mt: 0.5 }}
                          color="primary"
                        />
                      </Box>
                    }
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6">{formatCurrency(3500)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      منذ ساعتين
                    </Typography>
                  </Box>
                </ListItem>
                <Divider variant="inset" component="li" />
                
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                      <Receipt color="warning" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="شركة الكهرباء"
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          فاتورة الكهرباء - يوليو
                        </Typography>
                        <Chip 
                          label="المرافق" 
                          size="small" 
                          sx={{ mt: 0.5 }}
                          color="warning"
                        />
                      </Box>
                    }
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6">{formatCurrency(1200)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      اليوم
                    </Typography>
                  </Box>
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Approvals Tab */}
        <TabPanel value={tabValue} index={1}>
          <List>
            {mockPendingExpenses.map((expense) => (
              <React.Fragment key={expense.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1) }}>
                      <PendingActions color="warning" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={expense.vendor}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {expense.category} • {expense.date}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<ThumbUp />}
                          >
                            {isRTL ? 'موافقة' : 'Approve'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<ThumbDown />}
                          >
                            {isRTL ? 'رفض' : 'Reject'}
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                          >
                            {isRTL ? 'تفاصيل' : 'Details'}
                          </Button>
                        </Stack>
                      </Box>
                    }
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" color="warning.main">
                      {formatCurrency(expense.amount)}
                    </Typography>
                    <Chip
                      label={isRTL ? 'بانتظار الموافقة' : 'Pending'}
                      size="small"
                      color="warning"
                    />
                  </Box>
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        </TabPanel>

        {/* Categories Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {mockCategories.map((category) => {
              const Icon = category.icon;
              const percentage = (category.spent / category.budget) * 100;
              
              return (
                <Grid item xs={12} sm={6} md={4} key={category.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar sx={{ bgcolor: alpha(category.color, 0.1), mr: 2 }}>
                          <Icon sx={{ color: category.color }} />
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6">{category.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(category.spent)} / {formatCurrency(category.budget)}
                          </Typography>
                        </Box>
                        <IconButton size="small">
                          <MoreVert />
                        </IconButton>
                      </Box>
                      
                      <Box sx={{ position: 'relative', pt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={percentage}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: alpha(category.color, 0.1),
                            '& .MuiLinearProgress-bar': {
                              bgcolor: category.color,
                            }
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            position: 'absolute',
                            right: 0,
                            top: -5,
                            color: percentage > 90 ? 'error.main' : 'text.secondary'
                          }}
                        >
                          {percentage.toFixed(0)}%
                        </Typography>
                      </Box>
                      
                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        <Chip
                          label={`${isRTL ? 'معاملات:' : 'Transactions:'} 24`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`${isRTL ? 'متوسط:' : 'Avg:'} ${formatCurrency(category.spent / 24)}`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </TabPanel>

        {/* Vendors Tab */}
        <TabPanel value={tabValue} index={3}>
          <List>
            {mockVendors.map((vendor) => (
              <React.Fragment key={vendor.id}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1) }}>
                      <Store color="info" />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={vendor.name}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {vendor.type} • {vendor.transactions} معاملات
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Chip
                            label={`${isRTL ? 'التقييم:' : 'Rating:'} ${vendor.rating}/5`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                          <Chip
                            label={`${isRTL ? 'آخر معاملة:' : 'Last:'} منذ 3 أيام`}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      </Box>
                    }
                  />
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6">
                      {formatCurrency(vendor.totalSpent)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isRTL ? 'إجمالي المصروفات' : 'Total Spent'}
                    </Typography>
                  </Box>
                </ListItem>
                <Divider variant="inset" component="li" />
              </React.Fragment>
            ))}
          </List>
        </TabPanel>
      </Paper>
    </Box>
  );
}