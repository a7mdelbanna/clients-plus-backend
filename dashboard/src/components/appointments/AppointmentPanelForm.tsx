import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Button,
  TextField,
  Divider,
  Chip,
  Alert,
  useTheme,
  IconButton,
  InputAdornment,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  WhatsApp,
  History as HistoryIcon,
  Edit,
  Add,
  AttachMoney,
  Visibility,
  CalendarMonth,
  AccessTime,
  PersonOutline,
  PersonAdd,
  Close,
  Repeat,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { toDate } from '../../utils/dateUtils';
import { toast } from 'react-toastify';
import AppointmentStatusBar from './AppointmentStatusBar';
import BasicInfo from './BasicInfo';
import NotificationSettings from './NotificationSettings';
import VisitHistory from './VisitHistory';
import AdvancedFields from './AdvancedFields';
import PaymentSection from './PaymentSection';
import TimeSlotSelector from './TimeSlotSelector';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { appointmentService } from '../../services/appointment.service';
import { clientService } from '../../services/client.service';
import { staffService } from '../../services/staff.service';
import type { Appointment, AppointmentStatus, AppointmentSource } from '../../services/appointment.service';
import type { Client, ClientsFilter } from '../../services/client.service';
import type { Staff } from '../../services/staff.service';

interface AppointmentPanelFormProps {
  appointment: Appointment | null;
  defaultDate?: Date;
  defaultTime?: string;
  defaultStaffId?: string;
  companyId: string;
  onSave: (appointment: Partial<Appointment>) => Promise<void>;
  onDelete?: (appointmentId: string) => Promise<void>;
  onClose: () => void;
  onLoadAppointment?: (appointmentId: string) => Promise<void>;
}

const AppointmentPanelForm: React.FC<AppointmentPanelFormProps> = ({
  appointment,
  defaultDate,
  defaultTime,
  defaultStaffId,
  companyId,
  onSave,
  onDelete,
  onClose,
  onLoadAppointment,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [status, setStatus] = useState<AppointmentStatus>(appointment?.status || 'pending');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientPhone, setClientPhone] = useState(appointment?.clientPhone || '');
  const [clientEmail, setClientEmail] = useState(appointment?.clientEmail || '');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [source, setSource] = useState<AppointmentSource>(appointment?.source || 'dashboard');
  const [advancedFields, setAdvancedFields] = useState<any>({});
  const [appointmentDate, setAppointmentDate] = useState<Date>(
    toDate(appointment?.date) || defaultDate || new Date()
  );
  // Store time as hours and minutes instead of full Date
  const [appointmentHours, setAppointmentHours] = useState<number>(() => {
    if (appointment?.startTime) {
      return parseInt(appointment.startTime.split(':')[0]);
    } else if (defaultTime) {
      return parseInt(defaultTime.split(':')[0]);
    }
    return 9;
  });
  
  const [appointmentMinutes, setAppointmentMinutes] = useState<number>(() => {
    if (appointment?.startTime) {
      return parseInt(appointment.startTime.split(':')[1]);
    } else if (defaultTime) {
      return parseInt(defaultTime.split(':')[1]);
    }
    return 0;
  });
  
  // Create a Date object for display purposes
  const appointmentTime = new Date(appointmentDate);
  appointmentTime.setHours(appointmentHours, appointmentMinutes, 0, 0);
  const [selectedStaff, setSelectedStaff] = useState<string>(appointment?.staffId || defaultStaffId || '');
  
  // Notifications state
  const [notifications, setNotifications] = useState<any[]>(appointment?.notifications || []);
  
  // Lists
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  
  // Payment state (only when arrived)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [paidAmount, setPaidAmount] = useState(appointment?.prepaidAmount || 0);
  const [paymentStatus, setPaymentStatus] = useState<'none' | 'partial' | 'full'>(
    appointment?.paymentStatus === 'full' ? 'full' : 
    appointment?.paymentStatus === 'partial' ? 'partial' : 'none'
  );
  const [selectedServices, setSelectedServices] = useState<any[]>(() => {
    // Initialize with appointment services, handling both service objects and service references
    if (appointment?.services && Array.isArray(appointment.services)) {
      return appointment.services.map(service => ({
        id: service.serviceId || service.id,
        serviceId: service.serviceId || service.id,
        name: service.serviceName || service.name,
        serviceName: service.serviceName || service.name,
        price: service.price || 0,
        startingPrice: service.price || 0,
        duration: typeof service.duration === 'number' ? 
          { hours: Math.floor(service.duration / 60), minutes: service.duration % 60 } : 
          service.duration || { hours: 0, minutes: 30 }
      }));
    }
    return [];
  });
  const [totalPrice, setTotalPrice] = useState(appointment?.totalPrice || 0);
  
  // New client state
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    phone: '',
    email: ''
  });
  
  // Time picker mode
  const [useTimeSlots, setUseTimeSlots] = useState(true);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    loadStaff();
    if (appointment?.clientId && appointment.clientId !== 'guest') {
      loadClientById(appointment.clientId);
    } else if (appointment?.clientId === 'guest' && appointment?.clientPhone) {
      // For guest appointments, try to find client by phone
      handleClientSearch(appointment.clientPhone);
    }
  }, []);

  // Commented out - might be causing timing issues
  // useEffect(() => {
  //   setAppointmentTime(prevTime => {
  //     const newTime = new Date(appointmentDate);
  //     newTime.setHours(prevTime.getHours());
  //     newTime.setMinutes(prevTime.getMinutes());
  //     newTime.setSeconds(0);
  //     newTime.setMilliseconds(0);
  //     return newTime;
  //   });
  // }, [appointmentDate]);

  const loadStaff = async () => {
    try {
      setLoadingStaff(true);
      const staffList = await staffService.getStaff(companyId, currentBranch?.id);
      setStaff(staffList);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadClientById = async (clientId: string) => {
    try {
      const client = await clientService.getClient(clientId);
      if (client) {
        setSelectedClient(client);
        // First try to get phone from the client's phoneNumbers array
        const phoneFromArray = client.phoneNumbers?.[0]?.number || client.phoneNumbers?.[0];
        // If appointment already has clientPhone, keep it; otherwise use client's phone
        setClientPhone(appointment?.clientPhone || phoneFromArray || client.phone || '');
        setClientEmail(appointment?.clientEmail || client.email || '');
      }
    } catch (error) {
      console.error('Error loading client:', error);
      // If client not found but we have client info in appointment, use that
      if (appointment?.clientName && appointment?.clientPhone) {
        // Try to find by phone
        const normalizedPhone = appointment.clientPhone.replace(/[\s\-\(\)]/g, '').replace(/^\+20/, '');
        const filter: ClientsFilter = {
          searchTerm: normalizedPhone,
          status: 'active'
        };
        const result = await clientService.getClients(companyId, filter, undefined, currentBranch?.id);
        const clientsArray = result?.clients || [];
        if (clientsArray.length > 0) {
          setSelectedClient(clientsArray[0]);
        }
      }
    }
  };

  const loadAllClients = async () => {
    try {
      setSearchingClients(true);
      console.log('AppointmentForm - Loading clients with branch:', currentBranch?.id);
      console.log('AppointmentForm - Current branch object:', currentBranch);
      
      const result = await clientService.getClients(companyId, undefined, undefined, currentBranch?.id);
      const clientsArray = result?.clients || [];
      console.log('AppointmentForm - Loaded clients count:', clientsArray.length);
      setClients(clientsArray);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setSearchingClients(false);
    }
  };

  const handleClientSearch = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      // If search term is too short, load all clients
      if (clients.length === 0) {
        loadAllClients();
      }
      return;
    }
    
    try {
      setSearchingClients(true);
      // Use getClients with search filter
      const filter: ClientsFilter = {
        searchTerm: searchTerm,
        status: 'active'
      };
      const result = await clientService.getClients(companyId, filter, undefined, currentBranch?.id);
      const clientsArray = result?.clients || [];
      setClients(clientsArray);
    } catch (error) {
      console.error('Error searching clients:', error);
    } finally {
      setSearchingClients(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!clientPhone && !isNewClient) {
        setError(isRTL ? 'يرجى إدخال رقم الهاتف' : 'Please enter phone number');
        return;
      }
      
      if (isNewClient && (!newClientData.name || !newClientData.phone)) {
        setError(isRTL ? 'يرجى إدخال اسم ورقم هاتف العميل' : 'Please enter client name and phone');
        return;
      }
      
      let finalClientId = selectedClient?.id || '';
      let finalClientName = selectedClient?.name || '';
      let finalClientPhone = clientPhone;
      let finalClientEmail = clientEmail;
      
      // Create new client if needed
      if (isNewClient) {
        try {
          console.log('Creating new client with data:', newClientData);
          const clientData: any = {
            name: newClientData.name,
            phone: newClientData.phone,
            phoneNumbers: [{ 
              number: newClientData.phone, 
              type: 'mobile' as const, 
              isPrimary: true 
            }],
            companyId,
          };
          
          // Only add optional fields if they have values
          if (newClientData.email) {
            clientData.email = newClientData.email;
          }
          
          if (currentBranch?.id) {
            clientData.branchId = currentBranch.id;
          }
          
          console.log('Client data to create:', clientData);
          console.log('Current user ID:', currentUser?.id);
          console.log('Current branch ID:', currentBranch?.id);
          
          finalClientId = await clientService.createClient(
            clientData as Omit<Client, 'id'>, 
            currentUser?.id || '', 
            currentBranch?.id
          );
          
          console.log('Client created successfully with ID:', finalClientId);
          finalClientName = newClientData.name;
          finalClientPhone = newClientData.phone;
          finalClientEmail = newClientData.email;
          
          // Show success message
          toast.success(isRTL ? 'تم إنشاء العميل بنجاح' : 'Client created successfully');
          
          // Reload clients list to include the new client
          await loadAllClients();
        } catch (clientError: any) {
          console.error('Error creating client:', clientError);
          console.error('Error details:', clientError.message, clientError.code);
          setError(isRTL ? 'فشل إنشاء العميل' : 'Failed to create client');
          return;
        }
      }

      // Calculate total duration and end time
      const totalDuration = selectedServices.reduce((total, service) => {
        const duration = service.duration ? 
          (service.duration.hours || 0) * 60 + (service.duration.minutes || 0) : 
          30;
        return total + duration;
      }, 0);
      
      // appointmentTime is already correctly computed with the right date
      const startTimeString = format(appointmentTime, 'HH:mm');
      const endTimeDate = new Date(appointmentTime);
      endTimeDate.setMinutes(endTimeDate.getMinutes() + totalDuration);
      const endTimeString = format(endTimeDate, 'HH:mm');

      // Prepare appointment data
      const appointmentData: any = {
        status,
        clientId: finalClientId,
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        date: appointmentTime.toISOString(),
        startTime: startTimeString,
        endTime: endTimeString,
        staffId: selectedStaff,
        staffName: staff.find(s => s.id === selectedStaff)?.name || '',
        totalPrice,
        totalDuration,
        paymentStatus: status === 'arrived' ? 
          (paymentStatus === 'full' ? 'full' : paymentStatus === 'partial' ? 'partial' : 'none') : 
          appointment?.paymentStatus || 'none',
      };

      // Only add services if we have them
      if (selectedServices && selectedServices.length > 0) {
        appointmentData.services = selectedServices.map(service => ({
          serviceId: service.id || service.serviceId,
          serviceName: service.name || service.serviceName,
          price: service.startingPrice || service.price || 0,
          duration: service.duration ? 
            (typeof service.duration === 'number' ? service.duration : 
              (service.duration.hours || 0) * 60 + (service.duration.minutes || 0)) : 
            30,
        }));
      } else if (appointment?.services) {
        // Keep existing services if no new ones selected
        appointmentData.services = appointment.services;
      }

      // Only add companyId for new appointments
      if (!appointment?.id) {
        appointmentData.companyId = companyId;
      }
      
      // Always update source
      appointmentData.source = source;

      // Only add notes if they exist
      if (notes && notes.trim()) {
        appointmentData.notes = notes;
      }
      
      // Only add optional fields if they have values
      if (finalClientEmail) {
        appointmentData.clientEmail = finalClientEmail;
      }
      
      if (currentBranch?.id) {
        appointmentData.branchId = currentBranch.id;
      }
      
      if (status === 'arrived' && paidAmount > 0) {
        appointmentData.prepaidAmount = paidAmount;
      } else if (appointment?.prepaidAmount) {
        appointmentData.prepaidAmount = appointment.prepaidAmount;
      }
      
      // Add advanced fields
      if (advancedFields.internalNotes) {
        appointmentData.internalNotes = advancedFields.internalNotes;
      }
      if (advancedFields.resources && advancedFields.resources.length > 0) {
        appointmentData.resources = advancedFields.resources;
      }
      if (advancedFields.categories && advancedFields.categories.length > 0) {
        appointmentData.categories = advancedFields.categories;
      }
      if (advancedFields.color) {
        appointmentData.color = advancedFields.color;
      }
      if (advancedFields.repeat) {
        appointmentData.repeat = advancedFields.repeat;
      }
      
      // Add notifications
      if (notifications && notifications.length > 0) {
        appointmentData.notifications = notifications;
      }

      console.log('Saving appointment with data:', appointmentData);
      console.log('Selected staff:', selectedStaff);
      console.log('Appointment time:', appointmentTime);
      console.log('Notifications:', notifications);
      
      await onSave(appointmentData);

      onClose();
    } catch (error: any) {
      console.error('Error saving appointment:', error);
      setError(error.message || (isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving'));
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = () => {
    const phoneToUse = isNewClient ? newClientData.phone : clientPhone;
    if (phoneToUse) {
      // Remove any non-numeric characters and ensure it starts with country code
      const cleanPhone = phoneToUse.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${cleanPhone}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Status Bar */}
      <AppointmentStatusBar
        status={status}
        onStatusChange={setStatus}
      />

      {/* Header Section with Main Fields */}
      <Box sx={{ p: 2, backgroundColor: theme.palette.background.paper }}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>
          {/* Client Selection */}
          {!isNewClient ? (
            <Autocomplete
              options={[
                { id: 'new', name: isRTL ? '➕ إضافة عميل جديد' : '➕ Add New Client', isSpecial: true },
                ...(Array.isArray(clients) ? clients : [])
              ]}
              getOptionLabel={(option) => {
                if (option.isSpecial) return option.name;
                const phoneFromArray = option.phoneNumbers?.[0]?.number || option.phoneNumbers?.[0];
                const phoneToDisplay = phoneFromArray || option.phone || '';
                const branchInfo = option.branchId ? ` [${option.branchId}]` : '';
                return `${option.name} - ${phoneToDisplay}${branchInfo}`;
              }}
              value={selectedClient}
              onChange={(_, newValue) => {
                if (newValue?.id === 'new') {
                  setIsNewClient(true);
                  setSelectedClient(null);
                } else {
                  setSelectedClient(newValue);
                  if (newValue) {
                    const phoneFromArray = newValue.phoneNumbers?.[0]?.number || newValue.phoneNumbers?.[0];
                    setClientPhone(phoneFromArray || newValue.phone || '');
                    setClientEmail(newValue.email || '');
                  }
                }
              }}
              onInputChange={(_, value) => handleClientSearch(value)}
              onOpen={() => {
                if (clients.length === 0 && companyId) {
                  loadAllClients();
                }
              }}
              loading={searchingClients}
              noOptionsText={searchingClients ? (isRTL ? 'جاري البحث...' : 'Searching...') : (isRTL ? 'لا توجد خيارات' : 'No options')}
              renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                // Use a unique key based on client ID to avoid duplicate key warnings
                const uniqueKey = option.id || `client-${Math.random()}`;
                return (
                  <Box component="li" key={uniqueKey} {...otherProps} sx={{ 
                    fontWeight: option.isSpecial ? 600 : 400,
                    color: option.isSpecial ? theme.palette.primary.main : 'inherit',
                  }}>
                    {option.isSpecial ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonAdd />
                        <span>{option.name}</span>
                      </Box>
                    ) : (
                      <Box>
                        <Typography variant="body2">{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.phoneNumbers?.[0]?.number || option.phoneNumbers?.[0] || option.phone || ''}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={isRTL ? 'العميل' : 'Client'}
                  placeholder={isRTL ? 'ابحث عن عميل...' : 'Search for a client...'}
                  size="small"
                  fullWidth
                  sx={{ mb: 2 }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <Person sx={{ mr: 1, color: 'action.active' }} />
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          ) : (
            // New Client Form
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonAdd color="primary" />
                  {isRTL ? 'عميل جديد' : 'New Client'}
                </Typography>
                <IconButton size="small" onClick={() => {
                  setIsNewClient(false);
                  setNewClientData({ name: '', phone: '', email: '' });
                }}>
                  <Close />
                </IconButton>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label={isRTL ? 'اسم العميل' : 'Client Name'}
                  value={newClientData.name}
                  onChange={(e) => setNewClientData({ ...newClientData, name: e.target.value })}
                  size="small"
                  fullWidth
                  required
                  autoFocus
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
                
                <TextField
                  label={isRTL ? 'رقم الهاتف' : 'Phone Number'}
                  value={newClientData.phone}
                  onChange={(e) => setNewClientData({ ...newClientData, phone: e.target.value })}
                  size="small"
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
                
                <TextField
                  label={isRTL ? 'البريد الإلكتروني' : 'Email'}
                  value={newClientData.email}
                  onChange={(e) => setNewClientData({ ...newClientData, email: e.target.value })}
                  size="small"
                  fullWidth
                  type="email"
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Date, Time, and Staff Row */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {/* Date Picker */}
            <DatePicker
              label={isRTL ? 'التاريخ' : 'Date'}
              value={appointmentDate}
              onChange={(newDate) => newDate && setAppointmentDate(newDate)}
              format="dd/MM/yyyy"
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  InputProps: {
                    startAdornment: (
                      <CalendarMonth sx={{ mr: 1, color: 'action.active' }} />
                    ),
                  },
                },
              }}
            />

            {/* Time Selector */}
            <TextField
              label={isRTL ? 'الوقت' : 'Time'}
              value={format(appointmentTime, 'h:mm a')}
              onClick={() => setTimeDialogOpen(true)}
              size="small"
              fullWidth
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <AccessTime sx={{ mr: 1, color: 'action.active' }} />
                ),
              }}
              sx={{ cursor: 'pointer' }}
            />

            {/* Staff Selector */}
            <FormControl size="small" fullWidth>
              <InputLabel>{isRTL ? 'الموظف' : 'Employee'}</InputLabel>
              <Select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                label={isRTL ? 'الموظف' : 'Employee'}
                startAdornment={
                  <PersonOutline sx={{ mr: 1, ml: 1, color: 'action.active' }} />
                }
              >
                {loadingStaff ? (
                  <MenuItem disabled>
                    <CircularProgress size={20} />
                  </MenuItem>
                ) : (
                  staff.map((member) => (
                    <MenuItem key={member.id} value={member.id}>
                      {member.name}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Box>
        </LocalizationProvider>

        {/* Recurring Appointment Indicator */}
        {(appointment?.repeat && appointment.repeat.type !== 'none') || advancedFields.repeat && (
          <Alert 
            severity="info" 
            icon={<Repeat />}
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              {isRTL ? 'موعد متكرر' : 'Recurring appointment'}
              {advancedFields.repeat && (
                <>
                  {' - '}
                  {advancedFields.repeat.type === 'daily' && (isRTL ? 'يوميًا' : 'Daily')}
                  {advancedFields.repeat.type === 'weekly' && (isRTL ? 'أسبوعيًا' : 'Weekly')}
                  {advancedFields.repeat.type === 'monthly' && (isRTL ? 'شهريًا' : 'Monthly')}
                  {advancedFields.repeat.interval > 1 && ` (${isRTL ? 'كل' : 'every'} ${advancedFields.repeat.interval})`}
                </>
              )}
            </Typography>
          </Alert>
        )}

        {/* Rescheduled Appointment Indicator */}
        {appointment?.status === 'rescheduled' && (
          <Alert 
            severity="info" 
            sx={{ mb: 2 }}
          >
            <Typography variant="body2">
              {isRTL ? 'تمت إعادة جدولة هذا الموعد' : 'This appointment has been rescheduled'}
              {appointment.rescheduledTo && (
                <>
                  {' '}
                  <Button
                    size="small"
                    onClick={async () => {
                      if (appointment.rescheduledTo && onLoadAppointment) {
                        onClose(); // Close current panel
                        await onLoadAppointment(appointment.rescheduledTo);
                      }
                    }}
                    sx={{ ml: 1 }}
                  >
                    {isRTL ? 'عرض الموعد الجديد' : 'View New Appointment'}
                  </Button>
                </>
              )}
            </Typography>
          </Alert>
        )}

        {/* Client Info Display */}
        {(selectedClient || (isNewClient && newClientData.name)) && (
          <Box sx={{ 
            p: 1.5, 
            backgroundColor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.6)
              : theme.palette.background.default, 
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: `1px solid ${theme.palette.divider}`,
          }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                <Typography variant="body2">
                  {isNewClient ? newClientData.phone : clientPhone}
                </Typography>
              </Box>
              
              {(isNewClient ? newClientData.email : clientEmail) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                  <Typography variant="body2">
                    {isNewClient ? newClientData.email : clientEmail}
                  </Typography>
                </Box>
              )}
              
              {isNewClient && (
                <Chip 
                  label={isRTL ? 'عميل جديد' : 'New Client'} 
                  color="primary" 
                  size="small" 
                  variant="outlined"
                />
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              {!isNewClient && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => setActiveTab(3)}
                >
                  {isRTL ? 'السجل' : 'History'}
                </Button>
              )}
              
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<WhatsApp />}
                onClick={handleWhatsAppClick}
                disabled={!clientPhone && !newClientData.phone}
                sx={{
                  backgroundColor: '#25D366',
                  '&:hover': {
                    backgroundColor: '#20BA5C',
                  },
                }}
              >
                {isRTL ? 'واتساب' : 'WhatsApp'}
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={isRTL ? 'المعلومات الأساسية' : 'Basic Info'} />
          <Tab label={isRTL ? 'الحقول المتقدمة' : 'Advanced fields'} />
          <Tab label={isRTL ? 'الإشعارات' : 'Notifications'} />
          <Tab label={isRTL ? 'سجل الزيارات' : 'Visit history'} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {activeTab === 0 && (
          <BasicInfo
            appointment={appointment}
            companyId={companyId}
            staffId={selectedStaff}
            branchId={currentBranch?.id}
            notes={notes}
            source={source}
            onNotesChange={setNotes}
            onSourceChange={setSource}
            onServicesChange={(services) => {
              setSelectedServices(services);
              const total = services.reduce((sum, service) => sum + (service.startingPrice || 0), 0);
              setTotalPrice(total);
            }}
          />
        )}
        
        {activeTab === 1 && (
          <AdvancedFields
            appointment={appointment}
            companyId={companyId}
            appointmentDate={appointmentDate}
            onFieldsChange={setAdvancedFields}
          />
        )}
        
        <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
          <NotificationSettings
            appointment={appointment}
            onNotificationChange={(newNotifications) => {
              console.log('AppointmentPanelForm - Received notifications:', newNotifications);
              setNotifications(newNotifications);
            }}
          />
        </Box>
        
        {activeTab === 3 && (
          <VisitHistory
            clientId={selectedClient?.id || appointment?.clientId || ''}
            companyId={companyId}
            branchId={currentBranch?.id}
          />
        )}
      </Box>

      {/* Payment Section - Only show when status is 'arrived' */}
      {status === 'arrived' && (
        <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <PaymentSection
            totalAmount={totalPrice}
            paymentStatus={paymentStatus}
            paymentMethod={paymentMethod}
            paidAmount={paidAmount}
            onPaymentStatusChange={setPaymentStatus}
            onPaymentMethodChange={setPaymentMethod}
            onPaidAmountChange={setPaidAmount}
          />
        </Box>
      )}

      {/* Actions */}
      <Box sx={{ p: 2, backgroundColor: theme.palette.background.paper, borderTop: `1px solid ${theme.palette.divider}` }}>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {appointment && onDelete && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => onDelete(appointment.id!)}
              disabled={loading}
            >
              {isRTL ? 'حذف الموعد' : 'Delete appointment'}
            </Button>
          )}
          
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
            sx={{
              backgroundColor: '#FFC107',
              color: theme.palette.common.black,
              '&:hover': {
                backgroundColor: '#FFB300',
              },
            }}
          >
            {loading
              ? isRTL ? 'جاري الحفظ...' : 'Saving...'
              : isRTL ? 'حفظ الموعد' : 'Save appointment'}
          </Button>
        </Box>
      </Box>

      {/* Time Selection Dialog */}
      <Dialog
        open={timeDialogOpen}
        onClose={() => setTimeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isRTL ? 'اختر وقت الموعد' : 'Select Appointment Time'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {useTimeSlots ? (
              <TimeSlotSelector
                value={appointmentTime}
                onChange={(newTime) => {
                  // Set hours and minutes from the selected time
                  setAppointmentHours(newTime.getHours());
                  setAppointmentMinutes(newTime.getMinutes());
                  setTimeDialogOpen(false);
                }}
                date={appointmentDate}
                duration={30}
                startHour={9}
                endHour={19}
                interval={30}
                staffId={selectedStaff}
                workingHours={(() => {
                  const staffMember = staff.find(s => s.id === selectedStaff);
                  if (staffMember?.schedule?.workingHours) {
                    const dayName = format(appointmentDate, 'EEEE').toLowerCase();
                    const daySchedule = staffMember.schedule.workingHours[dayName];
                    if (daySchedule?.isWorking) {
                      return {
                        start: daySchedule.start || '09:00',
                        end: daySchedule.end || '18:00'
                      };
                    }
                  }
                  return undefined;
                })()}
              />
            ) : (
              <TimePicker
                label={isRTL ? 'الوقت' : 'Time'}
                value={appointmentTime}
                onChange={(newTime) => {
                  if (newTime) {
                    // Set hours and minutes from the selected time
                    setAppointmentHours(newTime.getHours());
                    setAppointmentMinutes(newTime.getMinutes());
                    setTimeDialogOpen(false);
                  }
                }}
                ampm={true}
                minutesStep={15}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    autoFocus: true,
                  },
                }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUseTimeSlots(!useTimeSlots)} size="small">
            {useTimeSlots ? (isRTL ? 'استخدام منتقي الوقت' : 'Use Time Picker') : (isRTL ? 'استخدام الفترات الزمنية' : 'Use Time Slots')}
          </Button>
          <Button onClick={() => setTimeDialogOpen(false)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppointmentPanelForm;