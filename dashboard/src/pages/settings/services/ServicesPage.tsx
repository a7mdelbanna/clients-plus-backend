import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  useMediaQuery,
} from '@mui/material';
import {
  Search,
  Star,
  Add,
  KeyboardArrowDown,
  Upload,
  Download,
  MoreVert,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import CreateServiceModal from '../../../components/services/CreateServiceModal';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { toast } from 'react-toastify';
import { serviceApiService } from '../../../services/api/service.api.service';
import type { ServiceCategory as ServiceCategoryType } from '../../../services/api/service.api.service';


const ServicesPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [categories, setCategories] = useState<ServiceCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [excelMenuAnchor, setExcelMenuAnchor] = useState<null | HTMLElement>(null);

  const loadCategories = async () => {
    try {
      setLoading(true);
      
      // Get company ID from the user object
      const companyId = currentUser?.companyId;
      
      console.log('Company ID:', companyId);
      
      if (!companyId) {
        toast.error('لم يتم العثور على معرف الشركة');
        setLoading(false);
        return;
      }
      
      // Load categories from API
      const categoriesData = await serviceApiService.getCategories(currentBranch?.id);
      console.log('Categories loaded:', categoriesData);
      setCategories(categoriesData);
      setLoading(false);
    } catch (error: any) {
      console.error('Error loading categories:', error);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      toast.error('فشل تحميل الفئات');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    loadCategories();
  }, [currentUser, currentBranch]);

  const handleExcelMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExcelMenuAnchor(event.currentTarget);
  };

  const handleExcelMenuClose = () => {
    setExcelMenuAnchor(null);
  };

  const handleExportExcel = () => {
    // TODO: Implement Excel export
    toast.info('تصدير Excel - قريباً');
    handleExcelMenuClose();
  };

  const handleImportExcel = () => {
    // TODO: Implement Excel import
    toast.info('استيراد Excel - قريباً');
    handleExcelMenuClose();
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.nameAr?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <Star sx={{ color: '#F59E0B', fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              فئات الخدمات
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<KeyboardArrowDown />}
              onClick={handleExcelMenuOpen}
              sx={{
                borderColor: theme.palette.divider,
                color: theme.palette.text.secondary,
              }}
            >
              إجراءات Excel
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCreateModalOpen(true)}
              sx={{
                backgroundColor: '#F59E0B',
                '&:hover': {
                  backgroundColor: '#D97706',
                },
              }}
            >
              إنشاء
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Excel Menu */}
      <Menu
        anchorEl={excelMenuAnchor}
        open={Boolean(excelMenuAnchor)}
        onClose={handleExcelMenuClose}
      >
        <MenuItem onClick={handleExportExcel}>
          <Download sx={{ mr: 1 }} />
          تصدير إلى Excel
        </MenuItem>
        <MenuItem onClick={handleImportExcel}>
          <Upload sx={{ mr: 1 }} />
          استيراد من Excel
        </MenuItem>
      </Menu>

      {/* Search Bar */}
      <Box sx={{ p: 3, pb: 0 }}>
        <TextField
          fullWidth
          placeholder="اسم الخدمة"
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
      <Box sx={{ p: 3 }} key={categories.length}>
        {loading ? (
          // Loading state
          <Box>
            {[1, 2, 3].map((index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Skeleton variant="text" width="30%" height={30} />
                  <Skeleton variant="text" width="20%" height={20} />
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : filteredCategories.length === 0 ? (
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
                  : 'لا توجد فئات خدمات بعد'}
              </Typography>
              {!searchTerm && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}
                >
                  قم بإنشاء فئات لتنظيم خدماتك، مثل قص الشعر أو العناية بالبشرة
                </Typography>
              )}
            </Box>
          </motion.div>
        ) : (
          // Categories list
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {filteredCategories.map((category) => (
                <motion.div
                  key={category.id}
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
                    onClick={() => navigate(`/settings/services/category/${category.id}`)}
                  >
                    <CardContent
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography variant="h6" sx={{ mb: 0.5 }}>
                          {isRTL ? category.nameAr || category.name : category.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          يحتوي على خدمات: {category.servicesCount || 0}
                        </Typography>
                      </Box>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Open category menu
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </Box>

      {/* Create Service Modal */}
      <CreateServiceModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          // Reload categories after successful creation
          loadCategories();
        }}
      />
    </Box>
  );
};

export default ServicesPage;