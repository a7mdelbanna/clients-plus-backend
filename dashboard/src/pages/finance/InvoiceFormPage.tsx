import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
  Divider,
  Autocomplete,
  CircularProgress,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Send,
  Add,
  Delete,
  CalendarToday,
  AttachMoney,
  Person,
  Business,
  Description,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { motion } from 'framer-motion';
import { addDays, format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { invoiceService } from '../../services/invoice.service';
import { clientService } from '../../services/client.service';
import { serviceService } from '../../services/service.service';
import { productService } from '../../services/product.service';
import { locationService } from '../../services/location.service';
import type {
  Invoice,
  InvoiceItem,
  InvoiceSettings,
} from '../../types/invoice.types';
import type { Client } from '../../types/client.types';
import type { Service } from '../../types/service.types';
import type { Product } from '../../types/product.types';
import { toast } from 'react-toastify';
import { toDateSafe } from '../../utils/dateUtils';

const InvoiceFormPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { invoiceId } = useParams();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';
  const isEditMode = !!invoiceId;

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  
  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [invoiceDate, setInvoiceDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(addDays(new Date(), 30));
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');
  const [notesAr, setNotesAr] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [paymentTermsAr, setPaymentTermsAr] = useState('');

  // Calculated values
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = items.reduce((sum, item) => sum + (item.vatAmount || 0), 0);
  const totalAmount = subtotal + vatAmount;

  // Load initial data
  useEffect(() => {
    if (currentUser) {
      loadInitialData();
    }
  }, [currentUser, currentBranch]);

  // Load invoice for edit mode
  useEffect(() => {
    if (isEditMode && currentUser) {
      loadInvoice();
    }
  }, [isEditMode, currentUser, invoiceId]);

  const loadInitialData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const companyId = currentUser?.companyId;

      if (!companyId) {
        toast.error(isRTL ? 'لم يتم العثور على معرف الشركة' : 'Company ID not found');
        return;
      }

      // Load data in parallel
      const [
        clientsResult,
        servicesResult,
        productsResult,
        settingsData,
        locationData,
      ] = await Promise.all([
        clientService.getClients(companyId, { branchId: currentBranch?.id }),
        serviceService.getServices(companyId),
        productService.getProducts(companyId, { branchId: currentBranch?.id }),
        invoiceService.getSettings(companyId),
        locationService.getLocationSettings(companyId, currentBranch?.id),
      ]);

      setClients(clientsResult.clients);
      setServices(servicesResult);
      setProducts(productsResult.products);
      setSettings(settingsData);
      
      // Set business info
      if (locationData) {
        setBusinessInfo({
          businessName: locationData.basic?.businessName || locationData.basic?.locationName,
          businessNameAr: locationData.basic?.businessNameAr || locationData.basic?.locationNameAr,
          businessAddress: locationData.contact?.address,
          businessPhone: locationData.contact?.phoneNumbers?.[0],
          businessEmail: locationData.contact?.email,
          businessTaxNumber: locationData.basic?.taxNumber,
          businessLogo: locationData.basic?.logoUrl,
        });
      }

      // Set default values from settings
      if (settingsData) {
        setPaymentTerms(settingsData.defaultPaymentTerms || '');
        setPaymentTermsAr(settingsData.defaultPaymentTermsAr || '');
        setNotes(settingsData.defaultNotes || '');
        setNotesAr(settingsData.defaultNotesAr || '');
        
        if (settingsData.defaultDueDays) {
          setDueDate(addDays(new Date(), settingsData.defaultDueDays));
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error(isRTL ? 'خطأ في تحميل البيانات' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoice = async () => {
    if (!currentUser || !invoiceId) return;

    try {
      const companyId = currentUser?.companyId;

      const invoice = await invoiceService.getInvoice(companyId, invoiceId);
      if (!invoice) {
        toast.error(isRTL ? 'الفاتورة غير موجودة' : 'Invoice not found');
        navigate('/finance/invoices');
        return;
      }

      // Set form values
      const client = clients.find(c => c.id === invoice.clientId);
      setSelectedClient(client || null);
      setInvoiceDate(toDateSafe(invoice.invoiceDate));
      setDueDate(toDateSafe(invoice.dueDate));
      setItems(invoice.items);
      setNotes(invoice.notes || '');
      setNotesAr(invoice.notesAr || '');
      setPaymentTerms(invoice.paymentTerms || '');
      setPaymentTermsAr(invoice.paymentTermsAr || '');
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error(isRTL ? 'خطأ في تحميل الفاتورة' : 'Error loading invoice');
    }
  };

  // Item management
  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      type: 'custom',
      name: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: settings?.defaultVatRate || 14,
      vatAmount: 0,
      discount: 0,
      discountType: 'fixed',
      total: 0,
      totalWithVat: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<InvoiceItem>) => {
    const updatedItems = [...items];
    const item = { ...updatedItems[index], ...updates };
    
    // Recalculate totals
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = item.discountType === 'percentage' 
      ? (subtotal * (item.discount || 0) / 100)
      : (item.discount || 0);
    const total = subtotal - discountAmount;
    const vatAmount = total * ((item.vatRate || 0) / 100);
    const totalWithVat = total + vatAmount;
    
    item.total = total;
    item.vatAmount = vatAmount;
    item.totalWithVat = totalWithVat;
    
    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addServiceItem = (service: Service) => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      type: 'service',
      serviceId: service.id,
      name: service.name,
      nameAr: service.nameAr,
      description: service.description,
      descriptionAr: service.descriptionAr,
      quantity: 1,
      unitPrice: service.startingPrice || 0,
      vatRate: service.vat || settings?.defaultVatRate || 14,
      vatAmount: 0,
      discount: 0,
      discountType: 'fixed',
      total: service.startingPrice || 0,
      totalWithVat: 0,
    };
    
    // Calculate VAT
    const vatAmount = newItem.total * (newItem.vatRate! / 100);
    newItem.vatAmount = vatAmount;
    newItem.totalWithVat = newItem.total + vatAmount;
    
    setItems([...items, newItem]);
  };

  const addProductItem = (product: Product) => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      type: 'product',
      productId: product.id,
      name: product.name,
      nameAr: product.nameAr,
      description: product.description,
      descriptionAr: product.descriptionAr,
      quantity: 1,
      unitPrice: product.retailPrice,
      vatRate: product.vatRate || settings?.defaultVatRate || 14,
      vatAmount: 0,
      discount: 0,
      discountType: 'fixed',
      total: product.retailPrice,
      totalWithVat: 0,
    };
    
    // Calculate VAT
    const vatAmount = newItem.total * (newItem.vatRate! / 100);
    newItem.vatAmount = vatAmount;
    newItem.totalWithVat = newItem.total + vatAmount;
    
    setItems([...items, newItem]);
  };

  // Save invoice
  const handleSave = async (sendInvoice = false) => {
    if (!currentUser || !selectedClient) {
      toast.error(isRTL ? 'الرجاء اختيار العميل' : 'Please select a client');
      return;
    }

    if (items.length === 0) {
      toast.error(isRTL ? 'الرجاء إضافة عناصر للفاتورة' : 'Please add items to the invoice');
      return;
    }

    try {
      setSaving(true);
      const companyId = currentUser?.companyId;

      const invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'> = {
        companyId,
        branchId: currentBranch?.id,
        invoiceNumber: '', // Will be auto-generated
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        clientId: selectedClient.id!,
        clientName: selectedClient.name || `${selectedClient.firstName} ${selectedClient.lastName}`,
        clientEmail: selectedClient.email,
        clientPhone: selectedClient.phoneNumbers?.[0],
        clientAddress: selectedClient.address?.street,
        clientTaxNumber: selectedClient.taxNumber,
        ...businessInfo,
        items,
        subtotal,
        vatAmount,
        discountAmount: 0, // TODO: Add overall discount
        totalAmount,
        paidAmount: 0,
        dueAmount: totalAmount,
        status: sendInvoice ? 'sent' : 'draft',
        paymentStatus: 'unpaid',
        payments: [],
        paymentTerms,
        paymentTermsAr,
        notes,
        notesAr,
        createdBy: currentUser?.id,
      };

      if (isEditMode) {
        await invoiceService.updateInvoice(companyId, invoiceId!, invoiceData);
        toast.success(isRTL ? 'تم تحديث الفاتورة بنجاح' : 'Invoice updated successfully');
      } else {
        const newInvoiceId = await invoiceService.createInvoice(invoiceData);
        toast.success(isRTL ? 'تم إنشاء الفاتورة بنجاح' : 'Invoice created successfully');
        
        if (sendInvoice) {
          await invoiceService.sendInvoice(companyId, newInvoiceId, selectedClient.email);
          toast.success(isRTL ? 'تم إرسال الفاتورة بنجاح' : 'Invoice sent successfully');
        }
      }

      navigate('/finance/invoices');
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(isRTL ? 'خطأ في حفظ الفاتورة' : 'Error saving invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <IconButton onClick={() => navigate('/finance/invoices')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEditMode
              ? isRTL ? 'تعديل الفاتورة' : 'Edit Invoice'
              : isRTL ? 'فاتورة جديدة' : 'New Invoice'}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        {/* Main Content */}
        <Box>
          {/* Client Selection */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                {isRTL ? 'معلومات العميل' : 'Client Information'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Autocomplete
                options={clients}
                value={selectedClient}
                onChange={(_, value) => setSelectedClient(value)}
                getOptionLabel={(option) => 
                  option.name || `${option.firstName} ${option.lastName}`
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={isRTL ? 'اختر العميل' : 'Select Client'}
                    required
                  />
                )}
              />
              
              {selectedClient && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedClient.email && `${isRTL ? 'البريد الإلكتروني:' : 'Email:'} ${selectedClient.email}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedClient.phoneNumbers?.[0] && `${isRTL ? 'الهاتف:' : 'Phone:'} ${selectedClient.phoneNumbers[0]}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedClient.address?.street && `${isRTL ? 'العنوان:' : 'Address:'} ${selectedClient.address.street}`}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">
                  <Description sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {isRTL ? 'عناصر الفاتورة' : 'Invoice Items'}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={addItem}
                  >
                    {isRTL ? 'عنصر مخصص' : 'Custom Item'}
                  </Button>
                  <Autocomplete
                    options={services}
                    getOptionLabel={(option) => option.name}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder={isRTL ? 'إضافة خدمة' : 'Add Service'}
                      />
                    )}
                    onChange={(_, value) => value && addServiceItem(value)}
                    sx={{ width: 200 }}
                  />
                  <Autocomplete
                    options={products}
                    getOptionLabel={(option) => option.name}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder={isRTL ? 'إضافة منتج' : 'Add Product'}
                      />
                    )}
                    onChange={(_, value) => value && addProductItem(value)}
                    sx={{ width: 200 }}
                  />
                </Stack>
              </Stack>
              <Divider sx={{ my: 2 }} />

              {items.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">
                    {isRTL ? 'لا توجد عناصر في الفاتورة' : 'No items in invoice'}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {items.map((item, index) => (
                    <Paper key={item.id} sx={{ p: 2, mb: 2 }} variant="outlined">
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr 0.5fr 0.5fr 0.5fr' }, gap: 2, alignItems: 'center' }}>
                        <Box>
                          <TextField
                            fullWidth
                            size="small"
                            label={isRTL ? 'الاسم' : 'Name'}
                            value={item.name}
                            onChange={(e) => updateItem(index, { name: e.target.value })}
                            required
                          />
                        </Box>
                        <Box>
                          <TextField
                            fullWidth
                            size="small"
                            label={isRTL ? 'الكمية' : 'Quantity'}
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 0 })}
                            required
                          />
                        </Box>
                        <Box>
                          <TextField
                            fullWidth
                            size="small"
                            label={isRTL ? 'السعر' : 'Price'}
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">EGP</InputAdornment>,
                            }}
                            required
                          />
                        </Box>
                        <Box>
                          <TextField
                            fullWidth
                            size="small"
                            label={isRTL ? 'ض.ق.م %' : 'VAT %'}
                            type="number"
                            value={item.vatRate}
                            onChange={(e) => updateItem(index, { vatRate: parseFloat(e.target.value) || 0 })}
                          />
                        </Box>
                        <Box>
                          <Typography variant="h6" align="center">
                            {item.totalWithVat.toFixed(2)}
                          </Typography>
                        </Box>
                        <Box>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeItem(index)}
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                        <Box sx={{ gridColumn: '1 / -1' }}>
                          <TextField
                            fullWidth
                            size="small"
                            label={isRTL ? 'الوصف' : 'Description'}
                            value={item.description}
                            onChange={(e) => updateItem(index, { description: e.target.value })}
                            multiline
                            rows={2}
                          />
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              )}

              {/* Totals */}
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                  <Box>
                    <Typography align="right" color="text.secondary">
                      {isRTL ? 'المجموع الفرعي:' : 'Subtotal:'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography align="right" variant="h6">
                      {subtotal.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography align="right" color="text.secondary">
                      {isRTL ? 'ض.ق.م:' : 'VAT:'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography align="right" variant="h6">
                      {vatAmount.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                    </Typography>
                  </Box>
                  <Box sx={{ gridColumn: '1 / -1' }}>
                    <Divider />
                  </Box>
                  <Box>
                    <Typography align="right" variant="h6">
                      {isRTL ? 'الإجمالي:' : 'Total:'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography align="right" variant="h4" color="primary">
                      {totalAmount.toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {isRTL ? 'ملاحظات إضافية' : 'Additional Notes'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                <Box>
                  <TextField
                    fullWidth
                    label={isRTL ? 'شروط الدفع' : 'Payment Terms'}
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    multiline
                    rows={3}
                  />
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label={isRTL ? 'شروط الدفع (عربي)' : 'Payment Terms (Arabic)'}
                    value={paymentTermsAr}
                    onChange={(e) => setPaymentTermsAr(e.target.value)}
                    multiline
                    rows={3}
                    dir="rtl"
                  />
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label={isRTL ? 'ملاحظات' : 'Notes'}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    multiline
                    rows={3}
                  />
                </Box>
                <Box>
                  <TextField
                    fullWidth
                    label={isRTL ? 'ملاحظات (عربي)' : 'Notes (Arabic)'}
                    value={notesAr}
                    onChange={(e) => setNotesAr(e.target.value)}
                    multiline
                    rows={3}
                    dir="rtl"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Sidebar */}
        <Box>
          {/* Invoice Details */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <CalendarToday sx={{ mr: 1, verticalAlign: 'middle' }} />
                {isRTL ? 'تفاصيل الفاتورة' : 'Invoice Details'}
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Stack spacing={2}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label={isRTL ? 'تاريخ الفاتورة' : 'Invoice Date'}
                    value={invoiceDate}
                    onChange={(value) => value && setInvoiceDate(value)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  <DatePicker
                    label={isRTL ? 'تاريخ الاستحقاق' : 'Due Date'}
                    value={dueDate}
                    onChange={(value) => value && setDueDate(value)}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Stack>
            </CardContent>
          </Card>

          {/* Business Info */}
          {businessInfo && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Business sx={{ mr: 1, verticalAlign: 'middle' }} />
                  {isRTL ? 'معلومات الشركة' : 'Business Information'}
                </Typography>
                <Divider sx={{ my: 2 }} />
                
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    {businessInfo.businessName}
                  </Typography>
                  {businessInfo.businessAddress && (
                    <Typography variant="body2" color="text.secondary">
                      {businessInfo.businessAddress}
                    </Typography>
                  )}
                  {businessInfo.businessPhone && (
                    <Typography variant="body2" color="text.secondary">
                      {businessInfo.businessPhone}
                    </Typography>
                  )}
                  {businessInfo.businessEmail && (
                    <Typography variant="body2" color="text.secondary">
                      {businessInfo.businessEmail}
                    </Typography>
                  )}
                  {businessInfo.businessTaxNumber && (
                    <Typography variant="body2" color="text.secondary">
                      {isRTL ? 'الرقم الضريبي:' : 'Tax Number:'} {businessInfo.businessTaxNumber}
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={<Save />}
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {isRTL ? 'حفظ كمسودة' : 'Save as Draft'}
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={<Send />}
                  onClick={() => handleSave(true)}
                  disabled={saving}
                >
                  {isRTL ? 'حفظ وإرسال' : 'Save & Send'}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => navigate('/finance/invoices')}
                  disabled={saving}
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
};

export default InvoiceFormPage;