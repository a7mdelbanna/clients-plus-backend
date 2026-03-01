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
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  CircularProgress,
  Avatar,
  Select,
  FormControl,
  InputLabel,
  Badge,
  Switch,
  Link,
  Stack,
  useMediaQuery,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  Add,
  ArrowBack,
  Search,
  MoreVert,
  Edit,
  Delete,
  People,
  FilterList,
  Star,
  Subscriptions,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { staffService, type Staff, type AccessLevel, AccessLevelDescriptions } from '../../../services/staff.service';
import { positionService, type Position } from '../../../services/position.service';
import { toDateSafe } from '../../../utils/dateUtils';
import AddEmployeeModal from './AddEmployeeModal';

const StaffPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  
  const [staff, setStaff] = useState<Staff[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>('not_deleted');
  const [accessFilter, setAccessFilter] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [companyId, setCompanyId] = useState<string>('');

  useEffect(() => {
    if (!currentUser) return;
    
    loadData();
  }, [currentUser, currentBranch]);

  const loadData = async () => {
    try {
      setLoading(true);
      let cId = currentUser?.companyId;

      if (!cId) {
        toast.error('لم يتم العثور على معرف الشركة');
        return;
      }

      setCompanyId(cId);

      // Load positions first
      const fetchedPositions = await positionService.getPositions(cId);
      setPositions(fetchedPositions);

      // Subscribe to real-time staff updates
      const unsubscribe = staffService.subscribeToStaff(
        cId,
        (updatedStaff) => {
          setStaff(updatedStaff);
          setLoading(false);
        },
        (error) => {
          console.error('Error subscribing to staff:', error);
          toast.error('حدث خطأ في تحميل الموظفين');
          setLoading(false);
        },
        currentBranch?.id // Add branch filtering
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, staffMember: Staff) => {
    setAnchorEl(event.currentTarget);
    setSelectedStaff(staffMember);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStaff(null);
  };

  const handleEdit = () => {
    if (selectedStaff) {
      navigate(`/employee/${selectedStaff.id}`);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (!selectedStaff) return;

    if (window.confirm(`هل أنت متأكد من حذف الموظف "${selectedStaff.name}"؟`)) {
      try {
        await staffService.deleteStaff(selectedStaff.id!);
        toast.success('تم حذف الموظف بنجاح');
      } catch (error) {
        console.error('Error deleting staff:', error);
        toast.error('حدث خطأ في حذف الموظف');
      }
    }
    handleMenuClose();
  };

  const getPositionName = (positionId?: string) => {
    if (!positionId) return 'غير محدد';
    const position = positions.find(p => p.id === positionId);
    return position?.name || 'غير محدد';
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setPositionFilter('all');
    setStatusFilter('active');
    setAccountStatusFilter('not_deleted');
    setAccessFilter('all');
  };

  // Apply filters
  let filteredStaff = staff;

  // Position filter
  if (positionFilter !== 'all') {
    filteredStaff = filteredStaff.filter(s => s.positionId === positionFilter);
  }

  // Employment status filter
  if (statusFilter === 'active') {
    filteredStaff = filteredStaff.filter(s => s.status === 'active');
  } else if (statusFilter === 'dismissed') {
    filteredStaff = filteredStaff.filter(s => s.status === 'dismissed');
  }

  // Account status filter
  if (accountStatusFilter === 'not_deleted') {
    filteredStaff = filteredStaff.filter(s => s.status !== 'deleted');
  } else if (accountStatusFilter === 'deleted') {
    filteredStaff = filteredStaff.filter(s => s.status === 'deleted');
  }

  // Access filter
  if (accessFilter !== 'all') {
    filteredStaff = filteredStaff.filter(s => s.access.level === accessFilter);
  }

  // Search filter
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filteredStaff = filteredStaff.filter(s =>
      s.name.toLowerCase().includes(searchLower) ||
      s.specialization?.toLowerCase().includes(searchLower)
    );
  }

  const staffCount = filteredStaff.length;

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
                <Star sx={{ color: theme.palette.warning.main }} />
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  الموظفون
                </Typography>
              </Box>
            </Box>
            
            <Link
              component="button"
              onClick={() => navigate('/subscription')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                textDecoration: 'none',
                color: theme.palette.primary.main,
              }}
            >
              <Subscriptions />
              إدارة الاشتراك
            </Link>
          </Box>

          {/* Breadcrumb */}
          <Typography variant="body2" color="text.secondary">
            الإعدادات &gt; الموظفون
          </Typography>
        </Box>

        {/* Search & Filters */}
        <Paper sx={{ mb: 3, p: 2 }}>
          <Stack spacing={2}>
            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="البحث عن الموظف بالاسم أو المنصب"
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

            {/* Filter Button & Dropdowns */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                startIcon={<FilterList />}
                onClick={() => setShowFilters(!showFilters)}
                sx={{ borderRadius: 2 }}
              >
                عوامل التصفية
              </Button>

              {showFilters && (
                <>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>المنصب</InputLabel>
                    <Select
                      value={positionFilter}
                      onChange={(e: SelectChangeEvent) => setPositionFilter(e.target.value)}
                      label="المنصب"
                    >
                      <MenuItem value="all">الكل</MenuItem>
                      {positions.map(position => (
                        <MenuItem key={position.id} value={position.id}>
                          {position.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>حالة التوظيف</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
                      label="حالة التوظيف"
                    >
                      <MenuItem value="active">غير مفصول</MenuItem>
                      <MenuItem value="dismissed">مفصول</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>حالة الحساب</InputLabel>
                    <Select
                      value={accountStatusFilter}
                      onChange={(e: SelectChangeEvent) => setAccountStatusFilter(e.target.value)}
                      label="حالة الحساب"
                    >
                      <MenuItem value="not_deleted">غير محذوف</MenuItem>
                      <MenuItem value="deleted">محذوف</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>الصلاحية</InputLabel>
                    <Select
                      value={accessFilter}
                      onChange={(e: SelectChangeEvent) => setAccessFilter(e.target.value)}
                      label="الصلاحية"
                    >
                      <MenuItem value="all">الكل</MenuItem>
                      <MenuItem value="Employee">موظف</MenuItem>
                      <MenuItem value="Administrator">مسؤول</MenuItem>
                      <MenuItem value="Owner">مالك</MenuItem>
                      <MenuItem value="CallCenter">مركز اتصال</MenuItem>
                      <MenuItem value="Accountant">محاسب</MenuItem>
                      <MenuItem value="Manager">مدير</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}
            </Box>

            {/* Results Counter */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Badge badgeContent={staffCount} color="primary">
                <Typography variant="body2">عُثر على:</Typography>
              </Badge>
              <Button variant="text" size="small" onClick={handleResetFilters}>
                إعادة تعيين
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddModal(true)}
                sx={{
                  borderRadius: 2,
                  backgroundColor: theme.palette.warning.main,
                  '&:hover': { backgroundColor: theme.palette.warning.dark },
                }}
              >
                إضافة موظف
              </Button>
            </Box>
          </Stack>
        </Paper>

        {/* Info Notice */}
        <Paper sx={{ mb: 3, p: 2, backgroundColor: theme.palette.info.light + '20' }}>
          <Typography variant="body2" color="info.main">
            يتم عرض الموظفين في أداة الحجز بناءً على ترتيب إضافتهم إلى جدول العمل
          </Typography>
        </Paper>

        {/* Staff Table */}
        <Paper sx={{ overflow: 'hidden', borderRadius: 2 }}>
          {loading ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : filteredStaff.length === 0 ? (
            <Box sx={{ p: 8, textAlign: 'center' }}>
              <People sx={{ fontSize: 80, color: theme.palette.action.disabled, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                {searchTerm || showFilters ? 'لا توجد نتائج للبحث' : 'لا يوجد موظفون بعد'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm || showFilters ? 'جرب تغيير معايير البحث' : 'ابدأ بإضافة الموظفين في شركتك'}
              </Typography>
              {!searchTerm && !showFilters && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setShowAddModal(true)}
                  sx={{
                    backgroundColor: theme.palette.warning.main,
                    '&:hover': { backgroundColor: theme.palette.warning.dark },
                  }}
                >
                  إضافة أول موظف
                </Button>
              )}
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      الاسم ({staffCount})
                    </TableCell>
                    <TableCell>مجدول حتى</TableCell>
                    <TableCell align="center">الحجز عبر الإنترنت</TableCell>
                    <TableCell align="center">يقدم خدمات</TableCell>
                    <TableCell>الصلاحية</TableCell>
                    <TableCell align="center">الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow
                      key={member.id}
                      sx={{
                        '&:hover': { backgroundColor: theme.palette.action.hover },
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/employee/${member.id}`)}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            src={member.avatar}
                            alt={member.name}
                            sx={{ width: 40, height: 40 }}
                          >
                            {member.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {member.name}
                            </Typography>
                            {member.specialization && (
                              <Typography variant="caption" color="text.secondary">
                                {member.specialization}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {member.schedule.scheduledUntil ? (
                          toDateSafe(member.schedule.scheduledUntil).toLocaleDateString('ar-EG')
                        ) : (
                          <Link
                            component="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/employee/${member.id}?tab=schedule`);
                            }}
                          >
                            إضافة إلى جدول العمل
                          </Link>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Switch
                          checked={member.onlineBooking.enabled}
                          size="small"
                          onClick={(e) => e.stopPropagation()}
                          onChange={async (e) => {
                            e.stopPropagation();
                            try {
                              await staffService.updateStaff(member.id!, {
                                'onlineBooking.enabled': e.target.checked,
                              });
                            } catch (error) {
                              console.error('Error updating online booking:', error);
                              toast.error('حدث خطأ في تحديث الحجز عبر الإنترنت');
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        {member.servicesCount || 0}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={member.access.status === 'not_granted' ? 'دعوة' : 
                                member.access.status === 'invited' ? 'مدعو' : 
                                AccessLevelDescriptions[member.access.level]}
                          size="small"
                          color={member.access.status === 'active' ? 'primary' : 'default'}
                          variant={member.access.status === 'active' ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMenuOpen(e, member);
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

        {/* Add Employee Modal */}
        <AddEmployeeModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          companyId={companyId}
          positions={positions}
        />
      </Box>
    </motion.div>
  );
};

export default StaffPage;