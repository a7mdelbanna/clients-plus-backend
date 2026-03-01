import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Box,
} from '@mui/material';
import { SwapHoriz } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { financeService } from '../../services/finance.service';
import type { FinancialAccount } from '../../types/finance.types';
import { toast } from 'react-toastify';

interface TransferDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  accounts?: FinancialAccount[];
}

const TransferDialog: React.FC<TransferDialogProps> = ({ 
  open, 
  onClose, 
  onSuccess,
  accounts: providedAccounts 
}) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';

  const [accounts, setAccounts] = useState<FinancialAccount[]>(providedAccounts || []);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    date: new Date(),
    description: '',
  });

  // Load accounts if not provided
  useEffect(() => {
    if (open && !providedAccounts && currentUser?.companyId) {
      loadAccounts();
    }
  }, [open, currentUser?.companyId, providedAccounts]);

  // Update accounts if provided
  useEffect(() => {
    if (providedAccounts) {
      setAccounts(providedAccounts);
    }
  }, [providedAccounts]);

  const loadAccounts = async () => {
    if (!currentUser?.companyId) return;
    
    try {
      setLoading(true);
      const accountsData = await financeService.getAccounts(
        currentUser.companyId,
        { branchId: currentBranch?.id }
      );
      setAccounts(accountsData.filter(acc => acc.status === 'active'));
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error(isRTL ? 'خطأ في تحميل الحسابات' : 'Error loading accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setFormData({
        fromAccountId: '',
        toAccountId: '',
        amount: 0,
        date: new Date(),
        description: '',
      });
      onClose();
    }
  };

  const handleSave = async () => {
    // Validation
    if (!formData.fromAccountId || !formData.toAccountId) {
      toast.error(isRTL ? 'يرجى اختيار الحسابات' : 'Please select accounts');
      return;
    }

    if (formData.fromAccountId === formData.toAccountId) {
      toast.error(isRTL ? 'لا يمكن التحويل لنفس الحساب' : 'Cannot transfer to the same account');
      return;
    }

    if (formData.amount <= 0) {
      toast.error(isRTL ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    const fromAccount = accounts.find(a => a.id === formData.fromAccountId);
    if (fromAccount && !fromAccount.allowNegativeBalance && fromAccount.currentBalance < formData.amount) {
      toast.error(isRTL ? 'الرصيد غير كافي' : 'Insufficient balance');
      return;
    }

    try {
      setSaving(true);

      if (!currentUser?.companyId || !currentBranch?.id) {
        throw new Error('Missing company or branch information');
      }

      // Create transfer transactions
      await financeService.createTransfer({
        companyId: currentUser.companyId,
        branchId: currentBranch.id,
        fromAccountId: formData.fromAccountId,
        toAccountId: formData.toAccountId,
        amount: formData.amount,
        date: formData.date.toISOString(),
        description: formData.description || 
          `${isRTL ? 'تحويل من' : 'Transfer from'} ${
            accounts.find(a => a.id === formData.fromAccountId)?.name
          } ${isRTL ? 'إلى' : 'to'} ${
            accounts.find(a => a.id === formData.toAccountId)?.name
          }`,
        createdBy: currentUser.id,
      });

      toast.success(isRTL ? 'تم التحويل بنجاح' : 'Transfer completed successfully');
      
      if (onSuccess) {
        onSuccess();
      }
      
      handleClose();
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      toast.error(error.message || (isRTL ? 'خطأ في إنشاء التحويل' : 'Error creating transfer'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>
          {isRTL ? 'تحويل بين الحسابات' : 'Transfer Between Accounts'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* From Account */}
            <FormControl fullWidth>
              <InputLabel>{isRTL ? 'من حساب' : 'From Account'}</InputLabel>
              <Select
                value={formData.fromAccountId}
                onChange={(e) => setFormData({ ...formData, fromAccountId: e.target.value })}
                label={isRTL ? 'من حساب' : 'From Account'}
              >
                {accounts.map(account => (
                  <MenuItem key={account.id} value={account.id}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                      <span>{isRTL ? account.nameAr : account.name}</span>
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                        {account.currentBalance.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* To Account */}
            <FormControl fullWidth>
              <InputLabel>{isRTL ? 'إلى حساب' : 'To Account'}</InputLabel>
              <Select
                value={formData.toAccountId}
                onChange={(e) => setFormData({ ...formData, toAccountId: e.target.value })}
                label={isRTL ? 'إلى حساب' : 'To Account'}
              >
                {accounts
                  .filter(account => account.id !== formData.fromAccountId)
                  .map(account => (
                    <MenuItem key={account.id} value={account.id}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
                        <span>{isRTL ? account.nameAr : account.name}</span>
                        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                          {account.currentBalance.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                        </Typography>
                      </Stack>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Amount */}
            <TextField
              fullWidth
              type="number"
              label={isRTL ? 'المبلغ' : 'Amount'}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              InputProps={{
                endAdornment: <InputAdornment position="end">{isRTL ? 'ج.م' : 'EGP'}</InputAdornment>,
                inputProps: { min: 0, step: 0.01 }
              }}
              required
            />

            {/* Date */}
            <DatePicker
              label={isRTL ? 'التاريخ' : 'Date'}
              value={formData.date}
              onChange={(value) => value && setFormData({ ...formData, date: value })}
              slotProps={{ textField: { fullWidth: true } }}
            />

            {/* Description */}
            <TextField
              fullWidth
              label={isRTL ? 'الوصف (اختياري)' : 'Description (Optional)'}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />

            {/* Available Balance Alert */}
            {formData.fromAccountId && (
              <Alert severity="info">
                {(() => {
                  const fromAccount = accounts.find(a => a.id === formData.fromAccountId);
                  if (!fromAccount) return null;
                  
                  return (
                    <>
                      {isRTL ? 'الرصيد المتاح: ' : 'Available Balance: '}
                      <strong>
                        {fromAccount.currentBalance.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                      </strong>
                      {!fromAccount.allowNegativeBalance && fromAccount.currentBalance < formData.amount && (
                        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                          {isRTL ? 'الرصيد غير كافي' : 'Insufficient balance'}
                        </Typography>
                      )}
                    </>
                  );
                })()}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={saving}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} /> : <SwapHoriz />}
          >
            {saving
              ? (isRTL ? 'جاري التحويل...' : 'Transferring...')
              : (isRTL ? 'تحويل' : 'Transfer')
            }
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default TransferDialog;