import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
} from '@mui/material';
import {
  Edit,
  EditCalendar,
  Delete,
  DeleteSweep,
  Close,
} from '@mui/icons-material';

interface RecurringActionsDialogProps {
  open: boolean;
  onClose: () => void;
  action: 'edit' | 'delete';
  onAction: (scope: 'this' | 'all' | 'future') => void;
}

const RecurringActionsDialog: React.FC<RecurringActionsDialogProps> = ({
  open,
  onClose,
  action,
  onAction,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  const getTitle = () => {
    if (action === 'edit') {
      return isRTL ? 'تعديل الموعد المتكرر' : 'Edit Recurring Appointment';
    }
    return isRTL ? 'حذف الموعد المتكرر' : 'Delete Recurring Appointment';
  };

  const getDescription = () => {
    if (action === 'edit') {
      return isRTL 
        ? 'هذا موعد متكرر. كيف تريد تطبيق التغييرات؟'
        : 'This is a recurring appointment. How would you like to apply the changes?';
    }
    return isRTL
      ? 'هذا موعد متكرر. ما المواعيد التي تريد حذفها؟'
      : 'This is a recurring appointment. Which appointments would you like to delete?';
  };

  const options = [
    {
      id: 'this',
      icon: action === 'edit' ? <Edit /> : <Delete />,
      title: isRTL ? 'هذا الموعد فقط' : 'Only this appointment',
      description: isRTL 
        ? 'التغييرات ستؤثر على هذا الموعد فقط'
        : 'Changes will affect only this appointment',
    },
    {
      id: 'future',
      icon: action === 'edit' ? <EditCalendar /> : <DeleteSweep />,
      title: isRTL ? 'هذا الموعد والمواعيد المستقبلية' : 'This and future appointments',
      description: isRTL
        ? 'التغييرات ستؤثر على هذا الموعد وجميع المواعيد المستقبلية'
        : 'Changes will affect this appointment and all future occurrences',
    },
    {
      id: 'all',
      icon: action === 'edit' ? <EditCalendar /> : <DeleteSweep />,
      title: isRTL ? 'جميع المواعيد' : 'All appointments',
      description: isRTL
        ? 'التغييرات ستؤثر على جميع المواعيد في السلسلة'
        : 'Changes will affect all appointments in the series',
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {getTitle()}
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {getDescription()}
        </Typography>
        
        <List sx={{ mt: 2 }}>
          {options.map((option) => (
            <ListItem key={option.id} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => onAction(option.id as 'this' | 'all' | 'future')}
                sx={{
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <ListItemIcon>
                  {option.icon}
                </ListItemIcon>
                <ListItemText
                  primary={option.title}
                  secondary={option.description}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </DialogContent>
      
      <DialogActions>
        <Button
          onClick={onClose}
          startIcon={<Close />}
        >
          {isRTL ? 'إلغاء' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecurringActionsDialog;