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

const initialState: ScheduleState = {
  tasks: [],
  filteredTasks: [],
  loading: false,
  error: null,
  startDate: new Date().toISOString().split('T')[0], // Today's date as ISO string
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
    },
    addTask: (state, action: PayloadAction<ScheduleTask>) => {
      state.tasks.push(action.payload);
      state.filteredTasks = state.tasks;
    },
    updateTask: (state, action: PayloadAction<ScheduleTask>) => {
      const index = state.tasks.findIndex(
        (task) => task.id === action.payload.id
      );
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
      state.filteredTasks = state.tasks;
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(
        (task) => task.id !== action.payload
      );
      state.filteredTasks = state.tasks;
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
    },
    navigateWeek: (state, action: PayloadAction<'previous' | 'next'>) => {
      const currentDate = new Date(state.startDate);
      const dayOfWeek = currentDate.getDay();
      const daysToAdjust = action.payload === 'next' ? 7 : -7;
      
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + daysToAdjust);
      
      state.startDate = newDate.toISOString().split('T')[0];
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
} = scheduleSlice.actions;

export default scheduleSlice.reducer; 