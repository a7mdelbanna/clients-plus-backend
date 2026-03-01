import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useClientAuth } from '../../contexts/ClientAuthContext';

interface ClientProtectedRouteProps {
  children: React.ReactNode;
}

const ClientProtectedRoute: React.FC<ClientProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useClientAuth();
  const location = useLocation();

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
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/client/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ClientProtectedRoute;