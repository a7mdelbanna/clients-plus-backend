import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme,
  Divider,
  Chip,
  CircularProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Send,
  Payment,
  ContentCopy,
  FileDownload,
  Print,
  MoreVert,
  CheckCircle,
  AccessTime,
  Warning,
  Email,
  Visibility,
  CalendarToday,
  AttachMoney,
  Person,
  Business,
  Receipt,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { invoiceService } from '../../services/invoice.service';
import type {
  Invoice,
  InvoicePayment,
} from '../../types/invoice.types';
import { toast } from 'react-toastify';
import { toDateSafe } from '../../utils/dateUtils';
import CountUp from 'react-countup';

const InvoiceDetailPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { invoiceId } = useParams();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';

  // State
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'check' | 'other'>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());

  // Load invoice
  useEffect(() => {
    if (currentUser && invoiceId) {
      loadInvoice();
    }
  }, [currentUser, invoiceId]);

  const loadInvoice = async () => {
    if (!currentUser || !invoiceId) return;

    try {
      setLoading(true);
      const companyId = currentUser?.companyId;

      if (!companyId) {
        toast.error(isRTL ? 'لم يتم العثور على معرف الشركة' : 'Company ID not found');
        navigate('/finance/invoices');
        return;
      }

      const invoiceData = await invoiceService.getInvoice(companyId, invoiceId);
      if (!invoiceData) {
        toast.error(isRTL ? 'الفاتورة غير موجودة' : 'Invoice not found');
        navigate('/finance/invoices');
        return;
      }

      setInvoice(invoiceData);
      setPaymentAmount(invoiceData.dueAmount);

      // Mark as viewed if sent
      if (invoiceData.status === 'sent') {
        await invoiceService.markAsViewed(companyId, invoiceId);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error(isRTL ? 'خطأ في تحميل الفاتورة' : 'Error loading invoice');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleEdit = () => {
    navigate(`/finance/invoices/${invoiceId}/edit`);
  };

  const handleSend = async () => {
    if (!currentUser || !invoice) return;

    try {
      const companyId = currentUser?.companyId;

      await invoiceService.sendInvoice(companyId, invoiceId!, invoice.clientEmail);
      toast.success(isRTL ? 'تم إرسال الفاتورة بنجاح' : 'Invoice sent successfully');
      loadInvoice();
    } catch (error) {
      toast.error(isRTL ? 'خطأ في إرسال الفاتورة' : 'Error sending invoice');
    }
  };

  const handleDuplicate = async () => {
    if (!currentUser || !invoice) return;

    try {
      const companyId = currentUser?.companyId;

      const newInvoiceId = await invoiceService.duplicateInvoice(
        companyId,
        invoiceId!,
        currentUser?.id
      );

      toast.success(isRTL ? 'تم نسخ الفاتورة بنجاح' : 'Invoice duplicated successfully');
      navigate(`/finance/invoices/${newInvoiceId}/edit`);
    } catch (error) {
      toast.error(isRTL ? 'خطأ في نسخ الفاتورة' : 'Error duplicating invoice');
    }
  };

  const handleRecordPayment = async () => {
    if (!currentUser || !invoice) return;

    try {
      const companyId = currentUser?.companyId;

      const payment: Omit<InvoicePayment, 'id' | 'recordedAt'> = {
        date: paymentDate.toISOString(),
        amount: paymentAmount,
        method: paymentMethod,
        reference: paymentReference,
        notes: paymentNotes,
        recordedBy: currentUser?.id,
      };

      await invoiceService.recordPayment(companyId, invoiceId!, payment);
      toast.success(isRTL ? 'تم تسجيل الدفعة بنجاح' : 'Payment recorded successfully');
      setPaymentDialogOpen(false);
      loadInvoice();
    } catch (error) {
      toast.error(isRTL ? 'خطأ في تسجيل الدفعة' : 'Error recording payment');
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
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

  // Format status label
  const formatStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!invoice) {
    return null;
  }

  const isOverdue = invoice.status !== 'paid' && toDateSafe(invoice.dueDate) < new Date();

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={() => navigate('/finance/invoices')}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h4" component="h1">
                {invoice.invoiceNumber}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
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
                <Chip
                  label={`${invoice.paidAmount.toLocaleString()} / ${invoice.totalAmount.toLocaleString()} ${isRTL ? 'ج.م' : 'EGP'}`}
                  color={invoice.paymentStatus === 'paid' ? 'success' : invoice.paymentStatus === 'partial' ? 'warning' : 'error'}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Box>
          </Stack>
          
          <Stack direction="row" spacing={2}>
            {invoice.status === 'draft' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Send />}
                onClick={handleSend}
              >
                {isRTL ? 'إرسال' : 'Send'}
              </Button>
            )}
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <Button
                variant="contained"
                color="success"
                startIcon={<Payment />}
                onClick={() => setPaymentDialogOpen(true)}
              >
                {isRTL ? 'تسجيل دفعة' : 'Record Payment'}
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEdit}
            >
              {isRTL ? 'تعديل' : 'Edit'}
            </Button>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert />
            </IconButton>
          </Stack>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        {/* Invoice Content */}
        <Box>
          <Paper sx={{ p: 4 }}>
            {/* Business & Client Info */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4, mb: 4 }}>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Business />
                  <Typography variant="h6">{isRTL ? 'من' : 'From'}</Typography>
                </Stack>
                <Typography variant="subtitle1" fontWeight="bold">
                  {invoice.businessName}
                </Typography>
                {invoice.businessAddress && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.businessAddress}
                  </Typography>
                )}
                {invoice.businessPhone && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.businessPhone}
                  </Typography>
                )}
                {invoice.businessEmail && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.businessEmail}
                  </Typography>
                )}
                {invoice.businessTaxNumber && (
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'الرقم الضريبي:' : 'Tax Number:'} {invoice.businessTaxNumber}
                  </Typography>
                )}
              </Box>
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Person />
                  <Typography variant="h6">{isRTL ? 'إلى' : 'To'}</Typography>
                </Stack>
                <Typography variant="subtitle1" fontWeight="bold">
                  {invoice.clientName}
                </Typography>
                {invoice.clientEmail && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.clientEmail}
                  </Typography>
                )}
                {invoice.clientPhone && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.clientPhone}
                  </Typography>
                )}
                {invoice.clientAddress && (
                  <Typography variant="body2" color="text.secondary">
                    {invoice.clientAddress}
                  </Typography>
                )}
                {invoice.clientTaxNumber && (
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'الرقم الضريبي:' : 'Tax Number:'} {invoice.clientTaxNumber}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Invoice Items */}
            <Typography variant="h6" sx={{ mb: 2 }}>
              {isRTL ? 'عناصر الفاتورة' : 'Invoice Items'}
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${theme.palette.divider}` }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>
                      {isRTL ? 'الوصف' : 'Description'}
                    </th>
                    <th style={{ textAlign: 'center', padding: '8px' }}>
                      {isRTL ? 'الكمية' : 'Qty'}
                    </th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>
                      {isRTL ? 'السعر' : 'Price'}
                    </th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>
                      {isRTL ? 'ض.ق.م' : 'VAT'}
                    </th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>
                      {isRTL ? 'الإجمالي' : 'Total'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} style={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <td style={{ padding: '12px 8px' }}>
                        <Typography variant="body2" fontWeight="medium">
                          {isRTL ? item.nameAr || item.name : item.name}
                        </Typography>
                        {item.description && (
                          <Typography variant="caption" color="text.secondary">
                            {isRTL ? item.descriptionAr || item.description : item.description}
                          </Typography>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                        {item.quantity}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                        {item.unitPrice.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                        {item.vatAmount?.toFixed(2) || '0.00'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                        {item.totalWithVat.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', padding: '12px 8px' }}>
                      <Typography variant="body2" color="text.secondary">
                        {isRTL ? 'المجموع الفرعي:' : 'Subtotal:'}
                      </Typography>
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                      <Typography variant="body2">
                        {invoice.subtotal.toFixed(2)}
                      </Typography>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'right', padding: '12px 8px' }}>
                      <Typography variant="body2" color="text.secondary">
                        {isRTL ? 'ض.ق.م:' : 'VAT:'}
                      </Typography>
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                      <Typography variant="body2">
                        {invoice.vatAmount.toFixed(2)}
                      </Typography>
                    </td>
                  </tr>
                  <tr style={{ borderTop: `2px solid ${theme.palette.divider}` }}>
                    <td colSpan={4} style={{ textAlign: 'right', padding: '12px 8px' }}>
                      <Typography variant="h6">
                        {isRTL ? 'الإجمالي:' : 'Total:'}
                      </Typography>
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 8px' }}>
                      <Typography variant="h6" color="primary">
                        {invoice.totalAmount.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                      </Typography>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </Box>

            {/* Payment Terms & Notes */}
            {(invoice.paymentTerms || invoice.notes) && (
              <>
                <Divider sx={{ my: 3 }} />
                {invoice.paymentTerms && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {isRTL ? 'شروط الدفع:' : 'Payment Terms:'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? invoice.paymentTermsAr || invoice.paymentTerms : invoice.paymentTerms}
                    </Typography>
                  </Box>
                )}
                {invoice.notes && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {isRTL ? 'ملاحظات:' : 'Notes:'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? invoice.notesAr || invoice.notes : invoice.notes}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Box>

        {/* Sidebar */}
        <Box>
          {/* Invoice Details */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Receipt sx={{ mr: 1, verticalAlign: 'middle' }} />
                {isRTL ? 'تفاصيل الفاتورة' : 'Invoice Details'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'رقم الفاتورة' : 'Invoice Number'}
                  </Typography>
                  <Typography variant="body1">{invoice.invoiceNumber}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'تاريخ الفاتورة' : 'Invoice Date'}
                  </Typography>
                  <Typography variant="body1">
                    {format(toDateSafe(invoice.invoiceDate), 'dd/MM/yyyy')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}
                  </Typography>
                  <Typography variant="body1" color={isOverdue ? 'error' : 'inherit'}>
                    {format(toDateSafe(invoice.dueDate), 'dd/MM/yyyy')}
                  </Typography>
                </Box>
                {invoice.sentAt && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'تاريخ الإرسال' : 'Sent Date'}
                    </Typography>
                    <Typography variant="body1">
                      {format(toDateSafe(invoice.sentAt), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                  </Box>
                )}
                {invoice.viewedAt && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'تاريخ العرض' : 'Viewed Date'}
                    </Typography>
                    <Typography variant="body1">
                      {format(toDateSafe(invoice.viewedAt), 'dd/MM/yyyy HH:mm')}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <AttachMoney sx={{ mr: 1, verticalAlign: 'middle' }} />
                {isRTL ? 'ملخص الدفع' : 'Payment Summary'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'المبلغ الإجمالي:' : 'Total Amount:'}
                  </Typography>
                  <Typography variant="body1">
                    {invoice.totalAmount.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'المبلغ المدفوع:' : 'Paid Amount:'}
                  </Typography>
                  <Typography variant="body1" color="success.main">
                    {invoice.paidAmount.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                  </Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1">
                    {isRTL ? 'المبلغ المستحق:' : 'Due Amount:'}
                  </Typography>
                  <Typography variant="h6" color="error">
                    {invoice.dueAmount.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Payment sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {isRTL ? 'سجل المدفوعات' : 'Payment History'}
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Stack spacing={2}>
                  {invoice.payments.map((payment, index) => (
                    <Box key={index}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">
                          {format(toDateSafe(payment.date), 'dd/MM/yyyy')}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {payment.amount.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {payment.method} {payment.reference && `- ${payment.reference}`}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => {
          handleDuplicate();
          setAnchorEl(null);
        }}>
          <ContentCopy sx={{ mr: 1 }} />
          {isRTL ? 'نسخ' : 'Duplicate'}
        </MenuItem>
        <MenuItem onClick={() => {
          // TODO: Implement print
          setAnchorEl(null);
        }}>
          <Print sx={{ mr: 1 }} />
          {isRTL ? 'طباعة' : 'Print'}
        </MenuItem>
        <MenuItem onClick={() => {
          // TODO: Implement download
          setAnchorEl(null);
        }}>
          <FileDownload sx={{ mr: 1 }} />
          {isRTL ? 'تحميل PDF' : 'Download PDF'}
        </MenuItem>
      </Menu>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{isRTL ? 'تسجيل دفعة' : 'Record Payment'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label={isRTL ? 'تاريخ الدفع' : 'Payment Date'}
                value={paymentDate}
                onChange={(value) => value && setPaymentDate(value)}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
            <TextField
              fullWidth
              label={isRTL ? 'المبلغ' : 'Amount'}
              type="number"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              InputProps={{
                endAdornment: <InputAdornment position="end">{isRTL ? 'ج.م' : 'EGP'}</InputAdornment>,
              }}
            />
            <FormControl fullWidth>
              <InputLabel>{isRTL ? 'طريقة الدفع' : 'Payment Method'}</InputLabel>
              <Select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                label={isRTL ? 'طريقة الدفع' : 'Payment Method'}
              >
                <MenuItem value="cash">{isRTL ? 'نقدي' : 'Cash'}</MenuItem>
                <MenuItem value="card">{isRTL ? 'بطاقة' : 'Card'}</MenuItem>
                <MenuItem value="bank_transfer">{isRTL ? 'تحويل بنكي' : 'Bank Transfer'}</MenuItem>
                <MenuItem value="digital_wallet">{isRTL ? 'محفظة رقمية' : 'Digital Wallet'}</MenuItem>
                <MenuItem value="check">{isRTL ? 'شيك' : 'Check'}</MenuItem>
                <MenuItem value="other">{isRTL ? 'أخرى' : 'Other'}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label={isRTL ? 'المرجع' : 'Reference'}
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
            <TextField
              fullWidth
              label={isRTL ? 'ملاحظات' : 'Notes'}
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button variant="contained" onClick={handleRecordPayment}>
            {isRTL ? 'تسجيل' : 'Record'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InvoiceDetailPage;