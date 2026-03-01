import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  useTheme,
  Paper,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  Add,
  ChevronLeft,
  ChevronRight,
  Today,
  ViewDay,
  ViewWeek,
  ViewModule,
  FilterList,
} from '@mui/icons-material';
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, startOfDay, endOfDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { appointmentService } from '../../services/appointment.service';
import { staffService } from '../../services/staff.service';
import CalendarWeekView from '../../components/appointments/CalendarWeekView';
import CalendarDayView from '../../components/appointments/CalendarDayView';
import CalendarMonthView from '../../components/appointments/CalendarMonthView';
import AppointmentPanel from '../../components/appointments/AppointmentPanel';
import AppointmentPanelForm from '../../components/appointments/AppointmentPanelForm';
import type { Appointment } from '../../services/appointment.service';
import type { Staff } from '../../services/staff.service';
import { toDateSafe } from '../../utils/dateUtils';

type ViewType = 'day' | 'week' | 'month';

const AppointmentsPage: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  // State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');
  const [selectedStaff, setSelectedStaff] = useState<string>('all');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAppointmentPanel, setOpenAppointmentPanel] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; time: string } | null>(null);
  const [companyId, setCompanyId] = useState<string>('');
  const [loadSpecificAppointment, setLoadSpecificAppointment] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUser) return;

      try {
        const userCompanyId = currentUser?.companyId;
        
        if (!userCompanyId) {
          console.error('No companyId found in user claims');
          return;
        }
        
        setCompanyId(userCompanyId);

        // Load staff
        try {
          const staffList = await staffService.getStaff(userCompanyId, currentBranch?.id);
          setStaff(staffList);

          // Don't auto-select staff to prevent infinite loop
          // Let user choose or keep 'all' selected
        } catch (staffError) {
          console.error('Error loading staff:', staffError);
          // Continue even if staff loading fails
          setStaff([]);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();
  }, [currentUser, currentBranch]);

  // Load appointments when date or staff changes
  useEffect(() => {
    if (companyId && selectedStaff !== 'all') {
      loadAppointments();
    }
  }, [companyId, currentDate, selectedStaff, viewType, currentBranch]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date;

      if (viewType === 'day') {
        startDate = startOfDay(currentDate);
        endDate = endOfDay(currentDate);
      } else if (viewType === 'week') {
        startDate = startOfWeek(currentDate, { locale });
        endDate = endOfWeek(currentDate, { locale });
      } else {
        // Month view - load 6 weeks to ensure full month display
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        startDate = startOfWeek(monthStart, { locale });
        endDate = endOfWeek(monthEnd, { locale });
      }


      const appointmentsList = await appointmentService.getAppointments(
        companyId,
        startDate,
        endDate,
        selectedStaff !== 'all' ? selectedStaff : undefined,
        currentBranch?.id
      );


      setAppointments(appointmentsList);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const handlePrevious = () => {
    if (viewType === 'day') {
      setCurrentDate(prev => addDays(prev, -1));
    } else if (viewType === 'week') {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }
  };

  const handleNext = () => {
    if (viewType === 'day') {
      setCurrentDate(prev => addDays(prev, 1));
    } else if (viewType === 'week') {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Appointment handlers
  const handleTimeSlotClick = (date: Date, time: string) => {
    setSelectedTimeSlot({ date, time });
    setSelectedAppointment(null);
    setOpenAppointmentPanel(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setSelectedTimeSlot(null);
    setOpenAppointmentPanel(true);
  };

  const handleAppointmentPanelClose = () => {
    setOpenAppointmentPanel(false);
    setSelectedAppointment(null);
    setSelectedTimeSlot(null);
  };

  // Function to load a specific appointment
  const handleLoadSpecificAppointment = async (appointmentId: string) => {
    try {
      console.log('Loading specific appointment:', appointmentId);
      const appointment = await appointmentService.getAppointmentById(appointmentId);
      if (appointment) {
        setSelectedAppointment(appointment);
        setOpenAppointmentPanel(true);
        
        // Update the current date to show the appointment's date
        if (appointment.date) {
          const appointmentDate = toDateSafe(appointment.date);
          setCurrentDate(appointmentDate);
        }
      } else {
        console.error('Appointment not found:', appointmentId);
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
    }
  };

  const handleAppointmentSave = async (appointmentData: Partial<Appointment>) => {
    try {
      if (selectedAppointment?.id) {
        await appointmentService.updateAppointment(
          selectedAppointment.id, 
          appointmentData,
          currentUser?.id || ''
        );
      } else {
        // Create new appointment
        // Don't override the date from appointmentData - it already has the correct date
        const newAppointment: Partial<Appointment> = {
          ...appointmentData,
          companyId,
        };
        await appointmentService.createAppointment(
          newAppointment as Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
          currentUser?.id || ''
        );
      }
      
      // Navigate to the appointment date if it's different from current view
      if (appointmentData.date) {
        const appointmentDate = toDateSafe(appointmentData.date);
        
        // Check if appointment date is in current view
        let startDate: Date;
        let endDate: Date;
        
        if (viewType === 'week') {
          startDate = startOfWeek(currentDate, { locale });
          endDate = endOfWeek(currentDate, { locale });
        } else {
          startDate = startOfDay(currentDate);
          endDate = endOfDay(currentDate);
        }
        
        // If appointment is outside current view, navigate to it
        if (appointmentDate < startDate || appointmentDate > endDate) {
          setCurrentDate(appointmentDate);
        }
      }
      
      await loadAppointments();
      handleAppointmentPanelClose();
    } catch (error) {
      console.error('Error saving appointment:', error);
      throw error;
    }
  };

  const handleAppointmentDelete = async (appointmentId: string) => {
    try {
      await appointmentService.deleteAppointment(appointmentId);
      await loadAppointments();
      handleAppointmentPanelClose();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      throw error;
    }
  };

  // Get current view date range text
  const getDateRangeText = () => {
    if (viewType === 'day') {
      return format(currentDate, 'EEEE, d MMMM yyyy', { locale });
    } else if (viewType === 'week') {
      const start = startOfWeek(currentDate, { locale });
      const end = endOfWeek(currentDate, { locale });
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'd', { locale })} - ${format(end, 'd MMMM yyyy', { locale })}`;
      } else {
        return `${format(start, 'd MMM', { locale })} - ${format(end, 'd MMM yyyy', { locale })}`;
      }
    } else {
      return format(currentDate, 'MMMM yyyy', { locale });
    }
  };

  // Get selected staff name
  const getSelectedStaffName = () => {
    if (selectedStaff === 'all') return isRTL ? 'جميع الموظفين' : 'All Staff';
    const staffMember = staff.find(s => s.id === selectedStaff);
    return staffMember?.name || '';
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            {isRTL ? 'التقويم' : 'Calendar'}
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setSelectedAppointment(null);
              setSelectedTimeSlot(null);
              setOpenAppointmentPanel(true);
            }}
            sx={{ 
              backgroundColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              }
            }}
          >
            {isRTL ? 'موعد جديد' : 'New Appointment'}
          </Button>
        </Box>

        {/* Controls */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {/* Date Navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleToday}
              startIcon={<Today />}
            >
              {isRTL ? 'اليوم' : 'Today'}
            </Button>
            
            <IconButton onClick={handlePrevious}>
              {isRTL ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
            
            <Typography variant="h6" sx={{ minWidth: 200, textAlign: 'center' }}>
              {getDateRangeText()}
            </Typography>
            
            <IconButton onClick={handleNext}>
              {isRTL ? <ChevronLeft /> : <ChevronRight />}
            </IconButton>
          </Box>

          {/* View Type Toggle */}
          <ToggleButtonGroup
            value={viewType}
            exclusive
            onChange={(_, newView) => newView && setViewType(newView)}
            size="small"
          >
            <ToggleButton value="day">
              <Tooltip title={isRTL ? 'عرض يومي' : 'Day view'}>
                <ViewDay />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="week">
              <Tooltip title={isRTL ? 'عرض أسبوعي' : 'Week view'}>
                <ViewWeek />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="month">
              <Tooltip title={isRTL ? 'عرض شهري' : 'Month view'}>
                <ViewModule />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Staff Selector */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>{isRTL ? 'الموظف' : 'Staff'}</InputLabel>
            <Select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              label={isRTL ? 'الموظف' : 'Staff'}
            >
              <MenuItem value="all">{isRTL ? 'جميع الموظفين' : 'All Staff'}</MenuItem>
              {staff.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {member.name}
                    {member.position && (
                      <Chip label={member.position} size="small" />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Filter Button */}
          <IconButton>
            <FilterList />
          </IconButton>
        </Box>
      </Paper>

      {/* Calendar */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', p: 2 }}>
        {viewType === 'day' && (
          <CalendarDayView
            currentDate={currentDate}
            appointments={appointments}
            staff={staff}
            onAppointmentClick={handleAppointmentClick}
            onTimeSlotClick={handleTimeSlotClick}
            selectedStaffId={selectedStaff !== 'all' ? selectedStaff : undefined}
          />
        )}
        {viewType === 'week' && (
          <CalendarWeekView
            currentDate={currentDate}
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
            onTimeSlotClick={handleTimeSlotClick}
            selectedStaffId={selectedStaff !== 'all' ? selectedStaff : undefined}
            staff={staff}
          />
        )}
        {viewType === 'month' && (
          <CalendarMonthView
            currentDate={currentDate}
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
            onDateClick={(date) => {
              setCurrentDate(date);
              setViewType('day');
            }}
            selectedStaffId={selectedStaff !== 'all' ? selectedStaff : undefined}
          />
        )}
      </Box>

      {/* Appointment Panel */}
      <AppointmentPanel
        open={openAppointmentPanel}
        onClose={handleAppointmentPanelClose}
        title={selectedAppointment ? 
          (isRTL ? 'تعديل الموعد' : 'Edit Appointment') : 
          (isRTL ? 'موعد جديد' : 'New Appointment')
        }
      >
        <AppointmentPanelForm
          appointment={selectedAppointment}
          defaultDate={selectedTimeSlot?.date}
          defaultTime={selectedTimeSlot?.time}
          defaultStaffId={selectedStaff !== 'all' ? selectedStaff : undefined}
          companyId={companyId}
          onSave={handleAppointmentSave}
          onDelete={selectedAppointment ? handleAppointmentDelete : undefined}
          onClose={handleAppointmentPanelClose}
          onLoadAppointment={handleLoadSpecificAppointment}
        />
      </AppointmentPanel>
    </Box>
  );
};

export default AppointmentsPage;