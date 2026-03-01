import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { appointmentService } from '../../services/appointment.service';
import { toDateSafe } from '../../utils/dateUtils';
import type { Appointment } from '../../services/appointment.service';

interface VisitHistoryProps {
  clientId: string;
  companyId: string;
  branchId?: string;
}

const VisitHistory: React.FC<VisitHistoryProps> = ({
  clientId,
  companyId,
  branchId,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  const [filter, setFilter] = useState('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId && companyId) {
      loadClientAppointments();
    } else {
      // If no clientId, set loading to false immediately
      setLoading(false);
    }
  }, [clientId, companyId, branchId]);

  const loadClientAppointments = async () => {
    try {
      setLoading(true);
      const clientAppointments = await appointmentService.getClientAppointments(
        companyId,
        clientId,
        undefined, // maxResults
        branchId
      );
      setAppointments(clientAppointments);
    } catch (error) {
      console.error('Error loading client appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      pending: 'warning',
      confirmed: 'info',
      arrived: 'success',
      in_progress: 'primary',
      completed: 'success',
      cancelled: 'error',
      no_show: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      pending: { en: 'Pending', ar: 'قيد الانتظار' },
      confirmed: { en: 'Confirmed', ar: 'مؤكد' },
      arrived: { en: 'Arrived', ar: 'وصل' },
      in_progress: { en: 'In Progress', ar: 'قيد التنفيذ' },
      completed: { en: 'Completed', ar: 'مكتمل' },
      cancelled: { en: 'Cancelled', ar: 'ملغي' },
      no_show: { en: 'No-show', ar: 'لم يحضر' },
    };
    return isRTL ? labels[status]?.ar : labels[status]?.en;
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (filter === 'all') return true;
    return appointment.status === filter;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!clientId) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          {isRTL ? 'لم يتم تحديد عميل بعد' : 'No client selected yet'}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {isRTL ? 'يرجى اختيار عميل لعرض سجل الزيارات' : 'Please select a client to view visit history'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Filter */}
      <FormControl fullWidth size="small" sx={{ mb: 3 }}>
        <InputLabel>{isRTL ? 'عرض جميع المواعيد' : 'Show all appointments'}</InputLabel>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          label={isRTL ? 'عرض جميع المواعيد' : 'Show all appointments'}
        >
          <MenuItem value="all">{isRTL ? 'جميع المواعيد' : 'All appointments'}</MenuItem>
          <MenuItem value="completed">{isRTL ? 'المكتملة' : 'Completed'}</MenuItem>
          <MenuItem value="cancelled">{isRTL ? 'الملغية' : 'Cancelled'}</MenuItem>
          <MenuItem value="no_show">{isRTL ? 'لم يحضر' : 'No-show'}</MenuItem>
        </Select>
      </FormControl>

      {/* Table */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{isRTL ? 'التاريخ' : 'Date'}</TableCell>
              <TableCell>{isRTL ? 'الموظف' : 'Employee'}</TableCell>
              <TableCell>{isRTL ? 'الحالة' : 'Status'}</TableCell>
              <TableCell>{isRTL ? 'الخدمة' : 'Service'}</TableCell>
              <TableCell align="right">{isRTL ? 'التكلفة' : 'Cost'}</TableCell>
              <TableCell align="right">{isRTL ? 'المدفوع' : 'Paid'}</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAppointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                    {isRTL ? 'لا توجد مواعيد' : 'No appointments found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredAppointments.map((appointment) => (
                <TableRow
                  key={appointment.id}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {format(toDateSafe(appointment.date), 'dd MMM yyyy', { locale })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {appointment.startTime || ''}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: theme.palette.primary.main,
                          color: theme.palette.primary.contrastText,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {appointment.staffName?.charAt(0) || '?'}
                      </Box>
                      <Box>
                        <Typography variant="body2">
                          {appointment.staffName || 'Unknown Staff'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {appointment.branchName || ''}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(appointment.status)}
                      color={getStatusColor(appointment.status)}
                      size="small"
                      variant={appointment.status === 'pending' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {appointment.services[0]?.serviceName || '---'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {appointment.totalPrice || 0} {isRTL ? 'ج.م' : 'EGP'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {appointment.paymentStatus === 'full' 
                        ? appointment.totalPrice 
                        : appointment.paymentStatus === 'partial'
                        ? appointment.prepaidAmount || 0
                        : 0} {isRTL ? 'ج.م' : 'EGP'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button size="small" color="primary">
                      {isRTL ? 'جديد' : 'new'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default VisitHistory;