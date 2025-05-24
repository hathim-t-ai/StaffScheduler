import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ScheduleTask {
  id: string;
  staffId: string;
  date: string;
  taskType: 'Available' | 'Annual Leave' | 'Sick Leave' | string; // Can be project name
  hours: number;
  projectId?: string; // Present only for project assignments
}

interface ScheduleState {
  tasks: ScheduleTask[];
  filteredTasks: ScheduleTask[];
  loading: boolean;
  error: string | null;
  startDate: string; // Current week's start date
}

// Load schedule data from localStorage
const loadScheduleData = (): Pick<ScheduleState, 'tasks' | 'startDate'> => {
  try {
    const storedTasks = localStorage.getItem('scheduleTasks');
    const storedStartDate = localStorage.getItem('scheduleStartDate');
    
    return {
      tasks: storedTasks ? JSON.parse(storedTasks) : [],
      startDate: storedStartDate || new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Error loading schedule data from localStorage', error);
    return {
      tasks: [],
      startDate: new Date().toISOString().split('T')[0]
    };
  }
};

// Load saved data
const savedData = loadScheduleData();

const initialState: ScheduleState = {
  tasks: savedData.tasks,
  filteredTasks: savedData.tasks,
  loading: false,
  error: null,
  startDate: savedData.startDate,
};

const scheduleSlice = createSlice({
  name: 'schedule',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setTasks: (state, action: PayloadAction<ScheduleTask[]>) => {
      state.tasks = action.payload;
      state.filteredTasks = action.payload;
      
      // Save to localStorage
      localStorage.setItem('scheduleTasks', JSON.stringify(action.payload));
    },
    addTask: (state, action: PayloadAction<ScheduleTask>) => {
      state.tasks.push(action.payload);
      state.filteredTasks = state.tasks;
      
      // Save to localStorage
      localStorage.setItem('scheduleTasks', JSON.stringify(state.tasks));
    },
    updateTask: (state, action: PayloadAction<ScheduleTask>) => {
      const index = state.tasks.findIndex(
        (task) => task.id === action.payload.id
      );
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
      state.filteredTasks = state.tasks;
      
      // Save to localStorage
      localStorage.setItem('scheduleTasks', JSON.stringify(state.tasks));
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(
        (task) => task.id !== action.payload
      );
      state.filteredTasks = state.tasks;
      
      // Save to localStorage
      localStorage.setItem('scheduleTasks', JSON.stringify(state.tasks));
    },
    filterTasksByStaff: (state, action: PayloadAction<string[]>) => {
      const staffIds = action.payload;
      state.filteredTasks = state.tasks.filter((task) => 
        staffIds.includes(task.staffId)
      );
    },
    filterTasksByDateRange: (state, action: PayloadAction<{ start: string; end: string }>) => {
      const { start, end } = action.payload;
      state.filteredTasks = state.tasks.filter((task) => 
        task.date >= start && task.date <= end
      );
    },
    setStartDate: (state, action: PayloadAction<string>) => {
      state.startDate = action.payload;
      
      // Save to localStorage
      localStorage.setItem('scheduleStartDate', action.payload);
    },
    navigateWeek: (state, action: PayloadAction<'previous' | 'next'>) => {
      const currentDate = new Date(state.startDate);
      const dayOfWeek = currentDate.getDay();
      const daysToAdjust = action.payload === 'next' ? 7 : -7;
      
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + daysToAdjust);
      
      const newStartDate = newDate.toISOString().split('T')[0];
      state.startDate = newStartDate;
      
      // Save to localStorage
      localStorage.setItem('scheduleStartDate', newStartDate);
    },
    clearSchedule: (state) => {
      state.tasks = [];
      state.filteredTasks = [];
      
      // Clear from localStorage
      localStorage.removeItem('scheduleTasks');
    },
    clearScheduleForStaff: (state, action: PayloadAction<string[]>) => {
      const staffIdsToClear = action.payload;
      state.tasks = state.tasks.filter(task => !staffIdsToClear.includes(task.staffId));
      state.filteredTasks = state.tasks;
      // Save updated tasks to localStorage
      localStorage.setItem('scheduleTasks', JSON.stringify(state.tasks));
    },
    removeRange: (state, action: PayloadAction<{ from: string; to: string }>) => {
      const { from, to } = action.payload;
      state.tasks = state.tasks.filter(task => {
        const d = new Date(task.date);
        return d < new Date(from) || d > new Date(to);
      });
      state.filteredTasks = state.tasks;
      // Save updated tasks to localStorage
      localStorage.setItem('scheduleTasks', JSON.stringify(state.tasks));
    },
  },
});

export const {
  setLoading,
  setError,
  setTasks,
  addTask,
  updateTask,
  deleteTask,
  filterTasksByStaff,
  filterTasksByDateRange,
  setStartDate,
  navigateWeek,
  clearSchedule,
  clearScheduleForStaff,
  removeRange,
} = scheduleSlice.actions;

export default scheduleSlice.reducer; 