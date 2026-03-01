import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  CircularProgress,
  Skeleton,
  useMediaQuery,
} from '@mui/material';
import {
  Add,
  ArrowBack,
  Search,
  MoreVert,
  Edit,
  Delete,
  People,
  BusinessCenter,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { positionService, type Position } from '../../../services/position.service';

const PositionsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    loadPositions();
  }, [currentUser]);

  const loadPositions = async () => {
    try {
      setLoading(true);
      let companyId = currentUser?.companyId;

      if (!companyId) {
        toast.error('لم يتم العثور على معرف الشركة');
        return;
      }

      // Subscribe to real-time updates
      const unsubscribe = positionService.subscribeToPositions(
        companyId,
        (updatedPositions) => {
          setPositions(updatedPositions);
          setLoading(false);
        },
        (error) => {
          console.error('Error subscribing to positions:', error);
          toast.error('حدث خطأ في تحميل المناصب');
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading positions:', error);
      toast.error('حدث خطأ في تحميل المناصب');
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, position: Position) => {
    setAnchorEl(event.currentTarget);
    setSelectedPosition(position);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPosition(null);
  };

  const handleEdit = () => {
    if (selectedPosition) {
      navigate(`/settings/positions/edit/${selectedPosition.id}`);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedPosition) return;

    if (selectedPosition.staffCount && selectedPosition.staffCount > 0) {
      toast.error('لا يمكن حذف منصب به موظفون');
      handleMenuClose();
      return;
    }

    if (window.confirm(`هل أنت متأكد من حذف منصب "${selectedPosition.name}"؟`)) {
      try {
        await positionService.deletePosition(selectedPosition.id!);
        toast.success('تم حذف المنصب بنجاح');
      } catch (error) {
        console.error('Error deleting position:', error);
        toast.error('حدث خطأ في حذف المنصب');
      }
    }
    handleMenuClose();
  };

  const filteredPositions = positions.filter(position =>
    position.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (position.description && position.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
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
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              إدارة المناصب
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/settings/positions/new')}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              background: `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
            }}
          >
            إضافة منصب جديد
          </Button>
        </Box>

        {/* Search */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <TextField
            fullWidth
            placeholder="البحث في المناصب..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Paper>

        {/* Positions Table/List */}
        <Paper sx={{ overflow: 'hidden', borderRadius: 2 }}>
          {loading ? (
            <Box sx={{ p: 3 }}>
              {[1, 2, 3].map((index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="60%" height={30} />
                  <Skeleton variant="text" width="40%" height={20} />
                </Box>
              ))}
            </Box>
          ) : filteredPositions.length === 0 ? (
            <Box sx={{ p: 8, textAlign: 'center' }}>
              <BusinessCenter sx={{ fontSize: 80, color: theme.palette.action.disabled, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد مناصب بعد'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm ? 'جرب البحث بكلمة أخرى' : 'ابدأ بإضافة المناصب الوظيفية في شركتك'}
              </Typography>
              {!searchTerm && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate('/settings/positions/new')}
                >
                  إضافة أول منصب
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>اسم المنصب</TableCell>
                    {!isMobile && <TableCell>الوصف</TableCell>}
                    <TableCell align="center">عدد الموظفين</TableCell>
                    <TableCell align="center">الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPositions.map((position) => (
                    <TableRow
                      key={position.id}
                      sx={{
                        '&:hover': { backgroundColor: theme.palette.action.hover },
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/settings/positions/edit/${position.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {position.name}
                        </Typography>
                      </TableCell>
                      {!isMobile && (
                        <TableCell>
                          <Typography variant="body2" color="text.secondary" sx={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}>
                            {position.description || 'لا يوجد وصف'}
                          </Typography>
                        </TableCell>
                      )}
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          <People fontSize="small" color="action" />
                          <Typography variant="body2">
                            {position.staffCount || 0}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, position);
                          }}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
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

export default PositionsPage;