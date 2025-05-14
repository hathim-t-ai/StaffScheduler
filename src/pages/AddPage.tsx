import React from 'react';
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
import NavigationBar from '../components/NavigationBar';
import DataTable from '../components/DataTable';
import AddStaffForm from '../components/AddStaffForm';
import ImportStaffModal from '../components/ImportStaffModal';
import AddColumnModal from '../components/AddColumnModal';
import AddProjectForm from '../components/AddProjectForm';
import ImportProjectModal from '../components/ImportProjectModal';
import { TabPanel } from '../components/AddPageComponents';
import { useAddPageManager } from '../hooks/useAddPageManager';

/**
 * AddPage Component
 * 
 * Main page for adding and managing staff members and projects.
 * Features tabs for People and Projects, each with tables, add/import functionality,
 * custom column management, and row-level operations.
 */
const AddPage: React.FC = () => {
  // Use our manager hook for state and handlers
  const {
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
    handleDeleteMultipleStaffRows,
    handleDeleteMultipleProjectRows,
    handleEditStaffRow,
    handleUpdateStaffMember,
    handleEditProjectRow,
    handleUpdateProject,
    // Setters for clearing edit state
    setEditStaffMember,
    setEditProject
  } = useAddPageManager();

  return (
    <Container maxWidth={false} disableGutters>
      <NavigationBar title="Add Staff & Projects" />
      
      <Box sx={{ 
        width: '100%',
        height: 'calc(100vh - 64px)',
        overflow: 'auto',
        bgcolor: 'background.default',
        pt: 2,
        px: 2
      }}>
        <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              aria-label="add-content-tabs"
              sx={{ 
                px: 2, 
                pt: 2,
                '& .MuiTab-root': { fontWeight: 'medium' }
              }}
            >
              <Tab label="People" id="tab-0" />
              <Tab label="Projects" id="tab-1" />
            </Tabs>
          </Box>
          
          {/* People Tab Content */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" color="primary">
                Staff
              </Typography>
              <Box>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={() => setOpenAddColumnModal(true)}
                  sx={{ mr: 1 }}
                >
                  Add Column
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={() => setOpenImportStaffModal(true)}
                  sx={{ mr: 1 }}
                >
                  Import
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => setOpenAddStaffForm(true)}
                >
                  Add Staff
                </Button>
              </Box>
            </Box>
            
            <DataTable 
              data={staffMembers}
              columns={getStaffColumns()}
              onDeleteRow={handleDeleteStaffRow}
              onDeleteMultipleRows={handleDeleteMultipleStaffRows}
              onEditRow={handleEditStaffRow}
              onDeleteColumn={handleDeleteStaffColumn}
              onAddColumn={() => setOpenAddColumnModal(true)}
              customFields={staffCustomFields}
            />
          </TabPanel>
          
          {/* Projects Tab Content */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h5" color="primary">
                Projects
              </Typography>
              <Box>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={() => setOpenAddColumnModal(true)}
                  sx={{ mr: 1 }}
                >
                  Add Column
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary" 
                  onClick={() => setOpenImportProjectModal(true)}
                  sx={{ mr: 1 }}
                >
                  Import
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => setOpenAddProjectForm(true)}
                >
                  Add Project
                </Button>
              </Box>
            </Box>
            
            <DataTable 
              data={projects}
              columns={getProjectColumns()}
              onDeleteRow={handleDeleteProjectRow}
              onDeleteMultipleRows={handleDeleteMultipleProjectRows}
              onEditRow={handleEditProjectRow}
              onDeleteColumn={handleDeleteProjectColumn}
              onAddColumn={() => setOpenAddColumnModal(true)}
              customFields={projectCustomFields}
            />
          </TabPanel>
        </Paper>
      </Box>
      
      {/* Add Staff Form Modal */}
      <AddStaffForm
        open={openAddStaffForm}
        onClose={() => { setOpenAddStaffForm(false); setEditStaffMember(null); }}
        onAdd={handleAddStaffMember}
        onUpdate={handleUpdateStaffMember}
        initialData={editStaffMember || undefined}
        customFields={staffCustomFields}
      />
      
      {/* Import Staff Modal */}
      <ImportStaffModal
        open={openImportStaffModal}
        onClose={() => setOpenImportStaffModal(false)}
        onImport={handleImportStaff}
        customFields={staffCustomFields}
      />
      
      {/* Add Project Form Modal */}
      <AddProjectForm
        open={openAddProjectForm}
        onClose={() => { setOpenAddProjectForm(false); setEditProject(null); }}
        onAdd={handleAddProject}
        onUpdate={handleUpdateProject}
        initialData={editProject || undefined}
        customFields={projectCustomFields}
      />
      
      {/* Import Project Modal */}
      <ImportProjectModal
        open={openImportProjectModal}
        onClose={() => setOpenImportProjectModal(false)}
        onImport={handleImportProjects}
        customFields={projectCustomFields}
      />
      
      {/* Add Column Modal */}
      <AddColumnModal
        open={openAddColumnModal}
        onClose={() => setOpenAddColumnModal(false)}
        onAdd={handleAddColumn}
      />
      
      {/* Delete Staff Confirmation Dialog */}
      <Dialog
        open={deleteStaffConfirmation.open}
        onClose={() => setDeleteStaffConfirmation({ ...deleteStaffConfirmation, open: false })}
      >
        <DialogTitle>Delete Staff Member</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {deleteStaffConfirmation.staffName}? 
            This action cannot be undone.
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
      
      {/* Delete Project Confirmation Dialog */}
      <Dialog
        open={deleteProjectConfirmation.open}
        onClose={() => setDeleteProjectConfirmation({ ...deleteProjectConfirmation, open: false })}
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {deleteProjectConfirmation.projectName}? 
            This action cannot be undone.
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
      
      {/* Notification */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AddPage; 