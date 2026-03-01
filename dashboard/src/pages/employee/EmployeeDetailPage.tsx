import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  useMediaQuery,
  Avatar,
  Chip,
  Button,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Person,
  MiscellaneousServices,
  OnlinePrediction,
  Info,
  Settings,
  Schedule,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { staffService, type Staff, AccessLevelDescriptions } from '../../services/staff.service';

// Import tab components
import InformationTab from './tabs/InformationTab';
import ServicesTab from './tabs/ServicesTab';
import OnlineBookingTab from './tabs/OnlineBookingTab';
import AdditionalInfoTab from './tabs/AdditionalInfoTab';
import SettingsTab from './tabs/SettingsTab';
import ScheduleTab from './tabs/ScheduleTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`employee-tabpanel-${index}`}
      aria-labelledby={`employee-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const EmployeeDetailPage: React.FC = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { currentUser } = useAuth();
  
  const [employee, setEmployee] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [companyId, setCompanyId] = useState<string>('');

  const tabs = [
    { label: 'المعلومات', icon: <Person /> },
    { label: 'الخدمات', icon: <MiscellaneousServices /> },
    { label: 'الحجز عبر الإنترنت', icon: <OnlinePrediction /> },
    { label: 'معلومات إضافية', icon: <Info /> },
    { label: 'الإعدادات', icon: <Settings /> },
    { label: 'الجدول', icon: <Schedule /> },
  ];

  useEffect(() => {
    if (!currentUser || !employeeId) return;
    
    loadEmployee();
  }, [currentUser, employeeId]);

  useEffect(() => {
    // Check for tab query parameter
    const tabParam = searchParams.get('tab');
    if (tabParam === 'schedule') {
      setTabValue(5); // Schedule tab index
    }
  }, [searchParams]);

  const loadEmployee = async () => {
    try {
      setLoading(true);
      
      // Get company ID
      let cId = currentUser?.companyId;

      if (!cId) {
        toast.error('لم يتم العثور على معرف الشركة');
        navigate('/settings/staff');
        return;
      }

      setCompanyId(cId);

      // Load employee data
      const employeeData = await staffService.getStaffMember(employeeId!);
      
      if (!employeeData) {
        toast.error('الموظف غير موجود');
        navigate('/settings/staff');
        return;
      }

      setEmployee(employeeData);
    } catch (error) {
      console.error('Error loading employee:', error);
      toast.error('حدث خطأ في تحميل بيانات الموظف');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEmployeeUpdate = (updatedEmployee: Staff) => {
    setEmployee(updatedEmployee);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!employee) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => navigate('/settings/staff')}
                sx={{
                  backgroundColor: theme.palette.action.hover,
                  '&:hover': { backgroundColor: theme.palette.action.selected },
                }}
              >
                <ArrowBack />
              </IconButton>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={employee.avatar}
                  alt={employee.name}
                  sx={{ width: 56, height: 56 }}
                >
                  {employee.name.charAt(0)}
                </Avatar>
                
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {employee.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    {employee.specialization && (
                      <Typography variant="body2" color="text.secondary">
                        {employee.specialization}
                      </Typography>
                    )}
                    <Chip
                      label={employee.access.status === 'active' ? 
                        AccessLevelDescriptions[employee.access.level] : 
                        employee.access.status === 'invited' ? 'مدعو' : 'دعوة'
                      }
                      size="small"
                      color={employee.access.status === 'active' ? 'primary' : 'default'}
                      variant={employee.access.status === 'active' ? 'filled' : 'outlined'}
                    />
                  </Box>
                </Box>
              </Box>
            </Box>
            
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => navigate(`/settings/staff/edit/${employee.id}`)}
            >
              تعديل الملف الشخصي
            </Button>
          </Box>

          {/* Breadcrumb */}
          <Typography variant="body2" color="text.secondary">
            الإعدادات &gt; الموظفون &gt; {employee.name}
          </Typography>
        </Box>

        {/* Tabs */}
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              backgroundColor: theme.palette.background.default,
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
                sx={{
                  minHeight: 64,
                  textTransform: 'none',
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.background.paper,
                  },
                }}
              />
            ))}
          </Tabs>

          <Box sx={{ p: 3 }}>
            <TabPanel value={tabValue} index={0}>
              <InformationTab
                employee={employee}
                companyId={companyId}
                onUpdate={handleEmployeeUpdate}
              />
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              <ServicesTab
                employee={employee}
                companyId={companyId}
                onUpdate={handleEmployeeUpdate}
              />
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              <OnlineBookingTab
                employee={employee}
                companyId={companyId}
                onUpdate={handleEmployeeUpdate}
              />
            </TabPanel>
            
            <TabPanel value={tabValue} index={3}>
              <AdditionalInfoTab
                employee={employee}
                companyId={companyId}
                onUpdate={handleEmployeeUpdate}
              />
            </TabPanel>
            
            <TabPanel value={tabValue} index={4}>
              <SettingsTab
                employee={employee}
                companyId={companyId}
                onUpdate={handleEmployeeUpdate}
              />
            </TabPanel>
            
            <TabPanel value={tabValue} index={5}>
              <ScheduleTab
                employee={employee}
                companyId={companyId}
                onUpdate={handleEmployeeUpdate}
              />
            </TabPanel>
          </Box>
        </Paper>
      </Box>
    </motion.div>
  );
};

export default EmployeeDetailPage;