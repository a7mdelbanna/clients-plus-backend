import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  GoogleMap,
  useLoadScript,
  Marker,
  Autocomplete,
} from '@react-google-maps/api';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  MyLocation,
  Search,
  Clear,
} from '@mui/icons-material';
import { toast } from 'react-toastify';

interface LocationMapProps {
  coordinates?: { lat: number; lng: number };
  address?: string;
  onLocationChange: (data: {
    coordinates: { lat: number; lng: number };
    address?: string;
  }) => void;
  height?: number | string;
}

const libraries: ("places" | "drawing" | "geometry" | "visualization")[] = ["places"];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Default to Cairo, Egypt
const defaultCenter = {
  lat: 30.0444,
  lng: 31.2357,
};

const LocationMap: React.FC<LocationMapProps> = ({
  coordinates,
  address,
  onLocationChange,
  height = 400,
}) => {
  const [map, setMap] = useState<any>(null);
  const [currentPosition, setCurrentPosition] = useState(coordinates || defaultCenter);
  const [searchAddress, setSearchAddress] = useState(address || '');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [autocomplete, setAutocomplete] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || '',
    libraries,
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (coordinates) {
      setCurrentPosition(coordinates);
    }
  }, [coordinates]);

  useEffect(() => {
    if (address !== searchAddress) {
      setSearchAddress(address || '');
    }
  }, [address]);

  const onMapLoad = useCallback((mapInstance: any) => {
    setMap(mapInstance);
  }, []);

  const onMapClick = useCallback((e: any) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      const newPosition = { lat, lng };
      
      setCurrentPosition(newPosition);
      
      // Reverse geocode to get address
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: newPosition }, (results: any, status: any) => {
          if (!isMountedRef.current) return;
          
          if (status === 'OK' && results?.[0]) {
            const formattedAddress = results[0].formatted_address;
            setSearchAddress(formattedAddress);
            onLocationChange({
              coordinates: newPosition,
              address: formattedAddress,
            });
          } else {
            onLocationChange({ coordinates: newPosition });
          }
        });
      } else {
        onLocationChange({ coordinates: newPosition });
      }
    }
  }, [onLocationChange]);

  const onAutocompleteLoad = (autocompleteInstance: any) => {
    setAutocomplete(autocompleteInstance);
  };

  const onPlaceSelected = () => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      
      if (place.geometry?.location) {
        const newPosition = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        
        setCurrentPosition(newPosition);
        
        if (map) {
          map.panTo(newPosition);
          map.setZoom(17);
        }
        
        const formattedAddress = place.formatted_address || searchAddress;
        setSearchAddress(formattedAddress);
        
        onLocationChange({
          coordinates: newPosition,
          address: formattedAddress,
        });
      }
    }
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error('الموقع الجغرافي غير مدعوم في متصفحك');
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current) return;
        
        const newPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        
        setCurrentPosition(newPosition);
        
        if (map) {
          map.panTo(newPosition);
          map.setZoom(17);
        }

        // Reverse geocode to get address
        if (window.google && window.google.maps) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: newPosition }, (results: any, status: any) => {
            if (!isMountedRef.current) return;
            
            if (status === 'OK' && results?.[0]) {
              const formattedAddress = results[0].formatted_address;
              setSearchAddress(formattedAddress);
              onLocationChange({
                coordinates: newPosition,
                address: formattedAddress,
              });
            } else {
              onLocationChange({ coordinates: newPosition });
            }
          });
        } else {
          onLocationChange({ coordinates: newPosition });
        }

        setIsLoadingLocation(false);
        toast.success('تم تحديد موقعك الحالي');
      },
      (error) => {
        if (!isMountedRef.current) return;
        
        setIsLoadingLocation(false);
        console.error('Error getting location:', error);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('تم رفض الإذن للوصول إلى موقعك');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('معلومات الموقع غير متاحة');
            break;
          case error.TIMEOUT:
            toast.error('انتهت مهلة طلب الموقع');
            break;
          default:
            toast.error('حدث خطأ في تحديد موقعك');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const clearLocation = () => {
    setSearchAddress('');
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  };

  if (!apiKey) {
    return (
      <Alert severity="error">
        Google Maps API key is missing. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.
      </Alert>
    );
  }

  if (loadError) {
    return (
      <Alert severity="error">
        Error loading Google Maps. Please check your API key and internet connection.
      </Alert>
    );
  }

  if (!isLoaded) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <Autocomplete
              onLoad={onAutocompleteLoad}
              onPlaceChanged={onPlaceSelected}
              options={{
                componentRestrictions: { country: 'eg' }, // Restrict to Egypt
              }}
            >
              <TextField
                inputRef={searchInputRef}
                fullWidth
                label="البحث عن موقع"
                placeholder="ابحث عن عنوان..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                  endAdornment: searchAddress && (
                    <IconButton size="small" onClick={clearLocation}>
                      <Clear />
                    </IconButton>
                  ),
                }}
              />
            </Autocomplete>
            
            <Button
              variant="outlined"
              startIcon={
                isLoadingLocation ? (
                  <CircularProgress size={20} />
                ) : (
                  <MyLocation />
                )
              }
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              sx={{ minWidth: 180 }}
            >
              موقعي الحالي
            </Button>
          </Box>

          {currentPosition && currentPosition.lat && currentPosition.lng && (
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                خط العرض: {currentPosition.lat.toFixed(6)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                خط الطول: {currentPosition.lng.toFixed(6)}
              </Typography>
            </Box>
          )}
        </Paper>

        <Paper sx={{ height: 'calc(100% - 120px)' }}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={
              currentPosition && 
              typeof currentPosition.lat === 'number' && 
              typeof currentPosition.lng === 'number' 
                ? currentPosition 
                : defaultCenter
            }
            zoom={15}
            onLoad={onMapLoad}
            onClick={onMapClick}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
            }}
          >
            {currentPosition && 
             typeof currentPosition.lat === 'number' && 
             typeof currentPosition.lng === 'number' && (
              <Marker
                position={currentPosition}
                animation={window.google?.maps?.Animation?.DROP}
              />
            )}
          </GoogleMap>
        </Paper>
      </Box>
  );
};

export default LocationMap;