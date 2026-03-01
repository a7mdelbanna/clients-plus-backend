import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  useTheme,
  CircularProgress,
  alpha,
} from '@mui/material';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachHourOfInterval,
  isSameDay,
  isToday,
  parse,
  addMinutes,
  isWithinInterval,
} from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { Appointment } from '../../services/appointment.service';
import type { Staff } from '../../services/staff.service';
import AppointmentCard from './AppointmentCard';
import { toDateSafe } from '../../utils/dateUtils';

interface AppointmentCalendarProps {
  appointments: Appointment[];
  currentDate: Date;
  viewType: 'day' | 'week' | 'month';
  selectedStaff: string;
  staff: Staff[];
  loading: boolean;
  onTimeSlotClick: (date: Date, time: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  appointments,
  currentDate,
  viewType,
  selectedStaff,
  staff,
  loading,
  onTimeSlotClick,
  onAppointmentClick,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  // Time slots configuration
  const startHour = 9; // 9 AM
  const endHour = 22; // 10 PM
  const slotDuration = 30; // 30 minutes

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const startTime = new Date();
    startTime.setHours(startHour, 0, 0, 0);
    const endTime = new Date();
    endTime.setHours(endHour, 0, 0, 0);

    let currentTime = startTime;
    while (currentTime < endTime) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = addMinutes(currentTime, slotDuration);
    }
    return slots;
  }, []);

  // Get days to display based on view type
  const daysToDisplay = useMemo(() => {
    if (viewType === 'day') {
      return [currentDate];
    } else if (viewType === 'week') {
      const start = startOfWeek(currentDate, { locale });
      const end = endOfWeek(currentDate, { locale });
      return eachDayOfInterval({ start, end });
    } else {
      // Month view - simplified for now
      const start = startOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), { locale });
      const end = endOfWeek(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), { locale });
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, viewType, locale]);

  // Get appointments for a specific time slot
  const getAppointmentsForSlot = (date: Date, timeSlot: string) => {
    return appointments.filter(appointment => {
      if (!isSameDay(toDateSafe(appointment.date), date)) return false;
      
      const slotStart = parse(timeSlot, 'HH:mm', date);
      const slotEnd = addMinutes(slotStart, slotDuration);
      const appointmentStart = parse(appointment.startTime, 'HH:mm', date);
      const appointmentEnd = parse(appointment.endTime, 'HH:mm', date);

      // Check if appointment overlaps with this time slot
      return isWithinInterval(slotStart, { start: appointmentStart, end: appointmentEnd }) ||
             isWithinInterval(appointmentStart, { start: slotStart, end: slotEnd });
    });
  };

  // Check if time slot is available
  const isSlotAvailable = (date: Date, timeSlot: string, staffId?: string) => {
    // TODO: Check against staff working hours
    const hour = parseInt(timeSlot.split(':')[0]);
    const dayOfWeek = date.getDay();
    
    // Basic working hours check (9 AM - 6 PM, Monday-Saturday)
    if (hour < 9 || hour >= 18 || dayOfWeek === 0) {
      return false;
    }

    // Check if slot has appointments
    const slotAppointments = getAppointmentsForSlot(date, timeSlot);
    if (staffId && staffId !== 'all') {
      return !slotAppointments.some(apt => apt.staffId === staffId);
    }
    
    return slotAppointments.length === 0;
  };

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render month view
  if (viewType === 'month') {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {isRTL ? 'عرض الشهر قيد التطوير' : 'Month view is under development'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Time column */}
      <Box sx={{ 
        width: 80, 
        flexShrink: 0,
        borderRight: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.paper,
      }}>
        {/* Header spacer */}
        <Box sx={{ height: 60, borderBottom: `1px solid ${theme.palette.divider}` }} />
        
        {/* Time slots */}
        <Box sx={{ overflow: 'auto' }}>
          {timeSlots.map((slot) => (
            <Box
              key={slot}
              sx={{
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: `1px solid ${theme.palette.divider}`,
                fontSize: '0.875rem',
                color: theme.palette.text.secondary,
              }}
            >
              {slot}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Calendar grid */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', minWidth: 'fit-content' }}>
          {daysToDisplay.map((day) => (
            <Box
              key={day.toISOString()}
              sx={{
                minWidth: viewType === 'week' ? `${100 / 7}%` : '100%',
                borderRight: `1px solid ${theme.palette.divider}`,
              }}
            >
              {/* Day header */}
              <Box
                sx={{
                  height: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  backgroundColor: isToday(day) 
                    ? alpha(theme.palette.primary.main, 0.1)
                    : theme.palette.background.paper,
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                <Typography variant="caption" color="textSecondary">
                  {format(day, 'EEE', { locale })}
                </Typography>
                <Typography 
                  variant="h6" 
                  color={isToday(day) ? 'primary' : 'textPrimary'}
                >
                  {format(day, 'd')}
                </Typography>
              </Box>

              {/* Time slots for this day */}
              {timeSlots.map((slot) => {
                const slotAppointments = getAppointmentsForSlot(day, slot);
                const isAvailable = isSlotAvailable(day, slot, selectedStaff);

                return (
                  <Box
                    key={`${day.toISOString()}-${slot}`}
                    sx={{
                      height: 60,
                      position: 'relative',
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      backgroundColor: isAvailable 
                        ? 'transparent'
                        : alpha(theme.palette.action.disabled, 0.04),
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      '&:hover': {
                        backgroundColor: isAvailable 
                          ? alpha(theme.palette.primary.main, 0.04)
                          : alpha(theme.palette.action.disabled, 0.08),
                      },
                    }}
                    onClick={() => {
                      if (isAvailable) {
                        onTimeSlotClick(day, slot);
                      }
                    }}
                  >
                    {/* Render appointments in this slot */}
                    {slotAppointments.map((appointment, index) => {
                      // Calculate appointment position and height
                      const appointmentStart = parse(appointment.startTime, 'HH:mm', day);
                      const slotStart = parse(slot, 'HH:mm', day);
                      const minutesFromSlotStart = (appointmentStart.getTime() - slotStart.getTime()) / 60000;
                      const top = Math.max(0, (minutesFromSlotStart / slotDuration) * 60);
                      const height = (appointment.totalDuration / slotDuration) * 60;

                      // Only render if appointment starts in this slot
                      if (appointment.startTime === slot) {
                        return (
                          <Box
                            key={appointment.id}
                            sx={{
                              position: 'absolute',
                              top: `${top}px`,
                              left: 4,
                              right: 4,
                              height: `${height - 8}px`,
                              zIndex: 1,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAppointmentClick(appointment);
                            }}
                          >
                            <AppointmentCard
                              appointment={appointment}
                              compact={viewType === 'week'}
                            />
                          </Box>
                        );
                      }
                      return null;
                    })}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default AppointmentCalendar;