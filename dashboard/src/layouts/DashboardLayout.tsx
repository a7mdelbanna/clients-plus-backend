import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';

const DashboardLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const drawerWidth = sidebarOpen && !isMobile ? 240 : (!isMobile ? 70 : 0);

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const handleSidebarOpen = () => {
    setSidebarOpen(true);
  };

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={handleSidebarClose}
        onOpen={handleSidebarOpen}
      />
      
      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <DashboardHeader onMenuClick={handleMenuClick} />
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          p: 0,
        }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default DashboardLayout;