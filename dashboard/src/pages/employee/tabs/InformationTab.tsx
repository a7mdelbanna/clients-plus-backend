import React, { useState, useRef } from 'react';
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  PhotoCamera,
  Save,
  Email,
  Phone,
  Send,
  Store,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { staffService, type Staff, type AccessLevel, AccessLevelDescriptions } from '../../../services/staff.service';
import { positionService, type Position } from '../../../services/position.service';
import { branchService, type Branch } from '../../../services/branch.service';
import { storageService } from '../../../services/storage.service';

interface InformationTabProps {
  employee: Staff;
  companyId: string;
  onUpdate: (employee: Staff) => void;
}

const InformationTab: React.FC<InformationTabProps> = ({
  employee,
  companyId,
  onUpdate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>(
    employee.branchIds || (employee.branchId ? [employee.branchId] : [])
  );
  const [formData, setFormData] = useState({
    name: employee.name,
    specialization: employee.specialization || '',
    positionId: employee.positionId || '',
    accessLevel: employee.access.level,
  });

  React.useEffect(() => {
    loadPositions();
    loadBranches();
  }, [companyId]);

  const loadPositions = async () => {
    try {
      const fetchedPositions = await positionService.getPositions(companyId);
      setPositions(fetchedPositions);
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };

  const loadBranches = async () => {
    try {
      const fetchedBranches = await branchService.getBranches(companyId, true);
      setBranches(fetchedBranches);
    } catch (error) {
      console.error('Error loading branches:', error);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يجب أن يكون الملف صورة');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // Upload via storage service
      const photoUrl = await storageService.uploadFile(file, `companies/${companyId}/staff/${employee.id}/${Date.now()}_${file.name}`);

      // Update employee
      await staffService.updateStaff(employee.id!, { avatar: photoUrl });
      
      // Update local state
      onUpdate({ ...employee, avatar: photoUrl });
      
      toast.success('تم تحديث الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('حدث خطأ في رفع الصورة');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      const updates: Partial<Staff> = {
        name: formData.name,
        specialization: formData.specialization,
        positionId: formData.positionId,
        'access.level': formData.accessLevel,
        branchIds: selectedBranches,
      };

      await staffService.updateStaff(employee.id!, updates);
      
      // Sync branch staff arrays if branch assignment changed
      const oldBranches = new Set(employee.branchIds || [employee.branchId].filter(Boolean));
      const newBranches = new Set(selectedBranches);
      const hasChanges = oldBranches.size !== newBranches.size || 
        [...oldBranches].some(id => !newBranches.has(id));
      
      if (hasChanges) {
        await staffService.syncStaffBranchAssignments(companyId, employee.id!, selectedBranches);
      }
      
      // Update local state
      onUpdate({
        ...employee,
        name: formData.name,
        specialization: formData.specialization,
        positionId: formData.positionId,
        access: {
          ...employee.access,
          level: formData.accessLevel,
        },
        branchIds: selectedBranches,
      });
      
      toast.success('تم حفظ التغييرات بنجاح');
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('حدث خطأ في حفظ التغييرات');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    try {
      setLoading(true);
      
      if (!employee.email && !employee.phone) {
        toast.error('يجب إضافة بريد إلكتروني أو رقم هاتف للموظف أولاً');
        return;
      }

      const contactInfo = employee.email || employee.phone || '';
      await staffService.sendStaffInvitation(employee.id!, contactInfo);
      
      toast.success('تم إرسال الدعوة بنجاح');
      
      // Update local state
      onUpdate({
        ...employee,
        access: {
          ...employee.access,
          status: 'invited',
        },
      });
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error('حدث خطأ في إرسال الدعوة');
    } finally {
      setLoading(false);
    }
  };

  const getPositionName = (positionId?: string) => {
    if (!positionId) return 'غير محدد';
    const position = positions.find(p => p.id === positionId);
    return position?.name || 'غير محدد';
  };

  return (
    <Stack spacing={4}>
      {/* General Information Section */}
      <Box>
        <Typography variant="h6" sx={{ mb: 3 }}>
          معلومات عامة
        </Typography>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3}>
          {/* Avatar Upload */}
          <Box sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                src={employee.avatar}
                alt={employee.name}
                sx={{ width: 120, height: 120 }}
              >
                {employee.name.charAt(0)}
              </Avatar>
              {uploadingPhoto && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    borderRadius: '50%',
                  }}
                >
                  <CircularProgress size={30} sx={{ color: 'white' }} />
                </Box>
              )}
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': { backgroundColor: 'primary.dark' },
                }}
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <PhotoCamera fontSize="small" />
              </IconButton>
            </Box>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </Box>

          {/* Form Fields */}
          <Box sx={{ flex: 1 }}>
            <Stack spacing={2}>
              <TextField
                label="الاسم"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                fullWidth
              />
              
              <TextField
                label="التخصص"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                fullWidth
                helperText="متخصص"
              />
              
              <FormControl fullWidth>
                <InputLabel>المنصب</InputLabel>
                <Select
                  value={formData.positionId}
                  onChange={(e: SelectChangeEvent) => setFormData({ ...formData, positionId: e.target.value })}
                  label="المنصب"
                >
                  <MenuItem value="">
                    <em>غير محدد</em>
                  </MenuItem>
                  {positions.map(position => (
                    <MenuItem key={position.id} value={position.id}>
                      {position.name}
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  أدخل عنوانًا جديدًا واضغط على Enter لإضافة منصب
                </Typography>
              </FormControl>
            </Stack>
          </Box>
        </Stack>
      </Box>

      <Divider />

      {/* Branch Assignment Section */}
      <Box>
        <Typography variant="h6" sx={{ mb: 3 }}>
          الفروع المخصصة
        </Typography>
        
        <Paper sx={{ p: 3, backgroundColor: 'background.default' }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              حدد الفروع التي يمكن للموظف العمل فيها
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {branches.map((branch) => (
                <Chip
                  key={branch.id}
                  label={branch.name}
                  icon={<Store />}
                  onClick={() => {
                    if (selectedBranches.includes(branch.id!)) {
                      setSelectedBranches(selectedBranches.filter(id => id !== branch.id));
                    } else {
                      setSelectedBranches([...selectedBranches, branch.id!]);
                    }
                  }}
                  color={selectedBranches.includes(branch.id!) ? 'primary' : 'default'}
                  variant={selectedBranches.includes(branch.id!) ? 'filled' : 'outlined'}
                  clickable
                  sx={{
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: selectedBranches.includes(branch.id!) 
                        ? 'primary.dark' 
                        : 'action.hover'
                    }
                  }}
                />
              ))}
            </Box>
            
            {selectedBranches.length === 0 && (
              <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                يجب تحديد فرع واحد على الأقل
              </Typography>
            )}
          </Stack>
        </Paper>
      </Box>

      <Divider />

      {/* Access to Service Section */}
      <Box>
        <Typography variant="h6" sx={{ mb: 3 }}>
          الوصول إلى الخدمة
        </Typography>
        
        <Paper sx={{ p: 3, backgroundColor: 'background.default' }}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1">
                الحالة:
              </Typography>
              <Chip
                label={
                  employee.access.status === 'active' ? 'نشط' :
                  employee.access.status === 'invited' ? 'تم إرسال الدعوة' :
                  'لم يتم منح الوصول'
                }
                color={employee.access.status === 'active' ? 'success' : 'default'}
                variant={employee.access.status === 'active' ? 'filled' : 'outlined'}
              />
            </Box>

            {employee.access.status === 'not_granted' && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  يمكن للموظف الوصول إلى الخدمة وتلقي الإشعارات. لمنح الوصول، أرسل دعوة.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Send />}
                  onClick={handleSendInvite}
                  disabled={loading || (!employee.email && !employee.phone)}
                >
                  إرسال دعوة
                </Button>
              </Box>
            )}

            {employee.email && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email fontSize="small" color="action" />
                <Typography variant="body2">{employee.email}</Typography>
              </Box>
            )}

            {employee.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone fontSize="small" color="action" />
                <Typography variant="body2" dir="ltr">{employee.phone}</Typography>
              </Box>
            )}

            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>مستوى الوصول</InputLabel>
              <Select
                value={formData.accessLevel}
                onChange={(e: SelectChangeEvent) => setFormData({ ...formData, accessLevel: e.target.value as AccessLevel })}
                label="مستوى الوصول"
              >
                <MenuItem value="Employee">موظف</MenuItem>
                <MenuItem value="Administrator">مسؤول</MenuItem>
                <MenuItem value="CallCenter">مركز اتصال</MenuItem>
                <MenuItem value="Accountant">محاسب</MenuItem>
                <MenuItem value="Manager">مدير</MenuItem>
                <MenuItem value="Owner">مالك</MenuItem>
              </Select>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                {AccessLevelDescriptions[formData.accessLevel]}
              </Typography>
            </FormControl>
          </Stack>
        </Paper>
      </Box>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={loading}
          sx={{
            minWidth: 120,
            background: (theme) => 
              `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
          }}
        >
          {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
      </Box>
    </Stack>
  );
};

export default InformationTab;