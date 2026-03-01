import React from 'react';
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  useTheme,
  Divider,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface AppointmentPanelProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: number | string;
}

const AppointmentPanel: React.FC<AppointmentPanelProps> = ({
  open,
  onClose,
  children,
  title,
  width = 600,
}) => {
  const theme = useTheme();
  const isRTL = theme.direction === 'rtl';

  return (
    <Drawer
      anchor={isRTL ? 'left' : 'right'}
      open={open}
      onClose={onClose}
      disableEnforceFocus
      PaperProps={{
        sx: {
          width,
          maxWidth: '90vw',
          boxShadow: '-4px 0 15px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        },
      }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: isRTL ? -100 : 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isRTL ? -100 : 100, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper,
              }}
            >
              <Typography variant="h6" component="h2">
                {title}
              </Typography>
              <IconButton
                onClick={onClose}
                size="small"
                sx={{
                  color: theme.palette.text.secondary,
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <Close />
              </IconButton>
            </Box>

            {/* Content */}
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                backgroundColor: theme.palette.background.default,
              }}
            >
              {children}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Drawer>
  );
};

export default AppointmentPanel;