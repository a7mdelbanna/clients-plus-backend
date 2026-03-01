import React from 'react';
import { Box, Typography, TextField, Stack } from '@mui/material';
import type { Staff } from '../../../services/staff.service';

interface AdditionalInfoTabProps {
  employee: Staff;
  companyId: string;
  onUpdate: (employee: Staff) => void;
}

const AdditionalInfoTab: React.FC<AdditionalInfoTabProps> = ({ employee, companyId, onUpdate }) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 3 }}>
        معلومات إضافية
      </Typography>
      
      <Stack spacing={3}>
        <TextField
          label="الاسم"
          placeholder="مثال: فيكتور"
          fullWidth
          defaultValue={employee.name}
        />
        
        <TextField
          label="اللقب"
          placeholder="مثال: سميث"
          fullWidth
          defaultValue={employee.lastName}
        />
        
        <TextField
          label="الاسم الأوسط"
          placeholder="مثال: مايكل"
          fullWidth
          defaultValue={employee.middleName}
        />
      </Stack>
    </Box>
  );
};

export default AdditionalInfoTab;