import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { RootState } from '../store';
import {
  ScheduleTask,
  setTasks,
  addTask,
  navigateWeek
} from '../store/slices/scheduleSlice';
import { StaffMember } from '../store/slices/staffSlice';
import { Project } from '../store/slices/projectSlice';
import { ContextMenuPosition, DragItem, NotificationState, StaffHours } from '../components/schedule/types';
import { getDatesForCurrentWeek, formatDateISO } from '../utils/ScheduleUtils';
import axios from 'axios';

export const useScheduleManager = (staffMembers: StaffMember[], projects: Project[]) => {
  const dispatch = useDispatch();
  const scheduleTasks = useSelector((state: RootState) => state.schedule.tasks);
  
  // Task assignment drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [currentTasks, setCurrentTasks] = useState<ScheduleTask[]>([]);
  
  // Current week derived from Redux state (persisted in localStorage)
  const weekStartIso = useSelector((state: RootState) => state.schedule.startDate);
  const currentStartDate = new Date(weekStartIso);
  
  // Get date array for current week
  const weekDates = getDatesForCurrentWeek(currentStartDate);
  
  // Drag and drop state
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTargetStaffId, setDropTargetStaffId] = useState<string | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);
  
  // Context menu state for right-click operations
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  
  // Weekly assignment dialog state
  const [weeklyAssignDialogOpen, setWeeklyAssignDialogOpen] = useState(false);
  const [weeklyAssignStaffId, setWeeklyAssignStaffId] = useState('');
  
  // Bulk assignment dialog state
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Handle filter changes from FilterSidebar
  const handleFilterChange = (filteredStaff: StaffMember[]) => {
    return filteredStaff;
  };
  
  // Week navigation handlers
  const goToPreviousWeek = () => {
    dispatch(navigateWeek('previous'));
  };
  
  const goToNextWeek = () => {
    dispatch(navigateWeek('next'));
  };
  
  // Task drawer handlers
  const openTaskDrawer = (staffId: string, date: Date) => {
    const dateIsoString = formatDateISO(date);
    
    // Get current tasks for this staff and date
    const tasksForCell = scheduleTasks.filter(
      task => task.staffId === staffId && task.date === dateIsoString
    );
    
    setSelectedStaffId(staffId);
    setSelectedDate(dateIsoString);
    setCurrentTasks(tasksForCell);
    setDrawerOpen(true);
  };
  
  const closeTaskDrawer = () => {
    setDrawerOpen(false);
    setSelectedStaffId('');
    setSelectedDate('');
    setCurrentTasks([]);
  };
  
  // Add a new task in the drawer
  const addNewTask = (taskType: string, hours: number) => {
    // Prevent assigning more than 8 hours per day
    const totalCurrentHours = currentTasks.reduce((sum, t) => sum + t.hours, 0);
    if (totalCurrentHours + hours > 8) {
      setNotification({
        open: true,
        message: 'Cannot assign more than 8 hours per day for a staff member',
        severity: 'error'
      });
      return;
    }
    const newTask: ScheduleTask = {
      id: uuidv4(),
      staffId: selectedStaffId,
      date: selectedDate,
      taskType,
      hours,
      projectId: projects.find(p => p.name === taskType)?.id
    };
    
    setCurrentTasks([...currentTasks, newTask]);
  };
  
  // Save and apply tasks from the drawer
  const saveAndApply = async () => {
    // Validate total hours for the day before saving
    const totalHoursForDay = currentTasks.reduce((sum, t) => sum + t.hours, 0);
    if (totalHoursForDay > 8) {
      setNotification({
        open: true,
        message: 'Cannot assign more than 8 hours per day for a staff member',
        severity: 'error'
      });
      return;
    }
    // Remove existing tasks for this staff and date from the state
    const filteredTasks = scheduleTasks.filter(
      task => !(task.staffId === selectedStaffId && task.date === selectedDate)
    );
    
    // Add the current tasks to the state
    const newTasks = [...filteredTasks, ...currentTasks];
    dispatch(setTasks(newTasks));
    
    // Persist assignments to backend
    for (const task of currentTasks) {
      try {
        await axios.post('/api/assignments', task);
      } catch (err) {
        console.error('Error saving assignment to backend:', err);
      }
    }
    
    // Show success notification
    setNotification({
      open: true,
      message: 'Tasks saved successfully!',
      severity: 'success'
    });
    
    // Close the drawer
    closeTaskDrawer();
  };
  
  // Remove a task and delete assignment from backend
  const removeTask = async (taskId: string) => {
    try {
      await axios.delete(`/api/assignments/${taskId}`);
      setCurrentTasks(currentTasks.filter(task => task.id !== taskId));
      // Refresh calendar to load updated assignments
      window.dispatchEvent(new Event('refreshCalendar'));
      setNotification({ open: true, message: 'Assignment deleted successfully', severity: 'success' });
    } catch (err) {
      console.error('Error deleting assignment', err);
      setNotification({ open: true, message: 'Failed to delete assignment', severity: 'error' });
    }
  };
  
  // Drag and drop handlers
  const handleDragStart = (staffId: string, date: string) => {
    const tasksToCopy = scheduleTasks.filter(
      task => task.staffId === staffId && task.date === date
    );
    
    setDragItem({
      staffId,
      date,
      tasks: tasksToCopy
    });
  };
  
  const handleDragOver = (e: React.DragEvent, staffId: string, date: string) => {
    e.preventDefault();
    setDropTargetStaffId(staffId);
    setDropTargetDate(date);
  };
  
  const handleDrop = (e: React.DragEvent, targetStaffId: string, targetDateStr: string) => {
    e.preventDefault();
    
    if (!dragItem) return;
    
    // Don't do anything if dropping on the same cell
    if (dragItem.staffId === targetStaffId && dragItem.date === targetDateStr) {
      setDropTargetStaffId(null);
      setDropTargetDate(null);
      return;
    }
    
    // Clone tasks with new IDs, target staff ID, and target date
    const newTasks = dragItem.tasks.map(task => ({
      ...task,
      id: uuidv4(),
      staffId: targetStaffId,
      date: targetDateStr
    }));
    
    // Prevent assigning more than 8 hours per day when dropping
    const totalDroppedHours = newTasks.reduce((sum, t) => sum + t.hours, 0);
    if (totalDroppedHours > 8) {
      setNotification({
        open: true,
        message: 'Cannot assign more than 8 hours per day for a staff member',
        severity: 'error'
      });
      setDropTargetStaffId(null);
      setDropTargetDate(null);
      return;
    }
    
    // Remove existing tasks for the target date and staff
    const filteredTasksDrop = scheduleTasks.filter(
      task => !(task.staffId === targetStaffId && task.date === targetDateStr)
    );
    
    // Add the new tasks
    const updatedTasks = [...filteredTasksDrop, ...newTasks];
    dispatch(setTasks(updatedTasks));
    
    // Show success notification
    setNotification({
      open: true,
      message: 'Tasks copied successfully!',
      severity: 'success'
    });
    
    setDropTargetStaffId(null);
    setDropTargetDate(null);
  };
  
  const handleDragEnd = () => {
    setDragItem(null);
    setDropTargetStaffId(null);
    setDropTargetDate(null);
  };
  
  // Context menu handlers
  const handleContextMenu = (
    event: React.MouseEvent,
    staffId: string,
    date: string
  ) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX,
      mouseY: event.clientY,
      staffId,
      date
    });
  };
  
  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };
  
  const handleCopyDay = () => {
    if (!contextMenu) return;
    
    const { staffId, date } = contextMenu;
    const tasksToCopy = scheduleTasks.filter(
      task => task.staffId === staffId && task.date === date
    );
    
    setDragItem({
      staffId,
      date,
      tasks: tasksToCopy
    });
    
    // Show notification
    setNotification({
      open: true,
      message: 'Day copied! Click on another cell to paste.',
      severity: 'info'
    });
    
    handleCloseContextMenu();
  };
  
  const handlePasteDay = () => {
    if (!contextMenu || !dragItem) return;
    
    const { staffId, date } = contextMenu;
    
    // Clone tasks with new IDs, target staff ID, and target date
    const newTasks = dragItem.tasks.map(task => ({
      ...task,
      id: uuidv4(),
      staffId,
      date
    }));
    
    // Prevent assigning more than 8 hours per day when pasting
    const totalPasteHours = newTasks.reduce((sum, t) => sum + t.hours, 0);
    if (totalPasteHours > 8) {
      setNotification({
        open: true,
        message: 'Cannot assign more than 8 hours per day for a staff member',
        severity: 'error'
      });
      handleCloseContextMenu();
      return;
    }
    
    // Remove existing tasks for the target date and staff
    const filteredTasksPaste = scheduleTasks.filter(
      task => !(task.staffId === staffId && task.date === date)
    );
    
    // Add the new tasks
    const updatedTasks = [...filteredTasksPaste, ...newTasks];
    dispatch(setTasks(updatedTasks));
    
    // Show success notification
    setNotification({
      open: true,
      message: 'Tasks pasted successfully!',
      severity: 'success'
    });
    
    handleCloseContextMenu();
  };
  
  // Clear all assignments for a specific staff and date
  const handleClearDay = async () => {
    if (!contextMenu) return;
    const { staffId, date } = contextMenu;
    try {
      await axios.delete('/api/assignments/range', { data: { from: date, to: date, staffIds: [staffId] } });
      // Refresh calendar to load updated assignments
      window.dispatchEvent(new Event('refreshCalendar'));
      setNotification({ open: true, message: 'Day cleared successfully!', severity: 'success' });
    } catch (err) {
      console.error('Error clearing day assignments', err);
      setNotification({ open: true, message: 'Failed to clear day', severity: 'error' });
    }
    handleCloseContextMenu();
  };
  
  // Weekly assignment dialog handlers
  const handleWeeklyAssign = (staffId: string) => {
    setWeeklyAssignStaffId(staffId);
    setWeeklyAssignDialogOpen(true);
  };
  
  const handleCloseWeeklyDialog = () => {
    setWeeklyAssignDialogOpen(false);
    setWeeklyAssignStaffId('');
  };
  
  const applyWeeklyAssignment = async (projectName: string, hours: number[]) => {
    // Prevent any single-day assignment exceeding 8 hours
    if (hours.some(dayHours => dayHours > 8)) {
      setNotification({
        open: true,
        message: 'Cannot assign more than 8 hours per day for a staff member',
        severity: 'error'
      });
      handleCloseWeeklyDialog();
      return;
    }
    // Get the week dates and prepare to append assignments without overwriting existing ones
    const isoDateStrings = weekDates.map(date => formatDateISO(date));
    const newTasks: ScheduleTask[] = [];
    for (let i = 0; i < isoDateStrings.length; i++) {
      const dateStr = isoDateStrings[i];
      const dayHours = hours[i];
      // Skip days with 0 hours
      if (!dayHours) continue;
      // Sum existing hours for this staff on this date
      const existingHours = scheduleTasks
        .filter(task => task.staffId === weeklyAssignStaffId && task.date === dateStr)
        .reduce((sum, t) => sum + t.hours, 0);
      // Skip if already fully assigned
      if (existingHours >= 8) continue;
      // Determine hours to assign without exceeding daily limit
      const assignHours = Math.min(dayHours, 8 - existingHours);
      if (assignHours <= 0) continue;
      newTasks.push({
        id: uuidv4(),
        staffId: weeklyAssignStaffId,
        date: dateStr,
        taskType: projectName,
        hours: assignHours,
        projectId: projects.find(p => p.name === projectName)?.id
      });
    }
    // Persist new tasks to backend and reload updated schedule
    if (newTasks.length > 0) {
      try {
        // Send all assignments to server
        await Promise.all(newTasks.map(task =>
          axios.post('/api/assignments', {
            staffId: task.staffId,
            projectId: task.projectId,
            date: task.date,
            hours: task.hours
          })
        ));
        // Reload all assignments from backend for consistent state
        const allRes = await axios.get('/api/assignments');
        const allTasks: ScheduleTask[] = allRes.data.map((a: any) => ({
          id: a.id,
          staffId: a.staffId,
          date: a.date,
          taskType: a.projectName,
          hours: a.hours,
          projectId: a.projectId
        }));
        dispatch(setTasks(allTasks));
      } catch (err) {
        console.error('Error saving weekly assignments', err);
        setNotification({ open: true, message: 'Failed to apply weekly assignment', severity: 'error' });
        handleCloseWeeklyDialog();
        return;
      }
    } else {
      setNotification({
        open: true,
        message: 'No new assignments added; staff is fully booked or no hours specified for selected days',
        severity: 'info'
      });
      handleCloseWeeklyDialog();
      return;
    }
    // Show success notification
    setNotification({
      open: true,
      message: 'Weekly assignment applied successfully!',
      severity: 'success'
    });
    // Close the dialog
    handleCloseWeeklyDialog();
  };
  
  // Bulk assignment dialog handlers
  const openBulkAssignDialog = () => {
    setBulkAssignDialogOpen(true);
  };
  
  const closeBulkAssignDialog = () => {
    setBulkAssignDialogOpen(false);
  };
  
  const applyBulkAssignments = async (projectName: string, startDate: Date | null, staffHours: StaffHours[]) => {
    if (!startDate) return;
    
    // Remove staff with 0 hours
    const staffToAssign = staffHours.filter(staff => staff.hours > 0);
    
    // Calculate the working days (Monday to Friday)
    const workingDays: Date[] = [];
    const currentDate = new Date(startDate);
    
    // Assign hours based on availability
    const newTasks: ScheduleTask[] = [];
    
    for (const staff of staffToAssign) {
      let remainingHours = staff.hours;
      let dayIndex = 0;
      
      while (remainingHours > 0) {
        // Create a new date for this assignment day
        const assignmentDate = new Date(startDate);
        assignmentDate.setDate(startDate.getDate() + dayIndex);
        
        // Skip weekends
        const dayOfWeek = assignmentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          dayIndex++;
          continue;
        }
        
        // Calculate hours for this day (max 8 hours per day)
        const hoursForDay = Math.min(remainingHours, 8);
        
        // ISO date string
        const dateStr = formatDateISO(assignmentDate);
        
        // Create task
        newTasks.push({
          id: uuidv4(),
          staffId: staff.id,
          date: dateStr,
          taskType: projectName,
          hours: hoursForDay,
          projectId: projects.find(p => p.name === projectName)?.id
        });
        
        // Update remaining hours and day index
        remainingHours -= hoursForDay;
        dayIndex++;
      }
    }
    
    // Validate max 8 hours per day including existing assignments
    const addedHoursByStaffDate: Record<string, number> = {};
    newTasks.forEach(task => {
      const key = `${task.staffId}|${task.date}`;
      addedHoursByStaffDate[key] = (addedHoursByStaffDate[key] || 0) + task.hours;
    });
    for (const [key, added] of Object.entries(addedHoursByStaffDate)) {
      const [staffId, date] = key.split('|');
      const existingTotal = scheduleTasks
        .filter(t => t.staffId === staffId && t.date === date)
        .reduce((sum, t) => sum + t.hours, 0);
      if (existingTotal + added > 8) {
        const staffName = staffMembers.find(s => s.id === staffId)?.name || 'Staff member';
        setNotification({
          open: true,
          message: `Cannot assign more than 8 hours for ${staffName} on ${date}`,
          severity: 'error'
        });
        closeBulkAssignDialog();
        return;
      }
    }
    
    // Validate project budget constraint
    // Calculate total hours for this project including existing and new assignments
    const project = projects.find(p => p.name === projectName);
    if (project) {
      const projectId = project.id;
      const existingProjectHours = scheduleTasks
        .filter(t => t.projectId === projectId)
        .reduce((sum, t) => sum + t.hours, 0);
      const newProjectHours = newTasks
        .filter(t => t.projectId === projectId)
        .reduce((sum, t) => sum + t.hours, 0);
      if (existingProjectHours + newProjectHours > project.budget) {
        setNotification({
          open: true,
          message: `Cannot assign tasks: project budget of ${project.budget} hours for ${project.name} would be exceeded`,
          severity: 'error'
        });
        closeBulkAssignDialog();
        return;
      }
    }
    
    // Persist new tasks to backend
    try {
      const created = await Promise.all(newTasks.map(async task => {
        const res = await axios.post('/api/assignments', {
          staffId: task.staffId,
          projectId: task.projectId,
          date: task.date,
          hours: task.hours
        });
        return res.data;
      }));
      // Reload assignments from server
      const allRes = await axios.get('/api/assignments');
      const allTasks = allRes.data.map((a: any) => ({
        id: a.id,
        staffId: a.staffId,
        date: a.date,
        taskType: a.projectName,
        hours: a.hours,
        projectId: a.projectId
      }));
      dispatch(setTasks(allTasks));
      setNotification({
        open: true,
        message: 'Bulk assignment applied successfully!',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error saving bulk assignments', err);
      setNotification({
        open: true,
        message: 'Failed to apply bulk assignments',
        severity: 'error'
      });
    }
    // Close the dialog
    closeBulkAssignDialog();
  };
  
  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };
  
  return {
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
    handleFilterChange,
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
  };
}; 