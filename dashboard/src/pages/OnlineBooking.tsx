import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { BookOnline, Settings } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const OnlineBooking: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isRTL = theme.direction === 'rtl';

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {isRTL ? 'الحجز الإلكتروني' : 'Online Booking'}
      </Typography>

      <Paper sx={{ p: 4, mt: 3, textAlign: 'center' }}>
        <BookOnline sx={{ fontSize: 80, color: theme.palette.text.secondary, mb: 2 }} />
        
        <Typography variant="h5" gutterBottom>
          {isRTL ? 'إدارة الحجز الإلكتروني' : 'Online Booking Management'}
        </Typography>
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {isRTL 
            ? 'قم بإعداد وإدارة نظام الحجز الإلكتروني الخاص بك. يمكنك إنشاء روابط حجز مخصصة وتكوين إعدادات الحجز.'
            : 'Set up and manage your online booking system. Create custom booking links and configure booking settings.'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<BookOnline />}
            onClick={() => navigate('/booking-links')}
            sx={{ 
              backgroundColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              }
            }}
          >
            {isRTL ? 'إدارة روابط الحجز' : 'Manage Booking Links'}
          </Button>

          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => navigate('/settings/appointment-calendar')}
          >
            {isRTL ? 'إعدادات التقويم' : 'Calendar Settings'}
          </Button>
        </Box>

        <Box sx={{ mt: 4, p: 3, bgcolor: theme.palette.background.default, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            {isRTL ? 'ميزات قادمة:' : 'Coming Features:'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • {isRTL ? 'إحصائيات الحجز المفصلة' : 'Detailed booking analytics'}<br />
            • {isRTL ? 'قوالب رسائل البريد الإلكتروني والرسائل النصية' : 'Email and SMS templates'}<br />
            • {isRTL ? 'تكامل التقويم المتقدم' : 'Advanced calendar integration'}<br />
            • {isRTL ? 'قواعد الحجز المخصصة' : 'Custom booking rules'}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default OnlineBooking;