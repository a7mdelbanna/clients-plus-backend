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
const categoryIcons: Record<string, React.ComponentType> = {
  money: AttachMoney,
  receipt: Receipt,
  repeat: Repeat,
  category: Category,
  check: CheckCircle,
  cancel: Cancel,
};

interface CategoryFormData {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  color: string;
  parentId: string;
  budgetLimit: string;
  isFixed: boolean;
  requiresApproval: boolean;
  approvalThreshold: string;
}

const ExpenseCategoriesPage: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const isRTL = theme.direction === 'rtl';

  // State
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    icon: 'category',
    color: '#8B5CF6',
    parentId: '',
    budgetLimit: '',
    isFixed: false,
    requiresApproval: false,
    approvalThreshold: '',
  });

  // Load categories
  useEffect(() => {
    loadCategories();
  }, [currentUser]);

  const loadCategories = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);
      const data = await expenseService.getCategories(currentUser.companyId);
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      setError(isRTL ? 'خطأ في تحميل الفئات' : 'Error loading categories');
    } finally {
      setLoading(false);
    }
  };

  // Filter categories
  const filteredCategories = categories.filter(category => 
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.nameAr.toLowerCase().includes(searchTerm.toLowerCase())
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
        description: category.description || '',
        descriptionAr: category.descriptionAr || '',
        icon: category.icon || 'category',
        color: category.color || '#8B5CF6',
        parentId: category.parentId || '',
        budgetLimit: category.budgetLimit?.toString() || '',
        isFixed: category.isFixed || false,
        requiresApproval: category.requiresApproval || false,
        approvalThreshold: category.approvalThreshold?.toString() || '',
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        nameAr: '',
        description: '',
        descriptionAr: '',
        icon: 'category',
        color: '#8B5CF6',
        parentId: '',
        budgetLimit: '',
        isFixed: false,
        requiresApproval: false,
        approvalThreshold: '',
      });
    }
    setOpenDialog(true);
  };

  // Handle save
  const handleSave = async () => {
    if (!currentUser?.companyId || !formData.name || !formData.nameAr) {
      setError(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    try {
      const categoryData: any = {
        name: formData.name,
        nameAr: formData.nameAr,
        icon: formData.icon,
        color: formData.color,
        isFixed: formData.isFixed,
        requiresApproval: formData.requiresApproval,
        isActive: true,
      };

      // Only add optional fields if they have values
      if (formData.description) {
        categoryData.description = formData.description;
      }
      if (formData.descriptionAr) {
        categoryData.descriptionAr = formData.descriptionAr;
      }
      if (formData.parentId) {
        categoryData.parentId = formData.parentId;
      }
      if (formData.budgetLimit) {
        categoryData.budgetLimit = parseFloat(formData.budgetLimit);
      }
      if (formData.requiresApproval && formData.approvalThreshold) {
        categoryData.approvalThreshold = parseFloat(formData.approvalThreshold);
      }

      if (editingCategory) {
        await expenseService.updateCategory(currentUser.companyId, editingCategory.id!, categoryData);
        setSuccess(isRTL ? 'تم تحديث الفئة بنجاح' : 'Category updated successfully');
      } else {
        await expenseService.createCategory(currentUser.companyId, categoryData);
        setSuccess(isRTL ? 'تم إنشاء الفئة بنجاح' : 'Category created successfully');
      }

      // Close dialog first to avoid aria-hidden issues
      setOpenDialog(false);
      
      // Reset form
      setFormData({
        name: '',
        nameAr: '',
        description: '',
        descriptionAr: '',
        icon: 'category',
        color: '#8B5CF6',
        parentId: '',
        budgetLimit: '',
        isFixed: false,
        requiresApproval: false,
        approvalThreshold: '',
      });
      
      // Reload categories after a short delay
      setTimeout(async () => {
        await loadCategories();
      }, 100);
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
                        <Avatar
                          sx={{
                            bgcolor: category.color || theme.palette.primary.main,
                            width: 40,
                            height: 40,
                          }}
                        >
                          <Icon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {isRTL ? category.nameAr : category.name}
                          </Typography>
                          {category.description && (
                            <Typography variant="caption" color="text.secondary">
                              {isRTL ? category.descriptionAr : category.description}
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
                        {category.isFixed && (
                          <Chip 
                            label={isRTL ? 'ثابت' : 'Fixed'} 
                            size="small" 
                            color="primary"
                          />
                        )}
                        {category.requiresApproval && (
                          <Chip 
                            label={isRTL ? 'يتطلب موافقة' : 'Requires Approval'} 
                            size="small" 
                            color="warning"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={category.isActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                        color={category.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(category)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => category.id && handleDelete(category.id)}
                        color="error"
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Row 1: Names */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                fullWidth
                label={isRTL ? 'اسم الفئة (إنجليزي)' : 'Category Name (English)'}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label={isRTL ? 'اسم الفئة (عربي)' : 'Category Name (Arabic)'}
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                required
              />
            </Box>

            {/* Row 2: Parent Category and Budget */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <FormControl fullWidth sx={{ minWidth: { sm: '50%' } }}>
                <InputLabel shrink={true}>{isRTL ? 'الفئة الرئيسية' : 'Parent Category'}</InputLabel>
                <Select
                  value={formData.parentId || ''}
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, parentId: e.target.value })}
                  label={isRTL ? 'الفئة الرئيسية' : 'Parent Category'}
                  displayEmpty
                  notched
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
            </Box>

            {/* Row 3: Descriptions */}
            <TextField
              fullWidth
              label={isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label={isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}
              value={formData.descriptionAr}
              onChange={(e) => setFormData({ ...formData, descriptionAr: e.target.value })}
              multiline
              rows={2}
            />

            {/* Row 4: Toggles */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isFixed}
                    onChange={(e) => setFormData({ ...formData, isFixed: e.target.checked })}
                  />
                }
                label={isRTL ? 'مصروف ثابت' : 'Fixed Expense'}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.requiresApproval}
                    onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                  />
                }
                label={isRTL ? 'يتطلب موافقة' : 'Requires Approval'}
              />
            </Box>

            {/* Approval Threshold */}
            {formData.requiresApproval && (
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
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSave} variant="contained">
            {editingCategory
              ? (isRTL ? 'تحديث' : 'Update')
              : (isRTL ? 'إضافة' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ExpenseCategoriesPage;