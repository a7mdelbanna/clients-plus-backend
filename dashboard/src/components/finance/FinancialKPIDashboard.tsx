import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  useTheme,
  alpha,
  Chip,
  LinearProgress,
  Stack,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Receipt,
  AccountBalance,
  Timeline,
  Speed,
  PieChart,
  Groups,
  CalendarMonth,
} from '@mui/icons-material';
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toDateSafe } from '../../utils/dateUtils';
import type { FinancialTransaction } from '../../types/finance.types';

interface FinancialKPIDashboardProps {
  transactions: FinancialTransaction[];
  previousPeriodTransactions?: FinancialTransaction[];
  startDate: Date;
  endDate: Date;
}

interface KPIMetric {
  label: string;
  value: number;
  change?: number;
  format: 'currency' | 'percentage' | 'number' | 'days';
  icon: React.ReactNode;
  color: string;
}

export default function FinancialKPIDashboard({
  transactions,
  previousPeriodTransactions = [],
  startDate,
  endDate,
}: FinancialKPIDashboardProps) {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  // Calculate KPI metrics
  const kpiMetrics = useMemo(() => {
    // Current period calculations
    const currentIncome = transactions
      .filter(t => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const currentExpenses = transactions
      .filter(t => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const netProfit = currentIncome - currentExpenses;
    const profitMargin = currentIncome > 0 ? (netProfit / currentIncome) * 100 : 0;

    // Previous period calculations
    const previousIncome = previousPeriodTransactions
      .filter(t => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const previousExpenses = previousPeriodTransactions
      .filter(t => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const previousNetProfit = previousIncome - previousExpenses;

    // Calculate changes
    const revenueChange = previousIncome > 0 
      ? ((currentIncome - previousIncome) / previousIncome) * 100 
      : currentIncome > 0 ? 100 : 0;

    const expenseChange = previousExpenses > 0
      ? ((currentExpenses - previousExpenses) / previousExpenses) * 100
      : currentExpenses > 0 ? 100 : 0;

    const profitChange = previousNetProfit !== 0
      ? ((netProfit - previousNetProfit) / Math.abs(previousNetProfit)) * 100
      : netProfit > 0 ? 100 : -100;

    // Cash flow metrics
    const dailyCashFlow = differenceInDays(endDate, startDate) > 0
      ? netProfit / differenceInDays(endDate, startDate)
      : netProfit;

    // Transaction metrics
    const avgTransactionValue = transactions.length > 0
      ? (currentIncome + currentExpenses) / transactions.length
      : 0;

    const transactionCount = transactions.length;
    const previousTransactionCount = previousPeriodTransactions.length;
    const transactionChange = previousTransactionCount > 0
      ? ((transactionCount - previousTransactionCount) / previousTransactionCount) * 100
      : transactionCount > 0 ? 100 : 0;

    // Expense ratio
    const expenseRatio = currentIncome > 0 ? (currentExpenses / currentIncome) * 100 : 0;

    // Cash runway (days of cash available at current burn rate)
    const cashRunway = dailyCashFlow < 0 ? Math.abs(netProfit / dailyCashFlow) : Infinity;

    const metrics: KPIMetric[] = [
      {
        label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
        value: currentIncome,
        change: revenueChange,
        format: 'currency',
        icon: <TrendingUp />,
        color: theme.palette.success.main,
      },
      {
        label: isRTL ? 'صافي الربح' : 'Net Profit',
        value: netProfit,
        change: profitChange,
        format: 'currency',
        icon: <AttachMoney />,
        color: netProfit >= 0 ? theme.palette.success.main : theme.palette.error.main,
      },
      {
        label: isRTL ? 'هامش الربح' : 'Profit Margin',
        value: profitMargin,
        change: previousIncome > 0 ? profitMargin - ((previousNetProfit / previousIncome) * 100) : profitMargin,
        format: 'percentage',
        icon: <PieChart />,
        color: theme.palette.primary.main,
      },
      {
        label: isRTL ? 'إجمالي المصروفات' : 'Total Expenses',
        value: currentExpenses,
        change: expenseChange,
        format: 'currency',
        icon: <TrendingDown />,
        color: theme.palette.error.main,
      },
      {
        label: isRTL ? 'متوسط قيمة المعاملة' : 'Avg Transaction Value',
        value: avgTransactionValue,
        format: 'currency',
        icon: <Receipt />,
        color: theme.palette.info.main,
      },
      {
        label: isRTL ? 'عدد المعاملات' : 'Transaction Count',
        value: transactionCount,
        change: transactionChange,
        format: 'number',
        icon: <Groups />,
        color: theme.palette.warning.main,
      },
      {
        label: isRTL ? 'نسبة المصروفات' : 'Expense Ratio',
        value: expenseRatio,
        format: 'percentage',
        icon: <Speed />,
        color: theme.palette.secondary.main,
      },
      {
        label: isRTL ? 'التدفق النقدي اليومي' : 'Daily Cash Flow',
        value: dailyCashFlow,
        format: 'currency',
        icon: <Timeline />,
        color: dailyCashFlow >= 0 ? theme.palette.success.main : theme.palette.error.main,
      },
    ];

    return metrics;
  }, [transactions, previousPeriodTransactions, startDate, endDate, theme, isRTL]);

  // Daily trend data
  const dailyTrendData = useMemo(() => {
    const dailyMap = new Map<string, { income: number; expenses: number }>();
    
    transactions.forEach(transaction => {
      const dateKey = format(toDateSafe(transaction.date), 'yyyy-MM-dd');
      const existing = dailyMap.get(dateKey) || { income: 0, expenses: 0 };
      
      if (transaction.type === 'income') {
        existing.income += transaction.totalAmount;
      } else {
        existing.expenses += transaction.totalAmount;
      }
      
      dailyMap.set(dateKey, existing);
    });

    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date: format(new Date(date), 'MMM dd'),
        income: data.income,
        expenses: data.expenses,
        profit: data.income - data.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  // Category distribution
  const categoryDistribution = useMemo(() => {
    const categoryMap = new Map<string, number>();
    
    transactions
      .filter(t => t.type === 'expense' && t.category)
      .forEach(t => {
        categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + t.totalAmount);
      });

    const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);
    
    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [transactions]);

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
          style: 'currency',
          currency: 'EGP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
        return value.toLocaleString();
      case 'days':
        return `${Math.round(value)} ${isRTL ? 'يوم' : 'days'}`;
      default:
        return value.toString();
    }
  };

  const getChangeColor = (change?: number) => {
    if (!change || change === 0) return theme.palette.text.secondary;
    return change > 0 ? theme.palette.success.main : theme.palette.error.main;
  };

  const chartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
  ];

  return (
    <Box>
      {/* KPI Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2,
                    bgcolor: alpha(metric.color, 0.1),
                    color: metric.color,
                    mr: 2,
                  }}
                >
                  {metric.icon}
                </Box>
                <Typography variant="subtitle2" color="text.secondary">
                  {metric.label}
                </Typography>
              </Box>
              <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
                {formatValue(metric.value, metric.format)}
              </Typography>
              {metric.change !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ color: getChangeColor(metric.change), mr: 0.5 }}>
                    {metric.change > 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />}
                  </Box>
                  <Typography variant="body2" color={getChangeColor(metric.change)}>
                    {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    {isRTL ? 'من الفترة السابقة' : 'from last period'}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3}>
        {/* Daily Trend Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {isRTL ? 'الاتجاه اليومي للإيرادات والمصروفات' : 'Daily Revenue & Expense Trend'}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyTrendData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                <XAxis dataKey="date" style={{ fontSize: '0.875rem' }} />
                <YAxis style={{ fontSize: '0.875rem' }} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => formatValue(value, 'currency')}
                  contentStyle={{
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stackId="1"
                  stroke={theme.palette.success.main}
                  fill="url(#colorIncome)"
                  name={isRTL ? 'الإيرادات' : 'Income'}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stackId="2"
                  stroke={theme.palette.error.main}
                  fill="url(#colorExpenses)"
                  name={isRTL ? 'المصروفات' : 'Expenses'}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke={theme.palette.primary.main}
                  strokeWidth={2}
                  name={isRTL ? 'الربح' : 'Profit'}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Expense Categories */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              {isRTL ? 'أعلى فئات المصروفات' : 'Top Expense Categories'}
            </Typography>
            <Stack spacing={2} sx={{ mt: 3 }}>
              {categoryDistribution.map((category, index) => (
                <Box key={category.category}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">{category.category}</Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatValue(category.amount, 'currency')}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={category.percentage}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: alpha(chartColors[index % chartColors.length], 0.2),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: chartColors[index % chartColors.length],
                      },
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {category.percentage.toFixed(1)}%
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}