import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Alert,
  InputAdornment,
  Autocomplete,
  Chip,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  AttachMoney,
  Receipt,
  Category,
  Business,
  CalendarMonth,
  Description,
  Add as AddIcon,
  Delete as DeleteIcon,
  AccountBalance,
  Wallet,
  CreditCard,
  Smartphone,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { expenseService } from '../../../services/expense.service';
import { contactService } from '../../../services/contact.service';
import { financeService } from '../../../services/finance.service';
import { ContactType } from '../../../types/contact.types';
import type { Contact } from '../../../types/contact.types';
import type { FinancialAccount } from '../../../types/finance.types';
import { toast } from 'react-toastify';

interface NewExpenseDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExpenseItem {
  description: string;
  amount: number;
  quantity: number;
  total: number;
}

export default function NewExpenseDialog({ open, onClose, onSuccess }: NewExpenseDialogProps) {
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const [loading, setLoading] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    accountId: '',
    vendorId: '',
    categoryId: '',
    date: new Date(),
    invoiceNumber: '',
    description: '',
    paymentMethod: 'cash',
    notes: '',
  });

  const [items, setItems] = useState<ExpenseItem[]>([
    { description: '', amount: 0, quantity: 1, total: 0 }
  ]);

  // Load vendors and categories
  useEffect(() => {
    if (open && currentUser?.companyId) {
      loadData();
    }
  }, [open, currentUser?.companyId, currentBranch?.id]);

  const loadData = async () => {
    if (!currentUser?.companyId) return;

    try {
      // Load all contacts (beneficiaries) - expenses can go to anyone
      // Simplified query to avoid index issues
      const { contacts } = await contactService.getContacts(
        currentUser.companyId,
        {},
        100
      );
      
      // Filter for active contacts only (all types can be beneficiaries)
      const activeContacts = contacts.filter(c => c.status === 'active');
      
      setBeneficiaries(activeContacts);

      // Load expense categories
      const fetchedCategories = await expenseService.getCategories(currentUser.companyId);
      setCategories(fetchedCategories);

      // Load financial accounts
      // First try to get all accounts, then filter
      const fetchedAccounts = await financeService.getAccounts(currentUser.companyId);
      console.log('Fetched accounts:', fetchedAccounts);
      
      // If no accounts exist, create default cash account
      if (fetchedAccounts.length === 0) {
        console.log('No accounts found, creating default cash account...');
        try {
          const defaultAccountId = await financeService.createAccount({
            companyId: currentUser.companyId,
            branchId: currentBranch?.id,
            name: 'Cash',
            nameAr: 'نقدي',
            type: 'cash',
            currentBalance: 0,
            openingBalance: 0,
            isDefault: true,
            allowNegativeBalance: false,
            status: 'active',
            createdBy: currentUser.id,
          });
          
          // Reload accounts after creating default
          const newAccounts = await financeService.getAccounts(currentUser.companyId);
          setAccounts(newAccounts);
          
          // Select the newly created account
          if (defaultAccountId) {
            setFormData(prev => ({ ...prev, accountId: defaultAccountId }));
          }
        } catch (err) {
          console.error('Error creating default account:', err);
        }
      } else {
        // Filter for active accounts or all accounts if none are active
        let activeAccounts = fetchedAccounts.filter(acc => acc.status === 'active');
        
        // If no active accounts, use all accounts
        if (activeAccounts.length === 0) {
          activeAccounts = fetchedAccounts;
        }
        
        setAccounts(activeAccounts);
      
        // Auto-select default account or cash account
        const defaultAccount = activeAccounts.find(acc => acc.isDefault);
        const cashAccount = activeAccounts.find(acc => acc.type === 'cash');
        
        if (defaultAccount) {
          setFormData(prev => ({ ...prev, accountId: defaultAccount.id! }));
        } else if (cashAccount) {
          setFormData(prev => ({ ...prev, accountId: cashAccount.id! }));
        } else if (activeAccounts.length > 0) {
          setFormData(prev => ({ ...prev, accountId: activeAccounts[0].id! }));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('خطأ في تحميل البيانات');
    }
  };

  const handleAddItem = () => {
    setItems([...items, { description: '', amount: 0, quantity: 1, total: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof ExpenseItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate total for the item
    if (field === 'amount' || field === 'quantity') {
      newItems[index].total = newItems[index].amount * newItems[index].quantity;
    }
    
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.accountId) {
      toast.error('يرجى اختيار الحساب المالي');
      return;
    }
    if (!formData.vendorId) {
      toast.error('يرجى اختيار المستفيد');
      return;
    }
    if (!formData.categoryId) {
      toast.error('يرجى اختيار الفئة');
      return;
    }
    if (items.every(item => !item.description || item.amount === 0)) {
      toast.error('يرجى إضافة عنصر واحد على الأقل');
      return;
    }

    if (!currentUser?.companyId || !currentBranch) {
      toast.error('معلومات المستخدم أو الفرع غير متوفرة');
      return;
    }

    try {
      setLoading(true);

      const totalAmount = calculateTotal();
      
      // Get the selected beneficiary name
      const selectedBeneficiary = beneficiaries.find(b => b.id === formData.vendorId);
      const beneficiaryName = selectedBeneficiary?.displayName || 'Unknown';
      
      // Get the selected category name
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      const categoryName = selectedCategory?.nameAr || selectedCategory?.name || '';
      
      // Create a meaningful description
      const dateStr = formData.date.toLocaleDateString('ar-EG', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Build description: "BeneficiaryName - Description/Items - Date"
      let description = beneficiaryName;
      if (formData.description) {
        description += ` - ${formData.description}`;
      } else if (items[0]?.description) {
        // Use first item description if no main description
        description += ` - ${items[0].description}`;
      } else if (categoryName) {
        description += ` - ${categoryName}`;
      }
      description += ` - ${dateStr}`;
      
      // Create expense transaction data in the correct format
      const expenseData = {
        companyId: currentUser.companyId,
        branchId: currentBranch.id, // Add branch ID to expense
        accountId: formData.accountId, // Use the selected account
        type: 'expense' as const,
        status: 'completed' as const,
        date: formData.date.toISOString(),
        description: description,
        amount: totalAmount,
        vatAmount: 0, // You can calculate VAT if needed
        totalAmount: totalAmount,
        paymentMethod: formData.paymentMethod as any,
        reference: formData.invoiceNumber || '',
        expenseDetails: {
          categoryId: formData.categoryId,
          vendorId: formData.vendorId,
          receipts: [],
          isRecurring: false,
          itemDetails: items
            .filter(item => item.description && item.amount > 0)
            .map(item => ({
              description: item.description,
              quantity: item.quantity,
              unit: 'unit',
              unitPrice: item.amount,
              total: item.total,
              categoryId: formData.categoryId,
            })),
          notes: formData.notes,
        },
        createdBy: currentUser.id,
      };

      await expenseService.createExpenseTransaction(expenseData, true);
      
      toast.success('تم إنشاء المصروف بنجاح');
      
      // Reset form
      setFormData({
        accountId: '',
        vendorId: '',
        categoryId: '',
        date: new Date(),
        invoiceNumber: '',
        description: '',
        paymentMethod: 'cash',
        notes: '',
      });
      setItems([{ description: '', amount: 0, quantity: 1, total: 0 }]);
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating expense:', error);
      toast.error(error.message || 'حدث خطأ في إنشاء المصروف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt color="primary" />
            <Typography variant="h6">مصروف جديد</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              المعلومات الأساسية
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Account Selection */}
              <FormControl fullWidth required>
                <InputLabel>الحساب المالي</InputLabel>
                <Select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  label="الحساب المالي"
                  startAdornment={
                    <InputAdornment position="start">
                      {accounts.find(a => a.id === formData.accountId)?.type === 'bank' ? <AccountBalance /> :
                       accounts.find(a => a.id === formData.accountId)?.type === 'cash' ? <Wallet /> :
                       accounts.find(a => a.id === formData.accountId)?.type === 'credit_card' ? <CreditCard /> :
                       accounts.find(a => a.id === formData.accountId)?.type === 'digital_wallet' ? <Smartphone /> :
                       <AttachMoney />}
                    </InputAdornment>
                  }
                >
                  {accounts.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        لا توجد حسابات مالية. يرجى إنشاء حساب أولاً من إعدادات المالية.
                      </Typography>
                    </MenuItem>
                  ) : (
                    accounts.map((account) => (
                      <MenuItem key={account.id} value={account.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {account.type === 'bank' && <AccountBalance fontSize="small" />}
                            {account.type === 'cash' && <Wallet fontSize="small" />}
                            {account.type === 'credit_card' && <CreditCard fontSize="small" />}
                            {account.type === 'digital_wallet' && <Smartphone fontSize="small" />}
                            <span>{account.nameAr || account.name}</span>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {account.currentBalance?.toFixed(2) || '0.00'} ج.م
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={beneficiaries}
                  getOptionLabel={(option) => option.displayName || ''}
                  value={beneficiaries.find(b => b.id === formData.vendorId) || null}
                  onChange={(_, newValue) => {
                    setFormData({ ...formData, vendorId: newValue?.id || '' });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="المستفيد"
                      required
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Business />
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
                <FormControl sx={{ flex: 1 }} required>
                  <InputLabel>الفئة</InputLabel>
                  <Select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    label="الفئة"
                    startAdornment={
                      <InputAdornment position="start">
                        <Category />
                      </InputAdornment>
                    }
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              bgcolor: category.color,
                            }}
                          />
                          {category.nameAr || category.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="التاريخ"
                    value={formData.date}
                    onChange={(newValue) => {
                      if (newValue) setFormData({ ...formData, date: newValue });
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: { flex: 1 },
                        InputProps: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <CalendarMonth />
                            </InputAdornment>
                          ),
                        },
                      },
                    }}
                  />
                </LocalizationProvider>
                <TextField
                  sx={{ flex: 1 }}
                  fullWidth
                  label="رقم الفاتورة"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Receipt />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* Expense Items */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                عناصر المصروف
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddItem}
              >
                إضافة عنصر
              </Button>
            </Box>
            
            {items.map((item, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                  <TextField
                    sx={{ flex: { xs: '1 1 100%', sm: '2' } }}
                    size="small"
                    label="الوصف"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  />
                  <TextField
                    sx={{ flex: { xs: '1 1 45%', sm: '1' } }}
                    size="small"
                    label="السعر"
                    type="number"
                    value={item.amount}
                    onChange={(e) => handleItemChange(index, 'amount', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">ج.م</InputAdornment>,
                    }}
                  />
                  <TextField
                    sx={{ flex: { xs: '1 1 45%', sm: '1' } }}
                    size="small"
                    label="الكمية"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                  />
                  <TextField
                    sx={{ flex: { xs: '1 1 80%', sm: '1.5' } }}
                    size="small"
                    label="المجموع"
                    value={item.total.toFixed(2)}
                    disabled
                    InputProps={{
                      startAdornment: <InputAdornment position="start">ج.م</InputAdornment>,
                    }}
                  />
                  {items.length > 1 && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRemoveItem(index)}
                      sx={{ flex: '0 0 auto' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>
            ))}

            <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <Typography variant="h6" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>المجموع الكلي:</span>
                <span>{calculateTotal().toFixed(2)} ج.م</span>
              </Typography>
            </Box>
          </Box>

          <Divider />

          {/* Additional Information */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
              معلومات إضافية
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <FormControl sx={{ flex: 1 }}>
                  <InputLabel>طريقة الدفع</InputLabel>
                  <Select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    label="طريقة الدفع"
                  >
                    <MenuItem value="cash">نقدي</MenuItem>
                    <MenuItem value="bank_transfer">تحويل بنكي</MenuItem>
                    <MenuItem value="check">شيك</MenuItem>
                    <MenuItem value="credit">آجل</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <TextField
                fullWidth
                label="ملاحظات"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Description />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? null : <Receipt />}
        >
          {loading ? 'جاري الحفظ...' : 'حفظ المصروف'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}