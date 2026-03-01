import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Grid,
  Stack,
  Chip,
  IconButton,
  FormControlLabel,
  Checkbox,
  Tooltip,
  Link,
  FormHelperText,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  FiberManualRecord,
  RadioButtonUnchecked,
  Save,
  CalendarMonth,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { toast } from 'react-toastify';
import type { Staff } from '../../../services/staff.service';
import { staffService } from '../../../services/staff.service';
import { toDateSafe } from '../../../utils/dateUtils';

interface ScheduleTabProps {
  employee: Staff;
  companyId: string;
  onUpdate: (employee: Staff) => void;
}

// Days of the week
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Hours of the day (0-23)
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Schedule templates
const SCHEDULE_TEMPLATES = [
  { id: 'full-time', name: 'دوام كامل', start: 9, end: 17, days: [1, 2, 3, 4, 5] },
  { id: 'morning', name: 'دوام صباحي', start: 8, end: 14, days: [1, 2, 3, 4, 5] },
  { id: 'evening', name: 'دوام مسائي', start: 14, end: 22, days: [1, 2, 3, 4, 5] },
  { id: 'weekend', name: 'نهاية الأسبوع', start: 10, end: 18, days: [0, 6] },
];

const ScheduleTab: React.FC<ScheduleTabProps> = ({ employee, companyId, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  
  // Schedule grid state - 7 days x 24 hours
  const [scheduleGrid, setScheduleGrid] = useState<boolean[][]>(() => {
    const grid = Array(7).fill(null).map(() => Array(24).fill(false));
    
    // Initialize from existing schedule if available
    if (employee.schedule.workingHours) {
      DAY_KEYS.forEach((day, dayIndex) => {
        const daySchedule = employee.schedule.workingHours?.[day];
        if (daySchedule?.isWorking && daySchedule.start && daySchedule.end) {
          const startHour = parseInt(daySchedule.start.split(':')[0]);
          const endHour = parseInt(daySchedule.end.split(':')[0]);
          for (let hour = startHour; hour < endHour; hour++) {
            grid[dayIndex][hour] = true;
          }
        }
      });
    }
    
    return grid;
  });

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateWeeks, setTemplateWeeks] = useState(2);
  const [startDate, setStartDate] = useState<Dayjs | null>(() => {
    if (employee.schedule.scheduleStartDate) {
      return dayjs(toDateSafe(employee.schedule.scheduleStartDate));
    }
    return dayjs();
  });
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs());
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri by default
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(17);
  const [endMinute, setEndMinute] = useState(0);
  const [duration, setDuration] = useState('1-week');
  const [copyWeeks, setCopyWeeks] = useState(1);
  const [shouldCopy, setShouldCopy] = useState(false);

  const handleDotClick = (dayIndex: number, hourIndex: number) => {
    const newGrid = [...scheduleGrid];
    newGrid[dayIndex][hourIndex] = !newGrid[dayIndex][hourIndex];
    setScheduleGrid(newGrid);
  };

  const handleTemplateChange = (event: SelectChangeEvent) => {
    const templateId = event.target.value;
    setSelectedTemplate(templateId);
    
    const template = SCHEDULE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setStartHour(template.start);
      setEndHour(template.end);
      setSelectedDays(template.days);
    }
  };

  const handleFillSchedule = () => {
    const newGrid = [...scheduleGrid];
    
    // Clear existing schedule
    newGrid.forEach(day => day.fill(false));
    
    // Fill based on selected days and hours
    selectedDays.forEach(dayIndex => {
      for (let hour = startHour; hour < endHour; hour++) {
        newGrid[dayIndex][hour] = true;
      }
    });
    
    setScheduleGrid(newGrid);
    toast.success('تم ملء الجدول');
  };

  const handleClearSchedule = () => {
    const newGrid = Array(7).fill(null).map(() => Array(24).fill(false));
    setScheduleGrid(newGrid);
    toast.info('تم مسح الجدول');
  };

  const handleSaveSchedule = async () => {
    try {
      setLoading(true);
      
      // Convert grid to working hours format
      const workingHours: any = {};
      DAY_KEYS.forEach((day, dayIndex) => {
        const dayHours = scheduleGrid[dayIndex];
        const firstWorkingHour = dayHours.findIndex(h => h);
        const lastWorkingHour = dayHours.lastIndexOf(true);
        
        if (firstWorkingHour !== -1) {
          workingHours[day] = {
            isWorking: true,
            start: `${firstWorkingHour.toString().padStart(2, '0')}:00`,
            end: `${(lastWorkingHour + 1).toString().padStart(2, '0')}:00`,
            breaks: [],
          };
        } else {
          workingHours[day] = {
            isWorking: false,
            start: '',
            end: '',
            breaks: [],
          };
        }
      });

      // Calculate scheduled until date
      let scheduledUntil = startDate ? startDate.toDate() : new Date();
      if (shouldCopy) {
        scheduledUntil.setDate(scheduledUntil.getDate() + (copyWeeks * 7));
      } else if (selectedTemplate) {
        // If using a template, use templateWeeks
        scheduledUntil.setDate(scheduledUntil.getDate() + (templateWeeks * 7));
      } else {
        // Otherwise use the duration dropdown
        switch (duration) {
          case '1-week':
            scheduledUntil.setDate(scheduledUntil.getDate() + 7);
            break;
          case '2-weeks':
            scheduledUntil.setDate(scheduledUntil.getDate() + 14);
            break;
          case '1-month':
            scheduledUntil.setMonth(scheduledUntil.getMonth() + 1);
            break;
        }
      }

      const updatedSchedule = {
        'schedule.isScheduled': true,
        'schedule.scheduleStartDate': startDate.toDate().toISOString(),
        'schedule.scheduledUntil': scheduledUntil.toISOString(),
        'schedule.defaultTemplate': selectedTemplate,
        'schedule.workingHours': workingHours,
      };

      await staffService.updateStaff(employee.id!, updatedSchedule);

      // Update local state
      onUpdate({
        ...employee,
        schedule: {
          ...employee.schedule,
          isScheduled: true,
          scheduleStartDate: startDate.toDate().toISOString(),
          scheduledUntil: scheduledUntil.toISOString(),
          defaultTemplate: selectedTemplate,
          workingHours: workingHours,
        },
      });
      
      toast.success('تم حفظ الجدول بنجاح');
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('حدث خطأ في حفظ الجدول');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Dayjs | null) => {
    if (date) {
      setSelectedDate(date);
      const dayIndex = date.day();
      setSelectedDays(prev => {
        if (prev.includes(dayIndex)) {
          return prev.filter(d => d !== dayIndex);
        } else {
          return [...prev, dayIndex];
        }
      });
    }
  };

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const getTotalHours = (dayIndex: number) => {
    return scheduleGrid[dayIndex].filter(h => h).length;
  };

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Schedule Autofill Template - Moved to top */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          قالب التعبئة التلقائية للجدول
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'nowrap', overflowX: 'auto' }}>
          {/* Schedule Template */}
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
              قالب الجدول
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Select
                value={selectedTemplate}
                onChange={handleTemplateChange}
                size="small"
                sx={{ minWidth: 140 }}
                displayEmpty
              >
                <MenuItem value="">اختر قالب</MenuItem>
                {SCHEDULE_TEMPLATES.map(template => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
              <Tooltip title="عدد الأسابيع لتطبيق القالب">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Select
                    size="small"
                    value={templateWeeks}
                    onChange={(e) => setTemplateWeeks(Number(e.target.value))}
                    sx={{ minWidth: 60 }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 52].map(weeks => (
                      <MenuItem key={weeks} value={weeks}>
                        {weeks}
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    أسابيع
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          </Box>

          {/* Starting Date */}
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
              ابتداءً من
            </Typography>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                format="DD/MM/YYYY"
                slotProps={{
                  textField: { size: 'small', sx: { width: 140 } },
                }}
              />
            </LocalizationProvider>
          </Box>

          {/* Working Hours */}
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
              ساعات العمل
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {/* Start Time */}
              <Select
                size="small"
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                sx={{ minWidth: 65 }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <MenuItem key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="body2">:</Typography>
              <Select
                size="small"
                value={startMinute}
                onChange={(e) => setStartMinute(Number(e.target.value))}
                sx={{ minWidth: 65 }}
              >
                {[0, 15, 30, 45].map(min => (
                  <MenuItem key={min} value={min}>
                    {min.toString().padStart(2, '0')}
                  </MenuItem>
                ))}
              </Select>
              
              <Typography variant="body2" sx={{ mx: 1 }}>—</Typography>
              
              {/* End Time */}
              <Select
                size="small"
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                sx={{ minWidth: 65 }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <MenuItem key={i} value={i}>
                    {i.toString().padStart(2, '0')}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="body2">:</Typography>
              <Select
                size="small"
                value={endMinute}
                onChange={(e) => setEndMinute(Number(e.target.value))}
                sx={{ minWidth: 65 }}
              >
                {[0, 15, 30, 45].map(min => (
                  <MenuItem key={min} value={min}>
                    {min.toString().padStart(2, '0')}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>

          {/* Set For */}
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'text.secondary' }}>
              تعيين لـ
            </Typography>
            <Select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              size="small"
              sx={{ minWidth: 120 }}
              displayEmpty
            >
              <MenuItem value="1-week">أسبوع واحد</MenuItem>
              <MenuItem value="2-weeks">أسبوعين</MenuItem>
              <MenuItem value="1-month">شهر واحد</MenuItem>
            </Select>
          </Box>

          {/* Save and Fill Button */}
          <Box>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: 'transparent' }}>
              &nbsp;
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={handleFillSchedule}
              startIcon={<CalendarMonth />}
              sx={{ minWidth: 120, whiteSpace: 'nowrap' }}
            >
              حفظ وملء الجدول
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Main Schedule Grid */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          جدول العمل
        </Typography>

          {/* Calendar - Simple Day Selector */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>اختر أيام العمل:</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {DAYS_AR.map((day, index) => (
                <Chip
                  key={index}
                  label={day}
                  onClick={() => {
                    setSelectedDays(prev => {
                      if (prev.includes(index)) {
                        return prev.filter(d => d !== index);
                      } else {
                        return [...prev, index];
                      }
                    });
                  }}
                  color={selectedDays.includes(index) ? 'primary' : 'default'}
                  variant={selectedDays.includes(index) ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>

          {/* Dot Grid */}
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 720 }}>
              {/* Hour Headers */}
              <Box sx={{ display: 'flex', mb: 0.5 }}>
                <Box sx={{ width: 70 }} />
                {HOURS.map(hour => (
                  <Box
                    key={hour}
                    sx={{
                      width: 25,
                      textAlign: 'center',
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                    }}
                  >
                    {hour}
                  </Box>
                ))}
                <Box sx={{ width: 60, textAlign: 'center', fontSize: '0.65rem' }}>
                  المجموع
                </Box>
              </Box>

              {/* Day Rows */}
              {DAYS.map((day, dayIndex) => (
                <Box key={day} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                  <Box sx={{ width: 70, pr: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 500 }}>
                      {DAYS_AR[dayIndex]}
                    </Typography>
                  </Box>
                  
                  {HOURS.map(hour => (
                    <Box key={hour} sx={{ width: 25, display: 'flex', justifyContent: 'center' }}>
                      <Tooltip title={`${DAYS_AR[dayIndex]} ${formatHour(hour)}`}>
                        <IconButton
                          size="small"
                          onClick={() => handleDotClick(dayIndex, hour)}
                          sx={{ p: 0.25 }}
                        >
                          {scheduleGrid[dayIndex][hour] ? (
                            <FiberManualRecord sx={{ fontSize: 12, color: 'grey.600' }} />
                          ) : (
                            <RadioButtonUnchecked sx={{ fontSize: 12, color: 'grey.400' }} />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                  
                  <Box sx={{ width: 60, textAlign: 'center' }}>
                    <Chip
                      label={`${getTotalHours(dayIndex)} س`}
                      size="small"
                      sx={{ height: 20, fontSize: '0.65rem' }}
                      color={getTotalHours(dayIndex) > 0 ? 'primary' : 'default'}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Legend */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FiberManualRecord sx={{ fontSize: 12, color: 'error.main' }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>الحجوزات</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FiberManualRecord sx={{ fontSize: 12, color: 'grey.600' }} />
              <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>متاح</Typography>
            </Box>
          </Box>

          {/* Bottom Actions */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={shouldCopy}
                    onChange={(e) => setShouldCopy(e.target.checked)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption">نسخ الجدول لـ</Typography>
                    <Select
                      size="small"
                      value={copyWeeks}
                      onChange={(e) => setCopyWeeks(Number(e.target.value))}
                      sx={{ minWidth: 55, height: 24, fontSize: '0.75rem' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 52].map(weeks => (
                        <MenuItem key={weeks} value={weeks} sx={{ fontSize: '0.75rem' }}>
                          {weeks}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography variant="caption">أسابيع</Typography>
                  </Box>
                }
              />
              
              <Link
                component="button"
                variant="caption"
                onClick={handleClearSchedule}
                sx={{ color: 'error.main', fontSize: '0.75rem' }}
              >
                مسح الجدول
              </Link>
            </Box>

            <Button
              variant="contained"
              size="small"
              startIcon={<Save />}
              onClick={handleSaveSchedule}
              disabled={loading}
              sx={{
                backgroundColor: '#00bcd4',
                '&:hover': { backgroundColor: '#00acc1' },
              }}
            >
              حفظ
            </Button>
          </Box>
      </Paper>
    </Box>
  );
};

export default ScheduleTab;