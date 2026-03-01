import React, { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Tabs,
  Tab,
  InputAdornment,
  Divider,
  Stack,
  useTheme,
} from '@mui/material';
import {
  LocalOffer,
  Percent,
  AttachMoney,
  Close,
  Add,
  Delete,
  Verified,
  Warning,
  Info,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { discountService } from '../../services/discount.service';
import type { DiscountRule, DiscountValidationResult, DiscountCalculationResult } from '../../types/discount.types';
import type { SaleItem } from '../../types/sale.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

interface DiscountSelectorProps {
  open: boolean;
  onClose: () => void;
  items: SaleItem[];
  subtotal: number;
  customerId?: string;
  onApplyDiscount: (result: DiscountCalculationResult) => void;
  currentDiscounts?: string[]; // Currently applied discount IDs
}

export default function DiscountSelector({
  open,
  onClose,
  items,
  subtotal,
  customerId,
  onApplyDiscount,
  currentDiscounts = [],
}: DiscountSelectorProps) {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();

  const [tabValue, setTabValue] = useState(0);
  const [availableDiscounts, setAvailableDiscounts] = useState<DiscountRule[]>([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState<string[]>(currentDiscounts);
  const [manualDiscount, setManualDiscount] = useState({
    type: 'percentage' as 'percentage' | 'fixed',
    value: 0,
    reason: '',
  });
  const [validationResults, setValidationResults] = useState<Record<string, DiscountValidationResult>>({});
  const [previewResult, setPreviewResult] = useState<DiscountCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && currentUser?.companyId && currentBranch?.id) {
      loadAvailableDiscounts();
    }
  }, [open, currentUser?.companyId, currentBranch?.id, customerId]);

  useEffect(() => {
    if (selectedDiscounts.length > 0 || manualDiscount.value > 0) {
      calculatePreview();
    } else {
      setPreviewResult(null);
    }
  }, [selectedDiscounts, manualDiscount, items, subtotal]);

  const loadAvailableDiscounts = async () => {
    if (!currentUser?.companyId || !currentBranch?.id) return;

    try {
      setLoading(true);
      const discounts = await discountService.getActiveDiscountsForPOS(
        currentUser.companyId,
        currentBranch.id,
        customerId
      );
      setAvailableDiscounts(discounts);
      
      // Validate all discounts
      const validations: Record<string, DiscountValidationResult> = {};
      for (const discount of discounts) {
        const validation = await discountService.validateDiscount(
          discount.id!,
          customerId,
          items,
          subtotal,
          currentBranch.id
        );
        validations[discount.id!] = validation;
      }
      setValidationResults(validations);
    } catch (error) {
      console.error('Error loading discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePreview = async () => {
    if (!availableDiscounts.length && manualDiscount.value === 0) return;
    if (!currentUser?.companyId) return;

    try {
      let result: DiscountCalculationResult;

      if (selectedDiscounts.length > 0) {
        // Calculate with selected rule-based discounts
        result = await discountService.applyMultipleDiscounts(
          selectedDiscounts,
          items,
          subtotal,
          customerId,
          currentBranch?.id
        );
      } else {
        // Calculate manual discount
        const manualDiscountRule: DiscountRule = {
          id: 'manual',
          companyId: currentUser.companyId,
          name: isRTL ? 'خصم يدوي' : 'Manual Discount',
          discountType: manualDiscount.type,
          discountValue: manualDiscount.value,
          appliesTo: 'order',
          isActive: true,
          usageLimit: 'unlimited',
          currentUses: 0,
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
          createdBy: currentUser.id,
        };

        result = discountService.calculateDiscount(manualDiscountRule, items, subtotal);
      }

      setPreviewResult(result);
    } catch (error) {
      console.error('Error calculating discount preview:', error);
    }
  };

  const toggleDiscount = (discountId: string) => {
    if (selectedDiscounts.includes(discountId)) {
      setSelectedDiscounts(selectedDiscounts.filter(id => id !== discountId));
    } else {
      // Check if discount can be combined with others
      const discount = availableDiscounts.find(d => d.id === discountId);
      if (discount && !discount.canCombineWithOthers && selectedDiscounts.length > 0) {
        setSelectedDiscounts([discountId]); // Replace all discounts
      } else if (selectedDiscounts.some(id => {
        const existing = availableDiscounts.find(d => d.id === id);
        return existing && !existing.canCombineWithOthers;
      })) {
        setSelectedDiscounts([discountId]); // Replace non-combinable discount
      } else {
        setSelectedDiscounts([...selectedDiscounts, discountId]);
      }
    }
  };

  const handleApply = () => {
    if (previewResult) {
      onApplyDiscount(previewResult);
      onClose();
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setSelectedDiscounts([]);
    setManualDiscount({ type: 'percentage', value: 0, reason: '' });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} ${isRTL ? 'ج.م' : 'EGP'}`;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalOffer color="primary" />
            <Typography variant="h6">
              {isRTL ? 'تطبيق خصم' : 'Apply Discount'}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              label={isRTL ? 'الخصومات المتاحة' : 'Available Discounts'} 
              icon={<LocalOffer />}
              iconPosition="start"
            />
            <Tab 
              label={isRTL ? 'خصم يدوي' : 'Manual Discount'} 
              icon={<Percent />}
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Order Summary */}
        <Card sx={{ mb: 2, bgcolor: 'background.default' }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {isRTL ? 'ملخص الطلب' : 'Order Summary'}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                {isRTL ? 'المجموع الفرعي:' : 'Subtotal:'}
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatCurrency(subtotal)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                {isRTL ? 'عدد العناصر:' : 'Items:'}
              </Typography>
              <Typography variant="body2">
                {items.reduce((sum, item) => sum + item.quantity, 0)}
              </Typography>
            </Box>
            {customerId && (
              <Chip 
                label={isRTL ? 'عميل مسجل' : 'Registered Customer'} 
                color="primary" 
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </CardContent>
        </Card>

        {/* Available Discounts Tab */}
        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Typography>{isRTL ? 'جاري تحميل الخصومات...' : 'Loading discounts...'}</Typography>
          ) : availableDiscounts.length === 0 ? (
            <Alert severity="info">
              {isRTL ? 'لا توجد خصومات متاحة حالياً' : 'No discounts available at this time'}
            </Alert>
          ) : (
            <List>
              {availableDiscounts.map((discount) => {
                const validation = validationResults[discount.id!];
                const isSelected = selectedDiscounts.includes(discount.id!);
                const isValid = validation?.isValid;

                return (
                  <ListItem
                    key={discount.id}
                    sx={{
                      border: 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: isSelected ? 'primary.50' : 'background.paper',
                      cursor: isValid ? 'pointer' : 'not-allowed',
                      opacity: isValid ? 1 : 0.6,
                    }}
                    onClick={() => isValid && toggleDiscount(discount.id!)}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {discount.name}
                          </Typography>
                          <Chip
                            label={
                              discount.discountType === 'percentage'
                                ? `${discount.discountValue}%`
                                : formatCurrency(discount.discountValue)
                            }
                            color={isSelected ? 'primary' : 'default'}
                            size="small"
                          />
                          {isValid ? (
                            <Verified color="success" fontSize="small" />
                          ) : (
                            <Warning color="error" fontSize="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          {discount.description && (
                            <Typography variant="body2" color="text.secondary">
                              {discount.description}
                            </Typography>
                          )}
                          {!isValid && validation?.errors && (
                            <Typography variant="caption" color="error">
                              {validation.errors[0]}
                            </Typography>
                          )}
                          {validation?.warnings && (
                            <Typography variant="caption" color="warning.main">
                              {validation.warnings[0]}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    {isSelected && (
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => toggleDiscount(discount.id!)}>
                          <Delete />
                        </IconButton>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                );
              })}
            </List>
          )}
        </TabPanel>

        {/* Manual Discount Tab */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>{isRTL ? 'نوع الخصم' : 'Discount Type'}</InputLabel>
              <Select
                value={manualDiscount.type}
                onChange={(e) => setManualDiscount({
                  ...manualDiscount,
                  type: e.target.value as 'percentage' | 'fixed'
                })}
                label={isRTL ? 'نوع الخصم' : 'Discount Type'}
              >
                <MenuItem value="percentage">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Percent />
                    {isRTL ? 'نسبة مئوية' : 'Percentage'}
                  </Box>
                </MenuItem>
                <MenuItem value="fixed">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AttachMoney />
                    {isRTL ? 'مبلغ ثابت' : 'Fixed Amount'}
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <TextField
              label={isRTL ? 'قيمة الخصم' : 'Discount Value'}
              type="number"
              value={manualDiscount.value}
              onChange={(e) => setManualDiscount({
                ...manualDiscount,
                value: parseFloat(e.target.value) || 0
              })}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {manualDiscount.type === 'percentage' ? '%' : 'EGP'}
                  </InputAdornment>
                ),
              }}
              fullWidth
            />

            <TextField
              label={isRTL ? 'سبب الخصم (اختياري)' : 'Discount Reason (Optional)'}
              value={manualDiscount.reason}
              onChange={(e) => setManualDiscount({
                ...manualDiscount,
                reason: e.target.value
              })}
              multiline
              rows={2}
              fullWidth
            />

            {manualDiscount.type === 'percentage' && manualDiscount.value > 50 && (
              <Alert severity="warning">
                {isRTL 
                  ? 'خصم كبير - قد يتطلب موافقة المدير' 
                  : 'Large discount - may require manager approval'
                }
              </Alert>
            )}
          </Stack>
        </TabPanel>

        {/* Preview */}
        {previewResult && (
          <>
            <Divider sx={{ my: 2 }} />
            <Card sx={{ bgcolor: 'success.50', border: 1, borderColor: 'success.200' }}>
              <CardContent>
                <Typography variant="subtitle2" color="success.dark" gutterBottom>
                  <Info sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {isRTL ? 'معاينة الخصم' : 'Discount Preview'}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">
                    {isRTL ? 'المجموع الأصلي:' : 'Original Amount:'}
                  </Typography>
                  <Typography variant="body2">
                    {formatCurrency(previewResult.originalAmount)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="success.dark">
                    {isRTL ? 'مقدار الخصم:' : 'Discount Amount:'}
                  </Typography>
                  <Typography variant="body2" color="success.dark" fontWeight="medium">
                    -{formatCurrency(previewResult.discountAmount)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1" fontWeight="bold">
                    {isRTL ? 'المجموع النهائي:' : 'Final Amount:'}
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="success.dark">
                    {formatCurrency(previewResult.finalAmount)}
                  </Typography>
                </Box>
                <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: 'success.200' }}>
                  <Typography variant="caption" color="success.dark">
                    {isRTL ? 'توفير:' : 'You save:'} {formatCurrency(previewResult.savings)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {isRTL ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          disabled={!previewResult || previewResult.discountAmount === 0}
          startIcon={<LocalOffer />}
        >
          {isRTL ? 'تطبيق الخصم' : 'Apply Discount'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}