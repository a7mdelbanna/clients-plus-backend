import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  IconButton,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  PhotoCamera,
  CloudUpload,
  Delete,
  Edit,
  DragIndicator,
  Star,
  StarBorder,
  Image as ImageIcon,
  Wallpaper,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { storageService } from '../../../../services/storage.service';
import type { LocationPhotos } from '../../../../services/location.service';

interface PhotosTabProps {
  photos?: LocationPhotos;
  companyId: string;
  onSave: (photos: LocationPhotos) => Promise<void>;
  saving: boolean;
}

interface BusinessPhoto {
  url: string;
  caption?: string;
  order: number;
  isUploading?: boolean;
}

const PhotosTab: React.FC<PhotosTabProps> = ({
  photos,
  companyId,
  onSave,
  saving,
}) => {
  const [businessPhotos, setBusinessPhotos] = useState<BusinessPhoto[]>(
    photos?.photos || []
  );
  const [banner, setBanner] = useState<{ url: string; caption?: string } | null>(
    photos?.banner || null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [editingCaption, setEditingCaption] = useState<number | null>(null);
  const [editingBannerCaption, setEditingBannerCaption] = useState(false);
  const [tempCaption, setTempCaption] = useState('');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    
    try {
      const newPhotos: BusinessPhoto[] = [];
      const maxOrder = Math.max(...businessPhotos.map(p => p.order), 0);
      
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} ليس ملف صورة صالح`);
          continue;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} حجم الصورة يجب أن يكون أقل من 5 ميجابايت`);
          continue;
        }
        
        // Add uploading placeholder
        const tempPhoto: BusinessPhoto = {
          url: URL.createObjectURL(file),
          caption: '',
          order: maxOrder + i + 1,
          isUploading: true,
        };
        
        newPhotos.push(tempPhoto);
      }
      
      // Add uploading photos to state
      setBusinessPhotos(prev => [...prev, ...newPhotos]);
      
      // Upload files
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const tempPhotoIndex = businessPhotos.length + i;
        
        try {
          const url = await storageService.uploadBusinessPhoto(file, companyId);
          
          // Update photo with real URL
          setBusinessPhotos(prev => 
            prev.map((photo, index) => 
              index === tempPhotoIndex 
                ? { ...photo, url, isUploading: false }
                : photo
            )
          );
          
        } catch (error) {
          console.error('Error uploading photo:', error);
          toast.error(`فشل في رفع ${file.name}`);
          
          // Remove failed photo
          setBusinessPhotos(prev => 
            prev.filter((_, index) => index !== tempPhotoIndex)
          );
        }
      }
      
      toast.success('تم رفع الصور بنجاح');
      
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('حدث خطأ في رفع الصور');
    } finally {
      setUploading(false);
    }
  }, [businessPhotos, companyId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true,
  });

  const handleDeletePhoto = (index: number) => {
    setBusinessPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditCaption = (index: number) => {
    setEditingCaption(index);
    setTempCaption(businessPhotos[index].caption || '');
  };

  const handleSaveCaption = (index: number) => {
    setBusinessPhotos(prev => 
      prev.map((photo, i) => 
        i === index ? { ...photo, caption: tempCaption } : photo
      )
    );
    setEditingCaption(null);
    setTempCaption('');
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يجب أن يكون الملف صورة');
      return;
    }

    // Validate file size (max 10MB for banner)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('حجم صورة الغلاف يجب أن يكون أقل من 10 ميجابايت');
      return;
    }

    setUploadingBanner(true);

    try {
      const url = await storageService.uploadBusinessBanner(file, companyId);
      setBanner({ url, caption: banner?.caption || '' });
      toast.success('تم رفع صورة الغلاف بنجاح');
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('حدث خطأ في رفع صورة الغلاف');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDeleteBanner = () => {
    setBanner(null);
  };

  const handleSave = async () => {
    const photosData: LocationPhotos = {
      photos: businessPhotos.filter(p => !p.isUploading),
    };
    
    if (banner) {
      photosData.banner = banner;
    }
    
    await onSave(photosData);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Banner Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Wallpaper color="primary" />
          صورة الغلاف
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          صورة الغلاف ستظهر في صفحة الحجز الإلكتروني وكخلفية رئيسية للعملاء. الحجم الموصى به: 1920×1080 بكسل.
        </Typography>

        {banner ? (
          <Box sx={{ position: 'relative', mb: 3 }}>
            <Box
              sx={{
                width: '100%',
                height: 300,
                borderRadius: 2,
                overflow: 'hidden',
                position: 'relative',
                backgroundImage: `url(${banner.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {uploadingBanner && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(2px)',
                  }}
                >
                  <CircularProgress size={60} />
                </Box>
              )}
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
              {editingBannerCaption ? (
                <TextField
                  fullWidth
                  size="small"
                  value={tempCaption}
                  onChange={(e) => setTempCaption(e.target.value)}
                  placeholder="أضف وصف لصورة الغلاف..."
                  onBlur={() => {
                    setBanner({ ...banner, caption: tempCaption });
                    setEditingBannerCaption(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setBanner({ ...banner, caption: tempCaption });
                      setEditingBannerCaption(false);
                    }
                  }}
                  autoFocus
                />
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => {
                    setTempCaption(banner.caption || '');
                    setEditingBannerCaption(true);
                  }}
                >
                  {banner.caption || 'انقر لإضافة وصف لصورة الغلاف...'}
                </Typography>
              )}
              
              <Button
                variant="outlined"
                size="small"
                component="label"
                disabled={uploadingBanner}
              >
                {uploadingBanner ? 'جاري الرفع...' : 'تغيير'}
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleBannerUpload}
                />
              </Button>
              
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={handleDeleteBanner}
                disabled={uploadingBanner}
              >
                حذف
              </Button>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              backgroundColor: 'action.selected',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              '&:hover': {
                backgroundColor: 'action.hover',
                borderColor: 'primary.main',
              },
            }}
            component="label"
          >
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleBannerUpload}
              disabled={uploadingBanner}
            />
            {uploadingBanner ? (
              <>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  جاري رفع صورة الغلاف...
                </Typography>
              </>
            ) : (
              <>
                <Wallpaper sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  انقر لرفع صورة الغلاف
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  JPG, PNG - الحجم الموصى به: 1920×1080 بكسل<br />حد أقصى 10MB
                </Typography>
              </>
            )}
          </Box>
        )}
      </Paper>

      {/* Gallery Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhotoCamera color="primary" />
          معرض الصور
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          ارفع صور عملك لتظهر للعملاء. يمكنك رفع حتى 10 صور بحد أقصى 5 ميجابايت للصورة الواحدة.
        </Typography>

        {/* Upload Area */}
        <Box
          {...getRootProps()}
          sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'divider',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragActive ? 'action.hover' : 'action.selected',
            mb: 3,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'action.hover',
              borderColor: 'primary.main',
            },
          }}
        >
          <input {...getInputProps()} />
          <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive ? 'أفلت الصور هنا' : 'اسحب الصور هنا أو انقر للاختيار'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            JPG, PNG, GIF, WebP - حد أقصى 5MB
          </Typography>
          <Button
            variant="outlined"
            startIcon={<PhotoCamera />}
            sx={{ mt: 2 }}
            disabled={uploading}
          >
            {uploading ? 'جاري الرفع...' : 'اختر صور'}
          </Button>
        </Box>

        {/* Photos Grid */}
        {businessPhotos.length > 0 && (
          <Grid container spacing={2}>
            {businessPhotos.map((photo, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card sx={{ position: 'relative' }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={photo.url}
                    alt={photo.caption || `صورة ${index + 1}`}
                    sx={{
                      objectFit: 'cover',
                      filter: photo.isUploading ? 'blur(1px)' : 'none',
                    }}
                  />
                  
                  {photo.isUploading && (
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
                        backgroundColor: 'action.hover',
                        backdropFilter: 'blur(2px)',
                      }}
                    >
                      <CircularProgress />
                    </Box>
                  )}
                  
                  <CardContent sx={{ p: 2 }}>
                    {editingCaption === index ? (
                      <TextField
                        fullWidth
                        size="small"
                        value={tempCaption}
                        onChange={(e) => setTempCaption(e.target.value)}
                        placeholder="أضف وصف للصورة..."
                        onBlur={() => handleSaveCaption(index)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveCaption(index);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ minHeight: 20, cursor: 'pointer' }}
                        onClick={() => handleEditCaption(index)}
                      >
                        {photo.caption || 'انقر لإضافة وصف...'}
                      </Typography>
                    )}
                  </CardContent>
                  
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Box>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditCaption(index)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton size="small" color="inherit">
                        <DragIndicator />
                      </IconButton>
                    </Box>
                    
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeletePhoto(index)}
                      disabled={photo.isUploading}
                    >
                      <Delete />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {businessPhotos.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            لم يتم رفع أي صور بعد. ارفع صور لعملك لجذب المزيد من العملاء.
          </Alert>
        )}
      </Paper>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={saving || uploading || uploadingBanner || businessPhotos.some(p => p.isUploading)}
          sx={{
            minWidth: 200,
            backgroundColor: '#00bcd4',
            '&:hover': { backgroundColor: '#00acc1' },
          }}
        >
          {saving ? <CircularProgress size={24} /> : 'حفظ الصور'}
        </Button>
      </Box>
    </Box>
  );
};

export default PhotosTab;