import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Collapse,
  Avatar,
  Typography,
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
  Badge,
} from '@mui/material';
import {
  Dashboard,
  People,
  Assignment,
  AttachMoney,
  CalendarMonth,
  Analytics,
  Settings,
  Support,
  Inventory,
  ExpandLess,
  ExpandMore,
  Menu as MenuIcon,
  Close,
  PersonOutline,
  BusinessCenter,
  Receipt,
  Groups,
  Notifications,
  TrendingUp,
  ExitToApp,
  Assessment,
  AccountBalance,
  Payment,
  BookOnline,
  CardGiftcard,
  IntegrationInstructions,
  Paid,
  HelpCenter,
  Star,
  MoneyOff,
  Work,
  Schedule,
  Category,
  CategoryOutlined,
  CalendarToday,
  LocationOn,
  NotificationImportant,
  Link,
  Webhook,
  Inventory2Outlined,
  WhatsApp,
  ShoppingCart,
  PointOfSale,
  ContactMail,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

interface MenuItem {
  id: string;
  title: string;
  titleAr: string;
  icon: React.ReactNode;
  path?: string;
  badge?: number;
  subItems?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    id: 'overview',
    title: 'Overview',
    titleAr: 'نظرة عامة',
    icon: <Dashboard />,
    path: '/dashboard',
  },
  {
    id: 'clients',
    title: 'Clients',
    titleAr: 'العملاء',
    icon: <People />,
    path: '/clients',
  },
  {
    id: 'contacts',
    title: 'Contacts',
    titleAr: 'جهات الاتصال',
    icon: <ContactMail />,
    path: '/contacts',
  },
  {
    id: 'booking-links',
    title: 'Booking Links',
    titleAr: 'روابط الحجز',
    icon: <Link />,
    path: '/booking-links',
  },
  {
    id: 'appointments',
    title: 'Appointments',
    titleAr: 'المواعيد',
    icon: <CalendarMonth />,
    path: '/appointments',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    titleAr: 'التحليلات',
    icon: <Assessment />,
    path: '/analytics',
  },
  {
    id: 'finance',
    title: 'Finance',
    titleAr: 'المالية',
    icon: <AccountBalance />,
    path: '/finance',
    subItems: [
      {
        id: 'accounts',
        title: 'Accounts',
        titleAr: 'الحسابات',
        icon: <AccountBalance />,
        path: '/finance/accounts',
      },
      {
        id: 'transactions',
        title: 'Transactions',
        titleAr: 'المعاملات',
        icon: <Payment />,
        path: '/finance/transactions',
      },
      {
        id: 'expenses',
        title: 'Expenses',
        titleAr: 'المصروفات',
        icon: <MoneyOff />,
        path: '/finance/expenses',
      },
      {
        id: 'pos',
        title: 'Point of Sale',
        titleAr: 'نقطة البيع',
        icon: <PointOfSale />,
        path: '/finance/pos',
      },
      {
        id: 'cash-register',
        title: 'Cash Register',
        titleAr: 'الصندوق',
        icon: <AttachMoney />,
        path: '/register',
      },
      {
        id: 'invoices',
        title: 'Invoices',
        titleAr: 'الفواتير',
        icon: <Receipt />,
        path: '/finance/invoices',
      },
      {
        id: 'reports',
        title: 'Reports',
        titleAr: 'التقارير',
        icon: <Assessment />,
        path: '/finance/reports',
      },
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll',
    titleAr: 'الرواتب',
    icon: <Payment />,
    path: '/payroll',
  },
  {
    id: 'products',
    title: 'Products',
    titleAr: 'المنتجات',
    icon: <ShoppingCart />,
    path: '/products',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    titleAr: 'المخزون',
    icon: <Inventory />,
    path: '/inventory',
  },
  {
    id: 'online-booking',
    title: 'Online Booking',
    titleAr: 'الحجز الإلكتروني',
    icon: <BookOnline />,
    path: '/online-booking',
  },
  {
    id: 'loyalty',
    title: 'Loyalty',
    titleAr: 'الولاء',
    icon: <CardGiftcard />,
    path: '/loyalty',
  },
  {
    id: 'integrations',
    title: 'Integrations',
    titleAr: 'التكاملات',
    icon: <IntegrationInstructions />,
    path: '/integrations',
  },
];

const bottomMenuItems: MenuItem[] = [
  {
    id: 'settings',
    title: 'Settings',
    titleAr: 'الإعدادات',
    icon: <Settings />,
    path: '/settings',
    subItems: [
      {
        id: 'services',
        title: 'Services',
        titleAr: 'الخدمات',
        icon: <Star />,
        path: '/settings/services',
      },
      {
        id: 'positions',
        title: 'Positions',
        titleAr: 'المناصب',
        icon: <Work />,
        path: '/settings/positions',
      },
      {
        id: 'staff',
        title: 'Staff',
        titleAr: 'الموظفين',
        icon: <People />,
        path: '/settings/staff',
      },
      {
        id: 'work-schedule',
        title: 'Work Schedule',
        titleAr: 'جدول العمل',
        icon: <Schedule />,
        path: '/settings/work-schedule',
      },
      {
        id: 'resources',
        title: 'Resources',
        titleAr: 'الموارد',
        icon: <Category />,
        path: '/settings/resources',
      },
      {
        id: 'categories',
        title: 'Categories',
        titleAr: 'قوائم الفئات',
        icon: <CategoryOutlined />,
        path: '/settings/categories',
      },
      {
        id: 'location-settings',
        title: 'Location Settings',
        titleAr: 'إعدادات الموقع',
        icon: <LocationOn />,
        path: '/settings/location-settings',
      },
      {
        id: 'appointment-calendar',
        title: 'Appointment Calendar',
        titleAr: 'تقويم المواعيد',
        icon: <CalendarToday />,
        path: '/settings/appointment-calendar',
      },
      {
        id: 'whatsapp',
        title: 'WhatsApp',
        titleAr: 'واتساب',
        icon: <WhatsApp />,
        path: '/settings/whatsapp',
      },
    ],
  },
  {
    id: 'billing',
    title: 'Billing',
    titleAr: 'الفواتير',
    icon: <Paid />,
    path: '/billing',
  },
  {
    id: 'support',
    title: 'Support Center',
    titleAr: 'مركز الدعم',
    icon: <HelpCenter />,
    path: '/support',
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, onOpen }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isRTL = theme.direction === 'rtl';
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Debug: Log menu items to console
  React.useEffect(() => {
    console.log('Sidebar menuItems:', menuItems);
    console.log('Products menu item:', menuItems.find(item => item.id === 'products'));
  }, []);

  const drawerWidth = open ? 240 : 70;

  const handleToggleExpand = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleNavigate = (path?: string) => {
    if (path) {
      navigate(path);
      if (isMobile) {
        onClose();
      }
    }
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const sidebarVariants = {
    open: {
      width: 240,
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      },
    },
    closed: {
      width: 70,
      transition: {
        duration: 0.3,
        ease: 'easeInOut',
      },
    },
  };

  const listItemVariants = {
    hover: {
      x: isRTL ? -5 : 5,
      backgroundColor: theme.palette.action.hover,
      transition: {
        duration: 0.2,
      },
    },
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isItemActive = isActive(item.path);
    const isHovered = hoveredItem === item.id;

    return (
      <React.Fragment key={item.id}>
        <motion.div
          variants={listItemVariants}
          whileHover="hover"
          onHoverStart={() => setHoveredItem(item.id)}
          onHoverEnd={() => setHoveredItem(null)}
        >
          <ListItem
            onClick={() => {
              if (hasSubItems) {
                handleToggleExpand(item.id);
              } else {
                handleNavigate(item.path);
              }
            }}
            sx={{
              pl: depth > 0 ? 4 : 2,
              cursor: 'pointer',
              backgroundColor: isItemActive ? theme.palette.action.selected : 'transparent',
              borderRadius: 1,
              mx: 1,
              mb: 0.5,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                left: isRTL ? 'auto' : 0,
                right: isRTL ? 0 : 'auto',
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: theme.palette.primary.main,
                opacity: isItemActive ? 1 : 0,
                transition: 'opacity 0.3s',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: isItemActive ? theme.palette.primary.main : theme.palette.text.secondary,
              }}
            >
              {item.badge ? (
                <Badge badgeContent={item.badge} color="error">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', alignItems: 'center', flex: 1 }}
                >
                  <ListItemText
                    primary={isRTL ? item.titleAr : item.title}
                    primaryTypographyProps={{
                      fontSize: '0.9rem',
                      fontWeight: isItemActive ? 600 : 400,
                    }}
                  />
                  {hasSubItems && (
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ExpandMore />
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            {!open && item.badge && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 5,
                  right: isRTL ? 'auto' : 5,
                  left: isRTL ? 5 : 'auto',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.error.main,
                }}
              />
            )}
          </ListItem>
        </motion.div>

        {hasSubItems && (
          <Collapse in={isExpanded && open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.subItems!.map((subItem) => renderMenuItem(subItem, depth + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(isRTL ? 'تم تسجيل الخروج بنجاح' : 'Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error(isRTL ? 'فشل تسجيل الخروج' : 'Failed to logout');
    }
  };

  const drawerContent = (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
        }}
      >
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: theme.palette.primary.main,
                  fontSize: '1rem',
                }}
              >
                C+
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Clients+
              </Typography>
            </motion.div>
          )}
        </AnimatePresence>
        
        {!open && (
          <IconButton onClick={onOpen} size="small">
            <MenuIcon />
          </IconButton>
        )}
        
        {open && isMobile && (
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        )}
      </Box>

      <Divider />

      {/* Main Menu Items */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
        <List>
          {menuItems.map((item) => renderMenuItem(item))}
        </List>
      </Box>

      <Divider />

      {/* Bottom Menu Items */}
      <Box sx={{ py: 1 }}>
        <List>
          {bottomMenuItems.map((item) => renderMenuItem(item))}
        </List>
      </Box>

      <Divider />

      {/* User Section */}
      <Box sx={{ p: 2 }}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 1.5,
              borderRadius: 2,
              backgroundColor: theme.palette.action.hover,
              cursor: 'pointer',
              transition: 'all 0.3s',
              '&:hover': {
                backgroundColor: theme.palette.action.selected,
              },
            }}
            onClick={() => handleNavigate('/profile')}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: theme.palette.secondary.main,
              }}
            >
              {currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U'}
            </Avatar>
            {open && (
              <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {currentUser?.displayName || 'User'}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {currentUser?.email}
                </Typography>
              </Box>
            )}
          </Box>
        </motion.div>

        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ListItem
              onClick={handleLogout}
              sx={{
                mt: 1,
                cursor: 'pointer',
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <ExitToApp />
              </ListItemIcon>
              <ListItemText
                primary={isRTL ? 'تسجيل الخروج' : 'Logout'}
                primaryTypographyProps={{ fontSize: '0.9rem' }}
              />
            </ListItem>
          </motion.div>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {/* Desktop Drawer */}
      {!isMobile && (
        <motion.div
          initial={false}
          animate={open ? 'open' : 'closed'}
          variants={sidebarVariants}
          style={{
            position: 'relative',
            height: '100vh',
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: drawerWidth,
              height: '100%',
              borderRight: `1px solid ${theme.palette.divider}`,
              transition: 'width 0.3s',
              backgroundColor: theme.palette.background.paper,
            }}
          >
            {drawerContent}
          </Box>
        </motion.div>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: 240,
              boxSizing: 'border-box',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default Sidebar;