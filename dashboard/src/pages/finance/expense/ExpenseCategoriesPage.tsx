import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Switch,
  FormControlLabel,
  useTheme,
  alpha,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Business,
  AccountBalance,
  LocalShipping,
  Campaign,
  Engineering,
  BusinessCenter,
  Security,
  MoreHoriz,
  DragIndicator,
  Warning,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { expenseService } from '../../../services/expense.service';
import type { ExpenseCategory } from '../../../types/expense.types';

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  Business,
  AccountBalance,
  LocalShipping,
  Campaign,
  Engineering,
  BusinessCenter,
  Security,
  MoreHoriz,
  Category: CategoryIcon,
};

interface CategoryFormData {
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  parentCategoryId?: string;
  requiresApproval: boolean;
  approvalThreshold?: number;
  requiresReceipt: boolean;
  allowRecurring: boolean;
  monthlyBudget?: number;
  yearlyBudget?: number;
  budgetAlertThreshold?: number;
}

const defaultColors = [
  '#1976d2', '#388e3c', '#7b1fa2', '#d32f2f',
  '#f57c00', '#0288d1', '#689f38', '#616161',
];

const ExpenseCategoriesPage: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    nameAr: '',
    icon: 'Category',
    color: defaultColors[0],
    requiresApproval: false,
    requiresReceipt: true,
    allowRecurring: false,
  });

  useEffect(() => {
    if (currentUser?.companyId) {
      loadCategories();
    }
  }, [currentUser]);

  const loadCategories = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);
      const categoriesData = await expenseService.getCategories(currentUser.companyId, true);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        nameAr: category.nameAr,
        icon: category.icon,
        color: category.color,
        parentCategoryId: category.parentCategoryId,
        requiresApproval: category.requiresApproval,
        approvalThreshold: category.approvalThreshold,
        requiresReceipt: category.requiresReceipt,
        allowRecurring: category.allowRecurring,
        monthlyBudget: category.monthlyBudget,
        yearlyBudget: category.yearlyBudget,
        budgetAlertThreshold: category.budgetAlertThreshold,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        nameAr: '',
        icon: 'Category',
        color: defaultColors[0],
        requiresApproval: false,
        requiresReceipt: true,
        allowRecurring: false,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSave = async () => {
    if (!currentUser?.companyId) return;

    try {
      const categoryData: Omit<ExpenseCategory, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId: currentUser.companyId,
        ...formData,
        isActive: true,
        isSystem: false,
        order: editingCategory?.order || categories.length + 1,
      };

      if (editingCategory) {
        await expenseService.updateCategory(
          currentUser.companyId,
          editingCategory.id!,
          categoryData
        );
      } else {
        await expenseService.createCategory(categoryData);
      }

      handleCloseDialog();
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleToggleActive = async (category: ExpenseCategory) => {
    if (!currentUser?.companyId || category.isSystem) return;

    try {
      await expenseService.updateCategory(
        currentUser.companyId,
        category.id!,
        { isActive: !category.isActive }
      );
      loadCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '';
    return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            {isRTL ? 'فئات المصروفات' : 'Expense Categories'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isRTL ? 'إدارة وتنظيم فئات المصروفات' : 'Manage and organize expense categories'}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          {isRTL ? 'فئة جديدة' : 'New Category'}
        </Button>
      </Box>

      {/* Categories Grid */}
      <Grid container spacing={3}>
        {categories.map((category) => {
          const Icon = iconMap[category.icon] || CategoryIcon;
          
          return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={category.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  opacity: category.isActive ? 1 : 0.6,
                  position: 'relative',
                }}
              >
                {category.isSystem && (
                  <Chip
                    label={isRTL ? 'نظام' : 'System'}
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      fontSize: '0.7rem',
                    }}
                  />
                )}
                
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: alpha(category.color, 0.1),
                        color: category.color,
                        mr: 2,
                      }}
                    >
                      <Icon />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" noWrap>
                        {isRTL ? category.nameAr : category.name}
                      </Typography>
                      {category.parentCategoryId && (
                        <Typography variant="caption" color="text.secondary">
                          {isRTL ? 'فئة فرعية' : 'Subcategory'}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Stack spacing={1}>
                    {category.monthlyBudget && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          {isRTL ? 'الميزانية الشهرية' : 'Monthly Budget'}
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {formatCurrency(category.monthlyBudget)}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {category.requiresApproval && (
                        <Chip
                          label={isRTL ? 'موافقة' : 'Approval'}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                      {category.requiresReceipt && (
                        <Chip
                          label={isRTL ? 'فاتورة' : 'Receipt'}
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      )}
                      {category.allowRecurring && (
                        <Chip
                          label={isRTL ? 'متكرر' : 'Recurring'}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Stack>
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between' }}>
                  <Switch
                    checked={category.isActive}
                    onChange={() => handleToggleActive(category)}
                    disabled={category.isSystem}
                    size="small"
                  />
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(category)}
                      disabled={category.isSystem}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Category Form Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory
            ? (isRTL ? 'تعديل الفئة' : 'Edit Category')
            : (isRTL ? 'فئة جديدة' : 'New Category')
          }
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}
                  value={formData.nameAr}
                  onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                  required
                  dir="rtl"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{isRTL ? 'الأيقونة' : 'Icon'}</InputLabel>
                  <Select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    label={isRTL ? 'الأيقونة' : 'Icon'}
                  >
                    {Object.keys(iconMap).map((iconName) => {
                      const Icon = iconMap[iconName];
                      return (
                        <MenuItem key={iconName} value={iconName}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Icon fontSize="small" />
                            <Typography>{iconName}</Typography>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{isRTL ? 'اللون' : 'Color'}</InputLabel>
                  <Select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    label={isRTL ? 'اللون' : 'Color'}
                  >
                    {defaultColors.map((color) => (
                      <MenuItem key={color} value={color}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: 1,
                              bgcolor: color,
                            }}
                          />
                          <Typography>{color}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  {isRTL ? 'الإعدادات' : 'Settings'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requiresApproval}
                      onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                    />
                  }
                  label={isRTL ? 'يتطلب موافقة' : 'Requires Approval'}
                />
              </Grid>

              {formData.requiresApproval && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label={isRTL ? 'حد الموافقة' : 'Approval Threshold'}
                    value={formData.approvalThreshold || ''}
                    onChange={(e) => setFormData({ ...formData, approvalThreshold: Number(e.target.value) })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">EGP</InputAdornment>,
                    }}
                  />
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requiresReceipt}
                      onChange={(e) => setFormData({ ...formData, requiresReceipt: e.target.checked })}
                    />
                  }
                  label={isRTL ? 'يتطلب فاتورة' : 'Requires Receipt'}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.allowRecurring}
                      onChange={(e) => setFormData({ ...formData, allowRecurring: e.target.checked })}
                    />
                  }
                  label={isRTL ? 'يسمح بالتكرار' : 'Allow Recurring'}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  {isRTL ? 'الميزانية' : 'Budget'}
                </Typography>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={isRTL ? 'الميزانية الشهرية' : 'Monthly Budget'}
                  value={formData.monthlyBudget || ''}
                  onChange={(e) => setFormData({ ...formData, monthlyBudget: Number(e.target.value) })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">EGP</InputAdornment>,
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label={isRTL ? 'حد التنبيه (%)' : 'Alert Threshold (%)'}
                  value={formData.budgetAlertThreshold || ''}
                  onChange={(e) => setFormData({ ...formData, budgetAlertThreshold: Number(e.target.value) })}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.name || !formData.nameAr}
          >
            {isRTL ? 'حفظ' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExpenseCategoriesPage;