import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  IconButton,
  useTheme,
  Divider,
  Autocomplete,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Remove,
  Edit,
  Palette,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { resourceService } from '../../services/resource.service';
import RecurringSettings from './RecurringSettings';
import type { Appointment, AppointmentRepeat } from '../../services/appointment.service';
import type { Resource } from '../../services/resource.service';

interface AdvancedFieldsProps {
  appointment: Appointment | null;
  companyId: string;
  branchId?: string;
  appointmentDate?: Date;
  onFieldsChange?: (fields: any) => void;
}

const AdvancedFields: React.FC<AdvancedFieldsProps> = ({
  appointment,
  companyId,
  branchId,
  appointmentDate,
  onFieldsChange,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const { currentBranch } = useAuth();

  const [comment, setComment] = useState(appointment?.internalNotes || '');
  const [selectedResources, setSelectedResources] = useState<string[]>(
    appointment?.resources?.map(r => r.resourceId) || []
  );
  const [categories, setCategories] = useState<string[]>([]);
  const [colorCode, setColorCode] = useState(appointment?.color || '#2196F3');
  const [useDefaultColor, setUseDefaultColor] = useState(!appointment?.color);
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);
  const [repeatSettings, setRepeatSettings] = useState<AppointmentRepeat | null>(appointment?.repeat || null);

  // Load resources from database
  useEffect(() => {
    if (companyId) {
      loadResources();
    }
  }, [companyId, branchId]);

  const loadResources = async () => {
    try {
      setLoadingResources(true);
      const resources = await resourceService.getResources(
        companyId,
        branchId || currentBranch?.id
      );
      setAvailableResources(resources);
    } catch (error) {
      console.error('Error loading resources:', error);
    } finally {
      setLoadingResources(false);
    }
  };

  // Update parent when fields change
  useEffect(() => {
    if (onFieldsChange) {
      // Convert resource IDs to AppointmentResource format
      const appointmentResources = selectedResources.map(resourceId => {
        const resource = availableResources.find(r => r.id === resourceId);
        return resource ? {
          resourceId: resource.id!,
          resourceName: resource.name,
          resourceType: 'equipment' as const, // You might want to add a type field to Resource
        } : null;
      }).filter(Boolean);

      onFieldsChange({
        internalNotes: comment,
        resources: appointmentResources,
        categories,
        color: useDefaultColor ? null : colorCode,
        repeat: repeatSettings,
      });
    }
  }, [comment, selectedResources, categories, colorCode, useDefaultColor, availableResources, repeatSettings]);

  // Temporary hardcoded categories until we integrate with category service
  const categoryOptions = [
    { id: '1', name: isRTL ? 'عملاء VIP' : 'VIP Clients', color: '#FFD700' },
    { id: '2', name: isRTL ? 'عملاء جدد' : 'New Clients', color: '#4CAF50' },
    { id: '3', name: isRTL ? 'عملاء منتظمين' : 'Regular Clients', color: '#2196F3' },
    { id: '4', name: isRTL ? 'عروض خاصة' : 'Special Offers', color: '#FF5722' },
    { id: '5', name: isRTL ? 'متابعة' : 'Follow-up', color: '#9C27B0' },
    { id: '6', name: isRTL ? 'طارئ' : 'Emergency', color: '#F44336' },
  ];

  const handleResourceAdd = () => {
    if (availableResources.length > 0 && !selectedResources.includes(availableResources[0].id!)) {
      setSelectedResources([...selectedResources, availableResources[0].id!]);
    }
  };

  const handleResourceRemove = (index: number) => {
    const newResources = selectedResources.filter((_, i) => i !== index);
    setSelectedResources(newResources);
  };

  return (
    <Box>
      {/* Recurring Settings */}
      <Box sx={{ mb: 3 }}>
        <RecurringSettings
          appointment={appointment}
          appointmentDate={appointmentDate || new Date()}
          onRepeatChange={setRepeatSettings}
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Comment Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          {isRTL ? 'تعليق' : 'Comment'}
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder={isRTL ? 'أضف تعليقًا...' : 'Add a comment...'}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: theme.palette.background.paper,
            },
          }}
          InputProps={{
            endAdornment: (
              <IconButton size="small" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                <Edit fontSize="small" />
              </IconButton>
            ),
          }}
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Resources Section */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          {isRTL ? 'الموارد' : 'Resources'}
        </Typography>
        
        {loadingResources ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {selectedResources.map((resourceId, index) => {
              const resource = availableResources.find(r => r.id === resourceId);
              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <Select
                      value={resourceId}
                      onChange={(e) => {
                        const newResources = [...selectedResources];
                        newResources[index] = e.target.value;
                        setSelectedResources(newResources);
                      }}
                    >
                      {availableResources.map((res) => (
                        <MenuItem 
                          key={res.id} 
                          value={res.id}
                          disabled={selectedResources.includes(res.id!) && res.id !== resourceId}
                        >
                          <Box>
                            <Typography variant="body2">{res.name}</Typography>
                            {res.description && (
                              <Typography variant="caption" color="text.secondary">
                                {res.description}
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <IconButton
                    size="small"
                    onClick={() => handleResourceRemove(index)}
                    color="error"
                  >
                    <Remove />
                  </IconButton>
                  
                  {index === selectedResources.length - 1 && (
                    <IconButton
                      size="small"
                      onClick={handleResourceAdd}
                      color="primary"
                      disabled={selectedResources.length >= availableResources.length}
                    >
                      <Add />
                    </IconButton>
                  )}
                </Box>
              );
            })}
            
            {selectedResources.length === 0 && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={handleResourceAdd}
                disabled={availableResources.length === 0}
              >
                {isRTL ? 'إضافة مورد' : 'Add Resource'}
              </Button>
            )}
            
            {availableResources.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {isRTL ? 'لا توجد موارد متاحة' : 'No resources available'}
              </Typography>
            )}
          </>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Appointment Categories */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          {isRTL ? 'فئات المواعيد' : 'Appointment categories'}
        </Typography>
        
        <Autocomplete
          multiple
          options={categoryOptions}
          getOptionLabel={(option) => option.name}
          value={categoryOptions.filter(cat => categories.includes(cat.id))}
          onChange={(_, newValue) => {
            setCategories(newValue.map(cat => cat.id));
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              placeholder={isRTL ? 'لم يتم تحديد' : 'Not selected'}
              size="small"
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => {
              const { key, ...chipProps } = getTagProps({ index });
              return (
                <Chip
                  key={key}
                  variant="outlined"
                  label={option.name}
                  size="small"
                  {...chipProps}
                />
              );
            })
          }
        />
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Color Code */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          {isRTL ? 'رمز اللون' : 'Color code'}
        </Typography>
        
        <FormControlLabel
          control={
            <Checkbox
              checked={!useDefaultColor}
              onChange={(e) => setUseDefaultColor(!e.target.checked)}
              icon={<Palette />}
              checkedIcon={<Palette color="primary" />}
            />
          }
          label={isRTL ? 'استخدام لون مخصص' : 'Use custom color'}
        />
        
        {!useDefaultColor && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {[
                { color: '#FF5722', name: isRTL ? 'أحمر' : 'Red' },
                { color: '#4CAF50', name: isRTL ? 'أخضر' : 'Green' },
                { color: '#2196F3', name: isRTL ? 'أزرق' : 'Blue' },
                { color: '#FFC107', name: isRTL ? 'أصفر' : 'Yellow' },
                { color: '#9C27B0', name: isRTL ? 'بنفسجي' : 'Purple' },
                { color: '#795548', name: isRTL ? 'بني' : 'Brown' },
                { color: '#607D8B', name: isRTL ? 'رمادي' : 'Grey' },
                { color: '#FF9800', name: isRTL ? 'برتقالي' : 'Orange' },
              ].map(({ color, name }) => (
                <Box
                  key={color}
                  onClick={() => setColorCode(color)}
                  sx={{
                    position: 'relative',
                    width: 40,
                    height: 40,
                    backgroundColor: color,
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: colorCode === color ? `3px solid ${theme.palette.primary.main}` : `2px solid ${theme.palette.divider}`,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      boxShadow: theme.shadows[4],
                    },
                  }}
                  title={name}
                >
                  {colorCode === color && (
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          backgroundColor: color,
                          borderRadius: '50%',
                        }}
                      />
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {isRTL ? 'اللون المحدد:' : 'Selected color:'}
              </Typography>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  backgroundColor: colorCode,
                  borderRadius: 1,
                  border: `2px solid ${theme.palette.divider}`,
                }}
              />
              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                {colorCode}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default AdvancedFields;