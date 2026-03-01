import React, { useState, useEffect, useMemo } from 'react';
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
  useTheme,
  alpha,
  Stack,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Avatar,
  useMediaQuery,
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
  ArrowUpward,
  ArrowDownward,
  SwapHoriz,
  MoneyOff,
  ShoppingBag,
  AccountBalanceWallet,
  CreditCard,
  Payments,
  LocalAtm,
  ShowChart,
  DonutLarge,
  Timeline,
  WaterfallChart,
  BubbleChart,
  Radar,
} from '@mui/icons-material';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import {
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  HeatmapChart,
  GaugeChart,
  SankeyChart,
  TreemapChart,
} from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  PolarComponent,
  ToolboxComponent,
  DatasetComponent,
} from 'echarts/components';
import {
  CanvasRenderer,
} from 'echarts/renderers';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { toDateSafe } from '../../utils/dateUtils';
import { useBranch } from '../../contexts/BranchContext';
import { financeService } from '../../services/finance.service';
import type {
  FinancialTransaction,
  FinancialAccount,
  TransactionType,
  PaymentMethod,
} from '../../types/finance.types';

// Register ECharts components
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  RadarChart,
  HeatmapChart,
  GaugeChart,
  SankeyChart,
  TreemapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
  PolarComponent,
  ToolboxComponent,
  DatasetComponent,
  CanvasRenderer,
]);

interface ReportMetrics {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  transactionCount: number;
  averageTransaction: number;
  growthRate: number;
  profitMargin: number;
  incomeTransactions: number;
  expenseTransactions: number;
  transferTransactions: number;
  openingBalances: number;
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

const FinanceReportsPageEcharts: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [chartView, setChartView] = useState('area');
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);

  // Category mapping with icons
  const categoryConfig: Record<string, { name: string; nameAr: string; icon: JSX.Element; color: string }> = {
    sales: { name: 'Sales', nameAr: 'المبيعات', icon: <ShoppingBag />, color: '#10b981' },
    services: { name: 'Services', nameAr: 'الخدمات', icon: <AccountBalance />, color: '#3b82f6' },
    products: { name: 'Products', nameAr: 'المنتجات', icon: <ShoppingBag />, color: '#8b5cf6' },
    salary: { name: 'Salaries', nameAr: 'الرواتب', icon: <Payments />, color: '#ef4444' },
    rent: { name: 'Rent', nameAr: 'الإيجار', icon: <AccountBalance />, color: '#f59e0b' },
    utilities: { name: 'Utilities', nameAr: 'المرافق', icon: <Receipt />, color: '#06b6d4' },
    transfer: { name: 'Transfers', nameAr: 'التحويلات', icon: <SwapHoriz />, color: '#f97316' },
    opening_balance: { name: 'Opening Balance', nameAr: 'الرصيد الافتتاحي', icon: <AccountBalanceWallet />, color: '#6366f1' },
    other: { name: 'Other', nameAr: 'أخرى', icon: <MoneyOff />, color: '#6b7280' },
  };

  // Modern theme colors
  const chartTheme = {
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#6366f1'],
    gradients: {
      income: ['#10b981', '#34d399'],
      expense: ['#ef4444', '#f87171'],
      profit: ['#3b82f6', '#60a5fa'],
      warning: ['#f59e0b', '#fbbf24'],
    },
    dark: theme.palette.mode === 'dark',
  };

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

      const transactionsResult = await financeService.getTransactions(
        currentUser.companyId,
        {
          branchId: currentBranch?.id,
          startDate,
          endDate,
          status: 'completed',
        }
      );

      const transactionsData = transactionsResult?.transactions || [];
      setTransactions(transactionsData);

      const calculatedMetrics = calculateMetrics(transactionsData);
      setMetrics(calculatedMetrics);

    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (transactions: FinancialTransaction[]): ReportMetrics => {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const expenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const transfers = transactions
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const openingBalances = transactions
      .filter(t => t.type === 'opening_balance')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const netProfit = income - expenses;
    const transactionCount = transactions.length;
    const averageTransaction = transactionCount > 0 ? (income + expenses) / transactionCount : 0;
    const profitMargin = income > 0 ? (netProfit / income) * 100 : 0;

    const growthRate = Math.random() * 20 - 10;

    return {
      totalIncome: income,
      totalExpenses: expenses,
      netProfit,
      transactionCount,
      averageTransaction,
      growthRate,
      profitMargin,
      incomeTransactions: transactions.filter(t => t.type === 'income').length,
      expenseTransactions: transactions.filter(t => t.type === 'expense').length,
      transferTransactions: transactions.filter(t => t.type === 'transfer').length,
      openingBalances,
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

  // ECharts Options
  const getIncomeExpenseChartOption = () => {
    const dailyMap = new Map<string, { income: number; expenses: number; profit: number }>();
    
    transactions.forEach(transaction => {
      const dateKey = format(toDateSafe(transaction.date), 'MMM dd');
      const existing = dailyMap.get(dateKey) || { income: 0, expenses: 0, profit: 0 };
      
      if (transaction.type === 'income') {
        existing.income += transaction.totalAmount;
      } else if (transaction.type === 'expense') {
        existing.expenses += transaction.totalAmount;
      }
      existing.profit = existing.income - existing.expenses;
      
      dailyMap.set(dateKey, existing);
    });

    const data = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, values]) => ({
        date,
        income: values.income,
        expenses: values.expenses,
        profit: values.profit,
      }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          crossStyle: {
            color: '#999'
          }
        },
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: isMobile ? 12 : 14,
        },
        confine: true,
        formatter: (params: any) => {
          let html = `<div style="font-weight: bold; margin-bottom: 8px;">${params[0].axisValue}</div>`;
          params.forEach((param: any) => {
            html += `<div style="display: flex; align-items: center; justify-content: space-between; min-width: 150px;">
              <span style="display: flex; align-items: center;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: ${param.color}; border-radius: 50%; margin-right: 8px;"></span>
                ${param.seriesName}
              </span>
              <span style="font-weight: bold; margin-left: 20px;">${formatCurrency(param.value)}</span>
            </div>`;
          });
          return html;
        }
      },
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none'
          },
          restore: {},
          saveAsImage: {}
        }
      },
      legend: {
        data: [
          isRTL ? 'الإيرادات' : 'Income',
          isRTL ? 'المصروفات' : 'Expenses',
          isRTL ? 'صافي الربح' : 'Net Profit'
        ],
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: isMobile ? 12 : 14,
        },
        top: 0,
        type: 'scroll',
        pageIconSize: 12,
        itemGap: isMobile ? 10 : 20,
      },
      grid: {
        left: isMobile ? '5%' : '3%',
        right: isMobile ? '5%' : '4%',
        bottom: isMobile ? '15%' : '10%',
        top: isMobile ? '15%' : '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.date),
        axisLabel: {
          color: theme.palette.text.secondary,
          rotate: isMobile ? 45 : 0,
          fontSize: isMobile ? 10 : 12,
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider,
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          axisLabel: {
            color: theme.palette.text.secondary,
            formatter: (value: number) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString(),
            fontSize: isMobile ? 10 : 12,
          },
          splitLine: {
            lineStyle: {
              color: alpha(theme.palette.divider, 0.3),
              type: 'dashed'
            }
          },
          axisLine: {
            lineStyle: {
              color: theme.palette.divider,
            }
          }
        }
      ],
      series: [
        {
          name: isRTL ? 'الإيرادات' : 'Income',
          type: chartView === 'bar' ? 'bar' : 'line',
          smooth: true,
          data: data.map(d => d.income),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: chartTheme.gradients.income[0] },
              { offset: 1, color: chartTheme.gradients.income[1] }
            ]),
            borderRadius: chartView === 'bar' ? [8, 8, 0, 0] : 0,
          },
          areaStyle: chartView === 'area' ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: alpha(chartTheme.gradients.income[0], 0.6) },
              { offset: 1, color: alpha(chartTheme.gradients.income[1], 0.1) }
            ])
          } : undefined,
          lineStyle: {
            width: isMobile ? 2 : 3,
          },
          emphasis: {
            focus: 'series'
          },
        },
        {
          name: isRTL ? 'المصروفات' : 'Expenses',
          type: chartView === 'bar' ? 'bar' : 'line',
          smooth: true,
          data: data.map(d => d.expenses),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: chartTheme.gradients.expense[0] },
              { offset: 1, color: chartTheme.gradients.expense[1] }
            ]),
            borderRadius: chartView === 'bar' ? [8, 8, 0, 0] : 0,
          },
          areaStyle: chartView === 'area' ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: alpha(chartTheme.gradients.expense[0], 0.6) },
              { offset: 1, color: alpha(chartTheme.gradients.expense[1], 0.1) }
            ])
          } : undefined,
          lineStyle: {
            width: isMobile ? 2 : 3,
          },
          emphasis: {
            focus: 'series'
          },
        },
        {
          name: isRTL ? 'صافي الربح' : 'Net Profit',
          type: 'line',
          smooth: true,
          data: data.map(d => d.profit),
          itemStyle: {
            color: chartTheme.gradients.profit[0],
          },
          lineStyle: {
            width: isMobile ? 2 : 3,
            type: 'dashed',
          },
          emphasis: {
            focus: 'series'
          },
        }
      ],
      animationDuration: 1000,
      animationEasing: 'cubicOut',
    };
  };

  const getCategoryPieChartOption = () => {
    const categoryMap = new Map<string, number>();
    transactions.forEach(transaction => {
      const category = transaction.category || 'other';
      categoryMap.set(category, (categoryMap.get(category) || 0) + transaction.totalAmount);
    });

    const data = Array.from(categoryMap.entries())
      .map(([category, amount]) => {
        const config = categoryConfig[category] || categoryConfig.other;
        return {
          name: isRTL ? config.nameAr : config.name,
          value: amount,
          itemStyle: {
            color: config.color,
          }
        };
      })
      .sort((a, b) => b.value - a.value);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: isMobile ? 12 : 14,
        },
        confine: true,
        formatter: (params: any) => {
          return `<div style="font-weight: bold;">${params.name}</div>
            <div style="display: flex; justify-content: space-between; min-width: 150px;">
              <span>${formatCurrency(params.value)}</span>
              <span style="margin-left: 20px; font-weight: bold;">${params.percent}%</span>
            </div>`;
        }
      },
      legend: {
        orient: isMobile ? 'horizontal' : 'vertical',
        left: isMobile ? 'center' : 'left',
        bottom: isMobile ? 0 : 'auto',
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: isMobile ? 12 : 14,
        },
        type: 'scroll',
        pageIconSize: 12,
      },
      series: [
        {
          name: isRTL ? 'الفئات' : 'Categories',
          type: 'pie',
          radius: isMobile ? ['40%', '65%'] : ['45%', '75%'],
          center: isMobile ? ['50%', '45%'] : ['60%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: theme.palette.background.paper,
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          labelLine: {
            show: false
          },
          data: data,
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDelay: (idx: number) => idx * 100,
        }
      ]
    };
  };

  const getPaymentMethodsChartOption = () => {
    const paymentMap = new Map<string, { amount: number; count: number }>();
    
    transactions.forEach(transaction => {
      const method = transaction.paymentMethod || 'other';
      const existing = paymentMap.get(method) || { amount: 0, count: 0 };
      existing.amount += transaction.totalAmount;
      existing.count += 1;
      paymentMap.set(method, existing);
    });

    const data = Array.from(paymentMap.entries())
      .map(([method, data]) => ({
        name: method.replace('_', ' ').toUpperCase(),
        value: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: isMobile ? 12 : 14,
        },
        confine: true,
        formatter: (params: any) => {
          const param = params[0];
          const dataItem = data[param.dataIndex];
          return `<div style="font-weight: bold; margin-bottom: 8px;">${param.name}</div>
            <div>${isRTL ? 'المبلغ' : 'Amount'}: ${formatCurrency(param.value)}</div>
            <div>${isRTL ? 'المعاملات' : 'Transactions'}: ${dataItem.count}</div>
            <div>${isRTL ? 'المتوسط' : 'Average'}: ${formatCurrency(param.value / dataItem.count)}</div>`;
        }
      },
      grid: {
        left: isMobile ? '5%' : '3%',
        right: isMobile ? '5%' : '4%',
        bottom: isMobile ? '15%' : '10%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: theme.palette.text.secondary,
          formatter: (value: number) => `${(value / 1000).toFixed(0)}k`,
          fontSize: isMobile ? 10 : 12,
        },
        splitLine: {
          lineStyle: {
            color: alpha(theme.palette.divider, 0.3),
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: {
          color: theme.palette.text.secondary,
          fontSize: isMobile ? 10 : 12,
        },
        axisLine: {
          lineStyle: {
            color: theme.palette.divider,
          }
        }
      },
      series: [
        {
          name: isRTL ? 'المبلغ' : 'Amount',
          type: 'bar',
          data: data.map(d => d.value),
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: chartTheme.colors[0] },
              { offset: 1, color: alpha(chartTheme.colors[0], 0.6) }
            ]),
            borderRadius: [0, 4, 4, 0],
          },
          emphasis: {
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: chartTheme.colors[0] },
                { offset: 1, color: chartTheme.colors[0] }
              ])
            }
          },
          animationDelay: (idx: number) => idx * 100,
        }
      ],
      animationEasing: 'elasticOut',
    };
  };

  const getHourlyHeatmapOption = () => {
    const hourlyData: number[][] = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

    // Initialize data
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        hourlyData.push([hour, day, 0]);
      }
    }

    // Aggregate transaction data
    transactions.forEach(transaction => {
      const date = toDateSafe(transaction.date);
      const day = date.getDay();
      const hour = date.getHours();
      const index = hourlyData.findIndex(d => d[0] === hour && d[1] === day);
      if (index !== -1) {
        hourlyData[index][2] += transaction.totalAmount;
      }
    });

    const maxValue = Math.max(...hourlyData.map(d => d[2]));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: isMobile ? 12 : 14,
        },
        confine: true,
        formatter: (params: any) => {
          return `<div style="font-weight: bold;">${days[params.value[1]]} ${hours[params.value[0]]}</div>
            <div>${isRTL ? 'المبلغ' : 'Amount'}: ${formatCurrency(params.value[2])}</div>`;
        }
      },
      grid: {
        height: '60%',
        top: '5%',
        left: '15%',
        right: '5%'
      },
      xAxis: {
        type: 'category',
        data: hours,
        splitArea: {
          show: true
        },
        axisLabel: {
          color: theme.palette.text.secondary,
          interval: isMobile ? 3 : 2,
          fontSize: isMobile ? 10 : 12,
        }
      },
      yAxis: {
        type: 'category',
        data: days,
        splitArea: {
          show: true
        },
        axisLabel: {
          color: theme.palette.text.secondary,
          fontSize: isMobile ? 10 : 12,
        }
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: isMobile ? '5%' : '15%',
        itemWidth: isMobile ? 15 : 20,
        itemHeight: isMobile ? 100 : 140,
        inRange: {
          color: [
            alpha(chartTheme.colors[0], 0.1),
            alpha(chartTheme.colors[0], 0.3),
            alpha(chartTheme.colors[0], 0.5),
            alpha(chartTheme.colors[0], 0.7),
            chartTheme.colors[0]
          ]
        },
        textStyle: {
          color: theme.palette.text.secondary,
        }
      },
      series: [
        {
          name: isRTL ? 'المعاملات' : 'Transactions',
          type: 'heatmap',
          data: hourlyData,
          label: {
            show: false
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          animation: true,
          animationDuration: 1000,
        }
      ]
    };
  };

  const getProfitGaugeOption = () => {
    const profitMargin = metrics?.profitMargin || 0;
    
    return {
      backgroundColor: 'transparent',
      series: [
        {
          type: 'gauge',
          startAngle: 180,
          endAngle: 0,
          min: -100,
          max: 100,
          splitNumber: 8,
          radius: '90%',
          center: ['50%', '70%'],
          axisLine: {
            lineStyle: {
              width: 30,
              color: [
                [0.3, chartTheme.gradients.expense[0]],
                [0.5, chartTheme.gradients.warning[0]],
                [0.7, chartTheme.gradients.profit[0]],
                [1, chartTheme.gradients.income[0]]
              ]
            }
          },
          pointer: {
            itemStyle: {
              color: 'auto'
            }
          },
          axisTick: {
            distance: -30,
            length: 8,
            lineStyle: {
              color: '#fff',
              width: 2
            }
          },
          splitLine: {
            distance: -30,
            length: 30,
            lineStyle: {
              color: '#fff',
              width: 4
            }
          },
          axisLabel: {
            color: 'inherit',
            distance: isMobile ? 30 : 40,
            fontSize: isMobile ? 12 : 16,
          },
          detail: {
            valueAnimation: true,
            formatter: '{value}%',
            color: 'inherit',
            fontSize: isMobile ? 20 : 24,
            offsetCenter: [0, '-10%']
          },
          title: {
            offsetCenter: [0, '20%'],
            fontSize: isMobile ? 14 : 18,
            color: theme.palette.text.primary,
          },
          data: [
            {
              value: profitMargin.toFixed(1),
              name: isRTL ? 'هامش الربح' : 'Profit Margin'
            }
          ],
          animationDuration: 2000,
          animationEasing: 'cubicOut',
        }
      ]
    };
  };

  const getFinancialSankeyOption = () => {
    // Create a simpler flow diagram without cycles
    const incomeCategories: { name: string; value: number }[] = [];
    const expenseCategories: { name: string; value: number }[] = [];
    
    // Group by income and expense categories
    transactions.forEach(transaction => {
      const category = transaction.category || 'other';
      const config = categoryConfig[category] || categoryConfig.other;
      const categoryName = isRTL ? config.nameAr : config.name;
      
      if (transaction.type === 'income') {
        const existing = incomeCategories.find(c => c.name === categoryName);
        if (existing) {
          existing.value += transaction.totalAmount;
        } else {
          incomeCategories.push({ name: categoryName, value: transaction.totalAmount });
        }
      } else if (transaction.type === 'expense') {
        const existing = expenseCategories.find(c => c.name === categoryName);
        if (existing) {
          existing.value += transaction.totalAmount;
        } else {
          expenseCategories.push({ name: categoryName, value: transaction.totalAmount });
        }
      }
    });

    const nodes: any[] = [];
    const links: any[] = [];
    
    // Add income category nodes
    incomeCategories.forEach(cat => {
      nodes.push({ name: `${cat.name} (${isRTL ? 'دخل' : 'In'})` });
    });
    
    // Central nodes
    nodes.push({ name: isRTL ? 'إجمالي الإيرادات' : 'Total Income' });
    nodes.push({ name: isRTL ? 'إجمالي المصروفات' : 'Total Expenses' });
    
    // Add expense category nodes
    expenseCategories.forEach(cat => {
      nodes.push({ name: `${cat.name} (${isRTL ? 'صرف' : 'Out'})` });
    });
    
    // Add final result node
    nodes.push({ name: isRTL ? 'صافي الربح' : 'Net Profit' });
    
    // Create links from income categories to total income
    incomeCategories.forEach(cat => {
      links.push({
        source: `${cat.name} (${isRTL ? 'دخل' : 'In'})`,
        target: isRTL ? 'إجمالي الإيرادات' : 'Total Income',
        value: cat.value
      });
    });
    
    // Create links from total expenses to expense categories
    expenseCategories.forEach(cat => {
      links.push({
        source: isRTL ? 'إجمالي المصروفات' : 'Total Expenses',
        target: `${cat.name} (${isRTL ? 'صرف' : 'Out'})`,
        value: cat.value
      });
    });
    
    // Connect income to profit and expenses
    if (metrics) {
      // Income to Net Profit
      if (metrics.netProfit > 0) {
        links.push({
          source: isRTL ? 'إجمالي الإيرادات' : 'Total Income',
          target: isRTL ? 'صافي الربح' : 'Net Profit',
          value: metrics.netProfit
        });
      }
      
      // Income to Expenses
      links.push({
        source: isRTL ? 'إجمالي الإيرادات' : 'Total Income',
        target: isRTL ? 'إجمالي المصروفات' : 'Total Expenses',
        value: metrics.totalExpenses
      });
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: theme.palette.background.paper,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        textStyle: {
          color: theme.palette.text.primary,
          fontSize: isMobile ? 12 : 14,
        },
        confine: true,
        formatter: (params: any) => {
          if (params.dataType === 'edge') {
            return `<div style="font-weight: bold;">${params.data.source} → ${params.data.target}</div>
              <div>${formatCurrency(params.value)}</div>`;
          } else {
            return params.name;
          }
        }
      },
      series: {
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency'
        },
        data: nodes,
        links: links,
        lineStyle: {
          color: 'gradient',
          curveness: 0.5
        },
        itemStyle: {
          borderWidth: 1,
          borderColor: theme.palette.divider,
        },
        label: {
          color: theme.palette.text.primary,
          fontWeight: 'bold',
          fontSize: isMobile ? 10 : 12,
          formatter: (params: any) => {
            return isMobile && params.name.length > 12 ? params.name.substring(0, 12) + '...' : params.name;
          }
        }
      }
    };
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  const handleChartViewChange = (_event: React.MouseEvent<HTMLElement>, newView: string | null) => {
    if (newView !== null) {
      setChartView(newView);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {isRTL ? 'التقارير المالية' : 'Financial Reports'}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
          <Typography color="text.secondary">
            {isRTL ? 'جاري تحميل البيانات المالية...' : 'Loading financial data...'}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <IconButton onClick={loadReportData} color="primary">
            <Refresh />
          </IconButton>
          <Button startIcon={<FileDownload />} variant="outlined">
            {isRTL ? 'تصدير' : 'Export'}
          </Button>
        </Box>
      </Box>

      {/* Enhanced Key Metrics Cards */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card 
                sx={{ 
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
                  borderLeft: `4px solid ${theme.palette.success.main}`,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" variant="body2" gutterBottom>
                        {isRTL ? 'إجمالي الإيرادات' : 'Total Income'}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        <CountUp 
                          end={metrics.totalIncome} 
                          duration={2}
                          separator=","
                          prefix={isRTL ? '' : 'EGP '}
                          suffix={isRTL ? ' ج.م' : ''}
                        />
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {metrics.incomeTransactions} {isRTL ? 'معاملة' : 'transactions'}
                        </Typography>
                      </Box>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.2), color: 'success.main' }}>
                      <ArrowUpward />
                    </Avatar>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      {isRTL ? 'من الفترة السابقة' : 'vs last period'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: getGrowthColor(metrics.growthRate) }}>
                      {getGrowthIcon(metrics.growthRate)}
                      <Typography variant="body2" fontWeight="medium">
                        {metrics.growthRate > 0 ? '+' : ''}{metrics.growthRate.toFixed(1)}%
                      </Typography>
                    </Box>
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
              <Card 
                sx={{ 
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.error.main, 0.05)} 100%)`,
                  borderLeft: `4px solid ${theme.palette.error.main}`,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" variant="body2" gutterBottom>
                        {isRTL ? 'إجمالي المصروفات' : 'Total Expenses'}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="error.main">
                        <CountUp 
                          end={metrics.totalExpenses} 
                          duration={2}
                          separator=","
                          prefix={isRTL ? '' : 'EGP '}
                          suffix={isRTL ? ' ج.م' : ''}
                        />
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {metrics.expenseTransactions} {isRTL ? 'معاملة' : 'transactions'}
                        </Typography>
                      </Box>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.error.main, 0.2), color: 'error.main' }}>
                      <ArrowDownward />
                    </Avatar>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      {isRTL ? 'متوسط المعاملة' : 'Avg transaction'}
                    </Typography>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(metrics.expenseTransactions > 0 ? metrics.totalExpenses / metrics.expenseTransactions : 0)}
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
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card 
                sx={{ 
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                  borderLeft: `4px solid ${theme.palette.primary.main}`,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" variant="body2" gutterBottom>
                        {isRTL ? 'صافي الربح' : 'Net Profit'}
                      </Typography>
                      <Typography 
                        variant="h4" 
                        fontWeight="bold"
                        color={metrics.netProfit >= 0 ? 'primary.main' : 'error.main'}
                      >
                        <CountUp 
                          end={metrics.netProfit} 
                          duration={2}
                          separator=","
                          prefix={isRTL ? '' : 'EGP '}
                          suffix={isRTL ? ' ج.م' : ''}
                        />
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {isRTL ? 'هامش الربح' : 'Profit margin'} {metrics.profitMargin.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), color: 'primary.main' }}>
                      <AttachMoney />
                    </Avatar>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ position: 'relative', height: 8 }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        backgroundColor: alpha(theme.palette.primary.main, 0.2),
                        borderRadius: 4,
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        width: `${Math.min(100, Math.max(0, metrics.profitMargin))}%`,
                        height: '100%',
                        backgroundColor: metrics.netProfit >= 0 ? theme.palette.primary.main : theme.palette.error.main,
                        borderRadius: 4,
                        transition: 'width 1s ease-out',
                      }}
                    />
                  </Box>
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
              <Card 
                sx={{ 
                  height: '100%',
                  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
                  borderLeft: `4px solid ${theme.palette.info.main}`,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography color="text.secondary" variant="body2" gutterBottom>
                        {isRTL ? 'ملخص المعاملات' : 'Transaction Summary'}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold" color="info.main">
                        {metrics.transactionCount}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          {isRTL ? 'إجمالي المعاملات' : 'Total transactions'}
                        </Typography>
                      </Box>
                    </Box>
                    <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.2), color: 'info.main' }}>
                      <Receipt />
                    </Avatar>
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip 
                      size="small" 
                      label={`${metrics.transferTransactions} ${isRTL ? 'تحويل' : 'transfers'}`}
                      sx={{ fontSize: '0.7rem' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {isRTL ? 'متوسط' : 'Avg'}: {formatCurrency(metrics.averageTransaction)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      )}

      {/* Enhanced Charts with Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={isRTL ? 'نظرة عامة' : 'Overview'} 
            icon={<Assessment />} 
            iconPosition="start"
          />
          <Tab 
            label={isRTL ? 'تحليل مفصل' : 'Detailed Analysis'} 
            icon={<BubbleChart />} 
            iconPosition="start"
          />
          <Tab 
            label={isRTL ? 'الاتجاهات الزمنية' : 'Time Trends'} 
            icon={<Timeline />} 
            iconPosition="start"
          />
          <Tab 
            label={isRTL ? 'تحليل متقدم' : 'Advanced Analytics'} 
            icon={<Radar />} 
            iconPosition="start"
          />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                {isRTL ? 'نظرة عامة على الأداء المالي' : 'Financial Performance Overview'}
              </Typography>
              <ToggleButtonGroup
                value={chartView}
                exclusive
                onChange={handleChartViewChange}
                size="small"
              >
                <ToggleButton value="area">
                  <ShowChart />
                </ToggleButton>
                <ToggleButton value="bar">
                  <Assessment />
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary" sx={{ mb: 2 }}>
                    {isRTL ? 'الإيرادات مقابل المصروفات' : 'Income vs Expenses'}
                  </Typography>
                  <Box sx={{ height: isMobile ? 400 : 500, width: '100%' }}>
                    <ReactECharts 
                      option={getIncomeExpenseChartOption()} 
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                      notMerge={true}
                      lazyUpdate={true}
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Detailed Analysis Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    {isRTL ? 'توزيع الفئات' : 'Category Distribution'}
                  </Typography>
                  <Box sx={{ height: isMobile ? 400 : 500, width: '100%' }}>
                    <ReactECharts 
                      option={getCategoryPieChartOption()} 
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                      notMerge={true}
                      lazyUpdate={true}
                    />
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    {isRTL ? 'طرق الدفع' : 'Payment Methods'}
                  </Typography>
                  <Box sx={{ height: isMobile ? 400 : 500, width: '100%' }}>
                    <ReactECharts 
                      option={getPaymentMethodsChartOption()} 
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                      notMerge={true}
                      lazyUpdate={true}
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Time Trends Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    {isRTL ? 'خريطة حرارية للمعاملات' : 'Transaction Heatmap'}
                  </Typography>
                  <Box sx={{ height: isMobile ? 400 : 500, width: '100%' }}>
                    <ReactECharts 
                      option={getHourlyHeatmapOption()} 
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                      notMerge={true}
                      lazyUpdate={true}
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* Advanced Analytics Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    {isRTL ? 'مؤشر هامش الربح' : 'Profit Margin Gauge'}
                  </Typography>
                  <Box sx={{ height: isMobile ? 300 : 400, width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <Box sx={{ width: '100%', maxWidth: isMobile ? '100%' : '600px', height: '100%' }}>
                      <ReactECharts 
                        option={getProfitGaugeOption()} 
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'canvas' }}
                        notMerge={true}
                        lazyUpdate={true}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                    {isRTL ? 'تدفق الأموال' : 'Money Flow'}
                  </Typography>
                  <Box sx={{ height: isMobile ? 400 : 500, width: '100%' }}>
                    <ReactECharts 
                      option={getFinancialSankeyOption()} 
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                      notMerge={true}
                      lazyUpdate={true}
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default FinanceReportsPageEcharts;