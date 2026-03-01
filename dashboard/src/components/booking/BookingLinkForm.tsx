import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  TextField,
  FormControl,
  FormLabel,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Typography,
  IconButton,
  Chip,
  FormHelperText,
  Radio,
  RadioGroup,
} from '@mui/material';
import { Close, ContentCopy } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { bookingLinkService } from '../../services/bookingLink.service';
import type { BookingLink } from '../../services/bookingLink.service';
import { staffService } from '../../services/staff.service';
import type { Staff } from '../../services/staff.service';
import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';
import { getBookingAppUrl } from '../../config/urls';

interface BookingLinkFormProps {
  open: boolean;
  link: BookingLink | null;
  onClose: () => void;
  onSuccess: () => void;
}

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
      id={`booking-link-tabpanel-${index}`}
      aria-labelledby={`booking-link-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

const schema = yup.object().shape({
  name: yup.string().required('Name is required'),
  slug: yup.string().required('URL slug is required').matches(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
  type: yup.string().oneOf(['company', 'general', 'employee']).required('Type is required'),
  employeeId: yup.string().when('type', {
    is: 'employee',
    then: (schema) => schema.required('Employee is required'),
    otherwise: (schema) => schema.optional(),
  }),
  description: yup.string().optional(),
  isMain: yup.boolean(),
  isActive: yup.boolean(),
  branchSettings: yup.object().shape({
    mode: yup.string().oneOf(['single', 'multi']).required('Branch mode is required'),
    allowedBranches: yup.array().of(yup.string()).min(1, 'At least one branch must be selected'),
    defaultBranch: yup.string().when('mode', {
      is: 'single',
      then: (schema) => schema.required('Default branch is required for single branch mode'),
      otherwise: (schema) => schema.optional(),
    }),
  }),
  settings: yup.object().shape({
    defaultLanguage: yup.string().required('Default language is required'),
    mapType: yup.string().oneOf(['google', 'osm']).required(),
    bookingFlow: yup.string().oneOf(['stepByStep', 'shortStep', 'menu']).required(),
    stepsOrder: yup.array().of(yup.string()),
    theme: yup.string().oneOf(['light', 'dark']).required(),
    primaryColor: yup.string().required(),
    coverImage: yup.string().optional(),
    allowMultipleBookings: yup.boolean(),
    maxBookingsPerSession: yup.number().min(1).max(10),
    showGroupEvents: yup.boolean(),
    groupEventsDisplay: yup.string().oneOf(['allOnPage', 'byDays']),
  }),
});

type FormData = yup.InferType<typeof schema>;

const BookingLinkForm: React.FC<BookingLinkFormProps> = ({
  open,
  link,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { branches, currentBranch } = useBranch();
  const [tabValue, setTabValue] = useState(0);
  const [employees, setEmployees] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');
  const isRTL = theme.direction === 'rtl';

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      type: 'general',
      employeeId: '',
      description: '',
      isMain: false,
      isActive: true,
      branchSettings: {
        mode: 'single',
        allowedBranches: currentBranch ? [currentBranch.id] : [],
        defaultBranch: currentBranch?.id || '',
      },
      settings: {
        defaultLanguage: isRTL ? 'ar' : 'en',
        mapType: 'google',
        bookingFlow: 'stepByStep',
        stepsOrder: ['service', 'employee', 'datetime'],
        theme: 'light',
        primaryColor: '#FF6B00',
        coverImage: '',
        allowMultipleBookings: false,
        maxBookingsPerSession: 1,
        showGroupEvents: false,
        groupEventsDisplay: 'allOnPage',
      },
    },
  });

  const watchedType = watch('type');
  const watchedSlug = watch('slug');
  const watchedBranchMode = watch('branchSettings.mode');

  useEffect(() => {
    if (link) {
      reset({
        ...link,
        branchSettings: link.branchSettings || {
          mode: 'single',
          allowedBranches: link.branchId ? [link.branchId] : (currentBranch ? [currentBranch.id] : []),
          defaultBranch: link.branchId || currentBranch?.id || '',
        },
        settings: {
          ...link.settings,
        },
      });
      setGeneratedUrl(link.fullUrl || '');
    }
  }, [link, reset, currentBranch]);

  useEffect(() => {
    loadEmployees();
  }, [currentUser]);

  // Handle branch mode changes
  useEffect(() => {
    const currentValues = watch();
    
    if (watchedBranchMode === 'multi') {
      const currentAllowedBranches = currentValues.branchSettings?.allowedBranches;
      if (!Array.isArray(currentAllowedBranches) || currentAllowedBranches.length === 0) {
        // If not an array or empty, initialize with current branch or default branch
        const defaultBranch = currentValues.branchSettings?.defaultBranch;
        const newAllowedBranches = defaultBranch ? [defaultBranch] : (currentBranch ? [currentBranch.id] : []);
        
        reset({
          ...currentValues,
          branchSettings: {
            ...currentValues.branchSettings,
            mode: 'multi',
            allowedBranches: newAllowedBranches,
          },
        });
      }
    } else if (watchedBranchMode === 'single') {
      // When switching to single mode, ensure defaultBranch is set
      const currentDefaultBranch = currentValues.branchSettings?.defaultBranch;
      if (!currentDefaultBranch) {
        const firstAllowedBranch = currentValues.branchSettings?.allowedBranches?.[0];
        reset({
          ...currentValues,
          branchSettings: {
            ...currentValues.branchSettings,
            mode: 'single',
            defaultBranch: firstAllowedBranch || currentBranch?.id || '',
            allowedBranches: [], // Clear this for single mode
          },
        });
      }
    }
  }, [watchedBranchMode, watch, reset, currentBranch]);

  useEffect(() => {
    // Generate URL preview
    if (watchedSlug && currentUser) {
      generateUrlPreview();
    }
  }, [watchedSlug, currentUser]);

  const loadEmployees = async () => {
    if (!currentUser) return;

    try {
      const companyId = currentUser?.companyId;

      if (companyId) {
        const staffList = await staffService.getStaff(companyId);
        setEmployees(staffList);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const generateUrlPreview = async () => {
    if (!currentUser) return;

    try {
      const companyId = currentUser?.companyId;

      // Get company data to get the slug
      const response = await apiClient.get<ApiResponse<any>>(`/companies/${companyId}`);
      const companyData = response.data.data;

      if (companyData && companyData.slug) {
        setGeneratedUrl(`${getBookingAppUrl()}/book/${companyData.slug}/${watchedSlug}`);
      }
    } catch (error) {
      console.error('Error generating URL preview:', error);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const companyId = currentUser?.companyId;

      // Map form data to full BookingLink structure
      const bookingLinkData: any = {
        ...data,
        createdBy: currentUser?.id,
        branchSettings: {
          ...data.branchSettings,
          // Ensure allowedBranches is always an array
          allowedBranches: Array.isArray(data.branchSettings.allowedBranches) 
            ? data.branchSettings.allowedBranches 
            : [],
        },
        settings: {
          ...data.settings,
          // Add default values for required settings fields
          serviceDisplay: 'horizontal' as const,
          showServiceCategories: true,
          showServicePrices: true,
          showServiceDuration: true,
          showEmployeePhotos: true,
          showEmployeeRatings: true,
          allowAnyEmployee: true,
          timeSlotInterval: 30,
          showMorningSlots: true,
          showAfternoonSlots: true,
          showEveningSlots: true,
        },
      };
      
      // Only add branchId for single branch mode
      if (data.branchSettings.mode === 'single' && data.branchSettings.defaultBranch) {
        bookingLinkData.branchId = data.branchSettings.defaultBranch;
      }

      if (link) {
        await bookingLinkService.updateBookingLink(link.id!, bookingLinkData);
      } else {
        await bookingLinkService.createBookingLink(companyId, bookingLinkData);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving booking link:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(generatedUrl);
    // TODO: Show success snackbar
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {link
              ? isRTL ? 'تعديل رابط الحجز' : 'Edit Booking Link'
              : isRTL ? 'رابط حجز جديد' : 'New Booking Link'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit as any)}>
        <DialogContent dividers>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label={isRTL ? 'معلومات أساسية' : 'Basic Information'} />
            <Tab label={isRTL ? 'التصميم' : 'Design'} />
            <Tab label={isRTL ? 'تدفق الحجز' : 'Booking Flow'} />
            <Tab label={isRTL ? 'الإعدادات المتقدمة' : 'Advanced Settings'} />
          </Tabs>

          {/* Basic Information Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 100%' }}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={isRTL ? 'اسم الرابط' : 'Link Name'}
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Controller
                  name="slug"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={isRTL ? 'معرف URL' : 'URL Slug'}
                      error={!!errors.slug}
                      helperText={errors.slug?.message}
                      onChange={(e) => {
                        const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        field.onChange(value);
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.type}>
                      <InputLabel>{isRTL ? 'نوع الرابط' : 'Link Type'}</InputLabel>
                      <Select {...field} label={isRTL ? 'نوع الرابط' : 'Link Type'}>
                        <MenuItem value="company">{isRTL ? 'رابط الشركة' : 'Company Link'}</MenuItem>
                        <MenuItem value="general">{isRTL ? 'رابط عام' : 'General Link'}</MenuItem>
                        <MenuItem value="employee">{isRTL ? 'رابط موظف' : 'Employee Link'}</MenuItem>
                      </Select>
                      {errors.type && <FormHelperText>{errors.type.message}</FormHelperText>}
                    </FormControl>
                  )}
                />
              </Box>

              {watchedType === 'employee' && (
                <Box sx={{ flex: '1 1 100%' }}>
                  <Controller
                    name="employeeId"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth error={!!errors.employeeId}>
                        <InputLabel>{isRTL ? 'الموظف' : 'Employee'}</InputLabel>
                        <Select {...field} label={isRTL ? 'الموظف' : 'Employee'}>
                          {employees.map((employee) => (
                            <MenuItem key={employee.id} value={employee.id}>
                              {employee.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.employeeId && <FormHelperText>{errors.employeeId.message}</FormHelperText>}
                      </FormControl>
                    )}
                  />
                </Box>
              )}

              <Box sx={{ flex: '1 1 100%' }}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      multiline
                      rows={3}
                      label={isRTL ? 'الوصف' : 'Description'}
                      error={!!errors.description}
                      helperText={errors.description?.message}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" gutterBottom>
                  {isRTL ? 'إعدادات الفروع' : 'Branch Settings'}
                </Typography>
                <Controller
                  name="branchSettings.mode"
                  control={control}
                  render={({ field }) => (
                    <FormControl component="fieldset" sx={{ mb: 2 }}>
                      <FormLabel component="legend">
                        {isRTL ? 'نوع الرابط' : 'Link Type'}
                      </FormLabel>
                      <RadioGroup {...field} row>
                        <FormControlLabel
                          value="single"
                          control={<Radio />}
                          label={isRTL ? 'فرع واحد' : 'Single Branch'}
                        />
                        <FormControlLabel
                          value="multi"
                          control={<Radio />}
                          label={isRTL ? 'متعدد الفروع' : 'Multi-Branch'}
                        />
                      </RadioGroup>
                    </FormControl>
                  )}
                />
                
                {watchedBranchMode === 'single' ? (
                  <Controller
                    name="branchSettings.defaultBranch"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>{isRTL ? 'الفرع' : 'Branch'}</InputLabel>
                        <Select {...field} label={isRTL ? 'الفرع' : 'Branch'}>
                          {branches.map((branch) => (
                            <MenuItem key={branch.id} value={branch.id}>
                              {branch.name}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors.branchSettings?.defaultBranch && (
                          <FormHelperText error>
                            {errors.branchSettings.defaultBranch.message}
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}
                  />
                ) : (
                  <Controller
                    name="branchSettings.allowedBranches"
                    control={control}
                    render={({ field }) => {
                      // Ensure value is always an array
                      const fieldValue = Array.isArray(field.value) ? field.value : [];
                      
                      return (
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>{isRTL ? 'الفروع المسموحة' : 'Allowed Branches'}</InputLabel>
                          <Select
                            {...field}
                            value={fieldValue}
                            multiple
                            label={isRTL ? 'الفروع المسموحة' : 'Allowed Branches'}
                            renderValue={(selected) => (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {(Array.isArray(selected) ? selected : []).map((value) => (
                                  <Chip
                                    key={value}
                                    label={branches.find(b => b.id === value)?.name || value}
                                    size="small"
                                  />
                                ))}
                              </Box>
                            )}
                          >
                            {branches.map((branch) => (
                              <MenuItem key={branch.id} value={branch.id}>
                                {branch.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {errors.branchSettings?.allowedBranches && (
                            <FormHelperText error>
                              {errors.branchSettings.allowedBranches.message}
                            </FormHelperText>
                          )}
                        </FormControl>
                      );
                    }}
                  />
                )}
              </Box>

              <Box sx={{ flex: '1 1 100%' }}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'background.default', 
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Typography variant="body2" color="textSecondary">
                    {isRTL ? 'رابط الحجز:' : 'Booking URL:'}
                  </Typography>
                  <Typography variant="body2" sx={{ flex: 1, fontFamily: 'monospace' }}>
                    {generatedUrl || '...'}
                  </Typography>
                  <IconButton size="small" onClick={handleCopyUrl} disabled={!generatedUrl}>
                    <ContentCopy fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Controller
                  name="isMain"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label={isRTL ? 'رابط رئيسي' : 'Main Link'}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label={isRTL ? 'نشط' : 'Active'}
                    />
                  )}
                />
              </Box>
            </Box>
          </TabPanel>

          {/* Design Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Controller
                  name="settings.theme"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>{isRTL ? 'المظهر' : 'Theme'}</InputLabel>
                      <Select {...field} label={isRTL ? 'المظهر' : 'Theme'}>
                        <MenuItem value="light">{isRTL ? 'فاتح' : 'Light'}</MenuItem>
                        <MenuItem value="dark">{isRTL ? 'داكن' : 'Dark'}</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Controller
                  name="settings.primaryColor"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={isRTL ? 'اللون الأساسي' : 'Primary Color'}
                      type="color"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%' }}>
                <Controller
                  name="settings.coverImage"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label={isRTL ? 'صورة الغلاف URL' : 'Cover Image URL'}
                      placeholder="https://example.com/image.jpg"
                    />
                  )}
                />
              </Box>
            </Box>
          </TabPanel>

          {/* Booking Flow Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: '1 1 100%' }}>
                <Controller
                  name="settings.bookingFlow"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>{isRTL ? 'تدفق الحجز' : 'Booking Flow'}</InputLabel>
                      <Select {...field} label={isRTL ? 'تدفق الحجز' : 'Booking Flow'}>
                        <MenuItem value="stepByStep">{isRTL ? 'خطوة بخطوة' : 'Step by Step'}</MenuItem>
                        <MenuItem value="shortStep">{isRTL ? 'خطوات قصيرة' : 'Short Steps'}</MenuItem>
                        <MenuItem value="menu">{isRTL ? 'قائمة' : 'Menu'}</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              <Box sx={{ flex: '1 1 100%' }}>
                <Typography variant="subtitle2" gutterBottom>
                  {isRTL ? 'ترتيب الخطوات' : 'Steps Order'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {watch('settings.stepsOrder')?.map((step, index) => (
                    <Chip
                      key={index}
                      label={step}
                      color="primary"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>

              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Controller
                  name="settings.allowMultipleBookings"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label={isRTL ? 'السماح بحجوزات متعددة' : 'Allow Multiple Bookings'}
                    />
                  )}
                />
              </Box>

              {watch('settings.allowMultipleBookings') && (
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                  <Controller
                    name="settings.maxBookingsPerSession"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        type="number"
                        label={isRTL ? 'الحد الأقصى للحجوزات' : 'Max Bookings Per Session'}
                        slotProps={{ htmlInput: { min: 1, max: 10 } }}
                      />
                    )}
                  />
                </Box>
              )}
            </Box>
          </TabPanel>

          {/* Advanced Settings Tab */}
          <TabPanel value={tabValue} index={3}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Controller
                  name="settings.defaultLanguage"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>{isRTL ? 'اللغة الافتراضية' : 'Default Language'}</InputLabel>
                      <Select {...field} label={isRTL ? 'اللغة الافتراضية' : 'Default Language'}>
                        <MenuItem value="en">English</MenuItem>
                        <MenuItem value="ar">العربية</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Controller
                  name="settings.mapType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>{isRTL ? 'نوع الخريطة' : 'Map Type'}</InputLabel>
                      <Select {...field} label={isRTL ? 'نوع الخريطة' : 'Map Type'}>
                        <MenuItem value="google">Google Maps</MenuItem>
                        <MenuItem value="osm">OpenStreetMap</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>

              <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                <Controller
                  name="settings.showGroupEvents"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label={isRTL ? 'عرض الأحداث الجماعية' : 'Show Group Events'}
                    />
                  )}
                />
              </Box>

              {watch('settings.showGroupEvents') && (
                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 12px)' } }}>
                  <Controller
                    name="settings.groupEventsDisplay"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>{isRTL ? 'عرض الأحداث الجماعية' : 'Group Events Display'}</InputLabel>
                        <Select {...field} label={isRTL ? 'عرض الأحداث الجماعية' : 'Group Events Display'}>
                          <MenuItem value="allOnPage">{isRTL ? 'الكل في صفحة واحدة' : 'All on Page'}</MenuItem>
                          <MenuItem value="byDays">{isRTL ? 'حسب الأيام' : 'By Days'}</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Box>
              )}
            </Box>
          </TabPanel>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading
              ? isRTL ? 'جاري الحفظ...' : 'Saving...'
              : link
              ? isRTL ? 'تحديث' : 'Update'
              : isRTL ? 'إنشاء' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default BookingLinkForm;