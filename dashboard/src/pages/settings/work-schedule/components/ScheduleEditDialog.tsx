import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Stack,
} from '@mui/material';
import {
  Close,
  Schedule,
  Delete,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import type { Staff } from '../../../../services/staff.service';
import { staffService } from '../../../../services/staff.service';

interface ScheduleEditDialogProps {
  open: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName: string;
  date: Date;
  dayName: string;
  existingSchedule?: {
    startTime: string;
    endTime: string;
  };
  companyId: string;
  onScheduleUpdate: () => void;
}

const ScheduleEditDialog: React.FC<ScheduleEditDialogProps> = ({
  open,
  onClose,
  employeeId,
  employeeName,
  date,
  dayName,
  existingSchedule,
  companyId,
  onScheduleUpdate,
}) => {
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(17);
  const [endMinute, setEndMinute] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingSchedule) {
      const [sh, sm] = existingSchedule.startTime.split(':').map(Number);
      const [eh, em] = existingSchedule.endTime.split(':').map(Number);
      setStartHour(sh);
      setStartMinute(sm);
      setEndHour(eh);
      setEndMinute(em);
    } else {
      // Reset to defaults for new schedule
      setStartHour(9);
      setStartMinute(0);
      setEndHour(17);
      setEndMinute(0);
    }
  }, [existingSchedule, open]);
  
  // Also check if we need to load from existing staff schedule
  useEffect(() => {
    const loadExistingSchedule = async () => {
      if (open && !existingSchedule && employeeId) {
        try {
          const staff = await staffService.getStaffMember(employeeId);
          if (staff?.schedule?.workingHours?.[dayName]) {
            const daySchedule = staff.schedule.workingHours[dayName];
            if (daySchedule.isWorking && daySchedule.start && daySchedule.end) {
              const [sh, sm] = daySchedule.start.split(':').map(Number);
              const [eh, em] = daySchedule.end.split(':').map(Number);
              setStartHour(sh);
              setStartMinute(sm);
              setEndHour(eh);
              setEndMinute(em);
            }
          }
        } catch (error) {
          console.error('Error loading existing schedule:', error);
        }
      }
    };
    
    loadExistingSchedule();
  }, [open, employeeId, dayName, existingSchedule]);

  const handleSave = async () => {
    try {
      setLoading(true);

      // Format times
      const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

      // Validate times
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;

      if (startTotalMinutes >= endTotalMinutes) {
        toast.error('وقت النهاية يجب أن يكون بعد وقت البداية');
        return;
      }

      // Get the staff member
      const staff = await staffService.getStaffMember(employeeId);
      if (!staff) {
        toast.error('لم يتم العثور على الموظف');
        return;
      }
      
      // Ensure staff has schedule object
      if (!staff.schedule) {
        staff.schedule = {
          isScheduled: false,
          workingHours: {},
        };
      }

      // Update the schedule
      const updatedSchedule = {
        ...staff.schedule,
        isScheduled: true,
        workingHours: {
          ...(staff.schedule?.workingHours || {}),
          [dayName]: {
            isWorking: true,
            start: startTime,
            end: endTime,
          },
        },
      };

      // Ensure we have valid schedule structure
      const updateData: any = {
        schedule: {
          isScheduled: updatedSchedule.isScheduled,
          workingHours: updatedSchedule.workingHours || {},
        },
      };
      
      // Only add scheduledUntil if it exists
      if (staff.schedule?.scheduledUntil) {
        updateData.schedule.scheduledUntil = staff.schedule.scheduledUntil;
      }
      
      await staffService.updateStaff(employeeId, updateData);

      toast.success(existingSchedule ? 'تم تحديث الجدول بنجاح' : 'تم إضافة الجدول بنجاح');
      onScheduleUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('حدث خطأ في حفظ الجدول');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);

      // Get the staff member
      const staff = await staffService.getStaffMember(employeeId);
      if (!staff) {
        toast.error('لم يتم العثور على الموظف');
        return;
      }
      
      // Ensure staff has schedule object
      if (!staff.schedule) {
        staff.schedule = {
          isScheduled: false,
          workingHours: {},
        };
      }

      // Remove the schedule for this day
      const updatedSchedule = {
        ...staff.schedule,
        workingHours: {
          ...(staff.schedule?.workingHours || {}),
          [dayName]: {
            isWorking: false,
            start: '09:00',
            end: '17:00',
          },
        },
      };

      // Check if any days are still enabled
      const hasEnabledDays = Object.values(updatedSchedule.workingHours || {}).some(
        (day: any) => day && day.isWorking
      );
      updatedSchedule.isScheduled = hasEnabledDays;

      // Ensure we have valid schedule structure
      const updateData: any = {
        schedule: {
          isScheduled: updatedSchedule.isScheduled,
          workingHours: updatedSchedule.workingHours || {},
        },
      };
      
      // Only add scheduledUntil if it exists
      if (staff.schedule?.scheduledUntil) {
        updateData.schedule.scheduledUntil = staff.schedule.scheduledUntil;
      }
      
      await staffService.updateStaff(employeeId, updateData);

      toast.success('تم حذف الجدول بنجاح');
      onScheduleUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('حدث خطأ في حذف الجدول');
    } finally {
      setLoading(false);
    }
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule color="primary" />
            <Typography variant="h6">
              {existingSchedule ? 'تعديل جدول العمل' : 'إضافة جدول عمل'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Employee and Date Info */}
          <Alert severity="info" icon={false}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {employeeName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {date.toLocaleDateString('ar-EG', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Typography>
          </Alert>

          {/* Start Time */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              وقت البداية
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>الساعة</InputLabel>
                <Select
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  label="الساعة"
                >
                  {hours.map(hour => (
                    <MenuItem key={hour} value={hour}>
                      {hour.toString().padStart(2, '0')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>الدقيقة</InputLabel>
                <Select
                  value={startMinute}
                  onChange={(e) => setStartMinute(Number(e.target.value))}
                  label="الدقيقة"
                >
                  {minutes.map(minute => (
                    <MenuItem key={minute} value={minute}>
                      {minute.toString().padStart(2, '0')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* End Time */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              وقت النهاية
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>الساعة</InputLabel>
                <Select
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  label="الساعة"
                >
                  {hours.map(hour => (
                    <MenuItem key={hour} value={hour}>
                      {hour.toString().padStart(2, '0')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>الدقيقة</InputLabel>
                <Select
                  value={endMinute}
                  onChange={(e) => setEndMinute(Number(e.target.value))}
                  label="الدقيقة"
                >
                  {minutes.map(minute => (
                    <MenuItem key={minute} value={minute}>
                      {minute.toString().padStart(2, '0')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Total Hours Display */}
          <Alert severity="success">
            <Typography variant="body2">
              مجموع الساعات: {' '}
              <strong>
                {Math.floor((endHour * 60 + endMinute - startHour * 60 - startMinute) / 60)} ساعة 
                {(endHour * 60 + endMinute - startHour * 60 - startMinute) % 60 > 0 && 
                  ` و ${(endHour * 60 + endMinute - startHour * 60 - startMinute) % 60} دقيقة`
                }
              </strong>
            </Typography>
          </Alert>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        {existingSchedule && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDelete}
            disabled={loading}
            sx={{ mr: 'auto' }}
          >
            حذف
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={loading}
        >
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
        >
          {existingSchedule ? 'تحديث' : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleEditDialog;