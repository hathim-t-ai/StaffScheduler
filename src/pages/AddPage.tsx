import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  Paper,
  Button
} from '@mui/material';
import NavigationBar from '../components/NavigationBar';

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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
            <Button variant="contained" color="primary" fullWidth sx={{ mb: 2 }}>
              Add Staff Member
            </Button>
            <Button variant="outlined" color="primary" fullWidth>
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
            <Paper sx={{ p: 2 }}>
              <Typography variant="h2" gutterBottom>
                Staff Members
              </Typography>
              <Typography variant="body1">
                The staff table will be displayed here with columns for name, grade, department, location, and skills.
              </Typography>
            </Paper>
          ) : (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h2" gutterBottom>
                Projects
              </Typography>
              <Typography variant="body1">
                The projects table will be displayed here with columns for project name, partner name, team lead, and budget.
              </Typography>
            </Paper>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default AddPage; 