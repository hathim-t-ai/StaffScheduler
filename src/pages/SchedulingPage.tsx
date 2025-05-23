/* eslint-disable no-console */
import React, { useState, useEffect, useCallback } from 'react';
// Import Material UI components
import { Container, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

// Import Redux and API utilities
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Import app components
import NavigationBar from '../components/NavigationBar';
// Import schedule components
import FilterSidebar from '../components/schedule/FilterSidebar';
import ScheduleCalendar from '../components/schedule/ScheduleCalendar';
import TaskAssignmentDrawer from '../components/schedule/TaskAssignmentDrawer';
import WeeklyAssignmentDialog from '../components/schedule/WeeklyAssignmentDialog';
import BulkAssignmentDialog from '../components/schedule/BulkAssignmentDialog';
import ScheduleContextMenu from '../components/schedule/ScheduleContextMenu';
import Notification from '../components/schedule/Notification';

// Import hooks and types
import { useScheduleManager } from '../hooks/useScheduleManager';
import { isAtEndDate as checkIsAtEndDate } from '../utils/ScheduleUtils';
import { StaffMember } from '../store/slices/staffSlice';
import { clearSchedule, clearScheduleForStaff, setTasks } from '../store/slices/scheduleSlice';

const SchedulingPage: React.FC = () => {
  const dispatch = useDispatch();
  
  // Function to load assignments from backend
  const loadAssignments = useCallback(async () => {
    try {
      const res = await axios.get(`/api/assignments?_=${new Date().getTime()}`);
      const tasks = res.data.map((a: { id: string; staffId: string; date: string; projectName: string; hours: number; projectId: string; }) => ({
        id: a.id,
        staffId: a.staffId,
        date: a.date,
        taskType: a.projectName,
        hours: a.hours,
        projectId: a.projectId,
      }));
      console.log('[SchedulingPage] Tasks fetched from /api/assignments:', tasks);
      dispatch(setTasks(tasks));
    } catch (err) {
      console.error('Error loading assignments', err);
    }
  }, [dispatch]);

  // Load assignments on mount
  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  // Refresh assignments when calendar requests a refresh
  useEffect(() => {
    const handleRefresh = () => {
      console.log('[SchedulingPage] Received refreshCalendar event');
      loadAssignments();
    };
    window.addEventListener('refreshCalendar', handleRefresh);
    return () => {
      window.removeEventListener('refreshCalendar', handleRefresh);
    };
  }, [loadAssignments]);
  
  // Get data from Redux store
  const staffMembers = useSelector((state: RootState) => state.staff.staffMembers);
  const projects = useSelector((state: RootState) => state.projects.projects);
  
  // State for filtered staff members
  const [filteredStaff, setFilteredStaff] = useState(staffMembers);
  
  // State for clear schedule confirmation dialog
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  
  // State for selected staff for individual clear
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  
  // Task management hook
  const {
    scheduleTasks,
    currentStartDate,
    weekDates,
    drawerOpen,
    selectedDate,
    selectedStaffId,
    currentTasks,
    contextMenu,
    dragItem,
    dropTargetStaffId,
    dropTargetDate,
    weeklyAssignDialogOpen,
    weeklyAssignStaffId,
    bulkAssignDialogOpen,
    notification,
    goToPreviousWeek,
    goToNextWeek,
    openTaskDrawer,
    closeTaskDrawer,
    addNewTask,
    saveAndApply,
    removeTask,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleContextMenu,
    handleCloseContextMenu,
    handleCopyDay,
    handlePasteDay,
    handleClearDay,
    handleWeeklyAssign,
    handleCloseWeeklyDialog,
    applyWeeklyAssignment,
    openBulkAssignDialog,
    closeBulkAssignDialog,
    applyBulkAssignments,
    handleCloseNotification,
    setNotification
  } = useScheduleManager(staffMembers, projects);
  
  // Update filtered staff when filter changes
  const handleFilterChange = (newFilteredStaff: StaffMember[]) => {
    setFilteredStaff(newFilteredStaff);
  };
  
  // Update filtered staff when all staff members change
  useEffect(() => {
    setFilteredStaff(staffMembers);
  }, [staffMembers]);
  
  // Handler to select individual staff rows
  const handleStaffSelect = (staffId: string, checked: boolean) => {
    setSelectedStaffIds(prev => checked ? [...prev, staffId] : prev.filter(id => id !== staffId));
  };
  
  // Clear schedule handlers
  const handleOpenClearDialog = () => {
    setClearDialogOpen(true);
  };
  
  const handleCloseClearDialog = () => {
    setClearDialogOpen(false);
  };
  
  const handleClearSchedule = () => {
    if (selectedStaffIds.length > 0) {
      dispatch(clearScheduleForStaff(selectedStaffIds));
      setSelectedStaffIds([]);
    } else {
      dispatch(clearSchedule());
    }
    setClearDialogOpen(false);
    
    // Show notification using the notification system from useScheduleManager
    handleCloseNotification(); // Close any existing notification
    setNotification({
      open: true,
      message: 'Schedule data has been cleared',
      severity: 'info'
    });
  };
  
  // Handler to run orchestration via CrewAI
  const handleRunOrchestrator = async () => {
    try {
      // Use the current start date for daily scheduling
      const date = currentStartDate.toISOString().split('T')[0];
      const res = await axios.post('/api/orchestrate', { date });
      const { resolvedMatches } = res.data;
      // Transform resolvedMatches into ScheduleTask objects
      const tasks = resolvedMatches.map((match: any) => ({
        id: uuidv4(),
        staffId: match.staffId,
        date: match.date,
        taskType: match.staffName,
        hours: match.assignedHours,
        projectId: undefined,
      }));
      dispatch(setTasks(tasks));
      // Notify success
      setNotification({
        open: true,
        message: 'Orchestrator scheduled shifts successfully!',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error running orchestrator', err);
      setNotification({
        open: true,
        message: 'Failed to run orchestrator',
        severity: 'error'
      });
    }
  };
  
  return (
    <Container maxWidth={false} disableGutters>
      <NavigationBar title="Schedule" />
      <Box sx={{
        display: 'flex',
        height: 'calc(100vh - 64px)'
      }}>
        {/* Placeholder Sidebar */}
        <Box sx={theme => ({ width: theme.spacing(7), bgcolor: 'background.paper' })} />
        
        {/* Calendar & Filters View */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'background.default', pt: 2, px: 2 }}>
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: 'common.white' }}>
            {/* Header: filters + clear button */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, bgcolor: 'common.white', color: 'text.primary', px: 2, py: 1, gap: 2 }}>
              {/* Inline Filters */}
              <Box sx={{ flexGrow: 1 }}>
                <FilterSidebar
                  horizontal
                  staffMembers={staffMembers}
                  scheduleTasks={scheduleTasks}
                  projects={projects}
                  onFilterChange={handleFilterChange}
                  onWeeklyAssign={handleWeeklyAssign}
                />
              </Box>
              {/* Auto Schedule button */}
              <Button variant="contained" color="primary" onClick={handleRunOrchestrator} size="small" sx={{ ml: 2 }}>
                Auto Schedule
              </Button>
              {/* Clear Schedule button */}
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleOpenClearDialog} size="small" sx={{ ml: 'auto' }}>
                Clear Schedule
              </Button>
            </Box>
            {/* Calendar */}
            <ScheduleCalendar
              filteredStaff={filteredStaff}
              tasks={scheduleTasks}
              currentStartDate={currentStartDate}
              weekDates={weekDates}
              onCellClick={openTaskDrawer}
              onPreviousWeek={goToPreviousWeek}
              onNextWeek={goToNextWeek}
              isAtEndDate={checkIsAtEndDate(currentStartDate)}
              dropTargetStaffId={dropTargetStaffId}
              dropTargetDate={dropTargetDate}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onContextMenu={handleContextMenu}
              onBulkAssign={openBulkAssignDialog}
              onWeeklyAssign={handleWeeklyAssign}
              selectedStaffIds={selectedStaffIds}
              onStaffSelect={handleStaffSelect}
            />
          </Paper>
        </Box>
      </Box>
      
      {/* Task Assignment Drawer */}
      <TaskAssignmentDrawer 
        open={drawerOpen}
        onClose={closeTaskDrawer}
        selectedDate={selectedDate}
        selectedStaffId={selectedStaffId}
        staffMembers={staffMembers}
        projects={projects}
        currentTasks={currentTasks}
        onAddTask={addNewTask}
        onRemoveTask={removeTask}
        onSaveAndApply={saveAndApply}
      />
      
      {/* Context Menu */}
      <ScheduleContextMenu 
        contextMenu={contextMenu}
        onClose={handleCloseContextMenu}
        onCopyDay={handleCopyDay}
        onPasteDay={handlePasteDay}
        onClearDay={handleClearDay}
        canPaste={!!dragItem}
      />
      
      {/* Weekly Assignment Dialog */}
      <WeeklyAssignmentDialog 
        open={weeklyAssignDialogOpen}
        onClose={handleCloseWeeklyDialog}
        staffId={weeklyAssignStaffId}
        staffMembers={staffMembers}
        projects={projects}
        weekDates={weekDates}
        onApply={applyWeeklyAssignment}
      />
      
      {/* Bulk Assignment Dialog */}
      <BulkAssignmentDialog 
        open={bulkAssignDialogOpen}
        onClose={closeBulkAssignDialog}
        staffMembers={staffMembers}
        projects={projects}
        onApply={applyBulkAssignments}
      />
      
      {/* Notifications */}
      <Notification 
        open={notification.open}
        message={notification.message}
        severity={notification.severity}
        onClose={handleCloseNotification}
      />
      
      {/* Clear Schedule Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onClose={handleCloseClearDialog} PaperProps={{ sx: { bgcolor: 'common.white' } }}>
        <DialogTitle>Clear Schedule</DialogTitle>
        <DialogContent sx={{ bgcolor: 'common.white' }}>
          <Typography>
            Are you sure you want to clear all schedule data? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseClearDialog}>Cancel</Button>
          <Button onClick={handleClearSchedule} color="error" variant="contained">
            Clear All Data
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SchedulingPage; 