import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
  Chip,
  Menu,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  Receipt,
  Send,
  Visibility,
  Edit,
  Delete,
  Payment,
  ContentCopy,
  FileDownload,
  Email,
  Print,
  TrendingUp,
  TrendingDown,
  AccessTime,
  CheckCircle,
  Cancel,
  Warning,
  CalendarToday,
  AttachMoney,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { invoiceService } from '../../services/invoice.service';
import type {
  Invoice,
  InvoiceStatus,
  PaymentStatus,
  InvoiceFilters,
  InvoiceSummary,
} from '../../types/invoice.types';
import { toast } from 'react-toastify';
import { toDateSafe } from '../../utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';

const InvoicesPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';

  // State
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Load data
  useEffect(() => {
    if (currentUser) {
      loadInvoices();
      loadSummary();
    }
  }, [currentUser, currentBranch, statusFilter, paymentFilter, dateRange, startDate, endDate]);

  const loadInvoices = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const companyId = currentUser?.companyId;

      if (!companyId) {
        toast.error(isRTL ? 'لم يتم العثور على معرف الشركة' : 'Company ID not found');
        return;
      }

      const filters: InvoiceFilters = {
        branchId: currentBranch?.id,
        search: searchQuery,
      };

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      if (paymentFilter !== 'all') {
        filters.paymentStatus = paymentFilter;
      }

      // Set date filters based on range
      const now = new Date();
      switch (dateRange) {
        case 'today':
          filters.startDate = new Date(now.setHours(0, 0, 0, 0));
          filters.endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          filters.startDate = weekStart;
          filters.endDate = new Date();
          break;
        case 'month':
          filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          filters.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'custom':
          if (startDate) filters.startDate = startDate;
          if (endDate) filters.endDate = endDate;
          break;
      }

      const result = await invoiceService.getInvoices(companyId, filters);
      setInvoices(result.invoices);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error(isRTL ? 'خطأ في تحميل الفواتير' : 'Error loading invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    if (!currentUser) return;

    try {
      const companyId = currentUser?.companyId;

      if (!companyId) return;

      const summaryData = await invoiceService.getInvoiceSummary(
        companyId,
        currentBranch?.id
      );
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  // Handlers
  const handleCreateInvoice = () => {
    navigate('/finance/invoices/new');
  };

  const handleEditInvoice = (invoice: Invoice) => {
    navigate(`/finance/invoices/${invoice.id}/edit`);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    navigate(`/finance/invoices/${invoice.id}`);
  };

  const handleDuplicateInvoice = async (invoice: Invoice) => {
    if (!currentUser) return;

    try {
      const companyId = currentUser?.companyId;

      const newInvoiceId = await invoiceService.duplicateInvoice(
        companyId,
        invoice.id!,
        currentUser?.id
      );

      toast.success(isRTL ? 'تم نسخ الفاتورة بنجاح' : 'Invoice duplicated successfully');
      navigate(`/finance/invoices/${newInvoiceId}/edit`);
    } catch (error) {
      toast.error(isRTL ? 'خطأ في نسخ الفاتورة' : 'Error duplicating invoice');
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    if (!currentUser) return;

    try {
      const companyId = currentUser?.companyId;

      await invoiceService.sendInvoice(companyId, invoice.id!, invoice.clientEmail);
      toast.success(isRTL ? 'تم إرسال الفاتورة بنجاح' : 'Invoice sent successfully');
      loadInvoices();
    } catch (error) {
      toast.error(isRTL ? 'خطأ في إرسال الفاتورة' : 'Error sending invoice');
    }
  };

  const handleRecordPayment = (invoice: Invoice) => {
    navigate(`/finance/invoices/${invoice.id}/payment`);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, invoice: Invoice) => {
    setAnchorEl(event.currentTarget);
    setSelectedInvoice(invoice);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedInvoice(null);
  };

  // Get status color
  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft':
        return 'default';
      case 'sent':
      case 'viewed':
        return 'info';
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'overdue':
        return 'error';
      case 'cancelled':
      case 'refunded':
        return 'default';
      default:
        return 'default';
    }
  };

  // Get payment status color
  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'unpaid':
        return 'error';
      case 'refunded':
        return 'default';
      default:
        return 'default';
    }
  };

  // Format status label
  const formatStatusLabel = (status: InvoiceStatus) => {
    const labels = {
      draft: isRTL ? 'مسودة' : 'Draft',
      sent: isRTL ? 'مرسلة' : 'Sent',
      viewed: isRTL ? 'تم العرض' : 'Viewed',
      paid: isRTL ? 'مدفوعة' : 'Paid',
      partial: isRTL ? 'مدفوعة جزئياً' : 'Partial',
      overdue: isRTL ? 'متأخرة' : 'Overdue',
      cancelled: isRTL ? 'ملغاة' : 'Cancelled',
      refunded: isRTL ? 'مستردة' : 'Refunded',
    };
    return labels[status] || status;
  };

  // Render summary card
  const SummaryCard = ({
    title,
    value,
    icon,
    color,
    trend,
  }: {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    trend?: number;
  }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography color="text.secondary" gutterBottom variant="body2">
                {title}
              </Typography>
              <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                <CountUp
                  end={value}
                  duration={1}
                  separator=","
                  prefix={title.includes('Amount') || title.includes('المبلغ') ? '' : ''}
                  suffix={title.includes('Amount') || title.includes('المبلغ') ? ` ${isRTL ? 'ج.م' : 'EGP'}` : ''}
                />
              </Typography>
              {trend !== undefined && (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  {trend >= 0 ? (
                    <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
                  ) : (
                    <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
                  )}
                  <Typography
                    variant="body2"
                    color={trend >= 0 ? 'success.main' : 'error.main'}
                  >
                    {Math.abs(trend)}%
                  </Typography>
                </Stack>
              )}
            </Box>
            <Box
              sx={{
                backgroundColor: `${color}.50`,
                borderRadius: 2,
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {React.cloneElement(icon as React.ReactElement, {
                sx: { fontSize: 32, color: `${color}.main` },
              })}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );

  // Render invoice row
  const InvoiceRow = ({ invoice }: { invoice: Invoice }) => {
    const isOverdue = invoice.status !== 'paid' && 
      toDateSafe(invoice.dueDate) < new Date();

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Paper
          sx={{
            p: 2,
            mb: 1,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
          onClick={() => handleViewInvoice(invoice)}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 3fr 2fr 2fr 2fr 1fr' }, gap: 2, alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {invoice.invoiceNumber}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {format(toDateSafe(invoice.invoiceDate), 'dd/MM/yyyy')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2">{invoice.clientName}</Typography>
              {invoice.clientEmail && (
                <Typography variant="caption" color="text.secondary">
                  {invoice.clientEmail}
                </Typography>
              )}
            </Box>
            <Box>
              <Typography variant="h6">
                {invoice.totalAmount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
              </Typography>
            </Box>
            <Box>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={formatStatusLabel(invoice.status)}
                  color={getStatusColor(invoice.status)}
                  size="small"
                />
                {isOverdue && (
                  <Chip
                    icon={<Warning />}
                    label={isRTL ? 'متأخرة' : 'Overdue'}
                    color="error"
                    size="small"
                  />
                )}
              </Stack>
            </Box>
            <Box>
              <Chip
                label={`${invoice.paidAmount.toLocaleString()} / ${invoice.totalAmount.toLocaleString()}`}
                color={getPaymentStatusColor(invoice.paymentStatus)}
                size="small"
                variant="outlined"
              />
            </Box>
            <Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuOpen(e, invoice);
                }}
              >
                <MoreVert />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1">
            {isRTL ? 'الفواتير' : 'Invoices'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateInvoice}
          >
            {isRTL ? 'فاتورة جديدة' : 'New Invoice'}
          </Button>
        </Stack>

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
          <Box>
            <SummaryCard
              title={isRTL ? 'إجمالي الفواتير' : 'Total Invoices'}
              value={summary?.totalInvoices || 0}
              icon={<Receipt />}
              color="primary"
            />
          </Box>
          <Box>
            <SummaryCard
              title={isRTL ? 'المبلغ الإجمالي' : 'Total Amount'}
              value={summary?.totalAmount || 0}
              icon={<AttachMoney />}
              color="success"
              trend={summary?.growthPercentage}
            />
          </Box>
          <Box>
            <SummaryCard
              title={isRTL ? 'المبلغ المستحق' : 'Due Amount'}
              value={summary?.dueAmount || 0}
              icon={<AccessTime />}
              color="warning"
            />
          </Box>
          <Box>
            <SummaryCard
              title={isRTL ? 'المبلغ المتأخر' : 'Overdue Amount'}
              value={summary?.overdueAmount || 0}
              icon={<Warning />}
              color="error"
            />
          </Box>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr) repeat(2, 0.75fr)' }, gap: 2, alignItems: 'center' }}>
            <Box>
              <TextField
                fullWidth
                size="small"
                placeholder={isRTL ? 'بحث...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Box>
              <FormControl fullWidth size="small">
                <InputLabel>{isRTL ? 'الحالة' : 'Status'}</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                  label={isRTL ? 'الحالة' : 'Status'}
                >
                  <MenuItem value="all">{isRTL ? 'الكل' : 'All'}</MenuItem>
                  <MenuItem value="draft">{isRTL ? 'مسودة' : 'Draft'}</MenuItem>
                  <MenuItem value="sent">{isRTL ? 'مرسلة' : 'Sent'}</MenuItem>
                  <MenuItem value="viewed">{isRTL ? 'تم العرض' : 'Viewed'}</MenuItem>
                  <MenuItem value="paid">{isRTL ? 'مدفوعة' : 'Paid'}</MenuItem>
                  <MenuItem value="overdue">{isRTL ? 'متأخرة' : 'Overdue'}</MenuItem>
                  <MenuItem value="cancelled">{isRTL ? 'ملغاة' : 'Cancelled'}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth size="small">
                <InputLabel>{isRTL ? 'حالة الدفع' : 'Payment'}</InputLabel>
                <Select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | 'all')}
                  label={isRTL ? 'حالة الدفع' : 'Payment'}
                >
                  <MenuItem value="all">{isRTL ? 'الكل' : 'All'}</MenuItem>
                  <MenuItem value="unpaid">{isRTL ? 'غير مدفوعة' : 'Unpaid'}</MenuItem>
                  <MenuItem value="partial">{isRTL ? 'مدفوعة جزئياً' : 'Partial'}</MenuItem>
                  <MenuItem value="paid">{isRTL ? 'مدفوعة' : 'Paid'}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box>
              <FormControl fullWidth size="small">
                <InputLabel>{isRTL ? 'الفترة' : 'Period'}</InputLabel>
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  label={isRTL ? 'الفترة' : 'Period'}
                >
                  <MenuItem value="all">{isRTL ? 'الكل' : 'All'}</MenuItem>
                  <MenuItem value="today">{isRTL ? 'اليوم' : 'Today'}</MenuItem>
                  <MenuItem value="week">{isRTL ? 'هذا الأسبوع' : 'This Week'}</MenuItem>
                  <MenuItem value="month">{isRTL ? 'هذا الشهر' : 'This Month'}</MenuItem>
                  <MenuItem value="custom">{isRTL ? 'مخصص' : 'Custom'}</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {dateRange === 'custom' && (
              <>
                <Box>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label={isRTL ? 'من' : 'From'}
                      value={startDate}
                      onChange={setStartDate}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </LocalizationProvider>
                </Box>
                <Box>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label={isRTL ? 'إلى' : 'To'}
                      value={endDate}
                      onChange={setEndDate}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
                    />
                  </LocalizationProvider>
                </Box>
              </>
            )}
          </Box>
        </Paper>

        {/* Tabs */}
        <Tabs value={selectedTab} onChange={(_, value) => setSelectedTab(value)}>
          <Tab label={isRTL ? 'كل الفواتير' : 'All Invoices'} />
          <Tab label={isRTL ? 'مسودات' : 'Drafts'} />
          <Tab label={isRTL ? 'في انتظار الدفع' : 'Pending Payment'} />
          <Tab label={isRTL ? 'متأخرة' : 'Overdue'} />
        </Tabs>
      </Box>

      {/* Invoice List */}
      <Box>
        {invoices.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center' }}>
            <Receipt sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              {isRTL ? 'لا توجد فواتير' : 'No invoices found'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {isRTL
                ? 'ابدأ بإنشاء فاتورة جديدة لعملائك'
                : 'Start by creating a new invoice for your clients'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateInvoice}
            >
              {isRTL ? 'إنشاء فاتورة' : 'Create Invoice'}
            </Button>
          </Paper>
        ) : (
          <Box>
            {invoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} />
            ))}
          </Box>
        )}
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedInvoice) handleViewInvoice(selectedInvoice);
          handleMenuClose();
        }}>
          <Visibility sx={{ mr: 1 }} />
          {isRTL ? 'عرض' : 'View'}
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedInvoice) handleEditInvoice(selectedInvoice);
          handleMenuClose();
        }}>
          <Edit sx={{ mr: 1 }} />
          {isRTL ? 'تعديل' : 'Edit'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          if (selectedInvoice) handleSendInvoice(selectedInvoice);
          handleMenuClose();
        }}>
          <Send sx={{ mr: 1 }} />
          {isRTL ? 'إرسال' : 'Send'}
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedInvoice) handleRecordPayment(selectedInvoice);
          handleMenuClose();
        }}>
          <Payment sx={{ mr: 1 }} />
          {isRTL ? 'تسجيل دفعة' : 'Record Payment'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          if (selectedInvoice) handleDuplicateInvoice(selectedInvoice);
          handleMenuClose();
        }}>
          <ContentCopy sx={{ mr: 1 }} />
          {isRTL ? 'نسخ' : 'Duplicate'}
        </MenuItem>
        <MenuItem onClick={() => {
          // TODO: Implement print
          handleMenuClose();
        }}>
          <Print sx={{ mr: 1 }} />
          {isRTL ? 'طباعة' : 'Print'}
        </MenuItem>
        <MenuItem onClick={() => {
          // TODO: Implement download
          handleMenuClose();
        }}>
          <FileDownload sx={{ mr: 1 }} />
          {isRTL ? 'تحميل PDF' : 'Download PDF'}
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default InvoicesPage;