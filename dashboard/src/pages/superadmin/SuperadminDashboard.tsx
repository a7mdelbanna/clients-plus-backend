import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Business,
  AttachMoney,
  People,
  Warning,
  CheckCircle,
  MoreVert,
  Refresh,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
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
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { superadminService, type PlatformAnalytics, type BusinessSummary } from '../../services/superadmin.service';

const SuperadminDashboard: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [recentBusinesses, setRecentBusinesses] = useState<BusinessSummary[]>([]);

  // Load real data on component mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading superadmin dashboard data...');
      
      // Load analytics first
      console.log('📊 Loading platform analytics...');
      const analyticsData = await superadminService.getPlatformAnalytics();
      console.log('✅ Analytics loaded successfully:', analyticsData);
      setAnalytics(analyticsData);
      
      // Then load recent businesses
      console.log('🏢 Loading recent businesses...');
      const businessesData = await superadminService.getBusinesses({}, 5);
      console.log('✅ Businesses loaded successfully:', businessesData);
      setRecentBusinesses(businessesData.businesses);
      
      console.log('🎉 Dashboard data loading completed successfully');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // Set empty data to prevent crashes
      setAnalytics({
        totalBusinesses: 0,
        activeBusinesses: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalUsers: 0,
        averageRevenuePerUser: 0,
        churnRate: 0,
        growthRate: 0,
        planDistribution: [],
        revenueByPlan: [],
        monthlyTrend: [],
      });
      setRecentBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  // Plan colors mapping
  const planColors: { [key: string]: string } = {
    free: '#9E9E9E',
    starter: '#4CAF50',
    professional: '#2196F3', 
    business: '#FF9800',
    enterprise: '#9C27B0',
  };

  // Convert analytics plan distribution to chart format
  const planDistribution = analytics?.planDistribution.map(plan => ({
    name: plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1),
    value: plan.count,
    color: planColors[plan.plan.toLowerCase()] || '#666'
  })) || [];

  const StatCard = ({ title, value, icon, trend, trendValue, color, prefix = '', suffix = '' }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        sx={{
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.1)',
          height: '100%',
        }}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 1 }}>
                {title}
              </Typography>
              <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 1 }}>
                {prefix}
                <CountUp end={value} duration={2} separator="," decimals={suffix === '%' ? 1 : 0} />
                {suffix}
              </Typography>
              {trend && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {trend === 'up' ? (
                    <TrendingUp sx={{ color: '#4CAF50', fontSize: 20 }} />
                  ) : (
                    <TrendingDown sx={{ color: '#f44336', fontSize: 20 }} />
                  )}
                  <Typography variant="body2" sx={{ color: trend === 'up' ? '#4CAF50' : '#f44336' }}>
                    {trendValue}%
                  </Typography>
                </Box>
              )}
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                backgroundColor: `${color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {icon}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2 }} color="error" />}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold', mb: 0.5 }}>
            Superadmin Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
            Real-time platform analytics and monitoring
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          sx={{
            backgroundColor: '#ff4444',
            '&:hover': { backgroundColor: '#cc0000' },
          }}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Businesses"
            value={analytics?.totalBusinesses || 0}
            icon={<Business sx={{ color: '#ff4444' }} />}
            trend="up"
            trendValue={analytics?.growthRate || 0}
            color="#ff4444"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Monthly Revenue"
            value={analytics?.monthlyRevenue || 0}
            icon={<AttachMoney sx={{ color: '#4CAF50' }} />}
            trend="up"
            trendValue={12.3}
            color="#4CAF50"
            prefix="EGP "
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={analytics?.totalUsers || 0}
            icon={<People sx={{ color: '#2196F3' }} />}
            trend="up"
            trendValue={15.2}
            color="#2196F3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Churn Rate"
            value={analytics?.churnRate || 0}
            icon={<Warning sx={{ color: '#FF9800' }} />}
            trend="down"
            trendValue={0.8}
            color="#FF9800"
            suffix="%"
          />
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Typography variant="h6" sx={{ color: '#fff', mb: 3 }}>
              Revenue & Growth Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics?.monthlyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2a2a2a',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ff4444"
                  fill="#ff4444"
                  fillOpacity={0.3}
                />
                <Line type="monotone" dataKey="businesses" stroke="#4CAF50" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Plan Distribution */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.1)',
              height: '100%',
            }}
          >
            <Typography variant="h6" sx={{ color: '#fff', mb: 3 }}>
              Plan Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#2a2a2a',
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 2 }}>
              {planDistribution.map((plan) => (
                <Box
                  key={plan.name}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: plan.color,
                      }}
                    />
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      {plan.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                    {plan.value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Businesses Table */}
      <Paper
        sx={{
          p: 3,
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: '#fff' }}>
            Recent Businesses
          </Typography>
          <Button
            variant="outlined"
            size="small"
            sx={{
              borderColor: 'rgba(255,255,255,0.3)',
              color: '#fff',
              '&:hover': { borderColor: '#ff4444' },
            }}
          >
            View All
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  Business Name
                </TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  Plan
                </TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  Status
                </TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  Monthly Revenue
                </TableCell>
                <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentBusinesses.length > 0 ? recentBusinesses.map((business) => (
                <TableRow key={business.id}>
                  <TableCell sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.1)' }}>
                    {business.name || business.businessName || 'Unnamed Business'}
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Chip
                      label={business.plan.charAt(0).toUpperCase() + business.plan.slice(1)}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Chip
                      label={business.status}
                      size="small"
                      icon={
                        business.status === 'active' ? (
                          <CheckCircle sx={{ fontSize: 16 }} />
                        ) : (
                          <Warning sx={{ fontSize: 16 }} />
                        )
                      }
                      sx={{
                        backgroundColor:
                          business.status === 'active'
                            ? 'rgba(76, 175, 80, 0.2)'
                            : business.status === 'pending'
                            ? 'rgba(255, 152, 0, 0.2)'
                            : 'rgba(244, 67, 54, 0.2)',
                        color:
                          business.status === 'active'
                            ? '#4CAF50'
                            : business.status === 'pending'
                            ? '#FF9800'
                            : '#f44336',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.1)' }}>
                    EGP {business.monthlyRevenue.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                    <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    sx={{ 
                      color: 'rgba(255,255,255,0.6)', 
                      borderColor: 'rgba(255,255,255,0.1)',
                      textAlign: 'center',
                      py: 4
                    }}
                  >
                    {loading ? 'Loading businesses...' : 'No businesses found'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default SuperadminDashboard;