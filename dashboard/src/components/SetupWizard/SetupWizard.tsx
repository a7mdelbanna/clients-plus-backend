import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Container,
  useTheme,
  useMediaQuery,
  Stack,
  CircularProgress,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, FormProvider } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { CompanySetupData } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { setupApiService } from '../../services/api/setup.api.service';
import type {
  BusinessInfo as ApiBusinessInfo,
  Branch as ApiBranch,
  TeamInfo as ApiTeamInfo
} from '../../services/api/setup.api.service';
import BusinessInfo from './BusinessInfo';
import LocationsStep from './LocationsStep';
import TeamSizeStep from './TeamSizeStep';
import ThemeSelector from './ThemeSelector';
import ReviewStep from './ReviewStep';
import { businessThemes, defaultTheme } from '../../themes';
import { useThemeMode } from '../../contexts/ThemeContext';

const steps = [
  { label: 'Business Info', labelAr: 'معلومات النشاط' },
  { label: 'Locations', labelAr: 'المواقع' },
  { label: 'Team Size', labelAr: 'حجم الفريق' },
  { label: 'Choose Theme', labelAr: 'اختر التصميم' },
  { label: 'Review', labelAr: 'المراجعة' },
];

// Helper functions to transform data between old and new formats
const transformToBusinessInfo = (data: CompanySetupData): ApiBusinessInfo => ({
  businessName: data.businessName,
  businessType: data.businessType,
  businessCategory: data.businessType, // Use businessType as category for now
  description: '',
  website: '',
  email: '',
  phone: '',
  address: '',
  currency: 'SAR',
  timezone: 'Asia/Riyadh',
  languages: ['ar', 'en']
});

const transformToBranches = (branches: CompanySetupData['branches']): ApiBranch[] => 
  branches.map(branch => ({
    id: branch.id,
    name: branch.name,
    address: branch.address,
    phone: branch.phone,
    isMain: branch.isMain
  }));

const transformToTeamInfo = (employeeCount: number): ApiTeamInfo => {
  // Convert employee count to team size range
  let teamSize: string;
  if (employeeCount === 1) {
    teamSize = '1-5';
  } else if (employeeCount <= 5) {
    teamSize = '1-5';
  } else if (employeeCount <= 20) {
    teamSize = '6-20';
  } else if (employeeCount <= 50) {
    teamSize = '21-50';
  } else if (employeeCount <= 100) {
    teamSize = '51-100';
  } else {
    teamSize = '100+';
  }

  return {
    teamSize,
    members: [],
    roles: [
      {
        id: 'admin',
        name: 'Administrator',
        permissions: ['manage_all']
      },
      {
        id: 'staff',
        name: 'Staff Member', 
        permissions: ['view_appointments', 'manage_own_appointments']
      }
    ]
  };
};

const transformToThemeConfig = (themeId: string): { themeId: string } => ({
  themeId
});

const SetupWizard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isRTL = theme.direction === 'rtl';
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { setCompanyTheme } = useThemeMode();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);

  const methods = useForm<CompanySetupData>({
    defaultValues: {
      businessName: '',
      businessType: '',
      mainServices: [],
      ownerPosition: '',
      branches: [
        {
          id: 'main',
          name: '',
          address: '',
          phone: '',
          isMain: true,
        },
      ],
      employeeCount: 1,
      themeId: defaultTheme.id,
      setupCompleted: false,
    },
  });

  const { handleSubmit, trigger, watch } = methods;
  
  // Watch for theme changes and update in real-time
  const selectedThemeId = watch('themeId');
  
  React.useEffect(() => {
    if (selectedThemeId) {
      setCompanyTheme(selectedThemeId);
    }
  }, [selectedThemeId, setCompanyTheme]);

  // Load setup progress on mount
  React.useEffect(() => {
    const loadSetupProgress = async () => {
      if (!currentUser) {
        setSetupLoading(false);
        return;
      }

      try {
        const progress = await setupApiService.getSetupProgress();
        if (progress && progress.step > 1) {
          setActiveStep(progress.step - 1); // Convert from 1-based to 0-based
          
          // If there's saved data, populate the form
          if (progress.data) {
            // Transform the saved API data back to form data if needed
            const savedData = progress.data;
            if (savedData.businessInfo) {
              methods.setValue('businessName', savedData.businessInfo.businessName);
              methods.setValue('businessType', savedData.businessInfo.businessType);
            }
            if (savedData.branches) {
              methods.setValue('branches', savedData.branches.map((branch: ApiBranch) => ({
                id: branch.id || 'main',
                name: branch.name,
                address: branch.address, 
                phone: branch.phone,
                isMain: branch.isMain
              })));
            }
            if (savedData.theme) {
              methods.setValue('themeId', savedData.theme.id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load setup progress:', error);
        // Continue with default values if loading fails
      } finally {
        setSetupLoading(false);
      }
    };

    loadSetupProgress();
  }, [currentUser, methods]);

  const handleNext = async () => {
    let fieldsToValidate: (keyof CompanySetupData)[] = [];
    
    switch (activeStep) {
      case 0:
        fieldsToValidate = ['businessName', 'businessType', 'mainServices', 'ownerPosition'];
        break;
      case 1:
        fieldsToValidate = ['branches'];
        break;
      case 2:
        fieldsToValidate = ['employeeCount'];
        break;
      case 3:
        fieldsToValidate = ['themeId'];
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    
    if (isValid) {
      // Save current step data to backend before moving to next step
      if (currentUser) {
        try {
          const currentData = methods.getValues();
          
          // Save specific step data to backend
          switch (activeStep) {
            case 0: // Business Info
              const businessInfo = transformToBusinessInfo(currentData);
              await setupApiService.saveBusinessInfo(businessInfo);
              break;
            case 1: // Branches
              const branches = transformToBranches(currentData.branches);
              await setupApiService.saveBranches(branches);
              break;
            case 2: // Team Info (employee count)
              const teamInfo = transformToTeamInfo(currentData.employeeCount);
              await setupApiService.saveTeamInfo(teamInfo);
              break;
            case 3: // Theme
              const themeConfig = transformToThemeConfig(currentData.themeId);
              await setupApiService.saveTheme(themeConfig.themeId);
              break;
          }

          // Also save overall progress
          await setupApiService.saveStepProgress(activeStep + 1, currentData);
          
        } catch (error) {
          console.error('Failed to save step progress:', error);
          // Show error but don't block progression
          toast.warning(
            isRTL 
              ? 'تم حفظ التقدم محلياً فقط. سيتم المحاولة مرة أخرى لاحقاً.'
              : 'Progress saved locally only. Will retry later.'
          );
        }
      }
      
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const onSubmit = async (data: CompanySetupData) => {
    if (!currentUser) {
      toast.error(isRTL ? 'يجب تسجيل الدخول أولاً' : 'You must be logged in');
      return;
    }

    setLoading(true);

    try {
      // Save all remaining data to backend before completing setup
      const businessInfo = transformToBusinessInfo(data);
      const branches = transformToBranches(data.branches);
      const teamInfo = transformToTeamInfo(data.employeeCount);
      
      // Save each step data if not already saved
      try {
        await setupApiService.saveBusinessInfo(businessInfo);
        await setupApiService.saveBranches(branches);
        await setupApiService.saveTeamInfo(teamInfo);
        await setupApiService.saveTheme(data.themeId);
      } catch (saveError) {
        console.warn('Some data may already be saved:', saveError);
        // Continue with completion - data might already be saved from previous steps
      }

      // Complete the setup process
      const result = await setupApiService.completeSetup();
      
      if (result.success) {
        // Mark that setup was just completed
        sessionStorage.setItem('setup-just-completed', 'true');
        
        // Also update the SetupGuard state
        sessionStorage.setItem('setup-completed', 'true');
        
        // Show success message
        toast.success(
          isRTL 
            ? 'تم إعداد حسابك بنجاح! سيتم توجيهك إلى لوحة التحكم...' 
            : 'Your account has been set up successfully! Redirecting to dashboard...'
        );

        // Navigate to dashboard (use redirectUrl from backend if provided)
        const redirectUrl = result.redirectUrl || '/dashboard';
        setTimeout(() => {
          navigate(redirectUrl, { replace: true });
        }, 1000);
      } else {
        throw new Error('Setup completion failed');
      }

    } catch (error) {
      console.error('Setup error:', error);
      
      // Show more specific error messages
      let errorMessage = isRTL 
        ? 'حدث خطأ أثناء إعداد حسابك. يرجى المحاولة مرة أخرى.' 
        : 'An error occurred while setting up your account. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('validation failed')) {
          errorMessage = isRTL 
            ? 'يرجى مراجعة جميع الخطوات والتأكد من اكتمال البيانات.' 
            : 'Please review all steps and ensure all data is complete.';
        } else if (error.message.includes('already completed')) {
          errorMessage = isRTL 
            ? 'تم إعداد الحساب بالفعل.' 
            : 'Setup is already completed.';
        } else if (error.message.includes('Network') || error.name === 'NetworkError') {
          errorMessage = isRTL 
            ? 'خطأ في الاتصال. يرجى التحقق من اتصالك بالإنترنت.' 
            : 'Network error. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, {
        position: 'top-center',
        autoClose: 7000,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <BusinessInfo />;
      case 1:
        return <LocationsStep />;
      case 2:
        return <TeamSizeStep />;
      case 3:
        return <ThemeSelector />;
      case 4:
        return <ReviewStep />;
      default:
        return 'Unknown step';
    }
  };

  const pageVariants = {
    initial: { opacity: 0, x: isRTL ? -50 : 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: isRTL ? 50 : -50 },
  };

  // Show loading while fetching setup progress
  if (setupLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <Stack spacing={2} alignItems="center">
            <CircularProgress size={40} />
            <Typography variant="body1" color="text.secondary">
              {isRTL ? 'جاري تحميل بيانات الإعداد...' : 'Loading setup data...'}
            </Typography>
          </Stack>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography
            variant="h3"
            component="h1"
            align="center"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 4,
            }}
          >
            {isRTL ? 'إعداد حسابك' : 'Setup Your Account'}
          </Typography>
        </motion.div>

        <Paper
          elevation={3}
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: 3,
            background: theme.palette.background.paper,
          }}
        >
          <Stepper 
            activeStep={activeStep} 
            alternativeLabel={!isMobile}
            orientation={isMobile ? 'vertical' : 'horizontal'}
            sx={{ mb: 4 }}
          >
            {steps.map((step, index) => (
              <Step key={index}>
                <StepLabel>
                  <Typography variant="body2">
                    {isRTL ? step.labelAr : step.label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  <Box sx={{ minHeight: 400, mb: 4 }}>
                    {getStepContent(activeStep)}
                  </Box>
                </motion.div>
              </AnimatePresence>

              <Stack
                direction="row"
                spacing={2}
                justifyContent="space-between"
                sx={{ mt: 4 }}
              >
                <Button
                  disabled={activeStep === 0 || loading}
                  onClick={handleBack}
                  variant="outlined"
                  size="large"
                >
                  {isRTL ? 'السابق' : 'Back'}
                </Button>

                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{
                      background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                      color: 'white',
                      px: 4,
                      minWidth: 150,
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} sx={{ color: 'white' }} />
                    ) : (
                      isRTL ? 'إنهاء الإعداد' : 'Complete Setup'
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{
                      background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.secondary.main} 90%)`,
                      color: 'white',
                      px: 4,
                    }}
                  >
                    {isRTL ? 'التالي' : 'Next'}
                  </Button>
                )}
              </Stack>
            </form>
          </FormProvider>
        </Paper>
      </Box>
    </Container>
  );
};

export default SetupWizard;