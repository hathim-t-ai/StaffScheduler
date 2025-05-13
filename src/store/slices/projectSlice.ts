import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Project {
  id: string;
  name: string;
  partnerName: string;
  teamLead: string;
  budget: number;
  [key: string]: any; // For custom fields
}

interface ProjectState {
  projects: Project[];
  filteredProjects: Project[];
  loading: boolean;
  error: string | null;
  customFields: string[];
}

// Load initial state from localStorage if available
const loadState = (): ProjectState => {
  try {
    const savedState = localStorage.getItem('projectData');
    if (savedState) {
      return JSON.parse(savedState);
    }
  } catch (e) {
    console.error('Error loading project state from localStorage:', e);
  }
  return {
    projects: [],
    filteredProjects: [],
    loading: false,
    error: null,
    customFields: [],
  };
};

// Helper function to save state to localStorage
const saveState = (state: ProjectState) => {
  try {
    localStorage.setItem('projectData', JSON.stringify(state));
  } catch (e) {
    console.error('Error saving project state to localStorage:', e);
  }
};

const initialState: ProjectState = loadState();

const projectSlice = createSlice({
  name: 'projects',
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
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
      state.filteredProjects = action.payload;
      saveState(state);
    },
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.push(action.payload);
      state.filteredProjects = state.projects;
      saveState(state);
    },
    updateProject: (state, action: PayloadAction<Project>) => {
      const index = state.projects.findIndex(
        (project) => project.id === action.payload.id
      );
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
      state.filteredProjects = state.projects;
      saveState(state);
    },
    deleteProject: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter(
        (project) => project.id !== action.payload
      );
      state.filteredProjects = state.projects;
      saveState(state);
    },
    filterProjects: (state, action: PayloadAction<Partial<Project>>) => {
      const filters = action.payload;
      state.filteredProjects = state.projects.filter((project) => {
        return Object.keys(filters).every((key) => {
          if (filters[key] === undefined || filters[key] === '') return true;
          if (typeof project[key] === 'string') {
            return project[key].toLowerCase().includes((filters[key] as string).toLowerCase());
          }
          return project[key] === filters[key];
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
  setProjects,
  addProject,
  updateProject,
  deleteProject,
  filterProjects,
  addCustomField,
  removeCustomField,
} = projectSlice.actions;

export default projectSlice.reducer; 