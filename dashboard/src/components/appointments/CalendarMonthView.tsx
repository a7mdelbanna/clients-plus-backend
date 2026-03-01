import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  alpha,
  Badge,
  Tooltip,
  Chip,
} from '@mui/material';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';
import type { Appointment } from '../../services/appointment.service';
import { toDateSafe } from '../../utils/dateUtils';

interface CalendarMonthViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onDateClick: (date: Date) => void;
  selectedStaffId?: string;
}

const CalendarMonthView: React.FC<CalendarMonthViewProps> = ({
  currentDate,
  appointments,
  onAppointmentClick,
  onDateClick,
  selectedStaffId,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale });
    const endDate = endOfWeek(monthEnd, { locale });

    const days = [];
    let date = startDate;

    while (date <= endDate) {
      days.push(date);
      date = addDays(date, 1);
    }

    return days;
  }, [currentDate, locale]);

  // Group appointments by date
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, Appointment[]> = {};

    appointments.forEach(appointment => {
      if (!selectedStaffId || appointment.staffId === selectedStaffId) {
        const dateKey = format(toDateSafe(appointment.date), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(appointment);
      }
    });

    return grouped;
  }, [appointments, selectedStaffId]);

  // Get appointment stats for a date
  const getDateStats = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayAppointments = appointmentsByDate[dateKey] || [];
    
    const stats = {
      total: dayAppointments.length,
      confirmed: dayAppointments.filter(a => a.status === 'confirmed').length,
      pending: dayAppointments.filter(a => a.status === 'pending').length,
      completed: dayAppointments.filter(a => a.status === 'completed').length,
      cancelled: dayAppointments.filter(a => a.status === 'cancelled').length,
    };

    return stats;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors = {
      pending: theme.palette.warning.main,
      confirmed: theme.palette.info.main,
      completed: theme.palette.success.main,
      cancelled: theme.palette.error.main,
    };
    return colors[status as keyof typeof colors] || theme.palette.grey[500];
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {/* Month header */}
      <Box sx={{
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.default,
      }}>
        <Typography variant="h6">
          {format(currentDate, 'MMMM yyyy', { locale })}
        </Typography>
      </Box>

      {/* Calendar grid */}
      <Box sx={{ p: 2, height: 'calc(100% - 64px)', overflow: 'auto' }}>
        {/* Day headers */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          mb: 1,
        }}>
          {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
            const day = addDays(startOfWeek(new Date(), { locale }), dayIndex);
            return (
              <Box
                key={dayIndex}
                sx={{
                  textAlign: 'center',
                  py: 1,
                  color: theme.palette.text.secondary,
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {format(day, 'EEE', { locale })}
              </Box>
            );
          })}
        </Box>

        {/* Calendar days */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 1,
          height: 'calc(100% - 40px)',
        }}>
          {calendarDays.map((day, index) => {
            const stats = getDateStats(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isSelected = isSameDay(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <motion.div
                key={index}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <Paper
                  elevation={isSelected ? 3 : 0}
                  onClick={() => onDateClick(day)}
                  sx={{
                    p: 1,
                    minHeight: 100,
                    cursor: 'pointer',
                    opacity: isCurrentMonth ? 1 : 0.5,
                    backgroundColor: isSelected
                      ? alpha(theme.palette.primary.main, 0.1)
                      : isTodayDate
                      ? alpha(theme.palette.warning.main, 0.1)
                      : 'transparent',
                    border: `1px solid ${
                      isSelected
                        ? theme.palette.primary.main
                        : isTodayDate
                        ? theme.palette.warning.main
                        : theme.palette.divider
                    }`,
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.05),
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                >
                  {/* Date header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isTodayDate ? 700 : 500,
                        color: isTodayDate ? theme.palette.warning.main : 'inherit',
                      }}
                    >
                      {format(day, 'd')}
                    </Typography>
                    {stats.total > 0 && (
                      <Badge
                        badgeContent={stats.total}
                        color="primary"
                        sx={{
                          '& .MuiBadge-badge': {
                            fontSize: 10,
                            height: 16,
                            minWidth: 16,
                          },
                        }}
                      />
                    )}
                  </Box>

                  {/* Appointment preview */}
                  {stats.total > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {/* Show up to 3 appointments */}
                      {appointmentsByDate[format(day, 'yyyy-MM-dd')]
                        ?.slice(0, 3)
                        .map((appointment, idx) => (
                          <Tooltip
                            key={appointment.id}
                            title={`${appointment.clientName} - ${appointment.services[0]?.serviceName}`}
                          >
                            <Box
                              onClick={(e) => {
                                e.stopPropagation();
                                onAppointmentClick(appointment);
                              }}
                              sx={{
                                fontSize: 10,
                                p: 0.5,
                                borderRadius: 0.5,
                                backgroundColor: appointment.color || getStatusColor(appointment.status),
                                color: theme.palette.common.white,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                '&:hover': {
                                  opacity: 0.8,
                                },
                              }}
                            >
                              {appointment.startTime} {appointment.clientName}
                            </Box>
                          </Tooltip>
                        ))}
                      
                      {/* Show more indicator */}
                      {appointmentsByDate[format(day, 'yyyy-MM-dd')]?.length > 3 && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: 10,
                            color: theme.palette.text.secondary,
                            textAlign: 'center',
                          }}
                        >
                          +{appointmentsByDate[format(day, 'yyyy-MM-dd')].length - 3} {isRTL ? 'المزيد' : 'more'}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {/* Status summary */}
                  {stats.total > 0 && (
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 0.5, 
                      mt: 1,
                      flexWrap: 'wrap',
                    }}>
                      {stats.confirmed > 0 && (
                        <Chip
                          label={stats.confirmed}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: 10,
                            backgroundColor: getStatusColor('confirmed'),
                            color: 'white',
                            '& .MuiChip-label': {
                              px: 0.5,
                            },
                          }}
                        />
                      )}
                      {stats.pending > 0 && (
                        <Chip
                          label={stats.pending}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: 10,
                            backgroundColor: getStatusColor('pending'),
                            color: 'white',
                            '& .MuiChip-label': {
                              px: 0.5,
                            },
                          }}
                        />
                      )}
                      {stats.completed > 0 && (
                        <Chip
                          label={stats.completed}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: 10,
                            backgroundColor: getStatusColor('completed'),
                            color: 'white',
                            '& .MuiChip-label': {
                              px: 0.5,
                            },
                          }}
                        />
                      )}
                    </Box>
                  )}
                </Paper>
              </motion.div>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
};

export default CalendarMonthView;