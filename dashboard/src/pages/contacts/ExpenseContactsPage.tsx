import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  IconButton,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Menu,
  MenuItem,
  Typography,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Avatar,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Checkbox,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Archive as ArchiveIcon,
  AttachMoney as MoneyIcon,
  AccountBalance as BankIcon,
  CreditCard as CardIcon,
  Engineering as ContractorIcon,
  LocalShipping as SupplierIcon,
  Store as VendorIcon,
  Handshake as PartnerIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { contactService } from '../../services/contact.service';
import { expenseService } from '../../services/expense.service';
import type { Contact, ContactFilters, ContactCategory, ContactStatus } from '../../types/contact.types';
import { ContactType } from '../../types/contact.types';
import { formatPhoneNumber } from '../../utils/format';
import { formatCurrency } from '../../utils/format';
import ContactCreateDialog from './ContactCreateDialog';
import ContactEditDialog from './ContactEditDialog';
import { migrateVendorsToContacts, verifyMigrationStatus } from '../../utils/migrateVendorsToContacts';
import { toDateSafe } from '../../utils/dateUtils';

// Expense-specific contact types
const EXPENSE_CONTACT_TYPES = [
  ContactType.VENDOR,
  ContactType.SUPPLIER,
  ContactType.CONTRACTOR,
  ContactType.PARTNER,
];

// Contact type configuration for expenses
const expenseContactTypeConfig = {
  [ContactType.VENDOR]: { 
    color: 'primary', 
    icon: VendorIcon, 
    label: 'مورد',
    description: 'موردو الخدمات العامة'
  },
  [ContactType.SUPPLIER]: { 
    color: 'secondary', 
    icon: SupplierIcon, 
    label: 'مزود',
    description: 'موردو المنتجات والمواد'
  },
  [ContactType.CONTRACTOR]: { 
    color: 'warning', 
    icon: ContractorIcon, 
    label: 'مقاول',
    description: 'المقاولون والخدمات المستقلة'
  },
  [ContactType.PARTNER]: { 
    color: 'success', 
    icon: PartnerIcon, 
    label: 'شريك',
    description: 'الشركاء التجاريون'
  },
};

// Status configuration
const statusConfig = {
  active: { color: 'success', label: 'نشط' },
  inactive: { color: 'default', label: 'غير نشط' },
  blocked: { color: 'error', label: 'محظور' },
  archived: { color: 'warning', label: 'مؤرشف' },
};

interface ExpenseStats {
  totalExpenses: number;
  expenseCount: number;
  lastExpenseDate?: Timestamp;
  averageExpense: number;
}

export default function ExpenseContactsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<ContactCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [expenseStats, setExpenseStats] = useState<Record<string, ExpenseStats>>({});
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<ContactType | 'all'>('all');
  const [filters, setFilters] = useState<ContactFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Selection
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  
  // Dialogs
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuContactId, setMenuContactId] = useState<string | null>(null);
  
  // Migration state
  const [showMigration, setShowMigration] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [migrating, setMigrating] = useState(false);

  // Get company ID once on mount
  useEffect(() => {
    const getCompanyId = async () => {
      if (!user) {
        console.log('No user available');
        return;
      }

      const id = user.companyId;

      if (id) {
        console.log('Found companyId:', id);
        setCompanyId(id);
      } else {
        console.error('No companyId found for user');
        setError('لم يتم العثور على معرف الشركة');
        setLoading(false);
      }
    };

    getCompanyId();
  }, [user]);

  // Load initial data when companyId is available
  useEffect(() => {
    const loadInitialData = async () => {
      if (!companyId) {
        return;
      }

      console.log('Loading expense contacts for company:', companyId);
      setLoading(true);
      setError(null);

      try {
        // Load only expense-relevant contacts
        const { contacts: fetchedContacts } = await contactService.getContacts(
          companyId,
          {
            types: EXPENSE_CONTACT_TYPES,
            status: ['active', 'inactive'], // Show active and inactive, but not blocked/archived
          }
        );
        
        console.log('Fetched expense contacts:', fetchedContacts.length);
        setContacts(fetchedContacts);
        
        // Load expense statistics for each contact
        const stats: Record<string, ExpenseStats> = {};
        for (const contact of fetchedContacts) {
          if (contact.id) {
            // This would need to be implemented in expense service
            // For now, using placeholder data
            stats[contact.id] = {
              totalExpenses: contact.financial?.totalTransactions || 0,
              expenseCount: 0,
              lastExpenseDate: contact.financial?.lastTransactionDate,
              averageExpense: 0,
            };
          }
        }
        setExpenseStats(stats);
        
        // Load categories for expense types
        try {
          const fetchedCategories = await contactService.getCategories(companyId);
          // Filter to expense-relevant categories
          const expenseCategories = fetchedCategories.filter(cat => 
            EXPENSE_CONTACT_TYPES.includes(cat.type)
          );
          console.log('Fetched expense categories:', expenseCategories.length);
          setCategories(expenseCategories);
        } catch (err) {
          console.error('Error loading categories:', err);
        }
      } catch (err) {
        console.error('Error loading expense contacts:', err);
        setError('حدث خطأ في تحميل موردي المصروفات');
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
    checkMigrationStatus();
  }, [companyId]);

  // Check if there are vendors to migrate
  const checkMigrationStatus = async () => {
    if (!companyId) return;
    
    try {
      const status = await verifyMigrationStatus(companyId);
      console.log('Migration status:', status);
      setMigrationStatus(status);
      
      // Show migration prompt if there are unmigrated vendors
      if (status.pendingCount > 0) {
        setShowMigration(true);
      }
    } catch (err) {
      console.error('Error checking migration status:', err);
    }
  };

  // Run migration
  const runMigration = async () => {
    if (!companyId || !user) return;
    
    setMigrating(true);
    try {
      const result = await migrateVendorsToContacts(companyId, user.uid);
      console.log('Migration result:', result);
      
      // Refresh data
      await loadFilteredData();
      await checkMigrationStatus();
      
      // Show success message
      if (result.migratedCount > 0) {
        setError(`تم ترحيل ${result.migratedCount} مورد بنجاح`);
      }
      
      setShowMigration(false);
    } catch (err) {
      console.error('Migration error:', err);
      setError('حدث خطأ أثناء ترحيل البيانات');
    } finally {
      setMigrating(false);
    }
  };

  // Load filtered data
  const loadFilteredData = async () => {
    if (!companyId) {
      console.log('No companyId for loading filtered data');
      return;
    }

    console.log('Loading filtered expense contacts...');
    setLoading(true);

    try {
      // Apply tab filter
      const typeFilter = selectedTab !== 'all' 
        ? [selectedTab as ContactType] 
        : EXPENSE_CONTACT_TYPES;
      
      // Load contacts with filters
      const { contacts: fetchedContacts } = await contactService.getContacts(
        companyId,
        {
          types: typeFilter,
          status: filters.status || ['active', 'inactive'],
          categoryIds: filters.categoryIds,
          tags: filters.tags,
          search: searchQuery,
        }
      );
      
      console.log('Loaded filtered expense contacts:', fetchedContacts.length);
      setContacts(fetchedContacts);
    } catch (err) {
      console.error('Error loading filtered contacts:', err);
      setError('حدث خطأ في تحميل الموردين');
    } finally {
      setLoading(false);
    }
  };

  // Reload when tab changes
  useEffect(() => {
    if (companyId && selectedTab) {
      console.log('Tab changed to:', selectedTab);
      loadFilteredData();
    }
  }, [selectedTab, companyId]);

  // Manual refresh function
  const loadData = () => {
    loadFilteredData();
  };

  // Handle actions
  const handleCreateContact = () => {
    setOpenCreateDialog(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setOpenEditDialog(true);
    handleCloseMenu();
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!companyId) return;
    
    if (window.confirm('هل أنت متأكد من حذف هذا المورد؟ سيتم الاحتفاظ بسجل المصروفات السابقة.')) {
      try {
        await contactService.deleteContact(companyId, contactId);
        await loadFilteredData();
      } catch (err) {
        console.error('Error deleting contact:', err);
        setError('حدث خطأ في حذف المورد');
      }
    }
    handleCloseMenu();
  };

  const handleArchiveContact = async (contactId: string) => {
    if (!companyId) return;
    
    try {
      await contactService.archiveContact(companyId, contactId);
      await loadFilteredData();
    } catch (err) {
      console.error('Error archiving contact:', err);
      setError('حدث خطأ في أرشفة المورد');
    }
    handleCloseMenu();
  };

  // Menu handlers
  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, contactId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuContactId(contactId);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuContactId(null);
  };

  // Tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: ContactType | 'all') => {
    setSelectedTab(newValue);
    setPage(0);
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts;
  }, [contacts]);

  // Paginated contacts
  const paginatedContacts = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredContacts.slice(start, start + rowsPerPage);
  }, [filteredContacts, page, rowsPerPage]);

  // Get contact type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach(contact => {
      counts[contact.type] = (counts[contact.type] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  // Calculate total expenses
  const totalExpenses = useMemo(() => {
    return Object.values(expenseStats).reduce((sum, stats) => sum + stats.totalExpenses, 0);
  }, [expenseStats]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/finance/expenses')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            موردو المصروفات
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            disabled
          >
            استيراد موردين
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateContact}
          >
            مورد جديد
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    إجمالي الموردين
                  </Typography>
                  <Typography variant="h4">
                    {contacts.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.light' }}>
                  <BusinessIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    الموردون النشطون
                  </Typography>
                  <Typography variant="h4">
                    {contacts.filter(c => c.status === 'active').length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.light' }}>
                  <PersonIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    إجمالي المصروفات
                  </Typography>
                  <Typography variant="h4">
                    {formatCurrency(totalExpenses)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.light' }}>
                  <MoneyIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    الفئات
                  </Typography>
                  <Typography variant="h4">
                    {categories.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.light' }}>
                  <CategoryIcon />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs - Only expense-relevant types */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab 
            label={`الكل (${contacts.length})`} 
            value="all" 
          />
          {EXPENSE_CONTACT_TYPES.map((type) => {
            const config = expenseContactTypeConfig[type];
            const count = typeCounts[type] || 0;
            return (
              <Tab
                key={type}
                label={`${config.label} (${count})`}
                value={type}
                icon={<config.icon fontSize="small" />}
                iconPosition="start"
              />
            );
          })}
        </Tabs>
      </Paper>

      {/* Search and filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="البحث في الموردين..."
            variant="outlined"
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                loadFilteredData();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            فلاتر
          </Button>
        </Box>

        {/* Filters section */}
        {showFilters && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>الحالة</InputLabel>
                  <Select
                    multiple
                    value={filters.status || []}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value as ContactStatus[] })}
                    renderValue={(selected) => selected.map(s => statusConfig[s].label).join(', ')}
                  >
                    {Object.entries(statusConfig).map(([value, config]) => (
                      <MenuItem key={value} value={value}>
                        <Checkbox checked={(filters.status || []).includes(value as ContactStatus)} />
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>الفئة</InputLabel>
                  <Select
                    multiple
                    value={filters.categoryIds || []}
                    onChange={(e) => setFilters({ ...filters, categoryIds: e.target.value as string[] })}
                    renderValue={(selected) => {
                      return selected.map(id => {
                        const cat = categories.find(c => c.id === id);
                        return cat?.name || id;
                      }).join(', ');
                    }}
                  >
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        <Checkbox checked={(filters.categoryIds || []).includes(category.id!)} />
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    setFilters({});
                    loadFilteredData();
                  }}
                >
                  إعادة تعيين
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Migration Alert */}
      {showMigration && migrationStatus?.pendingCount > 0 && (
        <Alert 
          severity="info" 
          sx={{ mb: 2 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={runMigration}
              disabled={migrating}
            >
              {migrating ? 'جاري الترحيل...' : 'ترحيل الآن'}
            </Button>
          }
          onClose={() => setShowMigration(false)}
        >
          <Typography variant="body2">
            لديك {migrationStatus.pendingCount} مورد في النظام القديم. 
            يمكنك ترحيلهم إلى نظام جهات الاتصال الجديد للحصول على ميزات أفضل.
          </Typography>
        </Alert>
      )}

      {/* Contacts table */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : contacts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              لا توجد موردين مسجلين
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ابدأ بإضافة الموردين والمقاولين الذين تتعامل معهم
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateContact}
            >
              إضافة أول مورد
            </Button>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>المورد</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>رقم الهاتف</TableCell>
                <TableCell>البريد الإلكتروني</TableCell>
                <TableCell>إجمالي المصروفات</TableCell>
                <TableCell>آخر معاملة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedContacts.map((contact) => {
                const typeConfig = expenseContactTypeConfig[contact.type];
                const TypeIcon = typeConfig.icon;
                const stats = expenseStats[contact.id!] || { totalExpenses: 0, expenseCount: 0 };
                
                return (
                  <TableRow
                    key={contact.id}
                    hover
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 40, height: 40, bgcolor: `${typeConfig.color}.light` }}>
                          <TypeIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {contact.displayName}
                          </Typography>
                          {contact.companyName && (
                            <Typography variant="caption" color="text.secondary">
                              {contact.companyName}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={typeConfig.label}
                        size="small"
                        color={typeConfig.color as any}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {contact.phones[0] ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {formatPhoneNumber(contact.phones[0].number)}
                          </Typography>
                        </Box>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {contact.emails[0] ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {contact.emails[0].email}
                          </Typography>
                        </Box>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(stats.totalExpenses)}
                      </Typography>
                      {stats.expenseCount > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          {stats.expenseCount} معاملة
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {stats.lastExpenseDate ? (
                        <Typography variant="caption">
                          {toDateSafe(stats.lastExpenseDate).toLocaleDateString('ar-EG')}
                        </Typography>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusConfig[contact.status].label}
                        size="small"
                        color={statusConfig[contact.status].color as any}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMenu(e, contact.id!)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        
        {/* Pagination */}
        {contacts.length > 0 && (
          <TablePagination
            component="div"
            count={filteredContacts.length}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="عدد الصفوف:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
          />
        )}
      </TableContainer>

      {/* Contact menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={() => {
          const contact = contacts.find(c => c.id === menuContactId);
          if (contact) handleEditContact(contact);
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          تعديل
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuContactId) {
            navigate(`/finance/expenses?vendorId=${menuContactId}`);
          }
        }}>
          <MoneyIcon fontSize="small" sx={{ mr: 1 }} />
          عرض المصروفات
        </MenuItem>
        <MenuItem onClick={() => menuContactId && handleArchiveContact(menuContactId)}>
          <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
          أرشفة
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => menuContactId && handleDeleteContact(menuContactId)} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          حذف
        </MenuItem>
      </Menu>

      {/* Create dialog - Default to VENDOR type for expenses */}
      <ContactCreateDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onSuccess={loadData}
        initialType={selectedTab !== 'all' ? selectedTab as ContactType : ContactType.VENDOR}
      />

      {/* Edit dialog */}
      <ContactEditDialog
        open={openEditDialog}
        contact={editingContact}
        onClose={() => {
          setOpenEditDialog(false);
          setEditingContact(null);
        }}
        onSuccess={loadData}
      />
    </Box>
  );
}