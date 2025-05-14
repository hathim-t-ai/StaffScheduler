import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { ColumnDefinition } from '../components/DataTable';
import { 
  StaffMember, 
  addStaffMember, 
  addCustomField as addStaffCustomField,
  removeCustomField as removeStaffCustomField,
  deleteStaffMember,
  setStaffMembers,
  updateStaffMember
} from '../store/slices/staffSlice';
import {
  Project,
  addProject,
  addCustomField as addProjectCustomField,
  removeCustomField as removeProjectCustomField,
  deleteProject,
  setProjects,
  updateProject
} from '../store/slices/projectSlice';

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
   * Adds a new staff member to the store
   * @param {StaffMember} newStaffMember - Staff member to add
   */
  const handleAddStaffMember = (newStaffMember: StaffMember) => {
    dispatch(addStaffMember(newStaffMember));
    setSnackbar({
      open: true,
      message: 'Staff member added successfully',
      severity: 'success'
    });
  };

  /**
   * Imports multiple staff members from an external file
   * Handles merging with existing data and prevents duplicate IDs
   * @param {StaffMember[]} newStaffMembers - Array of staff members to import
   */
  const handleImportStaff = (newStaffMembers: StaffMember[]) => {
    // Log incoming staff data
    // console.log('Importing staff members:', newStaffMembers);
    
    // Create a map of existing staff by composite key (name-grade-department)
    const existingStaffMap = new Map<string, number>();
    
    staffMembers.forEach((staff, index) => {
      const key = `${staff.name.toLowerCase()}-${staff.grade.toLowerCase()}-${staff.department.toLowerCase()}`;
      existingStaffMap.set(key, index);
    });
    
    // Prepare the updated staff members list
    const updatedStaffMembers = [...staffMembers];
    const brandNewStaff: StaffMember[] = [];
    
    // Process each new staff member
    newStaffMembers.forEach(newStaff => {
      // console.log('Processing staff member:', newStaff.name, 'Skills:', newStaff.skills);
      
      // Normalize the skills data
      if (newStaff.skills === undefined || newStaff.skills === null) {
        newStaff.skills = [];
      } else if (typeof newStaff.skills === 'string') {
        // If skills is a string, convert to array
        const skillsString = newStaff.skills as string;
        newStaff.skills = skillsString.split(',').map(skill => skill.trim()).filter(Boolean);
      } else if (!Array.isArray(newStaff.skills)) {
        // If skills is not an array or string, convert to string and then array
        const skillsString = String(newStaff.skills);
        newStaff.skills = skillsString ? skillsString.split(',').map(skill => skill.trim()).filter(Boolean) : [];
      }

      // Log normalized skills
      // console.log('After processing skills:', newStaff.skills);

      const key = `${newStaff.name.toLowerCase()}-${newStaff.grade.toLowerCase()}-${newStaff.department.toLowerCase()}`;
      
      if (existingStaffMap.has(key)) {
        // Overwrite existing staff record while preserving the original ID
        const index = existingStaffMap.get(key) as number;
        updatedStaffMembers[index] = {
          ...newStaff,
          id: updatedStaffMembers[index].id, // Preserve the original ID
          skills: Array.isArray(newStaff.skills) ? newStaff.skills : [] // Ensure skills is an array
        };
      } else {
        // This is a brand new staff member
        brandNewStaff.push({
          ...newStaff,
          skills: Array.isArray(newStaff.skills) ? newStaff.skills : [] // Ensure skills is an array
        });
      }
    });
    
    // Add all brand new staff members
    const finalStaffMembers = [...updatedStaffMembers, ...brandNewStaff];
    
    // Log the final results
    // console.log('Final staff members after import:', finalStaffMembers);
    
    // Update the store
    dispatch(setStaffMembers(finalStaffMembers));
    
    setSnackbar({
      open: true,
      message: `Staff data imported successfully (${brandNewStaff.length} new, ${newStaffMembers.length - brandNewStaff.length} updated)`,
      severity: 'success'
    });
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
   * Dispatches the delete action and shows a success notification
   */
  const confirmDeleteStaff = () => {
    dispatch(deleteStaffMember(deleteStaffConfirmation.staffId));
    
    setSnackbar({
      open: true,
      message: `${deleteStaffConfirmation.staffName} was deleted successfully`,
      severity: 'success'
    });
    
    setDeleteStaffConfirmation({
      open: false,
      staffId: '',
      staffName: ''
    });
  };

  /**
   * Adds a new project to the store
   * @param {Project} newProject - Project to add
   */
  const handleAddProject = (newProject: Project) => {
    dispatch(addProject(newProject));
    setSnackbar({
      open: true,
      message: 'Project added successfully',
      severity: 'success'
    });
  };

  /**
   * Imports multiple projects from an external file
   * Handles merging with existing data and prevents duplicate IDs
   * @param {Project[]} newProjects - Array of projects to import
   */
  const handleImportProjects = (newProjects: Project[]) => {
    // Merge with existing projects, replacing any with duplicate IDs
    const existingIds = new Set(projects.map(project => project.id));
    const newProjectItems = newProjects.filter(project => !existingIds.has(project.id));
    
    const updatedProjects = [...projects, ...newProjectItems];
    dispatch(setProjects(updatedProjects));
    
    setSnackbar({
      open: true,
      message: `${newProjects.length} projects imported successfully`,
      severity: 'success'
    });
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
   * Dispatches the delete action and shows a success notification
   */
  const confirmDeleteProject = () => {
    dispatch(deleteProject(deleteProjectConfirmation.projectId));
    
    setSnackbar({
      open: true,
      message: `${deleteProjectConfirmation.projectName} was deleted successfully`,
      severity: 'success'
    });
    
    setDeleteProjectConfirmation({
      open: false,
      projectId: '',
      projectName: ''
    });
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
  const handleDeleteMultipleStaffRows = (staffIds: string[]) => {
    if (!staffIds.length) return;
    
    // Delete each staff member
    staffIds.forEach(id => {
      dispatch(deleteStaffMember(id));
    });
    
    // Show success message
    setSnackbar({
      open: true,
      message: `${staffIds.length} staff member${staffIds.length > 1 ? 's' : ''} deleted successfully`,
      severity: 'success'
    });
  };

  /**
   * Handles the deletion of multiple projects at once
   * @param {string[]} projectIds - Array of project IDs to delete
   */
  const handleDeleteMultipleProjectRows = (projectIds: string[]) => {
    if (!projectIds.length) return;
    
    // Delete each project
    projectIds.forEach(id => {
      dispatch(deleteProject(id));
    });
    
    // Show success message
    setSnackbar({
      open: true,
      message: `${projectIds.length} project${projectIds.length > 1 ? 's' : ''} deleted successfully`,
      severity: 'success'
    });
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
   * Updates an existing staff member
   * @param updated - Updated staff member data
   */
  const handleUpdateStaffMember = (updated: StaffMember) => {
    dispatch(updateStaffMember(updated));
    setSnackbar({ open: true, message: 'Staff member updated successfully', severity: 'success' });
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
   * Updates an existing project
   * @param updated - Updated project data
   */
  const handleUpdateProject = (updated: Project) => {
    dispatch(updateProject(updated));
    setSnackbar({ open: true, message: 'Project updated successfully', severity: 'success' });
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