import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  IconButton,
  Stack,
  Collapse,
  Tooltip,
  FormHelperText,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  Close,
  Info,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { toast } from 'react-toastify';
import { staffService, type AccessLevel, AccessLevelDescriptions } from '../../../services/staff.service';
import type { Position } from '../../../services/position.service';
import { useBranch } from '../../../contexts/BranchContext';

interface AddEmployeeModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  positions: Position[];
}

interface FormData {
  name: string;
  addToSchedule: boolean;
  specialization: string;
  positionId: string;
  newPosition?: string;
  grantServiceAccess: boolean;
  contactInfo: string;
  role: AccessLevel;
}

const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  open,
  onClose,
  companyId,
  positions,
}) => {
  const [loading, setLoading] = useState(false);
  const [showNewPosition, setShowNewPosition] = useState(false);
  const { currentBranch } = useBranch();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      name: '',
      addToSchedule: false,
      specialization: '',
      positionId: '',
      grantServiceAccess: false,
      contactInfo: '',
      role: 'Employee',
    },
  });

  const watchAddToSchedule = watch('addToSchedule');
  const watchGrantAccess = watch('grantServiceAccess');

  const handleClose = () => {
    reset();
    setShowNewPosition(false);
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      // Create staff object - build conditionally to avoid undefined values
      const newStaff: any = {
        companyId,
        name: data.name,
        access: {
          level: data.grantServiceAccess ? data.role : 'Employee' as AccessLevel,
          status: data.grantServiceAccess ? 'invited' : 'not_granted' as 'not_granted' | 'invited',
        },
        schedule: {
          isScheduled: data.addToSchedule,
        },
        services: [],
        onlineBooking: {
          enabled: false,
        },
        status: 'active' as const,
        active: true,
      };

      // Add optional fields only if they have values
      if (data.addToSchedule && data.specialization) {
        newStaff.specialization = data.specialization;
      }
      
      if (data.addToSchedule && data.positionId) {
        newStaff.positionId = data.positionId;
      }
      
      if (data.grantServiceAccess && data.contactInfo) {
        if (data.contactInfo.includes('@')) {
          newStaff.email = data.contactInfo;
        } else {
          newStaff.phone = data.contactInfo;
        }
        
        newStaff.access.inviteSentAt = new Date().toISOString();
      }

      const staffId = await staffService.createStaff(newStaff, companyId, currentBranch?.id);

      // Send invitation if requested
      if (data.grantServiceAccess && data.contactInfo) {
        await staffService.sendStaffInvitation(staffId, data.contactInfo);
      }

      toast.success('تمت إضافة الموظف بنجاح');
      
      // Navigate to schedule if requested
      if (data.addToSchedule) {
        // Navigate to employee detail page, schedule tab
        window.location.href = `/employee/${staffId}?tab=schedule`;
      }

      handleClose();
    } catch (error) {
      console.error('Error adding staff:', error);
      toast.error('حدث خطأ في إضافة الموظف');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">إضافة موظف جديد</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={3}>
            {/* Name Field */}
            <Controller
              name="name"
              control={control}
              rules={{ required: 'اسم الموظف مطلوب' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="الاسم"
                  placeholder="أدخل الاسم"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />

            {/* Add to Schedule Checkbox */}
            <Controller
              name="addToSchedule"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      checked={field.value}
                    />
                  }
                  label="إضافة إلى الجدول"
                />
              )}
            />

            {/* Schedule Fields */}
            <Collapse in={watchAddToSchedule}>
              <Stack spacing={2}>
                <Controller
                  name="specialization"
                  control={control}
                  rules={{
                    required: watchAddToSchedule ? 'التخصص مطلوب' : false,
                  }}
                  render={({ field }) => (
                    <Box>
                      <TextField
                        {...field}
                        label="التخصص"
                        placeholder="أخصائي تجميل"
                        fullWidth
                        error={!!errors.specialization}
                        helperText={errors.specialization?.message}
                      />
                      <Tooltip title="سيرى العملاء هذا الاسم أثناء الحجز عبر الإنترنت">
                        <IconButton size="small" sx={{ ml: 1 }}>
                          <Info fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                />

                <Controller
                  name="positionId"
                  control={control}
                  render={({ field }) => (
                    <Box>
                      <FormControl fullWidth error={!!errors.positionId}>
                        <InputLabel>المنصب</InputLabel>
                        <Select
                          {...field}
                          label="المنصب"
                          value={field.value || ''}
                          onChange={(e: SelectChangeEvent) => {
                            if (e.target.value === 'new') {
                              setShowNewPosition(true);
                              field.onChange('');
                            } else {
                              setShowNewPosition(false);
                              field.onChange(e.target.value);
                            }
                          }}
                        >
                          <MenuItem value="">
                            <em>اختر منصب</em>
                          </MenuItem>
                          {positions.map(position => (
                            <MenuItem key={position.id} value={position.id}>
                              {position.name}
                            </MenuItem>
                          ))}
                          <MenuItem value="new">
                            <em>+ إضافة منصب جديد</em>
                          </MenuItem>
                        </Select>
                        {errors.positionId && (
                          <FormHelperText>{errors.positionId.message}</FormHelperText>
                        )}
                      </FormControl>
                      <Tooltip title="سيسمح لك هذا بتصفية الموظفين بسهولة في تقويم المواعيد وفي التقارير">
                        <IconButton size="small" sx={{ ml: 1 }}>
                          <Info fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                />

                {showNewPosition && (
                  <Controller
                    name="newPosition"
                    control={control}
                    rules={{
                      required: showNewPosition ? 'اسم المنصب مطلوب' : false,
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="اسم المنصب الجديد"
                        placeholder="أدخل اسم المنصب"
                        fullWidth
                        error={!!errors.newPosition}
                        helperText={errors.newPosition?.message}
                      />
                    )}
                  />
                )}
              </Stack>
            </Collapse>

            {/* Grant Service Access Checkbox */}
            <Controller
              name="grantServiceAccess"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      {...field}
                      checked={field.value}
                    />
                  }
                  label="منح الوصول إلى الخدمة"
                />
              )}
            />

            {/* Access Fields */}
            <Collapse in={watchGrantAccess}>
              <Stack spacing={2}>
                <Controller
                  name="contactInfo"
                  control={control}
                  rules={{
                    required: watchGrantAccess ? 'معلومات الاتصال مطلوبة' : false,
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="معلومات الاتصال"
                      placeholder="أدخل رقم الموظف أو البريد الإلكتروني"
                      fullWidth
                      error={!!errors.contactInfo}
                      helperText={errors.contactInfo?.message}
                    />
                  )}
                />

                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>الدور</InputLabel>
                      <Select
                        {...field}
                        label="الدور"
                        value={field.value}
                      >
                        <MenuItem value="Employee">موظف</MenuItem>
                        <MenuItem value="Administrator">مسؤول</MenuItem>
                        <MenuItem value="CallCenter">مركز اتصال</MenuItem>
                        <MenuItem value="Accountant">محاسب</MenuItem>
                        <MenuItem value="Manager">مدير</MenuItem>
                        <MenuItem value="Owner">مالك</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />

                {/* Role Descriptions */}
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {AccessLevelDescriptions[watch('role')]}
                  </Typography>
                </Box>
              </Stack>
            </Collapse>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              minWidth: 120,
              background: (theme) => 
                `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
            }}
          >
            {loading ? 'جاري الإضافة...' : 'إضافة موظف'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddEmployeeModal;