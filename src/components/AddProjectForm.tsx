import React, { useState, useEffect } from 'react';
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

/**
 * Props for the AddProjectForm component
 * @interface AddProjectFormProps
 * @property {boolean} open - Controls visibility of the dialog
 * @property {() => void} onClose - Callback function when the dialog is closed
 * @property {(project: Project) => void} onAdd - Callback function when a new project is added
 * @property {string[]} customFields - Array of custom field names to include in the form
 * @property {(project: Project) => void} onUpdate - Callback function when a project is updated
 * @property {Project} initialData - Initial data for editing an existing project
 */
interface AddProjectFormProps {
  open: boolean;
  onClose: () => void;
  onAdd: (project: Project) => void;
  onUpdate?: (project: Project) => void;
  initialData?: Project;
  customFields: string[];
}

/**
 * AddProjectForm Component
 * 
 * A dialog form for adding new projects to the system. Allows input of standard 
 * project fields (name, partner, team lead, budget) and any custom fields that
 * have been defined. Includes validation and handles form state.
 */
const AddProjectForm: React.FC<AddProjectFormProps> = ({ open, onClose, onAdd, onUpdate, initialData, customFields }) => {
  const [formData, setFormData] = useState<Partial<Project>>({ name: '', partnerName: '', teamLead: '' });
  const [budgetInput, setBudgetInput] = useState<string>('');
  const isEdit = Boolean(initialData);

  // Initialize form for edit or add
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({ ...initialData });
        setBudgetInput(initialData.budget.toString());
      } else {
        setFormData({ name: '', partnerName: '', teamLead: '' });
        setBudgetInput('');
      }
      setErrors({});
    }
  }, [open, initialData]);

  // Track validation errors for each field
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Handles changes to form input fields
   * Special handling for the budget field to ensure it's stored as a number
   * @param e - The input change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'budget') {
      // Update budget string state, allow empty
      setBudgetInput(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
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

  /**
   * Validates form data before submission
   * @returns {boolean} True if validation passes, false otherwise
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required field validation
    if (!formData.name?.trim()) {
      newErrors.name = 'Project name is required';
    }
    
    if (!formData.partnerName?.trim()) {
      newErrors.partnerName = 'Partner name is required';
    }
    
    if (!formData.teamLead?.trim()) {
      newErrors.teamLead = 'Team lead is required';
    }
    
    // Budget must be provided and be a non-negative number
    if (budgetInput.trim() === '') {
      newErrors.budget = 'Budget is required';
    } else if (isNaN(parseFloat(budgetInput)) || parseFloat(budgetInput) < 0) {
      newErrors.budget = 'Budget must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  /**
   * Handles form submission
   * Validates the form data and creates a new project if valid
   */
  const handleSubmit = () => {
    if (validateForm()) {
      const finalBudget = parseFloat(budgetInput) || 0;
      const project: Project = {
        id: initialData?.id || uuidv4(),
        name: formData.name || '',
        partnerName: formData.partnerName || '',
        teamLead: formData.teamLead || '',
        budget: finalBudget,
        // Include any custom fields from the form
        ...customFields.reduce((acc, field) => {
          acc[field] = formData[field] || '';
          return acc;
        }, {} as Record<string, any>)
      };
      
      if (isEdit && onUpdate) {
        onUpdate(project);
      } else {
        onAdd(project);
      }
      handleClose(); // Close the form
    }
  };

  /**
   * Handles dialog close action
   * Resets form state and calls the onClose callback
   */
  const handleClose = () => {
    // Reset form data to initial state
    setFormData({ name: '', partnerName: '', teamLead: '' });
    setBudgetInput('');
    setErrors({}); // Clear any errors
    onClose(); // Call parent onClose function
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { bgcolor: 'common.white', color: 'background.default' } }}
    >
      <DialogTitle sx={{ color: 'background.default' }}>{isEdit ? 'Edit Project' : 'Add New Project'}</DialogTitle>
      <DialogContent sx={{ color: 'background.default' }}>
        <Grid container spacing={3} sx={{ mt: 0 }}>
          {/* Project Name field */}
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
          
          {/* Partner Name field */}
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
          
          {/* Team Lead field */}
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
          
          {/* Budget field with currency symbol */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Budget"
              name="budget"
              type="number"
              value={budgetInput}
              onChange={handleChange}
              error={!!errors.budget}
              helperText={errors.budget}
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <Box component="span" mr={0.5}>
                    {process.env.REACT_APP_CURRENCY_CODE || 'AED'}
                  </Box>
                )
              }}
            />
          </Grid>
          
          {/* Dynamically render custom fields */}
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
      <DialogActions sx={{ color: 'background.default' }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
        >
          {isEdit ? 'Update Project' : 'Add Project'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddProjectForm; 