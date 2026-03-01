import React, { useState, useEffect, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  IconButton,
  Typography,
  CircularProgress,
  useTheme,
  Tab,
  Tabs,
  Stack,
  Switch,
  FormControlLabel,
  InputAdornment,
  Autocomplete,
  RadioGroup,
  Radio,
  Avatar,
  Card,
  CardContent,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Close,
  Save,
  Person,
  Email,
  Phone,
  LocationOn,
  Label,
  Business,
  Badge,
  Cake,
  Flag,
  Work,
  LocalHospital,
  ContactPhone,
  AddCircleOutline,
  RemoveCircleOutline,
  PhotoCamera,
  Delete as DeleteIcon,
  Coffee,
  MusicNote,
  Schedule,
  ChatBubble,
  VolumeOff,
  VolumeUp,
  Instagram,
  Facebook,
  Twitter,
  LinkedIn,
  WhatsApp,
  YouTube,
  Telegram,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { clientApiService } from '../../services/api/client.api.service';
import type { Client, DuplicateCheckResult } from '../../services/client.service';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { toast } from 'react-toastify';
// Removed Firebase Timestamp import - using Date objects instead
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// Removed Firebase storage imports - using API service for photo uploads
import { categoryService } from '../../services/category.service';
import type { ClientCategory } from '../../services/category.service';
import { toDate } from '../../utils/dateUtils';

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  client?: Client | null;
  mode: 'add' | 'edit' | 'view';
}

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
      id={`client-tabpanel-${index}`}
      aria-labelledby={`client-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Create schema inside component to access isRTL
const createSchema = (isRTL: boolean) => yup.object({
  // Basic Information
  firstName: yup.string().required(isRTL ? 'الاسم الأول مطلوب' : 'First name is required'),
  lastName: yup.string().required(isRTL ? 'اسم العائلة مطلوب' : 'Last name is required'),
  gender: yup.string().oneOf(['male', 'female', 'other', 'not_specified']),
  dateOfBirth: yup.mixed().nullable(),
  nationality: yup.string(),
  idNumber: yup.string(),
  occupation: yup.string(),
  referralSource: yup.string(),
  
  // Contact Information
  phones: yup.array().of(
    yup.object({
      number: yup.string(),
      type: yup.string().oneOf(['mobile', 'home', 'work']).required(),
      isPrimary: yup.boolean(),
      canReceiveSMS: yup.boolean(),
    })
  ).min(1, isRTL ? 'يجب إضافة رقم هاتف واحد على الأقل' : 'At least one phone number is required')
    .test('at-least-one-phone', isRTL ? 'يجب إضافة رقم هاتف واحد على الأقل' : 'At least one phone number is required', 
      (phones) => {
        if (!phones || phones.length === 0) return false;
        return phones[0].number && phones[0].number.trim() !== '';
      }),
  
  emails: yup.array().of(
    yup.object({
      address: yup.string().email(isRTL ? 'البريد الإلكتروني غير صالح' : 'Invalid email').required(),
      type: yup.string().oneOf(['personal', 'work']).required(),
      isPrimary: yup.boolean(),
      canReceiveEmails: yup.boolean(),
    })
  ),
  
  // Address
  address: yup.object({
    street: yup.string(),
    city: yup.string(),
    state: yup.string(),
    zipCode: yup.string(),
    country: yup.string(),
  }),
  
  // Additional Information
  status: yup.string().oneOf(['active', 'inactive', 'prospect']).required(),
  categoryId: yup.string(),
  tags: yup.array().of(yup.string()),
  notes: yup.string(),
  industry: yup.string(),
  taxNumber: yup.string(),
  
  // Branch
  branchId: yup.string(),
  
  // Emergency Contact
  emergencyContact: yup.object({
    name: yup.string(),
    phone: yup.string(),
    relationship: yup.string(),
  }),
  
  // Social Media
  socialMedia: yup.object({
    facebook: yup.string().url(isRTL ? 'رابط فيسبوك غير صالح' : 'Invalid Facebook URL').nullable(),
    instagram: yup.string().nullable(),
    twitter: yup.string().nullable(),
    linkedin: yup.string().url(isRTL ? 'رابط لينكد إن غير صالح' : 'Invalid LinkedIn URL').nullable(),
    whatsapp: yup.string().nullable(),
    youtube: yup.string().url(isRTL ? 'رابط يوتيوب غير صالح' : 'Invalid YouTube URL').nullable(),
    telegram: yup.string().nullable(),
  }),
  
  // Medical Information
  medical: yup.object({
    allergies: yup.array().of(yup.string()),
    conditions: yup.array().of(yup.string()),
    medications: yup.array().of(yup.string()),
    notes: yup.string(),
  }),
  
  // Preferences
  preferences: yup.object({
    preferredStaff: yup.array().of(yup.string()),
    preferredDays: yup.array().of(yup.string()),
    preferredTimes: yup.array().of(yup.string()),
    roomPreferences: yup.string(),
    communicationLanguage: yup.string(),
    communicationStyle: yup.string().oneOf(['silent', 'minimal', 'chatty', 'very_social']),
    favoriteDrinks: yup.array().of(yup.string()),
    musicPreferences: yup.object({
      genres: yup.array().of(yup.string()),
      artists: yup.array().of(yup.string()),
      volume: yup.string().oneOf(['quiet', 'moderate', 'loud']),
      preference: yup.string().oneOf(['no_music', 'background', 'engaged']),
    }),
    temperaturePreference: yup.string().oneOf(['cold', 'cool', 'moderate', 'warm', 'hot']),
    aromatherapy: yup.array().of(yup.string()),
    refreshments: yup.object({
      beverageTemperature: yup.string().oneOf(['ice_cold', 'cold', 'room_temp', 'warm', 'hot']),
      snackPreferences: yup.array().of(yup.string()),
    }),
    specialRequests: yup.string(),
  }),
});

type FormData = {
  // Basic Information
  firstName: string;
  lastName: string;
  gender?: 'male' | 'female' | 'other' | 'not_specified';
  dateOfBirth?: Date | null;
  nationality?: string;
  idNumber?: string;
  occupation?: string;
  referralSource?: string;
  
  // Contact Information
  phones: Array<{
    number: string;
    type: 'mobile' | 'home' | 'work';
    isPrimary: boolean;
    canReceiveSMS?: boolean;
  }>;
  
  emails: Array<{
    address: string;
    type: 'personal' | 'work';
    isPrimary: boolean;
    canReceiveEmails?: boolean;
  }>;
  
  // Address
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  
  // Additional Information
  status: 'active' | 'inactive' | 'prospect';
  categoryId?: string;
  tags: string[];
  notes?: string;
  industry?: string;
  taxNumber?: string;
  
  // Branch
  branchId?: string;
  
  // Marketing
  acceptsSMS?: boolean;
  acceptsEmail?: boolean;
  acceptsPromotions?: boolean;
  
  // Emergency Contact
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  
  // Social Media
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    whatsapp?: string;
    youtube?: string;
    telegram?: string;
  };
  
  // Medical Information
  medical?: {
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
    notes?: string;
  };
  
  // Preferences
  preferences?: {
    // Service preferences
    preferredStaff?: string[];
    preferredDays?: string[];
    preferredTimes?: string[];
    roomPreferences?: string;
    
    // Communication preferences
    communicationLanguage?: string;
    communicationStyle?: 'silent' | 'minimal' | 'chatty' | 'very_social';
    
    // Lifestyle preferences
    favoriteDrinks?: string[];
    musicPreferences?: {
      genres?: string[];
      artists?: string[];
      volume?: 'quiet' | 'moderate' | 'loud';
      preference?: 'no_music' | 'background' | 'engaged';
    };
    
    // Comfort preferences
    temperaturePreference?: 'cold' | 'cool' | 'moderate' | 'warm' | 'hot';
    aromatherapy?: string[];
    refreshments?: {
      beverageTemperature?: 'ice_cold' | 'cold' | 'room_temp' | 'warm' | 'hot';
      snackPreferences?: string[];
    };
    
    // Special requests
    specialRequests?: string;
  };
};


// Common Egyptian cities
const EGYPT_CITIES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الأقصر', 'أسوان', 
  'شرم الشيخ', 'الغردقة', 'بورسعيد', 'السويس', 'طنطا', 
  'المنصورة', 'الزقازيق', 'أسيوط', 'الفيوم', 'المنيا',
  'سوهاج', 'قنا', 'بني سويف', 'دمياط', 'كفر الشيخ'
];

// Common nationalities
const NATIONALITIES = [
  { label: 'مصري', labelEn: 'Egyptian', value: 'EG' },
  { label: 'سعودي', labelEn: 'Saudi', value: 'SA' },
  { label: 'سوري', labelEn: 'Syrian', value: 'SY' },
  { label: 'يمني', labelEn: 'Yemeni', value: 'YE' },
  { label: 'أردني', labelEn: 'Jordanian', value: 'JO' },
  { label: 'فلسطيني', labelEn: 'Palestinian', value: 'PS' },
  { label: 'لبناني', labelEn: 'Lebanese', value: 'LB' },
  { label: 'هندي', labelEn: 'Indian', value: 'IN' },
  { label: 'باكستاني', labelEn: 'Pakistani', value: 'PK' },
  { label: 'بنغلاديشي', labelEn: 'Bangladeshi', value: 'BD' },
  { label: 'فلبيني', labelEn: 'Filipino', value: 'PH' },
  { label: 'أخرى', labelEn: 'Other', value: 'OTHER' },
];

// Common referral sources
const REFERRAL_SOURCES = [
  { label: 'توصية من صديق', labelEn: 'Friend Referral', value: 'friend' },
  { label: 'وسائل التواصل الاجتماعي', labelEn: 'Social Media', value: 'social_media' },
  { label: 'بحث جوجل', labelEn: 'Google Search', value: 'google' },
  { label: 'إعلان', labelEn: 'Advertisement', value: 'advertisement' },
  { label: 'موقع إلكتروني', labelEn: 'Website', value: 'website' },
  { label: 'مررت بالمحل', labelEn: 'Walk-in', value: 'walkin' },
  { label: 'أخرى', labelEn: 'Other', value: 'other' },
];

// Common drinks
const COMMON_DRINKS = [
  { label: 'قهوة', labelEn: 'Coffee', value: 'coffee' },
  { label: 'شاي', labelEn: 'Tea', value: 'tea' },
  { label: 'قهوة باردة', labelEn: 'Iced Coffee', value: 'iced_coffee' },
  { label: 'عصير طبيعي', labelEn: 'Fresh Juice', value: 'juice' },
  { label: 'ماء', labelEn: 'Water', value: 'water' },
  { label: 'مشروبات غازية', labelEn: 'Soft Drinks', value: 'soft_drinks' },
  { label: 'عصير برتقال', labelEn: 'Orange Juice', value: 'orange_juice' },
  { label: 'عصير تفاح', labelEn: 'Apple Juice', value: 'apple_juice' },
  { label: 'سموثي', labelEn: 'Smoothie', value: 'smoothie' },
];

// Music genres
const MUSIC_GENRES = [
  { label: 'كلاسيكي', labelEn: 'Classical', value: 'classical' },
  { label: 'بوب', labelEn: 'Pop', value: 'pop' },
  { label: 'جاز', labelEn: 'Jazz', value: 'jazz' },
  { label: 'شرقي', labelEn: 'Oriental', value: 'oriental' },
  { label: 'هادئ', labelEn: 'Chill', value: 'chill' },
  { label: 'روك', labelEn: 'Rock', value: 'rock' },
  { label: 'آلات فقط', labelEn: 'Instrumental', value: 'instrumental' },
  { label: 'طبيعة', labelEn: 'Nature Sounds', value: 'nature' },
];

// Common aromatherapy scents
const AROMATHERAPY_SCENTS = [
  { label: 'لافندر', labelEn: 'Lavender', value: 'lavender' },
  { label: 'ورد', labelEn: 'Rose', value: 'rose' },
  { label: 'ياسمين', labelEn: 'Jasmine', value: 'jasmine' },
  { label: 'برتقال', labelEn: 'Orange', value: 'orange' },
  { label: 'نعناع', labelEn: 'Mint', value: 'mint' },
  { label: 'عود', labelEn: 'Oud', value: 'oud' },
  { label: 'ليمون', labelEn: 'Lemon', value: 'lemon' },
  { label: 'بدون عطر', labelEn: 'No Scent', value: 'none' },
];

// Days of week
const DAYS_OF_WEEK = [
  { label: 'الأحد', labelEn: 'Sunday', value: 'sunday' },
  { label: 'الإثنين', labelEn: 'Monday', value: 'monday' },
  { label: 'الثلاثاء', labelEn: 'Tuesday', value: 'tuesday' },
  { label: 'الأربعاء', labelEn: 'Wednesday', value: 'wednesday' },
  { label: 'الخميس', labelEn: 'Thursday', value: 'thursday' },
  { label: 'الجمعة', labelEn: 'Friday', value: 'friday' },
  { label: 'السبت', labelEn: 'Saturday', value: 'saturday' },
];

// Memoized Email Field Component to prevent re-renders
const EmailField = memo(({ 
  control, 
  index, 
  errors, 
  isRTL, 
  theme, 
  onRemove 
}: {
  control: any;
  index: number;
  errors: any;
  isRTL: boolean;
  theme: any;
  onRemove: () => void;
}) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          flexWrap: { xs: 'wrap', md: 'nowrap' },
          '& > *': {
            flex: '1 1 300px',
            minWidth: 0,
          },
        }}
      >
        <Controller
          name={`emails.${index}.address`}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              required
              type="email"
              label={isRTL ? 'البريد الإلكتروني' : 'Email Address'}
              error={!!errors.emails?.[index]?.address}
              helperText={errors.emails?.[index]?.address?.message}
              InputProps={{
                startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          )}
        />
        <Controller
          name={`emails.${index}.type`}
          control={control}
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>{isRTL ? 'النوع' : 'Type'}</InputLabel>
              <Select {...field} label={isRTL ? 'النوع' : 'Type'}>
                <MenuItem value="personal">{isRTL ? 'شخصي' : 'Personal'}</MenuItem>
                <MenuItem value="work">{isRTL ? 'عمل' : 'Work'}</MenuItem>
              </Select>
            </FormControl>
          )}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Controller
            name={`emails.${index}.isPrimary`}
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label={isRTL ? 'أساسي' : 'Primary'}
              />
            )}
          />
          <Controller
            name={`emails.${index}.canReceiveEmails`}
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label={isRTL ? 'رسائل' : 'Emails'}
              />
            )}
          />
          <IconButton onClick={onRemove} color="error">
            <RemoveCircleOutline />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
});

EmailField.displayName = 'EmailField';

const ClientForm: React.FC<ClientFormProps> = ({
  open,
  onClose,
  onSuccess,
  client,
  mode,
}) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';
  const [loading, setLoading] = useState(false);
  const isViewMode = mode === 'view';
  const [tabValue, setTabValue] = useState(0);
  const [tagInput, setTagInput] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [clientCategories, setClientCategories] = useState<ClientCategory[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');
  const [drinkInput, setDrinkInput] = useState('');
  const [genreInput, setGenreInput] = useState('');
  const [artistInput, setArtistInput] = useState('');
  const [aromatherapyInput, setAromatherapyInput] = useState('');
  
  // Duplicate detection state
  const [duplicateCheckResult, setDuplicateCheckResult] = useState<DuplicateCheckResult | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [snackInput, setSnackInput] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: yupResolver(createSchema(isRTL)),
    mode: 'onSubmit', // Only validate on submit to prevent re-renders
    defaultValues: {
      firstName: '',
      lastName: '',
      gender: 'not_specified',
      dateOfBirth: null,
      nationality: 'EG',
      idNumber: '',
      occupation: '',
      referralSource: '',
      phones: [{
        number: '',
        type: 'mobile',
        isPrimary: true,
        canReceiveSMS: true,
      }],
      emails: [],
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'Egypt',
      },
      status: 'active',
      categoryId: '',
      tags: [],
      notes: '',
      industry: '',
      taxNumber: '',
      branchId: currentBranch?.id || '',
      acceptsSMS: true,
      acceptsEmail: true,
      acceptsPromotions: true,
      emergencyContact: {
        name: '',
        phone: '',
        relationship: '',
      },
      socialMedia: {
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: '',
        whatsapp: '',
        youtube: '',
        telegram: '',
      },
      medical: {
        allergies: [],
        conditions: [],
        medications: [],
        notes: '',
      },
      preferences: {
        preferredStaff: [],
        preferredDays: [],
        preferredTimes: [],
        roomPreferences: '',
        communicationLanguage: '',
        communicationStyle: 'chatty',
        favoriteDrinks: [],
        musicPreferences: {
          genres: [],
          artists: [],
          volume: 'moderate',
          preference: 'background',
        },
        temperaturePreference: 'moderate',
        aromatherapy: [],
        refreshments: {
          beverageTemperature: 'room_temp',
          snackPreferences: [],
        },
        specialRequests: '',
      },
    },
  });

  const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({
    control,
    name: 'phones',
  });

  const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
    control,
    name: 'emails',
  });

  const watchedTags = watch('tags') || [];

  // Load client categories
  useEffect(() => {
    const loadCategories = async () => {
      if (!currentUser) return;
      
      try {
        const companyId = currentUser.companyId;
        
        if (companyId) {
          const categories = await categoryService.getCategories(
            companyId,
            'client',
            currentBranch?.id
          );
          setClientCategories(categories as ClientCategory[]);
        }
      } catch (error) {
        console.error('Error loading client categories:', error);
      }
    };
    
    loadCategories();
  }, [currentUser, currentBranch]);

  useEffect(() => {
    if (client && mode === 'edit') {
      if (client.photo) {
        setPhotoPreview(client.photo);
      }
      reset({
        firstName: client.firstName || client.name?.split(' ')[0] || '',
        lastName: client.lastName || client.name?.split(' ').slice(1).join(' ') || '',
        gender: client.gender || 'not_specified',
        dateOfBirth: client.dateOfBirth ? toDate(client.dateOfBirth) : null,
        nationality: client.nationality || 'EG',
        idNumber: client.idNumber || '',
        occupation: client.occupation || '',
        referralSource: client.referralSource || '',
        phones: client.phones?.length ? client.phones : [{
          number: client.phone || '',
          type: 'mobile' as const,
          isPrimary: true,
          canReceiveSMS: true,
        }],
        emails: client.emails?.length ? client.emails : client.email ? [{
          address: client.email,
          type: 'personal' as const,
          isPrimary: true,
          canReceiveEmails: true,
        }] : [],
        address: client.address || {
          street: client.address || '',
          city: client.city || '',
          state: '',
          zipCode: client.postalCode || '',
          country: client.country || 'Egypt',
        },
        status: client.status || 'active',
        categoryId: client.categoryId || '',
        tags: client.tags || [],
        notes: client.notes || '',
        industry: client.industry || '',
        taxNumber: client.taxNumber || '',
        branchId: client.branchId || currentBranch?.id || '',
        acceptsSMS: client.marketing?.acceptsSMS ?? true,
        acceptsEmail: client.marketing?.acceptsEmail ?? true,
        acceptsPromotions: client.marketing?.acceptsPromotions ?? true,
        emergencyContact: client.emergencyContact || {
          name: '',
          phone: '',
          relationship: '',
        },
        socialMedia: client.socialMedia || {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: '',
          whatsapp: '',
          youtube: '',
          telegram: '',
        },
        medical: {
          allergies: client.medical?.allergies || [],
          conditions: client.medical?.conditions || [],
          medications: client.medical?.medications || [],
          notes: client.medical?.notes || '',
        },
        preferences: {
          preferredStaff: client.preferences?.preferredStaff || [],
          preferredDays: client.preferences?.preferredDays || [],
          preferredTimes: client.preferences?.preferredTimes || [],
          roomPreferences: client.preferences?.roomPreferences || '',
          communicationLanguage: client.preferences?.communicationLanguage || '',
          communicationStyle: client.preferences?.communicationStyle || 'chatty',
          favoriteDrinks: client.preferences?.favoriteDrinks || [],
          musicPreferences: {
            genres: client.preferences?.musicPreferences?.genres || [],
            artists: client.preferences?.musicPreferences?.artists || [],
            volume: client.preferences?.musicPreferences?.volume || 'moderate',
            preference: client.preferences?.musicPreferences?.preference || 'background',
          },
          temperaturePreference: client.preferences?.temperaturePreference || 'moderate',
          aromatherapy: client.preferences?.aromatherapy || [],
          refreshments: {
            beverageTemperature: client.preferences?.refreshments?.beverageTemperature || 'room_temp',
            snackPreferences: client.preferences?.refreshments?.snackPreferences || [],
          },
          specialRequests: client.preferences?.specialRequests || '',
        },
      });
    } else {
      reset({
        firstName: '',
        lastName: '',
        gender: 'not_specified',
        dateOfBirth: null,
        nationality: 'EG',
        idNumber: '',
        occupation: '',
        referralSource: '',
        phones: [{
          number: '',
          type: 'mobile',
          isPrimary: true,
          canReceiveSMS: true,
        }],
        emails: [],
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'Egypt',
        },
        status: 'active',
        categoryId: '',
        tags: [],
        notes: '',
        industry: '',
        taxNumber: '',
        branchId: currentBranch?.id || '',
        acceptsSMS: true,
        acceptsEmail: true,
        acceptsPromotions: true,
        emergencyContact: {
          name: '',
          phone: '',
          relationship: '',
        },
        socialMedia: {
          facebook: '',
          instagram: '',
          twitter: '',
          linkedin: '',
          whatsapp: '',
          youtube: '',
          telegram: '',
        },
        medical: {
          allergies: [],
          conditions: [],
          medications: [],
          notes: '',
        },
        preferences: {
          preferredStaff: [],
          preferredDays: [],
          preferredTimes: [],
          roomPreferences: '',
          communicationLanguage: '',
          communicationStyle: 'chatty',
          favoriteDrinks: [],
          musicPreferences: {
            genres: [],
            artists: [],
            volume: 'moderate',
            preference: 'background',
          },
          temperaturePreference: 'moderate',
          aromatherapy: [],
          refreshments: {
            beverageTemperature: 'room_temp',
            snackPreferences: [],
          },
          specialRequests: '',
        },
      });
    }
  }, [client, mode, reset, currentBranch]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleAddTag = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && tagInput.trim()) {
      event.preventDefault();
      const newTag = tagInput.trim();
      if (!watchedTags.includes(newTag)) {
        setValue('tags', [...watchedTags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setValue('tags', watchedTags.filter((tag: string) => tag !== tagToDelete));
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(isRTL ? 'يجب أن يكون الملف صورة' : 'File must be an image');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(isRTL ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' : 'Image size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoFile(null);
    setPhotoPreview('');
    // If editing and had existing photo, we'll need to delete it from storage on save
  };

  const uploadPhoto = async (clientId: string): Promise<string | null> => {
    if (!photoFile || !currentUser) return null;

    setUploadingPhoto(true);
    try {
      const response = await clientApiService.uploadClientPhoto(clientId, photoFile);
      if (response.success && response.data) {
        return response.data.photoUrl;
      }
      throw new Error(response.error || 'Failed to upload photo');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error(isRTL ? 'فشل رفع الصورة' : 'Failed to upload photo');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!currentUser) {
      console.error('No user found');
      return;
    }

    setLoading(true);
    try {
      // Get companyId from token claims
      const companyId = currentUser.companyId;
      
      if (!companyId) {
        console.error('No companyId found in user claims');
        toast.error(isRTL ? 'خطأ: لم يتم العثور على معرف الشركة' : 'Error: Company ID not found');
        return;
      }

      // Check for duplicates only when adding new clients
      if (mode === 'add') {
        const clientDataForCheck = {
          companyId,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phones?.find(p => p.isPrimary)?.number || data.phones?.[0]?.number || '',
          email: data.emails?.find(e => e.isPrimary)?.address || data.emails?.[0]?.address || '',
          dateOfBirth: data.dateOfBirth,
          id: client?.id, // For edit mode
        };
        
        const duplicateResponse = await clientApiService.checkDuplicates(clientDataForCheck);
        const duplicateResult = duplicateResponse.data;
        
        if (duplicateResult.hasDuplicates) {
          if (duplicateResult.suggestedAction === 'block') {
            toast.error(isRTL ? 'يوجد عميل مطابق بالفعل' : 'An identical client already exists');
            setLoading(false);
            return;
          } else if (duplicateResult.suggestedAction === 'warn') {
            setDuplicateCheckResult(duplicateResult);
            setPendingFormData(data);
            setShowDuplicateDialog(true);
            setLoading(false);
            return;
          }
        }
      }

      await submitClientData(data, companyId);
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error(isRTL ? 'حدث خطأ في حفظ العميل' : 'Error saving client');
      setLoading(false);
    }
  };

  const submitClientData = async (data: FormData, companyId: string) => {
    try {
      // Prepare client data with new structure
      const clientData: any = {
        // Basic Information
        firstName: data.firstName,
        lastName: data.lastName,
        name: `${data.firstName} ${data.lastName}`.trim(), // For backward compatibility
        gender: data.gender,
        nationality: data.nationality,
        idNumber: data.idNumber,
        occupation: data.occupation,
        referralSource: data.referralSource,
        
        // Contact Information
        phones: data.phones.filter(p => p.number), // Only include phones with numbers
        emails: data.emails.filter(e => e.address), // Only include emails with addresses
        
        // Legacy fields for backward compatibility
        phone: data.phones.find(p => p.isPrimary)?.number || data.phones[0]?.number || '',
        email: data.emails.find(e => e.isPrimary)?.address || data.emails[0]?.address || '',
        
        // Address
        address: data.address,
        
        // Legacy address fields for backward compatibility
        city: data.address.city,
        country: data.address.country,
        postalCode: data.address.zipCode,
        
        // Additional Information
        status: data.status,
        categoryId: data.categoryId,
        tags: data.tags,
        notes: data.notes,
        industry: data.industry,
        taxNumber: data.taxNumber,
        
        // Marketing preferences
        marketing: {
          acceptsSMS: data.acceptsSMS ?? true,
          acceptsEmail: data.acceptsEmail ?? true,
          acceptsPromotions: data.acceptsPromotions ?? true,
        },
        
        // Emergency Contact
        emergencyContact: data.emergencyContact,
        
        // Social Media will be added conditionally below
        
        // Medical Information will be added conditionally below
        
        // Preferences will be added conditionally below
        
        // System Information
        companyId: companyId,
        branchId: data.branchId || currentBranch?.id,
      };
      
      // Add dateOfBirth only if it has a value
      if (data.dateOfBirth) {
        clientData.dateOfBirth = data.dateOfBirth.toISOString();
      }
      
      // Add medical information only if it has actual data
      if (data.medicalInfo?.allergies?.length || 
          data.medicalInfo?.chronicConditions?.length || 
          data.medicalInfo?.currentMedications?.length || 
          data.medicalInfo?.specialNeeds?.trim() ||
          data.medicalInfo?.bloodType ||
          data.medicalInfo?.pregnancyStatus) {
        clientData.medicalInfo = {
          ...data.medicalInfo,
          lastUpdated: new Date().toISOString(),
        };
      }
      
      // Add preferences only if they have actual data
      if (data.preferences && Object.keys(data.preferences).some(key => {
        const value = data.preferences[key as keyof typeof data.preferences];
        return Array.isArray(value) ? value.length > 0 : value;
      })) {
        clientData.preferences = data.preferences;
      }
      
      // Add social media only if it has actual data
      if (data.socialMedia && Object.values(data.socialMedia).some(value => value && value.trim())) {
        clientData.socialMedia = data.socialMedia;
      }

      let clientId: string | undefined;
      
      if (mode === 'add') {
        // Add company ID and branch ID to client data
        if (companyId) clientData.companyId = companyId;
        if (currentBranch?.id) clientData.branchId = currentBranch.id;
        
        const response = await clientApiService.createClient(clientData);
        if (response.success && response.data) {
          clientId = response.data.id;
          toast.success(isRTL ? 'تم إضافة العميل بنجاح' : 'Client added successfully');
        } else {
          throw new Error(response.error || 'Failed to create client');
        }
      } else if (client?.id) {
        clientId = client.id;
        const response = await clientApiService.updateClient(client.id, clientData);
        if (response.success) {
          toast.success(isRTL ? 'تم تحديث العميل بنجاح' : 'Client updated successfully');
        } else {
          throw new Error(response.error || 'Failed to update client');
        }
      }

      // Upload photo if there's a new one
      if (clientId && photoFile) {
        const photoUrl = await uploadPhoto(clientId);
        if (photoUrl) {
          // Photo URL is already set by the upload service
          console.log('Photo uploaded successfully:', photoUrl);
        }
      } else if (clientId && mode === 'edit' && !photoPreview && client?.photo) {
        // If photo was removed, delete from API
        try {
          await clientApiService.deleteClientPhoto(clientId);
        } catch (error) {
          console.error('Error deleting photo:', error);
        }
      }

      onSuccess?.();
      handleClose();
    } catch (error) {
      console.error('Error saving client:', error);
      toast.error(isRTL ? 'حدث خطأ في حفظ العميل' : 'Error saving client');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateDialogClose = () => {
    setShowDuplicateDialog(false);
    setDuplicateCheckResult(null);
    setPendingFormData(null);
  };

  const handleProceedWithDuplicate = async () => {
    if (!pendingFormData) return;
    
    setShowDuplicateDialog(false);
    setLoading(true);
    
    try {
      const companyId = currentUser!.companyId;
      await submitClientData(pendingFormData, companyId);
    } catch (error) {
      console.error('Error saving client after duplicate warning:', error);
      toast.error(isRTL ? 'حدث خطأ في حفظ العميل' : 'Error saving client');
      setLoading(false);
    }
    
    setPendingFormData(null);
    setDuplicateCheckResult(null);
  };

  const handleClose = () => {
    reset();
    setTabValue(0);
    setTagInput('');
    setPhotoFile(null);
    setPhotoPreview('');
    setAllergyInput('');
    setConditionInput('');
    setMedicationInput('');
    setDrinkInput('');
    setGenreInput('');
    setArtistInput('');
    setAromatherapyInput('');
    setSnackInput('');
    onClose();
  };

  const FieldRow = ({ children }: { children: React.ReactNode }) => (
    <Box
      sx={{
        display: 'flex',
        gap: 3,
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        '& > *': {
          flex: '1 1 300px',
          minWidth: 0,
        },
      }}
    >
      {children}
    </Box>
  );

  return (
    <>
      {/* Duplicate Warning Dialog */}
      <Dialog
        open={showDuplicateDialog}
        onClose={handleDuplicateDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          backgroundColor: theme.palette.warning.main,
          color: '#fff',
        }}>
          <Person />
          {isRTL ? 'تحذير: عملاء متشابهون' : 'Warning: Similar Clients Found'}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {isRTL 
              ? 'وجدنا عملاء متشابهين في قاعدة البيانات. هل تريد المتابعة؟'
              : 'We found similar clients in the database. Do you want to proceed?'
            }
          </Typography>
          
          {duplicateCheckResult?.matches.map((match, index) => (
            <Card key={index} sx={{ mb: 2, border: `1px solid ${theme.palette.warning.main}` }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar
                    src={match.client.photo}
                    sx={{ 
                      width: 48, 
                      height: 48,
                      bgcolor: theme.palette.warning.main + '20',
                      color: theme.palette.warning.main,
                    }}
                  >
                    {match.client.photo ? null : (
                      match.client.firstName?.charAt(0)?.toUpperCase() || 
                      match.client.name?.charAt(0)?.toUpperCase() || 
                      <Person />
                    )}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      {match.client.firstName && match.client.lastName
                        ? `${match.client.firstName} ${match.client.lastName}`
                        : match.client.name || 'اسم غير محدد'
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {match.client.phone || match.client.email || 'لا توجد معلومات اتصال'}
                    </Typography>
                  </Box>
                  <Chip
                    label={`${match.matchScore}% ${isRTL ? 'مطابقة' : 'match'}`}
                    color={match.matchType === 'exact' ? 'error' : 'warning'}
                    size="small"
                  />
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {match.matchedFields.map((field) => (
                    <Chip
                      key={field}
                      label={field === 'phone' ? (isRTL ? 'الهاتف' : 'Phone') :
                             field === 'email' ? (isRTL ? 'الإيميل' : 'Email') :
                             field === 'name' ? (isRTL ? 'الاسم' : 'Name') :
                             field === 'dateOfBirth' ? (isRTL ? 'تاريخ الميلاد' : 'DOB') :
                             field}
                      size="small"
                      variant="outlined"
                      color="warning"
                    />
                  ))}
                </Box>
              </CardContent>
            </Card>
          ))}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={handleDuplicateDialogClose}
            variant="outlined"
            color="primary"
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            onClick={handleProceedWithDuplicate}
            variant="contained"
            color="warning"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : (isRTL ? 'متابعة على أي حال' : 'Proceed Anyway')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Main Client Form Dialog */}
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          component: motion.div,
          initial: { opacity: 0, scale: 0.9 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.9 },
          sx: {
          backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
          backgroundImage: 'none',
          '& .MuiTextField-root': {
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: theme.palette.primary.main,
            },
          },
          '& .MuiFormControl-root': {
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: theme.palette.primary.main,
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: theme.palette.primary.main,
            },
          },
          '& .MuiSwitch-root': {
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: theme.palette.primary.main,
              '& + .MuiSwitch-track': {
                backgroundColor: theme.palette.primary.main,
              },
            },
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
          borderBottom: `2px solid ${theme.palette.primary.main}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {mode === 'add'
              ? (isRTL ? 'إضافة عميل جديد' : 'Add New Client')
              : mode === 'view'
              ? (isRTL ? 'عرض بيانات العميل' : 'View Client Details')
              : (isRTL ? 'تعديل بيانات العميل' : 'Edit Client')}
          </Typography>
          <IconButton 
            onClick={handleClose} 
            size="small"
            sx={{ 
              color: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.main + '20',
              },
            }}
          >
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit, (errors) => {
        console.log('Form validation errors:', errors);
      })}>
        <DialogContent
          sx={{
            backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
            pt: 3,
          }}
        >
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            sx={{ 
              mb: 2,
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTabs-indicator': {
                backgroundColor: theme.palette.primary.main,
                height: 3,
              },
            }}
            TabIndicatorProps={{
              style: {
                backgroundColor: theme.palette.primary.main,
              },
            }}
          >
            <Tab
              label={isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
              sx={{ 
                minWidth: 150,
                fontWeight: tabValue === 0 ? 600 : 400,
                color: tabValue === 0 ? theme.palette.primary.main : 'inherit',
                '&:hover': {
                  color: theme.palette.primary.main,
                },
              }}
            />
            <Tab
              label={isRTL ? 'العنوان' : 'Address'}
              sx={{ 
                minWidth: 100,
                fontWeight: tabValue === 1 ? 600 : 400,
                color: tabValue === 1 ? theme.palette.primary.main : 'inherit',
                '&:hover': {
                  color: theme.palette.primary.main,
                },
              }}
            />
            <Tab
              label={isRTL ? 'إضافية' : 'Additional'}
              sx={{ 
                minWidth: 100,
                fontWeight: tabValue === 2 ? 600 : 400,
                color: tabValue === 2 ? theme.palette.primary.main : 'inherit',
                '&:hover': {
                  color: theme.palette.primary.main,
                },
              }}
            />
            <Tab
              label={isRTL ? 'طبي' : 'Medical'}
              sx={{ 
                minWidth: 100,
                fontWeight: tabValue === 3 ? 600 : 400,
                color: tabValue === 3 ? theme.palette.primary.main : 'inherit',
                '&:hover': {
                  color: theme.palette.primary.main,
                },
              }}
            />
            <Tab
              label={isRTL ? 'التفضيلات' : 'Preferences'}
              sx={{ 
                minWidth: 100,
                fontWeight: tabValue === 4 ? 600 : 400,
                color: tabValue === 4 ? theme.palette.primary.main : 'inherit',
                '&:hover': {
                  color: theme.palette.primary.main,
                },
              }}
            />
          </Tabs>

          {/* Basic Information Tab */}
          <TabPanel value={tabValue} index={0}>
            <Stack spacing={3}>
              {/* Photo Upload */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                <Box sx={{ position: 'relative' }}>
                  <Avatar
                    src={photoPreview}
                    sx={{
                      width: 120,
                      height: 120,
                      bgcolor: theme.palette.primary.main + '20',
                      border: `2px solid ${theme.palette.primary.main}`,
                    }}
                  >
                    {!photoPreview && <Person sx={{ fontSize: 60, color: theme.palette.primary.main }} />}
                  </Avatar>
                  {uploadingPhoto && (
                    <CircularProgress
                      size={120}
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        color: theme.palette.primary.main,
                      }}
                    />
                  )}
                </Box>
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'صورة العميل' : 'Client Photo'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      component="label"
                      startIcon={<PhotoCamera />}
                      sx={{
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                        '&:hover': {
                          borderColor: theme.palette.primary.dark,
                          backgroundColor: theme.palette.primary.main + '10',
                        },
                      }}
                    >
                      {isRTL ? 'اختر صورة' : 'Choose Photo'}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handlePhotoChange}
                      />
                    </Button>
                    {photoPreview && (
                      <IconButton
                        size="small"
                        onClick={handleRemovePhoto}
                        sx={{
                          color: theme.palette.error.main,
                          '&:hover': {
                            backgroundColor: theme.palette.error.main + '10',
                          },
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {isRTL ? 'حجم الصورة الأقصى: 5 ميجابايت' : 'Max size: 5MB'}
                  </Typography>
                </Stack>
              </Box>

              {/* Name Fields */}
              <FieldRow>
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      required
                      disabled={isViewMode}
                      label={isRTL ? 'الاسم الأول' : 'First Name'}
                      error={!!errors.firstName}
                      helperText={errors.firstName?.message}
                    />
                  )}
                />
                <Controller
                  name="lastName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      required
                      disabled={isViewMode}
                      label={isRTL ? 'اسم العائلة' : 'Last Name'}
                      error={!!errors.lastName}
                      helperText={errors.lastName?.message}
                    />
                  )}
                />
              </FieldRow>

              {/* Gender, DOB, Nationality */}
              <FieldRow>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>{isRTL ? 'الجنس' : 'Gender'}</InputLabel>
                      <Select
                        {...field}
                        label={isRTL ? 'الجنس' : 'Gender'}
                        startAdornment={<Person sx={{ mr: 1, color: 'text.secondary' }} />}
                      >
                        <MenuItem value="male">{isRTL ? 'ذكر' : 'Male'}</MenuItem>
                        <MenuItem value="female">{isRTL ? 'أنثى' : 'Female'}</MenuItem>
                        <MenuItem value="not_specified">{isRTL ? 'غير محدد' : 'Not Specified'}</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
                <Controller
                  name="dateOfBirth"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      label={isRTL ? 'تاريخ الميلاد' : 'Date of Birth'}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          InputProps: {
                            startAdornment: <Cake sx={{ mr: 1, color: 'text.secondary' }} />,
                          },
                        },
                      }}
                    />
                  )}
                />
                <Controller
                  name="nationality"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>{isRTL ? 'الجنسية' : 'Nationality'}</InputLabel>
                      <Select
                        {...field}
                        label={isRTL ? 'الجنسية' : 'Nationality'}
                        startAdornment={<Flag sx={{ mr: 1, color: 'text.secondary' }} />}
                      >
                        {NATIONALITIES.map((nat) => (
                          <MenuItem key={nat.value} value={nat.value}>
                            {isRTL ? nat.label : nat.labelEn}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </FieldRow>

              {/* ID Number, Occupation */}
              <FieldRow>
                <Controller
                  name="idNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={isRTL ? 'رقم الهوية / الإقامة' : 'ID / Iqama Number'}
                      InputProps={{
                        startAdornment: <Badge sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  )}
                />
                <Controller
                  name="occupation"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={isRTL ? 'المهنة' : 'Occupation'}
                      InputProps={{
                        startAdornment: <Work sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  )}
                />
              </FieldRow>

              {/* Referral Source */}
              <FieldRow>
                <Controller
                  name="referralSource"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>{isRTL ? 'كيف عرفت عنا؟' : 'How did you hear about us?'}</InputLabel>
                      <Select
                        {...field}
                        label={isRTL ? 'كيف عرفت عنا؟' : 'How did you hear about us?'}
                      >
                        {REFERRAL_SOURCES.map((source) => (
                          <MenuItem key={source.value} value={source.value}>
                            {isRTL ? source.label : source.labelEn}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </FieldRow>

              {/* Phone Numbers */}
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 2,
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {isRTL ? 'أرقام الهاتف' : 'Phone Numbers'}
                </Typography>
                {phoneFields.map((field, index) => {
                  // Use a stable key that doesn't change
                  const stableKey = `phone-${index}`;
                  
                  return (
                    <Box key={stableKey} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: '1 1 300px' }}>
                          <Controller
                            name={`phones.${index}.number`}
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                fullWidth
                                required
                                label={isRTL ? 'رقم الهاتف' : 'Phone Number'}
                                error={!!errors.phones?.[index]?.number}
                                helperText={errors.phones?.[index]?.number?.message}
                                placeholder={isRTL ? '01234567890' : '01234567890'}
                                autoFocus={index === 0 && phoneFields.length === 1}
                                InputProps={{
                                  startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                                }}
                              />
                            )}
                          />
                        </Box>
                        <Box sx={{ flex: '1 1 200px' }}>
                          <Controller
                            name={`phones.${index}.type`}
                            control={control}
                            render={({ field }) => (
                              <FormControl fullWidth>
                                <InputLabel>{isRTL ? 'النوع' : 'Type'}</InputLabel>
                                <Select 
                                  {...field}
                                  label={isRTL ? 'النوع' : 'Type'}
                                >
                                  <MenuItem value="mobile">{isRTL ? 'شخصي' : 'Mobile'}</MenuItem>
                                  <MenuItem value="home">{isRTL ? 'منزل' : 'Home'}</MenuItem>
                                  <MenuItem value="work">{isRTL ? 'عمل' : 'Work'}</MenuItem>
                                </Select>
                              </FormControl>
                            )}
                          />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Controller
                            name={`phones.${index}.isPrimary`}
                            control={control}
                            render={({ field }) => (
                              <FormControlLabel
                                control={
                                  <Switch 
                                    {...field}
                                    checked={field.value || false}
                                    onChange={(e) => {
                                      field.onChange(e.target.checked);
                                      // If setting this as primary, unset all others
                                      if (e.target.checked) {
                                        phoneFields.forEach((_, idx) => {
                                          if (idx !== index) {
                                            setValue(`phones.${idx}.isPrimary`, false);
                                          }
                                        });
                                      }
                                    }}
                                  />
                                }
                                label={isRTL ? 'رئيسي' : 'Primary'}
                              />
                            )}
                          />
                          <Controller
                            name={`phones.${index}.canReceiveSMS`}
                            control={control}
                            render={({ field }) => (
                              <FormControlLabel
                                control={
                                  <Switch 
                                    {...field}
                                    checked={field.value || false}
                                  />
                                }
                                label={isRTL ? 'SMS' : 'SMS'}
                              />
                            )}
                          />
                          {phoneFields.length > 1 && (
                            <IconButton 
                              onClick={() => removePhone(index)} 
                              color="error"
                              aria-label={isRTL ? 'حذف رقم الهاتف' : 'Remove phone number'}
                            >
                              <RemoveCircleOutline />
                            </IconButton>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
                {phoneFields.length < 5 && (
                  <Button
                    startIcon={<AddCircleOutline />}
                    onClick={() => {
                      appendPhone({ 
                        number: '', 
                        type: 'mobile', 
                        isPrimary: phoneFields.length === 0, 
                        canReceiveSMS: true 
                      });
                    }}
                    variant="outlined"
                    size="small"
                    type="button"
                    sx={{
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      '&:hover': {
                        borderColor: theme.palette.primary.dark,
                        backgroundColor: theme.palette.primary.main + '10',
                      },
                    }}
                  >
                    {isRTL ? 'إضافة رقم هاتف' : 'Add Phone Number'}
                  </Button>
                )}
                {phoneFields.length === 0 && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    {isRTL ? 'يجب إضافة رقم هاتف واحد على الأقل' : 'At least one phone number is required'}
                  </Typography>
                )}
              </Box>

              {/* Email Addresses */}
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 2,
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {isRTL ? 'البريد الإلكتروني' : 'Email Addresses'}
                </Typography>
                {emailFields.map((field, index) => (
                  <EmailField
                    key={field.id}
                    control={control}
                    index={index}
                    errors={errors}
                    isRTL={isRTL}
                    theme={theme}
                    onRemove={() => removeEmail(index)}
                  />
                ))}
                {emailFields.length === 0 && (
                  <Button
                    startIcon={<AddCircleOutline />}
                    onClick={() => appendEmail({ address: '', type: 'personal', isPrimary: true, canReceiveEmails: true })}
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                      '&:hover': {
                        borderColor: theme.palette.primary.dark,
                        backgroundColor: theme.palette.primary.main + '10',
                      },
                    }}
                  >
                    {isRTL ? 'إضافة بريد إلكتروني' : 'Add Email Address'}
                  </Button>
                )}
              </Box>
            </Stack>
          </TabPanel>

          {/* Address Tab */}
          <TabPanel value={tabValue} index={1}>
            <Stack spacing={3}>
              {/* Physical Address */}
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 2,
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {isRTL ? 'العنوان' : 'Address'}
                </Typography>
                <Stack spacing={2}>
                  <Controller
                    name="address.street"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label={isRTL ? 'الشارع' : 'Street'}
                        InputProps={{
                          startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                      />
                    )}
                  />
                  <FieldRow>
                    <Controller
                      name="address.city"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          {...field}
                          options={EGYPT_CITIES}
                          freeSolo
                          onChange={(_, value) => field.onChange(value)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={isRTL ? 'المدينة' : 'City'}
                            />
                          )}
                        />
                      )}
                    />
                    <Controller
                      name="address.state"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={isRTL ? 'المنطقة' : 'State/Province'}
                        />
                      )}
                    />
                  </FieldRow>
                  <FieldRow>
                    <Controller
                      name="address.zipCode"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={isRTL ? 'الرمز البريدي' : 'Postal Code'}
                        />
                      )}
                    />
                    <Controller
                      name="address.country"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={isRTL ? 'الدولة' : 'Country'}
                        />
                      )}
                    />
                  </FieldRow>
                </Stack>
              </Box>

              {/* Branch Assignment */}
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>{isRTL ? 'الفرع' : 'Branch'}</InputLabel>
                    <Select
                      {...field}
                      label={isRTL ? 'الفرع' : 'Branch'}
                      startAdornment={<Business sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                      <MenuItem value={currentBranch?.id}>
                        {currentBranch?.name || (isRTL ? 'الفرع الرئيسي' : 'Main Branch')}
                      </MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              {/* Active Status */}
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value === 'active'}
                        onChange={(e) => field.onChange(e.target.checked ? 'active' : 'inactive')}
                      />
                    }
                    label={isRTL ? 'نشط' : 'Active'}
                  />
                )}
              />
            </Stack>
          </TabPanel>

          {/* Additional Tab */}
          <TabPanel value={tabValue} index={2}>
            <Stack spacing={3}>
              {/* Client Category */}
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>{isRTL ? 'فئة العميل' : 'Client Category'}</InputLabel>
                    <Select
                      {...field}
                      value={field.value || ''}
                      label={isRTL ? 'فئة العميل' : 'Client Category'}
                      startAdornment={<Label sx={{ mr: 1, color: 'text.secondary' }} />}
                    >
                      <MenuItem value="">
                        <em>{isRTL ? 'بدون فئة' : 'No Category'}</em>
                      </MenuItem>
                      {clientCategories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: category.color,
                              }}
                            />
                            {isRTL ? category.nameAr || category.name : category.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              {/* Industry and Tax Number */}
              <FieldRow>
                <Controller
                  name="industry"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={isRTL ? 'الصناعة' : 'Industry'}
                      InputProps={{
                        startAdornment: <Business sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  )}
                />
                <Controller
                  name="taxNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={isRTL ? 'الرقم الضريبي' : 'Tax Number'}
                    />
                  )}
                />
              </FieldRow>

              {/* Tags */}
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 1,
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {isRTL ? 'العلامات' : 'Tags'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {watchedTags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => handleDeleteTag(tag)}
                      sx={{
                        borderColor: theme.palette.primary.main,
                        color: theme.palette.primary.main,
                        '&:hover': {
                          backgroundColor: theme.palette.primary.main + '20',
                        },
                        '& .MuiChip-deleteIcon': {
                          color: theme.palette.primary.main,
                          '&:hover': {
                            color: theme.palette.primary.dark,
                          },
                        },
                      }}
                      variant="outlined"
                    />
                  ))}
                </Box>
                <TextField
                  fullWidth
                  placeholder={isRTL ? 'اكتب علامة واضغط Enter' : 'Type a tag and press Enter'}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleAddTag}
                  InputProps={{
                    startAdornment: <Label sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Box>

              {/* Notes */}
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={4}
                    label={isRTL ? 'ملاحظات' : 'Notes'}
                  />
                )}
              />

              {/* Marketing Preferences */}
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 2,
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {isRTL ? 'تفضيلات التسويق' : 'Marketing Preferences'}
                </Typography>
                <Stack spacing={1}>
                  <Controller
                    name="acceptsSMS"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label={isRTL ? 'استقبال رسائل SMS' : 'Receive SMS Messages'}
                      />
                    )}
                  />
                  <Controller
                    name="acceptsEmail"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label={isRTL ? 'استقبال رسائل البريد الإلكتروني' : 'Receive Email Messages'}
                      />
                    )}
                  />
                  <Controller
                    name="acceptsPromotions"
                    control={control}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch {...field} checked={field.value} />}
                        label={isRTL ? 'استقبال العروض الترويجية' : 'Receive Promotional Offers'}
                      />
                    )}
                  />
                </Stack>
              </Box>

              {/* Emergency Contact */}
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 2,
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {isRTL ? 'جهة الاتصال في حالات الطوارئ' : 'Emergency Contact'}
                </Typography>
                <Stack spacing={2}>
                  <FieldRow>
                    <Controller
                      name="emergencyContact.name"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={isRTL ? 'الاسم' : 'Name'}
                          InputProps={{
                            startAdornment: <ContactPhone sx={{ mr: 1, color: 'text.secondary' }} />,
                          }}
                        />
                      )}
                    />
                    <Controller
                      name="emergencyContact.phone"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          label={isRTL ? 'رقم الهاتف' : 'Phone Number'}
                          InputProps={{
                            startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                          }}
                        />
                      )}
                    />
                  </FieldRow>
                  <Controller
                    name="emergencyContact.relationship"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label={isRTL ? 'صلة القرابة' : 'Relationship'}
                        placeholder={isRTL ? 'مثل: زوجة، أب، صديق...' : 'e.g., Spouse, Father, Friend...'}
                      />
                    )}
                  />
                </Stack>
              </Box>
              
              {/* Social Media */}
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 2,
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {isRTL ? 'وسائل التواصل الاجتماعي' : 'Social Media'}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
                  <Controller
                    name="socialMedia.facebook"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Facebook"
                        placeholder="https://facebook.com/username"
                        error={!!errors.socialMedia?.facebook}
                        helperText={errors.socialMedia?.facebook?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Facebook sx={{ color: '#1877F2' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="socialMedia.instagram"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Instagram"
                        placeholder="@username"
                        error={!!errors.socialMedia?.instagram}
                        helperText={errors.socialMedia?.instagram?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Instagram sx={{ color: '#E4405F' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="socialMedia.twitter"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Twitter"
                        placeholder="@username"
                        error={!!errors.socialMedia?.twitter}
                        helperText={errors.socialMedia?.twitter?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Twitter sx={{ color: '#1DA1F2' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="socialMedia.linkedin"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="LinkedIn"
                        placeholder="https://linkedin.com/in/username"
                        error={!!errors.socialMedia?.linkedin}
                        helperText={errors.socialMedia?.linkedin?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <LinkedIn sx={{ color: '#0A66C2' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="socialMedia.whatsapp"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="WhatsApp"
                        placeholder="+20 123 456 7890"
                        error={!!errors.socialMedia?.whatsapp}
                        helperText={errors.socialMedia?.whatsapp?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <WhatsApp sx={{ color: '#25D366' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="socialMedia.youtube"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="YouTube"
                        placeholder="https://youtube.com/@channel"
                        error={!!errors.socialMedia?.youtube}
                        helperText={errors.socialMedia?.youtube?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <YouTube sx={{ color: '#FF0000' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                  <Controller
                    name="socialMedia.telegram"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Telegram"
                        placeholder="@username"
                        error={!!errors.socialMedia?.telegram}
                        helperText={errors.socialMedia?.telegram?.message}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Telegram sx={{ color: '#26A5E4' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    )}
                  />
                </Box>
              </Box>
            </Stack>
          </TabPanel>
          {/* Medical Tab */}
          <TabPanel value={tabValue} index={3}>
            <Stack spacing={3}>
              {/* Allergies */}
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 2,
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {isRTL ? 'الحساسية' : 'Allergies'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {watch('medical.allergies')?.map((allergy, index) => (
                    <Chip
                      key={index}
                      label={allergy}
                      onDelete={() => {
                        const current = watch('medical.allergies') || [];
                        setValue('medical.allergies', current.filter((_, i) => i !== index));
                      }}
                      sx={{
                        backgroundColor: '#f44336' + '20',
                        color: '#f44336',
                        borderColor: '#f44336',
                        border: '1px solid',
                        '& .MuiChip-deleteIcon': {
                          color: '#f44336',
                        },
                      }}
                    />
                  ))}
                </Box>
                <TextField
                  fullWidth
                  placeholder={isRTL ? 'أدخل الحساسية واضغط Enter' : 'Type an allergy and press Enter'}
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && allergyInput.trim()) {
                      e.preventDefault();
                      const current = watch('medical.allergies') || [];
                      if (!current.includes(allergyInput.trim())) {
                        setValue('medical.allergies', [...current, allergyInput.trim()]);
                      }
                      setAllergyInput('');
                    }
                  }}
                  InputProps={{
                    startAdornment: <LocalHospital sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Box>

              {/* Medical Conditions */}
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 2,
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {isRTL ? 'الحالات الصحية' : 'Medical Conditions'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {watch('medical.conditions')?.map((condition, index) => (
                    <Chip
                      key={index}
                      label={condition}
                      onDelete={() => {
                        const current = watch('medical.conditions') || [];
                        setValue('medical.conditions', current.filter((_, i) => i !== index));
                      }}
                      sx={{
                        backgroundColor: '#ff9800' + '20',
                        color: '#ff9800',
                        borderColor: '#ff9800',
                        border: '1px solid',
                        '& .MuiChip-deleteIcon': {
                          color: '#ff9800',
                        },
                      }}
                    />
                  ))}
                </Box>
                <TextField
                  fullWidth
                  placeholder={isRTL ? 'أدخل الحالة الصحية واضغط Enter' : 'Type a medical condition and press Enter'}
                  value={conditionInput}
                  onChange={(e) => setConditionInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && conditionInput.trim()) {
                      e.preventDefault();
                      const current = watch('medical.conditions') || [];
                      if (!current.includes(conditionInput.trim())) {
                        setValue('medical.conditions', [...current, conditionInput.trim()]);
                      }
                      setConditionInput('');
                    }
                  }}
                  InputProps={{
                    startAdornment: <LocalHospital sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Box>

              {/* Medications */}
              <Box>
                <Typography 
                  variant="subtitle2" 
                  sx={{ 
                    mb: 2,
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {isRTL ? 'الأدوية' : 'Medications'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {watch('medical.medications')?.map((medication, index) => (
                    <Chip
                      key={index}
                      label={medication}
                      onDelete={() => {
                        const current = watch('medical.medications') || [];
                        setValue('medical.medications', current.filter((_, i) => i !== index));
                      }}
                      sx={{
                        backgroundColor: '#2196f3' + '20',
                        color: '#2196f3',
                        borderColor: '#2196f3',
                        border: '1px solid',
                        '& .MuiChip-deleteIcon': {
                          color: '#2196f3',
                        },
                      }}
                    />
                  ))}
                </Box>
                <TextField
                  fullWidth
                  placeholder={isRTL ? 'أدخل اسم الدواء واضغط Enter' : 'Type a medication and press Enter'}
                  value={medicationInput}
                  onChange={(e) => setMedicationInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && medicationInput.trim()) {
                      e.preventDefault();
                      const current = watch('medical.medications') || [];
                      if (!current.includes(medicationInput.trim())) {
                        setValue('medical.medications', [...current, medicationInput.trim()]);
                      }
                      setMedicationInput('');
                    }
                  }}
                  InputProps={{
                    startAdornment: <LocalHospital sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
              </Box>

              {/* Medical Notes */}
              <Controller
                name="medical.notes"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={4}
                    label={isRTL ? 'ملاحظات طبية' : 'Medical Notes'}
                    placeholder={isRTL ? 'أي ملاحظات إضافية حول الحالة الصحية...' : 'Any additional notes about medical conditions...'}
                  />
                )}
              />
            </Stack>
          </TabPanel>

          {/* Preferences Tab */}
          <TabPanel value={tabValue} index={4}>
            <Stack spacing={3}>
              {/* Service Preferences */}
              <Card 
                variant="outlined" 
                sx={{ 
                  borderColor: theme.palette.primary.main + '40',
                  backgroundColor: theme.palette.mode === 'dark' ? '#252525' : '#fafafa',
                }}
              >
                <CardContent>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      mb: 3,
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Schedule />
                    {isRTL ? 'تفضيلات الخدمة' : 'Service Preferences'}
                  </Typography>
                  
                  {/* Preferred Days */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      {isRTL ? 'الأيام المفضلة' : 'Preferred Days'}
                    </Typography>
                    <Controller
                      name="preferences.preferredDays"
                      control={control}
                      render={({ field }) => (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {DAYS_OF_WEEK.map((day) => {
                            const isSelected = field.value?.includes(day.value);
                            return (
                              <Chip
                                key={day.value}
                                label={isRTL ? day.label : day.labelEn}
                                onClick={() => {
                                  const current = field.value || [];
                                  if (isSelected) {
                                    field.onChange(current.filter(d => d !== day.value));
                                  } else {
                                    field.onChange([...current, day.value]);
                                  }
                                }}
                                color={isSelected ? 'primary' : 'default'}
                                variant={isSelected ? 'filled' : 'outlined'}
                                sx={{ cursor: 'pointer' }}
                              />
                            );
                          })}
                        </Box>
                      )}
                    />
                  </Box>

                  {/* Room Preferences */}
                  <Controller
                    name="preferences.roomPreferences"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label={isRTL ? 'تفضيلات الغرفة' : 'Room Preferences'}
                        placeholder={isRTL ? 'مثل: غرفة هادئة، بعيدة عن النافذة...' : 'e.g., Quiet room, away from window...'}
                      />
                    )}
                  />
                </CardContent>
              </Card>

              {/* Communication Preferences */}
              <Card 
                variant="outlined" 
                sx={{ 
                  borderColor: theme.palette.primary.main + '40',
                  backgroundColor: theme.palette.mode === 'dark' ? '#252525' : '#fafafa',
                }}
              >
                <CardContent>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      mb: 3,
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <ChatBubble />
                    {isRTL ? 'تفضيلات التواصل' : 'Communication Preferences'}
                  </Typography>
                  
                  {/* Communication Style */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      {isRTL ? 'أسلوب التواصل' : 'Communication Style'}
                    </Typography>
                    <Controller
                      name="preferences.communicationStyle"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup {...field} row>
                          <FormControlLabel 
                            value="silent" 
                            control={<Radio />} 
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                🤫 {isRTL ? 'هادئ' : 'Silent'}
                              </Box>
                            }
                          />
                          <FormControlLabel 
                            value="minimal" 
                            control={<Radio />} 
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                💬 {isRTL ? 'قليل' : 'Minimal'}
                              </Box>
                            }
                          />
                          <FormControlLabel 
                            value="chatty" 
                            control={<Radio />} 
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                😊 {isRTL ? 'ودود' : 'Chatty'}
                              </Box>
                            }
                          />
                          <FormControlLabel 
                            value="very_social" 
                            control={<Radio />} 
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                🎉 {isRTL ? 'اجتماعي' : 'Very Social'}
                              </Box>
                            }
                          />
                        </RadioGroup>
                      )}
                    />
                  </Box>

                  {/* Communication Language */}
                  <Controller
                    name="preferences.communicationLanguage"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>{isRTL ? 'لغة التواصل' : 'Communication Language'}</InputLabel>
                        <Select
                          {...field}
                          value={field.value || ''}
                          label={isRTL ? 'لغة التواصل' : 'Communication Language'}
                        >
                          <MenuItem value="ar">{isRTL ? 'العربية' : 'Arabic'}</MenuItem>
                          <MenuItem value="en">{isRTL ? 'الإنجليزية' : 'English'}</MenuItem>
                          <MenuItem value="ar_en">{isRTL ? 'العربية والإنجليزية' : 'Arabic & English'}</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Lifestyle Preferences */}
              <Card 
                variant="outlined" 
                sx={{ 
                  borderColor: theme.palette.primary.main + '40',
                  backgroundColor: theme.palette.mode === 'dark' ? '#252525' : '#fafafa',
                }}
              >
                <CardContent>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      mb: 3,
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Coffee />
                    {isRTL ? 'تفضيلات نمط الحياة' : 'Lifestyle Preferences'}
                  </Typography>
                  
                  {/* Favorite Drinks */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      {isRTL ? 'المشروبات المفضلة' : 'Favorite Drinks'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                      {watch('preferences.favoriteDrinks')?.map((drink, index) => (
                        <Chip
                          key={index}
                          label={drink}
                          onDelete={() => {
                            const current = watch('preferences.favoriteDrinks') || [];
                            setValue('preferences.favoriteDrinks', current.filter((_, i) => i !== index));
                          }}
                          sx={{
                            backgroundColor: '#2196f3' + '20',
                            color: '#2196f3',
                            borderColor: '#2196f3',
                            border: '1px solid',
                            '& .MuiChip-deleteIcon': {
                              color: '#2196f3',
                            },
                          }}
                        />
                      ))}
                    </Box>
                    <Autocomplete
                      freeSolo
                      options={COMMON_DRINKS.map((d) => isRTL ? d.label : d.labelEn)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder={isRTL ? 'أدخل مشروب واضغط Enter' : 'Type a drink and press Enter'}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <Coffee sx={{ mr: 1, color: 'text.secondary' }} />,
                          }}
                        />
                      )}
                      value={drinkInput}
                      onChange={(_, value) => setDrinkInput(value || '')}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && drinkInput.trim()) {
                          e.preventDefault();
                          const current = watch('preferences.favoriteDrinks') || [];
                          if (!current.includes(drinkInput.trim())) {
                            setValue('preferences.favoriteDrinks', [...current, drinkInput.trim()]);
                          }
                          setDrinkInput('');
                        }
                      }}
                    />
                  </Box>

                  {/* Beverage Temperature */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      {isRTL ? 'درجة حرارة المشروبات' : 'Beverage Temperature'}
                    </Typography>
                    <Controller
                      name="preferences.refreshments.beverageTemperature"
                      control={control}
                      render={({ field }) => (
                        <ToggleButtonGroup
                          {...field}
                          exclusive
                          sx={{ width: '100%' }}
                        >
                          <ToggleButton value="ice_cold" sx={{ flex: 1 }}>
                            🧊 {isRTL ? 'مثلج' : 'Ice Cold'}
                          </ToggleButton>
                          <ToggleButton value="cold" sx={{ flex: 1 }}>
                            ❄️ {isRTL ? 'بارد' : 'Cold'}
                          </ToggleButton>
                          <ToggleButton value="room_temp" sx={{ flex: 1 }}>
                            🌡️ {isRTL ? 'عادي' : 'Room Temp'}
                          </ToggleButton>
                          <ToggleButton value="warm" sx={{ flex: 1 }}>
                            ☕ {isRTL ? 'دافئ' : 'Warm'}
                          </ToggleButton>
                          <ToggleButton value="hot" sx={{ flex: 1 }}>
                            🔥 {isRTL ? 'ساخن' : 'Hot'}
                          </ToggleButton>
                        </ToggleButtonGroup>
                      )}
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Music & Ambiance */}
              <Card 
                variant="outlined" 
                sx={{ 
                  borderColor: theme.palette.primary.main + '40',
                  backgroundColor: theme.palette.mode === 'dark' ? '#252525' : '#fafafa',
                }}
              >
                <CardContent>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      mb: 3,
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <MusicNote />
                    {isRTL ? 'الموسيقى والجو' : 'Music & Ambiance'}
                  </Typography>
                  
                  {/* Music Preference */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      {isRTL ? 'تفضيل الموسيقى' : 'Music Preference'}
                    </Typography>
                    <Controller
                      name="preferences.musicPreferences.preference"
                      control={control}
                      render={({ field }) => (
                        <RadioGroup {...field} row>
                          <FormControlLabel value="no_music" control={<Radio />} label={isRTL ? 'بدون موسيقى' : 'No Music'} />
                          <FormControlLabel value="background" control={<Radio />} label={isRTL ? 'موسيقى هادئة' : 'Background'} />
                          <FormControlLabel value="engaged" control={<Radio />} label={isRTL ? 'مستمع نشط' : 'Engaged Listener'} />
                        </RadioGroup>
                      )}
                    />
                  </Box>

                  {/* Music Genres */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      {isRTL ? 'أنواع الموسيقى المفضلة' : 'Favorite Music Genres'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {MUSIC_GENRES.map((genre) => {
                        const isSelected = watch('preferences.musicPreferences.genres')?.includes(genre.value);
                        return (
                          <Chip
                            key={genre.value}
                            label={isRTL ? genre.label : genre.labelEn}
                            onClick={() => {
                              const current = watch('preferences.musicPreferences.genres') || [];
                              if (isSelected) {
                                setValue('preferences.musicPreferences.genres', current.filter(g => g !== genre.value));
                              } else {
                                setValue('preferences.musicPreferences.genres', [...current, genre.value]);
                              }
                            }}
                            sx={{
                              backgroundColor: isSelected ? '#9c27b0' + '20' : 'transparent',
                              color: isSelected ? '#9c27b0' : 'text.primary',
                              borderColor: '#9c27b0',
                              border: '1px solid',
                              cursor: 'pointer',
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>

                  {/* Volume Preference */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      {isRTL ? 'مستوى الصوت' : 'Volume Preference'}
                    </Typography>
                    <Controller
                      name="preferences.musicPreferences.volume"
                      control={control}
                      render={({ field }) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <VolumeOff />
                          <Slider
                            value={field.value === 'quiet' ? 1 : field.value === 'moderate' ? 2 : 3}
                            onChange={(_, value) => {
                              field.onChange(value === 1 ? 'quiet' : value === 2 ? 'moderate' : 'loud');
                            }}
                            min={1}
                            max={3}
                            marks={[
                              { value: 1, label: isRTL ? 'هادئ' : 'Quiet' },
                              { value: 2, label: isRTL ? 'متوسط' : 'Moderate' },
                              { value: 3, label: isRTL ? 'عالي' : 'Loud' },
                            ]}
                            sx={{ flex: 1 }}
                          />
                          <VolumeUp />
                        </Box>
                      )}
                    />
                  </Box>

                  {/* Temperature Preference */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      {isRTL ? 'درجة حرارة الغرفة' : 'Room Temperature'}
                    </Typography>
                    <Controller
                      name="preferences.temperaturePreference"
                      control={control}
                      render={({ field }) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <span>❄️</span>
                          <Slider
                            value={
                              field.value === 'cold' ? 1 : 
                              field.value === 'cool' ? 2 : 
                              field.value === 'moderate' ? 3 : 
                              field.value === 'warm' ? 4 : 5
                            }
                            onChange={(_, value) => {
                              const temps = ['cold', 'cool', 'moderate', 'warm', 'hot'];
                              field.onChange(temps[value - 1]);
                            }}
                            min={1}
                            max={5}
                            marks={[
                              { value: 1, label: isRTL ? 'بارد' : 'Cold' },
                              { value: 3, label: isRTL ? 'معتدل' : 'Moderate' },
                              { value: 5, label: isRTL ? 'حار' : 'Hot' },
                            ]}
                            sx={{ flex: 1 }}
                          />
                          <span>🔥</span>
                        </Box>
                      )}
                    />
                  </Box>

                  {/* Aromatherapy */}
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                      {isRTL ? 'العطور المفضلة' : 'Aromatherapy Preferences'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {AROMATHERAPY_SCENTS.map((scent) => {
                        const isSelected = watch('preferences.aromatherapy')?.includes(scent.value);
                        return (
                          <Chip
                            key={scent.value}
                            label={isRTL ? scent.label : scent.labelEn}
                            onClick={() => {
                              const current = watch('preferences.aromatherapy') || [];
                              if (isSelected) {
                                setValue('preferences.aromatherapy', current.filter(s => s !== scent.value));
                              } else {
                                setValue('preferences.aromatherapy', [...current, scent.value]);
                              }
                            }}
                            sx={{
                              backgroundColor: isSelected ? '#e91e63' + '20' : 'transparent',
                              color: isSelected ? '#e91e63' : 'text.primary',
                              borderColor: '#e91e63',
                              border: '1px solid',
                              cursor: 'pointer',
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Special Requests */}
              <Card 
                variant="outlined" 
                sx={{ 
                  borderColor: theme.palette.primary.main + '40',
                  backgroundColor: theme.palette.mode === 'dark' ? '#252525' : '#fafafa',
                }}
              >
                <CardContent>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      mb: 2,
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                    }}
                  >
                    {isRTL ? 'طلبات خاصة' : 'Special Requests'}
                  </Typography>
                  <Controller
                    name="preferences.specialRequests"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        multiline
                        rows={4}
                        placeholder={isRTL ? 'أي طلبات أو تفضيلات خاصة...' : 'Any special requests or preferences...'}
                      />
                    )}
                  />
                </CardContent>
              </Card>
            </Stack>
          </TabPanel>
          </LocalizationProvider>
        </DialogContent>

        <DialogActions
          sx={{
            backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f5f5f5',
            borderTop: `1px solid ${theme.palette.divider}`,
            px: 3,
            py: 2,
          }}
        >
          <Button 
            onClick={handleClose} 
            disabled={loading}
            sx={{
              color: theme.palette.text.secondary,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          {!isViewMode && (
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <Save />}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: '#fff',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
                '&.Mui-disabled': {
                  backgroundColor: theme.palette.action.disabledBackground,
                },
              }}
            >
              {mode === 'add'
                ? (isRTL ? 'إضافة' : 'Add')
                : (isRTL ? 'حفظ' : 'Save')}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
    </>
  );
};

export default ClientForm;