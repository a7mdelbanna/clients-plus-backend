import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Tooltip,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Menu,
  MenuItem,
  Button,
} from '@mui/material';
import {
  Edit,
  Delete,
  Link as LinkIcon,
  MoreVert,
  Search,
  ContentCopy,
  QrCode,
  Analytics,
  OpenInNew,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { BookingLink } from '../../services/bookingLink.service';
import { useBranch } from '../../contexts/BranchContext';
import BranchUrlsDialog from './BranchUrlsDialog';

interface BookingLinksListProps {
  links: BookingLink[];
  loading: boolean;
  onEdit: (link: BookingLink) => void;
  onDelete: (linkId: string) => void;
}

const BookingLinksList: React.FC<BookingLinksListProps> = ({
  links,
  loading,
  onEdit,
  onDelete,
}) => {
  const theme = useTheme();
  const { branches } = useBranch();
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLink, setSelectedLink] = useState<BookingLink | null>(null);
  const [branchUrlsOpen, setBranchUrlsOpen] = useState(false);
  const isRTL = theme.direction === 'rtl';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, link: BookingLink) => {
    setAnchorEl(event.currentTarget);
    setSelectedLink(link);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLink(null);
  };

  const handleCopyLink = (link: BookingLink) => {
    if (link.fullUrl) {
      navigator.clipboard.writeText(link.fullUrl);
      // TODO: Show success snackbar
    }
    handleMenuClose();
  };

  const handleShowQR = (link: BookingLink) => {
    // TODO: Implement QR code modal
    console.log('Show QR for:', link.fullUrl);
    handleMenuClose();
  };

  const handleViewAnalytics = (link: BookingLink) => {
    // TODO: Navigate to analytics page
    console.log('View analytics for:', link.id);
    handleMenuClose();
  };

  // Check for duplicate IDs in development
  if (process.env.NODE_ENV === 'development') {
    const ids = links.map(link => link.id).filter(Boolean);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      console.warn('Duplicate booking link IDs detected:', 
        ids.filter((id, index) => ids.indexOf(id) !== index)
      );
    }
  }

  const filteredLinks = links.filter(link => 
    link.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (link.description && link.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getTypeChip = (type: BookingLink['type']) => {
    const typeConfig = {
      company: { label: isRTL ? 'الشركة' : 'Company', color: 'primary' },
      general: { label: isRTL ? 'عام' : 'General', color: 'default' },
      employee: { label: isRTL ? 'موظف' : 'Employee', color: 'secondary' },
    };

    const config = typeConfig[type] || typeConfig.general;

    return (
      <Chip
        label={config.label}
        size="small"
        color={config.color as any}
        variant="outlined"
      />
    );
  };

  const getBranchDisplay = (link: BookingLink) => {
    if (!link.branchSettings) {
      // Legacy support - single branch
      const branch = branches.find(b => b.id === link.branchId);
      return branch?.name || '-';
    }

    if (link.branchSettings.mode === 'single') {
      const branch = branches.find(b => b.id === link.branchSettings?.defaultBranch);
      return (
        <Chip
          label={branch?.name || '-'}
          size="small"
          variant="outlined"
        />
      );
    } else {
      return (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            label={`${link.branchSettings.allowedBranches.length} ${isRTL ? 'فروع' : 'branches'}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <IconButton 
            size="small" 
            onClick={() => {
              setSelectedLink(link);
              setBranchUrlsOpen(true);
            }}
          >
            <OpenInNew fontSize="small" />
          </IconButton>
        </Box>
      );
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder={isRTL ? 'البحث عن الروابط...' : 'Search booking links...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            backgroundColor: theme.palette.background.paper,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: theme.palette.divider,
              },
            },
          }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{isRTL ? 'الاسم' : 'Name'}</TableCell>
              <TableCell>{isRTL ? 'النوع' : 'Type'}</TableCell>
              <TableCell>{isRTL ? 'الفروع' : 'Branches'}</TableCell>
              <TableCell>{isRTL ? 'الحالة' : 'Status'}</TableCell>
              <TableCell align="center">{isRTL ? 'المشاهدات' : 'Views'}</TableCell>
              <TableCell align="center">{isRTL ? 'الحجوزات' : 'Bookings'}</TableCell>
              <TableCell>{isRTL ? 'الرابط' : 'Link'}</TableCell>
              <TableCell align="right">{isRTL ? 'الإجراءات' : 'Actions'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLinks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="textSecondary" sx={{ py: 3 }}>
                    {searchTerm
                      ? isRTL
                        ? 'لا توجد روابط مطابقة للبحث'
                        : 'No booking links match your search'
                      : isRTL
                      ? 'لا توجد روابط حجز بعد'
                      : 'No booking links yet'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredLinks.map((link, index) => (
                <TableRow key={link.id || `link-${index}`} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {link.name}
                      </Typography>
                      {link.description && (
                        <Typography variant="caption" color="textSecondary">
                          {link.description}
                        </Typography>
                      )}
                      {link.isMain && (
                        <Chip
                          label={isRTL ? 'رئيسي' : 'Main'}
                          size="small"
                          color="info"
                          sx={{ ml: 1, height: 20 }}
                        />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{getTypeChip(link.type)}</TableCell>
                  <TableCell>{getBranchDisplay(link)}</TableCell>
                  <TableCell>
                    <Chip
                      label={link.isActive ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'غير نشط' : 'Inactive')}
                      size="small"
                      color={link.isActive ? 'success' : 'default'}
                      variant={link.isActive ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {link.analytics?.views || 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {link.analytics?.bookings || 0}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: theme.palette.primary.main,
                          cursor: 'pointer',
                        }}
                        onClick={() => handleCopyLink(link)}
                      >
                        {link.slug}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleCopyLink(link)}
                        sx={{ p: 0.5 }}
                      >
                        <ContentCopy fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Tooltip title={isRTL ? 'تعديل' : 'Edit'}>
                        <IconButton size="small" onClick={() => onEdit(link)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={isRTL ? 'المزيد' : 'More'}>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, link)}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedLink && handleShowQR(selectedLink)}>
          <QrCode fontSize="small" sx={{ mr: 1 }} />
          {isRTL ? 'عرض رمز QR' : 'Show QR Code'}
        </MenuItem>
        <MenuItem onClick={() => selectedLink && handleViewAnalytics(selectedLink)}>
          <Analytics fontSize="small" sx={{ mr: 1 }} />
          {isRTL ? 'عرض التحليلات' : 'View Analytics'}
        </MenuItem>
        <MenuItem onClick={() => selectedLink && window.open(selectedLink.fullUrl, '_blank')}>
          <LinkIcon fontSize="small" sx={{ mr: 1 }} />
          {isRTL ? 'فتح الرابط' : 'Open Link'}
        </MenuItem>
        <MenuItem onClick={() => selectedLink && onDelete(selectedLink.id!)}>
          <Delete fontSize="small" sx={{ mr: 1, color: theme.palette.error.main }} />
          <Typography color="error">{isRTL ? 'حذف' : 'Delete'}</Typography>
        </MenuItem>
      </Menu>

      <BranchUrlsDialog
        open={branchUrlsOpen}
        link={selectedLink}
        onClose={() => setBranchUrlsOpen(false)}
      />
    </Box>
  );
};

export default BookingLinksList;