import React, { useState, useEffect } from 'react';
import {
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Button,
  Box,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { positionService, type Position } from '../../../../services/position.service';
import { useAuth } from '../../../../contexts/AuthContext';

interface ScheduleFiltersProps {
  anchorEl: null | HTMLElement;
  open: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
}

export interface FilterOptions {
  positionId?: string;
  scheduleStatus?: 'all' | 'scheduled' | 'unscheduled';
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

const ScheduleFilters: React.FC<ScheduleFiltersProps> = ({
  anchorEl,
  open,
  onClose,
  onApplyFilters,
}) => {
  const { currentUser } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  useEffect(() => {
    if (open && currentUser) {
      loadPositions();
    }
  }, [open, currentUser]);

  const loadPositions = async () => {
    try {
      let companyId = currentUser?.companyId;

      if (companyId) {
        const fetchedPositions = await positionService.getPositions(companyId);
        setPositions(fetchedPositions);
      }
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };

  const handlePositionChange = (event: SelectChangeEvent) => {
    setFilters({ ...filters, positionId: event.target.value });
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    setFilters({ ...filters, scheduleStatus: event.target.value as 'all' | 'scheduled' | 'unscheduled' });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, searchTerm: event.target.value });
  };

  const handleApply = () => {
    const finalFilters = { ...filters };
    
    if (startDate && endDate) {
      finalFilters.dateRange = {
        start: startDate.toDate(),
        end: endDate.toDate(),
      };
    }

    onApplyFilters(finalFilters);
  };

  const handleReset = () => {
    setFilters({});
    setStartDate(null);
    setEndDate(null);
  };

  const activeFiltersCount = Object.keys(filters).filter(key => filters[key as keyof FilterOptions]).length + 
    (startDate && endDate ? 1 : 0);

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 320, p: 2 },
      }}
    >
      <Typography variant="h6" sx={{ mb: 2 }}>
        عوامل التصفية
        {activeFiltersCount > 0 && (
          <Chip 
            label={activeFiltersCount} 
            size="small" 
            color="primary" 
            sx={{ ml: 1 }}
          />
        )}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Search */}
        <TextField
          size="small"
          placeholder="البحث بالاسم..."
          value={filters.searchTerm || ''}
          onChange={handleSearchChange}
          fullWidth
        />

        {/* Position Filter */}
        <FormControl size="small" fullWidth>
          <InputLabel>المنصب</InputLabel>
          <Select
            value={filters.positionId || ''}
            onChange={handlePositionChange}
            label="المنصب"
          >
            <MenuItem value="">الكل</MenuItem>
            {positions.map(position => (
              <MenuItem key={position.id} value={position.id}>
                {position.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Schedule Status */}
        <FormControl size="small" fullWidth>
          <InputLabel>حالة الجدولة</InputLabel>
          <Select
            value={filters.scheduleStatus || 'all'}
            onChange={handleStatusChange}
            label="حالة الجدولة"
          >
            <MenuItem value="all">الكل</MenuItem>
            <MenuItem value="scheduled">مجدول</MenuItem>
            <MenuItem value="unscheduled">غير مجدول</MenuItem>
          </Select>
        </FormControl>

        <Divider />

        {/* Date Range */}
        <Typography variant="subtitle2">نطاق التاريخ</Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DatePicker
            label="من تاريخ"
            value={startDate}
            onChange={(newValue) => setStartDate(newValue)}
            format="DD/MM/YYYY"
            slotProps={{
              textField: { size: 'small', fullWidth: true },
            }}
          />
          <DatePicker
            label="إلى تاريخ"
            value={endDate}
            onChange={(newValue) => setEndDate(newValue)}
            format="DD/MM/YYYY"
            slotProps={{
              textField: { size: 'small', fullWidth: true },
            }}
          />
        </LocalizationProvider>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
        <Button
          variant="text"
          onClick={handleReset}
          sx={{ flex: 1 }}
        >
          إعادة تعيين
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          sx={{ flex: 1 }}
        >
          تطبيق
        </Button>
      </Box>
    </Menu>
  );
};

export default ScheduleFilters;