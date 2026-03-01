import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  IconButton,
  Badge,
} from '@mui/material';
import {
  ArrowBack,
  Star,
  People,
  CalendarToday,
  Event,
  Inventory,
  Receipt,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { categoryService } from '../../../services/category.service';

interface CategoryTypeCard {
  type: 'client' | 'appointment' | 'event' | 'product' | 'expense';
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  count: number;
}

const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState({
    client: 0,
    appointment: 0,
    event: 0,
    product: 0,
    expense: 0,
  });
  const [companyId, setCompanyId] = useState<string>('');

  useEffect(() => {
    if (!currentUser) return;
    
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      let cId = currentUser?.companyId;

      if (!cId) {
        toast.error('لم يتم العثور على معرف الشركة');
        return;
      }

      setCompanyId(cId);

      // Get category counts
      const counts = await categoryService.getCategoryCounts(cId);
      
      // Get product category count separately
      try {
        const { productService } = await import('../../../services/product.service');
        const productCategories = await productService.getCategories(cId);
        
        // Get expense category count
        const { expenseService } = await import('../../../services/expense.service');
        const expenseCategories = await expenseService.getCategories(cId);
        
        setCategoryCounts({
          ...counts,
          product: productCategories?.length || 0,
          expense: expenseCategories?.length || 0,
        });
      } catch (error) {
        console.error('Error loading product/expense categories:', error);
        setCategoryCounts({
          ...counts,
          product: 0,
          expense: 0,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const categoryTypes: CategoryTypeCard[] = [
    {
      type: 'client',
      title: 'Client Categories',
      titleAr: 'فئات العملاء',
      description: 'Organize and group your clients',
      descriptionAr: 'تنظيم وتجميع عملائك',
      icon: <People sx={{ fontSize: 48 }} />,
      color: '#F59E0B', // Orange
      route: '/settings/categories/clients',
      count: categoryCounts.client,
    },
    {
      type: 'appointment',
      title: 'Appointment Categories',
      titleAr: 'فئات المواعيد',
      description: 'Categorize different appointment types',
      descriptionAr: 'تصنيف أنواع المواعيد المختلفة',
      icon: <CalendarToday sx={{ fontSize: 48 }} />,
      color: '#3B82F6', // Blue
      route: '/settings/categories/appointments',
      count: categoryCounts.appointment,
    },
    {
      type: 'event',
      title: 'Event Categories',
      titleAr: 'فئات الفعاليات',
      description: 'Classify group events and classes',
      descriptionAr: 'تصنيف الفعاليات الجماعية والدروس',
      icon: <Event sx={{ fontSize: 48 }} />,
      color: '#8B5CF6', // Purple
      route: '/settings/categories/events',
      count: categoryCounts.event,
    },
    {
      type: 'product',
      title: 'Product Categories',
      titleAr: 'فئات المنتجات',
      description: 'Organize products into categories',
      descriptionAr: 'تنظيم المنتجات في فئات',
      icon: <Inventory sx={{ fontSize: 48 }} />,
      color: '#10B981', // Green
      route: '/products/categories',
      count: categoryCounts.product,
    },
    {
      type: 'expense',
      title: 'Expense Categories',
      titleAr: 'فئات المصروفات',
      description: 'Manage expense types and budgets',
      descriptionAr: 'إدارة أنواع المصروفات والميزانيات',
      icon: <Receipt sx={{ fontSize: 48 }} />,
      color: '#EF4444', // Red
      route: '/settings/categories/expenses',
      count: categoryCounts.expense,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton
              onClick={() => navigate('/settings')}
              sx={{
                backgroundColor: theme.palette.action.hover,
                '&:hover': { backgroundColor: theme.palette.action.selected },
              }}
            >
              <ArrowBack />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                قوائم الفئات
              </Typography>
              <Star sx={{ color: theme.palette.warning.main, fontSize: 24 }} />
            </Box>
          </Box>

          {/* Breadcrumb */}
          <Typography variant="body2" color="text.secondary">
            الإعدادات &gt; الفئات
          </Typography>
        </Box>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 3,
          }}>
            {categoryTypes.map((categoryType) => (
              <motion.div
                key={categoryType.type}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.02 }}
              >
                <Card sx={{ 
                  height: '100%',
                  borderRadius: 2,
                  boxShadow: theme.shadows[2],
                  '&:hover': { 
                    boxShadow: theme.shadows[4],
                    transform: 'translateY(-2px)',
                    transition: 'all 0.3s ease',
                  },
                }}>
                  <CardActionArea
                    onClick={() => navigate(categoryType.route)}
                    sx={{ height: '100%' }}
                  >
                    <CardContent sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      p: 4,
                    }}>
                      <Box sx={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 3,
                        color: categoryType.color,
                      }}>
                        <Badge 
                          badgeContent={categoryType.count} 
                          color="primary"
                          anchorOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                          }}
                        >
                          {categoryType.icon}
                        </Badge>
                      </Box>
                      
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          fontWeight: 600,
                          mb: 1,
                          textAlign: 'center',
                          color: categoryType.color,
                        }}
                      >
                        {categoryType.titleAr}
                      </Typography>
                      
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ 
                          textAlign: 'center',
                          mb: 2,
                        }}
                      >
                        {categoryType.title}
                      </Typography>
                      
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ 
                          textAlign: 'center',
                          flexGrow: 1,
                        }}
                      >
                        {categoryType.descriptionAr}
                      </Typography>
                      
                      <Box sx={{ 
                        mt: 3,
                        pt: 2,
                        borderTop: 1,
                        borderColor: 'divider',
                        textAlign: 'center',
                      }}>
                        <Typography variant="body2" sx={{ color: theme.palette.primary.main }}>
                          {categoryType.count > 0 
                            ? `${categoryType.count} فئة` 
                            : 'لا توجد فئات بعد'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </motion.div>
            ))}
          </Box>
        )}
      </Box>
    </motion.div>
  );
};

export default CategoriesPage;