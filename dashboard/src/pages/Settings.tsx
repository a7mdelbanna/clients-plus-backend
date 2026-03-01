import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Divider,
  IconButton,
  Chip,
  Alert,
  Tabs,
  Tab,
  useTheme,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Business,
  Palette,
  Language,
  Notifications,
  Security,
  Save,
  Edit,
  Check,
  Close,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { setupService } from '../services/setup.service';
import { businessThemes } from '../themes';
import { companyService } from '../services/company.service';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { isDarkMode, toggleTheme, setCompanyTheme, currentTheme } = useThemeMode();
  const [tabValue, setTabValue] = useState(0);
  const [editingCompany, setEditingCompany] = useState(false);
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState<any>(null);
  const isRTL = theme.direction === 'rtl';

  const { control, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      businessName: '',
      businessType: '',
      ownerPosition: '',
      employeeCount: 1,
      themeId: 'purple',
      language: 'ar',
      notifications: {
        email: true,
        push: false,
        sms: false,
      },
      security: {
        twoFactor: false,
        sessionTimeout: 30,
      },
    },
  });

  useEffect(() => {
    fetchCompanyData();
  }, [currentUser]);

  const fetchCompanyData = async () => {
    if (!currentUser) {
      console.log('[Settings] No current user, skipping fetch');
      return;
    }
    
    try {
      console.log('[Settings] Fetching company data for user:', currentUser?.id);

      const companyId = currentUser?.companyId;

      if (!companyId) {
        console.error('[Settings] No companyId found on currentUser');
      } else {
        console.log('[Settings] Using companyId from currentUser:', companyId);
        const data = await setupService.getCompanyData(companyId);
        console.log('[Settings] Company data fetched:', data);

        if (data) {
          setCompanyData(data);
          reset({
            businessName: data.name || '',
            businessType: data.businessType || '',
            ownerPosition: data.ownerPosition || '',
            employeeCount: data.employeeCount || 1,
            themeId: data.theme?.id || 'purple',
            language: 'ar',
            notifications: {
              email: true,
              push: false,
              sms: false,
            },
            security: {
              twoFactor: false,
              sessionTimeout: 30,
            },
          });
        } else {
          console.warn('[Settings] No company data returned for ID:', companyId);
        }
      }
    } catch (error) {
      console.error('[Settings] Error fetching company data:', error);
    }
  };

  const onSubmitCompany = async (data: any) => {
    setLoading(true);
    try {
      const companyId = currentUser?.companyId;

      // Update company data
      await setupService.completeSetup(companyId, {
        businessName: data.businessName,
        businessType: data.businessType,
        ownerPosition: data.ownerPosition,
        employeeCount: data.employeeCount,
        themeId: data.themeId,
        branches: companyData.branches || [],
        mainServices: companyData.mainServices || [],
        setupCompleted: true,
      });

      // Update theme
      setCompanyTheme(data.themeId);
      
      toast.success(isRTL ? 'تم حفظ التغييرات بنجاح' : 'Changes saved successfully');
      setEditingCompany(false);
      fetchCompanyData();
    } catch (error) {
      toast.error(isRTL ? 'فشل حفظ التغييرات' : 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {isRTL ? 'الإعدادات' : 'Settings'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {isRTL ? 'إدارة إعدادات الشركة والحساب' : 'Manage company and account settings'}
        </Typography>
      </Box>

      <Box sx={{ px: 3, py: 2 }}>
        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            aria-label="settings tabs"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab
              icon={<Business />}
              label={isRTL ? 'معلومات الشركة' : 'Company Info'}
              iconPosition="start"
            />
            <Tab
              icon={<Palette />}
              label={isRTL ? 'المظهر' : 'Appearance'}
              iconPosition="start"
            />
            <Tab
              icon={<Language />}
              label={isRTL ? 'اللغة والمنطقة' : 'Language & Region'}
              iconPosition="start"
            />
            <Tab
              icon={<Notifications />}
              label={isRTL ? 'الإشعارات' : 'Notifications'}
              iconPosition="start"
            />
            <Tab
              icon={<Security />}
              label={isRTL ? 'الأمان' : 'Security'}
              iconPosition="start"
            />
          </Tabs>

          {/* Company Info Tab */}
          <TabPanel value={tabValue} index={0}>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6">
                  {isRTL ? 'معلومات الشركة' : 'Company Information'}
                </Typography>
                <Button
                  startIcon={editingCompany ? <Close /> : <Edit />}
                  onClick={() => setEditingCompany(!editingCompany)}
                  variant={editingCompany ? 'outlined' : 'contained'}
                >
                  {editingCompany
                    ? (isRTL ? 'إلغاء' : 'Cancel')
                    : (isRTL ? 'تعديل' : 'Edit')}
                </Button>
              </Box>

              <form onSubmit={handleSubmit(onSubmitCompany)}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="businessName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={isRTL ? 'اسم الشركة' : 'Company Name'}
                          disabled={!editingCompany}
                          variant="outlined"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="businessType"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth disabled={!editingCompany}>
                          <InputLabel>{isRTL ? 'نوع النشاط' : 'Business Type'}</InputLabel>
                          <Select {...field} label={isRTL ? 'نوع النشاط' : 'Business Type'}>
                            <MenuItem value="restaurant">{isRTL ? 'مطعم' : 'Restaurant'}</MenuItem>
                            <MenuItem value="retail">{isRTL ? 'تجزئة' : 'Retail'}</MenuItem>
                            <MenuItem value="services">{isRTL ? 'خدمات' : 'Services'}</MenuItem>
                            <MenuItem value="technology">{isRTL ? 'تقنية' : 'Technology'}</MenuItem>
                            <MenuItem value="healthcare">{isRTL ? 'صحة' : 'Healthcare'}</MenuItem>
                            <MenuItem value="education">{isRTL ? 'تعليم' : 'Education'}</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="ownerPosition"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={isRTL ? 'منصبك' : 'Your Position'}
                          disabled={!editingCompany}
                          variant="outlined"
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="employeeCount"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type="number"
                          label={isRTL ? 'عدد الموظفين' : 'Employee Count'}
                          disabled={!editingCompany}
                          variant="outlined"
                        />
                      )}
                    />
                  </Grid>
                  {editingCompany && (
                    <Grid item xs={12}>
                      <Button
                        type="submit"
                        variant="contained"
                        startIcon={<Save />}
                        disabled={loading}
                        sx={{ mt: 2 }}
                      >
                        {isRTL ? 'حفظ التغييرات' : 'Save Changes'}
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </form>
            </motion.div>
          </TabPanel>

          {/* Appearance Tab */}
          <TabPanel value={tabValue} index={1}>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <Typography variant="h6" sx={{ mb: 3 }}>
                {isRTL ? 'إعدادات المظهر' : 'Appearance Settings'}
              </Typography>

              <Box sx={{ mb: 4 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isDarkMode}
                      onChange={toggleTheme}
                    />
                  }
                  label={isRTL ? 'الوضع الليلي' : 'Dark Mode'}
                />
              </Box>

              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                {isRTL ? 'اختر لون النظام' : 'Choose System Theme'}
              </Typography>
              
              <Grid container spacing={2}>
                {businessThemes.map((themeOption) => (
                  <Grid item xs={6} sm={4} md={3} key={themeOption.id}>
                    <motion.div variants={itemVariants}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          border: currentTheme.id === themeOption.id ? 2 : 1,
                          borderColor: currentTheme.id === themeOption.id
                            ? themeOption.primary
                            : 'divider',
                          position: 'relative',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: 4,
                          },
                          transition: 'all 0.3s ease',
                        }}
                        onClick={async () => {
                          try {
                            setLoading(true);
                            
                            let companyId = currentUser?.companyId;
                            
                            if (!companyId) {
                              throw new Error('Company ID not found');
                            }
                            
                            // Find the selected theme
                            const selectedTheme = businessThemes.find(t => t.id === themeOption.id);
                            if (!selectedTheme) {
                              throw new Error('Theme not found');
                            }
                            
                            console.log('[Settings] Updating theme for company:', companyId);
                            
                            // Update via API
                            await companyService.updateCompanyProfile(companyId, {
                              theme: {
                                id: selectedTheme.id,
                                primary: selectedTheme.primary,
                                secondary: selectedTheme.secondary
                              },
                            });
                            
                            // Update in context
                            setCompanyTheme(themeOption.id);
                            toast.success(isRTL ? 'تم تغيير اللون' : 'Theme changed');
                          } catch (error: any) {
                            console.error('Error updating theme:', error);
                            if (error.code === 'permission-denied') {
                              toast.error(isRTL ? 'ليس لديك صلاحية لتغيير اللون' : 'You don\'t have permission to change theme');
                            } else {
                              toast.error(isRTL ? 'فشل تغيير اللون' : 'Failed to change theme');
                            }
                          } finally {
                            setLoading(false);
                          }
                        }}
                      >
                        <CardContent>
                          <Box
                            sx={{
                              width: '100%',
                              height: 60,
                              background: `linear-gradient(135deg, ${themeOption.primary} 0%, ${themeOption.secondary} 100%)`,
                              borderRadius: 1,
                              mb: 2,
                            }}
                          />
                          <Typography variant="body2" align="center">
                            {isRTL ? themeOption.nameAr : themeOption.name}
                          </Typography>
                          {currentTheme.id === themeOption.id && (
                            <Chip
                              icon={<Check />}
                              label={isRTL ? 'نشط' : 'Active'}
                              size="small"
                              color="primary"
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                              }}
                            />
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          </TabPanel>

          {/* Language Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              {isRTL ? 'إعدادات اللغة والمنطقة' : 'Language & Region Settings'}
            </Typography>
            <Alert severity="info">
              {isRTL 
                ? 'تغيير اللغة سيؤثر على جميع المستخدمين في الشركة'
                : 'Changing language will affect all users in the company'}
            </Alert>
          </TabPanel>

          {/* Notifications Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              {isRTL ? 'إعدادات الإشعارات' : 'Notification Settings'}
            </Typography>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label={isRTL ? 'إشعارات البريد الإلكتروني' : 'Email Notifications'}
            />
            <FormControlLabel
              control={<Switch />}
              label={isRTL ? 'إشعارات الهاتف' : 'Push Notifications'}
            />
            <FormControlLabel
              control={<Switch />}
              label={isRTL ? 'رسائل نصية' : 'SMS Notifications'}
            />
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={tabValue} index={4}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              {isRTL ? 'إعدادات الأمان' : 'Security Settings'}
            </Typography>
            <FormControlLabel
              control={<Switch />}
              label={isRTL ? 'المصادقة الثنائية' : 'Two-Factor Authentication'}
            />
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {isRTL ? 'مهلة الجلسة (دقائق)' : 'Session Timeout (minutes)'}
              </Typography>
              <TextField
                type="number"
                defaultValue={30}
                sx={{ width: 200 }}
              />
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Box>
  );
};

export default Settings;