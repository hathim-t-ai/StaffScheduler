import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface StaffMember {
  id: string;
  name: string;
  grade: string;
  department: string;
  city: string;
  country: string;
  skills: string[];
  [key: string]: any; // For custom fields
}

interface StaffState {
  staffMembers: StaffMember[];
  filteredStaffMembers: StaffMember[];
  loading: boolean;
  error: string | null;
  customFields: string[];
}

// Load initial state from localStorage if available
const loadState = (): StaffState => {
  try {
    const savedState = localStorage.getItem('staffData');
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (e) {
    console.error('Error loading state from localStorage:', e);
  }
  return {
    staffMembers: [],
    filteredStaffMembers: [],
    loading: false,
    error: null,
    customFields: [],
  };
};

// Helper function to save state to localStorage
const saveState = (state: StaffState) => {
  try {
    localStorage.setItem('staffData', JSON.stringify(state));
  } catch (e) {
    console.error('Error saving state to localStorage:', e);
  }
};

const initialState: StaffState = loadState();

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      saveState(state);
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      saveState(state);
    },
    setStaffMembers: (state, action: PayloadAction<StaffMember[]>) => {
      state.staffMembers = action.payload;
      state.filteredStaffMembers = action.payload;
      saveState(state);
    },
    addStaffMember: (state, action: PayloadAction<StaffMember>) => {
      state.staffMembers.push(action.payload);
      state.filteredStaffMembers = state.staffMembers;
      saveState(state);
    },
    updateStaffMember: (state, action: PayloadAction<StaffMember>) => {
      const index = state.staffMembers.findIndex(
        (member) => member.id === action.payload.id
      );
      if (index !== -1) {
        state.staffMembers[index] = action.payload;
      }
      state.filteredStaffMembers = state.staffMembers;
      saveState(state);
    },
    deleteStaffMember: (state, action: PayloadAction<string>) => {
      state.staffMembers = state.staffMembers.filter(
        (member) => member.id !== action.payload
      );
      state.filteredStaffMembers = state.staffMembers;
      saveState(state);
    },
    filterStaffMembers: (state, action: PayloadAction<Partial<StaffMember>>) => {
      const filters = action.payload;
      state.filteredStaffMembers = state.staffMembers.filter((member) => {
        return Object.keys(filters).every((key) => {
          if (key === 'skills' && Array.isArray(filters.skills) && filters.skills.length > 0) {
            return filters.skills.every((skill) => member.skills.includes(skill));
          }
          if (filters[key] === undefined || filters[key] === '') return true;
          return member[key].toLowerCase().includes((filters[key] as string).toLowerCase());
        });
      });
      // No need to save filtered state
    },
    addCustomField: (state, action: PayloadAction<string>) => {
      if (!state.customFields.includes(action.payload)) {
        state.customFields.push(action.payload);
        saveState(state);
      }
    },
    removeCustomField: (state, action: PayloadAction<string>) => {
      state.customFields = state.customFields.filter(field => field !== action.payload);
      saveState(state);
    },
  },
});

export const {
  setLoading,
  setError,
  setStaffMembers,
  addStaffMember,
  updateStaffMember,
  deleteStaffMember,
  filterStaffMembers,
  addCustomField,
  removeCustomField,
} = staffSlice.actions;

export default staffSlice.reducer; 