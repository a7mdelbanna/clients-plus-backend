import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  CircularProgress,
  IconButton,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  Save,
  Close,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { resourceService } from '../../../../services/resource.service';
import { serviceService, type Service } from '../../../../services/service.service';

interface AddResourceFormProps {
  companyId: string;
  branchId?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  description: string;
  services: string[];
  capacity: number;
}

const AddResourceForm: React.FC<AddResourceFormProps> = ({
  companyId,
  branchId,
  onCancel,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      services: [],
      capacity: 1,
    },
  });

  useEffect(() => {
    loadServices();
  }, [companyId, branchId]);

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const fetchedServices = await serviceService.getServices(companyId, branchId);
      setServices(fetchedServices);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('حدث خطأ في تحميل الخدمات');
    } finally {
      setLoadingServices(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const newResource = {
        name: data.name,
        description: data.description || '',
        services: data.services,
        capacity: data.capacity || 1,
        status: 'active' as const,
        branchId,
      };

      await resourceService.createResource(newResource, companyId, branchId);
      onSuccess();
    } catch (error) {
      console.error('Error adding resource:', error);
      toast.error('حدث خطأ في إضافة المورد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Paper sx={{ mb: 3, p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">إضافة مورد جديد</Typography>
          <IconButton onClick={onCancel} size="small">
            <Close />
          </IconButton>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'grid', gap: 3 }}>
            {/* Title Field */}
            <Controller
              name="name"
              control={control}
              rules={{ required: 'اسم المورد مطلوب' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="العنوان"
                  placeholder="أدخل اسم المورد"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />

            {/* Description Field */}
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="الوصف"
                  placeholder="أدخل وصف المورد (اختياري)"
                  fullWidth
                  multiline
                  rows={3}
                />
              )}
            />

            {/* Services Field */}
            <Controller
              name="services"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>الخدمات</InputLabel>
                  <Select
                    {...field}
                    multiple
                    label="الخدمات"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => {
                          const service = services.find(s => s.id === value);
                          return (
                            <Chip 
                              key={value} 
                              label={service?.name || value} 
                              size="small"
                            />
                          );
                        })}
                      </Box>
                    )}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                        },
                      },
                    }}
                  >
                    {loadingServices ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} sx={{ mr: 1 }} />
                        جاري تحميل الخدمات...
                      </MenuItem>
                    ) : services.length === 0 ? (
                      <MenuItem disabled>
                        لا توجد خدمات متاحة
                      </MenuItem>
                    ) : (
                      services.map((service) => (
                        <MenuItem key={service.id} value={service.id}>
                          {service.name}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    حدد الخدمات التي يمكن أن تستخدم هذا المورد
                  </Typography>
                </FormControl>
              )}
            />

            {/* Capacity Field */}
            <Controller
              name="capacity"
              control={control}
              rules={{ 
                required: 'السعة مطلوبة',
                min: { value: 1, message: 'السعة يجب أن تكون 1 على الأقل' }
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="السعة"
                  placeholder="كم عدد الأشخاص الذين يمكنهم استخدام هذا المورد في نفس الوقت؟"
                  fullWidth
                  error={!!errors.capacity}
                  helperText={errors.capacity?.message || 'عدد الأشخاص الذين يمكنهم استخدام هذا المورد في وقت واحد'}
                  InputProps={{
                    inputProps: { min: 1 }
                  }}
                />
              )}
            />

            {/* Save Button */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={loading}
                sx={{
                  minWidth: 200,
                  backgroundColor: '#00bcd4',
                  '&:hover': { backgroundColor: '#00acc1' },
                }}
              >
                {loading ? 'جاري الحفظ...' : 'حفظ'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </motion.div>
  );
};

export default AddResourceForm;