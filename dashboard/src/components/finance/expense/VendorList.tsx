import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  useTheme,
} from '@mui/material';
import { Add, Store } from '@mui/icons-material';

export default function VendorList() {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  return (
    <Box>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Store sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isRTL ? 'قائمة الموردين' : 'Vendor List'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {isRTL 
              ? 'إدارة الموردين وتتبع أدائهم'
              : 'Manage vendors and track their performance'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
          >
            {isRTL ? 'إضافة مورد' : 'Add Vendor'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}