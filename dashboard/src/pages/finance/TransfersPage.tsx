import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Avatar,
} from '@mui/material';
import {
  ArrowBack,
  SwapHoriz,
  Add,
  AccountBalance,
  TrendingUp,
  ArrowForward,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { financeService } from '../../services/finance.service';
import type { FinancialAccount, FinancialTransaction } from '../../types/finance.types';
import { toast } from 'react-toastify';
import { toDateSafe } from '../../utils/dateUtils';

const TransfersPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [recentTransfers, setRecentTransfers] = useState<FinancialTransaction[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    description: '',
    descriptionAr: '',
    date: new Date(),
  });

  // Load data
  useEffect(() => {
    if (currentUser?.companyId) {
      loadData();
    }
  }, [currentUser?.companyId, currentBranch?.id]);

  const loadData = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);
      
      // Load accounts
      const accountsData = await financeService.getAccounts(
        currentUser.companyId,
        { branchId: currentBranch?.id, status: 'active' }
      );
      setAccounts(accountsData);

      // Load recent transfers
      const { transactions } = await financeService.getTransactions(
        currentUser.companyId,
        {
          category: 'transfer',
        },
        10 // Last 10 transfers
      );
      setRecentTransfers(transactions);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(isRTL ? 'خطأ في تحميل البيانات' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleOpenDialog = () => {
    setFormData({
      fromAccountId: '',
      toAccountId: '',
      amount: 0,
      description: '',
      descriptionAr: '',
      date: new Date(),
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSaveTransfer = async () => {
    if (!currentUser?.companyId || saving) return;

    // Validation
    if (!formData.fromAccountId || !formData.toAccountId) {
      toast.error(isRTL ? 'الرجاء اختيار الحسابات' : 'Please select accounts');
      return;
    }

    if (formData.fromAccountId === formData.toAccountId) {
      toast.error(isRTL ? 'لا يمكن التحويل لنفس الحساب' : 'Cannot transfer to the same account');
      return;
    }

    if (formData.amount <= 0) {
      toast.error(isRTL ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero');
      return;
    }

    try {
      setSaving(true);

      const fromAccount = accounts.find(a => a.id === formData.fromAccountId);
      const toAccount = accounts.find(a => a.id === formData.toAccountId);

      if (!fromAccount || !toAccount) {
        toast.error(isRTL ? 'خطأ في البيانات' : 'Data error');
        return;
      }

      // Check balance
      if (!fromAccount.allowNegativeBalance && fromAccount.currentBalance < formData.amount) {
        toast.error(isRTL ? 'الرصيد غير كافي' : 'Insufficient balance');
        return;
      }

      const description = formData.description || 
        `${fromAccount.name} → ${toAccount.name}`;
      const descriptionAr = formData.descriptionAr || 
        `${toAccount.nameAr} ← ${fromAccount.nameAr}`;

      await financeService.createTransfer(
        currentUser.companyId,
        formData.fromAccountId,
        formData.toAccountId,
        formData.amount,
        description,
        currentUser.id,
        currentBranch?.id || 'main'
      );

      toast.success(isRTL ? 'تم التحويل بنجاح' : 'Transfer completed successfully');
      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast.error(isRTL ? 'خطأ في إنشاء التحويل' : 'Error creating transfer');
    } finally {
      setSaving(false);
    }
  };

  // Get account by ID
  const getAccount = (accountId: string) => {
    return accounts.find(a => a.id === accountId);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <IconButton onClick={() => navigate('/finance/accounts')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isRTL ? 'التحويلات بين الحسابات' : 'Account Transfers'}
          </Typography>
        </Stack>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenDialog}
        >
          {isRTL ? 'تحويل جديد' : 'New Transfer'}
        </Button>
      </Box>

      {/* Quick Transfer Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {isRTL ? 'أرصدة الحسابات' : 'Account Balances'}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
              mt: 2,
            }}
          >
            {accounts.map(account => (
              <Box
                key={account.id}
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                  <AccountBalance />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body2">
                    {isRTL ? account.nameAr : account.name}
                  </Typography>
                  <Typography
                    variant="h6"
                    color={account.currentBalance >= 0 ? 'success.main' : 'error.main'}
                  >
                    {account.currentBalance.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Recent Transfers */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {isRTL ? 'التحويلات الأخيرة' : 'Recent Transfers'}
          </Typography>

          {recentTransfers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <SwapHoriz sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">
                {isRTL ? 'لا توجد تحويلات سابقة' : 'No transfers yet'}
              </Typography>
            </Box>
          ) : (
            <List>
              {recentTransfers.map((transfer) => {
                const isFromTransfer = transfer.transferDirection === 'from';
                const otherAccount = getAccount(transfer.transferAccountId || '');
                
                return (
                  <ListItem key={transfer.id} divider>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography>
                            {isRTL && transfer.descriptionAr ? transfer.descriptionAr : transfer.description}
                          </Typography>
                          <Chip
                            size="small"
                            icon={isFromTransfer ? <ArrowForward /> : <TrendingUp />}
                            label={isFromTransfer ? (isRTL ? 'صادر' : 'Outgoing') : (isRTL ? 'وارد' : 'Incoming')}
                            color={isFromTransfer ? 'error' : 'success'}
                          />
                        </Stack>
                      }
                      secondary={toDateSafe(transfer.date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    />
                    <ListItemSecondaryAction>
                      <Typography
                        variant="h6"
                        color={isFromTransfer ? 'error.main' : 'success.main'}
                      >
                        {isFromTransfer ? '-' : '+'}{transfer.totalAmount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                      </Typography>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Transfer Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
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
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label={isRTL ? 'التاريخ' : 'Date'}
                value={formData.date}
                onChange={(value) => value && setFormData({ ...formData, date: value })}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>

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
          <Button onClick={handleCloseDialog} disabled={saving}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSaveTransfer}
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
    </Container>
  );
};

export default TransfersPage;