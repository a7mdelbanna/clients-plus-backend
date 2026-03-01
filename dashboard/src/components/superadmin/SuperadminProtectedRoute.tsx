import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useSuperadminAuth } from '../../contexts/SuperadminAuthContext';

interface SuperadminProtectedRouteProps {
  children: React.ReactNode;
}

const SuperadminProtectedRoute: React.FC<SuperadminProtectedRouteProps> = ({ children }) => {
  const { currentSuperadmin, loading, checkAccess } = useSuperadminAuth();
  const location = useLocation();
  const urlHash = import.meta.env.VITE_SUPERADMIN_URL_HASH;

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: '#0a0a0a',
        }}
      >
        <CircularProgress sx={{ color: '#ff4444' }} />
      </Box>
    );
  }

  // Check if URL is valid for superadmin
  const expectedPath = `/sa-${urlHash}`;
  if (!location.pathname.startsWith(expectedPath)) {
    // Invalid URL, redirect to home
    return <Navigate to="/" replace />;
  }

  // Check if user is authenticated as superadmin
  if (!currentSuperadmin) {
    return <Navigate to={`/sa-${urlHash}/login`} state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default SuperadminProtectedRoute;