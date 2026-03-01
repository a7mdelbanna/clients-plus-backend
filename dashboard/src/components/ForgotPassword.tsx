import React, { useState } from 'react';
import AnimatedBackground from './AnimatedBackground';
import { Link } from 'react-router-dom';
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
  CircularProgress,
  InputAdornment,
  useTheme
} from '@mui/material';
import { ArrowBack, Email } from '@mui/icons-material';

interface ForgotPasswordFormData {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordFormData>();

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setLoading(true);
      await resetPassword(data.email);
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني', {
        position: 'top-center',
      });
    } catch (error: any) {
      let errorMessage = 'فشل إرسال رابط إعادة التعيين';
      
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        switch (status) {
          case 404:
            errorMessage = 'البريد الإلكتروني غير مسجل';
            break;
          case 400:
            errorMessage = 'البريد الإلكتروني غير صالح';
            break;
          case 429:
            errorMessage = 'تم تجاوز عدد المحاولات المسموح بها. الرجاء المحاولة بعد بضع دقائق';
            break;
          default:
            errorMessage = errorData.message || 'فشل إرسال رابط إعادة التعيين';
        }
      }
      
      toast.error(errorMessage, {
        position: 'top-center',
      });
    } finally {
      setLoading(false);
    }
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
                  mb: 3,
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 700,
                }}
              >
                إعادة تعيين كلمة المرور
              </Typography>
            </motion.div>

            <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 1, width: '100%' }}>
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
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    'إرسال رابط إعادة التعيين'
                  )}
                </Button>
              </motion.div>

              <motion.div variants={itemVariants}>
                <Box sx={{ textAlign: 'center' }}>
                  <Link to="/login" style={{ textDecoration: 'none' }}>
                    <Button 
                      startIcon={<ArrowBack />} 
                      sx={{
                        color: 'primary.main',
                        transition: 'all 0.3s',
                        '&:hover': {
                          transform: 'translateX(5px)',
                        },
                      }}
                    >
                      العودة لتسجيل الدخول
                    </Button>
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

export default ForgotPassword;