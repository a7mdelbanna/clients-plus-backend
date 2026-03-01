import React, { useState, useEffect } from 'react';
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
  Grid,
  IconButton,
  TextField,
  Typography,
  useTheme,
  Stack,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Category,
  ArrowBack,
  Inventory,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { productService } from '../../services/product.service';
import type { ProductCategory } from '../../types/product.types';

const ProductCategoriesPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isRTL = theme.direction === 'rtl';

  // State
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [productCounts, setProductCounts] = useState<Map<string, number>>(new Map());

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    color: '#1976d2',
    sortOrder: 0,
  });

  // Load categories
  useEffect(() => {
    if (currentUser?.companyId) {
      loadCategories();
    }
  }, [currentUser?.companyId]);

  const loadCategories = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);
      const categoriesData = await productService.getCategories(currentUser.companyId);
      setCategories(categoriesData);

      // Load product counts for each category
      const counts = new Map<string, number>();
      for (const category of categoriesData) {
        if (category.id) {
          const { products } = await productService.getProducts(
            currentUser.companyId,
            { categoryId: category.id },
            1
          );
          counts.set(category.id, products.length);
        }
      }
      setProductCounts(counts);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleOpenDialog = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        nameAr: category.nameAr,
        description: category.description || '',
        descriptionAr: category.descriptionAr || '',
        color: category.color || '#1976d2',
        sortOrder: category.sortOrder || 0,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        nameAr: '',
        description: '',
        descriptionAr: '',
        color: '#1976d2',
        sortOrder: categories.length,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async () => {
    if (!currentUser?.companyId) return;

    try {
      const categoryData: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        companyId: currentUser.companyId,
        isActive: true,
      };

      if (editingCategory?.id) {
        await productService.updateCategory(currentUser.companyId, editingCategory.id, categoryData);
      } else {
        await productService.createCategory(categoryData);
      }

      handleCloseDialog();
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!currentUser?.companyId || !confirm(isRTL ? 'هل أنت متأكد من حذف هذه الفئة؟' : 'Are you sure you want to delete this category?')) {
      return;
    }

    try {
      await productService.deleteCategory(currentUser.companyId, categoryId);
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Predefined colors
  const colorOptions = [
    '#1976d2', '#2e7d32', '#ed6c02', '#d32f2f',
    '#7b1fa2', '#c2185b', '#0288d1', '#388e3c',
    '#f57c00', '#c62828', '#5e35b1', '#ad1457',
  ];

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate('/products')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isRTL ? 'فئات المنتجات' : 'Product Categories'}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            {isRTL ? 'إضافة فئة' : 'Add Category'}
          </Button>
        </Stack>
      </Box>

      {/* Categories Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : categories.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Category sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {isRTL ? 'لا توجد فئات' : 'No categories found'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ mt: 2 }}
          >
            {isRTL ? 'إضافة أول فئة' : 'Add First Category'}
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {categories.map((category) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={category.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Avatar
                          sx={{
                            bgcolor: category.color || theme.palette.primary.main,
                            width: 56,
                            height: 56,
                          }}
                        >
                          <Category />
                        </Avatar>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            setAnchorEl(e.currentTarget);
                            setSelectedCategory(category);
                          }}
                        >
                          <MoreVert />
                        </IconButton>
                      </Stack>

                      <Box>
                        <Typography variant="h6">
                          {isRTL ? category.nameAr : category.name}
                        </Typography>
                        {category.description && (
                          <Typography variant="body2" color="text.secondary">
                            {isRTL ? category.descriptionAr : category.description}
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Inventory fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {productCounts.get(category.id!) || 0} {isRTL ? 'منتج' : 'products'}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory
            ? (isRTL ? 'تعديل الفئة' : 'Edit Category')
            : (isRTL ? 'إضافة فئة جديدة' : 'Add New Category')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label={isRTL ? 'اسم الفئة' : 'Category Name'}
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
            <TextField
              fullWidth
              label={isRTL ? 'الوصف' : 'Description'}
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

            {/* Color Selection */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {isRTL ? 'اللون' : 'Color'}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {colorOptions.map((color) => (
                  <IconButton
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: color,
                      border: formData.color === color ? 3 : 0,
                      borderColor: 'primary.main',
                      '&:hover': { bgcolor: color },
                    }}
                  />
                ))}
              </Stack>
            </Box>

            <TextField
              fullWidth
              type="number"
              label={isRTL ? 'ترتيب العرض' : 'Sort Order'}
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              helperText={isRTL ? 'رقم أصغر يعني الظهور أولاً' : 'Lower number appears first'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button
            onClick={handleSaveCategory}
            variant="contained"
            disabled={!formData.name || !formData.nameAr}
          >
            {editingCategory ? (isRTL ? 'حفظ' : 'Save') : (isRTL ? 'إضافة' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
          setSelectedCategory(null);
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedCategory) {
              handleOpenDialog(selectedCategory);
            }
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'تعديل' : 'Edit'}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedCategory?.id) {
              handleDeleteCategory(selectedCategory.id);
            }
            setAnchorEl(null);
          }}
          disabled={selectedCategory?.id ? (productCounts.get(selectedCategory.id) || 0) > 0 : true}
        >
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'حذف' : 'Delete'}</ListItemText>
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default ProductCategoriesPage;