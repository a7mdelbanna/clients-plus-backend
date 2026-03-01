import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  useTheme,
  alpha,
  Stack,
  Radio,
  Chip,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useFormContext, Controller } from 'react-hook-form';
import type { CompanySetupData } from '../../types';
import { businessThemes } from '../../themes';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ThemeSelector: React.FC = () => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const { control, watch } = useFormContext<CompanySetupData>();
  
  const selectedThemeId = watch('themeId');

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

  const PreviewCard = ({ themeOption, isSelected }: { themeOption: typeof businessThemes[0], isSelected: boolean }) => (
    <Card
      sx={{
        height: '100%',
        border: `2px solid ${isSelected ? themeOption.primary : 'transparent'}`,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 30px ${alpha(themeOption.primary, 0.3)}`,
        },
      }}
    >
      <CardActionArea sx={{ height: '100%' }}>
        <CardContent sx={{ height: '100%', p: 0 }}>
          {/* Theme Preview Header */}
          <Box
            sx={{
              height: 120,
              background: `linear-gradient(135deg, ${themeOption.primary} 0%, ${themeOption.secondary} 100%)`,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Mock UI Elements */}
            <Box sx={{ position: 'absolute', top: 16, left: 16, right: 16 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ width: 80, height: 8, bgcolor: 'rgba(255,255,255,0.3)', borderRadius: 1 }} />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, bgcolor: 'rgba(255,255,255,0.3)', borderRadius: '50%' }} />
                  <Box sx={{ width: 8, height: 8, bgcolor: 'rgba(255,255,255,0.3)', borderRadius: '50%' }} />
                  <Box sx={{ width: 8, height: 8, bgcolor: 'rgba(255,255,255,0.3)', borderRadius: '50%' }} />
                </Box>
              </Box>
            </Box>

            {/* Theme Name */}
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, textAlign: 'center' }}>
              {isRTL ? themeOption.nameAr : themeOption.name}
            </Typography>

            {/* Selection Indicator */}
            {isSelected && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'white',
                  borderRadius: '50%',
                  p: 0.5,
                }}
              >
                <CheckCircleIcon sx={{ color: themeOption.primary, fontSize: 24 }} />
              </Box>
            )}
          </Box>

          {/* Theme Details */}
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isRTL ? themeOption.descriptionAr : themeOption.description}
            </Typography>

            {/* Color Swatches */}
            <Stack direction="row" spacing={1}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: themeOption.primary,
                  border: '2px solid white',
                  boxShadow: 1,
                }}
              />
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  bgcolor: themeOption.secondary,
                  border: '2px solid white',
                  boxShadow: 1,
                }}
              />
            </Stack>

            {/* Mock Buttons */}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Box
                sx={{
                  flex: 1,
                  py: 1,
                  px: 2,
                  borderRadius: 1,
                  background: `linear-gradient(45deg, ${themeOption.primary} 30%, ${themeOption.secondary} 90%)`,
                  color: 'white',
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                {isRTL ? 'زر رئيسي' : 'Primary'}
              </Box>
              <Box
                sx={{
                  flex: 1,
                  py: 1,
                  px: 2,
                  borderRadius: 1,
                  border: `1px solid ${themeOption.primary}`,
                  color: themeOption.primary,
                  fontSize: 12,
                  textAlign: 'center',
                }}
              >
                {isRTL ? 'زر ثانوي' : 'Secondary'}
              </Box>
            </Stack>
          </Box>
        </CardContent>
      </CardActionArea>
      
      {/* Hidden Radio for form control */}
      <Radio
        checked={isSelected}
        sx={{ display: 'none' }}
      />
    </Card>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <PaletteIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {isRTL ? 'اختر تصميم نشاطك' : 'Choose Your Theme'}
          </Typography>
        </Stack>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {isRTL 
            ? 'اختر التصميم الذي يناسب هوية نشاطك التجاري' 
            : 'Select a theme that matches your business identity'}
        </Typography>

        <Controller
          name="themeId"
          control={control}
          rules={{ required: isRTL ? 'يجب اختيار تصميم' : 'Please select a theme' }}
          render={({ field }) => (
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 3,
              '& > *': {
                flex: { xs: '0 0 100%', sm: '0 0 calc(50% - 12px)', md: '0 0 calc(33.333% - 16px)' }
              }
            }}>
              {businessThemes.map((themeOption) => (
                <motion.div
                  key={themeOption.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => field.onChange(themeOption.id)}
                >
                  <PreviewCard 
                    themeOption={themeOption} 
                    isSelected={field.value === themeOption.id}
                  />
                </motion.div>
              ))}
            </Box>
          )}
        />

        <Box sx={{ mt: 4, p: 3, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Chip 
              label={isRTL ? 'نصيحة' : 'Tip'} 
              size="small" 
              color="primary"
              sx={{ fontWeight: 600 }}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {isRTL 
              ? 'يمكنك تغيير التصميم في أي وقت من إعدادات الحساب بعد إكمال الإعداد' 
              : 'You can change your theme anytime from account settings after completing the setup'}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
};

export default ThemeSelector;