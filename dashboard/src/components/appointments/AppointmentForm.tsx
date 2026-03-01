import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Autocomplete,
  InputAdornment,
  Divider,
  FormControlLabel,
  Switch,
  useTheme,
  Alert,
} from '@mui/material';
import {
  Close,
  Person,
  Phone,
  Email,
  AccessTime,
  CalendarMonth,
  AttachMoney,
  Note,
  Repeat,
  Notifications,
  History,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parse, addMinutes, setHours, setMinutes } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toDateSafe } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { appointmentService } from '../../services/appointment.service';
import { clientService } from '../../services/client.service';
import { serviceService } from '../../services/service.service';
import { staffService } from '../../services/staff.service';
import type { Appointment, AppointmentStatus } from '../../services/appointment.service';
import type { Client } from '../../services/client.service';
import type { Service } from '../../services/service.service';
import type { Staff } from '../../services/staff.service';
import TimeSlotPicker from './TimeSlotPicker';

interface AppointmentFormProps {
  open: boolean;
  appointment: Appointment | null;
  defaultDate?: Date;
  defaultTime?: string;
  defaultStaffId?: string;
  companyId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
};

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  open,
  appointment,
  defaultDate,
  defaultTime,
  defaultStaffId,
  companyId,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  // State
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(defaultDate || new Date());
  const [startTime, setStartTime] = useState(defaultTime || '09:00');
  const [endTime, setEndTime] = useState('09:30');
  const [selectedStaff, setSelectedStaff] = useState<string>(defaultStaffId || '');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [status, setStatus] = useState<AppointmentStatus>('pending');
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [sendConfirmation, setSendConfirmation] = useState(true);
  const [sendReminder, setSendReminder] = useState(true);
  
  // Lookup data
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);

  // Load data on mount
  useEffect(() => {
    if (open && companyId) {
      loadLookupData();
    }
  }, [open, companyId]);

  // Load appointment data
  useEffect(() => {
    if (appointment) {
      // Populate form with appointment data
      loadAppointmentData();
    } else {
      // Reset form for new appointment
      resetForm();
    }
  }, [appointment]);

  // Update end time when services change
  useEffect(() => {
    if (selectedServices.length > 0 && startTime) {
      try {
        const totalDuration = selectedServices.reduce((sum, service) => {
          const durationInMinutes = service.duration 
            ? (service.duration.hours || 0) * 60 + (service.duration.minutes || 0)
            : 0;
          return sum + durationInMinutes;
        }, 0);
        if (totalDuration > 0) {
          const startDate = parse(startTime, 'HH:mm', new Date());
          if (isNaN(startDate.getTime())) {
            console.error('Invalid start time:', startTime);
            return;
          }
          const endDate = addMinutes(startDate, totalDuration);
          setEndTime(format(endDate, 'HH:mm'));
        }
      } catch (error) {
        console.error('Error calculating end time:', error);
      }
    }
  }, [selectedServices, startTime]);

  const loadLookupData = async () => {
    try {
      const [servicesData, staffData] = await Promise.all([
        serviceService.getServices(companyId, undefined, currentBranch?.id),
        staffService.getStaff(companyId, currentBranch?.id),
      ]);
      
      setServices(servicesData);
      setStaff(staffData);
    } catch (error) {
      console.error('Error loading lookup data:', error);
    }
  };

  const loadAppointmentData = async () => {
    if (!appointment) return;

    try {
      // Load client
      const client = await clientService.getClient(appointment.clientId);
      if (client) {
        setSelectedClient(client);
      }
      
      // Set form values
      setClientPhone(appointment.clientPhone);
      setClientEmail(appointment.clientEmail || '');
      setSelectedDate(toDateSafe(appointment.date));
      setStartTime(appointment.startTime);
      setEndTime(appointment.endTime);
      setSelectedStaff(appointment.staffId);
      setStatus(appointment.status);
      setNotes(appointment.notes || '');
      setInternalNotes(appointment.internalNotes || '');
      
      // Load services
      const appointmentServices = await Promise.all(
        appointment.services.map(s => serviceService.getService(s.serviceId))
      );
      setSelectedServices(appointmentServices.filter(s => s !== null) as Service[]);
    } catch (error) {
      console.error('Error loading appointment data:', error);
    }
  };

  const resetForm = () => {
    setSelectedClient(null);
    setClientPhone('');
    setClientEmail('');
    setSelectedDate(defaultDate || new Date());
    setStartTime(defaultTime || '09:00');
    setEndTime('09:30');
    setSelectedStaff(defaultStaffId || '');
    setSelectedServices([]);
    setStatus('pending');
    setNotes('');
    setInternalNotes('');
    setSendConfirmation(true);
    setSendReminder(true);
    setTabValue(0);
    setError(null);
  };

  const loadAllClients = async () => {
    if (!companyId) {
      console.error('No companyId available for loading clients');
      return;
    }

    try {
      setSearchingClients(true);
      console.log('Loading all clients for companyId:', companyId);
      const result = await clientService.getClients(companyId);
      console.log('Client service result:', result);
      
      // Extract clients array from the result object
      const clientsArray = result?.clients || [];
      console.log('All clients loaded:', clientsArray.length);
      setClients(clientsArray);
    } catch (error) {
      console.error('Error loading clients:', error);
      // Ensure clients is always an array to prevent filter errors
      setClients([]);
    } finally {
      setSearchingClients(false);
    }
  };

  const handleClientSearch = async (searchTerm: string) => {
    console.log('Client search triggered with term:', searchTerm, 'companyId:', companyId);
    
    if (!searchTerm || searchTerm.length < 2) {
      // If no search term, load all clients
      await loadAllClients();
      return;
    }

    if (!companyId) {
      console.error('No companyId available for client search');
      return;
    }

    try {
      setSearchingClients(true);
      console.log('Searching clients with companyId:', companyId, 'searchTerm:', searchTerm);
      const results = await clientService.searchClients(companyId, searchTerm);
      console.log('Search results:', results);
      
      // Ensure results is always an array
      const clientsArray = Array.isArray(results) ? results : [];
      setClients(clientsArray);
    } catch (error) {
      console.error('Error searching clients:', error);
      setError(isRTL ? 'خطأ في البحث عن العملاء' : 'Error searching clients');
      // Ensure clients is always an array to prevent filter errors
      setClients([]);
    } finally {
      setSearchingClients(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) return;

    // Validation
    if (!selectedClient && !clientPhone) {
      setError(isRTL ? 'يرجى اختيار عميل أو إدخال رقم الهاتف' : 'Please select a client or enter phone number');
      return;
    }

    if (!selectedStaff) {
      setError(isRTL ? 'يرجى اختيار موظف' : 'Please select a staff member');
      return;
    }

    if (selectedServices.length === 0) {
      setError(isRTL ? 'يرجى اختيار خدمة واحدة على الأقل' : 'Please select at least one service');
      return;
    }

    if (!selectedDate) {
      setError(isRTL ? 'يرجى اختيار التاريخ' : 'Please select a date');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Prepare appointment data
      const totalDuration = selectedServices.reduce((sum, service) => {
        const durationInMinutes = service.duration 
          ? (service.duration.hours || 0) * 60 + (service.duration.minutes || 0)
          : 0;
        return sum + durationInMinutes;
      }, 0);
      const totalPrice = selectedServices.reduce((sum, service) => sum + (service.startingPrice || 0), 0);
      
      const appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId,
        branchId: currentBranch?.id,
        clientId: selectedClient?.id || 'walk-in',
        clientName: selectedClient?.name || clientPhone,
        clientPhone: selectedClient?.phoneNumbers?.[0] || clientPhone,
        clientEmail: selectedClient?.email || clientEmail,
        isNewClient: !selectedClient,
        services: selectedServices.map(service => {
          const durationInMinutes = service.duration 
            ? (service.duration.hours || 0) * 60 + (service.duration.minutes || 0)
            : 0;
          return {
            serviceId: service.id!,
            serviceName: service.name,
            duration: durationInMinutes,
            price: service.startingPrice || 0,
          };
        }),
        totalDuration,
        totalPrice,
        staffId: selectedStaff,
        staffName: staff.find(s => s.id === selectedStaff)?.name || '',
        date: selectedDate.toISOString(),
        startTime,
        endTime,
        status,
        paymentStatus: 'none',
        notes,
        internalNotes,
        source: 'dashboard',
        notifications: [
          ...(sendConfirmation ? [{
            type: 'confirmation' as const,
            method: ['email'] as ('email')[],
            sent: false,
          }] : []),
          ...(sendReminder ? [{
            type: 'reminder' as const,
            method: ['sms', 'email'] as ('sms' | 'email')[],
            timing: 60, // 1 hour before
            sent: false,
          }] : []),
        ],
      };

      if (appointment) {
        // Update existing appointment
        await appointmentService.updateAppointment(appointment.id!, appointmentData, currentUser.id);
      } else {
        // Create new appointment
        await appointmentService.createAppointment(appointmentData, currentUser.id);
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving appointment:', error);
      setError(error.message || (isRTL ? 'حدث خطأ أثناء حفظ الموعد' : 'Error saving appointment'));
    } finally {
      setLoading(false);
    }
  };

  const getSelectedStaffMember = () => {
    return staff.find(s => s.id === selectedStaff);
  };

  // Generate time options
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {appointment 
              ? isRTL ? 'تعديل الموعد' : 'Edit Appointment'
              : isRTL ? 'موعد جديد' : 'New Appointment'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label={isRTL ? 'معلومات الموعد' : 'Appointment Info'} />
          <Tab label={isRTL ? 'ملاحظات' : 'Notes'} />
          <Tab label={isRTL ? 'الإشعارات' : 'Notifications'} />
          {appointment && <Tab label={isRTL ? 'السجل' : 'History'} />}
        </Tabs>

        {/* Main Tab */}
        <TabPanel value={tabValue} index={0}>
          {/* Staff and DateTime Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              {isRTL ? 'الموظف والوقت' : 'Staff & Time'}
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControl fullWidth>
                <InputLabel>{isRTL ? 'الموظف' : 'Staff'}</InputLabel>
                <Select
                  value={selectedStaff || ''}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  label={isRTL ? 'الموظف' : 'Staff'}
                  displayEmpty
                >
                  <MenuItem value="">
                    <em>{isRTL ? 'اختر موظف' : 'Select Staff'}</em>
                  </MenuItem>
                  {staff && staff.length > 0 ? (
                    staff.map((member) => (
                      <MenuItem key={member.id} value={member.id || ''}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Person fontSize="small" sx={{ color: 'action.active' }} />
                          {member.name}
                          {member.position && (
                            <Chip label={member.position} size="small" sx={{ ml: 1 }} />
                          )}
                        </Box>
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>
                      {isRTL ? 'لا يوجد موظفين' : 'No staff available'}
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>
                <DatePicker
                  label={isRTL ? 'التاريخ' : 'Date'}
                  value={selectedDate}
                  onChange={setSelectedDate}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      InputProps: {
                        startAdornment: <CalendarMonth sx={{ mr: 1, color: 'action.active' }} />,
                      },
                    },
                  }}
                />
              </LocalizationProvider>

              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth
                  label={isRTL ? 'الوقت المحدد' : 'Selected Time'}
                  value={startTime ? `${startTime} - ${endTime}` : ''}
                  InputProps={{
                    readOnly: true,
                    startAdornment: <AccessTime sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                  placeholder={isRTL ? 'اختر الوقت من أدناه' : 'Select time below'}
                />
              </Box>
            </Box>
          </Box>

          {/* Time Slot Picker */}
          {selectedDate && (
            <Box sx={{ mt: 2 }}>
              {selectedStaff && selectedStaff.trim() !== '' ? (
                <>
                  <Typography variant="subtitle2" gutterBottom>
                    {isRTL ? 'المواعيد المتاحة' : 'Available Time Slots'}
                  </Typography>
                  <TimeSlotPicker
                    date={selectedDate}
                    staffId={selectedStaff}
                    companyId={companyId}
                    duration={selectedServices.reduce((sum, s) => {
                      const durationInMinutes = s.duration 
                        ? (s.duration.hours || 0) * 60 + (s.duration.minutes || 0)
                        : 0;
                      return sum + durationInMinutes;
                    }, 0) || 30}
                    selectedTime={startTime}
                    onTimeSelect={(time) => {
                      setStartTime(time);
                      // Calculate end time based on total duration
                      const duration = selectedServices.reduce((sum, s) => {
                        const durationInMinutes = s.duration 
                          ? (s.duration.hours || 0) * 60 + (s.duration.minutes || 0)
                          : 0;
                        return sum + durationInMinutes;
                      }, 0) || 30;
                      const start = parse(time, 'HH:mm', new Date());
                      const end = addMinutes(start, duration);
                      setEndTime(format(end, 'HH:mm'));
                    }}
                    workingHours={(() => {
                      const staffMember = staff.find(s => s.id === selectedStaff);
                      if (staffMember?.schedule?.workingHours) {
                        const dayName = format(selectedDate, 'EEEE').toLowerCase();
                        const daySchedule = staffMember.schedule.workingHours[dayName];
                        if (daySchedule?.isWorking) {
                          return {
                            start: daySchedule.start || '09:00',
                            end: daySchedule.end || '18:00',
                            breaks: daySchedule.breaks
                          };
                        }
                        // Employee has a schedule but doesn't work this day
                        return null;
                      }
                      // No schedule info available, use defaults
                      return undefined;
                    })()}
                  />
                </>
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {isRTL ? 'يرجى اختيار موظف لعرض المواعيد المتاحة' : 'Please select a staff member to view available time slots'}
                </Alert>
              )}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Client Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              {isRTL ? 'معلومات العميل' : 'Client Information'}
            </Typography>
            
            <Autocomplete
              options={Array.isArray(clients) ? clients : []}
              getOptionLabel={(option) => `${option.name} - ${option.phoneNumbers?.[0] || ''}`}
              value={selectedClient}
              onChange={(_, newValue) => {
                setSelectedClient(newValue);
                if (newValue) {
                  setClientPhone(newValue.phoneNumbers?.[0] || '');
                  setClientEmail(newValue.email || '');
                }
              }}
              onInputChange={(_, value) => handleClientSearch(value)}
              onOpen={() => {
                // Load all clients when autocomplete opens if no clients are loaded
                if (clients.length === 0 && companyId) {
                  loadAllClients();
                }
              }}
              loading={searchingClients}
              noOptionsText={searchingClients ? (isRTL ? 'جاري البحث...' : 'Searching...') : (isRTL ? 'لا توجد خيارات' : 'No options')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={isRTL ? 'البحث عن عميل' : 'Search Client'}
                  margin="normal"
                  fullWidth
                  placeholder={isRTL ? 'ابحث عن عميل أو ابدأ بالكتابة...' : 'Search for a client or start typing...'}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label={isRTL ? 'رقم الهاتف' : 'Phone Number'}
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                InputProps={{
                  startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
              
              <TextField
                fullWidth
                label={isRTL ? 'البريد الإلكتروني' : 'Email'}
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                InputProps={{
                  startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Services Section */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              {isRTL ? 'الخدمات' : 'Services'}
            </Typography>
            
            <Autocomplete
              multiple
              options={services}
              getOptionLabel={(option) => option.name}
              value={selectedServices}
              onChange={(_, newValue) => setSelectedServices(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={isRTL ? 'اختر الخدمات' : 'Select Services'}
                  placeholder={isRTL ? 'ابحث عن خدمة...' : 'Search services...'}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...chipProps } = getTagProps({ index });
                  // Calculate duration in minutes from hours and minutes
                  const durationInMinutes = option.duration 
                    ? (option.duration.hours || 0) * 60 + (option.duration.minutes || 0)
                    : 0;
                  // Use startingPrice as the main price
                  const price = option.startingPrice || 0;
                  return (
                    <Chip
                      key={key}
                      variant="outlined"
                      label={`${option.name} (${durationInMinutes}min - ${price} EGP)`}
                      {...chipProps}
                    />
                  );
                })
              }
            />
            
            {selectedServices.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body2">
                  {isRTL ? 'إجمالي المدة: ' : 'Total Duration: '}
                  <strong>{selectedServices.reduce((sum, s) => {
                    const durationInMinutes = s.duration 
                      ? (s.duration.hours || 0) * 60 + (s.duration.minutes || 0)
                      : 0;
                    return sum + durationInMinutes;
                  }, 0)} {isRTL ? 'دقيقة' : 'minutes'}</strong>
                </Typography>
                <Typography variant="body2">
                  {isRTL ? 'إجمالي السعر: ' : 'Total Price: '}
                  <strong>{selectedServices.reduce((sum, s) => sum + (s.startingPrice || 0), 0)} EGP</strong>
                </Typography>
              </Box>
            )}
          </Box>

          {/* Status */}
          <FormControl fullWidth>
            <InputLabel>{isRTL ? 'الحالة' : 'Status'}</InputLabel>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
              label={isRTL ? 'الحالة' : 'Status'}
            >
              <MenuItem value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</MenuItem>
              <MenuItem value="confirmed">{isRTL ? 'مؤكد' : 'Confirmed'}</MenuItem>
              <MenuItem value="arrived">{isRTL ? 'وصل' : 'Arrived'}</MenuItem>
              <MenuItem value="in_progress">{isRTL ? 'قيد التنفيذ' : 'In Progress'}</MenuItem>
              <MenuItem value="completed">{isRTL ? 'مكتمل' : 'Completed'}</MenuItem>
              <MenuItem value="cancelled">{isRTL ? 'ملغي' : 'Cancelled'}</MenuItem>
              <MenuItem value="no_show">{isRTL ? 'لم يحضر' : 'No Show'}</MenuItem>
            </Select>
          </FormControl>
        </TabPanel>

        {/* Notes Tab */}
        <TabPanel value={tabValue} index={1}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label={isRTL ? 'ملاحظات للعميل' : 'Notes for Client'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isRTL ? 'ملاحظات تظهر للعميل...' : 'Notes visible to client...'}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label={isRTL ? 'ملاحظات داخلية' : 'Internal Notes'}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder={isRTL ? 'ملاحظات للموظفين فقط...' : 'Staff-only notes...'}
          />
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={2}>
          <FormControlLabel
            control={
              <Switch
                checked={sendConfirmation}
                onChange={(e) => setSendConfirmation(e.target.checked)}
              />
            }
            label={isRTL ? 'إرسال تأكيد الحجز' : 'Send Booking Confirmation'}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={sendReminder}
                onChange={(e) => setSendReminder(e.target.checked)}
              />
            }
            label={isRTL ? 'إرسال تذكير قبل الموعد' : 'Send Appointment Reminder'}
          />
          
          <Alert severity="info" sx={{ mt: 2 }}>
            {isRTL 
              ? 'سيتم إرسال الإشعارات حسب تفضيلات العميل المحفوظة'
              : 'Notifications will be sent according to client preferences'}
          </Alert>
        </TabPanel>

        {/* History Tab */}
        {appointment && (
          <TabPanel value={tabValue} index={3}>
            <Typography variant="subtitle2" gutterBottom>
              {isRTL ? 'سجل التغييرات' : 'Change History'}
            </Typography>
            {appointment.changeHistory?.map((change, index) => (
              <Box key={index} sx={{ mb: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="caption" color="textSecondary">
                  {format(toDateSafe(change.changedAt), 'PPp', { locale })} - {change.changedBy}
                </Typography>
                <Typography variant="body2">
                  {change.changes.join(', ')}
                </Typography>
              </Box>
            ))}
          </TabPanel>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {isRTL ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ 
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            }
          }}
        >
          {loading 
            ? isRTL ? 'جاري الحفظ...' : 'Saving...'
            : appointment 
            ? isRTL ? 'تحديث' : 'Update'
            : isRTL ? 'حفظ' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AppointmentForm;