import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
  Stack,
  Avatar,
  Tooltip,
  Badge,
  Menu,
  Popover,
  MenuList,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  Fab,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  Edit,
  Delete,
  MoreVert,
  Inventory,
  ShoppingCart,
  LocalOffer,
  QrCode,
  FileDownload,
  FileUpload,
  Print,
  Category,
  Warning,
  Error,
  TrendingUp,
  AttachMoney,
  Inventory2Outlined,
  ContentCopy,
  Archive,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { productService } from '../../services/product.service';
import type { Product, ProductCategory, ProductType, ProductStatistics } from '../../types/product.types';
import ProductBarcode from '../../components/products/ProductBarcode';

const ProductsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';

  // State
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [statistics, setStatistics] = useState<ProductStatistics>({
    totalProducts: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalValue: 0,
    categoriesCount: 0,
    averagePrice: 0,
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<ProductType | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [menuState, setMenuState] = useState<{
    mouseX: number | null;
    mouseY: number | null;
    product: Product | null;
  }>({ mouseX: null, mouseY: null, product: null });
  const [barcodePreviewProduct, setBarcodePreviewProduct] = useState<Product | null>(null);

  // Fetch data
  useEffect(() => {
    console.log('ProductsPage useEffect - currentUser:', currentUser);
    console.log('ProductsPage useEffect - companyId:', currentUser?.companyId);
    if (currentUser?.companyId) {
      loadData();
    } else {
      console.log('No companyId, setting loading to false');
      setLoading(false);
    }
  }, [currentUser?.companyId, currentBranch?.id]);

  const loadData = async () => {
    if (!currentUser?.companyId) {
      console.log('No companyId found, skipping data load');
      setLoading(false);
      return;
    }
    
    try {
      console.log('Loading products data for company:', currentUser.companyId);
      setLoading(true);
      
      // Load categories
      const categoriesData = await productService.getCategories(currentUser.companyId);
      console.log('Categories loaded:', categoriesData);
      setCategories(categoriesData || []);
      
      // Load products
      const filters = {
        categoryId: selectedCategory || undefined,
        type: selectedType || undefined,
        search: searchTerm || undefined,
        branchId: currentBranch?.id,
      };
      
      const result = await productService.getProducts(
        currentUser.companyId,
        filters
      );
      console.log('Products result:', result);
      const productsData = result?.products || [];
      setProducts(productsData);
      
      // Set dummy statistics for now if the service call fails
      try {
        const stats = await productService.getProductStatistics(
          currentUser.companyId,
          currentBranch?.id
        );
        console.log('Statistics loaded:', stats);
        setStatistics(stats);
      } catch (statsError) {
        console.error('Error loading statistics:', statsError);
        // Set default statistics
        setStatistics({
          totalProducts: productsData.length,
          activeProducts: productsData.filter(p => p.status === 'active').length,
          lowStockProducts: 0,
          outOfStockProducts: 0,
          totalValue: 0,
          categoriesCount: categoriesData.length,
          averagePrice: 0,
        });
      }
      
    } catch (error) {
      console.error('Error loading products:', error);
      // Set empty data on error
      setProducts([]);
      setCategories([]);
      setStatistics({
        totalProducts: 0,
        activeProducts: 0,
        lowStockProducts: 0,
        outOfStockProducts: 0,
        totalValue: 0,
        categoriesCount: 0,
        averagePrice: 0,
      });
    } finally {
      console.log('Loading complete');
      setLoading(false);
    }
  };

  // Handlers
  const handleAddProduct = () => {
    navigate('/products/new');
  };

  const handleEditProduct = (productId: string) => {
    navigate(`/products/${productId}/edit`);
  };

  const handleDuplicateProduct = async (product: Product) => {
    if (!currentUser?.companyId) return;
    
    try {
      const newProduct = {
        ...product,
        name: `${product.name} (Copy)`,
        nameAr: `${product.nameAr} (نسخة)`,
        sku: product.sku ? `${product.sku}-COPY` : undefined,
        barcode: undefined, // New product needs new barcode
      };
      
      delete newProduct.id;
      delete newProduct.createdAt;
      delete newProduct.updatedAt;
      
      await productService.createProduct(newProduct);
      loadData();
    } catch (error) {
      console.error('Error duplicating product:', error);
    }
  };

  const handleArchiveProduct = async (productId: string) => {
    if (!currentUser?.companyId) return;
    
    try {
      await productService.updateProduct(currentUser.companyId, productId, {
        status: 'discontinued',
      });
      loadData();
    } catch (error) {
      console.error('Error archiving product:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, product: Product) => {
    event.preventDefault();
    event.stopPropagation();
    
    setMenuState({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
      product,
    });
  };

  const handleMenuClose = () => {
    setMenuState({ mouseX: null, mouseY: null, product: null });
  };

  // Filter products by tab
  const getFilteredProducts = () => {
    switch (activeTab) {
      case 0: // All
        return products;
      case 1: // Retail
        return products.filter(p => p.type === 'retail');
      case 2: // Professional
        return products.filter(p => p.type === 'professional');
      case 3: // Low Stock
        return products.filter(p => {
          if (!p.trackInventory || !p.branchStock || !currentBranch?.id) return false;
          const stock = p.branchStock[currentBranch.id];
          return stock && p.lowStockThreshold && stock.quantity <= p.lowStockThreshold;
        });
      case 4: // Discontinued
        return products.filter(p => p.status === 'discontinued');
      default:
        return products;
    }
  };

  const filteredProducts = getFilteredProducts();

  // Product Card Component
  const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const branchStock = currentBranch?.id && product.branchStock
      ? product.branchStock[currentBranch.id]
      : null;
    
    const isLowStock = product.trackInventory && branchStock && product.lowStockThreshold
      ? branchStock.quantity <= product.lowStockThreshold
      : false;
    
    const isOutOfStock = product.trackInventory && branchStock
      ? branchStock.quantity === 0
      : false;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            '&:hover': {
              boxShadow: theme.shadows[4],
            },
          }}
        >
          {/* Product Image */}
          <Box
            sx={{
              height: 200,
              bgcolor: 'grey.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {product.primaryImage ? (
              <img
                src={product.primaryImage}
                alt={product.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Inventory sx={{ fontSize: 80, color: 'grey.400' }} />
            )}
            
            {/* Stock Badge */}
            {product.trackInventory && branchStock && (
              <Badge
                badgeContent={branchStock.quantity}
                color={isOutOfStock ? 'error' : isLowStock ? 'warning' : 'success'}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                }}
              />
            )}
            
            {/* Status Chip */}
            {product.status === 'discontinued' && (
              <Chip
                label={isRTL ? 'موقوف' : 'Discontinued'}
                size="small"
                color="error"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                }}
              />
            )}
          </Box>

          <CardContent sx={{ flexGrow: 1 }}>
            {/* Product Name */}
            <Typography variant="h6" gutterBottom noWrap>
              {isRTL ? product.nameAr : product.name}
            </Typography>

            {/* SKU & Barcode */}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {product.sku && (
                <Chip
                  label={`SKU: ${product.sku}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {product.barcode && (
                <Tooltip title={isRTL ? 'عرض الباركود' : 'View Barcode'}>
                  <Chip
                    icon={<QrCode />}
                    label={product.barcode}
                    size="small"
                    variant="outlined"
                    onClick={() => setBarcodePreviewProduct(product)}
                    sx={{ cursor: 'pointer' }}
                  />
                </Tooltip>
              )}
            </Stack>

            {/* Price */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {isRTL ? 'سعر الشراء' : 'Cost'}
              </Typography>
              <Typography variant="body2">
                {product.purchasePrice} {isRTL ? 'ج.م' : 'EGP'}
              </Typography>
            </Stack>
            
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {isRTL ? 'سعر البيع' : 'Price'}
              </Typography>
              <Typography variant="h6" color="primary">
                {product.retailPrice} {isRTL ? 'ج.م' : 'EGP'}
              </Typography>
            </Stack>

            {/* Type Badge */}
            <Chip
              label={
                product.type === 'retail'
                  ? (isRTL ? 'تجزئة' : 'Retail')
                  : product.type === 'professional'
                  ? (isRTL ? 'احترافي' : 'Professional')
                  : (isRTL ? 'استهلاكي' : 'Consumable')
              }
              size="small"
              color={
                product.type === 'retail' ? 'primary' :
                product.type === 'professional' ? 'secondary' : 'default'
              }
              sx={{ mt: 'auto' }}
            />
          </CardContent>

          {/* Actions */}
          <Box sx={{ p: 2, pt: 0 }}>
            <Stack direction="row" spacing={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => handleEditProduct(product.id!)}
              >
                {isRTL ? 'تعديل' : 'Edit'}
              </Button>
              <IconButton
                onClick={(e) => handleMenuOpen(e, product)}
                size="small"
                aria-label="product actions"
              >
                <MoreVert />
              </IconButton>
            </Stack>
          </Box>
        </Card>
      </motion.div>
    );
  };

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h4" component="h1">
            {isRTL ? 'المنتجات' : 'Products'}
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<FileUpload />}
            >
              {isRTL ? 'استيراد' : 'Import'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
            >
              {isRTL ? 'تصدير' : 'Export'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Print />}
              onClick={() => navigate('/products/barcode-printing')}
            >
              {isRTL ? 'طباعة باركود' : 'Print Barcodes'}
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddProduct}
            >
              {isRTL ? 'إضافة منتج' : 'Add Product'}
            </Button>
          </Stack>
        </Stack>

        {/* Statistics Cards */}
        {statistics && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {isRTL ? 'إجمالي المنتجات' : 'Total Products'}
                      </Typography>
                      <Typography variant="h5">
                        {statistics.totalProducts}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <Inventory />
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {isRTL ? 'قيمة المخزون' : 'Stock Value'}
                      </Typography>
                      <Typography variant="h5">
                        {statistics.totalValue.toFixed(0)} {isRTL ? 'ج.م' : 'EGP'}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'success.light' }}>
                      <AttachMoney />
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {isRTL ? 'مخزون منخفض' : 'Low Stock'}
                      </Typography>
                      <Typography variant="h5" color="warning.main">
                        {statistics.lowStockProducts}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'warning.light' }}>
                      <Warning />
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography color="text.secondary" variant="body2">
                        {isRTL ? 'نفد المخزون' : 'Out of Stock'}
                      </Typography>
                      <Typography variant="h5" color="error.main">
                        {statistics.outOfStockProducts}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'error.light' }}>
                      <Inventory2Outlined />
                    </Avatar>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                placeholder={isRTL ? 'البحث بالاسم، SKU، أو الباركود...' : 'Search by name, SKU, or barcode...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>{isRTL ? 'الفئة' : 'Category'}</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  label={isRTL ? 'الفئة' : 'Category'}
                >
                  <MenuItem value="">
                    <em>{isRTL ? 'جميع الفئات' : 'All Categories'}</em>
                  </MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {isRTL ? category.nameAr : category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel>{isRTL ? 'النوع' : 'Type'}</InputLabel>
                <Select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as ProductType | '')}
                  label={isRTL ? 'النوع' : 'Type'}
                >
                  <MenuItem value="">
                    <em>{isRTL ? 'جميع الأنواع' : 'All Types'}</em>
                  </MenuItem>
                  <MenuItem value="retail">{isRTL ? 'تجزئة' : 'Retail'}</MenuItem>
                  <MenuItem value="professional">{isRTL ? 'احترافي' : 'Professional'}</MenuItem>
                  <MenuItem value="consumable">{isRTL ? 'استهلاكي' : 'Consumable'}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid size={{ xs: 12, md: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={loadData}
              >
                {isRTL ? 'تطبيق' : 'Apply'}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label={isRTL ? 'الكل' : 'All'} />
          <Tab label={isRTL ? 'تجزئة' : 'Retail'} />
          <Tab label={isRTL ? 'احترافي' : 'Professional'} />
          <Tab 
            label={
              <Badge badgeContent={statistics?.lowStockProducts || 0} color="warning">
                {isRTL ? 'مخزون منخفض' : 'Low Stock'}
              </Badge>
            } 
          />
          <Tab label={isRTL ? 'موقوف' : 'Discontinued'} />
        </Tabs>
      </Box>

      {/* Products Grid */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredProducts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Inventory sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {isRTL ? 'لا توجد منتجات' : 'No products found'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddProduct}
            sx={{ mt: 2 }}
          >
            {isRTL ? 'إضافة أول منتج' : 'Add First Product'}
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredProducts.map((product) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={product.id}>
              <ProductCard product={product} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Popover
        open={menuState.mouseX !== null && menuState.mouseY !== null && Boolean(menuState.product)}
        onClose={handleMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          menuState.mouseY !== null && menuState.mouseX !== null
            ? { top: menuState.mouseY, left: menuState.mouseX }
            : undefined
        }
        slotProps={{
          paper: {
            sx: {
              minWidth: 160,
            },
          },
        }}
        disableAutoFocus
        disableEnforceFocus
        disableRestoreFocus
      >
        <MenuList>
        <MenuItem onClick={() => {
          if (menuState.product) handleEditProduct(menuState.product.id!);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'تعديل' : 'Edit'}</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          if (menuState.product) handleDuplicateProduct(menuState.product);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <ContentCopy fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'نسخ' : 'Duplicate'}</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => {
          handleMenuClose();
          navigate('/products/barcode-printing');
        }}>
          <ListItemIcon>
            <Print fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'طباعة باركود' : 'Print Barcode'}</ListItemText>
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={() => {
          if (menuState.product) handleArchiveProduct(menuState.product.id!);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <Archive fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'أرشفة' : 'Archive'}</ListItemText>
        </MenuItem>
        </MenuList>
      </Popover>

      {/* FAB for adding categories */}
      <Fab
        color="secondary"
        sx={{
          position: 'fixed',
          bottom: 80,
          right: theme.direction === 'rtl' ? 'auto' : 16,
          left: theme.direction === 'rtl' ? 16 : 'auto',
        }}
        onClick={() => navigate('/products/categories')}
      >
        <Category />
      </Fab>

      {/* Barcode Preview Dialog */}
      {barcodePreviewProduct && (
        <ProductBarcode
          barcode={barcodePreviewProduct.barcode || ''}
          productName={barcodePreviewProduct.name}
          price={barcodePreviewProduct.sellingPrice}
          currency="EGP"
          showDialog={true}
          onClose={() => setBarcodePreviewProduct(null)}
        />
      )}
    </Container>
  );
};

export default ProductsPage;