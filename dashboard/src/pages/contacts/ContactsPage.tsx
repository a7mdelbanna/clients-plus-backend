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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  MergeType as MergeIcon,
  Archive as ArchiveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { contactService } from '../../services/contact.service';
import type { Contact, ContactFilters, ContactCategory, ContactStatus } from '../../types/contact.types';
import { ContactType } from '../../types/contact.types';
import { formatPhoneNumber } from '../../utils/format';
import ContactCreateDialog from './ContactCreateDialog';
import ContactEditDialog from './ContactEditDialog';
import { downloadCSVTemplate, CONTACTS_TEMPLATE } from '../../utils/csvTemplates';
import { toDateSafe } from '../../utils/dateUtils';

// Contact type configuration
const contactTypeConfig = {
  [ContactType.CLIENT]: { color: 'primary', icon: PersonIcon, label: 'عميل' },
  [ContactType.VENDOR]: { color: 'secondary', icon: BusinessIcon, label: 'مورد' },
  [ContactType.EMPLOYEE]: { color: 'info', icon: PersonIcon, label: 'موظف' },
  [ContactType.SUPPLIER]: { color: 'warning', icon: BusinessIcon, label: 'مزود' },
  [ContactType.PARTNER]: { color: 'success', icon: BusinessIcon, label: 'شريك' },
  [ContactType.CONTRACTOR]: { color: 'error', icon: PersonIcon, label: 'مقاول' },
  [ContactType.OTHER]: { color: 'default', icon: PersonIcon, label: 'أخرى' },
};

// Status configuration
const statusConfig = {
  active: { color: 'success', label: 'نشط' },
  inactive: { color: 'default', label: 'غير نشط' },
  blocked: { color: 'error', label: 'محظور' },
  archived: { color: 'warning', label: 'مؤرشف' },
};

// Create a unique instance ID for debugging
const INSTANCE_ID = Math.random().toString(36).substring(7);

export default function ContactsPage() {
  console.log(`[ContactsPage-${INSTANCE_ID}] Component render`);
  
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [categories, setCategories] = useState<ContactCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
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
  const [openImportDialog, setOpenImportDialog] = useState(false);
  
  // Menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuContactId, setMenuContactId] = useState<string | null>(null);

  // Get company ID once
  useEffect(() => {
    console.log(`[ContactsPage-${INSTANCE_ID}] Getting company ID, user:`, currentUser?.id);
    
    if (!currentUser) {
      console.log(`[ContactsPage-${INSTANCE_ID}] No user, skipping`);
      setLoading(false);
      return;
    }
    
    if (companyId) {
      console.log(`[ContactsPage-${INSTANCE_ID}] Company ID already set:`, companyId);
      return;
    }
    
    const getCompanyId = async () => {
      const id = currentUser.companyId;

      if (id) {
        console.log(`[ContactsPage-${INSTANCE_ID}] Company ID found:`, id);
        setCompanyId(id);
      } else {
        console.error(`[ContactsPage-${INSTANCE_ID}] No company ID found`);
        setError('لم يتم العثور على معرف الشركة');
        setLoading(false);
      }
    };

    getCompanyId();
  }, [currentUser, companyId]);

  // Load initial data function
  const loadInitialData = async (forceCompanyId?: string) => {
    const idToUse = forceCompanyId || companyId;
    if (!idToUse) {
      console.log(`[ContactsPage-${INSTANCE_ID}] No companyId for loading data`);
      return;
    }
    
    console.log(`[ContactsPage-${INSTANCE_ID}] Loading initial data with companyId:`, idToUse);
    setLoading(true);
    setError(null);
    
    try {
      // Load categories
      const categoriesPromise = contactService.getCategories(idToUse)
        .then(fetchedCategories => {
          console.log(`[ContactsPage-${INSTANCE_ID}] Loaded ${fetchedCategories.length} categories`);
          setCategories(fetchedCategories);
          return fetchedCategories;
        })
        .catch(err => {
          console.error(`[ContactsPage-${INSTANCE_ID}] Error loading categories:`, err);
          return [];
        });
      
      // Load contacts - set a larger page size or pass undefined for all
      const contactsPromise = contactService.getContacts(idToUse, {}, 100)
        .then(({ contacts: fetchedContacts }) => {
          // Filter out CLIENT and EMPLOYEE type contacts
          const filteredContacts = fetchedContacts.filter(
            c => c.type !== ContactType.CLIENT && c.type !== ContactType.EMPLOYEE
          );
          console.log(`[ContactsPage-${INSTANCE_ID}] Loaded ${filteredContacts.length} contacts (excluding clients and employees)`);
          setContacts(filteredContacts);
          return filteredContacts;
        })
        .catch(err => {
          console.error(`[ContactsPage-${INSTANCE_ID}] Error loading contacts:`, err);
          throw err;
        });
      
      await Promise.all([categoriesPromise, contactsPromise]);
      setDataLoaded(true);
      console.log(`[ContactsPage-${INSTANCE_ID}] Initial data loaded successfully`);
    } catch (err) {
      console.error(`[ContactsPage-${INSTANCE_ID}] Error loading data:`, err);
      setError('حدث خطأ في تحميل جهات الاتصال');
    } finally {
      setLoading(false);
    }
  };

  // Load data when company ID is available
  useEffect(() => {
    console.log(`[ContactsPage-${INSTANCE_ID}] Load data effect - companyId:`, companyId, 'dataLoaded:', dataLoaded);
    
    if (!companyId) {
      console.log(`[ContactsPage-${INSTANCE_ID}] Skipping load - no companyId`);
      return;
    }
    
    if (dataLoaded) {
      console.log(`[ContactsPage-${INSTANCE_ID}] Data already loaded, skipping`);
      return;
    }
    
    loadInitialData();
  }, [companyId, dataLoaded]);

  // Reload data function for user actions
  const reloadData = async () => {
    if (!companyId) {
      console.log(`[ContactsPage-${INSTANCE_ID}] No companyId, skipping reload`);
      return;
    }
    
    console.log(`[ContactsPage-${INSTANCE_ID}] Reloading data`);
    console.log(`[ContactsPage-${INSTANCE_ID}] CompanyId:`, companyId);
    
    setLoading(true);
    setError(null);
    
    try {
      // Don't filter by type in the query, we'll handle it client-side
      const queryFilters = {
        status: filters.status,
        categoryIds: filters.categoryIds,
        tags: filters.tags,
        branchIds: filters.branchIds,
        search: searchQuery,
      };
      
      console.log(`[ContactsPage-${INSTANCE_ID}] Query filters:`, queryFilters);
      
      const { contacts: fetchedContacts } = await contactService.getContacts(
        companyId,
        queryFilters,
        100  // Increase page size to get more contacts
      );
      
      // Filter out CLIENT and EMPLOYEE type contacts
      const filteredContacts = fetchedContacts.filter(
        c => c.type !== ContactType.CLIENT && c.type !== ContactType.EMPLOYEE
      );
      
      console.log(`[ContactsPage-${INSTANCE_ID}] Reloaded ${filteredContacts.length} contacts (excluding clients and employees)`);
      console.log(`[ContactsPage-${INSTANCE_ID}] First few contacts:`, filteredContacts.slice(0, 3));
      setContacts(filteredContacts);
    } catch (err) {
      console.error(`[ContactsPage-${INSTANCE_ID}] Error reloading data:`, err);
      setError('حدث خطأ في تحميل جهات الاتصال');
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: ContactType | 'all') => {
    if (newValue !== selectedTab) {
      console.log(`[ContactsPage-${INSTANCE_ID}] Tab changed from ${selectedTab} to ${newValue}`);
      setSelectedTab(newValue);
      setPage(0);
      setSelectedContacts([]); // Clear selection when changing tabs
      // No need to reload data, just change the filter
    }
  };

  // Manual refresh function
  const refreshData = async () => {
    console.log(`[ContactsPage-${INSTANCE_ID}] Manual refresh triggered`);
    console.log(`[ContactsPage-${INSTANCE_ID}] Current tab:`, selectedTab);
    console.log(`[ContactsPage-${INSTANCE_ID}] Current filters:`, filters);
    
    // Get company ID directly from user/token if not in state
    let currentCompanyId = companyId;
    if (!currentCompanyId && currentUser) {
      currentCompanyId = currentUser.companyId;
    }
    
    console.log(`[ContactsPage-${INSTANCE_ID}] Using companyId for refresh:`, currentCompanyId);
    
    if (!currentCompanyId) {
      console.error(`[ContactsPage-${INSTANCE_ID}] No companyId available for refresh`);
      return;
    }
    
    // Call reloadData directly with the company ID
    if (currentCompanyId && !companyId) {
      setCompanyId(currentCompanyId);
    }
    
    reloadData();
  };

  // Handle search
  const handleSearch = () => {
    console.log(`[ContactsPage-${INSTANCE_ID}] Search triggered:`, searchQuery);
    reloadData();
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
    
    if (window.confirm('هل أنت متأكد من حذف جهة الاتصال هذه؟')) {
      try {
        await contactService.deleteContact(companyId, contactId);
        refreshData();
      } catch (err) {
        console.error('Error deleting contact:', err);
        setError('حدث خطأ في حذف جهة الاتصال');
      }
    }
    handleCloseMenu();
  };

  const handleArchiveContact = async (contactId: string) => {
    if (!companyId) return;
    
    try {
      await contactService.archiveContact(companyId, contactId);
      refreshData();
    } catch (err) {
      console.error('Error archiving contact:', err);
      setError('حدث خطأ في أرشفة جهة الاتصال');
    }
    handleCloseMenu();
  };

  const handleMergeContacts = () => {
    if (selectedContacts.length < 2) {
      setError('يرجى تحديد جهتي اتصال على الأقل للدمج');
      return;
    }
    // Merge dialog implementation would go here
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

  // Selection handlers
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedContacts(filteredByTab.map(c => c.id!));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  // Filter contacts by selected tab
  const filteredByTab = useMemo(() => {
    if (selectedTab === 'all') {
      return contacts;
    }
    return contacts.filter(contact => contact.type === selectedTab);
  }, [contacts, selectedTab]);

  // Paginated contacts
  const paginatedContacts = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredByTab.slice(start, start + rowsPerPage);
  }, [filteredByTab, page, rowsPerPage]);

  // Get contact type counts
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    contacts.forEach(contact => {
      counts[contact.type] = (counts[contact.type] || 0) + 1;
    });
    return counts;
  }, [contacts]);

  // Export contacts to CSV
  const exportContactsToCSV = () => {
    if (contacts.length === 0) {
      alert('لا توجد جهات اتصال للتصدير');
      return;
    }

    // Prepare CSV headers
    const headers = [
      'الاسم',
      'النوع',
      'الحالة',
      'الهاتف',
      'البريد الإلكتروني',
      'الشركة',
      'الرقم الضريبي',
      'العلامات',
      'الملاحظات'
    ];

    // Convert contacts to CSV rows
    const rows = contacts.map(contact => [
      contact.displayName || '',
      contactTypeConfig[contact.type]?.label || contact.type,
      statusConfig[contact.status]?.label || contact.status,
      contact.phones?.[0]?.number || '',
      contact.emails?.[0]?.email || '',
      contact.companyName || '',
      contact.taxNumber || '',
      contact.tags?.join(', ') || '',
      contact.notes || ''
    ]);

    // Create CSV content with BOM for Arabic support
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  console.log(`[ContactsPage-${INSTANCE_ID}] Render complete - loading:`, loading, 'contacts:', contacts.length);

  return (
    <Box sx={{ pt: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          جهات الاتصال
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setOpenImportDialog(true)}
          >
            استيراد
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {
              // Export contacts to CSV
              exportContactsToCSV();
            }}
          >
            تصدير
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleCreateContact}
          >
            جهة اتصال جديدة
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
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
          {Object.entries(ContactType)
            .filter(([key, value]) => value !== ContactType.CLIENT && value !== ContactType.EMPLOYEE) // Exclude CLIENT and EMPLOYEE types
            .map(([key, value]) => {
              const config = contactTypeConfig[value];
              const count = typeCounts[value] || 0;
              return (
                <Tab
                  key={value}
                  label={`${config.label} (${count})`}
                  value={value}
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
            placeholder="البحث في جهات الاتصال..."
            variant="outlined"
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
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
          {selectedContacts.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<MergeIcon />}
              onClick={handleMergeContacts}
            >
              دمج ({selectedContacts.length})
            </Button>
          )}
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
                    onChange={(e) => {
                      setFilters({ ...filters, status: e.target.value as ContactStatus[] });
                    }}
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
                    onChange={(e) => {
                      setFilters({ ...filters, categoryIds: e.target.value as string[] });
                    }}
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
                    setSearchQuery('');
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

      {/* Contacts table */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredByTab.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              لا توجد جهات اتصال
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              ابدأ بإضافة جهات اتصال جديدة
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateContact}
            >
              إضافة جهة اتصال
            </Button>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedContacts.length > 0 && selectedContacts.length < filteredByTab.length}
                    checked={filteredByTab.length > 0 && selectedContacts.length === filteredByTab.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>الاسم</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الهاتف</TableCell>
                <TableCell>البريد الإلكتروني</TableCell>
                <TableCell>الفئة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>آخر تفاعل</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedContacts.map((contact) => {
                const typeConfig = contactTypeConfig[contact.type];
                const TypeIcon = typeConfig.icon;
                const category = categories.find(c => c.id === contact.categoryId);
                
                return (
                  <TableRow
                    key={contact.id}
                    hover
                    selected={selectedContacts.includes(contact.id!)}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedContacts.includes(contact.id!)}
                        onChange={() => handleSelectContact(contact.id!)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 32, height: 32 }}>
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
                      {contact.phones && contact.phones[0] ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {formatPhoneNumber(contact.phones[0].number)}
                          </Typography>
                        </Box>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {contact.emails && contact.emails[0] ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {contact.emails[0].email}
                          </Typography>
                        </Box>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {category && (
                        <Chip
                          label={category.name}
                          size="small"
                          sx={{ bgcolor: category.color, color: 'white' }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusConfig[contact.status].label}
                        size="small"
                        color={statusConfig[contact.status].color as any}
                      />
                    </TableCell>
                    <TableCell>
                      {contact.lastInteractionDate && (
                        <Typography variant="caption">
                          {toDateSafe(contact.lastInteractionDate).toLocaleDateString('ar-EG')}
                        </Typography>
                      )}
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
            count={filteredByTab.length}
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

      {/* Create dialog */}
      <ContactCreateDialog
        open={openCreateDialog}
        onClose={() => setOpenCreateDialog(false)}
        onSuccess={() => {
          console.log('[ContactsPage] Contact created, refreshing list...');
          console.log('[ContactsPage] Current companyId:', companyId);
          
          // Simply reload the data
          const idToUse = companyId || currentUser?.companyId;
          if (idToUse) {
            console.log('[ContactsPage] Reloading with companyId:', idToUse);
            loadInitialData(idToUse);
          } else {
            console.error('[ContactsPage] No companyId available for reload');
          }
        }}
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
        onSuccess={refreshData}
      />

      {/* Import Dialog */}
      <Dialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">استيراد جهات الاتصال</Typography>
            <IconButton size="small" onClick={() => setOpenImportDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <UploadIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              اسحب ملف CSV هنا أو انقر للاستعراض
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              يجب أن يحتوي الملف على الأعمدة: الاسم، النوع، الهاتف، البريد الإلكتروني
            </Typography>
            
            {/* Template Download Button */}
            <Box sx={{ mb: 3 }}>
              <Button
                variant="text"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={() => downloadCSVTemplate(CONTACTS_TEMPLATE)}
                sx={{ textDecoration: 'underline' }}
              >
                تحميل نموذج CSV
              </Button>
              <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                قم بتحميل نموذج الملف واملأه ببياناتك
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }}>أو</Divider>
            
            <Button
              variant="contained"
              component="label"
              startIcon={<UploadIcon />}
              size="large"
            >
              اختر ملف CSV
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // TODO: Implement CSV parsing and import
                    alert(`تم اختيار الملف: ${file.name}\nهذه الميزة قيد التطوير`);
                    setOpenImportDialog(false);
                  }
                }}
              />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImportDialog(false)}>إلغاء</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}