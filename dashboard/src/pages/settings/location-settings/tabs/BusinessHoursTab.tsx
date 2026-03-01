import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControlLabel,
  Checkbox,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Divider,
  Switch,
} from '@mui/material';
import {
  Save,
  AccessTime,
  Add,
  Delete,
  ContentCopy,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

interface BusinessHoursTabProps {
  businessHours?: string;
  onSave: (businessHours: string) => Promise<void>;
  saving: boolean;
}

interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks?: Array<{
    startTime: string;
    endTime: string;
  }>;
}

interface WeekSchedule {
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
}

const defaultDaySchedule: DaySchedule = {
  isOpen: false,
  openTime: '09:00',
  closeTime: '17:00',
  breaks: [],
};

const dayNames = {
  sunday: 'الأحد',
  monday: 'الإثنين',
  tuesday: 'الثلاثاء',
  wednesday: 'الأربعاء',
  thursday: 'الخميس',
  friday: 'الجمعة',
  saturday: 'السبت',
};

const BusinessHoursTab: React.FC<BusinessHoursTabProps> = ({
  businessHours,
  onSave,
  saving,
}) => {
  const [schedule, setSchedule] = useState<WeekSchedule>({
    sunday: { ...defaultDaySchedule },
    monday: { ...defaultDaySchedule, isOpen: true },
    tuesday: { ...defaultDaySchedule, isOpen: true },
    wednesday: { ...defaultDaySchedule, isOpen: true },
    thursday: { ...defaultDaySchedule, isOpen: true },
    friday: { ...defaultDaySchedule, isOpen: true },
    saturday: { ...defaultDaySchedule },
  });

  const [use24Hours, setUse24Hours] = useState(false);

  useEffect(() => {
    if (businessHours) {
      // Parse business hours string into schedule object
      // This is a simplified version - you may want to enhance the parsing logic
      try {
        const parsed = parseBusinessHours(businessHours);
        if (parsed) {
          setSchedule(parsed);
        }
      } catch (error) {
        console.error('Error parsing business hours:', error);
      }
    }
  }, [businessHours]);

  const parseBusinessHours = (hours: string): WeekSchedule | null => {
    // Simple parser - enhance as needed
    try {
      if (hours.includes('{') && hours.includes('}')) {
        return JSON.parse(hours);
      }
      // Default parsing for simple format
      return null;
    } catch {
      return null;
    }
  };

  const handleDayToggle = (day: keyof WeekSchedule) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen,
      },
    }));
  };

  const handleTimeChange = (
    day: keyof WeekSchedule,
    field: 'openTime' | 'closeTime',
    value: string
  ) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleAddBreak = (day: keyof WeekSchedule) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: [...(prev[day].breaks || []), { startTime: '12:00', endTime: '13:00' }],
      },
    }));
  };

  const handleRemoveBreak = (day: keyof WeekSchedule, breakIndex: number) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks?.filter((_, index) => index !== breakIndex) || [],
      },
    }));
  };

  const handleBreakTimeChange = (
    day: keyof WeekSchedule,
    breakIndex: number,
    field: 'startTime' | 'endTime',
    value: string
  ) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks?.map((brk, index) =>
          index === breakIndex ? { ...brk, [field]: value } : brk
        ) || [],
      },
    }));
  };

  const copyToAllDays = (sourceDay: keyof WeekSchedule) => {
    const sourceDaySchedule = schedule[sourceDay];
    const newSchedule = { ...schedule };
    
    Object.keys(newSchedule).forEach((day) => {
      if (day !== sourceDay) {
        newSchedule[day as keyof WeekSchedule] = {
          ...sourceDaySchedule,
          breaks: sourceDaySchedule.breaks?.map(b => ({ ...b })) || [],
        };
      }
    });
    
    setSchedule(newSchedule);
    toast.success('تم نسخ الساعات إلى جميع الأيام');
  };

  const formatScheduleForSave = (): string => {
    // Format the schedule into a human-readable string
    const lines: string[] = [];
    
    Object.entries(schedule).forEach(([day, daySchedule]) => {
      if (daySchedule.isOpen) {
        let dayLine = `${dayNames[day as keyof WeekSchedule]}: ${daySchedule.openTime} - ${daySchedule.closeTime}`;
        
        if (daySchedule.breaks && daySchedule.breaks.length > 0) {
          const breakTimes = daySchedule.breaks
            .map(b => `${b.startTime}-${b.endTime}`)
            .join(', ');
          dayLine += ` (استراحة: ${breakTimes})`;
        }
        
        lines.push(dayLine);
      } else {
        lines.push(`${dayNames[day as keyof WeekSchedule]}: مغلق`);
      }
    });
    
    return lines.join('\n');
  };

  const handleSave = async () => {
    const formattedHours = formatScheduleForSave();
    await onSave(formattedHours);
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccessTime color="primary" />
            ساعات العمل
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={use24Hours}
                onChange={(e) => setUse24Hours(e.target.checked)}
              />
            }
            label="نظام 24 ساعة"
          />
        </Box>

        <Typography variant="body2" color="text.secondary">
          حدد ساعات العمل لكل يوم من أيام الأسبوع
        </Typography>

        <Divider />

        {/* Days Schedule */}
        {(Object.keys(schedule) as Array<keyof WeekSchedule>).map((day) => (
          <Box key={day} sx={{ borderBottom: 1, borderColor: 'divider', pb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={schedule[day].isOpen}
                    onChange={() => handleDayToggle(day)}
                  />
                }
                label={dayNames[day]}
                sx={{ minWidth: 120 }}
              />
              
              {schedule[day].isOpen && (
                <>
                  <TextField
                    type="time"
                    label="من"
                    value={schedule[day].openTime}
                    onChange={(e) => handleTimeChange(day, 'openTime', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 300 }}
                  />
                  
                  <Typography>-</Typography>
                  
                  <TextField
                    type="time"
                    label="إلى"
                    value={schedule[day].closeTime}
                    onChange={(e) => handleTimeChange(day, 'closeTime', e.target.value)}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 300 }}
                  />
                  
                  <IconButton
                    onClick={() => copyToAllDays(day)}
                    size="small"
                    title="نسخ إلى جميع الأيام"
                  >
                    <ContentCopy />
                  </IconButton>
                </>
              )}
            </Box>

            {/* Breaks */}
            {schedule[day].isOpen && (
              <Box sx={{ ml: 4 }}>
                {schedule[day].breaks?.map((brk, breakIndex) => (
                  <Box key={breakIndex} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: 60 }}>
                      استراحة:
                    </Typography>
                    
                    <TextField
                      type="time"
                      value={brk.startTime}
                      onChange={(e) => handleBreakTimeChange(day, breakIndex, 'startTime', e.target.value)}
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                    
                    <Typography>-</Typography>
                    
                    <TextField
                      type="time"
                      value={brk.endTime}
                      onChange={(e) => handleBreakTimeChange(day, breakIndex, 'endTime', e.target.value)}
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                    
                    <IconButton
                      onClick={() => handleRemoveBreak(day, breakIndex)}
                      size="small"
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                ))}
                
                <Button
                  startIcon={<Add />}
                  onClick={() => handleAddBreak(day)}
                  size="small"
                  sx={{ mt: 1 }}
                >
                  إضافة استراحة
                </Button>
              </Box>
            )}
          </Box>
        ))}

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving}
            sx={{
              minWidth: 200,
              backgroundColor: '#00bcd4',
              '&:hover': { backgroundColor: '#00acc1' },
            }}
          >
            {saving ? <CircularProgress size={24} /> : 'حفظ'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default BusinessHoursTab;