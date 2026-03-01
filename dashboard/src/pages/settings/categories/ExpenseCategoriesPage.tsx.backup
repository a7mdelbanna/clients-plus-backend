import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment,
  useTheme,
  Skeleton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Alert,
} from '@mui/material';
import PageContainer from '../../../components/PageContainer';
import {
  Add,
  Search,
  Edit,
  Delete,
  Category,
  AttachMoney,
  CheckCircle,
  Cancel,
  Receipt,
  Repeat,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { expenseService } from '../../../services/expense.service';
import type { ExpenseCategory } from '../../../types/expense.types';
import type { SelectChangeEvent } from '@mui/material/Select';

// Category icons mapping
const categoryIcons: { [key: string]: any } = {
  Business: () => <Category />,
  AccountBalance: () => <AttachMoney />,
  LocalShipping: () => <Category />,
  Campaign: () => <Category />,
  Engineering: () => <Category />,
  BusinessCenter: () => <Category />,
  Security: () => <Category />,
  MoreHoriz: () => <Category />,
};

export default function ExpenseCategoriesPage() {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const isRTL = theme.direction === 'rtl';

  // State
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    parentId: '',
    budgetLimit: '',
    requiresApproval: false,
    approvalThreshold: '',
    requiresReceipt: true,
    allowRecurring: false,
    description: '',
    descriptionAr: '',
  });

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      if (!currentUser?.companyId) return;

      try {
        setLoading(true);
        const data = await expenseService.getCategories(currentUser.companyId);
        setCategories(data);
      } catch (error) {
        console.error('Error loading categories:', error);
        setError(isRTL ? 'حدث خطأ في تحميل الفئات' : 'Error loading categories');
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [currentUser, isRTL]);

  // Filter categories based on search
  const filteredCategories = categories.filter(category =>
    (category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     category.nameAr.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-EG' : 'en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handle dialog open
  const handleOpenDialog = (category?: ExpenseCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        nameAr: category.nameAr,
        parentId: category.parentId || '',
        budgetLimit: category.budgetLimit?.toString() || '',
        requiresApproval: category.requiresApproval || false,
        approvalThreshold: category.approvalThreshold?.toString() || '',
        requiresReceipt: category.requiresReceipt || true,
        allowRecurring: category.allowRecurring || false,
        description: category.description || '',
        descriptionAr: category.descriptionAr || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        nameAr: '',
        parentId: '',
        budgetLimit: '',
        requiresApproval: false,
        approvalThreshold: '',
        requiresReceipt: true,
        allowRecurring: false,
        description: '',
        descriptionAr: '',
      });
    }
    setOpenDialog(true);
  };

  // Handle save
  const handleSave = async () => {
    if (!currentUser?.companyId) return;

    try {
      const categoryData = {
        name: formData.name,
        nameAr: formData.nameAr,
        parentId: formData.parentId || undefined,
        budgetLimit: formData.budgetLimit ? parseFloat(formData.budgetLimit) : undefined,
        monthlyBudget: formData.budgetLimit ? parseFloat(formData.budgetLimit) : undefined,
        requiresApproval: formData.requiresApproval,
        approvalThreshold: formData.approvalThreshold ? parseFloat(formData.approvalThreshold) : undefined,
        requiresReceipt: formData.requiresReceipt,
        allowRecurring: formData.allowRecurring,
        description: formData.description || undefined,
        descriptionAr: formData.descriptionAr || undefined,
        icon: 'Category',
        color: '#' + Math.floor(Math.random()*16777215).toString(16), // Random color
        isActive: true,
      };

      if (editingCategory) {
        await expenseService.updateCategory(currentUser.companyId, editingCategory.id!, categoryData);
        setSuccess(isRTL ? 'تم تحديث الفئة بنجاح' : 'Category updated successfully');
      } else {
        await expenseService.createCategory(currentUser.companyId, categoryData);
        setSuccess(isRTL ? 'تم إنشاء الفئة بنجاح' : 'Category created successfully');
      }

      // Reload categories
      const data = await expenseService.getCategories(currentUser.companyId);
      setCategories(data);
      setOpenDialog(false);
    } catch (error) {
      console.error('Error saving category:', error);
      setError(isRTL ? 'حدث خطأ في حفظ الفئة' : 'Error saving category');
    }
  };

  // Handle delete
  const handleDelete = async (categoryId: string) => {
    if (!currentUser?.companyId || !window.confirm(isRTL ? 'هل أنت متأكد من حذف هذه الفئة؟' : 'Are you sure you want to delete this category?')) return;

    try {
      await expenseService.deleteCategory(currentUser.companyId, categoryId);
      setSuccess(isRTL ? 'تم حذف الفئة بنجاح' : 'Category deleted successfully');
      
      // Reload categories
      const data = await expenseService.getCategories(currentUser.companyId);
      setCategories(data);
    } catch (error) {
      console.error('Error deleting category:', error);
      setError(isRTL ? 'حدث خطأ في حذف الفئة' : 'Error deleting category');
    }
  };

  return (
    <PageContainer maxWidth="xl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isRTL ? 'فئات المصروفات' : 'Expense Categories'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isRTL ? 'إدارة فئات المصروفات والميزانيات' : 'Manage expense categories and budgets'}
        </Typography>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Search and Add */}
      <Paper sx={{ p: 2, mb: 3, width: '100%', boxSizing: 'border-box' }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center',
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
        }}>
          <TextField
            placeholder={isRTL ? 'البحث في الفئات...' : 'Search categories...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            {isRTL ? 'إضافة فئة' : 'Add Category'}
          </Button>
        </Box>
      </Paper>

      {/* Categories Table */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          width: '100%',
          overflowX: 'auto',
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell>{isRTL ? 'الفئة' : 'Category'}</TableCell>
              <TableCell>{isRTL ? 'الميزانية الشهرية' : 'Monthly Budget'}</TableCell>
              <TableCell>{isRTL ? 'الخصائص' : 'Properties'}</TableCell>
              <TableCell>{isRTL ? 'الحالة' : 'Status'}</TableCell>
              <TableCell align="right">{isRTL ? 'الإجراءات' : 'Actions'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                  <TableCell><Skeleton /></TableCell>
                </TableRow>
              ))
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Box sx={{ py: 4 }}>
                    <Category sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'لا توجد فئات' : 'No categories found'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => {
                const Icon = categoryIcons[category.icon] || (() => <Category />);
                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ bgcolor: category.color, width: 36, height: 36 }}>
                          <Icon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {isRTL ? category.nameAr : category.name}
                          </Typography>
                          {category.description && (
                            <Typography variant="caption" color="text.secondary">
                              {isRTL ? category.descriptionAr || category.description : category.description}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {category.budgetLimit ? formatCurrency(category.budgetLimit) : '-'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {category.requiresApproval && (
                          <Chip
                            size="small"
                            icon={<CheckCircle sx={{ fontSize: 16 }} />}
                            label={isRTL ? 'يتطلب موافقة' : 'Requires Approval'}
                            color="warning"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
                        {category.requiresReceipt && (
                          <Chip
                            size="small"
                            icon={<Receipt sx={{ fontSize: 16 }} />}
                            label={isRTL ? 'يتطلب إيصال' : 'Requires Receipt'}
                            color="info"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
                        {category.allowRecurring && (
                          <Chip
                            size="small"
                            icon={<Repeat sx={{ fontSize: 16 }} />}
                            label={isRTL ? 'يسمح بالتكرار' : 'Allow Recurring'}
                            color="secondary"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={category.isActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                        color={category.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(category)}
                        disabled={category.isSystem}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(category.id!)}
                        disabled={category.isSystem}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Category Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory
            ? (isRTL ? 'تعديل الفئة' : 'Edit Category')
            : (isRTL ? 'إضافة فئة جديدة' : 'Add New Category')}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={isRTL ? 'اسم الفئة (إنجليزي)' : 'Category Name (English)'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={isRTL ? 'اسم الفئة (عربي)' : 'Category Name (Arabic)'}
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>{isRTL ? 'الفئة الرئيسية' : 'Parent Category'}</InputLabel>
                <Select
                  value={formData.parentId}
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, parentId: e.target.value })}
                  label={isRTL ? 'الفئة الرئيسية' : 'Parent Category'}
                >
                  <MenuItem value="">
                    <em>{isRTL ? 'لا يوجد' : 'None'}</em>
                  </MenuItem>
                  {categories
                    .filter(cat => cat.id !== editingCategory?.id)
                    .map(cat => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {isRTL ? cat.nameAr : cat.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={isRTL ? 'الميزانية الشهرية' : 'Monthly Budget'}
                type="number"
                value={formData.budgetLimit}
                onChange={(e) => setFormData({ ...formData, budgetLimit: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">EGP</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}
                value={formData.descriptionAr}
                onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={isRTL ? 'حد الموافقة' : 'Approval Threshold'}
                  type="number"
                  value={formData.approvalThreshold}
                  onChange={(e) => setFormData({ ...formData, approvalThreshold: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">EGP</InputAdornment>,
                  }}
                  helperText={isRTL ? 'المبلغ الذي يتطلب موافقة' : 'Amount that requires approval'}
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
                label={isRTL ? 'يتطلب إيصال' : 'Requires Receipt'}
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!formData.name || !formData.nameAr}
          >
            {editingCategory ? (isRTL ? 'تحديث' : 'Update') : (isRTL ? 'إضافة' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}