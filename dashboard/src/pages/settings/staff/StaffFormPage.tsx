import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
  Grid,
  Chip,
  Stack,
  Alert,
  Avatar,
  FormHelperText,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Person,
  Work,
  Language,
  PhotoCamera,
  Close,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { staffService, type Staff } from '../../../services/staff.service';
import { positionService, type Position } from '../../../services/position.service';
import { storageService } from '../../../services/storage.service';

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
      id={`staff-tabpanel-${index}`}
      aria-labelledby={`staff-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const phoneRegex = /^(\+20|0)?1[0125]\d{8}$/;

const schema = yup.object({
  name: yup.string().required('اسم الموظف مطلوب'),
  email: yup.string().email('البريد الإلكتروني غير صالح').required('البريد الإلكتروني مطلوب'),
  phone: yup.string()
    .matches(phoneRegex, 'رقم الهاتف غير صالح')
    .required('رقم الهاتف مطلوب'),
  positionId: yup.string(),
  employeeId: yup.string(),
  bio: yup.string(),
  status: yup.string().oneOf(['active', 'inactive', 'vacation', 'terminated']).required(),
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

const StaffFormPage: React.FC = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [staff, setStaff] = useState<Staff | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [companyId, setCompanyId] = useState<string>('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Record<string, { bio: string }>>({});
  const [photoUrl, setPhotoUrl] = useState<string>('');

  const isEditMode = !!staffId;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      positionId: '',
      employeeId: '',
      bio: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (!currentUser) return;
    
    loadInitialData();
  }, [currentUser]);

  useEffect(() => {
    if (isEditMode && companyId) {
      loadStaff();
    }
  }, [isEditMode, staffId, companyId]);

  const loadInitialData = async () => {
    try {
      let cId = currentUser?.companyId;

      if (!cId) {
        toast.error('لم يتم العثور على معرف الشركة');
        navigate('/settings/staff');
        return;
      }

      setCompanyId(cId);
      
      // Load positions
      const fetchedPositions = await positionService.getPositions(cId);
      setPositions(fetchedPositions);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    }
  };

  const loadStaff = async () => {
    if (!staffId) return;
    
    try {
      setLoadingStaff(true);
      const fetchedStaff = await staffService.getStaffMember(staffId);
      
      if (!fetchedStaff) {
        toast.error('الموظف غير موجود');
        navigate('/settings/staff');
        return;
      }

      setStaff(fetchedStaff);
      setPhotoUrl(fetchedStaff.photoUrl || '');
      
      // Reset form with staff data
      reset({
        name: fetchedStaff.name,
        email: fetchedStaff.email,
        phone: fetchedStaff.phone,
        positionId: fetchedStaff.positionId || '',
        employeeId: fetchedStaff.employeeId || '',
        bio: fetchedStaff.bio || '',
        status: fetchedStaff.status,
      });

      // Load translations
      if (fetchedStaff.translations) {
        const langs = Object.keys(fetchedStaff.translations);
        setSelectedLanguages(langs);
        setTranslations(fetchedStaff.translations);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      toast.error('حدث خطأ في تحميل بيانات الموظف');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار ملف صورة صالح');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `staff/${companyId}/${timestamp}_${file.name}`;
      // Upload via storage service
      const downloadURL = await storageService.uploadFile(file, filename);
      
      setPhotoUrl(downloadURL);
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('فشل رفع الصورة');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!currentUser || !companyId) return;

    try {
      setLoading(true);

      // Check if email already exists
      const emailExists = await staffService.checkEmailExists(
        companyId,
        data.email,
        staffId
      );

      if (emailExists) {
        toast.error('يوجد موظف بنفس البريد الإلكتروني بالفعل');
        return;
      }

      // Build translations object
      const staffTranslations: Staff['translations'] = {};
      selectedLanguages.forEach(lang => {
        if (translations[lang] && translations[lang].bio && translations[lang].bio.trim()) {
          staffTranslations[lang] = {
            bio: translations[lang].bio,
          };
        }
      });

      const staffData: any = {
        companyId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        status: data.status,
        active: true,
        createdBy: currentUser?.id,
      };

      // Only add optional fields if they have values
      if (data.positionId) {
        staffData.positionId = data.positionId;
      }
      if (data.employeeId && data.employeeId.trim()) {
        staffData.employeeId = data.employeeId;
      }
      if (data.bio && data.bio.trim()) {
        staffData.bio = data.bio;
      }
      if (photoUrl) {
        staffData.photoUrl = photoUrl;
      }
      if (Object.keys(staffTranslations).length > 0) {
        staffData.translations = staffTranslations;
      }

      if (isEditMode && staffId) {
        await staffService.updateStaff(staffId, staffData);
        toast.success('تم تحديث بيانات الموظف بنجاح');
      } else {
        await staffService.createStaff(staffData, currentUser?.id);
        toast.success('تم إضافة الموظف بنجاح');
      }

      navigate('/settings/staff');
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error(isEditMode ? 'فشل تحديث بيانات الموظف' : 'فشل إضافة الموظف');
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

  const handleTranslationChange = (langCode: string, value: string) => {
    setTranslations(prev => ({
      ...prev,
      [langCode]: { bio: value },
    }));
  };

  if (loadingStaff) {
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
            onClick={() => navigate('/settings/staff')}
            sx={{
              backgroundColor: theme.palette.action.hover,
              '&:hover': { backgroundColor: theme.palette.action.selected },
            }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {isEditMode ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab icon={<Person />} label="المعلومات الشخصية" />
                <Tab icon={<Work />} label="معلومات العمل" />
                <Tab icon={<Language />} label="الترجمة" />
              </Tabs>
            </Box>

            <Box sx={{ p: 3 }}>
              {/* Personal Information Tab */}
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  {/* Photo Upload */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Avatar
                        src={photoUrl}
                        sx={{ width: 100, height: 100 }}
                      >
                        {!photoUrl && <PhotoCamera sx={{ fontSize: 40 }} />}
                      </Avatar>
                      <Box>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handlePhotoUpload}
                          disabled={uploadingPhoto}
                        />
                        <Button
                          variant="outlined"
                          startIcon={uploadingPhoto ? <CircularProgress size={20} /> : <PhotoCamera />}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          {uploadingPhoto ? 'جاري الرفع...' : 'رفع صورة'}
                        </Button>
                        <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                          الحد الأقصى للحجم: 5 ميجابايت
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Controller
                      name="name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="اسم الموظف"
                          error={!!errors.name}
                          helperText={errors.name?.message}
                          required
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type="email"
                          label="البريد الإلكتروني"
                          error={!!errors.email}
                          helperText={errors.email?.message}
                          required
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="phone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="رقم الهاتف"
                          placeholder="01XXXXXXXXX"
                          error={!!errors.phone}
                          helperText={errors.phone?.message || 'مثال: 01234567890'}
                          required
                          dir="ltr"
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Box sx={{ 
                      display: 'flex', 
                      gap: 3, 
                      alignItems: 'flex-start',
                      flexDirection: { xs: 'column', md: 'row' },
                      width: '100%'
                    }}>
                      <Controller
                        name="employeeId"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="رقم الموظف (اختياري)"
                            placeholder="EMP001"
                            error={!!errors.employeeId}
                            helperText={errors.employeeId?.message}
                            sx={{ 
                              width: { xs: '100%', md: 'auto' },
                              minWidth: { md: 200 }, 
                              maxWidth: { md: 250 } 
                            }}
                          />
                        )}
                      />

                      <Controller
                        name="bio"
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            fullWidth
                            label="نبذة عن الموظف"
                            placeholder="اكتب نبذة مختصرة عن الموظف وخبراته..."
                            error={!!errors.bio}
                            helperText={errors.bio?.message}
                            sx={{ flexGrow: 1 }}
                          />
                        )}
                      />
                    </Box>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Work Information Tab */}
              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Controller
                      name="positionId"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.positionId}>
                          <InputLabel>المنصب</InputLabel>
                          <Select {...field} label="المنصب">
                            <MenuItem value="">
                              <em>غير محدد</em>
                            </MenuItem>
                            {positions.map(position => (
                              <MenuItem key={position.id} value={position.id}>
                                {position.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.positionId && (
                            <FormHelperText>{errors.positionId.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth error={!!errors.status}>
                          <InputLabel>حالة الموظف</InputLabel>
                          <Select {...field} label="حالة الموظف">
                            <MenuItem value="active">نشط</MenuItem>
                            <MenuItem value="inactive">غير نشط</MenuItem>
                            <MenuItem value="vacation">إجازة</MenuItem>
                            <MenuItem value="terminated">منتهي</MenuItem>
                          </Select>
                          {errors.status && (
                            <FormHelperText>{errors.status.message}</FormHelperText>
                          )}
                        </FormControl>
                      )}
                    />
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Translation Tab */}
              <TabPanel value={tabValue} index={2}>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                      اختر اللغات المطلوبة لترجمة النبذة التعريفية
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
                        يرجى إدخال ترجمة النبذة التعريفية للموظف باللغات المحددة.
                      </Alert>
                      
                      {selectedLanguages.map((langCode) => {
                        const lang = availableLanguages.find(l => l.code === langCode);
                        if (!lang) return null;
                        
                        return (
                          <Box key={langCode} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500 }}>
                              {lang.nativeName} ({lang.name})
                            </Typography>
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              label={`النبذة التعريفية بـ ${lang.nativeName}`}
                              value={translations[langCode]?.bio || ''}
                              onChange={(e) => handleTranslationChange(langCode, e.target.value)}
                            />
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
                onClick={() => navigate('/settings/staff')}
                disabled={loading}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<Save />}
                disabled={loading || uploadingPhoto}
                sx={{
                  minWidth: 120,
                  background: loading ? undefined : `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
                }}
              >
                {loading ? <CircularProgress size={24} /> : (isEditMode ? 'حفظ التغييرات' : 'إضافة الموظف')}
              </Button>
            </Box>
          </Paper>
        </form>
      </Box>
    </motion.div>
  );
};

export default StaffFormPage;