import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  IconButton,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  useTheme,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListItemText,
  Tooltip,
  Autocomplete,
  FormHelperText,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  LocationOn,
  Phone,
  Email,
  Business,
  Settings,
  AttachMoney,
  CheckCircleOutline,
  Schedule,
  Map,
  MoreHoriz,
  People,
  Category,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAuth } from '../../../contexts/AuthContext';
import { useBranch } from '../../../contexts/BranchContext';
import { branchService, type Branch, type PhoneNumber } from '../../../services/branch.service';
import { staffService, type Staff } from '../../../services/staff.service';
import { serviceService, type Service } from '../../../services/service.service';
import { resourceService, type Resource } from '../../../services/resource.service';

const BranchFormPage: React.FC = () => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const navigate = useNavigate();
  const { branchId } = useParams();
  const { currentUser } = useAuth();
  const { refreshBranches } = useBranch();
  
  const isEditMode = !!branchId;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // Available data from main branch
  const [availableStaff, setAvailableStaff] = useState<Staff[]>([]);
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  
  // Form data
  const [formData, setFormData] = useState<Partial<Branch>>({
    name: '',
    type: 'secondary',
    status: 'active',
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Egypt',
    },
    contact: {
      phones: [{
        countryCode: '+20',
        number: '',
        type: 'main',
      }],
      email: '',
    },
    operatingHours: {
      sunday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    },
    settings: {
      allowOnlineBooking: true,
      autoConfirmAppointments: false,
      requireDepositForBooking: false,
      taxRate: 0,
      timeSlotInterval: 30,
      advanceBookingDays: 30,
      cancellationHours: 24,
    },
    staff: [],
    services: [],
    resources: [],
    paymentMethods: {
      cash: true,
      card: false,
      bankTransfer: false,
      other: false,
    },
    workingDays: {
      sunday: true,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
    },
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const cId = currentUser?.companyId;

        if (!cId) {
          toast.error(isRTL ? 'لم يتم العثور على معرف الشركة' : 'Company ID not found');
          navigate('/settings/branches');
          return;
        }

        setCompanyId(cId);
        
        // Load available data from main branch
        try {
          const [staffData, servicesData, resourcesData] = await Promise.all([
            staffService.getStaff(cId),
            serviceService.getServices(cId),
            resourceService.getResources(cId),
          ]);
          
          console.log('Staff data:', staffData); // Debug log
          console.log('Services data:', servicesData); // Debug log
          
          // Staff service returns array directly
          setAvailableStaff(staffData || []);
          // Service service returns array directly
          setAvailableServices(servicesData || []);
          setAvailableResources(resourcesData || []);
        } catch (error) {
          console.error('Error loading available data:', error);
        }

        // Load branch data if editing
        if (isEditMode && branchId) {
          const branch = await branchService.getBranch(cId, branchId);
          if (branch) {
            setFormData(branch);
          } else {
            toast.error(isRTL ? 'الفرع غير موجود' : 'Branch not found');
            navigate('/settings/branches');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error(isRTL ? 'حدث خطأ في تحميل البيانات' : 'Error loading data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, isEditMode, branchId, isRTL, navigate]);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Basic Info
        if (!formData.name?.trim()) {
          newErrors.name = isRTL ? 'اسم الفرع مطلوب' : 'Branch name is required';
        }
        break;
      
      case 1: // Location
        if (!formData.address?.street?.trim()) {
          newErrors.street = isRTL ? 'العنوان مطلوب' : 'Address is required';
        }
        if (!formData.address?.city?.trim()) {
          newErrors.city = isRTL ? 'المدينة مطلوبة' : 'City is required';
        }
        if (!formData.contact?.phones?.[0]?.number?.trim()) {
          newErrors.phone = isRTL ? 'رقم الهاتف مطلوب' : 'Phone number is required';
        }
        break;
      
      case 2: // Working Hours
        // Check if at least one day is selected
        const hasWorkingDays = Object.values(formData.workingDays || {}).some(v => v);
        if (!hasWorkingDays) {
          newErrors.workingDays = isRTL ? 'يجب اختيار يوم عمل واحد على الأقل' : 'At least one working day must be selected';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSave = async () => {
    if (!companyId) return;

    // Validate all required steps (0, 1, 2 are required)
    let isValid = true;
    for (let i = 0; i <= 2; i++) {
      if (!validateStep(i)) {
        isValid = false;
        setActiveStep(i);
        break;
      }
    }

    if (!isValid) return;

    try {
      setSaving(true);

      if (isEditMode && branchId) {
        await branchService.updateBranch(companyId, branchId, formData);
        toast.success(isRTL ? 'تم تحديث الفرع بنجاح' : 'Branch updated successfully');
        await refreshBranches();
        navigate('/settings/branches');
      } else {
        // Check if can add branch
        const canAdd = await branchService.canAddBranch(companyId);
        if (!canAdd) {
          toast.error(isRTL ? 'لقد وصلت إلى الحد الأقصى من الفروع' : 'You have reached the maximum number of branches');
          return;
        }

        const newBranchId = await branchService.createBranch(companyId, formData as Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>);
        toast.success(isRTL ? 'تم إنشاء الفرع بنجاح' : 'Branch created successfully');
        
        // Navigate to the newly created branch edit page
        await refreshBranches();
        navigate(`/settings/branches/${newBranchId}/edit`);
      }
    } catch (error: any) {
      console.error('Error saving branch:', error);
      toast.error(error.message || (isRTL ? 'حدث خطأ في حفظ الفرع' : 'Error saving branch'));
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      label: isRTL ? 'المعلومات الأساسية' : 'Basic Information',
      icon: <Business />,
      description: isRTL ? 'اسم الفرع والحالة' : 'Branch name and status',
    },
    {
      label: isRTL ? 'الموقع والاتصال' : 'Location & Contact',
      icon: <LocationOn />,
      description: isRTL ? 'العنوان وتفاصيل الاتصال' : 'Address and contact details',
    },
    {
      label: isRTL ? 'ساعات العمل' : 'Working Hours',
      icon: <Schedule />,
      description: isRTL ? 'أيام وأوقات العمل' : 'Working days and hours',
    },
    {
      label: isRTL ? 'الموظفون والخدمات' : 'Staff & Services',
      icon: <People />,
      description: isRTL ? 'تعيين الموظفين والخدمات' : 'Assign staff and services',
    },
    {
      label: isRTL ? 'الموارد' : 'Resources',
      icon: <Category />,
      description: isRTL ? 'الغرف والمعدات' : 'Rooms and equipment',
    },
    {
      label: isRTL ? 'طرق الدفع' : 'Payment Methods',
      icon: <AttachMoney />,
      description: isRTL ? 'طرق الدفع المقبولة' : 'Accepted payment methods',
    },
    {
      label: isRTL ? 'الإعدادات المتقدمة' : 'Advanced Settings',
      icon: <Settings />,
      description: isRTL ? 'إعدادات الحجز والإلغاء' : 'Booking and cancellation settings',
    },
  ];
  
  // Calculate progress
  const progress = useMemo(() => {
    const totalSteps = steps.length;
    const completedSteps = activeStep;
    return Math.round((completedSteps / totalSteps) * 100);
  }, [activeStep, steps.length]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
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
      <Box sx={{ px: { xs: 2, md: 3 }, py: 3, maxWidth: '1600px', mx: 'auto' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton
            onClick={() => navigate('/settings/branches')}
            sx={{
              backgroundColor: theme.palette.action.hover,
              '&:hover': { backgroundColor: theme.palette.action.selected },
            }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {isEditMode 
              ? (isRTL ? 'تعديل الفرع' : 'Edit Branch')
              : (isRTL ? 'إضافة فرع جديد' : 'Add New Branch')}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} lg={2} sx={{ display: { xs: 'none', lg: 'block' } }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step, index) => (
                <Step key={index}>
                  <StepLabel 
                    StepIconComponent={() => (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 
                            activeStep > index ? theme.palette.success.main :
                            activeStep === index ? theme.palette.primary.main :
                            theme.palette.action.disabledBackground,
                          color: activeStep >= index ? 'white' : theme.palette.text.disabled,
                        }}
                      >
                        {activeStep > index ? <CheckCircleOutline /> : step.icon}
                      </Box>
                    )}
                  >
                    <Box>
                      <Typography variant="subtitle2">{step.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {step.description}
                      </Typography>
                    </Box>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Grid>

          <Grid item xs={12} lg={10}>
            <Paper sx={{ p: { xs: 2, md: 4 } }}>
              {/* Progress Bar */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'التقدم' : 'Progress'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {progress}%
                  </Typography>
                </Box>
                <Box sx={{ width: '100%', bgcolor: 'action.hover', borderRadius: 1, height: 8 }}>
                  <Box
                    sx={{
                      width: `${progress}%`,
                      bgcolor: 'primary.main',
                      borderRadius: 1,
                      height: '100%',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
              </Box>
              {activeStep === 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    {isRTL ? 'المعلومات الأساسية' : 'Basic Information'}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={isRTL ? 'اسم الفرع' : 'Branch Name'}
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        error={!!errors.name}
                        helperText={errors.name}
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.type === 'main'}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              type: e.target.checked ? 'main' : 'secondary' 
                            })}
                            disabled={isEditMode} // Can't change type when editing
                          />
                        }
                        label={isRTL ? 'فرع رئيسي' : 'Main Branch'}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.status === 'active'}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              status: e.target.checked ? 'active' : 'inactive' 
                            })}
                          />
                        }
                        label={isRTL ? 'نشط' : 'Active'}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {activeStep === 1 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    {isRTL ? 'الموقع والاتصال' : 'Location & Contact'}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={isRTL ? 'العنوان' : 'Street Address'}
                        value={formData.address?.street || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address!, street: e.target.value }
                        })}
                        error={!!errors.street}
                        helperText={errors.street}
                        required
                        multiline
                        rows={2}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={isRTL ? 'المدينة' : 'City'}
                        value={formData.address?.city || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address!, city: e.target.value }
                        })}
                        error={!!errors.city}
                        helperText={errors.city}
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={isRTL ? 'المحافظة' : 'State/Province'}
                        value={formData.address?.state || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address!, state: e.target.value }
                        })}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={isRTL ? 'الرمز البريدي' : 'Postal Code'}
                        value={formData.address?.postalCode || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          address: { ...formData.address!, postalCode: e.target.value }
                        })}
                      />
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label={isRTL ? 'رقم الهاتف' : 'Phone Number'}
                        value={formData.contact?.phones?.[0]?.number || ''}
                        onChange={(e) => {
                          const phones = [...(formData.contact?.phones || [])];
                          if (phones.length === 0) {
                            phones.push({ countryCode: '+20', number: '', type: 'main' });
                          }
                          phones[0].number = e.target.value;
                          setFormData({
                            ...formData,
                            contact: { ...formData.contact!, phones }
                          });
                        }}
                        error={!!errors.phone}
                        helperText={errors.phone}
                        required
                        InputProps={{
                          startAdornment: <Phone sx={{ mr: 1, color: 'action.active' }} />,
                        }}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label={isRTL ? 'البريد الإلكتروني' : 'Email'}
                        type="email"
                        value={formData.contact?.email || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          contact: { ...formData.contact!, email: e.target.value }
                        })}
                        InputProps={{
                          startAdornment: <Email sx={{ mr: 1, color: 'action.active' }} />,
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {activeStep === 2 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    {isRTL ? 'ساعات العمل' : 'Working Hours'}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {Object.entries(formData.workingDays || {}).map(([day, isWorking]) => (
                      <Grid item xs={12} key={day}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          p: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                        }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={isWorking}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  workingDays: {
                                    ...formData.workingDays,
                                    [day]: e.target.checked,
                                  },
                                })}
                              />
                            }
                            label={
                              <Typography sx={{ textTransform: 'capitalize' }}>
                                {isRTL ? 
                                  {
                                    sunday: 'الأحد',
                                    monday: 'الإثنين',
                                    tuesday: 'الثلاثاء',
                                    wednesday: 'الأربعاء',
                                    thursday: 'الخميس',
                                    friday: 'الجمعة',
                                    saturday: 'السبت',
                                  }[day] : day
                                }
                              </Typography>
                            }
                          />
                          
                          {isWorking && (
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                              <TextField
                                type="time"
                                size="small"
                                value={formData.operatingHours?.[day]?.openTime || '09:00'}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  operatingHours: {
                                    ...formData.operatingHours!,
                                    [day]: {
                                      ...formData.operatingHours![day],
                                      openTime: e.target.value,
                                    },
                                  },
                                })}
                              />
                              <Typography>-</Typography>
                              <TextField
                                type="time"
                                size="small"
                                value={formData.operatingHours?.[day]?.closeTime || '21:00'}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  operatingHours: {
                                    ...formData.operatingHours!,
                                    [day]: {
                                      ...formData.operatingHours![day],
                                      closeTime: e.target.value,
                                    },
                                  },
                                })}
                              />
                            </Box>
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  
                  {errors.workingDays && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {errors.workingDays}
                    </Alert>
                  )}
                </Box>
              )}

              {activeStep === 3 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    {isRTL ? 'الموظفون والخدمات' : 'Staff & Services'}
                  </Typography>
                  
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle1" sx={{ mb: 2 }}>
                      {isRTL ? 'الموظفون' : 'Staff'}
                    </Typography>
                    <Box sx={{ width: '100%' }}>
                      <Autocomplete
                            multiple
                            options={availableStaff}
                            getOptionLabel={(option) => option.name || ''}
                            value={availableStaff.filter(s => (formData.staff || []).includes(s.id!))}
                            onChange={(_, newValue) => {
                              setFormData({ 
                                ...formData, 
                                staff: newValue.map(s => s.id!).filter(Boolean)
                              });
                            }}
                            renderOption={(props, option) => (
                              <Box 
                                component="li" 
                                {...props} 
                                sx={{ 
                                  py: 1.5,
                                  px: 2,
                                  '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={(formData.staff || []).includes(option.id!)}
                                  sx={{ mr: 2 }}
                                />
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                                    {option.name}
                                  </Typography>
                                  {option.specialization && (
                                    <Typography variant="body2" color="text.secondary">
                                      {option.specialization}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            )}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder={isRTL ? 'اختر الموظفين' : 'Select Staff'}
                                helperText={`${(formData.staff || []).length} ${isRTL ? 'موظف مختار' : 'staff selected'}`}
                              />
                            )}
                            sx={{ 
                              width: '100%',
                              '& .MuiAutocomplete-listbox': {
                                maxWidth: 'none',
                                '& .MuiAutocomplete-option': {
                                  px: 0,
                                  py: 0,
                                },
                              },
                            }}
                            slotProps={{
                              paper: {
                                sx: {
                                  width: 'fit-content',
                                  maxWidth: '90vw',
                                }
                              }
                            }}
                            disableCloseOnSelect
                            ListboxProps={{
                              sx: { maxHeight: 300 }
                            }}
                          />
                    </Box>
                    {availableStaff.length === 0 && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        {isRTL 
                          ? 'لا يوجد موظفون متاحون. يمكنك إضافة موظفين من إعدادات الموظفين.'
                          : 'No staff available. You can add staff from the staff settings.'}
                      </Alert>
                    )}
                    
                    <Typography variant="subtitle1" sx={{ mb: 2, mt: 4 }}>
                      {isRTL ? 'الخدمات' : 'Services'}
                    </Typography>
                    <Box sx={{ width: '100%' }}>
                      <Autocomplete
                            multiple
                            options={availableServices}
                            getOptionLabel={(option) => option.name || ''}
                            value={availableServices.filter(s => (formData.services || []).includes(s.id!))}
                            onChange={(_, newValue) => {
                              setFormData({ 
                                ...formData, 
                                services: newValue.map(s => s.id!).filter(Boolean)
                              });
                            }}
                            groupBy={(option) => option.categoryName || (isRTL ? 'غير مصنف' : 'Uncategorized')}
                            renderOption={(props, option) => (
                              <Box 
                                component="li" 
                                {...props} 
                                sx={{ 
                                  py: 1.5,
                                  px: 2,
                                  '&:hover': {
                                    backgroundColor: theme.palette.action.hover,
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={(formData.services || []).includes(option.id!)}
                                  sx={{ mr: 2 }}
                                />
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                                    {option.name}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      <Schedule sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                      {option.duration?.hours || 0}h {option.duration?.minutes || 0}m
                                    </Typography>
                                    <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                                      {option.startingPrice} EGP
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                            )}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder={isRTL ? 'اختر الخدمات' : 'Select Services'}
                                helperText={`${(formData.services || []).length} ${isRTL ? 'خدمة مختارة' : 'services selected'}`}
                              />
                            )}
                            sx={{ 
                              width: '100%',
                              '& .MuiAutocomplete-listbox': {
                                maxWidth: 'none',
                                '& .MuiAutocomplete-option': {
                                  px: 0,
                                  py: 0,
                                },
                              },
                            }}
                            slotProps={{
                              paper: {
                                sx: {
                                  width: 'fit-content',
                                  maxWidth: '90vw',
                                }
                              }
                            }}
                            disableCloseOnSelect
                            ListboxProps={{
                              sx: { maxHeight: 300 }
                            }}
                          />
                    </Box>
                    {availableServices.length === 0 && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        {isRTL 
                          ? 'لا توجد خدمات متاحة. يمكنك إضافة خدمات من إعدادات الخدمات.'
                          : 'No services available. You can add services from the services settings.'}
                      </Alert>
                    )}
                  </Box>
                </Box>
              )}

              {activeStep === 4 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    {isRTL ? 'الموارد' : 'Resources'}
                  </Typography>
                  
                  <Card variant="outlined">
                    <CardContent>
                      <Autocomplete
                        multiple
                        options={availableResources}
                        getOptionLabel={(option) => option.name || ''}
                        value={availableResources.filter(r => (formData.resources || []).includes(r.id!))}
                        onChange={(_, newValue) => {
                          setFormData({ 
                            ...formData, 
                            resources: newValue.map(r => r.id!).filter(Boolean)
                          });
                        }}
                        renderOption={(props, option) => (
                          <Box 
                            component="li" 
                            {...props} 
                            sx={{ 
                              py: 1.5,
                              px: 2,
                              '&:hover': {
                                backgroundColor: theme.palette.action.hover,
                              }
                            }}
                          >
                            <Checkbox
                              checked={(formData.resources || []).includes(option.id!)}
                              sx={{ mr: 2 }}
                            />
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                                {option.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <People sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                                {isRTL ? 'السعة' : 'Capacity'}: {option.capacity}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            placeholder={isRTL ? 'اختر الموارد' : 'Select Resources'}
                            helperText={`${(formData.resources || []).length} ${isRTL ? 'مورد مختار' : 'resources selected'}`}
                          />
                        )}
                        sx={{ 
                          width: '100%',
                          '& .MuiAutocomplete-listbox': {
                            maxWidth: 'none',
                            '& .MuiAutocomplete-option': {
                              px: 0,
                              py: 0,
                            },
                          },
                        }}
                        slotProps={{
                          paper: {
                            sx: {
                              width: 'fit-content',
                              maxWidth: '90vw',
                            }
                          }
                        }}
                        disableCloseOnSelect
                        ListboxProps={{
                          sx: { maxHeight: 300 }
                        }}
                      />
                      
                      {availableResources.length === 0 && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          {isRTL 
                            ? 'لا توجد موارد متاحة. يمكنك إضافة موارد من إعدادات الموارد.'
                            : 'No resources available. You can add resources from the resources settings.'}
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              )}

              {activeStep === 5 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    {isRTL ? 'طرق الدفع' : 'Payment Methods'}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {Object.entries(formData.paymentMethods || {}).map(([method, enabled]) => (
                      <Grid item xs={12} sm={6} key={method}>
                        <Card 
                          variant="outlined"
                          sx={{ 
                            borderColor: enabled ? 'primary.main' : 'divider',
                            borderWidth: enabled ? 2 : 1,
                          }}
                        >
                          <CardContent>
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={enabled}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    paymentMethods: {
                                      ...formData.paymentMethods!,
                                      [method]: e.target.checked,
                                    },
                                  })}
                                />
                              }
                              label={
                                <Box>
                                  <Typography variant="subtitle2">
                                    {isRTL ? 
                                      {
                                        cash: 'نقدي',
                                        card: 'بطاقة ائتمان',
                                        bankTransfer: 'تحويل بنكي',
                                        other: 'أخرى',
                                      }[method] : method.charAt(0).toUpperCase() + method.slice(1)
                                    }
                                  </Typography>
                                </Box>
                              }
                            />
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {activeStep === 6 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    {isRTL ? 'الإعدادات المتقدمة' : 'Advanced Settings'}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.settings?.allowOnlineBooking || false}
                            onChange={(e) => setFormData({
                              ...formData,
                              settings: { 
                                ...formData.settings!, 
                                allowOnlineBooking: e.target.checked 
                              }
                            })}
                          />
                        }
                        label={isRTL ? 'السماح بالحجز عبر الإنترنت' : 'Allow Online Booking'}
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.settings?.autoConfirmAppointments || false}
                            onChange={(e) => setFormData({
                              ...formData,
                              settings: { 
                                ...formData.settings!, 
                                autoConfirmAppointments: e.target.checked 
                              }
                            })}
                          />
                        }
                        label={isRTL ? 'تأكيد المواعيد تلقائيًا' : 'Auto-confirm Appointments'}
                      />
                    </Grid>
                    
                  </Grid>
                  
                  <Typography variant="subtitle2" sx={{ mt: 4, mb: 2 }}>
                    {isRTL ? 'إعدادات الحجز' : 'Booking Settings'}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label={isRTL ? 'معدل الضريبة (%)' : 'Tax Rate (%)'}
                        value={formData.settings?.taxRate || 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { 
                            ...formData.settings!, 
                            taxRate: Number(e.target.value) 
                          }
                        })}
                        InputProps={{
                          inputProps: { min: 0, max: 100 }
                        }}
                        helperText={isRTL ? 'نسبة الضريبة المطبقة على الخدمات' : 'Tax percentage applied to services'}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>{isRTL ? 'فترة الفتحة الزمنية' : 'Time Slot Interval'}</InputLabel>
                        <Select
                          value={formData.settings?.timeSlotInterval || 30}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: { 
                              ...formData.settings!, 
                              timeSlotInterval: Number(e.target.value) 
                            }
                          })}
                        >
                          <MenuItem value={15}>15 {isRTL ? 'دقيقة' : 'minutes'}</MenuItem>
                          <MenuItem value={30}>30 {isRTL ? 'دقيقة' : 'minutes'}</MenuItem>
                          <MenuItem value={45}>45 {isRTL ? 'دقيقة' : 'minutes'}</MenuItem>
                          <MenuItem value={60}>60 {isRTL ? 'دقيقة' : 'minutes'}</MenuItem>
                        </Select>
                        <FormHelperText>{isRTL ? 'المدة بين كل موعد' : 'Duration between each appointment slot'}</FormHelperText>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        type="number"
                        label={isRTL ? 'أيام الحجز المسبق' : 'Advance Booking Days'}
                        value={formData.settings?.advanceBookingDays || 30}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { 
                            ...formData.settings!, 
                            advanceBookingDays: Number(e.target.value) 
                          }
                        })}
                        InputProps={{
                          inputProps: { min: 1, max: 365 }
                        }}
                        helperText={isRTL ? 'كم يوم مقدماً يمكن للعملاء الحجز' : 'How many days in advance customers can book'}
                      />
                    </Grid>
                  </Grid>
                  
                  <Typography variant="subtitle2" sx={{ mt: 4, mb: 2 }}>
                    {isRTL ? 'سياسة الإلغاء' : 'Cancellation Policy'}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label={isRTL ? 'ساعات الإلغاء المسبق' : 'Cancellation Hours'}
                        value={formData.settings?.cancellationHours || 24}
                        onChange={(e) => setFormData({
                          ...formData,
                          settings: { 
                            ...formData.settings!, 
                            cancellationHours: Number(e.target.value) 
                          }
                        })}
                        InputProps={{
                          inputProps: { min: 0, max: 168 }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                >
                  {isRTL ? 'السابق' : 'Back'}
                </Button>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {activeStep >= 3 && (
                    <Button
                      variant="outlined"
                      onClick={handleSave}
                      disabled={saving}
                      startIcon={saving ? <CircularProgress size={20} /> : <Save />}
                    >
                      {isRTL ? 'حفظ وإنهاء' : 'Save & Finish'}
                    </Button>
                  )}
                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      onClick={handleSave}
                      disabled={saving}
                      startIcon={saving ? <CircularProgress size={20} /> : <CheckCircleOutline />}
                    >
                      {isRTL ? 'إكمال الإعداد' : 'Complete Setup'}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      onClick={handleNext}
                    >
                      {isRTL ? 'التالي' : 'Next'}
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </motion.div>
  );
};

export default BranchFormPage;