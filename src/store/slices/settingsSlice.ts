import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface GlobalRules {
  maxHoursPerWeek: number;
  mandatoryDaysOff: string[]; // Array of dates in ISO format
  defaultWorkingHours: number;
  requireApprovalForLeave: boolean;
}

export interface ProjectRule {
  projectId: string;
  budgetLimit: number;
  budgetAlertThreshold: number;
  requiredSkills: string[];
  minimumStaffingLevel: number;
  maxAllocationByGrade: Record<string, number>; // Object mapping grade to max hours
}

export interface SystemPreferences {
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  fiscalYearStart: string; // Month-day format, e.g., "04-01" for April 1
  colorScheme: 'default' | 'highContrast' | 'colorblind';
  defaultView: 'day' | 'week' | 'month';
}

interface SettingsState {
  globalRules: GlobalRules;
  projectRules: ProjectRule[];
  systemPreferences: SystemPreferences;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  globalRules: {
    maxHoursPerWeek: 40,
    mandatoryDaysOff: [],
    defaultWorkingHours: 8,
    requireApprovalForLeave: false,
  },
  projectRules: [],
  systemPreferences: {
    dateFormat: 'DD/MM/YYYY',
    fiscalYearStart: '01-01',
    colorScheme: 'default',
    defaultView: 'week',
  },
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    updateGlobalRules: (state, action: PayloadAction<Partial<GlobalRules>>) => {
      state.globalRules = { ...state.globalRules, ...action.payload };
    },
    addProjectRule: (state, action: PayloadAction<ProjectRule>) => {
      // Replace if exists, otherwise add
      const index = state.projectRules.findIndex(
        (rule) => rule.projectId === action.payload.projectId
      );
      if (index !== -1) {
        state.projectRules[index] = action.payload;
      } else {
        state.projectRules.push(action.payload);
      }
    },
    updateProjectRule: (state, action: PayloadAction<{ projectId: string; updates: Partial<ProjectRule> }>) => {
      const { projectId, updates } = action.payload;
      const index = state.projectRules.findIndex(
        (rule) => rule.projectId === projectId
      );
      if (index !== -1) {
        state.projectRules[index] = { ...state.projectRules[index], ...updates };
      }
    },
    deleteProjectRule: (state, action: PayloadAction<string>) => {
      state.projectRules = state.projectRules.filter(
        (rule) => rule.projectId !== action.payload
      );
    },
    updateSystemPreferences: (state, action: PayloadAction<Partial<SystemPreferences>>) => {
      state.systemPreferences = { ...state.systemPreferences, ...action.payload };
    },
    resetToDefaults: (state) => {
      state.globalRules = initialState.globalRules;
      state.projectRules = initialState.projectRules;
      state.systemPreferences = initialState.systemPreferences;
    },
  },
});

export const {
  setLoading,
  setError,
  updateGlobalRules,
  addProjectRule,
  updateProjectRule,
  deleteProjectRule,
  updateSystemPreferences,
  resetToDefaults,
} = settingsSlice.actions;

export default settingsSlice.reducer; 