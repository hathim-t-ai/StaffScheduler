/* eslint-disable import/no-duplicates */
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Paper,
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import NavigationBar from '../components/NavigationBar';
import Table from '../components/ui/table';
import AddStaffForm from '../components/AddStaffForm';
import ImportStaffModal from '../components/ImportStaffModal';
import AddColumnModal from '../components/AddColumnModal';
import AddProjectForm from '../components/AddProjectForm';
import ImportProjectModal from '../components/ImportProjectModal';
import { TabPanel } from '../components/AddPageComponents';
import { useAddPageManager } from '../hooks/useAddPageManager';
import Sidebar from '../components/Sidebar';
import AddIcon from '@mui/icons-material/Add';
import type { TableProps } from '../components/ui/table';

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

  // Selection state for bulk actions
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  // Clear selection when tab changes
  useEffect(() => {
    setSelectedStaffIds([]);
    setSelectedProjectIds([]);
  }, [tabValue]);

  // Prepare table columns with an Add Column button at the far right
  const staffTableColumns: TableProps['columns'] = getStaffColumns().map(col => ({
    title: col.headerName,
    dataIndex: col.field,
    key: col.field
  }));
  staffTableColumns.push({
    title: '',
    key: 'addColumn',
    renderHeader: () => (
      <Tooltip title="Add Column">
        <IconButton size="small" color="inherit" onClick={() => setOpenAddColumnModal(true)}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )
  });
  const projectTableColumns: TableProps['columns'] = getProjectColumns().map(col => ({
    title: col.headerName,
    dataIndex: col.field,
    key: col.field,
    renderCell: col.renderCell
  }));
  projectTableColumns.push({
    title: '',
    key: 'addColumn',
    renderHeader: () => (
      <Tooltip title="Add Column">
        <IconButton size="small" color="inherit" onClick={() => setOpenAddColumnModal(true)}>
          <AddIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    )
  });

  return (
    <Container maxWidth={false} disableGutters>
      <NavigationBar title="Add Staff & Projects" />
      
      <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
        {/* Sidebar */}
        <Sidebar selected={tabValue} onSelect={newValue => setTabValue(newValue)} />
        {/* Content Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', bgcolor: 'background.default', pt: 2, px: 2 }}>
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: 'background.default' }}>
            {/* People Tab Content */}
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, bgcolor: 'background.default', color: 'common.white', px: 2, py: 1 }}>
                <Typography variant="h5" sx={{ color: 'common.white' }}>Staff</Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                  {selectedStaffIds.length > 0 && (
                    <>
                      <Button variant="outlined" color="error" onClick={() => { handleDeleteMultipleStaffRows(selectedStaffIds); setSelectedStaffIds([]); }}>Delete</Button>
                      <Button variant="outlined" color="primary" disabled={selectedStaffIds.length !== 1} onClick={() => handleEditStaffRow(selectedStaffIds[0])}>Edit</Button>
                    </>
                  )}
                  <Button variant="outlined" color="inherit" onClick={() => setOpenImportStaffModal(true)} sx={{ borderColor: 'common.white', color: 'common.white', '&:hover': { borderColor: 'common.white' } }}>Import</Button>
                  <Button variant="contained" onClick={() => setOpenAddStaffForm(true)}>Add Staff</Button>
                </Box>
              </Box>
              <Table
                dataSource={staffMembers}
                columns={staffTableColumns}
                showIndex
                rowSelection={{ selectedKeys: selectedStaffIds, onChange: setSelectedStaffIds }}
                rowKey="id"
              />
            </TabPanel>
            
            {/* Projects Tab Content */}
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, bgcolor: 'background.default', color: 'common.white', px: 2, py: 1 }}>
                <Typography variant="h5" sx={{ color: 'common.white' }}>Projects</Typography>
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                  {selectedProjectIds.length > 0 && (
                    <>
                      <Button variant="outlined" color="error" onClick={() => { handleDeleteMultipleProjectRows(selectedProjectIds); setSelectedProjectIds([]); }}>Delete</Button>
                      <Button variant="outlined" color="primary" disabled={selectedProjectIds.length !== 1} onClick={() => handleEditProjectRow(selectedProjectIds[0])}>Edit</Button>
                    </>
                  )}
                  <Button variant="outlined" color="inherit" onClick={() => setOpenImportProjectModal(true)} sx={{ borderColor: 'common.white', color: 'common.white', '&:hover': { borderColor: 'common.white' } }}>Import</Button>
                  <Button variant="contained" onClick={() => setOpenAddProjectForm(true)}>Add Project</Button>
                </Box>
              </Box>
              
              <Table
                dataSource={projects}
                columns={projectTableColumns}
                showIndex
                rowSelection={{ selectedKeys: selectedProjectIds, onChange: setSelectedProjectIds }}
                rowKey="id"
              />
            </TabPanel>
          </Paper>
        </Box>
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