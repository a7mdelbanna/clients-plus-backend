import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Box, Typography, CircularProgress, Paper, Alert, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import arSA from 'date-fns/locale/ar-SA';
import enUS from 'date-fns/locale/en-US';
import { bookingService } from '../../services/booking.service';
import type { BookingLink } from '../../services/bookingLink.service';

// Import booking components from booking app
import BranchSelection from '../../../booking-app/src/components/BranchSelection';
import ServiceSelection from '../../../booking-app/src/components/ServiceSelection';
import StaffSelection from '../../../booking-app/src/components/StaffSelection';
import DateTimeSelection from '../../../booking-app/src/components/DateTimeSelection';
import CustomerForm from '../../../booking-app/src/components/CustomerForm';
import BookingConfirmation from '../../../booking-app/src/components/BookingConfirmation';
import BookingStepper from '../../../booking-app/src/components/BookingStepper';
import LanguageToggle from '../../../booking-app/src/components/LanguageToggle';
import { BookingProvider } from '../../../booking-app/src/contexts/BookingContext';
import { LanguageProvider } from '../../../booking-app/src/contexts/LanguageContext';

const PublicBookingPage: React.FC = () => {
  const { companySlug, linkSlug } = useParams<{ companySlug: string; linkSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkData, setLinkData] = useState<BookingLink | null>(null);
  const [language, setLanguage] = useState('ar');
  const [currentStep, setCurrentStep] = useState(0);

  const theme = React.useMemo(
    () =>
      createTheme({
        direction: language === 'ar' ? 'rtl' : 'ltr',
        typography: {
          fontFamily: language === 'ar' ? 'Tajawal, Arial, sans-serif' : 'Roboto, Arial, sans-serif',
        },
        palette: {
          primary: {
            main: linkData?.settings?.primaryColor || '#FF6B00',
          },
          secondary: {
            main: '#1976d2',
          },
          mode: linkData?.settings?.theme || 'light',
        },
      }),
    [language, linkData]
  );

  const dateLocale = language === 'ar' ? arSA : enUS;

  useEffect(() => {
    document.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    loadBookingLink();
  }, [companySlug, linkSlug]);

  const loadBookingLink = async () => {
    console.log('Loading booking link:', { companySlug, linkSlug });
    
    if (!companySlug || !linkSlug) {
      setError('invalid_link');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const link = await bookingService.getPublicBookingLink(companySlug, linkSlug);
      console.log('Booking link loaded:', link);
      
      if (!link || !link.isActive) {
        setError('link_not_found');
        setLoading(false);
        return;
      }

      setLinkData(link);
      setLanguage(link.settings.defaultLanguage || 'ar');
      
      // Track view
      await bookingService.trackLinkView(link.id!);

      setLoading(false);
    } catch (err) {
      console.error('Error loading booking link:', err);
      setError('error');
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    if (!linkData) return null;

    const needsBranchSelection = linkData.branchSettings?.mode === 'multi' || 
      (linkData.branchSettings?.allowedBranches && linkData.branchSettings.allowedBranches.length > 1);

    // Adjust step index if branch selection is not needed
    const adjustedStep = needsBranchSelection ? currentStep : currentStep + 1;

    switch (adjustedStep) {
      case 0:
        return <BranchSelection />;
      case 1:
        return <ServiceSelection />;
      case 2:
        return <StaffSelection />;
      case 3:
        return <DateTimeSelection />;
      case 4:
        return <CustomerForm />;
      case 5:
        return <BookingConfirmation />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          <Typography variant="h6" gutterBottom>
            {error === 'invalid_link' ? 'رابط غير صالح' : error === 'link_not_found' ? 'الرابط غير موجود أو غير نشط' : 'حدث خطأ'}
          </Typography>
          <Typography>
            {error === 'invalid_link' 
              ? 'الرابط الذي تحاول الوصول إليه غير صحيح'
              : error === 'link_not_found'
              ? 'لا يمكن العثور على رابط الحجز أو قد يكون غير نشط'
              : 'حدث خطأ أثناء تحميل صفحة الحجز'}
          </Typography>
        </Alert>
      </Box>
    );
  }

  return (
    <LanguageProvider>
      <BookingProvider>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={dateLocale}>
            <CssBaseline />
            <Box
              sx={{
                minHeight: '100vh',
                bgcolor: linkData?.settings.theme === 'dark' ? 'grey.900' : 'grey.50',
                py: { xs: 2, md: 4 },
              }}
            >
              <Container maxWidth="md">
                {/* Header */}
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <LanguageToggle />
                  </Box>
                  
                  {linkData?.settings.logoUrl && (
                    <Box sx={{ mb: 2 }}>
                      <img
                        src={linkData.settings.logoUrl}
                        alt="Logo"
                        style={{ maxHeight: 80, maxWidth: 200 }}
                      />
                    </Box>
                  )}
                  
                  <Typography variant="h4" component="h1" gutterBottom>
                    {language === 'ar' ? 'احجز موعدك' : 'Book Your Appointment'}
                  </Typography>
                  
                  {linkData?.description && (
                    <Typography variant="body1" color="textSecondary">
                      {linkData.description}
                    </Typography>
                  )}
                </Box>

                {/* Stepper */}
                <Box sx={{ mb: 4 }}>
                  <BookingStepper />
                </Box>

                {/* Content */}
                <Paper
                  elevation={3}
                  sx={{
                    p: { xs: 2, md: 4 },
                    borderRadius: 2,
                    bgcolor: linkData?.settings.theme === 'dark' ? 'grey.800' : 'background.paper',
                  }}
                >
                  {renderStepContent()}
                </Paper>
              </Container>
            </Box>
          </LocalizationProvider>
        </ThemeProvider>
      </BookingProvider>
    </LanguageProvider>
  );
};

export default PublicBookingPage;