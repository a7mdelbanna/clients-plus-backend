import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { pricingService, type PricingPlan, type PremiumAddon } from '../../services/pricing.service';

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
      id={`pricing-tabpanel-${index}`}
      aria-labelledby={`pricing-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PricingManagementPage: React.FC = () => {
  const location = useLocation();
  
  // Get initial tab from route
  const getInitialTabFromRoute = (): number => {
    const path = location.pathname;
    if (path.includes('/overrides')) return 2;
    if (path.includes('/addons')) return 1;
    if (path.includes('/promotions')) return 3;
    return 0; // Default to plans
  };

  const [activeTab, setActiveTab] = useState(getInitialTabFromRoute());
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [addons, setAddons] = useState<PremiumAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [editingAddon, setEditingAddon] = useState<PremiumAddon | null>(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [addonDialog, setAddonDialog] = useState(false);

  // Load pricing data
  const loadPricingData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [plansData, addonsData] = await Promise.all([
        pricingService.getAllPricingPlans(),
        pricingService.getPremiumAddons(),
      ]);
      
      setPlans(plansData);
      setAddons(addonsData);
    } catch (err) {
      console.error('Error loading pricing data:', err);
      setError('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricingData();
  }, []);

  // Update tab when route changes
  useEffect(() => {
    setActiveTab(getInitialTabFromRoute());
  }, [location.pathname]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Plan management
  const handleEditPlan = (plan: PricingPlan) => {
    setEditingPlan({ ...plan });
    setPlanDialog(true);
  };

  const handleCreatePlan = () => {
    setEditingPlan({
      id: '',
      name: '',
      displayName: { en: '', ar: '' },
      description: { en: '', ar: '' },
      pricing: {
        amount: 0,
        currency: 'EGP',
        billingCycle: 'monthly',
        yearlyDiscount: 0,
      },
      features: [],
      limits: {
        users: 0,
        storage: 0,
        branches: 0,
        appointments: 0,
        clients: 0,
      },
      popular: false,
      active: true,
      order: 0,
    });
    setPlanDialog(true);
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;

    try {
      if (editingPlan.id) {
        await pricingService.updatePricingPlan(editingPlan.id, editingPlan);
      } else {
        await pricingService.createPricingPlan(editingPlan);
      }
      
      await loadPricingData();
      setPlanDialog(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Error saving plan:', error);
      setError('Failed to save plan');
    }
  };

  // Addon management
  const handleEditAddon = (addon: PremiumAddon) => {
    setEditingAddon({ ...addon });
    setAddonDialog(true);
  };

  const handleCreateAddon = () => {
    setEditingAddon({
      id: '',
      name: '',
      displayName: { en: '', ar: '' },
      description: { en: '', ar: '' },
      pricing: {
        setupFee: 0,
        monthlyFee: 0,
        currency: 'EGP',
      },
      features: [],
      category: 'branding',
      active: true,
    });
    setAddonDialog(true);
  };

  const handleSaveAddon = async () => {
    if (!editingAddon) return;

    try {
      if (editingAddon.id) {
        await pricingService.updatePremiumAddon(editingAddon.id, editingAddon);
      } else {
        await pricingService.createPremiumAddon(editingAddon);
      }
      
      await loadPricingData();
      setAddonDialog(false);
      setEditingAddon(null);
    } catch (error) {
      console.error('Error saving addon:', error);
      setError('Failed to save addon');
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Pricing Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure pricing plans, add-ons, and promotional offers
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Pricing Plans" />
            <Tab label="Premium Add-ons" />
            <Tab label="Business Overrides" />
            <Tab label="Promotions" />
          </Tabs>
        </Box>

        {/* Pricing Plans Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6">
              Subscription Plans
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreatePlan}
            >
              Create Plan
            </Button>
          </Box>

          <Grid container spacing={3}>
            {plans.map((plan) => (
              <Grid item xs={12} md={6} lg={4} key={plan.id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {plan.displayName.en}
                      </Typography>
                      {plan.popular && (
                        <Chip
                          label="Popular"
                          size="small"
                          color="primary"
                          icon={<StarIcon />}
                        />
                      )}
                    </Box>
                    
                    <Typography variant="h4" color="primary.main" gutterBottom>
                      {formatCurrency(plan.pricing.amount)}
                      <Typography component="span" variant="body2" color="text.secondary">
                        /{plan.pricing.billingCycle}
                      </Typography>
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {plan.description.en}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2" gutterBottom>
                      Limits
                    </Typography>
                    <List dense>
                      <ListItem disablePadding>
                        <ListItemText
                          primary={`${plan.limits.users} Users`}
                          secondary="Team members"
                        />
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemText
                          primary={`${plan.limits.branches} Branches`}
                          secondary="Business locations"
                        />
                      </ListItem>
                      <ListItem disablePadding>
                        <ListItemText
                          primary={`${plan.limits.storage} GB`}
                          secondary="File storage"
                        />
                      </ListItem>
                    </List>

                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditPlan(plan)}
                      >
                        Edit
                      </Button>
                      <Chip
                        label={plan.active ? 'Active' : 'Inactive'}
                        size="small"
                        color={plan.active ? 'success' : 'default'}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Premium Add-ons Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6">
              Premium Add-ons
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateAddon}
            >
              Create Add-on
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Setup Fee</TableCell>
                  <TableCell align="right">Monthly Fee</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {addons.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {addon.displayName.en}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {addon.description.en}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={addon.category}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(addon.pricing.setupFee)}
                    </TableCell>
                    <TableCell align="right">
                      {formatCurrency(addon.pricing.monthlyFee)}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={addon.active ? 'Active' : 'Inactive'}
                        size="small"
                        color={addon.active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleEditAddon(addon)}
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Business Overrides Tab */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Business-Specific Pricing Overrides
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Custom pricing configurations for specific businesses
          </Typography>
          
          <Alert severity="info">
            Business override functionality coming soon. This will allow setting custom pricing for specific businesses.
          </Alert>
        </TabPanel>

        {/* Promotions Tab */}
        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" gutterBottom>
            Promotional Campaigns
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Manage discount codes, limited-time offers, and promotional pricing
          </Typography>
          
          <Alert severity="info">
            Promotional campaigns functionality coming soon. This will include discount codes, time-limited offers, and bulk pricing.
          </Alert>
        </TabPanel>
      </Card>

      {/* Plan Edit Dialog */}
      <Dialog
        open={planDialog}
        onClose={() => setPlanDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingPlan?.id ? 'Edit Pricing Plan' : 'Create Pricing Plan'}
        </DialogTitle>
        <DialogContent>
          {editingPlan && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Plan ID"
                  value={editingPlan.id}
                  onChange={(e) => setEditingPlan({ ...editingPlan, id: e.target.value })}
                  disabled={!!editingPlan.id}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Internal Name"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Display Name (English)"
                  value={editingPlan.displayName.en}
                  onChange={(e) => setEditingPlan({
                    ...editingPlan,
                    displayName: { ...editingPlan.displayName, en: e.target.value }
                  })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Display Name (Arabic)"
                  value={editingPlan.displayName.ar}
                  onChange={(e) => setEditingPlan({
                    ...editingPlan,
                    displayName: { ...editingPlan.displayName, ar: e.target.value }
                  })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description (English)"
                  multiline
                  rows={2}
                  value={editingPlan.description.en}
                  onChange={(e) => setEditingPlan({
                    ...editingPlan,
                    description: { ...editingPlan.description, en: e.target.value }
                  })}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Price (EGP)"
                  type="number"
                  value={editingPlan.pricing.amount}
                  onChange={(e) => setEditingPlan({
                    ...editingPlan,
                    pricing: { ...editingPlan.pricing, amount: Number(e.target.value) }
                  })}
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Billing Cycle</InputLabel>
                  <Select
                    value={editingPlan.pricing.billingCycle}
                    label="Billing Cycle"
                    onChange={(e) => setEditingPlan({
                      ...editingPlan,
                      pricing: { ...editingPlan.pricing, billingCycle: e.target.value as 'monthly' | 'yearly' }
                    })}
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="yearly">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Yearly Discount (%)"
                  type="number"
                  value={editingPlan.pricing.yearlyDiscount}
                  onChange={(e) => setEditingPlan({
                    ...editingPlan,
                    pricing: { ...editingPlan.pricing, yearlyDiscount: Number(e.target.value) }
                  })}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                  Plan Limits
                </Typography>
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Max Users"
                  type="number"
                  value={editingPlan.limits.users}
                  onChange={(e) => setEditingPlan({
                    ...editingPlan,
                    limits: { ...editingPlan.limits, users: Number(e.target.value) }
                  })}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Max Branches"
                  type="number"
                  value={editingPlan.limits.branches}
                  onChange={(e) => setEditingPlan({
                    ...editingPlan,
                    limits: { ...editingPlan.limits, branches: Number(e.target.value) }
                  })}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Storage (GB)"
                  type="number"
                  value={editingPlan.limits.storage}
                  onChange={(e) => setEditingPlan({
                    ...editingPlan,
                    limits: { ...editingPlan.limits, storage: Number(e.target.value) }
                  })}
                />
              </Grid>

              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  label="Monthly Appointments"
                  type="number"
                  value={editingPlan.limits.appointments}
                  onChange={(e) => setEditingPlan({
                    ...editingPlan,
                    limits: { ...editingPlan.limits, appointments: Number(e.target.value) }
                  })}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingPlan.popular}
                      onChange={(e) => setEditingPlan({ ...editingPlan, popular: e.target.checked })}
                    />
                  }
                  label="Popular Plan"
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingPlan.active}
                      onChange={(e) => setEditingPlan({ ...editingPlan, active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSavePlan}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Save Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Addon Edit Dialog */}
      <Dialog
        open={addonDialog}
        onClose={() => setAddonDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingAddon?.id ? 'Edit Premium Add-on' : 'Create Premium Add-on'}
        </DialogTitle>
        <DialogContent>
          {editingAddon && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Add-on ID"
                  value={editingAddon.id}
                  onChange={(e) => setEditingAddon({ ...editingAddon, id: e.target.value })}
                  disabled={!!editingAddon.id}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Display Name (English)"
                  value={editingAddon.displayName.en}
                  onChange={(e) => setEditingAddon({
                    ...editingAddon,
                    displayName: { ...editingAddon.displayName, en: e.target.value }
                  })}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={editingAddon.category}
                    label="Category"
                    onChange={(e) => setEditingAddon({
                      ...editingAddon,
                      category: e.target.value as 'branding' | 'integration' | 'analytics' | 'automation'
                    })}
                  >
                    <MenuItem value="branding">Branding</MenuItem>
                    <MenuItem value="integration">Integration</MenuItem>
                    <MenuItem value="analytics">Analytics</MenuItem>
                    <MenuItem value="automation">Automation</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Setup Fee (EGP)"
                  type="number"
                  value={editingAddon.pricing.setupFee}
                  onChange={(e) => setEditingAddon({
                    ...editingAddon,
                    pricing: { ...editingAddon.pricing, setupFee: Number(e.target.value) }
                  })}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Monthly Fee (EGP)"
                  type="number"
                  value={editingAddon.pricing.monthlyFee}
                  onChange={(e) => setEditingAddon({
                    ...editingAddon,
                    pricing: { ...editingAddon.pricing, monthlyFee: Number(e.target.value) }
                  })}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingAddon.active}
                      onChange={(e) => setEditingAddon({ ...editingAddon, active: e.target.checked })}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddonDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAddon}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Save Add-on
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PricingManagementPage;