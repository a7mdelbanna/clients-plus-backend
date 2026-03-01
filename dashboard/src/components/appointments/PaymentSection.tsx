import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  Paper,
  Chip,
} from '@mui/material';
import {
  AttachMoney,
  CreditCard,
  AccountBalance,
  Payments,
} from '@mui/icons-material';

interface PaymentSectionProps {
  totalAmount: number;
  paymentStatus: 'none' | 'partial' | 'full';
  paymentMethod: 'cash' | 'card' | 'transfer';
  paidAmount: number;
  onPaymentStatusChange: (status: 'none' | 'partial' | 'full') => void;
  onPaymentMethodChange: (method: 'cash' | 'card' | 'transfer') => void;
  onPaidAmountChange: (amount: number) => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
  totalAmount,
  paymentStatus,
  paymentMethod,
  paidAmount,
  onPaymentStatusChange,
  onPaymentMethodChange,
  onPaidAmountChange,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  const paymentMethods = [
    { value: 'cash', label: isRTL ? 'نقدي' : 'Cash', icon: <Payments /> },
    { value: 'card', label: isRTL ? 'بطاقة' : 'Card', icon: <CreditCard /> },
    { value: 'transfer', label: isRTL ? 'تحويل' : 'Transfer', icon: <AccountBalance /> },
  ];

  const remainingAmount = totalAmount - paidAmount;

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2, 
        backgroundColor: theme.palette.mode === 'dark' 
          ? theme.palette.background.paper 
          : theme.palette.grey[50],
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AttachMoney />
        {isRTL ? 'الدفع' : 'Payment'}
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Payment Status */}
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="subtitle2" gutterBottom>
            {isRTL ? 'حالة الدفع' : 'Payment Status'}
          </Typography>
          <ToggleButtonGroup
            value={paymentStatus}
            exclusive
            onChange={(_, value) => value && onPaymentStatusChange(value)}
            size="small"
            fullWidth
          >
            <ToggleButton value="none">
              {isRTL ? 'لم يدفع' : 'Not Paid'}
            </ToggleButton>
            <ToggleButton value="partial">
              {isRTL ? 'دفعة جزئية' : 'Partial'}
            </ToggleButton>
            <ToggleButton value="full">
              {isRTL ? 'مدفوع بالكامل' : 'Paid in Full'}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Payment Method */}
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="subtitle2" gutterBottom>
            {isRTL ? 'طريقة الدفع' : 'Payment Method'}
          </Typography>
          <FormControl fullWidth size="small">
            <Select
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value as 'cash' | 'card' | 'transfer')}
              disabled={paymentStatus === 'none'}
            >
              {paymentMethods.map((method) => (
                <MenuItem key={method.value} value={method.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {method.icon}
                    {method.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Amount Fields */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3, alignItems: 'flex-end' }}>
        <TextField
          label={isRTL ? 'المبلغ الإجمالي' : 'Total Amount'}
          value={totalAmount}
          size="small"
          disabled
          InputProps={{
            startAdornment: <InputAdornment position="start">{isRTL ? 'ج.م' : 'EGP'}</InputAdornment>,
          }}
          sx={{ flex: 1 }}
        />

        {paymentStatus !== 'none' && (
          <>
            <TextField
              label={isRTL ? 'المبلغ المدفوع' : 'Paid Amount'}
              value={paymentStatus === 'full' ? totalAmount : paidAmount}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                onPaidAmountChange(Math.min(value, totalAmount));
              }}
              size="small"
              type="number"
              disabled={paymentStatus === 'full'}
              InputProps={{
                startAdornment: <InputAdornment position="start">{isRTL ? 'ج.م' : 'EGP'}</InputAdornment>,
              }}
              sx={{ flex: 1 }}
            />

            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {isRTL ? 'المتبقي' : 'Remaining'}
              </Typography>
              <Typography variant="h6" color={remainingAmount > 0 ? 'error.main' : 'success.main'}>
                {paymentStatus === 'full' ? 0 : remainingAmount} {isRTL ? 'ج.م' : 'EGP'}
              </Typography>
            </Box>
          </>
        )}
      </Box>

      {/* Payment Status Chips */}
      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
        {paymentStatus === 'full' && (
          <Chip
            label={isRTL ? 'مدفوع بالكامل' : 'Paid in Full'}
            color="success"
            size="small"
          />
        )}
        {paymentStatus === 'partial' && (
          <Chip
            label={`${isRTL ? 'مدفوع' : 'Paid'}: ${paidAmount} ${isRTL ? 'ج.م' : 'EGP'}`}
            color="warning"
            size="small"
          />
        )}
        {paymentStatus === 'none' && (
          <Chip
            label={isRTL ? 'غير مدفوع' : 'Unpaid'}
            color="error"
            size="small"
          />
        )}
      </Box>
    </Paper>
  );
};

export default PaymentSection;