import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  List,
  ListItem,
  ListItemText,
  ListSubheader
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
import AddIcon from '@mui/icons-material/Add';
import { ScheduleTask } from '../../store/slices/scheduleSlice';
import { StaffMember } from '../../store/slices/staffSlice';
import { Project } from '../../store/slices/projectSlice';

interface TaskAssignmentDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedStaffId: string;
  staffMembers: StaffMember[];
  projects: Project[];
  currentTasks: ScheduleTask[];
  onAddTask: (taskType: string, hours: number) => void;
  onRemoveTask: (taskId: string) => void;
  onSaveAndApply: () => void;
}

const TaskAssignmentDrawer: React.FC<TaskAssignmentDrawerProps> = ({
  open,
  onClose,
  selectedDate,
  selectedStaffId,
  staffMembers,
  projects,
  currentTasks,
  onAddTask,
  onRemoveTask,
  onSaveAndApply
}) => {
  // Get global schedule tasks and grade rates from Redux
  const scheduleTasks = useSelector((state: RootState) => state.schedule.tasks);
  const gradeRates = useSelector((state: RootState) => state.settings.globalRules.gradeRates);

  const [taskType, setTaskType] = useState<string>('Available');
  const [taskHours, setTaskHours] = useState<number>(8);
  
  // Calculate budget usage for selected project
  const selectedProject = projects.find(p => p.name === taskType);
  // Find staff member and their rate
  const staff = staffMembers.find(s => s.id === selectedStaffId);
  const staffRate = staff ? gradeRates[staff.grade] || 0 : 0;
  // Sum existing and draft tasks cost for this project
  let budgetUsed = 0;
  if (selectedProject) {
    const existing = scheduleTasks.filter(task => task.projectId === selectedProject.id);
    const drafts = currentTasks.filter(task => task.projectId === selectedProject.id && !existing.some(t => t.id === task.id));
    budgetUsed = existing.reduce((sum, t) => {
      const st = staffMembers.find(s => s.id === t.staffId);
      const rate = st ? gradeRates[st.grade] || 0 : 0;
      return sum + t.hours * rate;
    }, 0) + drafts.reduce((sum, t) => {
      const st = staffMembers.find(s => s.id === t.staffId);
      const rate = st ? gradeRates[st.grade] || 0 : 0;
      return sum + t.hours * rate;
    }, 0);
  }
  const budgetLeft = selectedProject ? selectedProject.budget - budgetUsed : 0;
  const isProjectTask = Boolean(selectedProject);
  const newTaskCost = staffRate * taskHours;
  const canAdd = !isProjectTask || newTaskCost <= budgetLeft;
  
  // Reset form when drawer opens
  useEffect(() => {
    if (open) {
      setTaskType('Available');
      setTaskHours(8);
    }
  }, [open]);
  
  const handleAddTask = () => {
    onAddTask(taskType, taskHours);
  };
  
  // Format the date string for display
  const formattedDate = selectedDate 
    ? new Date(selectedDate).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })
    : '';
  
  // Get staff name
  const staffMember = staffMembers.find(s => s.id === selectedStaffId);
  
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: '400px',
          p: 3,
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Task Assignment</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      {selectedStaffId && (
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          {staffMember?.name} - {formattedDate}
        </Typography>
      )}
      
      <Divider sx={{ mb: 3 }} />
      
      {/* Current tasks */}
      {currentTasks.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Current Assignments:</Typography>
          <List dense sx={{ mb: 3 }}>
            {currentTasks.map((task) => (
              <ListItem 
                key={task.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => onRemoveTask(task.id)}>
                    <ClearIcon />
                  </IconButton>
                }
              >
                <ListItemText 
                  primary={task.taskType} 
                  secondary={`${task.hours} hours`}
                />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ mb: 3 }} />
        </>
      )}
      
      {/* Add new task form */}
      <Typography variant="subtitle2" sx={{ mb: 2 }}>Add New Task:</Typography>
      
      {/* Budget Indicator */}
      {isProjectTask && (
        <Typography
          variant="body2"
          color={budgetLeft < 0 ? 'error' : 'textSecondary'}
          sx={{ mb: 2 }}
        >
          Budget Used: {budgetUsed} AED / {selectedProject?.budget} AED. Remaining: {budgetLeft} AED.
        </Typography>
      )}
      
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="task-type-label">Task Type</InputLabel>
        <Select
          labelId="task-type-label"
          value={taskType}
          onChange={(e) => setTaskType(e.target.value)}
          label="Task Type"
        >
          <MenuItem value="Available">Available</MenuItem>
          <MenuItem value="Annual Leave">Annual Leave</MenuItem>
          <MenuItem value="Sick Leave">Sick Leave</MenuItem>
          <Divider />
          <ListSubheader>Projects</ListSubheader>
          {projects.map((project) => (
            <MenuItem key={project.id} value={project.name}>{project.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <FormControl fullWidth sx={{ mb: 3 }} disabled={taskType === 'Annual Leave' || taskType === 'Sick Leave'}>
        <InputLabel id="hours-label">Hours</InputLabel>
        <Select
          labelId="hours-label"
          value={taskType === 'Annual Leave' || taskType === 'Sick Leave' ? 8 : taskHours}
          onChange={(e) => setTaskHours(Number(e.target.value))}
          label="Hours"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => (
            <MenuItem key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          variant="outlined"
          onClick={handleAddTask}
          disabled={!canAdd}
          startIcon={<AddIcon />}
        >
          Add Task
        </Button>
        
        <Button 
          variant="contained"
          onClick={onSaveAndApply}
          color="primary"
          disabled={isProjectTask && budgetLeft < 0}
        >
          Save and Apply
        </Button>
      </Box>
    </Drawer>
  );
};

export default TaskAssignmentDrawer; 