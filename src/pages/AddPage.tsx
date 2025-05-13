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
  Alert
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import NavigationBar from '../components/NavigationBar';
import DataTable from '../components/DataTable';
import AddStaffForm from '../components/AddStaffForm';
import ImportStaffModal from '../components/ImportStaffModal';
import AddColumnModal from '../components/AddColumnModal';
import { 
  StaffMember, 
  addStaffMember, 
  addCustomField,
  setStaffMembers
} from '../store/slices/staffSlice';
import { RootState } from '../store';
import { ColumnDefinition } from '../components/DataTable';

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
  const [openAddStaffForm, setOpenAddStaffForm] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openAddColumnModal, setOpenAddColumnModal] = useState(false);
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
  const { staffMembers, customFields } = useSelector((state: RootState) => state.staff);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

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

  const handleAddColumn = (columnName: string, dataType: string) => {
    dispatch(addCustomField(columnName));
    setSnackbar({
      open: true,
      message: `Column "${columnName}" added successfully`,
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
    const customColumnsDefinitions = customFields.map(field => ({
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
              onClick={() => setOpenImportModal(true)}
            >
              Import Staff Data
            </Button>
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <Typography variant="body1" paragraph>
              Manage your project data here.
            </Typography>
            <Button variant="contained" color="primary" fullWidth sx={{ mb: 2 }}>
              Add Project
            </Button>
            <Button variant="outlined" color="primary" fullWidth>
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
                emptyMessage="No staff members found. Add staff members using the form or import them from Excel/CSV."
              />
            </Box>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h5" gutterBottom>
                Projects
              </Typography>
              <Typography variant="body1">
                The projects table will be displayed here with columns for project name, partner name, team lead, and budget.
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>

      {/* Modals */}
      <AddStaffForm
        open={openAddStaffForm}
        onClose={() => setOpenAddStaffForm(false)}
        onAdd={handleAddStaffMember}
        customFields={customFields}
      />

      <ImportStaffModal
        open={openImportModal}
        onClose={() => setOpenImportModal(false)}
        onImport={handleImportStaff}
        customFields={customFields}
      />

      <AddColumnModal
        open={openAddColumnModal}
        onClose={() => setOpenAddColumnModal(false)}
        onAdd={handleAddColumn}
      />

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