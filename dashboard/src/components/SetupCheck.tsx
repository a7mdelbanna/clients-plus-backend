import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { setupService } from '../services/setup.service';
import AnimatedLoader from './AnimatedLoader';
import { Box } from '@mui/material';

interface SetupCheckProps {
  children: React.ReactNode;
}

const SetupCheck: React.FC<SetupCheckProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasCompany, setHasCompany] = useState(false);

  useEffect(() => {
    const checkSetup = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Check if setup was just completed
        const justCompleted = sessionStorage.getItem('setup-just-completed') === 'true';
        if (justCompleted) {
          sessionStorage.removeItem('setup-just-completed');
          setHasCompany(true);
          setLoading(false);
          return;
        }

        // Get company ID
        let companyId: string | null | undefined = null;
        
        // Try from AuthContext first
        companyId = currentUser?.companyId;

        // Try from user document
        if (!companyId) {
          companyId = await setupService.getUserCompanyId(currentUser?.id);
        }

        if (!companyId) {
          // No company, redirect to setup
          navigate('/setup', { replace: true });
          return;
        }

        // Check if setup is completed
        const isCompleted = await setupService.checkSetupStatus(companyId);
        
        if (!isCompleted) {
          // Company exists but setup not completed
          navigate('/setup', { replace: true });
          return;
        }

        setHasCompany(true);
      } catch (error) {
        console.error('Error checking setup:', error);
        // On error, assume they have access
        setHasCompany(true);
      } finally {
        setLoading(false);
      }
    };

    checkSetup();
  }, [currentUser, navigate]);

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

  return hasCompany ? <>{children}</> : null;
};

export default SetupCheck;