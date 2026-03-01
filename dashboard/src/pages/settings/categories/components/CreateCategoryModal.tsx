import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  IconButton,
  Typography,
  CircularProgress,
  Avatar,
} from '@mui/material';
import {
  Close,
  Save,
} from '@mui/icons-material';
import * as Icons from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { categoryService, CATEGORY_COLORS, CATEGORY_ICONS, type BaseCategory } from '../../../../services/category.service';
import ColorPicker from './ColorPicker';
import IconSelector from './IconSelector';

interface CreateCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  companyId: string;
  categoryType: 'client' | 'appointment' | 'event';
  editingCategory?: BaseCategory | null;
}

interface FormData {
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  color: string;
  icon: string;
}

const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  open,
  onClose,
  onSuccess,
  companyId,
  categoryType,
  editingCategory,
}) => {
  const [loading, setLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(editingCategory?.color || CATEGORY_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(editingCategory?.icon || CATEGORY_ICONS[categoryType][0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconSelector, setShowIconSelector] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    defaultValues: {
      name: editingCategory?.name || '',
      nameAr: editingCategory?.nameAr || '',
      description: editingCategory?.description || '',
      descriptionAr: editingCategory?.descriptionAr || '',
      color: editingCategory?.color || CATEGORY_COLORS[0],
      icon: editingCategory?.icon || CATEGORY_ICONS[categoryType][0],
    },
  });

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      reset();
      setSelectedColor(CATEGORY_COLORS[0]);
      setSelectedIcon(CATEGORY_ICONS[categoryType][0]);
    }
  }, [open, reset, categoryType]);

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const categoryData = {
        name: data.name,
        nameAr: data.nameAr || '',
        description: data.description || '',
        descriptionAr: data.descriptionAr || '',
        color: selectedColor,
        icon: selectedIcon,
        companyId,
        active: true,
      };

      if (editingCategory) {
        // Update existing category
        await categoryService.updateCategory(
          editingCategory.id!,
          categoryData,
          categoryType
        );
      } else {
        // Create new category
        await categoryService.createCategory(categoryData, categoryType);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('حدث خطأ في حفظ الفئة');
    } finally {
      setLoading(false);
    }
  };

  // Get the icon component dynamically
  const IconComponent = (Icons as Record<string, React.ComponentType>)[selectedIcon] || Icons.Category;

  const getTitle = () => {
    const action = editingCategory ? 'تعديل' : 'إنشاء';
    switch (categoryType) {
      case 'client':
        return `${action} فئة عملاء`;
      case 'appointment':
        return `${action} فئة مواعيد`;
      case 'event':
        return `${action} فئة فعاليات`;
      default:
        return `${action} فئة`;
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{getTitle()}</Typography>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Preview */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Avatar sx={{ 
                  bgcolor: selectedColor, 
                  width: 80, 
                  height: 80,
                  fontSize: '2rem',
                }}>
                  <IconComponent />
                </Avatar>
              </Box>

              {/* Name Fields */}
              <Controller
                name="name"
                control={control}
                rules={{ required: 'اسم الفئة مطلوب' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="اسم الفئة"
                    placeholder="أدخل اسم الفئة"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />

              <Controller
                name="nameAr"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="الاسم بالعربية"
                    placeholder="أدخل الاسم بالعربية (اختياري)"
                    fullWidth
                    dir="rtl"
                  />
                )}
              />

              {/* Color and Icon Selection */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>اللون</Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setShowColorPicker(true)}
                    sx={{
                      height: 56,
                      justifyContent: 'flex-start',
                      gap: 2,
                    }}
                  >
                    <Box sx={{
                      width: 24,
                      height: 24,
                      borderRadius: 1,
                      backgroundColor: selectedColor,
                    }} />
                    <Typography variant="body2">{selectedColor}</Typography>
                  </Button>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>الأيقونة</Typography>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setShowIconSelector(true)}
                    sx={{
                      height: 56,
                      justifyContent: 'flex-start',
                      gap: 2,
                    }}
                  >
                    <IconComponent fontSize="small" />
                    <Typography variant="body2">اختر أيقونة</Typography>
                  </Button>
                </Box>
              </Box>

              {/* Description Fields */}
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="الوصف"
                    placeholder="أدخل وصف الفئة (اختياري)"
                    fullWidth
                    multiline
                    rows={2}
                  />
                )}
              />

              <Controller
                name="descriptionAr"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="الوصف بالعربية"
                    placeholder="أدخل الوصف بالعربية (اختياري)"
                    fullWidth
                    multiline
                    rows={2}
                    dir="rtl"
                  />
                )}
              />
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={onClose} color="inherit">
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Save />}
              disabled={loading}
              sx={{
                minWidth: 120,
                backgroundColor: '#3B82F6',
                '&:hover': { backgroundColor: '#2563EB' },
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'حفظ'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Color Picker Dialog */}
      <ColorPicker
        open={showColorPicker}
        onClose={() => setShowColorPicker(false)}
        selectedColor={selectedColor}
        onSelectColor={(color) => {
          setSelectedColor(color);
          setShowColorPicker(false);
        }}
      />

      {/* Icon Selector Dialog */}
      <IconSelector
        open={showIconSelector}
        onClose={() => setShowIconSelector(false)}
        selectedIcon={selectedIcon}
        onSelectIcon={(icon) => {
          setSelectedIcon(icon);
          setShowIconSelector(false);
        }}
        categoryType={categoryType}
      />
    </>
  );
};

export default CreateCategoryModal;