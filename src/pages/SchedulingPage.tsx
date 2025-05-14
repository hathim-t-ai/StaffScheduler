import React, { useState, useEffect } from 'react';
import { Container, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import NavigationBar from '../components/NavigationBar';
import DeleteIcon from '@mui/icons-material/Delete';

// Import schedule components
import FilterSidebar from '../components/schedule/FilterSidebar';
import ScheduleCalendar from '../components/schedule/ScheduleCalendar';
import TaskAssignmentDrawer from '../components/schedule/TaskAssignmentDrawer';
import WeeklyAssignmentDialog from '../components/schedule/WeeklyAssignmentDialog';
import BulkAssignmentDialog from '../components/schedule/BulkAssignmentDialog';
import ScheduleContextMenu from '../components/schedule/ScheduleContextMenu';
import Notification from '../components/schedule/Notification';

// Import hooks and types
import { ContextMenuPosition, NotificationState } from '../components/schedule/types';
import { useScheduleManager } from '../hooks/useScheduleManager';
import { getDatesForCurrentWeek, isAtEndDate as checkIsAtEndDate } from '../utils/ScheduleUtils';
import { StaffMember } from '../store/slices/staffSlice';
import { clearSchedule } from '../store/slices/scheduleSlice';

const SchedulingPage: React.FC = () => {
  const dispatch = useDispatch();
  
  // Get data from Redux store
  const staffMembers = useSelector((state: RootState) => state.staff.staffMembers);
  const projects = useSelector((state: RootState) => state.projects.projects);
  
  // State for filtered staff members
  const [filteredStaff, setFilteredStaff] = useState(staffMembers);
  
  // State for clear schedule confirmation dialog
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  
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
  
  // Clear schedule handlers
  const handleOpenClearDialog = () => {
    setClearDialogOpen(true);
  };
  
  const handleCloseClearDialog = () => {
    setClearDialogOpen(false);
  };
  
  const handleClearSchedule = () => {
    dispatch(clearSchedule());
    setClearDialogOpen(false);
    
    // Show notification using the notification system from useScheduleManager
    handleCloseNotification(); // Close any existing notification
    setNotification({
      open: true,
      message: 'Schedule data has been cleared',
      severity: 'info'
    });
  };
  
  return (
    <Container maxWidth={false} disableGutters>
      <NavigationBar title="Schedule" />
      <Box sx={{
        display: 'flex',
        height: 'calc(100vh - 64px)'
      }}>
        {/* Filter Sidebar */}
        <FilterSidebar 
          staffMembers={staffMembers}
          onFilterChange={handleFilterChange}
          onWeeklyAssign={handleWeeklyAssign}
        />
        
        {/* Calendar View */}
        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            p: 1, 
            borderBottom: '1px solid rgba(0, 0, 0, 0.12)' 
          }}>
            <Button 
              variant="outlined" 
              color="error" 
              startIcon={<DeleteIcon />}
              onClick={handleOpenClearDialog}
              size="small"
              sx={{ mr: 2 }}
            >
              Clear Schedule
            </Button>
          </Box>
          
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
          />
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
      <Dialog open={clearDialogOpen} onClose={handleCloseClearDialog}>
        <DialogTitle>Clear Schedule</DialogTitle>
        <DialogContent>
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