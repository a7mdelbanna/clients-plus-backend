import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  LinearProgress,
  Box,
  Alert
} from '@mui/material';
import { AccessTime as ClockIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { tokenUtils } from '../config/api';

interface SessionTimeoutWarningProps {
  warningThreshold?: number; // Minutes before expiry to show warning
  autoLogoutThreshold?: number; // Minutes before expiry to auto logout
}

const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  warningThreshold = 5, // Show warning 5 minutes before expiry
  autoLogoutThreshold = 1 // Auto logout 1 minute before expiry
}) => {
  const { currentUser, logout, refreshUser } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isExtending, setIsExtending] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setShowWarning(false);
      return;
    }

    const checkTokenExpiry = () => {
      const expiry = tokenUtils.getTokenExpiry();
      if (!expiry) return;

      const now = Date.now();
      const timeUntilExpiry = expiry - now;
      const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));

      setTimeLeft(minutesUntilExpiry);

      // Auto logout if very close to expiry
      if (minutesUntilExpiry <= autoLogoutThreshold) {
        handleAutoLogout();
        return;
      }

      // Show warning if approaching expiry
      if (minutesUntilExpiry <= warningThreshold && minutesUntilExpiry > autoLogoutThreshold) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Check every 30 seconds
    const interval = setInterval(checkTokenExpiry, 30000);

    return () => clearInterval(interval);
  }, [currentUser, warningThreshold, autoLogoutThreshold]);

  const handleAutoLogout = async () => {
    setShowWarning(false);
    await logout();
  };

  const handleExtendSession = async () => {
    try {
      setIsExtending(true);
      // Refresh user data which will also refresh the token
      await refreshUser();
      setShowWarning(false);
    } catch (error) {
      console.error('Failed to extend session:', error);
      // If refresh fails, logout user
      await logout();
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogoutNow = async () => {
    setShowWarning(false);
    await logout();
  };

  const getProgressValue = () => {
    const maxMinutes = warningThreshold;
    const remaining = Math.max(0, timeLeft - autoLogoutThreshold);
    return ((maxMinutes - remaining) / maxMinutes) * 100;
  };

  const formatTimeLeft = (minutes: number) => {
    if (minutes <= 0) return '0 دقيقة';
    if (minutes === 1) return 'دقيقة واحدة';
    if (minutes === 2) return 'دقيقتان';
    if (minutes <= 10) return `${minutes} دقائق`;
    return `${minutes} دقيقة`;
  };

  if (!showWarning || !currentUser) {
    return null;
  }

  return (
    <Dialog
      open={showWarning}
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          minWidth: 400,
          maxWidth: 500,
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ClockIcon color="warning" />
        تحذير انتهاء الجلسة
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2">
            جلستك على وشك الانتهاء
          </Typography>
        </Alert>

        <Typography variant="body1" sx={{ mb: 2 }}>
          ستنتهي جلستك خلال <strong>{formatTimeLeft(timeLeft)}</strong>. 
          هل تريد تمديد الجلسة؟
        </Typography>

        <Box sx={{ mb: 2 }}>
          <LinearProgress 
            variant="determinate" 
            value={getProgressValue()} 
            color={timeLeft <= 2 ? 'error' : 'warning'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Typography variant="caption" color="text.secondary">
          سيتم تسجيل خروجك تلقائياً خلال دقيقة واحدة من انتهاء صلاحية الجلسة
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button 
          onClick={handleLogoutNow} 
          variant="outlined"
          color="inherit"
        >
          تسجيل الخروج الآن
        </Button>
        
        <Button 
          onClick={handleExtendSession}
          variant="contained"
          disabled={isExtending}
          startIcon={isExtending ? undefined : <RefreshIcon />}
          sx={{ minWidth: 120 }}
        >
          {isExtending ? 'جاري التحديث...' : 'تمديد الجلسة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SessionTimeoutWarning;