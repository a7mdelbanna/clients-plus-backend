import React, { useState } from 'react';
import AnimatedBackground from './AnimatedBackground';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { type AxiosError } from 'axios';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  InputAdornment,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Alert,
  Collapse,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Error as ErrorIcon } from '@mui/icons-material';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showError, setShowError] = useState(false);
  const theme = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    defaultValues: {
      rememberMe: false
    }
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      setShowError(false);
      setErrorMessage('');
      await login(data.email, data.password, data.rememberMe);
      toast.success('تم تسجيل الدخول بنجاح!', {
        position: 'top-center',
      });
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      let message = '';
      
      // Handle API error responses
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        switch (status) {
          case 400:
            if (errorData.code === 'INVALID_CREDENTIALS') {
              message = 'بيانات الدخول غير صحيحة. تحقق من البريد الإلكتروني وكلمة المرور.';
            } else if (errorData.code === 'ACCOUNT_NOT_VERIFIED') {
              message = 'حسابك غير مفعل. يرجى تفعيل حسابك من خلال الرابط المرسل إلى بريدك الإلكتروني.';
            } else {
              message = errorData.message || 'بيانات غير صحيحة.';
            }
            break;
          case 401:
            message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
            break;
          case 403:
            if (errorData.code === 'ACCOUNT_SUSPENDED') {
              message = 'هذا الحساب معطل. اتصل بالدعم الفني للمساعدة.';
            } else {
              message = 'ليس لديك صلاحية للوصول.';
            }
            break;
          case 429:
            message = 'تم تجاوز عدد المحاولات المسموح بها. الرجاء المحاولة بعد بضع دقائق.';
            break;
          case 500:
            message = 'خطأ في الخادم. يرجى المحاولة لاحقاً.';
            break;
          default:
            message = errorData.message || 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';
        }
      } else if (error.code === 'ECONNABORTED') {
        message = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
      } else if (!error.response) {
        message = 'خطأ في الاتصال بالشبكة. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.';
      } else {
        message = error.message || 'حدث خطأ غير متوقع. الرجاء المحاولة مرة أخرى.';
      }
      
      setErrorMessage(message);
      setShowError(true);
      
      // Also show toast for immediate feedback
      toast.error(message, {
        position: 'top-center',
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

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
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <>
      <AnimatedBackground />
      <Container component="main" maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          style={{ width: '100%' }}
        >
          <Paper
            elevation={0}
            sx={{
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
              background: theme.palette.mode === 'dark' 
                ? 'rgba(30, 41, 59, 0.8)'
                : 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(10px)',
              border: '1px solid',
              borderColor: theme.palette.mode === 'dark'
                ? 'rgba(139, 92, 246, 0.2)'
                : 'rgba(139, 92, 246, 0.1)',
            }}
          >
            <motion.div variants={itemVariants}>
              <Typography 
                component="h1" 
                variant="h4" 
                sx={{ 
                  mb: 1,
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 700,
                }}
              >
                تسجيل الدخول
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                مرحباً بعودتك إلى Clients+
              </Typography>
            </motion.div>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1, width: '100%' }}>
              <Collapse in={showError}>
                <motion.div variants={itemVariants}>
                  <Alert 
                    severity="error" 
                    sx={{ mb: 2 }}
                    icon={<ErrorIcon />}
                    onClose={() => setShowError(false)}
                  >
                    <Typography variant="body2">
                      {errorMessage}
                    </Typography>
                  </Alert>
                </motion.div>
              </Collapse>
              
              <motion.div variants={itemVariants}>
                <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="البريد الإلكتروني"
              autoComplete="email"
              autoFocus
              {...register('email', {
                required: 'البريد الإلكتروني مطلوب',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'البريد الإلكتروني غير صحيح'
                }
              })}
              error={!!errors.email || (showError && errorMessage.includes('البريد'))}
              helperText={errors.email?.message}
              disabled={loading}
              onFocus={() => setShowError(false)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: 'action.active' }} />
                  </InputAdornment>
                ),
              }}
            />
              </motion.div>

              <motion.div variants={itemVariants}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="كلمة المرور"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  {...register('password', {
                    required: 'كلمة المرور مطلوبة',
                    minLength: {
                      value: 6,
                      message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
                    }
                  })}
                  error={!!errors.password || (showError && errorMessage.includes('كلمة المرور'))}
                  helperText={errors.password?.message}
                  disabled={loading}
                  onFocus={() => setShowError(false)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: 'action.active' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <FormControlLabel
                  control={
                    <Checkbox
                      {...register('rememberMe')}
                      color="primary"
                      disabled={loading}
                    />
                  }
                  label="تذكرني"
                  sx={{ mt: 1, mb: 1 }}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ 
                    mt: 3, 
                    mb: 2,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    position: 'relative',
                    transition: 'all 0.3s ease',
                    '&:disabled': {
                      backgroundColor: theme.palette.action.disabledBackground,
                    },
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    'تسجيل الدخول'
                  )}
                </Button>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  flexWrap: 'wrap',
                  gap: 1,
                  mt: 2,
                }}>
                  <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'primary.main',
                        transition: 'all 0.3s',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      نسيت كلمة المرور؟
                    </Typography>
                  </Link>
                  <Link to="/signup" style={{ textDecoration: 'none' }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'primary.main',
                        transition: 'all 0.3s',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      ليس لديك حساب؟ سجل الآن
                    </Typography>
                  </Link>
                </Box>
              </motion.div>
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Container>
    </>
  );
};

export default Login;