import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Typography,
  Chip,
  createFilterOptions,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { contactService } from '../services/contact.service';
import type { Contact, QuickCreateContact } from '../types/contact.types';
import { ContactType } from '../types/contact.types';

interface ContactSelectorProps {
  label: string;
  value: string | null;
  onChange: (contactId: string | null, contact?: Contact) => void;
  contactTypes?: ContactType[];
  onCreateNew?: (name: string) => Promise<string>;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  placeholder?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled' | 'standard';
  disabled?: boolean;
}

const filter = createFilterOptions<Contact | { inputValue: string; title: string }>();

export default function ContactSelector({
  label,
  value,
  onChange,
  contactTypes,
  onCreateNew,
  required = false,
  error = false,
  helperText,
  placeholder,
  fullWidth = true,
  size = 'medium',
  variant = 'outlined',
  disabled = false,
}: ContactSelectorProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Load initial contact if value is provided
  useEffect(() => {
    if (value && user?.companyId) {
      contactService.getContact(user.companyId, value).then(contact => {
        if (contact) {
          setSelectedContact(contact);
        }
      });
    } else {
      setSelectedContact(null);
    }
  }, [value, user?.companyId]);

  // Load contacts when dropdown opens
  useEffect(() => {
    if (!open || !user?.companyId) {
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const filters = contactTypes ? { types: contactTypes } : {};
        const { contacts } = await contactService.getContacts(user.companyId, filters);
        setOptions(contacts);
      } catch (error) {
        console.error('Error loading contacts:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user?.companyId, contactTypes]);

  const handleChange = async (
    event: any,
    newValue: Contact | { inputValue: string; title: string } | null
  ) => {
    if (!newValue) {
      onChange(null);
      setSelectedContact(null);
      return;
    }

    // Check if it's a new contact creation
    if ('inputValue' in newValue) {
      if (onCreateNew && user?.companyId) {
        try {
          setLoading(true);
          const newContactId = await onCreateNew(newValue.inputValue);
          
          // Load the newly created contact
          const newContact = await contactService.getContact(user.companyId, newContactId);
          if (newContact) {
            setSelectedContact(newContact);
            onChange(newContactId, newContact);
            setOptions([...options, newContact]);
          }
        } catch (error) {
          console.error('Error creating contact:', error);
        } finally {
          setLoading(false);
        }
      }
    } else {
      // Existing contact selected
      setSelectedContact(newValue);
      onChange(newValue.id!, newValue);
    }
  };

  const getContactLabel = (contact: Contact) => {
    let label = contact.displayName;
    if (contact.companyName) {
      label += ` - ${contact.companyName}`;
    }
    return label;
  };

  const getContactTypeColor = (type: ContactType): any => {
    const colors = {
      [ContactType.CLIENT]: 'primary',
      [ContactType.VENDOR]: 'secondary',
      [ContactType.EMPLOYEE]: 'info',
      [ContactType.SUPPLIER]: 'warning',
      [ContactType.PARTNER]: 'success',
      [ContactType.CONTRACTOR]: 'error',
      [ContactType.OTHER]: 'default',
    };
    return colors[type] || 'default';
  };

  return (
    <Autocomplete
      id="contact-selector"
      fullWidth={fullWidth}
      size={size}
      disabled={disabled}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, value) => {
        if ('inputValue' in option || 'inputValue' in value) return false;
        return option.id === value.id;
      }}
      getOptionLabel={(option) => {
        if ('inputValue' in option) {
          return option.title;
        }
        return getContactLabel(option);
      }}
      filterOptions={(options, params) => {
        const filtered = filter(options, params);

        const { inputValue } = params;
        // Suggest the creation of a new value
        const isExisting = options.some((option) => inputValue === option.displayName);
        if (inputValue !== '' && !isExisting && onCreateNew) {
          filtered.push({
            inputValue,
            title: `إضافة "${inputValue}"`,
          });
        }

        return filtered;
      }}
      options={options}
      loading={loading}
      value={selectedContact}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      renderOption={(props, option) => {
        if ('inputValue' in option) {
          return (
            <Box component="li" {...props}>
              <Typography color="primary">{option.title}</Typography>
            </Box>
          );
        }

        return (
          <Box component="li" {...props}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2">{option.displayName}</Typography>
                {option.companyName && (
                  <Typography variant="caption" color="text.secondary">
                    {option.companyName}
                  </Typography>
                )}
              </Box>
              <Chip
                label={option.type}
                size="small"
                color={getContactTypeColor(option.type)}
                variant="outlined"
              />
            </Box>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          error={error}
          helperText={helperText}
          variant={variant}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}