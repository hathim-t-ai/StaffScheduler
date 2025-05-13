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

const initialState: ProjectState = {
  projects: [],
  filteredProjects: [],
  loading: false,
  error: null,
  customFields: [],
};

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
      state.filteredProjects = action.payload;
    },
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.push(action.payload);
      state.filteredProjects = state.projects;
    },
    updateProject: (state, action: PayloadAction<Project>) => {
      const index = state.projects.findIndex(
        (project) => project.id === action.payload.id
      );
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
      state.filteredProjects = state.projects;
    },
    deleteProject: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter(
        (project) => project.id !== action.payload
      );
      state.filteredProjects = state.projects;
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
  setProjects,
  addProject,
  updateProject,
  deleteProject,
  filterProjects,
  addCustomField,
  removeCustomField,
} = projectSlice.actions;

export default projectSlice.reducer; 