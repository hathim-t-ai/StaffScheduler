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

// Helper function to normalize skills to array format
const normalizeSkills = (skills: unknown): string[] => {
  // If it's already an array, just return it
  if (Array.isArray(skills)) {
    return skills.map(skill => String(skill).trim()).filter(Boolean);
  }
  
  // If it's undefined or null, return empty array
  if (skills === undefined || skills === null) {
    return [];
  }
  
  // If it's a string, split by commas
  if (typeof skills === 'string') {
    return skills.split(',').map(s => s.trim()).filter(Boolean);
  }
  
  // If it's a stringified JSON array, parse it
  if (typeof skills === 'string') {
    try {
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) {
        return parsed.map(s => String(s).trim()).filter(Boolean);
      }
    } catch (e) {
      // Not a JSON string, continue with other methods
    }
  }
  
  // If it's an object, try to get values
  if (typeof skills === 'object' && skills !== null) {
    try {
      const values = Object.values(skills);
      return values.map(v => String(v).trim()).filter(Boolean);
    } catch (e) {
      // Failed to get values
    }
  }
  
  // Last resort: convert to string and check if it should be split
  try {
    const str = String(skills).trim();
    if (str.includes(',')) {
      return str.split(',').map(s => s.trim()).filter(Boolean);
    }
    return str ? [str] : [];
  } catch (e) {
    return [];
  }
};

// Load initial state from localStorage if available
const loadState = (): StaffState => {
  try {
    const savedState = localStorage.getItem('staffData');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      
      // Ensure skills are always arrays, not strings
      if (parsedState.staffMembers) {
        parsedState.staffMembers = parsedState.staffMembers.map((staff: Record<string, any>) => ({
          ...staff,
          skills: normalizeSkills(staff.skills)
        }));
      }
      
      if (parsedState.filteredStaffMembers) {
        parsedState.filteredStaffMembers = parsedState.filteredStaffMembers.map((staff: Record<string, any>) => ({
          ...staff,
          skills: normalizeSkills(staff.skills)
        }));
      }
      
      return parsedState;
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
    // Make sure all skills arrays are properly formatted before saving
    const stateCopy = {
      ...state,
      staffMembers: state.staffMembers.map(staff => ({
        ...staff,
        skills: Array.isArray(staff.skills) ? staff.skills : []
      })),
      filteredStaffMembers: state.filteredStaffMembers.map(staff => ({
        ...staff,
        skills: Array.isArray(staff.skills) ? staff.skills : []
      }))
    };
    
    localStorage.setItem('staffData', JSON.stringify(stateCopy));
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
      // Ensure skills are arrays before setting
      state.staffMembers = action.payload.map(staff => ({
        ...staff,
        skills: normalizeSkills(staff.skills)
      }));
      state.filteredStaffMembers = state.staffMembers;
      saveState(state);
    },
    addStaffMember: (state, action: PayloadAction<StaffMember>) => {
      // Ensure skills is an array
      const staffWithArraySkills = {
        ...action.payload,
        skills: normalizeSkills(action.payload.skills)
      };
      
      state.staffMembers.push(staffWithArraySkills);
      state.filteredStaffMembers = state.staffMembers;
      saveState(state);
    },
    updateStaffMember: (state, action: PayloadAction<StaffMember>) => {
      const index = state.staffMembers.findIndex(
        (member) => member.id === action.payload.id
      );
      if (index !== -1) {
        // Ensure skills is an array
        state.staffMembers[index] = {
          ...action.payload,
          skills: normalizeSkills(action.payload.skills)
        };
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