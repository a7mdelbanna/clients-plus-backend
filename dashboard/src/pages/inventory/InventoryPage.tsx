import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
  Chip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Menu,
  ListItemIcon,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Inventory,
  Add,
  Remove,
  SwapHoriz,
  TrendingUp,
  TrendingDown,
  LocalShipping,
  Warning,
  CheckCircle,
  Error,
  FilterList,
  Download,
  Upload,
  BarChart,
  History,
  Edit,
  MoreVert,
  ArrowUpward,
  ArrowDownward,
  ShoppingCart,
  Build,
  Category,
  Search,
  QrCode,
  AttachMoney,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { productService } from '../../services/product.service';
import { branchService } from '../../services/branch.service';
import type {
  Product,
  InventoryTransaction,
  InventoryTransactionType,
  StockAlert,
} from '../../types/product.types';
import type { Branch } from '../../services/branch.service';
import { toDateSafe } from '../../utils/dateUtils';

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

const InventoryPage: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Dialog states
  const [adjustmentDialog, setAdjustmentDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);

  // Form states
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'adjustment' as InventoryTransactionType,
    quantity: 0,
    reason: '',
  });

  const [transferForm, setTransferForm] = useState({
    toBranchId: '',
    products: [] as { productId: string; quantity: number }[],
    notes: '',
  });

  const [filters, setFilters] = useState({
    search: '',
    category: '',
    lowStock: false,
    outOfStock: false,
  });

  // Load data
  useEffect(() => {
    if (currentUser?.companyId) {
      loadData();
    }
  }, [currentUser?.companyId, currentBranch?.id]);

  const loadData = async () => {
    if (!currentUser?.companyId) return;

    try {
      setLoading(true);

      // Load branches
      const branchesData = await branchService.getBranches(currentUser.companyId);
      setBranches(branchesData.filter(b => b.isActive && b.id !== currentBranch?.id));

      // Load products
      const { products: productsData } = await productService.getProducts(
        currentUser.companyId,
        { branchId: currentBranch?.id }
      );
      setProducts(productsData);

      // Load recent transactions
      const transactionsData = await productService.getInventoryTransactions(
        currentUser.companyId,
        { branchId: currentBranch?.id },
        20
      );
      setTransactions(transactionsData);

      // Load stock alerts
      const alertsData = await productService.getStockAlerts(
        currentUser.companyId,
        currentBranch?.id,
        true
      );
      setStockAlerts(alertsData);
    } catch (error) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleAdjustmentSubmit = async () => {
    if (!currentUser?.companyId || !currentBranch?.id || !selectedProduct?.id) return;

    try {
      await productService.adjustStock(
        currentUser.companyId,
        currentBranch.id,
        selectedProduct.id,
        adjustmentForm.quantity,
        adjustmentForm.reason,
        currentUser.id
      );

      setAdjustmentDialog(false);
      setSelectedProduct(null);
      setAdjustmentForm({ type: 'adjustment', quantity: 0, reason: '' });
      loadData();
    } catch (error) {
      console.error('Error adjusting stock:', error);
    }
  };

  const handleTransferSubmit = async () => {
    if (!currentUser?.companyId || !currentBranch?.id) return;

    try {
      await productService.createStockTransfer({
        companyId: currentUser.companyId,
        fromBranchId: currentBranch.id,
        toBranchId: transferForm.toBranchId,
        items: transferForm.products,
        transferDate: new Date().toISOString(),
        status: 'pending',
        notes: transferForm.notes,
        createdBy: currentUser.id,
      });

      setTransferDialog(false);
      setTransferForm({ toBranchId: '', products: [], notes: '' });
      loadData();
    } catch (error) {
      console.error('Error creating transfer:', error);
    }
  };

  // Get filtered products
  const getFilteredProducts = () => {
    return products.filter(product => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(searchLower) ||
          product.nameAr?.toLowerCase().includes(searchLower) ||
          product.sku?.toLowerCase().includes(searchLower) ||
          product.barcode?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Stock filters
      if (filters.lowStock || filters.outOfStock) {
        const branchStock = currentBranch?.id && product.branchStock
          ? product.branchStock[currentBranch.id]
          : null;
        
        if (!branchStock) return false;

        if (filters.outOfStock && branchStock.quantity > 0) return false;
        if (filters.lowStock && !filters.outOfStock) {
          if (branchStock.quantity === 0) return false;
          if (!product.lowStockThreshold || branchStock.quantity > product.lowStockThreshold) {
            return false;
          }
        }
      }

      return true;
    });
  };

  // Get transaction type icon
  const getTransactionIcon = (type: InventoryTransactionType) => {
    switch (type) {
      case 'purchase':
      case 'opening':
      case 'transfer_in':
        return <ArrowDownward color="success" />;
      case 'sale':
      case 'damage':
      case 'loss':
      case 'transfer_out':
        return <ArrowUpward color="error" />;
      case 'adjustment':
        return <Edit color="action" />;
      case 'production':
        return <Build color="primary" />;
      default:
        return <SwapHoriz color="action" />;
    }
  };

  // Calculate inventory value
  const calculateInventoryValue = () => {
    return products.reduce((total, product) => {
      if (!product.trackInventory || !product.branchStock || !currentBranch?.id) return total;
      const branchStock = product.branchStock[currentBranch.id];
      if (!branchStock) return total;
      return total + (branchStock.quantity * product.retailPrice);
    }, 0);
  };

  // Product card component
  const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const branchStock = currentBranch?.id && product.branchStock
      ? product.branchStock[currentBranch.id]
      : null;

    const stockLevel = branchStock?.quantity || 0;
    const isLowStock = product.lowStockThreshold && stockLevel <= product.lowStockThreshold && stockLevel > 0;
    const isOutOfStock = stockLevel === 0;

    return (
      <Card sx={{ height: '100%', position: 'relative' }}>
        <CardContent>
          <Stack spacing={2}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {isRTL ? product.nameAr : product.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  {product.sku && (
                    <Chip label={`SKU: ${product.sku}`} size="small" />
                  )}
                  {product.barcode && (
                    <Chip
                      icon={<QrCode />}
                      label={product.barcode}
                      size="small"
                    />
                  )}
                </Stack>
              </Box>
              <IconButton
                size="small"
                onClick={(e) => {
                  setAnchorEl(e.currentTarget);
                  setSelectedProduct(product);
                }}
              >
                <MoreVert />
              </IconButton>
            </Stack>

            {/* Stock Info */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {isRTL ? 'المخزون الحالي' : 'Current Stock'}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h5" color={isOutOfStock ? 'error' : isLowStock ? 'warning.main' : 'text.primary'}>
                    {stockLevel}
                  </Typography>
                  {isOutOfStock && (
                    <Chip
                      label={isRTL ? 'نفذ المخزون' : 'Out of Stock'}
                      color="error"
                      size="small"
                      icon={<Error />}
                    />
                  )}
                  {isLowStock && (
                    <Chip
                      label={isRTL ? 'مخزون منخفض' : 'Low Stock'}
                      color="warning"
                      size="small"
                      icon={<Warning />}
                    />
                  )}
                </Stack>
              </Stack>

              {branchStock?.location && (
                <Typography variant="caption" color="text.secondary">
                  {isRTL ? 'الموقع: ' : 'Location: '}{branchStock.location}
                </Typography>
              )}
            </Box>

            {/* Value */}
            <Divider />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">
                {isRTL ? 'القيمة' : 'Value'}
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {(stockLevel * product.retailPrice).toLocaleString()} {isRTL ? 'ج.م' : 'EGP'}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h4" component="h1">
            {isRTL ? 'إدارة المخزون' : 'Inventory Management'}
          </Typography>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<SwapHoriz />}
              onClick={() => setTransferDialog(true)}
              disabled={branches.length === 0}
            >
              {isRTL ? 'نقل المخزون' : 'Transfer Stock'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<History />}
              onClick={() => setHistoryDialog(true)}
            >
              {isRTL ? 'السجل' : 'History'}
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                // TODO: Navigate to add product page
              }}
            >
              {isRTL ? 'إضافة منتج' : 'Add Product'}
            </Button>
          </Stack>
        </Stack>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Inventory color="primary" />
                    <Typography variant="h4">
                      {products.filter(p => p.trackInventory).length}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'المنتجات المتتبعة' : 'Tracked Products'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <AttachMoney color="success" />
                    <Typography variant="h5">
                      {calculateInventoryValue().toLocaleString()}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'قيمة المخزون' : 'Inventory Value'} ({isRTL ? 'ج.م' : 'EGP'})
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Warning color="warning" />
                    <Typography variant="h4">
                      {products.filter(p => {
                        if (!p.trackInventory || !p.branchStock || !currentBranch?.id) return false;
                        const stock = p.branchStock[currentBranch.id];
                        return stock && p.lowStockThreshold && stock.quantity <= p.lowStockThreshold && stock.quantity > 0;
                      }).length}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'مخزون منخفض' : 'Low Stock Items'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Error color="error" />
                    <Typography variant="h4">
                      {products.filter(p => {
                        if (!p.trackInventory || !p.branchStock || !currentBranch?.id) return false;
                        const stock = p.branchStock[currentBranch.id];
                        return stock && stock.quantity === 0;
                      }).length}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {isRTL ? 'نفذ المخزون' : 'Out of Stock'}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label={isRTL ? 'نظرة عامة' : 'Overview'} />
            <Tab label={isRTL ? 'المعاملات' : 'Transactions'} />
            <Tab label={isRTL ? 'التنبيهات' : 'Alerts'} icon={stockAlerts.length > 0 ? <Badge badgeContent={stockAlerts.length} color="error" /> : undefined} iconPosition="end" />
          </Tabs>
        </Paper>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={activeTab} index={0}>
        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              placeholder={isRTL ? 'بحث بالاسم أو الباركود...' : 'Search by name or barcode...'}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ flexGrow: 1 }}
            />
            <Chip
              label={isRTL ? 'مخزون منخفض' : 'Low Stock'}
              onClick={() => setFilters({ ...filters, lowStock: !filters.lowStock, outOfStock: false })}
              color={filters.lowStock ? 'warning' : 'default'}
              icon={<Warning />}
            />
            <Chip
              label={isRTL ? 'نفذ المخزون' : 'Out of Stock'}
              onClick={() => setFilters({ ...filters, outOfStock: !filters.outOfStock, lowStock: false })}
              color={filters.outOfStock ? 'error' : 'default'}
              icon={<Error />}
            />
          </Stack>
        </Paper>

        {/* Products Grid */}
        <Grid container spacing={3}>
          {getFilteredProducts().map((product) => (
            <Grid item xs={12} sm={6} md={4} key={product.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCard product={product} />
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {getFilteredProducts().length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Inventory sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {isRTL ? 'لا توجد منتجات مطابقة' : 'No products found'}
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Transactions Tab */}
      <TabPanel value={activeTab} index={1}>
        <List>
          {transactions.map((transaction) => (
            <React.Fragment key={transaction.id}>
              <ListItem>
                <ListItemIcon>
                  {getTransactionIcon(transaction.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="body1">
                        {products.find(p => p.id === transaction.productId)?.name || transaction.productId}
                      </Typography>
                      <Chip
                        label={`${transaction.quantity > 0 ? '+' : ''}${transaction.quantity}`}
                        size="small"
                        color={transaction.quantity > 0 ? 'success' : 'error'}
                      />
                    </Stack>
                  }
                  secondary={
                    <Stack spacing={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        {transaction.notes || transaction.type}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {toDateSafe(transaction.date).toLocaleString()}
                      </Typography>
                    </Stack>
                  }
                />
                <ListItemSecondaryAction>
                  <Stack alignItems="flex-end" spacing={0.5}>
                    <Typography variant="body2">
                      {transaction.previousQuantity} → {transaction.newQuantity}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {transaction.performedBy}
                    </Typography>
                  </Stack>
                </ListItemSecondaryAction>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>

        {transactions.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <History sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {isRTL ? 'لا توجد معاملات' : 'No transactions found'}
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Alerts Tab */}
      <TabPanel value={activeTab} index={2}>
        <List>
          {stockAlerts.map((alert) => {
            const product = products.find(p => p.id === alert.productId);
            return (
              <React.Fragment key={alert.id}>
                <ListItem>
                  <ListItemIcon>
                    {alert.type === 'out_of_stock' ? <Error color="error" /> : <Warning color="warning" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={product ? (isRTL ? product.nameAr : product.name) : alert.productId}
                    secondary={
                      <Stack spacing={0.5}>
                        <Typography variant="body2" color="text.secondary">
                          {isRTL ? alert.messageAr : alert.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {isRTL ? 'الكمية الحالية: ' : 'Current: '}{alert.currentQuantity}
                          {alert.threshold && ` / ${isRTL ? 'الحد: ' : 'Threshold: '}${alert.threshold}`}
                        </Typography>
                      </Stack>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={alert.severity}
                      size="small"
                      color={alert.severity === 'high' ? 'error' : alert.severity === 'medium' ? 'warning' : 'default'}
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            );
          })}
        </List>

        {stockAlerts.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              {isRTL ? 'لا توجد تنبيهات' : 'No alerts'}
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
          setSelectedProduct(null);
        }}
      >
        <MenuItem
          onClick={() => {
            setAdjustmentDialog(true);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'تعديل المخزون' : 'Adjust Stock'}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedProduct) {
              setTransferForm({
                ...transferForm,
                products: [{ productId: selectedProduct.id!, quantity: 0 }],
              });
              setTransferDialog(true);
            }
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <SwapHoriz fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'نقل المخزون' : 'Transfer Stock'}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setHistoryDialog(true);
            setAnchorEl(null);
          }}
        >
          <ListItemIcon>
            <History fontSize="small" />
          </ListItemIcon>
          <ListItemText>{isRTL ? 'عرض السجل' : 'View History'}</ListItemText>
        </MenuItem>
      </Menu>

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentDialog} onClose={() => setAdjustmentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isRTL ? 'تعديل المخزون' : 'Adjust Stock'} - {selectedProduct && (isRTL ? selectedProduct.nameAr : selectedProduct.name)}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{isRTL ? 'نوع المعاملة' : 'Transaction Type'}</InputLabel>
              <Select
                value={adjustmentForm.type}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value as InventoryTransactionType })}
                label={isRTL ? 'نوع المعاملة' : 'Transaction Type'}
              >
                <MenuItem value="adjustment">{isRTL ? 'تعديل' : 'Adjustment'}</MenuItem>
                <MenuItem value="damage">{isRTL ? 'تلف' : 'Damage'}</MenuItem>
                <MenuItem value="loss">{isRTL ? 'فقدان' : 'Loss'}</MenuItem>
                <MenuItem value="purchase">{isRTL ? 'شراء' : 'Purchase'}</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              type="number"
              label={isRTL ? 'الكمية' : 'Quantity'}
              value={adjustmentForm.quantity}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: parseInt(e.target.value) || 0 })}
              helperText={isRTL ? 'استخدم رقم سالب للخصم' : 'Use negative number to deduct'}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label={isRTL ? 'السبب' : 'Reason'}
              value={adjustmentForm.reason}
              onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustmentDialog(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button
            onClick={handleAdjustmentSubmit}
            variant="contained"
            disabled={!adjustmentForm.reason || adjustmentForm.quantity === 0}
          >
            {isRTL ? 'تأكيد' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialog} onClose={() => setTransferDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{isRTL ? 'نقل المخزون' : 'Transfer Stock'}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{isRTL ? 'إلى الفرع' : 'To Branch'}</InputLabel>
              <Select
                value={transferForm.toBranchId}
                onChange={(e) => setTransferForm({ ...transferForm, toBranchId: e.target.value })}
                label={isRTL ? 'إلى الفرع' : 'To Branch'}
              >
                {branches.map((branch) => (
                  <MenuItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={2}
              label={isRTL ? 'ملاحظات' : 'Notes'}
              value={transferForm.notes}
              onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialog(false)}>{isRTL ? 'إلغاء' : 'Cancel'}</Button>
          <Button
            onClick={handleTransferSubmit}
            variant="contained"
            disabled={!transferForm.toBranchId || transferForm.products.length === 0}
          >
            {isRTL ? 'إنشاء النقل' : 'Create Transfer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog} onClose={() => setHistoryDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          {isRTL ? 'سجل المعاملات' : 'Transaction History'}
          {selectedProduct && ` - ${isRTL ? selectedProduct.nameAr : selectedProduct.name}`}
        </DialogTitle>
        <DialogContent>
          <List>
            {transactions
              .filter(t => !selectedProduct || t.productId === selectedProduct.id)
              .map((transaction) => (
                <React.Fragment key={transaction.id}>
                  <ListItem>
                    <ListItemIcon>
                      {getTransactionIcon(transaction.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography variant="body1">
                            {products.find(p => p.id === transaction.productId)?.name || transaction.productId}
                          </Typography>
                          <Chip
                            label={`${transaction.quantity > 0 ? '+' : ''}${transaction.quantity}`}
                            size="small"
                            color={transaction.quantity > 0 ? 'success' : 'error'}
                          />
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.5}>
                          <Typography variant="body2" color="text.secondary">
                            {transaction.notes || transaction.type}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {toDateSafe(transaction.date).toLocaleString()}
                          </Typography>
                        </Stack>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Stack alignItems="flex-end" spacing={0.5}>
                        <Typography variant="body2">
                          {transaction.previousQuantity} → {transaction.newQuantity}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {transaction.performedBy}
                        </Typography>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>{isRTL ? 'إغلاق' : 'Close'}</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InventoryPage;