import React, { useMemo } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  useTheme,
  alpha,
  FormControl,
  Select,
  MenuItem,
  Stack,
} from '@mui/material';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ComposedChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import { format, startOfDay, eachDayOfInterval, startOfWeek, eachWeekOfInterval, startOfMonth, eachMonthOfInterval } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toDateSafe } from '../../utils/dateUtils';
import type { FinancialTransaction } from '../../types/finance.types';

interface CashFlowChartProps {
  transactions: FinancialTransaction[];
  startDate: Date;
  endDate: Date;
  viewMode?: 'daily' | 'weekly' | 'monthly';
}

interface CashFlowData {
  date: string;
  inflow: number;
  outflow: number;
  netFlow: number;
  cumulativeCashFlow: number;
}

export default function CashFlowChart({
  transactions,
  startDate,
  endDate,
  viewMode = 'daily',
}: CashFlowChartProps) {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  const cashFlowData = useMemo(() => {
    // Get date intervals based on view mode
    let intervals: Date[] = [];
    let dateFormat = 'dd/MM';
    
    switch (viewMode) {
      case 'daily':
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
        dateFormat = 'dd/MM';
        break;
      case 'weekly':
        intervals = eachWeekOfInterval({ start: startDate, end: endDate });
        dateFormat = 'dd/MM';
        break;
      case 'monthly':
        intervals = eachMonthOfInterval({ start: startDate, end: endDate });
        dateFormat = 'MMM yyyy';
        break;
    }

    // Calculate cash flow for each interval
    let cumulativeCashFlow = 0;
    const data: CashFlowData[] = intervals.map(intervalDate => {
      const nextDate = new Date(intervalDate);
      
      switch (viewMode) {
        case 'daily':
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case 'weekly':
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case 'monthly':
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
      }

      const intervalTransactions = transactions.filter(t => {
        const txDate = toDateSafe(t.date);
        return txDate >= intervalDate && txDate < nextDate && t.status === 'completed';
      });

      const inflow = intervalTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.totalAmount, 0);

      const outflow = intervalTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.totalAmount, 0);

      const netFlow = inflow - outflow;
      cumulativeCashFlow += netFlow;

      return {
        date: format(intervalDate, dateFormat, { locale }),
        inflow,
        outflow,
        netFlow,
        cumulativeCashFlow,
      };
    });

    return data;
  }, [transactions, startDate, endDate, viewMode]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: entry.color,
                }}
              />
              <Typography variant="caption">
                {entry.name}: {formatCurrency(entry.value)}
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    return null;
  };

  // Calculate summary metrics
  const totalInflow = cashFlowData.reduce((sum, item) => sum + item.inflow, 0);
  const totalOutflow = cashFlowData.reduce((sum, item) => sum + item.outflow, 0);
  const netCashFlow = totalInflow - totalOutflow;
  const averageDailyFlow = netCashFlow / cashFlowData.length;

  return (
    <Box>
      {/* Cash Flow Area Chart */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            {isRTL ? 'التدفق النقدي' : 'Cash Flow'}
          </Typography>
          <Stack direction="row" spacing={2}>
            <Chip
              label={isRTL ? `إجمالي الوارد: ${formatCurrency(totalInflow)}` : `Total Inflow: ${formatCurrency(totalInflow)}`}
              color="success"
              variant="outlined"
            />
            <Chip
              label={isRTL ? `إجمالي الصادر: ${formatCurrency(totalOutflow)}` : `Total Outflow: ${formatCurrency(totalOutflow)}`}
              color="error"
              variant="outlined"
            />
            <Chip
              label={isRTL ? `صافي التدفق: ${formatCurrency(netCashFlow)}` : `Net Flow: ${formatCurrency(netCashFlow)}`}
              color={netCashFlow >= 0 ? 'success' : 'error'}
            />
          </Stack>
        </Box>

        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={cashFlowData}>
            <defs>
              <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.success.main} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={theme.palette.success.main} stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.palette.error.main} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={theme.palette.error.main} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
            <XAxis 
              dataKey="date" 
              style={{ fontSize: '0.875rem' }}
              tick={{ fill: theme.palette.text.secondary }}
            />
            <YAxis 
              style={{ fontSize: '0.875rem' }}
              tick={{ fill: theme.palette.text.secondary }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="inflow"
              stackId="1"
              stroke={theme.palette.success.main}
              fill="url(#colorInflow)"
              name={isRTL ? 'الوارد' : 'Inflow'}
            />
            <Area
              type="monotone"
              dataKey="outflow"
              stackId="2"
              stroke={theme.palette.error.main}
              fill="url(#colorOutflow)"
              name={isRTL ? 'الصادر' : 'Outflow'}
            />
            <Bar
              dataKey="netFlow"
              fill={theme.palette.info.main}
              name={isRTL ? 'صافي التدفق' : 'Net Flow'}
              opacity={0.8}
            />
            <ReferenceLine y={0} stroke={theme.palette.divider} />
          </ComposedChart>
        </ResponsiveContainer>
      </Paper>

      {/* Cumulative Cash Flow Chart */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            {isRTL ? 'التدفق النقدي التراكمي' : 'Cumulative Cash Flow'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isRTL ? 'متوسط التدفق اليومي:' : 'Average Daily Flow:'} {formatCurrency(averageDailyFlow)}
          </Typography>
        </Box>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={cashFlowData}>
            <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
            <XAxis 
              dataKey="date" 
              style={{ fontSize: '0.875rem' }}
              tick={{ fill: theme.palette.text.secondary }}
            />
            <YAxis 
              style={{ fontSize: '0.875rem' }}
              tick={{ fill: theme.palette.text.secondary }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="cumulativeCashFlow"
              stroke={theme.palette.primary.main}
              strokeWidth={3}
              dot={false}
              name={isRTL ? 'التدفق التراكمي' : 'Cumulative Flow'}
            />
            <ReferenceLine y={0} stroke={theme.palette.divider} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>

        {/* Cash Flow Health Indicator */}
        <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {isRTL ? 'مؤشرات الصحة المالية' : 'Financial Health Indicators'}
          </Typography>
          <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {isRTL ? 'معدل التدفق' : 'Flow Rate'}
              </Typography>
              <Typography variant="body1" fontWeight="bold" color={netCashFlow >= 0 ? 'success.main' : 'error.main'}>
                {netCashFlow >= 0 ? '+' : ''}{((netCashFlow / totalInflow) * 100).toFixed(1)}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {isRTL ? 'نسبة المصروفات' : 'Expense Ratio'}
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {totalInflow > 0 ? ((totalOutflow / totalInflow) * 100).toFixed(1) : 0}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                {isRTL ? 'أيام النقد المتاحة' : 'Cash Days Available'}
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {averageDailyFlow < 0 
                  ? Math.abs(Math.floor(cashFlowData[cashFlowData.length - 1]?.cumulativeCashFlow / averageDailyFlow)) || 0
                  : '∞'
                }
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}