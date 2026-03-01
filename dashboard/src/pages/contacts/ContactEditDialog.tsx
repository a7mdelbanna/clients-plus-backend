import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Grid,
  Chip,
  Alert,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { contactService } from '../../services/contact.service';
import type { Contact, ContactStatus } from '../../types/contact.types';
import { ContactType } from '../../types/contact.types';

interface ContactEditDialogProps {
  open: boolean;
  contact: Contact | null;
  onClose: () => void;
  onSuccess: () => void;
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
      id={`contact-edit-tabpanel-${index}`}
      aria-labelledby={`contact-edit-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function ContactEditDialog({
  open,
  contact,
  onClose,
  onSuccess,
}: ContactEditDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);
  const [formData, setFormData] = useState<Partial<Contact>>({});

  // Initialize form data when contact changes
  useEffect(() => {
    if (contact) {
      setFormData({
        ...contact,
        phones: contact.phones || [{ number: '', type: 'mobile', isPrimary: true }],
        emails: contact.emails || [{ email: '', type: 'personal', isPrimary: true }],
        addresses: contact.addresses || [],
        tags: contact.tags || [],
      });
    }
  }, [contact]);

  // Handle input changes
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle phone changes
  const handlePhoneChange = (index: number, field: string, value: string) => {
    const newPhones = [...(formData.phones || [])];
    newPhones[index] = { ...newPhones[index], [field]: value };
    setFormData(prev => ({ ...prev, phones: newPhones }));
  };

  const addPhone = () => {
    setFormData(prev => ({
      ...prev,
      phones: [...(prev.phones || []), { number: '', type: 'mobile', isPrimary: false }],
    }));
  };

  const removePhone = (index: number) => {
    const newPhones = (formData.phones || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, phones: newPhones }));
  };

  // Handle email changes
  const handleEmailChange = (index: number, field: string, value: string) => {
    const newEmails = [...(formData.emails || [])];
    newEmails[index] = { ...newEmails[index], [field]: value };
    setFormData(prev => ({ ...prev, emails: newEmails }));
  };

  const addEmail = () => {
    setFormData(prev => ({
      ...prev,
      emails: [...(prev.emails || []), { email: '', type: 'personal', isPrimary: false }],
    }));
  };

  const removeEmail = (index: number) => {
    const newEmails = (formData.emails || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, emails: newEmails }));
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!user?.companyId || !contact?.id) return;

    // Validation
    if (!formData.displayName?.trim()) {
      setError('يرجى إدخال الاسم');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Clean up empty phones and emails
      const cleanedPhones = (formData.phones || []).filter(p => p.number.trim());
      const cleanedEmails = (formData.emails || []).filter(e => e.email.trim());

      // Prepare update data
      const updateData: Partial<Contact> = {
        type: formData.type!,
        status: formData.status!,
        displayName: formData.displayName.trim(),
        firstName: formData.firstName?.trim(),
        lastName: formData.lastName?.trim(),
        nameAr: formData.nameAr?.trim(),
        companyName: formData.companyName?.trim(),
        phones: cleanedPhones,
        emails: cleanedEmails,
        addresses: formData.addresses || [],
        tags: formData.tags || [],
      };

      // Add optional fields only if they have values
      if (formData.taxNumber?.trim()) {
        updateData.taxNumber = formData.taxNumber.trim();
      }
      if (formData.notes?.trim()) {
        updateData.notes = formData.notes.trim();
      }

      await contactService.updateContact(user.companyId, contact.id, updateData);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating contact:', err);
      setError('حدث خطأ في تحديث جهة الاتصال');
    } finally {
      setLoading(false);
    }
  };

  const contactTypeOptions = Object.entries(ContactType).map(([key, value]) => ({
    value,
    label: key.charAt(0) + key.slice(1).toLowerCase(),
  }));

  if (!contact) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">تعديل جهة الاتصال</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
            <Tab label="معلومات أساسية" />
            <Tab label="معلومات الاتصال" />
            <Tab label="معلومات إضافية" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  value={formData.type || ''}
                  onChange={(e) => handleChange('type', e.target.value)}
                  label="النوع"
                >
                  {contactTypeOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={formData.status || ''}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="الحالة"
                >
                  <MenuItem value="active">نشط</MenuItem>
                  <MenuItem value="inactive">غير نشط</MenuItem>
                  <MenuItem value="blocked">محظور</MenuItem>
                  <MenuItem value="archived">مؤرشف</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الاسم المعروض"
                value={formData.displayName || ''}
                onChange={(e) => handleChange('displayName', e.target.value)}
                required
              />
            </Grid>
            {(formData.type === ContactType.CLIENT || formData.type === ContactType.EMPLOYEE) && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="الاسم الأول"
                    value={formData.firstName || ''}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="الاسم الأخير"
                    value={formData.lastName || ''}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                  />
                </Grid>
              </>
            )}
            {(formData.type === ContactType.VENDOR || formData.type === ContactType.SUPPLIER || formData.type === ContactType.PARTNER) && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="اسم الشركة"
                  value={formData.companyName || ''}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                />
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الاسم بالعربية"
                value={formData.nameAr || ''}
                onChange={(e) => handleChange('nameAr', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الرقم الضريبي"
                value={formData.taxNumber || ''}
                onChange={(e) => handleChange('taxNumber', e.target.value)}
              />
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">أرقام الهاتف</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addPhone}>
                إضافة رقم
              </Button>
            </Box>
            {formData.phones?.map((phone, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="رقم الهاتف"
                  value={phone.number}
                  onChange={(e) => handlePhoneChange(index, 'number', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={phone.type}
                    onChange={(e) => handlePhoneChange(index, 'type', e.target.value)}
                  >
                    <MenuItem value="mobile">محمول</MenuItem>
                    <MenuItem value="home">منزل</MenuItem>
                    <MenuItem value="work">عمل</MenuItem>
                    <MenuItem value="other">أخرى</MenuItem>
                  </Select>
                </FormControl>
                {formData.phones!.length > 1 && (
                  <IconButton size="small" onClick={() => removePhone(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">عناوين البريد الإلكتروني</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addEmail}>
                إضافة بريد
              </Button>
            </Box>
            {formData.emails?.map((email, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="البريد الإلكتروني"
                  type="email"
                  value={email.email}
                  onChange={(e) => handleEmailChange(index, 'email', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={email.type}
                    onChange={(e) => handleEmailChange(index, 'type', e.target.value)}
                  >
                    <MenuItem value="personal">شخصي</MenuItem>
                    <MenuItem value="work">عمل</MenuItem>
                    <MenuItem value="other">أخرى</MenuItem>
                  </Select>
                </FormControl>
                {formData.emails!.length > 1 && (
                  <IconButton size="small" onClick={() => removeEmail(index)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                multiline
                rows={4}
                placeholder="أي ملاحظات إضافية حول جهة الاتصال"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>العلامات</Typography>
              <TextField
                fullWidth
                placeholder="أدخل علامة واضغط Enter"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = (e.target as HTMLInputElement).value.trim();
                    if (value && !formData.tags?.includes(value)) {
                      handleChange('tags', [...(formData.tags || []), value]);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                {formData.tags?.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    size="small"
                    onDelete={() => {
                      const newTags = formData.tags!.filter((_, i) => i !== index);
                      handleChange('tags', newTags);
                    }}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !formData.displayName?.trim()}
        >
          {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}