import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Collapse,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Business,
  AttachMoney,
  Settings,
  Security,
  Analytics,
  People,
  Notifications,
  ExpandLess,
  ExpandMore,
  Logout,
  AccountCircle,
  CreditCard,
  Campaign,
  Support,
  Storage,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSuperadminAuth } from '../contexts/SuperadminAuthContext';

const drawerWidth = 280;

const SuperadminLayout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentSuperadmin, signOut } = useSuperadminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['businesses']);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const urlHash = import.meta.env.VITE_SUPERADMIN_URL_HASH;
  const basePath = `/sa-${urlHash}`;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuExpand = (menu: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menu) ? prev.filter((m) => m !== menu) : [...prev, menu]
    );
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await signOut();
    navigate(`${basePath}/login`);
  };

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <Dashboard />,
      path: `${basePath}/dashboard`,
    },
    {
      id: 'businesses',
      title: 'Business Management',
      icon: <Business />,
      badge: 12,
      children: [
        { title: 'All Businesses', path: `${basePath}/businesses` },
        { title: 'Active Businesses', path: `${basePath}/businesses/active` },
        { title: 'Suspended', path: `${basePath}/businesses/suspended` },
        { title: 'Pending Activation', path: `${basePath}/businesses/pending` },
      ],
    },
    {
      id: 'pricing',
      title: 'Pricing & Plans',
      icon: <AttachMoney />,
      children: [
        { title: 'Plan Configuration', path: `${basePath}/pricing/plans` },
        { title: 'Pricing Overrides', path: `${basePath}/pricing/overrides` },
        { title: 'Add-ons Management', path: `${basePath}/pricing/addons` },
        { title: 'Promotions', path: `${basePath}/pricing/promotions` },
      ],
    },
    {
      id: 'payments',
      title: 'Financial Management',
      icon: <CreditCard />,
      badge: 3,
      children: [
        { title: 'Transactions', path: `${basePath}/payments/transactions` },
        { title: 'Failed Payments', path: `${basePath}/payments/failed` },
        { title: 'Refunds', path: `${basePath}/payments/refunds` },
        { title: 'Revenue Reports', path: `${basePath}/payments/reports` },
      ],
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: <Analytics />,
      path: `${basePath}/analytics`,
    },
    {
      id: 'communications',
      title: 'Communications',
      icon: <Campaign />,
      children: [
        { title: 'Email Campaigns', path: `${basePath}/communications/email` },
        { title: 'SMS Broadcast', path: `${basePath}/communications/sms` },
        { title: 'System Announcements', path: `${basePath}/communications/announcements` },
        { title: 'Templates', path: `${basePath}/communications/templates` },
      ],
    },
    {
      id: 'support',
      title: 'Support',
      icon: <Support />,
      children: [
        { title: 'Support Tickets', path: `${basePath}/support/tickets` },
        { title: 'Documentation', path: `${basePath}/support/docs` },
        { title: 'FAQs', path: `${basePath}/support/faqs` },
      ],
    },
    {
      id: 'security',
      title: 'Security & Compliance',
      icon: <Security />,
      children: [
        { title: 'Audit Logs', path: `${basePath}/security/audit` },
        { title: 'Data Requests', path: `${basePath}/security/data-requests` },
        { title: 'IP Management', path: `${basePath}/security/ip` },
        { title: 'Rate Limits', path: `${basePath}/security/rate-limits` },
      ],
    },
    {
      id: 'system',
      title: 'System Settings',
      icon: <Storage />,
      children: [
        { title: 'Feature Flags', path: `${basePath}/system/features` },
        { title: 'Backups', path: `${basePath}/system/backups` },
        { title: 'Maintenance', path: `${basePath}/system/maintenance` },
      ],
    },
  ];

  const drawer = (
    <Box sx={{ height: '100%', backgroundColor: '#0f0f0f' }}>
      <Toolbar sx={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" noWrap sx={{ color: '#ff4444', fontWeight: 'bold' }}>
          Clients+ Control
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <List sx={{ pt: 2 }}>
        {menuItems.map((item) => (
          <React.Fragment key={item.id}>
            <ListItem disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={() => {
                  if (item.children) {
                    handleMenuExpand(item.id);
                  } else if (item.path) {
                    navigate(item.path);
                    if (isMobile) setMobileOpen(false);
                  }
                }}
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(255, 68, 68, 0.15)',
                    borderLeft: '3px solid #ff4444',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 68, 68, 0.2)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: '#ff4444' }}>
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  sx={{
                    '& .MuiTypography-root': {
                      color: '#fff',
                      fontSize: '0.9rem',
                    },
                  }}
                />
                {item.children &&
                  (expandedMenus.includes(item.id) ? (
                    <ExpandLess sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  ) : (
                    <ExpandMore sx={{ color: 'rgba(255,255,255,0.5)' }} />
                  ))}
              </ListItemButton>
            </ListItem>
            {item.children && (
              <Collapse in={expandedMenus.includes(item.id)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItemButton
                      key={child.path}
                      onClick={() => {
                        navigate(child.path);
                        if (isMobile) setMobileOpen(false);
                      }}
                      selected={location.pathname === child.path}
                      sx={{
                        pl: 7,
                        py: 0.75,
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(255, 68, 68, 0.1)',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 68, 68, 0.15)',
                          },
                        },
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        },
                      }}
                    >
                      <ListItemText
                        primary={child.title}
                        sx={{
                          '& .MuiTypography-root': {
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: '0.85rem',
                          },
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', backgroundColor: '#0a0a0a', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: '#1a1a1a',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Superadmin Control Panel
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton color="inherit">
              <Badge badgeContent={4} color="error">
                <Notifications />
              </Badge>
            </IconButton>
            <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0 }}>
              <Avatar sx={{ width: 36, height: 36, backgroundColor: '#ff4444' }}>
                {currentSuperadmin?.displayName?.charAt(0) || 'S'}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: '#0f0f0f',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: '#0f0f0f',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        PaperProps={{
          sx: {
            backgroundColor: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.1)',
            mt: 1.5,
          },
        }}
      >
        <MenuItem sx={{ color: '#fff', py: 1.5 }}>
          <ListItemIcon>
            <AccountCircle sx={{ color: '#ff4444' }} />
          </ListItemIcon>
          {currentSuperadmin?.email}
        </MenuItem>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <MenuItem onClick={handleLogout} sx={{ color: '#fff', py: 1.5 }}>
          <ListItemIcon>
            <Logout sx={{ color: '#ff4444' }} />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default SuperadminLayout;