import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import { ArrowBack, Refresh } from '@mui/icons-material';
import { useClientAuth } from '../../contexts/ClientAuthContext';

const ClientVerify: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOTP, login } = useClientAuth();
  
  const phoneNumber = location.state?.phoneNumber || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phoneNumber) {
      navigate('/client/login');
    }
  }, [phoneNumber, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Auto-focus first input
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only accept numbers
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === 5 && newOtp.every(digit => digit)) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
    
    if (digits.length === 6) {
      const newOtp = digits.split('');
      setOtp(newOtp);
      handleVerify(digits);
    }
  };

  const handleVerify = async (otpString?: string) => {
    const code = otpString || otp.join('');
    
    if (code.length !== 6) {
      setError('يجب إدخال رمز مكون من 6 أرقام');
      return;
    }

    setLoading(true);
    setError('');

    const result = await verifyOTP(code);

    if (result.success) {
      navigate('/client/dashboard');
    } else {
      setError(result.message || 'رمز التحقق غير صحيح');
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }

    setLoading(false);
  };

  const handleResend = async () => {
    setCanResend(false);
    setResendTimer(60);
    setError('');
    
    const result = await login(phoneNumber);
    if (!result.success) {
      setError(result.message || 'فشل إعادة إرسال الرمز');
    }
  };

  const maskPhoneNumber = (phone: string) => {
    if (phone.length < 4) return phone;
    const lastFour = phone.slice(-4);
    const masked = phone.slice(0, -4).replace(/\d/g, '*');
    return masked + lastFour;
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
          {/* Back Button */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/client/login')}
              sx={{ color: 'text.secondary' }}
            >
              رجوع
            </Button>
          </Box>

          {/* Title */}
          <Typography
            variant="h5"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 'bold', mb: 1 }}
          >
            أدخل رمز التحقق
          </Typography>
          
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            تم إرسال رمز التحقق إلى
            <br />
            <Box component="span" sx={{ fontWeight: 'bold', direction: 'ltr' }}>
              {maskPhoneNumber(phoneNumber)}
            </Box>
          </Typography>

          {/* OTP Input */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              gap: 1.5,
              mb: 3,
              direction: 'ltr',
            }}
          >
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                disabled={loading}
                style={{
                  width: '50px',
                  height: '50px',
                  textAlign: 'center',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  border: `2px solid ${error ? '#f44336' : theme.palette.divider}`,
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  backgroundColor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.palette.primary.main;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? '#f44336' : theme.palette.divider;
                }}
              />
            ))}
          </Box>

          {/* Error Message */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Verify Button */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={() => handleVerify()}
            disabled={loading || otp.some(d => !d)}
            sx={{
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              mb: 3,
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'تحقق'
            )}
          </Button>

          {/* Resend Code */}
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {canResend ? (
              <Button
                startIcon={<Refresh />}
                onClick={handleResend}
                sx={{ color: 'primary.main' }}
              >
                إعادة إرسال الرمز
              </Button>
            ) : (
              <Typography variant="body2" color="text.secondary">
                يمكنك إعادة إرسال الرمز بعد {resendTimer} ثانية
              </Typography>
            )}
          </Box>

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

export default ClientVerify;