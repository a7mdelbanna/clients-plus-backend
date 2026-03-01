import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  Info,
  Star,
  Business,
  ContactPhone,
  Schedule,
  Map,
  PhotoLibrary,
  BugReport,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { locationService, type LocationSettings } from '../../../services/location.service';
import { companyService } from '../../../services/company.service';
import BasicSettingsTab from './tabs/BasicSettingsTab';
import ContactDetailsTab from './tabs/ContactDetailsTab';
import BusinessHoursTab from './tabs/BusinessHoursTab';
import MapTab from './tabs/MapTab';
import PhotosTab from './tabs/PhotosTab';

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
      id={`location-tabpanel-${index}`}
      aria-labelledby={`location-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const LocationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [locationSettings, setLocationSettings] = useState<LocationSettings | null>(null);
  const [companyId, setCompanyId] = useState<string>('');

  useEffect(() => {
    if (!currentUser) return;
    
    let unsubscribe: (() => void) | null = null;
    
    const loadData = async () => {
      try {
        setLoading(true);
        let cId = currentUser?.companyId;

        if (!cId) {
          toast.error('لم يتم العثور على معرف الشركة');
          setLoading(false);
          return;
        }

        setCompanyId(cId);

        // Get company information
        const companyInfo = await companyService.getCompanyInfo(cId);

        // Subscribe to location settings for current branch
        const branchId = currentBranch?.id || undefined;
        console.log('Current branch:', currentBranch);
        console.log('Using branch ID for location settings:', branchId);
        unsubscribe = locationService.subscribeToLocationSettings(
          cId,
          (settings) => {
            // Use saved business name if exists, otherwise use company name as default
            const businessName = settings?.basic?.businessName || companyInfo?.name || '';
            
            // Map category from company info only if no category is saved
            const mappedCategory = settings?.basic?.category || 
              (companyInfo?.businessType 
                ? locationService.mapBusinessTypeToCategory(companyInfo.businessType)
                : '');
            
            const updatedSettings: LocationSettings = {
              ...settings!,
              basic: {
                ...settings?.basic!,
                businessName: businessName,
                locationName: settings?.basic?.locationName || currentBranch?.name || 'الفرع الرئيسي',
                category: mappedCategory,
                city: settings?.basic?.city || '',
                notificationLanguage: settings?.basic?.notificationLanguage || 'ar',
                dateFormat: settings?.basic?.dateFormat || 'DD.MM.YYYY, HH:mm',
              }
            };
            setLocationSettings(updatedSettings);
            setLoading(false);
          },
          (error) => {
            console.error('Error loading location settings:', error);
            toast.error('حدث خطأ في تحميل إعدادات الموقع');
            setLoading(false);
          },
          branchId
        );
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('حدث خطأ في تحميل البيانات');
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, currentBranch]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleSave = async (data: any, section: string) => {
    if (!companyId || !locationSettings) return;

    try {
      setSaving(true);
      
      const branchId = currentBranch?.id || undefined;
      
      switch (section) {
        case 'basic':
          await locationService.updateBasicSettings(companyId, data, branchId);
          break;
        case 'contact':
          await locationService.updateContactDetails(companyId, data, branchId);
          break;
        case 'businessHours':
          await locationService.updateContactDetails(companyId, { businessHours: data }, branchId);
          break;
        case 'coordinates':
          // data contains both coordinates and address
          await locationService.updateContactDetails(companyId, { 
            coordinates: data.coordinates,
            address: data.address 
          }, branchId);
          break;
        case 'photos':
          await locationService.updatePhotos(companyId, data, branchId);
          break;
        default:
          break;
      }
      
      toast.success('تم حفظ التغييرات بنجاح');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('حدث خطأ في حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { label: 'الإعدادات الأساسية', icon: <Business />, index: 0 },
    { label: 'تفاصيل الاتصال', icon: <ContactPhone />, index: 1 },
    { label: 'ساعات العمل', icon: <Schedule />, index: 2 },
    { label: 'الخريطة', icon: <Map />, index: 3 },
    { label: 'الصور والمعرض', icon: <PhotoLibrary />, index: 4 },
    { label: 'Debug WhatsApp', icon: <BugReport />, index: 5 },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <IconButton
              onClick={() => navigate('/settings')}
              sx={{
                backgroundColor: theme.palette.action.hover,
                '&:hover': { backgroundColor: theme.palette.action.selected },
              }}
            >
              <ArrowBack />
            </IconButton>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  الإعدادات الأساسية
                </Typography>
                <Info sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
                <Star sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
              </Box>
              {currentBranch && (
                <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 0.5 }}>
                  {currentBranch.name} {currentBranch.isMain && '(الفرع الرئيسي)'}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Breadcrumb */}
          <Typography variant="body2" color="text.secondary">
            الإعدادات &gt; معلومات العمل &gt; الإعدادات الأساسية
          </Typography>
        </Box>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
              },
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.index}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tab.icon}
                    <Typography variant="body2">{tab.label}</Typography>
                  </Box>
                }
                id={`location-tab-${tab.index}`}
                aria-controls={`location-tabpanel-${tab.index}`}
              />
            ))}
          </Tabs>
        </Paper>

        {/* Tab Panels */}
        <TabPanel value={currentTab} index={0}>
          <BasicSettingsTab
            settings={locationSettings?.basic}
            companyId={companyId}
            onSave={(data) => handleSave(data, 'basic')}
            saving={saving}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <ContactDetailsTab
            settings={locationSettings?.contact}
            onSave={(data) => handleSave(data, 'contact')}
            saving={saving}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <BusinessHoursTab
            businessHours={locationSettings?.contact?.businessHours}
            onSave={(data) => handleSave(data, 'businessHours')}
            saving={saving}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <MapTab
            address={locationSettings?.contact?.address || ''}
            coordinates={locationSettings?.contact?.coordinates}
            onSave={(data) => handleSave(data, 'coordinates')}
            saving={saving}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <PhotosTab
            photos={locationSettings?.photos}
            companyId={companyId}
            onSave={(data) => handleSave(data, 'photos')}
            saving={saving}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={5}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              WhatsApp Debug Information
            </Typography>
            
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              This shows what data would be sent in WhatsApp messages:
            </Typography>
            
            <Box sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100', 
              p: 2, 
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              mb: 3,
              color: theme.palette.text.primary
            }}>
              <Typography variant="body2" component="pre" sx={{ 
                whiteSpace: 'pre-wrap',
                color: 'inherit',
                fontFamily: 'inherit'
              }}>
{`Business Name: ${locationSettings?.basic?.businessName || locationSettings?.basic?.locationName || 'Not set'}

Branch Name: ${currentBranch?.name || 'Not set'}

Address: ${currentBranch?.address || locationSettings?.contact?.address || 'Not set'}

Phone: ${(() => {
  if (currentBranch?.phone) return currentBranch.phone;
  if (locationSettings?.contact?.phones && locationSettings.contact.phones.length > 0) {
    const phone = locationSettings.contact.phones[0];
    return `${phone.countryCode || ''}${phone.number || ''}`.trim() || 'Not set';
  }
  return 'Not set';
})()}

Google Maps Link: ${(() => {
  if (locationSettings?.contact?.coordinates?.lat && locationSettings?.contact?.coordinates?.lng) {
    return `https://maps.google.com/?q=${locationSettings.contact.coordinates.lat},${locationSettings.contact.coordinates.lng}`;
  }
  return 'Not set (no coordinates)';
})()}

Coordinates: ${locationSettings?.contact?.coordinates ? 
  `Lat: ${locationSettings.contact.coordinates.lat}, Lng: ${locationSettings.contact.coordinates.lng}` : 
  'Not set'}`}
              </Typography>
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
              Raw Location Settings Data:
            </Typography>
            
            <Box sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100', 
              p: 2, 
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              maxHeight: 400,
              overflow: 'auto',
              color: theme.palette.text.primary
            }}>
              <Typography variant="body2" component="pre" sx={{ 
                color: 'inherit',
                fontFamily: 'inherit'
              }}>
                {JSON.stringify(locationSettings, null, 2)}
              </Typography>
            </Box>

            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, color: 'text.secondary' }}>
              Current Branch Data:
            </Typography>
            
            <Box sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.100', 
              p: 2, 
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              maxHeight: 200,
              overflow: 'auto',
              color: theme.palette.text.primary
            }}>
              <Typography variant="body2" component="pre" sx={{ 
                color: 'inherit',
                fontFamily: 'inherit'
              }}>
                {JSON.stringify(currentBranch, null, 2)}
              </Typography>
            </Box>
          </Paper>
        </TabPanel>
      </Box>
    </motion.div>
  );
};

export default LocationSettingsPage;