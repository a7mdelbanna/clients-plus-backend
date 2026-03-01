import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, useTheme } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { bookingLinkService } from '../services/bookingLink.service';
import BookingLinksList from '../components/booking/BookingLinksList';
import BookingLinkForm from '../components/booking/BookingLinkForm';
import type { BookingLink } from '../services/bookingLink.service';

const BookingLinks: React.FC = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [selectedLink, setSelectedLink] = useState<BookingLink | null>(null);
  const isRTL = theme.direction === 'rtl';

  useEffect(() => {
    loadBookingLinks();
  }, [currentUser]);

  const loadBookingLinks = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const companyId = currentUser?.companyId;
      
      if (companyId) {
        const links = await bookingLinkService.getCompanyBookingLinks(companyId);
        setBookingLinks(links);
      }
    } catch (error) {
      console.error('Error loading booking links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLink = () => {
    setSelectedLink(null);
    setOpenForm(true);
  };

  const handleEditLink = (link: BookingLink) => {
    setSelectedLink(link);
    setOpenForm(true);
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await bookingLinkService.deleteBookingLink(linkId);
      await loadBookingLinks();
    } catch (error) {
      console.error('Error deleting booking link:', error);
    }
  };

  const handleFormClose = () => {
    setOpenForm(false);
    setSelectedLink(null);
  };

  const handleFormSuccess = async () => {
    await loadBookingLinks();
    handleFormClose();
  };

  return (
    <Box>
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h4" component="h1">
          {isRTL ? 'روابط الحجز' : 'Booking Links'}
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddLink}
          sx={{ 
            backgroundColor: theme => theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme => theme.palette.primary.dark,
            }
          }}
        >
          {isRTL ? 'رابط جديد' : 'New Link'}
        </Button>
      </Box>

      <BookingLinksList
        links={bookingLinks}
        loading={loading}
        onEdit={handleEditLink}
        onDelete={handleDeleteLink}
      />

      <BookingLinkForm
        open={openForm}
        link={selectedLink}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </Box>
  );
};

export default BookingLinks;