import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
  Grid,
  Chip,
  Stack,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Info,
  Language,
  Close,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { positionService, type Position } from '../../../services/position.service';

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
      id={`position-tabpanel-${index}`}
      aria-labelledby={`position-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const schema = yup.object({
  name: yup.string().required('اسم المنصب مطلوب'),
  description: yup.string(),
});

type FormData = yup.InferType<typeof schema>;

// Available languages for translation
const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
];

const PositionFormPage: React.FC = () => {
  const { positionId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [loadingPosition, setLoadingPosition] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [companyId, setCompanyId] = useState<string>('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Record<string, { name: string; description?: string }>>({});

  const isEditMode = !!positionId;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!currentUser) return;
    
    loadCompanyId();
  }, [currentUser]);

  useEffect(() => {
    if (isEditMode && companyId) {
      loadPosition();
    }
  }, [isEditMode, positionId, companyId]);

  const loadCompanyId = async () => {
    try {
      let cId = currentUser?.companyId;

      if (!cId) {
        toast.error('لم يتم العثور على معرف الشركة');
        navigate('/settings/positions');
        return;
      }

      setCompanyId(cId);
    } catch (error) {
      console.error('Error loading company ID:', error);
      toast.error('حدث خطأ في تحميل بيانات الشركة');
    }
  };

  const loadPosition = async () => {
    if (!positionId) return;
    
    try {
      setLoadingPosition(true);
      const fetchedPosition = await positionService.getPosition(positionId);
      
      if (!fetchedPosition) {
        toast.error('المنصب غير موجود');
        navigate('/settings/positions');
        return;
      }

      setPosition(fetchedPosition);
      
      // Reset form with position data
      reset({
        name: fetchedPosition.name,
        description: fetchedPosition.description || '',
      });

      // Load translations
      if (fetchedPosition.translations) {
        const langs = Object.keys(fetchedPosition.translations);
        setSelectedLanguages(langs);
        setTranslations(fetchedPosition.translations);
      }
    } catch (error) {
      console.error('Error loading position:', error);
      toast.error('حدث خطأ في تحميل بيانات المنصب');
    } finally {
      setLoadingPosition(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!currentUser || !companyId) return;

    try {
      setLoading(true);

      // Check if position name already exists
      const nameExists = await positionService.checkPositionNameExists(
        companyId,
        data.name,
        positionId
      );

      if (nameExists) {
        toast.error('يوجد منصب بنفس الاسم بالفعل');
        return;
      }

      // Build translations object
      const positionTranslations: Position['translations'] = {};
      selectedLanguages.forEach(lang => {
        if (translations[lang] && translations[lang].name) {
          const translationData: any = {
            name: translations[lang].name,
          };
          
          // Only add description if it has a value
          if (translations[lang].description && translations[lang].description.trim()) {
            translationData.description = translations[lang].description;
          }
          
          positionTranslations[lang] = translationData;
        }
      });

      const positionData: any = {
        companyId,
        name: data.name,
        active: true,
        createdBy: currentUser?.id,
      };

      // Only add description if it has a value
      if (data.description && data.description.trim()) {
        positionData.description = data.description;
      }

      // Only add translations if there are any
      if (Object.keys(positionTranslations).length > 0) {
        positionData.translations = positionTranslations;
      }

      if (isEditMode && positionId) {
        await positionService.updatePosition(positionId, positionData);
        toast.success('تم تحديث المنصب بنجاح');
      } else {
        await positionService.createPosition(positionData, currentUser?.id);
        toast.success('تم إنشاء المنصب بنجاح');
      }

      navigate('/settings/positions');
    } catch (error) {
      console.error('Error saving position:', error);
      toast.error(isEditMode ? 'فشل تحديث المنصب' : 'فشل إنشاء المنصب');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLanguageToggle = (langCode: string) => {
    setSelectedLanguages(prev => {
      const newLangs = prev.includes(langCode)
        ? prev.filter(l => l !== langCode)
        : [...prev, langCode];
      
      // Clean up translations if language is removed
      if (!newLangs.includes(langCode)) {
        setTranslations(prev => {
          const newTranslations = { ...prev };
          delete newTranslations[langCode];
          return newTranslations;
        });
      }
      
      return newLangs;
    });
  };

  const handleTranslationChange = (langCode: string, field: 'name' | 'description', value: string) => {
    setTranslations(prev => ({
      ...prev,
      [langCode]: {
        ...prev[langCode],
        [field]: value,
      },
    }));
  };

  if (loadingPosition) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
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
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton
            onClick={() => navigate('/settings/positions')}
            sx={{
              backgroundColor: theme.palette.action.hover,
              '&:hover': { backgroundColor: theme.palette.action.selected },
            }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {isEditMode ? 'تعديل المنصب' : 'إضافة منصب جديد'}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab icon={<Info />} label="المعلومات الأساسية" />
                <Tab icon={<Language />} label="الترجمة" />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {/* Basic Information Tab */}
              <TabPanel value={tabValue} index={0}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 3, 
                  alignItems: 'flex-start',
                  flexDirection: { xs: 'column', md: 'row' },
                  width: '100%'
                }}>
                  <Controller
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="اسم المنصب"
                        error={!!errors.name}
                        helperText={errors.name?.message}
                        required
                        sx={{ 
                          width: { xs: '100%', md: 'auto' },
                          minWidth: { md: 200 }, 
                          maxWidth: { md: 250 } 
                        }}
                      />
                    )}
                  />

                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="وصف المنصب"
                        placeholder="اكتب وصفًا مختصرًا للمنصب والمسؤوليات الرئيسية..."
                        error={!!errors.description}
                        helperText={errors.description?.message}
                        sx={{ flexGrow: 1 }}
                      />
                    )}
                  />
                </Box>
              </TabPanel>

              {/* Translation Tab */}
              <TabPanel value={tabValue} index={1}>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                      اختر اللغات المطلوبة للترجمة
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      <Chip
                        label="العربية (الأساسية)"
                        color="primary"
                        disabled
                      />
                      {availableLanguages.map((lang) => (
                        <Chip
                          key={lang.code}
                          label={`${lang.nativeName} (${lang.name})`}
                          clickable
                          color={selectedLanguages.includes(lang.code) ? 'primary' : 'default'}
                          onClick={() => handleLanguageToggle(lang.code)}
                          onDelete={selectedLanguages.includes(lang.code) ? () => handleLanguageToggle(lang.code) : undefined}
                          deleteIcon={<Close />}
                        />
                      ))}
                    </Box>
                  </Box>

                  {selectedLanguages.length > 0 && (
                    <>
                      <Alert severity="info">
                        يرجى إدخال ترجمة اسم المنصب للغات المحددة. الوصف اختياري.
                      </Alert>
                      
                      {selectedLanguages.map((langCode) => {
                        const lang = availableLanguages.find(l => l.code === langCode);
                        if (!lang) return null;
                        
                        return (
                          <Box key={langCode} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500 }}>
                              {lang.nativeName} ({lang.name})
                            </Typography>
                            <Box sx={{ 
                              display: 'flex', 
                              gap: 3, 
                              alignItems: 'flex-start',
                              flexDirection: { xs: 'column', md: 'row' },
                              width: '100%'
                            }}>
                              <TextField
                                label={`اسم المنصب بـ ${lang.nativeName}`}
                                value={translations[langCode]?.name || ''}
                                onChange={(e) => handleTranslationChange(langCode, 'name', e.target.value)}
                                required
                                sx={{ 
                                  width: { xs: '100%', md: 'auto' },
                                  minWidth: { md: 200 }, 
                                  maxWidth: { md: 250 } 
                                }}
                              />
                              <TextField
                                fullWidth
                                label={`وصف المنصب بـ ${lang.nativeName} (اختياري)`}
                                value={translations[langCode]?.description || ''}
                                onChange={(e) => handleTranslationChange(langCode, 'description', e.target.value)}
                                sx={{ flexGrow: 1 }}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                    </>
                  )}
                </Stack>
              </TabPanel>
            </Box>

            {/* Actions */}
            <Box sx={{ p: 3, pt: 0, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/settings/positions')}
                disabled={loading}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={loading}
                sx={{
                  minWidth: 120,
                  background: loading ? undefined : `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                }}
              >
                {loading ? <CircularProgress size={24} /> : (isEditMode ? 'حفظ التغييرات' : 'إنشاء المنصب')}
              </Button>
            </Box>
          </Paper>
        </form>
      </Box>
    </motion.div>
  );
};

export default PositionFormPage;