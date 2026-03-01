import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  Chip,
  IconButton,
  CircularProgress,
  Paper,
  Divider,
} from '@mui/material';
import {
  LocalAtm,
  PersonOutline,
  Schedule,
  AttachMoney,
  Close,
  Refresh,
  Add,
  Remove,
  Warning,
  CheckCircle,
  SwapHoriz,
  Receipt,
} from '@mui/icons-material';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { registerService } from '../../services/register.service';
import { staffService } from '../../services/staff.service';
import type { ShiftSession, DenominationCount } from '../../types/register.types';
import type { Staff } from '../../types/staff.types';
import { toDateSafe } from '../../utils/dateUtils';
import { format } from 'date-fns';
import { enUS, ar } from 'date-fns/locale';
import toast from 'react-hot-toast';

// Component for denomination counting
const DenominationCounter: React.FC<{
  denomination: DenominationCount;
  onChange: (denomination: DenominationCount) => void;
  readonly?: boolean;
}> = ({ denomination, onChange, readonly = false }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const handleBillChange = (value: number, count: number) => {
    const newBills = { ...denomination.bills, [value]: count };
    const newDenomination = { ...denomination, bills: newBills };
    newDenomination.total = calculateTotal(newDenomination);
    onChange(newDenomination);
  };

  const handleCoinChange = (value: number, count: number) => {
    const newCoins = { ...denomination.coins, [value]: count };
    const newDenomination = { ...denomination, coins: newCoins };
    newDenomination.total = calculateTotal(newDenomination);
    onChange(newDenomination);
  };

  const calculateTotal = (denom: DenominationCount): number => {
    let total = 0;
    
    // Bills
    Object.entries(denom.bills).forEach(([value, count]) => {
      total += parseFloat(value) * count;
    });
    
    // Coins
    Object.entries(denom.coins).forEach(([value, count]) => {
      total += parseFloat(value) * count;
    });
    
    return total;
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {language === 'ar' ? 'الأوراق النقدية' : 'Bills'}
      </Typography>
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {[200, 100, 50, 20, 10, 5, 1].map(value => (
          <Grid item xs={6} sm={4} md={3} key={value}>
            <Paper sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {value} {language === 'ar' ? 'ج.م' : 'EGP'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => handleBillChange(value, Math.max(0, denomination.bills[value as keyof typeof denomination.bills] - 1))}
                  disabled={readonly}
                >
                  <Remove fontSize="small" />
                </IconButton>
                <Typography sx={{ mx: 1, minWidth: 30 }}>
                  {denomination.bills[value as keyof typeof denomination.bills]}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleBillChange(value, denomination.bills[value as keyof typeof denomination.bills] + 1)}
                  disabled={readonly}
                >
                  <Add fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="caption" color="primary">
                = {(value * denomination.bills[value as keyof typeof denomination.bills]).toFixed(2)}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle2" gutterBottom>
        {language === 'ar' ? 'العملات المعدنية' : 'Coins'}
      </Typography>
      <Grid container spacing={1} sx={{ mb: 2 }}>
        {[1, 0.5, 0.25].map(value => (
          <Grid item xs={6} sm={4} md={3} key={value}>
            <Paper sx={{ p: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {value} {language === 'ar' ? 'ج.م' : 'EGP'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => handleCoinChange(value, Math.max(0, denomination.coins[value as keyof typeof denomination.coins] - 1))}
                  disabled={readonly}
                >
                  <Remove fontSize="small" />
                </IconButton>
                <Typography sx={{ mx: 1, minWidth: 30 }}>
                  {denomination.coins[value as keyof typeof denomination.coins]}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleCoinChange(value, denomination.coins[value as keyof typeof denomination.coins] + 1)}
                  disabled={readonly}
                >
                  <Add fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="caption" color="primary">
                = {(value * denomination.coins[value as keyof typeof denomination.coins]).toFixed(2)}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
        <Typography variant="h6" align="center">
          {language === 'ar' ? 'المجموع' : 'Total'}: {denomination.total.toFixed(2)} {language === 'ar' ? 'ج.م' : 'EGP'}
        </Typography>
      </Paper>
    </Box>
  );
};

const CashRegisterPage: React.FC = () => {
  const { language } = useLanguage();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(false);
  const [activeShift, setActiveShift] = useState<ShiftSession | null>(null);
  const [employees, setEmployees] = useState<Staff[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [openingMode, setOpeningMode] = useState(false);
  const [closingMode, setClosingMode] = useState(false);
  const [openingCash, setOpeningCash] = useState<DenominationCount>({
    bills: { 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
    coins: { 1: 0, 0.5: 0, 0.25: 0 },
    total: 0
  });
  const [closingCash, setClosingCash] = useState<DenominationCount>({
    bills: { 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
    coins: { 1: 0, 0.5: 0, 0.25: 0 },
    total: 0
  });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadEmployees();
    checkActiveShift();
  }, [currentBranch]);

  const loadEmployees = async () => {
    if (!currentUser?.companyId || !currentBranch?.id) return;
    
    try {
      const staffList = await staffService.getStaff(currentUser.companyId, {
        branchId: currentBranch.id,
        status: 'active'
      });
      setEmployees(staffList.staff);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const checkActiveShift = async () => {
    if (!currentUser?.companyId || !currentBranch?.id) return;
    
    try {
      setLoading(true);
      const shifts = await registerService.getActiveShiftsForRegister(
        currentUser.companyId,
        currentBranch.id,
        'register-1' // Default register ID
      );
      
      if (shifts.length > 0) {
        const shift = await registerService.getShift(currentUser.companyId, shifts[0].id!);
        setActiveShift(shift);
      }
    } catch (error) {
      console.error('Error checking active shift:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async () => {
    if (!currentUser?.companyId || !currentBranch?.id || !selectedEmployee) {
      toast.error(language === 'ar' ? 'الرجاء اختيار موظف' : 'Please select an employee');
      return;
    }

    try {
      setLoading(true);
      const employee = employees.find(e => e.id === selectedEmployee);
      if (!employee) return;

      const shiftId = await registerService.openShift(
        currentUser.companyId,
        currentBranch.id,
        'register-1',
        selectedEmployee,
        `${employee.firstName} ${employee.lastName}`,
        openingCash,
        notes
      );

      toast.success(language === 'ar' ? 'تم فتح الوردية بنجاح' : 'Shift opened successfully');
      setOpeningMode(false);
      setSelectedEmployee('');
      setNotes('');
      await checkActiveShift();
    } catch (error: any) {
      toast.error(error.message || 'Failed to open shift');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!currentUser?.companyId || !activeShift?.id) return;

    try {
      setLoading(true);
      await registerService.closeShift(
        currentUser.companyId,
        activeShift.id,
        closingCash,
        notes,
        currentUser.id
      );

      toast.success(language === 'ar' ? 'تم إغلاق الوردية بنجاح' : 'Shift closed successfully');
      setClosingMode(false);
      setActiveShift(null);
      setNotes('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to close shift');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '-';
    return format(toDateSafe(timestamp), 'PPp', {
      locale: language === 'ar' ? ar : enUS
    });
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {language === 'ar' ? 'صندوق النقد' : 'Cash Register'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {language === 'ar' ? 'إدارة الورديات والمعاملات النقدية' : 'Manage shifts and cash transactions'}
        </Typography>
      </Box>

      {/* Active Shift Status */}
      {activeShift ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {language === 'ar' ? 'الوردية النشطة' : 'Active Shift'}
              </Typography>
              <Chip
                label={language === 'ar' ? 'مفتوح' : 'Open'}
                color="success"
                icon={<CheckCircle />}
              />
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonOutline color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {language === 'ar' ? 'الموظف' : 'Employee'}
                    </Typography>
                    <Typography variant="body1">
                      {activeShift.employeeName}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Schedule color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {language === 'ar' ? 'وقت البدء' : 'Start Time'}
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(activeShift.openedAt)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalAtm color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {language === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance'}
                    </Typography>
                    <Typography variant="body1">
                      {activeShift.openingCashTotal.toFixed(2)} {language === 'ar' ? 'ج.م' : 'EGP'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoney color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {language === 'ar' ? 'صافي التدفق النقدي' : 'Net Cash Flow'}
                    </Typography>
                    <Typography variant="body1">
                      {activeShift.netCashFlow.toFixed(2)} {language === 'ar' ? 'ج.م' : 'EGP'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {language === 'ar' ? 'المبيعات' : 'Sales'}
                </Typography>
                <Typography variant="h6" color="success.main">
                  {activeShift.totalSales.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {language === 'ar' ? 'المرتجعات' : 'Refunds'}
                </Typography>
                <Typography variant="h6" color="error.main">
                  {activeShift.totalRefunds.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {language === 'ar' ? 'الإيداعات' : 'Pay Ins'}
                </Typography>
                <Typography variant="h6">
                  {activeShift.totalPayIns.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {language === 'ar' ? 'المدفوعات' : 'Pay Outs'}
                </Typography>
                <Typography variant="h6">
                  {activeShift.totalPayOuts.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="error"
                startIcon={<Close />}
                onClick={() => setClosingMode(true)}
              >
                {language === 'ar' ? 'إغلاق الوردية' : 'Close Shift'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Receipt />}
              >
                {language === 'ar' ? 'عرض المعاملات' : 'View Transactions'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<SwapHoriz />}
              >
                {language === 'ar' ? 'إيداع نقدي' : 'Cash Drop'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info" sx={{ mb: 3 }}>
          {language === 'ar' ? 'لا توجد وردية نشطة. يرجى فتح وردية جديدة للبدء.' : 'No active shift. Please open a new shift to begin.'}
        </Alert>
      )}

      {/* Open Shift Form */}
      {!activeShift && !openingMode && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<LocalAtm />}
            onClick={() => setOpeningMode(true)}
          >
            {language === 'ar' ? 'فتح وردية جديدة' : 'Open New Shift'}
          </Button>
        </Box>
      )}

      {/* Opening Mode */}
      {openingMode && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {language === 'ar' ? 'فتح وردية جديدة' : 'Open New Shift'}
            </Typography>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                {language === 'ar' ? 'اختر الموظف' : 'Select Employee'}
              </Typography>
              <Grid container spacing={1}>
                {employees.map(employee => (
                  <Grid item key={employee.id}>
                    <Chip
                      label={`${employee.firstName} ${employee.lastName}`}
                      onClick={() => setSelectedEmployee(employee.id!)}
                      color={selectedEmployee === employee.id ? 'primary' : 'default'}
                      variant={selectedEmployee === employee.id ? 'filled' : 'outlined'}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                {language === 'ar' ? 'عد النقود الافتتاحية' : 'Opening Cash Count'}
              </Typography>
              <DenominationCounter
                denomination={openingCash}
                onChange={setOpeningCash}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setOpeningMode(false);
                  setSelectedEmployee('');
                }}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="contained"
                onClick={handleOpenShift}
                disabled={!selectedEmployee || loading}
              >
                {language === 'ar' ? 'فتح الوردية' : 'Open Shift'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Closing Mode */}
      {closingMode && activeShift && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {language === 'ar' ? 'إغلاق الوردية' : 'Close Shift'}
            </Typography>

            <Alert severity="info" sx={{ mb: 3 }}>
              {language === 'ar' ? 
                `النقد المتوقع: ${(activeShift.openingCashTotal + activeShift.totalSales - activeShift.totalRefunds + activeShift.totalPayIns - activeShift.totalPayOuts - activeShift.totalCashDrops).toFixed(2)} ج.م` :
                `Expected Cash: ${(activeShift.openingCashTotal + activeShift.totalSales - activeShift.totalRefunds + activeShift.totalPayIns - activeShift.totalPayOuts - activeShift.totalCashDrops).toFixed(2)} EGP`
              }
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                {language === 'ar' ? 'عد النقود الختامية' : 'Closing Cash Count'}
              </Typography>
              <DenominationCounter
                denomination={closingCash}
                onChange={setClosingCash}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => setClosingMode(false)}
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleCloseShift}
                disabled={loading}
              >
                {language === 'ar' ? 'إغلاق الوردية' : 'Close Shift'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default CashRegisterPage;