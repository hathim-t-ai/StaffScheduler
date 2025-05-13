import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
} from '@mui/material';
import { Project } from '../store/slices/projectSlice';
import { v4 as uuidv4 } from 'uuid';

interface AddProjectFormProps {
  open: boolean;
  onClose: () => void;
  onAdd: (project: Project) => void;
  customFields: string[];
}

const AddProjectForm: React.FC<AddProjectFormProps> = ({ open, onClose, onAdd, customFields }) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    partnerName: '',
    teamLead: '',
    budget: 0,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Convert budget to number if the field is budget
    if (name === 'budget') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? 0 : parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Project name is required';
    }
    
    if (!formData.partnerName?.trim()) {
      newErrors.partnerName = 'Partner name is required';
    }
    
    if (!formData.teamLead?.trim()) {
      newErrors.teamLead = 'Team lead is required';
    }
    
    if (formData.budget === undefined || formData.budget < 0) {
      newErrors.budget = 'Budget must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const newProject: Project = {
        id: uuidv4(),
        name: formData.name || '',
        partnerName: formData.partnerName || '',
        teamLead: formData.teamLead || '',
        budget: formData.budget || 0,
        // Add any custom fields
        ...customFields.reduce((acc, field) => {
          acc[field] = formData[field] || '';
          return acc;
        }, {} as Record<string, any>)
      };
      
      onAdd(newProject);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      partnerName: '',
      teamLead: '',
      budget: 0,
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Project</DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Project Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={!!errors.name}
              helperText={errors.name}
              margin="normal"
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Partner Name"
              name="partnerName"
              value={formData.partnerName}
              onChange={handleChange}
              error={!!errors.partnerName}
              helperText={errors.partnerName}
              margin="normal"
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Team Lead"
              name="teamLead"
              value={formData.teamLead}
              onChange={handleChange}
              error={!!errors.teamLead}
              helperText={errors.teamLead}
              margin="normal"
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Budget"
              name="budget"
              type="number"
              value={formData.budget}
              onChange={handleChange}
              error={!!errors.budget}
              helperText={errors.budget}
              margin="normal"
              required
              InputProps={{
                startAdornment: <Box component="span" mr={0.5}>$</Box>
              }}
            />
          </Grid>
          
          {/* Custom fields */}
          {customFields.map(field => (
            <Grid item xs={12} md={6} key={field}>
              <TextField
                fullWidth
                label={field}
                name={field}
                value={formData[field] || ''}
                onChange={handleChange}
                margin="normal"
              />
            </Grid>
          ))}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
        >
          Add Project
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddProjectForm; 