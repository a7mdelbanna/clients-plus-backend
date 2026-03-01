import React from 'react';
import {
  Box,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Schedule,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  PersonOff,
} from '@mui/icons-material';
import type { AppointmentStatus } from '../../services/appointment.service';

interface AppointmentStatusBarProps {
  status: AppointmentStatus;
  onStatusChange: (status: AppointmentStatus) => void;
}

const statusConfig: Record<AppointmentStatus, {
  label: string;
  labelAr: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon: React.ReactNode;
}> = {
  pending: {
    label: 'Pending',
    labelAr: 'قيد الانتظار',
    color: 'warning',
    icon: <HourglassEmpty fontSize="small" />,
  },
  confirmed: {
    label: 'Confirmed',
    labelAr: 'مؤكد',
    color: 'info',
    icon: <CheckCircle fontSize="small" />,
  },
  arrived: {
    label: 'Arrived',
    labelAr: 'وصل',
    color: 'success',
    icon: <CheckCircle fontSize="small" />,
  },
  in_progress: {
    label: 'In Progress',
    labelAr: 'قيد التنفيذ',
    color: 'primary',
    icon: <Schedule fontSize="small" />,
  },
  completed: {
    label: 'Completed',
    labelAr: 'مكتمل',
    color: 'success',
    icon: <CheckCircle fontSize="small" />,
  },
  cancelled: {
    label: 'Cancelled',
    labelAr: 'ملغي',
    color: 'error',
    icon: <Cancel fontSize="small" />,
  },
  no_show: {
    label: 'No-show',
    labelAr: 'لم يحضر',
    color: 'error',
    icon: <PersonOff fontSize="small" />,
  },
  rescheduled: {
    label: 'Rescheduled',
    labelAr: 'تمت إعادة الجدولة',
    color: 'default',
    icon: <Schedule fontSize="small" />,
  },
};

const AppointmentStatusBar: React.FC<AppointmentStatusBarProps> = ({
  status,
  onStatusChange,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  const statuses: AppointmentStatus[] = ['pending', 'arrived', 'no_show', 'confirmed', 'cancelled', 'rescheduled'];

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        p: 2,
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      {statuses.map((statusKey) => {
        const config = statusConfig[statusKey];
        const isActive = status === statusKey;

        return (
          <Chip
            key={statusKey}
            label={isRTL ? config.labelAr : config.label}
            icon={config.icon}
            color={isActive ? config.color : 'default'}
            variant={isActive ? 'filled' : 'outlined'}
            onClick={() => onStatusChange(statusKey)}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              ...(isActive && {
                boxShadow: theme.shadows[2],
              }),
              '&:hover': {
                boxShadow: theme.shadows[1],
                transform: 'translateY(-1px)',
              },
            }}
          />
        );
      })}
    </Box>
  );
};

export default AppointmentStatusBar;