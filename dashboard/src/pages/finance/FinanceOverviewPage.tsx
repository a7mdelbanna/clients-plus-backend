import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Avatar,
  useTheme,
  alpha,
  Chip,
  Stack,
} from '@mui/material';
import {
  AccountBalance,
  Receipt,
  SwapHoriz,
  PointOfSale,
  Assessment,
  MoneyOff,
  Description,
  LocalAtm,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface FinanceModule {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  badge?: {
    label: string;
    color: 'success' | 'warning' | 'error' | 'info';
  };
}

const financeModules: FinanceModule[] = [
  {
    id: 'accounts',
    title: 'Accounts',
    titleAr: 'الحسابات',
    description: 'Manage bank accounts, cash, and digital wallets',
    descriptionAr: 'إدارة الحسابات البنكية والنقدية والمحافظ الرقمية',
    icon: <AccountBalance />,
    path: '/finance/accounts',
    color: '#1976d2',
  },
  {
    id: 'transactions',
    title: 'Transactions',
    titleAr: 'المعاملات',
    description: 'View and manage all financial transactions',
    descriptionAr: 'عرض وإدارة جميع المعاملات المالية',
    icon: <Receipt />,
    path: '/finance/transactions',
    color: '#388e3c',
  },
  {
    id: 'expenses',
    title: 'Expenses',
    titleAr: 'المصروفات',
    description: 'Track expenses, manage vendors, and control budgets',
    descriptionAr: 'تتبع المصروفات وإدارة الموردين والتحكم في الميزانيات',
    icon: <MoneyOff />,
    path: '/finance/expenses',
    color: '#d32f2f',
    badge: {
      label: '3 Pending',
      color: 'warning',
    },
  },
  {
    id: 'pos',
    title: 'Point of Sale',
    titleAr: 'نقطة البيع',
    description: 'Process sales and accept payments',
    descriptionAr: 'معالجة المبيعات وقبول المدفوعات',
    icon: <PointOfSale />,
    path: '/finance/pos',
    color: '#7b1fa2',
  },
  {
    id: 'invoices',
    title: 'Invoices',
    titleAr: 'الفواتير',
    description: 'Create and manage customer invoices',
    descriptionAr: 'إنشاء وإدارة فواتير العملاء',
    icon: <Description />,
    path: '/finance/invoices',
    color: '#f57c00',
  },
  {
    id: 'reports',
    title: 'Reports',
    titleAr: 'التقارير',
    description: 'Financial analytics and detailed reports',
    descriptionAr: 'التحليلات المالية والتقارير التفصيلية',
    icon: <Assessment />,
    path: '/finance/reports',
    color: '#0288d1',
  },
  {
    id: 'transfers',
    title: 'Transfers',
    titleAr: 'التحويلات',
    description: 'Transfer money between accounts',
    descriptionAr: 'تحويل الأموال بين الحسابات',
    icon: <SwapHoriz />,
    path: '/finance/transfers',
    color: '#689f38',
  },
];

const FinanceOverviewPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isRTL = theme.direction === 'rtl';

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {isRTL ? 'الإدارة المالية' : 'Financial Management'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isRTL 
            ? 'إدارة جميع العمليات المالية للشركة'
            : 'Manage all financial operations of your company'
          }
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), mr: 2 }}>
                  <TrendingUp color="success" />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'إجمالي الرصيد' : 'Total Balance'}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    125,000 {isRTL ? 'ج.م' : 'EGP'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), mr: 2 }}>
                  <Receipt color="primary" />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'معاملات اليوم' : "Today's Transactions"}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    47
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), mr: 2 }}>
                  <MoneyOff color="error" />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'مصروفات الشهر' : 'Monthly Expenses'}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    38,500 {isRTL ? 'ج.م' : 'EGP'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), mr: 2 }}>
                  <Warning color="warning" />
                </Avatar>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'بانتظار الموافقة' : 'Pending Approvals'}
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    3
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Finance Modules Grid */}
      <Grid container spacing={3}>
        {financeModules.map((module, index) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={module.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card sx={{ height: '100%' }}>
                <CardActionArea
                  onClick={() => navigate(module.path)}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(module.color, 0.1),
                          color: module.color,
                          mr: 2,
                        }}
                      >
                        {module.icon}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {isRTL ? module.titleAr : module.title}
                        </Typography>
                        {module.badge && (
                          <Chip
                            label={module.badge.label}
                            size="small"
                            color={module.badge.color}
                          />
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                      {isRTL ? module.descriptionAr : module.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default FinanceOverviewPage;