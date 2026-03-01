import React from 'react';
import {
  Box,
  Typography,
  Slider,
  Card,
  CardContent,
  useTheme,
  alpha,
  Stack,
  Chip,
  Paper,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useFormContext, Controller } from 'react-hook-form';
import type { CompanySetupData } from '../../types';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import Groups2Icon from '@mui/icons-material/Groups2';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';

interface TeamSizeInfo {
  range: string;
  rangeAr: string;
  icon: React.ReactElement;
  description: string;
  descriptionAr: string;
  color: string;
  gradient: string;
}

const getTeamSizeInfo = (size: number): TeamSizeInfo => {
  if (size === 1) {
    return {
      range: 'Solo',
      rangeAr: 'فردي',
      icon: <PersonIcon sx={{ fontSize: 48 }} />,
      description: 'Just you running the business',
      descriptionAr: 'أنت فقط تدير النشاط',
      color: '#8B5CF6',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    };
  } else if (size <= 5) {
    return {
      range: '2-5 employees',
      rangeAr: '2-5 موظفين',
      icon: <GroupIcon sx={{ fontSize: 48 }} />,
      description: 'Small team',
      descriptionAr: 'فريق صغير',
      color: '#3B82F6',
      gradient: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
    };
  } else if (size <= 10) {
    return {
      range: '6-10 employees',
      rangeAr: '6-10 موظفين',
      icon: <Groups2Icon sx={{ fontSize: 48 }} />,
      description: 'Growing team',
      descriptionAr: 'فريق متنامي',
      color: '#10B981',
      gradient: 'linear-gradient(135deg, #10B981 0%, #84CC16 100%)',
    };
  } else {
    return {
      range: '11+ employees',
      rangeAr: '11+ موظف',
      icon: <CorporateFareIcon sx={{ fontSize: 48 }} />,
      description: 'Established business',
      descriptionAr: 'نشاط تجاري راسخ',
      color: '#F97316',
      gradient: 'linear-gradient(135deg, #F97316 0%, #F59E0B 100%)',
    };
  }
};

const TeamSizeStep: React.FC = () => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const { control, watch } = useFormContext<CompanySetupData>();
  
  const employeeCount = watch('employeeCount') || 1;
  const teamInfo = getTeamSizeInfo(employeeCount);

  const marks = [
    { value: 1, label: '1' },
    { value: 5, label: '5' },
    { value: 10, label: '10' },
    { value: 15, label: '15' },
    { value: 20, label: '20+' },
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
          <GroupIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {isRTL ? 'حجم فريق العمل' : 'Team Size'}
          </Typography>
        </Stack>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          {isRTL 
            ? 'كم عدد الأشخاص الذين يعملون في نشاطك التجاري؟' 
            : 'How many people work in your business?'}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
          <Box sx={{ flex: { md: '0 0 50%' } }}>
            <motion.div variants={itemVariants}>
              <Card
                sx={{
                  height: '100%',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  color: 'white',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease',
                }}
              >
                <CardContent sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  zIndex: 1,
                  position: 'relative',
                }}>
                  <Box sx={{ transition: 'transform 0.3s ease' }}>
                    {teamInfo.icon}
                  </Box>
                  
                  <Typography variant="h3" sx={{ mt: 2, mb: 1, fontWeight: 700 }}>
                    {employeeCount}
                  </Typography>
                  
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    {isRTL ? teamInfo.rangeAr : teamInfo.range}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {isRTL ? teamInfo.descriptionAr : teamInfo.description}
                  </Typography>
                </CardContent>

                {/* Background decoration */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: -50,
                    right: -50,
                    width: 200,
                    height: 200,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    pointerEvents: 'none',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: -30,
                    left: -30,
                    width: 150,
                    height: 150,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    pointerEvents: 'none',
                  }}
                />
              </Card>
            </motion.div>
          </Box>

          <Box sx={{ flex: { md: '0 0 50%' } }}>
            <motion.div variants={itemVariants}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  height: '100%',
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
                  {isRTL ? 'اختر عدد الموظفين' : 'Select Number of Employees'}
                </Typography>

                <Controller
                  name="employeeCount"
                  control={control}
                  rules={{ required: true, min: 1, max: 20 }}
                  render={({ field }) => (
                    <Box sx={{ px: 2 }}>
                      <Slider
                        {...field}
                        min={1}
                        max={20}
                        marks={marks}
                        valueLabelDisplay="auto"
                        step={1}
                        sx={{
                          '& .MuiSlider-valueLabel': {
                            background: theme.palette.primary.main,
                            transition: 'none',
                          },
                          '& .MuiSlider-track': {
                            background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                            transition: 'none',
                          },
                          '& .MuiSlider-thumb': {
                            backgroundColor: theme.palette.primary.main,
                            width: 24,
                            height: 24,
                            transition: 'box-shadow 0.3s ease',
                            '&:hover': {
                              boxShadow: `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`,
                            },
                            '&.Mui-active': {
                              boxShadow: `0 0 0 12px ${alpha(theme.palette.primary.main, 0.16)}`,
                            },
                          },
                          '& .MuiSlider-mark': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.3),
                          },
                          '& .MuiSlider-markLabel': {
                            color: theme.palette.text.secondary,
                          },
                        }}
                      />
                    </Box>
                  )}
                />

                <Box sx={{ mt: 4 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {isRTL ? 'المزايا المتاحة:' : 'Available features:'}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip 
                      label={isRTL ? 'إدارة المواعيد' : 'Appointment Management'} 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                    <Chip 
                      label={isRTL ? 'تقارير الأداء' : 'Performance Reports'} 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                    <Chip 
                      label={isRTL ? 'إدارة العملاء' : 'Customer Management'} 
                      size="small" 
                      sx={{ mt: 1 }}
                    />
                    {employeeCount > 5 && (
                      <Chip 
                        label={isRTL ? 'إدارة الفرق' : 'Team Management'} 
                        size="small" 
                        color="primary"
                        sx={{ mt: 1 }}
                      />
                    )}
                  </Stack>
                </Box>
              </Paper>
            </motion.div>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
};

export default TeamSizeStep;