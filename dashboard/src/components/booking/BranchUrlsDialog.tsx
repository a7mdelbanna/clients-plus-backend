import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
} from '@mui/material';
import { Close, ContentCopy, QrCode } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useBranch } from '../../contexts/BranchContext';
import type { BookingLink } from '../../services/bookingLink.service';

interface BranchUrlsDialogProps {
  open: boolean;
  link: BookingLink | null;
  onClose: () => void;
}

const BranchUrlsDialog: React.FC<BranchUrlsDialogProps> = ({
  open,
  link,
  onClose,
}) => {
  const theme = useTheme();
  const { branches } = useBranch();
  const isRTL = theme.direction === 'rtl';

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    // TODO: Show success snackbar
  };

  if (!link) return null;

  const baseUrl = link.fullUrl?.split('?')[0] || '';
  const allowedBranches = link.branchSettings?.allowedBranches || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            {isRTL ? 'روابط الفروع' : 'Branch URLs'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {isRTL 
              ? 'يمكنك استخدام هذه الروابط للذهاب مباشرة إلى فرع معين'
              : 'You can use these URLs to go directly to a specific branch'}
          </Typography>
        </Alert>

        <Typography variant="subtitle2" gutterBottom>
          {isRTL ? 'الرابط الرئيسي (يظهر محدد الفروع):' : 'Main URL (shows branch selector):'}
        </Typography>
        <Box sx={{ 
          p: 2, 
          bgcolor: 'grey.100', 
          borderRadius: 1, 
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
            {baseUrl}
          </Typography>
          <IconButton onClick={() => handleCopyUrl(baseUrl)} size="small">
            <ContentCopy />
          </IconButton>
        </Box>

        <Typography variant="subtitle2" gutterBottom>
          {isRTL ? 'روابط الفروع المباشرة:' : 'Direct Branch URLs:'}
        </Typography>
        <List>
          {allowedBranches.map((branchId, index) => {
            const branch = branches.find(b => b.id === branchId);
            const branchUrl = `${baseUrl}?branch=${branchId}`;
            
            return (
              <React.Fragment key={branchId}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={branch?.name || branchId}
                    secondary={
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          wordBreak: 'break-all',
                          display: 'block',
                          mt: 0.5
                        }}
                      >
                        {branchUrl}
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton 
                      edge="end" 
                      onClick={() => handleCopyUrl(branchUrl)}
                      size="small"
                    >
                      <ContentCopy />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="caption" color="textSecondary">
            {isRTL 
              ? 'نصيحة: يمكنك أيضًا استخدام معرف الفرع بدلاً من الاسم في رابط URL'
              : 'Tip: You can also use the branch ID instead of the name in the URL'}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {isRTL ? 'إغلاق' : 'Close'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BranchUrlsDialog;