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

// TabPanel component for tab content
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

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

const AddPage: React.FC = () => {
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Staff handlers
  const handleAddStaffMember = (newStaffMember: StaffMember) => {
    dispatch(addStaffMember(newStaffMember));
    setSnackbar({
      open: true,
      message: 'Staff member added successfully',
      severity: 'success'
    });
  };

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

  // Project handlers
  const handleAddProject = (newProject: Project) => {
    dispatch(addProject(newProject));
    setSnackbar({
      open: true,
      message: 'Project added successfully',
      severity: 'success'
    });
  };

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

  // Column handlers
  const handleAddColumn = (columnName: string, dataType: string) => {
    if (tabValue === 0) {
      dispatch(addStaffCustomField(columnName));
      setSnackbar({
        open: true,
        message: `Column "${columnName}" added to staff table successfully`,
        severity: 'success'
      });
    } else {
      dispatch(addProjectCustomField(columnName));
      setSnackbar({
        open: true,
        message: `Column "${columnName}" added to projects table successfully`,
        severity: 'success'
      });
    }
  };

  const handleDeleteStaffColumn = (columnName: string) => {
    dispatch(removeStaffCustomField(columnName));
    setSnackbar({
      open: true,
      message: `Column "${columnName}" removed from staff table successfully`,
      severity: 'success'
    });
  };

  const handleDeleteProjectColumn = (columnName: string) => {
    dispatch(removeProjectCustomField(columnName));
    setSnackbar({
      open: true,
      message: `Column "${columnName}" removed from projects table successfully`,
      severity: 'success'
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Define table columns
  const getStaffColumns = (): ColumnDefinition[] => {
    const defaultColumns: ColumnDefinition[] = [
      { field: 'name', headerName: 'Name', width: 150 },
      { field: 'grade', headerName: 'Grade', width: 100 },
      { field: 'department', headerName: 'Department', width: 150 },
      { field: 'city', headerName: 'City', width: 150 },
      { field: 'country', headerName: 'Country', width: 150 },
      { field: 'skills', headerName: 'Skills', width: 200 }
    ];

    // Add custom columns
    const customColumnsDefinitions = staffCustomFields.map(field => ({
      field,
      headerName: field,
      width: 150
    }));

    return [...defaultColumns, ...customColumnsDefinitions];
  };

  const getProjectColumns = (): ColumnDefinition[] => {
    const defaultColumns: ColumnDefinition[] = [
      { field: 'name', headerName: 'Project Name', width: 200 },
      { field: 'partnerName', headerName: 'Partner', width: 150 },
      { field: 'teamLead', headerName: 'Team Lead', width: 150 },
      { 
        field: 'budget', 
        headerName: 'Budget', 
        width: 120,
        renderCell: (value: any) => {
          const budget = typeof value === 'number' ? value : 0;
          return `$${budget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
      }
    ];

    // Add custom columns
    const customColumnsDefinitions = projectCustomFields.map(field => ({
      field,
      headerName: field,
      width: 150
    }));

    return [...defaultColumns, ...customColumnsDefinitions];
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