import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  useTheme,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  RadioButtonUnchecked,
  Edit,
  Delete,
  Add,
  Visibility,
  Star,
} from '@mui/icons-material';
import type { 
  LabelTemplate, 
  PageSize,
  PageOrientation,
} from '../../types/labelPrinting.types';
import { PRESET_TEMPLATES } from '../../types/labelPrinting.types';
import { calculateLabelLayout } from '../../utils/labelLayoutCalculator';

interface TemplateSelectorProps {
  activeTemplate: LabelTemplate;
  onTemplateChange: (template: LabelTemplate) => void;
  onCreateTemplate?: () => void;
  onEditTemplate?: (template: LabelTemplate) => void;
  onDeleteTemplate?: (templateId: string) => void;
  customTemplates?: LabelTemplate[];
  loading?: boolean;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  activeTemplate,
  onTemplateChange,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  customTemplates = [],
  loading = false,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const [previewTemplate, setPreviewTemplate] = useState<LabelTemplate | null>(null);

  // Convert preset templates to full templates
  const presetTemplates: LabelTemplate[] = PRESET_TEMPLATES.map((preset, index) => ({
    id: `preset-${index}`,
    name: preset.name!,
    companyId: '',
    userId: '',
    isDefault: index === 0,
    layout: preset.layout!,
    labelDesign: preset.labelDesign!,
    createdAt: new Date() as any,
    updatedAt: new Date() as any,
  }));

  const allTemplates = [...presetTemplates, ...customTemplates];

  const handleTemplateSelect = (template: LabelTemplate) => {
    onTemplateChange(template);
  };

  const handlePreviewTemplate = (template: LabelTemplate) => {
    setPreviewTemplate(template);
  };

  const handleClosePreview = () => {
    setPreviewTemplate(null);
  };

  const getTemplateInfo = (template: LabelTemplate) => {
    const layout = calculateLabelLayout(template.layout);
    return {
      pageSize: `${template.layout.pageSize} ${template.layout.orientation}`,
      labelsPerSheet: layout.totalLabels,
      labelSize: `${layout.labelWidth.toFixed(1)} × ${layout.labelHeight.toFixed(1)}mm`,
      isValid: layout.isValid,
    };
  };

  const TemplateCard: React.FC<{ template: LabelTemplate; isPreset?: boolean }> = ({ 
    template, 
    isPreset = false 
  }) => {
    const isActive = activeTemplate.id === template.id;
    const info = getTemplateInfo(template);
    const canEdit = !isPreset && onEditTemplate;
    const canDelete = !isPreset && onDeleteTemplate && customTemplates.length > 1;

    return (
      <Card
        sx={{
          cursor: 'pointer',
          transition: 'all 0.2s',
          border: isActive ? '2px solid' : '1px solid',
          borderColor: isActive ? 'primary.main' : 'divider',
          '&:hover': {
            borderColor: isActive ? 'primary.main' : 'primary.light',
            transform: 'translateY(-2px)',
            boxShadow: 2,
          },
          position: 'relative',
        }}
        onClick={() => handleTemplateSelect(template)}
      >
        {/* Template status indicator */}
        <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
          {isActive ? (
            <CheckCircle color="primary" />
          ) : (
            <RadioButtonUnchecked color="action" />
          )}
        </Box>

        {/* Default/Popular badge */}
        {template.isDefault && (
          <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
            <Chip
              icon={<Star />}
              label={isRTL ? 'شائع' : 'Popular'}
              size="small"
              color="warning"
              variant="filled"
            />
          </Box>
        )}

        <CardContent sx={{ pt: template.isDefault ? 5 : 2 }}>
          <Typography variant="h6" gutterBottom noWrap>
            {template.name}
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {isRTL ? 'الحجم:' : 'Size:'}
              </Typography>
              <Chip label={info.pageSize} size="small" />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {isRTL ? 'الملصقات:' : 'Labels:'}
              </Typography>
              <Chip label={`${info.labelsPerSheet} per sheet`} size="small" color="primary" />
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {isRTL ? 'مقاس الملصق:' : 'Label Size:'}
              </Typography>
              <Typography variant="body2">{info.labelSize}</Typography>
            </Box>
          </Box>

          {/* Validation status */}
          {!info.isValid && (
            <Chip
              label={isRTL ? 'تحتاج تعديل' : 'Needs adjustment'}
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </CardContent>

        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Button
            size="small"
            startIcon={<Visibility />}
            onClick={(e) => {
              e.stopPropagation();
              handlePreviewTemplate(template);
            }}
          >
            {isRTL ? 'معاينة' : 'Preview'}
          </Button>
          
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {canEdit && (
              <Tooltip title={isRTL ? 'تحرير' : 'Edit'}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTemplate!(template);
                  }}
                >
                  <Edit />
                </IconButton>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip title={isRTL ? 'حذف' : 'Delete'}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTemplate!(template.id);
                  }}
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          {isRTL ? 'قوالب الملصقات' : 'Label Templates'}
        </Typography>
        {onCreateTemplate && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={onCreateTemplate}
          >
            {isRTL ? 'قالب جديد' : 'New Template'}
          </Button>
        )}
      </Box>

      {/* Preset Templates */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {isRTL ? 'القوالب الجاهزة' : 'Preset Templates'}
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(2, 1fr)', 
            md: 'repeat(3, 1fr)' 
          }, 
          gap: 2 
        }}>
          {presetTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} isPreset={true} />
          ))}
        </Box>
      </Box>

      {/* Custom Templates */}
      {customTemplates.length > 0 && (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {isRTL ? 'القوالب المخصصة' : 'Custom Templates'}
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(2, 1fr)', 
              md: 'repeat(3, 1fr)' 
            }, 
            gap: 2 
          }}>
            {customTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} isPreset={false} />
            ))}
          </Box>
        </Box>
      )}

      {/* Template Preview Dialog */}
      <Dialog
        open={!!previewTemplate}
        onClose={handleClosePreview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isRTL ? 'معاينة القالب' : 'Template Preview'}: {previewTemplate?.name}
        </DialogTitle>
        <DialogContent>
          {previewTemplate && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Template specifications */}
              <Box sx={{ 
                p: 2, 
                bgcolor: 'background.paper', 
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider'
              }}>
                <Typography variant="body2" gutterBottom>
                  {isRTL ? 'مواصفات القالب' : 'Template Specifications'}
                </Typography>
                {(() => {
                  const info = getTemplateInfo(previewTemplate);
                  return (
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Chip label={`${info.pageSize}`} size="small" />
                      <Chip label={`${info.labelsPerSheet} labels`} size="small" color="primary" />
                      <Chip label={`${info.labelSize}`} size="small" />
                      <Chip 
                        label={info.isValid ? (isRTL ? 'صالح' : 'Valid') : (isRTL ? 'غير صالح' : 'Invalid')} 
                        size="small" 
                        color={info.isValid ? 'success' : 'error'}
                      />
                    </Box>
                  );
                })()}
              </Box>
              
              {/* Visual preview would go here */}
              <Box sx={{ 
                minHeight: 200, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: 'grey.50',
                borderRadius: 1,
              }}>
                <Typography color="text.secondary">
                  {isRTL ? 'المعاينة المرئية قادمة قريباً' : 'Visual preview coming soon'}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>
            {isRTL ? 'إغلاق' : 'Close'}
          </Button>
          {previewTemplate && (
            <Button 
              variant="contained" 
              onClick={() => {
                handleTemplateSelect(previewTemplate);
                handleClosePreview();
              }}
            >
              {isRTL ? 'استخدام هذا القالب' : 'Use This Template'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateSelector;