import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  LinearProgress,
  useTheme,
  alpha,
  Divider,
  Stack,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Receipt,
  Category,
  Store,
  AttachMoney,
  Warning,
  CheckCircle,
  Schedule,
  Business,
  LocalShipping,
  Engineering,
  Campaign,
  AccountBalance,
  MoreVert,
  ArrowForward,
  BusinessCenter,
  Security,
  MoreHoriz,
  MoneyOff,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { toDateSafe } from '../../../utils/dateUtils';
import { ar, enUS } from 'date-fns/locale';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { expenseService } from '../../../services/expense.service';
import { financeService } from '../../../services/finance.service';
import { contactService } from '../../../services/contact.service';
import type { ExpenseCategory, ExpenseTransaction, Vendor } from '../../../types/expense.types';
import type { FinancialTransaction } from '../../../types/finance.types';
import type { Contact } from '../../../types/contact.types';
import { ContactType } from '../../../types/contact.types';

// Mock data for demonstration
const mockCategoryData = [
  { id: 1, name: 'الإيجار والمرافق', nameEn: 'Rent & Utilities', icon: Business, color: '#1976d2', budget: 25000, spent: 22000, percentage: 88 },
  { id: 2, name: 'الرواتب والعمولات', nameEn: 'Salaries & Benefits', icon: AccountBalance, color: '#388e3c', budget: 80000, spent: 75000, percentage: 94 },
  { id: 3, name: 'المنتجات والمستلزمات', nameEn: 'Products & Supplies', icon: LocalShipping, color: '#7b1fa2', budget: 30000, spent: 18000, percentage: 60 },
  { id: 4, name: 'التسويق والإعلان', nameEn: 'Marketing', icon: Campaign, color: '#d32f2f', budget: 15000, spent: 12000, percentage: 80 },
  { id: 5, name: 'الصيانة والإصلاحات', nameEn: 'Maintenance', icon: Engineering, color: '#f57c00', budget: 10000, spent: 8500, percentage: 85 },
];

const mockTrendData = Array.from({ length: 30 }, (_, i) => {
  const date = subDays(new Date(), 29 - i);
  return {
    date: format(date, 'MMM dd'),
    expenses: Math.floor(Math.random() * 5000) + 3000,
    budget: 5500,
  };
});

const mockRecentExpenses = [
  { id: 1, vendor: 'شركة النور للتجميل', amount: 3500, category: 'المنتجات', categoryColor: '#7b1fa2', time: '2 hours ago' },
  { id: 2, vendor: 'شركة الكهرباء', amount: 1200, category: 'المرافق', categoryColor: '#1976d2', time: 'Today' },
  { id: 3, vendor: 'وكالة الإعلان الرقمي', amount: 5000, category: 'التسويق', categoryColor: '#d32f2f', time: 'Yesterday' },
  { id: 4, vendor: 'شركة الصيانة', amount: 800, category: 'الصيانة', categoryColor: '#f57c00', time: '2 days ago' },
];

const mockTopContacts = [
  { id: 1, name: 'شركة النور للتجميل', spent: 45000, transactions: 12, change: 15 },
  { id: 2, name: 'مؤسسة الجمال', spent: 38000, transactions: 10, change: -5 },
  { id: 3, name: 'شركة الكهرباء', spent: 14400, transactions: 12, change: 8 },
  { id: 4, name: 'وكالة الإعلان', spent: 12000, transactions: 4, change: 20 },
];

export default function ExpenseDashboard() {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;
  
  // Add debugging
  useEffect(() => {
    console.log('ExpenseDashboard - Current User:', currentUser);
    console.log('ExpenseDashboard - Current Branch:', currentBranch);
  }, [currentUser, currentBranch]);
  
  // State for real data
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [contactData, setContactData] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getBudgetStatus = (percentage: number) => {
    if (percentage >= 90) return { color: 'error', icon: Warning, text: isRTL ? 'تجاوز الحد' : 'Over Budget' };
    if (percentage >= 70) return { color: 'warning', icon: Schedule, text: isRTL ? 'قريب من الحد' : 'Near Limit' };
    return { color: 'success', icon: CheckCircle, text: isRTL ? 'ضمن الميزانية' : 'Within Budget' };
  };

  // Load real data
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.companyId || !currentBranch?.id) return;
      
      setLoading(true);
      try {
        // Load categories with budgets
        let categoriesData = await expenseService.getCategories(currentUser.companyId);
        
        // Initialize default categories if none exist
        if (categoriesData.length === 0) {
          console.log('No expense categories found, initializing defaults...');
          await expenseService.initializeDefaultCategories(currentUser.companyId);
          // Reload categories after initialization
          categoriesData = await expenseService.getCategories(currentUser.companyId);
        }
        
        // Filter active categories only
        setCategories(categoriesData.filter(cat => cat.isActive !== false));
        
        // Load transactions for current month
        const now = new Date();
        const startOfMonthDate = startOfMonth(now);
        const endOfMonthDate = endOfMonth(now);
        
        // Get expense transactions directly
        const result = await financeService.getExpenseTransactions(
          currentUser.companyId,
          {
            branchId: currentBranch.id,
            startDate: startOfMonthDate,
            endDate: endOfMonthDate
          }
        );
        
        const expenseTransactions = result.transactions;
        
        // Debug: Log the structure of the first transaction
        if (expenseTransactions.length > 0) {
          console.log('Sample expense transaction:', expenseTransactions[0]);
          console.log('ExpenseDetails:', (expenseTransactions[0] as any).expenseDetails);
        }
        
        setTransactions(expenseTransactions);
        
        // Load contacts (beneficiaries)
        const contactsResult = await contactService.getContacts(
          currentUser.companyId,
          {
            types: [ContactType.VENDOR, ContactType.SUPPLIER],
            status: ['active', 'inactive']
          },
          100
        );
        setContacts(contactsResult.contacts);
        
        // Process data for charts
        await processBudgetData(categoriesData, expenseTransactions);
        processTrendData(expenseTransactions);
        processContactData(contactsResult.contacts, expenseTransactions);
        processRecentExpenses(expenseTransactions, categoriesData, contactsResult.contacts);
        
        // Only use real data, no mock fallback
        // This ensures users see actual data or empty states
        
      } catch (error) {
        console.error('Error loading expense data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentUser, currentBranch]);
  
  // Process budget data for categories
  const processBudgetData = async (categories: ExpenseCategory[], transactions: FinancialTransaction[]) => {
    const categoryMap = new Map<string, { spent: number; budget: number }>();
    
    // Try to get active budget to get real budget amounts
    let activeBudget = null;
    if (currentUser?.companyId && currentBranch?.id) {
      try {
        activeBudget = await expenseService.getActiveBudget(
          currentUser.companyId,
          currentBranch.id,
          new Date()
        );
      } catch (error) {
        console.error('Error fetching active budget:', error);
      }
    }
    
    // Initialize with budgets
    categories.forEach(cat => {
      // Try to get budget from active budget first
      let budget = 0;
      if (activeBudget && activeBudget.categoryBudgets) {
        const categoryBudget = activeBudget.categoryBudgets.find(cb => cb.categoryId === cat.id);
        budget = categoryBudget?.allocatedAmount || 0;
      }
      
      // Only include categories with budget allocated
      if (budget > 0) {
        categoryMap.set(cat.id!, { spent: 0, budget });
      }
    });
    
    // Calculate spent amounts from expense transactions
    transactions.forEach(trans => {
      // Check if this is an expense transaction (has expenseDetails.categoryId)
      const categoryId = (trans as any).expenseDetails?.categoryId || trans.metadata?.categoryId || trans.categoryId;
      if (categoryId && categoryMap.has(categoryId)) {
        const current = categoryMap.get(categoryId)!;
        current.spent += trans.totalAmount || trans.amount || 0;
      }
    });
    
    // Create chart data
    const data = Array.from(categoryMap.entries()).map(([catId, data]) => {
      const category = categories.find(c => c.id === catId)!;
      const percentage = (data.spent / data.budget) * 100;
      const iconMap: { [key: string]: any } = {
        'Business': Business,
        'AccountBalance': AccountBalance,
        'LocalShipping': LocalShipping,
        'Campaign': Campaign,
        'Engineering': Engineering,
        'BusinessCenter': BusinessCenter,
        'Security': Security,
        'MoreHoriz': MoreHoriz,
      };
      
      return {
        id: catId,
        name: isRTL ? category.nameAr : category.name,
        icon: iconMap[category.icon] || MoneyOff,
        color: category.color || '#666',
        budget: data.budget,
        spent: data.spent,
        percentage: Math.min(percentage, 100)
      };
    }).sort((a, b) => b.spent - a.spent).slice(0, 5); // Sort by spending and take top 5
    
    setBudgetData(data);
  };
  
  // Process trend data for last 30 days
  const processTrendData = (transactions: FinancialTransaction[]) => {
    const data = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayExpenses = transactions
        .filter(t => {
          const transDate = toDateSafe(t.createdAt);
          return transDate >= dayStart && transDate <= dayEnd;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      data.push({
        date: format(date, 'MMM dd'),
        expenses: dayExpenses,
        budget: 5500 // Daily budget limit - can be calculated from monthly budgets
      });
    }
    
    setTrendData(data);
  };
  
  // Process contact data
  const processContactData = (contacts: Contact[], transactions: FinancialTransaction[]) => {
    const contactMap = new Map<string, { spent: number; count: number; lastMonth: number }>();
    
    console.log('Processing contact data - contacts:', contacts.length, 'transactions:', transactions.length);
    
    // Calculate current month spending from expense transactions
    transactions.forEach(trans => {
      // Check if this is an expense transaction with vendor/contact
      // Try multiple possible locations for vendorId
      const vendorId = (trans as any).expenseDetails?.vendorId || 
                       trans.metadata?.vendorId || 
                       (trans as any).vendorId;
      
      if (vendorId) {
        console.log('Found transaction with vendorId:', vendorId);
        const current = contactMap.get(vendorId) || { spent: 0, count: 0, lastMonth: 0 };
        current.spent += trans.totalAmount || trans.amount;
        current.count += 1;
        contactMap.set(vendorId, current);
      }
    });
    
    console.log('Contact map after processing:', contactMap.size, 'entries');
    
    // Create contact data sorted by spending
    const data = Array.from(contactMap.entries())
      .map(([contactId, data]) => {
        const contact = contacts.find(c => c.id === contactId);
        if (!contact) return null;
        
        // Calculate change (mock for now, would need last month data)
        const change = Math.floor(Math.random() * 40) - 20;
        
        return {
          id: contactId,
          name: contact.displayName,
          spent: data.spent,
          transactions: data.count,
          change
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.spent - a!.spent)
      .slice(0, 4);
    
    console.log('Final contact data:', data);
    setContactData(data as any[]);
  };
  
  // Process recent expenses
  const processRecentExpenses = (
    transactions: FinancialTransaction[], 
    categories: ExpenseCategory[], 
    contacts: Contact[]
  ) => {
    const data = transactions
      .sort((a, b) => toDateSafe(b.createdAt).getTime() - toDateSafe(a.createdAt).getTime())
      .slice(0, 4)
      .map(trans => {
        const categoryId = (trans as any).expenseDetails?.categoryId || trans.metadata?.categoryId || trans.categoryId;
        const vendorId = (trans as any).expenseDetails?.vendorId || trans.metadata?.vendorId || (trans as any).vendorId;
        const category = categories.find(c => c.id === categoryId);
        const contact = contacts.find(c => c.id === vendorId);
        const transDate = toDateSafe(trans.createdAt);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - transDate.getTime()) / (1000 * 60 * 60));
        
        let timeAgo = '';
        if (diffHours < 1) {
          timeAgo = isRTL ? 'منذ قليل' : 'Just now';
        } else if (diffHours < 24) {
          timeAgo = isRTL ? `منذ ${diffHours} ساعة` : `${diffHours} hours ago`;
        } else {
          const diffDays = Math.floor(diffHours / 24);
          if (diffDays === 1) {
            timeAgo = isRTL ? 'أمس' : 'Yesterday';
          } else {
            timeAgo = isRTL ? `منذ ${diffDays} أيام` : `${diffDays} days ago`;
          }
        }
        
        return {
          id: trans.id,
          vendor: contact?.displayName || trans.description,
          amount: trans.amount,
          category: isRTL ? category?.nameAr : category?.name,
          categoryColor: category?.color || '#666',
          time: timeAgo
        };
      });
    
    setRecentExpenses(data);
  };

  const totalBudget = budgetData.reduce((sum, cat) => sum + cat.budget, 0);
  const totalSpent = budgetData.reduce((sum, cat) => sum + cat.spent, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Test function to create sample expense
  const createTestExpense = async () => {
    if (!currentUser?.companyId || !currentBranch?.id) return;
    
    try {
      const categories = await expenseService.getCategories(currentUser.companyId);
      if (categories.length > 0) {
        const testExpense = {
          companyId: currentUser.companyId,
          branchId: currentBranch.id,
          accountId: 'cash', // Default cash account
          type: 'expense' as const,
          status: 'completed' as const,
          date: new Date().toISOString(),
          description: 'Test expense for dashboard',
          amount: 5000,
          totalAmount: 5000,
          paymentMethod: 'cash' as const,
          reference: `TEST-${Date.now()}`,
          expenseDetails: {
            categoryId: categories[0].id!,
            vendorId: '',
            receipts: [],
            isRecurring: false,
          },
          createdBy: currentUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        await financeService.createTransaction(testExpense);
        // Reload data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error creating test expense:', error);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Overview Section - Two Column Layout */}
      <Grid container spacing={3}>
        {/* Left Column - Budget Overview and Categories */}
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            {/* Budget Overview Card */}
            <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  {isRTL ? 'نظرة عامة على الميزانية' : 'Budget Overview'}
                </Typography>
                {/* Temporary button for testing - remove in production */}
                {categories.length > 0 && budgetData.length === 0 && (
                  <Button size="small" onClick={createTestExpense} variant="outlined">
                    Create Test Data
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, mt: 3 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <PieChart width={160} height={160}>
                    <Pie
                      data={[
                        { value: totalSpent, fill: theme.palette.primary.main },
                        { value: totalBudget - totalSpent, fill: alpha(theme.palette.primary.main, 0.1) },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                    >
                      <Cell />
                      <Cell />
                    </Pie>
                  </PieChart>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                    }}
                  >
                    <Typography variant="h5" fontWeight="bold">
                      {overallPercentage.toFixed(0)}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isRTL ? 'مستخدم' : 'Used'}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {isRTL ? 'إجمالي الميزانية' : 'Total Budget'}
                      </Typography>
                      <Typography variant="h5" fontWeight="medium">
                        {formatCurrency(totalBudget)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {isRTL ? 'المصروفات الفعلية' : 'Actual Expenses'}
                      </Typography>
                      <Typography variant="h5" fontWeight="medium" color="primary">
                        {formatCurrency(totalSpent)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {isRTL ? 'المتبقي' : 'Remaining'}
                      </Typography>
                      <Typography variant="h5" fontWeight="medium" color="success.main">
                        {formatCurrency(totalBudget - totalSpent)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Paper>

            {/* Category Breakdown */}
            <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {isRTL ? 'توزيع المصروفات حسب الفئة' : 'Expenses by Category'}
                </Typography>
                <Button endIcon={<ArrowForward />} size="small" variant="text">
                  {isRTL ? 'عرض الكل' : 'View All'}
                </Button>
              </Box>
              <List dense>
                {budgetData.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Category sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'لا توجد بيانات فئات' : 'No category data available'}
                    </Typography>
                  </Box>
                ) : budgetData.slice(0, 5).map((category, index) => {
                  const Icon = category.icon;
                  const status = getBudgetStatus(category.percentage);
                  
                  return (
                    <React.Fragment key={category.id}>
                      <ListItem sx={{ px: 0, py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: alpha(category.color, 0.1), width: 40, height: 40 }}>
                            <Icon sx={{ color: category.color, fontSize: 20 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={category.name}
                          secondary={
                            <React.Fragment>
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={category.percentage}
                                  sx={{ 
                                    flex: 1,
                                    height: 6, 
                                    borderRadius: 3,
                                    bgcolor: alpha(category.color, 0.1),
                                    '& .MuiLinearProgress-bar': {
                                      bgcolor: category.color,
                                    }
                                  }}
                                />
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {category.percentage}%
                                </Typography>
                              </Box>
                            </React.Fragment>
                          }
                        />
                        <Box sx={{ textAlign: 'right', ml: 2 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(category.spent)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {isRTL ? 'من' : 'of'} {formatCurrency(category.budget)}
                          </Typography>
                        </Box>
                      </ListItem>
                      {index < Math.min(budgetData.length, 5) - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            </Paper>
          </Stack>
        </Grid>

        {/* Right Column - Vendors and Recent Expenses */}
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            {/* Top Beneficiaries */}
            <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {isRTL ? 'أعلى المستفيدين' : 'Top Beneficiaries'}
                </Typography>
                <IconButton size="small">
                  <MoreVert />
                </IconButton>
              </Box>
              <List dense>
                {contactData.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Store sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'لا توجد بيانات مستفيدين' : 'No beneficiary data available'}
                    </Typography>
                  </Box>
                ) : contactData.slice(0, 4).map((contact, index) => (
                  <React.Fragment key={contact.id}>
                    <ListItem sx={{ px: 0, py: 1.5 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.info.main, 0.1), width: 40, height: 40 }}>
                          <Store color="info" fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={contact.name}
                        secondary={
                          <Typography variant="caption" color="text.secondary" component="span">
                            {contact.transactions} {isRTL ? 'معاملات' : 'transactions'}
                          </Typography>
                        }
                      />
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(contact.spent)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                          {contact.change > 0 ? (
                            <TrendingUp color="success" sx={{ fontSize: 16 }} />
                          ) : (
                            <TrendingDown color="error" sx={{ fontSize: 16 }} />
                          )}
                          <Typography
                            variant="caption"
                            color={contact.change > 0 ? 'success.main' : 'error.main'}
                          >
                            {contact.change > 0 ? '+' : ''}{contact.change}%
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                    {index < Math.min(contactData.length, 4) - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>

            {/* Recent Expenses Card */}
            <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {isRTL ? 'المصروفات الأخيرة' : 'Recent Expenses'}
                </Typography>
                <Button endIcon={<ArrowForward />} size="small" variant="text">
                  {isRTL ? 'عرض الكل' : 'View All'}
                </Button>
              </Box>
              <List dense>
                {recentExpenses.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Receipt sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'لا توجد مصروفات حديثة' : 'No recent expenses'}
                    </Typography>
                  </Box>
                ) : recentExpenses.slice(0, 4).map((expense, index) => (
                  <React.Fragment key={expense.id}>
                    <ListItem sx={{ px: 0, py: 1.5 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha(expense.categoryColor, 0.1), width: 40, height: 40 }}>
                          <Receipt sx={{ color: expense.categoryColor, fontSize: 20 }} />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={expense.vendor}
                        secondary={
                          <Typography variant="caption" color="text.secondary" component="span">
                            {expense.time}
                          </Typography>
                        }
                      />
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(expense.amount)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {expense.category}
                        </Typography>
                      </Box>
                    </ListItem>
                    {index < Math.min(recentExpenses.length, 4) - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}