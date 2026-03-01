import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Button,
  Tooltip,
  Typography,
  Skeleton,
  FormControl,
  Select,
  useTheme,
  alpha,
  Avatar,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import {
  Search,
  FilterList,
  Edit,
  Delete,
  MoreVert,
  Add,
  Email,
  Phone,
  Business,
  Download,
  Upload,
  Person,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useBranch } from '../../contexts/BranchContext';
import { clientApiService } from '../../services/api/client.api.service';
import type { Client, ClientsFilter } from '../../services/client.service';
import { categoryService } from '../../services/category.service';
import type { ClientCategory } from '../../services/category.service';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface ClientsListProps {
  onAddClick?: () => void;
  onEditClick?: (client: Client) => void;
}

const ClientsList: React.FC<ClientsListProps> = ({ onAddClick, onEditClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch } = useBranch();
  const isRTL = theme.direction === 'rtl';

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ClientsFilter>({
    status: 'all',
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [clientCategories, setClientCategories] = useState<ClientCategory[]>([]);

  // Get company ID from user
  const getCompanyId = useCallback(async () => {
    if (!currentUser) return null;
    return currentUser.companyId;
  }, [currentUser]);

  // Load clients
  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const companyId = await getCompanyId();
      if (!companyId) {
        toast.error(isRTL ? 'لم يتم العثور على معرف الشركة' : 'Company ID not found');
        return;
      }

      console.log('ClientsList - Loading clients with branch:', currentBranch?.id);
      console.log('ClientsList - Current branch object:', currentBranch);
      
      // Load clients using API service
      const params = {
        page: page + 1, // API uses 1-based pagination
        limit: rowsPerPage,
        search: searchTerm || undefined,
        status: filter.status === 'all' ? undefined : filter.status,
        sortBy: filter.sortBy,
        sortDirection: filter.sortDirection,
        branchId: currentBranch?.id || undefined,
      };
      
      const response = await clientApiService.getClients(params);
      if (response.success && response.data) {
        // Transform API response to match expected format
        const transformedClients = response.data.map(client => ({
          ...client,
          // Handle date transformations
          dateOfBirth: client.dateOfBirth ? new Date(client.dateOfBirth) : undefined,
          createdAt: client.createdAt ? new Date(client.createdAt) : undefined,
          updatedAt: client.updatedAt ? new Date(client.updatedAt) : undefined,
          lastVisit: client.lastVisit ? new Date(client.lastVisit) : undefined,
        }));
        
        setClients(transformedClients);
        setTotalCount(response.pagination?.total || transformedClients.length);
      } else {
        throw new Error(response.error || 'Failed to load clients');
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error(isRTL ? 'فشل تحميل العملاء' : 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [getCompanyId, filter, searchTerm, rowsPerPage, isRTL, currentBranch]);

  // Load client categories
  useEffect(() => {
    const loadCategories = async () => {
      const companyId = await getCompanyId();
      if (!companyId) return;
      
      try {
        const categories = await categoryService.getCategories(
          companyId,
          'client',
          currentBranch?.id
        );
        setClientCategories(categories as ClientCategory[]);
      } catch (error) {
        console.error('Error loading client categories:', error);
      }
    };
    
    loadCategories();
  }, [getCompanyId, currentBranch]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Handle search
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  // Handle filter change
  const handleFilterChange = (event: SelectChangeEvent) => {
    setFilter({
      ...filter,
      status: event.target.value as any,
    });
    setPage(0);
  };

  // Handle sort
  const handleSort = (field: ClientsFilter['sortBy']) => {
    setFilter({
      ...filter,
      sortBy: field,
      sortDirection: filter.sortBy === field && filter.sortDirection === 'asc' ? 'desc' : 'asc',
    });
  };

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle menu
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    setAnchorEl(event.currentTarget);
    setSelectedClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClient(null);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedClient) return;

    if (window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا العميل؟' : 'Are you sure you want to delete this client?')) {
      try {
        const response = await clientApiService.deleteClient(selectedClient.id!);
        if (!response.success) {
          throw new Error(response.error || 'Failed to delete client');
        }
        toast.success(isRTL ? 'تم حذف العميل بنجاح' : 'Client deleted successfully');
        loadClients();
      } catch (error) {
        toast.error(isRTL ? 'فشل حذف العميل' : 'Failed to delete client');
      }
    }
    handleMenuClose();
  };

  // Get status color
  const getStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      case 'prospect':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Get status label
  const getStatusLabel = (status: Client['status']) => {
    const labels = {
      active: isRTL ? 'نشط' : 'Active',
      inactive: isRTL ? 'غير نشط' : 'Inactive',
      prospect: isRTL ? 'محتمل' : 'Prospect',
    };
    return labels[status] || status;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  // Display data for current page
  const displayedClients = clients.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
            <TextField
              placeholder={isRTL ? 'البحث عن العملاء...' : 'Search clients...'}
              value={searchTerm}
              onChange={handleSearch}
              sx={{ flex: 1, maxWidth: 400 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <Select
                value={filter.status || 'all'}
                onChange={handleFilterChange}
                displayEmpty
                startAdornment={
                  <InputAdornment position="start">
                    <FilterList />
                  </InputAdornment>
                }
              >
                <MenuItem value="all">{isRTL ? 'الكل' : 'All'}</MenuItem>
                <MenuItem value="active">{isRTL ? 'نشط' : 'Active'}</MenuItem>
                <MenuItem value="inactive">{isRTL ? 'غير نشط' : 'Inactive'}</MenuItem>
                <MenuItem value="prospect">{isRTL ? 'محتمل' : 'Prospect'}</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={isRTL ? 'استيراد' : 'Import'}>
              <IconButton
                sx={{
                  color: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.main + '20',
                  },
                }}
              >
                <Upload />
              </IconButton>
            </Tooltip>
            <Tooltip title={isRTL ? 'تصدير' : 'Export'}>
              <IconButton
                sx={{
                  color: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.main + '20',
                  },
                }}
              >
                <Download />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onAddClick}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: '#fff',
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              {isRTL ? 'إضافة عميل' : 'Add Client'}
            </Button>
          </Box>
        </Box>

        {/* Table */}
        <motion.div variants={itemVariants}>
          <TableContainer 
            component={Paper}
            sx={{
              backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#fff',
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 4px 6px rgba(0,0,0,0.3)' 
                : '0 1px 3px rgba(0,0,0,0.12)',
            }}
          >
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? '#252525' 
                      : '#f5f5f5',
                    '& .MuiTableCell-head': {
                      color: theme.palette.primary.main,
                      fontWeight: 600,
                      borderBottom: `2px solid ${theme.palette.primary.main}`,
                    },
                  }}
                >
                  <TableCell>{isRTL ? 'اسم العميل' : 'Client Name'}</TableCell>
                  <TableCell>{isRTL ? 'البريد الإلكتروني' : 'Email'}</TableCell>
                  <TableCell>{isRTL ? 'الهاتف' : 'Phone'}</TableCell>
                  <TableCell>{isRTL ? 'الفئة' : 'Category'}</TableCell>
                  <TableCell>{isRTL ? 'الحالة' : 'Status'}</TableCell>
                  <TableCell>{isRTL ? 'الإيرادات' : 'Revenue'}</TableCell>
                  <TableCell>{isRTL ? 'تاريخ الإضافة' : 'Date Added'}</TableCell>
                  <TableCell align="center">{isRTL ? 'الإجراءات' : 'Actions'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                      <TableCell><Skeleton /></TableCell>
                    </TableRow>
                  ))
                ) : displayedClients.length === 0 ? (
                  // Empty state
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                      <Box>
                        <Business sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                          {searchTerm
                            ? (isRTL ? 'لا توجد نتائج للبحث' : 'No search results')
                            : (isRTL ? 'لا يوجد عملاء بعد' : 'No clients yet')}
                        </Typography>
                        {!searchTerm && (
                          <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={onAddClick}
                            sx={{ 
                              mt: 2,
                              backgroundColor: theme.palette.primary.main,
                              color: '#fff',
                              '&:hover': {
                                backgroundColor: theme.palette.primary.dark,
                              },
                            }}
                          >
                            {isRTL ? 'إضافة أول عميل' : 'Add First Client'}
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  // Data rows
                  displayedClients.map((client, index) => (
                    <motion.tr
                      key={client.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      component={TableRow}
                      sx={{
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark'
                            ? alpha(theme.palette.primary.main, 0.15)
                            : alpha(theme.palette.primary.main, 0.05),
                          cursor: 'pointer',
                        },
                        '& .MuiTableCell-root': {
                          borderBottom: `1px solid ${theme.palette.divider}`,
                        },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            src={client.photo}
                            sx={{ 
                              width: 40, 
                              height: 40,
                              bgcolor: theme.palette.primary.main + '20',
                              color: theme.palette.primary.main,
                            }}
                          >
                            {client.photo ? null : (
                              client.firstName?.charAt(0)?.toUpperCase() || 
                              client.lastName?.charAt(0)?.toUpperCase() || 
                              client.name?.charAt(0)?.toUpperCase() || 
                              <Person />
                            )}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {client.firstName || client.lastName 
                                ? `${client.firstName || ''} ${client.lastName || ''}`.trim()
                                : client.name || 'No Name'}
                            </Typography>
                            {client.nameAr && (
                              <Typography variant="caption" color="text.secondary">
                                {client.nameAr}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                          {client.emails?.find(e => e.isPrimary)?.address || client.email || '-'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                          {client.phones?.find(p => p.isPrimary)?.number || client.phone || '-'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {client.categoryId ? (
                          (() => {
                            const category = clientCategories.find(c => c.id === client.categoryId);
                            return category ? (
                              <Chip
                                label={isRTL ? category.nameAr || category.name : category.name}
                                size="small"
                                sx={{
                                  backgroundColor: category.color + '20',
                                  color: category.color,
                                  borderColor: category.color,
                                  border: '1px solid',
                                  fontWeight: 500,
                                }}
                              />
                            ) : '-';
                          })()
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(client.status)}
                          color={getStatusColor(client.status)}
                          size="small"
                          sx={{
                            fontWeight: 500,
                            '&.MuiChip-colorSuccess': {
                              backgroundColor: '#4caf50',
                              color: '#fff',
                            },
                            '&.MuiChip-colorError': {
                              backgroundColor: '#f44336',
                              color: '#fff',
                            },
                            '&.MuiChip-colorWarning': {
                              backgroundColor: theme.palette.primary.main,
                              color: '#fff',
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {client.totalRevenue
                          ? `${client.totalRevenue.toLocaleString()} ${isRTL ? 'ر.س' : 'SAR'}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {client.createdAt
                          ? format(client.createdAt, 'dd/MM/yyyy', {
                              locale: isRTL ? ar : enUS,
                            })
                          : '-'}
                      </TableCell>
                      <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditClick?.(client);
                          }}
                          sx={{
                            color: theme.palette.primary.main,
                            '&:hover': {
                              backgroundColor: theme.palette.primary.main + '20',
                            },
                          }}
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuClick(e, client)}
                          sx={{
                            color: theme.palette.text.secondary,
                            '&:hover': {
                              backgroundColor: theme.palette.action.hover,
                            },
                          }}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {!loading && clients.length > 0 && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage={isRTL ? 'عدد الصفوف:' : 'Rows per page:'}
              labelDisplayedRows={({ from, to, count }) =>
                isRTL
                  ? `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
                  : `${from}-${to} of ${count !== -1 ? count : `more than ${to}`}`
              }
            />
          )}
        </motion.div>
      </motion.div>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDelete}>
          <Delete sx={{ mr: 1 }} />
          {isRTL ? 'حذف' : 'Delete'}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ClientsList;