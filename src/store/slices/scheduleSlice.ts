import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { createClient } from '@supabase/supabase-js';

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

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Load schedule data from Supabase
const loadScheduleData = async (): Promise<Pick<ScheduleState, 'tasks' | 'startDate'>> => {
  try {
    const { data, error } = await supabase
      .from('assignments')
      .select('*');
    
    if (error) {
      console.error('Error loading schedule data from Supabase', error);
      return {
        tasks: [],
        startDate: new Date().toISOString().split('T')[0]
      };
    }
    
    return {
      tasks: data,
      startDate: new Date().toISOString().split('T')[0]
    };
  } catch (error) {
    console.error('Error loading schedule data from Supabase', error);
    return {
      tasks: [],
      startDate: new Date().toISOString().split('T')[0]
    };
  }
};

// Load saved data
const savedData = await loadScheduleData();

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
      
      // Save to Supabase
      supabase.from('assignments').upsert(action.payload);
    },
    addTask: (state, action: PayloadAction<ScheduleTask>) => {
      state.tasks.push(action.payload);
      state.filteredTasks = state.tasks;
      
      // Save to Supabase
      supabase.from('assignments').insert([action.payload]);
    },
    updateTask: (state, action: PayloadAction<ScheduleTask>) => {
      const index = state.tasks.findIndex(
        (task) => task.id === action.payload.id
      );
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
      state.filteredTasks = state.tasks;
      
      // Save to Supabase
      supabase.from('assignments').update(action.payload).eq('id', action.payload.id);
    },
    deleteTask: (state, action: PayloadAction<string>) => {
      state.tasks = state.tasks.filter(
        (task) => task.id !== action.payload
      );
      state.filteredTasks = state.tasks;
      
      // Save to Supabase
      supabase.from('assignments').delete().eq('id', action.payload);
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
      
      const newStartDate = newDate.toISOString().split('T')[0];
      state.startDate = newStartDate;
    },
    clearSchedule: (state) => {
      state.tasks = [];
      state.filteredTasks = [];
      
      // Clear from Supabase
      supabase.from('assignments').delete().neq('id', '');
    },
    clearScheduleForStaff: (state, action: PayloadAction<string[]>) => {
      const staffIdsToClear = action.payload;
      state.tasks = state.tasks.filter(task => !staffIdsToClear.includes(task.staffId));
      state.filteredTasks = state.tasks;
      
      // Save updated tasks to Supabase
      supabase.from('assignments').delete().in('staff_id', staffIdsToClear);
    },
    removeRange: (state, action: PayloadAction<{ from: string; to: string }>) => {
      const { from, to } = action.payload;
      state.tasks = state.tasks.filter(task => {
        const d = new Date(task.date);
        return d < new Date(from) || d > new Date(to);
      });
      state.filteredTasks = state.tasks;
      
      // Save updated tasks to Supabase
      supabase.from('assignments').delete().gte('date', from).lte('date', to);
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