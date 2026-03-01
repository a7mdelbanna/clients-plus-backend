import React, { useState, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  Card,
  CardContent,
  Typography,
  IconButton,
  Badge,
  Alert,
  Stack,
  Autocomplete,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
} from '@mui/material';
import {
  Search,
  Add,
  Remove,
  FilterList,
  Clear,
  ShoppingCart,
  QrCode,
} from '@mui/icons-material';
import type { Product } from '../../types/product.types';
import type { PrintableProduct } from '../../types/labelPrinting.types';

interface ProductSelectionProps {
  products: Product[];
  selectedProducts: PrintableProduct[];
  onSelectionChange: (products: PrintableProduct[]) => void;
  loading?: boolean;
}

// Default props to ensure safe fallbacks
const defaultProps = {
  products: [] as Product[],
  selectedProducts: [] as PrintableProduct[],
  loading: false,
};

const ProductSelection: React.FC<ProductSelectionProps> = (props) => {
  const {
    products = defaultProps.products,
    selectedProducts = defaultProps.selectedProducts,
    onSelectionChange,
    loading = defaultProps.loading,
  } = props;
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Get unique categories
  const categories = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    const cats = Array.from(new Set(
      products
        .map(p => p.categoryName)
        .filter(Boolean)
    ));
    return cats.sort();
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    let filtered = products;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(term) ||
        product.nameAr?.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.barcode?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.categoryName === selectedCategory);
    }

    // Show only selected filter
    if (showOnlySelected) {
      const selectedIds = selectedProducts.map(p => p.id);
      filtered = filtered.filter(product => selectedIds.includes(product.id));
    }

    return filtered;
  }, [products, searchTerm, selectedCategory, showOnlySelected, selectedProducts]);

  const handleProductSelect = (product: Product) => {
    const existingIndex = selectedProducts.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      // Product already selected, increase quantity
      const updated = [...selectedProducts];
      updated[existingIndex].quantity += 1;
      onSelectionChange(updated);
    } else {
      // Add new product
      const printableProduct: PrintableProduct = {
        id: product.id,
        name: product.name,
        nameAr: product.nameAr,
        barcode: product.barcode || '',
        sku: product.sku,
        price: product.retailPrice,
        categoryName: product.categoryName,
        quantity: 1,
      };
      onSelectionChange([...selectedProducts, printableProduct]);
    }
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    const updated = selectedProducts.map(product => {
      if (product.id === productId) {
        const newQuantity = Math.max(0, product.quantity + delta);
        return { ...product, quantity: newQuantity };
      }
      return product;
    }).filter(product => product.quantity > 0);

    onSelectionChange(updated);
  };

  const handleRemoveProduct = (productId: string) => {
    onSelectionChange(selectedProducts.filter(p => p.id !== productId));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getSelectedQuantity = (productId: string): number => {
    const selected = selectedProducts.find(p => p.id === productId);
    return selected?.quantity || 0;
  };

  const totalSelectedCount = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);

  return (
    <Box>
      {/* Search and filters */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={isRTL ? 'البحث عن المنتجات...' : 'Search products...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <Clear />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        
        {/* Category filter */}
        <Box sx={{ mt: 1 }}>
          <Autocomplete
            size="small"
            options={categories}
            value={selectedCategory}
            onChange={(_, value) => setSelectedCategory(value || '')}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={isRTL ? 'تصفية حسب الفئة' : 'Filter by category'}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <FilterList />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Box>

        {/* Filter chips */}
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label={isRTL ? 'المحددة فقط' : 'Selected Only'}
            variant={showOnlySelected ? 'filled' : 'outlined'}
            color={showOnlySelected ? 'primary' : 'default'}
            size="small"
            onClick={() => setShowOnlySelected(!showOnlySelected)}
          />
          {selectedCategory && (
            <Chip
              label={selectedCategory}
              onDelete={() => setSelectedCategory('')}
              size="small"
              color="primary"
            />
          )}
        </Box>
      </Box>

      {/* Selected products summary */}
      {selectedProducts.length > 0 && (
        <Card sx={{ mb: 2, bgcolor: 'primary.50' }}>
          <CardContent sx={{ py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingCart color="primary" />
                <Typography variant="body2" color="primary">
                  {isRTL 
                    ? `${selectedProducts.length} منتج محدد (${totalSelectedCount} ملصق)`
                    : `${selectedProducts.length} products selected (${totalSelectedCount} labels)`
                  }
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={handleClearAll}
                color="error"
                startIcon={<Clear />}
              >
                {isRTL ? 'مسح الكل' : 'Clear All'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Product list */}
      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto',
        minHeight: 0,
        // Custom scrollbar styling
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: theme.palette.primary.main,
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: theme.palette.primary.dark,
        },
      }}>
        {loading ? (
          <Alert severity="info">
            {isRTL ? 'جاري تحميل المنتجات...' : 'Loading products...'}
          </Alert>
        ) : filteredProducts.length === 0 ? (
          <Alert severity="warning">
            {isRTL ? 'لا توجد منتجات مطابقة للبحث' : 'No products match your search'}
          </Alert>
        ) : (
          <List sx={{ py: 0 }}>
            {filteredProducts.map((product, index) => {
              const selectedQty = getSelectedQuantity(product.id);
              const isSelected = selectedQty > 0;
              
              return (
                <React.Fragment key={product.id}>
                  <ListItem
                    sx={{
                      cursor: 'pointer',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      py: 2,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                      ...(isSelected && {
                        bgcolor: 'primary.50',
                        borderLeft: '4px solid',
                        borderLeftColor: 'primary.main',
                      }),
                    }}
                    onClick={() => handleProductSelect(product)}
                  >
                    {/* Product Name Row */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', mb: 1 }}>
                      <Typography variant="body2" fontWeight={isSelected ? 'bold' : 'normal'}>
                        {isRTL && product.nameAr ? product.nameAr : product.name}
                      </Typography>
                      {product.barcode && (
                        <QrCode sx={{ fontSize: 16, color: 'text.secondary' }} />
                      )}
                      {isSelected && (
                        <Badge badgeContent={selectedQty} color="primary" sx={{ ml: 'auto' }} />
                      )}
                    </Box>
                    
                    {/* Product Details Row */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: '100%' }}>
                      <Chip label={product.sku} size="small" variant="outlined" />
                      {product.categoryName && (
                        <Chip label={product.categoryName} size="small" />
                      )}
                      <Chip 
                        label={`${product.retailPrice || 0} EGP`} 
                        size="small" 
                        color="primary" 
                      />
                    </Box>
                    
                    {isSelected && (
                      <ListItemSecondaryAction>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityChange(product.id, -1);
                            }}
                          >
                            <Remove />
                          </IconButton>
                          <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                            {selectedQty}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityChange(product.id, 1);
                            }}
                          >
                            <Add />
                          </IconButton>
                        </Box>
                      </ListItemSecondaryAction>
                    )}
                  </ListItem>
                  {index < filteredProducts.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default ProductSelection;