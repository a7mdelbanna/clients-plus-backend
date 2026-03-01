import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
  IconButton,
  Chip,
  useTheme,
  Card,
  CardContent,
  InputAdornment,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  ArrowBack,
  WhatsApp,
  Save,
  Settings,
  Message,
  Schedule,
  CheckCircle,
  Error,
  Info,
  Language,
  Send,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { whatsAppService, type WhatsAppConfig, type WhatsAppTemplate } from '../../../services/whatsapp.service';
import { appointmentReminderService, type ReminderConfig } from '../../../services/appointmentReminder.service';
import { toast } from 'react-toastify';

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
      id={`whatsapp-tabpanel-${index}`}
      aria-labelledby={`whatsapp-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const WhatsAppSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser } = useAuth();
  const isRTL = theme.direction === 'rtl';
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  
  // WhatsApp Configuration
  const [config, setConfig] = useState<WhatsAppConfig>({
    enabled: false,
    provider: 'whatsapp_cloud',
    defaultLanguage: 'ar',
  });
  
  // Reminder Configuration
  const [reminderConfig, setReminderConfig] = useState<ReminderConfig | null>(null);
  
  // Templates
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);

  useEffect(() => {
    loadConfigurations();
  }, [currentUser]);

  const loadConfigurations = async () => {
    if (!currentUser) return;

    const companyId = currentUser?.companyId;

    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      // Load WhatsApp config
      const whatsappConfig = await whatsAppService.getConfig(companyId);
      if (whatsappConfig) {
        setConfig(whatsappConfig);
      }

      // Load reminder config
      const remConfig = await appointmentReminderService.getReminderConfig(companyId);
      setReminderConfig(remConfig);

      // Load templates
      const arTemplates = whatsAppService.getTemplates('ar');
      const enTemplates = whatsAppService.getTemplates('en');
      setTemplates([...arTemplates, ...enTemplates]);
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast.error(isRTL ? 'فشل تحميل الإعدادات' : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    console.log('Saving WhatsApp config...', { currentUser, config });
    
    if (!currentUser) {
      console.error('No authenticated user');
      toast.error(isRTL ? 'يجب تسجيل الدخول' : 'Must be logged in');
      return;
    }

    const companyId = currentUser?.companyId;
    const userRole = currentUser?.role;
    console.log('Got companyId from currentUser:', companyId);
    console.log('User role:', userRole);

    if (!companyId) {
      console.error('No company ID found on currentUser');
      toast.error(isRTL ? 'لم يتم العثور على معرف الشركة' : 'No company ID found');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving to companyId:', companyId);
      await whatsAppService.saveConfig(companyId, config);
      
      if (reminderConfig) {
        await appointmentReminderService.saveReminderConfig({
          ...reminderConfig,
          companyId
        });
      }

      toast.success(isRTL ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error(isRTL ? 'فشل حفظ الإعدادات' : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSendTestMessage = async () => {
    if (!currentUser || !testPhone) return;

    const companyId = currentUser?.companyId;

    if (!companyId) {
      toast.error(isRTL ? 'لم يتم العثور على معرف الشركة' : 'No company ID found');
      return;
    }

    setTesting(true);
    try {
      // Send a test appointment confirmation
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 1); // Tomorrow
      
      await whatsAppService.sendAppointmentConfirmation(companyId, {
        appointmentId: 'test-' + Date.now(),
        clientId: 'test-client',
        clientName: isRTL ? 'عميل تجريبي' : 'Test Client',
        clientPhone: testPhone,
        date: testDate,
        time: '10:00 AM',
        service: isRTL ? 'خدمة تجريبية' : 'Test Service',
        staffName: isRTL ? 'موظف تجريبي' : 'Test Staff',
        businessName: isRTL ? 'صالون التجربة' : 'Test Salon',
        businessAddress: isRTL ? 'عنوان تجريبي' : 'Test Address',
        businessPhone: '+201234567890',
        language: config.defaultLanguage
      });

      toast.success(isRTL ? 'تم إرسال الرسالة التجريبية بنجاح' : 'Test message sent successfully');
    } catch (error: any) {
      console.error('Error sending test message:', error);
      toast.error(
        isRTL 
          ? `فشل إرسال الرسالة: ${error.message}` 
          : `Failed to send message: ${error.message}`
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/settings')} sx={{ mr: 1 }}>
          <ArrowBack sx={{ transform: isRTL ? 'rotate(180deg)' : 'none' }} />
        </IconButton>
        <WhatsApp sx={{ mr: 2, color: theme.palette.success.main, fontSize: 32 }} />
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {isRTL ? 'إعدادات واتساب' : 'WhatsApp Settings'}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Save />}
          onClick={handleSaveConfig}
          disabled={saving}
        >
          {isRTL ? 'حفظ الإعدادات' : 'Save Settings'}
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            icon={<Settings />} 
            label={isRTL ? 'الإعدادات العامة' : 'General Settings'} 
            iconPosition="start"
          />
          <Tab 
            icon={<Schedule />} 
            label={isRTL ? 'إعدادات التذكير' : 'Reminder Settings'} 
            iconPosition="start"
          />
          <Tab 
            icon={<Message />} 
            label={isRTL ? 'قوالب الرسائل' : 'Message Templates'} 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {/* General Settings */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {isRTL ? 'الإعدادات العامة' : 'General Settings'}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <FormControlLabel
            control={
              <Switch
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                color="primary"
              />
            }
            label={isRTL ? 'تفعيل إشعارات واتساب' : 'Enable WhatsApp Notifications'}
            sx={{ mb: 3 }}
          />

          {config.enabled && (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                {isRTL 
                  ? 'لاستخدام واتساب، تحتاج إلى حساب WhatsApp Business API. يمكنك الحصول عليه من خلال مزود خدمة معتمد مثل Twilio أو Meta.'
                  : 'To use WhatsApp, you need a WhatsApp Business API account. You can get one through an approved provider like Twilio or Meta.'}
              </Alert>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>{isRTL ? 'مزود الخدمة' : 'Service Provider'}</InputLabel>
                <Select
                  value={config.provider}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value as any })}
                  label={isRTL ? 'مزود الخدمة' : 'Service Provider'}
                >
                  <MenuItem value="twilio">Twilio</MenuItem>
                  <MenuItem value="whatsapp_cloud">WhatsApp Cloud API (Meta)</MenuItem>
                  <MenuItem value="custom">{isRTL ? 'مخصص' : 'Custom'}</MenuItem>
                </Select>
              </FormControl>

              {config.provider === 'twilio' && (
                <>
                  <TextField
                    fullWidth
                    label={isRTL ? 'معرف الحساب (Account SID)' : 'Account SID'}
                    value={config.accountSid || ''}
                    onChange={(e) => setConfig({ ...config, accountSid: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label={isRTL ? 'رمز المصادقة (Auth Token)' : 'Auth Token'}
                    type="password"
                    value={config.authToken || ''}
                    onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label={isRTL ? 'رقم واتساب (مع رمز الدولة)' : 'WhatsApp Number (with country code)'}
                    value={config.twilioWhatsAppNumber || ''}
                    onChange={(e) => setConfig({ ...config, twilioWhatsAppNumber: e.target.value })}
                    placeholder="+14155238886"
                    helperText={isRTL ? 'رقم واتساب الخاص بـ Twilio' : 'Your Twilio WhatsApp number'}
                    sx={{ mb: 2 }}
                    inputProps={{
                      dir: 'ltr', // Force LTR for phone numbers
                      style: { textAlign: isRTL ? 'right' : 'left' }
                    }}
                  />
                </>
              )}

              {config.provider === 'whatsapp_cloud' && (
                <>
                  <TextField
                    fullWidth
                    label={isRTL ? 'معرف رقم الهاتف' : 'Phone Number ID'}
                    value={config.phoneNumberId || ''}
                    onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label={isRTL ? 'رمز الوصول' : 'Access Token'}
                    type="password"
                    value={config.accessToken || ''}
                    onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                </>
              )}

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>{isRTL ? 'اللغة الافتراضية' : 'Default Language'}</InputLabel>
                <Select
                  value={config.defaultLanguage}
                  onChange={(e) => setConfig({ ...config, defaultLanguage: e.target.value as 'ar' | 'en' })}
                  label={isRTL ? 'اللغة الافتراضية' : 'Default Language'}
                >
                  <MenuItem value="ar">{isRTL ? 'العربية' : 'Arabic'}</MenuItem>
                  <MenuItem value="en">{isRTL ? 'الإنجليزية' : 'English'}</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label={isRTL ? 'رابط Webhook (اختياري)' : 'Webhook URL (Optional)'}
                value={config.webhookUrl || ''}
                onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                helperText={isRTL 
                  ? 'لاستقبال تحديثات حالة الرسائل'
                  : 'To receive message status updates'}
                sx={{ mb: 3 }}
              />

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                {isRTL ? 'اختبار الإرسال' : 'Test Sending'}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                <TextField
                  label={isRTL ? 'رقم الهاتف للاختبار' : 'Test Phone Number'}
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+201234567890"
                  helperText={isRTL ? 'أدخل رقم الهاتف مع رمز الدولة' : 'Enter phone number with country code'}
                  sx={{ flex: 1 }}
                  inputProps={{
                    dir: 'ltr', // Force LTR for phone numbers
                    style: { textAlign: isRTL ? 'right' : 'left' }
                  }}
                />
                <Button
                  variant="outlined"
                  startIcon={<Send />}
                  onClick={handleSendTestMessage}
                  disabled={!testPhone || testing || !config.enabled}
                >
                  {testing 
                    ? (isRTL ? 'جاري الإرسال...' : 'Sending...')
                    : (isRTL ? 'إرسال رسالة تجريبية' : 'Send Test Message')
                  }
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Reminder Settings */}
        {reminderConfig && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {isRTL ? 'إعدادات التذكير' : 'Reminder Settings'}
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <FormControlLabel
              control={
                <Switch
                  checked={reminderConfig.enabled}
                  onChange={(e) => setReminderConfig({ ...reminderConfig, enabled: e.target.checked })}
                  color="primary"
                />
              }
              label={isRTL ? 'تفعيل التذكيرات التلقائية' : 'Enable Automatic Reminders'}
              sx={{ mb: 3 }}
            />

            {reminderConfig.enabled && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  {isRTL ? 'قنوات الإرسال' : 'Send Channels'}
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={reminderConfig.channels.whatsapp}
                        onChange={(e) => setReminderConfig({
                          ...reminderConfig,
                          channels: { ...reminderConfig.channels, whatsapp: e.target.checked }
                        })}
                      />
                    }
                    label="WhatsApp"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={reminderConfig.channels.sms}
                        onChange={(e) => setReminderConfig({
                          ...reminderConfig,
                          channels: { ...reminderConfig.channels, sms: e.target.checked }
                        })}
                      />
                    }
                    label="SMS"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={reminderConfig.channels.email}
                        onChange={(e) => setReminderConfig({
                          ...reminderConfig,
                          channels: { ...reminderConfig.channels, email: e.target.checked }
                        })}
                      />
                    }
                    label={isRTL ? 'بريد إلكتروني' : 'Email'}
                  />
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  {isRTL ? 'توقيت التذكير' : 'Reminder Timing'}
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={reminderConfig.timing.dayBefore}
                        onChange={(e) => setReminderConfig({
                          ...reminderConfig,
                          timing: { ...reminderConfig.timing, dayBefore: e.target.checked }
                        })}
                      />
                    }
                    label={isRTL ? 'يوم واحد قبل الموعد' : '1 day before appointment'}
                  />
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {isRTL ? 'ساعات قبل الموعد' : 'Hours before appointment'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {[2, 4, 6, 12, 24].map(hours => (
                        <Chip
                          key={hours}
                          label={`${hours} ${isRTL ? 'ساعات' : 'hours'}`}
                          color={reminderConfig.timing.hoursBefore.includes(hours) ? 'primary' : 'default'}
                          onClick={() => {
                            const hoursBefore = reminderConfig.timing.hoursBefore.includes(hours)
                              ? reminderConfig.timing.hoursBefore.filter(h => h !== hours)
                              : [...reminderConfig.timing.hoursBefore, hours];
                            setReminderConfig({
                              ...reminderConfig,
                              timing: { ...reminderConfig.timing, hoursBefore }
                            });
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>

                <Typography variant="subtitle2" gutterBottom>
                  {isRTL ? 'استثناءات' : 'Exceptions'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {isRTL 
                    ? 'لن يتم إرسال تذكيرات للمواعيد بهذه الحالات:'
                    : 'Don\'t send reminders for appointments with these statuses:'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {['cancelled', 'completed', 'no_show'].map(status => (
                    <Chip
                      key={status}
                      label={status}
                      color={reminderConfig.excludeStatuses.includes(status) ? 'error' : 'default'}
                      onClick={() => {
                        const excludeStatuses = reminderConfig.excludeStatuses.includes(status)
                          ? reminderConfig.excludeStatuses.filter(s => s !== status)
                          : [...reminderConfig.excludeStatuses, status];
                        setReminderConfig({
                          ...reminderConfig,
                          excludeStatuses
                        });
                      }}
                    />
                  ))}
                </Box>
              </>
            )}
          </Paper>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Message Templates */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            {isRTL ? 'قوالب الرسائل' : 'Message Templates'}
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Alert severity="info" sx={{ mb: 3 }}>
            {isRTL 
              ? 'هذه قوالب افتراضية للرسائل. يمكنك تخصيصها من خلال WhatsApp Business Manager.'
              : 'These are default message templates. You can customize them through WhatsApp Business Manager.'}
          </Alert>

          <List>
            {templates.map((template) => (
              <ListItem key={template.id} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle1">{template.header}</Typography>
                  <Chip 
                    size="small" 
                    label={template.language === 'ar' ? 'العربية' : 'English'}
                    icon={<Language />}
                  />
                  <Chip 
                    size="small" 
                    label={template.type}
                    color="primary"
                  />
                  {template.approved && (
                    <Chip 
                      size="small" 
                      label={isRTL ? 'موافق عليه' : 'Approved'}
                      icon={<CheckCircle />}
                      color="success"
                    />
                  )}
                </Box>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>
                  {template.body}
                </Typography>
                {template.footer && (
                  <Typography variant="caption" color="text.secondary">
                    {template.footer}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                  {template.variables.map(variable => (
                    <Chip key={variable} label={`{{${variable}}}`} size="small" variant="outlined" />
                  ))}
                </Box>
              </ListItem>
            ))}
          </List>
        </Paper>
      </TabPanel>
    </Box>
  );
};

export default WhatsAppSettingsPage;