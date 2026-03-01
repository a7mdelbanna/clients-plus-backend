import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  Pagination,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import { superadminService, type BusinessSummary, type BusinessFilters, type BusinessStatus } from '../../services/superadmin.service';
import { toDateSafe } from '../../utils/dateUtils';

const BusinessListPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BusinessFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<BusinessStatus | ''>('');
  const [planFilter, setPlanFilter] = useState('');

  // Get initial status filter from route
  const getInitialStatusFromRoute = (): BusinessStatus | '' => {
    const path = location.pathname;
    if (path.includes('/active')) return 'active';
    if (path.includes('/suspended')) return 'suspended';
    if (path.includes('/pending')) return 'pending';
    return '';
  };

  // Set initial status filter based on route
  useEffect(() => {
    const initialStatus = getInitialStatusFromRoute();
    setStatusFilter(initialStatus);
  }, [location.pathname]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessSummary | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'suspend' | 'activate' | 'changePlan' | null;
    business: BusinessSummary | null;
  }>({ open: false, type: null, business: null });

  const pageSize = 20;
  const urlHash = import.meta.env.VITE_SUPERADMIN_URL_HASH;
  const basePath = `/sa-${urlHash}`;

  // Load businesses
  const loadBusinesses = async (pageNum = 1, newFilters?: BusinessFilters) => {
    try {
      setLoading(true);
      setError(null);
      
      const filterOptions = {
        ...filters,
        ...newFilters,
        searchTerm: searchTerm.trim() || undefined,
        status: statusFilter || undefined,
        plan: planFilter || undefined,
      };

      const result = await superadminService.getBusinesses(filterOptions, pageSize);
      
      setBusinesses(result.businesses);
      setTotalPages(Math.ceil(result.businesses.length / pageSize));
    } catch (err) {
      console.error('Error loading businesses:', err);
      setError('Failed to load businesses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses(page);
  }, [page]);

  // Handle search
  const handleSearch = () => {
    setPage(1);
    loadBusinesses(1);
  };

  // Handle filter changes
  const handleFilterChange = () => {
    setPage(1);
    loadBusinesses(1);
  };

  // Handle business actions
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, business: BusinessSummary) => {
    setAnchorEl(event.currentTarget);
    setSelectedBusiness(business);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBusiness(null);
  };

  const handleActionClick = (type: 'suspend' | 'activate' | 'changePlan') => {
    setActionDialog({
      open: true,
      type,
      business: selectedBusiness,
    });
    handleMenuClose();
  };

  const handleActionConfirm = async () => {
    if (!actionDialog.business || !actionDialog.type) return;

    try {
      const businessId = actionDialog.business.id;
      
      switch (actionDialog.type) {
        case 'suspend':
          await superadminService.updateBusinessStatus(businessId, 'suspended', 'Suspended by superadmin');
          break;
        case 'activate':
          await superadminService.updateBusinessStatus(businessId, 'active', 'Activated by superadmin');
          break;
        // changePlan would need additional UI for plan selection
      }

      // Reload businesses
      loadBusinesses(page);
      
    } catch (error) {
      console.error('Error performing action:', error);
      setError('Failed to perform action. Please try again.');
    }

    setActionDialog({ open: false, type: null, business: null });
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

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = toDateSafe(timestamp);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  // Get page title based on route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/active')) return 'Active Businesses';
    if (path.includes('/suspended')) return 'Suspended Businesses';
    if (path.includes('/pending')) return 'Pending Businesses';
    return 'All Businesses';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {getPageTitle()}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage businesses on the platform
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search businesses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => {
                    setStatusFilter(e.target.value as BusinessStatus | '');
                    handleFilterChange();
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="suspended">Suspended</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Plan</InputLabel>
                <Select
                  value={planFilter}
                  label="Plan"
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    handleFilterChange();
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="trial">Trial</MenuItem>
                  <MenuItem value="starter">Starter</MenuItem>
                  <MenuItem value="professional">Professional</MenuItem>
                  <MenuItem value="business">Business</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                variant="contained"
                onClick={handleSearch}
                startIcon={<SearchIcon />}
                fullWidth
              >
                Search
              </Button>
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPlanFilter('');
                  setPage(1);
                  loadBusinesses(1, {});
                }}
                startIcon={<FilterIcon />}
                fullWidth
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Business Table */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : businesses.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <BusinessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No businesses found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search or filter criteria
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Business</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="center">Users</TableCell>
                      <TableCell align="center">Branches</TableCell>
                      <TableCell>Created</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {businesses.map((business) => (
                      <TableRow key={business.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              {business.name.charAt(0).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight="bold">
                                {business.name}
                              </Typography>
                              {business.businessName && business.businessName !== business.name && (
                                <Typography variant="caption" color="text.secondary">
                                  {business.businessName}
                                </Typography>
                              )}
                              <Typography variant="caption" color="text.secondary" display="block">
                                {business.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            Owner Info
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={business.plan.toUpperCase()}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={business.status.toUpperCase()}
                            size="small"
                            color={getStatusColor(business.status)}
                          />
                        </TableCell>

                        <TableCell align="right">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                            <AttachMoneyIcon sx={{ fontSize: 16, mr: 0.5, color: 'success.main' }} />
                            <Typography variant="body2" fontWeight="bold">
                              {formatCurrency(business.monthlyRevenue)}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            /month
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PeopleIcon sx={{ fontSize: 16, mr: 0.5, color: 'info.main' }} />
                            <Typography variant="body2">
                              {business.totalUsers}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BusinessIcon sx={{ fontSize: 16, mr: 0.5, color: 'warning.main' }} />
                            <Typography variant="body2">
                              {business.totalBranches}
                            </Typography>
                          </Box>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(business.createdAt)}
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <IconButton
                            onClick={(e) => handleMenuClick(e, business)}
                            size="small"
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(_, newPage) => setPage(newPage)}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleActionClick('activate')}>
          <ListItemIcon>
            <CheckCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Activate</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={() => handleActionClick('suspend')}>
          <ListItemIcon>
            <BlockIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Suspend</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => handleActionClick('changePlan')}>
          <ListItemIcon>
            <TrendingUpIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Change Plan</ListItemText>
        </MenuItem>

        <MenuItem onClick={() => {
          if (selectedBusiness) {
            navigate(`${basePath}/businesses/${selectedBusiness.id}`);
          }
          handleMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
      </Menu>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, type: null, business: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Action
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to {actionDialog.type} the business "{actionDialog.business?.name}"?
          </Typography>
          {actionDialog.type === 'suspend' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This will immediately restrict access to the business dashboard and services.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setActionDialog({ open: false, type: null, business: null })}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleActionConfirm}
            variant="contained"
            color={actionDialog.type === 'suspend' ? 'error' : 'primary'}
          >
            {actionDialog.type === 'suspend' ? 'Suspend' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BusinessListPage;