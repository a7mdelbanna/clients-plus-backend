import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  MenuItem,
  Grid,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Chip,
  useTheme,
  Alert,
  CircularProgress,
  Autocomplete,
  alpha,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  ArrowBack,
  AttachMoney,
  Receipt,
  CloudUpload,
  Close,
  Save,
  Category,
  Store,
  AccountBalance,
  CreditCard,
  Smartphone,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ar, enUS } from 'date-fns/locale';
import { expenseService } from '../../../services/expense.service';
import { financeService } from '../../../services/finance.service';
import type { ExpenseCategory } from '../../../types/expense.types';
import ContactSelector from '../../../components/ContactSelector';
import { ContactType } from '../../../types/contact.types';
import { contactService } from '../../../services/contact.service';

const NewExpensePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  // Form state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Expense data
  const [date, setDate] = useState<Date | null>(new Date());
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [contactId, setContactId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank_transfer' | 'card'>('cash');
  const [accountId, setAccountId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receipts, setReceipts] = useState<File[]>([]);

  // Data lists
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Load categories, vendors, and accounts
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.companyId) {
        console.warn('NewExpensePage: Missing companyId', {
          hasUser: !!currentUser,
          companyId: currentUser?.companyId
        });
        return;
      }

      setLoading(true);
      try {
        const [categoriesData, accountsData] = await Promise.all([
          expenseService.getCategories(currentUser.companyId),
          financeService.getAccounts(currentUser.companyId),
        ]);

        setCategories(categoriesData.filter(cat => cat.isActive !== false));
        
        // Filter active accounts and set default
        const activeAccounts = accountsData.filter(acc => acc.status === 'active');
        setAccounts(activeAccounts);
        
        // Set default account (prefer cash account)
        const cashAccount = activeAccounts.find(acc => acc.type === 'cash');
        if (cashAccount) {
          setAccountId(cashAccount.id);
        } else if (activeAccounts.length > 0) {
          setAccountId(activeAccounts[0].id);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError(isRTL ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, isRTL]);

  const handleSubmit = async () => {
    if (!currentUser?.companyId || !currentBranch?.id) {
      setError(isRTL ? 'بيانات المستخدم أو الفرع مفقودة' : 'User or branch data missing');
      return;
    }

    // Validation
    if (!date || !description || !amount || !categoryId || !accountId) {
      setError(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // contactId is already set from ContactSelector

      // Create expense transaction
      const expenseData = {
        companyId: currentUser.companyId,
        branchId: currentBranch.id,
        accountId, // Use selected account
        type: 'expense' as const,
        status: 'completed' as const,
        date: date.toISOString(),
        description,
        amount: parseFloat(amount),
        totalAmount: parseFloat(amount),
        paymentMethod,
        reference,
        notes,
        expenseDetails: {
          categoryId,
          vendorId: contactId || '', // For backward compatibility
          contactId: contactId || '',
          receipts: [], // TODO: Handle receipt uploads
          approvalStatus: 'approved' as const, // Auto-approve for now
          isRecurring: false,
        },
        createdBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await financeService.createTransaction(expenseData);
      setSuccess(true);

      // Redirect after success
      setTimeout(() => {
        navigate('/finance/expenses');
      }, 2000);
    } catch (error) {
      console.error('Error creating expense:', error);
      setError(isRTL ? 'حدث خطأ في حفظ المصروف' : 'Error saving expense');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setReceipts(Array.from(files));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/finance/expenses')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            {isRTL ? 'مصروف جديد' : 'New Expense'}
          </Typography>
        </Box>

        {/* Alerts */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {isRTL ? 'تم حفظ المصروف بنجاح' : 'Expense saved successfully'}
          </Alert>
        )}

        {/* Main Form - Single Card Design */}
        <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
          <Grid container spacing={4}>
            {/* Row 1: Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={isRTL ? 'وصف المصروف' : 'Expense Description'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                multiline
                rows={2}
                placeholder={isRTL ? 'ماذا كان هذا المصروف؟' : 'What was this expense for?'}
                variant="outlined"
              />
            </Grid>

            {/* Row 2: Amount and Date */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={isRTL ? 'المبلغ' : 'Amount'}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                type="number"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachMoney />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {isRTL ? 'ج.م' : 'EGP'}
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label={isRTL ? 'تاريخ المصروف' : 'Expense Date'}
                value={date}
                onChange={setDate}
                sx={{ width: '100%' }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    variant: 'outlined',
                  }
                }}
              />
            </Grid>

            {/* Row 3: Account and Payment Method */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required variant="outlined">
                <InputLabel>{isRTL ? 'الحساب المالي' : 'Financial Account'}</InputLabel>
                <Select
                  value={accountId}
                  onChange={(e: SelectChangeEvent) => setAccountId(e.target.value)}
                  label={isRTL ? 'الحساب المالي' : 'Financial Account'}
                >
                  {accounts.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        {isRTL ? 'لا توجد حسابات' : 'No accounts available'}
                      </Typography>
                    </MenuItem>
                  ) : (
                    accounts.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {account.type === 'cash' && <AttachMoney fontSize="small" />}
                            {account.type === 'bank' && <AccountBalance fontSize="small" />}
                            {account.type === 'digital_wallet' && <Smartphone fontSize="small" />}
                            {account.type === 'credit_card' && <CreditCard fontSize="small" />}
                            <span>{isRTL ? account.nameAr || account.name : account.name}</span>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatCurrency(account.balance || 0)}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required variant="outlined">
                <InputLabel>{isRTL ? 'طريقة الدفع' : 'Payment Method'}</InputLabel>
                <Select
                  value={paymentMethod}
                  onChange={(e: SelectChangeEvent) => setPaymentMethod(e.target.value as any)}
                  label={isRTL ? 'طريقة الدفع' : 'Payment Method'}
                >
                  <MenuItem value="cash">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AttachMoney fontSize="small" />
                      {isRTL ? 'نقدي' : 'Cash'}
                    </Box>
                  </MenuItem>
                  <MenuItem value="bank_transfer">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AccountBalance fontSize="small" />
                      {isRTL ? 'تحويل بنكي' : 'Bank Transfer'}
                    </Box>
                  </MenuItem>
                  <MenuItem value="card">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CreditCard fontSize="small" />
                      {isRTL ? 'بطاقة' : 'Card'}
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Row 4: Category */}
            <Grid item xs={12}>
              <FormControl fullWidth required variant="outlined">
                <InputLabel>{isRTL ? 'فئة المصروف' : 'Expense Category'}</InputLabel>
                <Select
                  value={categoryId}
                  onChange={(e: SelectChangeEvent) => setCategoryId(e.target.value)}
                  label={isRTL ? 'فئة المصروف' : 'Expense Category'}
                >
                  {categories.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        {isRTL ? 'لا توجد فئات' : 'No categories available'}
                      </Typography>
                    </MenuItem>
                  ) : (
                    categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {isRTL ? category.nameAr : category.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>

            {/* Row 5: Vendor and Reference */}
            <Grid item xs={12} sm={6}>
              <ContactSelector
                label={isRTL ? 'المورد (اختياري)' : 'Vendor (Optional)'}
                placeholder={isRTL ? 'اختر أو أضف مورد جديد' : 'Select or add new vendor'}
                value={contactId}
                onChange={(id) => setContactId(id || '')}
                contactTypes={[ContactType.VENDOR, ContactType.SUPPLIER]}
                onCreateNew={async (name) => {
                  // Quick create vendor contact
                  const quickContact = {
                    displayName: name,
                    type: ContactType.VENDOR,
                    companyId: currentUser.companyId,
                  };
                  return await contactService.quickCreateContact(quickContact);
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={isRTL ? 'رقم المرجع (اختياري)' : 'Reference Number (Optional)'}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={isRTL ? 'رقم الفاتورة، الإيصال' : 'Invoice #, Receipt #'}
                variant="outlined"
              />
            </Grid>

            {/* Row 6: Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={isRTL ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={2}
                placeholder={isRTL ? 'أي تفاصيل إضافية' : 'Any additional details'}
                variant="outlined"
              />
            </Grid>

            {/* Row 7: Receipt Upload */}
            <Grid item xs={12}>
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ mb: 2, color: 'text.secondary' }}>
                  {isRTL ? 'المرفقات (اختياري)' : 'Attachments (Optional)'}
                </Typography>
                <Box sx={{ 
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 3,
                  textAlign: 'center',
                  bgcolor: 'background.default',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: alpha(theme.palette.primary.main, 0.04),
                  }
                }}>
                  <input
                    type="file"
                    id="file-upload"
                    hidden
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                  />
                  <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                    <CloudUpload sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'انقر لرفع الملفات أو اسحبها هنا' : 'Click to upload files or drag them here'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isRTL ? 'صور أو PDF (حد أقصى 10MB)' : 'Images or PDF (max 10MB)'}
                    </Typography>
                  </label>
                  {receipts.length > 0 && (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 2 }}>
                      {receipts.map((file, index) => (
                        <Chip
                          key={index}
                          label={file.name}
                          size="small"
                          onDelete={() => setReceipts(receipts.filter((_, i) => i !== index))}
                          icon={<Receipt />}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/finance/expenses')}
              disabled={saving}
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={20} /> : <Save />}
            >
              {isRTL ? 'حفظ المصروف' : 'Save Expense'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default NewExpensePage;