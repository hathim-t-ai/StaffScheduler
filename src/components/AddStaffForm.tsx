import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Chip,
  Box,
  InputAdornment,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { StaffMember } from '../store/slices/staffSlice';
import { v4 as uuidv4 } from 'uuid';

interface AddStaffFormProps {
  open: boolean;
  onClose: () => void;
  onAdd: (staffMember: StaffMember) => void;
  onUpdate?: (staffMember: StaffMember) => void;
  initialData?: StaffMember;
  customFields: string[];
}

const AddStaffForm: React.FC<AddStaffFormProps> = ({ open, onClose, onAdd, onUpdate, initialData, customFields }) => {
  const [formData, setFormData] = useState<Partial<StaffMember>>({
    name: '',
    grade: '',
    department: '',
    city: '',
    country: '',
    email: '',
    skills: []
  });
  const [currentSkill, setCurrentSkill] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(initialData);

  // Initialize form for edit or add
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        setFormData({ name: '', grade: '', department: '', city: '', country: '', email: '', skills: [] });
      }
      setCurrentSkill('');
      setErrors({});
    }
  }, [open, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAddSkill = () => {
    if (currentSkill.trim()) {
      setFormData(prev => ({
        ...prev,
        skills: [...(prev.skills || []), currentSkill.trim()]
      }));
      setCurrentSkill('');
    }
  };

  const handleDeleteSkill = (skillToDelete: string) => {
    setFormData(prev => ({
      ...prev,
      skills: (prev.skills || []).filter(skill => skill !== skillToDelete)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.grade?.trim()) {
      newErrors.grade = 'Grade is required';
    }
    
    if (!formData.city?.trim()) {
      newErrors.city = 'City is required';
    }
    
    if (!formData.country?.trim()) {
      newErrors.country = 'Country is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      const staff: StaffMember = {
        id: initialData?.id || uuidv4(),
        name: formData.name || '',
        grade: formData.grade || '',
        department: formData.department || '',
        city: formData.city || '',
        country: formData.country || '',
        email: formData.email || '',
        skills: formData.skills || [],
        // Add any custom fields
        ...customFields.reduce((acc, field) => {
          acc[field] = formData[field] || '';
          return acc;
        }, {} as Record<string, any>)
      };
      
      if (isEdit && onUpdate) {
        onUpdate(staff);
      } else {
        onAdd(staff);
      }
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({ name: '', grade: '', department: '', city: '', country: '', email: '', skills: [] });
    setCurrentSkill('');
    setErrors({});
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { bgcolor: 'common.white', color: 'background.default' } }}
    >
      <DialogTitle sx={{ color: 'background.default' }}>{isEdit ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
      <DialogContent sx={{ color: 'background.default' }}>
        <Grid container spacing={3} sx={{ mt: 0 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Name"
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
              label="Grade"
              name="grade"
              value={formData.grade}
              onChange={handleChange}
              error={!!errors.grade}
              helperText={errors.grade}
              margin="normal"
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              error={!!errors.city}
              helperText={errors.city}
              margin="normal"
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              error={!!errors.country}
              helperText={errors.country}
              margin="normal"
              required
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              margin="normal"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Skills"
              value={currentSkill}
              onChange={(e) => setCurrentSkill(e.target.value)}
              onKeyDown={handleKeyDown}
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleAddSkill} edge="end">
                      <AddIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              helperText="Press Enter or click the + icon to add a skill"
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {formData.skills?.map((skill, index) => (
                <Chip
                  key={index}
                  label={skill}
                  onDelete={() => handleDeleteSkill(skill)}
                />
              ))}
            </Box>
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
      <DialogActions sx={{ color: 'background.default' }}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
        >
          {isEdit ? 'Update Staff Member' : 'Add Staff Member'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddStaffForm; 