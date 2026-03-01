import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  IconButton,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Add,
  Delete,
  Phone,
  Language,
  LocationOn,
  AccessTime,
} from '@mui/icons-material';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { locationService, type LocationContactDetails } from '../../../../services/location.service';

interface ContactDetailsTabProps {
  settings?: LocationContactDetails;
  onSave: (data: LocationContactDetails) => Promise<void>;
  saving: boolean;
}

interface FormData {
  address: string;
  postalCode: string;
  phones: Array<{
    countryCode: string;
    number: string;
  }>;
  website: string;
  businessHours: string;
}

const ContactDetailsTab: React.FC<ContactDetailsTabProps> = ({
  settings,
  onSave,
  saving,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      address: settings?.address || '',
      postalCode: settings?.postalCode || '',
      phones: settings?.phones?.length ? settings.phones : [{ countryCode: '+20', number: '' }],
      website: settings?.website || '',
      businessHours: settings?.businessHours || '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'phones',
  });

  useEffect(() => {
    if (settings) {
      reset({
        address: settings.address || '',
        postalCode: settings.postalCode || '',
        phones: settings.phones?.length ? settings.phones : [{ countryCode: '+20', number: '' }],
        website: settings.website || '',
        businessHours: settings.businessHours || '',
      });
    }
  }, [settings, reset]);

  const onSubmit = async (data: FormData) => {
    // Filter out empty phone numbers
    const validPhones = data.phones.filter(phone => phone.number.trim() !== '');
    
    await onSave({
      ...data,
      phones: validPhones.length > 0 ? validPhones : [{ countryCode: '+20', number: '' }],
    });
  };

  const handleAddPhone = () => {
    append({ countryCode: '+20', number: '' });
  };

  const countryCodes = [
    { code: '+20', country: 'Egypt' },
    { code: '+966', country: 'Saudi Arabia' },
    { code: '+971', country: 'UAE' },
    { code: '+965', country: 'Kuwait' },
    { code: '+968', country: 'Oman' },
    { code: '+973', country: 'Bahrain' },
    { code: '+974', country: 'Qatar' },
    { code: '+212', country: 'Morocco' },
    { code: '+216', country: 'Tunisia' },
    { code: '+213', country: 'Algeria' },
    { code: '+1', country: 'USA/Canada' },
    { code: '+44', country: 'UK' },
  ];

  return (
    <Paper sx={{ p: 4 }}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Address Section */}
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn color="primary" />
            معلومات العنوان
          </Typography>

          <Controller
            name="address"
            control={control}
            rules={{ required: 'العنوان مطلوب' }}
            render={({ field }) => (
              <TextField
                {...field}
                label="العنوان"
                fullWidth
                multiline
                rows={2}
                error={!!errors.address}
                helperText={errors.address?.message || 'مثال: الحي التجاري، برج XYZ، مكتب 123'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationOn />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          <Controller
            name="postalCode"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="الرمز البريدي"
                fullWidth
                helperText="يتم ملء الرمز البريدي تلقائيًا بناءً على العنوان"
              />
            )}
          />

          {/* Contact Information */}
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
            <Phone color="primary" />
            معلومات الاتصال
          </Typography>

          {/* Phone Numbers */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              أرقام الهاتف
            </Typography>
            {fields.map((field, index) => (
              <Box key={field.id} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Controller
                  name={`phones.${index}.countryCode`}
                  control={control}
                  render={({ field }) => (
                    <FormControl sx={{ minWidth: 120 }}>
                      <InputLabel>الدولة</InputLabel>
                      <Select
                        {...field}
                        label="الدولة"
                        size="small"
                      >
                        {countryCodes.map((country) => (
                          <MenuItem key={country.code} value={country.code}>
                            {country.code} {country.country}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
                
                <Controller
                  name={`phones.${index}.number`}
                  control={control}
                  rules={{
                    required: index === 0 ? 'رقم الهاتف مطلوب' : false,
                    validate: (value) => {
                      if (!value && index === 0) return 'رقم الهاتف مطلوب';
                      if (value) {
                        const countryCode = watch(`phones.${index}.countryCode`);
                        if (!locationService.validatePhoneNumber(countryCode, value)) {
                          return 'رقم الهاتف غير صحيح';
                        }
                      }
                      return true;
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="رقم الهاتف"
                      size="small"
                      fullWidth
                      error={!!errors.phones?.[index]?.number}
                      helperText={errors.phones?.[index]?.number?.message}
                    />
                  )}
                />
                
                {fields.length > 1 && (
                  <IconButton
                    onClick={() => remove(index)}
                    color="error"
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                )}
              </Box>
            ))}
            
            <Button
              startIcon={<Add />}
              onClick={handleAddPhone}
              size="small"
              sx={{ mt: 1 }}
            >
              إضافة رقم آخر
            </Button>
          </Box>

          {/* Website */}
          <Controller
            name="website"
            control={control}
            rules={{
              pattern: {
                value: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
                message: 'رابط الموقع غير صحيح',
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                label="الموقع الإلكتروني"
                fullWidth
                error={!!errors.website}
                helperText={errors.website?.message || 'مثال: www.my-company.com'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Language />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />

          {/* Business Hours */}
          <Controller
            name="businessHours"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="ساعات العمل"
                fullWidth
                multiline
                rows={2}
                helperText="مثال: الإثنين - الأحد: 11:00 - 22:00"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTime />
                    </InputAdornment>
                  ),
                }}
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

export default ContactDetailsTab;