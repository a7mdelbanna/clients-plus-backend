import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  useTheme,
} from '@mui/material';
import { Add, Schedule } from '@mui/icons-material';

export default function RecurringExpenses() {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  return (
    <Box>
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 8 }}>
          <Schedule sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isRTL ? 'المصروفات المتكررة' : 'Recurring Expenses'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {isRTL 
              ? 'إعداد المصروفات التي تتكرر شهرياً أو سنوياً'
              : 'Set up monthly or yearly recurring expenses'
            }
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
          >
            {isRTL ? 'إضافة مصروف متكرر' : 'Add Recurring Expense'}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}