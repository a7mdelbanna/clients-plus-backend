import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  useTheme,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { productService } from '../../services/product.service';
import type { Product } from '../../types/product.types';

interface StockAdjustmentDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  onSuccess: () => void;
}

export default function StockAdjustmentDialog({
  open,
  onClose,
  product,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentBranch } = useBranch();
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentStock = product.branchStock?.[currentBranch?.id || '']?.quantity || 0;

  const handleSubmit = async () => {
    if (!user?.companyId || !currentBranch?.id) return;

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError(isRTL ? 'الكمية غير صحيحة' : 'Invalid quantity');
      return;
    }

    if (!reason.trim()) {
      setError(isRTL ? 'يرجى إدخال السبب' : 'Please enter a reason');
      return;
    }

    const adjustedQuantity = adjustmentType === 'subtract' ? -qty : qty;
    const newQuantity = currentStock + adjustedQuantity;

    if (newQuantity < 0) {
      setError(isRTL ? 'لا يمكن أن تكون الكمية سالبة' : 'Stock cannot be negative');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await productService.adjustStock(
        user.companyId,
        currentBranch.id,
        product.id!,
        adjustedQuantity,
        reason,
        user.uid
      );

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      setError(isRTL ? 'حدث خطأ أثناء تعديل المخزون' : 'Error adjusting stock');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAdjustmentType('add');
    setQuantity('');
    setReason('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isRTL ? 'تعديل المخزون' : 'Adjust Stock'} - {isRTL ? product.nameAr : product.name}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Current Stock Display */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography>
              {isRTL ? 'المخزون الحالي:' : 'Current Stock:'} <strong>{currentStock}</strong>
            </Typography>
          </Alert>

          {/* Adjustment Type */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{isRTL ? 'نوع التعديل' : 'Adjustment Type'}</InputLabel>
            <Select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as 'add' | 'subtract')}
              label={isRTL ? 'نوع التعديل' : 'Adjustment Type'}
            >
              <MenuItem value="add">{isRTL ? 'إضافة للمخزون' : 'Add to Stock'}</MenuItem>
              <MenuItem value="subtract">{isRTL ? 'خصم من المخزون' : 'Remove from Stock'}</MenuItem>
            </Select>
          </FormControl>

          {/* Quantity */}
          <TextField
            fullWidth
            label={isRTL ? 'الكمية' : 'Quantity'}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputProps={{ min: 1 }}
            sx={{ mb: 2 }}
          />

          {/* Reason */}
          <TextField
            fullWidth
            label={isRTL ? 'السبب' : 'Reason'}
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isRTL
                ? 'مثال: جرد فعلي، تلف، خطأ في الإدخال...'
                : 'e.g., Physical count, damage, input error...'
            }
            sx={{ mb: 2 }}
          />

          {/* New Stock Preview */}
          {quantity && !isNaN(parseInt(quantity)) && (
            <Alert severity={adjustmentType === 'subtract' ? 'warning' : 'success'}>
              <Typography>
                {isRTL ? 'المخزون الجديد:' : 'New Stock:'}{' '}
                <strong>
                  {currentStock + (adjustmentType === 'subtract' ? -parseInt(quantity) : parseInt(quantity))}
                </strong>
              </Typography>
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {isRTL ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !quantity || !reason}
        >
          {loading ? (isRTL ? 'جاري التعديل...' : 'Adjusting...') : (isRTL ? 'تعديل' : 'Adjust')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}