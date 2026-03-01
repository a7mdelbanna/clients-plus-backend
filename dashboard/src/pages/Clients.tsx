import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  useTheme,
  Button,
  Alert,
} from '@mui/material';
import { motion } from 'framer-motion';
import ClientsList from '../components/clients/ClientsList';
import ClientForm from '../components/clients/ClientForm';
import type { Client } from '../services/client.service';
import { manualFixUserDocument } from '../utils/manualUserFix';
import { useAuth } from '../contexts/AuthContext';

const Clients: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const isRTL = theme.direction === 'rtl';

  const [formOpen, setFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [refreshList, setRefreshList] = useState(0);
  const [showFixButton, setShowFixButton] = useState(false);
  const [fixMessage, setFixMessage] = useState('');

  // Check if we need to show the fix button
  useEffect(() => {
    if (currentUser && !currentUser.companyId) {
      setShowFixButton(true);
    }
  }, [currentUser]);
  
  const handleFixUser = async () => {
    setFixMessage('Fixing user document...');
    const success = await manualFixUserDocument();
    if (success) {
      setFixMessage('User document fixed! Please refresh the page.');
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } else {
      setFixMessage('Failed to fix user document. Please try logging out and back in.');
    }
  };

  const handleAddClick = () => {
    setSelectedClient(null);
    setFormMode('add');
    setFormOpen(true);
  };

  const handleEditClick = (client: Client) => {
    setSelectedClient(client);
    setFormMode('edit');
    setFormOpen(true);
  };


  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedClient(null);
  };

  const handleFormSuccess = () => {
    setRefreshList(prev => prev + 1);
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

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {isRTL ? 'العملاء' : 'Clients'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {isRTL ? 'إدارة عملاء الشركة' : 'Manage your company clients'}
        </Typography>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {showFixButton && (
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleFixUser}>
                {isRTL ? 'إصلاح الصلاحيات' : 'Fix Permissions'}
              </Button>
            }
          >
            {fixMessage || (isRTL ? 'يبدو أن هناك مشكلة في الصلاحيات. انقر على "إصلاح الصلاحيات" لحل المشكلة.' : 'It seems there is a permission issue. Click "Fix Permissions" to resolve it.')}
          </Alert>
        )}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <ClientsList
              key={refreshList}
              onAddClick={handleAddClick}
              onEditClick={handleEditClick}
            />
          </motion.div>
        </motion.div>
      </Box>

      {/* Client Form Dialog */}
      <ClientForm
        open={formOpen}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        client={selectedClient}
        mode={formMode}
      />
    </Box>
  );
};

export default Clients;