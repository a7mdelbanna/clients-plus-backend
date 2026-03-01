import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Chip,
  Alert,
  Stack,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import type { CompanySetupData } from '../../types';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import HomeIcon from '@mui/icons-material/Home';
import StorefrontIcon from '@mui/icons-material/Storefront';

const LocationsStep: React.FC = () => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const { control } = useFormContext<CompanySetupData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'branches',
  });

  const handleAddBranch = () => {
    if (fields.length < 2) {
      append({
        id: Date.now().toString(),
        name: '',
        address: '',
        phone: '',
        isMain: false,
      });
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
    hidden: { opacity: 0, x: isRTL ? 50 : -50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: isRTL ? -50 : 50 },
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <StorefrontIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {isRTL ? 'مواقع الفروع' : 'Branch Locations'}
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 3 }}>
        {isRTL 
          ? 'يمكنك إضافة فرعين كحد أقصى في الفترة التجريبية' 
          : 'You can add up to 2 branches during the trial period'}
      </Alert>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {fields.map((field, index) => (
            <motion.div
              key={field.id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
              transition={{ duration: 0.3 }}
            >
              <Card
                sx={{
                  mb: 3,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.2)}`,
                  },
                }}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <HomeIcon sx={{ color: theme.palette.primary.main }} />
                      <Typography variant="h6">
                        {isRTL ? `الفرع ${index + 1}` : `Branch ${index + 1}`}
                      </Typography>
                      {field.isMain && (
                        <Chip
                          label={isRTL ? 'الفرع الرئيسي' : 'Main Branch'}
                          size="small"
                          color="primary"
                          sx={{
                            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                            color: 'white',
                          }}
                        />
                      )}
                    </Stack>
                    
                    {!field.isMain && (
                      <Tooltip title={isRTL ? 'حذف الفرع' : 'Delete Branch'}>
                        <IconButton
                          onClick={() => remove(index)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>

                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: { md: '0 0 25%' } }}>
                      <Controller
                        name={`branches.${index}.name`}
                        control={control}
                        rules={{ required: isRTL ? 'اسم الفرع مطلوب' : 'Branch name is required' }}
                        render={({ field, fieldState: { error } }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label={isRTL ? 'اسم الفرع' : 'Branch Name'}
                            variant="outlined"
                            error={!!error}
                            helperText={error?.message}
                            InputProps={{
                              startAdornment: (
                                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                                  <StorefrontIcon sx={{ color: theme.palette.primary.main }} />
                                </Box>
                              ),
                              sx: {
                                '& .MuiOutlinedInput-input': {
                                  paddingLeft: 0,
                                }
                              }
                            }}
                          />
                        )}
                      />
                    </Box>

                    <Box sx={{ flex: { md: '0 0 50%' } }}>
                      <Controller
                        name={`branches.${index}.address`}
                        control={control}
                        rules={{ required: isRTL ? 'العنوان مطلوب' : 'Address is required' }}
                        render={({ field, fieldState: { error } }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label={isRTL ? 'العنوان' : 'Address'}
                            variant="outlined"
                            error={!!error}
                            helperText={error?.message}
                            placeholder={isRTL ? 'العنوان الكامل للفرع' : 'Full branch address'}
                            InputProps={{
                              startAdornment: (
                                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                                  <LocationOnIcon sx={{ color: theme.palette.primary.main }} />
                                </Box>
                              ),
                              sx: {
                                '& .MuiOutlinedInput-input': {
                                  paddingLeft: 0,
                                }
                              }
                            }}
                          />
                        )}
                      />
                    </Box>

                    <Box sx={{ flex: { md: '0 0 25%' } }}>
                      <Controller
                        name={`branches.${index}.phone`}
                        control={control}
                        rules={{ 
                          required: isRTL ? 'رقم الهاتف مطلوب' : 'Phone number is required',
                          minLength: {
                            value: 10,
                            message: isRTL ? 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل' : 'Phone must be at least 10 digits'
                          }
                        }}
                        render={({ field, fieldState: { error } }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label={isRTL ? 'رقم الهاتف' : 'Phone Number'}
                            variant="outlined"
                            error={!!error}
                            helperText={error?.message}
                            InputProps={{
                              startAdornment: (
                                <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                                  <PhoneIcon sx={{ color: theme.palette.primary.main }} />
                                </Box>
                              ),
                              sx: {
                                '& .MuiOutlinedInput-input': {
                                  paddingLeft: 0,
                                }
                              }
                            }}
                          />
                        )}
                      />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {fields.length < 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddBranch}
            fullWidth
            size="large"
            sx={{
              borderStyle: 'dashed',
              borderWidth: 2,
              py: 2,
              transition: 'all 0.3s ease',
              '&:hover': {
                borderStyle: 'solid',
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
              },
            }}
          >
            {isRTL ? 'إضافة فرع آخر' : 'Add Another Branch'}
          </Button>
        </motion.div>
      )}
    </Box>
  );
};

export default LocationsStep;