import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  Slider,
  Tabs,
  Tab,
  TextField
} from '@mui/material';
import { StaffMember } from '../../store/slices/staffSlice';
import { Project } from '../../store/slices/projectSlice';

interface BulkAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  staffMembers: StaffMember[];
  projects: Project[];
  onApply: (projectName: string, startDate: Date | null, staffHours: StaffHours[]) => void;
}

interface StaffHours {
  id: string;
  name: string;
  hours: number;
}

const BulkAssignmentDialog: React.FC<BulkAssignmentDialogProps> = ({
  open,
  onClose,
  staffMembers,
  projects,
  onApply
}) => {
  // Get existing tasks and grade rates from Redux
  const existingTasks = useSelector((state: RootState) => state.schedule.tasks);
  const gradeRates = useSelector((state: RootState) => state.settings.globalRules.gradeRates);
  const [tabIndex, setTabIndex] = useState(0);
  const [projectName, setProjectName] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [staffHours, setStaffHours] = useState<StaffHours[]>([]);
  
  // Initialize staff hours when staff members change or dialog opens
  useEffect(() => {
    if (open) {
      const initialStaffHours = staffMembers.map(staff => ({
        id: staff.id,
        name: staff.name,
        hours: 0
      }));
      setStaffHours(initialStaffHours);
      setProjectName('');
      
      // Initialize with Monday of current week
      const today = new Date();
      const day = today.getDay(); // 0 is Sunday, 1 is Monday
      const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, otherwise adjust to Monday
      const mondayDate = new Date(today);
      mondayDate.setDate(today.getDate() + diff);
      setStartDate(mondayDate);
      
      setTabIndex(0);
    }
  }, [open, staffMembers]);
  
  // Calculate budget metrics
  const project = projects.find(p => p.name === projectName);
  const existingBudgetUsed = project
    ? existingTasks
        .filter(task => task.projectId === project.id)
        .reduce((sum, t) => {
          const st = staffMembers.find(s => s.id === t.staffId);
          const rate = st ? gradeRates[st.grade] || 0 : 0;
          return sum + t.hours * rate;
        }, 0)
    : 0;
  const draftBudget = projectName
    ? staffHours.reduce((sum, sh) => {
        const st = staffMembers.find(s => s.id === sh.id);
        const rate = st ? gradeRates[st.grade] || 0 : 0;
        return sum + sh.hours * rate;
      }, 0)
    : 0;
  const budgetLeftAfterDraft = project ? project.budget - existingBudgetUsed - draftBudget : 0;
  const canApply = Boolean(projectName && startDate && budgetLeftAfterDraft >= 0);
  
  const handleStaffHoursChange = (staffId: string, hours: number) => {
    setStaffHours(prevHours => 
      prevHours.map(staff => 
        staff.id === staffId ? { ...staff, hours } : staff
      )
    );
  };
  
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = event.target.value ? new Date(event.target.value) : null;
    setStartDate(newDate);
  };
  
  const handleApply = () => {
    onApply(projectName, startDate, staffHours);
  };
  
  // Format date for the input field
  const formatDateForInput = (date: Date | null): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { bgcolor: 'common.white' } }}
    >
      <DialogTitle>Bulk Project Assignment</DialogTitle>
      <DialogContent sx={{ bgcolor: 'common.white' }}>
        <Tabs
          value={tabIndex}
          onChange={(e, newValue) => setTabIndex(newValue)}
          sx={{ mb: 3 }}
        >
          <Tab label="Project" />
          <Tab label="Staff Hours" />
        </Tabs>
        
        {tabIndex === 0 && (
          <>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel id="bulk-project-label">Project</InputLabel>
              <Select
                labelId="bulk-project-label"
                MenuProps={{ PaperProps: { sx: { bgcolor: 'common.white' } } }}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                label="Project"
              >
                <MenuItem value="">Select a Project</MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.name}>{project.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Start Date"
              type="date"
              value={formatDateForInput(startDate)}
              onChange={handleDateChange}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              sx={{ mb: 2 }}
            />
            
            <Typography variant="body2" sx={{ mt: 3, color: 'text.secondary' }}>
              Note: Hours will be assigned starting from the selected date,
              skipping weekends, with maximum 8 hours per day until the 
              allocated hours per staff member are exhausted.
            </Typography>
          </>
        )}
        
        {tabIndex === 1 && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Assign hours to staff members:
            </Typography>
            
            <List sx={{ maxHeight: '400px', overflow: 'auto' }}>
              {staffHours.map((staff) => (
                <ListItem key={staff.id} divider>
                  <ListItemText 
                    primary={staff.name} 
                    secondary={`${staffMembers.find(s => s.id === staff.id)?.department || ''}`} 
                  />
                  <Box sx={{ width: '180px', ml: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Slider
                        value={staff.hours}
                        onChange={(e, newValue) => handleStaffHoursChange(staff.id, newValue as number)}
                        step={5}
                        min={0}
                        max={80}
                        valueLabelDisplay="auto"
                        sx={{ mr: 2 }}
                      />
                      <Typography variant="body2" sx={{ minWidth: '40px' }}>
                        {staff.hours} hrs
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
            {/* Budget Indicator */}
            {project && (
              <Typography
                variant="body2"
                color={budgetLeftAfterDraft < 0 ? 'error' : 'textSecondary'}
                sx={{ mt: 2 }}
              >
                Budget Used: {existingBudgetUsed} AED / {project.budget} AED. 
                New Assignment Cost: {draftBudget} AED. 
                Remaining After Assignment: {budgetLeftAfterDraft} AED.
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleApply} 
          variant="contained"
          color="primary"
          disabled={!canApply}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BulkAssignmentDialog; 