import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Grid,
  Avatar,
  Chip,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { superadminService, type BusinessDetail, type BusinessStatus } from '../../services/superadmin.service';
import { toDateSafe } from '../../utils/dateUtils';

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
      id={`business-tabpanel-${index}`}
      aria-labelledby={`business-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const BusinessDetailPage: React.FC = () => {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<BusinessDetail>>({});
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'suspend' | 'activate' | 'changePlan' | null;
    title: string;
    message: string;
  }>({ open: false, type: null, title: '', message: '' });

  const urlHash = import.meta.env.VITE_SUPERADMIN_URL_HASH;
  const basePath = `/sa-${urlHash}`;

  // Load business details
  const loadBusiness = async () => {
    if (!businessId) return;
    
    try {
      setLoading(true);
      setError(null);
      const businessData = await superadminService.getBusinessDetail(businessId);
      
      if (!businessData) {
        setError('Business not found');
        return;
      }
      
      setBusiness(businessData);
      setEditForm(businessData);
    } catch (err) {
      console.error('Error loading business:', err);
      setError('Failed to load business details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusiness();
  }, [businessId]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleEdit = () => {
    setEditing(true);
    setEditForm(business || {});
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditForm(business || {});
  };

  const handleSave = async () => {
    // Here you would implement the save logic
    // For now, just cancel editing
    setEditing(false);
    // In real implementation:
    // await superadminService.updateBusiness(businessId, editForm);
    // loadBusiness();
  };

  const handleStatusAction = async (action: 'suspend' | 'activate') => {
    if (!business) return;

    try {
      const newStatus: BusinessStatus = action === 'suspend' ? 'suspended' : 'active';
      const reason = `${action === 'suspend' ? 'Suspended' : 'Activated'} by superadmin`;
      
      await superadminService.updateBusinessStatus(business.id, newStatus, reason);
      
      // Reload business data
      await loadBusiness();
      
    } catch (error) {
      console.error(`Error ${action}ing business:`, error);
      setError(`Failed to ${action} business. Please try again.`);
    }

    setActionDialog({ open: false, type: null, title: '', message: '' });
  };

  const openActionDialog = (type: 'suspend' | 'activate') => {
    if (!business) return;

    const isActivating = type === 'activate';
    setActionDialog({
      open: true,
      type,
      title: `${isActivating ? 'Activate' : 'Suspend'} Business`,
      message: `Are you sure you want to ${isActivating ? 'activate' : 'suspend'} "${business.name}"? ${
        isActivating 
          ? 'This will restore full access to their dashboard and services.' 
          : 'This will immediately restrict access to their dashboard and services.'
      }`,
    });
  };

  // Get status color
  const getStatusColor = (status: BusinessStatus): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'suspended': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = toDateSafe(timestamp);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !business) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Business not found'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`${basePath}/businesses`)}
        >
          Back to Businesses
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            onClick={() => navigate(`${basePath}/businesses`)}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Avatar sx={{ mr: 2, bgcolor: 'primary.main', width: 56, height: 56 }}>
            {business.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom>
              {business.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={business.status.toUpperCase()}
                size="small"
                color={getStatusColor(business.status)}
              />
              <Chip
                label={business.plan.toUpperCase()}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                ID: {business.id}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          {business.status === 'active' ? (
            <Button
              variant="outlined"
              color="error"
              startIcon={<BlockIcon />}
              onClick={() => openActionDialog('suspend')}
            >
              Suspend
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={() => openActionDialog('activate')}
            >
              Activate
            </Button>
          )}
          
          {editing ? (
            <>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
              >
                Save
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEdit}
            >
              Edit
            </Button>
          )}
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AttachMoneyIcon sx={{ mr: 1, color: 'success.main' }} />
                <Box>
                  <Typography variant="h6">
                    {formatCurrency(business.monthlyRevenue)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Monthly Revenue
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PersonIcon sx={{ mr: 1, color: 'info.main' }} />
                <Box>
                  <Typography variant="h6">
                    {business.totalUsers}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BusinessIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Box>
                  <Typography variant="h6">
                    {business.totalBranches}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Branches
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Box>
                  <Typography variant="h6">
                    {business.usage.appointments}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Appointments
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Overview" />
            <Tab label="Subscription" />
            <Tab label="Usage & Analytics" />
            <Tab label="Contact Information" />
            <Tab label="Billing" />
          </Tabs>
        </Box>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Business Information
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <BusinessIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Business Name"
                    secondary={business.businessName || business.name}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Owner"
                    secondary={business.ownerName}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <EmailIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={business.email}
                  />
                </ListItem>
                
                {business.phone && (
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Phone"
                      secondary={business.phone}
                    />
                  </ListItem>
                )}
                
                <ListItem>
                  <ListItemIcon>
                    <CalendarIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="Created"
                    secondary={formatDate(business.createdAt)}
                  />
                </ListItem>
              </List>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Platform Usage
              </Typography>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Clients"
                    secondary={business.usage.clients}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Staff Members"
                    secondary={business.usage.staff}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Services"
                    secondary={business.usage.services}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Storage Used"
                    secondary={`${business.usage.storage} MB`}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Subscription Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Current Plan
              </Typography>
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="h4" color="primary.main">
                  {business.plan.toUpperCase()}
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {formatCurrency(business.monthlyRevenue)} / month
                </Typography>
                {business.subscription && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Next billing: {formatDate(business.subscription.currentPeriodEnd)}
                  </Typography>
                )}
              </Paper>
              
              {editing && (
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Change Plan</InputLabel>
                  <Select
                    value={editForm.plan || ''}
                    label="Change Plan"
                    onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                  >
                    <MenuItem value="trial">Trial</MenuItem>
                    <MenuItem value="starter">Starter</MenuItem>
                    <MenuItem value="professional">Professional</MenuItem>
                    <MenuItem value="business">Business</MenuItem>
                    <MenuItem value="enterprise">Enterprise</MenuItem>
                  </Select>
                </FormControl>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Subscription Details
              </Typography>
              {business.subscription && (
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Status"
                      secondary={
                        <Chip
                          label={business.subscription.status.toUpperCase()}
                          size="small"
                          color={getStatusColor(business.subscription.status)}
                        />
                      }
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Current Period"
                      secondary={`${formatDate(business.subscription.currentPeriodStart)} - ${formatDate(business.subscription.currentPeriodEnd)}`}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Billing Cycle"
                      secondary={business.subscription.pricing.billingCycle}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Auto-Renewal"
                      secondary={business.subscription.cancelAtPeriodEnd ? 'Disabled' : 'Enabled'}
                    />
                  </ListItem>
                </List>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Usage & Analytics Tab */}
        <TabPanel value={activeTab} index={2}>
          <Typography variant="h6" gutterBottom>
            Usage Analytics
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="body1" color="text.secondary">
                Detailed usage analytics coming soon...
              </Typography>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Contact Information Tab */}
        <TabPanel value={activeTab} index={3}>
          <Typography variant="h6" gutterBottom>
            Contact Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              {editing ? (
                <>
                  <TextField
                    fullWidth
                    label="Business Name"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Phone"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    sx={{ mb: 2 }}
                  />
                </>
              ) : (
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Business Name"
                      secondary={business.name}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Email"
                      secondary={business.email}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Phone"
                      secondary={business.phone || 'Not provided'}
                    />
                  </ListItem>
                </List>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>
                Address
              </Typography>
              {business.address ? (
                <Typography variant="body2">
                  {business.address.street}<br />
                  {business.address.city}<br />
                  {business.address.country}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No address provided
                </Typography>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        {/* Billing Tab */}
        <TabPanel value={activeTab} index={4}>
          <Typography variant="h6" gutterBottom>
            Billing Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <List>
                <ListItem>
                  <ListItemText
                    primary="Payment Method"
                    secondary={business.billing.paymentMethod || 'Not set'}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Last Payment"
                    secondary={business.billing.lastPayment ? formatDate(business.billing.lastPayment) : 'No payments yet'}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Next Payment"
                    secondary={business.billing.nextPayment ? formatDate(business.billing.nextPayment) : 'N/A'}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Currency"
                    secondary={business.billing.currency}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, type: null, title: '', message: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {actionDialog.type === 'suspend' ? (
              <WarningIcon sx={{ mr: 1, color: 'error.main' }} />
            ) : (
              <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
            )}
            {actionDialog.title}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography>
            {actionDialog.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setActionDialog({ open: false, type: null, title: '', message: '' })}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => actionDialog.type && handleStatusAction(actionDialog.type)}
            variant="contained"
            color={actionDialog.type === 'suspend' ? 'error' : 'primary'}
          >
            {actionDialog.type === 'suspend' ? 'Suspend Business' : 'Activate Business'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BusinessDetailPage;