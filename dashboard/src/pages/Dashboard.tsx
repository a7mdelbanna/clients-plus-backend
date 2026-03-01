import React, { Suspense } from 'react';
import { Box, CircularProgress } from '@mui/material';
import AnimatedDashboard from './AnimatedDashboard';

const Dashboard: React.FC = () => {
  return (
    <Suspense 
      fallback={
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
          }}
        >
          <CircularProgress size={48} />
        </Box>
      }
    >
      <AnimatedDashboard />
    </Suspense>
  );
};

export default Dashboard;