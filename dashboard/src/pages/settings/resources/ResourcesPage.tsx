import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  CircularProgress,
  Stack,
  Card,
  CardContent,
  Chip,
  Menu,
  MenuItem,
  Avatar,
} from '@mui/material';
import {
  Add,
  ArrowBack,
  Category,
  MoreVert,
  Edit,
  Delete,
  Help,
  Info,
  Star,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { resourceService, type Resource } from '../../../services/resource.service';
import AddResourceForm from './components/AddResourceForm';

const ResourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    let unsubscribe: (() => void) | null = null;
    
    const loadData = async () => {
      try {
        setLoading(true);
        let cId = currentUser?.companyId;

        if (!cId) {
          toast.error('لم يتم العثور على معرف الشركة');
          setLoading(false);
          return;
        }

        setCompanyId(cId);

        // Subscribe to real-time resource updates
        unsubscribe = resourceService.subscribeToResources(
          cId,
          (updatedResources) => {
            setResources(updatedResources);
            setLoading(false);
          },
          (error) => {
            console.error('Error subscribing to resources:', error);
            toast.error('حدث خطأ في تحميل الموارد');
            setLoading(false);
          },
          currentBranch?.id
        );
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('حدث خطأ في تحميل البيانات');
        setLoading(false);
      }
    };

    loadData();

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, currentBranch]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, resource: Resource) => {
    setAnchorEl(event.currentTarget);
    setSelectedResource(resource);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedResource(null);
  };

  const handleDelete = async () => {
    if (!selectedResource) return;

    if (window.confirm(`هل أنت متأكد من حذف المورد "${selectedResource.name}"؟`)) {
      try {
        await resourceService.deleteResource(selectedResource.id!, currentBranch?.id);
        toast.success('تم حذف المورد بنجاح');
      } catch (error) {
        console.error('Error deleting resource:', error);
        toast.error('حدث خطأ في حذف المورد');
      }
    }
    handleMenuClose();
  };

  const handleResourceAdded = async () => {
    toast.success('تمت إضافة المورد بنجاح');
    // Small delay to ensure real-time update is received
    setTimeout(() => {
      setShowAddForm(false);
    }, 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                  الموارد
                </Typography>
                <Info sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
                <Star sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
              </Box>
            </Box>
            
            {!showAddForm && (
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddForm(true)}
                sx={{
                  borderRadius: 2,
                  backgroundColor: theme.palette.warning.main,
                  '&:hover': { backgroundColor: theme.palette.warning.dark },
                }}
              >
                إضافة مورد
              </Button>
            )}
          </Box>

          {/* Breadcrumb */}
          <Typography variant="body2" color="text.secondary">
            الإعدادات &gt; الموارد
          </Typography>
        </Box>

        {/* Add Resource Form */}
        {showAddForm && (
          <AddResourceForm
            companyId={companyId}
            branchId={currentBranch?.id}
            onCancel={() => setShowAddForm(false)}
            onSuccess={handleResourceAdded}
          />
        )}

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : resources.length === 0 && !showAddForm ? (
          <Paper sx={{ p: 8, textAlign: 'center', borderRadius: 2 }}>
            <Category sx={{ fontSize: 80, color: theme.palette.action.disabled, mb: 2 }} />
            <Typography variant="h5" color="text.secondary" sx={{ mb: 1 }}>
              لا توجد موارد بعد
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              قم بإضافة الموارد مثل الغرف والمعدات والأدوات التي تحتاج إلى جدولة
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowAddForm(true)}
              sx={{
                backgroundColor: theme.palette.warning.main,
                '&:hover': { backgroundColor: theme.palette.warning.dark },
              }}
            >
              إضافة أول مورد
            </Button>
            
            <Box sx={{ mt: 6 }}>
              <Button
                startIcon={<Help />}
                variant="text"
                size="small"
                sx={{ color: theme.palette.text.secondary }}
              >
                مساعدة
              </Button>
            </Box>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
            {resources.map((resource) => (
              <motion.div
                key={resource.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <Card sx={{ borderRadius: 2, '&:hover': { boxShadow: theme.shadows[4] } }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                          <Category />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {resource.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            السعة: {resource.capacity}
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, resource)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>

                    {resource.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {resource.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={resource.status === 'active' ? 'نشط' : 'غير نشط'}
                        size="small"
                        color={resource.status === 'active' ? 'success' : 'default'}
                      />
                      {resource.services.length > 0 && (
                        <Chip
                          label={`${resource.services.length} خدمة`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </Box>
        )}

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => {
            // TODO: Implement edit functionality
            toast.info('ميزة التعديل قيد التطوير');
            handleMenuClose();
          }}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            تعديل
          </MenuItem>
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            حذف
          </MenuItem>
        </Menu>
      </Box>
    </motion.div>
  );
};

export default ResourcesPage;