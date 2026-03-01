import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Card,
  CardContent,
  Skeleton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowBack,
  Search,
  Add,
  Edit,
  Delete,
  MoreVert,
  AttachMoney,
  AccessTime,
  Person,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { serviceService } from '../../../services/service.service';
import type { ServiceCategory as ServiceCategoryType, Service } from '../../../services/service.service';

const ServiceCategoryPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { categoryId } = useParams<{ categoryId: string }>();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [category, setCategory] = useState<ServiceCategoryType | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceMenuAnchor, setServiceMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (categoryId && currentUser) {
      loadCategoryAndServices();
    }
  }, [categoryId, currentUser]);

  const loadCategoryAndServices = async () => {
    if (!currentUser || !categoryId) return;

    try {
      setLoading(true);
      
      // Get company ID using the same method as dashboard
      let companyId = currentUser?.companyId;

      if (!companyId) {
        toast.error('لم يتم العثور على معرف الشركة');
        return;
      }

      // Load category
      const categories = await serviceService.getCategories(companyId);
      const foundCategory = categories.find(cat => cat.id === categoryId);
      if (foundCategory) {
        setCategory(foundCategory);
      } else {
        toast.error('الفئة غير موجودة');
        navigate('/settings/services');
        return;
      }

      // Subscribe to services in this category
      const unsubscribe = serviceService.subscribeToServices(
        companyId,
        (updatedServices) => {
          setServices(updatedServices);
          setLoading(false);
        },
        categoryId,
        (error) => {
          console.error('Error loading services:', error);
          toast.error('فشل تحميل الخدمات');
          setLoading(false);
        },
        currentBranch?.id // Pass the current branch ID for filtering
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading category and services:', error);
      toast.error('فشل تحميل البيانات');
      setLoading(false);
    }
  };

  const handleServiceMenuOpen = (event: React.MouseEvent<HTMLElement>, service: Service) => {
    event.stopPropagation();
    setSelectedService(service);
    setServiceMenuAnchor(event.currentTarget);
  };

  const handleServiceMenuClose = () => {
    setServiceMenuAnchor(null);
  };

  const handleDeleteService = async () => {
    if (!selectedService || !selectedService.id) return;

    try {
      await serviceService.deleteService(selectedService.id);
      toast.success('تم حذف الخدمة بنجاح');
      setDeleteDialogOpen(false);
      setSelectedService(null);
      handleServiceMenuClose();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('فشل حذف الخدمة');
    }
  };

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.nameAr?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (duration: { hours: number; minutes: number }) => {
    const parts = [];
    if (duration.hours > 0) {
      parts.push(`${duration.hours} ساعة`);
    }
    if (duration.minutes > 0) {
      parts.push(`${duration.minutes} دقيقة`);
    }
    return parts.join(' و ');
  };

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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="30%" height={40} sx={{ mb: 3 }} />
        {[1, 2, 3].map((index) => (
          <Card key={index} sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="text" width="40%" height={30} />
              <Skeleton variant="text" width="60%" height={20} />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/settings/services')}>
              <ArrowBack />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                {category && (isRTL ? category.nameAr || category.name : category.name)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {services.length} خدمة
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/settings/services/new')}
            sx={{
              backgroundColor: '#10B981',
              '&:hover': {
                backgroundColor: '#059669',
              },
            }}
          >
            إضافة خدمة
          </Button>
        </Box>
      </Box>

      {/* Search Bar */}
      <Box sx={{ p: 3, pb: 0 }}>
        <TextField
          fullWidth
          placeholder="البحث عن خدمة..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {filteredServices.length === 0 ? (
          // Empty state
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Box
              sx={{
                textAlign: 'center',
                py: 8,
              }}
            >
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                {searchTerm
                  ? 'لا توجد نتائج للبحث'
                  : 'لا توجد خدمات في هذه الفئة بعد'}
              </Typography>
              {!searchTerm && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/settings/services/new')}
                  sx={{
                    backgroundColor: '#10B981',
                    '&:hover': {
                      backgroundColor: '#059669',
                    },
                  }}
                >
                  إضافة أول خدمة
                </Button>
              )}
            </Box>
          </motion.div>
        ) : (
          // Services list
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {filteredServices.map((service) => (
                <motion.div
                  key={service.id}
                  variants={itemVariants}
                  layout
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Card
                    sx={{
                      mb: 2,
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: theme.shadows[4],
                      },
                    }}
                    onClick={() => navigate(`/settings/services/edit/${service.id}`)}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 2,
                        }}
                      >
                        {/* Service Image */}
                        {service.images && service.images.length > 0 && (
                          <Box
                            sx={{
                              width: 80,
                              height: 80,
                              borderRadius: 2,
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={service.images.find(img => img.isDefault)?.url || service.images[0].url}
                              alt={service.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                            />
                          </Box>
                        )}
                        
                        <Box sx={{ flex: 1 }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <Typography variant="h6">
                              {isRTL ? service.nameAr || service.name : service.name}
                            </Typography>
                            <Chip
                              label={service.type === 'appointment' ? 'موعد فردي' : 'حدث جماعي'}
                              size="small"
                              color={service.type === 'appointment' ? 'primary' : 'secondary'}
                            />
                            {service.onlineBooking.enabled ? (
                              <CheckCircle sx={{ color: '#10B981', fontSize: 20 }} />
                            ) : (
                              <Cancel sx={{ color: theme.palette.text.disabled, fontSize: 20 }} />
                            )}
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 3,
                              color: 'text.secondary',
                              fontSize: '0.875rem',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AttachMoney sx={{ fontSize: 16 }} />
                              {service.startingPrice} جنيه
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AccessTime sx={{ fontSize: 16 }} />
                              {formatDuration(service.duration)}
                            </Box>
                            {service.onlineBooking.enabled && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Person sx={{ fontSize: 16 }} />
                                حجز إلكتروني
                              </Box>
                            )}
                          </Box>
                        </Box>
                        <IconButton
                          onClick={(e) => handleServiceMenuOpen(e, service)}
                        >
                          <MoreVert />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </Box>

      {/* Service Menu */}
      <Menu
        anchorEl={serviceMenuAnchor}
        open={Boolean(serviceMenuAnchor)}
        onClose={handleServiceMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (selectedService?.id) {
              navigate(`/settings/services/edit/${selectedService.id}`);
            }
            handleServiceMenuClose();
          }}
        >
          <Edit sx={{ mr: 1 }} />
          تعديل
        </MenuItem>
        <MenuItem
          onClick={() => {
            setDeleteDialogOpen(true);
            handleServiceMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          حذف
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف خدمة "{selectedService?.name}"؟
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            إلغاء
          </Button>
          <Button
            onClick={handleDeleteService}
            color="error"
            variant="contained"
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceCategoryPage;