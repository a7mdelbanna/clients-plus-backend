import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Security } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSuperadminAuth } from '../../contexts/SuperadminAuthContext';

const SuperadminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useSuperadminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const urlHash = import.meta.env.VITE_SUPERADMIN_URL_HASH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Attempting superadmin login with:', email);

    try {
      await signIn(email, password);
      console.log('Login successful, navigating to dashboard');
      navigate(`/sa-${urlHash}/dashboard`);
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        backgroundImage: 'radial-gradient(circle at 20% 50%, #1a1a2e 0%, #0a0a0a 50%)',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Paper
          elevation={24}
          sx={{
            p: 4,
            width: 400,
            backgroundColor: 'rgba(18, 18, 18, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Security sx={{ fontSize: 48, color: '#ff4444', mb: 2 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#fff', mb: 1 }}>
              Superadmin Access
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)' }}>
              Restricted Area - Authorized Personnel Only
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoComplete="username"
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#ff4444' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'rgba(255, 255, 255, 0.6)' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#ff4444' },
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.6)' },
                '& .MuiInputBase-input': { color: '#fff' },
              }}
            />

            {error && (
              <Alert severity="error" sx={{ mt: 2, backgroundColor: 'rgba(211, 47, 47, 0.1)' }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.5,
                backgroundColor: '#ff4444',
                '&:hover': { backgroundColor: '#cc0000' },
                '&:disabled': { backgroundColor: 'rgba(255, 68, 68, 0.3)' },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: '#fff' }} />
              ) : (
                'Access Control Panel'
              )}
            </Button>
          </form>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.4)' }}>
              All access attempts are logged and monitored
            </Typography>
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
};

export default SuperadminLogin;