import React, { useState, useEffect } from 'react';
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
import { branchService } from '../../services/branch.service';
import { productService } from '../../services/product.service';
import type { Product } from '../../types/product.types';
import type { Branch } from '../../types/branch.types';

interface StockTransferDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product;
  onSuccess: () => void;
}

export default function StockTransferDialog({
  open,
  onClose,
  product,
  onSuccess,
}: StockTransferDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentBranch } = useBranch();
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [toBranchId, setToBranchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentStock = product.branchStock?.[currentBranch?.id || '']?.quantity || 0;

  useEffect(() => {
    if (user?.companyId) {
      loadBranches();
    }
  }, [user]);

  const loadBranches = async () => {
    if (!user?.companyId) return;

    try {
      const allBranches = await branchService.getBranches(user.companyId);
      // Filter out current branch
      const otherBranches = allBranches.filter(b => b.id !== currentBranch?.id && b.isActive);
      setBranches(otherBranches);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user?.companyId || !currentBranch?.id) return;

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError(isRTL ? 'الكمية غير صحيحة' : 'Invalid quantity');
      return;
    }

    if (qty > currentStock) {
      setError(isRTL ? 'الكمية المطلوبة أكبر من المخزون المتاح' : 'Requested quantity exceeds available stock');
      return;
    }

    if (!toBranchId) {
      setError(isRTL ? 'يرجى اختيار الفرع المستقبل' : 'Please select destination branch');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await productService.createStockTransfer({
        companyId: user.companyId,
        fromBranchId: currentBranch.id,
        toBranchId,
        transferDate: new Date().toISOString(),
        items: [{
          productId: product.id!,
          quantity: qty,
        }],
        status: 'completed', // Immediate transfer for now
        notes,
        createdBy: user.uid,
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error transferring stock:', error);
      setError(isRTL ? 'حدث خطأ أثناء نقل المخزون' : 'Error transferring stock');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setToBranchId('');
    setQuantity('');
    setNotes('');
    setError('');
    onClose();
  };

  const getDestinationStock = () => {
    if (!toBranchId || !product.branchStock) return 0;
    return product.branchStock[toBranchId]?.quantity || 0;
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isRTL ? 'نقل المخزون' : 'Transfer Stock'} - {isRTL ? product.nameAr : product.name}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Current Stock Display */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography>
              {isRTL ? 'المخزون الحالي في' : 'Current Stock at'} {currentBranch?.name}: <strong>{currentStock}</strong>
            </Typography>
          </Alert>

          {/* Destination Branch */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{isRTL ? 'نقل إلى الفرع' : 'Transfer to Branch'}</InputLabel>
            <Select
              value={toBranchId}
              onChange={(e) => setToBranchId(e.target.value)}
              label={isRTL ? 'نقل إلى الفرع' : 'Transfer to Branch'}
            >
              {branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name} ({isRTL ? 'المخزون الحالي:' : 'Current Stock:'} {product.branchStock?.[branch.id!]?.quantity || 0})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Quantity */}
          <TextField
            fullWidth
            label={isRTL ? 'الكمية المراد نقلها' : 'Quantity to Transfer'}
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputProps={{ min: 1, max: currentStock }}
            helperText={isRTL ? `الحد الأقصى: ${currentStock}` : `Maximum: ${currentStock}`}
            sx={{ mb: 2 }}
          />

          {/* Notes */}
          <TextField
            fullWidth
            label={isRTL ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
            multiline
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mb: 2 }}
          />

          {/* Stock Preview */}
          {quantity && !isNaN(parseInt(quantity)) && toBranchId && (
            <Alert severity="success">
              <Typography variant="body2" gutterBottom>
                {isRTL ? 'بعد النقل:' : 'After Transfer:'}
              </Typography>
              <Typography variant="body2">
                • {currentBranch?.name}: {currentStock} → <strong>{currentStock - parseInt(quantity)}</strong>
              </Typography>
              <Typography variant="body2">
                • {branches.find(b => b.id === toBranchId)?.name}: {getDestinationStock()} → <strong>{getDestinationStock() + parseInt(quantity)}</strong>
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
          disabled={loading || !quantity || !toBranchId}
        >
          {loading ? (isRTL ? 'جاري النقل...' : 'Transferring...') : (isRTL ? 'نقل' : 'Transfer')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}