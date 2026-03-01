import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
  Grid,
  IconButton,
  Chip,
  useTheme,
  Card,
  CardContent,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  EventNote,
  AccessTime,
  Notifications,
  ColorLens,
  Block,
  Schedule,
  Save,
  CalendarMonth,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import apiClient from '../../../config/api';
import type { ApiResponse } from '../../../config/api';
import { toast } from 'react-toastify';

interface CalendarSettings {
  // General Settings
  defaultView: 'day' | 'week' | 'month';
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  timeSlotDuration: number; // in minutes
  workingHoursStart: string; // HH:mm format
  workingHoursEnd: string; // HH:mm format
  
  // Appointment Settings
  defaultAppointmentDuration: number; // in minutes
  bufferTimeBetweenAppointments: number; // in minutes
  allowDoubleBooking: boolean;
  requireClientConfirmation: boolean;
  
  // Booking Rules
  minAdvanceBookingTime: number; // in hours
  maxAdvanceBookingDays: number; // in days
  cancellationDeadline: number; // in hours
  
  // Display Settings
  showWeekNumbers: boolean;
  showNonWorkingHours: boolean;
  appointmentColors: {
    pending: string;
    confirmed: string;
    completed: string;
    cancelled: string;
  };
  
  // Notifications
  sendConfirmationEmail: boolean;
  sendReminderEmail: boolean;
  reminderTime: number; // in hours before appointment
  sendCancellationEmail: boolean;
}

const defaultSettings: CalendarSettings = {
  defaultView: 'week',
  firstDayOfWeek: 6, // Saturday for Egypt
  timeSlotDuration: 30,
  workingHoursStart: '09:00',
  workingHoursEnd: '21:00',
  defaultAppointmentDuration: 60,
  bufferTimeBetweenAppointments: 0,
  allowDoubleBooking: false,
  requireClientConfirmation: true,
  minAdvanceBookingTime: 1,
  maxAdvanceBookingDays: 30,
  cancellationDeadline: 24,
  showWeekNumbers: false,
  showNonWorkingHours: true,
  appointmentColors: {
    pending: '#FFA726',
    confirmed: '#66BB6A',
    completed: '#42A5F5',
    cancelled: '#EF5350',
  },
  sendConfirmationEmail: true,
  sendReminderEmail: true,
  reminderTime: 24,
  sendCancellationEmail: true,
};

const AppointmentCalendarSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser } = useAuth();
  const isRTL = theme.direction === 'rtl';
  const [settings, setSettings] = useState<CalendarSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [currentUser]);

  const loadSettings = async () => {
    if (!currentUser?.companyId) return;

    try {
      const response = await apiClient.get<ApiResponse<CalendarSettings>>('/company/settings/appointment-calendar');
      if (response.data.data) {
        setSettings({ ...defaultSettings, ...response.data.data });
      }
    } catch (error) {
      console.error('Error loading calendar settings:', error);
      toast.error(isRTL ? 'فشل تحميل الإعدادات' : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.companyId) return;

    setSaving(true);
    try {
      await apiClient.put<ApiResponse<void>>('/company/settings/appointment-calendar', {
        ...settings,
        updatedBy: currentUser.id,
      });

      toast.success(isRTL ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving calendar settings:', error);
      toast.error(isRTL ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CalendarSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleColorChange = (status: keyof CalendarSettings['appointmentColors'], color: string) => {
    setSettings(prev => ({
      ...prev,
      appointmentColors: {
        ...prev.appointmentColors,
        [status]: color,
      },
    }));
  };

  const weekDays = [
    { value: 0, label: isRTL ? 'الأحد' : 'Sunday' },
    { value: 1, label: isRTL ? 'الإثنين' : 'Monday' },
    { value: 2, label: isRTL ? 'الثلاثاء' : 'Tuesday' },
    { value: 3, label: isRTL ? 'الأربعاء' : 'Wednesday' },
    { value: 4, label: isRTL ? 'الخميس' : 'Thursday' },
    { value: 5, label: isRTL ? 'الجمعة' : 'Friday' },
    { value: 6, label: isRTL ? 'السبت' : 'Saturday' },
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/settings')} sx={{ mr: 1 }}>
          <ArrowBack sx={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
        </IconButton>
        <CalendarMonth sx={{ mr: 2, color: theme.palette.primary.main }} />
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {isRTL ? 'إعدادات تقويم المواعيد' : 'Appointment Calendar Settings'}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={saving}
        >
          {isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* General Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <EventNote sx={{ mr: 1 }} />
              {isRTL ? 'الإعدادات العامة' : 'General Settings'}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{isRTL ? 'العرض الافتراضي' : 'Default View'}</InputLabel>
              <Select
                value={settings.defaultView}
                onChange={(e) => handleChange('defaultView', e.target.value)}
                label={isRTL ? 'العرض الافتراضي' : 'Default View'}
              >
                <MenuItem value="day">{isRTL ? 'يومي' : 'Day'}</MenuItem>
                <MenuItem value="week">{isRTL ? 'أسبوعي' : 'Week'}</MenuItem>
                <MenuItem value="month">{isRTL ? 'شهري' : 'Month'}</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{isRTL ? 'أول يوم في الأسبوع' : 'First Day of Week'}</InputLabel>
              <Select
                value={settings.firstDayOfWeek}
                onChange={(e) => handleChange('firstDayOfWeek', e.target.value)}
                label={isRTL ? 'أول يوم في الأسبوع' : 'First Day of Week'}
              >
                {weekDays.map(day => (
                  <MenuItem key={day.value} value={day.value}>
                    {day.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label={isRTL ? 'مدة الفترة الزمنية (بالدقائق)' : 'Time Slot Duration (minutes)'}
              type="number"
              value={settings.timeSlotDuration}
              onChange={(e) => handleChange('timeSlotDuration', parseInt(e.target.value))}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">{isRTL ? 'دقيقة' : 'min'}</InputAdornment>,
              }}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label={isRTL ? 'بداية ساعات العمل' : 'Working Hours Start'}
                type="time"
                value={settings.workingHoursStart}
                onChange={(e) => handleChange('workingHoursStart', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label={isRTL ? 'نهاية ساعات العمل' : 'Working Hours End'}
                type="time"
                value={settings.workingHoursEnd}
                onChange={(e) => handleChange('workingHoursEnd', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showWeekNumbers}
                  onChange={(e) => handleChange('showWeekNumbers', e.target.checked)}
                />
              }
              label={isRTL ? 'إظهار أرقام الأسابيع' : 'Show Week Numbers'}
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showNonWorkingHours}
                  onChange={(e) => handleChange('showNonWorkingHours', e.target.checked)}
                />
              }
              label={isRTL ? 'إظهار ساعات غير العمل' : 'Show Non-Working Hours'}
            />
          </Paper>
        </Grid>

        {/* Appointment Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <AccessTime sx={{ mr: 1 }} />
              {isRTL ? 'إعدادات المواعيد' : 'Appointment Settings'}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <TextField
              fullWidth
              label={isRTL ? 'مدة الموعد الافتراضية (بالدقائق)' : 'Default Appointment Duration (minutes)'}
              type="number"
              value={settings.defaultAppointmentDuration}
              onChange={(e) => handleChange('defaultAppointmentDuration', parseInt(e.target.value))}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">{isRTL ? 'دقيقة' : 'min'}</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label={isRTL ? 'وقت الفاصل بين المواعيد (بالدقائق)' : 'Buffer Time Between Appointments (minutes)'}
              type="number"
              value={settings.bufferTimeBetweenAppointments}
              onChange={(e) => handleChange('bufferTimeBetweenAppointments', parseInt(e.target.value))}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">{isRTL ? 'دقيقة' : 'min'}</InputAdornment>,
              }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.allowDoubleBooking}
                  onChange={(e) => handleChange('allowDoubleBooking', e.target.checked)}
                />
              }
              label={isRTL ? 'السماح بالحجز المزدوج' : 'Allow Double Booking'}
              sx={{ mb: 1 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.requireClientConfirmation}
                  onChange={(e) => handleChange('requireClientConfirmation', e.target.checked)}
                />
              }
              label={isRTL ? 'يتطلب تأكيد العميل' : 'Require Client Confirmation'}
            />

            <Alert severity="info" sx={{ mt: 2 }}>
              {isRTL 
                ? 'يمكن تخصيص هذه الإعدادات لكل موظف من صفحة إدارة الموظفين'
                : 'These settings can be customized per staff member from the staff management page'}
            </Alert>
          </Paper>
        </Grid>

        {/* Booking Rules */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Block sx={{ mr: 1 }} />
              {isRTL ? 'قواعد الحجز' : 'Booking Rules'}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <TextField
              fullWidth
              label={isRTL ? 'الحد الأدنى للحجز المسبق (بالساعات)' : 'Minimum Advance Booking Time (hours)'}
              type="number"
              value={settings.minAdvanceBookingTime}
              onChange={(e) => handleChange('minAdvanceBookingTime', parseInt(e.target.value))}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">{isRTL ? 'ساعة' : 'hours'}</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label={isRTL ? 'الحد الأقصى للحجز المسبق (بالأيام)' : 'Maximum Advance Booking Days'}
              type="number"
              value={settings.maxAdvanceBookingDays}
              onChange={(e) => handleChange('maxAdvanceBookingDays', parseInt(e.target.value))}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">{isRTL ? 'يوم' : 'days'}</InputAdornment>,
              }}
            />

            <TextField
              fullWidth
              label={isRTL ? 'الموعد النهائي للإلغاء (بالساعات)' : 'Cancellation Deadline (hours)'}
              type="number"
              value={settings.cancellationDeadline}
              onChange={(e) => handleChange('cancellationDeadline', parseInt(e.target.value))}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: <InputAdornment position="end">{isRTL ? 'ساعة' : 'hours'}</InputAdornment>,
              }}
            />
          </Paper>
        </Grid>

        {/* Display Settings */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ColorLens sx={{ mr: 1 }} />
              {isRTL ? 'إعدادات العرض' : 'Display Settings'}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              {isRTL ? 'ألوان حالة المواعيد' : 'Appointment Status Colors'}
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={settings.appointmentColors.pending}
                    onChange={(e) => handleColorChange('pending', e.target.value)}
                    style={{ width: 40, height: 40, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  />
                  <Typography>{isRTL ? 'قيد الانتظار' : 'Pending'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={settings.appointmentColors.confirmed}
                    onChange={(e) => handleColorChange('confirmed', e.target.value)}
                    style={{ width: 40, height: 40, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  />
                  <Typography>{isRTL ? 'مؤكد' : 'Confirmed'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={settings.appointmentColors.completed}
                    onChange={(e) => handleColorChange('completed', e.target.value)}
                    style={{ width: 40, height: 40, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  />
                  <Typography>{isRTL ? 'مكتمل' : 'Completed'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <input
                    type="color"
                    value={settings.appointmentColors.cancelled}
                    onChange={(e) => handleColorChange('cancelled', e.target.value)}
                    style={{ width: 40, height: 40, border: 'none', borderRadius: 4, cursor: 'pointer' }}
                  />
                  <Typography>{isRTL ? 'ملغي' : 'Cancelled'}</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Notifications sx={{ mr: 1 }} />
              {isRTL ? 'إعدادات الإشعارات' : 'Notification Settings'}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.sendConfirmationEmail}
                      onChange={(e) => handleChange('sendConfirmationEmail', e.target.checked)}
                    />
                  }
                  label={isRTL ? 'إرسال بريد إلكتروني للتأكيد' : 'Send Confirmation Email'}
                  sx={{ mb: 2 }}
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.sendReminderEmail}
                      onChange={(e) => handleChange('sendReminderEmail', e.target.checked)}
                    />
                  }
                  label={isRTL ? 'إرسال بريد إلكتروني للتذكير' : 'Send Reminder Email'}
                  sx={{ mb: 2 }}
                />

                {settings.sendReminderEmail && (
                  <TextField
                    fullWidth
                    label={isRTL ? 'وقت التذكير (قبل الموعد بالساعات)' : 'Reminder Time (hours before appointment)'}
                    type="number"
                    value={settings.reminderTime}
                    onChange={(e) => handleChange('reminderTime', parseInt(e.target.value))}
                    sx={{ mb: 2, ml: 4 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">{isRTL ? 'ساعة' : 'hours'}</InputAdornment>,
                    }}
                  />
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.sendCancellationEmail}
                      onChange={(e) => handleChange('sendCancellationEmail', e.target.checked)}
                    />
                  }
                  label={isRTL ? 'إرسال بريد إلكتروني عند الإلغاء' : 'Send Cancellation Email'}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Alert severity="warning">
                  {isRTL
                    ? 'تتطلب إعدادات البريد الإلكتروني تكوين خدمة البريد الإلكتروني من إعدادات الشركة'
                    : 'Email settings require email service configuration from company settings'}
                </Alert>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AppointmentCalendarSettingsPage;