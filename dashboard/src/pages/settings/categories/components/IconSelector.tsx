import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  IconButton,
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Close,
  Search,
} from '@mui/icons-material';
import * as Icons from '@mui/icons-material';
import { CATEGORY_ICONS } from '../../../../services/category.service';

interface IconSelectorProps {
  open: boolean;
  onClose: () => void;
  selectedIcon: string;
  onSelectIcon: (icon: string) => void;
  categoryType: 'client' | 'appointment' | 'event';
}

const IconSelector: React.FC<IconSelectorProps> = ({
  open,
  onClose,
  selectedIcon,
  onSelectIcon,
  categoryType,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Get icons for the specific category type
  const availableIcons = CATEGORY_ICONS[categoryType];

  // Filter icons based on search term
  const filteredIcons = searchTerm
    ? availableIcons.filter(icon => 
        icon.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : availableIcons;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">اختر أيقونة</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="البحث عن أيقونة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(6, 1fr)', 
          gap: 1,
          maxHeight: 400,
          overflowY: 'auto',
          p: 1,
        }}>
          {filteredIcons.map((iconName) => {
            const IconComponent = (Icons as Record<string, React.ComponentType>)[iconName];
            if (!IconComponent) return null;

            return (
              <Box
                key={iconName}
                onClick={() => onSelectIcon(iconName)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  borderRadius: 1,
                  cursor: 'pointer',
                  backgroundColor: selectedIcon === iconName ? 'primary.main' : 'transparent',
                  color: selectedIcon === iconName ? 'white' : 'text.primary',
                  border: 1,
                  borderColor: selectedIcon === iconName ? 'primary.main' : 'divider',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: selectedIcon === iconName ? 'primary.dark' : 'action.hover',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <IconComponent fontSize="medium" />
                <Typography 
                  variant="caption" 
                  sx={{ 
                    mt: 0.5,
                    fontSize: '0.65rem',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                  }}
                >
                  {iconName}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {filteredIcons.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              لا توجد أيقونات مطابقة للبحث
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IconSelector;