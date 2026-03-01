import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Tabs,
  Tab,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Stack,
  useTheme,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  LocalOffer,
  Percent,
  AttachMoney,
  Schedule,
  People,
  Category,
  Inventory,
  TrendingUp,
  Visibility,
  ToggleOff,
  ToggleOn,
  ContentCopy,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { discountService } from '../../services/discount.service';
import type { DiscountRule, DiscountFilters, DiscountUsageStats } from '../../types/discount.types';
import { toDate, toDateSafe } from '../../utils/dateUtils';
import { toast } from 'react-toastify';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface DiscountFormData {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  appliesTo: 'order' | 'product' | 'category';
  minimumOrderAmount: number;
  maximumDiscountAmount: number;
  startDate: Date | null;
  endDate: Date | null;
  isActive: boolean;
  usageLimit: 'unlimited' | 'limited';
  maxUses: number;
  maxUsesPerCustomer: number;
  canCombineWithOthers: boolean;
  requiresManagerApproval: boolean;
  validDays: number[];
  validHours: { start: string; end: string } | null;
}

const defaultFormData: DiscountFormData = {
  name: '',
  nameAr: '',
  description: '',
  descriptionAr: '',
  discountType: 'percentage',
  discountValue: 0,
  appliesTo: 'order',
  minimumOrderAmount: 0,
  maximumDiscountAmount: 0,
  startDate: null,
  endDate: null,
  isActive: true,
  usageLimit: 'unlimited',
  maxUses: 0,
  maxUsesPerCustomer: 0,
  canCombineWithOthers: true,
  requiresManagerApproval: false,
  validDays: [],
  validHours: null,
};

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', labelAr: 'الأحد' },
  { value: 1, label: 'Monday', labelAr: 'الإثنين' },
  { value: 2, label: 'Tuesday', labelAr: 'الثلاثاء' },
  { value: 3, label: 'Wednesday', labelAr: 'الأربعاء' },
  { value: 4, label: 'Thursday', labelAr: 'الخميس' },
  { value: 5, label: 'Friday', labelAr: 'الجمعة' },
  { value: 6, label: 'Saturday', labelAr: 'السبت' },
];

export default function DiscountManagementPage() {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();

  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialog, setCreateDialog] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountRule | null>(null);
  const [formData, setFormData] = useState<DiscountFormData>(defaultFormData);
  const [formTab, setFormTab] = useState(0);
  const [filters, setFilters] = useState<DiscountFilters>({});
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDiscount, setSelectedDiscount] = useState<string | null>(null);
  const [statsDialog, setStatsDialog] = useState(false);
  const [discountStats, setDiscountStats] = useState<DiscountUsageStats | null>(null);

  useEffect(() => {
    if (currentUser?.companyId) {
      loadDiscounts();
    }
  }, [currentUser?.companyId, currentBranch?.id, filters]);

  const loadDiscounts = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);
      const result = await discountService.getDiscounts(currentUser.companyId, {
        ...filters,
        branchId: currentBranch?.id,
      });
      setDiscounts(result.discounts);
    } catch (error) {
      console.error('Error loading discounts:', error);
      toast.error(isRTL ? 'خطأ في تحميل الخصومات' : 'Error loading discounts');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormData(defaultFormData);
    setEditingDiscount(null);
    setFormTab(0);
    setCreateDialog(true);
  };

  const openEditDialog = (discount: DiscountRule) => {
    setEditingDiscount(discount);
    setFormData({
      name: discount.name,
      nameAr: discount.nameAr || '',
      description: discount.description || '',
      descriptionAr: discount.descriptionAr || '',
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      appliesTo: discount.appliesTo,
      minimumOrderAmount: discount.minimumOrderAmount || 0,
      maximumDiscountAmount: discount.maximumDiscountAmount || 0,
      startDate: discount.startDate ? toDate(discount.startDate) : null,
      endDate: discount.endDate ? toDate(discount.endDate) : null,
      isActive: discount.isActive,
      usageLimit: discount.usageLimit,
      maxUses: discount.maxUses || 0,
      maxUsesPerCustomer: discount.maxUsesPerCustomer || 0,
      canCombineWithOthers: discount.canCombineWithOthers ?? true,
      requiresManagerApproval: discount.requiresManagerApproval ?? false,
      validDays: discount.validDays || [],
      validHours: discount.validHours || null,
    });
    setFormTab(0);
    setCreateDialog(true);
  };

  const handleSave = async () => {
    if (!currentUser?.companyId || !currentBranch?.id) return;

    if (!formData.name.trim()) {
      toast.error(isRTL ? 'اسم الخصم مطلوب' : 'Discount name is required');
      return;
    }

    if (formData.discountValue <= 0) {
      toast.error(isRTL ? 'قيمة الخصم يجب أن تكون أكبر من صفر' : 'Discount value must be greater than zero');
      return;
    }

    if (formData.discountType === 'percentage' && formData.discountValue > 100) {
      toast.error(isRTL ? 'النسبة المئوية لا يمكن أن تتجاوز 100%' : 'Percentage cannot exceed 100%');
      return;
    }

    try {
      const discountData = {
        companyId: currentUser.companyId,
        branchId: currentBranch.id,
        name: formData.name,
        nameAr: formData.nameAr || undefined,
        description: formData.description || undefined,
        descriptionAr: formData.descriptionAr || undefined,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        appliesTo: formData.appliesTo,
        minimumOrderAmount: formData.minimumOrderAmount || undefined,
        maximumDiscountAmount: formData.maximumDiscountAmount || undefined,
        startDate: formData.startDate ? formData.startDate.toISOString() : undefined,
        endDate: formData.endDate ? formData.endDate.toISOString() : undefined,
        isActive: formData.isActive,
        usageLimit: formData.usageLimit,
        maxUses: formData.usageLimit === 'limited' ? formData.maxUses : undefined,
        maxUsesPerCustomer: formData.maxUsesPerCustomer || undefined,
        canCombineWithOthers: formData.canCombineWithOthers,
        requiresManagerApproval: formData.requiresManagerApproval,
        validDays: formData.validDays.length > 0 ? formData.validDays : undefined,
        validHours: formData.validHours,
        createdBy: currentUser.id,
      };

      if (editingDiscount) {
        await discountService.updateDiscount(editingDiscount.id!, discountData);
        toast.success(isRTL ? 'تم تحديث الخصم بنجاح' : 'Discount updated successfully');
      } else {
        await discountService.createDiscount(discountData);
        toast.success(isRTL ? 'تم إنشاء الخصم بنجاح' : 'Discount created successfully');
      }

      setCreateDialog(false);
      loadDiscounts();
    } catch (error) {
      console.error('Error saving discount:', error);
      toast.error(isRTL ? 'خطأ في حفظ الخصم' : 'Error saving discount');
    }
  };

  const handleDelete = async (discountId: string) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا الخصم؟' : 'Are you sure you want to delete this discount?')) {
      return;
    }

    try {
      await discountService.deleteDiscount(discountId);
      toast.success(isRTL ? 'تم حذف الخصم بنجاح' : 'Discount deleted successfully');
      loadDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
      toast.error(isRTL ? 'خطأ في حذف الخصم' : 'Error deleting discount');
    }
  };

  const toggleDiscountStatus = async (discount: DiscountRule) => {
    try {
      await discountService.updateDiscount(discount.id!, {
        isActive: !discount.isActive
      });
      toast.success(
        discount.isActive 
          ? (isRTL ? 'تم إيقاف الخصم' : 'Discount deactivated')
          : (isRTL ? 'تم تفعيل الخصم' : 'Discount activated')
      );
      loadDiscounts();
    } catch (error) {
      console.error('Error toggling discount status:', error);
      toast.error(isRTL ? 'خطأ في تغيير حالة الخصم' : 'Error changing discount status');
    }
  };

  const viewStats = async (discountId: string) => {
    try {
      const stats = await discountService.getDiscountStats(discountId);
      setDiscountStats(stats);
      setStatsDialog(true);
    } catch (error) {
      console.error('Error loading discount stats:', error);
      toast.error(isRTL ? 'خطأ في تحميل إحصائيات الخصم' : 'Error loading discount statistics');
    }
  };

  const formatDiscountValue = (discount: DiscountRule) => {
    if (discount.discountType === 'percentage') {
      return `${discount.discountValue}%`;
    } else {
      return `${discount.discountValue} ${isRTL ? 'ج.م' : 'EGP'}`;
    }
  };

  const getStatusColor = (discount: DiscountRule) => {
    if (!discount.isActive) return 'error';
    if (discount.endDate && toDateSafe(discount.endDate) < new Date()) return 'warning';
    if (discount.usageLimit === 'limited' && discount.maxUses && discount.currentUses >= discount.maxUses) return 'warning';
    return 'success';
  };

  const getStatusLabel = (discount: DiscountRule) => {
    if (!discount.isActive) return isRTL ? 'غير نشط' : 'Inactive';
    if (discount.endDate && toDateSafe(discount.endDate) < new Date()) return isRTL ? 'منتهي الصلاحية' : 'Expired';
    if (discount.usageLimit === 'limited' && discount.maxUses && discount.currentUses >= discount.maxUses) return isRTL ? 'مستنفد' : 'Used Up';
    return isRTL ? 'نشط' : 'Active';
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {isRTL ? 'إدارة الخصومات' : 'Discount Management'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {isRTL 
                ? 'إنشاء وإدارة خصومات نقطة البيع'
                : 'Create and manage point-of-sale discounts'
              }
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreateDialog}
            size="large"
          >
            {isRTL ? 'إنشاء خصم جديد' : 'Create New Discount'}
          </Button>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>{isRTL ? 'الحالة' : 'Status'}</InputLabel>
                  <Select
                    value={filters.isActive ?? ''}
                    onChange={(e) => setFilters({
                      ...filters,
                      isActive: e.target.value === '' ? undefined : e.target.value === 'true'
                    })}
                    label={isRTL ? 'الحالة' : 'Status'}
                  >
                    <MenuItem value="">{isRTL ? 'الكل' : 'All'}</MenuItem>
                    <MenuItem value="true">{isRTL ? 'نشط' : 'Active'}</MenuItem>
                    <MenuItem value="false">{isRTL ? 'غير نشط' : 'Inactive'}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>{isRTL ? 'النوع' : 'Type'}</InputLabel>
                  <Select
                    value={filters.discountType || ''}
                    onChange={(e) => setFilters({
                      ...filters,
                      discountType: e.target.value || undefined
                    })}
                    label={isRTL ? 'النوع' : 'Type'}
                  >
                    <MenuItem value="">{isRTL ? 'الكل' : 'All'}</MenuItem>
                    <MenuItem value="percentage">{isRTL ? 'نسبة مئوية' : 'Percentage'}</MenuItem>
                    <MenuItem value="fixed">{isRTL ? 'مبلغ ثابت' : 'Fixed Amount'}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label={isRTL ? 'البحث' : 'Search'}
                  value={filters.search || ''}
                  onChange={(e) => setFilters({
                    ...filters,
                    search: e.target.value || undefined
                  })}
                  placeholder={isRTL ? 'البحث في الخصومات...' : 'Search discounts...'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setFilters({})}
                >
                  {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Discounts List */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <LinearProgress sx={{ width: '50%' }} />
          </Box>
        ) : discounts.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <LocalOffer sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {isRTL ? 'لا توجد خصومات' : 'No discounts found'}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {isRTL 
                  ? 'ابدأ بإنشاء خصم لعملائك'
                  : 'Start by creating a discount for your customers'
                }
              </Typography>
              <Button variant="contained" startIcon={<Add />} onClick={openCreateDialog}>
                {isRTL ? 'إنشاء أول خصم' : 'Create First Discount'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {discounts.map((discount) => (
              <Grid item xs={12} sm={6} md={4} key={discount.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" gutterBottom>
                          {discount.name}
                        </Typography>
                        <Chip
                          label={formatDiscountValue(discount)}
                          color="primary"
                          size="small"
                          sx={{ mb: 1 }}
                        />
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedDiscount(discount.id!);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>

                    <Stack spacing={1}>
                      <Chip
                        label={getStatusLabel(discount)}
                        color={getStatusColor(discount)}
                        size="small"
                        variant="outlined"
                      />
                      
                      <Typography variant="body2" color="text.secondary">
                        {isRTL ? 'يطبق على:' : 'Applies to:'} {
                          discount.appliesTo === 'order' 
                            ? (isRTL ? 'الطلب بالكامل' : 'Entire Order')
                            : discount.appliesTo === 'product'
                            ? (isRTL ? 'منتجات محددة' : 'Specific Products')
                            : (isRTL ? 'فئات محددة' : 'Specific Categories')
                        }
                      </Typography>

                      {discount.minimumOrderAmount && (
                        <Typography variant="body2" color="text.secondary">
                          {isRTL ? 'حد أدنى:' : 'Min order:'} {discount.minimumOrderAmount} {isRTL ? 'ج.م' : 'EGP'}
                        </Typography>
                      )}

                      {discount.usageLimit === 'limited' && (
                        <Typography variant="body2" color="text.secondary">
                          {isRTL ? 'الاستخدام:' : 'Usage:'} {discount.currentUses}/{discount.maxUses}
                        </Typography>
                      )}

                      {discount.endDate && (
                        <Typography variant="body2" color="text.secondary">
                          {isRTL ? 'ينتهي:' : 'Expires:'} {toDateSafe(discount.endDate).toLocaleDateString()}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>

                  <CardActions>
                    <Button size="small" onClick={() => viewStats(discount.id!)}>
                      <TrendingUp sx={{ mr: 0.5 }} />
                      {isRTL ? 'الإحصائيات' : 'Stats'}
                    </Button>
                    <Button size="small" onClick={() => toggleDiscountStatus(discount)}>
                      {discount.isActive ? <ToggleOff sx={{ mr: 0.5 }} /> : <ToggleOn sx={{ mr: 0.5 }} />}
                      {discount.isActive 
                        ? (isRTL ? 'إيقاف' : 'Deactivate')
                        : (isRTL ? 'تفعيل' : 'Activate')
                      }
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Context Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
        >
          <MenuItem onClick={() => {
            const discount = discounts.find(d => d.id === selectedDiscount);
            if (discount) openEditDialog(discount);
            setAnchorEl(null);
          }}>
            <Edit sx={{ mr: 1 }} />
            {isRTL ? 'تعديل' : 'Edit'}
          </MenuItem>
          <MenuItem onClick={() => {
            const discount = discounts.find(d => d.id === selectedDiscount);
            if (discount) viewStats(discount.id!);
            setAnchorEl(null);
          }}>
            <Visibility sx={{ mr: 1 }} />
            {isRTL ? 'عرض الإحصائيات' : 'View Stats'}
          </MenuItem>
          <MenuItem onClick={() => {
            if (selectedDiscount) handleDelete(selectedDiscount);
            setAnchorEl(null);
          }}>
            <Delete sx={{ mr: 1 }} />
            {isRTL ? 'حذف' : 'Delete'}
          </MenuItem>
        </Menu>

        {/* Create/Edit Dialog */}
        <Dialog
          open={createDialog}
          onClose={() => setCreateDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { height: '90vh' } }}
        >
          <DialogTitle>
            {editingDiscount 
              ? (isRTL ? 'تعديل الخصم' : 'Edit Discount')
              : (isRTL ? 'إنشاء خصم جديد' : 'Create New Discount')
            }
          </DialogTitle>
          <DialogContent>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={formTab} onChange={(_, newValue) => setFormTab(newValue)}>
                <Tab label={isRTL ? 'المعلومات الأساسية' : 'Basic Info'} />
                <Tab label={isRTL ? 'الشروط' : 'Conditions'} />
                <Tab label={isRTL ? 'القيود الزمنية' : 'Time Restrictions'} />
                <Tab label={isRTL ? 'الإعدادات المتقدمة' : 'Advanced Settings'} />
              </Tabs>
            </Box>

            {/* Basic Info Tab */}
            <TabPanel value={formTab} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={isRTL ? 'اسم الخصم' : 'Discount Name'}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={isRTL ? 'الاسم بالعربية' : 'Arabic Name'}
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label={isRTL ? 'الوصف' : 'Description'}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>{isRTL ? 'نوع الخصم' : 'Discount Type'}</InputLabel>
                    <Select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                      label={isRTL ? 'نوع الخصم' : 'Discount Type'}
                    >
                      <MenuItem value="percentage">
                        <Percent sx={{ mr: 1 }} />
                        {isRTL ? 'نسبة مئوية' : 'Percentage'}
                      </MenuItem>
                      <MenuItem value="fixed">
                        <AttachMoney sx={{ mr: 1 }} />
                        {isRTL ? 'مبلغ ثابت' : 'Fixed Amount'}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={isRTL ? 'قيمة الخصم' : 'Discount Value'}
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                    InputProps={{
                      endAdornment: formData.discountType === 'percentage' ? '%' : 'EGP'
                    }}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>{isRTL ? 'يطبق على' : 'Applies To'}</InputLabel>
                    <Select
                      value={formData.appliesTo}
                      onChange={(e) => setFormData({ ...formData, appliesTo: e.target.value as 'order' | 'product' | 'category' })}
                      label={isRTL ? 'يطبق على' : 'Applies To'}
                    >
                      <MenuItem value="order">
                        <Inventory sx={{ mr: 1 }} />
                        {isRTL ? 'الطلب بالكامل' : 'Entire Order'}
                      </MenuItem>
                      <MenuItem value="product">
                        <Category sx={{ mr: 1 }} />
                        {isRTL ? 'منتجات محددة' : 'Specific Products'}
                      </MenuItem>
                      <MenuItem value="category">
                        <Category sx={{ mr: 1 }} />
                        {isRTL ? 'فئات محددة' : 'Specific Categories'}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                    }
                    label={isRTL ? 'نشط' : 'Active'}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            {/* Conditions Tab */}
            <TabPanel value={formTab} index={1}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={isRTL ? 'الحد الأدنى للطلب' : 'Minimum Order Amount'}
                    type="number"
                    value={formData.minimumOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minimumOrderAmount: parseFloat(e.target.value) || 0 })}
                    InputProps={{ endAdornment: 'EGP' }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={isRTL ? 'الحد الأقصى للخصم' : 'Maximum Discount Amount'}
                    type="number"
                    value={formData.maximumDiscountAmount}
                    onChange={(e) => setFormData({ ...formData, maximumDiscountAmount: parseFloat(e.target.value) || 0 })}
                    InputProps={{ endAdornment: 'EGP' }}
                    helperText={formData.discountType === 'percentage' ? (isRTL ? 'للنسبة المئوية فقط' : 'For percentage discounts only') : ''}
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>{isRTL ? 'حد الاستخدام' : 'Usage Limit'}</InputLabel>
                    <Select
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value as 'unlimited' | 'limited' })}
                      label={isRTL ? 'حد الاستخدام' : 'Usage Limit'}
                    >
                      <MenuItem value="unlimited">{isRTL ? 'بلا حدود' : 'Unlimited'}</MenuItem>
                      <MenuItem value="limited">{isRTL ? 'محدود' : 'Limited'}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {formData.usageLimit === 'limited' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={isRTL ? 'العدد الأقصى للاستخدام' : 'Maximum Uses'}
                        type="number"
                        value={formData.maxUses}
                        onChange={(e) => setFormData({ ...formData, maxUses: parseInt(e.target.value) || 0 })}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={isRTL ? 'الحد الأقصى لكل عميل' : 'Max Uses Per Customer'}
                        type="number"
                        value={formData.maxUsesPerCustomer}
                        onChange={(e) => setFormData({ ...formData, maxUsesPerCustomer: parseInt(e.target.value) || 0 })}
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </TabPanel>

            {/* Time Restrictions Tab */}
            <TabPanel value={formTab} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label={isRTL ? 'تاريخ البداية' : 'Start Date'}
                    value={formData.startDate}
                    onChange={(newValue) => setFormData({ ...formData, startDate: newValue })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label={isRTL ? 'تاريخ الانتهاء' : 'End Date'}
                    value={formData.endDate}
                    onChange={(newValue) => setFormData({ ...formData, endDate: newValue })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    {isRTL ? 'الأيام المسموحة' : 'Valid Days'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {DAYS_OF_WEEK.map((day) => (
                      <Chip
                        key={day.value}
                        label={isRTL ? day.labelAr : day.label}
                        clickable
                        color={formData.validDays.includes(day.value) ? 'primary' : 'default'}
                        onClick={() => {
                          const newValidDays = formData.validDays.includes(day.value)
                            ? formData.validDays.filter(d => d !== day.value)
                            : [...formData.validDays, day.value];
                          setFormData({ ...formData, validDays: newValidDays });
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={isRTL ? 'وقت البداية' : 'Start Time'}
                    type="time"
                    value={formData.validHours?.start || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      validHours: {
                        start: e.target.value,
                        end: formData.validHours?.end || '23:59'
                      }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label={isRTL ? 'وقت الانتهاء' : 'End Time'}
                    type="time"
                    value={formData.validHours?.end || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      validHours: {
                        start: formData.validHours?.start || '00:00',
                        end: e.target.value
                      }
                    })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            {/* Advanced Settings Tab */}
            <TabPanel value={formTab} index={3}>
              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.canCombineWithOthers}
                      onChange={(e) => setFormData({ ...formData, canCombineWithOthers: e.target.checked })}
                    />
                  }
                  label={isRTL ? 'يمكن دمجه مع خصومات أخرى' : 'Can combine with other discounts'}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requiresManagerApproval}
                      onChange={(e) => setFormData({ ...formData, requiresManagerApproval: e.target.checked })}
                    />
                  }
                  label={isRTL ? 'يتطلب موافقة المدير' : 'Requires manager approval'}
                />
                {formData.requiresManagerApproval && (
                  <Alert severity="info">
                    {isRTL 
                      ? 'هذا الخصم سيتطلب موافقة المدير قبل التطبيق في نقطة البيع'
                      : 'This discount will require manager approval before applying in POS'
                    }
                  </Alert>
                )}
              </Stack>
            </TabPanel>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateDialog(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button variant="contained" onClick={handleSave}>
              {editingDiscount 
                ? (isRTL ? 'تحديث' : 'Update')
                : (isRTL ? 'إنشاء' : 'Create')
              }
            </Button>
          </DialogActions>
        </Dialog>

        {/* Statistics Dialog */}
        <Dialog
          open={statsDialog}
          onClose={() => setStatsDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {isRTL ? 'إحصائيات الخصم' : 'Discount Statistics'}
          </DialogTitle>
          <DialogContent>
            {discountStats ? (
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {discountStats.discountName}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary">
                            {discountStats.totalUses}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {isRTL ? 'إجمالي الاستخدام' : 'Total Uses'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={6}>
                      <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main">
                            {discountStats.totalSavings.toFixed(0)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {isRTL ? 'إجمالي التوفير (ج.م)' : 'Total Savings (EGP)'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
                <Divider />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'متوسط قيمة الطلب:' : 'Average Order Value:'} {discountStats.averageOrderValue.toFixed(2)} EGP
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'معدل التحويل:' : 'Conversion Rate:'} {discountStats.conversionRate.toFixed(1)}%
                  </Typography>
                </Box>
              </Stack>
            ) : (
              <Typography>{isRTL ? 'جاري تحميل الإحصائيات...' : 'Loading statistics...'}</Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setStatsDialog(false)}>
              {isRTL ? 'إغلاق' : 'Close'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </LocalizationProvider>
  );
}