import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Card,
  CardContent,
  CardMedia,
  Stack,
  Chip,
  InputAdornment,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  Alert,
  Badge,
  Drawer,
  useTheme,
  useMediaQuery,
  Autocomplete,
  ToggleButton,
  ToggleButtonGroup,
  Fab,
  AppBar,
  Toolbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search,
  QrCodeScanner,
  Add,
  Remove,
  Delete,
  ShoppingCart,
  Payment,
  LocalOffer,
  Category,
  GridView,
  ViewList,
  FilterList,
  Clear,
  Receipt,
  Person,
  CreditCard,
  LocalAtm,
  AccountBalanceWallet,
  AccountBalance,
  Calculate,
  Inventory2,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { productService } from '../../services/product.service';
import { clientService } from '../../services/client.service';
import { financeService } from '../../services/finance.service';
import { saleService } from '../../services/sale.service';
import type { Product, ProductCategory } from '../../types/product.types';
import type { Client } from '../../types/client.types';
import type { PaymentMethod } from '../../types/finance.types';
import type { SaleItem, SalePayment } from '../../types/sale.types';
import { toast } from 'react-toastify';

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  subtotal: number;
}

interface PaymentDetails {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  accountId?: string;
}

const POSPage: React.FC = () => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [cartDrawer, setCartDrawer] = useState(false);
  const [barcodeDialog, setBarcodeDialog] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Load products and categories
  useEffect(() => {
    if (currentUser?.companyId && currentBranch?.id) {
      loadProducts();
      loadCategories();
      loadClients();
    }
  }, [currentUser?.companyId, currentBranch?.id]);

  const loadProducts = async () => {
    if (!currentUser?.companyId) return;
    
    try {
      const result = await productService.getProducts(currentUser.companyId, {
        status: 'active',
        branchId: currentBranch?.id,
      });
      setProducts(result.products);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadCategories = async () => {
    if (!currentUser?.companyId) return;
    
    try {
      const cats = await productService.getCategories(currentUser.companyId);
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadClients = async () => {
    if (!currentUser?.companyId) return;
    
    try {
      const result = await clientService.getClients(currentUser.companyId, {
        limit: 1000,
      });
      setClients(result.clients);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.nameAr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Cart functions
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      updateQuantity(product.id!, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        price: product.retailPrice,
        discount: 0,
        discountType: 'fixed',
        subtotal: product.retailPrice,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const subtotal = calculateItemSubtotal(item.price, quantity, item.discount, item.discountType);
        return { ...item, quantity, subtotal };
      }
      return item;
    }));
  };

  const updateDiscount = (productId: string, discount: number, discountType: 'percentage' | 'fixed') => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const subtotal = calculateItemSubtotal(item.price, item.quantity, discount, discountType);
        return { ...item, discount, discountType, subtotal };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedClient(null);
    setPayments([]);
  };

  const calculateItemSubtotal = (price: number, quantity: number, discount: number, discountType: 'percentage' | 'fixed') => {
    const total = price * quantity;
    if (discountType === 'percentage') {
      return total - (total * discount / 100);
    } else {
      return Math.max(0, total - discount);
    }
  };

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => total + item.subtotal, 0);
  };

  const calculateTotalDiscount = () => {
    return cart.reduce((total, item) => {
      const originalPrice = item.price * item.quantity;
      return total + (originalPrice - item.subtotal);
    }, 0);
  };

  // Barcode handling
  const handleBarcodeScan = async () => {
    if (!barcodeInput) return;

    const product = products.find(p => p.barcode === barcodeInput);
    if (product) {
      addToCart(product);
      setBarcodeInput('');
      setBarcodeDialog(false);
    } else {
      alert(isRTL ? 'المنتج غير موجود' : 'Product not found');
    }
  };

  // Payment handling
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert(isRTL ? 'السلة فارغة' : 'Cart is empty');
      return;
    }
    setPaymentDialog(true);
  };

  const addPayment = (method: PaymentMethod, amount: number, reference?: string, accountId?: string) => {
    const payment: PaymentDetails = { method, amount, reference, accountId };
    setPayments([...payments, payment]);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const getTotalPaid = () => {
    return payments.reduce((total, payment) => total + payment.amount, 0);
  };

  const getRemainingAmount = () => {
    return calculateCartTotal() - getTotalPaid();
  };

  const completeTransaction = async () => {
    if (!currentUser?.companyId || !currentBranch?.id || !currentUser?.id) return;
    
    if (getRemainingAmount() > 0.01) {
      toast.error(isRTL ? 'المبلغ المدفوع غير كافي' : 'Insufficient payment amount');
      return;
    }

    setLoading(true);
    try {
      // Prepare sale items
      const saleItems: SaleItem[] = cart.map(item => {
        const saleItem: SaleItem = {
          productId: item.product.id!,
          productName: item.product.name,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount,
          discountType: item.discountType,
          subtotal: item.subtotal,
        };
        
        // Only add optional fields if they have values
        if (item.product.nameAr) {
          saleItem.productNameAr = item.product.nameAr;
        }
        if (item.product.sku) {
          saleItem.sku = item.product.sku;
        }
        if (item.product.barcode) {
          saleItem.barcode = item.product.barcode;
        }
        if (item.product.costPrice !== undefined) {
          saleItem.cost = item.product.costPrice;
        }
        
        return saleItem;
      });


      // Map payment methods to account IDs - use the account selected by the user
      const salePayments: SalePayment[] = payments.map((payment) => {
        const paymentData: SalePayment = {
          method: payment.method,
          amount: payment.amount,
        };
        
        // Only add optional fields if they have values
        if (payment.reference) {
          paymentData.reference = payment.reference;
        }
        if (payment.accountId) {
          paymentData.accountId = payment.accountId;
        }
        
        return paymentData;
      });

      // Calculate totals
      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalDiscount = calculateTotalDiscount();
      const total = calculateCartTotal();
      const totalPaid = getTotalPaid();
      const change = totalPaid - total;

      // Get current user info
      const userDoc = await financeService.getUserDocument(currentUser.id);
      const staffName = userDoc?.displayName || userDoc?.email || 'Staff';

      // Create the sale data - only include fields with values to avoid Firebase errors
      const saleData: any = {
        companyId: currentUser.companyId,
        branchId: currentBranch.id,
        items: saleItems,
        subtotal,
        totalDiscount,
        totalTax: 0, // TODO: Implement tax calculation
        total,
        payments: salePayments,
        totalPaid,
        change,
        status: 'draft' as const,
        staffId: currentUser.id,
        staffName,
        source: 'pos' as const,
        totalCost: saleItems.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0),
        profitMargin: total - saleItems.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0),
      };

      // Add optional client fields only if they have values
      if (selectedClient?.id) {
        saleData.customerId = selectedClient.id;
      }
      if (selectedClient?.name) {
        saleData.customerName = selectedClient.name;
      }
      if (selectedClient?.phone) {
        saleData.customerPhone = selectedClient.phone;
      }
      if (selectedClient?.email) {
        saleData.customerEmail = selectedClient.email;
      }

      const saleId = await saleService.createSale(saleData);

      // Complete the sale (update inventory and financial accounts)
      await saleService.completeSale(
        currentUser.companyId,
        saleId,
        saleItems,
        salePayments
      );

      // Clear cart and close dialog
      clearCart();
      setPaymentDialog(false);
      
      toast.success(
        isRTL 
          ? `تم إتمام البيع بنجاح - رقم الإيصال: ${saleData.receiptNumber || saleId}` 
          : `Sale completed successfully - Receipt: ${saleData.receiptNumber || saleId}`
      );

      // TODO: Generate and print receipt
    } catch (error) {
      console.error('Error completing transaction:', error);
      toast.error(isRTL ? 'خطأ في إتمام العملية' : 'Error completing transaction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default', mt: 3 }}>
      {/* Header Bar */}
      <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <ShoppingCart sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {isRTL ? 'نقطة البيع' : 'Point of Sale'}
          </Typography>
          
          <Stack direction="row" spacing={1} alignItems="center">
            {!isMobile && selectedClient && (
              <Chip
                icon={<Person />}
                label={selectedClient.name}
                onDelete={() => setSelectedClient(null)}
                color="primary"
                size="small"
              />
            )}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, value) => value && setViewMode(value)}
              size="small"
              sx={{ bgcolor: 'background.paper' }}
            >
              <ToggleButton value="grid" size="small">
                <GridView fontSize="small" />
              </ToggleButton>
              <ToggleButton value="list" size="small">
                <ViewList fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
            
            <Button
              startIcon={<QrCodeScanner />}
              onClick={() => setBarcodeDialog(true)}
              variant="outlined"
              size="small"
            >
              {!isMobile && (isRTL ? 'مسح' : 'Scan')}
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Products Section */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'auto',
          p: { xs: 1, sm: 2 },
          pb: isMobile ? 10 : 2,
          bgcolor: 'background.default',
        }}>
          <Box sx={{ mb: 2 }}>
            {/* Search Bar */}
            <Paper sx={{ p: 1.5, mb: 2 }}>
              <TextField
                fullWidth
                placeholder={isRTL ? 'البحث بالاسم أو الباركود...' : 'Search by name or barcode...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <Clear fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { 
                    bgcolor: 'background.default',
                    '& fieldset': { borderColor: 'divider' },
                  }
                }}
              />
            </Paper>

            {/* Categories */}
            <Box sx={{ overflowX: 'auto', pb: 1 }}>
              <Stack direction="row" spacing={1} sx={{ minWidth: 'max-content' }}>
                <Chip
                  icon={<Category fontSize="small" />}
                  label={isRTL ? 'الكل' : 'All'}
                  color={selectedCategory === 'all' ? 'primary' : 'default'}
                  onClick={() => setSelectedCategory('all')}
                  variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
                  sx={{ fontWeight: selectedCategory === 'all' ? 600 : 400 }}
                />
                {categories.map(category => (
                  <Chip
                    key={category.id}
                    label={isRTL ? category.nameAr : category.name}
                    color={selectedCategory === category.id ? 'primary' : 'default'}
                    onClick={() => setSelectedCategory(category.id!)}
                    variant={selectedCategory === category.id ? 'filled' : 'outlined'}
                    sx={{ fontWeight: selectedCategory === category.id ? 600 : 400 }}
                  />
                ))}
              </Stack>
            </Box>
          </Box>

          {/* Products Container */}
          <Box>
            {/* Products Grid/List */}
            {filteredProducts.length === 0 ? (
              <Box sx={{ 
                textAlign: 'center', 
                py: 8,
                color: 'text.secondary',
              }}>
                <Inventory2 sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
                <Typography variant="h6">
                  {isRTL ? 'لا توجد منتجات' : 'No products found'}
                </Typography>
                <Typography variant="body2">
                  {searchQuery 
                    ? (isRTL ? 'جرب البحث بكلمات أخرى' : 'Try searching with different keywords')
                    : (isRTL ? 'أضف منتجات للبدء' : 'Add products to get started')
                  }
                </Typography>
              </Box>
            ) : viewMode === 'grid' ? (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: {
                  xs: 'repeat(2, 1fr)',
                  sm: 'repeat(3, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)',
                },
                gap: { xs: 1, sm: 2 },
              }}>
                {filteredProducts.map(product => {
                  const inCart = cart.find(item => item.product.id === product.id);
                  const stock = product.trackInventory ? 
                    product.branchStock?.[currentBranch?.id || '']?.quantity || 0 : null;
                  
                  return (
                    <Card 
                      key={product.id}
                      sx={{ 
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': { 
                          transform: 'translateY(-2px)', 
                          boxShadow: (theme) => theme.shadows[8],
                        },
                        transition: 'all 0.2s',
                        border: '1px solid',
                        borderColor: inCart ? 'primary.main' : 'divider',
                        bgcolor: inCart ? 'action.selected' : 'background.paper',
                      }}
                      onClick={() => addToCart(product)}
                    >
                      {inCart && (
                        <Badge
                          badgeContent={inCart.quantity}
                          color="primary"
                          sx={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            zIndex: 1,
                            '& .MuiBadge-badge': {
                              fontSize: '0.875rem',
                              fontWeight: 'bold',
                              minWidth: 24,
                              height: 24,
                            }
                          }}
                        />
                      )}
                      
                      <Box sx={{ 
                        height: { xs: 100, sm: 140 }, 
                        bgcolor: 'grey.100',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}>
                        {product.primaryImage ? (
                          <CardMedia
                            component="img"
                            height="100%"
                            image={product.primaryImage}
                            alt={product.name}
                            sx={{ 
                              objectFit: 'cover',
                              width: '100%',
                            }}
                          />
                        ) : (
                          <Inventory2 sx={{ fontSize: { xs: 40, sm: 56 }, color: 'action.disabled' }} />
                        )}
                        
                        {stock !== null && stock <= 5 && (
                          <Chip
                            size="small"
                            label={stock === 0 ? (isRTL ? 'نفذ المخزون' : 'Out of Stock') : `${stock} ${isRTL ? 'فقط' : 'left'}`}
                            color={stock === 0 ? 'error' : 'warning'}
                            sx={{
                              position: 'absolute',
                              bottom: 4,
                              left: 4,
                              fontSize: '0.7rem',
                            }}
                          />
                        )}
                      </Box>
                      
                      <CardContent sx={{ p: { xs: 1, sm: 1.5 } }}>
                        <Typography 
                          variant="body2" 
                          noWrap 
                          sx={{ 
                            fontWeight: 500,
                            fontSize: { xs: '0.875rem', sm: '0.9rem' },
                          }}
                        >
                          {isRTL ? product.nameAr || product.name : product.name}
                        </Typography>
                        
                        {product.sku && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            SKU: {product.sku}
                          </Typography>
                        )}
                        
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'baseline', 
                          justifyContent: 'space-between',
                          mt: 1,
                        }}>
                          <Typography 
                            variant="h6" 
                            color="primary"
                            sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
                          >
                            {product.retailPrice.toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {isRTL ? 'ج.م' : 'EGP'}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            ) : (
              <Paper sx={{ overflow: 'hidden' }}>
                <List sx={{ p: 0 }}>
                  {filteredProducts.map((product, index) => {
                    const inCart = cart.find(item => item.product.id === product.id);
                    const stock = product.trackInventory ? 
                      product.branchStock?.[currentBranch?.id || '']?.quantity || 0 : null;
                    
                    return (
                      <ListItem
                        key={product.id}
                        onClick={() => addToCart(product)}
                        divider={index < filteredProducts.length - 1}
                        sx={{
                          bgcolor: inCart ? 'action.selected' : 'transparent',
                          '&:hover': { bgcolor: 'action.hover' },
                          py: 2,
                          cursor: 'pointer',
                        }}
                      >
                        <Box sx={{ 
                          width: 60, 
                          height: 60, 
                          mr: 2,
                          borderRadius: 1,
                          bgcolor: 'grey.100',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                        }}>
                          {product.primaryImage ? (
                            <img
                              src={product.primaryImage}
                              alt={product.name}
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover' 
                              }}
                            />
                          ) : (
                            <Inventory2 color="disabled" />
                          )}
                        </Box>
                        
                        <Box sx={{ flexGrow: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography fontWeight={500}>
                              {isRTL ? product.nameAr || product.name : product.name}
                            </Typography>
                            {inCart && (
                              <Badge badgeContent={inCart.quantity} color="primary" />
                            )}
                          </Stack>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                            <Typography variant="body1" color="primary" fontWeight="bold">
                              {product.retailPrice.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                            </Typography>
                            {product.sku && (
                              <Typography variant="caption" color="text.secondary">
                                SKU: {product.sku}
                              </Typography>
                            )}
                            {stock !== null && stock <= 5 && (
                              <Chip
                                size="small"
                                label={stock === 0 ? (isRTL ? 'نفذ' : 'Out') : `${stock} ${isRTL ? 'فقط' : 'left'}`}
                                color={stock === 0 ? 'error' : 'warning'}
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Box>
                        <IconButton 
                          edge="end" 
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                          }}
                          color="primary"
                          size="large"
                          sx={{
                            ml: 1,
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            '&:hover': {
                              bgcolor: 'primary.dark',
                            }
                          }}
                        >
                          <Add />
                        </IconButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>
            )}
          </Box>
        </Box>

        {/* Cart Section - Desktop */}
        {!isMobile && (
          <Box sx={{ 
            width: 400, 
            borderLeft: 1, 
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
          }}>
            <CartSection />
          </Box>
        )}
      </Box>

      {/* Mobile Cart FAB and Bottom Bar */}
      {isMobile && (
        <>
          <Box
            sx={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider',
              p: 2,
              zIndex: 1200,
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack>
                <Typography variant="caption" color="text.secondary">
                  {cart.length} {isRTL ? 'منتج' : 'items'}
                </Typography>
                <Typography variant="h6" color="primary">
                  {calculateCartTotal().toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                </Typography>
              </Stack>
              <Fab
                color="primary"
                variant="extended"
                onClick={() => setCartDrawer(true)}
              >
                <Badge badgeContent={cart.length} color="error">
                  <ShoppingCart sx={{ mr: 1 }} />
                </Badge>
                {isRTL ? 'عرض السلة' : 'View Cart'}
              </Fab>
            </Stack>
          </Box>

          <Drawer
            anchor={isRTL ? 'left' : 'right'}
            open={cartDrawer}
            onClose={() => setCartDrawer(false)}
            PaperProps={{
              sx: { width: '100%', maxWidth: 400 }
            }}
          >
            <AppBar position="sticky" color="primary" elevation={0}>
              <Toolbar>
                <IconButton
                  edge="start"
                  onClick={() => setCartDrawer(false)}
                  sx={{ mr: 2, color: 'primary.contrastText' }}
                >
                  <Clear />
                </IconButton>
                <ShoppingCart sx={{ mr: 1 }} />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {isRTL ? 'السلة' : 'Cart'}
                </Typography>
                <Chip 
                  label={cart.length} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'primary.dark',
                    color: 'primary.contrastText',
                    fontWeight: 'bold',
                    mr: 2,
                  }} 
                />
                <IconButton 
                  onClick={clearCart} 
                  disabled={cart.length === 0}
                  sx={{ color: 'primary.contrastText' }}
                >
                  <Delete />
                </IconButton>
              </Toolbar>
            </AppBar>
            <Box sx={{ height: 'calc(100% - 64px)', display: 'flex', flexDirection: 'column' }}>
              <CartSection />
            </Box>
          </Drawer>
        </>
      )}

      {/* Barcode Scanner Dialog */}
      <Dialog open={barcodeDialog} onClose={() => setBarcodeDialog(false)}>
        <DialogTitle>{isRTL ? 'مسح الباركود' : 'Scan Barcode'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label={isRTL ? 'الباركود' : 'Barcode'}
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleBarcodeScan()}
            sx={{ mt: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <QrCodeScanner />
                </InputAdornment>
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBarcodeDialog(false)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleBarcodeScan} variant="contained">
            {isRTL ? 'إضافة' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <PaymentDialog />
    </Box>
  );

  // Cart Section Component
  function CartSection() {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
        {!isMobile && (
          <Box sx={{ 
            p: 2, 
            borderBottom: 1, 
            borderColor: 'divider',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <ShoppingCart />
                <Typography variant="h6">
                  {isRTL ? 'السلة' : 'Cart'}
                </Typography>
                <Chip 
                  label={cart.length} 
                  size="small" 
                  sx={{ 
                    bgcolor: 'primary.dark',
                    color: 'primary.contrastText',
                    fontWeight: 'bold',
                  }} 
                />
              </Stack>
              {cart.length > 0 && (
                <IconButton 
                  size="small" 
                  onClick={clearCart}
                  sx={{ color: 'primary.contrastText' }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </Box>
        )}

        {/* Client Selection */}
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          <Autocomplete
            options={clients}
            value={selectedClient}
            onChange={(_, client) => setSelectedClient(client)}
            getOptionLabel={(client) => client.name || `${client.firstName} ${client.lastName}`}
            getOptionKey={(client) => client.id || client.name}
            renderOption={(props, client) => (
              <Box component="li" {...props} key={client.id}>
                <Stack>
                  <Typography variant="body2" fontWeight={500}>
                    {client.name || `${client.firstName} ${client.lastName}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {client.phone || client.email || (isRTL ? 'لا توجد معلومات اتصال' : 'No contact info')}
                  </Typography>
                </Stack>
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label={isRTL ? 'العميل' : 'Client'}
                placeholder={isRTL ? 'البحث عن عميل...' : 'Search for client...'}
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <>
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                      {params.InputProps.startAdornment}
                    </>
                  ),
                }}
              />
            )}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'background.paper',
              }
            }}
          />
        </Box>

        <Divider />

        {/* Cart Items */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: 'background.default' }}>
          {cart.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              p: 4,
            }}>
              <Box sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
              }}>
                <ShoppingCart sx={{ fontSize: 56, color: 'action.disabled' }} />
              </Box>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {isRTL ? 'السلة فارغة' : 'Cart is empty'}
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                {isRTL ? 'ابدأ بإضافة المنتجات من القائمة' : 'Start by adding products from the catalog'}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1} sx={{ p: 2 }}>
              {cart.map((item) => (
                <Card 
                  key={item.product.id} 
                  variant="outlined"
                  sx={{ 
                    overflow: 'hidden',
                    '&:hover': { boxShadow: 2 },
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Stack spacing={1.5}>
                      {/* Product Info */}
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flexGrow: 1, pr: 1 }}>
                          <Typography variant="body1" fontWeight={500} sx={{ mb: 0.5 }}>
                            {isRTL ? item.product.nameAr || item.product.name : item.product.name}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              {item.price.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {isRTL ? 'ج.م × ' : 'EGP × '}
                              {item.quantity}
                            </Typography>
                          </Stack>
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={() => removeFromCart(item.product.id!)}
                          sx={{ 
                            color: 'error.main',
                            '&:hover': { bgcolor: 'error.lighter' }
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>

                      {/* Quantity Controls */}
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box sx={{ 
                          display: 'inline-flex', 
                          alignItems: 'center',
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}>
                          <IconButton 
                            size="small"
                            onClick={() => updateQuantity(item.product.id!, item.quantity - 1)}
                            sx={{ 
                              borderRadius: 0,
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <Box sx={{ 
                            px: 2, 
                            minWidth: 50, 
                            textAlign: 'center',
                            borderLeft: 1,
                            borderRight: 1,
                            borderColor: 'divider',
                          }}>
                            <Typography variant="body2" fontWeight={500}>
                              {item.quantity}
                            </Typography>
                          </Box>
                          <IconButton 
                            size="small"
                            onClick={() => updateQuantity(item.product.id!, item.quantity + 1)}
                            sx={{ 
                              borderRadius: 0,
                              '&:hover': { bgcolor: 'action.hover' }
                            }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Box>
                        
                        <Typography variant="h6" color="primary" fontWeight={600}>
                          {item.subtotal.toLocaleString()}
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                            {isRTL ? 'ج.م' : 'EGP'}
                          </Typography>
                        </Typography>
                      </Stack>

                      {/* Discount */}
                      {item.discount > 0 && (
                        <Box sx={{ 
                          p: 1, 
                          bgcolor: 'success.lighter', 
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LocalOffer fontSize="small" color="success" />
                            <Typography variant="body2" color="success.dark">
                              {isRTL ? 'خصم' : 'Discount'} {item.discount}
                              {item.discountType === 'percentage' ? '%' : ` ${isRTL ? 'ج.م' : 'EGP'}`}
                            </Typography>
                          </Stack>
                          <IconButton 
                            size="small" 
                            onClick={() => updateDiscount(item.product.id!, 0, item.discountType)}
                            sx={{ color: 'success.dark' }}
                          >
                            <Clear fontSize="small" />
                          </IconButton>
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        <Divider />

        {/* Totals */}
        <Box sx={{ p: 2, bgcolor: 'background.default' }}>
          <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
            <Stack spacing={2}>
              {cart.length > 0 && (
                <>
                  {/* Items Summary */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {cart.length} {isRTL ? cart.length === 1 ? 'منتج' : 'منتجات' : cart.length === 1 ? 'item' : 'items'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {cart.reduce((acc, item) => acc + item.quantity, 0)} {isRTL ? 'قطعة' : 'pcs'}
                    </Typography>
                  </Stack>

                  {calculateTotalDiscount() > 0 && (
                    <>
                      <Divider />
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">
                            {isRTL ? 'المجموع الفرعي' : 'Subtotal'}
                          </Typography>
                          <Typography variant="body2">
                            {(calculateCartTotal() + calculateTotalDiscount()).toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <LocalOffer fontSize="small" color="success" />
                            <Typography variant="body2" color="success.main">
                              {isRTL ? 'الخصم' : 'Discount'}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" color="success.main" fontWeight={500}>
                            -{calculateTotalDiscount().toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                          </Typography>
                        </Stack>
                      </Stack>
                    </>
                  )}
                  
                  <Divider />
                  
                  {/* Total */}
                  <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                    <Typography variant="h6" fontWeight={600}>
                      {isRTL ? 'الإجمالي' : 'Total'}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="baseline">
                      <Typography variant="h4" color="primary" fontWeight={700}>
                        {calculateCartTotal().toLocaleString()}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        {isRTL ? 'ج.م' : 'EGP'}
                      </Typography>
                    </Stack>
                  </Stack>
                </>
              )}
            </Stack>
          </Paper>

          {/* Checkout Button */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<Payment />}
            onClick={handleCheckout}
            disabled={cart.length === 0}
            sx={{ 
              mt: 2,
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
              }
            }}
          >
            {cart.length === 0 
              ? (isRTL ? 'أضف منتجات للمتابعة' : 'Add items to proceed')
              : isRTL ? 'متابعة الدفع' : 'Proceed to Payment'
            }
          </Button>
        </Box>
      </Box>
    );
  }

  // Payment Dialog Component
  function PaymentDialog() {
    const [activeTab, setActiveTab] = useState(0);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState<string>('');
    const [availableAccounts, setAvailableAccounts] = useState<FinancialAccount[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    const paymentMethods: { method: PaymentMethod; icon: React.ReactNode; label: string; labelAr: string; color: string }[] = [
      { method: 'cash', icon: <LocalAtm />, label: 'Cash', labelAr: 'نقدي', color: 'success.main' },
      { method: 'card', icon: <CreditCard />, label: 'Card', labelAr: 'بطاقة', color: 'info.main' },
      { method: 'digital_wallet', icon: <AccountBalanceWallet />, label: 'Digital Wallet', labelAr: 'محفظة إلكترونية', color: 'warning.main' },
    ];

    // Load available accounts
    useEffect(() => {
      const loadAccounts = async () => {
        if (!currentUser?.companyId || !currentBranch?.id) return;
        
        setLoadingAccounts(true);
        try {
          const accounts = await financeService.getAccounts(currentUser.companyId, {
            branchId: currentBranch.id,
            status: 'active'
          });
          
          setAvailableAccounts(accounts);
          
          // Try to suggest a default account based on payment method
          const currentMethod = paymentMethods[activeTab].method;
          let suggestedAccount;
          
          switch (currentMethod) {
            case 'cash':
              suggestedAccount = accounts.find(acc => acc.type === 'cash' && acc.isDefault) ||
                               accounts.find(acc => acc.type === 'cash');
              break;
            case 'card':
              suggestedAccount = accounts.find(acc => acc.type === 'credit_card' && acc.isDefault) ||
                               accounts.find(acc => acc.type === 'credit_card') ||
                               accounts.find(acc => acc.type === 'bank' && acc.isDefault) ||
                               accounts.find(acc => acc.type === 'bank');
              break;
            case 'digital_wallet':
              suggestedAccount = accounts.find(acc => acc.type === 'digital_wallet' && acc.isDefault) ||
                               accounts.find(acc => acc.type === 'digital_wallet') ||
                               accounts.find(acc => acc.type === 'bank');
              break;
          }
          
          // Only set if not already selected
          if (!selectedAccountId && suggestedAccount) {
            setSelectedAccountId(suggestedAccount.id!);
          }
        } catch (error) {
          console.error('Error loading accounts:', error);
        } finally {
          setLoadingAccounts(false);
        }
      };
      
      loadAccounts();
    }, [currentUser?.companyId, currentBranch?.id]);

    const handleAddPayment = () => {
      const amount = parseFloat(paymentAmount);
      if (amount > 0 && selectedAccountId) {
        addPayment(paymentMethods[activeTab].method, amount, paymentReference, selectedAccountId);
        setPaymentAmount('');
        setPaymentReference('');
      } else if (!selectedAccountId) {
        toast.error(isRTL ? 'يرجى اختيار الحساب المالي' : 'Please select a financial account');
      }
    };

    const quickAmounts = [50, 100, 200, 500, 1000];

    return (
      <Dialog 
        open={paymentDialog} 
        onClose={() => setPaymentDialog(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}>
          <Payment />
          {isRTL ? 'الدفع والإنهاء' : 'Payment & Checkout'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            {/* Total Amount */}
            <Paper sx={{ 
              p: 2, 
              bgcolor: 'primary.lighter',
              borderRadius: 2,
            }}>
              <Stack spacing={1} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {isRTL ? 'المبلغ المطلوب' : 'Amount Due'}
                </Typography>
                <Typography variant="h3" color="primary" fontWeight={700}>
                  {calculateCartTotal().toLocaleString()}
                  <Typography component="span" variant="h6" color="text.secondary" sx={{ ml: 1 }}>
                    {isRTL ? 'ج.م' : 'EGP'}
                  </Typography>
                </Typography>
              </Stack>
            </Paper>

            {/* Payment Methods Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={activeTab} 
                onChange={(_, v) => setActiveTab(v)} 
                variant="fullWidth"
                sx={{
                  '& .MuiTab-root': {
                    py: 2,
                  }
                }}
              >
                {paymentMethods.map((pm, index) => (
                  <Tab
                    key={pm.method}
                    icon={pm.icon}
                    label={isRTL ? pm.labelAr : pm.label}
                    iconPosition="start"
                    sx={{
                      '&.Mui-selected': {
                        color: pm.color,
                      }
                    }}
                  />
                ))}
              </Tabs>
            </Box>

            {/* Account Selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{isRTL ? 'الحساب المالي' : 'Financial Account'}</InputLabel>
              <Select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                label={isRTL ? 'الحساب المالي' : 'Financial Account'}
                startAdornment={
                  <InputAdornment position="start">
                    <AccountBalance />
                  </InputAdornment>
                }
              >
                {availableAccounts.length === 0 && !loadingAccounts && (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      {isRTL 
                        ? 'لا توجد حسابات مالية. يرجى إنشاء حساب من إعدادات المالية.'
                        : 'No financial accounts. Please create an account in Finance settings.'}
                    </Typography>
                  </MenuItem>
                )}
                {availableAccounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {account.type === 'cash' && <LocalAtm fontSize="small" />}
                        {account.type === 'bank' && <AccountBalance fontSize="small" />}
                        {account.type === 'credit_card' && <CreditCard fontSize="small" />}
                        {account.type === 'digital_wallet' && <AccountBalanceWallet fontSize="small" />}
                        <span>{isRTL ? account.nameAr : account.name}</span>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {account.currentBalance?.toFixed(2) || '0.00'} {isRTL ? 'ج.م' : 'EGP'}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Payment Amount Input */}
            <Stack spacing={2}>
              <TextField
                fullWidth
                type="number"
                label={isRTL ? 'المبلغ' : 'Amount'}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">{isRTL ? 'ج.م' : 'EGP'}</InputAdornment>,
                }}
              />

              {/* Quick Amount Buttons */}
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {quickAmounts.map(amount => (
                  <Chip
                    key={amount}
                    label={amount}
                    onClick={() => setPaymentAmount(amount.toString())}
                    clickable
                  />
                ))}
                <Chip
                  label={isRTL ? 'المبلغ الكامل' : 'Full Amount'}
                  onClick={() => setPaymentAmount(getRemainingAmount().toString())}
                  clickable
                  color="primary"
                />
              </Stack>

              {/* Reference Number for Card/Digital Wallet */}
              {activeTab > 0 && (
                <TextField
                  fullWidth
                  label={isRTL ? 'رقم المرجع' : 'Reference Number'}
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                />
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={handleAddPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || !selectedAccountId}
              >
                {isRTL ? 'إضافة دفعة' : 'Add Payment'}
              </Button>
            </Stack>

            {/* Payment List */}
            {payments.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    {isRTL ? 'المدفوعات المضافة' : 'Added Payments'}
                  </Typography>
                  <Stack spacing={1}>
                    {payments.map((payment, index) => {
                      const pm = paymentMethods.find(p => p.method === payment.method);
                      return (
                        <Paper 
                          key={index} 
                          variant="outlined" 
                          sx={{ 
                            p: 1.5,
                            borderColor: pm?.color,
                            borderWidth: 2,
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Box sx={{ color: pm?.color }}>
                                {pm?.icon}
                              </Box>
                              <Box>
                                <Typography variant="body1" fontWeight={500}>
                                  {payment.amount.toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                                </Typography>
                                {payment.reference && (
                                  <Typography variant="caption" color="text.secondary">
                                    {isRTL ? 'المرجع: ' : 'Ref: '}{payment.reference}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                            <IconButton 
                              size="small" 
                              onClick={() => removePayment(index)}
                              color="error"
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Box>
              </>
            )}

            {/* Summary */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">{isRTL ? 'المطلوب' : 'Total Due'}</Typography>
                  <Typography>{calculateCartTotal().toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">{isRTL ? 'المدفوع' : 'Total Paid'}</Typography>
                  <Typography color="success.main">{getTotalPaid().toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6">{isRTL ? 'المتبقي' : 'Remaining'}</Typography>
                  <Typography variant="h6" color={getRemainingAmount() > 0 ? 'error' : 'success.main'}>
                    {getRemainingAmount().toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                  </Typography>
                </Stack>
                {getRemainingAmount() < -0.01 && (
                  <Alert severity="warning">
                    {isRTL ? 'الباقي: ' : 'Change: '}
                    {Math.abs(getRemainingAmount()).toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
                  </Alert>
                )}
              </Stack>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)}>
            {isRTL ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            onClick={completeTransaction}
            disabled={loading || getRemainingAmount() > 0.01}
            startIcon={<Receipt />}
          >
            {isRTL ? 'إتمام البيع' : 'Complete Sale'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
};

export default POSPage;