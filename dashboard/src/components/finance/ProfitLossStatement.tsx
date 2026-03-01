import React from 'react';
import {
  Paper,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import type { FinancialTransaction } from '../../types/finance.types';

interface ProfitLossStatementProps {
  transactions: FinancialTransaction[];
  startDate: Date;
  endDate: Date;
  previousPeriodTransactions?: FinancialTransaction[];
}

interface CategorySummary {
  category: string;
  currentAmount: number;
  previousAmount: number;
  percentageChange: number;
}

export default function ProfitLossStatement({
  transactions,
  startDate,
  endDate,
  previousPeriodTransactions = [],
}: ProfitLossStatementProps) {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  // Calculate income categories
  const calculateCategorySummary = (
    txns: FinancialTransaction[],
    type: 'income' | 'expense'
  ): Record<string, number> => {
    return txns
      .filter(t => t.type === type && t.status === 'completed')
      .reduce((acc, t) => {
        const category = t.category || (type === 'income' ? 'مبيعات عامة' : 'مصروفات عامة');
        acc[category] = (acc[category] || 0) + t.totalAmount;
        return acc;
      }, {} as Record<string, number>);
  };

  const currentIncome = calculateCategorySummary(transactions, 'income');
  const currentExpenses = calculateCategorySummary(transactions, 'expense');
  const previousIncome = calculateCategorySummary(previousPeriodTransactions, 'income');
  const previousExpenses = calculateCategorySummary(previousPeriodTransactions, 'expense');

  // Merge categories and calculate changes
  const getCategories = (
    current: Record<string, number>,
    previous: Record<string, number>
  ): CategorySummary[] => {
    const allCategories = new Set([...Object.keys(current), ...Object.keys(previous)]);
    
    return Array.from(allCategories).map(category => {
      const currentAmount = current[category] || 0;
      const previousAmount = previous[category] || 0;
      const percentageChange = previousAmount > 0
        ? ((currentAmount - previousAmount) / previousAmount) * 100
        : currentAmount > 0 ? 100 : 0;

      return {
        category,
        currentAmount,
        previousAmount,
        percentageChange,
      };
    }).sort((a, b) => b.currentAmount - a.currentAmount);
  };

  const incomeCategories = getCategories(currentIncome, previousIncome);
  const expenseCategories = getCategories(currentExpenses, previousExpenses);

  // Calculate totals
  const totalIncome = Object.values(currentIncome).reduce((sum, amount) => sum + amount, 0);
  const totalExpenses = Object.values(currentExpenses).reduce((sum, amount) => sum + amount, 0);
  const netProfit = totalIncome - totalExpenses;

  const previousTotalIncome = Object.values(previousIncome).reduce((sum, amount) => sum + amount, 0);
  const previousTotalExpenses = Object.values(previousExpenses).reduce((sum, amount) => sum + amount, 0);
  const previousNetProfit = previousTotalIncome - previousTotalExpenses;

  const netProfitChange = previousNetProfit > 0
    ? ((netProfit - previousNetProfit) / previousNetProfit) * 100
    : netProfit > 0 ? 100 : 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    const formatted = `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    return formatted;
  };

  const getChangeColor = (value: number, isExpense: boolean = false) => {
    if (value === 0) return theme.palette.text.secondary;
    if (isExpense) {
      return value > 0 ? theme.palette.error.main : theme.palette.success.main;
    }
    return value > 0 ? theme.palette.success.main : theme.palette.error.main;
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {isRTL ? 'بيان الأرباح والخسائر' : 'Profit & Loss Statement'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isRTL ? 'من' : 'From'} {startDate.toLocaleDateString()} {isRTL ? 'إلى' : 'to'} {endDate.toLocaleDateString()}
        </Typography>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{isRTL ? 'البند' : 'Item'}</TableCell>
              <TableCell align="right">{isRTL ? 'المبلغ الحالي' : 'Current Amount'}</TableCell>
              <TableCell align="right">{isRTL ? 'المبلغ السابق' : 'Previous Amount'}</TableCell>
              <TableCell align="right">{isRTL ? 'التغيير' : 'Change'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Income Section */}
            <TableRow>
              <TableCell colSpan={4} sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), fontWeight: 600 }}>
                {isRTL ? 'الإيرادات' : 'Income'}
              </TableCell>
            </TableRow>
            {incomeCategories.map((item) => (
              <TableRow key={`income-${item.category}`}>
                <TableCell sx={{ pl: 4 }}>{item.category}</TableCell>
                <TableCell align="right">{formatCurrency(item.currentAmount)}</TableCell>
                <TableCell align="right">{formatCurrency(item.previousAmount)}</TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={formatPercentage(item.percentageChange)}
                    icon={item.percentageChange >= 0 ? <TrendingUp /> : <TrendingDown />}
                    sx={{
                      bgcolor: alpha(getChangeColor(item.percentageChange), 0.1),
                      color: getChangeColor(item.percentageChange),
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>{isRTL ? 'إجمالي الإيرادات' : 'Total Income'}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(totalIncome)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(previousTotalIncome)}
              </TableCell>
              <TableCell align="right">
                <Chip
                  size="small"
                  label={formatPercentage(
                    previousTotalIncome > 0
                      ? ((totalIncome - previousTotalIncome) / previousTotalIncome) * 100
                      : totalIncome > 0 ? 100 : 0
                  )}
                  icon={totalIncome >= previousTotalIncome ? <TrendingUp /> : <TrendingDown />}
                  sx={{
                    bgcolor: alpha(
                      getChangeColor(totalIncome - previousTotalIncome),
                      0.1
                    ),
                    color: getChangeColor(totalIncome - previousTotalIncome),
                  }}
                />
              </TableCell>
            </TableRow>

            {/* Expenses Section */}
            <TableRow>
              <TableCell colSpan={4} sx={{ bgcolor: alpha(theme.palette.error.main, 0.1), fontWeight: 600 }}>
                {isRTL ? 'المصروفات' : 'Expenses'}
              </TableCell>
            </TableRow>
            {expenseCategories.map((item) => (
              <TableRow key={`expense-${item.category}`}>
                <TableCell sx={{ pl: 4 }}>{item.category}</TableCell>
                <TableCell align="right">{formatCurrency(item.currentAmount)}</TableCell>
                <TableCell align="right">{formatCurrency(item.previousAmount)}</TableCell>
                <TableCell align="right">
                  <Chip
                    size="small"
                    label={formatPercentage(item.percentageChange)}
                    icon={item.percentageChange >= 0 ? <TrendingUp /> : <TrendingDown />}
                    sx={{
                      bgcolor: alpha(getChangeColor(item.percentageChange, true), 0.1),
                      color: getChangeColor(item.percentageChange, true),
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>{isRTL ? 'إجمالي المصروفات' : 'Total Expenses'}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(totalExpenses)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                {formatCurrency(previousTotalExpenses)}
              </TableCell>
              <TableCell align="right">
                <Chip
                  size="small"
                  label={formatPercentage(
                    previousTotalExpenses > 0
                      ? ((totalExpenses - previousTotalExpenses) / previousTotalExpenses) * 100
                      : totalExpenses > 0 ? 100 : 0
                  )}
                  icon={totalExpenses >= previousTotalExpenses ? <TrendingUp /> : <TrendingDown />}
                  sx={{
                    bgcolor: alpha(
                      getChangeColor(totalExpenses - previousTotalExpenses, true),
                      0.1
                    ),
                    color: getChangeColor(totalExpenses - previousTotalExpenses, true),
                  }}
                />
              </TableCell>
            </TableRow>

            {/* Net Profit Section */}
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  bgcolor: alpha(
                    netProfit >= 0 ? theme.palette.success.main : theme.palette.error.main,
                    0.1
                  ),
                }}
              >
                {isRTL ? 'صافي الربح' : 'Net Profit'}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  color: netProfit >= 0 ? theme.palette.success.main : theme.palette.error.main,
                  bgcolor: alpha(
                    netProfit >= 0 ? theme.palette.success.main : theme.palette.error.main,
                    0.1
                  ),
                }}
              >
                {formatCurrency(netProfit)}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 700,
                  fontSize: '1.1rem',
                  bgcolor: alpha(
                    netProfit >= 0 ? theme.palette.success.main : theme.palette.error.main,
                    0.1
                  ),
                }}
              >
                {formatCurrency(previousNetProfit)}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  bgcolor: alpha(
                    netProfit >= 0 ? theme.palette.success.main : theme.palette.error.main,
                    0.1
                  ),
                }}
              >
                <Chip
                  size="small"
                  label={formatPercentage(netProfitChange)}
                  icon={netProfitChange >= 0 ? <TrendingUp /> : <TrendingDown />}
                  sx={{
                    bgcolor: alpha(getChangeColor(netProfitChange), 0.2),
                    color: getChangeColor(netProfitChange),
                    fontWeight: 600,
                  }}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Summary Metrics */}
      <Box sx={{ mt: 3, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {isRTL ? 'هامش الربح' : 'Profit Margin'}
          </Typography>
          <Typography variant="h6" color={netProfit >= 0 ? 'success.main' : 'error.main'}>
            {totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : 0}%
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {isRTL ? 'نسبة المصروفات' : 'Expense Ratio'}
          </Typography>
          <Typography variant="h6">
            {totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0}%
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}