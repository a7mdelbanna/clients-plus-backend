import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import { PendingActions } from '@mui/icons-material';

export default function ApprovalQueue() {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  return (
    <Box>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <PendingActions sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isRTL ? 'لا توجد موافقات معلقة' : 'No Pending Approvals'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isRTL 
              ? 'جميع المصروفات تمت الموافقة عليها'
              : 'All expenses have been approved'
            }
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}