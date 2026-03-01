import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Stack,
  useTheme,
  alpha,
  Paper,
  Avatar,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useFormContext } from 'react-hook-form';
import type { CompanySetupData } from '../../types';
import { businessTypes, positions } from '../../types';
import { businessThemes } from '../../themes';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupIcon from '@mui/icons-material/Group';
import PaletteIcon from '@mui/icons-material/Palette';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import HomeIcon from '@mui/icons-material/Home';

const ReviewStep: React.FC = () => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const { watch } = useFormContext<CompanySetupData>();
  
  const formData = watch();
  const selectedBusinessType = businessTypes.find(bt => bt.id === formData.businessType);
  const selectedTheme = businessThemes.find(t => t.id === formData.themeId);
  const selectedPosition = positions.find(p => p.id === formData.ownerPosition);
  const selectedServices = selectedBusinessType?.services.filter(s => 
    formData.mainServices?.includes(s.id)
  ) || [];

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
  };

  const SectionCard = ({ 
    icon, 
    title, 
    children 
  }: { 
    icon: React.ReactElement; 
    title: string; 
    children: React.ReactNode;
  }) => (
    <Card
      sx={{
        height: '100%',
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
        </Stack>
        <Box sx={{ flex: 1 }}>
          {children}
        </Box>
      </CardContent>
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
          <CheckCircleIcon sx={{ fontSize: 32, color: theme.palette.success.main }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {isRTL ? 'مراجعة البيانات' : 'Review Your Information'}
          </Typography>
        </Stack>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {isRTL 
            ? 'تأكد من صحة جميع البيانات قبل إنهاء الإعداد' 
            : 'Please review all information before completing the setup'}
        </Typography>

        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 3,
          '& > *': {
            flex: { xs: '0 0 100%', md: '0 0 calc(50% - 12px)' }
          }
        }}>
          {/* Business Information */}
          <motion.div variants={itemVariants}>
            <SectionCard
              icon={<BusinessIcon sx={{ color: theme.palette.primary.main }} />}
              title={isRTL ? 'معلومات النشاط' : 'Business Information'}
            >
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <BusinessIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={isRTL ? 'اسم النشاط' : 'Business Name'}
                      secondary={formData.businessName}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <LocalOfferIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={isRTL ? 'نوع النشاط' : 'Business Type'}
                      secondary={isRTL ? selectedBusinessType?.nameAr : selectedBusinessType?.name}
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <PersonIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={isRTL ? 'المنصب' : 'Position'}
                      secondary={isRTL ? selectedPosition?.nameAr : selectedPosition?.name}
                    />
                  </ListItem>
                </List>

                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  {isRTL ? 'الخدمات المختارة' : 'Selected Services'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {selectedServices.map((service) => (
                    <Chip
                      key={service.id}
                      label={isRTL ? service.nameAr : service.name}
                      size="small"
                      sx={{
                        background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                        color: 'white',
                      }}
                    />
                  ))}
                </Box>
              </SectionCard>
          </motion.div>

          {/* Branches */}
          <motion.div variants={itemVariants}>
            <SectionCard
                icon={<LocationOnIcon sx={{ color: theme.palette.primary.main }} />}
                title={isRTL ? 'الفروع' : 'Branches'}
              >
                <Stack spacing={2}>
                  {formData.branches?.map((branch, index) => (
                    <Paper
                      key={branch.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <HomeIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {branch.name}
                        </Typography>
                        {branch.isMain && (
                          <Chip 
                            label={isRTL ? 'رئيسي' : 'Main'} 
                            size="small" 
                            color="primary"
                          />
                        )}
                      </Stack>
                      
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {branch.address}
                          </Typography>
                        </Stack>
                        
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {branch.phone}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </SectionCard>
          </motion.div>

          {/* Team Size */}
          <motion.div variants={itemVariants}>
            <SectionCard
                icon={<GroupIcon sx={{ color: theme.palette.primary.main }} />}
                title={isRTL ? 'حجم الفريق' : 'Team Size'}
              >
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Avatar
                    sx={{
                      width: 80,
                      height: 80,
                      mx: 'auto',
                      mb: 2,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                    }}
                  >
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                      {formData.employeeCount}
                    </Typography>
                  </Avatar>
                  <Typography variant="body1">
                    {formData.employeeCount === 1
                      ? (isRTL ? 'عمل فردي' : 'Solo')
                      : (isRTL ? `${formData.employeeCount} موظفين` : `${formData.employeeCount} employees`)}
                  </Typography>
                </Box>
              </SectionCard>
          </motion.div>

          {/* Theme */}
          <motion.div variants={itemVariants}>
            <SectionCard
                icon={<PaletteIcon sx={{ color: theme.palette.primary.main }} />}
                title={isRTL ? 'التصميم المختار' : 'Selected Theme'}
              >
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Box
                    sx={{
                      width: 120,
                      height: 80,
                      mx: 'auto',
                      mb: 2,
                      borderRadius: 2,
                      background: `linear-gradient(135deg, ${selectedTheme?.primary} 0%, ${selectedTheme?.secondary} 100%)`,
                      boxShadow: 3,
                    }}
                  />
                  <Typography variant="h6" gutterBottom>
                    {isRTL ? selectedTheme?.nameAr : selectedTheme?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? selectedTheme?.descriptionAr : selectedTheme?.description}
                  </Typography>
                </Box>
              </SectionCard>
          </motion.div>
        </Box>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Paper
            sx={{
              mt: 4,
              p: 3,
              bgcolor: alpha(theme.palette.success.main, 0.05),
              border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <CheckCircleIcon sx={{ color: theme.palette.success.main, fontSize: 32 }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                  {isRTL ? 'كل شيء جاهز!' : 'Everything looks good!'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isRTL 
                    ? 'اضغط على "إنهاء الإعداد" لحفظ البيانات والبدء في استخدام النظام' 
                    : 'Click "Complete Setup" to save your information and start using the system'}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </motion.div>
      </Box>
    </motion.div>
  );
};

export default ReviewStep;