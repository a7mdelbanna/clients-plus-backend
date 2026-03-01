import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Typography,
  Chip,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Grid,
  useTheme,
  alpha,
  Stack,
  Divider,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useFormContext, Controller } from 'react-hook-form';
import type { CompanySetupData } from '../../types';
import { businessTypes, positions } from '../../types';
import BusinessIcon from '@mui/icons-material/Business';
import CategoryIcon from '@mui/icons-material/Category';
import PersonIcon from '@mui/icons-material/Person';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

const BusinessInfo: React.FC = () => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const { control, watch, setValue } = useFormContext<CompanySetupData>();
  
  const selectedBusinessType = watch('businessType');
  const selectedServices = watch('mainServices') || [];
  
  const availableServices = businessTypes.find(bt => bt.id === selectedBusinessType)?.services || [];

  const handleServiceToggle = (serviceId: string) => {
    const currentServices = selectedServices || [];
    if (currentServices.includes(serviceId)) {
      setValue('mainServices', currentServices.filter(id => id !== serviceId));
    } else {
      setValue('mainServices', [...currentServices, serviceId]);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box>
        <Typography variant="h5" gutterBottom sx={{ mb: 4, fontWeight: 600 }}>
          {isRTL ? 'معلومات النشاط التجاري' : 'Business Information'}
        </Typography>

        <Grid container spacing={2}>
          {/* All three fields with equal spacing */}
          <Grid size={{ xs: 12, md: 4 }}>
            <motion.div variants={itemVariants}>
              <Controller
                name="businessName"
                control={control}
                rules={{ required: isRTL ? 'اسم النشاط مطلوب' : 'Business name is required' }}
                render={({ field, fieldState: { error } }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label={isRTL ? 'اسم النشاط التجاري' : 'Business Name'}
                    variant="outlined"
                    error={!!error}
                    helperText={error?.message}
                    InputProps={{
                      startAdornment: (
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                          <BusinessIcon sx={{ color: theme.palette.primary.main }} />
                        </Box>
                      ),
                      sx: {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: alpha(theme.palette.primary.main, 0.3),
                        },
                        '& .MuiOutlinedInput-input': {
                          paddingLeft: 0,
                        }
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                        },
                      },
                    }}
                  />
                )}
              />
            </motion.div>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <motion.div variants={itemVariants}>
              <Controller
                name="businessType"
                control={control}
                rules={{ required: isRTL ? 'نوع النشاط مطلوب' : 'Business type is required' }}
                render={({ field, fieldState: { error } }) => (
                  <FormControl fullWidth error={!!error}>
                    <InputLabel>{isRTL ? 'نوع النشاط' : 'Business Type'}</InputLabel>
                    <Select
                      {...field}
                      label={isRTL ? 'نوع النشاط' : 'Business Type'}
                      startAdornment={
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                          <CategoryIcon sx={{ color: theme.palette.primary.main }} />
                        </Box>
                      }
                      sx={{
                        '& .MuiSelect-select': {
                          paddingLeft: 0,
                          display: 'flex',
                          alignItems: 'center',
                        }
                      }}
                    >
                      {businessTypes.map((type) => (
                        <MenuItem key={type.id} value={type.id}>
                          {isRTL ? type.nameAr : type.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {error && <FormHelperText>{error.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </motion.div>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <motion.div variants={itemVariants}>
              <Controller
                name="ownerPosition"
                control={control}
                rules={{ required: isRTL ? 'المنصب مطلوب' : 'Position is required' }}
                render={({ field, fieldState: { error } }) => (
                  <FormControl fullWidth error={!!error}>
                    <InputLabel>{isRTL ? 'منصبك' : 'Your Position'}</InputLabel>
                    <Select
                      {...field}
                      label={isRTL ? 'منصبك' : 'Your Position'}
                      startAdornment={
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                          <PersonIcon sx={{ color: theme.palette.primary.main }} />
                        </Box>
                      }
                      sx={{
                        '& .MuiSelect-select': {
                          paddingLeft: 0,
                          display: 'flex',
                          alignItems: 'center',
                        }
                      }}
                    >
                      {positions.map((position) => (
                        <MenuItem key={position.id} value={position.id}>
                          {isRTL ? position.nameAr : position.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {error && <FormHelperText>{error.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </motion.div>
          </Grid>

        </Grid>

        {/* Services Section - After all other fields */}
        {selectedBusinessType && (
          <motion.div variants={itemVariants}>
            <Box sx={{ mt: 4 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <LocalOfferIcon sx={{ color: theme.palette.primary.main }} />
                <Typography variant="h6">
                  {isRTL ? 'الخدمات الرئيسية' : 'Main Services'}
                </Typography>
              </Stack>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {isRTL 
                  ? 'اختر الخدمات التي تقدمها في نشاطك' 
                  : 'Select the services you offer in your business'}
              </Typography>

              <Controller
                name="mainServices"
                control={control}
                rules={{ 
                  validate: (value) => 
                    value && value.length > 0 
                      ? true 
                      : isRTL ? 'يجب اختيار خدمة واحدة على الأقل' : 'Please select at least one service' 
                }}
                render={({ fieldState: { error } }) => (
                  <>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {availableServices.map((service) => (
                        <motion.div
                          key={service.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Chip
                            label={isRTL ? service.nameAr : service.name}
                            onClick={() => handleServiceToggle(service.id)}
                            color={selectedServices.includes(service.id) ? 'primary' : 'default'}
                            variant={selectedServices.includes(service.id) ? 'filled' : 'outlined'}
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              ...(selectedServices.includes(service.id) && {
                                background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                                color: 'white',
                              }),
                            }}
                          />
                        </motion.div>
                      ))}
                    </Box>
                    {error && (
                      <FormHelperText error sx={{ mt: 1 }}>
                        {error.message}
                      </FormHelperText>
                    )}
                  </>
                )}
              />
            </Box>
          </motion.div>
        )}
      </Box>
    </motion.div>
  );
};

export default BusinessInfo;