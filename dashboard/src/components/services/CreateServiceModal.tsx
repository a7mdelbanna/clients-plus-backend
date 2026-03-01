import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardActionArea,
  CardContent,
  TextField,
  FormControlLabel,
  Checkbox,
  IconButton,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Close,
  Category,
  Star,
  CardGiftcard,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { serviceApiService } from '../../services/api/service.api.service';

interface CreateServiceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type CreateType = 'category' | 'service' | 'package';

const categorySchema = yup.object({
  name: yup.string().required('اسم الفئة مطلوب'),
  useOnlineBookingName: yup.boolean(),
  onlineBookingName: yup.string().when('useOnlineBookingName', {
    is: true,
    then: (schema) => schema.required('اسم الحجز الإلكتروني مطلوب'),
  }),
});

type CategoryFormData = yup.InferType<typeof categorySchema>;

const CreateServiceModal: React.FC<CreateServiceModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';
  const [step, setStep] = useState<'select' | 'form'>('select');
  const [selectedType, setSelectedType] = useState<CreateType | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      name: '',
      useOnlineBookingName: false,
      onlineBookingName: '',
    },
  });

  const useOnlineBookingName = watch('useOnlineBookingName');

  const handleClose = () => {
    setStep('select');
    setSelectedType(null);
    reset();
    onClose();
  };

  const handleTypeSelect = (type: CreateType) => {
    setSelectedType(type);
    if (type === 'category') {
      setStep('form');
    } else {
      // For service and package, navigate to their respective pages
      if (type === 'service') {
        navigate('/settings/services/new');
      } else {
        // TODO: Navigate to create package page
        toast.info('إنشاء حزمة خدمات - قريباً');
      }
      handleClose();
    }
  };

  const onSubmit = async (data: CategoryFormData) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Get company ID from the user object
      const companyId = currentUser.companyId;
      
      if (!companyId) {
        toast.error('لم يتم العثور على معرف الشركة');
        setLoading(false);
        return;
      }
      
      await serviceApiService.createCategory({
        name: data.name,
        nameAr: data.name, // Use the same name for Arabic
        active: true,
        branchId: currentBranch?.id,
      });
      
      toast.success('تم إنشاء الفئة بنجاح');
      handleClose();
      // Call onSuccess after closing to avoid focus issues
      setTimeout(() => {
        onSuccess?.();
      }, 100);
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('فشل إنشاء الفئة');
    } finally {
      setLoading(false);
    }
  };

  const createOptions = [
    {
      type: 'category' as CreateType,
      title: 'فئة خدمة',
      description: 'مجموعة من الخدمات المتشابهة، مثل قص الشعر',
      icon: <Category sx={{ fontSize: 40 }} />,
      color: '#F59E0B',
    },
    {
      type: 'service' as CreateType,
      title: 'خدمة',
      description: 'خدمة واحدة يقوم بها الموظف، مثل العناية بالأظافر',
      icon: <Star sx={{ fontSize: 40 }} />,
      color: '#10B981',
    },
    {
      type: 'package' as CreateType,
      title: 'حزمة خدمات',
      description: 'مجموعة من الخدمات مجتمعة في عرض واحد، مثل العناية بالأظافر والأقدام',
      icon: <CardGiftcard sx={{ fontSize: 40 }} />,
      color: '#8B5CF6',
      isNew: true,
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="h6">
            {step === 'select' ? 'ماذا تريد أن تنشئ؟' : 'إنشاء فئة خدمة'}
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {step === 'select' ? (
          <Box sx={{ pt: 2 }}>
            {createOptions.map((option, index) => (
              <motion.div
                key={option.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  sx={{
                    mb: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    transition: 'all 0.3s',
                    '&:hover': {
                      borderColor: option.color,
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4],
                    },
                  }}
                >
                  <CardActionArea onClick={() => handleTypeSelect(option.type)}>
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 2,
                        }}
                      >
                        <Box
                          sx={{
                            width: 64,
                            height: 64,
                            borderRadius: 2,
                            backgroundColor: alpha(option.color, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: option.color,
                            flexShrink: 0,
                          }}
                        >
                          {option.icon}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mb: 0.5,
                            }}
                          >
                            <Typography variant="h6">
                              {option.title}
                            </Typography>
                            {option.isNew && (
                              <Chip
                                label="جديد"
                                size="small"
                                color="primary"
                                sx={{ height: 20 }}
                              />
                            )}
                          </Box>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            {option.description}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </motion.div>
            ))}
          </Box>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Box sx={{ pt: 2 }}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="الاسم"
                    placeholder="مثال: قص الشعر"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    sx={{ mb: 3 }}
                  />
                )}
              />

              <Controller
                name="useOnlineBookingName"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={field.value}
                      />
                    }
                    label="استخدام اسم مختلف للحجز الإلكتروني"
                    sx={{ mb: 2 }}
                  />
                )}
              />

              {useOnlineBookingName && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Controller
                    name="onlineBookingName"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="اسم العرض للحجز الإلكتروني"
                        placeholder="اختياري"
                        error={!!errors.onlineBookingName}
                        helperText={errors.onlineBookingName?.message}
                      />
                    )}
                  />
                </motion.div>
              )}
            </Box>
          </form>
        )}
      </DialogContent>

      {step === 'form' && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            sx={{
              backgroundColor: '#F59E0B',
              '&:hover': {
                backgroundColor: '#D97706',
              },
            }}
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default CreateServiceModal;