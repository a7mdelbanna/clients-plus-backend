import React, { useState, useEffect } from 'react';
import AnimatedBackground from './AnimatedBackground';
import { setupService } from '../services/setup.service';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
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
  Grid
} from '@mui/material';
import { Visibility, VisibilityOff, Person, Email, Lock } from '@mui/icons-material';

interface SignupFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { signup, currentUser } = useAuth();
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<SignupFormData>();

  const password = watch('password');

  // Navigate to setup when currentUser is set after signup
  useEffect(() => {
    if (signupComplete && currentUser) {
      console.log('User authenticated, navigating to setup...');
      navigate('/setup');
    }
  }, [signupComplete, currentUser, navigate]);

  const onSubmit = async (data: SignupFormData) => {
    try {
      setLoading(true);
      console.log('Starting signup process...');
      
      const displayName = `${data.firstName} ${data.lastName}`.trim();
      
      console.log('Calling signup with:', { email: data.email, displayName });
      await signup(
        data.email, 
        data.password, 
        displayName,
        data.firstName,
        data.lastName
      );
      
      console.log('Signup successful, currentUser should be set');
      
      // The signup function in AuthContext already sets the currentUser
      toast.success('تم إنشاء الحساب بنجاح!', {
        position: 'top-center',
      });
      
      // Set flag to trigger navigation once currentUser is available
      setSignupComplete(true);
    } catch (error: any) {
      let errorMessage = 'فشل إنشاء الحساب';
      
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        switch (status) {
          case 400:
            if (errorData.code === 'EMAIL_ALREADY_EXISTS') {
              errorMessage = 'البريد الإلكتروني مستخدم بالفعل';
            } else if (errorData.code === 'WEAK_PASSWORD') {
              errorMessage = 'كلمة المرور ضعيفة. يجب أن تكون 8 أحرف على الأقل';
            } else {
              errorMessage = errorData.message || 'بيانات غير صحيحة';
            }
            break;
          case 409:
            errorMessage = 'البريد الإلكتروني مستخدم بالفعل. يرجى استخدام بريد إلكتروني آخر أو تسجيل الدخول';
            break;
          case 429:
            errorMessage = 'تم تجاوز عدد المحاولات المسموح بها';
            break;
          default:
            errorMessage = errorData.message || 'فشل إنشاء الحساب';
        }
      }
      
      toast.error(errorMessage, {
        position: 'top-center',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
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
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            py: 3
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
                  إنشاء حساب جديد
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  انضم إلى Clients+ وابدأ إدارة عملك بسهولة
                </Typography>
              </motion.div>

              <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: '100%' }}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <motion.div variants={itemVariants}>
                      <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="firstName"
                        label="الاسم الأول"
                        autoComplete="given-name"
                        autoFocus
                        {...register('firstName', {
                          required: 'الاسم الأول مطلوب',
                          minLength: {
                            value: 2,
                            message: 'الاسم الأول يجب أن يكون حرفين على الأقل'
                          }
                        })}
                        error={!!errors.firstName}
                        helperText={errors.firstName?.message}
                        disabled={loading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person sx={{ color: 'action.active' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </motion.div>
                  </Grid>
                  
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <motion.div variants={itemVariants}>
                      <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="lastName"
                        label="اسم العائلة"
                        autoComplete="family-name"
                        {...register('lastName', {
                          required: 'اسم العائلة مطلوب',
                          minLength: {
                            value: 2,
                            message: 'اسم العائلة يجب أن يكون حرفين على الأقل'
                          }
                        })}
                        error={!!errors.lastName}
                        helperText={errors.lastName?.message}
                        disabled={loading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Person sx={{ color: 'action.active' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </motion.div>
                  </Grid>
                </Grid>

                <motion.div variants={itemVariants}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="البريد الإلكتروني"
                    autoComplete="email"
                    {...register('email', {
                      required: 'البريد الإلكتروني مطلوب',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'البريد الإلكتروني غير صحيح'
                      }
                    })}
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    disabled={loading}
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
                    autoComplete="new-password"
                    {...register('password', {
                      required: 'كلمة المرور مطلوبة',
                      minLength: {
                        value: 8,
                        message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
                      },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: 'كلمة المرور يجب أن تحتوي على حرف كبير وصغير ورقم'
                      }
                    })}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    disabled={loading}
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
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    label="تأكيد كلمة المرور"
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    autoComplete="new-password"
                    {...register('confirmPassword', {
                      required: 'تأكيد كلمة المرور مطلوب',
                      validate: value => value === password || 'كلمة المرور غير متطابقة'
                    })}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    disabled={loading}
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
                            onClick={handleClickShowConfirmPassword}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
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
                      'إنشاء الحساب'
                    )}
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Link to="/login" style={{ textDecoration: 'none' }}>
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
                        لديك حساب بالفعل؟ سجل الدخول
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

export default Signup;