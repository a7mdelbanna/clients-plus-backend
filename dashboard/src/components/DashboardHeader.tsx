import React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Avatar,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications,
  DarkMode,
  LightMode,
} from '@mui/icons-material';
import BranchSelector from './BranchSelector';
import { useThemeMode } from '../contexts/ThemeContext';

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const { isDarkMode, toggleTheme } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isRTL = true; // Force RTL for Arabic

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        backgroundColor: theme.palette.mode === 'dark' 
          ? theme.palette.background.paper 
          : theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        boxShadow: theme.palette.mode === 'dark'
          ? '0 2px 8px rgba(0, 0, 0, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        width: '100%',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
        {/* Left Side - Menu Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {/* Menu Button for Mobile */}
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={onMenuClick}
              sx={{ 
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.12),
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Box>

        {/* Center - Branch Selector */}
        <Box sx={{ flexGrow: 1, mx: 2 }}>
          <BranchSelector />
        </Box>

        {/* Right Side Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <IconButton 
            color="inherit" 
            sx={{ 
              ml: 1,
              backgroundColor: theme.palette.action.hover,
              '&:hover': {
                backgroundColor: theme.palette.action.selected,
              },
            }}
          >
            <Notifications sx={{ fontSize: 24 }} />
          </IconButton>

          {/* Theme Toggle */}
          <IconButton 
            onClick={toggleTheme} 
            color="inherit"
            sx={{ 
              backgroundColor: theme.palette.action.hover,
              '&:hover': {
                backgroundColor: theme.palette.action.selected,
              },
            }}
          >
            {isDarkMode ? (
              <LightMode sx={{ fontSize: 24, color: '#FFC107' }} />
            ) : (
              <DarkMode sx={{ fontSize: 24, color: '#1976D2' }} />
            )}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default DashboardHeader;