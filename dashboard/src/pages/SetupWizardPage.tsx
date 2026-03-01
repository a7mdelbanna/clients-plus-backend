import React from 'react';
import { Box, useTheme } from '@mui/material';
import { SetupWizard } from '../components/SetupWizard';
import AnimatedBackground from '../components/AnimatedBackground';

const SetupWizardPage: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.default,
      }}
    >
      <AnimatedBackground />
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          py: 4,
        }}
      >
        <SetupWizard />
      </Box>
    </Box>
  );
};

export default SetupWizardPage;