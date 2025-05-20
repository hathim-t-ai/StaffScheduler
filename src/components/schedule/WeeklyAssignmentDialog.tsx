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
  Grid,
  Box,
  Slider
} from '@mui/material';
import { formatDate } from '../../utils/ScheduleUtils';
import { StaffMember } from '../../store/slices/staffSlice';
import { Project } from '../../store/slices/projectSlice';

interface WeeklyAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  staffId: string;
  staffMembers: StaffMember[];
  projects: Project[];
  weekDates: Date[];
  onApply: (projectName: string, hours: number[]) => void;
}

const WeeklyAssignmentDialog: React.FC<WeeklyAssignmentDialogProps> = ({
  open,
  onClose,
  staffId,
  staffMembers,
  projects,
  weekDates,
  onApply
}) => {
  // Get existing tasks and grade rates from Redux
  const existingTasks = useSelector((state: RootState) => state.schedule.tasks);
  const gradeRates = useSelector((state: RootState) => state.settings.globalRules.gradeRates);
  const [projectName, setProjectName] = useState<string>('');
  const [hoursPerDay, setHoursPerDay] = useState<number[]>([8, 8, 8, 8, 8]);
  
  // Reset the form when the dialog opens
  useEffect(() => {
    if (open) {
      setProjectName('');
      setHoursPerDay([8, 8, 8, 8, 8]);
    }
  }, [open]);
  
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
  const draftBudget = project
    ? hoursPerDay.reduce((sum, h) => {
        const st = staffMembers.find(s => s.id === staffId);
        const rate = st ? gradeRates[st.grade] || 0 : 0;
        return sum + h * rate;
      }, 0)
    : 0;
  const budgetLeftAfterDraft = project ? project.budget - existingBudgetUsed - draftBudget : 0;
  const canApply = Boolean(projectName);
  
  const handleApply = () => {
    onApply(projectName, hoursPerDay);
  };
  
  // Get staff name
  const staffMember = staffMembers.find(s => s.id === staffId);
  
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { bgcolor: 'common.white' } }}
    >
      <DialogTitle>
        Weekly Assignment
        {staffMember && (
          <Typography variant="subtitle1" sx={{ mt: 1 }}>
            Staff: {staffMember.name}
          </Typography>
        )}
      </DialogTitle>
      
      <DialogContent sx={{ bgcolor: 'common.white' }}>
        <FormControl fullWidth sx={{ my: 2 }}>
          <InputLabel id="weekly-project-label">Project</InputLabel>
          <Select
            labelId="weekly-project-label"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            label="Project"
            MenuProps={{ PaperProps: { sx: { bgcolor: 'common.white' } } }}
          >
            <MenuItem value="">Select a Project</MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.name}>{project.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>
          Hours per day:
        </Typography>
        
        <Grid container spacing={2}>
          {weekDates.map((date, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {date.toLocaleDateString('en-US', { weekday: 'long' })} ({formatDate(date)})
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Slider
                  value={hoursPerDay[index]}
                  onChange={(e, newValue) => {
                    const newHours = [...hoursPerDay];
                    newHours[index] = newValue as number;
                    setHoursPerDay(newHours);
                  }}
                  step={1}
                  marks
                  min={0}
                  max={8}
                  valueLabelDisplay="auto"
                  sx={{ mr: 2, flex: 1 }}
                />
                <Typography variant="body2" sx={{ minWidth: '30px' }}>
                  {hoursPerDay[index]} hrs
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        
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

export default WeeklyAssignmentDialog; 