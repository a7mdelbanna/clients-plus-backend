import React, { useState } from 'react';
import { Box, Button, TextField, Alert, Paper, Typography } from '@mui/material';
import apiClient from '../../config/api';
import type { ApiResponse } from '../../config/api';

// TEMPORARY COMPONENT - REMOVE IN PRODUCTION
const CreateSuperadminTemp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email || !password || !displayName) {
      setMessage({ type: 'error', text: 'All fields are required' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await apiClient.post<ApiResponse<{ id: string }>>('/superadmin/create', {
        email,
        password,
        displayName,
      });

      const userId = response.data.data?.id || 'unknown';

      setMessage({
        type: 'success',
        text: `Superadmin created successfully! UID: ${userId}. You can now login at /sa-${import.meta.env.VITE_SUPERADMIN_URL_HASH}/login`
      });

      // Clear form
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (error: any) {
      console.error('Error creating superadmin:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to create superadmin' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4, p: 2 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Create Superadmin (DEVELOPMENT ONLY)
        </Typography>
        <Alert severity="warning" sx={{ mb: 3 }}>
          This is a temporary tool. Remove this component before deploying to production!
        </Alert>

        <TextField
          fullWidth
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
        />

        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          helperText="Minimum 6 characters"
        />

        <TextField
          fullWidth
          label="Display Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          margin="normal"
        />

        {message && (
          <Alert severity={message.type} sx={{ mt: 2 }}>
            {message.text}
          </Alert>
        )}

        <Button
          variant="contained"
          color="primary"
          onClick={handleCreate}
          disabled={loading}
          fullWidth
          sx={{ mt: 3 }}
        >
          {loading ? 'Creating...' : 'Create Superadmin'}
        </Button>

        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
          After creating, access the superadmin dashboard at:
          <br />
          <code>/sa-{import.meta.env.VITE_SUPERADMIN_URL_HASH}/login</code>
        </Typography>
      </Paper>
    </Box>
  );
};

export default CreateSuperadminTemp;