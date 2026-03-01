import React from 'react';
import { Box, Typography, Switch, FormControlLabel, Paper } from '@mui/material';
import type { Staff } from '../../../services/staff.service';

interface OnlineBookingTabProps {
  employee: Staff;
  companyId: string;
  onUpdate: (employee: Staff) => void;
}

const OnlineBookingTab: React.FC<OnlineBookingTabProps> = ({ employee, companyId, onUpdate }) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        إعدادات الحجز عبر الإنترنت
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <FormControlLabel
          control={
            <Switch
              checked={employee.onlineBooking.enabled}
              onChange={(e) => {
                // TODO: Implement online booking toggle
              }}
            />
          }
          label={employee.onlineBooking.enabled ? "متاح للحجز عبر الإنترنت" : "غير متاح للحجز عبر الإنترنت"}
        />
      </Paper>
    </Box>
  );
};

export default OnlineBookingTab;