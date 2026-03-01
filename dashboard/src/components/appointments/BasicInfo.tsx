import React from 'react';
import {
  Box,
  Typography,
  TextField,
  useTheme,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
} from '@mui/material';
import {
  Dashboard,
  Language,
  Phone,
  DirectionsWalk,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import ServiceSelection from './ServiceSelection';
import { toDateSafe } from '../../utils/dateUtils';
import type { Appointment, AppointmentSource } from '../../services/appointment.service';
import type { Service } from '../../services/service.service';

interface BasicInfoProps {
  appointment: Appointment | null;
  companyId: string;
  staffId?: string;
  branchId?: string;
  notes: string;
  source: AppointmentSource;
  onNotesChange: (notes: string) => void;
  onSourceChange: (source: AppointmentSource) => void;
  onServicesChange?: (services: Service[]) => void;
}

const BasicInfo: React.FC<BasicInfoProps> = ({
  appointment,
  companyId,
  staffId,
  branchId,
  notes,
  source,
  onNotesChange,
  onSourceChange,
  onServicesChange,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  return (
    <Box>
      {/* Services Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          {isRTL ? 'الخدمات' : 'Services'}
        </Typography>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2, 
            backgroundColor: theme.palette.mode === 'dark'
              ? theme.palette.background.paper
              : theme.palette.background.default,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          <ServiceSelection
            appointment={appointment}
            companyId={companyId}
            staffId={staffId}
            branchId={branchId}
            onServicesChange={onServicesChange}
          />
        </Paper>
      </Box>

      {/* Source Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          {isRTL ? 'مصدر الحجز' : 'Booking Source'}
        </Typography>
        <FormControl fullWidth size="small">
          <Select
            value={source}
            onChange={(e) => onSourceChange(e.target.value as AppointmentSource)}
            displayEmpty
            startAdornment={
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, ml: 1 }}>
                {source === 'dashboard' && <Dashboard sx={{ fontSize: 20 }} />}
                {source === 'online' && <Language sx={{ fontSize: 20 }} />}
                {source === 'phone' && <Phone sx={{ fontSize: 20 }} />}
                {source === 'walk_in' && <DirectionsWalk sx={{ fontSize: 20 }} />}
              </Box>
            }
          >
            <MenuItem value="dashboard">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Dashboard sx={{ fontSize: 20 }} />
                <span>{isRTL ? 'لوحة التحكم' : 'Dashboard'}</span>
              </Box>
            </MenuItem>
            <MenuItem value="online">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Language sx={{ fontSize: 20 }} />
                <span>{isRTL ? 'عبر الإنترنت' : 'Online'}</span>
              </Box>
            </MenuItem>
            <MenuItem value="phone">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone sx={{ fontSize: 20 }} />
                <span>{isRTL ? 'الهاتف' : 'Phone'}</span>
              </Box>
            </MenuItem>
            <MenuItem value="walk_in">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DirectionsWalk sx={{ fontSize: 20 }} />
                <span>{isRTL ? 'حضور مباشر' : 'Walk-in'}</span>
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Cancellation Information */}
      {appointment?.status === 'cancelled' && (
        <Box sx={{ mb: 2 }}>
          <Alert 
            severity="warning" 
            icon={<CancelIcon />}
            sx={{ 
              mb: 2,
              '& .MuiAlert-message': {
                width: '100%'
              }
            }}
          >
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                {isRTL ? 'معلومات الإلغاء' : 'Cancellation Information'}
              </Typography>
              
              {appointment.cancelledBy && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'ملغي بواسطة:' : 'Cancelled by:'}
                  </Typography>
                  <Chip 
                    label={
                      appointment.cancelledBy === 'client' 
                        ? (isRTL ? 'العميل' : 'Client')
                        : (isRTL ? 'الموظف' : 'Staff')
                    }
                    size="small"
                    color={appointment.cancelledBy === 'client' ? 'warning' : 'default'}
                  />
                </Box>
              )}
              
              {appointment.cancelledAt && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'تاريخ الإلغاء:' : 'Cancellation Date:'}{' '}
                    {toDateSafe(appointment.cancelledAt).toLocaleString(
                      isRTL ? 'ar-EG' : 'en-US'
                    )}
                  </Typography>
                </Box>
              )}
              
              {appointment.cancellationReason && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {isRTL ? 'سبب الإلغاء:' : 'Cancellation Reason:'}
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    backgroundColor: theme.palette.action.hover,
                    p: 1.5,
                    borderRadius: 1,
                    fontStyle: 'italic'
                  }}>
                    "{appointment.cancellationReason}"
                  </Typography>
                </Box>
              )}
            </Box>
          </Alert>
        </Box>
      )}

      {/* Notes Section */}
      <Box>
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          {isRTL ? 'ملاحظات' : 'Notes'}
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder={isRTL ? 'أضف ملاحظات حول الموعد...' : 'Add notes about the appointment...'}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: theme.palette.background.paper,
            },
          }}
        />
      </Box>
    </Box>
  );
};

export default BasicInfo;