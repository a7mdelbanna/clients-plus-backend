import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  useTheme,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  ShoppingCart,
  BarChart,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { analyticsService } from '../../services/analytics.service';
import type { SalesMetrics, TopProduct } from '../../services/analytics.service';

interface DashboardMetrics {
  today: SalesMetrics;
  thisWeek: SalesMetrics;
  thisMonth: SalesMetrics;
  topProductsToday: TopProduct[];
}

export default function SalesMetricsWidget() {
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const theme = useTheme();
  const navigate = useNavigate();
  const isRTL = theme.direction === 'rtl';

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.companyId) {
      loadMetrics();
    }
  }, [currentUser, currentBranch]);

  const loadMetrics = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);
      const dashboardMetrics = await analyticsService.getDashboardMetrics(
        currentUser.companyId,
        currentBranch?.id
      );
      setMetrics(dashboardMetrics);
    } catch (error) {
      console.error('Error loading dashboard metrics:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <Skeleton width={200} />
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            {[1, 2, 3].map((item) => (
              <Box key={item} sx={{ flex: { sm: 1 } }}>
                <Skeleton variant="rectangular" height={80} />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" component="h2">
            {isRTL ? 'ملخص المبيعات' : 'Sales Summary'}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<BarChart />}
            onClick={() => navigate('/analytics')}
          >
            {isRTL ? 'عرض التفاصيل' : 'View Details'}
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          {/* Today's Metrics */}
          <Box sx={{ flex: { sm: 1 } }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                border: 1,
                borderColor: alpha(theme.palette.primary.main, 0.2),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AttachMoney color="primary" fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="primary">
                  {isRTL ? 'اليوم' : 'Today'}
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(metrics.today.totalRevenue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {metrics.today.totalSales} {isRTL ? 'معاملة' : 'transactions'}
              </Typography>
              {metrics.today.growthRate !== 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Box sx={{ color: getGrowthColor(metrics.today.growthRate), mr: 0.5 }}>
                    {getGrowthIcon(metrics.today.growthRate)}
                  </Box>
                  <Typography variant="caption" color={getGrowthColor(metrics.today.growthRate)}>
                    {metrics.today.growthRate > 0 ? '+' : ''}{metrics.today.growthRate.toFixed(1)}%
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

          {/* This Week's Metrics */}
          <Box sx={{ flex: { sm: 1 } }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.success.main, 0.05),
                border: 1,
                borderColor: alpha(theme.palette.success.main, 0.2),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ShoppingCart color="success" fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="success.main">
                  {isRTL ? 'هذا الأسبوع' : 'This Week'}
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(metrics.thisWeek.totalRevenue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {metrics.thisWeek.totalSales} {isRTL ? 'معاملة' : 'transactions'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isRTL ? 'متوسط:' : 'Avg:'} {formatCurrency(metrics.thisWeek.averageOrderValue)}
              </Typography>
            </Box>
          </Box>

          {/* This Month's Metrics */}
          <Box sx={{ flex: { sm: 1 } }}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.warning.main, 0.05),
                border: 1,
                borderColor: alpha(theme.palette.warning.main, 0.2),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp color="warning" fontSize="small" sx={{ mr: 1 }} />
                <Typography variant="subtitle2" color="warning.main">
                  {isRTL ? 'هذا الشهر' : 'This Month'}
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight="bold">
                {formatCurrency(metrics.thisMonth.totalRevenue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {metrics.thisMonth.totalSales} {isRTL ? 'معاملة' : 'transactions'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isRTL ? 'ربح:' : 'Profit:'} {metrics.thisMonth.profitMargin.toFixed(1)}%
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Top Products Today */}
        {metrics.topProductsToday.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {isRTL ? 'أفضل المنتجات اليوم' : "Today's Top Products"}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {metrics.topProductsToday.slice(0, 3).map((product, index) => (
                <Chip
                  key={product.productId}
                  label={`${index + 1}. ${product.productName}`}
                  size="small"
                  color={index === 0 ? 'primary' : 'default'}
                  variant={index === 0 ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}