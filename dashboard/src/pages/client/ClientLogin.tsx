import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  InputAdornment,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import { Phone, ArrowForward } from '@mui/icons-material';
import { useClientAuth } from '../../contexts/ClientAuthContext';

const ClientLogin: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login } = useClientAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Handle Egyptian phone numbers
    if (digits.startsWith('20')) {
      // Already has country code
      return '+' + digits;
    } else if (digits.startsWith('0')) {
      // Local format, add country code
      return '+20' + digits.substring(1);
    } else if (digits.length === 10) {
      // Just the number without 0, add country code
      return '+20' + digits;
    }
    
    return digits;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and + at the beginning
    if (/^[+]?\d*$/.test(value) || value === '') {
      setPhoneNumber(value);
      setError('');
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const formatted = formatPhoneNumber(phone);
    // Egyptian phone number validation
    const egyptianPhoneRegex = /^\+20(10|11|12|15)\d{8}$/;
    return egyptianPhoneRegex.test(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhoneNumber(phoneNumber)) {
      setError('رقم الهاتف غير صحيح');
      return;
    }

    setLoading(true);
    setError('');

    const formattedPhone = formatPhoneNumber(phoneNumber);
    const result = await login(formattedPhone);

    if (result.success) {
      // Navigate to OTP verification
      navigate('/client/verify', { state: { phoneNumber: formattedPhone } });
    } else {
      setError(result.message || 'حدث خطأ في إرسال رمز التحقق');
    }

    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={3}
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            borderRadius: 2,
            textAlign: 'center',
          }}
        >
          {/* Logo/Title */}
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ 
              fontWeight: 'bold',
              color: theme.palette.primary.main,
              mb: 1,
            }}
          >
            بوابة العملاء
          </Typography>
          
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            أدخل رقم هاتفك للوصول إلى مواعيدك
          </Typography>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="01234567890"
              value={phoneNumber}
              onChange={handlePhoneChange}
              disabled={loading}
              error={!!error}
              helperText={error}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone />
                  </InputAdornment>
                ),
                sx: {
                  '& input': {
                    textAlign: 'left',
                    direction: 'ltr',
                  },
                },
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || !phoneNumber}
              endIcon={loading ? null : <ArrowForward />}
              sx={{
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'إرسال رمز التحقق'
              )}
            </Button>
          </form>

          {/* Help Text */}
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 3 }}
          >
            سيتم إرسال رمز تحقق إلى رقم هاتفك عبر رسالة نصية
          </Typography>

          {/* Development Mode Notice */}
          {process.env.NODE_ENV === 'development' && (
            <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
              <Typography variant="caption">
                Development Mode: Use OTP "123456" for testing
              </Typography>
            </Alert>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default ClientLogin;