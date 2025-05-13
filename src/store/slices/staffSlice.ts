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

const initialState: StaffState = {
  staffMembers: [],
  filteredStaffMembers: [],
  loading: false,
  error: null,
  customFields: [],
};

const staffSlice = createSlice({
  name: 'staff',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setStaffMembers: (state, action: PayloadAction<StaffMember[]>) => {
      state.staffMembers = action.payload;
      state.filteredStaffMembers = action.payload;
    },
    addStaffMember: (state, action: PayloadAction<StaffMember>) => {
      state.staffMembers.push(action.payload);
      state.filteredStaffMembers = state.staffMembers;
    },
    updateStaffMember: (state, action: PayloadAction<StaffMember>) => {
      const index = state.staffMembers.findIndex(
        (member) => member.id === action.payload.id
      );
      if (index !== -1) {
        state.staffMembers[index] = action.payload;
      }
      state.filteredStaffMembers = state.staffMembers;
    },
    deleteStaffMember: (state, action: PayloadAction<string>) => {
      state.staffMembers = state.staffMembers.filter(
        (member) => member.id !== action.payload
      );
      state.filteredStaffMembers = state.staffMembers;
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
    },
    addCustomField: (state, action: PayloadAction<string>) => {
      if (!state.customFields.includes(action.payload)) {
        state.customFields.push(action.payload);
      }
    },
    removeCustomField: (state, action: PayloadAction<string>) => {
      state.customFields = state.customFields.filter(field => field !== action.payload);
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