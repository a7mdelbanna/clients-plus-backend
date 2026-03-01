import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  Chip,
  useTheme,
  CircularProgress,
  Alert,
} from '@mui/material';
import { AccessTime, Block } from '@mui/icons-material';
import { format, parse, addMinutes, isAfter, isBefore, isEqual } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { appointmentService } from '../../services/appointment.service';
import type { TimeSlot } from '../../services/appointment.service';

interface TimeSlotPickerProps {
  date: Date;
  staffId: string;
  companyId: string;
  duration: number; // in minutes
  selectedTime?: string;
  onTimeSelect: (time: string) => void;
  workingHours?: {
    start: string;
    end: string;
    breaks?: { start: string; end: string }[];
  } | null; // null means employee doesn't work this day
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  date,
  staffId,
  companyId,
  duration,
  selectedTime,
  onTimeSelect,
  workingHours = { start: '09:00', end: '21:00' },
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (staffId && companyId && date) {
      loadTimeSlots();
    } else {
      setLoading(false);
      setTimeSlots([]);
    }
  }, [date, staffId, duration, companyId]);

  const loadTimeSlots = async () => {
    if (!staffId || !companyId || !date) {
      console.error('Missing required props for TimeSlotPicker');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Generate time slots based on working hours
      const slots = generateTimeSlots();
      
      // Check availability for each slot
      const availabilityPromises = slots.map(async (slot) => {
        try {
          // Create a proper Date object for this specific time slot
          const slotDateTime = parse(slot.startTime, 'HH:mm', date);
          
          // Validate the slot date time
          if (isNaN(slotDateTime.getTime())) {
            console.warn('Invalid slot time:', slot.startTime, 'for date:', date);
            return {
              ...slot,
              available: false,
            };
          }
          
          const isAvailable = await appointmentService.checkAvailability({
            companyId,
            staffId,
            date: slotDateTime,
            duration,
          });
          
          return {
            ...slot,
            available: isAvailable,
          };
        } catch (error) {
          console.error('Error checking availability for slot:', slot.startTime, error);
          return {
            ...slot,
            available: false,
          };
        }
      });

      const slotsWithAvailability = await Promise.all(availabilityPromises);
      setTimeSlots(slotsWithAvailability);
    } catch (error) {
      console.error('Error loading time slots:', error);
      setError(isRTL ? 'حدث خطأ في تحميل المواعيد المتاحة' : 'Error loading available time slots');
      // Generate slots without availability check as fallback
      setTimeSlots(generateTimeSlots());
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const slotDuration = 30; // 30-minute slots
    
    // If workingHours is null, employee doesn't work this day
    if (workingHours === null) {
      return [];
    }
    
    // Use provided working hours or defaults
    const effectiveWorkingHours = workingHours || { start: '09:00', end: '21:00' };
    
    const startTime = parse(effectiveWorkingHours.start, 'HH:mm', date);
    const endTime = parse(effectiveWorkingHours.end, 'HH:mm', date);
    
    let currentTime = startTime;
    
    while (isBefore(currentTime, endTime) || isEqual(currentTime, endTime)) {
      const slotEnd = addMinutes(currentTime, slotDuration);
      
      // Check if there's enough time for the appointment
      const appointmentEnd = addMinutes(currentTime, duration);
      if (isAfter(appointmentEnd, endTime)) {
        break;
      }
      
      // Check if slot is during a break
      const isDuringBreak = effectiveWorkingHours.breaks?.some(breakTime => {
        const breakStart = parse(breakTime.start, 'HH:mm', date);
        const breakEnd = parse(breakTime.end, 'HH:mm', date);
        return (
          (isAfter(currentTime, breakStart) && isBefore(currentTime, breakEnd)) ||
          (isAfter(slotEnd, breakStart) && isBefore(slotEnd, breakEnd)) ||
          isEqual(currentTime, breakStart)
        );
      });
      
      slots.push({
        date: format(date, 'yyyy-MM-dd'),
        startTime: format(currentTime, 'HH:mm'),
        endTime: format(slotEnd, 'HH:mm'),
        available: !isDuringBreak,
        staffId,
      });
      
      currentTime = slotEnd;
    }
    
    return slots;
  };

  const formatTimeDisplay = (time: string) => {
    const parsedTime = parse(time, 'HH:mm', new Date());
    return format(parsedTime, 'h:mm a', { locale });
  };

  const getSlotStatus = (slot: TimeSlot) => {
    const now = new Date();
    const slotTime = parse(slot.startTime, 'HH:mm', date);
    
    // Past slots
    if (isBefore(slotTime, now) && format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')) {
      return 'past';
    }
    
    // Unavailable slots
    if (!slot.available) {
      return 'unavailable';
    }
    
    // Selected slot
    if (selectedTime === slot.startTime) {
      return 'selected';
    }
    
    return 'available';
  };

  const getSlotColor = (status: string) => {
    switch (status) {
      case 'past':
        return theme.palette.action.disabled;
      case 'unavailable':
        return theme.palette.error.light;
      case 'selected':
        return theme.palette.primary.main;
      case 'available':
        return theme.palette.success.light;
      default:
        return theme.palette.action.hover;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const morningSlots = timeSlots.filter(slot => {
    const hour = parseInt(slot.startTime.split(':')[0]);
    return hour < 12;
  });

  const afternoonSlots = timeSlots.filter(slot => {
    const hour = parseInt(slot.startTime.split(':')[0]);
    return hour >= 12 && hour < 17;
  });

  const eveningSlots = timeSlots.filter(slot => {
    const hour = parseInt(slot.startTime.split(':')[0]);
    return hour >= 17;
  });

  const renderSlotSection = (title: string, slots: TimeSlot[]) => {
    if (slots.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Grid container spacing={1}>
          {slots.map((slot) => {
            const status = getSlotStatus(slot);
            const isClickable = status === 'available' || status === 'selected';
            
            return (
              <Grid item key={slot.startTime}>
                <Button
                  variant={status === 'selected' ? 'contained' : 'outlined'}
                  size="small"
                  disabled={!isClickable}
                  onClick={() => isClickable && onTimeSelect(slot.startTime)}
                  startIcon={
                    status === 'unavailable' ? (
                      <Block fontSize="small" />
                    ) : (
                      <AccessTime fontSize="small" />
                    )
                  }
                  sx={{
                    minWidth: 100,
                    borderColor: getSlotColor(status),
                    color: status === 'selected' ? 'white' : getSlotColor(status),
                    backgroundColor: status === 'selected' ? getSlotColor(status) : 'transparent',
                    '&:hover': {
                      borderColor: status === 'available' ? theme.palette.primary.main : undefined,
                      backgroundColor: status === 'available' ? theme.palette.action.hover : undefined,
                    },
                    '&.Mui-disabled': {
                      color: theme.palette.action.disabled,
                      borderColor: theme.palette.action.disabledBackground,
                    },
                  }}
                >
                  {formatTimeDisplay(slot.startTime)}
                </Button>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          size="small"
          icon={<Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: theme.palette.success.light }} />}
          label={isRTL ? 'متاح' : 'Available'}
        />
        <Chip
          size="small"
          icon={<Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: theme.palette.error.light }} />}
          label={isRTL ? 'مشغول' : 'Busy'}
        />
        <Chip
          size="small"
          icon={<Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: theme.palette.action.disabled }} />}
          label={isRTL ? 'منتهي' : 'Past'}
        />
      </Box>

      {timeSlots.length === 0 ? (
        <Alert severity="info">
          {workingHours === null 
            ? (isRTL ? 'هذا الموظف غير مجدول للعمل في هذا اليوم' : 'This staff member is not scheduled to work on this day')
            : (isRTL ? 'لا توجد مواعيد متاحة في هذا اليوم' : 'No time slots available for this day')}
        </Alert>
      ) : (
        <>
          {renderSlotSection(isRTL ? 'الصباح' : 'Morning', morningSlots)}
          {renderSlotSection(isRTL ? 'بعد الظهر' : 'Afternoon', afternoonSlots)}
          {renderSlotSection(isRTL ? 'المساء' : 'Evening', eveningSlots)}
        </>
      )}
    </Box>
  );
};

export default TimeSlotPicker;