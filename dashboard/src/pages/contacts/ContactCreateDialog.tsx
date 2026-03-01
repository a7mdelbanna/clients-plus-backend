import React, { useState } from 'react';
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
  Chip,
  Alert,
  InputAdornment,
  Divider,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { contactService } from '../../services/contact.service';
import type { Contact, ContactStatus } from '../../types/contact.types';
import { ContactType } from '../../types/contact.types';

interface ContactCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: ContactType;
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
      id={`contact-tabpanel-${index}`}
      aria-labelledby={`contact-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function ContactCreateDialog({
  open,
  onClose,
  onSuccess,
  initialType = ContactType.VENDOR,
}: ContactCreateDialogProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  // Form state
  const [formData, setFormData] = useState<Partial<Contact>>({
    type: initialType,
    status: 'active' as ContactStatus,
    displayName: '',
    firstName: '',
    lastName: '',
    companyName: '',
    nameAr: '',
    taxNumber: '',
    notes: '',
    phones: [{ number: '', type: 'mobile', isPrimary: true }],
    emails: [{ email: '', type: 'personal', isPrimary: true }],
    addresses: [],
    tags: [],
  });

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
    console.log('Submit button clicked');
    console.log('Current user:', currentUser);
    console.log('Current user companyId:', currentUser?.companyId);
    
    // Check for user and companyId
    if (!currentUser) {
      console.error('No user found');
      setError('يرجى تسجيل الدخول أولاً');
      return;
    }

    // Get companyId from user
    const companyId = currentUser.companyId;

    if (!companyId) {
      console.error('No companyId found');
      setError('لم يتم العثور على معرف الشركة. يرجى تسجيل الخروج والدخول مرة أخرى');
      return;
    }

    // Validation
    if (!formData.displayName?.trim()) {
      setError('يرجى إدخال الاسم المعروض');
      setCurrentTab(0); // Switch to first tab where displayName is
      return;
    }

    if (!formData.type) {
      setError('يرجى اختيار نوع جهة الاتصال');
      setCurrentTab(0);
      return;
    }

    console.log('Submitting contact data:', formData);

    try {
      setLoading(true);
      setError(null);

      // Clean up empty phones and emails
      const cleanedPhones = (formData.phones || []).filter(p => p.number.trim());
      const cleanedEmails = (formData.emails || []).filter(e => e.email.trim());

      // Prepare contact data
      const contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'code'> = {
        companyId,
        type: formData.type,
        status: formData.status || 'active',
        displayName: formData.displayName.trim(),
        firstName: formData.firstName?.trim(),
        lastName: formData.lastName?.trim(),
        nameAr: formData.nameAr?.trim(),
        companyName: formData.companyName?.trim(),
        phones: cleanedPhones,
        emails: cleanedEmails,
        addresses: formData.addresses || [],
        tags: formData.tags || [],
        createdBy: currentUser?.id,
      };

      // Add optional fields only if they have values
      if (formData.taxNumber?.trim()) {
        contactData.taxNumber = formData.taxNumber.trim();
      }
      if (formData.notes?.trim()) {
        contactData.notes = formData.notes.trim();
      }

      console.log('Creating contact with data:', contactData);
      const newContact = await contactService.createContact(contactData);
      console.log('Contact created successfully:', newContact);
      
      // Show success message
      setSuccessMessage('تم إنشاء جهة الاتصال بنجاح');
      setError(null);
      
      // Small delay to ensure Firestore has indexed the document
      setTimeout(() => {
        console.log('Calling onSuccess to refresh list');
        onSuccess();
      }, 500);
      
      // Reset form for next use
      setFormData({
        type: initialType,
        status: 'active' as ContactStatus,
        displayName: '',
        firstName: '',
        lastName: '',
        companyName: '',
        nameAr: '',
        taxNumber: '',
        notes: '',
        phones: [{ number: '', type: 'mobile', isPrimary: true }],
        emails: [{ email: '', type: 'personal', isPrimary: true }],
        addresses: [],
        tags: [],
      });
      setCurrentTab(0);
      
      // Wait a moment to show success, then close
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
      }, 2000);
    } catch (err: any) {
      console.error('Error creating contact:', err);
      
      // Show more specific error messages
      if (err?.message?.includes('permission')) {
        setError('ليس لديك الصلاحية لإنشاء جهة اتصال. يرجى التواصل مع المسؤول');
      } else if (err?.message?.includes('network')) {
        setError('خطأ في الاتصال بالإنترنت. يرجى التحقق من الاتصال والمحاولة مرة أخرى');
      } else {
        setError(`حدث خطأ: ${err?.message || 'فشل في إنشاء جهة الاتصال'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Import contactTypeConfig to get Arabic labels
  const contactTypeConfig = {
    [ContactType.CLIENT]: { label: 'عميل' },
    [ContactType.VENDOR]: { label: 'مورد' },
    [ContactType.EMPLOYEE]: { label: 'موظف' },
    [ContactType.SUPPLIER]: { label: 'مزود' },
    [ContactType.PARTNER]: { label: 'شريك' },
    [ContactType.CONTRACTOR]: { label: 'مقاول' },
    [ContactType.OTHER]: { label: 'أخرى' },
  };

  const contactTypeOptions = Object.entries(ContactType)
    .filter(([key, value]) => value !== ContactType.CLIENT && value !== ContactType.EMPLOYEE) // Exclude CLIENT and EMPLOYEE types
    .map(([key, value]) => ({
      value,
      label: contactTypeConfig[value].label,
    }));

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minHeight: '60vh'
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">جهة اتصال جديدة</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mx: -3, px: 3 }}>
          <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} variant="fullWidth">
            <Tab label="معلومات أساسية" />
            <Tab label="معلومات الاتصال" />
            <Tab label="معلومات إضافية" />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Type and Status Row */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <FormControl fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  value={formData.type}
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
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  label="الحالة"
                >
                  <MenuItem value="active">نشط</MenuItem>
                  <MenuItem value="inactive">غير نشط</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Display Name */}
            <TextField
              fullWidth
              label="الاسم المعروض"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              required
              helperText="هذا هو الاسم الذي سيظهر في النظام"
            />

            {/* First and Last Name for Individuals */}
            {(formData.type === ContactType.CLIENT || formData.type === ContactType.EMPLOYEE) && (
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  fullWidth
                  label="الاسم الأول"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                />
                <TextField
                  fullWidth
                  label="الاسم الأخير"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                />
              </Box>
            )}

            {/* Company Name for Business Contacts */}
            {(formData.type === ContactType.VENDOR || formData.type === ContactType.SUPPLIER || formData.type === ContactType.PARTNER) && (
              <TextField
                fullWidth
                label="اسم الشركة"
                value={formData.companyName || ''}
                onChange={(e) => handleChange('companyName', e.target.value)}
              />
            )}

            {/* Arabic Name and Tax Number */}
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                fullWidth
                label="الاسم بالعربية"
                value={formData.nameAr || ''}
                onChange={(e) => handleChange('nameAr', e.target.value)}
              />
              <TextField
                fullWidth
                label="الرقم الضريبي"
                value={formData.taxNumber || ''}
                onChange={(e) => handleChange('taxNumber', e.target.value)}
              />
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Phone Numbers Section */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  <PhoneIcon sx={{ fontSize: 20, verticalAlign: 'middle', mr: 1 }} />
                  أرقام الهاتف
                </Typography>
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

            <Divider />

            {/* Email Addresses Section */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  <EmailIcon sx={{ fontSize: 20, verticalAlign: 'middle', mr: 1 }} />
                  عناوين البريد الإلكتروني
                </Typography>
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
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="ملاحظات"
              value={formData.notes || ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              multiline
              rows={4}
              placeholder="أي ملاحظات إضافية حول جهة الاتصال"
            />
            
            {/* Tags Section */}
            <Box>
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
            </Box>
          </Box>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !formData.displayName?.trim()}
          sx={{ minWidth: 120, position: 'relative' }}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {loading ? 'جاري الحفظ...' : 'حفظ'}
        </Button>
      </DialogActions>
      
      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSuccessMessage(null)} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}