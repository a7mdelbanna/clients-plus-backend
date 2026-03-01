import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Add,
  ArrowBack,
  Search,
  Event,
  MoreVert,
  Edit,
  Delete,
  Star,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { categoryService, type EventCategory } from '../../../services/category.service';
import CreateCategoryModal from './components/CreateCategoryModal';
import * as Icons from '@mui/icons-material';

const EventCategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser } = useAuth();
  
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [companyId, setCompanyId] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    let unsubscribe: (() => void) | null = null;
    
    const loadData = async () => {
      try {
        setLoading(true);
        let cId = currentUser?.companyId;

        if (!cId) {
          toast.error('لم يتم العثور على معرف الشركة');
          setLoading(false);
          return;
        }

        setCompanyId(cId);

        // Subscribe to real-time category updates
        unsubscribe = categoryService.subscribeToCategories<EventCategory>(
          cId,
          'event',
          (updatedCategories) => {
            setCategories(updatedCategories);
            setFilteredCategories(updatedCategories);
            setLoading(false);
          },
          (error) => {
            console.error('Error subscribing to categories:', error);
            toast.error('حدث خطأ في تحميل الفئات');
            setLoading(false);
          }
        );
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('حدث خطأ في تحميل البيانات');
        setLoading(false);
      }
    };

    loadData();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser]);

  useEffect(() => {
    // Filter categories based on search term
    const filtered = categories.filter(category =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.nameAr && category.nameAr.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredCategories(filtered);
  }, [searchTerm, categories]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, category: EventCategory) => {
    setAnchorEl(event.currentTarget);
    setSelectedCategory(category);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCategory(null);
  };

  const handleEdit = () => {
    if (selectedCategory) {
      setEditingCategory(selectedCategory);
      setShowCreateModal(true);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    if (selectedCategory.itemCount && selectedCategory.itemCount > 0) {
      toast.error('لا يمكن حذف فئة مرتبطة بفعاليات');
      handleMenuClose();
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف الفئة "${selectedCategory.name}"؟`)) {
      try {
        await categoryService.deleteCategory(selectedCategory.id!, 'event');
        toast.success('تم حذف الفئة بنجاح');
      } catch (error) {
        console.error('Error deleting category:', error);
        toast.error('حدث خطأ في حذف الفئة');
      }
    }
    handleMenuClose();
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    setEditingCategory(null);
    toast.success(editingCategory ? 'تم تحديث الفئة بنجاح' : 'تمت إضافة الفئة بنجاح');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => navigate('/settings/categories')}
                sx={{
                  backgroundColor: theme.palette.action.hover,
                  '&:hover': { backgroundColor: theme.palette.action.selected },
                }}
              >
                <ArrowBack />
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  فئات الفعاليات
                </Typography>
                <Star sx={{ color: theme.palette.warning.main, fontSize: 24 }} />
              </Box>
            </Box>
            
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowCreateModal(true)}
              sx={{
                borderRadius: 2,
                backgroundColor: theme.palette.warning.main,
                '&:hover': { backgroundColor: theme.palette.warning.dark },
              }}
            >
              إنشاء فئة
            </Button>
          </Box>

          {/* Breadcrumb */}
          <Typography variant="body2" color="text.secondary">
            الإعدادات &gt; الفئات &gt; فئات الفعاليات
          </Typography>
        </Box>

        {/* Search Bar */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <TextField
            fullWidth
            placeholder="البحث في الفئات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Paper>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredCategories.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 2 }}>
            <Event sx={{ fontSize: 80, color: theme.palette.action.disabled, mb: 2 }} />
            <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
              {searchTerm ? 'لا توجد نتائج' : 'لا توجد فئات بعد'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              {searchTerm 
                ? 'جرب البحث بكلمات أخرى' 
                : "لم تقم بإنشاء أي فئات بعد. أنشئ واحدة لتنظيم فعالياتك."}
            </Typography>
            {!searchTerm && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowCreateModal(true)}
                sx={{
                  backgroundColor: '#00bcd4',
                  '&:hover': { backgroundColor: '#00acc1' },
                }}
              >
                إنشاء فئة
              </Button>
            )}
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {filteredCategories.map((category) => {
              const IconComponent = (Icons as Record<string, React.ComponentType>)[category.icon] || Icons.Category;
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card sx={{ borderRadius: 2, '&:hover': { boxShadow: theme.shadows[4] } }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: category.color, width: 48, height: 48 }}>
                            <IconComponent />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {category.name}
                            </Typography>
                            {category.nameAr && (
                              <Typography variant="body2" color="text.secondary">
                                {category.nameAr}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, category)}
                        >
                          <MoreVert />
                        </IconButton>
                      </Box>

                      {category.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {category.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={`${category.itemCount || 0} فعالية`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label="نشط"
                          size="small"
                          color="success"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </Box>
        )}

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            تعديل
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            حذف
          </MenuItem>
        </Menu>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <CreateCategoryModal
            open={showCreateModal}
            onClose={() => {
              setShowCreateModal(false);
              setEditingCategory(null);
            }}
            onSuccess={handleCreateSuccess}
            companyId={companyId}
            categoryType="event"
            editingCategory={editingCategory}
          />
        )}
      </Box>
    </motion.div>
  );
};

export default EventCategoriesPage;