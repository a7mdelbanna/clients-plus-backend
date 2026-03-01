import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  alpha,
  Chip,
  Avatar,
  Tooltip,
} from '@mui/material';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Repeat, AccessTime, Person } from '@mui/icons-material';
import type { Appointment } from '../../services/appointment.service';
import type { Staff } from '../../services/staff.service';

interface CalendarDayViewProps {
  currentDate: Date;
  appointments: Appointment[];
  staff: Staff[];
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  selectedStaffId?: string;
}

const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  currentDate,
  appointments,
  staff,
  onAppointmentClick,
  onTimeSlotClick,
  selectedStaffId,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  // Generate time slots from 9:00 to 22:00
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  // Filter staff based on selected staff
  const displayStaff = useMemo(() => {
    if (selectedStaffId) {
      return staff.filter(s => s.id === selectedStaffId);
    }
    return staff;
  }, [staff, selectedStaffId]);

  // Get staff working hours for current date
  const getStaffWorkingHours = (staffId: string): { isWorking: boolean; start?: string; end?: string } | null => {
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember?.schedule?.workingHours) return null;
    
    const dayName = format(currentDate, 'EEEE').toLowerCase();
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
  const isTimeSlotAvailable = (time: string, staffId: string): boolean => {
    const workingHours = getStaffWorkingHours(staffId);
    
    // If no working hours info, assume available
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

  // Group appointments by staff and time
  const appointmentsByStaffTime = useMemo(() => {
    const grouped: Record<string, Record<string, Appointment[]>> = {};
    
    displayStaff.forEach(staffMember => {
      grouped[staffMember.id!] = {};
    });

    appointments.forEach(appointment => {
      if (!selectedStaffId || appointment.staffId === selectedStaffId) {
        if (grouped[appointment.staffId]) {
          const timeKey = appointment.startTime;
          if (!grouped[appointment.staffId][timeKey]) {
            grouped[appointment.staffId][timeKey] = [];
          }
          grouped[appointment.staffId][timeKey].push(appointment);
        }
      }
    });

    return grouped;
  }, [appointments, displayStaff, selectedStaffId]);

  // Get appointment color based on custom color or status
  const getAppointmentColor = (appointment: Appointment) => {
    if (appointment.color) {
      return appointment.color;
    }
    
    const colors = {
      pending: theme.palette.warning.main,
      confirmed: theme.palette.info.main,
      arrived: theme.palette.success.main,
      in_progress: theme.palette.primary.main,
      completed: theme.palette.success.dark,
      cancelled: theme.palette.error.main,
      no_show: theme.palette.error.dark,
    };
    return colors[appointment.status as keyof typeof colors] || theme.palette.grey[500];
  };

  // Calculate appointment height based on duration
  const getAppointmentHeight = (appointment: Appointment) => {
    const duration = appointment.totalDuration || 30;
    return (duration / 30) * 40 - 4; // 40px per 30 minutes, minus padding
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
      {/* Header with date */}
      <Box sx={{
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
        backgroundColor: theme.palette.background.default,
      }}>
        <Typography variant="h6">
          {format(currentDate, 'EEEE, dd MMMM yyyy', { locale })}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', height: 'calc(100% - 64px)' }}>
        {/* Time column */}
        <Box
          sx={{
            width: 80,
            borderRight: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.default,
            position: 'sticky',
            left: 0,
            zIndex: 2,
          }}
        >
          {/* Empty header cell */}
          <Box
            sx={{
              height: 80,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }}
          />
          
          {/* Time slots */}
          {timeSlots.map((time) => (
            <Box
              key={time}
              sx={{
                height: 40,
                borderBottom: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: theme.palette.text.secondary,
                fontSize: 14,
              }}
            >
              {time.endsWith(':00') ? time : ''}
            </Box>
          ))}
        </Box>

        {/* Staff columns */}
        <Box sx={{ flex: 1, display: 'flex', overflow: 'auto' }}>
          {displayStaff.map((staffMember) => (
            <Box
              key={staffMember.id}
              sx={{
                flex: 1,
                minWidth: 200,
                borderRight: `1px solid ${theme.palette.divider}`,
                '&:last-child': {
                  borderRight: 'none',
                },
              }}
            >
              {/* Staff header */}
              <Box
                sx={{
                  height: 80,
                  borderBottom: `1px solid ${theme.palette.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  p: 1,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                }}
              >
                <Avatar
                  src={staffMember.avatar}
                  sx={{ width: 40, height: 40, mb: 0.5 }}
                >
                  {staffMember.name.charAt(0)}
                </Avatar>
                <Typography variant="caption" align="center" noWrap>
                  {staffMember.name}
                </Typography>
              </Box>

              {/* Time slots for this staff */}
              <Box sx={{ position: 'relative' }}>
                {timeSlots.map((time) => {
                  const isHalfHour = time.endsWith(':30');
                  const isAvailable = isTimeSlotAvailable(time, staffMember.id!);
                  
                  return (
                    <Box
                      key={`${staffMember.id}-${time}`}
                      onClick={() => isAvailable && onTimeSlotClick(currentDate, time)}
                      sx={{
                        height: 40,
                        borderBottom: isHalfHour 
                          ? `1px dashed ${alpha(theme.palette.divider, 0.5)}`
                          : `1px solid ${theme.palette.divider}`,
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
                      {appointmentsByStaffTime[staffMember.id!]?.[time]?.map((appointment, index) => (
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
                            height: getAppointmentHeight(appointment),
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
                            <Box sx={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {appointment.clientName}
                            </Box>
                            {appointment.repeat && appointment.repeat.type !== 'none' && (
                              <Tooltip title={isRTL ? 'موعد متكرر' : 'Recurring'}>
                                <Repeat sx={{ fontSize: 14 }} />
                              </Tooltip>
                            )}
                          </Box>
                          <Box sx={{ opacity: 0.9, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {(appointment.services[0] as any)?.serviceName}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, opacity: 0.9 }}>
                            <AccessTime sx={{ fontSize: 10 }} />
                            <Typography variant="caption" sx={{ fontSize: 10 }}>
                              {appointment.startTime} - {appointment.endTime}
                            </Typography>
                          </Box>
                        </motion.div>
                      ))}
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ))}

          {/* Show message if no staff */}
          {displayStaff.length === 0 && (
            <Box sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.palette.text.secondary,
            }}>
              <Typography>
                {isRTL ? 'لا يوجد موظفين' : 'No staff members'}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default CalendarDayView;