import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Stack,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Search,
  Close,
  Category,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import type { Staff } from '../../../services/staff.service';
import { staffService } from '../../../services/staff.service';
import { serviceService, type Service, type ServiceCategory } from '../../../services/service.service';

interface ServicesTabProps {
  employee: Staff;
  companyId: string;
  onUpdate: (employee: Staff) => void;
}

const ServicesTab: React.FC<ServicesTabProps> = ({ employee, companyId, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [assignedServices, setAssignedServices] = useState<Service[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Helper function to format duration
  const formatDuration = (duration: { hours: number; minutes: number }) => {
    const parts = [];
    if (duration.hours > 0) {
      parts.push(`${duration.hours} ساعة`);
    }
    if (duration.minutes > 0) {
      parts.push(`${duration.minutes} دقيقة`);
    }
    return parts.join(' و ');
  };

  useEffect(() => {
    loadData();
  }, [companyId, employee]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all services and categories
      const [fetchedServices, fetchedCategories] = await Promise.all([
        serviceService.getServices(companyId),
        serviceService.getCategories(companyId),
      ]);
      
      setServices(fetchedServices);
      setCategories(fetchedCategories);
      
      // Filter assigned services
      const assigned = fetchedServices.filter(service => 
        employee.services.includes(service.id!)
      );
      setAssignedServices(assigned);
      
      // Set initially selected services for the dialog
      setSelectedServices(employee.services);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('حدث خطأ في تحميل الخدمات');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'غير مصنف';
  };

  const handleOpenAssignDialog = () => {
    setSelectedServices(employee.services);
    setShowAssignDialog(true);
  };

  const handleCloseAssignDialog = () => {
    setShowAssignDialog(false);
    setSearchTerm('');
    setSelectedServices(employee.services);
  };

  const handleToggleService = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleSaveServices = async () => {
    try {
      setSaving(true);
      
      // Update staff services
      await staffService.updateStaffServices(employee.id!, selectedServices);
      
      // Update local state
      const updatedEmployee = {
        ...employee,
        services: selectedServices,
        servicesCount: selectedServices.length,
      };
      onUpdate(updatedEmployee);
      
      // Update assigned services display
      const assigned = services.filter(service => 
        selectedServices.includes(service.id!)
      );
      setAssignedServices(assigned);
      
      toast.success('تم تحديث الخدمات بنجاح');
      handleCloseAssignDialog();
    } catch (error) {
      console.error('Error updating services:', error);
      toast.error('حدث خطأ في تحديث الخدمات');
    } finally {
      setSaving(false);
    }
  };

  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCategoryName(service.categoryId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group services by category
  const servicesByCategory = filteredServices.reduce((acc, service) => {
    const categoryId = service.categoryId || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          خدمات الموظف
        </Typography>
        <Typography variant="body2" color="text.secondary">
          يتم عرض الخدمات التي يقدمها الموظف هنا
        </Typography>
      </Box>

      {/* Actions */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenAssignDialog}
        >
          تعيين الخدمات
        </Button>
        <Button variant="outlined">
          إنشاء خدمة
        </Button>
      </Box>

      {/* Assigned Services */}
      {assignedServices.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            لم يتم تعيين أي خدمات لهذا الموظف بعد
          </Typography>
          <Typography variant="caption" color="text.secondary">
            يقدم: 0 من {services.length}
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            يقدم: {assignedServices.length} من {services.length}
          </Typography>
          
          {/* Group assigned services by category */}
          {Object.entries(
            assignedServices.reduce((acc, service) => {
              const categoryId = service.categoryId || 'uncategorized';
              if (!acc[categoryId]) {
                acc[categoryId] = [];
              }
              acc[categoryId].push(service);
              return acc;
            }, {} as Record<string, Service[]>)
          ).map(([categoryId, categoryServices]) => (
            <Box key={categoryId} sx={{ mb: 3 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 1,
                  color: 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Category fontSize="small" />
                {getCategoryName(categoryId)}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {categoryServices.map(service => (
                  <Chip
                    key={service.id}
                    label={service.name}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Paper>
      )}

      {/* Assign Services Dialog */}
      <Dialog
        open={showAssignDialog}
        onClose={handleCloseAssignDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">تعيين الخدمات</Typography>
            <IconButton onClick={handleCloseAssignDialog} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {/* Search */}
          <TextField
            fullWidth
            placeholder="أدخل عنوان الخدمة أو الفئة"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />

          {/* Services List */}
          {filteredServices.length === 0 ? (
            <Alert severity="info">
              لا توجد خدمات تطابق البحث
            </Alert>
          ) : (
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {Object.entries(servicesByCategory).map(([categoryId, categoryServices]) => (
                <Box key={categoryId} sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      mb: 2,
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Category fontSize="small" />
                    {getCategoryName(categoryId)}
                  </Typography>
                  
                  <Stack spacing={1}>
                    {categoryServices.map(service => (
                      <FormControlLabel
                        key={service.id}
                        control={
                          <Checkbox
                            checked={selectedServices.includes(service.id!)}
                            onChange={() => handleToggleService(service.id!)}
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body1">{service.name}</Typography>
                            {service.duration && (
                              <Typography variant="caption" color="text.secondary">
                                المدة: {formatDuration(service.duration)}
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ width: '100%' }}
                      />
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseAssignDialog} disabled={saving}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveServices}
            disabled={saving}
            sx={{
              minWidth: 120,
              background: (theme) => 
                `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.dark} 90%)`,
            }}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServicesTab;