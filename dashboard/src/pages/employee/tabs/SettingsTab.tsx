import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Delete } from '@mui/icons-material';
import type { Staff } from '../../../services/staff.service';

interface SettingsTabProps {
  employee: Staff;
  companyId: string;
  onUpdate: (employee: Staff) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ employee, companyId, onUpdate }) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        إعدادات الموظف
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          إجراءات خطرة
        </Typography>
        
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={() => {
            // TODO: Implement delete functionality
          }}
        >
          حذف الموظف
        </Button>
      </Paper>
    </Box>
  );
};

export default SettingsTab;