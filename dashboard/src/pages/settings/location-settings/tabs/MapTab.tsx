import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Save,
  Map as MapIcon,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import LocationMap from '../../../../components/maps/LocationMap';

interface MapTabProps {
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  onSave: (data: { coordinates: { lat: number; lng: number }; address?: string }) => Promise<void>;
  saving: boolean;
}

const MapTab: React.FC<MapTabProps> = ({
  address,
  coordinates,
  onSave,
  saving,
}) => {
  // Validate coordinates before using them
  const validCoordinates = coordinates && 
    typeof coordinates.lat === 'number' && 
    typeof coordinates.lng === 'number' 
      ? coordinates 
      : undefined;
  
  const [currentCoordinates, setCurrentCoordinates] = useState(validCoordinates);
  const [currentAddress, setCurrentAddress] = useState(address);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number') {
      setCurrentCoordinates(coordinates);
    }
  }, [coordinates]);

  useEffect(() => {
    if (address) {
      setCurrentAddress(address);
    }
  }, [address]);

  const handleLocationChange = (data: {
    coordinates: { lat: number; lng: number };
    address?: string;
  }) => {
    setCurrentCoordinates(data.coordinates);
    if (data.address) {
      setCurrentAddress(data.address);
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!currentCoordinates || !currentCoordinates.lat || !currentCoordinates.lng) {
      toast.error('يرجى تحديد موقع صحيح على الخريطة');
      return;
    }

    await onSave({
      coordinates: {
        lat: currentCoordinates.lat,
        lng: currentCoordinates.lng
      },
      address: currentAddress,
    });
    
    setHasChanges(false);
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MapIcon color="primary" />
          الموقع على الخريطة
        </Typography>

        <Typography variant="body2" color="text.secondary">
          انقر على الخريطة لتحديد موقع فرعك، أو استخدم البحث للعثور على عنوان محدد
        </Typography>

        <LocationMap
          coordinates={currentCoordinates}
          address={currentAddress}
          onLocationChange={handleLocationChange}
          height={500}
        />

        {/* Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving || !hasChanges}
            sx={{
              minWidth: 200,
              backgroundColor: '#00bcd4',
              '&:hover': { backgroundColor: '#00acc1' },
            }}
          >
            {saving ? <CircularProgress size={24} /> : 'حفظ الموقع'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default MapTab;