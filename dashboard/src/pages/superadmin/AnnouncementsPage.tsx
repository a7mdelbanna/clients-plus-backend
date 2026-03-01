import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Campaign as CampaignIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { superadminService } from '../../services/superadmin.service';
import { toDateSafe } from '../../utils/dateUtils';

interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  targetAudience: 'all' | 'active' | 'plan' | 'custom';
  filters?: {
    plans?: string[];
    businessIds?: string[];
  };
  active: boolean;
  createdAt: any;
  createdBy: string;
  scheduledFor?: any;
  sentAt?: any;
  recipientCount?: number;
}

const AnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Partial<SystemAnnouncement> | null>(null);

  // Load announcements
  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock data for now - replace with actual service call
      const mockAnnouncements: SystemAnnouncement[] = [
        {
          id: '1',
          title: 'Platform Maintenance Scheduled',
          message: 'We will be performing scheduled maintenance on July 25th from 2:00 AM to 4:00 AM. During this time, the platform may be temporarily unavailable.',
          targetAudience: 'all',
          active: true,
          createdAt: new Date(),
          createdBy: 'superadmin',
          sentAt: new Date(),
          recipientCount: 156,
        },
        {
          id: '2',
          title: 'New Features Available',
          message: 'Check out our latest features including enhanced reporting and automated appointment reminders.',
          targetAudience: 'active',
          active: true,
          createdAt: new Date(),
          createdBy: 'superadmin',
        },
      ];
      
      setAnnouncements(mockAnnouncements);
    } catch (err) {
      console.error('Error loading announcements:', err);
      setError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreateAnnouncement = () => {
    setEditingAnnouncement({
      title: '',
      message: '',
      targetAudience: 'all',
      active: true,
    });
    setCreateDialog(true);
  };

  const handleEditAnnouncement = (announcement: SystemAnnouncement) => {
    setEditingAnnouncement({ ...announcement });
    setCreateDialog(true);
  };

  const handleSaveAnnouncement = async () => {
    if (!editingAnnouncement) return;

    try {
      if (editingAnnouncement.id) {
        // Update existing announcement
        console.log('Updating announcement:', editingAnnouncement);
      } else {
        // Create new announcement
        await superadminService.sendAnnouncement(
          editingAnnouncement.title || '',
          editingAnnouncement.message || '',
          editingAnnouncement.targetAudience || 'all',
          editingAnnouncement.filters
        );
      }
      
      await loadAnnouncements();
      setCreateDialog(false);
      setEditingAnnouncement(null);
    } catch (error) {
      console.error('Error saving announcement:', error);
      setError('Failed to save announcement');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = toDateSafe(timestamp);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getAudienceLabel = (audience: string) => {
    switch (audience) {
      case 'all': return 'All Businesses';
      case 'active': return 'Active Businesses';
      case 'plan': return 'Specific Plans';
      case 'custom': return 'Custom Selection';
      default: return audience;
    }
  };

  const getAudienceColor = (audience: string): 'primary' | 'success' | 'warning' | 'info' => {
    switch (audience) {
      case 'all': return 'primary';
      case 'active': return 'success';
      case 'plan': return 'warning';
      case 'custom': return 'info';
      default: return 'primary';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            System Announcements
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Send important updates and notifications to businesses
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateAnnouncement}
        >
          Create Announcement
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Announcements Table */}
      <Card>
        <CardContent>
          {announcements.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CampaignIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No announcements yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Create your first system announcement to communicate with businesses
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateAnnouncement}
                sx={{ mt: 2 }}
              >
                Create Announcement
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Target Audience</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Recipients</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Sent</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {announcements.map((announcement) => (
                    <TableRow key={announcement.id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {announcement.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {announcement.message.substring(0, 100)}
                            {announcement.message.length > 100 && '...'}
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Chip
                          label={getAudienceLabel(announcement.targetAudience)}
                          size="small"
                          color={getAudienceColor(announcement.targetAudience)}
                          variant="outlined"
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={announcement.active ? 'Active' : 'Inactive'}
                          size="small"
                          color={announcement.active ? 'success' : 'default'}
                        />
                      </TableCell>

                      <TableCell>
                        {announcement.recipientCount ? (
                          <Typography variant="body2">
                            {announcement.recipientCount} businesses
                          </Typography>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Not sent
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(announcement.createdAt)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {announcement.sentAt ? (
                          <Typography variant="body2">
                            {formatDate(announcement.sentAt)}
                          </Typography>
                        ) : announcement.scheduledFor ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ScheduleIcon sx={{ fontSize: 16, mr: 0.5, color: 'warning.main' }} />
                            <Typography variant="caption">
                              {formatDate(announcement.scheduledFor)}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Draft
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleEditAnnouncement(announcement)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                        {!announcement.sentAt && (
                          <IconButton
                            size="small"
                            onClick={() => handleEditAnnouncement(announcement)}
                          >
                            <EditIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Announcement Dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAnnouncement?.id ? 'Edit Announcement' : 'Create System Announcement'}
        </DialogTitle>
        <DialogContent>
          {editingAnnouncement && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Announcement Title"
                  value={editingAnnouncement.title || ''}
                  onChange={(e) => setEditingAnnouncement({
                    ...editingAnnouncement,
                    title: e.target.value
                  })}
                  placeholder="Enter a clear, descriptive title"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Message"
                  multiline
                  rows={4}
                  value={editingAnnouncement.message || ''}
                  onChange={(e) => setEditingAnnouncement({
                    ...editingAnnouncement,
                    message: e.target.value
                  })}
                  placeholder="Write your announcement message here..."
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Target Audience</InputLabel>
                  <Select
                    value={editingAnnouncement.targetAudience || 'all'}
                    label="Target Audience"
                    onChange={(e) => setEditingAnnouncement({
                      ...editingAnnouncement,
                      targetAudience: e.target.value as 'all' | 'active' | 'plan' | 'custom'
                    })}
                  >
                    <MenuItem value="all">All Businesses</MenuItem>
                    <MenuItem value="active">Active Businesses Only</MenuItem>
                    <MenuItem value="plan">Specific Plans</MenuItem>
                    <MenuItem value="custom">Custom Selection</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {editingAnnouncement.targetAudience === 'plan' && (
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Select Plans</InputLabel>
                    <Select
                      multiple
                      value={editingAnnouncement.filters?.plans || []}
                      label="Select Plans"
                      onChange={(e) => setEditingAnnouncement({
                        ...editingAnnouncement,
                        filters: {
                          ...editingAnnouncement.filters,
                          plans: e.target.value as string[]
                        }
                      })}
                    >
                      <MenuItem value="trial">Trial</MenuItem>
                      <MenuItem value="starter">Starter</MenuItem>
                      <MenuItem value="professional">Professional</MenuItem>
                      <MenuItem value="business">Business</MenuItem>
                      <MenuItem value="enterprise">Enterprise</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingAnnouncement.active !== false}
                      onChange={(e) => setEditingAnnouncement({
                        ...editingAnnouncement,
                        active: e.target.checked
                      })}
                    />
                  }
                  label="Send immediately"
                />
                <Typography variant="caption" color="text.secondary" display="block">
                  When enabled, the announcement will be sent immediately to all matching businesses
                </Typography>
              </Grid>

              {!editingAnnouncement.id && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    This announcement will be sent to businesses via their dashboard notifications and email (if configured).
                  </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveAnnouncement}
            variant="contained"
            startIcon={editingAnnouncement?.active ? <SendIcon /> : <AddIcon />}
            disabled={!editingAnnouncement?.title || !editingAnnouncement?.message}
          >
            {editingAnnouncement?.active ? 'Send Announcement' : 'Save Draft'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnnouncementsPage;