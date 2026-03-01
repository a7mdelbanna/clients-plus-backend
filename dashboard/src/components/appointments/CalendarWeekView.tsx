import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import { Repeat } from '@mui/icons-material';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';
import type { Appointment } from '../../services/appointment.service';
import { toDateSafe } from '../../utils/dateUtils';

interface CalendarWeekViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  selectedStaffId?: string;
  staff?: any[]; // Staff array to check working hours
}

const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  currentDate,
  appointments,
  onAppointmentClick,
  onTimeSlotClick,
  selectedStaffId,
  staff = [],
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  // Generate time slots from 9:00 to 22:00
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  // Get week days
  const weekStart = startOfWeek(currentDate, { locale });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get staff working hours for a specific day
  const getStaffWorkingHours = (date: Date, staffId: string | undefined): { isWorking: boolean; start?: string; end?: string } | null => {
    if (!staffId) return null; // If no specific staff selected, no restrictions
    
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember?.schedule?.workingHours) return null; // If no schedule info, no restrictions
    
    const dayName = format(date, 'EEEE').toLowerCase();
    const daySchedule = staffMember.schedule.workingHours[dayName];
    
    if (!daySchedule?.isWorking) {
      return { isWorking: false };
    }
    
    return {
      isWorking: true,
      start: daySchedule.start || '09:00',
      end: daySchedule.end || '18:00',
    };
  };

  // Check if a specific time slot is within working hours
  const isTimeSlotAvailable = (date: Date, time: string, staffId: string | undefined) => {
    const workingHours = getStaffWorkingHours(date, staffId);
    
    // If no working hours info or no staff selected, slot is available
    if (!workingHours) return true;
    
    // If staff doesn't work this day, slot is not available
    if (!workingHours.isWorking) return false;
    
    // Check if time is within working hours
    const [slotHour, slotMinute] = time.split(':').map(Number);
    const [startHour, startMinute] = (workingHours.start || '09:00').split(':').map(Number);
    const [endHour, endMinute] = (workingHours.end || '18:00').split(':').map(Number);
    
    const slotTotalMinutes = slotHour * 60 + slotMinute;
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    return slotTotalMinutes >= startTotalMinutes && slotTotalMinutes < endTotalMinutes;
  };

  // Group appointments by day and time
  const appointmentsByDayTime = useMemo(() => {
    const grouped: Record<string, Record<string, Appointment[]>> = {};
    
    weekDays.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = {};
    });

    appointments.forEach(appointment => {
      if (!selectedStaffId || appointment.staffId === selectedStaffId) {
        const dayKey = format(toDateSafe(appointment.date), 'yyyy-MM-dd');
        const timeKey = appointment.startTime;
        
        if (grouped[dayKey]) {
          if (!grouped[dayKey][timeKey]) {
            grouped[dayKey][timeKey] = [];
          }
          grouped[dayKey][timeKey].push(appointment);
        }
      }
    });

    return grouped;
  }, [appointments, weekDays, selectedStaffId]);

  // Calculate appointment height based on duration
  const getAppointmentHeight = (appointment: Appointment) => {
    const duration = appointment.totalDuration || 30;
    return (duration / 60) * 60; // 60px per hour
  };

  // Get appointment color based on custom color or status
  const getAppointmentColor = (appointment: Appointment) => {
    // Use custom color if available
    if (appointment.color) {
      return appointment.color;
    }
    
    // Otherwise use status-based colors
    const colors = {
      pending: theme.palette.warning.main,
      confirmed: theme.palette.info.main,
      arrived: theme.palette.success.main,
      in_progress: theme.palette.primary.main,
      completed: theme.palette.success.dark,
      cancelled: theme.palette.error.main,
      no_show: theme.palette.error.dark,
      rescheduled: theme.palette.grey[600],
    };
    return colors[appointment.status as keyof typeof colors] || theme.palette.grey[500];
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
      <Box sx={{ display: 'flex', height: '100%' }}>
        {/* Time column */}
        <Box
          sx={{
            width: 80,
            borderRight: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.default,
          }}
        >
          {/* Empty header cell */}
          <Box
            sx={{
              height: 60,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          />
          
          {/* Time slots */}
          {timeSlots.map((time) => (
            <Box
              key={time}
              sx={{
                height: 60,
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.text.secondary,
                fontSize: 14,
              }}
            >
              {time}
            </Box>
          ))}
        </Box>

        {/* Days columns */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'auto' }}>
          {weekDays.map((day) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const isToday = isSameDay(day, new Date());

            return (
              <Box
                key={dayKey}
                sx={{
                  flex: 1,
                  minWidth: 150,
                  borderRight: `1px solid ${theme.palette.divider}`,
                  '&:last-child': {
                    borderRight: 'none',
                  },
                }}
              >
                {/* Day header */}
                <Box
                  sx={{
                    height: 60,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isToday
                      ? alpha(theme.palette.primary.main, 0.1)
                      : 'transparent',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: isToday
                        ? theme.palette.primary.main
                        : theme.palette.text.secondary,
                      fontWeight: isToday ? 600 : 400,
                    }}
                  >
                    {format(day, 'EEE', { locale })}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isToday ? 600 : 400,
                      color: isToday
                        ? theme.palette.primary.main
                        : theme.palette.text.primary,
                    }}
                  >
                    {format(day, 'd', { locale })}
                  </Typography>
                </Box>

                {/* Time slots for this day */}
                <Box sx={{ position: 'relative' }}>
                  {timeSlots.map((time) => {
                    const isAvailable = isTimeSlotAvailable(day, time, selectedStaffId);
                    
                    return (
                      <Box
                        key={`${dayKey}-${time}`}
                        onClick={() => isAvailable && onTimeSlotClick(day, time)}
                        sx={{
                          height: 60,
                          borderBottom: `1px solid ${theme.palette.divider}`,
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          position: 'relative',
                          transition: 'background-color 0.2s',
                          backgroundColor: isAvailable ? 'transparent' : alpha(theme.palette.action.disabled, 0.1),
                          opacity: isAvailable ? 1 : 0.6,
                          '&:hover': isAvailable ? {
                            backgroundColor: alpha(theme.palette.primary.main, 0.05),
                          } : {},
                        }}
                      >
                      {/* Appointments in this slot */}
                      {appointmentsByDayTime[dayKey]?.[time]?.map((appointment, index) => (
                        <motion.div
                          key={appointment.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(appointment);
                          }}
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: isRTL ? 'auto' : 2 + (index * 4),
                            right: isRTL ? 2 + (index * 4) : 'auto',
                            width: `calc(100% - ${4 + (index * 4)}px)`,
                            height: getAppointmentHeight(appointment) - 4,
                            backgroundColor: getAppointmentColor(appointment),
                            borderRadius: 4,
                            padding: '4px 8px',
                            color: theme.palette.common.white,
                            fontSize: 12,
                            cursor: 'pointer',
                            overflow: 'hidden',
                            boxShadow: theme.shadows[2],
                            zIndex: 10 - index,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ fontWeight: 500, flex: 1 }}>
                              {appointment.clientName}
                            </Box>
                            {appointment.repeat && appointment.repeat.type !== 'none' && (
                              <Tooltip title={isRTL ? 'موعد متكرر' : 'Recurring appointment'}>
                                <Repeat sx={{ fontSize: 14 }} />
                              </Tooltip>
                            )}
                          </Box>
                          <Box sx={{ opacity: 0.9, fontSize: 11 }}>
                            {(appointment.services[0] as any)?.serviceName}
                          </Box>
                        </motion.div>
                      ))}
                    </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Paper>
  );
};

export default CalendarWeekView;