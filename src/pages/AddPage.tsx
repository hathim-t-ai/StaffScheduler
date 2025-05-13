import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  Paper,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import NavigationBar from '../components/NavigationBar';
import DataTable, { ColumnDefinition } from '../components/DataTable';
import AddStaffForm from '../components/AddStaffForm';
import ImportStaffModal from '../components/ImportStaffModal';
import AddColumnModal from '../components/AddColumnModal';
import AddProjectForm from '../components/AddProjectForm';
import ImportProjectModal from '../components/ImportProjectModal';
import { 
  StaffMember, 
  addStaffMember, 
  addCustomField as addStaffCustomField,
  removeCustomField as removeStaffCustomField,
  deleteStaffMember,
  setStaffMembers
} from '../store/slices/staffSlice';
import {
  Project,
  addProject,
  addCustomField as addProjectCustomField,
  removeCustomField as removeProjectCustomField,
  deleteProject,
  setProjects
} from '../store/slices/projectSlice';
import { RootState } from '../store';

/**
 * Props for the TabPanel component
 * @interface TabPanelProps
 * @property {React.ReactNode} children - Content to be rendered in the tab panel
 * @property {number} index - Index of this tab panel
 * @property {number} value - Currently selected tab index
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * TabPanel Component
 * 
 * Renders content for a specific tab based on the current selected tab value.
 * Content is only rendered when the tab is active (value === index).
 */
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
      style={{ width: '100%' }}
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
      )}
    </div>
  );
};

/**
 * AddPage Component
 * 
 * Main page for adding and managing staff members and projects.
 * Features tabs for People and Projects, each with tables, add/import functionality,
 * custom column management, and row-level operations.
 */
const AddPage: React.FC = () => {
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Staff state
  const [openAddStaffForm, setOpenAddStaffForm] = useState(false);
  const [openImportStaffModal, setOpenImportStaffModal] = useState(false);
  
  // Project state
  const [openAddProjectForm, setOpenAddProjectForm] = useState(false);
  const [openImportProjectModal, setOpenImportProjectModal] = useState(false);
  
  // Common state
  const [openAddColumnModal, setOpenAddColumnModal] = useState(false);
  
  // Delete confirmation dialogs
  const [deleteStaffConfirmation, setDeleteStaffConfirmation] = useState<{
    open: boolean;
    staffId: string;
    staffName: string;
  }>({
    open: false,
    staffId: '',
    staffName: ''
  });
  
  const [deleteProjectConfirmation, setDeleteProjectConfirmation] = useState<{
    open: boolean;
    projectId: string;
    projectName: string;
  }>({
    open: false,
    projectId: '',
    projectName: ''
  });
  
  // Notification state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Redux
  const dispatch = useDispatch();
  const { staffMembers, customFields: staffCustomFields } = useSelector((state: RootState) => state.staff);
  const { projects, customFields: projectCustomFields } = useSelector((state: RootState) => state.projects);

  /**
   * Handles tab change between People and Projects
   * @param {React.SyntheticEvent} event - The tab change event
   * @param {number} newValue - Index of the newly selected tab
   */
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
    // Merge with existing staff members, replacing any with duplicate IDs
    const existingIds = new Set(staffMembers.map(staff => staff.id));
    const newStaff = newStaffMembers.filter(staff => !existingIds.has(staff.id));
    
    const updatedStaffMembers = [...staffMembers, ...newStaff];
    dispatch(setStaffMembers(updatedStaffMembers));
    
    setSnackbar({
      open: true,
      message: `${newStaffMembers.length} staff members imported successfully`,
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
    const project = projects.find(project => project.id === projectId);
    
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
   * Adds a custom column to either staff or project data model based on current tab
   * @param {string} columnName - Name of the column to add
   * @param {string} dataType - Data type of the column
   */
  const handleAddColumn = (columnName: string, dataType: string) => {
    // Add column to appropriate slice based on active tab
    if (tabValue === 0) {
      // Add to staff
      dispatch(addStaffCustomField(columnName));
      setSnackbar({
        open: true,
        message: `Column "${columnName}" added to People successfully`,
        severity: 'success'
      });
    } else {
      // Add to projects
      dispatch(addProjectCustomField(columnName));
      setSnackbar({
        open: true,
        message: `Column "${columnName}" added to Projects successfully`,
        severity: 'success'
      });
    }
    
    setOpenAddColumnModal(false);
  };

  /**
   * Removes a custom column from the staff data model
   * @param {string} columnName - Name of the column to remove
   */
  const handleDeleteStaffColumn = (columnName: string) => {
    dispatch(removeStaffCustomField(columnName));
    setSnackbar({
      open: true,
      message: `Column "${columnName}" removed from People successfully`,
      severity: 'success'
    });
  };

  /**
   * Removes a custom column from the project data model
   * @param {string} columnName - Name of the column to remove
   */
  const handleDeleteProjectColumn = (columnName: string) => {
    dispatch(removeProjectCustomField(columnName));
    setSnackbar({
      open: true,
      message: `Column "${columnName}" removed from Projects successfully`,
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
   * Generates column definitions for the staff data table
   * @returns {ColumnDefinition[]} Array of column definitions for the DataTable component
   */
  const getStaffColumns = (): ColumnDefinition[] => {
    // Standard columns
    const standardColumns: ColumnDefinition[] = [
      { field: 'name', headerName: 'Name', width: 180 },
      { field: 'grade', headerName: 'Grade', width: 120 },
      { field: 'department', headerName: 'Department', width: 160 },
      { field: 'city', headerName: 'City', width: 150 },
      { field: 'country', headerName: 'Country', width: 150 },
      { field: 'skills', headerName: 'Skills', width: 200 },
    ];
    
    // Custom columns
    const customColumns: ColumnDefinition[] = staffCustomFields.map(field => ({
      field,
      headerName: field,
      width: 150,
      isCustom: true,
      onDelete: () => handleDeleteStaffColumn(field)
    }));
    
    return [...standardColumns, ...customColumns];
  };

  /**
   * Generates column definitions for the project data table
   * @returns {ColumnDefinition[]} Array of column definitions for the DataTable component
   */
  const getProjectColumns = (): ColumnDefinition[] => {
    // Standard columns
    const standardColumns: ColumnDefinition[] = [
      { field: 'name', headerName: 'Project Name', width: 200 },
      { field: 'partnerName', headerName: 'Partner', width: 180 },
      { field: 'teamLead', headerName: 'Team Lead', width: 180 },
      { 
        field: 'budget', 
        headerName: 'Budget', 
        width: 150,
        // Format budget as currency
        renderCell: (value: any) => {
          return typeof value === 'number' 
            ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
            : value;
        }
      },
    ];
    
    // Custom columns
    const customColumns: ColumnDefinition[] = projectCustomFields.map(field => ({
      field,
      headerName: field,
      width: 150,
      isCustom: true,
      onDelete: () => handleDeleteProjectColumn(field)
    }));
    
    return [...standardColumns, ...customColumns];
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavigationBar title="Add Data" />
      
      <Box sx={{ 
        display: 'flex', 
        height: 'calc(100vh - 64px)'
      }}>
        {/* Left panel with tabs */}
        <Box sx={{
          width: { xs: '100%', md: '20%' },
          minWidth: { md: '250px' },
          borderRight: 1,
          borderColor: 'divider'
        }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="People" id="tab-0" aria-controls="tabpanel-0" />
            <Tab label="Projects" id="tab-1" aria-controls="tabpanel-1" />
          </Tabs>
          
          <TabPanel value={tabValue} index={0}>
            <Typography variant="body1" paragraph>
              Manage your staff data here.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              sx={{ mb: 2 }}
              onClick={() => setOpenAddStaffForm(true)}
            >
              Add Staff Member
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              fullWidth
              onClick={() => setOpenImportStaffModal(true)}
            >
              Import Staff Data
            </Button>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Typography variant="body1" paragraph>
              Manage your project data here.
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              fullWidth 
              sx={{ mb: 2 }}
              onClick={() => setOpenAddProjectForm(true)}
            >
              Add Project
            </Button>
            <Button 
              variant="outlined" 
              color="primary" 
              fullWidth
              onClick={() => setOpenImportProjectModal(true)}
            >
              Import Project Data
            </Button>
          </TabPanel>
        </Box>
        
        {/* Right panel with table */}
        <Box sx={{ 
          flexGrow: 1, 
          p: 3,
          overflow: 'auto'
        }}>
          {tabValue === 0 ? (
            <Box>
              <Typography variant="h5" gutterBottom>
                Staff Members
              </Typography>
              <DataTable
                data={staffMembers}
                columns={getStaffColumns()}
                onAddColumn={() => setOpenAddColumnModal(true)}
                onDeleteColumn={handleDeleteStaffColumn}
                onDeleteRow={handleDeleteStaffRow}
                customFields={staffCustomFields}
                emptyMessage="No staff members found. Add staff members using the form or import them from Excel/CSV."
              />
            </Box>
          ) : (
            <Box>
              <Typography variant="h5" gutterBottom>
                Projects
              </Typography>
              <DataTable
                data={projects}
                columns={getProjectColumns()}
                onAddColumn={() => setOpenAddColumnModal(true)}
                onDeleteColumn={handleDeleteProjectColumn}
                onDeleteRow={handleDeleteProjectRow}
                customFields={projectCustomFields}
                emptyMessage="No projects found. Add projects using the form or import them from Excel/CSV."
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* Staff Modals */}
      <AddStaffForm
        open={openAddStaffForm}
        onClose={() => setOpenAddStaffForm(false)}
        onAdd={handleAddStaffMember}
        customFields={staffCustomFields}
      />

      <ImportStaffModal
        open={openImportStaffModal}
        onClose={() => setOpenImportStaffModal(false)}
        onImport={handleImportStaff}
        customFields={staffCustomFields}
      />

      {/* Project Modals */}
      <AddProjectForm
        open={openAddProjectForm}
        onClose={() => setOpenAddProjectForm(false)}
        onAdd={handleAddProject}
        customFields={projectCustomFields}
      />

      <ImportProjectModal
        open={openImportProjectModal}
        onClose={() => setOpenImportProjectModal(false)}
        onImport={handleImportProjects}
        customFields={projectCustomFields}
      />

      {/* Common Modals */}
      <AddColumnModal
        open={openAddColumnModal}
        onClose={() => setOpenAddColumnModal(false)}
        onAdd={handleAddColumn}
      />

      {/* Staff Delete Confirmation Dialog */}
      <Dialog
        open={deleteStaffConfirmation.open}
        onClose={() => setDeleteStaffConfirmation({ ...deleteStaffConfirmation, open: false })}
      >
        <DialogTitle>Delete Staff Member</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {deleteStaffConfirmation.staffName}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteStaffConfirmation({ ...deleteStaffConfirmation, open: false })}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteStaff} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Project Delete Confirmation Dialog */}
      <Dialog
        open={deleteProjectConfirmation.open}
        onClose={() => setDeleteProjectConfirmation({ ...deleteProjectConfirmation, open: false })}
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {deleteProjectConfirmation.projectName}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteProjectConfirmation({ ...deleteProjectConfirmation, open: false })}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmDeleteProject} 
            color="error" 
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AddPage; 