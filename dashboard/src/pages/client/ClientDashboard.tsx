import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  Button,
  CircularProgress,
  Alert,
  useTheme,
  IconButton,
  AppBar,
  Toolbar,
  Avatar,
} from '@mui/material';
import {
  CalendarMonth,
  AccessTime,
  LocationOn,
  Person,
  Logout,
  Phone,
  Event,
  CheckCircle,
  Cancel,
  Schedule,
} from '@mui/icons-material';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';
import { toDateSafe } from '../../utils/dateUtils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Appointment {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  services: Array<{
    name: string;
    duration: number;
    price: number;
  }>;
  staffName: string;
  branchName?: string;
  totalPrice: number;
}

const ClientDashboard: React.FC = () => {
  const theme = useTheme();
  const { session, logout } = useClientAuth();
  const [tabValue, setTabValue] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.phoneNumber) {
      loadAppointments();
    }
  }, [session]);

  const loadAppointments = async () => {
    if (!session?.phoneNumber) return;

    try {
      setLoading(true);
      setError('');

      // Query appointments by phone number via API
      const response = await apiClient.get<ApiResponse<any[]>>('/appointments', {
        params: { clientPhone: session.phoneNumber, sort: 'date:desc' },
        headers: { Authorization: `Bearer ${session.token}` },
      });

      const appointmentsList: Appointment[] = (response.data.data || []).map((data: any) => ({
        id: data.id,
        date: toDateSafe(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        services: data.services || [],
        staffName: data.staffName,
        branchName: data.branchName,
        totalPrice: data.totalPrice || 0,
      }));

      setAppointments(appointmentsList);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError('حدث خطأ في تحميل المواعيد');
    } finally {
      setLoading(false);
    }
  };

  const upcomingAppointments = appointments.filter(
    app => app.date >= new Date() && app.status !== 'cancelled'
  );

  const pastAppointments = appointments.filter(
    app => app.date < new Date() || app.status === 'completed'
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'completed':
        return 'info';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle fontSize="small" />;
      case 'pending':
        return <Schedule fontSize="small" />;
      case 'cancelled':
        return <Cancel fontSize="small" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'مؤكد';
      case 'pending':
        return 'قيد الانتظار';
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغي';
      default:
        return status;
    }
  };

  const AppointmentCard = ({ appointment }: { appointment: Appointment }) => (
    <Card sx={{ mb: 2, position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {format(appointment.date, 'EEEE، d MMMM yyyy', { locale: ar })}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccessTime fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {appointment.startTime} - {appointment.endTime}
              </Typography>
            </Box>
          </Box>
          <Chip
            label={getStatusLabel(appointment.status)}
            color={getStatusColor(appointment.status) as any}
            size="small"
            icon={getStatusIcon(appointment.status) as any}
          />
        </Box>

        {/* Services */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            الخدمات:
          </Typography>
          {appointment.services.map((service, index) => (
            <Typography key={index} variant="body2">
              • {service.name} ({service.duration} دقيقة) - {service.price} ج.م
            </Typography>
          ))}
        </Box>

        {/* Staff & Branch */}
        <Box sx={{ display: 'flex', gap: 3, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Person fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {appointment.staffName}
            </Typography>
          </Box>
          {appointment.branchName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOn fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                {appointment.branchName}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Total Price */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body1" fontWeight="bold">
            المجموع: {appointment.totalPrice} ج.م
          </Typography>

          {/* Cancel Button for upcoming appointments */}
          {appointment.status !== 'cancelled' && appointment.date >= new Date() && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={() => {
                // TODO: Implement cancellation
                console.log('Cancel appointment:', appointment.id);
              }}
            >
              إلغاء الموعد
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: theme.palette.grey[50] }}>
      {/* App Bar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            بوابة العملاء
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2">{session?.name}</Typography>
              <Typography variant="caption" sx={{ direction: 'ltr' }}>
                {session?.phoneNumber}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: theme.palette.primary.dark }}>
              <Phone />
            </Avatar>
            <IconButton color="inherit" onClick={logout} title="تسجيل الخروج">
              <Logout />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 3 }}>
        {/* Welcome Section */}
        <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            مرحباً {session?.name} 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            يمكنك من هنا عرض مواعيدك وإدارتها
          </Typography>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            variant="fullWidth"
          >
            <Tab
              label={`المواعيد القادمة (${upcomingAppointments.length})`}
              icon={<Event />}
              iconPosition="start"
            />
            <Tab
              label={`المواعيد السابقة (${pastAppointments.length})`}
              icon={<CalendarMonth />}
              iconPosition="start"
            />
          </Tabs>
        </Paper>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Upcoming Appointments */}
            {tabValue === 0 && (
              <Box>
                {upcomingAppointments.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      لا توجد مواعيد قادمة
                    </Typography>
                    <Button
                      variant="contained"
                      sx={{ mt: 2 }}
                      onClick={() => {
                        // TODO: Navigate to booking
                        console.log('Book new appointment');
                      }}
                    >
                      حجز موعد جديد
                    </Button>
                  </Paper>
                ) : (
                  upcomingAppointments.map(appointment => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))
                )}
              </Box>
            )}

            {/* Past Appointments */}
            {tabValue === 1 && (
              <Box>
                {pastAppointments.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary">
                      لا توجد مواعيد سابقة
                    </Typography>
                  </Paper>
                ) : (
                  pastAppointments.map(appointment => (
                    <AppointmentCard key={appointment.id} appointment={appointment} />
                  ))
                )}
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default ClientDashboard;