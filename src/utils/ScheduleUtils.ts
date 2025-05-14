import { ScheduleTask } from '../store/slices/scheduleSlice';

// Format date for display (e.g., "15 May")
export const formatDate = (date: Date): string => {
  return `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
};

// Format date as ISO string for storing (e.g., "2024-05-15")
export const formatDateISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Parse ISO date string to Date object
export const parseISODate = (dateString: string): Date => {
  return new Date(dateString);
};

// Get dates for current week, starting from Monday
export const getDatesForCurrentWeek = (startDate: Date): Date[] => {
  const dates = [];
  // Make sure we're working with a copy of the date
  const start = new Date(startDate);
  
  // Ensure startDate is a Monday
  const dayOfWeek = start.getDay(); // 0 is Sunday, 1 is Monday
  if (dayOfWeek !== 1) {
    // Adjust to Monday if it's not already Monday
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise adjust to the previous Monday
    start.setDate(start.getDate() + diff);
  }
  
  // Generate the 5 weekdays (Monday to Friday)
  for (let i = 0; i < 5; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date);
  }
  
  return dates;
};

// Check if a date is at the end date limit (May 31, 2026)
export const isAtEndDate = (currentStartDate: Date): boolean => {
  const endDateLimit = new Date(2026, 4, 31); // May 31, 2026
  const nextWeek = new Date(currentStartDate);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek > endDateLimit;
};

// Get background color based on task type and hours
export const getBackgroundColor = (
  tasks: ScheduleTask[]
): string => {
  if (!tasks || tasks.length === 0) {
    return '#FFFFFF';
  }
  
  const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
  
  // Check for leave
  const hasLeave = tasks.some(
    task => task.taskType === 'Annual Leave' || task.taskType === 'Sick Leave'
  );
  
  if (hasLeave) {
    return '#E0E0E0'; // Gray for leave
  }
  
  // Check if the person is available
  const isAvailable = tasks.every(task => task.taskType === 'Available');
  if (isAvailable) {
    return '#A5D6A7'; // Green for available
  }
  
  // Color based on hours assigned to projects
  if (totalHours <= 2) {
    return '#FFFDE7'; // Very light yellow
  } else if (totalHours <= 4) {
    return '#FFF9C4'; // Light yellow
  } else if (totalHours <= 6) {
    return '#FFF59D'; // Medium yellow
  } else if (totalHours <= 7) {
    return '#FFE082'; // Darker yellow
  } else {
    return '#FFA000'; // Orange for 8 hours
  }
};

// Generate text summary of tasks for a cell
export const getTaskText = (tasks: ScheduleTask[]): string => {
  if (!tasks || tasks.length === 0) {
    return 'No assignments';
  }
  
  // If there's a leave task, it typically overrides other tasks
  const leaveTask = tasks.find(
    task => task.taskType === 'Annual Leave' || task.taskType === 'Sick Leave'
  );
  
  if (leaveTask) {
    return leaveTask.taskType;
  }
  
  // Check if the person is available
  const isAvailable = tasks.every(task => task.taskType === 'Available');
  if (isAvailable) {
    return 'Available';
  }
  
  // Get project tasks
  const projectTasks = tasks.filter(task => 
    task.taskType !== 'Available' && 
    task.taskType !== 'Annual Leave' && 
    task.taskType !== 'Sick Leave'
  );
  
  if (projectTasks.length === 0) {
    return 'Available';
  }
  
  // Group the tasks by project
  const projectHours: Record<string, number> = {};
  
  for (const task of projectTasks) {
    if (projectHours[task.taskType]) {
      projectHours[task.taskType] += task.hours;
    } else {
      projectHours[task.taskType] = task.hours;
    }
  }
  
  // Format as "Project: X hrs, Project 2: Y hrs"
  const formattedTasks = Object.entries(projectHours)
    .map(([project, hours]) => `${project}: ${hours} hrs`)
    .join('\n');
  
  return formattedTasks;
};

// Gets total hours assigned to staff member in a week
export const getWeeklyHours = (
  staffId: string,
  weekDates: Date[],
  tasks: ScheduleTask[]
): number => {
  let totalHours = 0;
  
  for (const date of weekDates) {
    const dateString = formatDateISO(date);
    const dayTasks = tasks.filter(
      task => task.staffId === staffId && task.date === dateString
    );
    
    // Skip leave days
    const isLeave = dayTasks.some(
      task => task.taskType === 'Annual Leave' || task.taskType === 'Sick Leave'
    );
    
    if (!isLeave) {
      // Sum project hours (excluding 'Available')
      const projectHours = dayTasks
        .filter(task => 
          task.taskType !== 'Available' && 
          task.taskType !== 'Annual Leave' && 
          task.taskType !== 'Sick Leave'
        )
        .reduce((sum, task) => sum + task.hours, 0);
      
      totalHours += projectHours;
    }
  }
  
  return totalHours;
};

// Check if staff has any assignments (excluding 'Available')
export const hasAssignments = (
  staffId: string,
  date: string,
  tasks: ScheduleTask[]
): boolean => {
  const dayTasks = tasks.filter(
    task => task.staffId === staffId && task.date === date
  );
  
  return dayTasks.some(task => 
    task.taskType !== 'Available' && 
    task.taskType !== 'Annual Leave' && 
    task.taskType !== 'Sick Leave'
  );
}; 