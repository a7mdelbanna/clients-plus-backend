import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  useMediaQuery,
} from '@mui/material';
import {
  Star,
  Work,
  People,
  Schedule,
  Category,
  CalendarToday,
  CategoryOutlined,
  Payment,
  PointOfSale,
  Receipt,
  TrendingDown,
  LocationOn,
  Business,
  Store,
  Notifications,
  Link,
  Webhook,
  WhatsApp,
  Inventory2Outlined,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface SettingSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  category: string;
}

const settingsSections: SettingSection[] = [
  // الإعدادات الرئيسية
  {
    id: 'services',
    title: 'الخدمات',
    icon: <Star sx={{ fontSize: 32 }} />,
    path: '/settings/services',
    color: '#F59E0B',
    category: 'main',
  },
  {
    id: 'positions',
    title: 'المناصب',
    icon: <Work sx={{ fontSize: 32 }} />,
    path: '/settings/positions',
    color: '#10B981',
    category: 'main',
  },
  {
    id: 'staff',
    title: 'الموظفين',
    icon: <People sx={{ fontSize: 32 }} />,
    path: '/settings/staff',
    color: '#3B82F6',
    category: 'main',
  },
  {
    id: 'work-schedule',
    title: 'جدول العمل',
    icon: <Schedule sx={{ fontSize: 32 }} />,
    path: '/settings/work-schedule',
    color: '#8B5CF6',
    category: 'main',
  },
  {
    id: 'resources',
    title: 'الموارد',
    icon: <Category sx={{ fontSize: 32 }} />,
    path: '/settings/resources',
    color: '#EC4899',
    category: 'main',
  },
  {
    id: 'appointment-calendar',
    title: 'تقويم المواعيد',
    icon: <CalendarToday sx={{ fontSize: 32 }} />,
    path: '/settings/appointment-calendar',
    color: '#14B8A6',
    category: 'main',
  },
  {
    id: 'whatsapp',
    title: 'واتساب',
    icon: <WhatsApp sx={{ fontSize: 32 }} />,
    path: '/settings/whatsapp',
    color: '#25D366',
    category: 'main',
  },
  // الفئات
  {
    id: 'categories',
    title: 'قوائم الفئات',
    icon: <CategoryOutlined sx={{ fontSize: 32 }} />,
    path: '/settings/categories',
    color: '#F97316',
    category: 'categories',
  },
  // المالية
  {
    id: 'online-payment',
    title: 'الدفع الإلكتروني',
    icon: <Payment sx={{ fontSize: 32 }} />,
    path: '/settings/online-payment',
    color: '#10B981',
    category: 'finance',
  },
  {
    id: 'checkout',
    title: 'الدفع',
    icon: <PointOfSale sx={{ fontSize: 32 }} />,
    path: '/settings/checkout',
    color: '#3B82F6',
    category: 'finance',
  },
  {
    id: 'receipts',
    title: 'الإيصالات',
    icon: <Receipt sx={{ fontSize: 32 }} />,
    path: '/settings/receipts',
    color: '#8B5CF6',
    category: 'finance',
  },
  // التحليلات
  {
    id: 'client-churn',
    title: 'فقدان العملاء',
    icon: <TrendingDown sx={{ fontSize: 32 }} />,
    path: '/settings/client-churn',
    color: '#EF4444',
    category: 'analytics',
  },
  // موقعي
  {
    id: 'branches',
    title: 'إدارة الفروع',
    icon: <Store sx={{ fontSize: 32 }} />,
    path: '/settings/branches',
    color: '#F59E0B',
    category: 'location',
  },
  {
    id: 'location-settings',
    title: 'إعدادات الموقع',
    icon: <LocationOn sx={{ fontSize: 32 }} />,
    path: '/settings/location-settings',
    color: '#14B8A6',
    category: 'location',
  },
  {
    id: 'business-information',
    title: 'معلومات العمل',
    icon: <Business sx={{ fontSize: 32 }} />,
    path: '/settings/business-information',
    color: '#10B981',
    category: 'location',
  },
  // إعدادات النظام
  {
    id: 'notifications',
    title: 'الإشعارات',
    icon: <Notifications sx={{ fontSize: 32 }} />,
    path: '/settings/notifications',
    color: '#3B82F6',
    category: 'system',
  },
  {
    id: 'chains',
    title: 'السلاسل',
    icon: <Link sx={{ fontSize: 32 }} />,
    path: '/settings/chains',
    color: '#8B5CF6',
    category: 'system',
  },
  {
    id: 'webhook',
    title: 'Webhook',
    icon: <Webhook sx={{ fontSize: 32 }} />,
    path: '/settings/webhook',
    color: '#EC4899',
    category: 'system',
  },
  // المخزون
  {
    id: 'inventory-settings',
    title: 'إعدادات المخزون',
    icon: <Inventory2Outlined sx={{ fontSize: 32 }} />,
    path: '/settings/inventory-settings',
    color: '#14B8A6',
    category: 'inventory',
  },
];

const categories = [
  { id: 'main', title: 'الإعدادات الرئيسية' },
  { id: 'categories', title: 'الفئات' },
  { id: 'finance', title: 'المالية' },
  { id: 'analytics', title: 'التحليلات' },
  { id: 'location', title: 'موقعي' },
  { id: 'system', title: 'إعدادات النظام' },
  { id: 'inventory', title: 'المخزون' },
];

const SettingsMain: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          الإعدادات
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          إدارة إعدادات نظام عملك
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {categories.map((category) => {
            const categorySections = settingsSections.filter(
              (section) => section.category === category.id
            );

            if (categorySections.length === 0) return null;

            return (
              <Box key={category.id} sx={{ mb: 5 }}>
                <Typography
                  variant="h6"
                  sx={{
                    mb: 2,
                    fontWeight: 600,
                    color: 'text.secondary',
                  }}
                >
                  {category.title}
                </Typography>
                <Grid container spacing={3}>
                  {categorySections.map((section) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={section.id}>
                      <motion.div variants={itemVariants}>
                        <Card
                          elevation={0}
                          sx={{
                            border: `1px solid ${theme.palette.divider}`,
                            height: '100%',
                            transition: 'all 0.3s',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              boxShadow: theme.shadows[4],
                              borderColor: section.color,
                            },
                          }}
                        >
                          <CardActionArea
                            onClick={() => navigate(section.path)}
                            sx={{ height: '100%' }}
                          >
                            <CardContent
                              sx={{
                                textAlign: 'center',
                                py: 4,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 72,
                                  height: 72,
                                  borderRadius: 2,
                                  backgroundColor: `${section.color}20`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  mx: 'auto',
                                  mb: 2,
                                  color: section.color,
                                }}
                              >
                                {section.icon}
                              </Box>
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 600,
                                  fontSize: isMobile ? '1rem' : '1.1rem',
                                }}
                              >
                                {section.title}
                              </Typography>
                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            );
          })}
        </motion.div>
      </Box>
    </Box>
  );
};

export default SettingsMain;