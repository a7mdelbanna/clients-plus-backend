import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Alert,
  useTheme,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Badge,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Store,
  LocationOn,
  Phone,
  Star,
  Block,
  CheckCircle,
  People,
  MedicalServices,
  ArrowBack,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { branchService, type Branch } from '../../../services/branch.service';

const BranchManagementPage: React.FC = () => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { refreshBranches } = useBranch();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [planType] = useState<'trial' | 'basic' | 'pro' | 'enterprise'>('trial'); // TODO: Get from user's plan

  useEffect(() => {
    if (!currentUser) return;

    const loadBranches = async () => {
      try {
        const cId = currentUser?.companyId;

        if (!cId) {
          toast.error(isRTL ? 'لم يتم العثور على معرف الشركة' : 'Company ID not found');
          setLoading(false);
          return;
        }

        setCompanyId(cId);
        const branchList = await branchService.getBranches(cId, true); // Include inactive
        setBranches(branchList);
      } catch (error) {
        console.error('Error loading branches:', error);
        toast.error(isRTL ? 'حدث خطأ في تحميل الفروع' : 'Error loading branches');
      } finally {
        setLoading(false);
      }
    };

    loadBranches();
  }, [currentUser, isRTL]);

  const handleAddBranch = async () => {
    if (!companyId) return;

    const canAdd = await branchService.canAddBranch(companyId, planType);
    if (!canAdd) {
      toast.warning(
        isRTL 
          ? `لقد وصلت إلى الحد الأقصى من الفروع لخطة ${planType}` 
          : `You have reached the maximum branches for ${planType} plan`
      );
      return;
    }

    navigate('/settings/branches/new');
  };

  const handleEditBranch = (branchId: string) => {
    navigate(`/settings/branches/${branchId}/edit`);
  };

  const handleDeleteClick = (branch: Branch) => {
    if (branch.type === 'main' || branch.isMain) {
      toast.error(isRTL ? 'لا يمكن حذف الفرع الرئيسي' : 'Cannot delete the main branch');
      return;
    }
    setBranchToDelete(branch);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!companyId || !branchToDelete || !branchToDelete.id) return;

    try {
      await branchService.deleteBranch(companyId, branchToDelete.id);
      await refreshBranches();
      
      // Reload branches
      const branchList = await branchService.getBranches(companyId, true);
      setBranches(branchList);
      
      toast.success(isRTL ? 'تم حذف الفرع بنجاح' : 'Branch deleted successfully');
    } catch (error: any) {
      toast.error(error.message || (isRTL ? 'حدث خطأ في حذف الفرع' : 'Error deleting branch'));
    } finally {
      setDeleteDialogOpen(false);
      setBranchToDelete(null);
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    if (!companyId || !branch.id) return;

    if (branch.type === 'main' || branch.isMain) {
      toast.error(isRTL ? 'لا يمكن تعطيل الفرع الرئيسي' : 'Cannot deactivate the main branch');
      return;
    }

    try {
      await branchService.updateBranch(companyId, branch.id, {
        status: branch.status === 'active' ? 'inactive' : 'active',
      });
      
      // Reload branches
      const branchList = await branchService.getBranches(companyId, true);
      setBranches(branchList);
      
      toast.success(
        branch.status === 'active' 
          ? (isRTL ? 'تم تعطيل الفرع' : 'Branch deactivated')
          : (isRTL ? 'تم تفعيل الفرع' : 'Branch activated')
      );
    } catch (error) {
      toast.error(isRTL ? 'حدث خطأ في تحديث حالة الفرع' : 'Error updating branch status');
    }
  };

  const getPlanLimits = () => {
    const limits = {
      trial: { max: 2, color: 'warning' as const },
      basic: { max: 3, color: 'info' as const },
      pro: { max: 5, color: 'primary' as const },
      enterprise: { max: Infinity, color: 'success' as const },
    };
    return limits[planType];
  };

  const planLimits = getPlanLimits();
  const activeBranchCount = branches.filter(b => b.status === 'active' || b.active !== false).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton
            onClick={() => navigate('/settings')}
            sx={{
              backgroundColor: theme.palette.action.hover,
              '&:hover': { backgroundColor: theme.palette.action.selected },
            }}
          >
            <ArrowBack />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {isRTL ? 'إدارة الفروع' : 'Branch Management'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isRTL ? 'إدارة فروع شركتك وإعداداتها' : 'Manage your company branches and their settings'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddBranch}
            disabled={activeBranchCount >= planLimits.max}
          >
            {isRTL ? 'إضافة فرع' : 'Add Branch'}
          </Button>
        </Box>

        {/* Plan Limit Alert */}
        {activeBranchCount >= planLimits.max && (
          <Alert severity={planLimits.color} sx={{ mb: 3 }}>
            {isRTL 
              ? `لقد وصلت إلى الحد الأقصى من الفروع (${planLimits.max} فروع) لخطة ${planType}` 
              : `You have reached the maximum number of branches (${planLimits.max} branches) for ${planType} plan`}
          </Alert>
        )}

        {/* Branches Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{isRTL ? 'اسم الفرع' : 'Branch Name'}</TableCell>
                <TableCell>{isRTL ? 'العنوان' : 'Address'}</TableCell>
                <TableCell>{isRTL ? 'الهاتف' : 'Phone'}</TableCell>
                <TableCell align="center">{isRTL ? 'الموظفين' : 'Staff'}</TableCell>
                <TableCell align="center">{isRTL ? 'الخدمات' : 'Services'}</TableCell>
                <TableCell align="center">{isRTL ? 'الحالة' : 'Status'}</TableCell>
                <TableCell align="center">{isRTL ? 'الإجراءات' : 'Actions'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {branches.map((branch) => (
                <TableRow 
                  key={branch.id}
                  sx={{ 
                    opacity: branch.status === 'inactive' || branch.active === false ? 0.6 : 1,
                    backgroundColor: branch.status === 'inactive' || branch.active === false 
                      ? theme.palette.action.disabledBackground 
                      : 'transparent'
                  }}
                >
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Store color="action" />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {branch.name}
                        </Typography>
                        {(branch.type === 'main' || branch.isMain) && (
                          <Chip
                            icon={<Star />}
                            label={isRTL ? 'رئيسي' : 'Main'}
                            size="small"
                            color="primary"
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">
                        {branch.address?.street || branch.address || '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2">
                        {branch.contact?.phones?.[0] 
                          ? `${branch.contact.phones[0].countryCode}${branch.contact.phones[0].number}`
                          : branch.phone || '-'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Badge badgeContent={branch.staff?.length || 0} color="primary">
                      <People fontSize="small" />
                    </Badge>
                  </TableCell>
                  <TableCell align="center">
                    <Badge badgeContent={branch.services?.length || 0} color="secondary">
                      <MedicalServices fontSize="small" />
                    </Badge>
                  </TableCell>
                  <TableCell align="center">
                    {(branch.status === 'active' || branch.active !== false) ? (
                      <Chip
                        icon={<CheckCircle />}
                        label={isRTL ? 'نشط' : 'Active'}
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        icon={<Block />}
                        label={isRTL ? 'غير نشط' : 'Inactive'}
                        color="default"
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={isRTL ? 'تعديل' : 'Edit'}>
                      <IconButton
                        size="small"
                        onClick={() => branch.id && handleEditBranch(branch.id)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip 
                      title={
                        branch.status === 'active' || branch.active !== false
                          ? (isRTL ? 'تعطيل' : 'Deactivate')
                          : (isRTL ? 'تفعيل' : 'Activate')
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleStatus(branch)}
                          color={branch.status === 'active' || branch.active !== false ? 'warning' : 'success'}
                          disabled={branch.type === 'main' || branch.isMain}
                        >
                          {branch.status === 'active' || branch.active !== false ? <Block /> : <CheckCircle />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={isRTL ? 'حذف' : 'Delete'}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(branch)}
                          color="error"
                          disabled={branch.type === 'main' || branch.isMain}
                        >
                          <Delete />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {branches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Box sx={{ py: 4 }}>
                      <Store sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography color="text.secondary">
                        {isRTL ? 'لا توجد فروع بعد' : 'No branches yet'}
                      </Typography>
                      <Button
                        variant="outlined"
                        startIcon={<Add />}
                        onClick={handleAddBranch}
                        sx={{ mt: 2 }}
                      >
                        {isRTL ? 'إضافة أول فرع' : 'Add First Branch'}
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>
            {isRTL ? 'تأكيد الحذف' : 'Confirm Delete'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              {isRTL 
                ? `هل أنت متأكد من حذف فرع "${branchToDelete?.name}"؟ سيتم تعطيل الفرع ولن يظهر في القوائم.`
                : `Are you sure you want to delete branch "${branchToDelete?.name}"? The branch will be deactivated and won't appear in lists.`}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" autoFocus>
              {isRTL ? 'حذف' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default BranchManagementPage;