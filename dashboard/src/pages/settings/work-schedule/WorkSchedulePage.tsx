import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ArrowBack,
  ArrowForward,
  Today,
  FilterList,
  Settings,
  GetApp,
  KeyboardArrowDown,
  CalendarMonth,
  ViewWeek,
  Info,
  Star,
  Sync,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { workScheduleService, type MonthSchedule, type WeekSchedule, type ViewMode } from '../../../services/workSchedule.service';
import ScheduleCalendar from './components/ScheduleCalendar';
import ScheduleFilters from './components/ScheduleFilters';
import { migrateStaffSchedules } from '../../../utils/migrateSchedules';

const WorkSchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedule, setSchedule] = useState<MonthSchedule | WeekSchedule | null>(null);
  const [companyId, setCompanyId] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!currentUser) return;
    
    loadInitialData();
  }, [currentUser]);

  useEffect(() => {
    if (companyId) {
      loadSchedule();
    }
  }, [companyId, currentDate]);

  const loadInitialData = async () => {
    try {
      let cId = currentUser?.companyId;

      if (!cId) {
        toast.error('لم يتم العثور على معرف الشركة');
        return;
      }

      setCompanyId(cId);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    }
  };

  const loadSchedule = async () => {
    try {
      setLoading(true);
      
      // Always load week schedule for 7-day view
      // Get start of week (Sunday)
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day;
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);
      
      const weekSchedule = await workScheduleService.getWeekSchedule(companyId, startOfWeek, currentBranch?.id);
      setSchedule(weekSchedule);
    } catch (error) {
      console.error('Error loading schedule:', error);
      toast.error('حدث خطأ في تحميل الجدول');
    } finally {
      setLoading(false);
    }
  };

  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    // Always navigate by 7 days since we're showing 7-day view
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleExportPDF = async () => {
    try {
      if (!schedule) return;
      
      toast.info('ميزة التصدير قيد التطوير');
      // TODO: Implement PDF export
      // const blob = await workScheduleService.exportScheduleToPDF(
      //   schedule,
      //   viewMode,
      //   'اسم الشركة'
      // );
      // // Download the PDF
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('حدث خطأ في تصدير الجدول');
    }
  };

  const getDateRangeText = () => {
    // Calculate the week range based on current date
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    // Adjust to start from Sunday
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })} - ${endOfWeek.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden',
        position: 'relative',
        width: '100%',
      }}>
        {/* Top Navigation Bar */}
        <Paper 
          elevation={0} 
          sx={{ 
            px: 3, 
            py: 2, 
            borderBottom: `1px solid ${theme.palette.divider}`,
            borderRadius: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Left Side */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => navigate('/settings')}
                sx={{
                  backgroundColor: theme.palette.action.hover,
                  '&:hover': { backgroundColor: theme.palette.action.selected },
                }}
              >
                <MenuIcon />
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  جدول العمل
                </Typography>
                <Info sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
                <Star sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
              </Box>
            </Box>

            {/* Right Side */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
              <Button
                variant="outlined"
                startIcon={<GetApp />}
                onClick={handleExportPDF}
                sx={{ 
                  borderRadius: 2,
                  display: { xs: 'none', sm: 'flex' },
                }}
              >
                تصدير PDF
              </Button>
              
              {/* Temporarily hide view toggle since we're always showing 7 days
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
                sx={{ display: { xs: 'none', sm: 'flex' } }}
              >
                <ToggleButton value="week" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
                  <ViewWeek sx={{ mr: { xs: 0, sm: 1 } }} />
                  <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>أسبوع</Box>
                </ToggleButton>
                <ToggleButton value="month" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
                  <CalendarMonth sx={{ mr: { xs: 0, sm: 1 } }} />
                  <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>شهر</Box>
                </ToggleButton>
              </ToggleButtonGroup> */}

              <Tooltip title="تحديث الجداول القديمة">
                <IconButton 
                  onClick={async () => {
                    try {
                      const migrated = await migrateStaffSchedules(companyId);
                      toast.success(`تم تحديث ${migrated} جدول`);
                      loadSchedule();
                    } catch (error) {
                      toast.error('حدث خطأ في تحديث الجداول');
                    }
                  }}
                  color="warning"
                >
                  <Sync />
                </IconButton>
              </Tooltip>
              <IconButton>
                <Settings />
              </IconButton>
            </Box>
          </Box>
        </Paper>

        {/* Calendar Navigation */}
        <Paper 
          elevation={0} 
          sx={{ 
            px: 3, 
            py: 2, 
            borderBottom: `1px solid ${theme.palette.divider}`,
            borderRadius: 0,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              endIcon={<KeyboardArrowDown />}
              onClick={(e) => setFilterAnchorEl(e.currentTarget)}
              sx={{ 
                borderRadius: 2,
                minWidth: { xs: 80, sm: 120 },
              }}
              size="small"
            >
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>عوامل التصفية</Box>
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => handleNavigate('prev')}>
                <ArrowForward />
              </IconButton>
              <Typography 
                variant="h6" 
                sx={{ 
                  minWidth: { xs: 120, sm: 200 }, 
                  textAlign: 'center',
                  fontSize: { xs: '0.9rem', sm: '1.25rem' },
                }}
              >
                {getDateRangeText()}
              </Typography>
              <IconButton onClick={() => handleNavigate('next')}>
                <ArrowBack />
              </IconButton>
            </Box>

            <Button
              variant="text"
              startIcon={<Today />}
              onClick={handleToday}
              sx={{ borderRadius: 2 }}
            >
              اليوم
            </Button>
          </Box>
        </Paper>

        {/* Schedule Grid */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'hidden', 
          p: { xs: 1, sm: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0, // Important for flex children
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : schedule ? (
            <ScheduleCalendar
              schedule={schedule}
              viewMode={viewMode}
              currentDate={currentDate}
              onScheduleUpdate={loadSchedule}
              companyId={companyId}
            />
          ) : (
            <Paper sx={{ p: 8, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                لا توجد بيانات للجدول
              </Typography>
            </Paper>
          )}
        </Box>

        {/* Filters Menu */}
        <ScheduleFilters
          anchorEl={filterAnchorEl}
          open={Boolean(filterAnchorEl)}
          onClose={() => setFilterAnchorEl(null)}
          onApplyFilters={(filters) => {
            console.log('Applying filters:', filters);
            setFilterAnchorEl(null);
            // TODO: Implement filtering logic
          }}
        />
      </Box>
    </motion.div>
  );
};

export default WorkSchedulePage;