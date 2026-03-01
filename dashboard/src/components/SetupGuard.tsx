import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { setupApiService } from '../services/api/setup.api.service';
import AnimatedLoader from './AnimatedLoader';
import { Box } from '@mui/material';

interface SetupGuardProps {
  children: React.ReactNode;
}

const SetupGuard: React.FC<SetupGuardProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [setupCompleted, setSetupCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSetup = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Call backend API to get setup status
        const setupStatus = await setupApiService.getSetupStatus();
        setSetupCompleted(setupStatus.isCompleted);
      } catch (error) {
        console.error('Error checking setup status:', error);
        
        // Fallback: If API call fails, check if user has companyId
        // If no companyId, assume setup is not complete
        const hasCompanyId = currentUser.companyId && currentUser.companyId.trim() !== '';
        setSetupCompleted(hasCompanyId ? false : false); // Conservative approach - assume not complete on API failure
      } finally {
        setLoading(false);
      }
    };

    checkSetup();
  }, [currentUser, location.pathname]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <AnimatedLoader />
      </Box>
    );
  }

  // If on setup page and setup is completed, redirect to dashboard
  if (location.pathname === '/setup' && setupCompleted) {
    return <Navigate to="/dashboard" replace />;
  }

  // If not on setup page and setup is not completed, redirect to setup
  if (location.pathname !== '/setup' && setupCompleted === false) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
};

export default SetupGuard;