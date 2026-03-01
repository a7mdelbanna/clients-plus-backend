import React from 'react';
import {
  Box,
  Typography,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  AccessTime,
  Person,
  Phone,
  CheckCircle,
  Cancel,
  Schedule,
  HourglassEmpty,
} from '@mui/icons-material';
import type { Appointment, AppointmentStatus } from '../../services/appointment.service';

interface AppointmentCardProps {
  appointment: Appointment;
  compact?: boolean;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, compact = false }) => {
  const theme = useTheme();

  // Format duration from minutes to hours:minutes
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${hours}:00`;
    }
    return `${mins} min`;
  };

  // Get status color and icon
  const getStatusConfig = (status: AppointmentStatus) => {
    switch (status) {
      case 'pending':
        return { color: '#FFA726', icon: <HourglassEmpty fontSize="small" /> };
      case 'confirmed':
        return { color: '#66BB6A', icon: <CheckCircle fontSize="small" /> };
      case 'arrived':
        return { color: '#42A5F5', icon: <Person fontSize="small" /> };
      case 'in_progress':
        return { color: '#AB47BC', icon: <Schedule fontSize="small" /> };
      case 'completed':
        return { color: '#26A69A', icon: <CheckCircle fontSize="small" /> };
      case 'cancelled':
        return { color: '#EF5350', icon: <Cancel fontSize="small" /> };
      case 'no_show':
        return { color: '#BDBDBD', icon: <Cancel fontSize="small" /> };
      case 'rescheduled':
        return { color: '#9E9E9E', icon: <Schedule fontSize="small" /> };
      default:
        return { color: '#9E9E9E', icon: null };
    }
  };

  const statusConfig = getStatusConfig(appointment.status);
  const backgroundColor = appointment.color || statusConfig.color;

  // Format service names
  const serviceNames = appointment.services.map(s => s.serviceName).join(', ');

  if (compact) {
    return (
      <Box
        sx={{
          backgroundColor,
          color: theme.palette.getContrastText(backgroundColor),
          borderRadius: 1,
          p: 0.5,
          height: '100%',
          overflow: 'hidden',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: theme.shadows[4],
            zIndex: 10,
          },
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 500, display: 'block' }} noWrap>
          {appointment.startTime} - {appointment.endTime}
        </Typography>
        <Typography variant="caption" noWrap>
          {appointment.clientName}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        backgroundColor,
        color: theme.palette.getContrastText(backgroundColor),
        borderRadius: 1,
        p: 1.5,
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: theme.shadows[6],
          zIndex: 10,
        },
      }}
    >
      {/* Status indicator */}
      {statusConfig.icon && (
        <Box sx={{ position: 'absolute', top: 4, right: 4 }}>
          {statusConfig.icon}
        </Box>
      )}

      {/* Time */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <AccessTime fontSize="small" />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {appointment.startTime} - {appointment.endTime}
        </Typography>
      </Box>

      {/* Client */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Person fontSize="small" />
        <Typography variant="body2" noWrap>
          {appointment.clientName}
        </Typography>
      </Box>

      {/* Phone */}
      {appointment.clientPhone && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <Phone fontSize="small" />
          <Typography variant="caption" noWrap>
            {appointment.clientPhone}
          </Typography>
        </Box>
      )}

      {/* Services */}
      <Typography variant="caption" sx={{ display: 'block', mt: 1 }} noWrap>
        {serviceNames}
      </Typography>

      {/* Duration and price */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption">
          {formatDuration(appointment.totalDuration)}
        </Typography>
        {appointment.totalPrice > 0 && (
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {appointment.totalPrice} EGP
          </Typography>
        )}
      </Box>

      {/* Payment status for completed appointments */}
      {appointment.status === 'completed' && appointment.paymentStatus && (
        <Chip
          label={appointment.paymentStatus}
          size="small"
          sx={{
            mt: 0.5,
            height: 16,
            fontSize: '0.7rem',
            backgroundColor: alpha(theme.palette.background.paper, 0.2),
          }}
        />
      )}
    </Box>
  );
};

export default AppointmentCard;