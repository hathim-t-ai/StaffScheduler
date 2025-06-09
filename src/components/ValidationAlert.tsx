import React from 'react';
import { Alert, AlertTitle, Box, List, ListItem, ListItemText } from '@mui/material';

interface ValidationError {
  field?: string;
  message: string;
}

interface ValidationAlertProps {
  errors: ValidationError[] | string[];
  severity?: 'error' | 'warning' | 'info';
  title?: string;
  onClose?: () => void;
}

/**
 * ValidationAlert Component
 * 
 * Displays validation errors in a user-friendly format.
 * Can handle both simple string arrays and detailed error objects.
 */
const ValidationAlert: React.FC<ValidationAlertProps> = ({
  errors,
  severity = 'error',
  title = 'Validation Error',
  onClose
}) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  const formatError = (error: ValidationError | string): string => {
    if (typeof error === 'string') {
      return error;
    }
    return error.field ? `${error.field}: ${error.message}` : error.message;
  };

  return (
    <Alert 
      severity={severity} 
      onClose={onClose}
      sx={{ mb: 2 }}
    >
      <AlertTitle>{title}</AlertTitle>
      {errors.length === 1 ? (
        <Box>{formatError(errors[0])}</Box>
      ) : (
        <List dense sx={{ mt: 1 }}>
          {errors.map((error, index) => (
            <ListItem key={index} sx={{ py: 0, px: 0 }}>
              <ListItemText 
                primary={formatError(error)}
                sx={{ my: 0 }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Alert>
  );
};

export default ValidationAlert; 