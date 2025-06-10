import { useState, useEffect } from 'react';

import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';

import { ColumnDefinition } from '../components/DataTable';
import { RootState } from '../store';
import {
  Project,
  addProject,
  addCustomField as addProjectCustomField,
  removeCustomField as removeProjectCustomField,
  deleteProject,
  setProjects,
  updateProject
} from '../store/slices/projectSlice';
import { 
  StaffMember, 
  addStaffMember, 
  addCustomField as addStaffCustomField,
  removeCustomField as removeStaffCustomField,
  deleteStaffMember,
  setStaffMembers,
  updateStaffMember
} from '../store/slices/staffSlice';

export type SnackbarState = {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
};

export type DeleteStaffConfirmationState = {
  open: boolean;
  staffId: string;
  staffName: string;
};

export type DeleteProjectConfirmationState = {
  open: boolean;
  projectId: string;
  projectName: string;
};

export const useAddPageManager = () => {
  // Tab state (persist across page refresh)
  const [tabValue, setTabValue] = useState<number>(() => {
    const saved = localStorage.getItem('addPageTab');
    return saved !== null ? parseInt(saved, 10) : 0;
  });
  
  // Staff state
  const [openAddStaffForm, setOpenAddStaffForm] = useState(false);
  const [openImportStaffModal, setOpenImportStaffModal] = useState(false);
  
  // Project state
  const [openAddProjectForm, setOpenAddProjectForm] = useState(false);
  const [openImportProjectModal, setOpenImportProjectModal] = useState(false);
  
  // Common state
  const [openAddColumnModal, setOpenAddColumnModal] = useState(false);
  
  // Delete confirmation dialogs
  const [deleteStaffConfirmation, setDeleteStaffConfirmation] = useState<DeleteStaffConfirmationState>({
    open: false,
    staffId: '',
    staffName: ''
  });
  
  const [deleteProjectConfirmation, setDeleteProjectConfirmation] = useState<DeleteProjectConfirmationState>({
    open: false,
    projectId: '',
    projectName: ''
  });
  
  // Notification state
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Redux
  const dispatch = useDispatch();
  const { staffMembers, customFields: staffCustomFields } = useSelector((state: RootState) => state.staff);
  const { projects, customFields: projectCustomFields } = useSelector((state: RootState) => state.projects);

  // Editing state
  const [editStaffMember, setEditStaffMember] = useState<StaffMember | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);

  // Load initial staff and project data from backend
  useEffect(() => {
    const loadData = async () => {
      try {
        const [staffRes, projRes] = await Promise.all([
          axios.get('/api/staff'),
          axios.get('/api/projects'),
        ]);
        dispatch(setStaffMembers(staffRes.data));
        dispatch(setProjects(projRes.data));
      } catch (err) {
        console.error('Error loading initial data', err);
      }
    };
    loadData();
  }, [dispatch]);

  /**
   * Handles tab change between People and Projects
   * @param {React.SyntheticEvent} event - The tab change event
   * @param {number} newValue - Index of the newly selected tab
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    localStorage.setItem('addPageTab', newValue.toString());
  };

  /**
   * Adds a new staff member to the store and backend
   * @param {StaffMember} newStaffMember - Staff member to add
   */
  const handleAddStaffMember = async (newStaffMember: StaffMember) => {
    try {
      const res = await axios.post('/api/staff', newStaffMember);
      dispatch(addStaffMember(res.data));
      setSnackbar({ open: true, message: 'Staff member added successfully', severity: 'success' });
    } catch (err: any) {
      console.error('Error adding staff', err);
      let errorMessage = 'Failed to add staff member';
      
      if (err.response?.status === 409 && err.response?.data?.error === 'Duplicate staff member') {
        errorMessage = err.response.data.message || 'This staff member already exists';
      } else if (err.response?.data?.error === 'Validation failed' && err.response?.data?.details) {
        errorMessage = `Validation failed: ${err.response.data.details.join(', ')}`;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  /**
   * Imports multiple staff members by sending to backend and reloading list
   * Handles merging with existing data on the server
   */
  const handleImportStaff = async (newStaffMembers: StaffMember[]) => {
    try {
      // Bulk import staff members
      const rows = newStaffMembers.map(ns => ({
        name: ns.name || '',
        grade: ns.grade || '',
        department: ns.department || '',
        city: ns.city || '',
        country: ns.country || '',
        skills: Array.isArray(ns.skills) ? ns.skills.join(',') : (ns.skills || '')
      }));
      const response = await axios.post('/api/staff/bulk', rows);
      
      // Handle the new response format with duplicate detection
      const data = response.data;
      
      // Reload full staff list
      const res = await axios.get('/api/staff');
      dispatch(setStaffMembers(res.data));
      
      // Create detailed success message
      let message = `Successfully imported ${data.summary.inserted} staff member${data.summary.inserted !== 1 ? 's' : ''}`;
      let severity: 'success' | 'warning' = 'success';
      
      if (data.summary.duplicatesSkipped > 0) {
        message += `, skipped ${data.summary.duplicatesSkipped} duplicate${data.summary.duplicatesSkipped !== 1 ? 's' : ''}`;
        severity = 'warning';
      }
      
      setSnackbar({ open: true, message, severity });
    } catch (err: any) {
      console.error('Error importing staff', err);
      let errorMessage = 'Failed to import staff members';
      
      if (err.response?.data?.error === 'Validation failed' && err.response?.data?.details) {
        errorMessage = `Import failed: Validation errors found`;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  /**
   * Initiates the staff deletion process by opening a confirmation dialog
   * @param {string} staffId - ID of the staff member to delete
   */
  const handleDeleteStaffRow = (staffId: string) => {
    // Find the staff member to get their name for the confirmation dialog
    const staffMember = staffMembers.find(staff => staff.id === staffId);
    
    if (staffMember) {
      setDeleteStaffConfirmation({
        open: true,
        staffId,
        staffName: staffMember.name
      });
    }
  };

  /**
   * Completes the staff deletion after confirmation
   */
  const confirmDeleteStaff = async () => {
    try {
      await axios.delete(`/api/staff/${deleteStaffConfirmation.staffId}`);
      dispatch(deleteStaffMember(deleteStaffConfirmation.staffId));
      setSnackbar({ open: true, message: `${deleteStaffConfirmation.staffName} was deleted successfully`, severity: 'success' });
    } catch (err) {
      console.error('Error deleting staff', err);
      setSnackbar({ open: true, message: 'Failed to delete staff member', severity: 'error' });
    }
    setDeleteStaffConfirmation({ open: false, staffId: '', staffName: '' });
  };

  /**
   * Adds a new project to the store and backend
   * @param {Project} newProject - Project to add
   */
  const handleAddProject = async (newProject: Project) => {
    try {
      const res = await axios.post('/api/projects', newProject);
      dispatch(addProject(res.data));
      
      // Dispatch custom event to notify other pages about the new project
      window.dispatchEvent(new CustomEvent('projectAdded', { 
        detail: { newProject: res.data } 
      }));
      
      setSnackbar({ open: true, message: 'Project added successfully', severity: 'success' });
    } catch (err: any) {
      console.error('Error adding project', err);
      let errorMessage = 'Failed to add project';
      
      if (err.response?.status === 409 && err.response?.data?.error === 'Duplicate project') {
        errorMessage = err.response.data.message || 'This project already exists';
      } else if (err.response?.data?.error === 'Validation failed' && err.response?.data?.details) {
        errorMessage = `Validation failed: ${err.response.data.details.join(', ')}`;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  /**
   * Imports multiple projects by sending to backend and reloading list
   */
  const handleImportProjects = async (newProjects: Project[]) => {
    try {
      // Bulk import projects
      const rows = newProjects.map(np => ({
        name: np.name || '',
        description: np.description || '',
        partnerName: np.partnerName || '',
        teamLead: np.teamLead || '',
        budget: np.budget || 0
      }));
      const response = await axios.post('/api/projects/bulk', rows);
      
      // Handle the new response format with duplicate detection
      const data = response.data;
      
      // Reload full projects list
      const res = await axios.get('/api/projects');
      dispatch(setProjects(res.data));
      
      // Create detailed success message
      let message = `Successfully imported ${data.summary.inserted} project${data.summary.inserted !== 1 ? 's' : ''}`;
      let severity: 'success' | 'warning' = 'success';
      
      if (data.summary.duplicatesSkipped > 0) {
        message += `, skipped ${data.summary.duplicatesSkipped} duplicate${data.summary.duplicatesSkipped !== 1 ? 's' : ''}`;
        severity = 'warning';
      }
      
      setSnackbar({ open: true, message, severity });
    } catch (err: any) {
      console.error('Error importing projects', err);
      let errorMessage = 'Failed to import projects';
      
      if (err.response?.data?.error === 'Validation failed' && err.response?.data?.details) {
        errorMessage = `Import failed: Validation errors found`;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  /**
   * Initiates the project deletion process by opening a confirmation dialog
   * @param {string} projectId - ID of the project to delete
   */
  const handleDeleteProjectRow = (projectId: string) => {
    // Find the project to get its name for the confirmation dialog
    const project = projects.find(p => p.id === projectId);
    
    if (project) {
      setDeleteProjectConfirmation({
        open: true,
        projectId,
        projectName: project.name
      });
    }
  };

  /**
   * Completes the project deletion after confirmation
   */
  const confirmDeleteProject = async () => {
    try {
      await axios.delete(`/api/projects/${deleteProjectConfirmation.projectId}`);
      dispatch(deleteProject(deleteProjectConfirmation.projectId));
      setSnackbar({ open: true, message: `${deleteProjectConfirmation.projectName} was deleted successfully`, severity: 'success' });
    } catch (err) {
      console.error('Error deleting project', err);
      setSnackbar({ open: true, message: 'Failed to delete project', severity: 'error' });
    }
    setDeleteProjectConfirmation({ open: false, projectId: '', projectName: '' });
  };

  /**
   * Adds a custom column to either staff or project data
   * Based on the active tab, dispatches the appropriate action
   * @param {string} columnName - Name of the column to add
   * @param {string} dataType - Data type of the column
   */
  const handleAddColumn = (columnName: string, dataType: string) => {
    // Remove spaces and convert to camelCase
    const formattedName = columnName
      .trim()
      .replace(/\s+(.)/g, match => match.trim().toUpperCase())
      .replace(/\s/g, '')
      .replace(/^(.)/, match => match.toLowerCase());
    
    if (tabValue === 0) {
      // Staff tab - add staff custom field
      dispatch(addStaffCustomField(formattedName));
    } else {
      // Project tab - add project custom field
      dispatch(addProjectCustomField(formattedName));
    }
    
    setSnackbar({
      open: true,
      message: `${columnName} column added successfully`,
      severity: 'success'
    });
  };

  /**
   * Deletes a custom column from staff data
   * @param {string} columnName - Name of the column to delete
   */
  const handleDeleteStaffColumn = (columnName: string) => {
    dispatch(removeStaffCustomField(columnName));
    
    setSnackbar({
      open: true,
      message: `${columnName} column removed from staff data`,
      severity: 'success'
    });
  };

  /**
   * Deletes a custom column from project data
   * @param {string} columnName - Name of the column to delete
   */
  const handleDeleteProjectColumn = (columnName: string) => {
    dispatch(removeProjectCustomField(columnName));
    
    setSnackbar({
      open: true,
      message: `${columnName} column removed from project data`,
      severity: 'success'
    });
  };

  /**
   * Closes the notification snackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  /**
   * Generates the column definitions for staff data table
   * Includes standard columns and any custom fields
   * @returns {ColumnDefinition[]} Array of column definitions
   */
  const getStaffColumns = (): ColumnDefinition[] => {
    // Base columns for staff members (always present)
    const baseColumns: ColumnDefinition[] = [
      { field: 'name', headerName: 'Name', width: 180 },
      { field: 'grade', headerName: 'Grade', width: 100 },
      { field: 'department', headerName: 'Department', width: 150 },
      { field: 'city', headerName: 'City', width: 120 },
      { field: 'country', headerName: 'Country', width: 120 },
      { field: 'email', headerName: 'Email', width: 200 },
      {
        field: 'skills',
        headerName: 'Skills',
        width: 200
      }
    ];
    
    // Custom columns
    const customColumns = staffCustomFields.map(field => ({
      field,
      headerName: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
      width: 150,
      editable: true,
      isCustom: true
    }));
    
    return [...baseColumns, ...customColumns];
  };

  /**
   * Generates the column definitions for project data table
   * Includes standard columns and any custom fields
   * @returns {ColumnDefinition[]} Array of column definitions
   */
  const getProjectColumns = (): ColumnDefinition[] => {
    // Base columns for projects (always present)
    const baseColumns: ColumnDefinition[] = [
      { field: 'name', headerName: 'Project Name', width: 180 },
      { field: 'partnerName', headerName: 'Partner', width: 150 },
      { field: 'teamLead', headerName: 'Team Lead', width: 150 },
      {
        field: 'budget',
        headerName: 'Budget',
        width: 120,
        renderCell: (value, row) => {
          if (value === undefined || value === null) return '';
          const numericBudget = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
          // Use environment variable to allow overriding currency code (default AED)
          const currencyCode = process.env.REACT_APP_CURRENCY_CODE || 'AED';
          try {
            return new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: currencyCode,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }).format(numericBudget);
          } catch (error) {
            // Fallback: prefix currency code manually
            return `${currencyCode} ${numericBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          }
        }
      }
    ];
    
    // Custom columns
    const customColumns = projectCustomFields.map(field => ({
      field,
      headerName: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
      width: 150,
      editable: true,
      isCustom: true
    }));
    
    return [...baseColumns, ...customColumns];
  };

  /**
   * Handles the deletion of multiple staff members at once
   * @param {string[]} staffIds - Array of staff IDs to delete
   */
  const handleDeleteMultipleStaffRows = async (staffIds: string[]) => {
    if (!staffIds.length) return;
    try {
      // Delete each staff member on the server
      await Promise.all(staffIds.map(id => axios.delete(`/api/staff/${id}`)));
      // Remove from client store
      staffIds.forEach(id => dispatch(deleteStaffMember(id)));
      setSnackbar({
        open: true,
        message: `${staffIds.length} staff member${staffIds.length > 1 ? 's' : ''} deleted successfully`,
        severity: 'success'
      });
    } catch (err) {
      console.error('Error deleting multiple staff', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete staff members',
        severity: 'error'
      });
    }
  };

  /**
   * Handles the deletion of multiple projects at once
   * @param {string[]} projectIds - Array of project IDs to delete
   */
  const handleDeleteMultipleProjectRows = async (projectIds: string[]) => {
    if (!projectIds.length) return;
    try {
      // Delete each project on the server
      await Promise.all(projectIds.map(id => axios.delete(`/api/projects/${id}`)));
      // Remove from client store
      projectIds.forEach(id => dispatch(deleteProject(id)));
      setSnackbar({
        open: true,
        message: `${projectIds.length} project${projectIds.length > 1 ? 's' : ''} deleted successfully`,
        severity: 'success'
      });
    } catch (err) {
      console.error('Error deleting multiple projects', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete projects',
        severity: 'error'
      });
    }
  };

  /**
   * Initiates editing of a staff member
   * @param id - Staff ID to edit
   */
  const handleEditStaffRow = (id: string) => {
    const staff = staffMembers.find(s => s.id === id);
    if (staff) {
      setEditStaffMember(staff);
      setOpenAddStaffForm(true);
    }
  };
  
  /**
   * Updates an existing staff member in the store and backend
   * @param updated - Updated staff member data
   */
  const handleUpdateStaffMember = async (updated: StaffMember) => {
    try {
      const res = await axios.put(`/api/staff/${updated.id}`, updated);
      dispatch(updateStaffMember(res.data));
      setSnackbar({ open: true, message: 'Staff member updated successfully', severity: 'success' });
    } catch (err: any) {
      console.error('Error updating staff', err);
      let errorMessage = 'Failed to update staff member';
      
      if (err.response?.status === 409 && err.response?.data?.error === 'Duplicate staff member') {
        errorMessage = err.response.data.message || 'Another staff member with these details already exists';
      } else if (err.response?.data?.error === 'Validation failed' && err.response?.data?.details) {
        errorMessage = `Validation failed: ${err.response.data.details.join(', ')}`;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
    setEditStaffMember(null);
  };
  
  /**
   * Initiates editing of a project
   * @param id - Project ID to edit
   */
  const handleEditProjectRow = (id: string) => {
    const proj = projects.find(p => p.id === id);
    if (proj) {
      setEditProject(proj);
      setOpenAddProjectForm(true);
    }
  };
  
  /**
   * Updates an existing project in the store and backend
   * @param updated - Updated project data
   */
  const handleUpdateProject = async (updated: Project) => {
    try {
      const res = await axios.put(`/api/projects/${updated.id}`, updated);
      dispatch(updateProject(res.data));
      
      // Dispatch custom event to notify other pages about the project update
      window.dispatchEvent(new CustomEvent('projectUpdated', { 
        detail: { updatedProject: res.data } 
      }));
      
      setSnackbar({ open: true, message: 'Project updated successfully', severity: 'success' });
    } catch (err: any) {
      console.error('Error updating project', err);
      let errorMessage = 'Failed to update project';
      
      if (err.response?.status === 409 && err.response?.data?.error === 'Duplicate project') {
        errorMessage = err.response.data.message || 'Another project with these details already exists';
      } else if (err.response?.data?.error === 'Validation failed' && err.response?.data?.details) {
        errorMessage = `Validation failed: ${err.response.data.details.join(', ')}`;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
    setEditProject(null);
  };

  return {
    // State
    tabValue,
    openAddStaffForm,
    openImportStaffModal,
    openAddProjectForm,
    openImportProjectModal,
    openAddColumnModal,
    deleteStaffConfirmation,
    deleteProjectConfirmation,
    snackbar,
    staffMembers,
    staffCustomFields,
    projects,
    projectCustomFields,
    editStaffMember,
    editProject,
    
    // Setters for edit mode
    setEditStaffMember,
    setEditProject,
    
    // Setters
    setTabValue,
    setOpenAddStaffForm,
    setOpenImportStaffModal,
    setOpenAddProjectForm,
    setOpenImportProjectModal,
    setOpenAddColumnModal,
    setDeleteStaffConfirmation,
    setDeleteProjectConfirmation,
    
    // Handlers
    handleTabChange,
    handleAddStaffMember,
    handleImportStaff,
    handleDeleteStaffRow,
    handleDeleteMultipleStaffRows,
    confirmDeleteStaff,
    handleAddProject,
    handleImportProjects,
    handleDeleteProjectRow,
    confirmDeleteProject,
    handleAddColumn,
    handleDeleteStaffColumn,
    handleDeleteProjectColumn,
    handleCloseSnackbar,
    getStaffColumns,
    getProjectColumns,
    handleDeleteMultipleProjectRows,
    handleEditStaffRow,
    handleUpdateStaffMember,
    handleEditProjectRow,
    handleUpdateProject
  };
}; 