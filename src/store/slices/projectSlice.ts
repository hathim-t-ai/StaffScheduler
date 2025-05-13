import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Project interface defines the structure of a project entity
 * @interface Project
 * @property {string} id - Unique identifier for the project
 * @property {string} name - Name of the project
 * @property {string} partnerName - Name of the partner responsible for the project
 * @property {string} teamLead - Name of the team lead assigned to the project
 * @property {number} budget - Budget allocated for the project
 * @property {any} [key: string] - Dynamic property for custom fields
 */
export interface Project {
  id: string;
  name: string;
  partnerName: string;
  teamLead: string;
  budget: number;
  [key: string]: any; // For custom fields
}

/**
 * ProjectState interface defines the structure of the project slice in Redux store
 * @interface ProjectState
 * @property {Project[]} projects - Array of all projects
 * @property {Project[]} filteredProjects - Array of projects filtered by search criteria
 * @property {boolean} loading - Loading state indicator
 * @property {string | null} error - Error message if any
 * @property {string[]} customFields - Array of custom field names added by the user
 */
interface ProjectState {
  projects: Project[];
  filteredProjects: Project[];
  loading: boolean;
  error: string | null;
  customFields: string[];
}

/**
 * Loads the project state from localStorage if available
 * @returns {ProjectState} The loaded state or a default empty state
 */
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

/**
 * Saves the current project state to localStorage
 * @param {ProjectState} state - The current project state to save
 */
const saveState = (state: ProjectState) => {
  try {
    localStorage.setItem('projectData', JSON.stringify(state));
  } catch (e) {
    console.error('Error saving project state to localStorage:', e);
  }
};

// Initialize state from localStorage or use empty default
const initialState: ProjectState = loadState();

/**
 * Project Redux Slice
 * 
 * Manages the state for projects including CRUD operations,
 * filtering, custom fields, and persistence to localStorage.
 */
const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    /**
     * Set the loading state
     * @param {ProjectState} state - Current state
     * @param {PayloadAction<boolean>} action - Action with boolean payload
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      saveState(state);
    },
    
    /**
     * Set the error state
     * @param {ProjectState} state - Current state
     * @param {PayloadAction<string | null>} action - Action with error message payload
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      saveState(state);
    },
    
    /**
     * Set/replace all projects
     * @param {ProjectState} state - Current state
     * @param {PayloadAction<Project[]>} action - Action with projects array payload
     */
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
      state.filteredProjects = action.payload;
      saveState(state);
    },
    
    /**
     * Add a new project
     * @param {ProjectState} state - Current state
     * @param {PayloadAction<Project>} action - Action with project payload
     */
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects.push(action.payload);
      state.filteredProjects = state.projects;
      saveState(state);
    },
    
    /**
     * Update an existing project
     * @param {ProjectState} state - Current state
     * @param {PayloadAction<Project>} action - Action with updated project payload
     */
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
    
    /**
     * Delete a project by ID
     * @param {ProjectState} state - Current state
     * @param {PayloadAction<string>} action - Action with project ID to delete
     */
    deleteProject: (state, action: PayloadAction<string>) => {
      state.projects = state.projects.filter(
        (project) => project.id !== action.payload
      );
      state.filteredProjects = state.projects;
      saveState(state);
    },
    
    /**
     * Filter projects based on search criteria
     * @param {ProjectState} state - Current state
     * @param {PayloadAction<Partial<Project>>} action - Action with filter criteria
     */
    filterProjects: (state, action: PayloadAction<Partial<Project>>) => {
      const filters = action.payload;
      state.filteredProjects = state.projects.filter((project) => {
        return Object.keys(filters).every((key) => {
          // Skip empty filter criteria
          if (filters[key] === undefined || filters[key] === '') return true;
          
          // Case-insensitive string comparison
          if (typeof project[key] === 'string') {
            return project[key].toLowerCase().includes((filters[key] as string).toLowerCase());
          }
          
          // Exact match for non-string fields
          return project[key] === filters[key];
        });
      });
      // No need to save filtered state to localStorage as it's derived
    },
    
    /**
     * Add a custom field to the project schema
     * @param {ProjectState} state - Current state
     * @param {PayloadAction<string>} action - Action with field name payload
     */
    addCustomField: (state, action: PayloadAction<string>) => {
      if (!state.customFields.includes(action.payload)) {
        state.customFields.push(action.payload);
        saveState(state);
      }
    },
    
    /**
     * Remove a custom field from the project schema
     * @param {ProjectState} state - Current state
     * @param {PayloadAction<string>} action - Action with field name to remove
     */
    removeCustomField: (state, action: PayloadAction<string>) => {
      state.customFields = state.customFields.filter(field => field !== action.payload);
      saveState(state);
    },
  },
});

// Export actions for use in components
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