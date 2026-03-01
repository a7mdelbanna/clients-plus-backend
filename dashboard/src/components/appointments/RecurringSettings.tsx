import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Checkbox,
  useTheme,
  InputLabel,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ar, enUS } from 'date-fns/locale';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { toDate } from '../../utils/dateUtils';
import type { RepeatType, AppointmentRepeat } from '../../services/appointment.service';

interface RecurringSettingsProps {
  appointment: any | null;
  appointmentDate: Date;
  onRepeatChange?: (repeat: AppointmentRepeat | null) => void;
}

const RecurringSettings: React.FC<RecurringSettingsProps> = ({
  appointment,
  appointmentDate,
  onRepeatChange,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const locale = isRTL ? ar : enUS;

  const [enabled, setEnabled] = useState(!!appointment?.repeat && appointment.repeat.type !== 'none');
  const [repeatType, setRepeatType] = useState<RepeatType>(appointment?.repeat?.type || 'weekly');
  const [interval, setInterval] = useState(appointment?.repeat?.interval || 1);
  const [endDate, setEndDate] = useState<Date | null>(
    appointment?.repeat?.endDate ? toDate(appointment.repeat.endDate) : null
  );
  const [maxOccurrences, setMaxOccurrences] = useState(appointment?.repeat?.maxOccurrences || 10);
  const [useEndDate, setUseEndDate] = useState(!!appointment?.repeat?.endDate);

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) {
      onRepeatChange?.(null);
    } else {
      updateRepeatSettings();
    }
  };

  const updateRepeatSettings = () => {
    if (!enabled) {
      onRepeatChange?.(null);
      return;
    }

    const repeat: AppointmentRepeat = {
      type: repeatType,
      interval,
      ...(useEndDate && endDate ? { endDate: endDate as any } : { maxOccurrences }),
    };

    onRepeatChange?.(repeat);
  };

  React.useEffect(() => {
    if (enabled) {
      updateRepeatSettings();
    }
  }, [repeatType, interval, endDate, maxOccurrences, useEndDate]);

  // Calculate preview dates
  const getPreviewDates = () => {
    const dates: Date[] = [appointmentDate];
    let currentDate = appointmentDate;
    const maxPreview = 5;

    for (let i = 1; i < maxPreview; i++) {
      if (repeatType === 'daily') {
        currentDate = addDays(currentDate, interval);
      } else if (repeatType === 'weekly') {
        currentDate = addWeeks(currentDate, interval);
      } else if (repeatType === 'monthly') {
        currentDate = addMonths(currentDate, interval);
      }

      if (useEndDate && endDate && currentDate > endDate) {
        break;
      }

      dates.push(currentDate);
    }

    return dates;
  };

  const getRepeatText = () => {
    const intervalText = interval > 1 ? interval : '';
    
    if (repeatType === 'daily') {
      return isRTL
        ? `${intervalText ? `كل ${intervalText} ` : ''}يوميًا`
        : `${intervalText ? `Every ${intervalText} ` : 'Every '}day${interval > 1 ? 's' : ''}`;
    } else if (repeatType === 'weekly') {
      return isRTL
        ? `${intervalText ? `كل ${intervalText} ` : ''}أسبوعيًا`
        : `${intervalText ? `Every ${intervalText} ` : 'Every '}week${interval > 1 ? 's' : ''}`;
    } else if (repeatType === 'monthly') {
      return isRTL
        ? `${intervalText ? `كل ${intervalText} ` : ''}شهريًا`
        : `${intervalText ? `Every ${intervalText} ` : 'Every '}month${interval > 1 ? 's' : ''}`;
    }
    return '';
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={locale}>
      <Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={enabled}
              onChange={(e) => handleEnabledChange(e.target.checked)}
            />
          }
          label={
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {isRTL ? 'موعد متكرر' : 'Recurring Appointment'}
            </Typography>
          }
        />

        {enabled && (
          <Box sx={{ mt: 3, pl: isRTL ? 0 : 4, pr: isRTL ? 4 : 0 }}>
            {/* Repeat Type */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>{isRTL ? 'تكرار' : 'Repeat'}</InputLabel>
                <Select
                  value={repeatType}
                  onChange={(e) => setRepeatType(e.target.value as RepeatType)}
                  label={isRTL ? 'تكرار' : 'Repeat'}
                >
                  <MenuItem value="daily">{isRTL ? 'يوميًا' : 'Daily'}</MenuItem>
                  <MenuItem value="weekly">{isRTL ? 'أسبوعيًا' : 'Weekly'}</MenuItem>
                  <MenuItem value="monthly">{isRTL ? 'شهريًا' : 'Monthly'}</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="body2" sx={{ mx: 1 }}>
                {isRTL ? 'كل' : 'every'}
              </Typography>

              <TextField
                type="number"
                size="small"
                value={interval}
                onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                inputProps={{ min: 1, max: 30 }}
                sx={{ width: 80 }}
              />

              <Typography variant="body2">
                {repeatType === 'daily' && (isRTL ? 'يوم' : `day${interval > 1 ? 's' : ''}`)}
                {repeatType === 'weekly' && (isRTL ? 'أسبوع' : `week${interval > 1 ? 's' : ''}`)}
                {repeatType === 'monthly' && (isRTL ? 'شهر' : `month${interval > 1 ? 's' : ''}`)}
              </Typography>
            </Box>

            {/* End Options */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                {isRTL ? 'ينتهي' : 'Ends'}
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!useEndDate}
                      onChange={(e) => setUseEndDate(!e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">
                        {isRTL ? 'بعد' : 'After'}
                      </Typography>
                      <TextField
                        type="number"
                        size="small"
                        value={maxOccurrences}
                        onChange={(e) => setMaxOccurrences(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={useEndDate}
                        inputProps={{ min: 1, max: 365 }}
                        sx={{ width: 80, mx: 1 }}
                      />
                      <Typography variant="body2">
                        {isRTL ? 'مرات' : 'occurrences'}
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useEndDate}
                      onChange={(e) => setUseEndDate(e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2">
                        {isRTL ? 'في تاريخ' : 'On date'}
                      </Typography>
                      <DatePicker
                        value={endDate}
                        onChange={setEndDate}
                        disabled={!useEndDate}
                        minDate={appointmentDate}
                        slotProps={{
                          textField: {
                            size: 'small',
                            sx: { width: 200 },
                          },
                        }}
                      />
                    </Box>
                  }
                />
              </Box>
            </Box>

            {/* Preview */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {isRTL ? 'معاينة' : 'Preview'}
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  {getRepeatText()}
                  {useEndDate && endDate && (
                    <>
                      {' '}
                      {isRTL ? 'حتى' : 'until'} {format(endDate, 'dd/MM/yyyy', { locale })}
                    </>
                  )}
                  {!useEndDate && (
                    <>
                      {' '}
                      {isRTL ? `(${maxOccurrences} مرات)` : `(${maxOccurrences} times)`}
                    </>
                  )}
                </Typography>
              </Alert>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {getPreviewDates().map((date, index) => (
                  <Chip
                    key={index}
                    label={format(date, 'EEE, dd MMM', { locale })}
                    size="small"
                    color={index === 0 ? 'primary' : 'default'}
                    variant={index === 0 ? 'filled' : 'outlined'}
                  />
                ))}
                {(!useEndDate || (endDate && getPreviewDates()[getPreviewDates().length - 1] < endDate)) && (
                  <Chip
                    label="..."
                    size="small"
                    variant="outlined"
                    sx={{ opacity: 0.5 }}
                  />
                )}
              </Stack>
            </Box>

            {/* Warning */}
            <Alert severity="warning" variant="outlined">
              <Typography variant="caption">
                {isRTL
                  ? 'سيتم إنشاء مواعيد منفصلة لكل تكرار. يمكن تعديل أو إلغاء كل موعد بشكل منفصل.'
                  : 'Separate appointments will be created for each recurrence. Each appointment can be edited or cancelled individually.'}
              </Typography>
            </Alert>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default RecurringSettings;