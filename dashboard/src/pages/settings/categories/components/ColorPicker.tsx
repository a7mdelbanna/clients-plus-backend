import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Close,
  Check,
} from '@mui/icons-material';
import { CATEGORY_COLORS } from '../../../../services/category.service';

interface ColorPickerProps {
  open: boolean;
  onClose: () => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({
  open,
  onClose,
  selectedColor,
  onSelectColor,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">اختر لونًا</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: 1.5,
          p: 2,
        }}>
          {CATEGORY_COLORS.map((color) => (
            <Box
              key={color}
              onClick={() => onSelectColor(color)}
              sx={{
                width: '100%',
                aspectRatio: '1/1',
                backgroundColor: color,
                borderRadius: 2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: selectedColor === color ? '3px solid' : '1px solid',
                borderColor: selectedColor === color ? 'primary.main' : 'divider',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: 2,
                },
              }}
            >
              {selectedColor === color && (
                <Check sx={{ color: 'white', fontSize: 20 }} />
              )}
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            اللون المحدد: {selectedColor}
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ColorPicker;