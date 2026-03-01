import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  FormHelperText,
} from '@mui/material';
import {
  Save,
  Cancel,
  Add,
  Delete,
  PhotoCamera,
  QrCode,
  Inventory,
  AttachMoney,
  Category,
  LocalShipping,
  Settings,
  ArrowBack,
  Upload,
  Visibility,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { productService } from '../../services/product.service';
import { branchService } from '../../services/branch.service';
import type { Product, ProductCategory, ProductType } from '../../types/product.types';
import type { Branch } from '../../services/branch.service';
import ProductBarcode from '../../components/products/ProductBarcode';
import { generateBarcode, validateBarcode } from '../../utils/barcodeGenerator';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const ProductFormPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { productId } = useParams();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';
  const isEditMode = !!productId;

  // State
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [productImages, setProductImages] = useState<string[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    barcode: '',
    sku: '',
    categoryId: '',
    type: 'retail' as ProductType,
    purchasePrice: 0,
    retailPrice: 0,
    vatRate: 14, // Default Egypt VAT
    trackInventory: true,
    lowStockThreshold: 10,
    reorderPoint: 20,
    reorderQuantity: 50,
    vendorId: '',
    vendorSku: '',
    linkedServices: [] as string[],
    status: 'active' as const,
  });

  // Branch stock state
  const [branchStock, setBranchStock] = useState<{ [branchId: string]: { quantity: number; location: string } }>({});
  
  // Barcode preview dialog
  const [showBarcodePreview, setShowBarcodePreview] = useState(false);

  // Load data
  useEffect(() => {
    loadInitialData();
  }, [productId, currentUser?.companyId]);

  const loadInitialData = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);

      // Load categories
      const categoriesData = await productService.getCategories(currentUser.companyId);
      setCategories(categoriesData);

      // Load branches
      const branchesData = await branchService.getBranches(currentUser.companyId);
      setBranches(branchesData.filter(b => b.isActive));

      // Initialize branch stock state
      const initialBranchStock: { [branchId: string]: { quantity: number; location: string } } = {};
      branchesData.forEach(branch => {
        if (branch.id) {
          initialBranchStock[branch.id] = { quantity: 0, location: '' };
        }
      });
      setBranchStock(initialBranchStock);

      // Load product if editing
      if (isEditMode && productId) {
        const product = await productService.getProduct(currentUser.companyId, productId);
        if (product) {
          setFormData({
            name: product.name,
            nameAr: product.nameAr,
            description: product.description || '',
            descriptionAr: product.descriptionAr || '',
            barcode: product.barcode || '',
            sku: product.sku || '',
            categoryId: product.categoryId || '',
            type: product.type,
            purchasePrice: product.purchasePrice,
            retailPrice: product.retailPrice,
            vatRate: product.vatRate || 14,
            trackInventory: product.trackInventory,
            lowStockThreshold: product.lowStockThreshold || 10,
            reorderPoint: product.reorderPoint || 20,
            reorderQuantity: product.reorderQuantity || 50,
            vendorId: product.vendorId || '',
            vendorSku: product.vendorSku || '',
            linkedServices: product.linkedServices || [],
            status: product.status,
          });

          if (product.images) {
            setProductImages(product.images);
          }

          if (product.branchStock) {
            const updatedBranchStock = { ...initialBranchStock };
            Object.entries(product.branchStock).forEach(([branchId, stock]) => {
              updatedBranchStock[branchId] = {
                quantity: stock.quantity,
                location: stock.location || '',
              };
            });
            setBranchStock(updatedBranchStock);
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleSubmit = async () => {
    if (!currentUser?.companyId) return;

    try {
      setSaving(true);

      // Prepare branch stock data
      const branchStockData: Product['branchStock'] = {};
      Object.entries(branchStock).forEach(([branchId, stock]) => {
        if (formData.trackInventory) {
          branchStockData[branchId] = {
            quantity: stock.quantity,
            reservedQuantity: 0,
            location: stock.location,
          };
        }
      });

      const productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        companyId: currentUser.companyId,
        images: productImages,
        primaryImage: productImages.length > 0 ? productImages[0] : null,
        branchStock: branchStockData,
        createdBy: currentUser.id,
      };

      if (isEditMode && productId) {
        await productService.updateProduct(currentUser.companyId, productId, productData);
      } else {
        await productService.createProduct(productData);
      }

      navigate('/products');
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !currentUser?.companyId) return;

    try {
      for (const file of Array.from(files)) {
        // TODO: Implement image upload to Firebase Storage
        // For now, we'll use a placeholder
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setProductImages(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Error uploading images:', error);
    }
  };

  const handleGenerateBarcode = () => {
    // Generate a proper barcode with Egypt country code prefix
    const barcode = generateBarcode('200'); // 200 is Egypt's country code
    setFormData(prev => ({ ...prev, barcode }));
    toast.success(isRTL ? 'تم توليد الباركود بنجاح' : 'Barcode generated successfully');
  };

  const handleGenerateSKU = () => {
    const category = categories.find(c => c.id === formData.categoryId);
    const categoryCode = category?.name.substring(0, 3).toUpperCase() || 'PRD';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const sku = `${categoryCode}-${random}`;
    setFormData(prev => ({ ...prev, sku }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
          <IconButton onClick={() => navigate('/products')}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1">
            {isEditMode
              ? (isRTL ? 'تعديل المنتج' : 'Edit Product')
              : (isRTL ? 'إضافة منتج جديد' : 'Add New Product')}
          </Typography>
        </Stack>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label={isRTL ? 'معلومات أساسية' : 'Basic Info'} icon={<Inventory />} iconPosition="start" />
          <Tab label={isRTL ? 'التسعير' : 'Pricing'} icon={<AttachMoney />} iconPosition="start" />
          <Tab label={isRTL ? 'المخزون' : 'Inventory'} icon={<LocalShipping />} iconPosition="start" />
          <Tab label={isRTL ? 'الصور' : 'Images'} icon={<PhotoCamera />} iconPosition="start" />
          <Tab label={isRTL ? 'إعدادات' : 'Settings'} icon={<Settings />} iconPosition="start" />
        </Tabs>
      </Paper>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {/* Basic Info Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={isRTL ? 'اسم المنتج' : 'Product Name'}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                required
                label={isRTL ? 'اسم المنتج (عربي)' : 'Product Name (Arabic)'}
                value={formData.nameAr}
                onChange={(e) => setFormData(prev => ({ ...prev, nameAr: e.target.value }))}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={isRTL ? 'الوصف' : 'Description'}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label={isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}
                value={formData.descriptionAr}
                onChange={(e) => setFormData(prev => ({ ...prev, descriptionAr: e.target.value }))}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={isRTL ? 'الباركود' : 'Barcode'}
                value={formData.barcode}
                onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Stack direction="row" spacing={1}>
                        {formData.barcode && (
                          <IconButton
                            size="small"
                            onClick={() => setShowBarcodePreview(true)}
                            title={isRTL ? 'معاينة' : 'Preview'}
                          >
                            <Visibility />
                          </IconButton>
                        )}
                        <Button size="small" onClick={handleGenerateBarcode}>
                          {isRTL ? 'توليد' : 'Generate'}
                        </Button>
                      </Stack>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={isRTL ? 'رمز المنتج (SKU)' : 'SKU'}
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button size="small" onClick={handleGenerateSKU}>
                        {isRTL ? 'توليد' : 'Generate'}
                      </Button>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{isRTL ? 'الفئة' : 'Category'}</InputLabel>
                <Select
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                  label={isRTL ? 'الفئة' : 'Category'}
                >
                  <MenuItem value="">
                    <em>{isRTL ? 'بدون فئة' : 'No Category'}</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {isRTL ? category.nameAr : category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>{isRTL ? 'النوع' : 'Type'}</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as ProductType }))}
                  label={isRTL ? 'النوع' : 'Type'}
                >
                  <MenuItem value="retail">{isRTL ? 'تجزئة' : 'Retail'}</MenuItem>
                  <MenuItem value="professional">{isRTL ? 'احترافي' : 'Professional'}</MenuItem>
                  <MenuItem value="consumable">{isRTL ? 'استهلاكي' : 'Consumable'}</MenuItem>
                </Select>
                <FormHelperText>
                  {formData.type === 'retail' && (isRTL ? 'منتجات للبيع للعملاء' : 'Products for sale to customers')}
                  {formData.type === 'professional' && (isRTL ? 'منتجات للاستخدام في الخدمات' : 'Products for use in services')}
                  {formData.type === 'consumable' && (isRTL ? 'مواد استهلاكية للعمل' : 'Consumable supplies')}
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Pricing Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                required
                type="number"
                label={isRTL ? 'سعر الشراء' : 'Purchase Price'}
                value={formData.purchasePrice}
                onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{isRTL ? 'ج.م' : 'EGP'}</InputAdornment>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                required
                type="number"
                label={isRTL ? 'سعر البيع' : 'Retail Price'}
                value={formData.retailPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, retailPrice: parseFloat(e.target.value) || 0 }))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{isRTL ? 'ج.م' : 'EGP'}</InputAdornment>,
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="number"
                label={isRTL ? 'ضريبة القيمة المضافة %' : 'VAT Rate %'}
                value={formData.vatRate}
                onChange={(e) => setFormData(prev => ({ ...prev, vatRate: parseFloat(e.target.value) || 0 }))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Alert severity="info">
                <Stack spacing={1}>
                  <Typography variant="body2">
                    {isRTL ? 'الربح: ' : 'Profit Margin: '}
                    <strong>
                      {formData.retailPrice - formData.purchasePrice} {isRTL ? 'ج.م' : 'EGP'}
                      {' '}({((formData.retailPrice - formData.purchasePrice) / formData.purchasePrice * 100).toFixed(1)}%)
                    </strong>
                  </Typography>
                  <Typography variant="body2">
                    {isRTL ? 'السعر شامل الضريبة: ' : 'Price with VAT: '}
                    <strong>
                      {(formData.retailPrice * (1 + formData.vatRate / 100)).toFixed(2)} {isRTL ? 'ج.م' : 'EGP'}
                    </strong>
                  </Typography>
                </Stack>
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Inventory Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.trackInventory}
                    onChange={(e) => setFormData(prev => ({ ...prev, trackInventory: e.target.checked }))}
                  />
                }
                label={isRTL ? 'تتبع المخزون' : 'Track Inventory'}
              />
            </Grid>

            {formData.trackInventory && (
              <>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label={isRTL ? 'حد المخزون المنخفض' : 'Low Stock Threshold'}
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                    helperText={isRTL ? 'سيتم التنبيه عند الوصول لهذا الحد' : 'Alert when stock reaches this level'}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label={isRTL ? 'نقطة إعادة الطلب' : 'Reorder Point'}
                    value={formData.reorderPoint}
                    onChange={(e) => setFormData(prev => ({ ...prev, reorderPoint: parseInt(e.target.value) || 0 }))}
                    helperText={isRTL ? 'اقتراح إعادة الطلب عند هذا المستوى' : 'Suggest reorder at this level'}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label={isRTL ? 'كمية إعادة الطلب' : 'Reorder Quantity'}
                    value={formData.reorderQuantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, reorderQuantity: parseInt(e.target.value) || 0 }))}
                    helperText={isRTL ? 'الكمية المقترحة للطلب' : 'Suggested order quantity'}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {isRTL ? 'المخزون حسب الفرع' : 'Stock by Branch'}
                  </Typography>
                </Grid>

                {branches.map((branch) => (
                  <React.Fragment key={branch.id}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label={`${isRTL ? 'الكمية في' : 'Quantity at'} ${branch.name}`}
                        value={branchStock[branch.id!]?.quantity || 0}
                        onChange={(e) => setBranchStock(prev => ({
                          ...prev,
                          [branch.id!]: {
                            ...prev[branch.id!],
                            quantity: parseInt(e.target.value) || 0,
                          },
                        }))}
                        disabled={!isEditMode}
                        helperText={!isEditMode && (isRTL ? 'يمكن تعديل المخزون بعد إنشاء المنتج' : 'Stock can be adjusted after creating the product')}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={`${isRTL ? 'الموقع في' : 'Location at'} ${branch.name}`}
                        value={branchStock[branch.id!]?.location || ''}
                        onChange={(e) => setBranchStock(prev => ({
                          ...prev,
                          [branch.id!]: {
                            ...prev[branch.id!],
                            location: e.target.value,
                          },
                        }))}
                        placeholder={isRTL ? 'مثال: رف A-1' : 'e.g., Shelf A-1'}
                      />
                    </Grid>
                  </React.Fragment>
                ))}
              </>
            )}
          </Grid>
        </TabPanel>

        {/* Images Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                multiple
                type="file"
                onChange={handleImageUpload}
              />
              <label htmlFor="image-upload">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<Upload />}
                >
                  {isRTL ? 'رفع صور' : 'Upload Images'}
                </Button>
              </label>
            </Grid>

            {productImages.length > 0 && (
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={2}>
                  {productImages.map((image, index) => (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                      <Card>
                        <Box
                          component="img"
                          src={image}
                          alt={`Product ${index + 1}`}
                          sx={{
                            width: '100%',
                            height: 200,
                            objectFit: 'cover',
                          }}
                        />
                        <CardContent>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            {index === 0 && (
                              <Chip label={isRTL ? 'رئيسية' : 'Primary'} size="small" color="primary" />
                            )}
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setProductImages(prev => prev.filter((_, i) => i !== index))}
                            >
                              <Delete />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            )}
          </Grid>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={activeTab} index={4}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={isRTL ? 'المورد' : 'Vendor'}
                value={formData.vendorId}
                onChange={(e) => setFormData(prev => ({ ...prev, vendorId: e.target.value }))}
                placeholder={isRTL ? 'اختر المورد' : 'Select vendor'}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={isRTL ? 'رمز المنتج لدى المورد' : 'Vendor SKU'}
                value={formData.vendorSku}
                onChange={(e) => setFormData(prev => ({ ...prev, vendorSku: e.target.value }))}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>{isRTL ? 'الحالة' : 'Status'}</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'discontinued' }))}
                  label={isRTL ? 'الحالة' : 'Status'}
                >
                  <MenuItem value="active">{isRTL ? 'نشط' : 'Active'}</MenuItem>
                  <MenuItem value="inactive">{isRTL ? 'غير نشط' : 'Inactive'}</MenuItem>
                  <MenuItem value="discontinued">{isRTL ? 'موقوف' : 'Discontinued'}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Actions */}
        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/products')}
            startIcon={<Cancel />}
          >
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            type="submit"
            disabled={saving || !formData.name || !formData.nameAr || formData.retailPrice <= 0}
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
          >
            {saving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ' : 'Save')}
          </Button>
        </Box>
      </form>

      {/* Barcode Preview Dialog */}
      {showBarcodePreview && formData.barcode && (
        <ProductBarcode
          barcode={formData.barcode}
          productName={formData.name || 'Product'}
          price={formData.sellingPrice}
          currency="EGP"
          showDialog={true}
          onClose={() => setShowBarcodePreview(false)}
        />
      )}
    </Container>
  );
};

export default ProductFormPage;