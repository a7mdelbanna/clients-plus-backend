import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  CircularProgress,
  Radio,
  Chip,
  Alert,
} from '@mui/material';
import {
  PhotoCamera,
  Delete,
  CloudUpload,
  Star,
  StarBorder,
  AddPhotoAlternate,
  Refresh,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { storageService } from '../../services/storage.service';
import { updateUserClaims } from '../../utils/updateUserClaims';

interface ServiceImage {
  url: string;
  isDefault: boolean;
  uploadedAt: string;
  name?: string;
}

interface ServiceImageUploadProps {
  serviceId: string;
  companyId: string;
  images: ServiceImage[];
  onImagesChange: (images: ServiceImage[]) => void;
  disabled?: boolean;
}

const ServiceImageUpload: React.FC<ServiceImageUploadProps> = ({
  serviceId,
  companyId,
  images,
  onImagesChange,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate file types
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const invalidFiles = Array.from(files).filter(
      file => !validTypes.includes(file.type)
    );

    if (invalidFiles.length > 0) {
      toast.error('يرجى اختيار ملفات صور صالحة (JPEG, PNG, WebP, GIF)');
      return;
    }

    // Validate file sizes (max 5MB per file)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = Array.from(files).filter(file => file.size > maxSize);

    if (oversizedFiles.length > 0) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    // Check total images limit (max 10 images)
    if (images.length + files.length > 10) {
      toast.error('يمكنك رفع 10 صور كحد أقصى للخدمة');
      return;
    }

    try {
      setUploading(true);
      const filesToUpload = Array.from(files);
      const totalFiles = filesToUpload.length;
      let uploadedCount = 0;

      const uploadPromises = filesToUpload.map(async (file) => {
        const url = await storageService.uploadServiceImage(
          companyId,
          serviceId,
          file
        );
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
        
        return {
          url,
          isDefault: images.length === 0 && uploadedCount === 1, // First image is default
          uploadedAt: new Date().toISOString(),
          name: file.name,
        };
      });

      const newImages = await Promise.all(uploadPromises);
      onImagesChange([...images, ...newImages]);
      
      toast.success(`تم رفع ${newImages.length} صورة بنجاح`);
    } catch (error: any) {
      console.error('Error uploading images:', error);
      
      if (error.message?.includes('غير مصرح لك برفع الصور')) {
        toast.error(
          <Box>
            <Typography variant="body2">{error.message}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              يرجى تسجيل الخروج والدخول مرة أخرى لتحديث الصلاحيات
            </Typography>
            <Button 
              size="small" 
              color="primary" 
              startIcon={<Refresh />}
              onClick={async () => {
                try {
                  await updateUserClaims();
                } catch (err) {
                  console.error('Failed to update claims:', err);
                  // If update fails, suggest logout/login
                  toast.info('يرجى تسجيل الخروج والدخول مرة أخرى');
                }
              }}
              sx={{ mt: 1 }}
            >
              تحديث الصلاحيات
            </Button>
          </Box>,
          {
            autoClose: false,
            closeButton: true,
          }
        );
      } else {
        toast.error('فشل رفع الصور');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (imageToDelete: ServiceImage) => {
    try {
      // Delete from storage
      await storageService.deleteServiceImage(imageToDelete.url);
      
      // Update local state
      const updatedImages = images.filter(img => img.url !== imageToDelete.url);
      
      // If deleted image was default, make the first image default
      if (imageToDelete.isDefault && updatedImages.length > 0) {
        updatedImages[0].isDefault = true;
      }
      
      onImagesChange(updatedImages);
      toast.success('تم حذف الصورة بنجاح');
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('فشل حذف الصورة');
    }
  };

  const handleSetDefaultImage = (imageUrl: string) => {
    const updatedImages = images.map(img => ({
      ...img,
      isDefault: img.url === imageUrl,
    }));
    onImagesChange(updatedImages);
  };

  return (
    <Box>
      {/* Upload Button */}
      <Box sx={{ mb: 3 }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          disabled={disabled || uploading}
        />
        <Button
          variant="outlined"
          startIcon={uploading ? <CircularProgress size={20} /> : <AddPhotoAlternate />}
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || images.length >= 10}
          fullWidth
          sx={{ 
            height: 56,
            borderStyle: 'dashed',
            borderWidth: 2,
          }}
        >
          {uploading
            ? `جاري الرفع... ${uploadProgress}%`
            : `إضافة صور (${images.length}/10)`}
        </Button>
        
        {images.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            يُنصح بإضافة صور للخدمة لجذب العملاء بشكل أفضل
          </Alert>
        )}
      </Box>

      {/* Images Grid */}
      {images.length > 0 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            الصور المرفوعة ({images.length})
          </Typography>
          
          <ImageList sx={{ width: '100%', height: 'auto' }} cols={3} gap={8}>
            <AnimatePresence>
              {images.map((image, index) => (
                <motion.div
                  key={image.url}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.3 }}
                >
                  <ImageListItem
                    sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      position: 'relative',
                      border: image.isDefault ? 3 : 1,
                      borderColor: image.isDefault ? 'primary.main' : 'divider',
                      borderStyle: 'solid',
                    }}
                  >
                    <img
                      src={image.url}
                      alt={`Service image ${index + 1}`}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: 200,
                        objectFit: 'cover',
                      }}
                    />
                    
                    {/* Default Badge */}
                    {image.isDefault && (
                      <Chip
                        label="الصورة الأساسية"
                        size="small"
                        color="primary"
                        icon={<Star />}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                        }}
                      />
                    )}
                    
                    <ImageListItemBar
                      sx={{
                        background:
                          'linear-gradient(to top, rgba(0,0,0,0.7) 0%, ' +
                          'rgba(0,0,0,0.3) 70%, rgba(0,0,0,0) 100%)',
                      }}
                      actionIcon={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {!image.isDefault && (
                            <IconButton
                              size="small"
                              sx={{ color: 'white' }}
                              onClick={() => handleSetDefaultImage(image.url)}
                              disabled={disabled}
                              title="تعيين كصورة أساسية"
                            >
                              <StarBorder />
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            sx={{ color: 'white' }}
                            onClick={() => handleDeleteImage(image)}
                            disabled={disabled}
                            title="حذف الصورة"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      }
                    />
                  </ImageListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </ImageList>
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            * انقر على نجمة لتعيين الصورة كصورة أساسية للخدمة
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default ServiceImageUpload;