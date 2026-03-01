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
  Typography,
  Avatar,
  IconButton,
  CircularProgress,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  Save,
  Edit,
  PhotoCamera,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { storageService } from '../../../../services/storage.service';
import { locationService, type LocationBasicSettings } from '../../../../services/location.service';

interface BasicSettingsTabProps {
  settings?: LocationBasicSettings;
  companyId: string;
  onSave: (data: LocationBasicSettings) => Promise<void>;
  saving: boolean;
}

const BasicSettingsTab: React.FC<BasicSettingsTabProps> = ({
  settings,
  companyId,
  onSave,
  saving,
}) => {
  const [logoUrl, setLogoUrl] = useState(settings?.logoUrl || '');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LocationBasicSettings>({
    defaultValues: {
      locationName: settings?.locationName || 'الفرع الرئيسي',
      businessName: settings?.businessName || '',
      category: settings?.category || '',
      city: settings?.city || '',
      notificationLanguage: settings?.notificationLanguage || 'ar',
      dateFormat: settings?.dateFormat || 'DD.MM.YYYY, HH:mm',
      logoUrl: settings?.logoUrl || '',
    },
  });

  useEffect(() => {
    if (settings) {
      reset(settings);
      setLogoUrl(settings.logoUrl || '');
    }
  }, [settings, reset]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يجب أن يكون الملف صورة');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    try {
      setUploadingLogo(true);
      const url = await storageService.uploadCompanyLogo(file, companyId);
      setLogoUrl(url);
      
      // Save the logo URL immediately
      await onSave({ logoUrl: url });
      
      toast.success('تم رفع الشعار بنجاح');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('حدث خطأ في رفع الشعار');
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSubmit = async (data: LocationBasicSettings) => {
    await onSave({ ...data, logoUrl });
  };

  const cities = locationService.getCities();
  const categories = locationService.getBusinessCategoriesSimple();

  return (
    <Paper sx={{ p: 4 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Logo Upload Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              شعار الشركة
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={logoUrl}
                  sx={{
                    width: 120,
                    height: 120,
                    bgcolor: '#FFC107',
                    fontSize: '3rem',
                  }}
                >
                  {!logoUrl && <PhotoCamera />}
                </Avatar>
                <input
                  accept="image/*"
                  id="logo-upload"
                  type="file"
                  hidden
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
                <label htmlFor="logo-upload">
                  <IconButton
                    component="span"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      backgroundColor: 'background.paper',
                      boxShadow: 1,
                      '&:hover': { backgroundColor: 'background.paper' },
                    }}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? <CircularProgress size={20} /> : <Edit />}
                  </IconButton>
                </label>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  الحجم الموصى به: 512×512 بكسل
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  الصيغ المدعومة: JPG, PNG
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Location Information */}
          <Typography variant="h6">معلومات الموقع</Typography>
          
          <Controller
            name="locationName"
            control={control}
            rules={{ required: 'اسم الفرع مطلوب' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="اسم الفرع"
                fullWidth
                error={!!errors.locationName}
                helperText={errors.locationName?.message || 'يستخدم داخليًا'}
              />
            )}
          />

          <Controller
            name="businessName"
            control={control}
            rules={{ required: 'اسم العمل مطلوب' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="اسم العمل"
                fullWidth
                error={!!errors.businessName}
                helperText={errors.businessName?.message || 'اسم الشركة - ينطبق على جميع الفروع'}
              />
            )}
          />

          <Controller
            name="category"
            control={control}
            rules={{ required: 'الفئة مطلوبة' }}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.category}>
                <InputLabel>الفئة</InputLabel>
                <Select
                  {...field}
                  label="الفئة"
                >
                  <MenuItem value="">
                    <em>اختر فئة</em>
                  </MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
                {errors.category && (
                  <Typography variant="caption" color="error">
                    {errors.category.message}
                  </Typography>
                )}
              </FormControl>
            )}
          />

          <Controller
            name="city"
            control={control}
            rules={{ required: 'المدينة مطلوبة' }}
            render={({ field }) => (
              <FormControl fullWidth error={!!errors.city}>
                <InputLabel>المدينة</InputLabel>
                <Select
                  {...field}
                  label="المدينة"
                >
                  <MenuItem value="">
                    <em>اختر مدينة</em>
                  </MenuItem>
                  {cities.map((city) => (
                    <MenuItem key={city} value={city}>
                      {city}
                    </MenuItem>
                  ))}
                </Select>
                {errors.city && (
                  <Typography variant="caption" color="error">
                    {errors.city.message}
                  </Typography>
                )}
              </FormControl>
            )}
          />

          {/* Localization Settings */}
          <Typography variant="h6" sx={{ mt: 2 }}>
            إعدادات التوطين
          </Typography>

          <Controller
            name="notificationLanguage"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>لغة إشعارات العملاء</InputLabel>
                <Select
                  {...field}
                  label="لغة إشعارات العملاء"
                >
                  <MenuItem value="ar">العربية</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                </Select>
              </FormControl>
            )}
          />

          <Controller
            name="dateFormat"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="تنسيق التاريخ والوقت المفضل"
                fullWidth
                disabled
                helperText="مثال: 17.07.2025, 10:05"
              />
            )}
          />

          {/* Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<Save />}
              disabled={saving}
              sx={{
                minWidth: 200,
                backgroundColor: '#00bcd4',
                '&:hover': { backgroundColor: '#00acc1' },
              }}
            >
              {saving ? <CircularProgress size={24} /> : 'حفظ'}
            </Button>
          </Box>
        </Box>
      </form>
    </Paper>
  );
};

export default BasicSettingsTab;