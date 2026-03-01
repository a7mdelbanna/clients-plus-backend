import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  Paper,
  alpha,
  Chip,
} from '@mui/material';
import { AccessTime } from '@mui/icons-material';
import { format, setHours, setMinutes, isAfter, isBefore, addMinutes } from 'date-fns';

interface TimeSlotSelectorProps {
  value: Date;
  onChange: (time: Date) => void;
  date: Date;
  duration?: number; // in minutes
  startHour?: number;
  endHour?: number;
  interval?: number; // in minutes
  busySlots?: Array<{ start: string; end: string }>;
  staffId?: string;
  workingHours?: {
    start: string;
    end: string;
  };
}

const TimeSlotSelector: React.FC<TimeSlotSelectorProps> = ({
  value,
  onChange,
  date,
  duration = 30,
  startHour = 9,
  endHour = 18,
  interval = 30,
  busySlots = [],
  staffId,
  workingHours,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const [selectedPeriod, setSelectedPeriod] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = [];
    // Use the appointment date for time slot generation
    const baseDate = new Date(date);
    const startTime = setHours(setMinutes(baseDate, 0), workingHours ? parseInt(workingHours.start.split(':')[0]) : startHour);
    const endTime = setHours(setMinutes(baseDate, 0), workingHours ? parseInt(workingHours.end.split(':')[0]) : endHour);

    let currentTime = startTime;
    while (isBefore(currentTime, endTime)) {
      const hour = currentTime.getHours();
      let period: 'morning' | 'afternoon' | 'evening';
      
      if (hour < 12) {
        period = 'morning';
      } else if (hour < 17) {
        period = 'afternoon';
      } else {
        period = 'evening';
      }

      const timeString = format(currentTime, 'HH:mm');
      const endTimeString = format(addMinutes(currentTime, duration), 'HH:mm');
      
      // Check if slot is busy
      const isBusy = busySlots.some(busy => {
        return (timeString >= busy.start && timeString < busy.end) ||
               (endTimeString > busy.start && endTimeString <= busy.end);
      });

      // Create slot time with appointment date
      const slotTime = setHours(setMinutes(new Date(date), currentTime.getMinutes()), currentTime.getHours());
      
      slots.push({
        time: slotTime,
        display: format(currentTime, 'h:mm a'),
        period,
        isBusy,
        isPast: isBefore(slotTime, new Date()),
      });

      currentTime = addMinutes(currentTime, interval);
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();
  const filteredSlots = timeSlots.filter(slot => slot.period === selectedPeriod);

  const periods = [
    { value: 'morning', label: isRTL ? 'صباحاً' : 'Morning', icon: '🌅' },
    { value: 'afternoon', label: isRTL ? 'ظهراً' : 'Afternoon', icon: '☀️' },
    { value: 'evening', label: isRTL ? 'مساءً' : 'Evening', icon: '🌆' },
  ];

  return (
    <Box>
      {/* Period Selector */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccessTime fontSize="small" />
          {isRTL ? 'اختر الفترة' : 'Select Period'}
        </Typography>
        <ToggleButtonGroup
          value={selectedPeriod}
          exclusive
          onChange={(_, newValue) => newValue && setSelectedPeriod(newValue)}
          fullWidth
          sx={{ mb: 2 }}
        >
          {periods.map((period) => (
            <ToggleButton key={period.value} value={period.value}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>{period.icon}</span>
                <span>{period.label}</span>
              </Box>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Time Slots Grid */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          {isRTL ? 'الأوقات المتاحة' : 'Available Times'}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: 1,
            maxHeight: 300,
            overflowY: 'auto',
            pr: 1,
          }}
        >
          {filteredSlots.map((slot) => {
            const isSelected = format(value, 'HH:mm') === format(slot.time, 'HH:mm');
            const isDisabled = slot.isBusy || slot.isPast;

            return (
              <Paper
                key={slot.display}
                elevation={0}
                onClick={() => !isDisabled && onChange(slot.time)}
                sx={{
                  p: 1.5,
                  textAlign: 'center',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  backgroundColor: isSelected
                    ? theme.palette.primary.main
                    : isDisabled
                    ? theme.palette.action.disabledBackground
                    : theme.palette.background.paper,
                  color: isSelected
                    ? theme.palette.primary.contrastText
                    : isDisabled
                    ? theme.palette.text.disabled
                    : theme.palette.text.primary,
                  border: `1px solid ${
                    isSelected
                      ? theme.palette.primary.main
                      : theme.palette.divider
                  }`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: isDisabled
                      ? theme.palette.action.disabledBackground
                      : isSelected
                      ? theme.palette.primary.dark
                      : alpha(theme.palette.primary.main, 0.1),
                    transform: isDisabled ? 'none' : 'translateY(-2px)',
                    boxShadow: isDisabled ? 'none' : theme.shadows[2],
                  },
                  position: 'relative',
                }}
              >
                <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                  {slot.display}
                </Typography>
                {slot.isBusy && (
                  <Chip
                    label={isRTL ? 'محجوز' : 'Busy'}
                    size="small"
                    color="error"
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      height: 20,
                      fontSize: '0.7rem',
                    }}
                  />
                )}
              </Paper>
            );
          })}
        </Box>
      </Box>

      {/* Selected Time Display */}
      <Box
        sx={{
          mt: 2,
          p: 2,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {isRTL ? 'الوقت المحدد:' : 'Selected Time:'}
        </Typography>
        <Typography variant="body1" fontWeight={600} color="primary">
          {format(value, 'h:mm a')}
        </Typography>
      </Box>
    </Box>
  );
};

export default TimeSlotSelector;