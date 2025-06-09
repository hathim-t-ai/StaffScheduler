import React, { useState } from 'react';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio
} from '@mui/material';

interface AddColumnModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (columnName: string, dataType: string) => void;
}

const AddColumnModal: React.FC<AddColumnModalProps> = ({ open, onClose, onAdd }) => {
  const [columnName, setColumnName] = useState('');
  const [dataType, setDataType] = useState('text');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!columnName.trim()) {
      setError('Column name is required');
      return;
    }

    onAdd(columnName.trim(), dataType);
    handleClose();
  };

  const handleClose = () => {
    setColumnName('');
    setDataType('text');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { bgcolor: 'common.white', color: 'background.default' } }}
    >
      <DialogTitle sx={{ color: 'background.default' }}>Add New Column</DialogTitle>
      <DialogContent sx={{ color: 'background.default' }}>
        <TextField
          autoFocus
          margin="dense"
          label="Column Name"
          type="text"
          fullWidth
          value={columnName}
          onChange={(e) => setColumnName(e.target.value)}
          error={!!error}
          helperText={error}
          sx={{ mb: 3 }}
        />
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ color: 'background.default' }}>Data Type</FormLabel>
          <RadioGroup 
            row 
            value={dataType} 
            onChange={(e) => setDataType(e.target.value)}
          >
            <FormControlLabel value="text" control={<Radio />} label="Text" />
            <FormControlLabel value="number" control={<Radio />} label="Number" />
            <FormControlLabel value="date" control={<Radio />} label="Date" />
            <FormControlLabel value="boolean" control={<Radio />} label="Yes/No" />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ color: 'background.default' }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Add Column
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddColumnModal; 